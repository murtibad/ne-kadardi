// Pure logic for the "Zaman makinesi" browse screen. No DOM access here.

const MIN_BAR_PERCENT = 8;

function isVerified(entry) {
  return entry?.status === 'verified' && Number.isFinite(entry.price) && entry.price > 0;
}

/**
 * Build one timeline per product from the parsed prices.json object.
 * Only verified entries are used. Rows are sorted by date; the current price, when verified,
 * is the last row. Products with fewer than two verified points are skipped.
 * Bar widths use a log scale so a 100x price rise stays readable next to a 2x one.
 */
export function buildTimelines(data) {
  const timelines = [];
  for (const product of data?.products ?? []) {
    const points = (product.prices ?? [])
      .filter(isVerified)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({ entry, isCurrent: false }));
    if (isVerified(product.current)) points.push({ entry: product.current, isCurrent: true });
    if (points.length < 2) continue;

    const prices = points.map((p) => p.entry.price);
    const minLog = Math.log(Math.min(...prices));
    const maxLog = Math.log(Math.max(...prices));
    const currentPrice = isVerified(product.current) ? product.current.price : null;

    const rows = points.map(({ entry, isCurrent }) => {
      const t = maxLog === minLog ? 1 : (Math.log(entry.price) - minLog) / (maxLog - minLog);
      return {
        date: entry.date,
        price: entry.price,
        ratioToCurrent: currentPrice !== null && !isCurrent ? currentPrice / entry.price : null,
        barPercent: maxLog === minLog ? 100 : MIN_BAR_PERCENT + (100 - MIN_BAR_PERCENT) * t,
        note: entry.note || null,
        source: entry.source || null,
        isCurrent,
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
