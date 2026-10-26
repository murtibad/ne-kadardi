// UI wiring: loads data, renders screens, handles input. Logic lives in game.js and format.js.
import { parseGuess, formatPrice, formatRatio, formatPeriod, readAmount, formatIncrease, formatNumber, escapeHTML, inPeriod, shortTitle } from './format.js';
import { actualLabel, buildQuestions, isAmount, openerFor, OPENER_IDS, buildContextLine, pickByCategory, pickFollowUp, FOLLOW_UP_IDS, scoreGuess, scoreTier, streakAlive, updateStreak, yearOf } from './game.js';
import { createSoundPlayer, soundForResult, haptic } from './sound.js';
import { buildTimelines } from './timeline.js';
import { CATEGORIES, categoryOf } from './categories.js';
import { sourceKindLabel } from './source-kind.js';
import { burstConfetti } from './confetti.js';
import { verdictText, questionTitle } from './share-model.js';
import { buildTaxLine, taxBreakdown } from './tax.js';
import { cashierComment, rememberLine } from './cashier.js';
import { contextComment, hintComment, yearAnchor, ytlNote, stampTitle } from './banter.js';
import { buildHint, applyHintPenalty } from './hint.js';
import { VERSION } from './version.js';
import { pickFact } from './fact.js';
import { buildPriceChart, labelSide, placeRefLabel, refLabelAtStart } from './price-chart.js';
import { countUpFrames } from './count-up.js';
import { parseQuestionParam, friendIntroText, compareFriendScore } from './ask-link.js';
import { initShareUi, resetShareBtn, closePreview, askFriend, shareReportCard } from './share-ui.js';
import { dayKey } from './daily.js';
import { initDailyUi, isDailyEndTurn, setDailyEndTurn, syncSkipBtn, recordDailyAnswer, dailyNextId, skipDaily, startOrShareDaily, renderDailyCard, renderDailyMenu } from './daily-ui.js';

const DATA_URL = 'data/prices.json';
const $ = (id) => document.getElementById(id);
const sound = createSoundPlayer();
// Vibration follows the sound switch and the reduced-motion preference.
const hapticIfAllowed = (ms) => {
  if (!sound.isEnabled()) return;
  haptic(ms);
};

const state = {
  recentProducts: [], seen: new Set(),
  hinted: false, friendScore: null, daily: null, raw: null, all: [], timelines: [], question: null, result: null, 
  played: 0, total: 0, best: 0, round: 0, recentScores: [], recentLines: [], // in-memory only: last ~12 comment lines shown
  streak: { last: null, count: 0, best: 0 },
  lastGameScreen: 'question-screen', selectedTimelineProduct: null, timelineCategory: 'all', timelineQuery: '',
  archiveFromResult: false 
};

// The result screen shows the last few scores as coloured ticks, like a till roll tally.
const RECENT_MAX = 8;
const SEEN_KEY = 'ne-kadardi-seen';
const SEEN_MAX = 2000;
const STREAK_KEY = 'ne-kadardi-streak';

function loadStreak() {
  try {
    const data = JSON.parse(localStorage.getItem(STREAK_KEY));
    if (data && typeof data === 'object') {
      state.streak = {
        last: typeof data.last === 'string' ? data.last : null,
        count: Number.isFinite(data.count) ? data.count : 0,
        best: Number.isFinite(data.best) ? data.best : 0,
      };
    }
  } catch(e) {}
}

function saveStreak() {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(state.streak));
  } catch(e) {}
}
function loadSeen() {
  try {
    const ids = JSON.parse(localStorage.getItem(SEEN_KEY));
    if (Array.isArray(ids)) state.seen = new Set(ids.filter((x) => typeof x === 'string').slice(-SEEN_MAX));
  } catch(e) {}
}

function saveSeen() {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...state.seen].slice(-SEEN_MAX)));
  } catch(e) {}
}

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

