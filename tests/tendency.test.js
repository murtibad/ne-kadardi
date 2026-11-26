import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sessionTendencyLine,
  advanceColdStreak,
  TENDENCY_UNDER_LINE,
  TENDENCY_OVER_LINE,
  COLD_STREAK_TIP,
} from '../js/tendency.js';

test('sessionTendencyLine returns empty string outside multiples of 5 or on invalid input', () => {
  assert.equal(sessionTendencyLine(null), '');
  assert.equal(sessionTendencyLine([]), '');
  assert.equal(sessionTendencyLine(['under', 'under', 'under', 'under']), '');
  assert.equal(sessionTendencyLine(['over', 'over', 'over', 'over', 'over', 'over']), '');
  assert.equal(sessionTendencyLine(Array(9).fill('under')), '');
});

test('sessionTendencyLine fires at 5, 10, 15 when >=70% are under or over', () => {
  // 4/5 = 80% -> fires; 3/5 = 60% -> does not fire
  assert.equal(sessionTendencyLine(['under', 'under', 'under', 'under', 'over']), TENDENCY_UNDER_LINE);
  assert.equal(sessionTendencyLine(['over', 'over', 'over', 'over', 'exact']), TENDENCY_OVER_LINE);
  assert.equal(sessionTendencyLine(['under', 'under', 'under', 'over', 'over']), '');
  assert.equal(sessionTendencyLine(['over', 'over', 'over', 'exact', 'exact']), '');

  // Exact 70% boundary at 10 (7/10) fires; 6/10 does not
  const sevenUnder = [...Array(7).fill('under'), 'over', 'over', 'exact'];
  assert.equal(sessionTendencyLine(sevenUnder), TENDENCY_UNDER_LINE);
  const sevenOver = [...Array(7).fill('over'), 'under', 'exact', 'exact'];
  assert.equal(sessionTendencyLine(sevenOver), TENDENCY_OVER_LINE);
  const sixUnder = [...Array(6).fill('under'), 'over', 'over', 'over', 'exact'];
  assert.equal(sessionTendencyLine(sixUnder), '');

  // At 15: 11/15 (~73.3%) fires; 10/15 (~66.7%) does not
  assert.equal(sessionTendencyLine([...Array(11).fill('under'), ...Array(4).fill('over')]), TENDENCY_UNDER_LINE);
  assert.equal(sessionTendencyLine([...Array(10).fill('over'), ...Array(5).fill('under')]), '');
});

test('advanceColdStreak emits the tip once on the 3rd zero in a row', () => {
  let step = advanceColdStreak(undefined, 0);
  assert.deepEqual(step, { state: { zeros: 1, shown: false }, text: '' });

  step = advanceColdStreak(step.state, 0);
  assert.deepEqual(step, { state: { zeros: 2, shown: false }, text: '' });

  step = advanceColdStreak(step.state, 0);
  assert.deepEqual(step, { state: { zeros: 3, shown: true }, text: COLD_STREAK_TIP });

  // A 4th zero in a row does not repeat the tip.
  step = advanceColdStreak(step.state, 0);
  assert.deepEqual(step, { state: { zeros: 4, shown: true }, text: '' });
});

test('advanceColdStreak resets the zero counter on any non-zero score and stays once per session', () => {
  let state = { zeros: 0, shown: false };

  state = advanceColdStreak(state, 0).state;
  state = advanceColdStreak(state, 0).state;
  assert.equal(state.zeros, 2);

  // Any positive score resets zeros to 0 without marking shown.
  const mid = advanceColdStreak(state, 15);
  assert.deepEqual(mid, { state: { zeros: 0, shown: false }, text: '' });
  state = mid.state;

  // Now three zeros in a row trigger the tip.
  state = advanceColdStreak(state, 0).state;
  state = advanceColdStreak(state, 0).state;
  const hit = advanceColdStreak(state, 0);
  assert.equal(hit.text, COLD_STREAK_TIP);
  assert.equal(hit.state.shown, true);

  // Resetting after shown and getting three more zeros does not show it a second time.
  state = advanceColdStreak(hit.state, 80).state;
  assert.deepEqual(state, { zeros: 0, shown: true });
  state = advanceColdStreak(state, 0).state;
  state = advanceColdStreak(state, 0).state;
  const secondStreak = advanceColdStreak(state, 0);
  assert.equal(secondStreak.text, '');
  assert.equal(secondStreak.state.zeros, 3);
  assert.equal(secondStreak.state.shown, true);
});
