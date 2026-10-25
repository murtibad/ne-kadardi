import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashierComment, CASHIER_COMMENTS } from '../js/cashier.js';

test('every tier returns a non-empty string', () => {
  const tiers = ['great', 'good', 'mid', 'poor', 'bad'];
  for (const tier of tiers) {
    const line = cashierComment(tier);
    assert.equal(typeof line, 'string');
    assert.ok(line.trim().length > 0);
  }
});

test('every tier has at least 5 lines and all lines are non-empty strings', () => {
  const tiers = ['great', 'good', 'mid', 'poor', 'bad'];
  for (const tier of tiers) {
    const lines = CASHIER_COMMENTS[tier];
    assert.ok(Array.isArray(lines));
    assert.ok(lines.length >= 5, `${tier} should have at least 5 lines`);
    for (const line of lines) {
      assert.equal(typeof line, 'string');
      assert.ok(line.trim().length > 0);
    }
  }
});

test('deterministic with a fixed rng', () => {
  const fixedRng = () => 0.42;
  const first = cashierComment('great', fixedRng);
  const second = cashierComment('great', fixedRng);
  assert.equal(first, second);
});

test('unknown tier falls back to a mid line', () => {
  const rngA = () => 0;
  const rngB = () => 0.6;
  assert.equal(cashierComment('unknown', rngA), cashierComment('mid', rngA));
  assert.equal(cashierComment('unknown', rngB), cashierComment('mid', rngB));
  assert.equal(cashierComment(null, rngA), cashierComment('mid', rngA));
  assert.equal(cashierComment(undefined, rngA), cashierComment('mid', rngA));
});

test('different rng values can select different lines', () => {
  const lineStart = cashierComment('great', () => 0);
  const lineEnd = cashierComment('great', () => 0.999);
  assert.notEqual(lineStart, lineEnd);

  const selected = new Set();
  for (let i = 0; i < 10; i++) {
    selected.add(cashierComment('mid', () => i / 10));
  }
  assert.ok(selected.size > 1, 'expected different lines across different rng values');
});

test('amount products get no shop-talk cashier lines', async () => {
  const { cashierComment, CASHIER_COMMENTS } = await import('../js/cashier.js');
  for (const tier of Object.keys(CASHIER_COMMENTS)) {
    for (let i = 0; i < CASHIER_COMMENTS[tier].length; i++) {
      const line = cashierComment(tier, () => i / CASHIER_COMMENTS[tier].length, { amount: true });
      assert.doesNotMatch(line, /fiyat|kasa|etiket|pazar|alışveriş/i, `${tier}: ${line}`);
    }
  }
});
