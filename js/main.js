// UI wiring: loads data, renders screens, handles input. Logic lives in game.js and format.js.
import { parseGuess, formatPrice, formatPeriod, formatIncrease, escapeHTML, inPeriod, shortTitle, unitLine, formatRatio, readoutText, formatInputThousands, keyboardFitDelta } from './format.js';
import { actualLabel, buildQuestions, isAmount, openerFor, OPENER_IDS, buildContextLine, pickByCategory, pickFollowUp, scoreGuess, scoreTier, streakAlive, updateStreak, isFirstAnswerOfDay, yearOf, shouldReplaceBestGuess, resolveBestGuess, matchGuessedPeriod, timeWarpText, TIME_WARP_MIN_FACTOR, homeStreakText } from './game.js';
import { createSoundPlayer, soundForResult, haptic } from './sound.js';
import { buildTimelines } from './timeline.js';
import { CATEGORIES, categoryOf } from './categories.js';
import { sourceKindLabel } from './source-kind.js';
import { sourceLinkText } from './source-name.js';
import { burstConfetti } from './confetti.js';
import { verdictText, questionTitle, skipRevealText, sessionBadge, sessionWrapText, bestGuessText } from './share-model.js';
import { buildTaxLine, taxBreakdown } from './tax.js';
import { cashierComment, rememberLine } from './cashier.js';
import { contextComment, hintComment, gatedYearAnchor, ytlNote, stampTitle } from './banter.js';
import { buildHint, buildEverydayHint, applyHintPenalty } from './hint.js';
import { VERSION } from './version.js';
import { pickFact } from './fact.js';
import { buildPriceChart } from './price-chart.js';
import { initChartUi, renderPriceChart } from './chart-ui.js';
import { countUpFrames, easeOutCubic } from './count-up.js';
import { parseQuestionParam, resolveFriendLink, LINK_NOT_FOUND_TEXT, friendIntroText, compareFriendScore } from './ask-link.js';
import { initShareUi, resetShareBtn, closePreview, warmShareImage } from './share-ui.js';
import { dayKey, dailyProductIds } from './daily.js';
import { initDailyUi, isDailyEndTurn, setDailyEndTurn, syncSkipBtn, recordDailyAnswer, dailyNextId, skipDaily, startOrShareDaily, renderDailyCard, renderDailyMenu, closeDailyReview, renderDailyRound } from './daily-ui.js';
import { questionIconUrl, preloadIcon } from './icon-preload.js';
import { sessionTendencyLine, advanceColdStreak } from './tendency.js';

const DATA_URL = 'data/prices.json';
const $ = (id) => document.getElementById(id);
const sound = createSoundPlayer();
// Vibration follows the sound switch.
const hapticIfAllowed = (ms) => {
  if (!sound.isEnabled()) return;
  haptic(ms);
};

const state = {
  recentProducts: [], seen: new Set(), anchorShown: {}, questionCounter: 0, lastFollow: null,
  hintsUsed: 0, hintProductId: null, questionsShown: 0, friendScore: null, daily: null, raw: null, all: [], timelines: [], question: null, result: null, 
  played: 0, skips: 0, total: 0, best: 0, bestGuess: null, round: 0, recentScores: [], recentLines: [], // in-memory only: last ~12 comment lines shown
  streak: { last: null, count: 0, best: 0 },
  lastGameScreen: 'question-screen', selectedTimelineProduct: null, timelineCategory: 'all', timelineQuery: '',
  archiveFromResult: false,
  wrap: { count: 0, sum: 0 }, // this sitting only, free play only; cleared once the menu line is shown
  sessionDirections: [], // this sitting only, free play only: 'under' | 'over' | 'exact'
  coldStreak: { zeros: 0, shown: false } // this sitting only, free play only
};

// The result screen shows the last few scores as coloured ticks, like a till roll tally.
const RECENT_MAX = 8;
const SEEN_KEY = 'ne-kadardi-seen';
const SEEN_MAX = 2000;
const STREAK_KEY = 'ne-kadardi-streak';
const BEST_GUESS_KEY = 'ne-kadardi-best-guess';

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

function loadBestGuess() {
  try {
    const data = JSON.parse(localStorage.getItem(BEST_GUESS_KEY));
    if (data && typeof data === 'object'
      && typeof data.productId === 'string' && data.productId
      && typeof data.date === 'string' && data.date
      && Number.isFinite(data.score) && data.score >= 0) {
      state.bestGuess = { productId: data.productId, date: data.date, score: data.score };
    }
  } catch(e) {}
}

function saveBestGuess() {
  if (!state.bestGuess) return;
  try {
    localStorage.setItem(BEST_GUESS_KEY, JSON.stringify({
      productId: state.bestGuess.productId,
      date: state.bestGuess.date,
      score: state.bestGuess.score,
    }));
  } catch(e) {}
}

// One-shot micro-motion (WAAPI): runs once, leaves no inline style or transform behind.
function motion(el, frames, ms, easing, delay = 0) {
  if (el && el.animate) el.animate(frames, { duration: ms, easing, delay, fill: 'backwards' });
}

