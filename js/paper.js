// How yellowed an old receipt looks: 0 = fresh white paper (2022 and later), 1 = fully aged (2008 and earlier).
// Pure so it can be tested; main.js feeds the result into the --age CSS variable.
const FRESH_YEAR = 2022;
const AGED_YEAR = 2008;

export function paperAge(year) {
  if (!Number.isFinite(year)) return 0;
  const t = (FRESH_YEAR - year) / (FRESH_YEAR - AGED_YEAR);
  return Math.round(Math.max(0, Math.min(1, t)) * 100) / 100;
}
