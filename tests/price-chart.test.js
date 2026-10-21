import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPriceChart } from '../js/price-chart.js';

test('buildPriceChart returns null for non-array input or fewer than 2 valid rows', () => {
  assert.equal(buildPriceChart(null), null);
  assert.equal(buildPriceChart(undefined), null);
  assert.equal(buildPriceChart('not-an-array'), null);
  assert.equal(buildPriceChart({}), null);
  assert.equal(buildPriceChart([]), null);
  assert.equal(buildPriceChart([{ date: '2020', price: 10, isCurrent: false }]), null);
  assert.equal(
    buildPriceChart([
      { date: '2020', price: 10, isCurrent: false },
      { date: '2021', price: null, isCurrent: false },
      { date: '2022', price: 0, isCurrent: false },
      { date: '2023', price: -5, isCurrent: false },
      { date: '2024', price: NaN, isCurrent: true },
    ]),
    null
  );
});

test('buildPriceChart maps first and last points to horizontal plot bounds and min/max prices to vertical bounds', () => {
  const pad = { top: 10, right: 16, bottom: 20, left: 14 };
  const chart = buildPriceChart(
    [
      { date: '2012-01', price: 4, isCurrent: false },
      { date: '2018-01', price: 12, isCurrent: false },
      { date: '2024-01', price: 40, isCurrent: true },
    ],
    { width: 300, height: 150, pad }
  );

  assert.equal(chart.width, 300);
  assert.equal(chart.height, 150);
  assert.equal(chart.minPrice, 4);
  assert.equal(chart.maxPrice, 40);

  assert.equal(chart.points[0].x, pad.left);
  assert.equal(chart.points[2].x, 300 - pad.right);

  // Lowest price sits at height - pad.bottom; highest price sits at pad.top.
  assert.equal(chart.points[0].y, 150 - pad.bottom);
  assert.equal(chart.points[2].y, pad.top);
});

test('buildPriceChart uses a log scale on y', () => {
  const pad = { top: 10, right: 10, bottom: 30, left: 10 };
  const chart = buildPriceChart(
    [
      { date: '2010', price: 1, isCurrent: false },
      { date: '2015', price: 10, isCurrent: false },
      { date: '2020', price: 100, isCurrent: true },
    ],
    { width: 320, height: 140, pad }
  );

  const verticalMiddle = pad.top + (140 - pad.top - pad.bottom) / 2;
  assert.equal(chart.points[0].y, 140 - pad.bottom);
  assert.equal(chart.points[1].y, verticalMiddle);
  assert.equal(chart.points[2].y, pad.top);
});

test('buildPriceChart places month fractions proportionally between years', () => {
  const pad = { top: 12, right: 20, bottom: 22, left: 20 };
  const chart = buildPriceChart(
    [
      { date: '2020', price: 10, isCurrent: false },
      { date: '2020-07', price: 20, isCurrent: false },
      { date: '2021', price: 30, isCurrent: true },
    ],
    { width: 340, height: 140, pad }
  );

  const horizontalMiddle = pad.left + (340 - pad.left - pad.right) / 2;
  assert.equal(chart.points[0].x, pad.left);
  assert.equal(chart.points[1].x, horizontalMiddle);
  assert.equal(chart.points[2].x, 340 - pad.right);
});

test('buildPriceChart sets the highlight flag on the matching date only', () => {
  const chart = buildPriceChart(
    [
      { date: '2014-01', price: 5, isCurrent: false },
      { date: '2019-06', price: 15, isCurrent: false },
      { date: '2026-10', price: 50, isCurrent: true },
    ],
    { highlightDate: '2019-06' }
  );

  assert.deepEqual(
    chart.points.map((p) => p.highlight),
    [false, true, false]
  );
  assert.deepEqual(
    chart.points.map((p) => p.isCurrent),
    [false, false, true]
  );
});

test('buildPriceChart skips rows with null or non-positive prices without crashing', () => {
  const chart = buildPriceChart([
    { date: '2010', price: null, isCurrent: false },
    { date: '2012', price: 8, isCurrent: false },
    null,
    { date: '2016', price: Infinity, isCurrent: false },
    { date: '2020', price: 32, isCurrent: true },
  ]);

  assert.equal(chart.points.length, 2);
  assert.equal(chart.points[0].date, '2012');
  assert.equal(chart.points[1].date, '2020');
  assert.equal(chart.minPrice, 8);
  assert.equal(chart.maxPrice, 32);
});

test('buildPriceChart places equal prices at the vertical middle of the plot area', () => {
  const pad = { top: 12, right: 12, bottom: 22, left: 12 };
  const chart = buildPriceChart(
    [
      { date: '2015', price: 25, isCurrent: false },
      { date: '2020', price: 25, isCurrent: false },
      { date: '2025', price: 25, isCurrent: true },
    ],
    { width: 320, height: 140, pad }
  );

  const expectedY = (pad.top + (140 - pad.bottom)) / 2;
  for (const pt of chart.points) {
    assert.equal(pt.y, expectedY);
  }
});

test('buildPriceChart generates xTicks with first and last year labels and at most 5 ticks', () => {
  const chart = buildPriceChart([
    { date: '2010-01', price: 2, isCurrent: false },
    { date: '2014-01', price: 4, isCurrent: false },
    { date: '2018-01', price: 8, isCurrent: false },
    { date: '2022-01', price: 20, isCurrent: false },
    { date: '2026-10', price: 60, isCurrent: true },
  ]);

  assert.ok(chart.xTicks.length >= 2 && chart.xTicks.length <= 5);
  assert.equal(chart.xTicks[0].label, '2010');
  assert.equal(chart.xTicks[chart.xTicks.length - 1].label, '2026');

  const labels = chart.xTicks.map((t) => t.label);
  assert.equal(new Set(labels).size, labels.length, 'tick labels must not contain duplicates');

  for (let i = 1; i < chart.xTicks.length; i++) {
    assert.ok(chart.xTicks[i].x > chart.xTicks[i - 1].x, 'ticks must be sorted by x ascending');
  }
});

test('buildPriceChart formats SVG line starting with M and area ending with Z', () => {
  const chart = buildPriceChart([
    { date: '2010', price: 5, isCurrent: false },
    { date: '2018', price: 15, isCurrent: false },
    { date: '2026', price: 45, isCurrent: true },
  ]);

  assert.ok(chart.line.startsWith('M '), 'line path must start with M');
  assert.ok(chart.line.includes(' L '), 'line path must contain L segments');
  assert.ok(chart.area.startsWith(chart.line), 'area path must start with the line path');
  assert.ok(chart.area.endsWith(' Z'), 'area path must end with Z');
});

test('buildPriceChart spaces points evenly by index when all times are equal and avoids duplicate year ticks', () => {
  const pad = { top: 12, right: 20, bottom: 22, left: 20 };
  const chart = buildPriceChart(
    [
      { date: '2022-05', price: 10, isCurrent: false },
      { date: '2022-05', price: 20, isCurrent: false },
      { date: '2022-05', price: 40, isCurrent: true },
    ],
    { width: 340, height: 140, pad }
  );

  assert.deepEqual(
    chart.points.map((p) => p.x),
    [20, 170, 320]
  );
  assert.deepEqual(chart.xTicks, [{ x: 20, label: '2022' }]);
});

