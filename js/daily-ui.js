// Günün Fişi UI: storage, the menu card, the #gunun-fisi route and the end-of-run receipt card.
// main.js owns `state`; it is read through getters so there is never a second copy.
import { formatPeriod, escapeHTML } from './format.js';
import { FOLLOW_UP_IDS, streakAlive } from './game.js';
import { categoryOf } from './categories.js';
import { questionTitle } from './share-model.js';
import { resetShareBtn, shareTextWithStatus } from './share-ui.js';
import { dayKey, resolveSavedDaily, dailyQuestions, dailyTitle, dailyShareText, nextReceiptIn, trimLog, dailyStats, dailyMenuMeta, dailyTotalLine, dailyRowText, dailyReviewTotalLine } from './daily.js';

const $ = (id) => document.getElementById(id);
let deps = null;
const getState = () => deps.getState();

export function initDailyUi(d) {
  deps = d;
  initDailyReview();
}

// True on the turn that shows the daily receipt: the bar button then shares it directly.
let dailyEndTurn = false;
export const isDailyEndTurn = () => dailyEndTurn;
export function setDailyEndTurn(value) {
  dailyEndTurn = value;
}

const DAILY_KEY = 'ne-kadardi-daily';

function loadDaily() {
  try {
    const all = getState().all;
    const valid = all?.length ? new Set(all.map((q) => q.id)) : null;
    return resolveSavedDaily(JSON.parse(localStorage.getItem(DAILY_KEY)), dayKey(), valid);
  } catch(e) {}
  return null;
}

function saveDaily(daily) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify({
      key: daily.key,
      ids: daily.ids,
      scores: daily.scores,
    }));
  } catch(e) {}
  // Both finish paths (5th answer, last skip) save here, so the history is written once per run.
  if (daily.ids.length > 0 && daily.scores.length >= daily.ids.length) recordDailyTotal(daily.key, daily.scores);
}

const DAILY_LOG_KEY = 'ne-kadardi-daily-log';

function loadDailyLog() {
  try {
    return trimLog(JSON.parse(localStorage.getItem(DAILY_LOG_KEY)));
  } catch(e) {}
  return {};
}

function recordDailyTotal(key, scores) {
  try {
    const log = loadDailyLog();
    log[key] = scores.reduce((s, n) => s + n, 0);
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(trimLog(log)));
  } catch(e) {}
}

export function syncSkipBtn() {
  const btn = $('skip-btn');
  if (!btn) return;
  btn.innerHTML = getState().daily
    ? 'Bu soruyu geç <span class="skip-note">(0 puan sayılır)</span>'
    : 'Bu soruyu geç <span class="skip-note">(puanın düşmez)</span>';
}

// Records a scored answer of the running daily receipt (no-op outside a run).
export function recordDailyAnswer(score) {
  const state = getState();
  if (!state.daily) return;
  state.daily.scores.push(score);
  state.daily.index = state.daily.scores.length;
  saveDaily(state.daily);
}

// "productId@date" of the next daily question, or null when there is no unfinished run.
export function dailyNextId() {
  const state = getState();
  if (state.daily && state.daily.index < state.daily.ids.length) return state.daily.ids[state.daily.index];
  return null;
}

// Skip button during a daily run. Returns true when it handled the click.
export function skipDaily() {
  const state = getState();
  if (!state.daily) return false;
  state.daily.scores.push(0);
  state.daily.index = state.daily.scores.length;
  saveDaily(state.daily);
  if (state.daily.index < state.daily.ids.length) {
    const [productId, date] = state.daily.ids[state.daily.index].split('@');
    deps.nextQuestion(productId, date);
    return true;
  }
  // Skipping the last one has no result screen for the card, so show the finished receipt on the menu.
  const finished = { key: state.daily.key, ids: [...state.daily.ids], scores: [...state.daily.scores] };
  state.daily = null;
  state.question = null; // otherwise "Fiyat Tahmini" would reopen the skipped daily question
  syncSkipBtn();
  history.replaceState(null, '', '#');
  deps.renderHome();
  openDailyReview(finished);
  return true;
}

