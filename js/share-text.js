// Share a plain text from a button: share sheet on phones, clipboard elsewhere.
const FEEDBACK_MS = 2000;

export async function shareTextFromButton(btn, text) {
  if (btn.getAttribute('aria-busy') === 'true') return;
  const label = btn.textContent;
  try {
    if (navigator.share) {
      // Busy until the sheet closes: a second tap would throw InvalidStateError.
      btn.setAttribute('aria-busy', 'true');
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Kopyalandı!';
      const live = document.getElementById('sr-status');
      if (live) live.textContent = 'Kopyalandı!';
      setTimeout(() => { btn.textContent = label; }, FEEDBACK_MS);
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.warn(err);
  } finally {
    btn.removeAttribute('aria-busy');
  }
}
