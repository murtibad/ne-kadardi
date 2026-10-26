// Fiyat Arşivi screen: category/product chips, search, order toggle and the rows-to-chart link.
// main.js owns `state`; it is read through getters so there is never a second copy.
import { formatPeriod, formatIncrease } from './format.js';
import { CATEGORIES, filterTimelines, categoryOf } from './categories.js';
import { pickFromCategory } from './game.js';

const $ = (id) => document.getElementById(id);
let deps = null;
const getState = () => deps.getState();

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

export async function renderTimelineScreen(focusProductId = null) {
  deps.show('timeline-screen');
  if (getState().timelines.length === 0) return;

  let timelineTableHtml;
  let filterByQuery;
  try {
    [{ timelineTableHtml }, { filterByQuery }] = await loadArchiveModules();
  } catch (err) {
    console.warn('Arşiv yüklenemedi', err);
    return;
  }

  renderCategoryChips();
  const inCategory = filterTimelines(getState().timelines, getState().timelineCategory);
  const visible = filterByQuery(inCategory, getState().timelineQuery);
  // With no search hit the chips are empty but the table keeps showing a product of the category.
  const pool = visible.length > 0 ? visible : inCategory;
  if (!pool.some(t => t.id === getState().selectedTimelineProduct)) {
    getState().selectedTimelineProduct = pool[0].id;
  }
  const product = pool.find(t => t.id === getState().selectedTimelineProduct);

  renderSearchState(visible.length, filterByQuery);
  renderProductChips(visible, product.id, focusProductId);
  renderTimelineHeader(product);
  renderArchiveOrder();
  const seenDates = new Set(
    product.rows.filter((r) => getState().seen.has(`${product.id}@${r.date}`)).map((r) => r.date),
  );
  $('t-rows-container').innerHTML = timelineTableHtml(product.rows, { newestFirst: getState().archiveNewestFirst, seenDates });
  deps.renderPriceChart('t-chart', product.id);
  linkRowsToChart();
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

function renderProductChips(visible, selectedId, focusProductId) {
  const picker = $('timeline-picker');
  picker.textContent = '';
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
    btn.onclick = () => {
      getState().selectedTimelineProduct = t.id;
      renderTimelineScreen(t.id); // the picker is rebuilt, so put keyboard focus back on the chosen chip
    };
    picker.appendChild(btn);
  }

  const chosen = picker.querySelector('[aria-pressed="true"]');
  if (!chosen) return;
  if (focusProductId) chosen.focus({ preventScroll: true });
  // Centre the chosen chip inside its own row (the right edge fades out) without moving the page.
  const row = picker.getBoundingClientRect();
  const chip = chosen.getBoundingClientRect();
  picker.scrollBy({ left: chip.left - row.left - (row.width - chip.width) / 2,
    behavior: 'auto' });
}

function renderTimelineHeader(product) {
  $('t-title').textContent = product.name;
  $('t-unit').textContent = product.region ? `${product.unit} · ${product.region}` : product.unit;
  const tImg = $('t-image');
  tImg.hidden = !product.image;
  if (product.image) { tImg.src = product.image.src; tImg.onerror = () => { tImg.hidden = true; }; }
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
  back.href = toResult ? '#tahmin' : '#';
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
  rowsContainer.addEventListener('click', (e) => {
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
