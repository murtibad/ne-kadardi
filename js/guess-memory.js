// The player's own past guesses, kept so the archive can say "Tahminin: ₺4,50". Pure helpers, no DOM or storage.
export const GUESS_MEMORY_MAX = 500;

/** A clean { questionId: guess } map from parsed storage; bad entries are dropped, only the newest `max` stay. */
export function sanitizeGuesses(raw, max = GUESS_MEMORY_MAX) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const entries = Object.entries(raw).filter(([id, g]) => id && typeof g === 'number' && Number.isFinite(g) && g > 0);
  return Object.fromEntries(entries.slice(-max));
}

/** Returns a new map with the guess added as the newest entry (an answered-again question moves to the end). */
export function rememberGuess(map, id, guess, max = GUESS_MEMORY_MAX) {
  if (!id || typeof guess !== 'number' || !Number.isFinite(guess) || guess <= 0) return map;
  const { [id]: _old, ...rest } = map;
  return sanitizeGuesses({ ...rest, [id]: guess }, max);
}

/** The remembered guess for a question, or null. */
export function guessFor(map, id) {
  const g = map?.[id];
  return typeof g === 'number' && Number.isFinite(g) && g > 0 ? g : null;
}
