// Pure logic for the "Fiyat Arşivi" browse screen. No DOM access here.

function isVerified(entry) {
  return entry?.status === 'verified' && Number.isFinite(entry.price) && entry.price > 0;
}

/**
 * Build one timeline per product from the parsed prices.json object.
 * Only verified entries are used. Rows are sorted by date; the current price, when verified,
 * is the last row. Products with fewer than two verified points are skipped.
 */
export function buildTimelines(data) {
  const timelines = [];
  for (const product of data?.products ?? []) {
    const points = (product.prices ?? [])
      .filter(isVerified)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({ entry, isCurrent: false }));
    if (isVerified(product.current)) {
      // A "newest launch" current price can equal the last dated entry: mark that row instead of repeating it.
      const same = points.find((p) => p.entry.date === product.current.date && p.entry.price === product.current.price);
      if (same) same.isCurrent = true;
      else points.push({ entry: product.current, isCurrent: true });
    }
    if (points.length < 2) continue;

    const currentPrice = isVerified(product.current) ? product.current.price : null;

    const rows = points.map(({ entry, isCurrent }) => {
      return {
        date: entry.date,
        price: entry.price,
        ratioToCurrent: currentPrice !== null && !isCurrent ? currentPrice / entry.price : null,
        note: entry.note || null,
        source: entry.source || null,
        isCurrent,
        currentLabel: isCurrent ? product.current.label ?? null : null,
      };
    });

    timelines.push({
      id: product.id,
      name: product.name,
      unit: product.unit,
      region: product.region || null,
      image: product.image || null,
      rows,
    });
  }
  return timelines;
}
