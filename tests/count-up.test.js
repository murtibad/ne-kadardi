import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easeOutCubic, countUpFrames } from '../js/count-up.js';

test('easeOutCubic clamps to [0, 1] and eases out cubically', () => {
  assert.equal(easeOutCubic(-0.5), 0);
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(0.5), 0.875);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(1.5), 1);
});

test('countUpFrames starts at 0, ends at target, and is monotonic non-decreasing', () => {
  for (const target of [1.25, 42.5, 100, 1450, 250000]) {
    const frames = countUpFrames(target, { frames: 18 });
    assert.equal(frames.length, 18);
    assert.equal(frames[0], 0);
    assert.equal(frames[frames.length - 1], target);
    for (let i = 1; i < frames.length; i++) {
      assert.ok(frames[i] >= frames[i - 1], `frame ${i} (${frames[i]}) < frame ${i - 1} (${frames[i - 1]}) for target ${target}`);
    }
  }
});

test('countUpFrames respects custom frame count', () => {
  const frames = countUpFrames(500, { frames: 60 });
  assert.equal(frames.length, 60);
  assert.equal(frames[0], 0);
  assert.equal(frames[59], 500);
});

test('countUpFrames rounds intermediate values to 2 decimals below 100', () => {
  const frames = countUpFrames(7.35, { frames: 18 });
  for (const v of frames) {
    assert.equal(Math.round(v * 100) / 100, v, `expected at most 2 decimals, got ${v}`);
  }
  assert.ok(frames.some((v) => !Number.isInteger(v) && v !== 7.35), 'expected fractional intermediate values');
});

test('countUpFrames rounds intermediate values to integers for target >= 100', () => {
  const frames = countUpFrames(1250, { frames: 18 });
  for (const v of frames) {
    assert.ok(Number.isInteger(v), `expected integer frame, got ${v}`);
  }
});

test('countUpFrames returns empty array for 0, negative, or non-finite targets', () => {
  for (const bad of [0, -1, -100, NaN, Infinity, -Infinity, null, undefined, '10']) {
    assert.deepEqual(countUpFrames(bad), [], `expected [] for ${String(bad)}`);
  }
});
