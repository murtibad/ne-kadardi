import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SET_SIZE,
  MIN_GAP,
  pickOrderSet,
  correctOrder,
  scoreOrder,
} from '../js/order.js';

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const qs = [2018, 2019, 2020].flatMap((year) =>
  ['ekmek', 'benzin', 'altin', 'cay', 'kahve', 'sut'].map((productId, i) => ({
    id: `${productId}@${year}`,
    productId,
    year,
    price: Math.pow(2, i + 1) * (year - 2000),
  }))
);

test('set has size items, same year, distinct products, sorted adjacent ratio >= MIN_GAP, not always sorted', () => {
  let seenUnsorted = false;

  for (let seed = 1; seed <= 100; seed++) {
    const res = pickOrderSet(qs, seeded(seed));
    assert.ok(res !== null, `seed ${seed} returned null`);
    assert.equal(res.items.length, SET_SIZE);
    assert.ok(res.items.every((it) => it.year === res.year));

    const productIds = new Set(res.items.map((it) => it.productId));
    assert.equal(productIds.size, SET_SIZE);

    const sorted = res.items.slice().sort((a, b) => a.price - b.price);
    for (let i = 1; i < sorted.length; i++) {
      const ratio = sorted[i].price / sorted[i - 1].price;
      assert.ok(ratio >= MIN_GAP, `ratio ${ratio} < ${MIN_GAP}`);
    }

    const isSorted = res.items.every((it, idx) => idx === 0 || it.price >= res.items[idx - 1].price);
    if (!isSorted) {
      seenUnsorted = true;
    }
  }

  assert.ok(seenUnsorted, 'at least one seed must produce an unsorted order');
});

test('recent ids are avoided when possible', () => {
  const yearQs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    id: `p${n}@2020`,
    productId: `p${n}`,
    year: 2020,
    price: Math.pow(2, n) * 10,
  }));
  const recent = ['p1@2020', 'p2@2020', 'p3@2020', 'p4@2020'];

  for (let seed = 1; seed <= 50; seed++) {
    const res = pickOrderSet(yearQs, seeded(seed), recent);
    assert.ok(res !== null);
    for (const item of res.items) {
      assert.ok(!recent.includes(item.id), `unexpected recent item ${item.id}`);
    }
  }

  const fallbackQs = [
    { id: 'a', productId: 'a', year: 2020, price: 10 },
    { id: 'b', productId: 'b', year: 2020, price: 20 },
    { id: 'c', productId: 'c', year: 2020, price: 40 },
    { id: 'd', productId: 'd', year: 2020, price: 80 },
  ];
  const resFallback = pickOrderSet(fallbackQs, seeded(1), ['a'], 4);
  assert.ok(resFallback !== null);
  assert.equal(resFallback.items.length, 4);
});

test('returns null when no year has enough distinct products, and for []', () => {
  assert.equal(pickOrderSet([], seeded(1)), null);

  const tooFew = [
    { id: 'a', productId: 'a', year: 2020, price: 10 },
    { id: 'b', productId: 'b', year: 2020, price: 20 },
    { id: 'c', productId: 'c', year: 2020, price: 40 },
  ];
  assert.equal(pickOrderSet(tooFew, seeded(1), [], 4), null);

  const sameProd = [
    { id: 'a1', productId: 'a', year: 2020, price: 10 },
    { id: 'a2', productId: 'a', year: 2020, price: 20 },
    { id: 'a3', productId: 'a', year: 2020, price: 40 },
    { id: 'a4', productId: 'a', year: 2020, price: 80 },
  ];
  assert.equal(pickOrderSet(sameProd, seeded(1), [], 4), null);
});

test('correctOrder sorts ascending by price', () => {
  const items = [
    { id: 'c', price: 40 },
    { id: 'a', price: 10 },
    { id: 'd', price: 80 },
    { id: 'b', price: 20 },
  ];
  assert.deepEqual(correctOrder(items), ['a', 'b', 'c', 'd']);
});

test('scoreOrder: perfect, reversed, adjacent swap, and validation', () => {
  const items = [
    { id: 'a', price: 10 },
    { id: 'b', price: 20 },
    { id: 'c', price: 40 },
    { id: 'd', price: 80 },
  ];

  // perfect order -> 100/perfect true
  assert.deepEqual(scoreOrder(items, ['a', 'b', 'c', 'd']), {
    score: 100,
    correctPairs: 6,
    totalPairs: 6,
    perfect: true,
  });

  // fully reversed 4 items -> 0
  assert.deepEqual(scoreOrder(items, ['d', 'c', 'b', 'a']), {
    score: 0,
    correctPairs: 0,
    totalPairs: 6,
    perfect: false,
  });

  // one adjacent swap of 4 -> 83 (5 of 6 pairs)
  assert.deepEqual(scoreOrder(items, ['b', 'a', 'c', 'd']), {
    score: 83,
    correctPairs: 5,
    totalPairs: 6,
    perfect: false,
  });

  // throws on wrong ids
  assert.throws(() => scoreOrder(items, ['a', 'b', 'c']), /permutation/);
  assert.throws(() => scoreOrder(items, ['a', 'b', 'c', 'x']), /permutation/);
  assert.throws(() => scoreOrder(items, ['a', 'b', 'c', 'a']), /permutation/);
  assert.throws(() => scoreOrder(items, ['a', 'b', 'c', 'd', 'e']), /permutation/);
  assert.throws(() => scoreOrder(items, null), /permutation/);
});
