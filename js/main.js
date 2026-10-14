// UI wiring: loads data, renders screens, handles input. Logic lives in game.js and format.js.
import { parseGuess, formatPrice, formatRatio, formatPeriod } from './format.js';
import { buildQuestions, buildContextLine, pickByCategory, scoreGuess, scoreTier } from './game.js';
import { buildTimelines } from './timeline.js';
import { sourceKindLabel } from './source-kind.js';
import { burstConfetti } from './confetti.js';
import { buildShareText, buildShareImageModel, buildShareFileName, verdictText, questionTitle } from './share-model.js';
import { buildTaxLine, taxBreakdown } from './tax.js';
import { cashierComment } from './cashier.js';
import { pickPair, judgePair, nextStreak } from './versus.js';
import { availableYears, buildYearReceipt, buildYearShareModel, buildYearShareText, buildYearShareFileName } from './yearly.js';
import { buildHint, applyHintPenalty } from './hint.js';
import { buildBasketRound, scoreBasket, MAX_QTY } from './basket.js';
import { initOrder, renderOrder, orderMeta } from './order-ui.js';
import { initBlitz, renderBlitz, stopBlitz, blitzBest } from './blitz-ui.js';
import { VERSION } from './version.js';

const DATA_URL = 'data/prices.json';
const $ = (id) => document.getElementById(id);
const escapeHTML = (str) => (str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '');

const state = {
  recentProducts: [], 
  hinted: false, raw: null, all: [], timelines: [], selectedYear: null, question: null, result: null, 
  played: 0, total: 0, best: 0, 
  lastGameScreen: 'question-screen', selectedTimelineProduct: null 
};
let shareOriginalLabel = '';
let shareTimeoutId = null;

function loadSession() {
  try {
    const data = JSON.parse(localStorage.getItem('ne-kadardi-session'));
    if (data && typeof data.played === 'number') {
      state.played = data.played;
      state.total = data.total;
      // Older saves have no best; the field is optional.
      if (Number.isFinite(data.best)) state.best = data.best;
    }
  } catch(e) {}
}

function saveSession() {
  try {
    localStorage.setItem('ne-kadardi-session', JSON.stringify({
      played: state.played,
      total: state.total,
      best: state.best
    }));
  } catch(e) {}
}

function show(screenId) {
  for (const id of ['message-screen', 'home-screen', 'question-screen', 'result-screen', 'timeline-screen', 'versus-screen', 'year-screen', 'basket-screen', 'order-screen', 'blitz-screen']) {
    $(id).hidden = id !== screenId;
  }
}

function showGameScreen(screenId) {
  state.lastGameScreen = screenId;
  show(screenId);
}

