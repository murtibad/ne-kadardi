import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGuess, formatPeriod, formatRatio, readAmount, formatIncrease, formatPrice, formatNumber, getNumberFormatter, unitLine, readoutText, formatInputThousands } from '../js/format.js';

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

test('formatRatio drops the decimal from 100 up', async () => {
  const { formatRatio } = await import('../js/format.js');
  assert.equal(formatRatio(12.43), '12,4');
  assert.equal(formatRatio(172854.1), '172.854');
});

test('getNumberFormatter returns the same instance for equal options and different instances for different options', () => {
  const f1 = getNumberFormatter({ maximumFractionDigits: 1 });
  const f2 = getNumberFormatter({ maximumFractionDigits: 1 });
  const f0 = getNumberFormatter({ maximumFractionDigits: 0 });
  assert.equal(f1, f2);
  assert.notEqual(f1, f0);
  assert.equal(f1.format(2.66), '2,7');
  assert.equal(f0.format(2.66), '3');
});

test('cached formatters produce identical results on repeated calls and match fresh instances', () => {
  const rawCurrency0 = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(1250);
  const rawCurrency2 = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(4.5);

  assert.equal(formatPrice(1250), rawCurrency0);
  assert.equal(formatPrice(1250), rawCurrency0);
  assert.equal(formatPrice(4.5), rawCurrency2);
  assert.equal(formatPrice(4.5), rawCurrency2);
  assert.equal(formatRatio(2.66), '2,7');
  assert.equal(formatRatio(2.66), '2,7');
  assert.equal(formatNumber(1250000), '1.250.000');
  assert.equal(formatNumber(1250000), '1.250.000');
});

test('shortTitle keeps short titles and cuts long ones on a word boundary', async () => {
  const { shortTitle } = await import('../js/format.js');
  assert.equal(shortTitle('TCMB Gösterge Niteliğindeki Döviz Kurları'), 'TCMB Gösterge Niteliğindeki Döviz Kurları');
  const long = "Bianet, Ankara'dan sonra İzmir ve İstanbul'da da Halk Ekmek'e zam (08.08.2022)";
  assert.equal(shortTitle(long, 40), "Bianet, Ankara'dan sonra İzmir ve… (08.08.2022)");
  assert.equal(shortTitle('a'.repeat(70), 60), `${'a'.repeat(60)}…`);
  assert.equal(shortTitle('Dünya Bankası Pink Sheet (altın, aylık ortalama) ve TCMB Gösterge Niteliğindeki Döviz Kurları, 2010-01'), 'Dünya Bankası Pink Sheet (altın, aylık ortalama)…, 2010-01');
  assert.equal(shortTitle('Şişli, Ümraniye ve Çağlayan öğrencileri için ücretler değişti', 30), 'Şişli, Ümraniye ve Çağlayan…');
});

test('unitLine keeps the separator with the region so it never ends a line', () => {
  assert.equal(unitLine('1 litre', 'İstanbul'), '1 litre ·\u00A0İstanbul');
  assert.equal(unitLine('1 adet', null), '1 adet');
});

test('parseGuess reads a leading-zero dotted number as a decimal, not thousands', async () => {
  const { parseGuess } = await import('../js/format.js');
  assert.equal(parseGuess('0.250'), 0.25);
  assert.equal(parseGuess('0.250,5'), null);
  assert.equal(parseGuess('1.250'), 1250);
  assert.equal(parseGuess('4,5'), 4.5);
  assert.equal(parseGuess('1.250,75'), 1250.75);
  assert.equal(parseGuess('12.345.678'), 12345678);
});

test('readoutText returns empty string for non-positive or non-finite values', () => {
  for (const bad of [null, undefined, NaN, Infinity, 0, -5, '1000', '4,5']) {
    assert.equal(readoutText(bad), '', `expected '' for ${String(bad)}`);
  }
});

