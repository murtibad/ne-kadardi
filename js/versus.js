// "Hangisi daha pahalıydı?" mode: pure pair selection and judging, no DOM.
const MIN_RATIO = 1.2; // closer prices are a coin flip, not a question
const MAX_RATIO = 8; // farther apart is trivial

function ratioOf(x, y) {
  return Math.max(x.price, y.price) / Math.min(x.price, y.price);
}

function isValidPair(x, y) {
  if (x.productId === y.productId) return false;
  const r = ratioOf(x, y);
  return r >= MIN_RATIO && r <= MAX_RATIO;
}

/**
 * Pick two questions of different products whose prices differ by 1.2x-8x.
 * Ids in `recentIds` are avoided while an alternative exists. Returns null if no pair fits.
 */
export function pickPair(questions, rng = Math.random, recentIds = []) {
  const recent = new Set(recentIds);
  const fresh = questions.filter((q) => !recent.has(q.id));
  for (const pool of [fresh, questions]) {
    if (pool.length < 2) continue;
    for (let i = 0; i < 200; i++) {
      const x = pool[Math.floor(rng() * pool.length)];
      const y = pool[Math.floor(rng() * pool.length)];
      if (isValidPair(x, y)) return rng() < 0.5 ? { a: x, b: y } : { a: y, b: x };
    }
    // Random draws missed (sparse data): scan deterministically.
    for (const x of pool) {
      const y = pool.find((c) => isValidPair(x, c));
      if (y) return rng() < 0.5 ? { a: x, b: y } : { a: y, b: x };
    }
  }
  return null;
}

/** `choice` is 'a' or 'b'. Equal prices cannot occur: pairs are at least 1.2x apart. */
export function judgePair(pair, choice) {
  const winner = pair.a.price > pair.b.price ? 'a' : 'b';
  return { correct: choice === winner, winner, ratio: ratioOf(pair.a, pair.b) };
}

export function nextStreak(streak, correct) {
  return correct ? streak + 1 : 0;
}
