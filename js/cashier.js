// Cashier one-liners on the receipt result screen. Pure module, no DOM access.

export const CASHIER_COMMENTS = {
  great: [
    'Tam bir nostalji uzmanısın',
    'Fiyat hafızan parmak ısırtıyor',
    'Eski fişleri saklıyorsun galiba',
    'Kasiyer bile bu kadarını hatırlayamazdı',
    'Zaman yolculuğundan yeni dönmüş gibisin',
    'Kasa kayıtlarından daha sağlam bir hafıza',
  ],
  good: [
    'Fena değil, piyasayı iyi takip ediyorsun',
    'Eski günlerin hatırı sayılır derecede aklında',
    'Neredeyse kuruşu kuruşuna tutturdun',
    'Hafızan gayet diri, tebrikler',
    'Piyasa dalgalanmaları seni pek yanıltmamış',
    'Küçük bir sapmayla hedefe çok yakınsın',
  ],
  mid: [
    'Enflasyon algın biraz bozulmuş',
    'Ne çok iyi ne çok kötü, piyasa seni biraz yormuş',
    'Biraz uzaklaştın ama yönün doğru',
    'Eski fiyatlar hafiften silinmeye başlamış',
    'Kafandaki etiket ile gerçek etiket pek uyuşmadı',
    'Zaman her şeyi unutturur, fiyatları da',
  ],
  poor: [
    'O devirde yaşasaydın bütçen epey zorlanırdı',
    'Tarihleri biraz karıştırmış olabilir misin?',
    'Fiyatlar o kadar da uçuk değildi sanki',
    'Hesap kitap tarafında hafif bir türbülans var',
    'Bir sıfır fazla ya da eksik gibi, bilemedik',
    'Eski günleri biraz fazla pembe hatırlıyorsun',
  ],
  bad: [
    'Maliye Bakanı gibisin, her şey ucuz sanıyorsun',
    'Piyasa gerçeklerinden tamamen kopuk bir tahmin',
    'Hangi paralel evrenin fiyatı bu?',
    'Bu tahminle o dönem kasada mahsur kalırdın',
    'Fiyat hissin bambaşka bir galaksiden geliyor',
    'Geçmişle bağların tamamen kopmuş görünüyor',
  ],
};

/**
 * Return one short, witty cashier comment for a result receipt.
 * Unknown tier falls back to mid.
 */
export function cashierComment(tier, rng = Math.random) {
  const pool = CASHIER_COMMENTS[tier] ?? CASHIER_COMMENTS.mid;
  const index = Math.floor(rng() * pool.length);
  return pool[Math.max(0, Math.min(index, pool.length - 1))];
}
