import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPlainKey, pairSide, optionIndex } from '../js/keys.js';

test('pairSide maps arrows and 1/2', () => {
  assert.equal(pairSide('ArrowLeft'), 'a');
  assert.equal(pairSide('1'), 'a');
  assert.equal(pairSide('ArrowRight'), 'b');
  assert.equal(pairSide('2'), 'b');
  assert.equal(pairSide('3'), null);
  assert.equal(pairSide('Enter'), null);
});

test('optionIndex accepts digits within range only', () => {
  assert.equal(optionIndex('1', 4), 0);
  assert.equal(optionIndex('4', 4), 3);
  assert.equal(optionIndex('5', 4), null);
  assert.equal(optionIndex('0', 4), null);
  assert.equal(optionIndex('a', 4), null);
  assert.equal(optionIndex(' ', 4), null);
});

test('isPlainKey skips modifiers and form fields', () => {
  assert.equal(isPlainKey({ target: { tagName: 'BODY' } }), true);
  assert.equal(isPlainKey({ ctrlKey: true, target: { tagName: 'BODY' } }), false);
  assert.equal(isPlainKey({ target: { tagName: 'INPUT' } }), false);
});
