# Tasarım Kuralları

Ne Kadardı? projesinin genel tasarım ve kodlama prensipleri aşağıda belirtilmiştir. Uygulama "Kasa Fişi" (Receipt) temasını temel alır.

## Genel Prensipler
- **Mobil Öncelikli (Mobile First):** Tek kolonlu, ekran başına tek bir temel aksiyonun bulunduğu sade bir deneyim sunulur (390px hedefli tasarlanmıştır).
- **Renk Paleti (Tek Vurgu):** 
  - Zemin: Sıcak kırık beyaz (`--bg`).
  - Fiş Kâğıdı: Biraz daha açık, krem/beyaz arası bir renk (`--paper`).
  - Metinler: Mürekkep siyahı (`--ink` / `--text`).
  - İkincil Metinler: Gri (`--muted`).
  - Vurgu: Yalnızca tek bir kırmızı vurgu (`--accent`). (Yeşil veya başka bir renk kullanılmaz).
- **Tipografi:** 
  - UI Metinleri (Başlıklar, Butonlar): Temiz bir sans-serif (DM Sans).
  - Fiş Detayları ve Girdiler: Retro/termal görünümü tamamlayan monospace bir font (Space Mono).
- **Karanlık Mod (Dark Mode):** Cihazın temasını destekler. Karanlık modda arkaplan antrasit/siyaha dönerken, fiş kağıdı rengi tamamen siyah olmaz; karanlık ortamdaki bir kâğıt fişi andıracak şekilde biraz daha loş ama görünür kalır.
- **Minimalizm:** Geçişli renkler (gradients), gölge efektleri (fiş kartı altındaki doğal düşen gölge hariç) ve stok illüstrasyonlar kullanılmaz.

## Kasa Fişi (Ripped Receipt) Teması
- **Soru Ekranı:** Üstten düz, alt kısımdan "yırtılmış fiş" (zigzag) efektine sahip bir form kartıdır.
- **Sonuç Ekranı:** Hem üstten hem de alttan yırtılmış gerçek bir kasa fişi gibidir. Tarih, tahmin, gerçek fiyat, değerlendirme ("X kat az tahmin ettin"), bugünkü fiyat, artış oranı ve puan gibi bilgiler kesik çizgili (dashed) ayıraçlar ve düzgün monospace hizalamaları ile sunulur. Karar/Değerlendirme kısmı kırmızı çerçeveli bir kutu içinde gösterilir.

## Erişilebilirlik ve Sadelik
- Yazı tipleri yeterince büyük, form elemanları net görünürdür (`contrast ≥ 4.5:1`).
- Sayı klavyesi için özel/sahte bir arayüz yerine, HTML standartlarına uygun `inputmode="decimal"` kullanılarak cihazın yerel klavyesi tetiklenir.
- Sahte (mock) verilere (ör. uydurma kullanıcı sayıları, sahte rozetler veya "FISCAL MEMORY NO" gibi anlamsız sistem mesajlarına) yer verilmez; yalnızca saf fonksiyonel metinler bulunur.
