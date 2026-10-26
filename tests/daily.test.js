import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, seededRng, dailyQuestions, dailyTitle, dailyShareText, trimLog, dailyStats, dailyMenuMeta, dailyTotalLine } from '../js/daily.js';
import { categoryOf } from '../js/categories.js';

const sampleQuestions = [
  { id: 'dolar@2015-01', productId: 'dolar', date: '2015-01' },
  { id: 'dolar@2020-01', productId: 'dolar', date: '2020-01' },
  { id: 'benzin@2016-01', productId: 'benzin', date: '2016-01' },
  { id: 'benzin@2021-01', productId: 'benzin', date: '2021-01' },
  { id: 'ekmek@2014-01', productId: 'ekmek', date: '2014-01' },
  { id: 'iphone@2019-10', productId: 'iphone', date: '2019-10' },
  { id: 'asgari-ucret@2018-01', productId: 'asgari-ucret', date: '2018-01' },
  { id: 'pasaport-harci@2017-01', productId: 'pasaport-harci', date: '2017-01' },
];

test('dayKey formats the local calendar date as YYYY-MM-DD', () => {
  assert.equal(dayKey(new Date(2026, 9, 26, 23, 45)), '2026-10-26');
  assert.equal(dayKey(new Date(2026, 0, 5, 0, 10)), '2026-01-05');
});

test('seededRng is deterministic for the same key and differs across keys', () => {
  const a = seededRng('2026-10-26');
  const b = seededRng('2026-10-26');
  const c = seededRng('2026-10-27');
  const seqA = [a(), a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b(), b()];
  const seqC = [c(), c(), c(), c(), c()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  for (const n of seqA) assert.ok(n >= 0 && n < 1);
});

test('dailyQuestions is deterministic, independent of input order, and picks distinct products and categories', () => {
  const first = dailyQuestions(sampleQuestions, '2026-10-26', categoryOf, 5);
  const reversed = dailyQuestions([...sampleQuestions].reverse(), '2026-10-26', categoryOf, 5);
  const otherDay = dailyQuestions(sampleQuestions, '2026-10-27', categoryOf, 5);

  assert.equal(first.length, 5);
  assert.deepEqual(first.map((q) => q.id), reversed.map((q) => q.id));
  assert.notDeepEqual(first.map((q) => q.id), otherDay.map((q) => q.id));

  const products = first.map((q) => q.productId);
  assert.equal(new Set(products).size, 5);
  const categories = products.map((p) => categoryOf(p));
  assert.equal(new Set(categories).size, 5);
});

test('dailyQuestions repeats categories only when fewer categories than count exist, never repeating products', () => {
  const twoCatQuestions = [
    { id: 'p1@2015', productId: 'p1', date: '2015' },
    { id: 'p2@2015', productId: 'p2', date: '2015' },
    { id: 'p3@2015', productId: 'p3', date: '2015' },
    { id: 'p4@2015', productId: 'p4', date: '2015' },
    { id: 'p5@2015', productId: 'p5', date: '2015' },
  ];
  const twoCat = (id) => (id === 'p1' || id === 'p2' || id === 'p3' ? 'cat-a' : 'cat-b');
  const picked = dailyQuestions(twoCatQuestions, '2026-10-26', twoCat, 5);
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked.map((q) => q.productId)).size, 5);
  // First two picks must come from different categories before repeating.
  assert.notEqual(twoCat(picked[0].productId), twoCat(picked[1].productId));
});

test('dailyTitle formats Turkish uppercase month names', () => {
  assert.equal(dailyTitle('2026-10-26'), 'GÜNÜN FİŞİ · 26 EKİM');
  assert.equal(dailyTitle('2026-01-05'), 'GÜNÜN FİŞİ · 5 OCAK');
});

test('dailyShareText maps score tiers to squares, omits streak below 2, and leaks no extra digits', () => {
  const url = 'https://murtibad.github.io/ne-kadardi/';
  const scores = [90, 75, 50, 25, 10]; // great, good, mid, poor, bad -> 250
  const text = dailyShareText({ key: '2026-10-26', scores, url, streak: 1 });
  assert.equal(
    text,
    [
      'Ne Kadardı? 🧾 Günün fişi · 26 Ekim',
      '🟩🟩🟨🟧🟥 250/500',
      `Sen kaç alırsın? ${url}`,
    ].join('\n'),
  );
  assert.deepEqual(text.match(/\d+/g), ['26', '250', '500']);

  const withStreak = dailyShareText({ key: '2026-01-05', scores: [100, 85, 70, 45, 0], url, streak: 4 });
  assert.equal(
    withStreak,
    [
      'Ne Kadardı? 🧾 Günün fişi · 5 Ocak',
      '🟩🟩🟩🟨🟥 300/500',
      '🔥 4 gün üst üste',
      `Sen kaç alırsın? ${url}`,
    ].join('\n'),
  );
  assert.deepEqual(withStreak.match(/\d+/g), ['5', '300', '500', '4']);
});

