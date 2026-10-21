import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickFact } from '../js/fact.js';
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
  assert.equal(f.ratio, '100 kat');
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
