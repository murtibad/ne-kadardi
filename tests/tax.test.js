import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTaxPeriod, taxBreakdown, buildTaxLine } from '../js/tax.js';

const taxModel = {
  method: 'Vergisiz taban fiyat üzerine Kültür Bakanlığı payı ve TRT bandrolü eklenir, toplam matrah üzerinden %50 ÖTV, tüm tutar üzerinden KDV hesaplanır: raf = taban × (1 + kültür + trt) × (1 + ötv) × (1 + kdv).',
  note: 'Vergi tutarı tahminidir; perakende marjı ayrı hesaplanmadı, fiyatın tamamı vergiye esas bedel sayıldı; ÖTV oranı matrahın en üst dilimidir ve iPhone matrahı her dönemde bu dilimin çok üstündedir; IMEI kayıt harcı dahil değildir.',
  periods: [
    {
      from: '2019-05',
      to: '2020-02',
      kdv: 0.18,
      otv: 0.5,
      trt: 0.1,
      kultur: 0,
      sources: [
        { title: 'Source 1', url: 'https://example.com/1', accessed: '2026-10-04', kind: 'news' },
        { title: 'Source 2', url: 'https://example.com/2', accessed: '2026-10-04', kind: 'news' },
      ],
    },
    {
      from: '2020-03',
      to: '2022-04',
      kdv: 0.18,
      otv: 0.5,
      trt: 0.1,
      kultur: 0.01,
      sources: [
        { title: 'Source 3', url: 'https://example.com/3', accessed: '2026-10-04', kind: 'news' },
        { title: 'Source 4', url: 'https://example.com/4', accessed: '2026-10-04', kind: 'news' },
      ],
    },
    {
      from: '2022-05',
      to: '2023-06',
      kdv: 0.18,
      otv: 0.5,
      trt: 0.12,
      kultur: 0.01,
      sources: [
        { title: 'Source 5', url: 'https://example.com/5', accessed: '2026-10-04', kind: 'news' },
        { title: 'Source 6', url: 'https://example.com/6', accessed: '2026-10-04', kind: 'news' },
      ],
    },
    {
      from: '2023-07',
      to: null,
      kdv: 0.20,
      otv: 0.5,
      trt: 0.12,
      kultur: 0.01,
      sources: [
        { title: 'Source 7', url: 'https://example.com/7', accessed: '2026-10-04', kind: 'news' },
        { title: 'Source 8', url: 'https://example.com/8', accessed: '2026-10-04', kind: 'news' },
      ],
    },
  ],
};

test('findTaxPeriod looks up period correctly and handles boundaries and missing month', () => {
  assert.equal(findTaxPeriod(taxModel, '2019-04'), null);
  assert.equal(findTaxPeriod(taxModel, '2019-05'), taxModel.periods[0]);
  assert.equal(findTaxPeriod(taxModel, '2020-02'), taxModel.periods[0]);
  assert.equal(findTaxPeriod(taxModel, '2020-03'), taxModel.periods[1]);
  assert.equal(findTaxPeriod(taxModel, '2022-04'), taxModel.periods[1]);
  assert.equal(findTaxPeriod(taxModel, '2022-05'), taxModel.periods[2]);
  assert.equal(findTaxPeriod(taxModel, '2023-06'), taxModel.periods[2]);
  assert.equal(findTaxPeriod(taxModel, '2023-07'), taxModel.periods[3]);
  assert.equal(findTaxPeriod(taxModel, '2018'), null);
  assert.equal(findTaxPeriod(taxModel, null), null);
  assert.equal(findTaxPeriod(null, '2023-07'), null);
});

