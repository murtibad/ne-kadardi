// Game logic: question selection and scoring. Pure functions, no DOM access.
import { formatRatio } from './format.js';

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
        image: product.image ?? null,
        tax: product.tax ?? null,
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


// Colour tier of a result, from dark green (spot on) to dark red (way off).
// Thresholds on the 0-100 log score: 85 is roughly within 1.3x, 70 within 1.6x,
// 45 within 2.6x, 20 within 4x.
export function scoreTier(score) {
  if (score >= 85) return 'great';
  if (score >= 70) return 'good';
  if (score >= 45) return 'mid';
  if (score >= 20) return 'poor';
  return 'bad';
}

export function getHalfYear(dateStr) {
  if (!dateStr || dateStr.length < 4) return null;
  const year = dateStr.slice(0, 4);
  const month = dateStr.length >= 7 ? parseInt(dateStr.slice(5, 7), 10) : null;
  if (month === null) return null; // We need a month to determine half year reliably
  return `${year}-H${month <= 6 ? 1 : 2}`;
}

export function getShortUnit(unit) {
  if (!unit) return 'adet';
  const lower = unit.toLowerCase();
  if (lower.includes('litre')) return 'litre';
  if (/\b(gram|gr|g)\b/i.test(unit)) return 'gram';
  if (lower.includes('usd')) return 'dolar';
  return 'adet';
}

/**
 * Purchasing-power line for the result receipt, based on the net minimum wage of the
 * same half-year. Cheap items are counted ("102 adet"); items costing more than a wage
 * are expressed as wage multiples ("2,6 asgari ücret"), so the line never says "0 adet".
 */
export function buildContextLine(q, allQuestions) {
  if (q.productId === 'asgari-ucret') return null;
  const wages = allQuestions.filter((x) => x.productId === 'asgari-ucret');
  const half = getHalfYear(q.date);
  const pastWage = half && wages.find((x) => getHalfYear(x.date) === half);
  if (!pastWage) return null;

  const unit = getShortUnit(q.unit);
  const currentWage = wages.find((x) => x.current)?.current.price;
  const hasNow = Boolean(q.current && currentWage);

  if (q.price <= pastWage.price) {
    const past = `O tarihte 1 asgari ücretle ${Math.floor(pastWage.price / q.price)} ${unit} alınabiliyordu`;
    if (!hasNow) return `${past}.`;
    const now = Math.floor(currentWage / q.current.price);
    return now >= 1
      ? `${past}, bugün ${now} ${unit}.`
      : `${past}; bugün 1 asgari ücret yetmiyor.`;
  }

  const past = `O tarihte bir ${q.label || q.name} ${formatRatio(q.price / pastWage.price)} asgari ücret ediyordu`;
  if (!hasNow) return `${past}.`;
  const nowName = q.current.label ? `${q.current.label.replace(/^En yeni /, '')} ise ` : '';
  return `${past}, bugün ${nowName}${formatRatio(q.current.price / currentWage)} asgari ücret.`;
}