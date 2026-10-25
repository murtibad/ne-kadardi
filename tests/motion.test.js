import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMotion, gentleMotion } from '../js/motion.js';

test('reduce-motion turns animations gentle, never off', () => {
  assert.equal(resolveMotion(true), 'gentle');
  assert.equal(resolveMotion(false), 'full');
});

test('gentleMotion reads the root data-motion attribute', () => {
  assert.equal(gentleMotion({ dataset: { motion: 'gentle' } }), true);
  assert.equal(gentleMotion({ dataset: { motion: 'full' } }), false);
  assert.equal(gentleMotion(undefined), false);
});