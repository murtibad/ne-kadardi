import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCardRound, buildReportCard, reportCardText, CARD_EVERY } from '../js/report-card.js';

test('the card shows after every fifth answer of the visit', () => {
  assert.equal(CARD_EVERY, 5);
  assert.equal(isCardRound(0), false);
  assert.equal(isCardRound(4), false);
  assert.equal(isCardRound(5), true);
  assert.equal(isCardRound(10), true);
});

test('buildReportCard keeps the last five, averages and picks the best', () => {
  const e = (title, score) => ({ title, period: 'Ocak 2010', score });
  const card = buildReportCard([e('Eski', 0), e('A', 40), e('B', 90), e('C', 90), e('D', 10), e('E', 70)]);
  assert.equal(card.title, '5 SORULUK KARNE');
  assert.deepEqual(card.lines.map((l) => l.score), [40, 90, 90, 10, 70]);
  assert.equal(card.average, 60);
  assert.equal(card.best.title, 'B');
  assert.equal(buildReportCard([]), null);
});

test('the shared card text has scores but no prices', () => {
  const card = buildReportCard([{ title: 'Big Mac', period: 'Ocak 2010', score: 64 }]);
  const text = reportCardText(card, 'https://murtibad.github.io/ne-kadardi/');
  assert.match(text, /Ocak 2010 · Big Mac: 64\/100/);
  assert.match(text, /Ortalama: 64\/100/);
  assert.doesNotMatch(text, /₺/);
});
