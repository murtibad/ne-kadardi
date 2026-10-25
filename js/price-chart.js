// Pure SVG geometry builder for per-product logarithmic price charts. No DOM access here.

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 140;
const DEFAULT_PAD = { top: 12, right: 12, bottom: 22, left: 12 };
const MAX_TICKS = 5;
const REF_STRETCH = 10;

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

// First tick stays on the first data point labelled with its year; later ticks sit at
// their true January positions on the time axis (skipping any year start before minTime).
function buildXTicks(firstYear, lastYear, firstX, minTime, toX) {
  const ticks = [{ x: firstX, label: String(firstYear) }];
  const span = lastYear - firstYear;
  if (span <= 0) {
    return ticks;
  }

  // Cap at 5 ticks (first, last, and at most 3 evenly spaced years between them).
  const count = Math.min(MAX_TICKS, span + 1);
  const seen = new Set([String(firstYear)]);

  for (let i = 1; i < count; i++) {
    const year = Math.round(firstYear + (i * span) / (count - 1));
    const label = String(year);
    if (seen.has(label) || year < minTime) continue;
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
  const refPrice = options.refPrice ?? null;
  const hasRef = typeof refPrice === 'number' && Number.isFinite(refPrice) && refPrice > 0;

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
  // Include refPrice in the y scale so a wild guess still lands inside the plot box,
  // while keeping minPrice/maxPrice as the actual data bounds.
  // ...but a wild guess (1.250.000 for a 17 lira fee) would flatten the data into a line, so the
  // scale stretches at most REF_STRETCH past the data and the ref pins to the edge beyond that.
  const lowLimit = minPrice / REF_STRETCH;
  const highLimit = maxPrice * REF_STRETCH;
  const refShown = hasRef ? Math.min(highLimit, Math.max(lowLimit, refPrice)) : null;
  const scaleMin = hasRef ? Math.min(minPrice, refShown) : minPrice;
  const scaleMax = hasRef ? Math.max(maxPrice, refShown) : maxPrice;
  const minLog = Math.log(scaleMin);
  const maxLog = Math.log(scaleMax);
  const logSpan = maxLog - minLog;
  const toY = (logPrice) => {
    const yRatio = logSpan === 0 ? 0.5 : (logPrice - minLog) / logSpan;
    return round1(plotBottom - yRatio * plotHeight);
  };

  const points = valid.map(({ row, time, logPrice }, index) => {
    const xRatio = timeSpan === 0 ? index / (valid.length - 1) : (time - minTime) / timeSpan;

    return {
      x: round1(plotLeft + xRatio * plotWidth),
      y: toY(logPrice),
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
    return plotLeft + ((year - minTime) / timeSpan) * plotWidth;
  };
  const xTicks = buildXTicks(firstYear, lastYear, firstX, minTime, toX);
  const ref = hasRef
    ? { y: toY(Math.log(refShown)), price: refPrice, off: refPrice > highLimit ? 'above' : refPrice < lowLimit ? 'below' : null }
    : null;

  return {
    width,
    height,
    line,
    area,
    points,
    xTicks,
    minPrice,
    maxPrice,
    ref,
  };
}

// Which side of a middle point its price label should sit on: the side where the line is lower,
// so a steep rise right after the point does not run through the text.
export function labelSide(points, index) {
  const p = points[index];
  const prev = points[index - 1];
  const next = points[index + 1];
  if (!p || !prev || !next) return 'middle';
  // SVG y grows downwards: the lower neighbour has the larger y.
  return next.y < prev.y ? 'left' : 'right';
}

// The data line's y at x (straight segments between points), or null outside the line.
function lineYAt(points, x) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x >= a.x && x <= b.x) return b.x === a.x ? a.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return null;
}

// Where the dashed guess label goes: each end of the line, above or below it. A spot that
// covers a price label is worst, one the data line runs through is next; ties keep the order
// (preferred end first, above before below). Boxes are {x0, x1, y0, y1} in chart units and
// 	extHeight is the label's cap height; the result carries the baseline y to draw at.
export function placeRefLabel(chart, boxes, { width, left, right, preferStart, textHeight = 8 }) {
  const ref = chart.ref.y;
  const spots = [];
  for (const atStart of [preferStart, !preferStart]) {
    for (const below of [false, true]) {
      const y0 = below ? ref + 4 : ref - 5 - textHeight;
      const y1 = y0 + textHeight + 2;
      // Above needs room under the top edge; below must stay clear of the year labels.
      if (y0 < 0 || y1 > chart.height - 18) continue;
      const x0 = atStart ? left : right - width;
      const x1 = x0 + width;
      const covers = boxes.some((b) => b.x0 < x1 && b.x1 > x0 && b.y0 < y1 && b.y1 > y0);
      let crosses = false;
      for (let x = x0; x <= x1 && !crosses; x += 4) {
        const y = lineYAt(chart.points, x);
        crosses = y !== null && y > y0 - 2 && y < y1 + 2;
      }
      spots.push({ atStart, below, y: below ? ref + 4 + textHeight : ref - 5, score: (covers ? 100 : 0) + (crosses ? 10 : 0) + spots.length });
    }
  }
  if (!spots.length) return { atStart: preferStart, below: true, y: ref + 4 + textHeight };
  const best = spots.reduce((a, b) => (b.score < a.score ? b : a));
  return { atStart: best.atStart, below: best.below, y: best.y };
}
// True when the guess label fits better at the left end: compares how close the data points
// under a label-wide strip at each end come to the guess line.
export function refLabelAtStart(chart, labelWidth) {
  const gap = (x0, x1) => Math.min(Infinity, ...chart.points.filter((p) => p.x >= x0 && p.x <= x1).map((p) => Math.abs(p.y - chart.ref.y)));
  return gap(0, labelWidth) >= gap(chart.width - labelWidth, chart.width);
}