// `productId` starts with a question about one product (the home fact card's "Bunu tahmin et");
// adding `date` pins the exact question from a shared `?soru=` link.
function nextQuestion(productId = null, date = null) {
  $('next-btn').textContent = 'Sonraki soru →';
  setDailyEndTurn(false);
  $('r-card-share').hidden = false;
  stopPrinting();
  state.archiveFromResult = false;
  state.friendScore = null;
  resetShareBtn();
  if ($('r-tax-details')) {
    $('r-tax-details').hidden = true;
    $('r-tax-details').open = false;
  }
  const exact = productId && date ? state.all.find((x) => x.productId === productId && x.date === date) : null;
  const ofProduct = productId ? state.all.filter((x) => x.productId === productId) : [];
  // Avoid repeating the last question, unless it is the product's only one.
  const fresh = ofProduct.filter((x) => x.id !== state.question?.id);
  const pool = fresh.length ? fresh : ofProduct;
  // Someone who has never played starts with the openers (game.js OPENER_IDS), skips included.
  let opener = null;
  while (!productId && state.firstVisit && !opener && state.openerIndex < OPENER_IDS.length) opener = openerFor(state.all, state.openerIndex++);
  const q = exact ?? opener ?? (pool.length ? pool[Math.floor(Math.random() * pool.length)] : pickByCategory(state.all, state.recentProducts, state.question?.id, Math.random, state.seen));
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
  $('q-round').textContent = state.daily
    ? `Günün fişi · ${state.daily.index + 1}/${state.daily.ids.length}`
    : cat ? `Soru ${state.round} · ${cat.label}` : `Soru ${state.round}`;
  syncSkipBtn();
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
    $('hint-text').dataset.line = hintComment(Math.random, state.recentLines);
    state.recentLines = rememberLine(state.recentLines, $('hint-text').dataset.line);
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
  if (!state.question) return; // a stray submit before a question is shown has nothing to score
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
  const today = dayKey();
  const firstToday = state.streak?.last !== today;
  state.streak = updateStreak(state.streak, today);
  saveStreak();
  state.result = {
    guess,
    ...scored,
    score: applyHintPenalty(scored.score, state.hinted),
    hinted: state.hinted,
    streakBump: firstToday && state.streak.count >= 2 ? state.streak.count : 0,
  };
  // Günün Fişi keeps its own total out of 500; the free-play counters ("N soru · ortalama")
  // only count free questions, so the two never mix.
  if (!state.daily) {
    state.played += 1;
    state.total += state.result.score;
    state.best = Math.max(state.best, state.result.score);
    state.recentScores = [...state.recentScores, state.result.score].slice(-RECENT_MAX);
  }
  state.seen.delete(q.id);
  state.seen.add(q.id);
  saveSeen();
  recordDailyAnswer(state.result.score);
  saveSession();
  hapticIfAllowed(10);
  renderResult(q, state.result);
  printReceipt(soundForResult(state.result.score, state.result.direction === 'exact' ? 1 : state.result.factor));
}

// The receipt slides out of the printer slot while the printer sound plays, then gets torn off.
// Kept short (about a second) so it never stands between the player and the next question;
// a tap on the receipt finishes it at once.
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

