// UI wiring: loads data, renders screens, handles input. Logic lives in game.js and format.js.
import { parseGuess, formatPrice, formatRatio, formatPeriod, readAmount, formatIncrease, escapeHTML } from './format.js';
import { actualLabel, buildQuestions, isAmount, buildContextLine, buildContextModel, pickByCategory, scoreGuess, scoreTier, yearOf } from './game.js';
import { createSoundPlayer, soundForResult, haptic } from './sound.js';
import { buildTimelines } from './timeline.js';
import { timelineTableHtml } from './archive-table.js';
import { CATEGORIES, filterTimelines, categoryOf } from './categories.js';
import { filterByQuery } from './search.js';
import { sourceKindLabel } from './source-kind.js';
import { burstConfetti } from './confetti.js';
import { buildShareText, buildShareImageModel, buildShareFileName, verdictText, questionTitle } from './share-model.js';
import { buildTaxLine, taxBreakdown } from './tax.js';
import { cashierComment } from './cashier.js';
import { contextComment, hintComment, yearAnchor, ytlNote, stampTitle } from './banter.js';
import { buildHint, applyHintPenalty } from './hint.js';
import { VERSION } from './version.js';
import { pickFact } from './fact.js';
import { buildPriceChart, labelSide, refLabelAtStart } from './price-chart.js';
import { countUpFrames } from './count-up.js';

