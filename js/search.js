// Product search for the price archive. Pure, no DOM.
const FOLD = { 'ı': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u' };

/** Lowercase with Turkish rules, then drop Turkish letters so "ısparta" and "isparta" are equal. */
export function foldTr(text) {
  return String(text ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[ığşçöü]/g, (ch) => FOLD[ch])
    .trim();
}

/** True when every word of the query appears in the name; an empty query matches everything. */
export function matchesQuery(name, query) {
  const words = foldTr(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = foldTr(name);
  return words.every((w) => haystack.includes(w));
}

/** Items (with a `name`) that match the query, in their original order. */
export function filterByQuery(items, query) {
  return items.filter((item) => matchesQuery(item.name, query));
}
