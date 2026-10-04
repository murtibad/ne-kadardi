import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTaxPeriod, taxFloor, buildTaxLine } from '../js/tax.js';

const taxModel = {
  method: "Vergisiz taban matrah üzerinden önce ÖTV, ardından ÖTV'li tutar üzerinden KDV hesaplanır: vergi payı = 1 - 1 / ((1 + ÖTV) * (1 + KDV)).",
  note: 'ÖTV oranı matrahın en üst diliminin oranıdır.',
  periods: [
    {
      from: '2019-05',
      to: '2023-06',
      kdv: 0.18,
      otv: 0.5,
      sources: [
        { title: 'Source 1', url: 'https://example.com/1', accessed: '2026-10-04', kind: 'news' },
        { title: 'Source 2', url: 'https://example.com/2', accessed: '2026-10-04', kind: 'news' },
      ],
    },
    {
      from: '2023-07',
      to: null,
      kdv: 0.20,
      otv: 0.5,
      sources: [
        { title: 'Source 3', url: 'https://example.com/3', accessed: '2026-10-04', kind: 'news' },
        { title: 'Source 4', url: 'https://example.com/4', accessed: '2026-10-04', kind: 'news' },
      ],
    },
  ],
};

test('findTaxPeriod looks up period correctly and handles boundaries and missing month', () => {
  assert.equal(findTaxPeriod(taxModel, '2019-04'), null);
  assert.equal(findTaxPeriod(taxModel, '2019-05'), taxModel.periods[0]);
  assert.equal(findTaxPeriod(taxModel, '2023-06'), taxModel.periods[0]);
  assert.equal(findTaxPeriod(taxModel, '2023-07'), taxModel.periods[1]);
  assert.equal(findTaxPeriod(taxModel, '2018'), null);
  assert.equal(findTaxPeriod(taxModel, null), null);
  assert.equal(findTaxPeriod(null, '2023-07'), null);
});

test('taxFloor calculates share and amount correctly', () => {
  // Formula: 50% + 18% => share 0.4350
  const r1 = taxFloor(1000, '2020-01', taxModel);
  assert.ok(r1 !== null);
  assert.equal(r1.share.toFixed(4), '0.4350');
  assert.equal(r1.kdv, 0.18);
  assert.equal(r1.otv, 0.5);

  // Formula: 50% + 20% => share 0.4444
  const r2 = taxFloor(1000, '2024-01', taxModel);
  assert.ok(r2 !== null);
  assert.equal(r2.share.toFixed(4), '0.4444');
  assert.equal(r2.kdv, 0.20);
  assert.equal(r2.otv, 0.5);

  // An iPhone 2025-09 price 77999 => amount about 34.666
  const r3 = taxFloor(77999, '2025-09', taxModel);
  assert.ok(r3 !== null);
  assert.equal(Math.round(r3.amount), 34666);
  assert.ok(Math.abs(r3.amount - 34666.22) < 0.1);
});

test('taxFloor returns null for invalid inputs or out of range dates', () => {
  assert.equal(taxFloor(0, '2025-09', taxModel), null);
  assert.equal(taxFloor(-50, '2025-09', taxModel), null);
  assert.equal(taxFloor(1000, '2018-05', taxModel), null);
  assert.equal(taxFloor(1000, '2025-09', null), null);
});

test('buildTaxLine builds correct Turkish sentences', () => {
  const qWithCurrent = {
    date: '2024-09',
    price: 64999,
    tax: taxModel,
    current: { date: '2026-10', price: 99999 },
  };
  assert.equal(
    buildTaxLine(qWithCurrent),
    'Bu fiyatın en az %44\'ü vergi (yaklaşık ₺28.900). Bugünkü ₺99.999 fiyatın en az ₺44.400\'ü vergi.'
  );

  const qWithoutCurrent = {
    date: '2024-09',
    price: 64999,
    tax: taxModel,
    current: null,
  };
  assert.equal(
    buildTaxLine(qWithoutCurrent),
    'Bu fiyatın en az %44\'ü vergi (yaklaşık ₺28.900).'
  );

  const qOutOfPeriod = {
    date: '2018-11',
    price: 7399,
    tax: taxModel,
    current: { date: '2026-10', price: 99999 },
  };
  assert.equal(buildTaxLine(qOutOfPeriod), null);

  const qNoTax = {
    date: '2024-09',
    price: 64999,
    tax: null,
  };
  assert.equal(buildTaxLine(qNoTax), null);
});
