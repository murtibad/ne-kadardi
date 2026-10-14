import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_QTY,
  ITEM_COUNT,
  niceBudget,
  buildBasketRound,
  scoreBasket,
} from '../js/basket.js';

/** Mulberry32 deterministic pseudo-random number generator for reproducible tests. */
function createRng(seed = 42) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic question dataset with >= 12 products in year 2020 and varied prices. */
const syntheticQuestions = [
  { id: 'ekmek@2020-01', productId: 'ekmek', name: 'Ekmek', year: 2020, date: '2020-01-01', price: 1.5 },
  { id: 'ekmek@2020-06', productId: 'ekmek', name: 'Ekmek', year: 2020, date: '2020-06-01', price: 2.0 }, // Later date to test deduplication
  { id: 'simit@2020-01', productId: 'simit', name: 'Simit', year: 2020, date: '2020-01-01', price: 2.5 },
  { id: 'patates@2020-01', productId: 'patates', name: 'Patates', year: 2020, date: '2020-01-01', price: 4.0 },
  { id: 'sogan@2020-01', productId: 'sogan', name: 'Soğan', year: 2020, date: '2020-01-01', price: 5.0 },
  { id: 'cay@2020-01', productId: 'cay', name: 'Çay', year: 2020, date: '2020-01-01', price: 6.0 },
  { id: 'makarna@2020-01', productId: 'makarna', name: 'Makarna', year: 2020, date: '2020-01-01', price: 8.0 },
  { id: 'sut@2020-01', productId: 'sut', name: 'Süt', year: 2020, date: '2020-01-01', price: 10.0 },
  { id: 'un@2020-01', productId: 'un', name: 'Un', year: 2020, date: '2020-01-01', price: 12.0 },
  { id: 'yumurta@2020-01', productId: 'yumurta', name: 'Yumurta', year: 2020, date: '2020-01-01', price: 15.0 },
  { id: 'peynir@2020-01', productId: 'peynir', name: 'Peynir', year: 2020, date: '2020-01-01', price: 25.0 },
  { id: 'zeytin@2020-01', productId: 'zeytin', name: 'Zeytin', year: 2020, date: '2020-01-01', price: 30.0 },
  { id: 'pirinc@2020-01', productId: 'pirinc', name: 'Pirinç', year: 2020, date: '2020-01-01', price: 35.0 },
  { id: 'dolar@2020-01', productId: 'dolar', name: 'Dolar', year: 2020, date: '2020-01-01', price: 7.0 }, // Excluded currency
  { id: 'euro@2020-01', productId: 'euro', name: 'Euro', year: 2020, date: '2020-01-01', price: 8.0 }, // Excluded currency
];

test('niceBudget rounds numbers cleanly', () => {
  // Below 100: nearest 5 (min 5)
  assert.equal(niceBudget(1), 5);
  assert.equal(niceBudget(4), 5);
  assert.equal(niceBudget(7), 5);
  assert.equal(niceBudget(8), 10);
  assert.equal(niceBudget(23), 25);
  assert.equal(niceBudget(94), 95);

  // 100 or above: 1 significant digit
  assert.equal(niceBudget(100), 100);
  assert.equal(niceBudget(120), 100);
  assert.equal(niceBudget(460), 500);
  assert.equal(niceBudget(940), 900);
  assert.equal(niceBudget(960), 1000);
  assert.equal(niceBudget(2400), 2000);
  assert.equal(niceBudget(8700), 9000);
});

