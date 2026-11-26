import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questionIconUrl, dailyIconUrls, preloadIcon, preloadIcons } from '../js/icon-preload.js';
import { buildQuestions, FOLLOW_UP_IDS } from '../js/game.js';
import { dailyQuestions } from '../js/daily.js';
import { categoryOf } from '../js/categories.js';

test('questionIconUrl returns image.src when present and null otherwise', () => {
  assert.equal(questionIconUrl({ image: { src: 'img/benzin.svg', alt: 'Benzin' } }), 'img/benzin.svg');
  assert.equal(questionIconUrl({ image: null }), null);
  assert.equal(questionIconUrl({ image: { src: '' } }), null);
  assert.equal(questionIconUrl({}), null);
  assert.equal(questionIconUrl(null), null);
});

test('dailyIconUrls resolves unique icon URLs in order and ignores missing entries', () => {
  const all = [
    { id: 'benzin@2016-01', image: { src: 'img/benzin.svg' } },
    { id: 'dolar@2015-01', image: { src: 'img/dolar.svg' } },
    { id: 'ekmek@2014-01', image: null },
    { id: 'iphone@2019-10', image: { src: 'img/iphone-notch.svg' } },
  ];
  assert.deepEqual(
    dailyIconUrls(all, ['iphone@2019-10', 'ekmek@2014-01', 'missing@2020', 'benzin@2016-01', 'iphone@2019-10']),
    ['img/iphone-notch.svg', 'img/benzin.svg'],
  );
  assert.deepEqual(dailyIconUrls(null, ['a']), []);
  assert.deepEqual(dailyIconUrls(all, null), []);
  assert.deepEqual(dailyIconUrls(all, []), []);
});

test('dailyIconUrls resolves the 5 daily product icons from real prices.json', () => {
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const all = buildQuestions(data);
  const ids = dailyQuestions(all.filter((q) => FOLLOW_UP_IDS.includes(q.productId)), '2026-10-26', categoryOf).map((q) => q.id);
  const urls = dailyIconUrls(all, ids);
  assert.equal(ids.length, 5);
  assert.equal(urls.length, 5);
  for (const url of urls) {
    assert.match(url, /^img\/.+\.svg$/);
  }
});

test('preloadIcon sets src via new Image(), dedupes with the module-level Set, and never throws', () => {
  const created = [];
  class FakeImage {
    constructor() {
      this.src = '';
      created.push(this);
    }
  }

  // Missing Image constructor in Node must be a safe no-op.
  assert.equal(preloadIcon('img/benzin.svg'), false);

  // Uses the default module-level Set across calls.
  assert.equal(preloadIcon('img/test-module-dedupe.svg', { ImageCtor: FakeImage }), true);
  assert.equal(preloadIcon('img/test-module-dedupe.svg', { ImageCtor: FakeImage }), false);
  assert.deepEqual(created.map((i) => i.src), ['img/test-module-dedupe.svg']);

  // Empty/non-string URLs are ignored.
  const seen = new Set();
  assert.equal(preloadIcon('', { seen, ImageCtor: FakeImage }), false);
  assert.equal(preloadIcon(null, { seen, ImageCtor: FakeImage }), false);
  assert.equal(preloadIcon(123, { seen, ImageCtor: FakeImage }), false);

  // Throwing Image constructor or src setter is swallowed safely.
  class ThrowingImage {
    set src(_) { throw new Error('blocked'); }
  }
  assert.equal(preloadIcon('img/dolar.svg', { seen, ImageCtor: ThrowingImage }), false);
  assert.equal(preloadIcon('img/dolar.svg', { seen, ImageCtor: () => { throw new Error('boom'); } }), false);
});

test('preloadIcons preloads unique URLs and handles bad inputs safely', () => {
  const loaded = [];
  class FakeImage {
    set src(v) { loaded.push(v); }
  }
  const seen = new Set();
  assert.equal(preloadIcons(['img/a.svg', 'img/b.svg', 'img/a.svg', '', null], { seen, ImageCtor: FakeImage }), 2);
  assert.deepEqual(loaded, ['img/a.svg', 'img/b.svg']);
  assert.equal(preloadIcons(null, { seen, ImageCtor: FakeImage }), 0);
  assert.equal(preloadIcons(123, { seen, ImageCtor: FakeImage }), 0);
});