// The #gunun-fisi route: shows a finished receipt, otherwise starts or resumes the run.
export function startOrShareDaily() {
  const state = getState();
  const saved = loadDaily();
  // An unfinished run from before midnight keeps its own key, so its receipt is logged under that day.
  const key = saved?.key ?? dayKey();
  if (saved && saved.ids.length > 0 && saved.scores.length >= saved.ids.length) {
    history.replaceState(null, '', '#');
    deps.renderHome();
    openDailyReview(saved);
  } else {
    const ids = saved?.ids.length
      ? saved.ids
      // Everyone compares the same receipt, so it is built from everyday products only.
      : dailyQuestions(state.all.filter((q) => FOLLOW_UP_IDS.includes(q.productId)), key, categoryOf).map((q) => q.id);
    const scores = saved ? [...saved.scores] : [];
    state.daily = { key, ids, index: scores.length, scores };
    const [productId, date] = (ids[state.daily.index] ?? '').split('@');
    // The address stays #gunun-fisi during the run, so a reload picks the run up from storage.
    deps.nextQuestion(productId, date);
  }
}

// Rows with date, product, real price and score; shared by the end-of-run card and the review dialog.
function dailyLines(all, ids, scores) {
  return ids.map((id, i) => {
    const dq = all.find((x) => x.id === id);
    if (!dq) return { label: 'Soru', detail: `${scores[i] ?? 0} puan` };
    return dailyRowText({ date: dq.date, title: questionTitle(dq), price: dq.price, score: scores[i] ?? 0 });
  });
}

// Finished receipt from the menu: show the five rows again; sharing stays one tap away inside.
let reviewOpener = null;
// Kept for the share button: after midnight loadDaily() returns null and the tap would do nothing.
let reviewSaved = null;

// A lapsed streak (every receipt skipped) must not be advertised as a live one.
function reviewStreak() {
  const streak = getState().streak;
  return streakAlive(streak, dayKey()) ? streak.count ?? 0 : 0;
}

function openDailyReview(saved) {
  const state = getState();
  const dlg = $('daily-review');
  reviewSaved = saved;
  const total = saved.scores.reduce((s, n) => s + n, 0);
  $('daily-review-title').textContent = dailyTitle(saved.key);
  $('daily-review-lines').innerHTML = dailyLines(state.all, saved.ids, saved.scores)
    .map((l) => `<li><span>${escapeHTML(l.label)}</span><strong>${escapeHTML(l.detail)}</strong></li>`).join('');
  $('daily-review-total').textContent = dailyReviewTotalLine(total, reviewStreak());
  $('daily-review-next').textContent = nextReceiptIn();
  // A fresh open must not inherit "kopyalandı" from a share made just before closing.
  const shareBtn = $('daily-review-share');
  clearTimeout(shareBtn.restoreTimer);
  shareBtn.textContent = 'Fişini paylaş';
  shareBtn.dataset.label = 'Fişini paylaş';
  if (typeof dlg.showModal !== 'function') return;
  if (!dlg.open) {
    reviewOpener = document.activeElement;
    dlg.showModal();
  }
  shareBtn.focus();
}

// Called on every hash change: Back or a new route must not leave the modal over another screen.
export function closeDailyReview() {
  const dlg = document.getElementById('daily-review');
  if (dlg?.open) dlg.close();
}

// Minute tick while the dialog is open: refresh the countdown, close once the receipt is not today's.
function refreshDailyReview() {
  const dlg = document.getElementById('daily-review');
  if (!dlg?.open) return;
  if (reviewSaved?.key !== dayKey()) { dlg.close(); return; }
  $('daily-review-next').textContent = nextReceiptIn();
}

