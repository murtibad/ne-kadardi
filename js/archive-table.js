// Pure HTML for the archive's price table: one row per sourced price. No DOM access here.
import { formatPrice, formatPeriod, formatIncrease, escapeHTML } from './format.js';
import { sourceKindLabel } from './source-kind.js';
import { linkifyNote } from './linkify.js';

function rowHtml(r) {
  const period = r.isCurrent ? `${r.currentLabel || 'Güncel'} (${formatPeriod(r.date)})` : formatPeriod(r.date);
  const ratio = r.ratioToCurrent ? `<span class="timeline-ratio">${formatIncrease(r.ratioToCurrent)}</span>` : '';
  const kindLabel = r.source ? sourceKindLabel(r.source.kind) : '';
  const kind = kindLabel ? `<span class="source-kind">${escapeHTML(kindLabel)}</span>` : '';
  const source = r.source
    ? `<a href="${escapeHTML(r.source.url)}" target="_blank" rel="noopener" class="timeline-source" title="${escapeHTML(r.source.title)}" aria-label="${escapeHTML(period)} kaynağı: ${escapeHTML(r.source.title)}">Kaynak</a>${kind}`
    : '';
  const note = r.note ? `<details class="timeline-note"><summary>Ayrıntı</summary><p>${linkifyNote(r.note)}</p></details>` : '';
  const date = escapeHTML(r.date);
  return `<tr role="row" data-date="${date}"${r.isCurrent ? ' class="is-current"' : ''}>
      <th scope="row" role="rowheader"><button type="button" class="row-to-chart" data-date="${date}" aria-label="${escapeHTML(period)}: grafikte göster">${escapeHTML(period)}</button></th>
      <td role="cell" class="timeline-price-cell"><span class="timeline-price">${formatPrice(r.price)}</span></td>
      <td role="cell" class="timeline-detail-cell">
        <div class="timeline-meta">${ratio}${source}${note}</div>
      </td>
    </tr>`;
}

/** The whole table for a product's rows, oldest first unless newestFirst. */
export function timelineTableHtml(rows, { newestFirst = false } = {}) {
  const ordered = newestFirst ? [...rows].reverse() : rows;
  return `<table class="timeline-table" role="table">
    <caption class="visually-hidden">Fiyat geçmişi</caption>
    <thead role="rowgroup">
      <tr role="row">
        <th scope="col" role="columnheader" class="visually-hidden">Tarih</th>
        <th scope="col" role="columnheader" class="visually-hidden">Fiyat</th>
        <th scope="col" role="columnheader" class="visually-hidden">Değişim ve kaynak</th>
      </tr>
    </thead>
    <tbody role="rowgroup">${ordered.map(rowHtml).join('')}</tbody></table>`;
}
