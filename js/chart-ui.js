// Price chart UI: renders the SVG price history chart and wires pointer/keyboard inspection.
// main.js owns `state`; it is read through getters so there is never a second copy.
import { formatPrice, formatPeriod, escapeHTML } from './format.js';
import { isAmount } from './game.js';
import { buildPriceChart, chartHintText, labelSide, nearestPointIndex, placeRefLabel, refLabelAtStart } from './price-chart.js';

const $ = (id) => document.getElementById(id);
const SCRUBBED_KEY = 'ne-kadardi-chart-scrubbed';
let scrubbedFallback = false;
let deps = null;
const getState = () => deps.getState();

function hasScrubbed() {
  if (scrubbedFallback) return true;
  try {
    return localStorage.getItem(SCRUBBED_KEY) === '1';
  } catch {
    return false;
  }
}

let hintRemovalPending = false;

function removeChartHints() {
  hintRemovalPending = false;
  document.querySelectorAll('.pc-hint').forEach((el) => el.remove());
}

// `deferRemoval`: mid-scrub, so the caption goes on pointerup/cancel, not under the moving finger.
function markScrubbed(deferRemoval = false) {
  if (!hasScrubbed()) {
    try {
      localStorage.setItem(SCRUBBED_KEY, '1');
    } catch {
      scrubbedFallback = true;
    }
  }
  if (deferRemoval) hintRemovalPending = true;
  else removeChartHints();
}

export function initChartUi(d) {
  deps = d;
}

