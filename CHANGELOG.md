# Changelog

All notable changes to this project will be documented in this file.

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