const DATA_URL = 'data/prices.json';
const $ = (id) => document.getElementById(id);
const sound = createSoundPlayer();
// Vibration follows the sound switch and the reduced-motion preference.
const hapticIfAllowed = (ms) => {
  if (!sound.isEnabled() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  haptic(ms);
};

const state = {
  recentProducts: [], 
  hinted: false, raw: null, all: [], timelines: [], question: null, result: null, 
  played: 0, total: 0, best: 0, round: 0, recentScores: [], 
  lastGameScreen: 'question-screen', selectedTimelineProduct: null, timelineCategory: 'all', timelineQuery: '',
  archiveFromResult: false 
};
let shareOriginalLabel = '';
let shareTimeoutId = null;

// The result screen shows the last few scores as coloured ticks, like a till roll tally.
const RECENT_MAX = 8;

function loadSession() {
  try {
    const data = JSON.parse(localStorage.getItem('ne-kadardi-session'));
    if (data && typeof data.played === 'number') {
      state.played = data.played;
      state.total = Number.isFinite(data.total) ? data.total : 0;
      // Older saves have no best; the field is optional.
      if (Number.isFinite(data.best)) state.best = data.best;
      if (Array.isArray(data.recent)) state.recentScores = data.recent.filter(Number.isFinite).slice(-RECENT_MAX);
    }
  } catch(e) {}
}

function saveSession() {
  try {
    localStorage.setItem('ne-kadardi-session', JSON.stringify({
      played: state.played,
      total: state.total,
      best: state.best,
      recent: state.recentScores
    }));
  } catch(e) {}
}

function show(screenId) {
  syncFooter(screenId);
  clearTimeout(handTimer);
  handTimer = null; // a stale id would make the next stopPrinting() hand over a receipt that was never torn
  $('question-screen').classList.remove('as-machine', 'folded');
  // Cancelled animations never reach onfinish, so undo their inline clipping here too.
  $('question-screen').getAnimations?.({ subtree: true })?.forEach((a) => a.cancel());
  $('question-screen').style.overflow = '';
  $('guess-form').style.overflow = '';
  for (const id of ['message-screen', 'home-screen', 'question-screen', 'result-screen', 'timeline-screen']) {
    const el = $(id);
    const wasHidden = el.hidden;
    el.hidden = id !== screenId;
    // Animate only newly revealed screens; result-screen has its own printer animation and message-screen is a static notice.
    if (id === screenId && wasHidden && id !== 'result-screen' && id !== 'message-screen') {
      el.classList.remove('screen-enter');
      void el.offsetWidth;
      el.classList.add('screen-enter');
      // Children run their own animations (fact card, chart line) that bubble up; wait for ours.
      const done = (e) => {
        if (e.target !== el) return;
        el.classList.remove('screen-enter');
        el.removeEventListener('animationend', done);
      };
      el.addEventListener('animationend', done);
    }
  }
}

// The footer's "Ana menü" link is pointless on the menu itself.
function syncFooter(screenId) {
  document.querySelector('.site-footer .footer-link').parentElement.hidden = screenId === 'home-screen';
}

function showGameScreen(screenId) {
  state.lastGameScreen = screenId;
  show(screenId);
}

function showMessage(text) {
  $('message-text').textContent = text;
  document.querySelector('#message-screen .skeleton').hidden = true; // only the first load shows the placeholder
  show('message-screen');
}

let downloadOriginalLabel = '';

function resetShareBtn() {
  if (shareTimeoutId !== null) {
    clearTimeout(shareTimeoutId);
    shareTimeoutId = null;
  }
  if (shareOriginalLabel) {
    $('share-btn').textContent = shareOriginalLabel;
    $('share-btn').removeAttribute('aria-busy');
  }
  if (downloadOriginalLabel) {
    $('download-btn').innerHTML = downloadOriginalLabel;
    $('download-btn').removeAttribute('aria-busy');
  }
}

// Button labels change silently for screen readers, so mirror transient feedback here.
// Clearing first makes an identical repeated message announce again.
let announceTimeoutId = null;
function announce(text) {
  const el = $('sr-status');
  el.textContent = '';
  clearTimeout(announceTimeoutId);
  announceTimeoutId = setTimeout(() => { el.textContent = text; }, 60);
}

function setBtnStatus(btnId, text) {
  if (shareTimeoutId !== null) clearTimeout(shareTimeoutId);
  announce(text);
  $(btnId).textContent = text;
  $(btnId).removeAttribute('aria-busy');
  shareTimeoutId = setTimeout(() => {
    resetShareBtn();
  }, 2000);
}

// `productId` starts with a question about one product (the home fact card's "Bunu tahmin et").
function nextQuestion(productId = null) {
  stopPrinting();
  state.archiveFromResult = false;
  resetShareBtn();
  if ($('r-tax-details')) {
    $('r-tax-details').hidden = true;
    $('r-tax-details').open = false;
  }
  const ofProduct = productId ? state.all.filter((x) => x.productId === productId) : [];
  // Avoid repeating the last question, unless it is the product's only one.
  const fresh = ofProduct.filter((x) => x.id !== state.question?.id);
  const pool = fresh.length ? fresh : ofProduct;
  const q = pool.length ? pool[Math.floor(Math.random() * pool.length)] : pickByCategory(state.all, state.recentProducts, state.question?.id);
  if (!q) {
    showMessage('Gösterilecek soru yok.');
    return;
  }
  // The first question appears without a tap, so only later ones beep like a barcode scanner.
  if (state.question) sound.play('beep');
  state.question = q;
  state.recentProducts.push(q.productId);
  if (state.recentProducts.length > 12) state.recentProducts.shift();
  const cat = CATEGORIES.find((c) => c.id === categoryOf(q.productId));
  // Skipped questions do not count, so the number matches "N soru" under the receipt.
  state.round = state.played + 1;
  $('q-round').textContent = cat ? `Soru ${state.round} · ${cat.label}` : `Soru ${state.round}`;
  $('q-period').textContent = formatPeriod(q.date);
  const anchor = yearAnchor(yearOf(q.date));
  $('q-anchor').textContent = anchor || '';
  $('q-anchor').hidden = !anchor;
  
  const img = $('q-image');
  img.classList.remove('pop');
  if (q.image) {
    void img.offsetWidth; // replay the pop for back-to-back questions
    img.classList.add('pop');
    img.src = q.image.src;
    img.alt = q.image.alt;
    img.hidden = false;
    img.onerror = () => { img.hidden = true; };
  } else {
    img.hidden = true;
    img.removeAttribute('src');
    img.alt = ''; // do not keep the previous product's alt text
  }

  $('q-name').textContent = questionTitle(q);
  $('q-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('guess-input').value = '';
  $('guess-readout').textContent = '';
  document.querySelector('#question-screen .guess-field')?.classList.remove('invalid');
  state.hinted = false;
  const hint = buildHint(q, state.all);
  $('hint-btn').hidden = !hint;
  $('hint-text').hidden = true;
  $('hint-btn').onclick = () => {
    sound.play('beep');
    state.hinted = true;
    $('hint-text').dataset.line = hintComment();
    $('hint-text').innerHTML = `<p class="hint-cashier">“${escapeHTML($('hint-text').dataset.line)}”</p><p class="hint-slip-title">İpucu · ${escapeHTML(hint[0].period)}</p>`
      + hint.map((l) => `<div class="hint-row"><span>${escapeHTML(l.label)}</span><strong>${escapeHTML(l.value)}</strong></div>`).join('');
    $('hint-text').hidden = false;
    $('hint-btn').hidden = true;
    $('guess-input').focus();
  };
  $('guess-error').textContent = '';
  showGameScreen('question-screen');
  window.scrollTo(0, 0); // "Sonraki soru" sits at the bottom of a long receipt
  $('guess-input').focus();
}

function onGuess(event) {
  event.preventDefault();
  const guess = parseGuess($('guess-input').value);
  // The dearest answer is a car (about 1,5 million); a longer number only breaks the receipt layout.
  const tooBig = guess !== null && guess >= 1e10;
  if (guess === null || tooBig) {
    $('guess-error').textContent = tooBig ? 'Bu sayı çok büyük, daha küçük bir fiyat yaz.' : 'Geçerli bir fiyat yaz (ör. 4,5).';
    const field = document.querySelector('#question-screen .guess-field');
    if (field) {
      field.classList.remove('invalid');
      void field.offsetWidth; // restart the shake if the user submits twice in a row
      field.classList.add('invalid');
    }
    $('guess-input').focus();
    return;
  }
  const q = state.question;
  const scored = scoreGuess(guess, q.price);
  state.result = { guess, ...scored, score: applyHintPenalty(scored.score, state.hinted), hinted: state.hinted };
  state.played += 1;
  state.total += state.result.score;
  state.best = Math.max(state.best, state.result.score);
  state.recentScores = [...state.recentScores, state.result.score].slice(-RECENT_MAX);
  saveSession();
  hapticIfAllowed(10);
  renderResult(q, state.result);
  printReceipt(soundForResult(state.result.score, state.result.direction === 'exact' ? 1 : state.result.factor));
}

// The receipt slides out of the printer slot while the printer sound plays, then gets torn off.
// Kept short (about a second) so it never stands between the player and the next question;
// a tap on the receipt finishes it at once, and reduced motion skips the slide.
const PRINT_MS = 1100;
let printTimer = null;
let handTimer = null;
let cancelPrint = null;
let countUpRaf = null;

// Stops the price count-up and leaves the real price on the receipt.
function stopCountUp() {
  if (countUpRaf !== null) {
    cancelAnimationFrame(countUpRaf);
    countUpRaf = null;
  }
  const el = $('r-actual');
  el?.removeAttribute('aria-hidden');
  if (el && state.question) el.textContent = formatPrice(state.question.price);
}

// Cancel any in-flight print timer, click listener, and printer audio when leaving the result screen early.
function stopPrinting() {
  sound.stop('print');
  stopCountUp();
  clearTimeout(printTimer);
  printTimer = null;
  // Torn but not yet handed over (left during the 0.3 s tear): finish the hand-over now.
  if (handTimer !== null) $('result-screen').classList.add('handed');
  clearTimeout(handTimer);
  handTimer = null;
  if (cancelPrint) {
    cancelPrint();
    cancelPrint = null;
  }
}

// One flow instead of two screens: on "Tahmin et" the question card stays on screen, folds its
// form away and becomes the till; the receipt prints out of the slot under it. After the tear the
// till slides up and away and the receipt is left floating on its own, "handed" to the player.
function turnIntoMachine() {
  const qs = $('question-screen');
  const form = $('guess-form');
  const h = form.offsetHeight;
  qs.hidden = false;
  qs.classList.add('as-machine');
  if (!(h > 0 && form.animate)) { qs.classList.add('folded'); return; }
  form.style.overflow = 'hidden';
  form.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0, paddingTop: '0px', marginTop: '0px' }], { duration: 220, easing: 'ease-in', fill: 'forwards' })
    .onfinish = (e) => {
      form.style.overflow = '';
      e.target.cancel();
      if (qs.classList.contains('as-machine')) qs.classList.add('folded');
    };
}

function handOver() {
  handTimer = null;
  const qs = $('question-screen');
  $('result-screen').classList.add('handed');
  if (qs.hidden || !qs.classList.contains('as-machine')) return;
  const h = qs.offsetHeight;
  if (!qs.animate) { qs.hidden = true; qs.classList.remove('as-machine', 'folded'); return; }
  qs.style.overflow = 'hidden';
  // The till slides up out of view while its space closes, so the receipt rises into its place.
  const timing = { duration: 380, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' };
  qs.querySelector('.question-card')?.animate([{ transform: 'none' }, { transform: `translateY(-${h}px)` }], timing);
  const anim = qs.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0.4 }], timing);
  anim.onfinish = () => {
    qs.style.overflow = '';
    if (state.lastGameScreen === 'result-screen') qs.hidden = true;
    qs.classList.remove('as-machine', 'folded');
  };
}

