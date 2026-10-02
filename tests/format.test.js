import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGuess, formatPeriod, formatRatio } from '../js/format.js';

test('parseGuess accepts Turkish decimal comma', () => {
  assert.equal(parseGuess('4,5'), 4.5);
  assert.equal(parseGuess('0,75'), 0.75);
  assert.equal(parseGuess(' 3,5 TL '), 3.5);
  assert.equal(parseGuess('12 ₺'), 12);
});

test('parseGuess handles thousands separators', () => {
  assert.equal(parseGuess('1.250'), 1250);
  assert.equal(parseGuess('1.250,75'), 1250.75);
  assert.equal(parseGuess('12.000.000'), 12000000);
});

test('parseGuess treats a lone dot as decimal when it cannot be a thousands group', () => {
  assert.equal(parseGuess('4.5'), 4.5);
  assert.equal(parseGuess('0.75'), 0.75);
});

test('parseGuess rejects invalid input', () => {
  for (const bad of ['', '   ', 'abc', '0', '-5', '4,5,6', '1.2.3', '4,', ',5', '1,250.75']) {
    assert.equal(parseGuess(bad), null, `expected null for "${bad}"`);
  }
});

test('formatPeriod shows Turkish month names', () => {
  assert.equal(formatPeriod('2012'), '2012');
  assert.equal(formatPeriod('2012-01'), 'Ocak 2012');
  assert.equal(formatPeriod('2018-08-15'), 'Ağustos 2018');
});

test('formatRatio uses a decimal comma', () => {
  assert.equal(formatRatio(2.66), '2,7');
});
