# Changelog

All notable changes to this project will be documented in this file.

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