// On a card turn the card starts just under the score, below the fold on most phones:
// scroll just enough to show it above the sticky action bar, never past the card's top.
function revealReportCard() {
  const card = $('r-card');
  if (card.hidden || $('result-screen').hidden) return;
  const bar = document.querySelector('#result-screen .session-actions');
  const limit = bar ? bar.getBoundingClientRect().top : window.innerHeight;
  const box = card.getBoundingClientRect();
  const delta = Math.min(box.bottom + 12 - limit, box.top - 72);
  if (delta > 0) window.scrollBy({ top: delta, behavior: 'smooth' });
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
    // Let the tear finish (0.3 s) before the till leaves.
    handTimer = setTimeout(handOver, 320);
    // The till takes 0.38 s to leave; then the report card would still sit behind the sticky bar.
    setTimeout(revealReportCard, 760);
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
function renderResult(q, r) {
  stopCountUp();
  $('r-stamp').classList.remove('stamped');
  $('r-title').textContent = `${formatPeriod(q.date)} · ${questionTitle(q)}`;
  renderResultImage(q);
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
  if (r.hinted && r.score > 0) { // "%20 düştü" means nothing on a zero
    const hint = document.createElement('span');
    hint.className = 'score-hint';
    hint.textContent = ' (ipucu aldığın için %20 düştü)';
    scoreEl.append(hint);
  }
  const tier = scoreTier(r.score);
  const line = contextComment({ direction: r.direction, factor: r.factor, productId: q.productId, amount: isAmount(q.productId) }, Math.random, state.recentLines)
    ?? cashierComment(tier, Math.random, { amount: isAmount(q.productId), recent: state.recentLines });
  state.recentLines = rememberLine(state.recentLines, line);
  $('r-cashier').textContent = `“${line}”`;
  // The hint slip already showed that year's dollar rate and minimum wage.
  const followPool = r.hinted ? state.all.filter((x) => x.productId !== 'dolar' && x.productId !== 'asgari-ucret') : state.all;
  const followUp = state.daily && state.daily.scores.length < state.daily.ids.length
    ? null
    : pickFollowUp(q, followPool, state.recentProducts);
  const followBtn = $('followup-btn');
  if (followBtn) {
    followBtn.hidden = !followUp;
    if (followUp) {
      followBtn.textContent = `Peki ${inPeriod(formatPeriod(followUp.date))} ${questionTitle(followUp)} kaç liraydı? →`;
      followBtn.onclick = () => nextQuestion(followUp.productId, followUp.date);
    } else {
      followBtn.textContent = '';
      followBtn.onclick = null;
    }
  }
  // renderReportCard ends a finished daily run, so read the run first for the line under the receipt.
  const dailyRun = state.daily ? { done: state.daily.scores.length, of: state.daily.ids.length, total: state.daily.scores.reduce((s, n) => s + n, 0) } : null;
  renderReportCard();
  const ytl = ytlNote(yearOf(q.date), q.price);
  $('r-ytl').textContent = ytl || '';
  $('r-ytl').hidden = !ytl;
  document.querySelector('.verdict-box').dataset.tier = tier;
  document.querySelector('.score-box').dataset.tier = tier;
  const stamp = stampTitle(r.score);
  $('r-stamp').textContent = stamp || '';
  $('r-stamp').hidden = !stamp;
  $('r-stamp').dataset.tier = tier;
  const friendLine = compareFriendScore(state.friendScore, r.score);
  state.friendScore = null;
  if ($('r-friend')) {
    $('r-friend').textContent = friendLine || '';
    $('r-friend').hidden = !friendLine;
  }
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

  const taxText = buildTaxLine(q);
  $('r-tax').textContent = taxText || '';
  $('r-tax').hidden = !taxText;
  renderTaxDetails(q);

  $('r-archive').textContent = isAmount(q.productId) ? 'Yıllar içindeki tutarları →' : 'Bu ürünün fiyat geçmişi →';
  $('r-archive').onclick = () => { state.selectedTimelineProduct = q.productId; state.timelineCategory = 'all'; state.timelineQuery = ''; state.archiveFromResult = true; };
  $('r-source').href = q.source.url;
  $('r-source').textContent = shortTitle(q.source.title);
  $('r-source').title = q.source.title;
  const kindLabel = sourceKindLabel(q.source.kind);
  $('r-source-kind').textContent = kindLabel ? ` · ${kindLabel}` : '';
  $('r-source-kind').hidden = !kindLabel;
  // One line on a 360 px phone: the best score already sits on the home menu.
  const streakHint = r.streakBump >= 2 ? ` · 🔥 ${r.streakBump} gün` : '';
  // During Günün Fişi the line follows the receipt (its own total), not the free-play counters.
  const sessionText = dailyRun
    ? `Günün fişi ${dailyRun.done}/${dailyRun.of} · toplam ${dailyRun.total}`
    : `${state.played} soru · ortalama ${Math.round(state.total / Math.max(1, state.played))}`;
  const ticks = state.recentScores.map((s, i, a) => `<span class="tally-dot${i === a.length - 1 ? ' tally-last' : ''}" data-tier="${scoreTier(s)}" title="${s} puan"></span>`).join('');
  $('r-session').innerHTML = `<span>${sessionText}${streakHint}</span>`
    + (!dailyRun && state.recentScores.length > 1 ? `<span class="tally" role="img" aria-label="Son ${state.recentScores.length} puan: ${state.recentScores.join(', ')}"><span class="tally-label" aria-hidden="true">son ${state.recentScores.length}</span>${ticks}</span>` : '');
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
  // Keep end labels inside the box: anchor them towards the middle.
  const anchor = (p) => (p.x < chart.width * 0.25 ? 'start' : p.x > chart.width * 0.75 ? 'end' : 'middle');
  // A marked point in the middle leans its label away from the steeper side of the line.
  const markSide = marked && anchor(marked) === 'middle' ? labelSide(chart.points, chart.points.indexOf(marked)) : 'middle';
  // The question's own price wins when an end label would collide with it; a leaning label
  // covers about twice as much room on its side.
  const room = (p) => ((markSide === 'left' && p.x < marked.x) || (markSide === 'right' && p.x > marked.x) ? 104 : 52);
  const labels = [first, last, marked].filter((p, i, a) => p && a.indexOf(p) === i
    && (!marked || p === marked || Math.abs(p.x - marked.x) > room(p)));

  const dots = chart.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.highlight ? 5.5 : 2.5}" class="${p.highlight ? 'pc-mark' : p.isCurrent ? 'pc-now' : 'pc-dot'}"/>`).join('');
  const hits = chart.points.map((p, i) => `<circle class="pc-hit" cx="${p.x}" cy="${p.y}" r="12" data-i="${i}"/>`).join('');
  const labelX = (p) => (p !== marked || markSide === 'middle' ? p.x : markSide === 'left' ? p.x - 6 : p.x + 6);
  const labelAnchor = (p) => (p !== marked || markSide === 'middle' ? anchor(p) : markSide === 'left' ? 'end' : 'start');
  // Labels are monospace, 14px on the receipt chart and 11px in the archive (css/style.css):
  // a character is about 0,62 em wide and capitals about 0,75 em tall.
  const fontSize = figId === 'r-chart' ? 14 : 11;
  const textWidth = (s) => s.length * fontSize * 0.62;
  const capHeight = fontSize * 0.75;
  const labelBoxes = labels.map((p) => {
    const w = textWidth(formatPrice(p.price));
    const a = labelAnchor(p);
    const x0 = a === 'start' ? labelX(p) : a === 'end' ? labelX(p) - w : labelX(p) - w / 2;
    const y = Math.max(11, p.y - 9);
    return { x0, x1: x0 + w, y0: y - capHeight, y1: y + 2 };
  });
  // The guess label tries both ends, above and below its line, and takes the spot that covers
  // no price label and no stretch of the data line; a close guess starts at the end whose points
  // are farther away.
  const refText = chart.ref ? `Tahminin ${formatPrice(guess)}${chart.ref.off === 'above' ? ' ↑' : chart.ref.off === 'below' ? ' ↓' : ''}` : '';
  const refSpot = chart.ref && placeRefLabel(chart, labelBoxes, {
    width: textWidth(refText), left: pad.left, right: chart.width - pad.right, preferStart: refLabelAtStart(chart, 110), textHeight: capHeight,
  });
  const refLine = chart.ref
    ? `<line x1="${pad.left}" y1="${chart.ref.y}" x2="${chart.width - pad.right}" y2="${chart.ref.y}" class="pc-ref"/><text x="${refSpot.atStart ? pad.left : chart.width - pad.right}" y="${refSpot.y}" text-anchor="${refSpot.atStart ? 'start' : 'end'}" class="pc-ref-label">${escapeHTML(refText)}</text>`
    : '';
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
      match.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

const INTRO_KEY = 'ne-kadardi-intro-seen';
function loadIntroSeen() {
  try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; }
}
function saveIntroSeen() {
  try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* storage unavailable */ }
}

