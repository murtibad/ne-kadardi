// Category of each product for the price archive filter. Pure, no DOM.
// Kept here instead of prices.json: it is presentation, not sourced data.
export const CATEGORIES = [
  { id: 'para', label: 'Para ve altın', products: ['dolar', 'euro', 'sterlin', 'gram-altin', 'bitcoin', 'ceyrek-altin', 'gram-gumus'] },
  { id: 'ulasim', label: 'Ulaşım ve yakıt', products: ['benzin', 'motorin', 'otogaz', 'kopru', 'osmangazi-koprusu', 'avrasya-tuneli', 'anadolu-otoyolu', 'taksi-acilis', 'ispark-otopark', 'yht-bilet', 'istanbul-ulasim', 'istanbul-ogrenci-bileti', 'ankara-ulasim', 'izmir-ulasim', 'okul-servisi', 'fiat-egea-easy', 'togg-t10x'] },
  { id: 'gunluk', label: 'Gıda ve gündelik', products: ['ekmek', 'firin-ekmegi', 'cay', 'big-mac', 'sigara-marlboro', 'plastik-poset', 'simit', 'mektup-pulu', 'iski-su', 'tmo-bugday', 'findik-alim', 'cig-sut'] },
  { id: 'teknoloji', label: 'Teknoloji ve eğlence', products: ['iphone', 'playstation', 'ea-fc-oyun', 'airpods', 'spotify', 'amazon-prime', 'disney-plus', 'netflix', 'youtube-premium', 'milli-piyango-ceyrek', 'sinema-ortalama-bilet'] },
  { id: 'maas', label: 'Maaş ve yardımlar', products: ['asgari-ucret', 'emekli-en-dusuk-aylik', 'emekli-bayram-ikramiyesi', 'dogum-yardimi', 'kyk-burs', 'aclik-siniri', 'kidem-tavani', 'yemek-karti'] },
  { id: 'harc', label: 'Harç, ceza ve bedeller', products: ['trafik-cezasi', 'alkol-cezasi', 'mtv', 'kyk-yurt-ucreti', 'pasaport-harci', 'yurtdisi-cikis-harci', 'basvurma-harci', 'ehliyet-harci', 'ehliyet-esinav', 'schengen-vize', 'imei-kayit-harci', 'arac-muayene-ucreti', 'bedelli-askerlik', 'yks', 'kpss-lisans', 'kpss-onlisans', 'ales', 'yds', 'dgs', 'msu', 'fitre', 'kurban-vekalet-bedeli', 'aile-cuzdani', 'surucu-belgesi-bedeli', 'arac-tescil-belgesi', 'kimlik-karti', 'noter-asgari-ucret'] },
];

/** Category id of a product, or null when it is not listed. */
export function categoryOf(productId) {
  return CATEGORIES.find((c) => c.products.includes(productId))?.id ?? null;
}

// Products that feel like the same topic back-to-back (e.g. two breads, two fuels, two exams).
// Free play keeps a family out for FAMILY_WINDOW questions when another product is available.
export const FAMILIES = [
  { id: 'doviz', products: ['dolar', 'euro', 'sterlin'] },
  { id: 'altin', products: ['gram-altin', 'ceyrek-altin'] },
  { id: 'yakit', products: ['benzin', 'motorin', 'otogaz'] },
  { id: 'gecis', products: ['kopru', 'osmangazi-koprusu', 'avrasya-tuneli', 'anadolu-otoyolu'] },
  { id: 'toplu-tasima', products: ['istanbul-ulasim', 'istanbul-ogrenci-bileti', 'ankara-ulasim', 'izmir-ulasim'] },
  { id: 'otomobil', products: ['fiat-egea-easy', 'togg-t10x'] },
  { id: 'ekmek', products: ['ekmek', 'firin-ekmegi'] },
  { id: 'tarim', products: ['tmo-bugday', 'findik-alim', 'cig-sut'] },
  { id: 'abonelik', products: ['spotify', 'amazon-prime', 'disney-plus', 'netflix', 'youtube-premium'] },
  { id: 'emekli', products: ['emekli-en-dusuk-aylik', 'emekli-bayram-ikramiyesi'] },
  { id: 'sinav', products: ['yks', 'kpss-lisans', 'kpss-onlisans', 'ales', 'yds', 'dgs', 'msu'] },
  { id: 'trafik-cezasi', products: ['trafik-cezasi', 'alkol-cezasi'] },
  { id: 'ehliyet', products: ['ehliyet-harci', 'ehliyet-esinav', 'surucu-belgesi-bedeli'] },
  { id: 'yurtdisi', products: ['pasaport-harci', 'yurtdisi-cikis-harci', 'schengen-vize'] },
  { id: 'resmi-belge', products: ['aile-cuzdani', 'arac-tescil-belgesi', 'kimlik-karti'] },
  { id: 'diyanet', products: ['fitre', 'kurban-vekalet-bedeli'] },
];

/** Family key of a product (shared for close siblings like bread or fuel; otherwise its own id). */
export function familyOf(productId) {
  if (!productId) return null;
  return FAMILIES.find((f) => f.products.includes(productId))?.id ?? productId;
}

/** Timelines of one category; an unknown or empty id (or 'all') returns everything. */
export function filterTimelines(timelines, categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? timelines.filter((t) => cat.products.includes(t.id)) : timelines;
}