function printReceipt(extraSound) {
  const wrap = document.querySelector('#result-screen .receipt-wrapper');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  stopPrinting();
  wrap.classList.remove('printing', 'torn');
  $('result-screen').classList.remove('handed');
  $('next-btn').classList.remove('nudge');
  const finish = () => {
    sound.stop('print');
    stopCountUp();
    clearTimeout(printTimer);
    printTimer = null;
    wrap.removeEventListener('click', finish);
    cancelPrint = null;
    if ($('result-screen').hidden || !wrap.classList.contains('printing')) return;
    wrap.classList.remove('printing');
    wrap.classList.add('torn');
    sound.play('tear');
    if (extraSound) sound.play(extraSound);
    // New players tend to miss that there are more questions, so the button waves once.
    if (state.played <= 3) $('next-btn').classList.add('nudge');
    // The product icon bounces after a close guess and shakes after a way-off one once the receipt is out.
    if (state.result) {
      $('r-meter').style.setProperty('--score', `${state.result.score}%`);
      const tier = scoreTier(state.result.score);
      if (tier === 'great') $('r-image').classList.add('bounce');
      else if (tier === 'bad') $('r-image').classList.add('shake');
    }
    $('r-stamp').classList.add('stamped');
    if (state.result?.factor === 1) burstConfetti();
    // Let the tear finish (0.3 s) before the till leaves; reduced motion hands over at once.
    if (reduced) handOver();
    else handTimer = setTimeout(handOver, 320);
  };
  cancelPrint = () => {
    stopCountUp();
    wrap.removeEventListener('click', finish);
    wrap.classList.remove('printing');
    // Leaving mid-print (e.g. to the archive) must not strand an empty meter and a hidden stamp
    // on the receipt the player can come back to.
    if (state.result) $('r-meter').style.setProperty('--score', `${state.result.score}%`);
    $('r-stamp').classList.add('stamped');
    $('result-screen').classList.add('handed');
  };
  if (reduced) {
    wrap.classList.add('printing');
    finish();
    return;
  }
  turnIntoMachine();
  sound.play('print');
  const frames = countUpFrames(state.question.price, { frames: 60 });
  if (frames.length > 0 && typeof requestAnimationFrame === 'function') {
    const actualEl = $('r-actual');
    // renderResult already wrote the real price for the aria-live announcement; hide intermediate ticks.
    actualEl.setAttribute('aria-hidden', 'true');
    let i = 0;
    const tick = () => {
      actualEl.textContent = formatPrice(frames[i]);
      i += 1;
      if (i < frames.length) {
        countUpRaf = requestAnimationFrame(tick);
      } else {
        countUpRaf = null;
        actualEl.removeAttribute('aria-hidden');
      }
    };
    countUpRaf = requestAnimationFrame(tick);
  }
  void wrap.offsetWidth; // restart the CSS animation for back-to-back results
  wrap.classList.add('printing');
  wrap.addEventListener('click', finish);
  printTimer = setTimeout(finish, PRINT_MS);
}


function renderResultImage(q) {
  const img = $('r-image');
  img.classList.remove('bounce', 'shake');
  if (!q.image) { img.hidden = true; return; }
  img.src = q.image.src;
  img.hidden = false;
  img.onerror = () => { img.hidden = true; };
}

// Decorative before/after bars under the context sentence (the sentence stays the accessible text).
function renderContextBars(model) {
  const box = $('r-context-bars');
  const hasBars = Boolean(model && model.then != null && model.now != null);
  box.hidden = !hasBars;
  box.replaceChildren();
  $('r-context').classList.toggle('has-bars', hasBars);
  if (!hasBars) return;
  const max = Math.max(model.then, model.now) || 1;
  // More items per wage is better; more wages per item is worse; a share says which way itself.
  const higherIsBetter = model.kind === 'count' || (model.kind === 'share' && model.better === 'higher');
  const better = higherIsBetter ? model.now >= model.then : model.now <= model.then;
  const fmt = (v, unit) => {
    if (model.kind === 'count') return `${v.toLocaleString('tr-TR')} ${unit}`;
    if (model.kind === 'share') return `%${Math.round(v * 100).toLocaleString('tr-TR')}`;
    return `${formatRatio(v)} asgari ücret`;
  };
  [['O gün', model.then, '', model.unit], ['Bugün', model.now, model.now === model.then ? '' : better ? 'up' : 'down', model.nowUnit]].forEach(([label, value, tone, unit]) => {
    const row = document.createElement('div');
    row.className = 'ctx-row';
    const name = document.createElement('span');
    name.className = 'ctx-label';
    name.textContent = label;
    const track = document.createElement('span');
    track.className = 'ctx-track';
    const bar = document.createElement('span');
    bar.className = `ctx-bar ${tone}`.trim();
    bar.style.width = `${Math.max(4, (value / max) * 100)}%`;
    track.append(bar);
    const num = document.createElement('span');
    num.className = 'ctx-value';
    num.textContent = fmt(value, unit);
    row.append(name, track, num);
    box.append(row);
  });
}

