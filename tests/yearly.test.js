import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableYears, buildYearReceipt, shortRowName, buildYearShareModel, buildYearShareText, buildYearShareFileName } from '../js/yearly.js';

const data = {
  products: [
    { id: 'a', name: 'Ekmek', unit: '1 adet', current: { date: '2026-01', price: 20, status: 'verified' },
      prices: [{ date: '2014-01', price: 1, status: 'verified' }, { date: '2014-07', price: 2, status: 'verified' },
        { date: '2015-01', price: 3, status: 'todo' }] },
    { id: 'b', name: 'Çay', unit: 'kg', current: null,
      prices: [{ date: '2014-03', price: 10, status: 'verified' }] },
    { id: 'c', name: 'Altın', unit: 'gram', current: { date: '2014-05', price: 100, status: 'verified' },
      prices: [{ date: '2014-05', price: 100, status: 'verified' }] },
  ],
};

test('availableYears counts products and ignores unverified entries', () => {
  assert.deepEqual(availableYears(data, 3), [2014]);
  assert.deepEqual(availableYears(data, 4), []);
});

test('buildYearReceipt takes the latest entry of the year and the ratio to today', () => {
  const { rows } = buildYearReceipt(data, 2014);
  assert.deepEqual(rows.map((r) => r.name), ['Altın', 'Çay', 'Ekmek']);
  const bread = rows.find((r) => r.productId === 'a');
  assert.equal(bread.price, 2);
  assert.equal(bread.ratio, 10);
  assert.equal(rows.find((r) => r.productId === 'b').ratio, null);
  assert.equal(rows.find((r) => r.productId === 'c').ratio, null); // same point as current
});

test('years without verified prices give an empty receipt', () => {
  assert.equal(buildYearReceipt(data, 2015).rows.length, 0);
});

test('shortRowName prefers the label and drops parenthesised details', () => {
  assert.equal(shortRowName({ name: 'Yeni iPhone', label: 'iPhone 16' }), 'iPhone 16');
  assert.equal(shortRowName({ name: 'Açlık sınırı (Türk-İş)', label: null }), 'Açlık sınırı');
  assert.equal(shortRowName({ name: 'Sigara (Marlboro Kırmızı, 20\'li paket)', label: null }), 'Sigara');
});

test('buildYearShareModel lists rows and names the biggest riser', () => {
  const receipt = buildYearReceipt(data, 2014);
  const model = buildYearShareModel(receipt);
  assert.equal(model.title, '2014 · Yıllık fiş');
  assert.equal(model.rows.length, 3);
  assert.deepEqual(model.rows.find((r) => r.name === 'Ekmek'), { name: 'Ekmek', price: '₺2,00', ratio: '10 kat' });
  assert.equal(model.rows.find((r) => r.name === 'Çay').ratio, '');
  assert.equal(model.topLine, 'En çok artan: Ekmek, 10 kat');
});

test('buildYearShareModel has no top line when no row has a current price', () => {
  const model = buildYearShareModel({ year: 2014, rows: [{ name: 'Çay', label: null, price: 10, ratio: null }] });
  assert.equal(model.topLine, null);
});

test('buildYearShareText and file name', () => {
  const text = buildYearShareText(buildYearReceipt(data, 2014), 'https://x.test/');
  assert.deepEqual(text.split('\n'), [
    'Ne Kadardı? 2014 yılında her şey ne kadardı? 🧾',
    'En çok artan: Ekmek, bugüne 10 kat',
    'https://x.test/',
  ]);
  assert.equal(buildYearShareFileName(2014), 'ne-kadardi-yillik-fis-2014.png');
});

test('buildYearShareModel hides ratios that are about 1 (price is today\'s)', () => {
  const model = buildYearShareModel({ year: 2026, rows: [{ name: 'Altın', label: null, price: 100, ratio: 1.01 }] });
  assert.equal(model.rows[0].ratio, '');
  assert.equal(model.count, '1 kalem');
  assert.equal(model.topLine, null);
});
