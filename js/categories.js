// Category of each product for the price archive filter. Pure, no DOM.
// Kept here instead of prices.json: it is presentation, not sourced data.
export const CATEGORIES = [
  { id: 'para', label: 'Para ve altın', products: ['dolar', 'euro', 'gram-altin', 'ceyrek-altin'] },
  { id: 'ulasim', label: 'Ulaşım ve yakıt', products: ['benzin', 'motorin', 'kopru', 'taksi-acilis', 'istanbul-ulasim'] },
  { id: 'gunluk', label: 'Gıda ve gündelik', products: ['ekmek', 'cay', 'big-mac', 'sigara-marlboro', 'plastik-poset'] },
  { id: 'teknoloji', label: 'Teknoloji ve eğlence', products: ['iphone', 'playstation', 'airpods', 'spotify', 'netflix'] },
  { id: 'maas', label: 'Maaş ve yardımlar', products: ['asgari-ucret', 'emekli-en-dusuk-aylik', 'dogum-yardimi', 'kyk-burs', 'aclik-siniri'] },
  { id: 'harc', label: 'Harç, ceza ve bedeller', products: ['trafik-cezasi', 'pasaport-harci', 'ehliyet-harci', 'schengen-vize', 'imei-kayit-harci', 'arac-muayene-ucreti', 'bedelli-askerlik', 'yks', 'kpss-lisans', 'fitre', 'kurban-vekalet-bedeli', 'aile-cuzdani'] },
];

/** Category id of a product, or null when it is not listed. */
export function categoryOf(productId) {
  return CATEGORIES.find((c) => c.products.includes(productId))?.id ?? null;
}

/** Timelines of one category; an unknown or empty id (or 'all') returns everything. */
export function filterTimelines(timelines, categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? timelines.filter((t) => cat.products.includes(t.id)) : timelines;
}
