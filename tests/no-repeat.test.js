import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashierComment, pickFresh, rememberLine, CASHIER_COMMENTS } from '../js/cashier.js';
import { contextComment, hintComment, HINT_LINES, OVER_COMMENTS } from '../js/banter.js';

test('pickFresh avoids recent lines and falls back when all are recent', () => {
  const pool = ['a', 'b', 'c'];
  for (let i = 0; i < 10; i++) {
    assert.equal(pickFresh(pool, ['a', 'b'], () => i / 10), 'c');
  }
  assert.equal(pickFresh(pool, ['a', 'b', 'c'], () => 0), 'a');
  assert.equal(pickFresh(pool, [], () => 0.5), pickFresh(pool, undefined, () => 0.5));
});

test('rememberLine keeps only the newest 12 and ignores empty lines', () => {
  let recent = [];
  for (let i = 0; i < 20; i++) recent = rememberLine(recent, `l${i}`);
  assert.equal(recent.length, 12);
  assert.equal(recent.at(-1), 'l19');
  assert.equal(rememberLine(recent, null), recent);
});

test('cashierComment never repeats within a pool-sized run when recent is passed', () => {
  const recent = [];
  for (let i = 0; i < CASHIER_COMMENTS.great.length; i++) {
    const line = cashierComment('great', Math.random, { recent });
    assert.ok(!recent.includes(line), `repeated: ${line}`);
    recent.push(line);
  }
});

test('contextComment and hintComment honour the recent list', () => {
  const recentHints = HINT_LINES.slice(0, -1);
  for (let i = 0; i < 10; i++) {
    assert.equal(hintComment(() => i / 10, recentHints), HINT_LINES.at(-1));
  }
  const recentOver = OVER_COMMENTS.slice(1);
  for (let i = 0; i < 10; i++) {
    assert.equal(contextComment({ direction: 'over', factor: 4 }, () => i / 10, recentOver), OVER_COMMENTS[0]);
  }
});
