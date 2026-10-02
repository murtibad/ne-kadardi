# Ne Kadardı?

A small browser game about inflation in Turkey. You see a product and a date
("Ocak 2012 · 1 litre benzin"), guess the price, and get a receipt-style result:
the real price, how many times off you were, and what it costs today.

**Play:** https://murtibad.github.io/ne-kadardi/ *(work in progress)*

## Features

- Random questions with a year range filter
- Turkish number input (`4,5`, `1.250,75`)
- Fair, ratio-based scoring on a log scale: being 2× too high costs the same as 2× too low
- Every price is sourced; unverified data never reaches the game

## Tech

Plain HTML, CSS and JavaScript (ES modules). No framework, no build step, no runtime
dependencies, so GitHub Pages serves the repo as it is.

```
index.html          markup
css/style.css       styles (design tokens as CSS custom properties)
js/main.js          UI: screens and events
js/game.js          question selection and scoring (pure, tested)
js/format.js        Turkish number parsing and formatting (pure, tested)
data/prices.json    prices with sources
tests/              node:test unit tests, including a data policy check
docs/               data guide and design brief
```

## Run locally

```bash
npm start   # python -m http.server 8000, then open http://localhost:8000
npm test    # requires Node 20+
```

Opening `index.html` directly does not work: browsers block `fetch` on `file://` URLs.

## Data policy

Prices are never estimated. Each verified price links to its source (official data where
possible, e.g. TCMB EVDS, EPDK). Missing values are marked `todo` and skipped by the game.
See [docs/DATA.md](docs/DATA.md). Found a wrong price? Please open an issue.

## License

Code: [MIT](LICENSE). Price data belongs to its cited sources.
