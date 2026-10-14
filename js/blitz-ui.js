// "60 Saniye" screen: DOM and timer around the pure logic in blitz.js and versus.js.
import { pickPair, judgePair } from './versus.js';
import { startBlitz, remainingMs, answerBlitz, finishIfExpired, blitzSummary, formatSeconds, DURATION_MS } from './blitz.js';
import { formatPeriod } from './format.js';
import { questionTitle } from './share-model.js';

const BEST_KEY = 'ne-kadardi-blitz-best';
const TICK_MS = 200;
const FLASH_MS = 450; // long enough to see which side won, short enough to keep the pace

const $ = (id) => document.getElementById(id);
const escapeHTML = (str) => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const run = { state: null, pair: null, recent: [], timer: null, flash: null, locked: false, best: 0, questions: [] };

function loadBest() {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    if (Number.isFinite(n) && n > 0) run.best = n;
  } catch (e) {}
}

function saveBest() {
  try { localStorage.setItem(BEST_KEY, String(run.best)); } catch (e) {}
}

export function blitzBest() {
  return run.best;
}

function optionHTML(q) {
  return `<span class="v-period">${escapeHTML(formatPeriod(q.date))}</span>`
    + `<strong class="v-name">${escapeHTML(questionTitle(q))}</strong>`
    + `<span class="v-unit">${escapeHTML(q.region ? `${q.unit} · ${q.region}` : q.unit)}</span>`;
}

function setPanel(name) {
  $('bl-start').hidden = name !== 'start';
  $('bl-play').hidden = name !== 'play';
  $('bl-end').hidden = name !== 'end';
}

function renderClock() {
  const ms = run.state ? remainingMs(run.state, Date.now()) : DURATION_MS;
  $('bl-clock').textContent = formatSeconds(ms);
  $('bl-clock').dataset.low = ms <= 10000 ? 'true' : 'false';
  $('bl-score').textContent = run.state ? `${run.state.correct} doğru · ${run.state.wrong} yanlış` : '';
}

function nextPair() {
  const pair = pickPair(run.questions, Math.random, run.recent);
  if (!pair) { finish(); return; }
  run.pair = pair;
  run.recent = [...run.recent, pair.a.id, pair.b.id].slice(-12);
  for (const side of ['a', 'b']) {
    const btn = $(`bl-${side}`);
    btn.innerHTML = optionHTML(pair[side]);
    btn.disabled = false;
    delete btn.dataset.state;
  }
  run.locked = false;
}

function tick() {
  run.state = finishIfExpired(run.state, Date.now());
  renderClock();
  if (run.state.over) finish();
}

function onPick(side) {
  if (run.locked || !run.pair || !run.state || run.state.over) return;
  run.locked = true;
  const res = judgePair(run.pair, side);
  run.state = answerBlitz(run.state, res.correct, Date.now());
  for (const s of ['a', 'b']) {
    const btn = $(`bl-${s}`);
    btn.disabled = true;
    btn.dataset.state = s === res.winner ? 'win' : 'lose';
  }
  renderClock();
  if (run.state.over) { finish(); return; }
  run.flash = setTimeout(() => {
    run.flash = null;
    nextPair();
    $(`bl-${side}`).focus();
  }, FLASH_MS);
}

function finish() {
  stopBlitz();
  if (!run.state) return;
  const sum = blitzSummary(run.state);
  const isBest = sum.correct > run.best;
  if (isBest) { run.best = sum.correct; saveBest(); }
  $('bl-result').textContent = `${sum.correct} doğru`;
  $('bl-detail').textContent = `${sum.wrong} yanlış · %${sum.accuracy} isabet · en uzun seri ${run.state.bestStreak}`;
  $('bl-best').textContent = isBest && sum.correct > 0 ? 'Yeni rekor!' : `En iyi: ${run.best} doğru`;
  setPanel('end');
  $('bl-again').focus();
}

function start() {
  stopBlitz();
  run.state = startBlitz(Date.now());
  setPanel('play');
  nextPair();
  renderClock();
  run.timer = setInterval(tick, TICK_MS);
  $('bl-a').focus();
}

/** Stops the clock; called when the player leaves the screen so no timer runs in the background. */
export function stopBlitz() {
  if (run.timer) clearInterval(run.timer);
  if (run.flash) clearTimeout(run.flash);
  run.timer = null;
  run.flash = null;
}

/** Shows the start panel. A round never resumes after leaving: the clock would have kept running. */
export function renderBlitz(show) {
  stopBlitz();
  run.state = null;
  renderClock();
  $('bl-best-start').textContent = run.best > 0 ? `En iyi: ${run.best} doğru` : '';
  setPanel('start');
  show('blitz-screen');
  $('bl-title').focus();
}

export function initBlitz(questions) {
  run.questions = questions;
  loadBest();
  $('bl-start-btn').addEventListener('click', start);
  $('bl-again').addEventListener('click', start);
  $('bl-a').addEventListener('click', () => onPick('a'));
  $('bl-b').addEventListener('click', () => onPick('b'));
}
