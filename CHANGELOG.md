# Changelog

All notable changes to this project will be documented in this file.

## [0.111.1] - 2026-10-26
### Fixed
- The score sits right under the verdict, so the sticky Paylaş/İndir/Sonraki soru bar no longer covers it on phones; the 5-question report card follows it instead of hiding at the bottom of the receipt.
- Typing a valid number clears an old "Geçerli bir fiyat yaz" error.
- "(ipucu aldığın için %20 düştü)" is no longer shown on a zero score.
- The 2016 and 2020 year notes no longer pin a season (they appear for every month of the year).

## [0.111.0] - 2026-10-26
### Added
- Questions you have not answered yet come first: after a product is picked, an unanswered year of it is preferred (answered ids kept on the device under `ne-kadardi-seen`, last 2000). Once every year of a product is answered, they repeat as before.

## [0.110.2] - 2026-10-26
### Fixed
- Submitting the guess form before a question is shown no longer throws (`onGuess` returns early).

### Added
- Test: every product with prices must have four short, digit-free receipt lines in `PRODUCT_POOLS`, so a new product cannot ship without them.

## [0.110.1] - 2026-10-26
### Changed
- The generic cashier lines (60, by score), the far-off guess lines (over/under, for prices and for wages) and the hint lines were rewritten in the same everyday Turkish tone as the product lines (Antigravity Claude Opus, checked by Claude): score lines still never assume a direction and most avoid shop words so they also fit wage questions.

## [0.110.0] - 2026-10-26
### Changed
- Every product now has its own four receipt lines (76 products; 50 were missing). First drafts by Gemini 4 Argon, Claude Opus in Antigravity, Gemini Flash and Claude; then Murti asked for less "AI-sounding" lines and more everyday Turkish humour, so Claude Opus rewrote all 304 in a coffeehouse tone (dayı, komşu teyze, çay ocağı, bayram), with "abi/bilader/gardaş" in only about one line in ten. No prices, numbers or direction assumptions; respectful on fitre and kurban; checked by script (≤ 65 characters, four per product).

## [0.109.0] - 2026-10-26
### Added
- New product `kpss-onlisans`: KPSS önlisans exam fee from ÖSYM guides, every session 2010-2026 (35 · 35 · 40 · 55 · 60 · 80 · 130 · 350 · 800).
- New product `msu`: MSÜ military student selection exam fee from ÖSYM guides, 2019-2026 (96 · 100 · 110 · 130 · 130 · 295 · 450 · 700). 77 products.
- `yds`: 2013-02 50 TL (first YDS year) from the 2013 spring guide.
All guides were opened with WebFetch and read with pdftotext ("SINAV ÜCRETİ" line), `kind: official`.

## [0.108.2] - 2026-10-26
### Changed
- Purchasing-power line reads as what the money lets you do for exams and the car park: "13 kez YDS'ye girilebiliyordu, bugün 23 kez girilebiliyor" (YKS, ALES, KPSS, YDS, DGS) and "303 saat park edilebiliyordu" (İSPARK), instead of "13 YDS sınav ücreti ödenebiliyordu". Train tickets are bought ("alınabiliyordu"), not paid. Suggested by a Sonnet QA run of the live site, which otherwise found no problems.

## [0.108.1] - 2026-10-26
### Added
- Product-specific receipt lines for the four new products (İSPARK, YHT, DGS, YDS), four each, written by Gemini Flash and edited by Claude (no prices, no direction assumed).

## [0.108.0] - 2026-10-26
### Added
- New product `yht-bilet`: high-speed train (YHT) Ankara-İstanbul, one-way full economy fare. 9 values 2022-06 → 2026-08 (195 · 215 · 248 · 323 · 430 · 540 · 780 · 930 · 990), each on two news sites and checked on the page by script. Earlier years (line opened 2014) could not be sourced. Icon `img/hizli-tren.svg` (Gemini Flash).
- New product `dgs`: ÖSYM Dikey Geçiş Sınavı fee from ÖSYM's own guides (`kind: official`): 2019 120 · 2021 150 · 2023 270 · 2024 590 · 2025 950 · 2026 1.400. 75 products.

## [0.107.1] - 2026-10-26
### Fixed
- The guess field's "Fiyatı yaz" placeholder used the browser's grey, 3.6:1 on the dark theme's paper; it now uses the paper's muted ink (AA in both themes). Found by a Gemini Flash dark-theme audit and confirmed by a contrast scan of every text on the paper cards in headless Chrome (no other text below 4.5:1).

## [0.107.0] - 2026-10-26
### Added
- New product `yds`: ÖSYM YDS exam fee, first paper session of the year (e-YDS and late-application fee excluded). 12 values 2015-2026, each read from ÖSYM's own exam guide PDF (`kind: official`): 70 · 80 · 90 · 100 · 120 · 130 · 145 · 185 · 185 · 490 (2024-09, YDS/2 guide) · 750 · 1.200. 2013 and 2014 guides could not be fetched. 73 products.

## [0.106.0] - 2026-10-26
### Added
- New product `ispark-otopark`: İSPARK car park, first hour, central districts (Beşiktaş, Beyoğlu, Fatih, Kadıköy, Şişli, Üsküdar), open and multi-storey car parks, roadside and the 2025 Tarihi Yarımada/Rıhtım zone excluded. 7 values, each from two news sites (AA, NTV, CNN Türk, Capital, TRT Haber): 2022-12 17,50 · 2023-01 28 · 2023-08 33 · 2023-10 52 · 2024-06 70 · 2025-01 100 · 2026-01 140. Icon `img/otopark.svg` (drawn by Gemini Flash). 72 products.

### Fixed
- Cashier fallback lines no longer assume a direction (they are picked without knowing whether the guess was too high or too low, so "her şey ucuz sanıyorsun" could follow a guess that was far too high); "fiş" is now skipped for wage and pension questions; grammar fixes ("fotoğrafımız çekildi", "fedakârlık"); the exit-fee line that wrongly hinted the return trip costs extra was rewritten. Found by a Gemini Flash wording review.

## [0.105.0] - 2026-10-26
### Changed
- Faster first load: the intro, the report card and the archive's table, search and note-link modules load on demand with `import()` (only when the intro opens, a fifth answer shows the card, or the archive opens), so the first screen fetches five fewer modules. The report card module is kept once loaded so "Karneni paylaş" never awaits an import (iOS would drop the tap's user activation).
- `Intl.NumberFormat` instances are cached (`getNumberFormatter`/`formatNumber` in `js/format.js`) instead of being rebuilt on every frame of the counting price.
- Plainer wording: score help, "Sen kaç puan alırsın?", "Gerçek fiyat/tutar", "Her fiyatın kaynağı var", intro's "Ana menüye geç".

### Fixed
- Accessibility: Enter while the receipt prints finishes printing (like a tap) without skipping to the next question; archive "Kaynak" links and date buttons say which date they belong to; "no matching product" is announced; focus rings on the logo and install button; the footer link is at least 44 px wide.

### Removed
- Dead code: always-false `reduced` branches and `playIntro`'s `reduced` option, unused arguments, and the archive's always-hidden price bars (`barPercent`).

## [0.104.2] - 2026-10-26
### Fixed
- Dark mode: the question card's "Arkadaşına sor →" button was invisible (paper-coloured text on the paper card) since 0.100.0. It now uses the card's ink colour.
- Screen readers hear the date, product and unit when focus lands on the guess field of a new question.
- Tapping "Karneni paylaş" twice no longer lets the first timer restore the label early.

### Changed
- The service worker registers after the page's `load` event, so precaching does not compete with the first screen for bandwidth.

## [0.104.1] - 2026-10-26
### Changed
- Data notes: Fiat Egea Easy's series ends at the October 2025 list price because the 1.4 Fire sedan left the price list in January 2026 and Egea Sedan production ended on 30 June 2026; iPhone stays at iPhone 17 because September 2026 brought only Pro, Pro Max and Duo models, no base model. Two sources each, no price changed.