function renderResult(q, r) {
  stopCountUp();
  $('r-stamp').classList.remove('stamped');
  $('r-title').textContent = `${formatPeriod(q.date)} · ${questionTitle(q)}`;
  renderResultImage(q, r);
  $('r-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('r-guess').textContent = formatPrice(r.guess);
  $('r-actual-label').textContent = actualLabel(q.productId);
  $('r-actual').textContent = formatPrice(q.price);
  $('r-verdict').textContent = verdictText(r);
  // Number, "/100" and the hint note are separate spans so CSS can size them; the text reads the same.
  const scoreEl = $('r-score');
  scoreEl.textContent = String(r.score);
  const max = document.createElement('span');
  max.className = 'score-max';
  max.textContent = '/100';
  scoreEl.append(max);
  if (r.hinted) {
    const hint = document.createElement('span');
    hint.className = 'score-hint';
    hint.textContent = ' (ipucu aldığın için %20 düştü)';
    scoreEl.append(hint);
  }
  const tier = scoreTier(r.score);
  const line = contextComment({ tier, direction: r.direction, factor: r.factor, productId: q.productId, category: categoryOf(q.productId), amount: isAmount(q.productId) })
    ?? cashierComment(tier, Math.random, { amount: isAmount(q.productId) });
  $('r-cashier').textContent = `“${line}”`;
  const ytl = ytlNote(yearOf(q.date), q.price);
  $('r-ytl').textContent = ytl || '';
  $('r-ytl').hidden = !ytl;
  document.querySelector('.verdict-box').dataset.tier = tier;
  document.querySelector('.score-box').dataset.tier = tier;
  const stamp = stampTitle(r.score);
  $('r-stamp').textContent = stamp || '';
  $('r-stamp').hidden = !stamp;
  $('r-stamp').dataset.tier = tier;
  // Hold the meter at 0% while the receipt is still inside the printer; printReceipt fills it on tear-off.
  $('r-meter').style.setProperty('--score', '0%');

  // The newest launch is both a question and the "current" price: no comparison with itself.
  const hasCurrent = q.current !== null && !(q.current.date === q.date && q.current.price === q.price);
  $('r-current-row').hidden = !hasCurrent;
  if (hasCurrent) {
    $('r-current-label').textContent = `${q.current.label || 'Güncel'} (${formatPeriod(q.current.date)})`;
    $('r-current').textContent = formatPrice(q.current.price);
    $('r-increase').textContent = formatIncrease(q.current.price / q.price);
  }

  renderPriceChart('r-chart', q.productId, q.date, r.guess);

  const contextText = buildContextLine(q, state.all);
  $('r-context').textContent = contextText || '';
  $('r-context').hidden = !contextText;
  renderContextBars(buildContextModel(q, state.all));

  const taxText = buildTaxLine(q);
  $('r-tax').textContent = taxText || '';
  $('r-tax').hidden = !taxText;
  renderTaxDetails(q);

  $('r-archive').textContent = isAmount(q.productId) ? 'Yıllar içindeki tutarları →' : 'Bu ürünün fiyat geçmişi →';
  $('r-archive').onclick = () => { state.selectedTimelineProduct = q.productId; state.timelineCategory = 'all'; state.timelineQuery = ''; state.archiveFromResult = true; };
  $('r-source').href = q.source.url;
  $('r-source').textContent = q.source.title;
  const kindLabel = sourceKindLabel(q.source.kind);
  $('r-source-kind').textContent = kindLabel ? ` · ${kindLabel}` : '';
  $('r-source-kind').hidden = !kindLabel;
  const avg = Math.round(state.total / state.played);
  const ticks = state.recentScores.map((s, i, a) => `<span class="tally-dot${i === a.length - 1 ? ' tally-last' : ''}" data-tier="${scoreTier(s)}" title="${s} puan"></span>`).join('');
  $('r-session').innerHTML = `<span>${state.played} soru · ortalama puan ${avg}${state.best > 0 ? ` · en yüksek ${state.best}` : ''}</span>`
    + (state.recentScores.length > 1 ? `<span class="tally" role="img" aria-label="Son ${state.recentScores.length} puan: ${state.recentScores.join(', ')}"><span class="tally-label" aria-hidden="true">son ${state.recentScores.length}</span>${ticks}</span>` : '');
  showGameScreen('result-screen');
  window.scrollTo(0, 0);
  $('r-receipt').focus({ preventScroll: true }); // the submit button just disappeared; read the receipt next
}

// Draws the product's sourced price history as a small log-scale line. The highlighted
// point is the question's date; the figcaption carries the same story for screen readers.
function renderPriceChart(figId, productId, highlightDate = null, guess = null) {
  const fig = $(figId);
  const t = state.timelines.find((x) => x.id === productId);
  const pad = { top: 22, right: 14, bottom: 22, left: 14 };
  const chart = t && buildPriceChart(t.rows, { width: 320, height: 132, highlightDate, refPrice: guess, pad });
  fig.hidden = !chart;
  if (!chart) { fig.innerHTML = ''; delete fig._activateDate; return; }
  const first = chart.points[0];
  const last = chart.points[chart.points.length - 1];
  const marked = chart.points.find((p) => p.highlight);
  // The question's own price wins when an end label would collide with it.
  const labels = [first, last, marked].filter((p, i, a) => p && a.indexOf(p) === i
    && (!marked || p === marked || Math.abs(p.x - marked.x) > 52));
  // Keep end labels inside the box: anchor them towards the middle.
  const anchor = (p) => (p.x < chart.width * 0.25 ? 'start' : p.x > chart.width * 0.75 ? 'end' : 'middle');
  // A close guess sits right on the data: put its label at the end whose points are farther away.
  const refStart = chart.ref && refLabelAtStart(chart, 110);
  const refLine = chart.ref
    ? `<line x1="${pad.left}" y1="${chart.ref.y}" x2="${chart.width - pad.right}" y2="${chart.ref.y}" class="pc-ref"/><text x="${refStart ? pad.left : chart.width - pad.right}" y="${chart.ref.y < 20 ? chart.ref.y + 12 : chart.ref.y - 5}" text-anchor="${refStart ? 'start' : 'end'}" class="pc-ref-label">Tahminin ${escapeHTML(formatPrice(guess))}${chart.ref.off === 'above' ? ' ↑' : chart.ref.off === 'below' ? ' ↓' : ''}</text>`
    : '';
  const dots = chart.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.highlight ? 5.5 : 2.5}" class="${p.highlight ? 'pc-mark' : p.isCurrent ? 'pc-now' : 'pc-dot'}"/>`).join('');
  const hits = chart.points.map((p, i) => `<circle class="pc-hit" cx="${p.x}" cy="${p.y}" r="12" data-i="${i}"/>`).join('');
  // A marked point in the middle leans its label away from the steeper side of the line.
  const markSide = marked && anchor(marked) === 'middle' ? labelSide(chart.points, chart.points.indexOf(marked)) : 'middle';
  const labelX = (p) => (p !== marked || markSide === 'middle' ? p.x : markSide === 'left' ? p.x - 6 : p.x + 6);
  const labelAnchor = (p) => (p !== marked || markSide === 'middle' ? anchor(p) : markSide === 'left' ? 'end' : 'start');
  const priceLabels = labels.map((p) => `<text x="${labelX(p)}" y="${Math.max(11, p.y - 9)}" text-anchor="${labelAnchor(p)}" class="${p.highlight ? 'pc-label pc-label-mark' : 'pc-label'}">${escapeHTML(formatPrice(p.price))}</text>`).join('');
  // Drop a year label that would touch the one shown before it or the last one (which always stays).
  // A year label is about 36 units wide: centred ones take half each side, the first grows right and the last left.
  const gap = (aEdge, bEdge) => (aEdge ? 36 : 18) + (bEdge ? 36 : 18) + 4;
  const all = chart.xTicks;
  const shownTicks = [];
  all.forEach((tk, i) => {
    const last = i === all.length - 1;
    const prev = shownTicks[shownTicks.length - 1];
    if (last || ((!prev || tk.x - prev.x >= gap(shownTicks.length === 1, false))
      && all[all.length - 1].x - tk.x >= gap(i === 0, true))) shownTicks.push(tk);
  });
  const ticks = shownTicks.map((tk, i, a) => `<text x="${tk.x}" y="${chart.height - 6}" text-anchor="${i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle'}" class="pc-tick">${tk.label}</text>`).join('');
  const story = `${formatPeriod(first.date)}: ${formatPrice(first.price)}, ${formatPeriod(last.date)}: ${formatPrice(last.price)}`
    + (marked && marked !== first && marked !== last ? `; işaretli ${formatPeriod(marked.date)}: ${formatPrice(marked.price)}` : '')
    + (chart.ref ? `; tahminin: ${formatPrice(guess)}` : '');
  // Redraw the line only for a new product, not on every archive re-render (search keystrokes, chips).
  const key = `${productId}|${highlightDate}`;
  const fresh = fig.dataset.key !== key;
  fig.dataset.key = key;
  fig.innerHTML = `<svg class="${fresh ? 'pc-draw' : ''}" viewBox="0 0 ${chart.width} ${chart.height}" tabindex="0" role="img" aria-label="Fiyat grafiği. ${escapeHTML(story)}">
      <path d="${chart.area}" class="pc-area"/>
      <path d="${chart.line}" class="pc-line"/>
      ${refLine}${dots}${priceLabels}${ticks}${hits}
      <g class="pc-tip" hidden><rect rx="3" height="30"/><text><tspan class="pc-tip-period"></tspan><tspan class="pc-tip-price"></tspan></text></g>
    </svg>
    <span class="visually-hidden" aria-live="polite"></span>
    <figcaption>Yıllar içinde ${isAmount(productId) ? 'tutarı' : 'fiyatı'}</figcaption>`;
  bindPriceChart(fig, chart, figId === 't-chart' ? (point, source) => {
    const rows = $('t-rows-container').querySelectorAll('tr[data-date]');
    let match = null;
    for (const r of rows) {
      const active = point !== null && r.dataset.date === point.date;
      r.classList.toggle('is-linked', active);
      if (active) match = r;
    }
    // Scroll only when the row is off screen, so the tapped chart does not jump away.
    const rect = match?.getBoundingClientRect();
    if (match && source === 'pointer' && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      match.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
  } : undefined);
}

// Wires pointer and keyboard inspection onto the rendered chart SVG without global state.
function bindPriceChart(fig, chart, onActive) {
  const { points, width } = chart;
  const svgEl = fig.querySelector('svg');
  const tip = svgEl.querySelector('.pc-tip');
  const rect = tip.querySelector('rect');
  const periodTspan = tip.querySelector('.pc-tip-period');
  const priceTspan = tip.querySelector('.pc-tip-price');
  const dotEls = svgEl.querySelectorAll('.pc-dot, .pc-now, .pc-mark');
  const live = fig.querySelector('[aria-live]');
  const markedIdx = points.findIndex((p) => p.highlight);
  let activeIdx = markedIdx >= 0 ? markedIdx : points.length - 1;

  const showTip = (idx, viaKeyboard = false, source = viaKeyboard ? 'keyboard' : 'pointer') => {
    const p = points[idx];
    if (!p) return;
    dotEls.forEach((d, i) => d.classList.toggle('pc-active', i === idx));
    activeIdx = idx;
    const period = formatPeriod(p.date) + (p.isCurrent ? ' · güncel' : '');
    const price = formatPrice(p.price);
    const boxW = Math.ceil(Math.max(period.length, price.length) * 6.2 + 12);
    const boxX = Math.max(0, Math.min(width - boxW, Math.round(p.x - boxW / 2)));
    const boxY = p.y < 40 ? p.y + 8 : p.y - 38;
    rect.setAttribute('x', boxX);
    rect.setAttribute('y', boxY);
    rect.setAttribute('width', boxW);
    periodTspan.setAttribute('x', boxX + 6);
    periodTspan.setAttribute('y', boxY + 12);
    periodTspan.textContent = period;
    priceTspan.setAttribute('x', boxX + 6);
    priceTspan.setAttribute('y', boxY + 24);
    priceTspan.textContent = price;
    tip.hidden = false;
    tip.removeAttribute('hidden');
    if (viaKeyboard && live) live.textContent = `${period}: ${price}`;
    onActive?.(p, source);
  };

  const hideTip = () => {
    dotEls.forEach((d) => d.classList.remove('pc-active'));
    tip.hidden = true;
    tip.setAttribute('hidden', '');
    onActive?.(null, null);
  };

  // Lets the archive table highlight and announce a chart point by date when a row is tapped.
  fig._activateDate = (date) => {
    const idx = points.findIndex((p) => p.date === date);
    if (idx >= 0) showTip(idx, true, 'keyboard');
  };

  const handle = (e) => {
    if (e.type === 'pointerenter' || e.type === 'pointerdown') {
      const hit = e.target instanceof Element ? e.target.closest('.pc-hit') : null;
      if (hit) showTip(Number(hit.dataset.i), false, e.type === 'pointerdown' ? 'pointer' : 'hover');
    } else if (e.type === 'pointerleave') {
      if (e.pointerType !== 'touch' && e.target === svgEl) hideTip();
    } else if (e.type === 'blur') {
      hideTip();
    } else if (e.type === 'keydown') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const next = Math.max(0, Math.min(points.length - 1, activeIdx + step));
        showTip(next, true, 'keyboard');
      } else if (e.key === 'Escape') {
        hideTip();
      }
    }
  };

  svgEl.addEventListener('pointerenter', handle, true);
  svgEl.addEventListener('pointerdown', handle);
  svgEl.addEventListener('pointerleave', handle);
  svgEl.addEventListener('blur', handle);
  svgEl.addEventListener('keydown', handle);
}

