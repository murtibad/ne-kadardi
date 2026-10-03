import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceKindLabel } from '../js/source-kind.js';

test('sourceKindLabel maps the four known kinds', () => {
  assert.equal(sourceKindLabel('official'), 'resmî kayıt');
  assert.equal(sourceKindLabel('dataset'), 'yayımlanmış veri');
  assert.equal(sourceKindLabel('news'), 'haber kaynaklı');
  assert.equal(sourceKindLabel('derived'), 'türetilmiş değer');
});

test('sourceKindLabel returns an empty string for unknown or missing kinds', () => {
  assert.equal(sourceKindLabel('rumor'), '');
  assert.equal(sourceKindLabel('toString'), '');
  assert.equal(sourceKindLabel(''), '');
  assert.equal(sourceKindLabel(undefined), '');
  assert.equal(sourceKindLabel(null), '');
});
