import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHint, applyHintPenalty, HINT_FACTOR } from '../js/hint.js';

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