function show(screenId) {
  syncFooter(screenId);
  // Leaving mid-tear: finish the hand-over now, or Back would return to a receipt still in the till.
  if (handTimer !== null) $('result-screen').classList.add('handed');
  clearTimeout(handTimer);
  handTimer = null; // a stale id would make the next stopPrinting() hand over a receipt that was never torn
  if (screenId !== 'result-screen') stopPrinting();
  if (screenId !== 'question-screen') $('q-round')?.querySelector('.daily-dot-pop')?.classList.remove('daily-dot-pop');
  $('question-screen').classList.remove('as-machine', 'folded');
  // Cancelled animations never reach onfinish, so undo their inline clipping here too.
  $('question-screen').getAnimations?.({ subtree: true })?.forEach((a) => a.cancel());
  $('question-screen').style.overflow = '';
  $('guess-form').style.overflow = '';
  for (const id of ['message-screen', 'home-screen', 'question-screen', 'result-screen', 'timeline-screen']) {
    const el = $(id);
    const wasHidden = el.hidden;
    el.hidden = id !== screenId;
    // A result we walk away from is finished: when it is shown again, its one-shot animations must not replay.
    if (id === 'result-screen' && !wasHidden && id !== screenId) el.classList.add('revisit');
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
  const home = screenId === 'home-screen' || screenId === 'message-screen';
  document.querySelector('.site-footer .footer-link').parentElement.hidden = home;
  $('header-home').hidden = home;
}

function showGameScreen(screenId) {
  state.lastGameScreen = screenId;
  show(screenId);
}

function showMessage(text, { retry = false } = {}) {
  $('message-text').textContent = text;
  document.querySelector('#message-screen .skeleton').hidden = true; // only the first load shows the placeholder
  const retryBtn = $('message-retry');
  if (retryBtn) retryBtn.hidden = !retry;
  show('message-screen');
}

// Opens the archive on one product with `date` pinned. `fromResult` only decides where Back goes:
// the result screen (true) or the menu (false, e.g. the Günün Fişi review dialog).
function pinArchive(productId, date, fromResult) {
  state.selectedTimelineProduct = productId;
  state.timelineCategory = 'all';
  state.timelineQuery = '';
  state.archiveFromResult = fromResult;
  state.archivePin = { productId, date };
}

// `productId` starts with a question about one product (the home fact card's "Bunu tahmin et");
// adding `date` pins the exact question from a shared `?soru=` link.
function nextQuestion(productId = null, date = null) {
  lastScoredQuestion = null; // the same question can come back (fact card, friend link): it must be answerable again
  $('next-btn').textContent = 'Sonraki soru →';
  setDailyEndTurn(false);
  stopPrinting();
  state.archiveFromResult = false;
  state.archivePin = null;
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
  const today = new Date();
  // Free play skips products reserved for today's "Günün Fişi" so the two modes do not repeat each other.
  const dailyExclude = !productId ? dailyProductIds(state.all, dayKey(today), categoryOf) : null;
  // Someone who has never played starts with the openers (game.js OPENER_IDS), skips included.
  let opener = null;
  // The curated openers stay as they are: a first-time player has not seen today's daily yet.
  while (!productId && state.firstVisit && !opener && state.openerIndex < OPENER_IDS.length) opener = openerFor(state.all, state.openerIndex++);
  const q = exact ?? opener ?? (pool.length ? pool[Math.floor(Math.random() * pool.length)] : pickByCategory(state.all, state.recentProducts, state.question?.id, Math.random, state.seen, today, dailyExclude));
  if (!q) {
    showMessage('Gösterilecek soru yok.');
    return;
  }
  // The first question appears without a tap, so only later ones beep like a barcode scanner.
  if (state.question) sound.play('beep');
  state.question = q;
  state.recentProducts.push(q.productId);
  if (state.recentProducts.length > 20) state.recentProducts.shift();
  const cat = CATEGORIES.find((c) => c.id === categoryOf(q.productId));
  // Counts questions shown (answered + skipped this visit) so a skip never repeats the number;
  // stats still use state.played only.
  state.round = state.played + state.skips + 1;
  const roundEl = $('q-round');
  if (state.daily) {
    renderDailyRound(roundEl);
  } else {
    roundEl.classList.remove('is-daily');
    roundEl.textContent = cat ? `Soru ${state.round} · ${cat.label}` : `Soru ${state.round}`;
  }
  syncSkipBtn();
  // Shown for exactly one card: a normal next question clears it.
  const skippedLine = skipRevealText(state.pendingSkip);
  state.pendingSkip = null;
  $('q-skipped').textContent = skippedLine;
  $('q-skipped').hidden = !skippedLine;
  $('q-period').textContent = formatPeriod(q.date);
  state.questionCounter += 1;
  const gated = gatedYearAnchor(yearOf(q.date), state.anchorShown, state.questionCounter);
  state.anchorShown = gated.shown;
  const anchor = gated.text;
  $('q-anchor').textContent = anchor || '';
  $('q-anchor').hidden = !anchor;
  $('q-anchor').classList.remove('friend-line');
  
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
  $('q-unit').textContent = unitLine(q.unit, q.region);
  $('q-explain').textContent = q.explain ?? '';
  $('q-explain').hidden = !q.explain;
  $('guess-input').value = '';
  $('guess-input').classList.remove('long', 'longer');
  delete $('guess-input').dataset.valid;
  if ($('guess-clear')) $('guess-clear').hidden = true;
  $('guess-readout').textContent = emptyReadout();
  document.querySelector('#question-screen .guess-field')?.classList.remove('invalid');
  state.hintsUsed = 0;
  state.hintProductId = null;
  const everyday = buildEverydayHint(q, state.all);
  const rates = buildHint(q, state.all);
  const hintBtn = $('hint-btn');
  const slip = $('hint-text');
  // Each row carries its own date: hint prices may come from a different month or the year before.
  const row = (l) => `<div class="hint-row"><span>${escapeHTML(l.label)} <small>(${escapeHTML(l.period)})</small></span><strong>${escapeHTML(l.value)}</strong></div>`;
  const rateRows = () => rates.map(row).join('');
  hintBtn.hidden = !(everyday || rates);
  hintBtn.textContent = 'İpucu al (puanın %20 düşer)';
  slip.hidden = true;
  hintBtn.onclick = () => {
    sound.play('beep');
    state.hintsUsed += 1;
    if (state.hintsUsed === 1) {
      slip.dataset.line = hintComment(Math.random, state.recentLines);
      state.recentLines = rememberLine(state.recentLines, slip.dataset.line);
      state.hintProductId = everyday ? everyday.id : null;
      slip.innerHTML = `<p class="hint-cashier">“${escapeHTML(slip.dataset.line)}”</p><p class="hint-slip-title">İpucu</p>`
        + (everyday ? row(everyday) : rateRows());
      slip.hidden = false;
      // Unrolls like a register slip.
      motion(slip, [{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], 220, 'ease-out');
      // Say the price of the second hint too, or it looks free after the first one's "%20".
      if (everyday && rates) hintBtn.textContent = 'Bir ipucu daha: dolar ve asgari ücret (toplam %40 düşer)';
      else hintBtn.hidden = true;
    } else {
      slip.insertAdjacentHTML('beforeend', rateRows());
      [...slip.querySelectorAll('.hint-row')].slice(-rates.length).forEach((r, i) => motion(r, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], 200, 'ease-out', i * 40));
      hintBtn.hidden = true;
    }
    // On a phone the keyboard would rise over the hint the player just paid for; refocus only with a mouse.
    if (!matchMedia('(pointer: coarse)').matches) $('guess-input').focus();
  };
  $('guess-error').textContent = '';
  showGameScreen('question-screen');
  window.scrollTo(0, 0); // "Sonraki soru" sits at the bottom of a long receipt
  // Not on the visit's first question: a phone keyboard would pop up over the product before
  // the player has even read it. Afterwards the player is typing anyway.
  if (state.questionsShown++ > 0) $('guess-input').focus();
}

let lastScoredQuestion = null;
// Before the very first answer, the empty line under the box says how to write a price; it sits in the
// readout's reserved line, so nothing moves when it is replaced by "4 lira 50 kuruş" while typing.
function emptyReadout() {
  // Günün Fişi answers do not count in played, but they do mark seen: a daily player is not new any more.
  return state.played === 0 && state.seen.size === 0 ? 'Rakamla yaz, örneğin 4,5' : '';
}
function onGuess(event) {
  event.preventDefault();
  if (!state.question) return; // a stray submit before a question is shown has nothing to score
  // A quick double tap on "Tahmin et" submitted twice and scored the same question twice.
  if (state.question === lastScoredQuestion) return;
  const guess = parseGuess($('guess-input').value);
  // The dearest answer is a car (about 1,5 million); a longer number only breaks the receipt layout.
  const tooBig = guess !== null && guess >= 1e10;
  if (guess === null || tooBig) {
    $('guess-error').textContent = tooBig ? 'Bu sayı çok büyük, daha küçük bir fiyat yaz.' : 'Fiyatı rakamla yaz, örneğin 4,5.';
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
  lastScoredQuestion = q;
  const scored = scoreGuess(guess, q.price);
  const today = dayKey();
  const firstToday = isFirstAnswerOfDay(state.streak, today);
  state.streak = updateStreak(state.streak, today);
  saveStreak();
  state.result = {
    guess,
    ...scored,
    score: applyHintPenalty(scored.score, state.hintsUsed),
    hinted: state.hintsUsed > 0,
    hintsUsed: state.hintsUsed,
    hintProductId: state.hintProductId,
    streakBump: firstToday && state.streak.count >= 2 ? state.streak.count : 0,
  };
  if (state.result.streakBump) streakFlarePending = true;
  // Günün Fişi keeps its own total out of 500; the free-play counters ("N soru · ortalama")
  // only count free questions, so the two never mix.
  if (!state.daily) {
    const prevBest = state.best;
    state.played += 1;
    state.total += state.result.score;
    state.best = Math.max(state.best, state.result.score);
    state.wrap.count += 1;
    state.wrap.sum += state.result.score;
    state.recentScores = [...state.recentScores, state.result.score].slice(-RECENT_MAX);
    state.result.badge = sessionBadge({ prevBest, score: state.result.score, playedAfter: state.played, recent: state.recentScores });
    state.sessionDirections.push(state.result.direction);
    state.result.tendencyLine = sessionTendencyLine(state.sessionDirections);
    const cold = advanceColdStreak(state.coldStreak, state.result.score);
    state.coldStreak = cold.state;
    state.result.coldTip = cold.text;
  }
  state.seen.delete(q.id);
  state.seen.add(q.id);
  saveSeen();
  const currentBest = resolveBestGuess(state.bestGuess, state.all);
  if (shouldReplaceBestGuess(currentBest, state.result.score)) {
    state.bestGuess = { productId: q.productId, date: q.date, score: state.result.score };
    saveBestGuess();
  }
  recordDailyAnswer(state.result.score, state.result.guess);
  saveSession();
  hapticIfAllowed(10);
  renderResult(q, state.result);
  printReceipt(soundForResult(state.result.score, state.result.direction === 'exact' ? 1 : state.result.factor));
}

// The receipt slides out of the printer slot while the printer sound plays, then gets torn off.
// Kept short (about a second) so it never stands between the player and the next question;
// a tap on the receipt finishes it at once.
const PRINT_MS = 1100;
const ROLL_MS = 950;
const SCORE_ROLL_MS = 520;
let printTimer = null;
let handTimer = null;
let cancelPrint = null;
let countUpRaf = null;
let scoreRaf = null;
let recordRing = null;
let dailyRing = null;

// Stops the price count-up, leaves the real price on the receipt, and reveals the current/change rows.
function stopCountUp() {
  if (countUpRaf !== null) {
    cancelAnimationFrame(countUpRaf);
    countUpRaf = null;
  }
  const el = $('r-actual');
  if (el) {
    const rollEl = el.querySelector('[aria-hidden="true"]');
    const srEl = el.querySelector('.visually-hidden');
    const finalPrice = state.question ? formatPrice(state.question.price) : srEl?.textContent;
    // Update the aria-hidden span in place so the live region does not re-announce the final price.
    if (rollEl && srEl && finalPrice) rollEl.textContent = finalPrice;
    else if (finalPrice) el.textContent = finalPrice;
  }
  $('r-current-row')?.classList.remove('awaiting-roll');
  $('r-increase-row')?.classList.remove('awaiting-roll');
}

// Settles the post-tear score roll in place so the live region does not re-announce the score.
function stopScoreRoll() {
  if (scoreRaf !== null) {
    cancelAnimationFrame(scoreRaf);
    scoreRaf = null;
  }
  const numEl = $('r-score')?.querySelector('.score-num');
  if (numEl && state.result) numEl.textContent = String(state.result.score);
}

// Counts the score up from 0 after the receipt tears so the score does not spoil the price roll while printing.
function startScoreRoll(target) {
  if (scoreRaf !== null) {
    cancelAnimationFrame(scoreRaf);
    scoreRaf = null;
  }
  const numEl = $('r-score')?.querySelector('.score-num');
  if (!numEl) return;
  if (typeof requestAnimationFrame !== 'function' || !(target > 0)) {
    numEl.textContent = String(target);
    return;
  }
  numEl.textContent = '0';
  const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const tick = () => {
    const elapsed = nowFn() - startMs;
    if (elapsed < SCORE_ROLL_MS) {
      numEl.textContent = String(Math.round(target * easeOutCubic(elapsed / SCORE_ROLL_MS)));
      scoreRaf = requestAnimationFrame(tick);
    } else {
      stopScoreRoll();
    }
  };
  scoreRaf = requestAnimationFrame(tick);
}

// Cancel any in-flight print timer, click listener, and printer audio when leaving the result screen early.
function stopPrinting() {
  sound.stop('print');
  stopCountUp();
  stopScoreRoll();
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
// till slides up and away and the receipt is left on its own, "handed" to the player.
function turnIntoMachine() {
  const qs = $('question-screen');
  const form = $('guess-form');
  // Unhide first: a hidden form has no layout, so offsetHeight would be 0 and the fold would never animate.
  qs.hidden = false;
  const h = form.offsetHeight;
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
  warmShareImage();
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

// One sentence for screen readers. #r-receipt is not a live region: the whole card is rewritten at once,
// which would read out as a dozen fragments. Clear first so an identical sentence announces again.
// "99.999.999" lost its last digit under the ₺ sign on 360 px phones: a number that overflows the box
// steps the font down (twice at most), measured rather than counted because widths differ per phone.
function fitGuessFont(el) {
  el.classList.remove('long', 'longer');
  if (el.scrollWidth <= el.clientWidth) return;
  el.classList.add('long');
  if (el.scrollWidth > el.clientWidth) el.classList.add('longer');
}

let resultAnnounceTimer = null;
function announceResult() {
  const el = $('sr-status');
  if (!el || !state.question || !state.result) return;
  const verdict = verdictText(state.result).replace(/[^\p{L}\p{N}\s!?.,']/gu, '').replace(/[!?.\s]+$/, '');
  const text = `Gerçek fiyat ${formatPrice(state.question.price)}. ${verdict}. Puanın ${state.result.score}.`;
  el.textContent = '';
  clearTimeout(resultAnnounceTimer);
  resultAnnounceTimer = setTimeout(() => { el.textContent = text; }, 60);
}

function printReceipt(extraSound) {
  announceResult();
  recordRing?.cancel();
  dailyRing?.cancel();
  const wrap = document.querySelector('#result-screen .receipt-wrapper');
  stopPrinting();
  wrap.classList.remove('printing', 'torn');
  $('result-screen').classList.remove('handed');
  $('next-btn').classList.remove('nudge');
  const finish = ({ skipped = false } = {}) => {
    sound.stop('print');
    stopCountUp();
    clearTimeout(printTimer);
    printTimer = null;
    wrap.removeEventListener('click', skipPrint);
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
      if (skipped) stopScoreRoll();
      else startScoreRoll(state.result.score);
      // A new session record gets a one-shot gold ring once the score has landed (fresh print only).
      if (state.result.badge?.includes('Yeni rekor')) {
        recordRing = $('r-receipt').querySelector('.score-box')?.animate(
          [{ boxShadow: '0 0 0 0 rgba(224,160,32,.55)' }, { boxShadow: '0 0 0 8px rgba(224,160,32,0)' }],
          { duration: 900, easing: 'ease-out', delay: skipped ? 0 : SCORE_ROLL_MS, fill: 'backwards' });
      }
      // A new all-time daily best or played-count milestone gets the same gold ring on the summary card.
      if (isDailyEndTurn() && $('r-card-milestone') && !$('r-card-milestone').hidden) {
        dailyRing = $('r-card')?.animate(
          [{ boxShadow: '0 0 0 0 rgba(224,160,32,.55)' }, { boxShadow: '0 0 0 8px rgba(224,160,32,0)' }],
          { duration: 900, easing: 'ease-out', delay: skipped ? 0 : 760, fill: 'backwards' });
      }
      $('r-meter').style.setProperty('--score', `${state.result.score}%`);
      const tier = scoreTier(state.result.score);
      if (tier === 'great') $('r-image').classList.add('bounce');
      else if (tier === 'bad') $('r-image').classList.add('shake');
    }
    $('r-stamp').classList.add('stamped');
    // Same moment as the counter bell: a 100-point guess (within 10%), not only an exact kuruş match.
    if (state.result?.direction === 'exact') burstConfetti();
    // Let the tear finish (0.3 s) before the till leaves.
    handTimer = setTimeout(handOver, 320);
    // The till takes 0.38 s to leave; then the report card would still sit behind the sticky bar.
    setTimeout(revealReportCard, 760);
  };
  const skipPrint = () => finish({ skipped: true });
  cancelPrint = () => {
    recordRing?.cancel();
    dailyRing?.cancel();
    stopCountUp();
    stopScoreRoll();
    wrap.removeEventListener('click', skipPrint);
    wrap.classList.remove('printing');
    // Leaving mid-print (e.g. to the archive) must not strand an empty meter and a hidden stamp
    // on the receipt the player can come back to.
    if (state.result) $('r-meter').style.setProperty('--score', `${state.result.score}%`);
    $('r-stamp').classList.add('stamped');
    $('result-screen').classList.add('handed');
  };
  turnIntoMachine();
  sound.play('print');
  if (state.result && typeof requestAnimationFrame === 'function') {
    const scoreEl = $('r-score');
    const numEl = scoreEl?.querySelector('.score-num');
    if (numEl) {
      // Hold the visible score at "—" while printing so it does not spoil the price roll;
      // the visually-hidden span gives screen readers the final score once.
      numEl.setAttribute('aria-hidden', 'true');
      numEl.textContent = '—';
      let srScore = scoreEl.querySelector('.visually-hidden');
      if (!srScore) {
        srScore = document.createElement('span');
        srScore.className = 'visually-hidden';
        numEl.after(srScore);
      }
      srScore.textContent = String(state.result.score);
    }
  }
  const frames = countUpFrames(state.question.price, { frames: 60 });
  if (frames.length > 0 && typeof requestAnimationFrame === 'function') {
    const actualEl = $('r-actual');
    // Hold today's price and the multiplier until the real price lands so they do not spoil the roll.
    $('r-current-row')?.classList.add('awaiting-roll');
    $('r-increase-row')?.classList.add('awaiting-roll');
    // Keep the final price in the accessibility tree while an aria-hidden span rolls the visible digits.
    const rollEl = document.createElement('span');
    rollEl.setAttribute('aria-hidden', 'true');
    rollEl.textContent = formatPrice(frames[0]);
    const srEl = document.createElement('span');
    srEl.className = 'visually-hidden';
    srEl.textContent = formatPrice(state.question.price);
    actualEl.replaceChildren(rollEl, srEl);
    // Elapsed time picks the frame so 120 Hz screens do not finish the roll in half a second.
    const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const tick = () => {
      const elapsed = nowFn() - startMs;
      if (elapsed < ROLL_MS) {
        const idx = Math.min(frames.length - 1, Math.max(0, Math.floor((elapsed / ROLL_MS) * frames.length)));
        rollEl.textContent = formatPrice(frames[idx]);
        countUpRaf = requestAnimationFrame(tick);
      } else {
        stopCountUp();
      }
    };
    countUpRaf = requestAnimationFrame(tick);
  }
  void wrap.offsetWidth; // restart the CSS animation for back-to-back results
  wrap.classList.add('printing');
  wrap.addEventListener('click', skipPrint);
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
  $('result-screen').classList.remove('revisit');
  stopCountUp();
  stopScoreRoll();
  $('r-stamp').classList.remove('stamped');
  $('r-title').textContent = `${formatPeriod(q.date)} · ${questionTitle(q)}`;
  renderResultImage(q);
  $('r-unit').textContent = unitLine(q.unit, q.region);
  $('r-guess').textContent = formatPrice(r.guess);
  $('r-actual-label').textContent = actualLabel(q.productId);
  $('r-actual').textContent = formatPrice(q.price);
  // The newest launch is both a question and the "current" price: no comparison with itself.
  const hasCurrent = q.current !== null && !(q.current.date === q.date && q.current.price === q.price);
  $('r-current-row').hidden = !hasCurrent;
  $('r-increase-row').hidden = !hasCurrent;
  if (hasCurrent) {
    // The month and year stay together on narrow screens: "Güncel / (Kasım 2026)", never "(Kasım / 2026)".
    $('r-current-label').textContent = `${q.current.label || 'Güncel'} (${formatPeriod(q.current.date).replace(/ /g, ' ')})`;
    $('r-current').textContent = formatPrice(q.current.price);
    // A newer model ("En yeni iPhone 17") is a different item, so "Değişim" would read as if this one got pricier.
    const ratio = q.current.price / q.price;
    $('r-increase-label').textContent = q.current.label ? 'Aradaki fark' : 'Değişim';
    $('r-increase').textContent = q.current.label && ratio >= 2 ? `${formatRatio(ratio)} kat pahalı` : formatIncrease(ratio);
  }
  $('r-verdict').textContent = verdictText(r);
  const timewarpEl = $('r-timewarp');
  if (timewarpEl) {
    const productRows = state.all.filter((x) => x.productId === q.productId);
    const warp = r.direction !== 'exact' && r.factor >= TIME_WARP_MIN_FACTOR
      ? matchGuessedPeriod(r.guess, productRows, q.date, q.current)
      : null;
    const warpText = timeWarpText(r.guess, warp, { amount: isAmount(q.productId) });
    timewarpEl.textContent = warpText;
    timewarpEl.hidden = !warpText;
  }
  // Number, "/100" and the hint note are separate spans so CSS can size them; the text reads the same.
  const scoreEl = $('r-score');
  const num = document.createElement('span');
  num.className = 'score-num';
  num.textContent = String(r.score);
  const max = document.createElement('span');
  max.className = 'score-max';
  max.textContent = '/100';
  scoreEl.replaceChildren(num, max);
  if (r.hinted && r.score > 0) { // "%20 düştü" means nothing on a zero
    const hint = document.createElement('span');
    hint.className = 'score-hint';
    hint.textContent = r.hintsUsed >= 2 ? ' (2 ipucu aldığın için %40 düştü)' : ' (ipucu aldığın için %20 düştü)';
    scoreEl.append(hint);
  }
  const tier = scoreTier(r.score);
  const line = contextComment({ direction: r.direction, factor: r.factor, productId: q.productId, amount: isAmount(q.productId) }, Math.random, state.recentLines)
    ?? cashierComment(tier, Math.random, { amount: isAmount(q.productId), recent: state.recentLines });
  state.recentLines = rememberLine(state.recentLines, line);
  $('r-cashier').textContent = `“${line}”`;
  if ($('r-tendency')) {
    $('r-tendency').textContent = r.tendencyLine || '';
    $('r-tendency').hidden = !r.tendencyLine;
  }
  if ($('r-tip')) {
    $('r-tip').textContent = r.coldTip || '';
    $('r-tip').hidden = !r.coldTip;
  }
  // The slip already showed its everyday product; dollar and wage only if hint 2 (or the rates-only hint) was used.
  const ratesSeen = r.hintsUsed >= 2 || (r.hinted && !r.hintProductId);
  const hintSeen = new Set([r.hintProductId, ...(ratesSeen ? ['dolar', 'asgari-ucret'] : [])]);
  const followPool = r.hinted ? state.all.filter((x) => !hintSeen.has(x.productId)) : state.all;
  const followUp = state.daily && state.daily.scores.length < state.daily.ids.length
    ? null
    : (state.lastFollow?.qid === q.id && state.lastFollow.pick) || pickFollowUp(q, followPool, state.recentProducts, Math.random, state.lastFollow?.pick?.productId ?? null);
  if (followUp && state.lastFollow?.qid !== q.id) state.lastFollow = { qid: q.id, pick: followUp };
  const followBtn = $('followup-btn');
  if (followBtn) {
    followBtn.hidden = !followUp;
    if (followUp) {
      followBtn.textContent = `Peki ${inPeriod(formatPeriod(followUp.date))} ${questionTitle(followUp).replace(/\s*\(.*\)$/, '')} kaç liraydı? →`; // the arrow never sits alone on the last line
      followBtn.onclick = () => nextQuestion(followUp.productId, followUp.date);
      preloadIcon(questionIconUrl(followUp));
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

  const contextText = buildContextLine(q, state.all);
  $('r-context').textContent = contextText || '';
  $('r-context').hidden = !contextText;

  renderPriceChart('r-chart', q.productId, q.date, r.guess);

  const taxText = buildTaxLine(q);
  $('r-tax').textContent = taxText || '';
  $('r-tax').hidden = !taxText;
  renderTaxDetails(q);

  $('r-archive').textContent = isAmount(q.productId) ? 'Yıllar içindeki tutarları →' : 'Bu ürünün fiyat geçmişi →';
  $('r-archive').onclick = () => pinArchive(q.productId, q.date, true);
  $('r-source').href = q.source.url;
  // Publisher + year keeps "Kaynak: …" on one row; the full headline stays in title/aria-label.
  $('r-source').textContent = sourceLinkText(q.source, q.date) || shortTitle(q.source.title);
  $('r-source').title = q.source.title;
  $('r-source').setAttribute('aria-label', `${$('r-source').textContent} kaynağı: ${q.source.title}`);
  const kindLabel = sourceKindLabel(q.source.kind);
  // Its own small line under the source (see CSS): the link is an inline-block, so an inline " · haberlerden"
  // wrapped alone with a dangling dot on phones.
  $('r-source-kind').textContent = kindLabel || '';
  $('r-source-kind').hidden = !kindLabel;
  // One line on a 360 px phone: the best score already sits on the home menu.
  const streakHint = r.streakBump >= 2 ? ` · 🔥 ${r.streakBump} gün` : '';
  // During Günün Fişi the line follows the receipt (its own total), not the free-play counters.
  const sessionText = dailyRun
    ? `Günün fişi ${dailyRun.done}/${dailyRun.of} · toplam ${dailyRun.total}`
    // After one question an "ortalama" is just the score above it again.
    : state.played === 1 ? 'İlk soru tamam'
    : `${state.played} soru · ortalama ${Math.round(state.total / Math.max(1, state.played))}`;
  const ticks = state.recentScores.map((s, i, a) => `<span class="tally-dot${i === a.length - 1 ? ' tally-last' : ''}" data-tier="${scoreTier(s)}" title="${s} puan"></span>`).join('');
  $('r-session').innerHTML = `<span>${sessionText}${streakHint}${dailyRun ? '' : r.badge || ''}</span>`
    + (!dailyRun && state.recentScores.length > 1 ? `<span class="tally" role="img" title="Son ${state.recentScores.length} puanın" aria-label="Son ${state.recentScores.length} puanın: ${state.recentScores.join(', ')}"><span class="tally-label" aria-hidden="true">son ${state.recentScores.length} puanın</span>${ticks}</span>` : '');
  showGameScreen('result-screen');
  window.scrollTo(0, 0);
  $('r-receipt').focus({ preventScroll: true }); // the submit button just disappeared; read the receipt next
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

  const caveatHtml = `<p class="tax-caveat">Vergi payı tahminidir; mağazanın kârı ayrıca hesaplanmadı.</p>`;
  // Plain words for the two taxes most people only know by their initials (general definitions, no numbers).
  const gloss = [tb.rates.kdv > 0 && 'KDV her alışverişte fiyata eklenen vergidir', tb.rates.otv > 0 && 'ÖTV bazı mallara konan ek vergidir']
    .filter(Boolean).join('; ');
  const glossHtml = gloss ? `<p class="tax-caveat">${gloss}.</p>` : '';

  let sourcesHtml = '';
  if (Array.isArray(tb.period.sources) && tb.period.sources.length > 0) {
    const links = tb.period.sources
      .map((s) => `<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title)}</a>`)
      .join('');
    // One source per line (CSS): joined with " · " they wrapped into lone dots on phones.
    sourcesHtml = `<p class="tax-period-sources">Kaynaklar: ${links}</p>`;
  }

  body.innerHTML = tableHtml + glossHtml + caveatHtml + sourcesHtml;
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
  if ($('r-card-milestone')) {
    $('r-card-milestone').textContent = '';
    $('r-card-milestone').hidden = true;
  }
  if (renderDailyCard()) return;
  setDailyEndTurn(false);
  resetShareBtn();
}

function initIntro() {
  const dlg = $('intro');
  if (!dlg) return;
  $('intro-play')?.addEventListener('click', () => {
    closeIntro();
    // Opened from the footer on a result, #tahmin is already the hash: start a fresh question instead.
    if (location.hash === '#tahmin' && state.lastGameScreen === 'result-screen' && !$('result-screen').hidden) nextQuestion();
    else location.hash = '#tahmin';
  });
  // The button says "Ana menüye geç": from a game or archive screen it really goes to the menu.
  $('intro-close')?.addEventListener('click', () => {
    closeIntro();
    if (location.hash && location.hash !== '#') location.hash = '#';
  });
  $('intro-open')?.addEventListener('click', openIntro);
  // Pressing Escape dismisses the modal via cancel; mark seen and stop any running intro timers/sounds.
  dlg.addEventListener('cancel', () => {
    introSeq += 1;
    finishIntro?.({ moveFocus: false });
    finishIntro = null;
    saveIntroSeen();
  });
  // When the intro closes (Esc, #intro-close, #intro-play), move focus to the visible screen's heading
  // if focus landed on body. If opened via the footer button, focus returns there natively.
  // At 'close' focus is still on a button inside the now hidden dialog (it drops to <body> on the next
  // render), so treat focus inside the dialog as lost too.
  dlg.addEventListener('close', () => {
    rescueFocus({ includeBody: true, within: dlg });
  });
}

// The archive screen loads on first visit; it is not needed to play.
let archiveUiPromise = null;
function loadArchiveUi() {
  archiveUiPromise ??= import('./archive-ui.js').then((mod) => {
    mod.initArchiveUi({ getState: () => state, nextQuestion, show, syncSkipBtn });
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
  // On a slow first load the player may have pressed Back meanwhile; do not pull the archive over the menu.
  if ($('timeline-screen').hidden) return;
  return mod.renderTimelineScreen(focusProductId);
}

// Day the menu was last drawn for: the streak lines ("Serini koru", "🔥 N gün") go stale after midnight.
let homeDay = null;
let streakFlarePending = false;
function refreshHomeIfNewDay() {
  if (document.visibilityState !== 'visible' || $('home-screen').hidden || homeDay === null) return;
  if (dayKey() !== homeDay) renderHome();
}

function renderHome() {
  state.archiveFromResult = false;
  state.archivePin = null;
  // After the daily receipt the question is spent; keeping it would offer "Sonuca dön" into a finished fiş.
  if (isDailyEndTurn()) {
    state.question = null;
    setDailyEndTurn(false);
  }
  const today = dayKey();
  homeDay = today;
  const alive = streakAlive(state.streak, today) && state.streak.count >= 2;
  const streakMeta = alive ? ` · 🔥 ${state.streak.count} gün üst üste` : '';
  $('m-tahmin').textContent = state.played > 0
    // One question: average and best are the same number, so say it once.
    ? (state.played === 1 ? `1 soru · puanın ${state.total}` : `${state.played} soru · ortalama ${Math.round(state.total / state.played)}` + (state.best > 0 ? ` · en yüksek ${state.best}` : '')) + streakMeta
    : alive ? `🔥 ${state.streak.count} gün üst üste` : '';
  renderDailyMenu();
  const prices = state.timelines.reduce((n, t) => n + t.rows.length, 0);
  $('home-stats').textContent = `${state.timelines.length} ürün · ${prices} gerçek fiyat`;
  $('home-stats').hidden = state.timelines.length === 0;
  const best = resolveBestGuess(state.bestGuess, state.all);
  const bestLine = best ? bestGuessText(best.question, best.score) : '';
  const bestEl = $('home-best');
  if (bestEl) {
    bestEl.textContent = bestLine;
    bestEl.hidden = !bestLine;
  }
  const streakLine = homeStreakText(state.streak, today);
  $('home-streak').textContent = streakLine;
  $('home-streak').hidden = !streakLine;
  // One warm line after a run of free questions; shown once, then the sitting counter restarts.
  const wrapText = sessionWrapText(state.wrap.count, state.wrap.count ? state.wrap.sum / state.wrap.count : 0);
  $('home-wrap').textContent = wrapText;
  $('home-wrap').hidden = !wrapText;
  if (wrapText) state.wrap = { count: 0, sum: 0 };
  if (!$('fact-body').hasChildNodes()) renderFact();
  renderHomeSpark();
  // Coming back to the menu does not reset the game, so say so instead of "Başla".
  $('m-go').textContent = !state.question ? 'Başla →'
    : state.lastGameScreen === 'result-screen' ? `Sonuca dön · Soru ${state.round} →` : `Devam et · Soru ${state.round} →`;
  show('home-screen');
  if (streakFlarePending) {
    motion($('m-tahmin'), [{ backgroundColor: 'rgba(224,160,32,0)' }, { backgroundColor: 'rgba(224,160,32,.28)' }, { backgroundColor: 'rgba(224,160,32,0)' }], 900, 'ease-out');
    streakFlarePending = false;
  }
}

// A tiny gold-price line on the archive card hints at what is inside; decorative only.
function renderHomeSpark() {
  const el = $('m-spark');
  if (el.hasChildNodes()) return;
  const t = state.timelines.find((x) => x.id === 'gram-altin') ?? state.timelines[0];
  const chart = t && buildPriceChart(t.rows, { width: 44, height: 18, pad: { top: 3, right: 3, bottom: 3, left: 3 } });
  if (!chart) return;
  const last = chart.points[chart.points.length - 1];
  el.innerHTML = `<svg viewBox="0 0 44 18" width="44" height="18" focusable="false"><path d="${chart.line}" pathLength="1"/><circle cx="${last.x}" cy="${last.y}" r="2.5"/></svg>`;
  // Drawn once per visit to the site: the line writes itself left to right, then its end dot lands.
  el.querySelector('path').animate?.([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 600, delay: 300, easing: 'ease-out', fill: 'backwards' });
  el.querySelector('circle').animate?.([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 240, delay: 860, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' });
}

let lastFactId = null;
let factSwapping = false;

// Spin the arrow once and slide the old fact out before rendering the new one;
// ignore double-clicks during the 120ms exit to prevent card height flickering.
function swapFact() {
  if (factSwapping) return;
  const icon = $('fact-next')?.querySelector('.fact-spin');
  if (icon?.animate) {
    icon.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(360deg)' },
      ],
      { duration: 450, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
    );
  }
  const body = $('fact-body');
  if (!body || !body.hasChildNodes() || !body.animate) {
    sound.play('beep');
    renderFact();
    return;
  }
  factSwapping = true;
  sound.play('beep');
  const anim = body.animate(
    [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(-8px)' },
    ],
    // forwards: the old text must not flash back for a frame before the new one is in.
    { duration: 120, easing: 'ease-out', fill: 'forwards' }
  );
  anim.onfinish = () => {
    factSwapping = false;
    renderFact();
    anim.cancel();
  };
  anim.oncancel = () => {
    factSwapping = false;
  };
}

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
  // A focused control that hides itself on the new screen (the header house button on the menu)
  // drops focus to <body> before rescueFocus runs; only a real starting point may stay on <body>.
  const hadFocus = document.activeElement && document.activeElement !== document.body;
  closeDailyReview();
  closePreview(); // Back while the preview is open must not leave the modal over another screen
  const hash = location.hash;
  if (state.all.length === 0) return;
  // Back from the archive during a daily run lands on #gunun-fisi, which must resume the screen
  // the player left instead of advancing to the next question.
  const resumeDaily = hash === '#gunun-fisi' && state.daily && state.question;
  if ((hash !== '#tahmin' && !resumeDaily) || !state.question || state.lastGameScreen !== 'result-screen') {
    stopPrinting();
  }
  if (hash === '#arsiv') {
    renderTimelineScreen();
  } else if (hash === '#gunun-fisi' && !resumeDaily) {
    startOrShareDaily();
  } else if (hash === '#tahmin' || resumeDaily) {
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
  rescueFocus({ includeBody: hadFocus });
}

// After in-app navigation the focused link ("Ana menüye dön", a menu card) is inside a now
// hidden screen, so keyboard and screen reader users would restart from the top of the page.
// The first load is left alone: focus on <body> is the browser's normal starting point.
function rescueFocus({ includeBody = false, within = null } = {}) {
  const lost = !document.activeElement
    || (includeBody && document.activeElement === document.body)
    || Boolean(within?.contains(document.activeElement))
    || Boolean(document.activeElement.closest('[hidden]'));
  if (!lost) return;
  // The result screen has no heading; its receipt is the natural place to continue.
  const heading = document.querySelector('main > section:not([hidden]) h2')
    ?? (!$('result-screen').hidden ? $('r-receipt') : null);
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
  soundOff: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M3 3l18 18"/>'),
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
function applyTheme(next) {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  renderThemeToggle();
}
function spinThemeToggle() {
  $('theme-toggle').classList.add('spin');
  clearTimeout(themeAnimTimer);
  themeAnimTimer = setTimeout(() => {
    document.documentElement.classList.remove('theme-anim');
    $('theme-toggle').classList.remove('spin');
  }, 450);
}
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const root = document.documentElement;
  // Where the browser can snapshot the page, the new theme spreads out from the button as a circle,
  // like a light being switched on. The colour fade is the fallback (and must stay off here: the new
  // snapshot would otherwise catch colours halfway through their transition).
  if (typeof document.startViewTransition === 'function' && typeof root.animate === 'function') {
    const b = $('theme-toggle').getBoundingClientRect();
    const x = Math.round(b.left + b.width / 2);
    const y = Math.round(b.top + b.height / 2);
    const r = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)));
    spinThemeToggle();
    const t = document.startViewTransition(() => applyTheme(next));
    t.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(.45,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => {});
    return;
  }
  root.classList.add('theme-anim');
  spinThemeToggle();
  applyTheme(next);
}

// Starts the sound downloads after the menu had its first frame and the page has loaded, so they never
// compete with the critical path. play() still fetches on demand if a sound is needed earlier.
function scheduleSoundPrefetch() {
  const run = () => {
    const later = () => { sound.prefetch(); sound.prime(); };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(later, { timeout: 3000 });
    else setTimeout(later, 500);
  };
  const afterFrame = () => requestAnimationFrame(() => setTimeout(run, 0));
  if (document.readyState === 'complete') afterFrame();
  else window.addEventListener('load', afterFrame, { once: true });
}

async function init() {
  const versionEl = $('app-version');
  if (versionEl) versionEl.textContent = VERSION;
  loadSession();
  loadSeen();
  loadStreak();
  loadBestGuess();
  // Decided once at load: a returning player never gets the opener list again.
  state.firstVisit = state.played === 0;
  state.openerIndex = 0;
  renderThemeToggle();
  $('theme-toggle').addEventListener('click', toggleTheme);
  $('fact-next').addEventListener('click', swapFact);
  setupInstallButton();
  $('message-retry')?.addEventListener('click', () => location.reload());
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
  // A phone left on the menu overnight: redraw it for the new day when it comes back (or at midnight if open).
  document.addEventListener('visibilitychange', refreshHomeIfNewDay);
  setInterval(refreshHomeIfNewDay, 60000);
  // Sounds are small, but fetching them at load shared the slow link with prices.json and delayed the
  // menu. They are fetched once the menu is up (see scheduleSoundPrefetch); the first gesture's unlock() fetches them too.
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    state.raw = rawData;
    state.all = buildQuestions(rawData);
    state.timelines = buildTimelines(rawData);
  } catch (err) {
    console.error(err);
    showMessage('Fiyatlar yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.', { retry: true });
    return;
  }
  if (state.all.length === 0) {
    showMessage('Henüz doğrulanmış fiyat yok. Kaynaklı veri eklendiğinde sorular burada görünecek.');
    return;
  }
  initChartUi({ getState: () => state, onScrubTick: () => hapticIfAllowed(5) });
  initDailyUi({ getState: () => state, nextQuestion, renderHome, pinArchive });
  initShareUi({ getState: () => state, isDailyEndTurn });
  $('guess-form').addEventListener('submit', onGuess);
  const guessField = document.querySelector('#question-screen .guess-field');
  guessField?.addEventListener('animationend', () => {
    guessField.classList.remove('invalid');
  });
  // On touch devices the keyboard can hide "Tahmin et" while the input stays in view: scroll it into the visual viewport.
  const vv = window.visualViewport;
  const fitGuessButton = () => {
    const btn = document.querySelector('#guess-form button[type=submit]');
    const dy = keyboardFitDelta(btn.getBoundingClientRect(), $('guess-input').getBoundingClientRect(), vv.offsetTop, vv.height);
    if (dy > 0) window.scrollBy({ top: dy, behavior: 'smooth' });
  };
  if (vv && matchMedia('(pointer: coarse)').matches) {
    $('guess-input').addEventListener('focus', () => { fitGuessButton(); vv.addEventListener('resize', fitGuessButton); });
    $('guess-input').addEventListener('blur', () => vv.removeEventListener('resize', fitGuessButton));
  }
  let guessPrev = '';
  // True while the dots in the box are ones we inserted: then they are always thousands, so deleting a
  // digit from "1.250" gives "150", not "1.50" (which would read as 1,5 TL).
  let autoGrouped = false;
  $('guess-input').addEventListener('input', (e) => {
    guessField?.classList.remove('invalid'); // also clears a stale error without waiting for animationend
    if (!e.isComposing) {
      const el = e.target;
      let before = el.value;
      let caret = el.selectionStart ?? before.length;
      // Backspace over a "." would otherwise just get the dot re-inserted: take the digit before it instead.
      if (e.inputType === 'deleteContentBackward' && caret > 0 && guessPrev.length === before.length + 1 && guessPrev[caret] === '.') {
        before = before.slice(0, caret - 1) + before.slice(caret);
        caret -= 1;
      }
      // Digits before the caret, counted before any dot is dropped below.
      const digits = before.slice(0, caret).replace(/\D/g, '').length;
      if (!before.includes('.')) autoGrouped = false;
      const source = autoGrouped && !before.includes(',') ? before.replace(/\./g, '') : before;
      const after = formatInputThousands(source);
      if (after !== before) autoGrouped = after.includes('.');
      if (after !== before || before !== el.value) {
        // Keep the caret after the same number of digits so editing mid-number does not jump to the end.
        el.value = after;
        let pos = 0;
        for (let seen = 0; pos < after.length && seen < digits; pos++) if (/\d/.test(after[pos])) seen++;
        if (caret >= before.length) pos = after.length; // typing at the end must stay after a trailing comma
        el.setSelectionRange(pos, pos);
      }
      guessPrev = el.value;
    }
    const clearBtn = $('guess-clear');
    if (clearBtn) clearBtn.hidden = e.target.value === '';
    fitGuessFont(e.target);
    const v = parseGuess(e.target.value);
    // An old "Geçerli bir fiyat yaz" next to a valid number reads like the game rejects it.
    if (v !== null || e.target.value === '') $('guess-error').textContent = '';
    $('guess-readout').textContent = e.target.value.trim() === '' ? emptyReadout() : readoutText(v);
    // The first time the box holds a real price, "Tahmin et" swells once: a quiet "ready when you are".
    const valid = v !== null;
    if (valid && e.target.dataset.valid !== '1') {
      e.target.form?.querySelector('button[type="submit"]')?.animate?.(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }],
        { duration: 320, easing: 'cubic-bezier(.3,.7,.3,1)' },
      );
    }
    if (valid) e.target.dataset.valid = '1';
    else delete e.target.dataset.valid;
  });
  const clearGuess = () => {
    const input = $('guess-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus({ preventScroll: true });
  };
  $('guess-clear')?.addEventListener('click', clearGuess);
  $('guess-input').addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target.value !== '') { e.preventDefault(); clearGuess(); }
  });
  // Skipping is free: no score and no stats, so players can drop a product they do not know.
  $('skip-btn').addEventListener('click', () => {
    state.pendingSkip = state.question;
    // The screen is already visible, so give the fresh card its own entrance, then the skipped-answer strip.
    const enterCard = () => {
      if ($('question-screen').hidden) return; // the last daily skip goes to the result instead
      motion(document.querySelector('#question-screen .question-card'), [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], 220, 'cubic-bezier(.2,.8,.2,1)');
      if (!$('q-skipped').hidden) motion($('q-skipped'), [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], 250, 'ease-out', 80);
    };
    const handled = skipDaily();
    if (handled) { state.pendingSkip = null; enterCard(); return; }
    state.skips += 1;
    nextQuestion(); // its barcode beep doubles as the skip sound
    enterCard();
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
    // Enter inside an open dialog (share preview, intro) must not advance the game behind it.
    if (document.querySelector('dialog[open]')) return;
    // A quick second Enter right after submitting must not skip the receipt; like a tap,
    // it only finishes the printing so keyboard users can hurry it too.
    const wrap = document.querySelector('#result-screen .receipt-wrapper');
    if (wrap.classList.contains('printing')) { e.preventDefault(); wrap.click(); return; }
    // The chart is focusable for arrow-key inspection; Enter there must not drop the receipt.
    if (e.target instanceof Element && e.target.closest('a, button, input, textarea, select, summary, [contenteditable], .price-chart')) return;
    e.preventDefault();
    $('next-btn').click();
  });
  initIntro();
  scheduleSoundPrefetch();

  const searchParams = new URLSearchParams(location.search);
  const rawSoru = searchParams.get('soru');
  const rawP = searchParams.get('p');
  const parsedSoru = parseQuestionParam(rawSoru, rawP);
  const link = rawSoru !== null ? resolveFriendLink(parsedSoru, state.all) : null;
  if (link) {
    // Drop ?soru and &p so a reload does not repeat the shared question, and open it right away.
    history.replaceState(null, '', location.pathname + '#tahmin');
    nextQuestion(link.productId ?? null, link.date ?? null);
    // A score was earned on another question, so it is only kept for the exact one.
    state.friendScore = link.mode === 'exact' ? (parsedSoru.score ?? null) : null;
    $('q-anchor').textContent = link.mode === 'exact' ? friendIntroText(state.friendScore) : LINK_NOT_FOUND_TEXT;
    $('q-anchor').hidden = false;
    $('q-anchor').classList.add('friend-line'); // kept even on very short screens, unlike the year anecdote
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
  // Precaching re-downloads every file once (cache: 'reload'), about 300 KB on a first visit.
  // Wait for 'load' and then a quiet moment, so it does not compete with the menu, the intro
  // and the fonts on a slow phone; offline support only matters from the second visit on.
  // sw.js claims open pages right away, so an old page could lazy-load new modules with a changed API.
  // When a new worker takes over a page that already had one, reload once on the next safe moment:
  // while the tab is hidden, or on the next in-app navigation (the player is not typing then).
  // A first install has no controller yet, so nothing reloads.
  const hadController = !!navigator.serviceWorker.controller;
  let updated = false;
  let reloaded = false;
  const reloadOnce = () => {
    if (!updated || reloaded) return;
    reloaded = true;
    location.reload();
  };
  const reloadIfHidden = () => {
    if (document.visibilityState !== 'hidden') return;
    reloadOnce();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    updated = true;
    reloadIfHidden();
  });
  document.addEventListener('visibilitychange', reloadIfHidden);
  // Only on the way to the menu: a pinned archive or a result lives in memory and would be lost.
  window.addEventListener('hashchange', () => { if (!location.hash || location.hash === '#') reloadOnce(); });
  const register = () => navigator.serviceWorker.register('sw.js')
    .catch(err => console.warn('Service worker:', err));
  const later = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(register, { timeout: 8000 });
    else setTimeout(register, 4000);
  };
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}

registerServiceWorker();
init();
