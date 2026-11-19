// Product search for the price archive. Pure, no DOM.
const FOLD = { 'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u' };

/** Lowercase with Turkish rules, then drop Turkish letters so "ısparta" and "isparta" are equal. */
export function foldTr(text) {
  return String(text ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[ığşçöü]/g, (ch) => FOLD[ch])
    .trim();
}

/** True when strings differ by at most one insertion, deletion or substitution. */
export function withinOneEdit(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diff = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) {
        diff++;
        if (diff > 1) return false;
      }
    }
    return true;
  }
  const shorter = la < lb ? a : b;
  const longer = la < lb ? b : a;
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else {
      diff++;
      if (diff > 1) return false;
      j++;
    }
  }
  return true;
}

/** True when query word qw (len >= 4) matches nw or nw's prefix of len qw.length±1 within 1 edit. */
function wordMatchesFuzzy(qw, nw) {
  if (withinOneEdit(qw, nw)) return true;
  const len = qw.length;
  for (const delta of [-1, 0, 1]) {
    const targetLen = len + delta;
    if (targetLen > 0 && targetLen <= nw.length) {
      if (withinOneEdit(qw, nw.slice(0, targetLen))) return true;
    }
  }
  return false;
}

/** True when every word of the query appears in the name; an empty query matches everything. */
export function matchesQuery(name, query) {
  const words = foldTr(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = foldTr(name);
  return words.every((w) => haystack.includes(w));
}

// Everyday words people actually type, by product id. Searched like extra words of the name, so
// "mazot" finds Motorin and "akbil" finds the Istanbul fares. Only words that clearly mean that product.
export const ALIASES = {
  motorin: 'mazot dizel akaryakit',
  benzin: 'akaryakit',
  otogaz: 'tup akaryakit',
  'istanbul-ulasim': 'akbil istanbulkart metro otobus metrobus vapur',
  'istanbul-ogrenci-bileti': 'akbil istanbulkart metro otobus metrobus ogrenci',
  'ankara-ulasim': 'ankarakart metro otobus',
  'izmir-ulasim': 'izmirim kart metro otobus vapur',
  dolar: 'doviz kur',
  euro: 'doviz kur avro',
  sterlin: 'doviz kur pound',
  bitcoin: 'kripto',
  'fiat-egea-easy': 'araba otomobil',
  'togg-t10x': 'araba otomobil elektrikli',
  'arac-muayene-ucreti': 'araba',
  'asgari-ucret': 'maas',
  'emekli-en-dusuk-aylik': 'maas',
  iphone: 'telefon',
  'imei-kayit-harci': 'telefon',
  netflix: 'dizi film',
  'disney-plus': 'dizi film',
  'amazon-prime': 'dizi film',
  spotify: 'muzik',
  'youtube-premium': 'muzik',
  'kyk-burs': 'ogrenci universite',
  'kyk-yurt-ucreti': 'ogrenci universite',
  yks: 'universite',
};

/** True when a query word starts one of the product's alias words ("diz" must not reach "dizel"
 * through a substring, so aliases match from the start of a word and need at least 3 letters). */
function aliasHit(item, w) {
  if (w.length < 3) return false;
  return (ALIASES[item?.id] ?? '').split(' ').some((a) => a.startsWith(w));
}

/** Name match first, then an alias that starts with the word. */
function itemMatches(item, query) {
  const words = foldTr(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = foldTr(item?.name);
  return words.every((w) => haystack.includes(w) || aliasHit(item, w));
}

/** Items (with a `name`) that match the query, in their original order. */
export function filterByQuery(items, query) {
  const exact = items.filter((item) => itemMatches(item, query));
  if (exact.length > 0) return exact;
  const words = foldTr(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return items.filter((item) => {
    const haystack = foldTr(item.name);
    const nameWords = haystack.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return words.every((w) => {
      if (w.length < 4) return haystack.includes(w);
      return nameWords.some((nw) => wordMatchesFuzzy(w, nw));
    });
  });
}
