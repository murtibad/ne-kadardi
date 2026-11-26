// Share-related text helpers with no heavy imports, so the menu and question screens can use them without
// pulling in banter.js or tax.js (share-model.js re-exports everything here).
import { formatPeriod, formatPrice, formatRatio } from './format.js';

export const HUGE_RATIO = 100;

export function verdictText(r) {
  if (r.factor === 1) return 'Tam isabet! 🎯';
  if (r.direction === 'exact') return 'Neredeyse tam isabet!';
  // "1,2 kat az" reads like a puzzle; a near miss says so in words.
  if (r.factor < 1.5) return `Biraz ${r.direction === 'over' ? 'fazla' : 'az'} tahmin ettin`;
  if (r.factor >= HUGE_RATIO) {
    return r.direction === 'over'
      ? 'Çok yüksek tahmin ettin'
      : 'Çok düşük tahmin ettin';
  }
  return `${formatRatio(r.factor)} kat ${r.direction === 'over' ? 'fazla' : 'az'} tahmin ettin`;
}

// Products whose label is a model name: the title leads with the model and says what it is ("AirPods 5" alone says little).
const MODEL_KIND = {
  iphone: '',
  airpods: 'kablosuz kulaklık, temel model',
  playstation: 'oyun konsolu',
  'ea-fc-oyun': 'PlayStation futbol oyunu, standart sürüm',
};

export function questionTitle(q) {
  if (!q.label) return q.name;
  const kind = MODEL_KIND[q.productId];
  if (kind == null) return `${q.name}: ${q.label}`;
  return kind ? `${q.label} (${kind})` : q.label;
}

// Skipping used to hide the price for good, which kills curiosity: the next card shows it once.
export function skipRevealText(q) {
  if (!q || !Number.isFinite(q.price)) return '';
  return `Geçtiğin soru: ${formatPeriod(q.date)} · ${questionTitle(q).replace(/\s*\(.*\)$/, '')} — ${formatPrice(q.price)}`;
}

const CLOSE_SCORE = 75;
const RECORD_MIN = 50;
const CLOSE_STREAK = 3;

// Suffix for the result screen's session line. `prevBest` is the best before this answer,
// `recent` already includes it. A new record wins over the 3-close-guesses note.
export function sessionBadge({ prevBest, score, playedAfter, recent }) {
  // "Yeni rekor" for 5 puan reads like mockery: only a genuinely good score counts as a record.
  if (playedAfter >= 2 && score > prevBest && score >= RECORD_MIN) return ` · 🎯 Yeni rekor!${prevBest > 0 ? ` (öncekisi ${prevBest})` : ''}`; // old saves may have no best yet
  let run = 0;
  for (let i = recent.length - 1; i >= 0 && recent[i] >= CLOSE_SCORE; i -= 1) run += 1;
  if (run >= CLOSE_STREAK) return ` · Üst üste ${run} yakın tahmin!`;
  return '';
}

const WRAP_MIN = 3;

// One kind line for the menu after a run of free questions. Empty below WRAP_MIN answers.
export function sessionWrapText(count, avg) {
  if (!Number.isFinite(count) || count < WRAP_MIN || !Number.isFinite(avg)) return '';
  const a = Math.round(avg);
  // Words for people who lived through those prices: never a lesson, never mockery.
  const close = a < 30 ? 'Eski fiyatları hatırlamak kolay değil, olsun.'
    : a < 60 ? 'Fena değil, bir dahakine daha iyi olur.'
    : a < 80 ? 'Gayet iyi!'
    : 'Harika, dün gibi aklında!';
  // "Bu oturumda": the card below shows the all-time average, so this one must say it is just today's.
  return `Bu oturumda ${count} soru çözdün, ortalaman ${a}. ${close}`;
}

/** True when the menu's session stat ("en yüksek M") is shown and beats the saved best guess (older saves). */
export function bestGuessBelowSessionBest(score, sessionBest, played) {
  return played > 1 && sessionBest > 0 && Number.isFinite(score) && score < sessionBest;
}

/** Format the player's all-time best guess as one calm menu line. */
export function bestGuessText(question, score) {
  // A 0-point "best" reads like a joke on the menu; show it once there is something to be proud of.
  if (!question || !question.date || !Number.isFinite(score) || score < 1) return '';
  // Score first: product names can end in their own brackets ("Benzin (kurşunsuz 95)").
  return `En iyi tahminin ${Math.round(score)} puan: ${formatPeriod(question.date).replace(' ', '\u00a0')} · ${questionTitle(question)}`;
}
