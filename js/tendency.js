// Free-play session feedback helpers: direction tendency and cold-streak tip.
// Pure functions, no DOM access.

export const TENDENCY_STEP = 5;
export const TENDENCY_NUM = 7; // 70% threshold expressed as 7/10 for exact integer comparison
export const TENDENCY_DEN = 10;

export const TENDENCY_UNDER_LINE = 'Bu oturumda genelde az tahmin ettin: eski fiyatlar sandığından pahalıymış.';
export const TENDENCY_OVER_LINE = 'Bu oturumda genelde fazla tahmin ettin: o zamanlar her şey daha ucuzmuş.';

export const COLD_STREAK_THRESHOLD = 3;
export const COLD_STREAK_TIP = 'İpucu: önce o yılın asgari ücretini düşün, sonra ürünü ona göre tahmin et. İpucu düğmesi de işe yarar.';

/**
 * Return a session tendency line on every 5th scored free-play question (5, 10, 15, ...)
 * when at least 70% of guesses in the session were 'under' or at least 70% were 'over'.
 * Otherwise return ''.
 */
export function sessionTendencyLine(directions) {
  if (!Array.isArray(directions) || directions.length === 0 || directions.length % TENDENCY_STEP !== 0) {
    return '';
  }
  const total = directions.length;
  let under = 0;
  let over = 0;
  for (const dir of directions) {
    if (dir === 'under') under += 1;
    else if (dir === 'over') over += 1;
  }
  if (under * TENDENCY_DEN >= total * TENDENCY_NUM) return TENDENCY_UNDER_LINE;
  if (over * TENDENCY_DEN >= total * TENDENCY_NUM) return TENDENCY_OVER_LINE;
  return '';
}

/**
 * Advance the consecutive zero-point counter for free play.
 * Resets on any non-zero score; emits the tip once per session on the 3rd zero in a row.
 * Returns { state: { zeros, shown }, text }.
 */
export function advanceColdStreak(prev, score) {
  const prevZeros = Number.isFinite(prev?.zeros) && prev.zeros > 0 ? prev.zeros : 0;
  const shown = Boolean(prev?.shown);
  if (score !== 0) {
    return { state: { zeros: 0, shown }, text: '' };
  }
  const zeros = prevZeros + 1;
  if (!shown && zeros >= COLD_STREAK_THRESHOLD) {
    return { state: { zeros, shown: true }, text: COLD_STREAK_TIP };
  }
  return { state: { zeros, shown }, text: '' };
}
