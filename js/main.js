// UI wiring: loads data, renders screens, handles input. Logic lives in game.js and format.js.
import { parseGuess, formatPrice, formatRatio, formatPeriod } from './format.js';
import { buildQuestions, buildContextLine, pickRandom, scoreGuess } from './game.js';
import { buildTimelines } from './timeline.js';
import { buildShareText, buildShareImageModel, buildShareFileName, verdictText, questionTitle } from './share-model.js';

const DATA_URL = 'data/prices.json';
const $ = (id) => document.getElementById(id);

const state = { 
  all: [], timelines: [], question: null, result: null, 
  played: 0, total: 0, 
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
    }
  } catch(e) {}
}

function saveSession() {
  try {
    localStorage.setItem('ne-kadardi-session', JSON.stringify({
      played: state.played,
      total: state.total
    }));
  } catch(e) {}
}

function show(screenId) {
  for (const id of ['message-screen', 'question-screen', 'result-screen', 'timeline-screen']) {
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
    $('download-btn').textContent = downloadOriginalLabel;
    $('download-btn').removeAttribute('aria-busy');
  }
}

function setBtnStatus(btnId, text) {
  if (shareTimeoutId !== null) clearTimeout(shareTimeoutId);
  $(btnId).textContent = text;
  $(btnId).removeAttribute('aria-busy');
  shareTimeoutId = setTimeout(() => {
    resetShareBtn();
  }, 2000);
}

function nextQuestion() {
  resetShareBtn();
  const q = pickRandom(state.all, state.question?.id);
  if (!q) {
    showMessage('Gösterilecek soru yok.');
    return;
  }
  state.question = q;
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
  }

  $('q-name').textContent = questionTitle(q);
  $('q-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('guess-input').value = '';
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
  state.result = { guess, ...scoreGuess(guess, q.price) };
  state.played += 1;
  state.total += state.result.score;
  saveSession();
  renderResult(q, state.result);
}

function renderResult(q, r) {
  $('r-title').textContent = `${formatPeriod(q.date)} · ${questionTitle(q)}`;
  $('r-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('r-guess').textContent = formatPrice(r.guess);
  $('r-actual').textContent = formatPrice(q.price);
  $('r-verdict').textContent = verdictText(r);
  $('r-score').textContent = `${r.score}/100`;

  const hasCurrent = q.current !== null;
  $('r-current-row').hidden = !hasCurrent;
  if (hasCurrent) {
    $('r-current-label').textContent = `Güncel (${formatPeriod(q.current.date)})`;
    $('r-current').textContent = formatPrice(q.current.price);
    $('r-increase').textContent = `${formatRatio(q.current.price / q.price)} kat arttı`;
  }

  const contextText = buildContextLine(q, state.all);
  $('r-context').textContent = contextText || '';
  $('r-context').hidden = !contextText;

  $('r-source').href = q.source.url;
  $('r-source').textContent = q.source.title;
  $('r-session').textContent = `Toplam: ${state.played} soru · ortalama ${Math.round(state.total / state.played)} puan`;
  showGameScreen('result-screen');
}

async function prepareShareImage(btnId) {
  const btn = $(btnId);
  if (btn.hasAttribute('aria-busy')) return null;
  
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = 'Hazırlanıyor…';
  
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
    
  const escapeHTML = str => str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';

  for (const r of product.rows) {
    const period = r.isCurrent ? `Güncel (${formatPeriod(r.date)})` : formatPeriod(r.date);
    const priceStr = formatPrice(r.price);
    const ratioStr = r.ratioToCurrent ? `${formatRatio(r.ratioToCurrent)} kat arttı` : '';
    
    const bar = `<div class="timeline-bar-track" aria-hidden="true">
                   <div class="timeline-bar-fill" style="width: ${r.barPercent}%"></div>
                 </div>`;
                 
    const sourceLink = r.source ? `<a href="${escapeHTML(r.source.url)}" target="_blank" rel="noopener" class="timeline-source" title="${escapeHTML(r.source.title)}">Kaynak</a>` : '';
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

function onHashChange() {
  if (location.hash === '#zaman-makinesi') {
    if (state.timelines.length > 0) renderTimelineScreen();
  } else {
    if (state.all.length > 0) {
      if (!state.question) {
        nextQuestion();
      } else {
        show(state.lastGameScreen);
      }
    }
  }
}
window.addEventListener('hashchange', onHashChange);

async function init() {
  loadSession();
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
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
  downloadOriginalLabel = $('download-btn').textContent;
  $('guess-form').addEventListener('submit', onGuess);
  $('next-btn').addEventListener('click', () => {
    resetShareBtn();
    nextQuestion();
  });
  $('share-btn').addEventListener('click', share);
  $('download-btn').addEventListener('click', downloadImage);
  
  onHashChange();
}

init();
