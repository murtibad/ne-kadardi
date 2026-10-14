// Share texts for the quick modes (Sırala, 60 Saniye). Pure, no DOM.

/** `marks` are booleans in the correct cheapest-first order: did the player place that item right? */
export function buildOrderShareText(year, marks, score, url) {
  return [
    `Ne Kadardı? · Sırala ${year}`,
    `${marks.map((ok) => (ok ? '✅' : '❌')).join('')} Puan ${score}`,
    url,
  ].join('\n');
}

export function buildBlitzShareText(summary, url) {
  return [
    'Ne Kadardı? · 60 Saniye ⏱️',
    `${summary.correct} doğru · ${summary.wrong} yanlış · %${summary.accuracy} isabet`,
    url,
  ].join('\n');
}
