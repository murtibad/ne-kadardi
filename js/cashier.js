// Cashier one-liners on the receipt result screen. Pure module, no DOM access.

export const CASHIER_COMMENTS = {
  great: [
    'Valla helal, bakkal defteri gibi hafızan var',
    'Annen seni markete boşuna yollamamış, helal olsun',
    'Senin hesabına bakkal veresiye yazar, gözü kapalı',
    'Tam isabet, çay benden',
    'Dayın duysa sırtını sıvazlardı',
    'Abi, sen bu işin hocasısın',
    'Pazarcı seni görünce fiyatı dürüst söyler',
    'Kuruşu kuruşuna, alnının akıyla',
    'Komşu teyze bunu duysa bütün mahalleye anlatır',
    'Hacı, sen bunu ezberden biliyorsun',
    'Çay ocağında sana kimse laf yetiştiremez',
    'Etiketi sen mi yapıştırdın, bu ne isabet',
  ],
  good: [
    'Az kaldı, çay demlenmeden tutturacaktın',
    'Fena değil, annenin tembihleri işe yaramış',
    'Kıl payı kaçtı, gardaş',
    'Yaklaştın, dayı olsa sırtına vururdu',
    'Hafıza yerinde, ufak bir kayma var sadece',
    'Minibüste durağı az kaçırdın, o kadar',
    'Bayram harçlığını hak ettin',
    'Hedefin kenarına değdi, fena değil',
    'Yeğenim, az daha gayret, tam oturacak',
    'Pazarlıkta seni kimse kazıklayamaz, aferin',
    'Komşu teyze bile bu kadar hatırlamaz',
    'Valla iyisin, biraz daha dikkat yeter',
  ],
  mid: [
    'Yarı yarıya tuttu, yarısı çaya gitti',
    'Ne kel ne fodul, orta yerdesin',
    'Hafıza biraz demini almamış gibi',
    'Minibüs doğru, durak biraz yanlış',
    'Annen sorsa \'eh işte\' derdin',
    'Bakkal defterinde birkaç sayfa karışmış',
    'Abi, kafandaki hesap biraz kaymış',
    'Çay ocağındaki muhabbet kadar emin değilsin',
    'Tuttu sayılmaz ama tutmadı da denmez',
    'Eh işte, bayramlık değil ama giyilir',
    'Bilader, bir dahakine gözlüğü tak',
    'Etiket biraz silinmiş, olur öyle',
  ],
  poor: [
    'Olsun, düğünde de herkes oynamayı bilmez',
    'Hesap biraz şaştı, bir çay iç kendine gel',
    'Dayım da hep böyle tahmin eder, hiç tutmaz',
    'Gardaş, hesap biraz dağılmış ama moral bozma',
    'Bakkal defterine bakmadan söyledin galiba',
    'Minibüsü kaçırdın ama arkadan yenisi geliyor',
    'Annen duymasın, sonra kızar',
    'Hafıza biraz tatile çıkmış',
    'Valla olsun, sonraki soruda telafi edersin',
    'O zamanki cüzdanı hatırlamak zor tabii',
    'Komşu teyze de hep yanlış söyler, üzülme',
    'Yeğenim, bu sefer olmadı, kafana takma',
  ],
  bad: [
    'Hiç alakası yok ama gülüşün güzel',
    'Bu tahmini dayıya söyleme, çayı döker',
    'Hacı, bu tahmin başka mahalleden',
    'Bakkal defteri görse sayfayı yırtar',
    'Anneme sorsan bundan iyi tahmin ederdi',
    'Minibüse bindin ama yanlış hatta',
    'Bu tahmini görünce ben bile güldüm',
    'Çay ocağında bunu anlatsam sabaha kadar gülerler',
    'Abi, sen bu soruyu rüyanda mı gördün?',
    'Kaçırdın ama dert etme, bir soru daha var',
    'Hesap makinesi bile şaştı bu işe',
    'Fiş bile utandı bu tahmine',
  ],
};

/**
 * Pick one line from pool, skipping lines in `recent` when possible.
 * Why: players saw the same joke twice in one session. If every line is recent
 * (small pool), fall back to the whole pool rather than returning nothing.
 */
export function pickFresh(pool, recent = [], rng = Math.random) {
  const fresh = pool.filter((line) => !recent.includes(line));
  const from = fresh.length ? fresh : pool;
  const index = Math.floor(rng() * from.length);
  return from[Math.max(0, Math.min(index, from.length - 1))];
}

/** Push a line onto an in-memory recent list, keeping only the newest `max`. */
export function rememberLine(recent, line, max = 12) {
  if (!line) return recent;
  return [...recent.filter((l) => l !== line), line].slice(-max);
}

const SHOP_WORDS = /fiyat|kasa|kasiyer|etiket|pazar|alışveriş|cüzdan|ucuz|pahalı|fiş/i;

/**
 * Return one short, witty cashier comment for a result receipt.
 * Unknown tier falls back to mid.
 */
// Lines here do not know whether the guess was too high or too low, so they must fit both.
export function cashierComment(tier, rng = Math.random, { amount = false, recent = [] } = {}) {
  const all = CASHIER_COMMENTS[tier] ?? CASHIER_COMMENTS.mid;
  // A wage or pension is not on a shelf: skip the shop-talk lines for amounts.
  const plain = amount ? all.filter((line) => !SHOP_WORDS.test(line)) : all;
  const pool = plain.length ? plain : all;
  return pickFresh(pool, recent, rng);
}
