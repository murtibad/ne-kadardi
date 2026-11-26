import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeGuesses, rememberGuess, guessFor, GUESS_MEMORY_MAX } from '../js/guess-memory.js';

test('sanitizeGuesses drops invalid values and non-objects', () => {
  assert.deepEqual(sanitizeGuesses({ 'a@2020-01': 4.5, b: 0, c: -1, d: 'x', e: null, f: Infinity }), { 'a@2020-01': 4.5 });
  assert.deepEqual(sanitizeGuesses(null), {});
  assert.deepEqual(sanitizeGuesses([1, 2]), {});
  assert.deepEqual(sanitizeGuesses('x'), {});
});

test('sanitizeGuesses keeps only the newest entries', () => {
  const big = Object.fromEntries(Array.from({ length: 520 }, (_, i) => [`p@${i}`, i + 1]));
  const out = sanitizeGuesses(big);
  assert.equal(Object.keys(out).length, GUESS_MEMORY_MAX);
  assert.equal(out['p@0'], undefined);
  assert.equal(out['p@519'], 520);
});

test('rememberGuess adds, replaces and trims without mutating', () => {
  const a = { 'x@1': 1 };
  const b = rememberGuess(a, 'y@1', 2);
  assert.deepEqual(a, { 'x@1': 1 });
  assert.deepEqual(Object.keys(b), ['x@1', 'y@1']);
  const c = rememberGuess(b, 'x@1', 9);
  assert.deepEqual(Object.keys(c), ['y@1', 'x@1']);
  assert.equal(c['x@1'], 9);
  assert.deepEqual(rememberGuess(c, 'z', NaN), c);
  assert.equal(Object.keys(rememberGuess({ a: 1, b: 2, c: 3 }, 'd', 4, 3)).join(), 'b,c,d');
});

test('guessFor looks up valid guesses only', () => {
  assert.equal(guessFor({ a: 4.5 }, 'a'), 4.5);
  assert.equal(guessFor({ a: 4.5 }, 'b'), null);
  assert.equal(guessFor({ a: -1 }, 'a'), null);
  assert.equal(guessFor(null, 'a'), null);
});
