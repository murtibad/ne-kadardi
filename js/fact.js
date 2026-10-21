// "Biliyor muydun?" card on the home screen: one sourced then-and-now pair. No DOM access here.
import { formatPeriod, formatPrice, formatRatio } from './format.js';

// Below this the "then vs now" jump is too small to surprise anyone.
const MIN_RATIO = 2;

/**
 * Pick a fact from the archive timelines: the oldest verified price of a product next to
 * its current price. `random` is injectable for tests. Avoids `skipId` (the fact shown
 * just before) when another product qualifies. Returns null when no product qualifies.
 */
export function pickFact(timelines, { random = Math.random, skipId = null } = {}) {
  const candidates = [];
  for (const t of timelines ?? []) {
    const first = t.rows?.[0];
    const current = t.rows?.find((r) => r.isCurrent);
    if (!first || !current || first === current) continue;
    const ratio = current.price / first.price;
    if (!(ratio >= MIN_RATIO)) continue;
    candidates.push({ t, first, current, ratio });
  }
  const pool = candidates.length > 1 ? candidates.filter((c) => c.t.id !== skipId) : candidates;
  if (pool.length === 0) return null;
  const { t, first, current, ratio } = pool[Math.floor(random() * pool.length) % pool.length];
  return {
    productId: t.id,
    name: t.name,
    unit: t.unit,
    image: t.image,
    thenLabel: formatPeriod(first.date),
    thenPrice: formatPrice(first.price),
    nowLabel: current.currentLabel || formatPeriod(current.date),
    nowPrice: formatPrice(current.price),
    ratio: `${formatRatio(ratio)} kat`,
  };
}
