// Turns plain URLs inside a note into safe link buttons. Pure, no DOM.
const URL_RE = /https?:\/\/[^\s<>"]+/g;
const TRAILING = /[.,;:!?)\]'’]+$/;

const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

/** HTML for a note: text escaped, every URL replaced by a tappable "Link · host" anchor. */
export function linkifyNote(text) {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    // A URL at the end of a sentence must not swallow the full stop or a closing bracket.
    const url = m[0].replace(TRAILING, '');
    const host = hostOf(url);
    out += escapeHTML(text.slice(last, m.index));
    last = m.index + url.length;
    out += host
      ? `<a class="note-link" href="${escapeHTML(url)}" target="_blank" rel="noopener">Link · ${escapeHTML(host)} ↗</a>`
      : escapeHTML(url);
  }
  return out + escapeHTML(text.slice(last));
}
