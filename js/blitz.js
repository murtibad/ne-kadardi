// "60 Saniye" blitz mode: timed pair guessing logic, no DOM, no timers.

export const DURATION_MS = 60000;
export const WRONG_PENALTY_MS = 3000; // a wrong answer costs 3 seconds

export function startBlitz(nowMs) {
  return {
    startedAt: nowMs,
    penaltyMs: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    over: false,
  };
}

export function remainingMs(state, nowMs) {
  return Math.max(0, DURATION_MS - (nowMs - state.startedAt) - state.penaltyMs);
}

export function answerBlitz(state, isCorrect, nowMs) {
  if (state.over || remainingMs(state, nowMs) <= 0) {
    return { ...state, over: true };
  }
  const correct = isCorrect ? state.correct + 1 : state.correct;
  const wrong = isCorrect ? state.wrong : state.wrong + 1;
  const streak = isCorrect ? state.streak + 1 : 0;
  const bestStreak = isCorrect ? Math.max(state.bestStreak, streak) : state.bestStreak;
  const penaltyMs = isCorrect ? state.penaltyMs : state.penaltyMs + WRONG_PENALTY_MS;

  const nextState = {
    ...state,
    correct,
    wrong,
    streak,
    bestStreak,
    penaltyMs,
  };
  nextState.over = remainingMs(nextState, nowMs) <= 0;
  return nextState;
}

export function finishIfExpired(state, nowMs) {
  if (remainingMs(state, nowMs) <= 0) {
    return { ...state, over: true };
  }
  return state;
}

export function blitzSummary(state) {
  const total = state.correct + state.wrong;
  const accuracy = total === 0 ? 0 : Math.round((state.correct / total) * 100);
  return {
    correct: state.correct,
    wrong: state.wrong,
    accuracy,
  };
}

export function formatSeconds(ms) {
  const totalSec = Math.max(0, Math.ceil(Number(ms) / 1000) || 0);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
