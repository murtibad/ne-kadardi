// Pure HTML for the archive's price table: one row per sourced price. No DOM access here.
import { formatPrice, formatPeriod, formatIncrease, formatNumber, formatRatio, escapeHTML } from './format.js';
import { buildContextModel, getShortUnit, percentOf, WAGE_SHARE, wageInForce } from './game.js';
import { sourceKindLabel } from './source-kind.js';
import { linkifyNote } from './linkify.js';

// Shown once under the table: "hesaplandı" rows would otherwise be unexplained.
const DERIVED_HELP = 'Hesaplandı: bu fiyat o günkü kurla çevrildi (yöntem kaynakta).';

// Long tables start with the newest rows only; the old years are one tap away.
export const COLLAPSE_THRESHOLD = 12;
export const COLLAPSED_ROWS = 8;

/**
 * Which rows (chronological, oldest first) are visible. Always the NEWEST `limit` rows, whatever the display order,
 * so the current price never hides behind the toggle.
 */
export function visibleRowRange(total, { expanded = false, threshold = COLLAPSE_THRESHOLD, limit = COLLAPSED_ROWS } = {}) {
  const collapsible = total > threshold;
  const firstVisible = collapsible && !expanded ? total - limit : 0;
  return { collapsible, firstVisible, hiddenCount: collapsible ? total - limit : 0 };
}

export function rowsToggleLabel(total, expanded) {
  return expanded ? 'Daha az göster' : `Tüm yılları göster (${total})`;
}

/** A random id from `ids` that differs from `currentId` (null when there is no other choice). `rand` is injectable for tests. */
export function pickRandomId(ids, currentId, rand = Math.random) {
  const others = ids.filter((id) => id !== currentId);
  return others.length ? others[Math.min(others.length - 1, Math.floor(rand() * others.length))] : null;
}

/** True when `pinDate` is a row that the collapsed table would hide (so the archive must open the old rows). */
export function pinHiddenByCollapse(rows, pinDate) {
  if (!pinDate) return false;
  const i = rows.findIndex((r) => r.date === pinDate);
  return i >= 0 && i < visibleRowRange(rows.length).firstVisible;
}

export const WAGE_CHART_CAPTIONS = {
  count: 'Yıllar içinde 1 asgari ücretle alınabilen',
  wages: 'Yıllar içinde kaç asgari ücret',
  share: 'Yıllar içinde asgari ücrete oranı',
};

const WAGE_CHART_MIN_POINTS = 3;

function shortWageUnit(unit) {
  if (!unit) return 'adet';
  const lower = unit.toLowerCase();
  if (/\b(kg|kilo)\b/i.test(lower)) return 'kg';
  if (lower.includes('eur')) return 'euro';
  if (lower.includes('gbp')) return 'sterlin';
  return getShortUnit(unit);
}

function formatShareLabel(share) {
  const v = share < 0.1 ? Math.round(share * 1000) / 10 : Math.round(share * 100);
  return `%${formatNumber(v, { maximumFractionDigits: 1 })}`;
}

function formatWagesLabel(wages) {
  if (wages < 0.1) {
    const rounded = Math.round(wages * 100) / 100;
    return rounded > 0 ? `${formatNumber(rounded, { maximumFractionDigits: 2 })} asgari ücret` : '<0,01 asgari ücret';
  }
  return `${formatRatio(wages)} asgari ücret`;
}

function buildWageModels(product, wageRows) {
  const wages = wageRows.map((w) => ({ productId: 'asgari-ucret', date: w.date, price: w.price, current: w.isCurrent ? { date: w.date, price: w.price } : null }));
  const cur = product.rows.find((r) => r.isCurrent);
  const current = cur ? { date: cur.date, price: cur.price, label: cur.currentLabel ?? cur.label ?? null } : null;
  const currentWage = wages.find((x) => x.current)?.current.price ?? null;
  return product.rows.map((r) => {
    const q = {
      productId: product.id, name: product.name, label: r.label ?? null, unit: r.unit ?? product.unit,
      date: r.date, price: r.price, current,
    };
    const model = buildContextModel(q, wages);
    const baseWage = model
      ? (model.today && currentWage ? currentWage : wageInForce(r.date, wages)?.price ?? null)
      : null;
    return { row: r, model, baseWage };
  });
}

