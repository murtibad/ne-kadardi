import { formatPeriod, formatPrice, formatRatio, formatIncrease, unitLine } from './format.js';
import { actualLabel, scoreTier } from './game.js';
import { taxBreakdown } from './tax.js';
import { stampTitle } from './banter.js';
import { questionTitle, verdictText } from './share-text.js';

export { HUGE_RATIO, verdictText, questionTitle, skipRevealText, sessionBadge, sessionWrapText, bestGuessBelowSessionBest, bestGuessText } from './share-text.js';

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

