// Game logic: question selection and scoring. Pure functions, no DOM access.

const PERFECT_FACTOR = 1.1; // within 10% counts as a perfect guess
const ZERO_FACTOR = 5; // 5x off (either way) scores zero

export function yearOf(date) {
  return Number(date.slice(0, 4));
}

/** Flatten prices.json into playable questions. Only verified entries are playable. */
export function buildQuestions(data) {
  const questions = [];
  for (const product of data.products ?? []) {
    const current = product.current?.status === 'verified' ? product.current : null;
    for (const entry of product.prices ?? []) {
      if (entry.status !== 'verified' || !(entry.price > 0)) continue;
      questions.push({
        id: `${product.id}@${entry.date}`,
        productId: product.id,
        name: product.name,
        label: entry.label ?? null,
        unit: entry.unit ?? product.unit,
        region: product.region ?? null,
        date: entry.date,
        year: yearOf(entry.date),
        price: entry.price,
        source: entry.source,
        current,
      });
    }
  }
  return questions;
}

export function yearRange(questions) {
  const years = questions.map((q) => q.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}

export function filterByYears(questions, from, to) {
  return questions.filter((q) => q.year >= from && q.year <= to);
}

/** Pick a random question, avoiding an immediate repeat when possible. */
export function pickRandom(questions, previousId = null, rng = Math.random) {
  const pool = questions.length > 1 ? questions.filter((q) => q.id !== previousId) : questions;
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Score a guess by ratio, not by difference, so every product is scored fairly.
 * The log scale makes "2x too high" and "2x too low" equally wrong.
 */
export function scoreGuess(guess, actual) {
  const ratio = guess / actual;
  const factor = Math.max(ratio, 1 / ratio);
  let direction = 'exact';
  if (factor > PERFECT_FACTOR) direction = ratio > 1 ? 'over' : 'under';

  let score = 100;
  if (factor > PERFECT_FACTOR) {
    const t = (Math.log(factor) - Math.log(PERFECT_FACTOR)) /
      (Math.log(ZERO_FACTOR) - Math.log(PERFECT_FACTOR));
    score = Math.round(100 * Math.max(0, 1 - t));
  }
  return { ratio, factor, direction, score };
}
