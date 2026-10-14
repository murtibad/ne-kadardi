// Desktop shortcuts for the quick modes. Pure mapping, no DOM: the screens decide what a key does.
const PAIR_KEYS = { ArrowLeft: 'a', 1: 'a', ArrowRight: 'b', 2: 'b' };

/** Ignore keys with modifiers and keys typed into form fields. */
export function isPlainKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const tag = event.target?.tagName;
  return tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT';
}

/** 'a' / 'b' for a two-option screen, or null. */
export function pairSide(key) {
  return PAIR_KEYS[key] ?? null;
}

/** 0-based option index for digit keys 1..count, or null. */
export function optionIndex(key, count) {
  const n = Number(key);
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : null;
}
