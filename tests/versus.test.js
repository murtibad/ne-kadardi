import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPair, judgePair, nextStreak } from '../js/versus.js';

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const qs = [1, 2, 3, 4, 5, 6, 7].flatMap((n) =>
  [10, 25, 60].map((p) => ({ id: `p${n}@${p}`, productId: `p${n}`, price: p * n })));

test('pairs have different products and a price ratio in range', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const { a, b } = pickPair(qs, seeded(seed));
    assert.notEqual(a.productId, b.productId);
    const r = Math.max(a.price, b.price) / Math.min(a.price, b.price);
    assert.ok(r >= 1.2 && r <= 8, `ratio ${r}`);
  }
});

test('recent ids are avoided when possible', () => {
  const recent = qs.slice(0, 15).map((q) => q.id);
  for (let seed = 1; seed <= 50; seed++) {
    const { a, b } = pickPair(qs, seeded(seed), recent);
    assert.ok(!recent.includes(a.id) && !recent.includes(b.id));
  }
});

test('returns null when no valid pair exists', () => {
  const same = [{ id: 'x', productId: 'x', price: 5 }, { id: 'y', productId: 'y', price: 5 }];
  assert.equal(pickPair(same, seeded(1)), null);
  assert.equal(pickPair([], seeded(1)), null);
});

test('judgePair marks the pricier side as the winner', () => {
  const pair = { a: { price: 10 }, b: { price: 25 } };
  assert.deepEqual(judgePair(pair, 'b'), { correct: true, winner: 'b', ratio: 2.5 });
  assert.equal(judgePair(pair, 'a').correct, false);
});

test('nextStreak grows on a hit and resets on a miss', () => {
  assert.equal(nextStreak(3, true), 4);
  assert.equal(nextStreak(3, false), 0);
});