test('nextReceiptIn counts down to local midnight', async () => {
  const { nextReceiptIn } = await import('../js/daily.js');
  assert.equal(nextReceiptIn(new Date(2026, 9, 26, 16, 40)), 'Yeni fiş 7 saat sonra');
  assert.equal(nextReceiptIn(new Date(2026, 9, 26, 23, 15)), 'Yeni fiş 45 dakika sonra');
  assert.equal(nextReceiptIn(new Date(2026, 9, 26, 23, 59, 50)), 'Yeni fiş 1 dakika sonra');
  assert.equal(nextReceiptIn(new Date(2026, 9, 26, 0, 0)), 'Yeni fiş 24 saat sonra');
});

test('trimLog keeps the newest days and drops bad entries', () => {
  const log = { '2026-01-01': 100, '2026-01-02': 200, '2026-01-03': 300, bad: 5, '2026-01-04': 'x' };
  assert.deepEqual(trimLog(log, 2), { '2026-01-02': 200, '2026-01-03': 300 });
  assert.deepEqual(trimLog(null), {});
});

test('dailyStats finds yesterday (also across a month border), best and count', () => {
  const log = { '2026-09-30': 331, '2026-09-20': 412, '2026-10-01': 100 };
  assert.deepEqual(dailyStats(log, '2026-10-01'), { yesterday: 331, best: 412, played: 3 });
  assert.deepEqual(dailyStats({}, '2026-10-01'), { yesterday: null, best: null, played: 0 });
  assert.equal(dailyStats({ '2026-09-28': 5 }, '2026-10-01').yesterday, null);
});

test('dailyMenuMeta omits best when it equals yesterday', () => {
  assert.equal(dailyMenuMeta({ yesterday: 331, best: 412, played: 2 }), 'Dünkü fişin 331/500 · en iyin 412');
  assert.equal(dailyMenuMeta({ yesterday: 331, best: 331, played: 1 }), 'Dünkü fişin 331/500');
  assert.equal(dailyMenuMeta({ yesterday: null, best: 331, played: 1 }), '');
});

test('dailyTotalLine compares with yesterday', () => {
  assert.equal(dailyTotalLine(300, 260), 'Toplam: 300/500 · dünden +40');
  assert.equal(dailyTotalLine(300, 340), 'Toplam: 300/500 · dünden −40');
  assert.equal(dailyTotalLine(300, 300), 'Toplam: 300/500 · dünle aynı');
  assert.equal(dailyTotalLine(300, null), 'Toplam: 300/500');
});

test('dailyQuestions skips the 12 months before the day key but keeps products with nothing older', () => {
  const qs = [
    { id: 'dolar@2020-01', productId: 'dolar', date: '2020-01' },
    { id: 'dolar@2026-07', productId: 'dolar', date: '2026-07' },
    { id: 'euro@2026-07', productId: 'euro', date: '2026-07' },
  ];
  for (const key of ['2026-10-26', '2026-10-27', '2026-11-02', '2026-12-01']) {
    const ids = dailyQuestions(qs, key, categoryOf).map((q) => q.id);
    assert.ok(!ids.includes('dolar@2026-07'), key);
    assert.ok(ids.includes('euro@2026-07'), key);
  }
  // the cutoff follows the key: a year later the 2026-07 question is old enough
  const later = new Set();
  for (let d = 1; d < 28; d += 1) for (const q of dailyQuestions(qs, `2027-09-${String(d).padStart(2, '0')}`, categoryOf)) later.add(q.id);
  assert.ok(later.has('dolar@2026-07') || later.has('dolar@2020-01'));
  assert.deepEqual(dailyQuestions(qs, '2026-10-26', categoryOf), dailyQuestions([...qs].reverse(), '2026-10-26', categoryOf));
});
