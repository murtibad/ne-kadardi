// Category of each product for the price archive filter. Pure, no DOM.
// Kept here instead of prices.json: it is presentation, not sourced data.
export const CATEGORIES = [
  { id: 'para', label: 'Para ve altın', products: ['dolar', 'euro', 'sterlin', 'gram-altin', 'bitcoin', 'ceyrek-altin', 'gram-gumus'] },
  { id: 'ulasim', label: 'Ulaşım ve yakıt', products: ['benzin', 'motorin', 'otogaz', 'kopru', 'osmangazi-koprusu', 'avrasya-tuneli', 'anadolu-otoyolu', 'taksi-acilis', 'ispark-otopark', 'yht-bilet', 'istanbul-ulasim', 'okul-servisi', 'fiat-egea-easy', 'togg-t10x'] },
  { id: 'gunluk', label: 'Gıda ve gündelik', products: ['ekmek', 'firin-ekmegi', 'cay', 'big-mac', 'sigara-marlboro', 'plastik-poset', 'simit', 'mektup-pulu', 'iski-su', 'tmo-bugday', 'findik-alim', 'cig-sut'] },
  { id: 'teknoloji', label: 'Teknoloji ve eğlence', products: ['iphone', 'playstation', 'ea-fc-oyun', 'airpods', 'spotify', 'amazon-prime', 'disney-plus', 'netflix', 'youtube-premium', 'milli-piyango-ceyrek', 'sinema-ortalama-bilet'] },
  { id: 'maas', label: 'Maaş ve yardımlar', products: ['asgari-ucret', 'emekli-en-dusuk-aylik', 'emekli-bayram-ikramiyesi', 'dogum-yardimi', 'kyk-burs', 'aclik-siniri', 'kidem-tavani'] },
  { id: 'harc', label: 'Harç, ceza ve bedeller', products: ['trafik-cezasi', 'alkol-cezasi', 'mtv', 'kyk-yurt-ucreti', 'pasaport-harci', 'yurtdisi-cikis-harci', 'basvurma-harci', 'ehliyet-harci', 'ehliyet-esinav', 'schengen-vize', 'imei-kayit-harci', 'arac-muayene-ucreti', 'bedelli-askerlik', 'yks', 'kpss-lisans', 'kpss-onlisans', 'ales', 'yds', 'dgs', 'msu', 'fitre', 'kurban-vekalet-bedeli', 'aile-cuzdani', 'surucu-belgesi-bedeli', 'arac-tescil-belgesi', 'kimlik-karti', 'noter-asgari-ucret'] },
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
