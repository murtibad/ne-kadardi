// Tax floor calculations for products with compound taxes (e.g. ÖTV + KDV on phones).
// Pure module, no DOM access.
import { formatPrice } from './format.js';

/**
 * Find the applicable tax period for a date (YYYY-MM).
 * A year-only date ("YYYY") has no month, so it returns null.
 */
export function findTaxPeriod(taxModel, date) {
  if (!taxModel?.periods || !date) return null;
  if (!/^\d{4}-\d{2}/.test(date)) return null;
  const ym = date.slice(0, 7);
  for (const period of taxModel.periods) {
    if (period.from && ym < period.from) continue;
    if (period.to && ym > period.to) continue;
    return period;
  }
  return null;
}

/**
 * Calculate the tax floor for a given price and date.
 * Formula: share = 1 - 1 / ((1 + otv) * (1 + kdv)); amount = price * share.
 * Returns { share, amount, kdv, otv, period } or null.
 */
export function taxFloor(price, date, taxModel) {
  if (typeof price !== 'number' || price <= 0 || !date || !taxModel) return null;
  const period = findTaxPeriod(taxModel, date);
  if (!period) return null;
  const { kdv, otv } = period;
  const share = 1 - 1 / ((1 + otv) * (1 + kdv));
  const amount = price * share;
  return {
    share,
    amount,
    kdv,
    otv,
    period,
  };
}

/** Turkish possessive suffix for whole amounts rounded to nearest 100 TL. */
function amountSuffix(amount) {
  if (amount % 1000 !== 0) return "'ü";
  if (amount % 1000000 === 0) return "'u";
  return "'i";
}

/**
 * Result receipt sentence explaining the tax floor.
 * e.g. "Bu fiyatın en az %44'ü vergi (yaklaşık ₺28.900). Bugünkü ₺99.999 fiyatın en az ₺44.400'ü vergi."
 */
export function buildTaxLine(q) {
  if (!q?.tax || !q?.price || !q?.date) return null;
  const tf = taxFloor(q.price, q.date, q.tax);
  if (!tf) return null;

  const sharePercent = Math.round(tf.share * 100);
  const roundedAmount = Math.round(tf.amount / 100) * 100;
  const formattedAmount = formatPrice(roundedAmount);

  let sentence = `Bu fiyatın en az %${sharePercent}'ü vergi (yaklaşık ${formattedAmount}).`;

  if (q.current?.price && q.current?.date) {
    const currentTf = taxFloor(q.current.price, q.current.date, q.tax);
    if (currentTf) {
      const currentPriceStr = formatPrice(q.current.price);
      const roundedCurrentAmount = Math.round(currentTf.amount / 100) * 100;
      const currentAmountStr = formatPrice(roundedCurrentAmount);
      const suffix = amountSuffix(roundedCurrentAmount);
      sentence += ` Bugünkü ${currentPriceStr} fiyatın en az ${currentAmountStr}${suffix} vergi.`;
    }
  }

  return sentence;
}