function renderTaxDetails(q) {
  const details = $('r-tax-details');
  const body = $('r-tax-body');
  if (!details || !body) return;

  const tb = (q?.tax && q?.price && q?.date) ? taxBreakdown(q.price, q.date, q.tax) : null;
  if (!tb) {
    details.hidden = true;
    details.open = false;
    body.innerHTML = '';
    return;
  }

  const rows = [
    { label: 'Vergisiz fiyat', amount: tb.base },
  ];
  if (tb.rates.kultur > 0) {
    rows.push({
      label: `Kültür Bakanlığı payı (%${Math.round(tb.rates.kultur * 100)})`,
      amount: tb.kultur,
    });
  }
  if (tb.rates.trt > 0) {
    rows.push({
      label: `TRT bandrolü (%${Math.round(tb.rates.trt * 100)})`,
      amount: tb.trt,
    });
  }
  if (tb.rates.otv > 0) {
    rows.push({
      label: `ÖTV (%${Math.round(tb.rates.otv * 100)})`,
      amount: tb.otv,
    });
  }
  if (tb.rates.kdv > 0) {
    rows.push({
      label: `KDV (%${Math.round(tb.rates.kdv * 100)})`,
      amount: tb.kdv,
    });
  }

  let tableHtml = `<table class="tax-details-table"><caption class="visually-hidden">Vergi dökümü</caption><tbody>`;
  for (const row of rows) {
    tableHtml += `<tr><th scope="row">${row.label}</th><td>${formatPrice(Math.round(row.amount))}</td></tr>`;
  }
  tableHtml += `<tr class="tax-total-row"><th scope="row">Toplam vergi</th><td>${formatPrice(Math.round(tb.total))}</td></tr>`;
  tableHtml += `</tbody></table>`;

  const caveatHtml = `<p class="tax-caveat">Vergi payı tahminidir; perakende marjı ayrı hesaplanmadı.</p>`;

  let sourcesHtml = '';
  if (Array.isArray(tb.period.sources) && tb.period.sources.length > 0) {
    const links = tb.period.sources
      .map((s) => `<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title)}</a>`)
      .join(' · ');
    sourcesHtml = `<p class="tax-period-sources">Kaynaklar: ${links}</p>`;
  }

  body.innerHTML = tableHtml + caveatHtml + sourcesHtml;
  details.hidden = false;
  details.open = false;
}

