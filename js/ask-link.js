// Shareable link for a specific question without revealing the answer.
const PARAM_RE = /^([a-z0-9-]+)\.(\d{4}(?:-\d{2}(?:-\d{2})?)?)$/;

export function questionParam(q) {
  return `${q.productId}.${q.date}`;
}

export function parseQuestionParam(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(PARAM_RE);
  return m ? { productId: m[1], date: m[2] } : null;
}

export function askUrl(q, base) {
  return `${base}?soru=${encodeURIComponent(questionParam(q))}`;
}

export function askText(periodText, title) {
  // Same words as the question card; no case suffix after the year, which would need Turkish vowel harmony.
  return `Soru: ${periodText} · ${title}. Sence kaç liraydı? Tahmin et, gerçeğini gör:`;
}
