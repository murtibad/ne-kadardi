// "Yıllık fiş": every verified price of one calendar year as a single receipt. Pure, no DOM.

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
