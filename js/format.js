// Number parsing and formatting for Turkish users.
// Turkish uses "," as the decimal separator and "." as the thousands separator.

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** Escapes text for safe use inside HTML text and double-quoted attributes. */
export const escapeHTML = (str) => (str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '');

// Reusable Intl.NumberFormat instances to avoid recreating them on every animation frame.
const FORMATTER_CACHE = new Map();

function formatterKey(options, locale) {
  if (!options) return locale;
  const entries = Object.keys(options)
    .filter((k) => options[k] !== undefined)
    .sort()
    .map((k) => `${k}=${options[k]}`);
  return `${locale}:${entries.join(';')}`;
}

/**
 * Return a cached Intl.NumberFormat instance for the given options and locale.
 * Options are serialized deterministically so combinations like maximumFractionDigits 0 vs 1
 * receive distinct cached instances.
 */
export function getNumberFormatter(options = {}, locale = 'tr-TR') {
  const key = formatterKey(options, locale);
  let formatter = FORMATTER_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    FORMATTER_CACHE.set(key, formatter);
  }
  return formatter;
}

/** Format a number using a cached Intl.NumberFormat instance. */
export function formatNumber(value, options = {}, locale = 'tr-TR') {
  return getNumberFormatter(options, locale).format(value);
}

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
  // People write the unit by habit ("4,5 lira", "20 TL"); the box already shows ₺, so the word is dropped.
  const s = input.trim().replace(/₺|t\.?l\.?|lira/gi, '').replace(/\s+/g, '');
  if (s === '') return null;

  let normalized;
  if (s.includes(',')) {
    if (!/^[1-9]\d{0,2}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s)) return null;
    normalized = s.replace(/\./g, '').replace(',', '.');
  // The first group may not start with 0: "0.250" is 0,25 (a decimal point), not a thousands group.
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, '');
  } else if (/^\d+(\.\d+)?$/.test(s)) {
    normalized = s;
  } else {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const groupThousands = (digits) => digits.replace(/\B(?=(\d{3})+$)/g, '.');

/**
 * Re-format a price while it is typed: "1250000" -> "1.250.000", "1250,5" -> "1.250,5".
 * Anything parseGuess reads as a decimal ("4.5", "0.250", "12.50") or cannot read is left alone,
 * so the formatted text always parses to the number the player meant.
 */
export function formatInputThousands(raw) {
  if (typeof raw !== 'string' || !/^[\d.,]+$/.test(raw) || raw.endsWith('.')) return raw;
  const parts = raw.split(',');
  if (parts.length > 2) return raw;
  const [intText, dec] = parts;
  if (intText === '' || (dec !== undefined && !/^\d*$/.test(dec))) return raw;
  const tail = dec === undefined ? '' : `,${dec}`;

  if (!intText.includes('.')) {
    return /^[1-9]\d{3,}$/.test(intText) ? groupThousands(intText) + tail : raw;
  }
  if (!/^\d+(\.\d+)+$/.test(intText) || intText.startsWith('0')) return raw;
  const groups = intText.split('.');
  // A lone dot with 1-2 trailing digits is a decimal point; with a comma present dots are always thousands.
  const last = groups[groups.length - 1];
  const isDecimal = dec === undefined && groups.length === 2 && (last.length < 3 || groups[0].length > 3);
  if (isDecimal) return raw;
  return groupThousands(groups.join('')) + tail;
}

/** Format a TRY amount, e.g. 1250.5 -> "1.250,50 ₺". */
export function formatPrice(value) {
  const digits = value < 100 ? 2 : 0;
  return getNumberFormatter({
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format a ratio with one decimal, e.g. 2.66 -> "2,7". */
export function formatRatio(value) {
  // "172.854,1 kat" reads as noise: past 100 the decimal adds nothing.
  return getNumberFormatter({ maximumFractionDigits: value >= 100 ? 0 : 1 }).format(value);
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

/**
 * Convert a typed price into a plain-language readout so players can confirm
 * decimal kuruş or large thousands before submitting.
 */
export function readoutText(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '';
  if (value >= 1000) return readAmount(value);
  if (Number.isInteger(value)) return '';

  const totalKurus = Math.round(value * 100);
  if (totalKurus <= 0) return '';

  const lira = Math.floor(totalKurus / 100);
  const kurus = totalKurus % 100;

  if (lira === 0) return `${kurus} kuruş`;
  // When kuruş rounds to 0 (e.g. 4.999), show whole liras without a trailing zero kuruş.
  if (kurus === 0) return `${lira} lira`;
  return `${lira} lira ${kurus} kuruş`;
}

/**
 * Long news headlines take four lines on a phone receipt: cut on a word boundary and keep a
 * trailing date ("(08.08.2022)", ", 2010-01"), which tells the reader when the price was reported.
 */
export function shortTitle(text, max = 48) {
  const s = String(text ?? '');
  // A trailing ", 2010-01" or a bracketed part with digits ("(08.08.2022)", "(9 Şubat 2024)") is the date.
  const m = s.match(/^(.*?)(,\s*[\d.-]+|\s*\([^()]*\d[^()]*\))$/);
  const [head, date] = m ? [m[1], m[2]] : [s, ''];
  if (head.length <= max) return s;
  const cut = head.lastIndexOf(' ', max);
  const kept = (cut > 0 ? head.slice(0, cut) : head.slice(0, max)).replace(/[\s,.;:–-]+$/, '');
  return `${kept}…${date}`;
}

// The no-break space keeps "·" on the same line as the region, so a narrow
// screen never ends a line with a lone separator.
export function unitLine(unit, region) {
  return region ? `${unit} ·\u00A0${region}` : unit;
}

// How far to scroll down so the submit button's bottom clears the visible (visual) viewport by
// `margin` px, without pushing the input above its top. Rects are getBoundingClientRect() values.
export function keyboardFitDelta(buttonRect, inputRect, viewTop, viewHeight, margin = 12) {
  const missing = buttonRect.bottom + margin - (viewTop + viewHeight);
  if (!(missing > 0)) return 0;
  const room = inputRect.top - viewTop; // scrolling more than this hides the input
  return Math.max(0, Math.min(missing, room));
}
