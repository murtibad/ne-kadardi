// Share a plain text from a button: share sheet on phones, clipboard elsewhere.
const FEEDBACK_MS = 2000;
const timers = new WeakMap();

function flash(btn, text) {
  // Remember the real label once, so a second tap during feedback cannot save "Kopyalandı!" as the label.
  btn.dataset.label ??= btn.textContent;
  btn.textContent = text;
  const live = document.getElementById('sr-status');
  if (live) live.textContent = text;
  clearTimeout(timers.get(btn));
  timers.set(btn, setTimeout(() => { btn.textContent = btn.dataset.label; }, FEEDBACK_MS));
}

export async function shareTextFromButton(btn, text) {
  if (btn.getAttribute('aria-busy') === 'true') return;
  // Busy until the sheet or clipboard call settles: a second share() would throw InvalidStateError.
  btn.setAttribute('aria-busy', 'true');
  try {
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      flash(btn, 'Kopyalandı!');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn(err);
      flash(btn, 'Kopyalanamadı');
    }
  } finally {
    btn.removeAttribute('aria-busy');
  }
}