async function prepareShareImage(btnId) {
  const btn = $(btnId);
  if (btn.hasAttribute('aria-busy')) return null;
  
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = 'Hazırlanıyor…';
  announce('Hazırlanıyor…');

  // Everything after the busy mark sits in the try, so a failure never leaves the button stuck on "Hazırlanıyor…".
  try {
    const q = state.question;
    const r = state.result;
    const contextText = buildContextLine(q, state.all);
    const model = buildShareImageModel(q, r, { contextLine: contextText });
    const t = state.timelines.find((t) => t.id === q.productId);
    model.chart = t
      ? buildPriceChart(t.rows, { width: 760, height: 260, highlightDate: q.date, refPrice: r.guess, pad: { top: 40, right: 24, bottom: 44, left: 24 } })
      : null;
    // After a few rounds the stamp rates the whole session instead of this one guess.
    if (state.played >= 3) model.stamp = stampTitle(state.total / state.played) ?? model.stamp;
    const { renderShareImage } = await import('./share-image.js');
    return await renderShareImage(model);
  } catch (err) {
    console.warn('Görsel hazırlanamadı', err);
    return null;
  }
}

function canShareImageFiles() {
  try {
    return Boolean(navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
  } catch {
    return false;
  }
}

async function share() {
  const q = state.question;
  const r = state.result;
  const text = buildShareText(q, r, location.href);
  if ($('share-btn').hasAttribute('aria-busy')) return;

  // Only draw the image when the browser can actually share files (mostly phones).
  const filesSupported = canShareImageFiles();
  const blob = filesSupported ? await prepareShareImage('share-btn') : null;

  if (blob) {
    const file = new File([blob], buildShareFileName(q), { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      resetShareBtn();
      try {
        await navigator.share({ files: [file], text });
      } catch (err) {
        if (err.name !== 'AbortError') console.warn(err);
      }
      return;
    }
  }

  // Text fallback: share sheet without files, or copy to the clipboard.
  try {
    if (navigator.share) {
      resetShareBtn();
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      setBtnStatus('share-btn', filesSupported ? 'Görsel hazırlanamadı, metin kopyalandı.' : 'Kopyalandı!');
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.warn(err);
    resetShareBtn();
  }
}

let previewUrl = null;
let previewFile = null;

function closePreview() {
  const dlg = $('share-preview');
  if (dlg.open) dlg.close();
}

function cleanupPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  previewFile = null;
  $('share-preview-img').removeAttribute('src');
}

function saveFromPreview() {
  if (!previewUrl) return;
  const a = document.createElement('a');
  a.href = previewUrl;
  a.download = previewFile.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  announce('İndiriliyor…');
}

async function sharePreviewFile() {
  if (!previewFile) return;
  const text = buildShareText(state.question, state.result, location.href);
  try {
    if (navigator.canShare({ files: [previewFile] })) await navigator.share({ files: [previewFile], text });
  } catch (err) {
    if (err.name !== 'AbortError') console.warn(err);
  }
}

// "İndir" first shows what will be saved, so players know the image before it leaves the page.
async function downloadImage() {
  const btn = $('download-btn');
  if (btn.hasAttribute('aria-busy')) return;

  const blob = await prepareShareImage('download-btn');
  if (!blob) {
    setBtnStatus('download-btn', 'Görsel hazırlanamadı.');
    return;
  }
  resetShareBtn();
  // The player may have left the result while the image was drawn.
  if ($('result-screen').hidden) return;

  cleanupPreview();
  previewFile = new File([blob], buildShareFileName(state.question), { type: 'image/png' });
  previewUrl = URL.createObjectURL(blob);
  const dlg = $('share-preview');
  if (typeof dlg.showModal !== 'function') {
    // Very old browsers have no <dialog>: download straight away as before.
    saveFromPreview();
    cleanupPreview();
    return;
  }
  $('share-preview-img').src = previewUrl;
  $('share-preview-share').hidden = !canShareImageFiles();
  dlg.showModal();
  $('share-preview-save').focus();
  announce('Görsel hazır.'); // replaces "Hazırlanıyor…" for screen readers
}

function initSharePreview() {
  const dlg = $('share-preview');
  $('share-preview-save').addEventListener('click', saveFromPreview);
  $('share-preview-share').addEventListener('click', sharePreviewFile);
  $('share-preview-close').addEventListener('click', closePreview);
  // Backdrop clicks target the dialog itself, but so do clicks on its padding: check the box.
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closePreview();
  });
  dlg.addEventListener('close', () => {
    cleanupPreview();
    if (!$('result-screen').hidden) $('download-btn').focus();
  });
}

const ARCHIVE_ORDER_KEY = 'ne-kadardi-archive-order';
function loadArchiveNewestFirst() {
  try { return localStorage.getItem(ARCHIVE_ORDER_KEY) === 'newest'; } catch { return false; }
}
function saveArchiveNewestFirst(newest) {
  try { localStorage.setItem(ARCHIVE_ORDER_KEY, newest ? 'newest' : 'oldest'); } catch { /* storage unavailable */ }
}

function renderTimelineScreen(focusProductId = null) {
  show('timeline-screen');
  if (state.timelines.length === 0) return;

  renderCategoryChips();
  const inCategory = filterTimelines(state.timelines, state.timelineCategory);
  const visible = filterByQuery(inCategory, state.timelineQuery);
  // With no search hit the chips are empty but the table keeps showing a product of the category.
  const pool = visible.length > 0 ? visible : inCategory;
  if (!pool.some(t => t.id === state.selectedTimelineProduct)) {
    state.selectedTimelineProduct = pool[0].id;
  }
  const product = pool.find(t => t.id === state.selectedTimelineProduct);

  renderSearchState(visible.length);
  renderProductChips(visible, product.id, focusProductId);
  renderTimelineHeader(product);
  renderArchiveOrder();
  $('t-rows-container').innerHTML = timelineTableHtml(product.rows, { newestFirst: state.archiveNewestFirst });
  renderPriceChart('t-chart', product.id);
  linkRowsToChart();
}

