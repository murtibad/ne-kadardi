// "Biliyor muydun?" card on the home screen: one sourced then-and-now pair. No DOM access here.
import { formatPeriod, formatPrice, formatRatio, unitLine } from './format.js';

// Below this the "then vs now" jump is too small to surprise anyone.
const MIN_RATIO = 2;
// Fewer than three products in a year makes "Başka ↻" feel stuck on one pair.
const DEFAULT_MIN_YEAR_PRODUCTS = 3;

function rowYear(date) {
  if (typeof date !== 'string') return NaN;
  const y = Number(date.slice(0, 4));
  return Number.isInteger(y) ? y : NaN;
}

/**
 * List years that have at least `minProducts` verified products with a current price
 * and a qualifying (>= MIN_RATIO) non-current price in that year, newest first.
 */
export function factYears(timelines, { minProducts = DEFAULT_MIN_YEAR_PRODUCTS } = {}) {
  const counts = new Map();
  for (const t of timelines ?? []) {
    const current = t.rows?.find((r) => r.isCurrent);
    if (!current) continue;
    const seenYears = new Set();
    for (const r of t.rows ?? []) {
      if (r.isCurrent || r === current) continue;
      if (!(current.price / r.price >= MIN_RATIO)) continue;
      const y = rowYear(r.date);
      if (!Number.isInteger(y) || seenYears.has(y)) continue;
      seenYears.add(y);
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minProducts)
    .map(([y]) => y)
    .sort((a, b) => b - a);
}

/**
 * Pick a fact from the archive timelines: a verified price of a product next to its
 * current price (oldest verified price by default, or the product's price from `year`
 * when given). `random` is injectable for tests. Avoids `skipId` (the fact shown just
 * before) when another product qualifies. Returns null when no product qualifies.
 */
export function pickFact(timelines, { random = Math.random, skipId = null, year = null } = {}) {
  const targetYear = year === null || year === undefined || year === '' ? null : Number(year);
  if (targetYear !== null && !Number.isInteger(targetYear)) return null;

  const candidates = [];
  for (const t of timelines ?? []) {
    const current = t.rows?.find((r) => r.isCurrent);
    if (!current) continue;
    const picked = targetYear === null
      ? t.rows?.[0]
      : t.rows?.find((r) => !r.isCurrent && r !== current && rowYear(r.date) === targetYear && current.price / r.price >= MIN_RATIO);
    if (!picked || picked === current || picked.isCurrent) continue;
    const ratio = current.price / picked.price;
    if (!(ratio >= MIN_RATIO)) continue;
    candidates.push({ t, picked, current, ratio });
  }
  const pool = candidates.length > 1 ? candidates.filter((c) => c.t.id !== skipId) : candidates;
  if (pool.length === 0) return null;
  const { t, picked, current, ratio } = pool[Math.floor(random() * pool.length) % pool.length];
  return {
    productId: t.id,
    name: t.name,
    unit: unitLine(t.unit, t.region),
    image: t.image,
    thenLabel: formatPeriod(picked.date),
    thenPrice: formatPrice(picked.price),
    nowLabel: current.currentLabel || formatPeriod(current.date),
    nowPrice: formatPrice(current.price),
    ratio: `${formatRatio(ratio)} katına`,
  };
}
