import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paperAge } from '../js/paper.js';

test('recent years print on fresh paper', () => {
  assert.equal(paperAge(2022), 0);
  assert.equal(paperAge(2026), 0);
});

test('2008 and older are fully aged', () => {
  assert.equal(paperAge(2008), 1);
  assert.equal(paperAge(2005), 1);
});

test('ages grow monotonically between the bounds', () => {
  assert.equal(paperAge(2015), 0.5);
  for (let y = 2009; y <= 2022; y += 1) assert.ok(paperAge(y) <= paperAge(y - 1));
});

test('bad input is treated as fresh', () => {
  assert.equal(paperAge(NaN), 0);
  assert.equal(paperAge(undefined), 0);
});
