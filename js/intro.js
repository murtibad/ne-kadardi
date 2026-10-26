// Animated first-visit intro: pure data helpers (introRows, yearSteps) plus the stage runner (playIntro).
import { formatPrice, escapeHTML } from './format.js';

export const INTRO_NAMES = Object.freeze({
  'big-mac': 'Big Mac',
  benzin: '1 litre benzin',
  dolar: '1 dolar',
});

/**
 * Pick the oldest verified row and the current (or last) row for each requested product id
 * from the archive timelines. Skips missing products or timelines without two distinct rows.
 */
export function introRows(timelines, ids = ['big-mac', 'benzin', 'dolar']) {
  if (!Array.isArray(timelines) || !Array.isArray(ids)) return [];
  const out = [];
  for (const id of ids) {
    const t = timelines.find((x) => x && x.id === id);
    const rows = t?.rows;
    if (!Array.isArray(rows) || rows.length < 2) continue;
    const first = rows[0];
    const current = rows.find((r) => r && r.isCurrent) ?? rows[rows.length - 1];
    if (!first || !current || first === current) continue;
    const fromYear = Number(String(first.date ?? '').slice(0, 4));
    const toYear = Number(String(current.date ?? '').slice(0, 4));
    if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) continue;
    if (!(first.price > 0) || !(current.price > 0)) continue;
    out.push({
      name: INTRO_NAMES[id] || t.name || id,
      fromYear,
      toYear,
      from: first.price,
      to: current.price,
      // Every sourced price, so the receipt can show each year's real price as the year rolls.
      history: rows.filter((r) => r && r.price > 0).map((r) => ({ year: Number(String(r.date).slice(0, 4)), price: r.price })),
    });
  }
  return out;
}

/** Inclusive ascending list of integer years from `fromYear` to `toYear`. */
export function yearSteps(fromYear, toYear) {
  const a = Math.trunc(Number(fromYear));
  const b = Math.trunc(Number(toYear));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return [];
  const steps = [];
  for (let y = a; y <= b; y++) steps.push(y);
  return steps;
}

/** The real price shown for `year`: the newest sourced price on or before it (the first one before the series starts). No interpolation, so every number on the receipt is a sourced price. */
export function priceInYear(row, year) {
  const known = (row?.history ?? []).filter((h) => h.year <= year);
  return known.length ? known[known.length - 1].price : row?.from;
}

/**
 * Populate or update the intro dialog stage and run the ~4 s sequence.
 * Returns a `finish({ moveFocus })` function that jumps straight to the final resting state.
 */
