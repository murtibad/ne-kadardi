import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTimelines } from '../js/timeline.js';

const fixture = {
  products: [{
    id: 'p1', name: 'A', unit: 'U',
    current: { date: '2026-10', price: 100, status: 'verified', source: { title: 't', url: 'https://x' } },
    prices: [
      { date: '2010-01', price: 10, status: 'verified', source: { title: 't', url: 'https://x' } },
      { date: '2015', price: 50, status: 'verified', source: { title: 't', url: 'https://x' } },
      { date: '2020', price: null, status: 'todo' }
    ],
  }, {
    id: 'p2', name: 'B', unit: 'U',
    current: { date: '2026-10', price: 10, status: 'verified' },
    prices: [] // < 2 points
  }]
};

test('buildTimelines filters products with < 2 verified points', () => {
  const ts = buildTimelines(fixture);
  assert.equal(ts.length, 1);
  assert.equal(ts[0].id, 'p1');
});

test('buildTimelines calculates correctly', () => {
  const ts = buildTimelines(fixture);
  const rows = ts[0].rows;
  assert.equal(rows.length, 3);
  assert.equal(rows[0].date, '2010-01');
  assert.equal(rows[1].date, '2015');
  assert.equal(rows[2].date, '2026-10');
  
  assert.equal(rows[2].isCurrent, true);
  assert.equal(rows[2].ratioToCurrent, null);
  assert.equal(rows[2].barPercent, 100);
  
  assert.equal(rows[0].ratioToCurrent, 10);
  assert.equal(rows[0].barPercent, 8); // min
  
  assert.ok(rows[1].barPercent > 8 && rows[1].barPercent < 100);
});

test('buildTimelines handles equal prices', () => {
  const f = { products: [{ id: 'p', current: { date: '2026', price: 5, status: 'verified' }, prices: [{ date: '2010', price: 5, status: 'verified' }]}] };
  const ts = buildTimelines(f);
  assert.equal(ts[0].rows[0].barPercent, 100);
  assert.equal(ts[0].rows[1].barPercent, 100);
});

test('buildTimelines works with real data', () => {
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const ts = buildTimelines(data);
  for (const t of ts) {
    assert.ok(t.rows.length >= 2, 'should have at least 2 rows');
    const last = t.rows[t.rows.length - 1];
    assert.equal(last.isCurrent, true, 'last row must be current');
    
    for (let i = 0; i < t.rows.length; i++) {
      const r = t.rows[i];
      assert.ok(Number.isFinite(r.price) && r.price > 0, 'price must be positive finite');
      assert.ok(r.barPercent >= 8 && r.barPercent <= 100, 'barPercent out of range');
      if (!r.isCurrent) {
         assert.ok(r.source && r.source.url.startsWith('https://'), 'must have https source');
         assert.ok(typeof r.ratioToCurrent === 'number' && r.ratioToCurrent > 0, 'must have positive ratioToCurrent');
      }
    }
  }
});

test('buildTimelines marks no row as current when the current price is not verified', () => {
  const f = {
    products: [{
      id: 'p', name: 'P', unit: 'U',
      current: { date: '2026-10', price: null, status: 'todo' },
      prices: [
        { date: '2010', price: 2, status: 'verified' },
        { date: '2020', price: 20, status: 'verified' },
      ],
    }],
  };
  const rows = buildTimelines(f)[0].rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.isCurrent === false && r.ratioToCurrent === null));
});

test('buildTimelines does not mutate its input', () => {
  const f = JSON.parse(JSON.stringify(fixture));
  const before = JSON.stringify(f);
  buildTimelines(f);
  assert.equal(JSON.stringify(f), before);
});

test('buildTimelines bar width grows with price on a log scale', () => {
  const f = {
    products: [{
      id: 'p', name: 'P', unit: 'U',
      current: { date: '2026', price: 100, status: 'verified' },
      prices: [
        { date: '2000', price: 1, status: 'verified' },
        { date: '2010', price: 10, status: 'verified' },
      ],
    }],
  };
  const [a, b, c] = buildTimelines(f)[0].rows.map((r) => r.barPercent);
  assert.equal(a, 8);
  assert.equal(c, 100);
  assert.ok(Math.abs(b - 54) < 1e-9, 'a price between 1 and 100 sits halfway on a log scale');
});
