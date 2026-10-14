// Basket game mode logic: round generator and scoring. Pure functions, no DOM access.

export const MAX_QTY = 5;
export const ITEM_COUNT = 6;
// Going over costs 3 points per 1% instead of everything: a hard bust made even good guessers
// score 0 in about half the rounds (simulated), so knowing prices barely mattered.
export const OVER_PENALTY = 3;

// Not shoppable: currencies, and incomes/benefits (a wage in a basket makes no sense).
const NOT_IN_BASKET = new Set(['dolar', 'euro', 'asgari-ucret', 'kyk-burs', 'emekli-en-dusuk-aylik', 'aclik-siniri', 'dogum-yardimi']);

/**
 * Round a budget value to a "nice" human-friendly number:
 * 1 significant digit if x >= 100, otherwise to nearest 5 (minimum 5).
 */
export function niceBudget(x) {
  if (x >= 100) {
    const mag = 10 ** Math.floor(Math.log10(x) + 1e-12);
    return Math.round(x / mag) * mag;
  }
  return Math.max(5, Math.round(x / 5) * 5);
}

/**
 * Build a basket round from questions.
 * Groups questions by year (keeps latest date per productId in that year).
 * Tries up to 200 times to find a year and budget with at least ITEM_COUNT candidates.
 *
 * @param {Array<Object>} questions
 * @param {Function} [rng=Math.random]
 * @returns {{ year: number, budget: number, items: Array<Object> } | null}
 */
export function buildBasketRound(questions, rng = Math.random) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  // Group questions by year, keeping only the latest date per productId in each year.
  const byYear = new Map();
  for (const q of questions) {
    if (!q || !q.productId || !(q.price > 0)) continue;
    const year = q.year ?? (q.date ? Number(String(q.date).slice(0, 4)) : null);
    if (!year) continue;

    if (!byYear.has(year)) {
      byYear.set(year, new Map());
    }
    const prodMap = byYear.get(year);
    const existing = prodMap.get(q.productId);
    if (!existing || String(q.date ?? '') > String(existing.date ?? '')) {
      prodMap.set(q.productId, q);
    }
  }

  // Only years with at least 8 distinct products are eligible.
  const eligibleYears = [];
  for (const [year, prodMap] of byYear.entries()) {
    if (prodMap.size >= 8) {
      eligibleYears.push({ year, items: Array.from(prodMap.values()) });
    }
  }

  if (eligibleYears.length === 0) {
    return null;
  }

  for (let attempt = 0; attempt < 200; attempt++) {
    const yearEntry = eligibleYears[Math.floor(rng() * eligibleYears.length)];
    const anchor = yearEntry.items[Math.floor(rng() * yearEntry.items.length)];
    const budget = niceBudget(anchor.price * (3 + rng() * 5));
    const minPrice = budget / 25;
    const maxPrice = budget / 2;

    const candidates = yearEntry.items.filter(
      (q) =>
        !NOT_IN_BASKET.has(q.productId) &&
        q.price >= minPrice &&
        q.price <= maxPrice
    );

    if (candidates.length >= ITEM_COUNT) {
      const pool = [...candidates];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return {
        year: yearEntry.year,
        budget,
        items: pool.slice(0, ITEM_COUNT),
      };
    }
  }

  return null;
}

/**
 * Score a basket guess against a round budget.
 *
 * @param {{ budget: number, items: Array<Object> }} round
 * @param {Record<string, number>} quantities Map of question id to integer quantity (0..MAX_QTY)
 * @returns {{ total: number, over: boolean, empty: boolean, score: number, left: number }}
 */
export function scoreBasket(round, quantities) {
  const budget = round?.budget ?? 0;
  const items = round?.items ?? [];
  let total = 0;

  for (const item of items) {
    const qty = quantities?.[item.id] ?? 0;
    if (qty > 0) {
      total += item.price * qty;
    }
  }

  const left = budget - total;

  if (total === 0) {
    return {
      total: 0,
      over: false,
      empty: true,
      score: 0,
      left: budget,
    };
  }

  if (total > budget) {
    return {
      total,
      over: true,
      empty: false,
      score: Math.max(0, Math.round(100 * (1 - OVER_PENALTY * (total / budget - 1)))),
      left,
    };
  }

  const score = Math.round((100 * total) / budget);
  return {
    total,
    over: false,
    empty: false,
    score,
    left,
  };
}