function renderCategoryChips() {
  const catPicker = $('category-picker');
  catPicker.textContent = '';
  for (const c of [{ id: 'all', label: 'Tümü' }, ...CATEGORIES]) {
    if (c.id !== 'all' && filterTimelines(state.timelines, c.id).length === 0) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-chip';
    btn.setAttribute('aria-pressed', c.id === state.timelineCategory ? 'true' : 'false');
    btn.dataset.cat = c.id;
    btn.textContent = c.label;
    btn.onclick = () => {
      state.timelineCategory = c.id;
      state.selectedTimelineProduct = null; // pick the first product of the new category
      renderTimelineScreen();
      catPicker.querySelector(`[data-cat="${c.id}"]`)?.focus({ preventScroll: true }); // the chips were rebuilt
    };
    catPicker.appendChild(btn);
  }
}

function renderSearchState(hits) {
  const search = $('product-search');
  if (search.value !== state.timelineQuery) search.value = state.timelineQuery;
  $('product-count').textContent = `${hits} ürün`;
  $('product-empty').hidden = hits > 0;
  // With no hit, a receipt of some other product below would read like a search result.
  document.querySelector('#timeline-screen .receipt-wrapper').hidden = hits === 0;
  $('product-search-clear').hidden = state.timelineQuery === '';
  // Offer the same query across all categories when only the selected category has no hit.
  const allBtn = $('search-all-cats');
  const elsewhere = hits === 0 && state.timelineCategory !== 'all' && state.timelineQuery.trim() !== ''
    ? filterByQuery(state.timelines, state.timelineQuery).length : 0;
  allBtn.hidden = elsewhere === 0;
  allBtn.textContent = `Tüm kategorilerde ara (${elsewhere} ürün)`;
  allBtn.onclick = () => {
    state.timelineCategory = 'all';
    state.selectedTimelineProduct = null;
    renderTimelineScreen();
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
      state.selectedTimelineProduct = t.id;
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
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
  // Coming from a result, the way back is the game, not the menu.
  const back = $('timeline-back');
  const toResult = state.archiveFromResult && state.lastGameScreen === 'result-screen';
  back.href = toResult ? '#tahmin' : '#';
  back.textContent = toResult ? '← Sonuca dön' : '← Ana menü';
}

function renderArchiveOrder() {
  const newestFirst = state.archiveNewestFirst;
  const orderBtn = $('archive-order');
  orderBtn.textContent = newestFirst ? 'Yeniden eskiye ↑' : 'Eskiden yeniye ↓';
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
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      fig.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
  });
}

function renderHome() {
  state.archiveFromResult = false;
  $('m-tahmin').textContent = state.played > 0
    ? `${state.played} soru · ortalama puan ${Math.round(state.total / state.played)}` + (state.best > 0 ? ` · en yüksek ${state.best}` : '')
    : '';
  const prices = state.timelines.reduce((n, t) => n + t.rows.length, 0);
  $('home-stats').textContent = `${state.timelines.length} ürün · ${prices} gerçek fiyat`;
  $('home-stats').hidden = state.timelines.length === 0;
  if (!$('fact-body').hasChildNodes()) renderFact();
  renderHomeSpark();
  // Coming back to the menu does not reset the game, so say so instead of "Başla".
  $('m-go').textContent = !state.question ? 'Başla →'
    : state.lastGameScreen === 'result-screen' ? `Sonuca dön · Soru ${state.round} →` : `Devam et · Soru ${state.round} →`;
  $('how-to').hidden = state.played > 0; // only first-time players need the three steps
  show('home-screen');
}

// A tiny gold-price line on the archive card hints at what is inside; decorative only.
function renderHomeSpark() {
  const el = $('m-spark');
  if (el.hasChildNodes()) return;
  const t = state.timelines.find((x) => x.id === 'gram-altin') ?? state.timelines[0];
  const chart = t && buildPriceChart(t.rows, { width: 44, height: 18, pad: { top: 3, right: 3, bottom: 3, left: 3 } });
  if (!chart) return;
  const last = chart.points[chart.points.length - 1];
  el.innerHTML = `<svg viewBox="0 0 44 18" width="44" height="18" focusable="false"><path d="${chart.line}"/><circle cx="${last.x}" cy="${last.y}" r="2.5"/></svg>`;
}

let lastFactId = null;
function renderFact() {
  const f = pickFact(state.timelines, { skipId: lastFactId });
  $('fact-card').hidden = !f;
  if (!f) return;
  lastFactId = f.productId;
  const img = f.image ? `<img src="${escapeHTML(f.image.src)}" alt="" width="40" height="40" class="fact-img">` : '';
  $('fact-body').innerHTML = `
    <p class="fact-product">${img}<span><strong>${escapeHTML(f.name)}</strong><small>${escapeHTML(f.unit)}</small></span></p>
    <div class="fact-pair">
      <p class="fact-then"><span>${escapeHTML(f.thenLabel)}</span><strong>${escapeHTML(f.thenPrice)}</strong></p>
      <p class="fact-arrow" aria-hidden="true">→</p>
      <p class="fact-now"><span>${escapeHTML(f.nowLabel)}</span><strong>${escapeHTML(f.nowPrice)}</strong></p>
    </div>
    <p class="fact-ratio"><strong>${escapeHTML(f.ratio)}</strong> arttı · <a href="#arsiv" data-product="${escapeHTML(f.productId)}">fiyat geçmişi</a></p>
    <button type="button" class="fact-play">Bunu tahmin et →</button>`;
  $('fact-body').querySelector('.fact-play').onclick = () => {
    // pushState keeps Back working without firing hashchange, which would show the old question.
    history.pushState(null, '', '#tahmin');
    nextQuestion(f.productId);
  };
  $('fact-body').querySelector('a').onclick = () => { state.selectedTimelineProduct = f.productId; state.timelineCategory = 'all'; state.timelineQuery = ''; };
}

function onHashChange() {
  closePreview(); // Back while the preview is open must not leave the modal over another screen
  const hash = location.hash;
  if (state.all.length === 0) return;
  if (hash !== '#tahmin' || !state.question || state.lastGameScreen !== 'result-screen') {
    stopPrinting();
  }
  if (hash === '#arsiv') {
    renderTimelineScreen();
  } else if (hash === '#tahmin') {
    if (!state.question) nextQuestion();
    else {
      show(state.lastGameScreen);
      // Returning from #arsiv via history.back() leaves focus on <body> or the hidden screen.
      if (state.lastGameScreen === 'result-screen' && (!document.activeElement || document.activeElement === document.body || document.activeElement.closest('[hidden]'))) {
        $('r-receipt').focus({ preventScroll: true });
      }
    }
  } else {
    renderHome();
  }
  rescueFocus();
}

