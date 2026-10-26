// Sharing UI: the send sheet, image preview and the share/ask/report-card actions.
// main.js owns `state`; it is read through getters so there is never a second copy.
import { formatPeriod } from './format.js';
import { buildContextLine } from './game.js';
import { buildShareText, buildShareImageModel, buildShareFileName, questionTitle } from './share-model.js';
import { stampTitle } from './banter.js';
import { buildPriceChart } from './price-chart.js';
import { askUrl, askText } from './ask-link.js';
import { dailyShareText } from './daily.js';

const $ = (id) => document.getElementById(id);
let deps = null;
const getState = () => deps.getState();

let shareOriginalLabel = '';
let shareTimeoutId = null;

let askTimeoutId = null;

function shareBtnLabel() {
  return deps.isDailyEndTurn() ? 'Fişini paylaş' : shareOriginalLabel;
}

function resetShareBtn() {
  if (shareTimeoutId !== null) {
    clearTimeout(shareTimeoutId);
    shareTimeoutId = null;
  }
  if (askTimeoutId !== null) {
    clearTimeout(askTimeoutId);
    askTimeoutId = null;
  }
  const bar = $('share-btn');
  clearTimeout(bar.restoreTimer);
  if (shareOriginalLabel) {
    bar.textContent = shareBtnLabel();
    bar.removeAttribute('aria-busy');
  }
  const askQ = $('ask-q-btn');
  if (askQ.dataset.label) askQ.textContent = askQ.dataset.label;
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

async function prepareShareImage(btnId) {
  const btn = $(btnId);
  if (btn.hasAttribute('aria-busy')) return null;
  
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = 'Hazırlanıyor…';
  announce('Hazırlanıyor…');

  // Everything after the busy mark sits in the try, so a failure never leaves the button stuck on "Hazırlanıyor…".
  try {
    const q = getState().question;
    const r = getState().result;
    const contextText = buildContextLine(q, getState().all);
    const model = buildShareImageModel(q, r, { contextLine: contextText });
    const t = getState().timelines.find((t) => t.id === q.productId);
    model.chart = t
      ? buildPriceChart(t.rows, { width: 760, height: 260, highlightDate: q.date, refPrice: r.guess, pad: { top: 40, right: 24, bottom: 44, left: 24 } })
      : null;
    // After a few rounds the stamp rates the whole session instead of this one guess.
    if (getState().played >= 3) model.stamp = stampTitle(getState().total / getState().played) ?? model.stamp;
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
  const q = getState().question;
  const r = getState().result;
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

// The question card's button asks as-is; the send sheet adds the score (`withScore`).
// Feedback shows on the button the player pressed (the sheet is closed, so its opener).
async function askFriend({ btn, withScore = false }) {
  const q = getState().question;
  if (!q) return;
  const score = withScore && getState().result ? getState().result.score : null;
  const base = location.origin + location.pathname;
  const text = askText(formatPeriod(q.date), questionTitle(q), score);
  const url = askUrl(q, base, score);
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
    } catch (err) {
      if (err.name !== 'AbortError') console.warn(err);
    }
    return;
  }
  const setAskStatus = (msg) => {
    if (askTimeoutId !== null) clearTimeout(askTimeoutId);
    announce(msg);
    btn.textContent = msg;
    askTimeoutId = setTimeout(() => {
      askTimeoutId = null;
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
      else resetShareBtn();
    }, 2000);
  };
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    setAskStatus('Bağlantı kopyalandı ✓');
  } catch {
    setAskStatus('Kopyalanamadı');
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
  const text = buildShareText(getState().question, getState().result, location.href);
  try {
    if (navigator.canShare({ files: [previewFile] })) await navigator.share({ files: [previewFile], text });
  } catch (err) {
    if (err.name !== 'AbortError') console.warn(err);
  }
}

// "Resmi telefona kaydet" first shows what will be saved, so players know the image before it leaves the page.
async function downloadImage() {
  const btn = $('share-btn');
  if (btn.hasAttribute('aria-busy')) return;

  const blob = await prepareShareImage('share-btn');
  if (!blob) {
    setBtnStatus('share-btn', 'Görsel hazırlanamadı.');
    return;
  }
  resetShareBtn();
  // The player may have left the result while the image was drawn.
  if ($('result-screen').hidden) return;

  cleanupPreview();
  previewFile = new File([blob], buildShareFileName(getState().question), { type: 'image/png' });
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

// One bar button, three jobs: the sheet lets the player choose what to send.
function initSendSheet() {
  const dlg = $('send-sheet');
  const opener = $('share-btn');
  const choose = (fn) => () => {
    if (dlg.open) dlg.close();
    // Called in the same click task, so navigator.share still has the tap's user activation.
    fn();
  };
  $('send-result').addEventListener('click', choose(share));
  $('send-ask').addEventListener('click', choose(() => askFriend({ btn: opener, withScore: true })));
  $('send-save').addEventListener('click', choose(downloadImage));
  $('send-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  dlg.addEventListener('close', () => { if (!$('result-screen').hidden) opener.focus(); });
  opener.addEventListener('click', (e) => {
    if (deps.isDailyEndTurn()) {
      opener.dataset.label = shareBtnLabel(); // shareTextWithStatus restores this after its message
      shareReportCard(e);
      return;
    }
    if (opener.hasAttribute('aria-busy')) return;
    if (typeof dlg.showModal !== 'function') { share(); return; }
    dlg.showModal();
    $('send-result').focus();
  });
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
    if (!$('result-screen').hidden) $('share-btn').focus();
  });
}

async function shareTextWithStatus(text, btn) {
  if (navigator.share) {
    try { await navigator.share({ text }); } catch (err) { if (err.name !== 'AbortError') console.warn(err); }
    return;
  }
  let msg = 'Karne kopyalandı ✓';
  try { await navigator.clipboard.writeText(text); } catch { msg = 'Kopyalanamadı'; }
  if (!btn) return;
  btn.dataset.label ??= btn.textContent;
  btn.textContent = msg;
  announce(msg);
  clearTimeout(btn.restoreTimer); // a second tap must not let the first timer cut its message short
  btn.restoreTimer = setTimeout(() => { btn.textContent = btn.dataset.label; }, 2000);
}

async function shareReportCard(e) {
  const btn = e.currentTarget;
  const card = getState().reportCard;
  if (!card) return;
  const url = location.origin + location.pathname;
  if (card.daily) {
    const text = dailyShareText({ key: card.key, scores: card.scores, url, streak: getState().streak?.count ?? 0 });
    await shareTextWithStatus(text, btn);
  }
}

// `deps`: { getState, isDailyEndTurn } so main.js keeps ownership of its state.
export function initShareUi(d) {
  deps = d;
  shareOriginalLabel = $('share-btn').textContent;
  initSendSheet();
  initSharePreview();
}

export { resetShareBtn, closePreview, askFriend, shareReportCard, shareTextWithStatus };
