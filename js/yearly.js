// "Yıllık fiş": every verified price of one calendar year as a single receipt. Pure, no DOM.

import { formatPrice, formatRatio } from './format.js';

function isVerified(entry) {
  return entry?.status === 'verified' && Number.isFinite(entry.price) && entry.price > 0;
}

/** Calendar years that have at least `minItems` different products, ascending. */
export function availableYears(data, minItems = 8) {
  const byYear = new Map();
  for (const product of data?.products ?? []) {
    for (const entry of product.prices ?? []) {
      if (!isVerified(entry)) continue;
      const year = Number(entry.date.slice(0, 4));
      if (!byYear.has(year)) byYear.set(year, new Set());
      byYear.get(year).add(product.id);
    }
  }
  return [...byYear].filter(([, ids]) => ids.size >= minItems).map(([year]) => year).sort((a, b) => a - b);
}

/**
 * One row per product that has a verified price in `year` (the latest one when a product has
 * several that year). `ratio` compares with the product's current verified price.
 */
export function buildYearReceipt(data, year) {
  const rows = [];
  for (const product of data?.products ?? []) {
    const inYear = (product.prices ?? [])
      .filter((e) => isVerified(e) && Number(e.date.slice(0, 4)) === year)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (inYear.length === 0) continue;
    const entry = inYear[inYear.length - 1];
    const current = isVerified(product.current) ? product.current : null;
    const sameAsCurrent = current && current.date === entry.date && current.price === entry.price;
    rows.push({
      productId: product.id,
      name: product.name,
      label: entry.label ?? null,
      unit: entry.unit ?? product.unit,
      region: product.region ?? null,
      date: entry.date,
      price: entry.price,
      currentPrice: current && !sameAsCurrent ? current.price : null,
      ratio: current && !sameAsCurrent ? current.price / entry.price : null,
      source: entry.source ?? null,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  return { year, rows };
}

// Image rows are one line on a narrow receipt: a model label ("iPhone 16") beats the generic
// product name, and parenthesised details ("(Türk-İş)") are left for the site.
export function shortRowName(row) {
  if (row.label) return row.label;
  return row.name.replace(/\s*\([^)]*\)/g, '').trim();
}

// "1 kat" reads oddly as a rise: a row whose price is (almost) today's shows no ratio.
const MIN_RATIO = 1.05;
const hasRise = (r) => Boolean(r.ratio && r.ratio >= MIN_RATIO);

/** Text-only model for the yearly share image; the canvas code only draws it. */
export function buildYearShareModel(receipt) {
  const rows = receipt.rows.map((r) => ({
    name: shortRowName(r),
    price: formatPrice(r.price),
    ratio: hasRise(r) ? `${formatRatio(r.ratio)} kat` : '',
  }));
  const top = topRiser(receipt);
  return {
    title: `${receipt.year} · Yıllık fiş`,
    count: receipt.rows.some(hasRise)
      ? `${receipt.rows.length} kalem · bugünkü fiyata göre artış`
      : `${receipt.rows.length} kalem`,
    rows,
    topLine: top ? `En çok artan: ${shortRowName(top)}, ${formatRatio(top.ratio)} kat` : null,
    siteAddress: 'murtibad.github.io/ne-kadardi',
  };
}

function topRiser(receipt) {
  let top = null;
  for (const r of receipt.rows) if (hasRise(r) && (!top || r.ratio > top.ratio)) top = r;
  return top;
}

export function buildYearShareText(receipt, url) {
  const top = topRiser(receipt);
  return [
    `Ne Kadardı? ${receipt.year} yılında her şey ne kadardı? 🧾`,
    ...(top ? [`En çok artan: ${shortRowName(top)}, bugüne ${formatRatio(top.ratio)} kat`] : []),
    url,
  ].join('\n');
}

export function buildYearShareFileName(year) {
  return `ne-kadardi-yillik-fis-${year}.png`;
}