// After in-app navigation the focused link ("Ana menüye dön", a menu card) is inside a now
// hidden screen, so keyboard and screen reader users would restart from the top of the page.
// The first load is left alone: focus on <body> is the browser's normal starting point.
function rescueFocus() {
  if (!document.activeElement?.closest('[hidden]')) return;
  const heading = document.querySelector('main > section:not([hidden]) h2');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}
window.addEventListener('hashchange', onHashChange);

const THEME_KEY = 'ne-kadardi-theme';

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Inline SVG instead of emoji: emoji render in colour and differ per platform.
const svg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const ICONS = {
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  soundOn: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  soundOff: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>'),
};

function renderThemeToggle() {
  const dark = currentTheme() === 'dark';
  const btn = $('theme-toggle');
  btn.innerHTML = dark ? ICONS.sun : ICONS.moon;
  btn.setAttribute('aria-label', dark ? 'Gündüz görünümüne geç' : 'Gece görünümüne geç');
}

function renderSoundToggle() {
  const on = sound.isEnabled();
  const btn = $('sound-toggle');
  btn.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
  btn.setAttribute('aria-pressed', String(on));
  btn.title = on ? 'Sesi kapat' : 'Sesi aç'; // the label stays fixed: aria-pressed carries the state
}

function toggleSound() {
  if (sound.toggle()) sound.unlock(); // preload samples if the player was muted on the first gesture
  renderSoundToggle();
  sound.play('beep'); // confirms the new state; stays silent when just muted
}

// Chrome/Android offer installation through an event we can defer to our own button; other
// browsers (iOS Safari) never fire it, so the button simply stays hidden there.
function setupInstallButton() {
  let deferred = null;
  const btn = $('install-btn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => { deferred = null; btn.hidden = true; });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    deferred = null;
    btn.hidden = true; // the event cannot be reused once prompted
  });
}

// A second tap within the fade restarts the timer instead of cutting the new fade short.
let themeAnimTimer = null;
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const root = document.documentElement;
  root.classList.add('theme-anim');
  $('theme-toggle').classList.add('spin');
  clearTimeout(themeAnimTimer);
  themeAnimTimer = setTimeout(() => {
    root.classList.remove('theme-anim');
    $('theme-toggle').classList.remove('spin');
  }, 450);
  root.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  renderThemeToggle();
}

async function init() {
  const versionEl = $('app-version');
  if (versionEl) versionEl.textContent = VERSION;
  loadSession();
  renderThemeToggle();
  $('theme-toggle').addEventListener('click', toggleTheme);
  $('fact-next').addEventListener('click', () => { sound.play('beep'); renderFact(); });
  setupInstallButton();
  // Chip rows fade at the right edge; once scrolled, the left edge fades too.
  for (const row of document.querySelectorAll('.timeline-scroll')) {
    row.addEventListener('scroll', () => row.classList.toggle('scrolled', row.scrollLeft > 4), { passive: true });
  }
  // The game keeps working offline (service worker); the badge just says why links may not open.
  const syncOnline = () => { $('offline-badge').hidden = navigator.onLine !== false; };
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);
  syncOnline();
  // The tax breakdown prints like a receipt strip.
  $('r-tax-details').addEventListener('toggle', (e) => { if (e.target.open) sound.play('print'); });
  renderSoundToggle();
  $('sound-toggle').addEventListener('click', toggleSound);
  // iOS Safari only treats touchend/click (not pointerdown) as user activation for Web Audio; decoding then keeps the first print in sync.
  for (const type of ['touchend', 'click', 'keydown']) {
    window.addEventListener(type, () => sound.unlock(), { once: true, capture: true });
    // Later taps keep the context awake; a tab that sat in the background otherwise answers late.
    window.addEventListener(type, () => sound.wake(), { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sound.wake(); });
  // Sounds are small and precached; fetch them once the page has loaded so the first one is ready.
  if (document.readyState === 'complete') sound.prefetch();
  else window.addEventListener('load', () => sound.prefetch(), { once: true });
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    state.raw = rawData;
    state.all = buildQuestions(rawData);
    state.timelines = buildTimelines(rawData);
  } catch (err) {
    console.error(err);
    showMessage('Veri yüklenemedi. Sayfayı yerel bir sunucuyla açtığından emin ol.');
    return;
  }
  if (state.all.length === 0) {
    showMessage('Henüz doğrulanmış fiyat yok. Kaynaklı veri eklendiğinde sorular burada görünecek.');
    return;
  }
  shareOriginalLabel = $('share-btn').textContent;
  downloadOriginalLabel = $('download-btn').innerHTML;
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
  $('guess-form').addEventListener('submit', onGuess);
  const guessField = document.querySelector('#question-screen .guess-field');
  guessField?.addEventListener('animationend', () => {
    guessField.classList.remove('invalid');
  });
  $('guess-input').addEventListener('input', (e) => {
    guessField?.classList.remove('invalid'); // also clears when reduced motion skips animationend
    const v = parseGuess(e.target.value);
    $('guess-readout').textContent = v !== null && v >= 1000 ? readAmount(v) : '';
  });
  // Skipping is free: no score, no round counted, so players can drop a product they do not know.
  $('skip-btn').addEventListener('click', () => {
    nextQuestion(); // its barcode beep doubles as the skip sound
  });
  $('next-btn').addEventListener('click', () => {
    resetShareBtn();
    nextQuestion();
  });
  // After submitting a guess, focus sits on the non-interactive receipt so Enter can advance without tabbing to the bottom button.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if ($('result-screen').hidden) return;
    // A quick second Enter right after submitting would skip the receipt before it prints.
    if (document.querySelector('#result-screen .receipt-wrapper').classList.contains('printing')) return;
    // The chart is focusable for arrow-key inspection; Enter there must not drop the receipt.
    if (e.target instanceof Element && e.target.closest('a, button, input, textarea, select, summary, [contenteditable], .price-chart')) return;
    e.preventDefault();
    $('next-btn').click();
  });
  $('share-btn').addEventListener('click', share);
  $('download-btn').addEventListener('click', downloadImage);
  initSharePreview();
  
  onHashChange();
}

// Offline support. On localhost the worker is opt-in (open the page with ?sw) because its
// stale-while-revalidate cache would show the previous version of a file after each edit;
// without ?sw a leftover worker is removed so developers never get stuck on old files.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (local && !new URLSearchParams(location.search).has('sw')) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => regs.forEach(reg => reg.unregister()))
      .catch(() => {});
    return;
  }
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker:', err));
}

registerServiceWorker();
init();
