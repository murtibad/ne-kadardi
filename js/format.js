// Number parsing and formatting for Turkish users.
// Turkish uses "," as the decimal separator and "." as the thousands separator.

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** Escapes text for safe use inside HTML text and double-quoted attributes. */
export const escapeHTML = (str) => (str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '');

/**
 * Parse a price typed by the user. Returns a positive number or null.
 *
 * Accepted: "4,5", "4.5", "1.250", "1.250,75", "12 ₺", "3,5 TL".
 * Rules:
 *  - If a comma exists, it is the decimal separator and dots are thousands separators.
 *  - If only dots exist and they look like thousands groups ("1.250", "12.000.000"),
 *    they are thousands separators; otherwise a single dot is a decimal point ("4.5").
 */
export function parseGuess(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim().replace(/₺|tl/gi, '').replace(/\s+/g, '');
  if (s === '') return null;

  let normalized;
  if (s.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s)) return null;
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, '');
  } else if (/^\d+(\.\d+)?$/.test(s)) {
    normalized = s;
  } else {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Format a TRY amount, e.g. 1250.5 -> "1.250,50 ₺". */
export function formatPrice(value) {
  const digits = value < 100 ? 2 : 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format a ratio with one decimal, e.g. 2.66 -> "2,7". */
export function formatRatio(value) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value);
}

/**
 * Describe a price change from an old price to today's: "12,4 katına çıktı" for big jumps,
 * but "%4 arttı" below 2x, where "1 kat arttı" would read as "it doubled".
 */
export function formatIncrease(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return '';
  // "kat arttı" would strictly mean one more than the ratio; "katına çıktı" says what happened.
  if (ratio >= 2) return `${formatRatio(ratio)} katına çıktı`;
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) return 'değişmedi';
  return pct > 0 ? `%${pct} arttı` : `%${-pct} düştü`;
}

// Locative after a number follows how its last word is read aloud: 2020'de (yirmi), 2026'da (altı),
// 2023'te (üç), 2010'da (on), 2040'ta (kırk). Years only, so 0 means "bin".
const LOC_ONES = ['', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'];
const LOC_TENS = ['', 'da', 'de', 'da', 'ta', 'de', 'ta', 'te', 'de', 'da'];

/** "Temmuz 2020" -> "Temmuz 2020'de", "2016" -> "2016'da". */
export function inPeriod(periodText) {
  const n = Number(periodText.match(/(\d+)\s*$/)?.[1]);
  if (!Number.isFinite(n)) return periodText;
  const suffix = n % 10 ? LOC_ONES[n % 10] : n % 100 ? LOC_TENS[(n % 100) / 10] : 'de';
  return `${periodText}'${suffix}`;
}

/** Format a data date: "2012" -> "2012", "2012-01" or "2012-01-15" -> "Ocak 2012". */
export function formatPeriod(date) {
  const [year, month] = date.split('-');
  return month ? `${MONTHS_TR[Number(month) - 1]} ${year}` : year;
}

/**
 * Convert a positive number into a readable Turkish magnitude string so players
 * do not lose count of zeros when typing large prices, e.g. 1250000 -> "1 milyon 250 bin ₺".
 */
export function readAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '';
  // Past a trillion the words stop helping ("100000000000 milyar"); the form asks for a smaller number.
  if (value >= 1e12) return 'çok büyük bir sayı';
  const rounded = Math.round(value * 100) / 100;
  if (rounded <= 0) return '';

  const intPart = Math.floor(rounded);
  const decCents = Math.round((rounded - intPart) * 100);
  const decStr = decCents > 0 ? String(decCents).padStart(2, '0').replace(/0+$/, '') : '';

  const groups = [
    { scale: 1e9, label: 'milyar' },
    { scale: 1e6, label: 'milyon' },
    { scale: 1e3, label: 'bin' },
  ];

  let rem = intPart;
  const parts = [];
  for (const { scale, label } of groups) {
    const count = Math.floor(rem / scale);
    if (count > 0) {
      parts.push(`${count} ${label}`);
      rem %= scale;
    }
  }

  if (rem > 0 || parts.length === 0) {
    parts.push(decStr ? `${rem},${decStr}` : `${rem}`);
  } else if (decStr) {
    // "1 bin,5" would read as 1,5 thousand; spell the zero units out instead.
    parts.push(`0,${decStr}`);
  }

  return `${parts.join(' ')} ₺`;
}