test('readoutText delegates to readAmount for values from 1000 up', () => {
  assert.equal(readoutText(1000), '1 bin ₺');
  assert.equal(readoutText(1250), '1 bin 250 ₺');
  assert.equal(readoutText(1250.75), '1 bin 250,75 ₺');
  assert.equal(readoutText(1000000), '1 milyon ₺');
});

test('readoutText returns empty string for integers below 1000', () => {
  for (const intVal of [1, 5, 45, 999]) {
    assert.equal(readoutText(intVal), '', `expected '' for ${intVal}`);
  }
});

test('readoutText formats kuruş for values below 1', () => {
  assert.equal(readoutText(0.75), '75 kuruş');
  assert.equal(readoutText(0.05), '5 kuruş');
  assert.equal(readoutText(0.5), '50 kuruş');
});

test('readoutText formats lira and kuruş, rounding to whole kuruş', () => {
  assert.equal(readoutText(4.5), '4 lira 50 kuruş');
  assert.equal(readoutText(12.05), '12 lira 5 kuruş');
  assert.equal(readoutText(4.999), '5 lira');
  assert.equal(readoutText(12.001), '12 lira');
});

test('formatInputThousands groups digits and keeps the parsed value', () => {
  const cases = {
    '1250': '1.250', '1250000': '1.250.000', '999': '999', '12': '12',
    '1250000,5': '1.250.000,5', '1250,': '1.250,', '1250,75': '1.250,75',
    '1.250': '1.250', '1.250,75': '1.250,75', '12.000.000': '12.000.000',
    '4,5': '4,5', '4.5': '4.5', '0.75': '0.75', '12.50': '12.50', '0.250': '0.250',
    '1250.5': '1250.5', '0,5': '0,5', '': '', 'abc': 'abc', '12 ₺': '12 ₺', '1,2,3': '1,2,3',
  };
  for (const [raw, want] of Object.entries(cases)) {
    const got = formatInputThousands(raw);
    assert.equal(got, want, `format "${raw}"`);
    assert.equal(parseGuess(got), parseGuess(raw), `parse "${raw}"`);
  }
  assert.equal(parseGuess(formatInputThousands('0.250')), 0.25);
});

test('formatInputThousands regroups after typing or deleting inside a grouped number', () => {
  assert.equal(formatInputThousands('1.2500'), '12.500');
  assert.equal(formatInputThousands('1.250.0000'), '12.500.000');
  assert.equal(formatInputThousands('1.50.000'), '150.000');
  assert.equal(formatInputThousands('1.2500,5'), '12.500,5');
});

test('parseGuess ignores the unit people type by habit', () => {
  assert.equal(parseGuess('4,5 lira'), 4.5);
  assert.equal(parseGuess('4 Lira'), 4);
  assert.equal(parseGuess('20 TL'), 20);
  assert.equal(parseGuess('20 t.l.'), 20);
  assert.equal(parseGuess('1.250 lira'), 1250);
  assert.equal(parseGuess('lira'), null);
});

import { keyboardFitDelta } from '../js/format.js';

test('keyboardFitDelta: 0 when the button is already visible with margin', () => {
  assert.equal(keyboardFitDelta({ bottom: 300 }, { top: 200 }, 0, 400), 0);
  assert.equal(keyboardFitDelta({ bottom: 388 }, { top: 200 }, 0, 400), 0);
});

test('keyboardFitDelta: scrolls exactly the missing amount plus margin', () => {
  assert.equal(keyboardFitDelta({ bottom: 450 }, { top: 250 }, 0, 400), 62);
  assert.equal(keyboardFitDelta({ bottom: 450 }, { top: 250 }, 50, 400, 0), 0);
  assert.equal(keyboardFitDelta({ bottom: 500 }, { top: 300 }, 50, 400), 62);
});

test('keyboardFitDelta: never hides the input above the visible top', () => {
  assert.equal(keyboardFitDelta({ bottom: 700 }, { top: 100 }, 0, 300), 100);
  assert.equal(keyboardFitDelta({ bottom: 700 }, { top: 40 }, 60, 300), 0);
});
