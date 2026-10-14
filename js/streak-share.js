// Share text for streak-based modes (Hangisi Pahalı?, Hangi Yıl?). Pure, no DOM.

export function buildStreakShareText(mode, streak, best, url) {
  let line2;
  if (streak >= best && streak > 0) {
    line2 = `${streak} doğru üst üste 🔥 Yeni rekor!`;
  } else if (streak > 0) {
    line2 = `${streak} doğru üst üste · en iyi ${best}`;
  } else {
    line2 = `En iyi serim: ${best}`;
  }

  return [
    `Ne Kadardı? · ${mode}`,
    line2,
    url,
  ].join('\n');
}
