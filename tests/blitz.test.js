import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DURATION_MS,
  WRONG_PENALTY_MS,
  startBlitz,
  remainingMs,
  answerBlitz,
  finishIfExpired,
  blitzSummary,
  formatSeconds,
} from '../js/blitz.js';

test('startBlitz initializes fresh state at given timestamp', () => {
  const state = startBlitz(1000);
  assert.deepEqual(state, {
    startedAt: 1000,
    penaltyMs: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    over: false,
  });
});

test('remainingMs decreases with elapsed time and clamps at zero', () => {
  const state = startBlitz(1000);
  assert.equal(remainingMs(state, 1000), DURATION_MS);
  assert.equal(remainingMs(state, 11000), DURATION_MS - 10000);
  assert.equal(remainingMs(state, 1000 + DURATION_MS), 0);
  assert.equal(remainingMs(state, 1000 + DURATION_MS + 5000), 0);
});

test('wrong answer subtracts 3 seconds penalty from remaining time', () => {
  const state = startBlitz(0);
  const next = answerBlitz(state, false, 5000);
  assert.equal(next.wrong, 1);
  assert.equal(next.penaltyMs, WRONG_PENALTY_MS);
  assert.equal(remainingMs(next, 5000), DURATION_MS - 5000 - WRONG_PENALTY_MS);
});

test('answering after expiry does nothing but marks over', () => {
  const state = startBlitz(0);
  const expiredByTime = answerBlitz(state, true, DURATION_MS + 1000);
  assert.equal(expiredByTime.over, true);
  assert.equal(expiredByTime.correct, 0);
  assert.equal(expiredByTime.wrong, 0);

  const expiredOver = answerBlitz(expiredByTime, true, DURATION_MS + 2000);
  assert.equal(expiredOver.over, true);
  assert.equal(expiredOver.correct, 0);
  assert.equal(expiredOver.wrong, 0);
});

test('answer that pushes penalty past zero sets over', () => {
  const state = startBlitz(0);
  const next = answerBlitz(state, false, 58500);
  assert.equal(next.over, true);
  assert.equal(remainingMs(next, 58500), 0);
  assert.equal(next.wrong, 1);
});

test('finishIfExpired returns same object unless expired', () => {
  const state = startBlitz(0);
  const running = finishIfExpired(state, 10000);
  assert.equal(running, state);

  const expired = finishIfExpired(state, DURATION_MS);
  assert.notEqual(expired, state);
  assert.equal(expired.over, true);
});

test('streak and bestStreak update correctly on hits and misses', () => {
  let state = startBlitz(0);
  state = answerBlitz(state, true, 1000);
  assert.equal(state.streak, 1);
  assert.equal(state.bestStreak, 1);

  state = answerBlitz(state, true, 2000);
  assert.equal(state.streak, 2);
  assert.equal(state.bestStreak, 2);

  state = answerBlitz(state, false, 3000);
  assert.equal(state.streak, 0);
  assert.equal(state.bestStreak, 2);

  state = answerBlitz(state, true, 4000);
  assert.equal(state.streak, 1);
  assert.equal(state.bestStreak, 2);

  state = answerBlitz(state, true, 5000);
  state = answerBlitz(state, true, 6000);
  assert.equal(state.streak, 3);
  assert.equal(state.bestStreak, 3);
});

test('state updates are immutable and preserve original object', () => {
  const state = startBlitz(0);
  const next = answerBlitz(state, true, 1000);
  assert.equal(state.correct, 0);
  assert.equal(state.streak, 0);
  assert.equal(next.correct, 1);
  assert.equal(next.streak, 1);
  assert.notEqual(state, next);
});

test('blitzSummary calculates correct, wrong, and accuracy percentage', () => {
  assert.deepEqual(blitzSummary({ correct: 0, wrong: 0 }), { correct: 0, wrong: 0, accuracy: 0 });
  assert.deepEqual(blitzSummary({ correct: 3, wrong: 1 }), { correct: 3, wrong: 1, accuracy: 75 });
  assert.deepEqual(blitzSummary({ correct: 2, wrong: 1 }), { correct: 2, wrong: 1, accuracy: 67 });
  assert.deepEqual(blitzSummary({ correct: 1, wrong: 2 }), { correct: 1, wrong: 2, accuracy: 33 });
  assert.deepEqual(blitzSummary({ correct: 0, wrong: 5 }), { correct: 0, wrong: 5, accuracy: 0 });
  assert.deepEqual(blitzSummary({ correct: 10, wrong: 0 }), { correct: 10, wrong: 0, accuracy: 100 });
});

test('formatSeconds formats countdown text with ceiling seconds', () => {
  assert.equal(formatSeconds(60000), '1:00');
  assert.equal(formatSeconds(59001), '1:00');
  assert.equal(formatSeconds(59000), '0:59');
  assert.equal(formatSeconds(4200), '0:05');
  assert.equal(formatSeconds(0), '0:00');
  assert.equal(formatSeconds(-500), '0:00');
  assert.equal(formatSeconds(-60000), '0:00');
});
