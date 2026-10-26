// "İpucu" for the guess screen: the dollar rate and the minimum wage of the question's year
// as a reference. Pure, no DOM. Using it costs a share of the score (HINT_FACTOR).
import { formatPrice, formatPeriod } from './format.js';
import { categoryOf } from './categories.js';

export const MAX_HINTS = 2; // hint 1: an everyday product; hint 2: dollar and minimum wage
export const HINT_FACTOR = 0.8; // 20% off the score per hint (x0.8, x0.6)

// No hint where the hint itself would be (nearly) the answer: currencies and gold (track the
// dollar), the euro-priced Schengen fee, and amounts tied to the minimum wage or set by law
// from it (wage, scholarship, pension, hunger line, birth benefit).
const NO_HINT = new Set([
  'dolar', 'euro', 'sterlin', 'gram-altin', 'ceyrek-altin', 'schengen-vize',
  'asgari-ucret', 'kyk-burs', 'emekli-en-dusuk-aylik', 'aclik-siniri', 'dogum-yardimi',
]);
const HINT_PRODUCTS = [
  { id: 'dolar', label: 'Dolar kuru' },
  { id: 'asgari-ucret', label: 'Asgari ücret' },
];

/** Returns [{label, value, period}] for the question's year, or null when no hint is available. */
export function buildHint(question, allQuestions) {
  if (NO_HINT.has(question.productId)) return null;
  const lines = [];
  for (const { id, label } of HINT_PRODUCTS) {
    const inYear = allQuestions
      .filter((x) => x.productId === id && x.year === question.year)
      .sort((a, b) => a.date.localeCompare(b.date));
    const hit = inYear[0];
    if (hit) lines.push({ label, value: formatPrice(hit.price), period: formatPeriod(hit.date) });
  }
  return lines.length > 0 ? lines : null;
}

// Everyday things people know the price of; short names for the hint slip.
const EVERYDAY_LABELS = {
  'ekmek': 'Halk Ekmek',
  'simit': 'Simit',
  'firin-ekmegi': 'Fırın ekmeği',
  'big-mac': 'Big Mac',
  'benzin': '1 litre benzin',
  'sigara-marlboro': "Sigara (20'li)",
  'mektup-pulu': 'Mektup pulu',
  'taksi-acilis': 'Taksi açılış ücreti',
  'istanbul-ulasim': 'Toplu taşıma bileti',
  'sinema-ortalama-bilet': 'Sinema bileti',
  'kopru': 'Köprü geçişi',
  'netflix': 'Netflix (aylık)',
  'spotify': 'Spotify (aylık)',
};
export const EVERYDAY_HINT_IDS = Object.keys(EVERYDAY_LABELS);

/** One random everyday product priced in the question's year: {id, label, value, period} or null.
 *  Prefers a different category than the question so the hint is not a near-twin of the answer. */
export function buildEverydayHint(question, allQuestions, rng = Math.random) {
  if (NO_HINT.has(question.productId)) return null;
  const cands = [];
  for (const id of EVERYDAY_HINT_IDS) {
    if (id === question.productId) continue;
    const hit = allQuestions
      .filter((x) => x.productId === id && x.year === question.year)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (hit) cands.push({ id, hit });
  }
  if (cands.length === 0) return null;
  const qCat = categoryOf(question.productId);
  const other = cands.filter((c) => categoryOf(c.id) !== qCat);
  const pool = other.length > 0 ? other : cands;
  const { id, hit } = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  return { id, label: EVERYDAY_LABELS[id], value: formatPrice(hit.price), period: formatPeriod(hit.date) };
}

/** hintsUsed: 0, 1 or 2 (true counts as 1). */
export function applyHintPenalty(score, hintsUsed) {
  const n = Math.min(MAX_HINTS, Number(hintsUsed) || 0);
  return n > 0 ? Math.round(score * (1 - (1 - HINT_FACTOR) * n)) : score;
}
