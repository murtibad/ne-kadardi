// "İstatistiklerim" screen: receipt-style list of every mode's saved score, plus a two-step reset.
import { buildStats, STAT_KEYS } from './stats.js';

const $ = (id) => document.getElementById(id);
const escapeHTML = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RESET_LABEL = 'Skorları sıfırla';
const CONFIRM_LABEL = 'Emin misin? Tekrar dokun';
let armTimer = null;
let wired = false;

function disarm() {
  clearTimeout(armTimer);
  armTimer = null;
  $('stats-reset').textContent = RESET_LABEL;
}

function resetScores() {
  // Only score keys: the theme choice stays. Reload resets every mode's in-memory best.
  try { for (const key of STAT_KEYS) localStorage.removeItem(key); } catch (e) {}
  location.reload();
}

export function renderStats(show) {
  const raw = {};
  for (const key of STAT_KEYS) {
    try { raw[key] = localStorage.getItem(key); } catch (e) { raw[key] = null; }
  }
  $('stats-rows').innerHTML = `<table class="timeline-table"><tbody>${buildStats(raw).map((r) => (
    `<tr><td><a class="stats-mode" href="${escapeHTML(r.href)}"><strong>${escapeHTML(r.mode)}</strong></a></td>`
    + `<td class="year-price">${r.lines.map(escapeHTML).join('<br>')}</td></tr>`
  )).join('')}</tbody></table>`;
  disarm();
  if (!wired) {
    wired = true;
    $('stats-reset').addEventListener('click', () => {
      if (armTimer === null) {
        $('stats-reset').textContent = CONFIRM_LABEL;
        armTimer = setTimeout(disarm, 4000);
      } else {
        resetScores();
      }
    });
  }
  show('stats-screen');
}
