# AGENTS.md — rules for AI agents working on this repo

This file is the single source of truth for any agent (Gemini/Antigravity, Claude, Codex).
Read it fully before changing anything. If a request conflicts with a HARD RULE, stop and ask Murti.

## Project

**Ne Kadardı?** — a static, mobile-first browser game. The player sees a product and a date
("Ocak 2012 · Benzin · 1 litre · İstanbul"), types a price guess, then sees a receipt-style
result: guess, real price, how many times off ("2,7 kat az"), today's price and the source.

- Owner: Murti (Murat Tokaç, GitHub `murtibad`). Backend student, learning frontend.
  When you make a non-obvious decision, explain *what* and *why* in 1–2 sentences.
- Hosting: GitHub Pages from `main`, repo root. Live URL: https://murtibad.github.io/ne-kadardi/

## HARD RULES

### 1. Data integrity (most important)
- **Never invent, estimate, interpolate or "remember" a price.** Every price in
  `data/prices.json` with `"status": "verified"` must have a real, checkable source
  (`title`, `https` `url`, `accessed` date; add `archive_url` from web.archive.org when possible).
- If you cannot verify a value from a source you actually opened, leave `"price": null`,
  `"status": "todo"` and write `TODO: kaynak gerekli` in a `note`. A missing price is fine;
  a wrong price destroys the game's credibility.
- Do not compute derived prices (e.g. gram gold from ounce × USD) unless the method and both
  sources are documented in the entry's `note` and in `docs/DATA.md`.
- Units and regions must match the source exactly. If the unit changed over time (bread
  grams), override `unit` per entry.
- Before adding data, read `docs/DATA.md`. After adding data, run `npm test`
  (`tests/data.test.js` enforces the policy) and list every added value with its source
  in your summary so Murti can spot-check.
- Prices before 2005 are out of scope (different currency unit after the redenomination).

### 2. Tech constraints
- Plain HTML + CSS + JavaScript (ES modules). **No framework, no bundler, no build step,
  no runtime npm dependencies.** GitHub Pages serves the files as they are.
- No backend, no accounts, no analytics or trackers, no cookies. `localStorage` is allowed
  for per-device conveniences (stats, last year filter) and must be wrapped in try/catch.
- External assets: only Google Fonts (optional). No other CDNs.
- Keep logic pure and testable: `js/format.js` (parsing/formatting) and `js/game.js`
  (selection/scoring) must not touch the DOM. DOM code lives in `js/main.js`
  (split into more UI modules if it grows).
- Scoring is ratio-based on a log scale (see `scoreGuess`). Do not switch to difference-based.
- Turkish number input must keep working: `"4,5"`, `"1.250"`, `"1.250,75"`. Covered by tests.

### 3. Language
- **Game UI text: Turkish.** Use correct Turkish characters (ı, ğ, ş, ç, ö, ü, İ).
- **Code, comments, README, commit messages, PR texts: English.**
- Comments explain *why*, not *what*. Keep them short.

### 4. Quality bar
- Mobile first: design and test at 360–390 px width first, then desktop (max content ~480 px).
- Accessible: semantic HTML, labels for inputs, visible focus, `aria-live` for results,
  contrast ≥ 4.5:1, works with keyboard only. Respect `prefers-color-scheme` and
  `prefers-reduced-motion`.
- `npm test` must pass before every commit.
- Check the page in a browser via a local server (`npm start` → http://localhost:8000).
  Opening `index.html` directly (`file://`) does not work because `fetch` is blocked.

### 5. Git workflow
- Work on a feature branch (`feature/<short-name>`), commit small logical steps,
  open a PR with `gh pr create`. **Merging to `main` is Murti's decision.**
- Stage files explicitly: `git add <path>`. Never `git add .`, `git add -A` or `git commit -a`.
- Before pushing: `git status` and `git diff --cached --stat`. If an unexpected file
  appears, do not push; ask Murti.
- Commit messages in English, imperative mood ("Add receipt result screen").
- Do not write temp files (logs, screenshots, scratch scripts, Stitch captures) into the repo.
  Use the OS temp folder. Leave no untracked files when you finish.
- Version: bump `package.json` `version` and add a `CHANGELOG.md` entry per PR
  (feature/design → minor, fix → patch).

## Design workflow (Google Stitch)

The `stitch` CLI is installed and logged in. Design direction: `docs/DESIGN-BRIEF.md`.
1. Create a Stitch project named "Ne Kadardı" and generate the screens from the brief.
2. Generate 2–3 variants for the key screens (question, result receipt) and **show them to
   Murti; Murti picks**. Do not choose on Murti's behalf in this project.
3. Stitch outputs Tailwind HTML. Treat it as a reference: re-implement it in `css/style.css`
   with CSS custom properties. Do not add Tailwind or copy Stitch's CDN scripts.
4. Do not keep invented content from Stitch (fake stats, fake users, fake prices).
5. Extract the final design rules into `docs/DESIGN.md`.

## Roadmap

- [x] v0.1 Skeleton: data schema, parsing, scoring, basic UI, tests, CI.
- [ ] v0.2 Design: Stitch variants → Murti picks → receipt theme implemented, dark mode.
- [ ] v0.3 Data: verified prices for at least 5 products, ideally from 2010 (2005 where available),
      plus `current` prices. Murti spot-checks every batch.
- [ ] v0.4 Polish: session stats in `localStorage`, share text, context line on the result
      ("O tarihte asgari ücretle X litre benzin alınıyordu, bugün Y") using only verified data,
      Open Graph meta + social preview image, favicon.
- [x] Later: "Zaman makinesi" browse screen.
- [x] Later: Shareable result image (canvas).

## Commands

```
npm test      # node --test, no dependencies
npm start     # python -m http.server 8000
```
