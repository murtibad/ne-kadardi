import { formatPeriod, formatPrice, formatRatio } from './format.js';
import { scoreTier } from './game.js';

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

export function verdictText(r) {
  if (r.direction === 'exact') return 'Neredeyse tam isabet!';
  return `${formatRatio(r.factor)} kat ${r.direction === 'over' ? 'fazla' : 'az'} tahmin ettin`;
}

export function questionTitle(q) {
  return q.label ? `${q.name}: ${q.label}` : q.name;
}

export function buildShareFileName(q) {
  const trMap = { 'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u', 'İ': 'i', 'Ğ': 'g', 'Ş': 's', 'Ç': 'c', 'Ö': 'o', 'Ü': 'u' };
  const safeName = (q.name || '').replace(/[ığşçöüİĞŞÇÖÜ]/g, m => trMap[m]).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `ne-kadardi-${safeName}-${q.date}.png`;
}

export function buildShareImageModel(q, r, { contextLine = null, taxLine = null } = {}) {
  const hasCurrent = q.current !== null && q.current !== undefined &&
    !(q.current.date === q.date && q.current.price === q.price);
  return {
    title: `${formatPeriod(q.date)} · ${questionTitle(q)}`,
    unit: q.region ? `${q.unit} · ${q.region}` : q.unit,
    guess: formatPrice(r.guess),
    actual: formatPrice(q.price),
    verdict: verdictText(r),
    hasCurrent,
    // Receipt rows are narrow: a named current price shows just the model, e.g. "iPhone 17".
    currentLabel: hasCurrent
      ? (q.current.label ? q.current.label.replace(/^En yeni /, '') : `Güncel (${formatPeriod(q.current.date)})`)
      : null,
    current: hasCurrent ? formatPrice(q.current.price) : null,
    increase: hasCurrent ? `${formatRatio(q.current.price / q.price)} kat arttı` : null,
    score: `${r.score}/100`,
    tier: scoreTier(r.score),
    contextText: [contextLine, taxLine].filter(Boolean).join(' ') || null,
    iconSrc: q.image ? q.image.src : null,
    siteAddress: 'murtibad.github.io/ne-kadardi'
  };
}
