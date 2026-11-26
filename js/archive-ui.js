// Fiyat Arşivi screen: category/product chips, search, order toggle and the rows-to-chart link.
// main.js owns `state`; it is read through getters so there is never a second copy.
import { formatPeriod, formatIncrease, unitLine } from './format.js';
import { CATEGORIES, filterTimelines, categoryOf } from './categories.js';
import { pickFromCategory } from './game.js';
import { renderPriceChart } from './chart-ui.js';
import { guessedProductIds, progressText } from './progress.js';

const $ = (id) => document.getElementById(id);
let deps = null;
const pinScrolled = new WeakSet(); // pins already scrolled to
let tableMod = null; // archive-table.js, set once the lazy modules are loaded
let expandedFor = null; // product id whose long table is fully open
const getState = () => deps.getState();

// Announces polite status updates (e.g. random product selection) for screen readers.
let announceTimeoutId = null;
function announce(text) {
  const el = $('sr-status');
  if (!el) return;
  el.textContent = '';
  clearTimeout(announceTimeoutId);
  announceTimeoutId = setTimeout(() => { el.textContent = text; }, 60);
}

const ARCHIVE_ORDER_KEY = 'ne-kadardi-archive-order';
function loadArchiveNewestFirst() {
  try { return localStorage.getItem(ARCHIVE_ORDER_KEY) === 'newest'; } catch { return false; }
}
function saveArchiveNewestFirst(newest) {
  try { localStorage.setItem(ARCHIVE_ORDER_KEY, newest ? 'newest' : 'oldest'); } catch { /* storage unavailable */ }
}

// Cache the archive module promises once so opening or filtering the archive never re-imports them,
// and fetch linkify.js in parallel with archive-table.js instead of waiting for a second hop.
let archiveModulesPromise = null;
function loadArchiveModules() {
  archiveModulesPromise ??= Promise.all([
    import('./archive-table.js'),
    import('./search.js'),
    import('./linkify.js'),
  ]).catch((err) => {
    archiveModulesPromise = null;
    throw err;
  });
  return archiveModulesPromise;
}

// Shown when a lazy module cannot load (offline on first visit); the retry re-runs the render.
function showArchiveError(focusProductId) {
  let box = $('archive-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'archive-error';
    box.setAttribute('role', 'alert');
    const msg = document.createElement('p');
    msg.textContent = 'Arşiv yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-chip';
    btn.textContent = 'Yeniden dene';
    btn.addEventListener('click', () => renderTimelineScreen(focusProductId));
    box.append(msg, btn);
    $('timeline-screen').querySelector('.timeline-header').after(box);
  }
}

export async function renderTimelineScreen(focusProductId = null) {
  deps.show('timeline-screen');
  if (getState().timelines.length === 0) return;

  let filterByQuery;
  try {
    [tableMod, { filterByQuery }] = await loadArchiveModules();
  } catch (err) {
    console.warn('Arşiv yüklenemedi', err);
    showArchiveError(focusProductId);
    return;
  }

  $('archive-error')?.remove();
  renderCategoryChips();
  guessed = guessedProductIds(getState().seen, getState().timelines.map((t) => t.id));
  renderProgress();
  const inCategory = filterTimelines(getState().timelines, getState().timelineCategory);
  const visible = filterByQuery(inCategory, getState().timelineQuery);
  // With no search hit the chips are empty but the table keeps showing a product of the category.
  const pool = visible.length > 0 ? visible : inCategory;
  if (!pool.some(t => t.id === getState().selectedTimelineProduct)) {
    getState().selectedTimelineProduct = pool[0].id;
  }
  const product = pool.find(t => t.id === getState().selectedTimelineProduct);

  renderSearchState(visible.length, filterByQuery);
  productChanged = lastShownProduct !== null && lastShownProduct !== product.id;
  lastShownProduct = product.id;
  renderProductChips(visible, product.id, focusProductId);
  renderTimelineHeader(product);
  renderArchiveOrder();
  const seenDates = new Set(
    product.rows.filter((r) => getState().seen.has(`${product.id}@${r.date}`)).map((r) => r.date),
  );
  // Opened from a result or a Günün Fişi row: pin that question's date (only for that same product).
  // archivePin is cleared in nextQuestion/renderHome; archiveFromResult only controls the Back target.
  const pin = getState().archivePin?.productId === product.id ? getState().archivePin : null;
  if (pin && tableMod.pinHiddenByCollapse(product.rows, pin.date)) expandedFor = product.id;
  $('t-rows-container').innerHTML = tableMod.timelineTableHtml(product.rows, {
    newestFirst: getState().archiveNewestFirst, seenDates, expanded: expandedFor === product.id, pinnedDate: pin?.date ?? null,
  });
  if (productChanged) playOnce($('t-rows-container'), [{ opacity: 0 }, { opacity: 1 }], 180);
  renderPriceChart('t-chart', product.id, pin?.date ?? null);
  linkRowsToChart();
  if (pin && !pinScrolled.has(pin)) {
    pinScrolled.add(pin); // once per opening; later re-renders (order, search) must not jump
    const row = $('t-rows-container').querySelector('tr.is-pinned');
    const r = row?.getBoundingClientRect();
    if (r && (r.top < 0 || r.bottom > window.innerHeight)) row.scrollIntoView({ block: 'center' });
  }
}

