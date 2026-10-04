// Guards the data policy: no verified price without a source, no value in a TODO entry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

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
  assert.ok(['official', 'dataset', 'news', 'derived'].includes(s.kind), `${where}: source.kind must be official, dataset, news or derived`);
}

test('prices.json follows the data policy', () => {
  const ids = new Set();
  for (const p of data.products) {
    assert.ok(p.id && !ids.has(p.id), `duplicate or missing product id: ${p.id}`);
    ids.add(p.id);
    assert.ok(p.name && p.unit, `${p.id}: name and unit are required`);
    
    if (p.image) {
      assert.ok(p.image.src.startsWith('img/') && p.image.src.endsWith('.svg'), `${p.id}: image.src must be in img/ and be an .svg`);
      assert.ok(existsSync(new URL(`../${p.image.src}`, import.meta.url)), `${p.id}: image file must exist`);
      assert.ok(typeof p.image.alt === 'string' && p.image.alt.trim() !== '', `${p.id}: image.alt must be a non-empty string`);
      assert.ok(typeof p.image.credit === 'string' && p.image.credit.trim() !== '', `${p.id}: image.credit must be a non-empty string`);
    }

    if (p.tax) {
      assert.ok(typeof p.tax.method === 'string' && p.tax.method.trim() !== '', `${p.id}: tax.method is required`);
      assert.ok(typeof p.tax.note === 'string' && p.tax.note.trim() !== '', `${p.id}: tax.note is required`);
      assert.ok(Array.isArray(p.tax.periods) && p.tax.periods.length > 0, `${p.id}: tax.periods must be a non-empty array`);
      for (const [i, period] of p.tax.periods.entries()) {
        const where = `${p.id}.tax.periods[${i}]`;
        assert.match(period.from, /^\d{4}-\d{2}$/, `${where}: from must be YYYY-MM`);
        assert.ok(period.to === null || /^\d{4}-\d{2}$/.test(period.to), `${where}: to must be YYYY-MM or null`);
        assert.ok(typeof period.kdv === 'number' && period.kdv > 0, `${where}: kdv must be a positive number`);
        assert.ok(typeof period.otv === 'number' && period.otv > 0, `${where}: otv must be a positive number`);
        assert.ok(Array.isArray(period.sources) && period.sources.length >= 2, `${where}: must have at least 2 sources`);
        for (const [si, s] of period.sources.entries()) {
          const sWhere = `${where}.sources[${si}]`;
          assert.ok(s.title?.trim(), `${sWhere}: title is required`);
          assert.match(s.url ?? '', /^https:\/\//, `${sWhere}: url must be an https URL`);
          assert.match(s.accessed ?? '', /^\d{4}-\d{2}-\d{2}$/, `${sWhere}: accessed must be YYYY-MM-DD`);
          assert.ok(['official', 'dataset', 'news', 'derived'].includes(s.kind), `${sWhere}: kind must be official, dataset, news or derived`);
        }
      }
    }

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