test('taxBreakdown calculates shelf, base, levies, total and share correctly', () => {
  // Formula case: shelf 92999 in 2023-10 -> base ≈ 45722, total ≈ 47277, share ≈ 0.508
  const r1 = taxBreakdown(92999, '2023-10', taxModel);
  assert.ok(r1 !== null);
  assert.equal(Math.round(r1.base), 45722);
  assert.equal(Math.round(r1.total), 47277);
  assert.equal(r1.share.toFixed(3), '0.508');
  assert.equal(r1.rates.kultur, 0.01);
  assert.equal(r1.rates.trt, 0.12);
  assert.equal(r1.rates.otv, 0.5);
  assert.equal(r1.rates.kdv, 0.20);
  assert.equal(r1.shelf, 92999);
  assert.ok(Math.abs(r1.kultur + r1.trt + r1.otv + r1.kdv - r1.total) < 0.01);

  // Formula case: shelf 30999 in 2022-09 uses trt .12 and kultur .01
  const r2 = taxBreakdown(30999, '2022-09', taxModel);
  assert.ok(r2 !== null);
  assert.equal(r2.rates.trt, 0.12);
  assert.equal(r2.rates.kultur, 0.01);
  assert.equal(r2.rates.otv, 0.5);
  assert.equal(r2.rates.kdv, 0.18);

  // Formula case: 2019-10 uses kultur 0 and trt .10
  const r3 = taxBreakdown(7299, '2019-10', taxModel);
  assert.ok(r3 !== null);
  assert.equal(r3.rates.kultur, 0);
  assert.equal(r3.rates.trt, 0.10);
  assert.equal(r3.rates.otv, 0.5);
  assert.equal(r3.rates.kdv, 0.18);

  // Formula case: 2018-11 -> null
  assert.equal(taxBreakdown(7399, '2018-11', taxModel), null);

  // Formula case: 2023-06 kdv .18 vs 2023-07 kdv .20
  const rJune = taxBreakdown(40000, '2023-06', taxModel);
  const rJuly = taxBreakdown(40000, '2023-07', taxModel);
  assert.ok(rJune !== null && rJuly !== null);
  assert.equal(rJune.rates.kdv, 0.18);
  assert.equal(rJuly.rates.kdv, 0.20);
});

test('taxBreakdown returns null for invalid inputs or out of range dates', () => {
  assert.equal(taxBreakdown(0, '2025-09', taxModel), null);
  assert.equal(taxBreakdown(-50, '2025-09', taxModel), null);
  assert.equal(taxBreakdown(1000, '2018-05', taxModel), null);
  assert.equal(taxBreakdown(1000, '2025-09', null), null);
});

test('buildTaxLine builds correct Turkish sentences without the word "en az"', () => {
  const qWithCurrent = {
    date: '2024-09',
    price: 64999,
    tax: taxModel,
    current: { date: '2025-09', price: 77999 },
  };
  const line = buildTaxLine(qWithCurrent);
  assert.ok(line !== null);
  assert.ok(!line.includes('en az'));
  assert.ok(line.includes('yaklaşık'));
  assert.equal(
    line,
    'Bu fiyatın vergi payı yaklaşık %51 (yaklaşık ₺33.000). Bugünkü ₺77.999 fiyatta vergi payı yaklaşık ₺39.700.'
  );

  const qWithoutCurrent = {
    date: '2024-09',
    price: 64999,
    tax: taxModel,
    current: null,
  };
  const lineWithoutCurrent = buildTaxLine(qWithoutCurrent);
  assert.ok(!lineWithoutCurrent.includes('en az'));
  assert.ok(lineWithoutCurrent.includes('yaklaşık'));
  assert.equal(
    lineWithoutCurrent,
    'Bu fiyatın vergi payı yaklaşık %51 (yaklaşık ₺33.000).'
  );

  const qOutOfPeriod = {
    date: '2018-11',
    price: 7399,
    tax: taxModel,
    current: { date: '2025-09', price: 77999 },
  };
  assert.equal(buildTaxLine(qOutOfPeriod), null);

  const qNoTax = {
    date: '2024-09',
    price: 64999,
    tax: null,
  };
  assert.equal(buildTaxLine(qNoTax), null);
});

test('every tax period has at least 2 https sources', () => {
  for (const [i, period] of taxModel.periods.entries()) {
    assert.ok(Array.isArray(period.sources) && period.sources.length >= 2, `period ${i} must have >= 2 sources`);
    for (const [si, s] of period.sources.entries()) {
      assert.ok(s.url?.startsWith('https://'), `period ${i} source ${si} must start with https://`);
    }
  }
});