// Draws the product's sourced price history as a small log-scale line. The highlighted
// point is the question's date; the figcaption carries the same story for screen readers.
export function renderPriceChart(figId, productId, highlightDate = null, guess = null) {
  const fig = $(figId);
  fig._cleanupChart?.();
  const t = getState().timelines.find((x) => x.id === productId);
  const pad = { top: 22, right: 14, bottom: 22, left: 14 };
  const chart = t && buildPriceChart(t.rows, { width: 320, height: 132, highlightDate, refPrice: guess, pad });
  fig.hidden = !chart;
  if (!chart) { fig.innerHTML = ''; delete fig._activateDate; delete fig._cleanupChart; return; }
  const first = chart.points[0];
  const last = chart.points[chart.points.length - 1];
  const marked = chart.points.find((p) => p.highlight);
  // Keep end labels inside the box: anchor them towards the middle.
  const anchor = (p) => (p.x < chart.width * 0.25 ? 'start' : p.x > chart.width * 0.75 ? 'end' : 'middle');
  // A marked point in the middle leans its label away from the steeper side of the line.
  const markSide = marked && anchor(marked) === 'middle' ? labelSide(chart.points, chart.points.indexOf(marked)) : 'middle';
  // The question's own price wins when an end label would collide with it; a leaning label
  // covers about twice as much room on its side.
  const room = (p) => ((markSide === 'left' && p.x < marked.x) || (markSide === 'right' && p.x > marked.x) ? 104 : 52);
  const labels = [first, last, marked].filter((p, i, a) => p && a.indexOf(p) === i
    && (!marked || p === marked || Math.abs(p.x - marked.x) > room(p)));

  const dots = chart.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.highlight ? 5.5 : 2.5}" class="${p.highlight ? 'pc-mark' : p.isCurrent ? 'pc-now' : 'pc-dot'}"/>`).join('');
  const labelX = (p) => (p !== marked || markSide === 'middle' ? p.x : markSide === 'left' ? p.x - 6 : p.x + 6);
  const labelAnchor = (p) => (p !== marked || markSide === 'middle' ? anchor(p) : markSide === 'left' ? 'end' : 'start');
  // Labels are monospace, 14px on the receipt chart and 11px in the archive (css/style.css):
  // a character is about 0,62 em wide and capitals about 0,75 em tall.
  const fontSize = figId === 'r-chart' ? 14 : 11;
  const textWidth = (s) => s.length * fontSize * 0.62;
  const capHeight = fontSize * 0.75;
  const labelBoxes = labels.map((p) => {
    const w = textWidth(formatPrice(p.price));
    const a = labelAnchor(p);
    const x0 = a === 'start' ? labelX(p) : a === 'end' ? labelX(p) - w : labelX(p) - w / 2;
    const y = Math.max(11, p.y - 9);
    return { x0, x1: x0 + w, y0: y - capHeight, y1: y + 2 };
  });
  // The guess label tries both ends, above and below its line, and takes the spot that covers
  // no price label and no stretch of the data line; a close guess starts at the end whose points
  // are farther away.
  const refText = chart.ref ? `Tahminin ${formatPrice(guess)}${chart.ref.off === 'above' ? ' ↑' : chart.ref.off === 'below' ? ' ↓' : ''}` : '';
  const refSpot = chart.ref && placeRefLabel(chart, labelBoxes, {
    width: textWidth(refText), left: pad.left, right: chart.width - pad.right, preferStart: refLabelAtStart(chart, 110), textHeight: capHeight,
  });
  const refLine = chart.ref
    ? `<line x1="${pad.left}" y1="${chart.ref.y}" x2="${chart.width - pad.right}" y2="${chart.ref.y}" class="pc-ref"/><text x="${refSpot.atStart ? pad.left : chart.width - pad.right}" y="${refSpot.y}" text-anchor="${refSpot.atStart ? 'start' : 'end'}" class="pc-ref-label">${escapeHTML(refText)}</text>`
    : '';
  const priceLabels = labels.map((p) => `<text x="${labelX(p)}" y="${Math.max(11, p.y - 9)}" text-anchor="${labelAnchor(p)}" class="${p.highlight ? 'pc-label pc-label-mark' : 'pc-label'}">${escapeHTML(formatPrice(p.price))}</text>`).join('');
  // Drop a year label that would touch the one shown before it or the last one (which always stays).
  // A year label is about 36 units wide: centred ones take half each side, the first grows right and the last left.
  const gap = (aEdge, bEdge) => (aEdge ? 36 : 18) + (bEdge ? 36 : 18) + 4;
  const all = chart.xTicks;
  const shownTicks = [];
  all.forEach((tk, i) => {
    const last = i === all.length - 1;
    const prev = shownTicks[shownTicks.length - 1];
    if (last || ((!prev || tk.x - prev.x >= gap(shownTicks.length === 1, false))
      && all[all.length - 1].x - tk.x >= gap(i === 0, true))) shownTicks.push(tk);
  });
  const ticks = shownTicks.map((tk, i, a) => `<text x="${tk.x}" y="${chart.height - 6}" text-anchor="${i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle'}" class="pc-tick">${tk.label}</text>`).join('');
  const story = `${formatPeriod(first.date)}: ${formatPrice(first.price)}, ${formatPeriod(last.date)}: ${formatPrice(last.price)}`
    + (marked && marked !== first && marked !== last ? `; işaretli ${formatPeriod(marked.date)}: ${formatPrice(marked.price)}` : '')
    + (chart.ref ? `; tahminin: ${formatPrice(guess)}` : '');
  // Redraw the line only for a new product, not on every archive re-render (search keystrokes, chips).
  const key = `${productId}|${highlightDate}`;
  const fresh = fig.dataset.key !== key;
  fig.dataset.key = key;
  const isCoarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const hintHtml = hasScrubbed() ? '' : ` <span class="pc-hint">${escapeHTML(chartHintText(isCoarse))}</span>`;
  fig.innerHTML = `<svg class="${fresh ? 'pc-draw' : ''}" viewBox="0 0 ${chart.width} ${chart.height}" tabindex="0" role="img" aria-label="Fiyat grafiği. ${escapeHTML(story)}">
      <path d="${chart.area}" class="pc-area"/>
      <path d="${chart.line}" class="pc-line"/>
      ${refLine}${dots}${priceLabels}${ticks}
      <g class="pc-tip" hidden><line class="pc-cursor"/><rect rx="3" height="30"/><text><tspan class="pc-tip-period"></tspan><tspan class="pc-tip-price"></tspan></text></g>
    </svg>
    <span class="visually-hidden" aria-live="polite"></span>
    <figcaption>Yıllar içinde ${isAmount(productId) ? 'tutarı' : 'fiyatı'}${hintHtml}</figcaption>`;
  bindPriceChart(fig, chart, figId === 't-chart' ? (point, source) => {
    fig.dataset.source = source; // the archive reads it: no scrolling while a finger slides
    const rows = $('t-rows-container').querySelectorAll('tr[data-date]');
    let match = null;
    for (const r of rows) {
      const active = point !== null && r.dataset.date === point.date;
      r.classList.toggle('is-linked', active);
      if (active) match = r;
    }
    // Scroll only when the row is off screen, so the tapped chart does not jump away.
    const rect = match?.getBoundingClientRect();
    if (match && source === 'pointer' && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      match.scrollIntoView({ block: 'nearest' });
    }
  } : undefined);
}