// Products the player has answered at least once; refreshed on every render.
let guessed = new Set();
function renderProgress() {
  const el = $('archive-progress');
  const text = progressText(getState().timelines.length, guessed.size);
  el.textContent = text;
  el.hidden = text === '';
}

function renderCategoryChips() {
  const catPicker = $('category-picker');
  catPicker.textContent = '';
  for (const c of [{ id: 'all', label: 'Tümü' }, ...CATEGORIES]) {
    if (c.id !== 'all' && filterTimelines(getState().timelines, c.id).length === 0) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-chip';
    btn.setAttribute('aria-pressed', c.id === getState().timelineCategory ? 'true' : 'false');
    btn.dataset.cat = c.id;
    btn.textContent = c.label;
    btn.onclick = async () => {
      getState().timelineCategory = c.id;
      getState().selectedTimelineProduct = null; // pick the first product of the new category
      await renderTimelineScreen();
      catPicker.querySelector(`[data-cat="${c.id}"]`)?.focus({ preventScroll: true }); // the chips were rebuilt
    };
    catPicker.appendChild(btn);
  }
}

function renderSearchState(hits, filterByQuery) {
  const search = $('product-search');
  if (search.value !== getState().timelineQuery) search.value = getState().timelineQuery;
  $('product-count').textContent = `${hits} ürün`;
  $('product-empty').hidden = hits > 0;
  // With no hit, a receipt of some other product below would read like a search result.
  document.querySelector('#timeline-screen .receipt-wrapper').hidden = hits === 0;
  $('product-search-clear').hidden = getState().timelineQuery === '';
  // Offer the same query across all categories when only the selected category has no hit.
  const allBtn = $('search-all-cats');
  const elsewhere = hits === 0 && getState().timelineCategory !== 'all' && getState().timelineQuery.trim() !== ''
    ? filterByQuery(getState().timelines, getState().timelineQuery).length : 0;
  allBtn.hidden = elsewhere === 0;
  allBtn.textContent = `Tüm kategorilerde ara (${elsewhere} ürün)`;
  allBtn.onclick = async () => {
    getState().timelineCategory = 'all';
    getState().selectedTimelineProduct = null;
    await renderTimelineScreen();
    $('product-search').focus({ preventScroll: true });
  };
}

// Product shown by the previous render: motion plays only when the product actually changes.
let lastShownProduct = null;
let productChanged = false;
let diceSpin = false;
let snapTimer = null;
let pendingRestore = null;

function playOnce(el, frames, ms) {
  el?.getAnimations?.().forEach((a) => a.cancel());
  el?.animate?.(frames, { duration: ms, easing: 'ease-out' });
}

