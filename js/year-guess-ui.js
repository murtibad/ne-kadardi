// "Hangi Yıl?" screen: a product and its price, pick the year. Logic lives in year-guess.js.
import { pickYearRound, judgeYear } from './year-guess.js';
import { formatPrice, formatPeriod } from './format.js';
import { questionTitle } from './share-model.js';
import { isPlainKey, optionIndex } from './keys.js';

const BEST_KEY = 'ne-kadardi-yearguess-best';

const $ = (id) => document.getElementById(id);

const game = { round: null, recent: [], streak: 0, best: 0, locked: false, questions: [] };

function loadBest() {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    if (Number.isFinite(n) && n > 0) game.best = n;
  } catch (e) {}
}

function saveBest() {
  try { localStorage.setItem(BEST_KEY, String(game.best)); } catch (e) {}
}

export function yearGuessBest() {
  return game.best;
}

function renderStreak() {
  $('yg-streak').textContent = game.streak;
  $('yg-best').textContent = game.best;
}

function newRound() {
  const round = pickYearRound(game.questions, Math.random, game.recent);
  if (!round) return false;
  game.round = round;
  game.locked = false;
  game.recent = [...game.recent, round.question.id].slice(-12);
  const q = round.question;
  const img = $('yg-image');
  if (q.image) {
    img.src = q.image.src;
    img.alt = q.image.alt;
    img.hidden = false;
  } else {
    img.hidden = true;
    img.removeAttribute('src');
  }
  $('yg-name').textContent = questionTitle(q);
  $('yg-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('yg-price').textContent = formatPrice(q.price);
  const box = $('yg-options');
  box.innerHTML = '';
  for (const year of round.options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'yg-option';
    btn.dataset.year = year;
    btn.textContent = year;
    box.appendChild(btn);
  }
  $('yg-feedback').textContent = '';
  $('yg-next').hidden = true;
  renderStreak();
  return true;
}

function onPick(event) {
  const btn = event.target.closest('.yg-option');
  if (!btn || game.locked || !game.round) return;
  game.locked = true;
  const res = judgeYear(game.round, Number(btn.dataset.year));
  game.streak = res.correct ? game.streak + 1 : 0;
  if (game.streak > game.best) { game.best = game.streak; saveBest(); }
  for (const b of $('yg-options').querySelectorAll('.yg-option')) {
    b.disabled = true;
    if (Number(b.dataset.year) === res.answer) b.dataset.state = 'win';
    else if (b === btn) b.dataset.state = 'lose';
  }
  // Month matters for fast-moving prices, so the feedback names the exact period.
  const period = formatPeriod(game.round.question.date);
  $('yg-feedback').textContent = res.correct
    ? `Doğru! ${period}.`
    : `Yanlış. Bu fiyat ${period} tarihine ait, ${res.off} yıl saptın.`;
  renderStreak();
  $('yg-next').hidden = false;
  $('yg-next').focus();
}

export function renderYearGuess(show, showMessage) {
  if (!newRound()) { showMessage('Yıl tahmini için yeterli fiyat yok.'); return; }
  show('yearguess-screen');
  $('yg-title').focus();
}

export function initYearGuess(questions) {
  game.questions = questions;
  loadBest();
  $('yg-options').addEventListener('click', onPick);
  document.addEventListener('keydown', (event) => {
    if ($('yearguess-screen').hidden || !isPlainKey(event)) return;
    const buttons = $('yg-options').querySelectorAll('.yg-option');
    const i = optionIndex(event.key, buttons.length);
    if (i !== null && !buttons[i].disabled) { event.preventDefault(); buttons[i].click(); }
  });
  $('yg-next').addEventListener('click', () => { if (newRound()) $('yg-title').focus(); });
}