## [0.104.0] - 2026-10-26
### Changed
- Everyone sees the same animations (Murti's call): the phone's reduce-motion setting is ignored. It is a WCAG AAA item (2.3.3), not required at AA and not a legal duty for this site, and the game has no large or vestibular-heavy motion. Removed the gentle mode, `js/motion.js` and every `prefers-reduced-motion` / `data-motion` rule.

## [0.103.0] - 2026-10-26
### Changed
- Animations are always on (Murti's call). Like Apple, Google and Duolingo, the phone's reduce-motion switch no longer turns them off; it makes them gentle: the intro, the rolling year, counting prices, the chart and the confetti all play, while slides, slams, shakes, floating and spinning become fades or stop (`[data-motion="gentle"]` block at the end of `css/style.css`). The footer switch from 0.98.0 is gone.

## [0.102.0] - 2026-10-26
### Added
- Report card (Murti left the call to Claude): after every 5th answer of a visit the receipt shows "5 SORULUK KARNE": one line per question (date · product · score), the average and the best guess, with "Karneni paylaş →" (text with scores, no prices, so friends can still play). `js/report-card.js`.

## [0.101.0] - 2026-10-26
### Added
- Cinematic first-visit intro (Murti: "gerçek bir intro gibi, havalı, okutmayan"): a dark stage, a huge year rolling from 2010 to today, a receipt printing out of a slot where Big Mac, benzin and dolar show each year's real sourced price as the year turns (no blending: `priceInYear`), then a "SEN HATIRLIYOR MUSUN?" stamp slams down and "Hemen oyna →" appears. About 3 seconds; "Geç →", any tap or key jumps to the end; with animations off it opens on the final card. Values come from the data, so they never go stale. `js/intro.js` (`introRows`, `yearSteps`, `priceInYear`, `playIntro`), built with Gemini 4 Argon.

## [0.100.0] - 2026-10-26
### Added
- First-time players (no saved stats) start with the most talked-about prices, oldest year each: Halk Ekmek (Haziran 2019), benzin (Ocak 2016), Big Mac (Ocak 2010), iPhone 5s (Kasım 2013), dolar (Ocak 2010), Netflix (Eylül 2016); then the usual random mix. Skips count. `OPENER_IDS` / `openerFor` in `js/game.js` (Murti's idea).
- Question card: "Bilemedin mi? Arkadaşına sor →" shares the question without the answer, like the receipt link (Murti said yes).

## [0.99.0] - 2026-10-26
### Added
- `bitcoin` (Murti said yes): 1 BTC in TL = Bitstamp's public BTC/USD daily close × TCMB USD selling rate on the dollar entries' days (first business day of January and July) from 2013, 28 values (Ocak 2013 ₺23,29 → ₺4.025.771 on 23.10.2026). Built by a script, method in `docs/DATA.md`. New icon `img/bitcoin.svg` (a coin with a B, no logo).
- Ratios from 100 up are whole numbers ("172.854 katına çıktı").

## [0.98.0] - 2026-10-26
### Added
- Animation setting (Murti: his iPhone has "Reduce Motion" on and he saw no animation): the phone's setting is now only the default. A footer switch "Animasyonlar: açık / kapalı" overrides it and is remembered (`ne-kadardi-motion`). A tiny script in `<head>` sets `<html data-motion>` before first paint; CSS uses `:root[data-motion="reduce"]` instead of the media query and JS reads `reducedMotion()` (`js/motion.js`).

## [0.97.1] - 2026-10-26
### Changed
- New link preview (`social.jpg`, 1200x630): the title, "Tahmin et, gerçeğini ve bugününü fişte gör.", a "HER FİYAT KAYNAKLI" stamp and a receipt with three sourced past prices (Big Mac Ocak 2010 ₺5,65, 1 litre benzin Ocak 2016 ₺4,28, 1 dolar Ocak 2010 ₺1,49) asking "Ya bugün?". Only past values, so it does not go stale. Rendered from HTML with the site's fonts in headless Chrome.

## [0.97.0] - 2026-10-26
### Added
- `disney-plus`: Disney+ Turkey cheapest monthly plan: 2022-06 34,99 · 2022-12 64,99 · 2024-02 134,99 · 2024-10 164,90 · 2025-09 249,90, each on two news domains (the 164,99 some sites print is a typo: their yearly price is 1.649).
- `sigara-marlboro` 2025-03 85 is back: aydinlik.com.tr confirms the habergazetesi list.

## [0.96.1] - 2026-10-25
### Fixed
- Footer: "Hata görürsen bildir" stays on one line at 360 px instead of leaving "bildir" alone (QA).

## [0.96.0] - 2026-10-25
### Added
- First-visit intro (Murti's idea): one receipt-styled screen with the three steps and a trust line, "Fiyatlar uydurma değil. Her fiyat ya o fiyatı açıklayan kurumun kendi belgesinden ya da en az iki ayrı haberden doğrulandı." Buttons "Hemen oyna →" and "Ana sayfaya geç"; shown once (`ne-kadardi-intro-seen`), never on a shared `?soru=` link. It replaces the home screen's old three-step list.
- Footer: "Her fiyat, açıklayan kurumun belgesinden ya da en az iki ayrı haberden." with "Nasıl çalışıyoruz?" to reopen the intro. Built with Gemini 4 Argon.

## [0.95.4] - 2026-10-25
### Changed
- Every news-backed price now has a second news report on another domain: 33 notes gained their second link ("İkinci kaynak: ...").
- Removed 14 values that could not be confirmed twice or conflicted: Marlboro 2010-01, 2016-07, 2022-08, 2023-05, 2023-07, 2024-05, 2025-03; fitre 2010-08; kurban 2013; Boğaz köprüsü 2010-01; EA FC 2017-09 (269 vs 342), 2022-09 (console not named), 2025-09; fırın ekmeği 2023-01 (210 g, not 200 g).
- `tests/data.test.js` now fails a news price without a second source link; `docs/DATA.md` says so.

## [0.95.3] - 2026-10-25
### Fixed
- Chart: the dashed guess label tries both ends, above and below its line, and takes the spot that covers no price label and no stretch of the data line (`placeRefLabel`); widths follow the real font size (14px on the receipt, 11px in the archive). Found by the QA pass on `alkol-cezasi.2023-01`, `amazon-prime.2025-04` and others.
- Purchasing-power line: equal small counts ("5 kırmızı ışık cezası ..., bugün 5") switch to the share of the wage too ("%20'si kadardı; bugün %18'i").

## [0.95.2] - 2026-10-25
### Changed
- Plain-Turkish pass (Gemini Flash read the new texts as a 1971-born reader): big changes say "20,4 katına çıktı" instead of "20,4 kat arttı" (which strictly means one more), on the receipt, home card, archive and share image; the shared question reads "Sence Temmuz 2020'de Big Mac kaç liraydı?" (`inPeriod` in `js/format.js` picks 'de/'da/'te/'ta from how the year is read); a shared link says "Bir arkadaşın bu soruyu seninle paylaştı."; fines drop "1 ceza" ("ilk yakalanmada (otomobil, 0,50 promil üstü)", "ilk ihlalde (otomobil sürücüsü)"), Amazon Prime "1 aylık üyelik ücreti"; three amount lines reworded ("para da büyüdü", "fazla cömert").

## [0.95.1] - 2026-10-25
### Fixed
- Chart: the dashed "Tahminin ₺..." label moves under its line when the price line runs through the text above it (`refLabelBelow` in `js/price-chart.js`).

## [0.95.0] - 2026-10-25
### Added
- `alkol-cezasi`: drunk-driving fine, private car over 0.50 promil, first offence: 2018 1.002 · 2020 1.228 · 2022 1.823 · 2023 4.064 · 2024 6.440 · 2025 9.267 · 2026-02 25.000 (Law 7574). Every value on two news domains; 2019 and 2021 (1.339/1.340) left out. New icon `img/alkolmetre.svg`.
- `amazon-prime`: Amazon Prime Turkey monthly membership: 2020-09 7,90 · 2023-04 39 · 2025-04 49,90 · 2025-10 69,90, each on two news domains. New icon `img/kargo-kutusu.svg`.
- `trafik-cezasi` 2026-02 5.000: Law 7574 (Resmî Gazete 27.02.2026) fixed the first red-light fine; today's price was still the January 2.719.
- Purchasing-power line: when one wage buys fewer than 3 of an item (then or now), it compares as a share of the wage ("Alkollü araç cezası o tarihte asgari ücretin %53'ü kadardı; bugün %89'u.") instead of "1 ceza ... bugün 1 ceza".
- Chart: a question-price label that leans to one side drops the end label it would cover.

## [0.94.0] - 2026-10-25
### Added
- "Bu soruyu arkadaşına sor →" on the receipt shares the question without its answer: "Soru: Temmuz 2020 · Big Mac. Sence kaç liraydı? Tahmin et, gerçeğini gör:" plus a `?soru=<product>.<date>` link (phone share sheet, or copied on desktop). Opening the link starts that exact question with "Bir arkadaşın bu soruyu sana sordu."; the parameter is then dropped from the address. Pure helpers in `js/ask-link.js`. Built with Gemini 4 Argon.

## [0.93.1] - 2026-10-25
### Changed
- Today's dollar, euro and pound prices moved from 02.10.2026 to the TCMB rates of 23.10.2026 (49,6540 / 55,5997 / 66,5325).

## [0.93.0] - 2026-10-25
### Changed
- Amounts people get (minimum wage, pension, holiday bonus, grants, severance ceiling, hunger line) no longer talk like prices: the chart says "Yıllar içinde tutarı", the archive link "Yıllar içindeki tutarları →", far-off guesses get their own lines ("Keşke o kadar olsaydı, ama değildi.") and the cashier skips shop-talk lines (fiyat, kasa, etiket, pazar). `isAmount` in `js/game.js` decides.
- Togg T10X has its own SUV icon (`img/suv.svg`) instead of sharing the sedan.

## [0.92.10] - 2026-10-25
### Fixed
- The price chart's red label for the question's own price no longer sits on the line: in the middle of the chart it leans to the side where the line is lower (`labelSide` in `js/price-chart.js`).

## [0.92.9] - 2026-10-22
### Added
- `anadolu-otoyolu` 2019-02 25 (KGM table archived 14.02.2019). The 30 TL "2019" table is only archived from 2021, so its month is unknown and it stays out.

## [0.92.8] - 2026-10-22
### Added
- `ales` 2010-2018: 40 (2010, 2011), 50 (2013) from ÖSYM's own guides, 70 (2016) and 100 (2018) from two news domains each. 2012, 2014, 2015 and 2017 spring fees were not verified.

## [0.92.7] - 2026-10-22
### Changed
Plainer wording for today's new products after a Gemini Flash read (suggestions checked one by one):
- "24 ehliyet yazılı sınavı ücreti ödenebiliyordu" (a fee is paid, an exam is not); unit "Milli Eğitim" instead of "MEB".
- "tek yön İstanbul-Ankara otoyol geçişi" keeps the one-way detail in the sentence.
- MTV unit "1.3-1.6 litre motorlu … (2017 sonuna kadar trafiğe çıkmış)" instead of "tescilli"; wheat unit "devletin (TMO) alım fiyatı".

## [0.92.6] - 2026-10-22
### Added
- `aclik-siniri` 2015-01 1.256,80 and 2016-01 1.447,20 from Türk-İş's own January bulletins (read on the pages). 2014 page did not load.

## [0.92.5] - 2026-10-22
### Added
- `sinema-ortalama-bilet` 2010-2015 (9,23 → 11,27) from the same Box Office Türkiye yearly table (archived copy of 10.08.2020, whose 2016 row equals the existing 2016 value); each printed average was checked against the printed gross and admissions.

## [0.92.4] - 2026-10-22
### Added
- `trafik-cezasi` 2015-01 189 and `milli-piyango-ceyrek` 2011 9 (two news domains each, quotes checked on the pages). Red-light fine 2016, 2017 and 2019 stay out (one source or 206 / 206,5 / 207 conflict).

## [0.92.3] - 2026-10-22
### Added
- `emekli-bayram-ikramiyesi`: 2019-05, 2020-04 (1.000) and 2022-04 (1.100), years the amount stayed the same; two news domains each.
- `dogum-yardimi`: 2020-09 300 from the Ministry's own page (unchanged 2015-2025).

## [0.92.2] - 2026-10-22
### Changed
After a read-only QA of the four newest products (no blockers; sources matched):
- Wheat and hazelnut lines say the price is the state's purchase price, not a shop price: "130 kilo kabuklu fındık (devletin alım fiyatıyla)", "kilo buğday (devletin alım fiyatıyla)".

## [0.92.1] - 2026-10-22
### Added
- `anadolu-otoyolu` 2010-2018: 13,50 (2010-10, 2011-10), 15 (2012-05, 2014-09, 2015-07), 17,50 (2017-01), 20 (2017-02), 25 (2018-01), read from the class-1 Anadolu-Akıncı cell of KGM's archived tariff tables. Each date is the archived copy's month, i.e. the tariff in force then.

## [0.92.0] - 2026-10-22
### Added
- `anadolu-otoyolu`: İstanbul-Ankara motorway (Çamlıca-Akıncı) one-way car toll, 2021 37,50 → 2026 338, from KGM tariff PDFs (archived copies) and two news domains for August 2024. Older tariffs exist in KGM's tables but were not read in time; left for later.
- Left out: exhaust emission test fee (only 2026 verified).

## [0.91.0] - 2026-10-22
### Added
- `tmo-bugday`: bread wheat purchase price announced by TMO at harvest, per kg: 2017 0,94 → 2026 16,50 (7 years, two news domains each; 2022 left out because 6.050 was raised to 6.450 within the month). Icon `img/bugday.svg`.
- `findik-alim`: state purchase price for in-shell hazelnuts, per kg: 2018 14 → 2026 250 (6 years, two news domains each). Icon `img/findik.svg`.
- Left out: Müzekart and the seat-belt fine (too few verified values). Ideas came from Gemini Flash; research and checks by Sonnet and Claude.

## [0.90.5] - 2026-10-22
### Fixed
- Screen readers hear "Görsel hazır." when the image preview opens; the status used to stay on "Hazırlanıyor…" (found by a read-only regression check of 0.90.4, which found nothing else).

## [0.90.4] - 2026-10-22
### Removed
- Dead CSS for the old header links (`.header-link`, `.header-nav`): no page uses them since the v0.74 redesign. A scan found no other unused selectors and no unused JS exports.

## [0.90.3] - 2026-10-22
### Fixed
- Two quick taps on the day/night button no longer cut the second fade short.
- Choosing an archive category keeps the page where it is (focus without scrolling), like the other chips.

## [0.90.2] - 2026-10-22
### Fixed
From a read-only Gemini Flash review of `js/main.js`, each finding checked against the code (most were not real):
- Leaving the result during the 0.3 s tear left a stale timer id, so the next receipt could start already "handed over".
- A saved session without a valid total no longer turns the average into NaN.
- `getAnimations` guarded on browsers without it.
- A failure while preparing the share image can no longer leave the button stuck on "Hazırlanıyor…".
- The count-up writes the final price in one place (`stopCountUp`) instead of three.

## [0.90.1] - 2026-10-22
### Added
- `milli-piyango-ceyrek`: 2010 8, 2012 10, 2013 12,5, 2015 12,5 (two news domains each; 2013 and 2015 are probably one agency text). 2011 left out (one source).
- `trafik-cezasi`: 2014 172 and 2018 235. 2015-2017 left out (weak or conflicting reports), 2019 not found.

## [0.90.0] - 2026-10-22
### Added
- `kidem-tavani`: severance pay ceiling per year of service, every half-year 2010-2026 (35 values, 2.427 → 73.730 TL), from the Ministry of Labour's official table. The receipt calls it "Gerçek Tutar".
- Left out: Ankara EGO bus fare (no source for 2011-2018).

## [0.89.3] - 2026-10-22
### Changed
- Code tidy, no visible change: the 170-line archive render is split into small functions; the price table HTML moved to `js/archive-table.js` (pure, tested); `escapeHTML` lives once in `js/format.js` instead of two copies.

## [0.89.2] - 2026-10-22
### Changed
- Names no longer repeat the city shown next to the unit: "Taksi açılış ücreti", "Toplu taşıma bileti", "Simit (sokak ve fırın)", "Fırın ekmeği" (was "İstanbul taksi açılış ücreti" … · İstanbul).
- The home "Biliyor muydun?" card shows the city with the unit, as the question card does.

## [0.89.1] - 2026-10-22
### Changed
After a read-only data QA (no blockers):
- `ehliyet-esinav` dates are years (the MEB guides say "2016 yılında", not a month), except 2025-02; the 2026 note says the guide gives no start month. Unit "1 sınav hakkı (MEB, KDV dahil)".
- `mtv` unit says "2017 sonuna kadar tescilli"; the 2018 note explains that its source shows the row of the lowest value bracket, which equals the pre-2018 table that year.
- `okul-servisi` 2025 note says the value comes from news (no İBB document found).

## [0.89.0] - 2026-10-22
### Added
- `ehliyet-esinav`: driving licence written e-exam fee (MEB, per sitting, VAT included), 2016 60 → 2026 1.250, from MEB's yearly e-sınav guides. 2022 left out (no guide found; news conflicts).
- Left out: İSPARK first-hour parking (no source before 2023).

## [0.88.1] - 2026-10-22
### Changed
- Derived prices are labelled "hesaplandı": "başka fiyatlardan hesaplandı" broke the archive rows onto two lines; the "Ayrıntı" note under each row explains the calculation.

## [0.88.0] - 2026-10-22
### Added
- `mtv`: yearly motor vehicle tax for an ordinary car (1301-1600 cm³, 7-11 years old, registered by 2017), 2010 283 → 2026 4.354, from each year's MTV genel tebliğ, two copies of the Resmî Gazete text per year.
- Left out: state hospital visit fee (only four solid points; from July 2026 it splits into two tiers).

## [0.87.5] - 2026-10-22
### Fixed
- Share image year labels use the same measured spacing as the receipt chart, so the first two years no longer crowd each other.

## [0.87.4] - 2026-10-22
### Changed
Plainer words after a read-only "parent born in 1971" review:
- Session line "1 soru · ortalama puan 0 · en yüksek 92" (was "ort." and "en iyi").
- Home "60 ürün · 817 gerçek fiyat" (was "kaynaklı fiyat"); footer "Her fiyatın kaynağı yazılı."
- Install button "Telefonun ana ekranına ekle"; skip button "Bu soruyu geç (puanın düşmez)".
- Source labels "haberlerden" and "başka fiyatlardan hesaplandı" (were "haber kaynaklı", "hesaplanmış değer").
- A near miss says "Biraz fazla / az tahmin ettin" instead of "1,2 kat az tahmin ettin".
- Score help drops the "2 katı / yarısı" puzzle sentence; two cashier lines without "türbülans" and "dalgalanma".
### Fixed
- Chart year labels no longer overlap ("20182020"): spacing now uses the measured label width and the first and last labels' anchors.

## [0.87.3] - 2026-10-22
### Changed
- Model-named questions lead with the model: "AirPods 5 (kablosuz kulaklık, temel model)", "iPhone 11", "PlayStation 5 Pro (oyun konsolu)", "FIFA 18 (PlayStation futbol oyunu, standart sürüm)" instead of "AirPods kablosuz kulaklık (temel model): AirPods 5". Same in the receipt and the share text.

## [0.87.2] - 2026-10-22
### Changed
- A question about today's price no longer reads "O tarihte … alınabiliyordu": it says "Bugün 1 asgari ücretle 2 tane AirPods 5 alınabiliyor." and uses today's wage, not the wage of the month the price started.

## [0.87.1] - 2026-10-22
### Changed
- `airpods`: AirPods 5, 2026-09, 9.999 TL (Apple Türkiye, two news domains).
- `playstation` unit now says "yeni çıkan model": the series already moves PS4 → PS5 → PS5 Pro, and the Pro has no disc drive, so "standart, diskli" was wrong.
- Checked and unchanged: base iPhone (no base iPhone 18 yet), Boğaz bridge toll (July 2026 tariff left it at 59), PlayStation (no new console), doğum yardımı (still 5.000). Fiat Egea 1.4 Easy is no longer sold, so its last price stays.

## [0.87.0] - 2026-10-22
### Added
- `okul-servisi`: İstanbul school bus monthly ceiling fee (UKOME, 0-1 km, VAT included), value at school start, 2015-09 160 → 2026-09 4.456; İBB tariff PDFs for 2018, 2024 and 2026, two news domains for the other years. 2023 left out (reports split 1.200 / 1.300).
- Left out: İstanbul Ramazan pidesi (the Halk Ekmek weight changes almost every year).

## [0.86.1] - 2026-10-22
### Changed
- Source notes after a read-only QA: the current water price cites only İSKİ's tariff page (the 2026 PDF stops earlier); the 2023 Togg note says news reports do not state the turnkey basis.

## [0.86.0] - 2026-10-22
### Added
- `iski-su`: İstanbul household tap water, 1 m³ (1 ton), lowest tier, water + wastewater, VAT excluded (İSKİ publishes only that), January tariff 2012-2026 from İSKİ's own PDFs (3,16 → 52,88) and the October 2026 tariff 65,52. Icon `img/su.svg`.
- `togg-t10x`: Togg T10X cheapest version list price, 2023-03 953.000 → 2026-06 1.909.048; Togg's own price list for 2024 on, two news domains each for 2023.

## [0.85.0] - 2026-10-22
### Added
- `youtube-premium`: YouTube Premium individual monthly plan in Türkiye, 5 points, two news domains each: 2019-07 16,99 · 2022-11 29,99 · 2023-11 57,99 · 2024-11 79,99 · 2026-06 119,99. Icon `img/video.svg`.
- Left out: Türk-İş poverty line (same release as the hunger line already in the game; a second near-identical item would confuse).

## [0.84.0] - 2026-10-22
### Added
- `avrasya-tuneli`: Avrasya Tunnel, one car crossing (daytime tariff, VAT included), 12 points from ATAŞ's own tariff notices: 2016-12 15 · 2017-01 16,60 · 2018-07 23,30 · 2020-02 36,40 · 2021-02 46 · 2022-01 53 · 2024-01 80 · 2024-05 112 · 2024-08 156 · 2025-01 225 · 2026-01 280 · 2026-07 330. Tunnel icon `img/tunel.svg`.
- Left out: YHT Ankara-İstanbul ticket (press only, class and station not stated).

## [0.83.3] - 2026-10-22
### Changed
- Footer says "Sürüm 0.83.3" instead of a bare "v0.83.3".

## [0.83.2] - 2026-10-22
### Changed
- Cashier lines no longer call the player "abi": mothers and grandmothers play too.

## [0.83.1] - 2026-10-22
### Changed
Wording from an independent plain-language review (Gemini Flash, read-only, judged against "a parent born in 1971"):
- Hint button "İpucu al (puanın %20 düşer)": "Fiyatı okut" could read as "scan a barcode".
- Score help no longer says "2 kat ucuz" (not a real amount): "Gerçek fiyatın 2 katını söylemekle yarısını söylemek aynı puanı getirir."
- Cashier and product lines without slang or harsh words (böbrek, bön bön, travma, fullemek, ret yemek, paralel evren, kol). The 2015 year note about an internet meme is gone.
- Clearer names: "AirPods kablosuz kulaklık", "FIFA / EA FC futbol oyunu", Fiat Egea "en sade donanım"; bridge "ücretli yönde"; paper fees count as "aile cüzdanı ücreti", "ehliyet kartı ücreti" and so on.
- Theme button speaks of "gündüz / gece görünümü" instead of "tema".

## [0.83.0] - 2026-10-22
### Added
- `mektup-pulu`: PTT domestic letter up to 20 g, basic fee incl. KDV, 7 values: 2019-10 2,40 · 2022-01 5 · 2024-02 20 · 2024-06 29 · 2025-03 35 · 2026-02 45 · 2026-10 50 TL (also today's price). 2022 and 2024 from BTK board decisions (PDF text checked), 2024-06 from the decision text on Lexpera, 2025-2026 from PTT's own tariff PDFs (first row "20 grama kadar"; the effective date is only in the file name, noted per entry), 2019 from two news sites. 2018 (one news site), 2020, 2021 and 2023 left out. Original envelope icon, "Gıda ve gündelik" category.
- Tried and not added: İstanbul household gas per m³ (no open archive of İGDAŞ tariffs; sources mix tax-inclusive and tax-exclusive prices).

## [0.82.0] - 2026-10-22
### Changed
- Larger reading text for older eyes: the source line (14 px), source label, archive ratio and legend, how-to steps, hint note, chart caption and footer (13 px), chart labels 10 → 11 px. Decorative uppercase labels keep their size. Checked at 390 px: no overflow.

## [0.81.2] - 2026-10-22
### Changed
- The receipt (and the share image) says "Gerçek Tutar" instead of "Gerçek Fiyat" for amounts people receive or earn: minimum wage, pension, holiday bonus, KYK bursu, birth benefit and the hunger line (`actualLabel` in `js/game.js`).

## [0.81.1] - 2026-10-22
### Changed
- Price archive: one line above the list explains the red ratio on every row ("Kırmızı yazı: o tarihten bugüne ne kadar arttı"); "Eskiden yeniye" stays on one line.

## [0.81.0] - 2026-10-22
### Changed
- Product names and units in everyday words, same definitions (Murti's rule: readable for his parents). Examples: "1 USD (TCMB döviz satış kuru)" → "1 dolar (Merkez Bankası satış kuru)"; "Sürücü belgesi değerli kâğıt bedeli" → "Ehliyet kartı ücreti"; "maktu başvurma harcı" → "sabit harç"; "dosya bazında" and "periyodik" are gone; launch prices read "Türkiye'de ilk satış fiyatı"; taxi: "Taksiye binince taksimetrenin ilk yazdığı ücret"; hunger line: "4 kişilik bir ailenin bir aylık mutfak masrafı". 61 strings in `data/prices.json`, no price or source changed.
- Source label "türetilmiş değer" → "hesaplanmış değer".
### Fixed
- When the question is the newest value itself (e.g. Osmangazi July 2026), the purchasing-power line no longer compares it with itself ("23 … bugün 23").

## [0.80.0] - 2026-10-22
### Added
- `ales`: ALES exam fee (first session of the year, ALES/1), 6 values: 2019-03 120 · 2021-03 145 · 2022-02 185 · 2024-03 490 · 2025-02 750 · 2026-03 1.200 TL. Each value on two news domains quoting the ÖSYM guide, checked with `verify.py`. 2020 (only one web source besides a PDF) and 2023 (ALES/1 and ALES/2 fees conflict) are left out.
- `osmangazi-koprusu`: Osmangazi Bridge, one car crossing, 7 tariff points: 2016-07 88,75 · 2017-01 65,65 (the toll was cut) · 2021-01 147,50 · 2022-01 184,50 · 2025-01 795 · 2026-01 995 · 2026-07 1.170 TL, each on two news domains. 2018-2020 and 2023-2024 had no second source and are left out.
- Both in their categories (Harç, ceza ve bedeller / Ulaşım ve yakıt), with plain count names and "ödenebiliyordu".

## [0.79.2] - 2026-10-22
### Fixed
Findings of a read-only QA pass over v0.77-v0.78, mostly wording for first-time readers:
- Pensions, grants and the hunger line name themselves and use proper Turkish suffixes: "Bayram ikramiyesi o tarihte asgari ücretin %62'si kadardı; bugün %14'ü." (`percentOf` in `js/game.js`, tested for every ending).
- Count lines end with a verb ("bugün 4 gram altın alınabiliyor"); "bugün 1 asgari ücret yetmiyor" now says what: "bugün 1 asgari ücretle bir tane bile ödenemiyor".
- Ehliyet kartı, araç ruhsatı, kimlik kartı and aile cüzdanı fees are "ödenebiliyordu", not bought; IMEI reads "yurt dışı telefon kaydı"; "bir bedelli askerlik bedeli".
- New stamp "ÇOK UZAK" under 20 points, so a guess a thousand times off no longer reads "BİRAZ UZAK".
- Clearer score explainer and hint note ("ipucu aldığın için %20 düştü").
- A guess of 10 billion or more is refused with "Bu sayı çok büyük" (it used to run off the receipt); the spoken readout says "çok büyük bir sayı" instead of "100000000000 milyar".
- "Soru N" no longer counts skipped questions, so it matches "N soru" under the receipt.
- Leaving the result during the till animation no longer leaves clipping on the question screen or a receipt that never floats; the receipt drops its focus frame.
- A print sound stopped while still loading stays silent; sounds are not downloaded when the browser has no Web Audio.

## [0.79.1] - 2026-10-22
### Added
- EA SPORTS FC 27 (25 Eylül 2026), PlayStation standard edition 3.999 TL, now also the product's current price. Three news sites gave the same PlayStation Store / Microsoft Store pre-order price in July 2026 (İtopya, Teknoblog, LOG); the Store page itself shows no readable price.
### Changed
- Emekli bayram ikramiyesi: current price moved to Kurban Bayramı 2026 (2026-05), still 4.000 TL (Sözcü, Medyascope; Ramazan 2026 was 4.000 too), so the "Güncel" row no longer looks a year old.
- `data/prices.json` rewritten by the script: whole numbers lost a trailing ".0" (846.0 → 846); values unchanged.

## [0.79.0] - 2026-10-22
### Added
- `sterlin`: İngiliz sterlini, TCMB döviz satış kuru on the same 34 dates as euro (first business day of January and July, 2010-2026) plus the current 02.10.2026 value: 2010-01-04 2,4063 … 2026-07-01 61,9245; today 64,9163. Each value comes from that day's TCMB XML file (`kurlar/YYYYMM/DDMMYYYY.xml`, GBP `ForexSelling`); the script first re-read every stored euro value from the same files and all 35 matched. Original icon `img/sterlin.svg`, "Para ve altın" category, no hint (like the other currencies).
### Changed
- `docs/DATA.md`: TCMB section covers dolar, euro and sterlin; the purchasing-power note now says "wage in force on the question's date" (v0.77.0 behaviour).

## [0.78.0] - 2026-10-22
### Changed
- One flow from guess to receipt (Murti: "siteye gir, fiş var, fiyat yaz, sıfırdan yeni fiş çıkıyor: kopuk"). After "Tahmin et" the question card no longer disappears: it folds its form away and becomes the till, and the receipt prints out of the slot right under it. When the receipt is torn off, the till slides up out of view, the receipt rises into its place with its torn top edge and a deeper shadow, and then floats gently on the page (`turnIntoMachine` / `handOver` in `js/main.js`). Reduced motion skips straight to the finished receipt, as before.

## [0.77.1] - 2026-10-22
### Fixed
- Sounds no longer come out late after the tab sat in the background or on the first tap (Murti's report). The sound files are downloaded once the page has loaded (`prefetch`), so the first tap only decodes them; every tap and returning to the tab wakes a sleeping audio context and the output with a silent sample (`wake`); a sound whose context is still waking is played only if it can start within 400 ms, otherwise skipped instead of arriving out of sync.

## [0.77.0] - 2026-10-22
### Changed
- Plain words everywhere, so someone who never played reads the receipt at a glance (Murti's rule: his parents, born 1971, must understand it).
- The purchasing-power line names what is counted: "1 asgari ücretle 102 Big Mac", "304 litre benzin", "3 ehliyet harcı ödenebiliyordu" (fees are paid, not bought). Every product has a name in `COUNT_UNITS` (`js/game.js`); a test fails when a new product has none. Big counts get thousands dots ("8.083 poşet").
- Pensions, grants and the hunger line no longer say "1 asgari ücretle 2 emekli aylığı": they read "Asgari ücretin yüzde kaçı: o tarihte %49, bugün %84" (`WAGE_SHARE`), with matching bars.
- The line now uses the minimum wage in force on the question's date (the latest raise of that year), not only a wage from the same half-year, so years without a July raise (2016-2021, 2024-2026) get the line too.
- Launch-price products name the model on both sides: "1 tane AirPods 2 … bugün 4 tane AirPods 4", "6 tane FIFA 23 … bugün 9 tane EA FC 26". EA FC entries got game-name labels (FIFA 18 … EA FC 26) taken from their own notes.
- Chart caption "Yıllar içinde fiyatı" instead of "Fiyatın yolculuğu · logaritmik ölçek" (receipt and share image).
- Score stamp in plain words: TAM İSABET, ÇOK YAKIN, FENA DEĞİL, BİRAZ UZAK (the old joke titles repeated and confused).
- "Puan nasıl hesaplanır?" moved to the bottom of the receipt, with simpler wording.
- 30 more cashier lines (12 per score tier), so the same comment comes back less often.

## [0.76.2] - 2026-10-22
### Fixed
- The purchasing-power line counts monthly and holiday items by name instead of "adet": "1 asgari ücretle 9 aylık yurt ücreti", "76 aylık Netflix aboneliği", "bayram ikramiyesi" (Murti's wording). Names live in `getCountUnit` in `js/game.js`.

## [0.76.1] - 2026-10-22
### Fixed
- The receipt and share image row is labelled "Değişim" instead of "Artış", since some prices fell (e.g. "Değişim: %21 düştü").

## [0.76.0] - 2026-10-22
### Added
- July values 2010-2026 for dolar and euro (first TCMB business day of July), gram altın, çeyrek altın and gram gümüş (July monthly derivation): 85 more questions. The script reproduced 15 existing January values first.
- `firin-ekmegi`: İstanbul bakery bread, 200 g, İTO maximum tariff, 2023-2026 (6 values; Halk Ekmek stays a separate product).

## [0.75.0] - 2026-10-22
### Added
- Five new products (51 total):
  - `otogaz`: autogas (LPG) 1 litre, İstanbul Avrupa Yakası, from EPDK's LPG dealer price bulletin. Every January 2016-2026 plus 21.10.2026 (official, 12 values).
  - `gram-gumus`: gram silver market value, derived like gram gold (World Bank Pink Sheet silver × monthly TCMB USD average), same months as gram gold plus 2026-09 (18 values). The script reproduced all existing gram gold values before building the series.
  - `ea-fc-oyun`: launch price of the yearly FIFA / EA SPORTS FC game, PlayStation standard edition, 2017-2025 (PS4 until FIFA 21, PS5 from FIFA 22; 8 values, five single-source and flagged in the note).
  - `kyk-yurt-ucreti`: lowest monthly state dorm (KYK/GSB) fee per academic year, 2018-2026 (7 values).
  - `emekli-bayram-ikramiyesi`: retiree holiday bonus, every legal step 2018-2025 (5 values, all two-source).
- July values (first bulletin of July, 2016-2026) for benzin, motorin and otogaz from the same EPDK bulletins: 33 more questions.
- Icons for otogaz, gram silver, the football game and the dorm. `docs/DATA.md` documents the silver derivation and the EPDK LPG bulletin.

## [0.74.0] - 2026-10-22
### Changed
- Design refresh "A" (Murti's pick from three Google Stitch directions): calmer spacing and clearer hierarchy on the home menu, question card and result receipt. Stitch output was used as reference only; all rules live in `css/style.css` with the existing tokens.
- Home: bigger "Başla →" button, framed fact-card icon, mono dates, full-width install button.
- Question: bolder round label, mono unit line, dashed rule above the guess, no empty gap above "Tahmin et" when the hint and error lines are empty.
- Result: centred header with framed icon, thin-border verdict, big score number with "/100", framed chart with its caption on top and 12 px labels, Paylaş/İndir side by side with a full-width "Sonraki soru".
### Fixed
- Tap targets: fact-card "fiyat geçmişi", source and archive links are 44 px tall; chart labels are no longer 10 px.

## [0.73.0] - 2026-10-21
### Added
- Minimum-wage purchasing power on the result receipt gets "O gün" / "Bugün" bars (`buildContextModel` in `js/game.js`); red when it fell, green when it rose. The sentence stays for screen readers and the share image.
- Archive chart and table are linked: tapping a chart point highlights and scrolls to its row; the row's period is a button that shows the point on the chart.
- The menu card says "Devam et · Soru N →" (or "Sonuca dön") once a round is in progress, since going back to the menu does not reset the game.
### Changed
- "Bu soruyu geç · puanı etkilemez" makes clear skipping is free.
- Scrolled chip rows in the archive fade at both edges; the guess text is centred on the whole field, not just the input.

## [0.72.0] - 2026-10-21
### Added
- Chart points can be tapped, hovered or stepped through with the arrow keys (the chart is focusable) to read each period's price; keyboard changes are announced.
- "İndir" opens a preview of the share image first, with "İndir", "Paylaş" (where files can be shared) and "Kapat"; focus returns to the button.
- An "Çevrimdışı" badge in the header while offline; the product icon pops onto each new question card (not with reduced motion).
- A tiny gold price line on the home "Fiyat Arşivi" card.
### Changed
- Visual consistency pass: matching dashed borders and spacing on the home cards, 8px radius on the install button, archive title size, chart and order-toggle spacing.
### Fixed
- Enter on the focused chart no longer skips to the next question; clicks on the preview dialog's padding no longer close it; navigating away closes the preview; browsers without `<dialog>` download directly.

## [0.71.0] - 2026-10-21
### Added
- First-time players see three numbered "how to play" steps on the home screen (hidden after the first answer).
- The question card names the product's category next to the round number ("SORU 3 · PARA VE ALTIN").
- The real price rolls up from zero like a till display while the receipt prints (`js/count-up.js`); skipped with reduced motion, hidden from screen readers while rolling.
- "Puan nasıl hesaplanır?" disclosure under the score; the recent-score tally gets a "SON N" label.
### Changed
- A guess far outside the price range pins the chart's "Tahminin" line to the edge with ↑/↓ instead of flattening the price line.
- Light-mode secondary text on the receipt is a little darker (#66635b) so it keeps 4.5:1 on the tinted current-price row (found with an axe-core and manual contrast pass; axe reported no violations on any screen in either theme).

## [0.70.0] - 2026-10-21
### Added
- Price history chart (log scale, `js/price-chart.js`) on the result receipt, with the question's date marked, and at the top of each archive receipt.
- Home: "Biliyor muydun?" card with a random sourced then-vs-now pair (`js/fact.js`, "Başka ↻" for another), a "45 ürün · 532 kaynaklı fiyat" line and a "Başla →" cue on the main card.
- Archive: product search that ignores Turkish accents (`js/search.js`), single-row scrolling category and product chips with a count, product icon and a "2010 → 2026: 20 kat" line on the receipt, and "← Sonuca dön" when opened from a result.
- Guess field: live reading of big numbers ("1 milyon 250 bin ₺") and a shake on an invalid guess.
- Result receipt: the score title is stamped on the receipt after it is torn off; the score meter fills at that moment too.
- Share image: the price history chart with the question's date marked; long unit lines shrink to fit.
- Result screen: the last 8 scores as a coloured tally next to the session line ("3 soru · ort. 42 · en iyi 80").
- First load: a pulsing receipt placeholder instead of a bare "Yükleniyor…".
- Receipt logo mark in the header; "Ana ekrana ekle" install button where the browser offers installation.
- Screens fade in; Enter on the result screen goes to the next question.
- Charts on the result receipt and the share image mark the player's guess with a dashed "Tahminin" line.
- Home fact card: "Bunu tahmin et →" starts a round with that product; the footer hides its "Ana menü" link on the menu.
- Archive: a clear (×) button and Escape for the search, "Tüm kategorilerde ara (N ürün)" when the chosen category has no match, and an oldest/newest-first order toggle that is remembered.
### Fixed
- The "Fiyatı okut" hint button stayed visible after use and on products without a hint: a class `display` rule beat the `hidden` attribute. `[hidden]` now always hides.
- Big-number readout no longer shows "1 bin,5 ₺" for 1000,5.
### Changed
- Header sound and theme toggles use SVG icons instead of emoji.
- Archive rows are compact receipt line items (period and price, then change, source and details), about half the height; the current price row is tinted.
- Price changes below 2x read as a percentage ("%4 arttı") instead of "1 kat arttı".
- Consistent keyboard focus rings, visible open/close markers on "Verginin dökümü" and "Ayrıntı", bigger real price, archive rows without the per-row bars when the chart is shown, footer link spacing.

## [0.69.0] - 2026-10-21
### Added
- "Asliye mahkemesinde dava başvurma harcı" (1 dava açılışı, maktu): 13 values, each read in the attached tariff of the official Harçlar Kanunu Genel Tebliği ((1) sayılı tarife, I-2 "Asliye mahkemelerinde, idare mahkemelerinde" row), source kind `official` (opened 2026-10-21).
  - 2010-01 17,15 TL: RG 31.12.2009 no 27449, Seri No 60.
  - 2012-01 21,15 TL: RG 31.12.2011 no 28159, Seri No 65.
  - 2015-01 27,70 TL: RG 30.12.2014 no 29221, Seri No 73.
  - 2017-01 31,40 TL: RG 27.12.2016 no 29931, Seri No 78.
  - 2018-01 35,90 TL: RG 29.12.2017 no 30285 (Mükerrer), Seri No 80.
  - 2019-01 44,40 TL: RG 31.12.2018 no 30642 (3. Mükerrer), Seri No 82.
  - 2020-01 54,40 TL: RG 27.12.2019 no 30991 (2. Mükerrer), Seri No 84.
  - 2021-01 59,30 TL: RG 29.12.2020 no 31349 (Mükerrer), Seri No 86.
  - 2022-01 80,70 TL: RG 21.12.2021 no 31696, Seri No 89.
  - 2023-01 179,90 TL: RG 30.12.2022 no 32059 (2. Mükerrer), Seri No 91.
  - 2024-01 427,60 TL: RG 30.12.2023 no 32415 (2. Mükerrer), Seri No 94.
  - 2025-01 615,40 TL: RG 30.12.2024 no 32768 (2. Mükerrer), Seri No 96.
  - current 2026-01 732,00 TL: RG 31.12.2025 no 33124 (5. Mükerrer), Seri No 98.
  - Not included: 2011, 2013, 2014, 2016 (tebliğ not opened) and July 2023 (mid-year change not confirmed in an official document).
- Original icon `img/basvurma-harci.svg`, cashier lines, entry in the "Harç, ceza ve bedeller" category.

## [0.68.0] - 2026-10-21
### Added
- "Yurt dışı çıkış harcı" (1 exit with a Turkish passport): 7 values, each confirmed on two outlets from different domains (all news, opened 2026-10-21).
  - 2019-01 15 TL: posta.com.tr (2019-07-20, "15 liradan 50 liraya çıkarılacak") + sozcu.com.tr ("1 Nisan 2007 tarihinde harç bedeli 15 Türk lirası").
  - 2019-08 50 TL: muhasebenews.com (law 7186, in force 1 Aug 2019) + sozcu.com.tr ("1 Ağustos 2019 tarihinde harç bedeli 50 Türk lirasına yükseltildi") + posta.com.tr.
  - 2022-03 150 TL: bloomberght.com + istiklal.com.tr + medyascope.tv + diken.com.tr ("50 TL'den 150 TL'ye").
  - 2024-08 500 TL: bloomberght.com + halktv.com.tr + capital.com.tr (in force 12 Aug 2024).
  - 2025-01 710 TL: bloomberght.com + medyascope.tv + capital.com.tr.
  - 2025-09 1.000 TL: ekonomigazetesi.com + medyascope.tv + bloomberght.com (decision of 9 Sep 2025).
  - current 2026-01 1.250 TL: medyascope.tv + 24saatgazetesi.com + egitim.net.tr. Some articles say "710 TL'den 1.250 TL'ye" although the fee was 1.000 TL since September 2025; the note says so.
- Original icon `img/yurtdisi-cikis.svg`, cashier lines, entry in the "Harç, ceza ve bedeller" category.

## [0.67.0] - 2026-10-21
### Added
- Receipt printer: the result receipt slides out of a printer slot in about a second, then is torn off. A tap on the receipt finishes it at once; reduced motion skips the slide.
- Question counter ("Soru 3") on the question card, so new players see that the game is a series of questions.
- A visible question above the price field ("Sence kaç liraydı?").

### Changed
- Sounds are short CC0 recordings instead of synthesized beeps: old receipt printer, paper tear, checkout beep and a counter bell for an exact guess (BigSoundBank, Joseph Sardin). The good/bad score jingles are gone. Samples are decoded on the first tap or key press so the printer sound starts in sync.
- "Sonraki" is now "Sonraki soru →" in the accent colour, and it nudges once after the first three results.
- Light mode: the page background is darker (#e4ded1) and the receipt has a stronger shadow; before, the receipt almost disappeared on the page (1.1:1).

### Fixed (QA before merge)
- Leaving the result screen during the print (next question, skip, archive) cancels it, so the tear sound, bell and confetti no longer fire on the next screen.
- Returning to a result with the browser's back button puts focus on the receipt again.
- The audio context also resumes from the iOS "interrupted" state; turning sound back on preloads the samples.
- "Sonraki soru →" stays on one line at 360 px.
- From a second review (Gemini): the icon bounce/shake waits until the receipt is out; an early tap or leaving the screen cuts the printer sound; reduced motion plays only the tear; links on the moving receipt cannot be hit by the tap that finishes it; audio unlocks on touchend/click (iOS) instead of pointerdown; the nudge is for players with three or fewer answered questions.

### Removed
- The +10 / +100 / +1.000 buttons: players thought they were the only way to enter a price.
- Yellowed paper for old years (it only changed the colour), the "FİŞ NO" line with its tagline (also on the share image) and the "POS HATASI" / "PARA ÜSTÜ" lines.

## [0.66.1] - 2026-10-16
### Added
- Fiat Egea: 2018-02 value (68.900, 2018 model year), confirmed by a news page and the arabalar.com.tr monthly table. The series now has 10 values.

## [0.66.0] - 2026-10-16
### Added
- "Simit (İstanbul sokak/fırın simidi)": 6 values (2018-09, 2020-01, 2021-02, 2021-11, 2023-08, 2026-09), each from a zam article plus a second outlet that was re-read for the price. The 2015 tavsiye price and the unofficial 2025 hike are left out.
- "Sinema bileti ortalama fiyatı (Türkiye geneli)": 10 yearly values (2016-2025) from the Box Office Türkiye yearly table (gişe hasılatı ÷ seyirci). It is the national average of all tickets, not the full ticket price.
- "Sıfır Fiat Egea Sedan 1.4 Fire Easy": 9 list-price values (2017-02, 2019-06, 2020-03, 2020-09, 2020-11, 2021-01, 2021-04, 2024-01, 2025-10); campaign prices are not used, and points with conflicting or same-outlet sources (2015-11, 2022, 2023) are left out. Each price was found on two pages.

## [0.65.1] - 2026-10-16
### Fixed
- Contrast: the darker small-text colours now apply from a slight paper tint on (age 0.1), not only from 0.4.
- The sound button keeps a fixed accessible name ("Ses") and shows its state with `aria-pressed`; the POS line is no longer a live region of its own (double announcements).
- Vibration respects the sound switch and the reduced-motion setting.
- Any guess marked exact (within 10%) now gets the cash-register sound, also after a hint penalty.
- Skipping a question plays only the barcode beep, not two sounds at once.

## [0.65.0] - 2026-10-16
### Added
- "Bu soruyu geç" link under the guess button: skips a product you do not know. A skip is free: no score, no round counted.

## [0.64.0] - 2026-10-16
### Changed
- The hint button reads "Fiyatı okut: ipucu al" (cashier scans the price for you).
- A barcode beep plays when a new question appears (not on the first load, which has no tap yet).
- After three or more rounds the stamp on the shared image rates your session average instead of the single guess.

## [0.63.0] - 2026-10-16
### Added
- New product "Asgari noter ücreti (bir noterlik işleminin alt sınırı)": 10 values from the yearly Noterlik Ücret Tarifesi, Madde 1 (2013, 2015, 2018, 2019, 2021-2026). Official Resmî Gazete texts (HİGM copy from 2023); every amount was re-read in the tariff text. The tariff year is the date. 2014, 2016, 2017 and 2020 tariffs were not located.

## [0.62.0] - 2026-10-16
### Added
- Three products from the yearly Muhasebat Genel Müdürlüğü Değerli Kâğıtlar Genel Tebliği (Resmî Gazete text, read on web mirrors; 2024 is the applied price): "Sürücü belgesi değerli kâğıt bedeli" (10 values, 2016-2026), "Motorlu araç tescil belgesi (ruhsat) değerli kâğıt bedeli" (10 values) and "T.C. kimlik kartı (değiştirme) değerli kâğıt bedeli" (9 values, 2017-2026; the 2016 row was the old nüfus cüzdanı, a different item). 2021 is missing for all (its table is an image). Category: Harç, ceza ve bedeller.

## [0.61.0] - 2026-10-16
### Added
- New product "Milli Piyango yılbaşı çeyrek bilet": 11 yearly values (2014, 2016-2025), each confirmed on pages from at least two different news outlets. Dated by the year the tickets go on sale; 2013 and 2015 are left out (one outlet only). Category: Teknoloji ve eğlence.
- Aile cüzdanı: 2016, 2024 and 2026 values (Değerli Kâğıtlar tebliğ text pages), now 10 values.
- The shared image carries the receipt number and tagline too.
- The tax breakdown makes the printer sound when opened.
### Changed
- Proofread cashier and banter lines (grammar, awkward phrases, near-duplicates).

## [0.60.0] - 2026-10-16
### Added
- Sound effects synthesized with the Web Audio API (`js/sound.js`, no audio files): printer on every result, a jingle for close and way-off guesses, a cash-register chime on an exact hit, ticks on the quick-add buttons. A speaker button next to the theme toggle mutes it (saved per device). Phones get a light vibration on guess.
- Context-aware cashier comments (`js/banter.js`): product easter eggs, lines for guesses far above or below the price, POS lines ("YETERSİZ BAKİYE" / "PARA ÜSTÜ"), a cashier remark when you ask for a hint, a receipt number and tagline at the bottom, an old-lira note for 2005-2008 and a time-capsule line for 2015, 2016, 2020 and 2023.
- Receipts of older questions yellow with age (`js/paper.js`); the result icon bounces after a close guess and shakes after a way-off one.
- The shared image gets a tilted red stamp with a title that depends on the score.

## [0.59.0] - 2026-10-16
### Added
- New product "Aile cüzdanı (evlenme cüzdanı) değerli kâğıt bedeli": 7 verified yearly values (2017-2020, 2022, 2023, 2025) from the Muhasebat Genel Müdürlüğü Değerli Kâğıtlar Genel Tebliği (Resmî Gazete text, read on alomaliye.com mirrors). 2021, 2024 and 2026 are left out: their sources could not be confirmed on the page. Category: Harç, ceza ve bedeller.

## [0.58.1] - 2026-10-16
### Changed
- Fiyat Arşivi: URLs inside the "Ayrıntı" notes are now tappable "Link · host" buttons that open in a new tab, instead of plain text to copy. `js/linkify.js` escapes the text and only links http(s) URLs.

## [0.58.0] - 2026-10-16
### Added
- Fiyat Arşivi: category filter (Para ve altın, Ulaşım ve yakıt, Gıda ve gündelik, Teknoloji ve eğlence, Maaş ve yardımlar, Harç, ceza ve bedeller). `js/categories.js` maps products to categories; a test fails when a product has none.

## [0.57.0] - 2026-10-16
### Changed
- The game is a single mode again. Menu: "Fiyat Tahmini" and "Fiyat Arşivi" (the old "Zaman makinesi", renamed). The result screen links to the product's price history.
### Removed
- Modes "Hangisi Pahalı?", "Sırala", "60 Saniye", "Hangi Yıl?", "Sepet Kurma", "Yıllık Fiş" and "İstatistiklerim", with their modules, tests, styles and share texts. They remain in git history up to v0.56.0.

## [0.56.0] - 2026-10-14
### Added
- data: 13 July observations of the Economist Big Mac Index for Türkiye (2010-2025: 5,95 … 225), the series grows from 11 to 24 values. Rule extended in `docs/DATA.md`: January and July observations that differ from the previous observation; 2014-07 is skipped because it equals the existing 2015-01 value.

## [0.55.0] - 2026-10-14
### Added
- data: 2026 net minimum wage as a question (it was only the "today" price), so 2026 questions get a purchasing-power line.
- data: KPSS Lisans GY-GK fee 2016 (55), 2018 (60), 2020 (80); IMEI registration fee 2025 (45.614,20). Each figure found verbatim on two publishers' pages.
- Not added: kurban 2014 (575) and KPSS 2015 (50) have one publisher only; the 2021 minimum pension rise (1.627) appears only in tables and conflicts with a January 2022 official statement.

## [0.54.0] - 2026-10-14
### Added
- data: Türk-İş açlık sınırı for January 2017, 2018, 2020, 2022 and 2023 (series now 10 values, 2017-2026). Four come from Türk-İş's own releases (`kind: dataset`) with a news outlet giving the same figure; 2023 uses the whole-lira figure from three news outlets because the kuruş value is only in an unreadable PDF.

## [0.53.0] - 2026-10-14
### Added
- ui: "Paylaş" after each answer in Hangisi Pahalı? and Hangi Yıl? (`js/streak-share.js`): shares the running streak, or the one a wrong answer just ended; hidden while there is nothing to share.
### Fixed
- a11y: the logo reached only 3.5:1 on the dark page (4.4:1 in light); new `--accent-on-bg` token brings both to 5:1.

## [0.52.0] - 2026-10-14
### Added
- ui: "İstatistiklerim" screen (`#istatistik`, `js/stats.js` + `js/stats-ui.js`): every mode's saved score on one receipt, with a two-step "Skorları sıfırla" (no browser dialog) that clears scores but keeps the theme.
- ui: keyboard shortcuts on desktop (`js/keys.js`): ← → or 1 2 in Hangisi Pahalı? and 60 Saniye, 1-4 in Sırala and Hangi Yıl?; ignored in form fields and with modifier keys. A hint line shows only on devices with a fine pointer.

## [0.51.1] - 2026-10-14
### Changed
- docs: AGENTS.md roadmap lists v0.44-v0.51 and the pre-2016 fuel attempt; page description mentions the new modes.

## [0.51.0] - 2026-10-14
### Changed
- ui: home menu regrouped for phones (layout from a Google Stitch variant, invented decoration left out): "Oyna" with Fiyat Tahmini as the main card and the quick games in two columns, "Keşfet" with Zaman Makinesi and Yıllık Fiş as slim rows.
### Fixed
- a11y: after in-app navigation focus moves to the new screen's heading instead of staying on a link inside the hidden screen.

## [0.50.1] - 2026-10-14
### Fixed
- ui: a second "Paylaş" tap within two seconds left the button stuck on "Kopyalandı!"; a failed clipboard write now says "Kopyalanamadı".
- ui: some checked "Sırala" sets overflowed by a few pixels at 360 px (long unit text in a grid item).
- game: "Hangi Yıl?" could offer a year that also had a price within 8% of the answer (products with several prices a year); every price of a distractor year is now checked.

## [0.50.0] - 2026-10-14
### Added
- game: "Hangi Yıl?" mode (`#hangi-yil`, `js/year-guess.js` + `js/year-guess-ui.js`): a product and its price, pick the year from four options. Distractor years differ in price by at least 8% so only one option is right (flat fees never qualify). Streak and best streak saved.
- ui: "Paylaş" for Sırala and 60 Saniye results (`js/mode-share.js`, `js/share-text.js`): share sheet on phones, clipboard elsewhere; Sırala shares one ✅/❌ per item.
### Changed
- perf: Google Fonts stylesheet no longer blocks the first paint (`media="print"` swap, `<noscript>` fallback).

## [0.49.0] - 2026-10-14
### Added
- game: "Sırala" mode (`#sirala`, `js/order.js` + `js/order-ui.js`): four prices from the same year, tap them cheapest first; score is the share of correctly ordered pairs. Adjacent prices are at least 1.15x apart so every set is answerable. Menu card shows sets played, average and perfect sets.
- game: "60 Saniye" mode (`#60-saniye`, `js/blitz.js` + `js/blitz-ui.js`): Hangisi Pahalı against the clock; each wrong answer costs 3 seconds; best score saved. The clock stops when the player leaves the screen.
- data: 2023 kurban vekâlet bedeli 5.950 TL (the Diyanet president's own statement quoted by three publishers; the conflicting 7.950 TL figure was not found in any of them).
### Fixed
- a11y: every control is at least 44x44 px on phones (142 controls were smaller at 390 px), the site title is the page's `<h1>`, and transient button feedback ("Kopyalandı!", "İndiriliyor…") is announced through a live region.

## [0.48.0] - 2026-10-14
### Added
- pwa: installable and playable offline (`manifest.webmanifest`, `sw.js`, app icons). Stale-while-revalidate cache named after the version; on localhost the worker is opt-in with `?sw`. Tests check the precache list and the version.
### Changed
- perf: preload `data/prices.json` and modulepreload the static modules; home menu appears about 40% sooner on slow 4G.
### Fixed
- a11y: contrast of red stats/verdicts on dark receipt paper, the invisible "Yeni sepet" button in dark mode, and grey text on the light page background.
- a11y: keyboard focus no longer falls to the page after answering, hints, basket confirm, Hangisi Pahalı and year picks; basket steppers name their product.

## [0.47.0] - 2026-10-14
### Added
- data: July minimum wage values for 2010-2015, 2022 and 2023 (ÇSGB second-half PDFs, each with an independent second publisher), so second-half questions get the right purchasing-power line.

## [0.46.0] - 2026-10-14
### Changed
- game: going over the budget in "Sepet Kurma" no longer scores 0; each 1% over costs 3 points (10% over → 70, a third over → 0). A simulation showed even good guessers busted in about half the rounds under the old rule. Rules text and verdict updated.

## [0.45.0] - 2026-10-14
### Added
- ui: "Yıllık fiş" can be shared or downloaded as a long receipt image (`js/year-share-image.js`): one line per product with that year's price and the rise to today, plus the biggest riser. The receipt paper drawing is shared with the result image.

## [0.44.0] - 2026-10-14
### Added
- ui: the Fiyat Tahmini card on the home menu shows the average and best score next to the number of questions played (best score saved with the session stats).

## [0.43.3] - 2026-10-14
### Changed
- docs: README lists all game modes and modules; AGENTS.md roadmap updated to the current state.

## [0.43.2] - 2026-10-14
### Changed
- ui: no hint button for gold, the Schengen fee and wage-linked amounts (scholarship, pension, hunger line, birth benefit), besides currencies and the minimum wage, because the hint would give the answer away.

## [0.43.1] - 2026-10-14
### Changed
- ui: short colour fade and a small spin on the theme toggle when switching light/dark (skipped with reduced motion).

## [0.43.0] - 2026-10-14
### Added
- ui: "Sepet Kurma" mode at `#sepet` (`js/basket.js`): a past year's budget, six hidden-price products, pick quantities to get as close to the budget as possible without going over. Best score kept in localStorage; card on the home menu.

## [0.42.0] - 2026-10-14
### Added
- ui: home menu with named modes (Fiyat Tahmini, Hangisi Pahalı?, Zaman Makinesi, Yıllık Fiş); the guessing game moved to `#tahmin`, the logo is now a link to the menu.
- ui: light/dark theme toggle in the header (saved in localStorage, defaults to the system theme).
- ui: hint is a small slip with aligned rows (dollar rate, minimum wage) instead of one long line.

## [0.41.1] - 2026-10-14
### Fixed
- ui: quick-add chips and the hint link were light-on-cream (invisible) in dark mode because they used the page text colour on the receipt paper; they now use the receipt ink colour.

## [0.41.0] - 2026-10-14
### Added
- ui: hint button on the guess screen (`js/hint.js`): the dollar rate and minimum wage of the question's year, costing 20% of the score. Not offered for dollar, euro or minimum wage questions.

## [0.40.0] - 2026-10-14
### Added
- ui: "Yıllık fiş" screen at `#yil` (`js/yearly.js`): all verified prices of one year with the rise to today, linked from the time machine.

## [0.39.0] - 2026-10-14
### Added
- ui: "Hangisi daha pahalıydı?" streak mode at `#hangisi` (`js/versus.js`): pick the pricier of two past prices, best streak kept in localStorage.

## [0.38.0] - 2026-10-14
### Added
- ui: cashier one-liner under the result receipt (`js/cashier.js`, written by Antigravity).
- ui: quick-add chips (+10, +100, +1.000) under the guess field.

## [0.37.0] - 2026-10-14
### Added
- data: Marlboro Red 20-piece pack price at the date of each price list or Philip Morris price rise, fourteen steps 2010-2026 (5.50 TL to 125 TL); six values confirmed by two news sites, eight by one (flagged in their notes). Gaps in 2011-2015 and 2017-2018 stay empty because no source gave an unambiguous short-pack price.
- ui: cigarette pack icon.

## [0.36.0] - 2026-10-14
### Added
- data: TÜVTÜRK periodic inspection fee for a passenger car (VAT included, exhaust emission test excluded), 2010-2026, seventeen yearly values from 126.26 TL to 3,288.84 TL; sixteen values are confirmed by at least two news sites, 2025 (2,620.80 TL) by one.
- ui: car-inspection icon.

## [0.35.0] - 2026-10-14
### Added
- data: Diyanet / Türkiye Diyanet Vakfı proxy sacrifice (vekâletle kurban kesim) fee, domestic, announced yearly, 2013 and 2015-2022, 2024-2026 (550 TL to 18,000 TL); eleven values confirmed by two news sites, 2013 by one. 2023 is left out because sources disagree (5,950 vs 7,950 TL); 2010-2012 and 2014 had no source.
- ui: sheep icon.

## [0.34.0] - 2026-10-08
### Added
- data: Istanbul public transport full electronic fare, 2011-2026, thirteen steps each confirmed by two news sites (was a todo entry).
- ui: confetti burst on an exact guess (skipped with reduced motion).
- ui: bus icon.
### Changed
- ui: on phones the result actions (Paylaş, İndir, Sonraki) stay pinned to the bottom of the screen in one row, so "Sonraki" is always in reach.

## [0.33.0] - 2026-10-08
### Added
- data: Türk-İş hunger line (monthly food spending of a family of four, January), 2019-2026, five values each confirmed by two news sites; the source title names Türk-İş because it is a union survey, not official data.
- data: more confirmed values for IMEI fee (2013, 2014, 2015, July 2019), Netflix (2016 launch, Sept 2022) and Spotify (Feb 2017).
- ui: shopping-basket icon.

## [0.32.0] - 2026-10-08
### Added
- data: Schengen visa fee for one adult in TL, 2010-2026, derived from the EU Visa Code fee (60, 80 from Feb 2020, 90 euro from June 2024) times the TCMB euro rate.
- data: Netflix Standard plan monthly price, nine price steps 2019-2026; Spotify Premium Individual, eight steps 2013-2026; IMEI registration fee, twelve values 2012-2026 including mid-year rises. Every value confirmed by two different news sites.
- ui: visa, screen, music-note, barcode-phone icons.

## [0.31.0] - 2026-10-08
### Added
- data: 10-year passport fee (over-3-years tariff, booklet fee excluded), 2017-2026 (573.10 TL to 13,410.40 TL), eleven values including the July 2023 50% mid-year rise; every value confirmed by two news sites.
- data: B-class driving licence fee (fee only; card and foundation fees excluded), 2019-2026 (613 TL to 6,754 TL), eight values, each confirmed by two news sites.
- ui: passport and driving licence icons.

## [0.30.1] - 2026-10-08
### Fixed
- game: an exact guess now says "Tam isabet! 🎯"; "Neredeyse tam isabet!" is kept for guesses that are close but not equal.

## [0.30.0] - 2026-10-04
### Changed
- game: Every question now comes from a different category. The next product is chosen among those not shown in the last (up to) eight questions, then a random year of that product, so products with many yearly values no longer dominate. In a 40-question run: 22 distinct products, no back-to-back repeats.

## [0.29.0] - 2026-10-04
### Added
- ui: the footer shows the app version and a small credit line ("Yapan: Murat Tokaç", linking to GitHub). The version lives in `js/version.js`; a test keeps it equal to `package.json`.
### Changed
- ui: the question card is centred on mobile and desktop: larger period pill, a bigger centred icon (112 px, 128 px on wide screens), responsive product title, centred guess input. On wide screens the column is a little wider and sits in the vertical middle.

## [0.28.0] - 2026-10-04
### Added
- data: KPSS Lisans fee per Genel Yetenek-Genel Kültür session, 2014-2026 (40 TL to 800 TL), nine years found (2015, 2016, 2018 and 2020 left out for lack of a usable page); three confirmed by two sites, six by one (flagged).
- data: KYK monthly undergraduate scholarship/loan amount, 2010-2026 (200 TL to 4,000 TL), seventeen years; twelve confirmed by two news sites, five by one.
- ui: graduation-cap icon (KPSS reuses the exam icon).

## [0.27.0] - 2026-10-04
### Added
- data: Paid military service fee (bedelli askerlik), 14 six-month periods from July 2019 (33,230 TL) to January 2026 (333,089 TL): eight confirmed by two news sites, six by one (flagged). The July 2026 value (472,653 TL) is left out because only a non-news site states it.
- ui: soldier helmet icon.

## [0.26.0] - 2026-10-04
### Added
- data: AirPods (basic model) Turkey launch price: 779 TL (2016), 1,099 (2019), 1,999 (2021), 5,779 (2024). The 2019 value has one usable source, flagged in its note.
- data: First-child birth grant: 300 TL (15 May 2015) and 5,000 TL one-off (from 1 Jan 2025), each confirmed by two or more news sites.
- ui: earphones and baby-bottle icons.

## [0.25.0] - 2026-10-04
### Added
- data: Istanbul yellow taxi opening fee, 8 steps from Jan 2023 (12.65 TL) to July 2026 (71.94 TL), each confirmed by two or more news sites.
- data: PlayStation console Turkey launch price (standard disc model): PS4 1,399 TL (2013), PS5 8,299 TL (2020), PS5 Pro 49,999 TL (2024), each confirmed by two or more news sites.
- ui: taxi and game-controller icons.

## [0.24.0] - 2026-10-04
### Added
- data: Fitre amount announced by Diyanet each Ramazan, 2010-2026 (7 TL to 240 TL), 17 values: nine confirmed by two news sites, eight by one (noted on each entry). Sentences were pulled verbatim from the pages by script.
- ui: wheat icon.
### Fixed
- tooling: the data verifier now recognises one-decimal prices such as "11,5".

## [0.23.0] - 2026-10-04
### Added
- data: Red-light violation fine (Traffic Law 47/1-b) 2020-2026: 288, 314, 427, 951, 1,506, 2,167, 2,719 TL, each confirmed by two news sites. Sentences were pulled verbatim from the pages by script.
- ui: traffic light icon.

## [0.22.0] - 2026-10-04
### Added
- data: Minimum retiree pension (SSK and Bağ-Kur floor) 2019-2026: 1,000 TL in Jan 2019 up to 23,552 TL in July 2026, 12 values, ten confirmed by two news sites (two single-source values are flagged in their notes). Sentences were pulled verbatim from each page by script and re-checked.
- ui: retiree icon.

## [0.21.0] - 2026-10-04
### Added
- data: YKS exam fee per session, 2018-2026 (ÖSYM announcements through news; six values confirmed by two sites, three by one, flagged in the note).
- ui: exam icon.

## [0.20.0] - 2026-10-04
### Added
- data: Euro (TCMB selling rate, same dates as the dollar, 2010-2026, 17 values read from the official daily XML files).
- data: Quarter gold coin (derived from the gram gold series: 1.75 g, 22 carat = 1.604 g pure gold; market value, not a jeweller's price). Weight and carat confirmed by NTV and CNN Türk.
- ui: euro and gold-coin icons.

## [0.19.0] - 2026-10-04
### Added
- data: Halk Ekmek (İBB, 250 gr) from June 2019 to May 2026: 0.75, 1, 1.25, 2, 3, 5, 8 and today's 12.5 TL, each step confirmed by two or three news articles.
- data: Bosphorus bridge car toll 2010-2026 (3.75 TL in 2010 to 59 TL in 2026). Since 1 Jan 2022 the toll is collected in both directions at half price; the note on each entry says so. The 2010 value has a single news source and says so.
- ui: bread loaf and bridge icons.
### Fixed
- game: "1 adet, 250 gr" is counted in pieces, not grams, in the minimum-wage sentence.

## [0.18.0] - 2026-10-04
### Added
- data: iPhone 5s Turkey launch price, 2,149 TL (Apple Türkiye store opening, 1 Nov 2013; Webrazzi and Hürriyet agree). iPhone 4, 4S and 5 stay out: operators sold them at different prices (iPhone 5 in Dec 2012: Turkcell 2,149 TL, Avea and Vodafone 2,139 TL).

## [0.17.0] - 2026-10-04
### Added
- ui: iPhone questions now show an era-matched icon: home-button (iPhone 4-8), notch (XR, 11-14) or Dynamic Island (15-17). Entries can carry their own `image`, which overrides the product image.
### Fixed
- ui: A question without an image no longer shows a broken image with the previous product's alt text ("Motorin pompası"); `.product-image { display: block }` was overriding the `hidden` attribute.

## [0.16.0] - 2026-10-04
### Added
- feature: Full tax estimate ("Vergi payı") for iPhone questions from May 2019 onwards, computing Kültür Bakanlığı payı, TRT bandrolü, ÖTV, and KDV to match consumer shelf prices.
- ui: Tap-to-open tax breakdown table (`#r-tax-details`) below the tax sentence showing pre-tax base price, each tax item (omitting 0% rates), total tax amount, an estimate caveat, and period source links.
- feature: Shareable PNG receipt now includes a compact tax estimate line ("Vergi payı: yaklaşık %51 (₺15.800)") between the price increase rows and score block when a tax breakdown exists, dynamically adjusting canvas height to fit.
### Changed
- wording: Replaced "en az" with "yaklaşık" across tax sentences and estimates to reflect that retail margins are not separated from the taxable base.
- code: Replaced `taxFloor` with `taxBreakdown`, simplified sentence generation without Turkish possessive suffixes, and separated `taxLine` from `contextText` in share models.

## [0.15.0] - 2026-10-04
### Added
- feature: Tax floor ("Vergi payı") on the result screen for iPhone questions from May 2019 onwards. Shows the minimum combined ÖTV and KDV tax share and estimated amount ("Bu fiyatın en az %44'ü vergi..."), with a comparison to today's price when available.
### Changed
- data: The iPhone "current" price is now the newest base iPhone's launch price (iPhone 17, 77,999 TL) instead of a store price, so old models are compared launch-to-launch. The row says "En yeni iPhone 17"; the Zaman makinesi marks the matching dated row instead of repeating it, and the minimum-wage sentence names the models.
- ui: The newest model's own question no longer compares the price with itself.

## [0.14.0] - 2026-10-04
### Added
- ui: Result colours follow the score on a five-step scale (dark green, light green, amber, orange-red, dark red): verdict box, score text and a new score meter, also on the shareable PNG. Text colours keep at least 4.5:1 contrast on the receipt paper; the vivid tones are used only for the meter and a light tint.

## [0.13.0] - 2026-10-04
### Added
- data: "Yeni iPhone" launch prices in Turkey, 2014-2025 (12 entries, base model, VAT and ÖTV included), each confirmed by two independent sources (2015 also by Apple Türkiye's press release). Today's price is the Apple Türkiye store price (iPhone 17, 256 GB: 99,999 TL). 2010-2013 are left out because sources disagree.

## [0.12.0] - 2026-10-04
### Added
- ui: Source kind labels (e.g. "resmî kayıt", "haber kaynaklı") next to the source on the result screen and in the "Zaman makinesi" rows, driven by `source.kind`, now required for every verified entry (all 89 existing ones were classified).
- data: Plastik poşet (market bag fee): 0.25 TL in January 2019 (official PDF) and 1 TL from January 2026 (four news sites agree). A claim of 0.50 TL in 2025 contradicts the others and was left out.

## [0.11.0] - 2026-10-04
### Added
- feature: Shareable result image. On the result screen, players can download a PNG image of their receipt using the Canvas 2D API or share it directly using the Web Share API on mobile.


## [0.10.0] - 2026-10-04
### Added
- ui: "Zaman makinesi" screen to browse historical price data of all products in one place.
- code: Extracted timeline processing into a pure `buildTimelines` module with unit tests.
### Fixed
- docs: README no longer mentions the year filter removed in 0.5.0.

## [0.9.0] - 2026-10-04
### Added
- data: Gram altın for every January 2010-2026 plus the current value (September 2026): 18 derived values, 83 playable questions in total. The values are market values from the World Bank monthly gold price and the TCMB monthly average dollar rate, not jeweller selling prices; the method is in each entry's `note` and in `docs/DATA.md`.
- ui: Gold bar icon for the question card.

## [0.8.0] - 2026-10-04
### Added
- ui: Show generic product illustrations (SVG icons) on the question screen for Dolar, Benzin, Motorin, Asgari Ücret, and Big Mac.
- data: Products can now have an `image` property. Included original brand-free SVG icons in `img/`.

## [0.7.0] - 2026-10-04
### Added
- data: Dolar for the first business day of every January 2011-2026 (TCMB), net minimum wage for January 2011-2014, 2016-2023 and 2025 (ÇSGB PDFs), and Big Mac for January 2012, 2013 and 2020-2026 (Economist). 38 new verified values; 66 playable questions in total.
- The result context line ("asgari ücretle X litre alınabiliyordu") now appears for the fuel, dolar and Big Mac years that have a minimum wage entry.
- docs: Notes on the TCMB, ÇSGB and Economist sources in `docs/DATA.md`.

## [0.6.0] - 2026-10-04
### Added
- data: Benzin (kurşunsuz 95) and motorin, 1 litre, İstanbul (Avrupa): 11 verified entries each (January 2016 to January 2026) plus the current price (4 October 2026). All from the official EPDK Bayi Satış Fiyatı Bülteni.
- docs: How to reproduce EPDK bulletin values in `docs/DATA.md`.

## [0.5.0] - 2026-10-04
### Changed
- ui: Removed year filter selects and related CSS; questions are now served randomly from all verified items.
- ui: Share button restores original label after ~2 seconds and when next question is displayed without hardcoded strings.
- ui: Receipt "Bugün" row now displays the actual date of the current price (e.g. "Güncel (Temmuz 2026)").
- ui: Reduced question screen empty space on mobile by aligning the card nearer the top and tightening vertical spacing.
- a11y: Improved dark mode contrast for context-line box text and source link to exceed WCAG AA 4.5:1.
- code: Refined `getShortUnit` to match gram units precisely as whole words and return "gram".
- tests: Added unit tests for `getShortUnit` and removed obsolete `filterByYears` test.

## [0.4.1] - 2026-10-03
### Fixed
- data: Audited all verified data. Moved unverified links (Sabah, Hürriyet, T24, ITO) to todo.
- data: Fixed minimum wage definition to be strictly net (AGİ included before 2022) with official sources.
- data: Updated USD sources to use TCMB daily XML archive exactly at the date.
- code: Moved context line calculation to game.js pure function and added tests.
- code: Context line now expresses expensive items as wage multiples and never outputs 0; rewritten without string replacements.
- code: Context line now strictly filters by matching half-year.
- code: Fixed double "₺" bug in share text.
- ui: Changed persistent counter label from "Bu oturum" to "Toplam".
- data: Current USD (02.10.2026) and 2026 net minimum wage verified from TCMB XML and ÇSGB PDF.
- meta: og:image size matches the actual image (1376x768).
- tests: Removed duplicated context line tests.
- ui: Added `prefers-reduced-motion` for accessibility.
- ui: Replaced social.jpg with a clean vector-like mockup image without fake prices and added og dimension tags.

## [0.4.0] - 2026-10-03
### Added
- LocalStorage integration to persist session stats (questions played, average score).
- Dynamic context line cross-referencing minimum wage data ("O tarihte 1 asgari ücretle X adet...").
- Share functionality using Web Share API and Clipboard fallback.
- Open Graph meta tags, social preview image (`social.jpg`), and an SVG favicon.

## [0.3.0] - 2026-10-03
### Added
- Verified historical and current prices for Big Mac, USD (Dolar), Minimum Wage (Asgari Ücret), iPhone, and Bread (Ekmek) for years including 2010, 2014/2015, 2024, and 2026.
- Data adheres strictly to the data integrity policy with all sources documented.

## [0.2.0] - 2026-10-03
### Added
- "Kasa Fişi" (Receipt) design implemented (Variant B) using CSS custom properties.
- Zigzag torn edge effects for receipt cards.
- Google Fonts integration (DM Sans for UI, Space Mono for receipt details).
- Dark mode compatibility for the new design.
- `docs/DESIGN.md` added with current design rules.

## [0.1.0] - 2026-10-02
### Added
- Initial project skeleton.
- Core game logic (`js/game.js`), number formatting (`js/format.js`), and basic UI (`js/main.js`).
- Strict data policy validation and unit tests (`tests/data.test.js`).
- GitHub Actions CI workflow.