test('buildBasketRound generates valid round with ITEM_COUNT items within price band', () => {
  const rng = createRng(101);
  const round = buildBasketRound(syntheticQuestions, rng);

  assert.ok(round !== null, 'round should be successfully created');
  assert.equal(round.year, 2020);
  assert.equal(round.items.length, ITEM_COUNT);

  const minPrice = round.budget / 25;
  const maxPrice = round.budget / 2;

  const seenProductIds = new Set();
  for (const item of round.items) {
    assert.equal(item.year, 2020);
    assert.ok(item.price >= minPrice, `item price ${item.price} should be >= minPrice ${minPrice}`);
    assert.ok(item.price <= maxPrice, `item price ${item.price} should be <= maxPrice ${maxPrice}`);
    assert.notEqual(item.productId, 'dolar', 'dolar must be excluded');
    assert.notEqual(item.productId, 'euro', 'euro must be excluded');
    assert.ok(!seenProductIds.has(item.productId), 'each product must be unique');
    seenProductIds.add(item.productId);

    // Ekmek should have used the latest entry in 2020 (price 2.0, not 1.5)
    if (item.productId === 'ekmek') {
      assert.equal(item.price, 2.0);
      assert.equal(item.id, 'ekmek@2020-06');
    }
  }
});

test('buildBasketRound returns null when data is too sparse', () => {
  const rng = createRng(42);

  // Empty questions
  assert.equal(buildBasketRound([], rng), null);

  // Fewer than 8 products
  const sparseQuestions = syntheticQuestions.slice(0, 5);
  assert.equal(buildBasketRound(sparseQuestions, rng), null);

  // 8 products whose prices are 10x apart: a band of 12.5x holds at most two of them
  const narrowQuestions = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i}@2020-01`, productId: `p${i}`, year: 2020, date: '2020-01-01', price: 10 ** i,
  }));
  assert.equal(buildBasketRound(narrowQuestions, rng), null);
});

test('scoreBasket handles empty, over, exact fit, and partial guesses', () => {
  const round = {
    year: 2020,
    budget: 100,
    items: [
      { id: 'a', price: 10 },
      { id: 'b', price: 20 },
      { id: 'c', price: 30 },
      { id: 'd', price: 40 },
    ],
  };

  // 1. Empty guess (no items chosen or all 0)
  const emptyRes = scoreBasket(round, {});
  assert.deepEqual(emptyRes, {
    total: 0,
    over: false,
    empty: true,
    score: 0,
    left: 100,
  });

  const allZeroRes = scoreBasket(round, { a: 0, b: 0 });
  assert.deepEqual(allZeroRes, {
    total: 0,
    over: false,
    empty: true,
    score: 0,
    left: 100,
  });

  // 2. Over budget (total > budget)
  // 3 * 40 = 120 > 100
  const overRes = scoreBasket(round, { d: 3 });
  assert.deepEqual(overRes, {
    total: 120,
    over: true,
    empty: false,
    score: 40, // 20% over, 3 points per 1%
    left: -20,
  });

  // 34% or more over scores 0
  assert.equal(scoreBasket(round, { d: 3, b: 1 }).score, 0); // 140
  assert.equal(scoreBasket(round, { a: 11 }).score, 70); // 110, 10% over

  // 3. Exact fit (total === budget => score 100, left 0)
  // 1 * 10 + 2 * 20 + 1 * 10 + 1 * 40 = 100 -> or 2 * 30 + 4 * 10 = 100
  const exactRes = scoreBasket(round, { b: 2, c: 2 }); // 2*20 + 2*30 = 100
  assert.deepEqual(exactRes, {
    total: 100,
    over: false,
    empty: false,
    score: 100,
    left: 0,
  });

  // 4. Partial fit (0 < total < budget)
  // 1 * 10 + 1 * 20 = 30 out of 100 => score: 30, left: 70
  const partialRes1 = scoreBasket(round, { a: 1, b: 1 });
  assert.deepEqual(partialRes1, {
    total: 30,
    over: false,
    empty: false,
    score: 30,
    left: 70,
  });

  // 1 * 10 + 3 * 20 = 70 out of 100 => score: 70, left: 30
  const partialRes2 = scoreBasket(round, { a: 1, b: 3 });
  assert.deepEqual(partialRes2, {
    total: 70,
    over: false,
    empty: false,
    score: 70,
    left: 30,
  });
});
