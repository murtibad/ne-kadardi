import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderShareText, buildBlitzShareText } from '../js/mode-share.js';

test('order share text shows one mark per item and the score', () => {
  assert.equal(
    buildOrderShareText(2014, [true, false, true, true], 83, 'https://x/#sirala'),
    'Ne Kadardı? · Sırala 2014\n✅❌✅✅ Puan 83\nhttps://x/#sirala',
  );
});

test('blitz share text lists correct, wrong and accuracy', () => {
  assert.equal(
    buildBlitzShareText({ correct: 12, wrong: 2, accuracy: 86 }, 'https://x/#60-saniye'),
    'Ne Kadardı? · 60 Saniye ⏱️\n12 doğru · 2 yanlış · %86 isabet\nhttps://x/#60-saniye',
  );
});
