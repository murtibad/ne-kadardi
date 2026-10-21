// Pure SVG geometry builder for per-product logarithmic price charts. No DOM access here.

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 140;
const DEFAULT_PAD = { top: 12, right: 12, bottom: 22, left: 12 };
const MAX_TICKS = 5;

function round1(value) {
  return Math.round(value * 10) / 10;
}

function parseDate(dateStr) {
  const [yearPart, monthPart] = String(dateStr).split('-');
  const year = Number(yearPart);
  const month = monthPart !== undefined ? Number(monthPart) : 1;
  return {
    year,
    time: year + (month - 1) / 12,
  };
}

function isValidRow(row) {
  return (
    Boolean(row) &&
    typeof row.date === 'string' &&
    row.date.length >= 4 &&
    typeof row.price === 'number' &&
    Number.isFinite(row.price) &&
    row.price > 0
  );
}

// Ticks sit where the year starts on the same time axis as the points (clamped to the plot),
// so a label lines up with a January point even when the series starts mid-year.
function buildXTicks(firstYear, lastYear, toX) {
  const span = lastYear - firstYear;
  if (span <= 0) {
    return [{ x: round1(toX(firstYear)), label: String(firstYear) }];
  }

  // Cap at 5 ticks (first, last, and at most 3 evenly spaced years between them).
  const count = Math.min(MAX_TICKS, span + 1);
  const seen = new Set();
  const ticks = [];

  for (let i = 0; i < count; i++) {
    const year = Math.round(firstYear + (i * span) / (count - 1));
    const label = String(year);
    if (seen.has(label)) continue;
    seen.add(label);
    const x = round1(toX(year));
    ticks.push({ x, label });
  }

  return ticks.sort((a, b) => a.x - b.x);
}

/**
 * Compute SVG path strings, point coordinates, and axis ticks for a product timeline.
 * Prices use a logarithmic y-scale so multi-decade inflation remains legible across the whole range.
 */
export function buildPriceChart(rows, options = {}) {
  if (!Array.isArray(rows)) return null;

  const valid = [];
  for (const row of rows) {
    if (!isValidRow(row)) continue;
    const { year, time } = parseDate(row.date);
    if (!Number.isFinite(year) || !Number.isFinite(time)) continue;
    valid.push({ row, year, time, logPrice: Math.log(row.price) });
  }

  if (valid.length < 2) return null;

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const pad = { ...DEFAULT_PAD, ...options.pad };
  const highlightDate = options.highlightDate ?? null;

  const plotLeft = pad.left;
  const plotRight = width - pad.right;
  const plotTop = pad.top;
  const plotBottom = height - pad.bottom;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const times = valid.map((v) => v.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = maxTime - minTime;

  const prices = valid.map((v) => v.row.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minLog = Math.log(minPrice);
  const maxLog = Math.log(maxPrice);
  const logSpan = maxLog - minLog;

  const points = valid.map(({ row, time, logPrice }, index) => {
    const xRatio = timeSpan === 0 ? index / (valid.length - 1) : (time - minTime) / timeSpan;
    const yRatio = logSpan === 0 ? 0.5 : (logPrice - minLog) / logSpan;

    return {
      x: round1(plotLeft + xRatio * plotWidth),
      y: round1(plotBottom - yRatio * plotHeight),
      date: row.date,
      price: row.price,
      isCurrent: Boolean(row.isCurrent),
      highlight: highlightDate !== null && row.date === highlightDate,
    };
  });

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const bottomY = round1(plotBottom);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const area = `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  const firstYear = valid[0].year;
  const lastYear = valid[valid.length - 1].year;
  const toX = (year) => {
    if (timeSpan === 0) return plotLeft;
    const t = Math.min(maxTime, Math.max(minTime, year));
    return plotLeft + ((t - minTime) / timeSpan) * plotWidth;
  };
  const xTicks = buildXTicks(firstYear, lastYear, toX);

  return {
    width,
    height,
    line,
    area,
    points,
    xTicks,
    minPrice,
    maxPrice,
  };
}
