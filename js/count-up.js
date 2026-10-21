// Till-style price roll-up easing and frame generation. Pure helpers with no DOM access.

/** Cubic ease-out on [0, 1]: fast start like a cash register counter, gentle landing on the real price. */
export function easeOutCubic(t) {
  if (!Number.isFinite(t)) return 0;
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/**
 * Build `frames` numbers rising from 0 to `target` using easeOutCubic.
 * Intermediate values match formatPrice precision (2 decimals below 100, integers from 100 up)
 * so the till display does not jitter with extra decimals mid-roll.
 */
export function countUpFrames(target, { frames = 18 } = {}) {
  if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) return [];
  if (typeof frames !== 'number' || !Number.isFinite(frames) || frames < 1) return [];
  const count = Math.floor(frames);
  if (count === 1) return [target];

  const underHundred = target < 100;
  const out = new Array(count);
  out[0] = 0;
  for (let i = 1; i < count - 1; i++) {
    const raw = target * easeOutCubic(i / (count - 1));
    out[i] = underHundred ? Math.round(raw * 100) / 100 : Math.round(raw);
  }
  out[count - 1] = target;
  return out;
}
