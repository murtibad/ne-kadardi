// "Karne": every few answered questions the receipt sums up the last round. Pure, no DOM.

export const CARD_EVERY = 5;

/** True after the 5th, 10th, ... answered question of this visit. */
export function isCardRound(answeredThisVisit) {
  return answeredThisVisit > 0 && answeredThisVisit % CARD_EVERY === 0;
}

/**
 * entries: [{ title, period, score }] for the last CARD_EVERY answers, oldest first.
 * Returns the lines to print, the rounded average and the best entry (first one on ties).
 */
export function buildReportCard(entries) {
  const list = (entries ?? []).slice(-CARD_EVERY);
  if (!list.length) return null;
  const average = Math.round(list.reduce((s, e) => s + e.score, 0) / list.length);
  const best = list.reduce((a, b) => (b.score > a.score ? b : a));
  return {
    title: `${list.length} SORULUK KARNE`,
    lines: list.map((e) => ({ label: `${e.period} · ${e.title}`, score: e.score })),
    average,
    best,
  };
}

/** Plain text for sharing the card; no prices, so friends can still play the same products. */
export function reportCardText(card, url) {
  return [
    `Ne Kadardı? 🧾 ${card.title}`,
    ...card.lines.map((l) => `${l.label}: ${l.score}/100`),
    `Ortalama: ${card.average}/100`,
    `Sen kaç puan alırsın? ${url}`,
  ].join('\n');
}
