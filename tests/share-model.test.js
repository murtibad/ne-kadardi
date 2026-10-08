import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShareText, verdictText, buildShareFileName, buildShareImageModel } from '../js/share-model.js';
import { formatPrice } from '../js/format.js';

test('buildShareText formats exactly like the old share text', () => {
  const q = { date: '2015-01', name: 'Benzin', label: 'Kurşunsuz 95', price: 4.2 };
  const r = { guess: 4, score: 98 };
  const url = 'https://murtibad.github.io/ne-kadardi/';
  const txt = buildShareText(q, r, url);
  assert.equal(txt, [
    'Ne Kadardı? 🤔',
    'Ocak 2015 · Benzin: Kurşunsuz 95',
    `Tahminim: ${formatPrice(4)}`,
    `Gerçek: ${formatPrice(4.2)}`,
    'Puanım: 98/100',
    url
  ].join('\n'));
});

test('verdictText handles over, under and exact', () => {
  assert.equal(verdictText({ direction: 'exact', factor: 1 }), 'Tam isabet! 🎯');
  assert.equal(verdictText({ direction: 'exact', factor: 1.04 }), 'Neredeyse tam isabet!');
  assert.equal(verdictText({ direction: 'over', factor: 2.34 }), '2,3 kat fazla tahmin ettin');
  assert.equal(verdictText({ direction: 'under', factor: 1.5 }), '1,5 kat az tahmin ettin');
});

test('buildShareFileName generates ascii lowercase hyphenated names', () => {
  assert.equal(buildShareFileName({ name: 'Benzin (Kurşunsuz)', date: '2016-01' }), 'ne-kadardi-benzin-kursunsuz-2016-01.png');
  assert.equal(buildShareFileName({ name: 'Çeyrek Altın', date: '2010-05' }), 'ne-kadardi-ceyrek-altin-2010-05.png');
});

test('buildShareImageModel handles question without current price and image', () => {
  const q = { date: '2015-01', name: 'Ekmek', unit: '250 gram', region: 'İstanbul', price: 1, current: null, image: null };
  const r = { guess: 2, score: 50, direction: 'over', factor: 2 };
  const model = buildShareImageModel(q, r);
  
  assert.equal(model.title, 'Ocak 2015 · Ekmek');
  assert.equal(model.unit, '250 gram · İstanbul');
  assert.equal(model.guess, formatPrice(2));
  assert.equal(model.actual, formatPrice(1));
  assert.equal(model.verdict, '2 kat fazla tahmin ettin');
  assert.equal(model.hasCurrent, false);
  assert.equal(model.currentLabel, null);
  assert.equal(model.current, null);
  assert.equal(model.increase, null);
  assert.equal(model.score, '50/100');
  assert.equal(model.iconSrc, null);
});

test('buildShareImageModel handles question with current price and image and context', () => {
  const q = { 
    date: '2015-01', name: 'Ekmek', unit: '1 adet', price: 1, 
    current: { date: '2026-10', price: 10 },
    image: { src: 'img/ekmek.svg' }
  };
  const r = { guess: 1, score: 100, direction: 'exact', factor: 1 };
  const model = buildShareImageModel(q, r, { contextLine: 'Context text.' });
  
  assert.equal(model.hasCurrent, true);
  assert.equal(model.currentLabel, 'Güncel (Ekim 2026)');
  assert.equal(model.current, formatPrice(10));
  assert.equal(model.increase, '10 kat arttı');
  assert.equal(model.iconSrc, 'img/ekmek.svg');
  assert.equal(model.contextText, 'Context text.');
});

test('buildShareImageModel handles taxLine and keeps contextLine separate', () => {
  const q = { date: '2024-09', name: 'Yeni iPhone', unit: '1 adet', price: 64999 };
  const r = { guess: 65000, score: 100, direction: 'exact', factor: 1 };
  const model = buildShareImageModel(q, r, {
    contextLine: 'Context text.',
    taxLine: 'Vergi payı: yaklaşık %51 (₺33.000)',
  });
  assert.equal(model.contextText, 'Context text.');
  assert.equal(model.taxLine, 'Vergi payı: yaklaşık %51 (₺33.000)');

  const modelOnlyTax = buildShareImageModel(q, r, {
    taxLine: 'Vergi payı: yaklaşık %51 (₺33.000)',
  });
  assert.equal(modelOnlyTax.contextText, null);
  assert.equal(modelOnlyTax.taxLine, 'Vergi payı: yaklaşık %51 (₺33.000)');
});
