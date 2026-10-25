import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { introRows, yearSteps } from '../js/intro.js';
import { buildTimelines } from '../js/timeline.js';

// Fake timeline rows in the same shape as buildTimelines() output; never copy into data/prices.json.
const row = (date, price, isCurrent = false) => ({
  date,
  price,
  ratioToCurrent: isCurrent ? null : 10,
  barPercent: isCurrent ? 100 : 8,
  note: null,
  source: { title: 't', url: 'https://x', kind: 'official' },
  isCurrent,
  currentLabel: null,
});

const fakeTimelines = [
  {
    id: 'big-mac',
    name: 'Big Mac',
    unit: '1 adet sandviç (menü değil)',
    region: null,
    image: null,
    rows: [row('2010-01', 5.65), row('2018-01', 10.75), row('2026-07', 325, true)],
  },
  {
    id: 'benzin',
    name: 'Benzin (kurşunsuz 95)',
    unit: '1 litre',
    region: 'İstanbul (Avrupa)',
    image: null,
    rows: [row('2016-01', 4.28), row('2026-10', 84.63, true)],
  },
  {
    id: 'dolar',
    name: 'Amerikan doları',
    unit: '1 dolar (Merkez Bankası satış kuru)',
    region: null,
    image: null,
    rows: [row('2010-01-04', 1.49), row('2020-01-02', 5.96), row('2026-10-23', 49.65, true)],
  },
];

test('introRows extracts short display names, years, and oldest/current prices in requested order', () => {
  const rows = introRows(fakeTimelines);
  assert.deepEqual(rows.map(({ history, ...r }) => r), [
    { name: 'Big Mac', fromYear: 2010, toYear: 2026, from: 5.65, to: 325 },
    { name: '1 litre benzin', fromYear: 2016, toYear: 2026, from: 4.28, to: 84.63 },
    { name: '1 dolar', fromYear: 2010, toYear: 2026, from: 1.49, to: 49.65 },
  ]);
});

test('introRows skips missing products and falls back to the last row when none is marked isCurrent', () => {
  const withoutCurrentFlag = [
    {
      id: 'dolar',
      name: 'Amerikan doları',
      unit: '1 dolar',
      rows: [row('2012-01', 1.88, false), row('2026-01', 42.96, false)],
    },
    {
      id: 'single',
      name: 'Tek satır',
      unit: '1 adet',
      rows: [row('2020-01', 10, true)],
    },
  ];
  const rows = introRows(withoutCurrentFlag, ['big-mac', 'dolar', 'single']);
  assert.deepEqual(rows.map(({ history, ...r }) => r), [
    { name: '1 dolar', fromYear: 2012, toYear: 2026, from: 1.88, to: 42.96 },
  ]);
});

test('introRows handles empty or invalid inputs safely', () => {
  assert.deepEqual(introRows([]), []);
  assert.deepEqual(introRows(null), []);
  assert.deepEqual(introRows(fakeTimelines, []), []);
  assert.deepEqual(introRows(fakeTimelines, null), []);
});

test('introRows works with real prices.json timelines', () => {
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const rows = introRows(buildTimelines(data));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.name), ['Big Mac', '1 litre benzin', '1 dolar']);
  for (const r of rows) {
    assert.ok(r.fromYear >= 2005 && r.toYear >= r.fromYear);
    assert.ok(r.from > 0 && r.to > r.from);
  }
});

test('yearSteps returns inclusive ascending year list and [] for invalid ranges', () => {
  assert.deepEqual(yearSteps(2024, 2026), [2024, 2025, 2026]);
  assert.deepEqual(yearSteps(2026, 2026), [2026]);
  assert.equal(yearSteps(2010, 2026).length, 17);
  assert.equal(yearSteps(2010, 2026)[0], 2010);
  assert.equal(yearSteps(2010, 2026)[16], 2026);
  assert.deepEqual(yearSteps(2026, 2010), []);
  assert.deepEqual(yearSteps(NaN, 2026), []);
  assert.deepEqual(yearSteps(2010, Infinity), []);
});

test('priceInYear shows the newest sourced price on or before the year, never a blend', async () => {
  const { priceInYear } = await import('../js/intro.js');
  const row = { from: 5.65, history: [{ year: 2010, price: 5.65 }, { year: 2015, price: 9.25 }, { year: 2026, price: 325 }] };
  assert.equal(priceInYear(row, 2009), 5.65);
  assert.equal(priceInYear(row, 2012), 5.65);
  assert.equal(priceInYear(row, 2015), 9.25);
  assert.equal(priceInYear(row, 2026), 325);
});
