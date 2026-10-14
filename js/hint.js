// "İpucu" for the guess screen: the dollar rate and the minimum wage of the question's year
// as a reference. Pure, no DOM. Using it costs a share of the score (HINT_FACTOR).
import { formatPrice, formatPeriod } from './format.js';

export const HINT_FACTOR = 0.8; // 20% off the score

// A hint on these would give the answer away (the hint products themselves, or near copies).
const NO_HINT = new Set(['dolar', 'euro', 'asgari-ucret']);
const HINT_PRODUCTS = [
  { id: 'dolar', label: 'Dolar kuru' },
  { id: 'asgari-ucret', label: 'Asgari ücret' },
];

/** Returns [{label, text}] for the question's year, or null when no hint is available. */
export function buildHint(question, allQuestions) {
  if (NO_HINT.has(question.productId)) return null;
  const lines = [];
  for (const { id, label } of HINT_PRODUCTS) {
    const inYear = allQuestions
      .filter((x) => x.productId === id && x.year === question.year)
      .sort((a, b) => a.date.localeCompare(b.date));
    const hit = inYear[0];
    if (hit) lines.push({ label, text: `${formatPeriod(hit.date)}: ${formatPrice(hit.price)}` });
  }
  return lines.length > 0 ? lines : null;
}

export function applyHintPenalty(score, hinted) {
  return hinted ? Math.round(score * HINT_FACTOR) : score;
}
