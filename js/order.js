// "Sırala" mode: pure item set selection, ordering and scoring, no DOM.

export const SET_SIZE = 4;
export const MIN_GAP = 1.15; // adjacent prices (sorted) must differ by at least this ratio

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function findOrderSet(pool, rng, size) {
  const byYear = new Map();
  for (const q of pool) {
    let prodMap = byYear.get(q.year);
    if (!prodMap) {
      prodMap = new Map();
      byYear.set(q.year, prodMap);
    }
    let list = prodMap.get(q.productId);
    if (!list) {
      list = [];
      prodMap.set(q.productId, list);
    }
    list.push(q);
  }

  const candidateYears = [];
  for (const [year, prodMap] of byYear.entries()) {
    if (prodMap.size >= size) {
      candidateYears.push(year);
    }
  }

  if (candidateYears.length === 0) return null;

  for (let attempt = 0; attempt < 200; attempt++) {
    const year = candidateYears[Math.floor(rng() * candidateYears.length)];
    const prodMap = byYear.get(year);

    const sampled = [];
    for (const qs of prodMap.values()) {
      sampled.push(qs[Math.floor(rng() * qs.length)]);
    }
    shuffle(sampled, rng);
    sampled.sort((a, b) => a.price - b.price);

    const kept = [];
    for (const item of sampled) {
      if (kept.length === 0 || item.price >= kept[kept.length - 1].price * MIN_GAP) {
        kept.push(item);
      }
    }

    if (kept.length >= size) {
      shuffle(kept, rng);
      const items = kept.slice(0, size);
      shuffle(items, rng);
      return { year, items };
    }
  }

  return null;
}

/**
 * Pick `size` items from the same year with distinct products and sorted ratio >= MIN_GAP.
 * Returns { year, items } with `items` in random order, or null if no valid set is found.
 */
export function pickOrderSet(questions, rng = Math.random, recentIds = [], size = SET_SIZE) {
  if (!Array.isArray(questions) || questions.length === 0) return null;
  const recent = new Set(recentIds);
  const fresh = questions.filter((q) => !recent.has(q.id));
  const pools = fresh.length < questions.length ? [fresh, questions] : [questions];

  for (const pool of pools) {
    const res = findOrderSet(pool, rng, size);
    if (res) return res;
  }
  return null;
}

/**
 * Returns array of ids sorted by price ascending.
 */
export function correctOrder(items) {
  return items
    .slice()
    .sort((a, b) => a.price - b.price)
    .map((item) => item.id);
}

/**
 * Score player's ordering against real prices.
 * Returns { score, correctPairs, totalPairs, perfect }.
 */
export function scoreOrder(items, orderIds) {
  if (!Array.isArray(items) || !Array.isArray(orderIds) || orderIds.length !== items.length) {
    throw new Error('orderIds must be a permutation of items');
  }

  const priceById = new Map();
  for (const item of items) {
    priceById.set(item.id, item.price);
  }

  const seen = new Set();
  for (const id of orderIds) {
    if (!priceById.has(id) || seen.has(id)) {
      throw new Error('orderIds must be a permutation of items');
    }
    seen.add(id);
  }

  const totalPairs = (items.length * (items.length - 1)) / 2;
  if (totalPairs === 0) {
    return { score: 100, correctPairs: 0, totalPairs: 0, perfect: true };
  }

  let correctPairs = 0;
  for (let i = 0; i < orderIds.length; i++) {
    const pA = priceById.get(orderIds[i]);
    for (let j = i + 1; j < orderIds.length; j++) {
      const pB = priceById.get(orderIds[j]);
      if (pA < pB) correctPairs++;
    }
  }

  const score = Math.round((correctPairs / totalPairs) * 100);
  return {
    score,
    correctPairs,
    totalPairs,
    perfect: score === 100,
  };
}