let finishIntro = null;
let introSeq = 0;

async function openIntro() {
  const dlg = $('intro');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const seq = ++introSeq;
  finishIntro?.({ moveFocus: false });
  try {
    const { introRows, playIntro } = await import('./intro.js');
    // Ignore a superseded call so two imports in flight never start two animations.
    if (seq !== introSeq) return;
    finishIntro?.({ moveFocus: false });
    if (!dlg.open) dlg.showModal();
    finishIntro = playIntro(dlg, introRows(state.timelines), { sound });
  } catch (err) {
    console.warn('Tanıtım yüklenemedi', err);
  }
}

function closeIntro() {
  introSeq += 1;
  finishIntro?.({ moveFocus: false });
  finishIntro = null;
  saveIntroSeen();
  const dlg = $('intro');
  if (dlg?.open) dlg.close();
}

// The receipt card now only sums up Günün Fişi (the every-fifth-answer card was dropped,
// owner's call 2026-10-26: the daily receipt does the same job better).
function renderReportCard() {
  $('r-card').hidden = true;
  if (renderDailyCard()) return;
  setDailyEndTurn(false);
  resetShareBtn();
}

function initIntro() {
  const dlg = $('intro');
  if (!dlg) return;
  $('intro-play')?.addEventListener('click', () => {
    closeIntro();
    location.hash = '#tahmin';
  });
  $('intro-close')?.addEventListener('click', closeIntro);
  $('intro-open')?.addEventListener('click', openIntro);
  // Pressing Escape dismisses the modal via cancel; mark seen and stop any running intro timers/sounds.
  dlg.addEventListener('cancel', () => {
    introSeq += 1;
    finishIntro?.({ moveFocus: false });
    finishIntro = null;
    saveIntroSeen();
  });
}

