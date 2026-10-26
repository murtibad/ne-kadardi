// Günün Fişi UI: storage, the menu card, the #gunun-fisi route and the end-of-run receipt card.
// main.js owns `state`; it is read through getters so there is never a second copy.
import { formatPeriod, escapeHTML } from './format.js';
import { FOLLOW_UP_IDS } from './game.js';
import { categoryOf } from './categories.js';
import { questionTitle } from './share-model.js';
import { resetShareBtn, shareTextWithStatus } from './share-ui.js';
import { dayKey, dailyQuestions, dailyTitle, dailyShareText, nextReceiptIn, trimLog, dailyStats, dailyMenuMeta, dailyTotalLine } from './daily.js';

const $ = (id) => document.getElementById(id);
let deps = null;
const getState = () => deps.getState();

export function initDailyUi(d) {
  deps = d;
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
    const data = JSON.parse(localStorage.getItem(DAILY_KEY));
    if (data && data.key === dayKey() && Array.isArray(data.ids) && Array.isArray(data.scores)) {
      return {
        key: data.key,
        ids: data.ids.filter((x) => typeof x === 'string'),
        scores: data.scores.filter(Number.isFinite),
      };
    }
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
  // Skipping the last one has no result screen for the card, so the menu offers the share.
  state.daily = null;
  state.question = null; // otherwise "Fiyat Tahmini" would reopen the skipped daily question
  syncSkipBtn();
  location.hash = '#';
  return true;
}

// The #gunun-fisi route: shares a finished receipt, otherwise starts or resumes the run.
export function startOrShareDaily() {
  const state = getState();
  const key = dayKey();
  const saved = loadDaily();
  if (saved && saved.ids.length > 0 && saved.scores.length >= saved.ids.length) {
    history.replaceState(null, '', '#');
    deps.renderHome();
    const text = dailyShareText({
      key: saved.key,
      scores: saved.scores,
      url: location.origin + location.pathname,
      streak: state.streak?.count ?? 0,
    });
    shareTextWithStatus(text, $('m-daily-go'));
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
  const lines = ids.map((id, i) => {
    const dq = state.all.find((x) => x.id === id);
    const label = dq ? `${formatPeriod(dq.date)} · ${questionTitle(dq)}` : id;
    return { label, score: scores[i] ?? 0 };
  });
  const total = scores.reduce((s, n) => s + n, 0);
  state.reportCard = { daily: true, key, scores };
  $('r-card-title').textContent = dailyTitle(key);
  $('r-card-lines').innerHTML = lines.map((l) => `<li><span>${escapeHTML(l.label)}</span><strong>${l.score}</strong></li>`).join('');
  $('r-card-avg').textContent = dailyTotalLine(total, dailyStats(loadDailyLog(), key).yesterday);
  // The bar button shares the receipt on this turn, so the card's own link would be a second button for it.
  dailyEndTurn = true;
  $('r-card-share').hidden = true;
  resetShareBtn();
  // The receipt is done: say that the next tap leaves it, instead of a plain "Sonraki soru".
  $('next-btn').textContent = 'Serbest oyuna geç →';
  $('r-card').hidden = false;
  return true;
}

// Menu card: leaving a daily run for the menu ends it; the card picks the run up from storage.
export function renderDailyMenu() {
  const state = getState();
  if (state.daily) {
    state.daily = null;
    state.question = null;
    syncSkipBtn();
  }
  const daily = loadDaily();
  const dailyDone = daily && daily.ids.length > 0 && daily.scores.length >= daily.ids.length;
  const dailyInProgress = daily && daily.scores.length > 0 && daily.scores.length < daily.ids.length;
  $('m-daily').textContent = dailyDone
    ? `Bugün ${daily.scores.reduce((s, n) => s + n, 0)}/500 · ${nextReceiptIn()}`
    : dailyInProgress ? `Bugün ${daily.scores.length}/${daily.ids.length} soru`
      : dailyMenuMeta(dailyStats(loadDailyLog(), dayKey()));
  const dailyGo = dailyDone ? 'Paylaş →' : dailyInProgress ? 'Devam et →' : 'Başla →';
  $('m-daily-go').textContent = dailyGo;
  $('m-daily-go').dataset.label = dailyGo;
}
