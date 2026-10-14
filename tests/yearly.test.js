import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableYears, buildYearReceipt } from '../js/yearly.js';

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
