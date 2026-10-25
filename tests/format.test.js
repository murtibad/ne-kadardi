import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGuess, formatPeriod, formatRatio, readAmount, formatIncrease } from '../js/format.js';

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

test('readAmount formats Turkish magnitude groups and decimals', () => {
  assert.equal(readAmount(1250000), '1 milyon 250 bin ₺');
  assert.equal(readAmount(1000.5), '1 bin 0,5 ₺');
  assert.equal(readAmount(2000000.25), '2 milyon 0,25 ₺');
  assert.equal(readAmount(1250), '1 bin 250 ₺');
  assert.equal(readAmount(1000000), '1 milyon ₺');
  assert.equal(readAmount(2500000000), '2 milyar 500 milyon ₺');
  assert.equal(readAmount(45), '45 ₺');
  assert.equal(readAmount(4.5), '4,5 ₺');
  assert.equal(readAmount(1250.75), '1 bin 250,75 ₺');
  assert.equal(readAmount(12000), '12 bin ₺');
  assert.equal(readAmount(1000001), '1 milyon 1 ₺');
});

test('readAmount returns empty string for null, NaN, and non-positive values', () => {
  for (const bad of [null, undefined, NaN, Infinity, 0, -5, '1000']) {
    assert.equal(readAmount(bad), '', `expected '' for ${String(bad)}`);
  }
});

test('formatIncrease uses percent below 2x', () => {
  assert.equal(formatIncrease(12.43), '12,4 katına çıktı');
  assert.equal(formatIncrease(2), '2 katına çıktı');
  assert.equal(formatIncrease(1.04), '%4 arttı');
  assert.equal(formatIncrease(1.999), '%100 arttı');
  assert.equal(formatIncrease(0.8), '%20 düştü');
  assert.equal(formatIncrease(1.001), 'değişmedi');
  assert.equal(formatIncrease(NaN), '');
});

test('readAmount gives up on absurdly large numbers instead of reading them', () => {
  assert.equal(readAmount(1e20), 'çok büyük bir sayı');
  assert.notEqual(readAmount(999999999999), 'çok büyük bir sayı');
});

test('inPeriod adds the locative that matches how the year is read', async () => {
  const { inPeriod } = await import('../js/format.js');
  assert.equal(inPeriod('Temmuz 2020'), "Temmuz 2020'de");
  assert.equal(inPeriod('2016'), "2016'da");
  assert.equal(inPeriod('Ocak 2023'), "Ocak 2023'te");
  assert.equal(inPeriod('2010'), "2010'da");
  assert.equal(inPeriod('2019'), "2019'da");
  assert.equal(inPeriod('2014'), "2014'te");
  assert.equal(inPeriod('2011'), "2011'de");
  assert.equal(inPeriod('2000'), "2000'de");
  assert.equal(inPeriod('Eylül 2040'), "Eylül 2040'ta");
});
