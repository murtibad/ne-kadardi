// Pure HTML for the archive's price table: one row per sourced price. No DOM access here.
import { formatPrice, formatPeriod, formatIncrease, escapeHTML } from './format.js';
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

function rowHtml(r, seen, extra, hidden, pinned = false) {
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
  const classes = [r.isCurrent && 'is-current', pinned && 'is-pinned'].filter(Boolean).join(' ');
  const rowClass = classes ? ` class="${classes}"` : '';
  return `<tr role="row" data-date="${date}"${rowClass}${extra ? ' data-extra' : ''}${hidden ? ' hidden' : ''}>
      <th scope="row" role="rowheader"><button type="button" class="row-to-chart" data-date="${date}" aria-label="${escapeHTML(period)}: grafikte göster">${escapeHTML(period)}</button></th>
      <td role="cell" class="timeline-price-cell"><span class="timeline-price">${formatPrice(r.price)}</span></td>
      <td role="cell" class="timeline-detail-cell">
        <div class="timeline-meta">${ratio}${seenMark}${more}</div>
      </td>
    </tr>`;
}

/** The whole table for a product's rows, oldest first unless newestFirst. */
/** `seenDates` (optional Set of dates) marks rows the player has already answered in the game. */
export function timelineTableHtml(rows, { newestFirst = false, seenDates = null, expanded = false, pinnedDate = null } = {}) {
  const { collapsible, firstVisible } = visibleRowRange(rows.length, { expanded });
  // Hidden rows stay in the DOM so the chart can still link to them and open the table.
  const extraCount = collapsible ? rows.length - COLLAPSED_ROWS : 0;
  const flagged = rows.map((r, i) => rowHtml(r, Boolean(seenDates?.has(r.date)), i < extraCount, i < firstVisible, r.date === pinnedDate));
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
