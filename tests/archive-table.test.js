import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timelineTableHtml, visibleRowRange, rowsToggleLabel, pickRandomId, pinHiddenByCollapse } from '../js/archive-table.js';

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

test('pinHiddenByCollapse is true only for a row behind the collapsed toggle', () => {
  const list = many(20); // 2000-01 .. 2019-01
  assert.equal(pinHiddenByCollapse(list, '2000-01'), true);
  assert.equal(pinHiddenByCollapse(list, '2019-01'), false);
  assert.equal(pinHiddenByCollapse(list, '1999-01'), false);
  assert.equal(pinHiddenByCollapse(list, null), false);
  assert.equal(pinHiddenByCollapse(many(5), '2000-01'), false);
});

test('the pinned row gets is-pinned, alongside is-current', () => {
  const html = timelineTableHtml(many(20), { expanded: true, pinnedDate: '2000-01' });
  assert.match(html, /<tr role="row" data-date="2000-01" class="is-pinned"/);
  assert.equal((html.match(/is-pinned/g) || []).length, 1);
  assert.doesNotMatch(timelineTableHtml(many(20)), /is-pinned/);
  assert.match(timelineTableHtml(rows, { pinnedDate: '2026-01' }), /class="is-current is-pinned"/);
});

import { buildWageRows } from '../js/archive-table.js';

const wageRows = [
  { date: '2022-01', price: 5500, isCurrent: false },
  { date: '2022-07', price: 6500, isCurrent: false },
  { date: '2026-01', price: 28000, isCurrent: true },
];

test('buildWageRows counts cheap items and expresses dear ones in wages', () => {
  const product = { id: 'x-cheap', name: 'Ucuz', unit: '1 adet', rows: [
    { date: '2022-08', price: 5, isCurrent: false },
    { date: '2026-01', price: 20, isCurrent: true, currentLabel: null },
  ] };
  const out = buildWageRows(product, wageRows);
  assert.equal(out[0], '1.300 adet'); // 6500 / 5, July 2022 wage
  assert.equal(out[1], '1.400 adet'); // 28000 / 20
  const dear = { id: 'x-dear', name: 'Pahalı', unit: '1 adet', rows: [
    { date: '2022-02', price: 14000, isCurrent: false },
    { date: '2026-01', price: 28000 * 2.5, isCurrent: true },
  ] };
  const d = buildWageRows(dear, wageRows);
  assert.equal(d[0], '2,5 asgari ücret'); // 14000 / 5500 = 2.54
  assert.equal(d[1], '2,5 asgari ücret');
});

test('buildWageRows gives null where no wage of that year exists, and for the wage itself', () => {
  const product = { id: 'ekmek', name: 'Ekmek', unit: '1 adet', rows: [
    { date: '2015-03', price: 2, isCurrent: false },
    { date: '2022-01', price: 5, isCurrent: false },
    { date: '2022-07', price: 5, isCurrent: false },
  ] };
  assert.deepEqual(buildWageRows(product, wageRows).map((x) => x === null), [true, false, false]);
  const wage = { id: 'asgari-ucret', name: 'Asgari ücret', unit: 'TL', rows: [{ date: '2022-01', price: 5500 }] };
  assert.deepEqual(buildWageRows(wage, wageRows), [null]);
  assert.deepEqual(buildWageRows(product, []), [null, null, null]);
});

test('the table prints wage texts, with "–" for rows without a wage', () => {
  const html = timelineTableHtml(rows, { wageTexts: ['102 adet', null] });
  assert.match(html, /<span class="timeline-price">102 adet<\/span>/);
  assert.match(html, /<span class="timeline-price">–<\/span>/);
});
