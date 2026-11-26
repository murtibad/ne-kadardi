# Ne Kadardı?

A small browser game about inflation in Turkey. You see a product and a date
("Ocak 2012 · 1 litre benzin"), guess the price, and get a receipt-style result:
the real price, how many times off you were, and what it costs today.

**Play:** https://murtibad.github.io/ne-kadardi/

## Features

The game is one mode, plus a price archive:

- **Fiyat Tahmini:** guess a past price, get a receipt with the real price, how far off you
  were, today's price and the source. Optional two-step hint (an everyday price from that year, then the dollar
  rate and minimum wage) for a 20% / 40% score cut, and a cashier comment on the result (product jokes, a remark when you ask for a hint; hidden when a session nudge appears so each receipt keeps at most one extra note).
  The receipt prints out of a receipt printer and is torn off.
- **Fiyat Arşivi:** browse the verified price history of 82 products with their sources, filtered by category; long
  histories show the newest 8 rows with "Tüm yılları göster", a "🎲 Rastgele" chip opens a random product, and the
  result screen links straight to each product's history (opened pinned at the date just played, with its chart point marked, row outlined, and older years auto-expanded).

Also:

- First-visit cinematic intro (year counter with real sourced prices of that year)
- First-visit opener questions with well-known benchmark prices before the random pool
- First-question input hint in the readout line (`Sadece rakam yaz, ör. 4,5`) before typing
- "Bilemedin mi? Arkadaşına sor" share links (`?soru=`) that open one question without its answer
- Product-specific cashier jokes on the receipt in everyday Turkish tone
- Turkish number input (`4,5`, `1.250,75`) with automatic thousands grouping as you type and words readout under the box (`4 lira 50 kuruş`); on phones, focusing the box scrolls "Tahmin et" into view above the keypad
- Interactive price charts on the receipt and archive with finger scrubbing (slide sideways to inspect any year's price) and keyboard navigation, showing a fixed-height caption with the change from the previous point when points are at most 18 months apart ("Ocak 2022: ₺12,91 · bir önceki kayda göre 2,1 katına çıktı") plus a one-time hint ("parmağınla kaydırıp yıllara bak") until your first scrub
- Year anchors on the question card for 15 years (2010–2025 excluding 2019, e.g. "Marmaray ile Avrupa ile Asya'nın denizin altından birleştiği yıl."), each verified against a source
- Skipping a question reveals its answer on the next card (`Geçtiğin soru: ...`)
- House button in the header for a direct return to the main menu
- Fair, ratio-based scoring on a log scale: being 2× too high costs the same as 2× too low
- Time-warp line under the verdict for far-off guesses: matches your number to another verified date for that product ("Yazdığın ₺20 aslında Ocak 2023'ün fiyatıydı.")
- Minimum-wage receipts include a purchasing-power basket showing what one wage bought then vs. today in everyday items ("12 gram altın ya da 304 litre benzin") using same-month verified prices; expensive items (12+ minimum wages) express purchasing power in years and months using the same unit in both halves ("O tarihte bir Togg T10X 9 yıl 4 aylık asgari ücret ediyordu, bugün 5 yıl 8 aylık.")
- New session record moment: previous best shown in the badge and a one-shot gold ring on the score box
- Shareable result image (Canvas 2D) with a score stamp, to download or post directly
- Installable app (PWA) that works offline after the first visit; new prices arrive on the
  next visit (stale-while-revalidate, cache versioned with the release)
- Recorded sound effects with a mute button: an old receipt printer, the receipt being torn off, a checkout beep and a counter bell for an exact guess (CC0 recordings by Joseph Sardin, [BigSoundBank](https://bigsoundbank.com/), trimmed to ~30 KB in total in `sounds/`); light vibration on phones
- The result icon bounces or shakes with your score
- Light/dark theme toggle with a circular reveal animation (View Transitions), keyboard friendly
- Every price is sourced and labelled by source type (official, dataset, news, derived);
  unverified data never reaches the game
- "Günün Fişi" daily receipt: the same 5 everyday questions for everyone each day, with five tier-coloured progress dots while playing, reviewable from the menu via "Fişini gör" once completed; shared as a spoiler-free receipt image (no prices) or coloured squares
- Daily records and milestones: a new all-time best and the 3rd/7th/10th/25th/50th/100th receipt get a one-time celebration line; the review shows a "Son 7 gün" strip
- Günün Fişi rows show the product above your guess and the real price ("Sen ₺20 · Gerçek ₺2,50", or "Geçtin · Gerçek ₺99,00" when skipped) with a tier-coloured score badge on the right, and link to each product's price history pinned at the question's date
- Finished Günün Fişi card highlights the biggest riser ("Bugünkü fişte en çok artan: Çeyrek altın. 2013'ten bugüne 89 katına çıktı.", omitted when sharing or when it matches the last question)
- Daily streak ("🔥 3 gün üst üste") on the menu and receipt for answering at least one question every day, with a warm return greeting ("Yeniden hoş geldin!") after 5+ days away
- Warm wrap-up line on the menu after 3+ questions in a sitting
- Best guess on the menu ("En iyi tahminin 96 puan: Ocak 2016 · Benzin (kurşunsuz 95)") across free play and Günün Fişi; tapping it opens that product's archive pinned at that date
- "Biliyor muydun?" fact card on the menu with a "Hatıra yılın" year picker to browse sourced then-and-now prices from a chosen year (saved across visits); "Bunu tahmin et →" asks a different date of that product instead of the card's price, or becomes "2014 yılından bir soru çöz →" when a year is selected
- Free-play nudges: a tendency note once per session when most guesses lean one way, and a one-time tip after three zero scores in a row (the tip takes priority if both trigger, and either hides the cashier comment so a receipt shows at most one extra note)
- Unanswered questions first: prefers product years you haven't seen yet before repeating; free play skips today's Günün Fişi products and keeps product families (two breads, two fuels, two exams) apart for 8 questions
- One-tap clear (×) in the price box; confetti and a bell for every 100-point guess
- Archive progress ("81 üründen 19'unu tahmin ettin", correct Turkish suffixes), a ✓ on guessed products, and your remembered guess ("Tahminin: ₺4,50") on previously answered dates (last 500 guesses saved on the device)
- "1 maaşla kaç tane?" view in Fiyat Arşivi: toggle both the price table and the chart between TL prices and minimum-wage purchasing power over the years ("Yıllar içinde 1 asgari ücretle alınabilen": 304 litre → 394 litre)
- Friend challenge score in "Arkadaşına sor" links to compare results with a friend without spoiling the price
- Same-year follow-up hook on the receipt jumping straight to another everyday product from that year
- Typo-tolerant archive search understands everyday words ("mazot", "akbil", "döviz", "araba", "maaş") and forgives a single typo when no exact match is found
- "Yeniden dene" retry button if price data fails to load on a weak connection

## Tech

Plain HTML, CSS and JavaScript (ES modules). No framework, no build step, no runtime
dependencies, so GitHub Pages serves the repo as it is.

```
index.html          markup
css/style.css       styles (design tokens as CSS custom properties)
js/main.js          UI: screens, routing and events
js/game.js          question selection, scoring and the "1 asgari ücretle" line (pure, tested)
js/sound.js         Web Audio sample player and haptics (tested with a fake AudioContext)
js/banter.js        cashier jokes, year notes, share stamp titles (pure, tested)
js/cashier.js       cashier comments (pure, tested)
js/format.js        Turkish number parsing, formatting and HTML escaping (pure, tested)
js/guess-memory.js  remembered player guesses shown in the archive (pure, tested)
js/timeline.js      price archive rows (pure, tested)
js/archive-table.js archive price table HTML (pure, tested)
js/archive-ui.js    price archive screen UI (search, filters, lazy-loaded)
js/ask-link.js      ?soru= links that open one question without its answer (pure, tested)
js/daily.js         "Günün Fişi" daily question set and share text (pure, tested)
js/daily-ui.js      "Günün Fişi" UI, storage and review card
js/price-chart.js   price chart geometry for the receipt, archive and share image (pure, tested)
js/chart-ui.js      price chart rendering, finger scrubbing and keyboard navigation
js/categories.js    product categories for the archive filter (pure, tested)
js/search.js        accent-insensitive archive search (pure, tested)
js/source-kind.js   source labels ("resmî kayıt", "haberlerden", "döviz kuruyla hesaplandı")
js/source-name.js   short publisher names derived from source URLs (pure, tested)
js/linkify.js       turns URLs in notes into link buttons (pure, tested)
js/fact.js          the home page "Biliyor muydun?" card (pure, tested)
js/intro.js         animated first-visit intro (pure data helpers and stage runner)
js/hint.js          hint values and exclusions
js/progress.js      archive progress line with Turkish number suffixes (pure, tested)
js/tendency.js      free-play tendency note and cold-streak tip (pure, tested)
js/icon-preload.js  warms product icons for upcoming questions (tested)
js/count-up.js      price count-up frames on the receipt
js/confetti.js      confetti on an exact guess
js/share-model.js   share text and image model (pure, tested)
js/share-ui.js      share sheet and preview dialog UI
js/share-image.js   share image drawing (canvas, loaded on demand)
js/tax.js           estimated tax share (iPhone)
js/version.js       version shown in the footer
sw.js               service worker: offline cache (version must match package.json)
manifest.webmanifest  install metadata and icons
data/prices.json    prices with sources
img/                product icons (own SVGs, no brands) and app icons (PNG)
tests/              node:test unit tests, including a data policy check
docs/               data guide, design brief and design rules
```

## Run locally

```bash
npm start   # python -m http.server 8000, then open http://localhost:8000
npm test    # requires Node 20+
```

Opening `index.html` directly does not work: browsers block `fetch` on `file://` URLs.
On localhost the service worker is off unless you open the page with `?sw`, so edits show up
on reload.

## Data policy

Prices are never estimated. Each verified price links to its source (official data where
possible, e.g. TCMB EVDS, EPDK). Missing values are marked `todo` and skipped by the game.
See [docs/DATA.md](docs/DATA.md). Found a wrong price? Please open an issue.

## License

Copyright (c) 2026 Murat Tokaç. All rights reserved; see [LICENSE](LICENSE). Individual prices belong to their cited sources. Versions up to 0.141.26 were released under the MIT License.
