// Cashier one-liners on the receipt result screen. Pure module, no DOM access.

export const CASHIER_COMMENTS = {
  great: [
    'Tam bir nostalji uzmanısın',
    'Fiyat hafızan parmak ısırtıyor',
    'Eski fişleri saklıyorsun galiba',
    'Kasiyer bile bu kadarını hatırlayamazdı',
    'Zaman yolculuğundan yeni dönmüş gibisin',
    'Kasa kayıtlarından daha sağlam bir hafıza',
    'Bu rakamı ezbere biliyorsun belli',
    'Bravo, kuruşu kuruşuna bildin',
    'Bu hafızayla pazarda kimse seni kandıramaz',
    'Alışveriş listesini sana emanet ederiz',
    'Annemin pazar defteri kadar sağlam',
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
    'Yakın geçti, bir dahakine tamam',
    'Pazarda pazarlığı iyi biliyorsun belli',
    'Hafıza yerinde, ufak bir kayma var sadece',
    'Çok az farkla kaçtı',
    'Bu fiyatları hatırlayan az kişi kalmıştır',
  ],
  mid: [
    'Enflasyon algın biraz bozulmuş',
    'Ne çok iyi ne çok kötü, piyasa seni biraz yormuş',
    'Biraz uzaklaştın ama yönün doğru',
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
    'O devirde yaşasaydın bütçen epey zorlanırdı',
    'Tarihleri biraz karıştırmış olabilir misin?',
    'Fiyatlar o kadar da uçuk değildi sanki',
    'Hesapta ufak bir kayma var',
    'Bir sıfır fazla ya da eksik gibi, bilemedik',
    'Eski günleri biraz fazla pembe hatırlıyorsun',
    'Biraz uzak kaldın ama pes etmek yok',
    'O zamanki cüzdanı hatırlamak zor tabii',
    'Fiyatlar senin aklındakinden epey farklıymış',
    'Bir sonraki soruda telafi edersin',
    'Hesap biraz şaştı, olsun',
    'Bu fiyatı duyunca sen de şaşırdın değil mi?',
  ],
  bad: [
    'Maliye Bakanı gibisin, her şey ucuz sanıyorsun',
    'Piyasa gerçeklerinden tamamen kopuk bir tahmin',
    'Bu fiyat hangi dönemden kaldı acaba?',
    'Bu tahminle o dönem kasada mahsur kalırdın',
    'Fiyat hissin bambaşka bir galaksiden geliyor',
    'Geçmişle bağların epey zayıflamış görünüyor',
    'Bu fiyatla kasadan geçemezdik',
    'Hiç tutmadı ama gülümse, bir soru daha var',
    'O günleri başka biriyle karıştırmış olmayasın?',
    'Bu tahmini görünce kasiyer güldü',
    'Uzaktan yakından alakası yok, bir daha dene',
    'Fiş bile şaşırdı bu tahmine',
  ],
};

const SHOP_WORDS = /fiyat|kasa|kasiyer|etiket|pazar|alışveriş|cüzdan|ucuz|pahalı/i;

/**
 * Return one short, witty cashier comment for a result receipt.
 * Unknown tier falls back to mid.
 */
export function cashierComment(tier, rng = Math.random, { amount = false } = {}) {
  const all = CASHIER_COMMENTS[tier] ?? CASHIER_COMMENTS.mid;
  // A wage or pension is not on a shelf: skip the shop-talk lines for amounts.
  const plain = amount ? all.filter((line) => !SHOP_WORDS.test(line)) : all;
  const pool = plain.length ? plain : all;
  const index = Math.floor(rng() * pool.length);
  return pool[Math.max(0, Math.min(index, pool.length - 1))];
}
