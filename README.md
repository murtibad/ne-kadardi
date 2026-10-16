# Ne Kadardı?

A small browser game about inflation in Turkey. You see a product and a date
("Ocak 2012 · 1 litre benzin"), guess the price, and get a receipt-style result:
the real price, how many times off you were, and what it costs today.

**Play:** https://murtibad.github.io/ne-kadardi/

## Features

The game is one mode, plus a price archive:

- **Fiyat Tahmini:** guess a past price, get a receipt with the real price, how far off you
  were, today's price and the source. Optional hint (that year's dollar rate and minimum
  wage) for a 20% score cut, quick +10/+100/+1.000 buttons, a cashier comment on each result.
- **Fiyat Arşivi:** browse the verified price history of each product with its sources, filtered by category; the
  result screen links straight to the product's history.

Also:

- Turkish number input (`4,5`, `1.250,75`)
- Fair, ratio-based scoring on a log scale: being 2× too high costs the same as 2× too low
- Shareable result image (Canvas 2D) to download or post directly
- Installable app (PWA) that works offline after the first visit; new prices arrive on the
  next visit (stale-while-revalidate, cache versioned with the release)
- Light/dark theme toggle, keyboard friendly, respects reduced motion
- Every price is sourced and labelled by source type (official, dataset, news, derived);
  unverified data never reaches the game

## Tech

Plain HTML, CSS and JavaScript (ES modules). No framework, no build step, no runtime
dependencies, so GitHub Pages serves the repo as it is.

```
index.html          markup
css/style.css       styles (design tokens as CSS custom properties)
js/main.js          UI: screens, routing and events
js/game.js          question selection and scoring (pure, tested)
js/format.js        Turkish number parsing and formatting (pure, tested)
js/timeline.js      price archive rows
js/categories.js    product categories for the archive filter (pure, tested)
js/hint.js          hint values and exclusions
js/cashier.js       cashier comments
js/share-*.js       share text and image
js/year-share-image.js  yearly receipt image
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

Code: [MIT](LICENSE). Price data belongs to its cited sources.
