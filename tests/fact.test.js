import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickFact, factYears } from '../js/fact.js';
import { buildTimelines } from '../js/timeline.js';

const row = (date, price, isCurrent = false, currentLabel = null) => ({ date, price, isCurrent, currentLabel });
const timelines = [
  { id: 'gold', name: 'Gram altın', unit: '1 gram', image: null, rows: [row('2010-01', 50), row('2015', 100), row('2026-09', 5000, true)] },
  { id: 'flat', name: 'Düz', unit: 'U', image: null, rows: [row('2020', 10), row('2026', 15, true)] },
  { id: 'nocur', name: 'Akımsız', unit: 'U', image: null, rows: [row('2010', 1), row('2020', 10)] },
  { id: 'wage', name: 'Asgari ücret', unit: 'aylık', image: null, rows: [row('2012', 700), row('2026', 22000, true, 'Ocak 2026 itibarıyla')] },
];

test('pickFact pairs the oldest price with the current one', () => {
  const f = pickFact(timelines, { random: () => 0 });
  assert.equal(f.productId, 'gold');
  assert.equal(f.thenLabel, 'Ocak 2010');
  assert.equal(f.nowLabel, 'Eylül 2026');
  assert.equal(f.ratio, '100 katına');
});

test('pickFact skips small rises and products without a current price', () => {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const f = pickFact(timelines, { random: () => r });
    assert.ok(['gold', 'wage'].includes(f.productId));
  }
});

test('pickFact uses the current label when there is one', () => {
  const f = pickFact(timelines, { random: () => 0.99 });
  assert.equal(f.productId, 'wage');
  assert.equal(f.nowLabel, 'Ocak 2026 itibarıyla');
});

test('pickFact avoids the previous fact when it can', () => {
  const f = pickFact(timelines, { random: () => 0, skipId: 'gold' });
  assert.equal(f.productId, 'wage');
  const only = pickFact([timelines[0]], { random: () => 0, skipId: 'gold' });
  assert.equal(only.productId, 'gold');
});

test('pickFact returns null without candidates', () => {
  assert.equal(pickFact([]), null);
  assert.equal(pickFact(null), null);
  assert.equal(pickFact([timelines[1]]), null);
});

test('real data yields facts', () => {
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const f = pickFact(buildTimelines(data), { random: () => 0.5 });
  assert.ok(f && f.thenPrice && f.nowPrice);
});

test('the fact card unit names the region, as the question card does', () => {
  const ist = { id: 'simit', name: 'Simit', unit: '1 adet', region: 'İstanbul', image: null, rows: [row('2018', 1), row('2026', 20, true)] };
  assert.equal(pickFact([ist], () => 0).unit, '1 adet ·\u00A0İstanbul');
});

const yearTimelines = [
  { id: 'a', name: 'A', unit: 'U', image: null, rows: [row('2010', 10), row('2015-01', 20), row('2015-07', 25), row('2020', 40), row('2026', 200, true)] },
  { id: 'b', name: 'B', unit: 'U', image: null, rows: [row('2012', 5), row('2015', 15), row('2020', 30), row('2026', 150, true)] },
  { id: 'c', name: 'C', unit: 'U', image: null, rows: [row('2015-06', 8), row('2020', 20), row('2026', 80, true)] },
  // 2020 only gets a 4th product via a tiny jump (< 2x), which must not count.
  { id: 'small', name: 'Küçük', unit: 'U', image: null, rows: [row('2020', 90), row('2026', 100, true)] },
  // Products without a current price must not count.
  { id: 'nocur', name: 'Güncelsiz', unit: 'U', image: null, rows: [row('2012', 5), row('2015', 10)] },
];

test('factYears lists years with at least 3 qualifying products, newest first', () => {
  assert.deepEqual(factYears(yearTimelines), [2020, 2015]);
  assert.deepEqual(factYears([]), []);
  assert.deepEqual(factYears(null), []);
});

test('factYears counts multiple entries for the same product in one year only once', () => {
  const dup = [
    { id: 'a', name: 'A', unit: 'U', image: null, rows: [row('2015-01', 10), row('2015-07', 12), row('2015-12', 15), row('2026', 100, true)] },
    { id: 'b', name: 'B', unit: 'U', image: null, rows: [row('2015', 10), row('2026', 100, true)] },
  ];
  assert.deepEqual(factYears(dup), []);
  assert.deepEqual(factYears(dup, { minProducts: 2 }), [2015]);
});

test('pickFact with year picks from that year and avoids repeating skipId', () => {
  const f1 = pickFact(yearTimelines, { random: () => 0, year: 2015 });
  assert.equal(f1.productId, 'a');
  assert.equal(f1.thenLabel, 'Ocak 2015');
  assert.equal(f1.ratio, '10 katına');

  // Accepts string year (e.g. from <select>.value) and skips previous product.
  const f2 = pickFact(yearTimelines, { random: () => 0, year: '2015', skipId: 'a' });
  assert.equal(f2.productId, 'b');
  assert.equal(f2.thenLabel, '2015');

  // Empty string or null falls back to default (oldest verified row).
  const fRandom = pickFact(yearTimelines, { random: () => 0, year: '' });
  assert.equal(fRandom.productId, 'a');
  assert.equal(fRandom.thenLabel, '2010');
});

test('pickFact with year returns null when no product qualifies in that year', () => {
  assert.equal(pickFact(yearTimelines, { year: 2005 }), null);
  assert.equal(pickFact(yearTimelines, { year: 2026 }), null);
  assert.equal(pickFact(yearTimelines, { year: 'not-a-year' }), null);
});

test('real data yields eligible fact years and cycles within a chosen year', () => {
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const tls = buildTimelines(data);
  const years = factYears(tls);
  assert.ok(years.length >= 5, `expected several eligible years, got ${years.length}`);
  for (let i = 1; i < years.length; i++) {
    assert.ok(years[i - 1] > years[i], 'years must be sorted newest first');
  }
  for (const y of [years[0], years[years.length - 1]]) {
    const first = pickFact(tls, { random: () => 0, year: y });
    assert.ok(first && first.thenLabel.includes(String(y)));
    const second = pickFact(tls, { random: () => 0, year: y, skipId: first.productId });
    assert.ok(second && second.thenLabel.includes(String(y)));
    assert.notEqual(second.productId, first.productId);
  }
});
