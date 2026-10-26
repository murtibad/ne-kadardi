// Cashier one-liners on the receipt result screen. Pure module, no DOM access.

export const CASHIER_COMMENTS = {
  great: [
    'Tam bir nostalji uzmanısın',
    'Fiyat hafızan parmak ısırtıyor',
    'Eski fişleri saklıyorsun galiba',
    'Kasiyer bile bu kadarını hatırlayamazdı',
    'Zaman yolculuğundan yeni dönmüş gibisin',
    'Kasa kayıtlarından bile sağlam bir hafızan var',
    'Bu rakamı ezbere biliyorsun belli',
    'Bravo, kuruşu kuruşuna bildin',
    'Bu hafızayla pazarda kimse seni kandıramaz',
    'Alışveriş listesini sana emanet ederiz',
    'Hafızan annemin pazar defteri kadar sağlam',
    'Etiketi sen mi yapıştırmıştın?',
  ],
  good: [
    'Fena değil, piyasayı iyi takip ediyorsun',
    'Eski günler hatırı sayılır derecede aklında',
    'Neredeyse kuruşu kuruşuna tutturdun',
    'Hafızan gayet diri, tebrikler',
    'Fiyat artışları seni pek şaşırtmamış',
    'Küçük bir sapmayla hedefe çok yakınsın',
    'Az kalsın tam tutturuyordun',
    'Yakın geçti, bir dahakine tam isabet',
    'Pazarda pazarlığı iyi biliyorsun belli',
    'Hafıza yerinde, ufak bir kayma var sadece',
    'Çok az farkla kaçtı',
    'Bu fiyatları hatırlayan az kişi kalmıştır',
  ],
  mid: [
    'Enflasyon algın biraz bozulmuş',
    'Ne çok iyi ne çok kötü, piyasa seni biraz yormuş',
    'Biraz uzaklaştın ama hâlâ oyundasın',
    'Eski fiyatlar hafiften silinmeye başlamış',
    'Kafandaki etiket ile gerçek etiket pek uyuşmadı',
    'Zaman her şeyi unutturur, fiyatları da',
    'Yarı yarıya tuttu sayılır',
    'O günleri biraz unutmuşsun gibi',
    'Ne ucuz ne pahalı, arada bir yerde',
    'Bir dahaki soruda daha iyisi gelir',
    'Fiyatlar o kadar hızlı değişti ki, haklısın',
    'Etiket biraz silinmiş, olur öyle',
  ],
  poor: [
    'O devrin rakamları kolay akılda kalmıyor',
    'Tarihleri biraz karıştırmış olabilir misin?',
    'O dönemin hesabını tutturmak kolay değil tabii',
    'Hesapta ufak bir kayma var',
    'Bir sıfır fazla ya da eksik gibi geldi bana',
    'O günlerin rakamları biraz bulanıklaşmış',
    'Biraz uzak kaldın ama pes etmek yok',
    'O zamanki cüzdanı hatırlamak zor tabii',
    'Fiyatlar senin aklındakinden epey farklıymış',
    'Bir sonraki soruda telafi edersin',
    'Hesap biraz şaştı, olsun',
    'Bu fiyatı duyunca sen de şaşırdın değil mi?',
  ],
  bad: [
    'Eski rakamların izi tamamen silinmiş sanki',
    'Piyasa gerçeklerinden tamamen kopuk bir tahmin',
    'Bu fiyat hangi dönemden kaldı acaba?',
    'Bu tahminle o dönem kasada epey şaşırırdık',
    'Fiyat hissin bambaşka bir galaksiden geliyor',
    'Geçmişle bağların epey zayıflamış görünüyor',
    'Hesap makinesi bile şaşırdı bu tahmine',
    'Hiç tutmadı ama gülümse, bir soru daha var',
    'O günleri başka biriyle karıştırmış olmayasın?',
    'Bu tahmini görünce ben bile güldüm',
    'Uzaktan yakından alakası yok, bir daha dene',
    'Fiş bile şaşırdı bu tahmine',
  ],
};

const SHOP_WORDS = /fiyat|kasa|kasiyer|etiket|pazar|alışveriş|cüzdan|ucuz|pahalı|fiş/i;

/**
 * Return one short, witty cashier comment for a result receipt.
 * Unknown tier falls back to mid.
 */
// Lines here do not know whether the guess was too high or too low, so they must fit both.
export function cashierComment(tier, rng = Math.random, { amount = false } = {}) {
  const all = CASHIER_COMMENTS[tier] ?? CASHIER_COMMENTS.mid;
  // A wage or pension is not on a shelf: skip the shop-talk lines for amounts.
  const plain = amount ? all.filter((line) => !SHOP_WORDS.test(line)) : all;
  const pool = plain.length ? plain : all;
  const index = Math.floor(rng() * pool.length);
  return pool[Math.max(0, Math.min(index, pool.length - 1))];
}