export function initDailyReview() {
  const dlg = $('daily-review');
  $('daily-review-close').addEventListener('click', () => dlg.close());
  // Back on a phone should close the dialog first; a same-hash history step fires popstate but no hashchange.
  window.addEventListener('popstate', () => { if (dlg.open) dlg.close(); });
  $('daily-review-share').addEventListener('click', () => {
    const saved = reviewSaved;
    if (!saved || saved.ids.length === 0) return;
    shareTextWithStatus(dailyShareText({
      key: saved.key,
      scores: saved.scores,
      url: location.origin + location.pathname,
      streak: reviewStreak(),
    }), $('daily-review-share'));
  });
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  dlg.addEventListener('close', () => {
    // The event is async: a close-then-reopen in one task (same-hash route) must not wipe the new state.
    if (dlg.open) return;
    const opener = reviewOpener;
    reviewOpener = null;
    reviewSaved = null;
    // Touch or URL opens leave no useful opener; fall back to the menu's daily card.
    if (opener && opener !== document.body && opener.isConnected && opener.offsetParent !== null) opener.focus();
    else document.querySelector('a.mode-daily')?.focus();
  });
}

// Report card branch for a daily run. Returns true when it handled the turn.
export function renderDailyCard() {
  const state = getState();
  if (!state.daily) return false;
  if (state.daily.scores.length < state.daily.ids.length) return true;
  const { key, ids, scores } = state.daily;
  state.daily = null;
  syncSkipBtn();
  // The run is over: a reload now should not reopen #gunun-fisi (that would share again).
  if (location.hash === '#gunun-fisi') history.replaceState(null, '', '#tahmin');
  const lines = dailyLines(state.all, ids, scores);
  const total = scores.reduce((s, n) => s + n, 0);
  state.reportCard = { daily: true, key, scores };
  $('r-card-title').textContent = dailyTitle(key);
  $('r-card-lines').innerHTML = lines.map((l) => `<li><span>${escapeHTML(l.label)}</span><strong>${escapeHTML(l.detail)}</strong></li>`).join('');
  $('r-card-avg').textContent = dailyTotalLine(total, dailyStats(loadDailyLog(), key).yesterday);
  // The bar button shares the receipt on this turn, so the card's own link would be a second button for it.
  dailyEndTurn = true;
  resetShareBtn();
  // The receipt is done: say that the next tap leaves it, instead of a plain "Sonraki soru".
  $('next-btn').textContent = 'Sonraki soru →';
  $('r-card').hidden = false;
  return true;
}

// The countdown text goes stale on a long-open menu; refresh it while the menu is visible.
let menuTimer = null;
function watchDailyMenu() {
  if (menuTimer) return;
  const menu = () => document.getElementById('home-screen');
  const refresh = () => {
    refreshDailyReview();
    if (document.visibilityState === 'visible' && menu() && !menu().hidden) renderDailyMenu();
  };
  document.addEventListener('visibilitychange', refresh);
  menuTimer = setInterval(refresh, 60000);
}

// Menu card: leaving a daily run for the menu ends it; the card picks the run up from storage.
export function renderDailyMenu() {
  const state = getState();
  if (state.daily) {
    state.daily = null;
    state.question = null;
    syncSkipBtn();
  }
  watchDailyMenu();
  const daily = loadDaily();
  const dailyDone = daily && daily.ids.length > 0 && daily.scores.length >= daily.ids.length;
  const dailyInProgress = daily && daily.scores.length > 0 && daily.scores.length < daily.ids.length;
  $('m-daily').textContent = dailyDone
    ? `Bugün ${daily.scores.reduce((s, n) => s + n, 0)}/500 · ${nextReceiptIn()}`
    : dailyInProgress ? `Bugün ${daily.scores.length}/${daily.ids.length} soru`
      : dailyMenuMeta(dailyStats(loadDailyLog(), dayKey()));
  const dailyGo = dailyDone ? 'Fişini gör →' : dailyInProgress ? 'Devam et →' : 'Başla →';
  $('m-daily-go').textContent = dailyGo;
  $('m-daily-go').dataset.label = dailyGo;
}
