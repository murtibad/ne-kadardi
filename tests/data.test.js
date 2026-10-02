// Guards the data policy: no verified price without a source, no value in a TODO entry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const MIN_YEAR = 2005; // the 2005 redenomination: older prices are in a different unit

function checkEntry(entry, where) {
  assert.ok(['verified', 'todo'].includes(entry.status), `${where}: status must be verified or todo`);
  assert.match(entry.date, DATE, `${where}: date must be YYYY, YYYY-MM or YYYY-MM-DD`);
  assert.ok(Number(entry.date.slice(0, 4)) >= MIN_YEAR, `${where}: date before ${MIN_YEAR}`);

  if (entry.status === 'todo') {
    assert.equal(entry.price, null, `${where}: todo entries must have price null`);
    return;
  }
  assert.ok(typeof entry.price === 'number' && entry.price > 0, `${where}: price must be a positive number`);
  const s = entry.source;
  assert.ok(s && typeof s === 'object', `${where}: verified entries need a source`);
  assert.ok(s.title?.trim(), `${where}: source.title is required`);
  assert.match(s.url ?? '', /^https:\/\//, `${where}: source.url must be an https URL`);
  assert.match(s.accessed ?? '', /^\d{4}-\d{2}-\d{2}$/, `${where}: source.accessed must be YYYY-MM-DD`);
}

test('prices.json follows the data policy', () => {
  const ids = new Set();
  for (const p of data.products) {
    assert.ok(p.id && !ids.has(p.id), `duplicate or missing product id: ${p.id}`);
    ids.add(p.id);
    assert.ok(p.name && p.unit, `${p.id}: name and unit are required`);
    checkEntry(p.current, `${p.id}.current`);

    const dates = new Set();
    for (const e of p.prices) {
      const where = `${p.id}@${e.date}`;
      assert.ok(!dates.has(e.date), `${where}: duplicate date`);
      dates.add(e.date);
      checkEntry(e, where);
    }
  }
});
