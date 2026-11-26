import { formatPeriod, formatPrice, formatRatio, formatIncrease, unitLine } from './format.js';
import { actualLabel, scoreTier } from './game.js';
import { taxBreakdown } from './tax.js';
import { stampTitle } from './banter.js';

export function buildShareText(q, r, url) {
  return [
    'Ne Kadardı? 🤔',
    `${formatPeriod(q.date)} · ${questionTitle(q)}`,
    `Tahminim: ${formatPrice(r.guess)}`,
    `Gerçek: ${formatPrice(q.price)}`,
    `Puanım: ${r.score}/100`,
    url,
  ].join('\n');
}

// From this ratio up the number itself is noise ("350.661 kat"): say it in words.
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

export function buildShareFileName(q) {
  const trMap = { 'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u', 'İ': 'i', 'Ğ': 'g', 'Ş': 's', 'Ç': 'c', 'Ö': 'o', 'Ü': 'u' };
  const safeName = (q.name || '').replace(/[ığşçöüİĞŞÇÖÜ]/g, m => trMap[m]).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `ne-kadardi-${safeName}-${q.date}.png`;
}

// Identifies one finished round, so a prewarmed share image is reused only for that exact result.
export function shareImageKey(q, r, { played = 0, total = 0, round = 0 } = {}) {
  if (!q || !r) return null;
  return [q.id, q.productId, q.date, r.guess, r.score, played, total, round].join('|');
}

export function buildShareImageModel(q, r, { contextLine = null, taxLine = null } = {}) {
  const hasCurrent = q.current !== null && q.current !== undefined &&
    !(q.current.date === q.date && q.current.price === q.price);

  let compactTaxLine = taxLine;
  if (compactTaxLine === null && q?.tax && q?.price && q?.date) {
    const tb = taxBreakdown(q.price, q.date, q.tax);
    if (tb) {
      const sharePct = Math.round(tb.share * 100);
      const roundedAmount = Math.round(tb.total / 100) * 100;
      compactTaxLine = `Vergi payı: yaklaşık %${sharePct} (${formatPrice(roundedAmount)})`;
    }
  }

  return {
    title: `${formatPeriod(q.date)} · ${questionTitle(q)}`,
    unit: unitLine(q.unit, q.region),
    guess: formatPrice(r.guess),
    actualLabel: actualLabel(q.productId),
    actual: formatPrice(q.price),
    verdict: verdictText(r),
    hasCurrent,
    // Receipt rows are narrow: a named current price shows just the model, e.g. "iPhone 17".
    currentLabel: hasCurrent
      ? (q.current.label ? q.current.label.replace(/^En yeni /, '') : `Güncel (${formatPeriod(q.current.date)})`)
      : null,
    current: hasCurrent ? formatPrice(q.current.price) : null,
    increase: hasCurrent ? formatIncrease(q.current.price / q.price) : null,
    score: `${r.score}/100`,
    tier: scoreTier(r.score),
    stamp: stampTitle(r.score),
    contextText: contextLine || null,
    taxLine: compactTaxLine || null,
    iconSrc: q.image ? q.image.src : null,
    siteAddress: 'murtibad.github.io/ne-kadardi'
  };
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

/** Format the player's all-time best guess as one calm menu line. */
export function bestGuessText(question, score) {
  // A 0-point "best" reads like a joke on the menu; show it once there is something to be proud of.
  if (!question || !question.date || !Number.isFinite(score) || score < 1) return '';
  // Score first: product names can end in their own brackets ("Benzin (kurşunsuz 95)").
  return `En iyi tahminin ${Math.round(score)} puan: ${formatPeriod(question.date).replace(' ', '\u00a0')} · ${questionTitle(question)}`;
}
