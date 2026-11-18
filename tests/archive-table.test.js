import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timelineTableHtml, visibleRowRange, rowsToggleLabel, pickRandomId } from '../js/archive-table.js';

const rows = [
  { date: '2010-01', price: 10, ratioToCurrent: 5, source: { url: 'https://a.example/?x=1&y=2', title: 'A "kaynak"', kind: 'news' }, note: null },
  { date: '2026-01', price: 50, isCurrent: true, currentLabel: null, source: null, note: 'Not https://b.example/' },
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
  assert.match(html, /<summary aria-label="Ocak 2010 kaynak ve not">Kaynak ve not<\/summary>/);
  assert.doesNotMatch(html, /tahmin ettin/);
});

test('the archive table marks only rows whose dates are in seenDates', () => {
  const html = timelineTableHtml(rows, { seenDates: new Set(['2010-01']) });
  const body = html.slice(html.indexOf('<tbody'));
  const [firstRow, secondRow] = body.split('<tr role="row"').slice(1);
  assert.match(firstRow, /✓ tahmin ettin/);
  assert.doesNotMatch(secondRow, /tahmin ettin/);
});

const many = (n) => Array.from({ length: n }, (_, i) => ({ date: `${2000 + i}-01`, price: i + 1, source: null, note: null }));

test('short tables are never collapsed', () => {
  assert.deepEqual(visibleRowRange(12), { collapsible: false, firstVisible: 0, hiddenCount: 0 });
  assert.doesNotMatch(timelineTableHtml(many(12)), /rows-toggle/);
});

test('a long table shows the newest 8 rows, in either order, and expands fully', () => {
  assert.deepEqual(visibleRowRange(20), { collapsible: true, firstVisible: 12, hiddenCount: 12 });
  assert.equal(visibleRowRange(20, { expanded: true }).firstVisible, 0);
  for (const newestFirst of [false, true]) {
    const html = timelineTableHtml(many(20), { newestFirst });
    const shown = html.slice(html.indexOf('<tbody')).split('<tr role="row"').slice(1).filter((r) => !/ hidden/.test(r.split('>')[0]));
    assert.equal(shown.length, 8);
    assert.ok(shown.every((r) => Number(/data-date="(\d{4})/.exec(r)[1]) >= 2012));
    assert.match(html, /Tüm yılları göster \(20\)/);
  }
  const open = timelineTableHtml(many(20), { expanded: true });
  assert.doesNotMatch(open, /<tr[^>]* hidden/);
  assert.match(open, /Daha az göster/);
  assert.equal(rowsToggleLabel(20, true), 'Daha az göster');
});

test('pickRandomId never returns the current id', () => {
  assert.equal(pickRandomId(['a', 'b', 'c'], 'b', () => 0), 'a');
  assert.equal(pickRandomId(['a', 'b', 'c'], 'b', () => 0.99), 'c');
  assert.equal(pickRandomId(['a'], 'a'), null);
});