// The archive screen loads on first visit; it is not needed to play.
let archiveUiPromise = null;
function loadArchiveUi() {
  archiveUiPromise ??= import('./archive-ui.js').then((mod) => {
    mod.initArchiveUi({ getState: () => state, renderPriceChart, nextQuestion, show, syncSkipBtn });
    return mod;
  }).catch((err) => {
    archiveUiPromise = null;
    throw err;
  });
  return archiveUiPromise;
}

async function renderTimelineScreen(focusProductId = null) {
  show('timeline-screen');
  if (state.timelines.length === 0) return;
  let mod;
  try {
    mod = await loadArchiveUi();
  } catch (err) {
    console.warn('Arşiv yüklenemedi', err);
    return;
  }
  return mod.renderTimelineScreen(focusProductId);
}

function renderHome() {
  state.archiveFromResult = false;
  const today = dayKey();
  const alive = streakAlive(state.streak, today) && state.streak.count >= 2;
  const streakMeta = alive ? ` · 🔥 ${state.streak.count} gün üst üste` : '';
  $('m-tahmin').textContent = state.played > 0
    ? `${state.played} soru · ortalama puan ${Math.round(state.total / state.played)}` + (state.best > 0 ? ` · en yüksek ${state.best}` : '') + streakMeta
    : alive ? `🔥 ${state.streak.count} gün üst üste` : '';
  renderDailyMenu();
  const prices = state.timelines.reduce((n, t) => n + t.rows.length, 0);
  $('home-stats').textContent = `${state.timelines.length} ürün · ${prices} gerçek fiyat`;
  $('home-stats').hidden = state.timelines.length === 0;
  const needsToday = alive && state.streak.last !== today;
  // A streak of 2+ that is no longer alive was broken: say so once, with the record to beat.
  const broken = !streakAlive(state.streak, today) && state.streak.count >= 2;
  $('home-streak').textContent = needsToday ? 'Serini koru: bugün bir soru çöz.'
    : broken ? `Serin bozuldu (en uzun: ${state.streak.best || state.streak.count} gün). Bugün yeniden başla.` : '';
  $('home-streak').hidden = !needsToday && !broken;
  if (!$('fact-body').hasChildNodes()) renderFact();
  renderHomeSpark();
  // Coming back to the menu does not reset the game, so say so instead of "Başla".
  $('m-go').textContent = !state.question ? 'Başla →'
    : state.lastGameScreen === 'result-screen' ? `Sonuca dön · Soru ${state.round} →` : `Devam et · Soru ${state.round} →`;
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
    <p class="fact-ratio"><strong>${escapeHTML(f.ratio)}</strong> çıktı · <a href="#arsiv" data-product="${escapeHTML(f.productId)}">fiyat geçmişi</a></p>
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
  } else if (hash === '#gunun-fisi') {
    startOrShareDaily();
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
  loadSeen();
  loadStreak();
  // Decided once at load: a returning player never gets the opener list again.
  state.firstVisit = state.played === 0;
  state.openerIndex = 0;
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
  initDailyUi({ getState: () => state, nextQuestion, renderHome });
  initShareUi({ getState: () => state, isDailyEndTurn });
  $('ask-q-btn').dataset.label = $('ask-q-btn').textContent;
  $('guess-form').addEventListener('submit', onGuess);
  const guessField = document.querySelector('#question-screen .guess-field');
  guessField?.addEventListener('animationend', () => {
    guessField.classList.remove('invalid');
  });
  $('guess-input').addEventListener('input', (e) => {
    guessField?.classList.remove('invalid'); // also clears when reduced motion skips animationend
    const v = parseGuess(e.target.value);
    // An old "Geçerli bir fiyat yaz" next to a valid number reads like the game rejects it.
    if (v !== null) $('guess-error').textContent = '';
    $('guess-readout').textContent = v !== null && v >= 1000 ? readAmount(v) : '';
  });
  // Skipping is free: no score, no round counted, so players can drop a product they do not know.
  $('skip-btn').addEventListener('click', () => {
    if (skipDaily()) return;
    nextQuestion(); // its barcode beep doubles as the skip sound
  });
  $('next-btn').addEventListener('click', () => {
    resetShareBtn();
    const dailyId = dailyNextId();
    if (dailyId) {
      const [productId, date] = dailyId.split('@');
      nextQuestion(productId, date);
      return;
    }
    nextQuestion();
  });
  // After submitting a guess, focus sits on the non-interactive receipt so Enter can advance without tabbing to the bottom button.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if ($('result-screen').hidden) return;
    // A quick second Enter right after submitting must not skip the receipt; like a tap,
    // it only finishes the printing so keyboard users can hurry it too.
    const wrap = document.querySelector('#result-screen .receipt-wrapper');
    if (wrap.classList.contains('printing')) { e.preventDefault(); wrap.click(); return; }
    // The chart is focusable for arrow-key inspection; Enter there must not drop the receipt.
    if (e.target instanceof Element && e.target.closest('a, button, input, textarea, select, summary, [contenteditable], .price-chart')) return;
    e.preventDefault();
    $('next-btn').click();
  });
  $('ask-q-btn').addEventListener('click', (e) => askFriend({ btn: e.currentTarget }));
  $('r-card-share').addEventListener('click', shareReportCard);
  initIntro();

  const searchParams = new URLSearchParams(location.search);
  const rawSoru = searchParams.get('soru');
  const rawP = searchParams.get('p');
  const parsedSoru = parseQuestionParam(rawSoru, rawP);
  const askedQuestion = parsedSoru && state.all.find((x) => x.productId === parsedSoru.productId && x.date === parsedSoru.date);
  if (askedQuestion) {
    // Drop ?soru and &p so a reload does not repeat the shared question, and open it right away.
    history.replaceState(null, '', location.pathname + '#tahmin');
    nextQuestion(parsedSoru.productId, parsedSoru.date);
    state.friendScore = parsedSoru.score ?? null;
    $('q-anchor').textContent = friendIntroText(state.friendScore);
    $('q-anchor').hidden = false;
    return;
  }
  if (rawSoru !== null || rawP !== null) {
    searchParams.delete('soru');
    searchParams.delete('p');
    const rest = searchParams.toString();
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  }

  onHashChange();
  if (!loadIntroSeen() && (location.hash === '' || location.hash === '#') && state.played === 0) {
    openIntro();
  }
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
  // Wait for 'load' so precaching does not compete with the first screen for bandwidth.
  const register = () => navigator.serviceWorker.register('sw.js')
    .catch(err => console.warn('Service worker:', err));
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

registerServiceWorker();
init();
