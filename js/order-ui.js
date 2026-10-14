// "Sırala" screen: tap four same-year prices from cheapest to most expensive. Logic lives in order.js.
import { pickOrderSet, correctOrder, scoreOrder } from './order.js';
import { formatPeriod, formatPrice } from './format.js';
import { questionTitle } from './share-model.js';
import { buildOrderShareText } from './mode-share.js';
import { shareTextFromButton } from './share-text.js';
import { isPlainKey, optionIndex } from './keys.js';

const STATS_KEY = 'ne-kadardi-order-stats';

const $ = (id) => document.getElementById(id);
const escapeHTML = (str) => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const round = { set: null, picked: [], checked: false, recent: [], questions: [], shareText: '' };
const stats = { rounds: 0, perfect: 0, total: 0 };

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    if (s && Number.isFinite(s.rounds)) Object.assign(stats, s);
  } catch (e) {}
}

function saveStats() {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
}

/** Menu card line, empty before the first round. */
export function orderMeta() {
  if (stats.rounds === 0) return '';
  return `${stats.rounds} set · ortalama ${Math.round(stats.total / stats.rounds)} · ${stats.perfect} kusursuz`;
}

// Decorative: the name next to it already says what the product is.
function iconHTML(q) {
  return q.image ? `<img class="o-icon" src="${escapeHTML(q.image.src)}" alt="" width="36" height="36" decoding="async">` : '';
}

function itemLabel(q) {
  return `${questionTitle(q)}, ${q.region ? `${q.unit}, ${q.region}` : q.unit}, ${formatPeriod(q.date)}`;
}

function renderPicking() {
  const list = $('o-items');
  list.innerHTML = '';
  for (const q of round.set.items) {
    const rank = round.picked.indexOf(q.id) + 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'order-item';
    btn.dataset.id = q.id;
    btn.setAttribute('aria-pressed', rank > 0 ? 'true' : 'false');
    btn.setAttribute('aria-label', rank > 0 ? `${itemLabel(q)}. Sıra ${rank}` : itemLabel(q));
    btn.innerHTML = `<span class="o-rank" aria-hidden="true">${rank > 0 ? rank : ''}</span>${iconHTML(q)}`
      + `<span class="o-body"><strong class="o-name">${escapeHTML(questionTitle(q))}</strong>`
      + `<span class="o-unit">${escapeHTML(q.region ? `${q.unit} · ${q.region}` : q.unit)} · ${escapeHTML(formatPeriod(q.date))}</span></span>`;
    list.appendChild(btn);
  }
  const full = round.picked.length === round.set.items.length;
  $('o-check').disabled = !full;
  $('o-reset').disabled = round.picked.length === 0;
}

function onItemClick(event) {
  const btn = event.target.closest('.order-item');
  if (!btn || round.checked) return;
  const id = btn.dataset.id;
  const at = round.picked.indexOf(id);
  // Tapping a ranked item un-ranks it and everything after it, so ranks stay 1..n without gaps.
  if (at >= 0) round.picked = round.picked.slice(0, at);
  else round.picked = [...round.picked, id];
  renderPicking();
  $('o-items').querySelector(`[data-id="${CSS.escape(id)}"]`)?.focus();
  if (round.picked.length === round.set.items.length) $('o-check').focus();
}

function renderChecked(res) {
  const byId = new Map(round.set.items.map((q) => [q.id, q]));
  const truth = correctOrder(round.set.items);
  const list = $('o-items');
  list.innerHTML = '';
  truth.forEach((id, i) => {
    const q = byId.get(id);
    const playerRank = round.picked.indexOf(id) + 1;
    const ok = playerRank === i + 1;
    const row = document.createElement('div');
    row.className = 'order-item order-row';
    row.dataset.state = ok ? 'win' : 'lose';
    row.innerHTML = `<span class="o-rank" aria-hidden="true">${i + 1}</span>${iconHTML(q)}`
      + `<span class="o-body"><strong class="o-name">${escapeHTML(questionTitle(q))}</strong>`
      + `<span class="o-unit">${escapeHTML(q.region ? `${q.unit} · ${q.region}` : q.unit)} · ${escapeHTML(formatPeriod(q.date))}</span></span>`
      + `<span class="o-price">${escapeHTML(formatPrice(q.price))}</span>`
      + `<span class="o-mark">${ok ? '✓' : `✗ <span class="o-yours">sen: ${playerRank}</span>`}</span>`;
    list.appendChild(row);
  });
  const marks = truth.map((id, i) => round.picked.indexOf(id) === i);
  round.shareText = buildOrderShareText(round.set.year, marks, res.score, location.href.split('#')[0] + '#sirala');
  $('o-feedback').textContent = res.perfect
    ? `Kusursuz! Puan ${res.score}.`
    : `Puan ${res.score} · ${res.correctPairs}/${res.totalPairs} çift doğru sırada.`;
}

function check() {
  if (round.checked || round.picked.length !== round.set.items.length) return;
  round.checked = true;
  const res = scoreOrder(round.set.items, round.picked);
  stats.rounds += 1;
  stats.total += res.score;
  if (res.perfect) stats.perfect += 1;
  saveStats();
  renderChecked(res);
  $('o-check').hidden = true;
  $('o-reset').hidden = true;
  $('o-next').hidden = false;
  $('o-share').hidden = false;
  $('o-next').focus();
}

function reset() {
  if (round.checked) return;
  round.picked = [];
  renderPicking();
  $('o-items').querySelector('.order-item')?.focus();
}

function newSet() {
  const set = pickOrderSet(round.questions, Math.random, round.recent);
  if (!set) return false;
  round.set = set;
  round.picked = [];
  round.checked = false;
  round.recent = [...round.recent, ...set.items.map((q) => q.id)].slice(-16);
  $('o-year').textContent = set.year;
  $('o-feedback').textContent = '';
  $('o-check').hidden = false;
  $('o-reset').hidden = false;
  $('o-next').hidden = true;
  $('o-share').hidden = true;
  renderPicking();
  return true;
}

/** `show` and `showMessage` come from main.js so screen switching stays in one place. */
export function renderOrder(show, showMessage) {
  if (!newSet()) { showMessage('Sıralanacak yeterli fiyat yok.'); return; }
  show('order-screen');
  $('o-title').focus();
}

export function initOrder(questions) {
  round.questions = questions;
  loadStats();
  $('o-items').addEventListener('click', onItemClick);
  document.addEventListener('keydown', (event) => {
    if ($('order-screen').hidden || round.checked || !isPlainKey(event)) return;
    const items = $('o-items').querySelectorAll('button.order-item');
    const i = optionIndex(event.key, items.length);
    if (i !== null) { event.preventDefault(); items[i].click(); }
  });
  $('o-check').addEventListener('click', check);
  $('o-reset').addEventListener('click', reset);
  $('o-share').addEventListener('click', (e) => shareTextFromButton(e.currentTarget, round.shareText));
  $('o-next').addEventListener('click', () => { if (newSet()) $('o-title').focus(); });
}
