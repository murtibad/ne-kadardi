import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, categoryOf, filterTimelines } from '../js/categories.js';

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