/**
 * "1 maaşla kaç tane?" values per row, reusing the game's purchasing-power model (same wage-in-force rule).
 * `wageRows` are the asgari-ucret timeline rows. Returns one entry per row, same order: a text such as
 * "102 adet", "2,6 asgari ücret" or "asgari ücretin %49'u", or null when no wage was in force (shown as "–").
 */
export function buildWageRows(product, wageRows) {
  if (!product || product.id === 'asgari-ucret' || !wageRows?.length) return product ? product.rows.map(() => null) : [];
  return buildWageModels(product, wageRows).map(({ model: m }) => {
    if (!m) return null;
    if (m.kind === 'share') return `asgari ücretin ${percentOf(m.then)}`;
    if (m.kind === 'count') return `${formatNumber(m.then)} ${m.unit}`;
    return `${formatRatio(m.then)} asgari ücret`;
  });
}

/**
 * Purchasing-power series for the archive chart in wage view.
 * Skips rows without a wage value and returns null when fewer than 3 points have values.
 * Picks one consistent kind across all points so the linear y-axis never mixes units or directions.
 */
export function buildWageChartSeries(product, wageRows) {
  if (!product || product.id === 'asgari-ucret' || !wageRows?.length) return null;
  const entries = buildWageModels(product, wageRows).filter((e) => e.model && e.baseWage > 0);
  if (entries.length < WAGE_CHART_MIN_POINTS) return null;

  let kind;
  if (WAGE_SHARE[product.id]) kind = 'share';
  else if (entries.some((e) => e.model.kind === 'wages')) kind = 'wages';
  else if (entries.filter((e) => e.model.kind === 'share').length >= entries.length / 2) kind = 'share';
  else kind = 'count';

  const rows = [];
  for (const { row: r, model: m, baseWage } of entries) {
    let value;
    let label;
    if (kind === 'count') {
      value = m.kind === 'count' ? m.then : Math.floor(baseWage / r.price);
      label = `${formatNumber(value)} ${shortWageUnit(r.unit ?? product.unit)}`;
    } else if (kind === 'wages') {
      value = m.kind === 'wages' || m.kind === 'share' ? m.then : r.price / baseWage;
      label = formatWagesLabel(value);
    } else {
      const share = m.kind === 'share' || m.kind === 'wages' ? m.then : r.price / baseWage;
      value = share * 100;
      label = formatShareLabel(share);
    }
    if (!(value > 0)) continue;
    rows.push({ date: r.date, price: value, isCurrent: Boolean(r.isCurrent), label });
  }

  if (rows.length < WAGE_CHART_MIN_POINTS) return null;
  return { kind, caption: WAGE_CHART_CAPTIONS[kind], rows };
}

