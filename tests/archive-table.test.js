import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timelineTableHtml } from '../js/archive-table.js';

const rows = [
  { date: '2010-01', price: 10, barPercent: 10, ratioToCurrent: 5, source: { url: 'https://a.example/?x=1&y=2', title: 'A "kaynak"', kind: 'news' }, note: null },
  { date: '2026-01', price: 50, barPercent: 100, isCurrent: true, currentLabel: null, source: null, note: 'Not https://b.example/' },
];

test('the archive table lists rows oldest first, or newest first on request', () => {
  const html = timelineTableHtml(rows);
  assert.ok(html.indexOf('data-date="2010-01"') < html.indexOf('data-date="2026-01"'));
  const rev = timelineTableHtml(rows, { newestFirst: true });
  assert.ok(rev.indexOf('data-date="2026-01"') < rev.indexOf('data-date="2010-01"'));
});

test('the archive table escapes sources and marks the current row', () => {
  const html = timelineTableHtml(rows);
  assert.match(html, /href="https:\/\/a\.example\/\?x=1&amp;y=2"/);
  assert.match(html, /title="A &quot;kaynak&quot;"/);
  assert.match(html, /<span class="source-kind">haberlerden<\/span>/);
  assert.match(html, /class="is-current"/);
  assert.match(html, /Güncel \(Ocak 2026\)/);
  assert.match(html, /<summary>Ayrıntı<\/summary>/);
});