function renderProductChips(visible, selectedId, focusProductId) {
  const picker = $('timeline-picker');
  const prevLeft = picker.scrollLeft; // the rebuild resets it; restoring lets a tap glide from where the row was
  picker.textContent = '';
  if (visible.length > 1) {
    const dice = document.createElement('button');
    dice.type = 'button';
    dice.className = 'picker-chip';
    dice.dataset.random = 'true';
    dice.setAttribute('aria-label', 'Rastgele bir ürün aç');
    dice.innerHTML = '<span aria-hidden="true" class="dice-emoji">🎲</span> <span>Rastgele</span>';
    dice.onclick = () => {
      const id = tableMod.pickRandomId(visible.map((t) => t.id), selectedId);
      if (!id) return;
      diceSpin = true;
      const target = visible.find((t) => t.id === id);
      getState().selectedTimelineProduct = id;
      renderTimelineScreen(id);
      if (target?.name) announce(`${target.name} açıldı`);
    };
    picker.appendChild(dice);
    if (diceSpin) {
      diceSpin = false;
      playOnce(dice.firstElementChild, [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(180deg) scale(1.2)' }, { transform: 'rotate(360deg) scale(1)' }], 450);
    }
  }
  for (const t of visible) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-chip';
    btn.setAttribute('aria-pressed', t.id === selectedId ? 'true' : 'false');
    btn.dataset.id = t.id;
    btn.title = t.name; // the label is truncated with an ellipsis
    if (t.image) {
      const img = document.createElement('img');
      img.src = t.image.src;
      img.alt = '';
      btn.appendChild(img);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = t.name;
    btn.appendChild(nameSpan);
    if (guessed.has(t.id)) {
      // The mark is decorative; the accessible name says it instead.
      const mark = document.createElement('span');
      mark.className = 'chip-done';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '✓';
      btn.appendChild(mark);
      btn.setAttribute('aria-label', `${t.name}, tahmin ettin`);
      btn.title = `${t.name}, tahmin ettin`;
    }
    btn.onclick = () => {
      getState().selectedTimelineProduct = t.id;
      renderTimelineScreen(t.id); // the picker is rebuilt, so put keyboard focus back on the chosen chip
    };
    picker.appendChild(btn);
  }

  const chosen = picker.querySelector('[aria-pressed="true"]');
  if (!chosen) return;
  if (productChanged) picker.scrollLeft = prevLeft;
  if (focusProductId) chosen.focus({ preventScroll: true });
  // Centre the chosen chip inside its own row (the right edge fades out) without moving the page.
  const row = picker.getBoundingClientRect();
  const chip = chosen.getBoundingClientRect();
  const left = chip.left - row.left - (row.width - chip.width) / 2;
  if (!productChanged) { picker.scrollBy({ left, behavior: 'auto' }); return; }
  // scroll-snap would pull the glide (and the settled chip) to the chip's start edge; suspend it until
  // the player grabs the row again.
  picker.style.scrollSnapType = 'none';
  // Back on when the glide ends (scrollend), or after a short wait where scrollend is missing; keyboard and
  // wheel users never send the pointerdown the first version waited for. One pending timer at a time.
  clearTimeout(snapTimer);
  // A 0 px glide sends no scrollend, so drop the previous listener instead of letting them pile up.
  if (pendingRestore) picker.removeEventListener('scrollend', pendingRestore);
  const restore = () => {
    clearTimeout(snapTimer);
    picker.removeEventListener('scrollend', restore);
    if (pendingRestore === restore) pendingRestore = null;
    picker.style.scrollSnapType = '';
  };
  pendingRestore = restore;
  if ('onscrollend' in picker) picker.addEventListener('scrollend', restore);
  snapTimer = setTimeout(restore, 700);
  picker.scrollBy({ left, behavior: 'smooth' });
}

function renderTimelineHeader(product) {
  $('t-title').textContent = product.name;
  $('t-explain').textContent = product.explain ?? '';
  $('t-explain').hidden = !product.explain;
  $('t-unit').textContent = unitLine(product.unit, product.region);
  const tImg = $('t-image');
  tImg.hidden = !product.image;
  if (product.image) { tImg.src = product.image.src; tImg.onerror = () => { tImg.hidden = true; }; }
  if (productChanged) {
    if (product.image) playOnce(tImg, [{ transform: 'scale(0.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], 220);
    playOnce($('t-summary'), [{ opacity: 0 }, { opacity: 1 }], 180);
  }
  // One-line takeaway above the chart: oldest sourced price against the current one.
  const firstRow = product.rows[0];
  const nowRow = product.rows.find((r) => r.isCurrent);
  const summary = nowRow && nowRow !== firstRow
    ? `${formatPeriod(firstRow.date)} → ${formatPeriod(nowRow.date)}: ${formatIncrease(nowRow.price / firstRow.price)}`
    : '';
  $('t-summary').textContent = summary;
  $('t-summary').hidden = !summary;
  const playBtn = $('t-play');
  if (playBtn) {
    // Ask another product from the same category: this product's prices are right on screen.
    const q = pickFromCategory(getState().all, categoryOf(product.id), product.id, categoryOf);
    playBtn.hidden = !q;
    playBtn.onclick = q ? () => {
      // A detour out of Günün Fişi: this question must not land on the daily receipt.
      if (getState().daily) { getState().daily = null; deps.syncSkipBtn(); }
      history.pushState(null, '', '#tahmin');
      deps.nextQuestion(q.productId, q.date);
    } : null;
  }
  // Coming from a result, the way back is the game, not the menu.
  const back = $('timeline-back');
  const toResult = getState().archiveFromResult && getState().lastGameScreen === 'result-screen';
  // During Günün Fişi the run lives on #gunun-fisi; #tahmin would drop the player out of it.
  back.href = toResult ? (getState().daily ? '#gunun-fisi' : '#tahmin') : '#';
  back.textContent = toResult ? '← Sonuca dön' : '← Ana menü';
}

function renderArchiveOrder() {
  const newestFirst = getState().archiveNewestFirst;
  const orderBtn = $('archive-order');
  orderBtn.textContent = newestFirst ? 'Sıra: yeniden eskiye ↑' : 'Sıra: eskiden yeniye ↓';
  orderBtn.setAttribute('aria-pressed', newestFirst ? 'true' : 'false');
  orderBtn.title = newestFirst ? 'Sıra: yeniden eskiye. Değiştirmek için dokun.' : 'Sıra: eskiden yeniye. Değiştirmek için dokun.';
}

// Delegated once on the permanent container because renderTimelineScreen rebuilds the table often.
function linkRowsToChart() {
  const rowsContainer = $('t-rows-container');
  if (rowsContainer.dataset.chartLinked) return;
  rowsContainer.dataset.chartLinked = 'true';
  // Opens or closes the extra rows in place, so the scroll position and a chart-linked row survive.
  const setExpanded = (expanded) => {
    expandedFor = expanded ? getState().selectedTimelineProduct : null;
    const rows = rowsContainer.querySelectorAll('tr[data-extra]');
    rows.forEach((r) => { r.hidden = !expanded; });
    const toggle = rowsContainer.querySelector('.rows-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = tableMod.rowsToggleLabel(rows.length + tableMod.COLLAPSED_ROWS, expanded);
    }
  };
  // A chart point can point at a hidden row; the chart code only toggles a class, so watch for it and open the table.
  new MutationObserver(() => {
    const linked = rowsContainer.querySelector('tr.is-linked[hidden]');
    if (!linked) return;
    setExpanded(true);
    // While a finger slides across the chart ('hover') the page must stay put; it scrolls on lift.
    // Keyboard users are still on the chart, so only a pointer lift scrolls the row into view.
    if ($('t-chart').dataset.source === 'pointer') linked.scrollIntoView({ block: 'nearest' });
  }).observe(rowsContainer, { subtree: true, attributes: true, attributeFilter: ['class'] });
  rowsContainer.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('.rows-toggle')) {
      const toggle = e.target.closest('.rows-toggle');
      setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
      return;
    }
    const btn = e.target instanceof Element ? e.target.closest('.row-to-chart') : null;
    if (!btn) return;
    const fig = $('t-chart');
    fig._activateDate?.(btn.dataset.date);
    if (!fig.hidden) {
      fig.scrollIntoView({ block: 'nearest' });
    }
  });
}

// Wires the archive controls once; main.js calls this when the module is first loaded.
export function initArchiveUi(d) {
  deps = d;
  const state = getState();
  // The search input lives outside the rebuilt chip rows, so it keeps focus while typing.
  $('product-search').addEventListener('input', (e) => {
    state.timelineQuery = e.target.value;
    renderTimelineScreen();
  });
  const clearSearch = () => {
    state.timelineQuery = '';
    state.selectedTimelineProduct = null;
    renderTimelineScreen();
    $('product-search').focus({ preventScroll: true });
  };
  $('product-search-clear').addEventListener('click', clearSearch);
  $('product-search').addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target.value !== '') { e.preventDefault(); clearSearch(); }
  });
  state.archiveNewestFirst = loadArchiveNewestFirst();
  $('archive-order').addEventListener('click', () => {
    state.archiveNewestFirst = !state.archiveNewestFirst;
    saveArchiveNewestFirst(state.archiveNewestFirst);
    renderTimelineScreen();
    $('archive-order').focus({ preventScroll: true });
  });
}
