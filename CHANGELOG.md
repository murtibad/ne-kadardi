# Changelog

All notable changes to this project will be documented in this file.
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
