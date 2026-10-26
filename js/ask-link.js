// Shareable link for a specific question without revealing the answer.
import { inPeriod } from './format.js';
const PARAM_RE = /^([a-z0-9-]+)\.(\d{4}(?:-\d{2}(?:-\d{2})?)?)$/;

export function questionParam(q) {
  return `${q.productId}.${q.date}`;
}

export function parseScoreParam(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
  }
  if (typeof value !== 'string' || !/^(?:100|[1-9]?\d)$/.test(value)) return null;
  return Number(value);
}

export function parseQuestionParam(value, scoreParam) {
  if (typeof value !== 'string') return null;
  const m = value.match(PARAM_RE);
  if (!m) return null;
  const score = parseScoreParam(scoreParam);
  return score !== null ? { productId: m[1], date: m[2], score } : { productId: m[1], date: m[2] };
}

export function askUrl(q, base, score = null) {
  const s = parseScoreParam(score);
  const p = s !== null ? `&p=${s}` : '';
  return `${base}?soru=${encodeURIComponent(questionParam(q))}${p}`;
}

export function askText(periodText, title, score = null) {
  const s = parseScoreParam(score);
  if (s !== null) {
    return `Sence ${inPeriod(periodText)} ${title} kaç liraydı?\nBen ${s} puan aldım, sen kaç alırsın?\nTahmin et, gerçeğini gör:`;
  }
  return `Sence ${inPeriod(periodText)} ${title} kaç liraydı? Tahmin et, gerçeğini gör:`;
}

export function friendIntroText(friendScore = null) {
  const s = parseScoreParam(friendScore);
  return s !== null
    ? `Bir arkadaşın bu sorudan ${s} puan aldı. Sen kaç alırsın?`
    : 'Bir arkadaşın bu soruyu seninle paylaştı.';
}

export function compareFriendScore(friendScore, myScore) {
  const f = parseScoreParam(friendScore);
  const m = parseScoreParam(myScore);
  if (f === null || m === null) return null;
  const outcome = m > f ? 'geçtin!' : m === f ? 'berabere' : 'bu sefer o kazandı';
  return `Arkadaşın: ${f} puan · Sen: ${m} puan — ${outcome}`;
}
