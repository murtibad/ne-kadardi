import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStreakShareText } from '../js/streak-share.js';

test('streak share text shows new record line when streak reaches or beats best', () => {
  assert.equal(
    buildStreakShareText('Hangi Yıl?', 7, 7, 'https://x/#hangi-yil'),
    'Ne Kadardı? · Hangi Yıl?\n7 doğru üst üste 🔥 Yeni rekor!\nhttps://x/#hangi-yil',
  );
});

test('streak share text shows streak and best when streak is positive but below best', () => {
  assert.equal(
    buildStreakShareText('Hangi Yıl?', 3, 7, 'https://x/#hangi-yil'),
    'Ne Kadardı? · Hangi Yıl?\n3 doğru üst üste · en iyi 7\nhttps://x/#hangi-yil',
  );
});

test('streak share text shows best streak when streak is zero', () => {
  assert.equal(
    buildStreakShareText('Hangi Yıl?', 0, 5, 'https://x/#hangi-yil'),
    'Ne Kadardı? · Hangi Yıl?\nEn iyi serim: 5\nhttps://x/#hangi-yil',
  );
});
