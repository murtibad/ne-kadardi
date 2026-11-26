import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accusativePossessiveSuffix, withAccusativePossessive, guessedProductIds, progressText } from '../js/progress.js';

test('suffix follows how the number is read', () => {
  const cases = {
    0: "0'ını", 1: "1'ini", 2: "2'sini", 3: "3'ünü", 4: "4'ünü", 5: "5'ini", 6: "6'sını", 7: "7'sini", 8: "8'ini", 9: "9'unu",
    10: "10'unu", 11: "11'ini", 12: "12'sini", 13: "13'ünü", 14: "14'ünü", 15: "15'ini", 16: "16'sını", 17: "17'sini", 18: "18'ini", 19: "19'unu",
    20: "20'sini", 21: "21'ini", 22: "22'sini", 23: "23'ünü", 24: "24'ünü", 25: "25'ini", 26: "26'sını", 27: "27'sini", 28: "28'ini", 29: "29'unu",
    30: "30'unu", 40: "40'ını", 50: "50'sini", 60: "60'ını", 70: "70'ini", 80: "80'ini", 90: "90'ını",
    33: "33'ünü", 49: "49'unu", 56: "56'sını", 67: "67'sini", 71: "71'ini", 82: "82'sini", 99: "99'unu",
    100: "100'ünü", 101: "101'ini", 110: "110'unu", 120: "120'sini", 200: "200'ünü", 900: "900'ünü", 999: "999'unu",
    1000: "1000'ini", 2000: "2000'ini", 1001: "1001'ini", 1500: "1500'ünü",
    1000000: "1000000'unu",
  };
  for (const [n, want] of Object.entries(cases)) {
    assert.equal(withAccusativePossessive(Number(n)), want, `n=${n}`);
  }
});

test('1500 ends in yüz so it takes ü', () => {
  assert.equal(accusativePossessiveSuffix(1500), 'ünü');
});

test('invalid or huge numbers give no suffix', () => {
  assert.equal(accusativePossessiveSuffix(NaN), '');
  assert.equal(accusativePossessiveSuffix(1e12), '');
  assert.equal(withAccusativePossessive(1e12), String(1e12));
});

test('every number 0-99 gets a well-formed suffix', () => {
  for (let n = 0; n < 100; n++) assert.match(accusativePossessiveSuffix(n), /^s?([ıiuü])n\1$/, `n=${n}`);
});

test('guessedProductIds counts distinct known products', () => {
  const seen = new Set(['a@2012-01', 'a@2013-01', 'b@2015-06', 'gone@2012-01', 'c']);
  const ids = guessedProductIds(seen, ['a', 'b', 'c', 'd']);
  assert.deepEqual([...ids].sort(), ['a', 'b', 'c']);
});

test('guessedProductIds tolerates junk and an @ inside a product id', () => {
  assert.equal(guessedProductIds(undefined, ['a']).size, 0);
  assert.equal(guessedProductIds(new Set([5, null, 'a@x']), ['a']).size, 1);
  assert.equal(guessedProductIds(new Set(['x@y@2012-01']), ['x@y']).size, 1);
});

test('progressText reads naturally and hides at zero', () => {
  assert.equal(progressText(82, 19), "82 üründen 19'unu tahmin ettin");
  assert.equal(progressText(82, 1), "82 üründen 1'ini tahmin ettin");
  assert.equal(progressText(82, 0), '');
  assert.equal(progressText(0, 3), '');
});
