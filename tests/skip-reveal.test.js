import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skipRevealText, sessionBadge } from '../js/share-model.js';
import { formatPrice } from '../js/format.js';

test('skipRevealText names period, short product and price', () => {
  const t = skipRevealText({ date: '2014-01', name: 'Pasaport harcı', price: 75 });
  assert.equal(t, `Geçtiğin soru: Ocak 2014 · Pasaport harcı — ${formatPrice(75)}`);
  assert.match(t, /₺75/);
});

test('skipRevealText is empty without a usable question', () => {
  assert.equal(skipRevealText(null), '');
  assert.equal(skipRevealText({ date: '2014-01', name: 'X', price: null }), '');
});

test('sessionBadge: record needs a second answer and a higher score', () => {
  assert.match(sessionBadge({ prevBest: 80, score: 90, playedAfter: 2, recent: [50, 90] }), /Yeni rekor/);
  assert.equal(sessionBadge({ prevBest: 0, score: 90, playedAfter: 1, recent: [90] }), '');
  assert.equal(sessionBadge({ prevBest: 90, score: 90, playedAfter: 3, recent: [50, 60, 90] }), '');
});

test('sessionBadge: three close guesses, record takes precedence', () => {
  assert.match(sessionBadge({ prevBest: 99, score: 80, playedAfter: 5, recent: [10, 75, 80, 80] }), /Üst üste 3/);
  assert.equal(sessionBadge({ prevBest: 99, score: 80, playedAfter: 5, recent: [74, 80, 80] }), '');
  assert.equal(sessionBadge({ prevBest: 70, score: 80, playedAfter: 5, recent: [80, 80, 80] }), ' · 🎯 Yeni rekor!');
});

test('sessionBadge: a low score is never a record; the close run is counted in full', () => {
  assert.equal(sessionBadge({ prevBest: 0, score: 5, playedAfter: 2, recent: [0, 5] }), '');
  assert.equal(sessionBadge({ prevBest: 99, score: 90, playedAfter: 6, recent: [10, 80, 85, 90, 90] }), ' · Üst üste 4 yakın tahmin!');
});
