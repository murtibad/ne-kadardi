import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMotion, reducedMotion, motionLabel } from '../js/motion.js';

test('a saved choice wins over the system reduce-motion setting', () => {
  assert.equal(resolveMotion('full', true), 'full');
  assert.equal(resolveMotion('reduce', false), 'reduce');
  assert.equal(resolveMotion(null, true), 'reduce');
  assert.equal(resolveMotion(null, false), 'full');
  assert.equal(resolveMotion('junk', true), 'reduce');
});

test('reducedMotion reads the root data-motion attribute', () => {
  assert.equal(reducedMotion({ dataset: { motion: 'reduce' } }), true);
  assert.equal(reducedMotion({ dataset: { motion: 'full' } }), false);
  assert.equal(reducedMotion(undefined), false);
});

test('the footer switch says what is on now', () => {
  assert.equal(motionLabel('full'), 'Animasyonlar: açık');
  assert.equal(motionLabel('reduce'), 'Animasyonlar: kapalı');
});
