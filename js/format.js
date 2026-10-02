// Number parsing and formatting for Turkish users.
// Turkish uses "," as the decimal separator and "." as the thousands separator.

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

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

/** Format a data date: "2012" -> "2012", "2012-01" or "2012-01-15" -> "Ocak 2012". */
export function formatPeriod(date) {
  const [year, month] = date.split('-');
  return month ? `${MONTHS_TR[Number(month) - 1]} ${year}` : year;
}