export function playIntro(dialogEl, rows, { sound = null } = {}) {
  if (!dialogEl) return () => {};
  const list = Array.isArray(rows) ? rows : [];
  const fromYear = list.length ? Math.min(...list.map((r) => r.fromYear)) : 2010;
  const toYear = list.length ? Math.max(...list.map((r) => r.toYear)) : 2026;
  const years = yearSteps(fromYear, toYear);

  ensureStage(dialogEl, list, fromYear, toYear);

  const stage = dialogEl.querySelector('.intro-stage');
  const skipBtn = dialogEl.querySelector('#intro-skip');
  const playBtn = dialogEl.querySelector('#intro-play');
  const yearValue = dialogEl.querySelector('.intro-year-value');
  const priceEls = [...dialogEl.querySelectorAll('.intro-row-price')];

  const timers = [];
  let rafId = null;
  let finished = false;

  const clearScheduled = () => {
    while (timers.length) clearTimeout(timers.pop());
    if (rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    sound?.stop?.('print');
  };

  const onStageClick = (e) => {
    if (finished) return;
    // Let the final action buttons handle their own clicks once reached.
    if (e.target?.closest?.('#intro-play, #intro-close')) return;
    e.preventDefault();
    finish({ moveFocus: true });
  };

  const onKeyDown = (e) => {
    if (finished) return;
    if (e.key === 'Escape' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Tab') return;
    e.preventDefault();
    finish({ moveFocus: true });
  };

  function cleanupListeners() {
    stage?.removeEventListener('click', onStageClick);
    dialogEl.removeEventListener('keydown', onKeyDown);
  }

  function finish({ moveFocus = true } = {}) {
    if (finished) {
      clearScheduled();
      cleanupListeners();
      return;
    }
    finished = true;
    clearScheduled();
    cleanupListeners();

    if (yearValue) {
      yearValue.textContent = String(toYear);
      yearValue.classList.remove('tick');
    }
    list.forEach((r, i) => {
      const el = priceEls[i];
      if (!el) return;
      el.textContent = formatPrice(r.to);
      el.classList.add('landed');
      el.removeAttribute('aria-hidden');
    });
    stage?.classList.remove('is-running', 'shake');
    stage?.classList.add('is-printed', 'is-stamped', 'is-done');
    if (skipBtn) skipBtn.hidden = true;
    if (moveFocus) playBtn?.focus?.({ preventScroll: true });
  }

  if (typeof requestAnimationFrame !== 'function') {
    finish({ moveFocus: true });
    return finish;
  }

  // Initial animated frame: oldest year, initial prices, skip visible & focused.
  if (skipBtn) {
    skipBtn.hidden = false;
    skipBtn.focus?.({ preventScroll: true });
  }
  if (yearValue) yearValue.textContent = String(fromYear);
  list.forEach((r, i) => {
    const el = priceEls[i];
    if (!el) return;
    el.textContent = formatPrice(r.from);
    el.classList.remove('landed');
    // Hide rapidly changing intermediate digits from screen readers until the final price lands.
    el.setAttribute('aria-hidden', 'true');
  });

  stage?.classList.remove('is-printed', 'is-stamped', 'is-done', 'shake');
  void stage?.offsetWidth;
  stage?.classList.add('is-running');

  stage?.addEventListener('click', onStageClick);
  dialogEl.addEventListener('keydown', onKeyDown);

  // 0.2 s: receipt slides out of the printer slot.
  timers.push(setTimeout(() => {
    if (finished) return;
    stage?.classList.add('is-printed');
    sound?.play?.('print');
  }, 200));

  // Odometer year roll (0.15 s -> 2.45 s) + staggered price count-ups (0.4 s -> 2.55 s).
  const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let lastYearShown = fromYear;

  const step = () => {
    if (finished) return;
    const elapsed = nowFn() - startMs;

    // Year roll: accelerates in the middle and lands smoothly on toYear (easeInOutCubic).
    if (yearValue && years.length > 1) {
      const yt = Math.min(1, Math.max(0, (elapsed - 150) / 2250));
      const eased = yt < 0.5 ? 4 * yt * yt * yt : 1 - ((-2 * yt + 2) ** 3) / 2;
      const idx = Math.min(years.length - 1, Math.floor(eased * (years.length - 1) + 0.0001));
      const y = years[idx];
      if (y !== lastYearShown) {
        lastYearShown = y;
        yearValue.textContent = String(y);
        yearValue.classList.remove('tick');
        void yearValue.offsetWidth;
        yearValue.classList.add('tick');
      }
    }

    // Prices follow the rolling year: each row shows that year's sourced price.
    list.forEach((r, i) => {
      const el = priceEls[i];
      if (!el) return;
      const yearDone = lastYearShown >= r.toYear;
      el.textContent = formatPrice(yearDone ? r.to : priceInYear(r, lastYearShown));
      if (yearDone && elapsed > 2400 && !el.classList.contains('landed')) {
        el.classList.add('landed');
        el.removeAttribute('aria-hidden');
      }
    });

    if (elapsed < 2600) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(step);

  // 2.7 s: rubber stamp slams onto the receipt and shakes it.
  timers.push(setTimeout(() => {
    if (finished) return;
    sound?.stop?.('print');
    sound?.play?.('bell');
    stage?.classList.add('is-stamped', 'shake');
  }, 2700));

  // 3.1 s: final CTA card slides up under the receipt and takes focus.
  timers.push(setTimeout(() => {
    if (finished) return;
    finish({ moveFocus: true });
  }, 3100));

  return finish;
}

function ensureStage(dialogEl, list, fromYear, toYear) {
  let stage = dialogEl.querySelector('.intro-stage');
  if (!stage) {
    // Keep the existing #intro-play and #intro-close buttons so listeners wired in initIntro() stay attached.
    const playBtn = dialogEl.querySelector('#intro-play');
    const closeBtn = dialogEl.querySelector('#intro-close');
    dialogEl.innerHTML = `
      <div class="intro-stage">
        <button type="button" id="intro-skip" class="intro-skip">Geç →</button>
        <div class="intro-year" aria-hidden="true">
          <span class="intro-year-label">YIL</span>
          <span class="intro-year-slot"><span class="intro-year-value">${escapeHTML(String(toYear))}</span></span>
        </div>
        <div class="intro-printer" aria-hidden="true"></div>
        <div class="intro-receipt-clip">
          <div class="receipt-card result-receipt intro-receipt">
            <p class="receipt-head">*** NE KADARDI? ***</p>
            <ul class="intro-rows"></ul>
            <p class="intro-stamp" aria-hidden="true">SEN HATIRLIYOR MUSUN?</p>
          </div>
        </div>
        <div class="intro-final">
          <h2 id="intro-title" class="intro-tagline">Geçmişin fiyatlarını tahmin et.</h2>
          <p class="intro-trust-line"><span class="intro-check" aria-hidden="true">✓</span> Her fiyat kaynaklı</p>
          <div class="intro-actions"></div>
        </div>
      </div>`;
    const actions = dialogEl.querySelector('.intro-actions');
    if (playBtn) actions.appendChild(playBtn);
    if (closeBtn) actions.appendChild(closeBtn);
    stage = dialogEl.querySelector('.intro-stage');
  }

  const rowsUl = dialogEl.querySelector('.intro-rows');
  if (rowsUl) {
    rowsUl.innerHTML = list.map((r, i) => `
      <li class="intro-row" style="--row-i:${i}">
        <div class="intro-row-left">
          <span class="intro-row-name">${escapeHTML(r.name)}</span>
          <span class="intro-row-years">${escapeHTML(`${r.fromYear} → ${r.toYear}`)}</span>
        </div>
        <span class="intro-row-price">${escapeHTML(formatPrice(r.from))}</span>
      </li>`).join('');
  }
  const yearValue = dialogEl.querySelector('.intro-year-value');
  if (yearValue) yearValue.textContent = String(fromYear);
}
