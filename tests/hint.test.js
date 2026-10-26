import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHint, buildEverydayHint, EVERYDAY_HINT_IDS, applyHintPenalty, HINT_FACTOR } from '../js/hint.js';

const all = [
  { productId: 'dolar', year: 2012, date: '2012-01-02', price: 1.8 },
  { productId: 'asgari-ucret', year: 2012, date: '2012-01', price: 837 },
  { productId: 'dolar', year: 2013, date: '2013-01-02', price: 1.78 },
];

test('hint lists the dollar rate and minimum wage of the question year', () => {
  const lines = buildHint({ productId: 'benzin', year: 2012 }, all);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].label, 'Dolar kuru');
  assert.match(lines[1].value, /837/);
  assert.equal(lines[0].period, 'Ocak 2012');
});

test('hint skips missing products and the hint products themselves', () => {
  assert.equal(buildHint({ productId: 'benzin', year: 2013 }, all).length, 1);
  assert.equal(buildHint({ productId: 'benzin', year: 2030 }, all), null);
  for (const id of ['dolar', 'euro', 'gram-altin', 'ceyrek-altin', 'schengen-vize', 'asgari-ucret', 'kyk-burs']) {
    assert.equal(buildHint({ productId: id, year: 2012 }, all), null, id);
  }
});

test('penalty only applies when a hint was used', () => {
  assert.equal(applyHintPenalty(100, false), 100);
  assert.equal(applyHintPenalty(100, true), Math.round(100 * HINT_FACTOR));
});

test('two hints cost 40% and true stays backward compatible', () => {
  assert.equal(applyHintPenalty(100, 1), 80);
  assert.equal(applyHintPenalty(100, 2), 60);
  assert.equal(applyHintPenalty(100, true), 80);
  assert.equal(applyHintPenalty(100, 0), 100);
});

const everyday = [
  { productId: 'simit', year: 2020, date: '2020-06', price: 4 },
  { productId: 'simit', year: 2020, date: '2020-01', price: 3 },
  { productId: 'benzin', year: 2020, date: '2020-01', price: 6 },
  { productId: 'iphone', year: 2020, date: '2020-01', price: 9000 },
];

test('everyday hint picks a same-year everyday product, never the question itself', () => {
  const h = buildEverydayHint({ productId: 'benzin', year: 2020 }, everyday, () => 0);
  assert.equal(h.id, 'simit');
  assert.equal(h.label, 'Simit');
  assert.match(h.value, /3/); // earliest date of the year
  assert.equal(h.period, 'Ocak 2020');
  assert.equal(buildEverydayHint({ productId: 'iphone', year: 2019 }, everyday), null);
  assert.equal(buildEverydayHint({ productId: 'dolar', year: 2020 }, everyday), null);
  assert.ok(EVERYDAY_HINT_IDS.includes('big-mac'));
});

test('everyday hint prefers another category, falls back to the same one', () => {
  const data = [
    { productId: 'simit', year: 2020, date: '2020-01', price: 3 },
    { productId: 'big-mac', year: 2020, date: '2020-01', price: 20 },
    { productId: 'spotify', year: 2020, date: '2020-01', price: 15 },
  ];
  assert.equal(buildEverydayHint({ productId: 'ekmek', year: 2020 }, data, () => 0.99).id, 'spotify');
  assert.equal(buildEverydayHint({ productId: 'ekmek', year: 2020 }, data.slice(0, 2), () => 0.99).id, 'big-mac');
});

test('hints use the price in force on the question date, not the year\'s first', async () => {
  const { buildHint } = await import('../js/hint.js');
  const all = [
    { productId: 'dolar', year: 2018, date: '2018-01-02', price: 3.77 },
    { productId: 'dolar', year: 2018, date: '2018-07-02', price: 4.6 },
    { productId: 'asgari-ucret', year: 2018, date: '2018-01', price: 1603.12 },
  ];
  const july = buildHint({ productId: 'benzin', year: 2018, date: '2018-07' }, all);
  assert.equal(july[0].period, 'Temmuz 2018');
  const march = buildHint({ productId: 'benzin', year: 2018, date: '2018-03' }, all);
  assert.equal(march[0].period, 'Ocak 2018');
});