function rowHtml(r, seen, extra, hidden, pinned = false, wageText = undefined, guess = null) {
  const period = r.isCurrent ? `${r.currentLabel || 'Güncel'} (${formatPeriod(r.date)})` : formatPeriod(r.date);
  const ratio = r.ratioToCurrent ? `<span class="timeline-ratio">${formatIncrease(r.ratioToCurrent)}</span>` : '';
  const kindLabel = r.source ? sourceKindLabel(r.source.kind) : '';
  const kindTitle = r.source?.kind === 'derived' ? ` title="${escapeHTML(DERIVED_HELP)}"` : '';
  const kind = kindLabel ? `<span class="source-kind"${kindTitle}>${escapeHTML(kindLabel)}</span>` : '';
  // Source link and note share one disclosure: five rows of "Kaynak / Ayrıntı" repeated down the page tired the eye.
  const sourceLink = r.source
    ? `<a href="${escapeHTML(r.source.url)}" target="_blank" rel="noopener" class="timeline-source" title="${escapeHTML(r.source.title)}" aria-label="${escapeHTML(period)} kaynağı: ${escapeHTML(r.source.title)}">Kaynak: ${escapeHTML(r.source.title)}</a>${kind}`
    : '';
  const seenMark = seen ? '<span class="timeline-seen">✓ tahmin ettin</span>' : '';
  const noteHtml = r.note ? `<p>${linkifyNote(r.note)}</p>` : '';
  // Distinct accessible label so screen reader disclosure lists differentiate each row's note.
  const more = sourceLink || noteHtml
    ? `<details class="timeline-note"><summary aria-label="${escapeHTML(period)} kaynak ve not">Kaynak ve not</summary><div class="timeline-note-body">${sourceLink}${noteHtml}</div></details>`
    : '';
  const date = escapeHTML(r.date);
  const guessLine = guess ? `<span class="timeline-guess">Tahminin: ${formatPrice(guess)}</span>` : '';
  const classes = [r.isCurrent && 'is-current', pinned && 'is-pinned'].filter(Boolean).join(' ');
  const rowClass = classes ? ` class="${classes}"` : '';
  return `<tr role="row" data-date="${date}"${rowClass}${extra ? ' data-extra' : ''}${hidden ? ' hidden' : ''}>
      <th scope="row" role="rowheader"><button type="button" class="row-to-chart" data-date="${date}" aria-label="${escapeHTML(period)}: grafikte göster">${escapeHTML(period)}</button></th>
      <td role="cell" class="timeline-price-cell">${wageText === undefined
        ? `<span class="timeline-price">${formatPrice(r.price)}</span>${guessLine}`
        : `<span class="timeline-price">${escapeHTML(wageText ?? '–')}</span><span class="timeline-price-sub">${formatPrice(r.price)}</span>${guessLine}`}</td>
      <td role="cell" class="timeline-detail-cell">
        <div class="timeline-meta">${ratio}${seenMark}${more}</div>
      </td>
    </tr>`;
}

/** The whole table for a product's rows, oldest first unless newestFirst. */
/** `seenDates` (optional Set of dates) marks rows the player has already answered in the game; `guesses` (same order as rows, number or null) adds the remembered guess. */
export function timelineTableHtml(rows, { newestFirst = false, seenDates = null, expanded = false, pinnedDate = null, wageTexts = null, guesses = null } = {}) {
  const { collapsible, firstVisible } = visibleRowRange(rows.length, { expanded });
  // Hidden rows stay in the DOM so the chart can still link to them and open the table.
  const extraCount = collapsible ? rows.length - COLLAPSED_ROWS : 0;
  const flagged = rows.map((r, i) => rowHtml(r, Boolean(seenDates?.has(r.date)), i < extraCount, i < firstVisible, r.date === pinnedDate, wageTexts ? wageTexts[i] : undefined, guesses ? guesses[i] : null));
  if (newestFirst) flagged.reverse();
  const toggle = collapsible
    ? `<button type="button" class="rows-toggle" aria-expanded="${expanded}">${rowsToggleLabel(rows.length, expanded)}</button>` : '';
  // The toggle sits on the side where the hidden (older) rows are: above when oldest first.
  return `${newestFirst ? '' : toggle}<table class="timeline-table" role="table">
    <caption class="visually-hidden">Fiyat geçmişi</caption>
    <thead role="rowgroup">
      <tr role="row">
        <th scope="col" role="columnheader" class="visually-hidden">Tarih</th>
        <th scope="col" role="columnheader" class="visually-hidden">Fiyat</th>
        <th scope="col" role="columnheader" class="visually-hidden">Değişim ve kaynak</th>
      </tr>
    </thead>
    <tbody role="rowgroup">${flagged.join('')}</tbody></table>${newestFirst ? toggle : ''}`
    + (rows.some((r) => r.source?.kind === 'derived') ? `<p class="derived-note">${DERIVED_HELP}</p>` : '');
}