// Wires pointer and keyboard inspection onto the rendered chart SVG without global state.
export function bindPriceChart(fig, chart, onActive) {
  const { points, width } = chart;
  const svgEl = fig.querySelector('svg');
  const tip = svgEl.querySelector('.pc-tip');
  const rect = tip.querySelector('rect');
  const cursor = tip.querySelector('.pc-cursor');
  const periodTspan = tip.querySelector('.pc-tip-period');
  const priceTspan = tip.querySelector('.pc-tip-price');
  const dotEls = svgEl.querySelectorAll('.pc-dot, .pc-now, .pc-mark');
  const live = fig.querySelector('[aria-live]');
  const markedIdx = points.findIndex((p) => p.highlight);
  let activeIdx = markedIdx >= 0 ? markedIdx : points.length - 1;
  // Remembers a point dismissed on pointerdown so tiny finger jitter before pointerup does not reopen it.
  let dismissedIdx = -1;

  // Tapping outside the chart dismisses a sticky touch tooltip.
  const onOutsideDown = (e) => {
    if (!svgEl.isConnected) {
      document.removeEventListener('pointerdown', onOutsideDown);
      return;
    }
    if (!(e.target instanceof Node && svgEl.contains(e.target))) hideTip();
  };
  fig._cleanupChart = () => document.removeEventListener('pointerdown', onOutsideDown);

  const showTip = (idx, viaKeyboard = false, source = viaKeyboard ? 'keyboard' : 'pointer', pointerType = '') => {
    const p = points[idx];
    if (!p) return;
    dotEls.forEach((d, i) => d.classList.toggle('pc-active', i === idx));
    activeIdx = idx;
    const period = formatPeriod(p.date) + (p.isCurrent ? ' · güncel' : '');
    const price = formatPrice(p.price);
    periodTspan.textContent = period;
    priceTspan.textContent = price;
    tip.hidden = false;
    tip.removeAttribute('hidden');
    svgEl.classList.add('has-tip');
    // Measure after unhiding so the rect fits both the 11px archive text and the 14px receipt text.
    const renderedW = Math.max(periodTspan.getComputedTextLength?.() || 0, priceTspan.getComputedTextLength?.() || 0);
    const fontPx = fig.id === 'r-chart' ? 14 : 11;
    const charW = fontPx * 0.62;
    const boxW = Math.ceil((renderedW || Math.max(period.length, price.length) * charW) + 12);
    const boxX = Math.max(0, Math.min(width - boxW, Math.round(p.x - boxW / 2)));
    // Touch and pen keep the tooltip in the top band so a scrubbing finger never covers it.
    const boxY = pointerType === 'touch' || pointerType === 'pen' ? 2 : p.y < 40 ? p.y + 8 : p.y - 38;
    rect.setAttribute('x', boxX);
    rect.setAttribute('y', boxY);
    rect.setAttribute('width', boxW);
    // Two lines of fontPx text need a taller box on the 14px receipt chart than in the archive.
    rect.setAttribute('height', fontPx * 2 + 8);
    periodTspan.setAttribute('x', boxX + 6);
    periodTspan.setAttribute('y', boxY + fontPx + 1);
    priceTspan.setAttribute('x', boxX + 6);
    priceTspan.setAttribute('y', boxY + fontPx * 2 + 3);
    // A thin guide from the label down through the point ties the label to its year while a finger scrubs.
    // Drawn only in the gap between label and dot: never through the hollow dot, never when the label sits on it.
    if (cursor) {
      const boxBottom = boxY + fontPx * 2 + 8;
      const gapEnd = p.y - 7;
      cursor.toggleAttribute('hidden', gapEnd - boxBottom < 4);
      cursor.setAttribute('x1', p.x);
      cursor.setAttribute('x2', p.x);
      cursor.setAttribute('y1', boxBottom);
      cursor.setAttribute('y2', gapEnd);
    }
    document.addEventListener('pointerdown', onOutsideDown);
    if (viaKeyboard && live) live.textContent = `${period}: ${price}`;
    onActive?.(p, source);
  };

  const hideTip = () => {
    document.removeEventListener('pointerdown', onOutsideDown);
    dotEls.forEach((d) => d.classList.remove('pc-active'));
    tip.hidden = true;
    tip.setAttribute('hidden', '');
    svgEl.classList.remove('has-tip');
    onActive?.(null, null);
  };

  // Lets the archive table highlight and announce a chart point by date when a row is tapped.
  fig._activateDate = (date) => {
    const idx = points.findIndex((p) => p.date === date);
    if (idx >= 0) showTip(idx, true, 'keyboard');
  };

  // Maps clientX into the SVG viewBox width so horizontal scrubbing picks the closest year.
  const pointAt = (clientX) => {
    const box = svgEl.getBoundingClientRect();
    return box.width > 0 ? nearestPointIndex(points, ((clientX - box.left) / box.width) * width) : -1;
  };

  const handle = (e) => {
    if (e.type === 'pointerdown') {
      const idx = pointAt(e.clientX);
      if (idx < 0) return;
      if (e.pointerType !== 'mouse' && !tip.hidden && idx === activeIdx) {
        dismissedIdx = idx;
        hideTip();
        return;
      }
      dismissedIdx = -1;
      // A touch may become a scrub: scroll the linked row only on lift (pointerup), not on first contact.
      showTip(idx, false, e.pointerType === 'mouse' ? 'pointer' : 'hover', e.pointerType);
    } else if (e.type === 'pointermove') {
      const idx = pointAt(e.clientX);
      if (idx < 0 || idx === dismissedIdx) return;
      dismissedIdx = -1;
      // 'hover' while the finger moves: the archive must not scroll its table away from under the finger.
      if (tip.hidden || idx !== activeIdx) {
        const changed = !tip.hidden && idx !== activeIdx;
        // A tiny tick each time the finger reaches a new year, like the notches of a dial.
        if (e.pointerType === 'touch' && changed) deps?.onScrubTick?.();
        showTip(idx, false, 'hover', e.pointerType);
        if (changed) markScrubbed(true);
      }
    } else if (e.type === 'pointercancel') {
      // The browser took the touch for a vertical page scroll: do not leave the label stuck on the chart.
      dismissedIdx = -1;
      if (hintRemovalPending) removeChartHints();
      if (e.pointerType !== 'mouse') hideTip();
    } else if (e.type === 'pointerup') {
      dismissedIdx = -1;
      if (hintRemovalPending) removeChartHints();
      // Finger lifted on a point: now the linked table row may scroll into view.
      if (e.pointerType !== 'mouse' && !tip.hidden) onActive?.(points[activeIdx], 'pointer');
    } else if (e.type === 'pointerleave') {
      dismissedIdx = -1;
      if (hintRemovalPending) removeChartHints();
      if (e.pointerType !== 'touch' && e.target === svgEl) hideTip();
    } else if (e.type === 'blur') {
      hideTip();
    } else if (e.type === 'keydown') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const next = Math.max(0, Math.min(points.length - 1, activeIdx + step));
        showTip(next, true, 'keyboard');
        markScrubbed();
      } else if (e.key === 'Home') {
        // Home jumps to the first point of the price series.
        e.preventDefault();
        showTip(0, true, 'keyboard');
      } else if (e.key === 'End') {
        // End jumps to the last point of the price series.
        e.preventDefault();
        showTip(points.length - 1, true, 'keyboard');
      } else if (e.key === 'Escape') {
        hideTip();
      }
    }
  };

  svgEl.addEventListener('pointerdown', handle);
  svgEl.addEventListener('pointermove', handle);
  svgEl.addEventListener('pointerup', handle);
  svgEl.addEventListener('pointercancel', handle);
  svgEl.addEventListener('pointerleave', handle);
  svgEl.addEventListener('blur', handle);
  svgEl.addEventListener('keydown', handle);
}
