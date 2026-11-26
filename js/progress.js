// Archive progress: how many products the player has answered, plus Turkish number suffixes. Pure, no DOM.

// Last spoken word of a number decides the suffix: [last vowel after harmony, ends in a vowel].
const UNITS = { 0: ['ı', false], 1: ['i', false], 2: ['i', true], 3: ['ü', false], 4: ['ü', false],
  5: ['i', false], 6: ['ı', true], 7: ['i', true], 8: ['i', false], 9: ['u', false] }; // sıfır bir iki üç dört beş altı yedi sekiz dokuz
const TENS = { 1: ['u', false], 2: ['i', true], 3: ['u', false], 4: ['ı', false], 5: ['i', true],
  6: ['ı', false], 7: ['i', false], 8: ['i', false], 9: ['ı', false] }; // on yirmi otuz kırk elli altmış yetmiş seksen doksan

function lastWord(n) {
  if (n === 0) return UNITS[0];
  if (n % 10) return UNITS[n % 10];
  if (n % 100) return TENS[(n % 100) / 10];
  if (n % 1000) return ['ü', false]; // yüz
  if (n % 1000000) return ['i', false]; // bin
  return ['u', false]; // milyon
}

// Accusative possessive "-(s)ını" as it is spoken after the number: 19'unu, 20'sini, 6'sını, 100'ünü.
export function accusativePossessiveSuffix(n) {
  const v = Math.trunc(Math.abs(Number(n)));
  if (!Number.isFinite(v) || v >= 1e9) return '';
  const [h, endsInVowel] = lastWord(v);
  return `${endsInVowel ? 's' : ''}${h}n${h}`;
}

export function withAccusativePossessive(n) {
  const suffix = accusativePossessiveSuffix(n);
  return suffix ? `${n}'${suffix}` : String(n);
}

// Seen ids look like "productId@date"; count distinct known products among them.
export function guessedProductIds(seen, productIds) {
  const known = new Set(productIds);
  const found = new Set();
  for (const key of seen ?? []) {
    if (typeof key !== 'string') continue;
    const at = key.lastIndexOf('@');
    const id = at < 0 ? key : key.slice(0, at);
    if (known.has(id)) found.add(id);
  }
  return found;
}

// '' when nothing was guessed yet (the line stays hidden).
export function progressText(total, guessed) {
  if (!(guessed > 0) || !(total > 0)) return '';
  return `${total} üründen ${withAccusativePossessive(guessed)} tahmin ettin`;
}
