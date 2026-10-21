# Changelog

All notable changes to this project will be documented in this file.

## [0.67.0] - 2026-10-21
### Added
- Receipt printer: the result receipt slides out of a printer slot in about a second, then is torn off. A tap on the receipt finishes it at once; reduced motion skips the slide.
- Question counter ("Soru 3") on the question card, so new players see that the game is a series of questions.
- A visible question above the price field ("Sence kaç liraydı?").

### Changed
- Sounds are short CC0 recordings instead of synthesized beeps: old receipt printer, paper tear, checkout beep and a counter bell for an exact guess (BigSoundBank, Joseph Sardin). The good/bad score jingles are gone. Samples are decoded on the first tap or key press so the printer sound starts in sync.
- "Sonraki" is now "Sonraki soru →" in the accent colour, and it nudges once after the first three results.
- Light mode: the page background is darker (#e4ded1) and the receipt has a stronger shadow; before, the receipt almost disappeared on the page (1.1:1).

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