function showMessage(text) {
  $('message-text').textContent = text;
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

function nextQuestion() {
  resetShareBtn();
  if ($('r-tax-details')) {
    $('r-tax-details').hidden = true;
    $('r-tax-details').open = false;
  }
  const q = pickByCategory(state.all, state.recentProducts, state.question?.id);
  if (!q) {
    showMessage('Gösterilecek soru yok.');
    return;
  }
  state.question = q;
  state.recentProducts.push(q.productId);
  if (state.recentProducts.length > 12) state.recentProducts.shift();
  $('q-period').textContent = formatPeriod(q.date);
  
  const img = $('q-image');
  if (q.image) {
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
  state.hinted = false;
  const hint = buildHint(q, state.all);
  $('hint-btn').hidden = !hint;
  $('hint-text').hidden = true;
  $('hint-btn').onclick = () => {
    state.hinted = true;
    $('hint-text').innerHTML = `<p class="hint-slip-title">İpucu · ${escapeHTML(hint[0].period)}</p>`
      + hint.map((l) => `<div class="hint-row"><span>${escapeHTML(l.label)}</span><strong>${escapeHTML(l.value)}</strong></div>`).join('');
    $('hint-text').hidden = false;
    $('hint-btn').hidden = true;
    $('guess-input').focus();
  };
  renderGuessSteps();
  $('guess-error').textContent = '';
  showGameScreen('question-screen');
  $('guess-input').focus();
}

function onGuess(event) {
  event.preventDefault();
  const guess = parseGuess($('guess-input').value);
  if (guess === null) {
    $('guess-error').textContent = 'Geçerli bir fiyat yaz (ör. 4,5).';
    return;
  }
  const q = state.question;
  const scored = scoreGuess(guess, q.price);
  state.result = { guess, ...scored, score: applyHintPenalty(scored.score, state.hinted), hinted: state.hinted };
  state.played += 1;
  state.total += state.result.score;
  state.best = Math.max(state.best, state.result.score);
  saveSession();
  renderResult(q, state.result);
}

// Quick-add chips. Fixed steps on purpose: scaling them to the price would leak its magnitude.
function renderGuessSteps() {
  const box = $('guess-steps');
  box.textContent = '';
  for (const step of [10, 100, 1000]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn step';
    b.textContent = `+${step.toLocaleString('tr-TR')}`;
    b.addEventListener('click', () => {
      const input = $('guess-input');
      const cur = parseGuess(input.value);
      input.value = String((Number.isFinite(cur) ? cur : 0) + step).replace('.', ',');
      input.focus();
    });
    box.appendChild(b);
  }
}

function renderResult(q, r) {
  $('r-title').textContent = `${formatPeriod(q.date)} · ${questionTitle(q)}`;
  $('r-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('r-guess').textContent = formatPrice(r.guess);
  $('r-actual').textContent = formatPrice(q.price);
  $('r-verdict').textContent = verdictText(r);
  $('r-score').textContent = r.hinted ? `${r.score}/100 (ipucu: -%20)` : `${r.score}/100`;
  const tier = scoreTier(r.score);
  $('r-cashier').textContent = `“${cashierComment(tier)}”`;
  document.querySelector('.verdict-box').dataset.tier = tier;
  document.querySelector('.score-box').dataset.tier = tier;
  $('r-meter').style.setProperty('--score', `${r.score}%`);
  if (r.factor === 1) burstConfetti();

  // The newest launch is both a question and the "current" price: no comparison with itself.
  const hasCurrent = q.current !== null && !(q.current.date === q.date && q.current.price === q.price);
  $('r-current-row').hidden = !hasCurrent;
  if (hasCurrent) {
    $('r-current-label').textContent = `${q.current.label || 'Güncel'} (${formatPeriod(q.current.date)})`;
    $('r-current').textContent = formatPrice(q.current.price);
    $('r-increase').textContent = `${formatRatio(q.current.price / q.price)} kat arttı`;
  }

  const contextText = buildContextLine(q, state.all);
  $('r-context').textContent = contextText || '';
  $('r-context').hidden = !contextText;

  const taxText = buildTaxLine(q);
  $('r-tax').textContent = taxText || '';
  $('r-tax').hidden = !taxText;
  renderTaxDetails(q);

  $('r-source').href = q.source.url;
  $('r-source').textContent = q.source.title;
  const kindLabel = sourceKindLabel(q.source.kind);
  $('r-source-kind').textContent = kindLabel ? ` · ${kindLabel}` : '';
  $('r-source-kind').hidden = !kindLabel;
  $('r-session').textContent = `Toplam: ${state.played} soru · ortalama ${Math.round(state.total / state.played)} puan`;
  showGameScreen('result-screen');
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

  const q = state.question;
  const r = state.result;
  const contextText = buildContextLine(q, state.all);
  const model = buildShareImageModel(q, r, { contextLine: contextText });
  
  try {
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

async function downloadImage() {
  const btn = $('download-btn');
  if (btn.hasAttribute('aria-busy')) return;
  
  const blob = await prepareShareImage('download-btn');
  if (!blob) {
    setBtnStatus('download-btn', 'Görsel hazırlanamadı.');
    return;
  }
  
  const q = state.question;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildShareFileName(q);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  setBtnStatus('download-btn', 'İndiriliyor…');
}

function renderTimelineScreen(focusProductId = null) {
  show('timeline-screen');
  if (state.timelines.length === 0) return;
  
  if (!state.selectedTimelineProduct) {
    state.selectedTimelineProduct = state.timelines[0].id;
  }
  
  const product = state.timelines.find(t => t.id === state.selectedTimelineProduct) || state.timelines[0];
  
  const picker = $('timeline-picker');
  picker.innerHTML = '';
  for (const t of state.timelines) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-chip';
    btn.setAttribute('aria-pressed', t.id === product.id ? 'true' : 'false');
    btn.dataset.id = t.id;
    
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
  
  if (focusProductId) picker.querySelector(`[data-id="${focusProductId}"]`)?.focus();

  $('t-title').textContent = product.name;
  $('t-unit').textContent = product.region ? `${product.unit} · ${product.region}` : product.unit;
  
  let html = `<table class="timeline-table">
    <caption class="visually-hidden">Fiyat geçmişi</caption>
    <thead>
      <tr>
        <th scope="col" class="visually-hidden">Tarih</th>
        <th scope="col" class="visually-hidden">Fiyat ve Artış</th>
      </tr>
    </thead>
    <tbody>`;

  for (const r of product.rows) {
    const period = r.isCurrent ? `${r.currentLabel || 'Güncel'} (${formatPeriod(r.date)})` : formatPeriod(r.date);
    const priceStr = formatPrice(r.price);
    const ratioStr = r.ratioToCurrent ? `${formatRatio(r.ratioToCurrent)} kat arttı` : '';
    
    const bar = `<div class="timeline-bar-track" aria-hidden="true">
                   <div class="timeline-bar-fill" style="width: ${r.barPercent}%"></div>
                 </div>`;
                 
    const kindLabel = r.source ? sourceKindLabel(r.source.kind) : '';
    const kindSpan = kindLabel ? `<span class="source-kind">${escapeHTML(kindLabel)}</span>` : '';
    const sourceLink = r.source ? `<a href="${escapeHTML(r.source.url)}" target="_blank" rel="noopener" class="timeline-source" title="${escapeHTML(r.source.title)}">Kaynak</a>${kindSpan}` : '';
    const note = r.note ? `<details class="timeline-note"><summary>Ayrıntı</summary><p>${escapeHTML(r.note)}</p></details>` : '';
    
    html += `<tr>
      <th scope="row">${period}</th>
      <td>
        <div class="timeline-price-row">
          <span class="timeline-price">${priceStr}</span>
          ${ratioStr ? `<span class="timeline-ratio">${ratioStr}</span>` : ''}
        </div>
        ${bar}
        <div class="timeline-meta">
          ${sourceLink}
          ${note}
        </div>
      </td>
    </tr>`;
  }
  html += `</tbody></table>`;
  
  $('t-rows-container').innerHTML = html;
}

// "Hangisi daha pahalıydı?" mode: pick the pricier of two past prices, build a streak.
const versus = { pair: null, recent: [], streak: 0, best: 0, locked: false };

function loadVersusBest() {
  try {
    const n = Number(localStorage.getItem('ne-kadardi-versus-best'));
    if (Number.isFinite(n) && n > 0) versus.best = n;
  } catch (e) {}
}

function saveVersusBest() {
  try { localStorage.setItem('ne-kadardi-versus-best', String(versus.best)); } catch (e) {}
}

function versusOptionHTML(q, withPrice) {
  const priceHTML = withPrice ? `<span class="v-price">${escapeHTML(formatPrice(q.price))}</span>` : '';
  return `<span class="v-period">${escapeHTML(formatPeriod(q.date))}</span>`
    + `<strong class="v-name">${escapeHTML(questionTitle(q))}</strong>`
    + `<span class="v-unit">${escapeHTML(q.region ? `${q.unit} · ${q.region}` : q.unit)}</span>`
    + priceHTML;
}

function renderVersus() {
  versus.locked = false;
  const pair = pickPair(state.all, Math.random, versus.recent);
  if (!pair) { showMessage('Karşılaştırılacak yeterli fiyat yok.'); return; }
  versus.pair = pair;
  versus.recent = [...versus.recent, pair.a.id, pair.b.id].slice(-8);
  for (const side of ['a', 'b']) {
    const btn = $(`v-${side}`);
    btn.innerHTML = versusOptionHTML(pair[side], false);
    btn.disabled = false;
    delete btn.dataset.state;
  }
  $('v-feedback').textContent = '';
  $('v-next').hidden = true;
  $('v-streak').textContent = versus.streak;
  $('v-best').textContent = versus.best;
  show('versus-screen');
  if (document.activeElement === document.body || document.activeElement?.closest('[hidden]')) $('v-title').focus();
}

function onVersusPick(side) {
  if (versus.locked || !versus.pair) return;
  versus.locked = true;
  const res = judgePair(versus.pair, side);
  versus.streak = nextStreak(versus.streak, res.correct);
  if (versus.streak > versus.best) { versus.best = versus.streak; saveVersusBest(); }
  for (const s of ['a', 'b']) {
    const btn = $(`v-${s}`);
    btn.innerHTML = versusOptionHTML(versus.pair[s], true);
    btn.disabled = true;
    btn.dataset.state = s === res.winner ? 'win' : 'lose';
  }
  const times = formatRatio(res.ratio);
  $('v-feedback').textContent = res.correct
    ? `Doğru! ${times} kat daha pahalıydı.`
    : `Yanlış. Diğeri ${times} kat daha pahalıydı.`;
  $('v-streak').textContent = versus.streak;
  $('v-best').textContent = versus.best;
  $('v-next').hidden = false;
  $('v-next').focus();
}

function renderYearScreen(focusYear = null) {
  show('year-screen');
  const years = availableYears(state.raw);
  if (years.length === 0) return;
  if (!years.includes(state.selectedYear)) state.selectedYear = years[0];
  const picker = $('year-picker');
  picker.textContent = '';
  for (const y of years) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-chip';
    btn.setAttribute('aria-pressed', y === state.selectedYear ? 'true' : 'false');
    btn.textContent = String(y);
    btn.addEventListener('click', () => { state.selectedYear = y; renderYearScreen(y); });
    if (y === focusYear) queueMicrotask(() => btn.focus());
    picker.appendChild(btn);
  }
  const { rows } = buildYearReceipt(state.raw, state.selectedYear);
  $('y-title').textContent = `${state.selectedYear} · Yıllık fiş`;
  $('y-count').textContent = `${rows.length} kalem`;
  $('y-rows').innerHTML = `<table class="timeline-table"><tbody>${rows.map((r) => {
    const unit = r.region ? `${r.unit} · ${r.region}` : r.unit;
    const name = r.label ? `${r.name}: ${r.label}` : r.name;
    const ratio = r.ratio ? `${formatRatio(r.ratio)} kat arttı` : '';
    return `<tr><td><strong>${escapeHTML(name)}</strong><br><small>${escapeHTML(unit)} · ${escapeHTML(formatPeriod(r.date))}</small></td>`
      + `<td class="year-price">${escapeHTML(formatPrice(r.price))}${ratio ? `<br><small>${escapeHTML(ratio)}</small>` : ''}</td></tr>`;
  }).join('')}</tbody></table>`;
}

// Yearly receipt share: same pattern as the result share (file share on phones, else text),
// but with its own buttons so the two screens never reset each other's labels.
const yearBtnLabels = {};

function setYearBtn(id, text, busy = false) {
  const btn = $(id);
  if (!(id in yearBtnLabels)) yearBtnLabels[id] = btn.textContent;
  btn.textContent = text;
  if (text !== yearBtnLabels[id]) announce(text);
  if (busy) btn.setAttribute('aria-busy', 'true');
  else btn.removeAttribute('aria-busy');
}

function resetYearBtn(id, delay = 0) {
  const restore = () => {
    if (id in yearBtnLabels) $(id).textContent = yearBtnLabels[id];
    $(id).removeAttribute('aria-busy');
  };
  if (delay) setTimeout(restore, delay); else restore();
}

async function yearImage(btnId) {
  setYearBtn(btnId, 'Hazırlanıyor…', true);
  try {
    const { renderYearShareImage } = await import('./year-share-image.js');
    return await renderYearShareImage(buildYearShareModel(buildYearReceipt(state.raw, state.selectedYear)));
  } catch (err) {
    console.warn('Görsel hazırlanamadı', err);
    return null;
  }
}

async function shareYear() {
  if ($('y-share-btn').hasAttribute('aria-busy')) return;
  const year = state.selectedYear;
  const text = buildYearShareText(buildYearReceipt(state.raw, year), location.href.split('#')[0] + '#yil');
  const filesSupported = canShareImageFiles();
  const blob = filesSupported ? await yearImage('y-share-btn') : null;
  // The button stays busy until the share sheet closes: a second tap would throw InvalidStateError.
  let delay = 0;
  try {
    if (blob) {
      const file = new File([blob], buildYearShareFileName(year), { type: 'image/png' });
      setYearBtn('y-share-btn', yearBtnLabels['y-share-btn'] ?? 'Paylaş', true);
      await navigator.share({ files: [file], text });
    } else if (navigator.share) {
      setYearBtn('y-share-btn', $('y-share-btn').textContent, true);
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      setYearBtn('y-share-btn', 'Kopyalandı!');
      delay = 2000;
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.warn(err);
  } finally {
    resetYearBtn('y-share-btn', delay);
  }
}

async function downloadYearImage() {
  if ($('y-download-btn').hasAttribute('aria-busy')) return;
  const blob = await yearImage('y-download-btn');
  if (!blob) {
    setYearBtn('y-download-btn', 'Görsel hazırlanamadı.');
    resetYearBtn('y-download-btn', 2000);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildYearShareFileName(state.selectedYear);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setYearBtn('y-download-btn', 'İndiriliyor…');
  resetYearBtn('y-download-btn', 2000);
}

// "Sepet Kurma": prices are hidden, the player picks quantities to get as close to the
// budget as possible without going over (Price-is-Right rules).
const basket = { round: null, qty: {}, done: false, best: 0 };

function loadBasketBest() {
  try {
    const n = Number(localStorage.getItem('ne-kadardi-basket-best'));
    if (Number.isFinite(n) && n > 0) basket.best = n;
  } catch (e) {}
}

function updateBasketCount() {
  const kinds = Object.values(basket.qty).filter((n) => n > 0).length;
  const pieces = Object.values(basket.qty).reduce((a, b) => a + b, 0);
  $('b-count').textContent = pieces === 0 ? 'Sepetin boş' : `Sepetin: ${kinds} kalem, ${pieces} adet`;
  $('b-confirm').disabled = pieces === 0;
}

function renderBasket() {
  const round = buildBasketRound(state.all);
  if (!round) { showMessage('Sepet için yeterli fiyat yok.'); return; }
  basket.round = round;
  basket.qty = Object.fromEntries(round.items.map((q) => [q.id, 0]));
  basket.done = false;
  $('b-period').textContent = String(round.year);
  $('b-budget').textContent = formatPrice(round.budget);
  $('b-help').hidden = false;
  $('b-result').hidden = true;
  $('b-confirm').hidden = false;
  $('b-next').hidden = true;
  const list = $('b-items');
  list.textContent = '';
  for (const q of round.items) {
    const li = document.createElement('li');
    li.className = 'basket-row';
    li.dataset.id = q.id;
    li.innerHTML = `<span class="basket-name">${escapeHTML(questionTitle(q))}</span>`
      + `<span class="basket-unit">${escapeHTML(q.region ? `${q.unit} · ${q.region}` : q.unit)}</span>`
      + `<span class="basket-price"></span>`
      + `<span class="basket-stepper"><button type="button" data-d="-1" aria-label="${escapeHTML(questionTitle(q))}: azalt">−</button>`
      + `<span class="basket-qty" aria-live="polite">0</span>`
      + `<button type="button" data-d="1" aria-label="${escapeHTML(questionTitle(q))}: artır">+</button></span>`;
    li.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
      if (basket.done) return;
      const next = Math.max(0, Math.min(MAX_QTY, basket.qty[q.id] + Number(btn.dataset.d)));
      basket.qty[q.id] = next;
      li.querySelector('.basket-qty').textContent = String(next);
      updateBasketCount();
    }));
    list.appendChild(li);
  }
  updateBasketCount();
  show('basket-screen');
  if (document.activeElement === document.body || document.activeElement?.closest('[hidden]')) list.querySelector('button[data-d="1"]')?.focus();
}

function confirmBasket() {
  if (!basket.round || basket.done) return;
  basket.done = true;
  const res = scoreBasket(basket.round, basket.qty);
  for (const li of $('b-items').children) {
    const q = basket.round.items.find((x) => x.id === li.dataset.id);
    const n = basket.qty[q.id];
    li.querySelector('.basket-price').textContent = n > 0
      ? `${n} × ${formatPrice(q.price)} = ${formatPrice(n * q.price)}`
      : `Birim fiyat: ${formatPrice(q.price)}`;
    li.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  }
  const verdict = res.over
    ? `Bütçeyi ${formatPrice(-res.left)} (%${Math.round((-100 * res.left) / basket.round.budget)}) aştın. Puan: ${res.score}`
    : `Bütçenin %${res.score}'ini kullandın, ${formatPrice(res.left)} kaldı. Puan: ${res.score}`;
  $('b-result').innerHTML = `<div class="row"><span>Sepet toplamı</span><strong>${escapeHTML(formatPrice(res.total))}</strong></div>`
    + `<div class="row"><span>Bütçe</span><strong>${escapeHTML(formatPrice(basket.round.budget))}</strong></div>`
    + `<p class="verdict">${escapeHTML(verdict)}</p>`;
  $('b-result').hidden = false;
  $('b-help').hidden = true;
  $('b-confirm').hidden = true;
  $('b-next').hidden = false;
  $('b-result').focus(); // the confirm button just disappeared
  if (res.score > basket.best) {
    basket.best = res.score;
    try { localStorage.setItem('ne-kadardi-basket-best', String(res.score)); } catch (e) {}
  }
}

function renderHome() {
  $('m-tahmin').textContent = state.played > 0
    ? `${state.played} soru · ortalama ${Math.round(state.total / state.played)}` + (state.best > 0 ? ` · en iyi ${state.best}` : '')
    : '';
  $('m-hangisi').textContent = versus.best > 0 ? `En iyi seri: ${versus.best}` : '';
  $('m-sepet').textContent = basket.best > 0 ? `En iyi puan: ${basket.best}` : '';
  $('m-sirala').textContent = orderMeta();
  $('m-blitz').textContent = blitzBest() > 0 ? `En iyi: ${blitzBest()} doğru` : '';
  show('home-screen');
}

function onHashChange() {
  const hash = location.hash;
  if (state.all.length === 0) return;
  // Leaving the 60-second screen must not leave its clock ticking in the background.
  if (hash !== '#60-saniye') stopBlitz();
  if (hash === '#sirala') {
    renderOrder(show, showMessage);
  } else if (hash === '#60-saniye') {
    renderBlitz(show);
  } else if (hash === '#yil') {
    renderYearScreen();
  } else if (hash === '#hangisi') {
    renderVersus();
  } else if (hash === '#sepet') {
    renderBasket();
  } else if (hash === '#zaman-makinesi') {
    renderTimelineScreen();
  } else if (hash === '#tahmin') {
    if (!state.question) nextQuestion();
    else show(state.lastGameScreen);
  } else {
    renderHome();
  }
}
window.addEventListener('hashchange', onHashChange);

const THEME_KEY = 'ne-kadardi-theme';

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function renderThemeToggle() {
  const dark = currentTheme() === 'dark';
  const btn = $('theme-toggle');
  btn.textContent = dark ? '☀' : '☾';
  btn.setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const root = document.documentElement;
  root.classList.add('theme-anim');
  $('theme-toggle').classList.add('spin');
  setTimeout(() => {
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
  $('guess-form').addEventListener('submit', onGuess);
  $('v-a').addEventListener('click', () => onVersusPick('a'));
  $('v-b').addEventListener('click', () => onVersusPick('b'));
  $('v-next').addEventListener('click', renderVersus);
  loadVersusBest();
  initOrder(state.all);
  initBlitz(state.all);
  loadBasketBest();
  $('b-confirm').addEventListener('click', confirmBasket);
  $('b-next').addEventListener('click', renderBasket);
  $('next-btn').addEventListener('click', () => {
    resetShareBtn();
    nextQuestion();
  });
  $('share-btn').addEventListener('click', share);
  $('download-btn').addEventListener('click', downloadImage);
  $('y-share-btn').addEventListener('click', shareYear);
  $('y-download-btn').addEventListener('click', downloadYearImage);
  
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
