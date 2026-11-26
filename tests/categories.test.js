import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, FAMILIES, categoryOf, familyOf, filterTimelines } from '../js/categories.js';

const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
const ids = data.products.map((p) => p.id);

test('every product belongs to exactly one category', () => {
  for (const id of ids) {
    const hits = CATEGORIES.filter((c) => c.products.includes(id));
    assert.equal(hits.length, 1, `${id} is in ${hits.length} categories`);
  }
});

test('categories list no unknown product', () => {
  for (const c of CATEGORIES) for (const id of c.products) assert.ok(ids.includes(id), `${c.id}: unknown product ${id}`);
});

test('categoryOf finds the category or null', () => {
  assert.equal(categoryOf('benzin'), 'ulasim');
  assert.equal(categoryOf('nope'), null);
});

test('filterTimelines filters by category and falls back to all', () => {
  const ts = [{ id: 'benzin' }, { id: 'dolar' }, { id: 'ekmek' }];
  assert.deepEqual(filterTimelines(ts, 'ulasim').map((t) => t.id), ['benzin']);
  assert.equal(filterTimelines(ts, 'all').length, 3);
  assert.equal(filterTimelines(ts, undefined).length, 3);
});

test('FAMILIES list only known products, without duplicates or id collisions', () => {
  const seen = new Set();
  for (const f of FAMILIES) {
    for (const id of f.products) {
      assert.ok(ids.includes(id), `${f.id}: unknown product ${id}`);
      assert.ok(!seen.has(id), `${id} appears in more than one family`);
      seen.add(id);
    }
    assert.ok(!ids.includes(f.id) || f.products.includes(f.id), `family id ${f.id} collides with a product outside it`);
  }
});

test('familyOf groups close siblings and falls back to the product id itself', () => {
  assert.equal(familyOf('ekmek'), familyOf('firin-ekmegi'));
  assert.equal(familyOf('benzin'), familyOf('motorin'));
  assert.equal(familyOf('benzin'), familyOf('otogaz'));
  assert.equal(familyOf('yks'), familyOf('kpss-lisans'));
  assert.notEqual(familyOf('ekmek'), familyOf('benzin'));
  assert.equal(familyOf('big-mac'), 'big-mac');
  assert.equal(familyOf(null), null);
  assert.equal(familyOf(''), null);
});
