// Tax estimate calculations for products with compound taxes (e.g. Kültür payı + TRT bandrolü + ÖTV + KDV on phones).
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
 * Calculate the estimated tax breakdown for a product shelf price and date.
 * Formula:
 *  shelf = base * (1 + kultur + trt) * (1 + otv) * (1 + kdv)
 *  base = shelf / ((1 + kultur + trt) * (1 + otv) * (1 + kdv))
 *  kultur = base * kultur; trt = base * trt
 *  otv = base * (1 + kultur + trt) * otv
 *  kdv = base * (1 + kultur + trt) * (1 + otv) * kdv
 *  total = shelf - base; share = total / shelf
 *
 * Returns { shelf, base, kultur, trt, otv, kdv, total, share, rates: { kultur, trt, otv, kdv }, period } or null.
 */
export function taxBreakdown(price, date, taxModel) {
  if (typeof price !== 'number' || price <= 0 || !date || !taxModel) return null;
  const period = findTaxPeriod(taxModel, date);
  if (!period) return null;

  const kulturRate = period.kultur ?? 0;
  const trtRate = period.trt ?? 0;
  const otvRate = period.otv ?? 0;
  const kdvRate = period.kdv ?? 0;

  const shelf = price;
  const factor = (1 + kulturRate + trtRate) * (1 + otvRate) * (1 + kdvRate);
  if (factor <= 0) return null;

  const base = shelf / factor;
  const kultur = base * kulturRate;
  const trt = base * trtRate;
  const otv = base * (1 + kulturRate + trtRate) * otvRate;
  const kdv = base * (1 + kulturRate + trtRate) * (1 + otvRate) * kdvRate;
  const total = shelf - base;
  const share = total / shelf;

  return {
    shelf,
    base,
    kultur,
    trt,
    otv,
    kdv,
    total,
    share,
    rates: {
      kultur: kulturRate,
      trt: trtRate,
      otv: otvRate,
      kdv: kdvRate,
    },
    period,
  };
}

/**
 * Result receipt sentence explaining the tax estimate.
 * e.g. "Bu fiyatın vergi payı yaklaşık %51 (yaklaşık ₺15.800). Bugünkü ₺77.999 fiyatta vergi payı yaklaşık ₺35.600."
 */
export function buildTaxLine(q) {
  if (!q?.tax || !q?.price || !q?.date) return null;
  const tb = taxBreakdown(q.price, q.date, q.tax);
  if (!tb) return null;

  const sharePercent = Math.round(tb.share * 100);
  const roundedAmount = Math.round(tb.total / 100) * 100;
  const formattedAmount = formatPrice(roundedAmount);

  let sentence = `Bu fiyatın vergi payı yaklaşık %${sharePercent} (yaklaşık ${formattedAmount}).`;

  if (q.current?.price && q.current?.date && !(q.current.date === q.date && q.current.price === q.price)) {
    const currentTb = taxBreakdown(q.current.price, q.current.date, q.tax);
    if (currentTb) {
      const currentPriceStr = formatPrice(q.current.price);
      const roundedCurrentAmount = Math.round(currentTb.total / 100) * 100;
      const currentAmountStr = formatPrice(roundedCurrentAmount);
      sentence += ` Bugünkü ${currentPriceStr} fiyatta vergi payı yaklaşık ${currentAmountStr}.`;
    }
  }

  return sentence;
}
