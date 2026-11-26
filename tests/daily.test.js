import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, prevDayKey, resolveSavedDaily, seededRng, dailyQuestions, dailyTitle, dailyShareText, trimLog, dailyStats, dailyMenuMeta, dailyTotalLine, dailyRowText, dailyReviewTotalLine, dailyProgressDots, dailyMilestoneLine, dailyImageModel, fitText, dailyImageLayout, dailyProductIds, lastSevenDays, weekStripVisible } from '../js/daily.js';
import { dailyLines } from '../js/daily-ui.js';
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

test('prevDayKey crosses month and year boundaries', () => {
  assert.equal(prevDayKey('2026-03-01'), '2026-02-28');
  assert.equal(prevDayKey('2026-01-01'), '2025-12-31');
});

test('resolveSavedDaily keeps finished runs for today only and unfinished ones for yesterday too', () => {
  const run = (key, scores) => ({ key, ids: ['a@2020-01', 'b@2020-01'], scores });
  assert.deepEqual(resolveSavedDaily(run('2026-11-05', [1, 2]), '2026-11-05'), run('2026-11-05', [1, 2]));
  assert.equal(resolveSavedDaily(run('2026-11-04', [1, 2]), '2026-11-05'), null);
  assert.deepEqual(resolveSavedDaily(run('2026-11-04', [1]), '2026-11-05'), run('2026-11-04', [1]));
  assert.equal(resolveSavedDaily(run('2026-11-04', []), '2026-11-05'), null);
  assert.equal(resolveSavedDaily(run('2026-11-03', [1]), '2026-11-05'), null);
  assert.equal(resolveSavedDaily(null, '2026-11-05'), null);
  assert.equal(resolveSavedDaily({ key: '2026-11-05', ids: 'x', scores: [] }, '2026-11-05'), null);
});

test('resolveSavedDaily empties a run whose ids no longer exist in the data', () => {
  const data = { key: '2026-11-04', ids: ['a@2020-01', 'gone@2020-01'], scores: [100] };
  assert.deepEqual(resolveSavedDaily(data, '2026-11-05', new Set(['a@2020-01'])), { key: '2026-11-04', ids: [], scores: [] });
  assert.deepEqual(resolveSavedDaily(data, '2026-11-05', new Set(['a@2020-01', 'gone@2020-01'])), data);
});

test('resolveSavedDaily drops scores that have no matching ids (corrupt storage)', () => {
  const noIds = resolveSavedDaily({ key: '2026-11-05', ids: [], scores: [90, 80, 70, 60, 50, 40] }, '2026-11-05');
  assert.deepEqual(noIds, { key: '2026-11-05', ids: [], scores: [] });
  const extra = resolveSavedDaily({ key: '2026-11-05', ids: ['a', 'b'], scores: [1, 2, 3] }, '2026-11-05');
  assert.deepEqual(extra.scores, [1, 2]);
});

test('resolveSavedDaily keeps guesses only when they line up with the scores', () => {
  const run = (guesses) => ({ key: '2026-11-05', ids: ['a', 'b'], scores: [80, 0], guesses });
  assert.deepEqual(resolveSavedDaily(run([5, null]), '2026-11-05').guesses, [5, null]);
  assert.equal('guesses' in resolveSavedDaily(run([5]), '2026-11-05'), false);
  assert.equal('guesses' in resolveSavedDaily(run(['x', null]), '2026-11-05'), false);
  assert.equal('guesses' in resolveSavedDaily({ key: '2026-11-05', ids: ['a'], scores: [1] }, '2026-11-05'), false);
});

test('dailyRowText shows guess, real price and score; a skip reads "Geçtin"; no guess falls back', () => {
  const base = { date: '2016-01', title: 'Benzin', price: 4.28 };
  assert.equal(dailyRowText({ ...base, score: 86, guess: 5 }).detail, 'Sen ₺5,00 · Gerçek ₺4,28 · 86 puan');
  assert.equal(dailyRowText({ ...base, score: 0, guess: null }).detail, 'Geçtin · Gerçek ₺4,28');
  assert.equal(dailyRowText({ ...base, score: 0, guess: 0.5 }).detail, 'Sen ₺0,50 · Gerçek ₺4,28 · 0 puan');
  assert.equal(dailyRowText({ ...base, price: null, score: 0, guess: null }).detail, 'Geçtin');
  assert.equal(dailyRowText({ ...base, price: null, score: 50, guess: 7 }).detail, 'Sen ₺7,00 · 50 puan');
  assert.equal(dailyRowText({ ...base, score: 86 }).detail, '₺4,28 · 86 puan');
});

test('dailyRowText shows date, product, real price and score; a zero reads "0 puan"', () => {
  assert.deepEqual(dailyRowText({ date: '2016-01', title: 'Benzin', price: 4.28, score: 86 }),
    { label: 'Ocak 2016 · Benzin', detail: '₺4,28 · 86 puan' });
  assert.equal(dailyRowText({ date: '2016-01', title: 'Benzin', price: 4.28, score: 0 }).detail, '₺4,28 · 0 puan');
  assert.equal(dailyRowText({ date: '2016-01', title: 'Benzin', price: null, score: 50 }).detail, '50 puan');
});

test('share text never contains prices', () => {
  const t = dailyShareText({ key: '2026-11-18', scores: [86, 0, 40, 70, 90], url: 'https://x.y/' });
  assert.ok(!/₺|puan/.test(t));
});

test('dailyReviewTotalLine adds the streak only from 2 days up', () => {
  assert.equal(dailyReviewTotalLine(156, 0), 'Toplam: 156/500');
  assert.equal(dailyReviewTotalLine(156, 1), 'Toplam: 156/500');
  assert.equal(dailyReviewTotalLine(156, 3), 'Toplam: 156/500 · 🔥 3 gün üst üste');
});

test('dailyLines maps scores to their colour tier; 0 points is red like the shared square', () => {
  const all = [
    { id: 'benzin@2016-01', productId: 'benzin', name: 'Benzin', date: '2016-01', price: 4.28 },
    { id: 'dolar@2015-01', productId: 'dolar', name: 'Dolar', date: '2015-01', price: 2.33 },
    { id: 'ekmek@2014-01', productId: 'ekmek', name: 'Halk Ekmek', date: '2014-01', price: 0.6 },
    { id: 'simit@2018-01', productId: 'simit', name: 'Simit', date: '2018-01', price: 1.5 },
    { id: 'cay@2019-01', productId: 'cay', name: 'Çay', date: '2019-01', price: 25 },
  ];
  const ids = all.map((q) => q.id);
  const answered = dailyLines(all, ids, [90, 75, 50, 25, 10]);
  assert.deepEqual(answered.map((l) => l.tier), ['great', 'good', 'mid', 'poor', 'bad']);
  assert.equal(answered[0].label, 'Ocak 2016 · Benzin');
  assert.equal(answered[0].detail, '₺4,28 · 90 puan');

  const withSkips = dailyLines(all, ['benzin@2016-01', 'dolar@2015-01', 'missing@2020-01'], [0, null]);
  assert.deepEqual(withSkips, [
    { label: 'Ocak 2016 · Benzin', detail: '₺4,28 · 0 puan', tier: 'bad', productId: 'benzin', date: '2016-01' },
    { label: 'Ocak 2015 · Dolar', detail: '₺2,33 · 0 puan', tier: 'bad', productId: 'dolar', date: '2015-01' },
    { label: 'Soru', detail: '0 puan', tier: 'bad' },
  ]);
});

test('dailyLines shows guesses and skips when stored, old text otherwise', () => {
  const all = [
    { id: 'benzin@2016-01', productId: 'benzin', name: 'Benzin', date: '2016-01', price: 4.28 },
    { id: 'dolar@2015-01', productId: 'dolar', name: 'Dolar', date: '2015-01', price: 2.33 },
  ];
  const lines = dailyLines(all, all.map((q) => q.id), [86, 0], [5, null]);
  assert.deepEqual(lines.map((l) => l.detail), ['Sen ₺5,00 · Gerçek ₺4,28 · 86 puan', 'Geçtin · Gerçek ₺2,33']);
  assert.deepEqual(dailyLines(all, all.map((q) => q.id), [86, 0]).map((l) => l.detail), ['₺4,28 · 86 puan', '₺2,33 · 0 puan']);
});

test('dailyLines rows carry productId and date for the archive link; unknown ids get none', () => {
  const all = [
    { id: 'ekmek@2014-01', productId: 'ekmek', name: 'Halk Ekmek', date: '2014-01', price: 0.6 },
    { id: 'simit@2018-01', productId: 'simit', name: 'Simit', date: '2018-01', price: 1.5 },
  ];
  const lines = dailyLines(all, ['simit@2018-01', 'ekmek@2014-01', 'gone@2020-01'], [40, 80, 10]);
  assert.deepEqual(lines.map((l) => [l.productId, l.date]), [['simit', '2018-01'], ['ekmek', '2014-01'], [undefined, undefined]]);
  // A missing question must not become a link to a product that doesn't exist.
  assert.equal('productId' in lines[2], false);
});

test('dailyProgressDots marks answered tiers, current question, and upcoming slots', () => {
  assert.deepEqual(dailyProgressDots([], 5), [
    { status: 'current', score: null, tier: null },
    { status: 'upcoming', score: null, tier: null },
    { status: 'upcoming', score: null, tier: null },
    { status: 'upcoming', score: null, tier: null },
    { status: 'upcoming', score: null, tier: null },
  ]);

  assert.deepEqual(dailyProgressDots([90, 50], 5), [
    { status: 'done', score: 90, tier: 'great' },
    { status: 'done', score: 50, tier: 'mid' },
    { status: 'current', score: null, tier: null },
    { status: 'upcoming', score: null, tier: null },
    { status: 'upcoming', score: null, tier: null },
  ]);

  assert.deepEqual(dailyProgressDots([90, 75, 50, 25, 0], 5), [
    { status: 'done', score: 90, tier: 'great' },
    { status: 'done', score: 75, tier: 'good' },
    { status: 'done', score: 50, tier: 'mid' },
    { status: 'done', score: 25, tier: 'poor' },
    { status: 'done', score: 0, tier: 'bad' },
  ]);

  assert.deepEqual(dailyProgressDots([80, NaN, 'x'], 3), [
    { status: 'done', score: 80, tier: 'good' },
    { status: 'current', score: null, tier: null },
    { status: 'upcoming', score: null, tier: null },
  ]);

  assert.deepEqual(dailyProgressDots(null, 0), []);
});

test('dailyMilestoneLine never claims a record on the first-ever daily receipt', () => {
  assert.equal(dailyMilestoneLine({ played: 1, best: 450, yesterday: null }, 450, null), '');
  assert.equal(dailyMilestoneLine({ played: 1, best: 450, yesterday: null }, 450, undefined), '');
  assert.equal(dailyMilestoneLine({ played: 1, best: 450, yesterday: null }, 450, 200), '');
});

test('dailyMilestoneLine celebrates a new all-time daily best with the previous best', () => {
  assert.equal(
    dailyMilestoneLine({ played: 2, best: 380, yesterday: 340 }, 380, 340),
    "Yeni rekor! Bugüne kadarki en iyi Günün Fişi'n. Önceki en iyin 340.",
  );
  // Prior best of 0 omits "Önceki en iyin 0".
  assert.equal(
    dailyMilestoneLine({ played: 2, best: 210, yesterday: 0 }, 210, 0),
    "Yeni rekor! Bugüne kadarki en iyi Günün Fişi'n.",
  );
  // Ties and lower totals are not records.
  assert.equal(dailyMilestoneLine({ played: 4, best: 340, yesterday: 300 }, 340, 340), '');
  assert.equal(dailyMilestoneLine({ played: 4, best: 340, yesterday: 300 }, 290, 340), '');
});

test('dailyMilestoneLine celebrates played-count milestones 3, 7, 10, 25, 50, 100', () => {
  assert.equal(dailyMilestoneLine({ played: 3, best: 400, yesterday: 300 }, 250, 400), "3. Günün Fişi'n! Alışkanlık başlıyor.");
  assert.equal(dailyMilestoneLine({ played: 7, best: 400, yesterday: 300 }, 250, 400), "7. Günün Fişi'n! Tam bir haftalık fiş oldu.");
  assert.equal(dailyMilestoneLine({ played: 10, best: 400, yesterday: 300 }, 250, 400), "10. Günün Fişi'n! Bırakmadın.");
  assert.equal(dailyMilestoneLine({ played: 25, best: 400, yesterday: 300 }, 250, 400), "25. Günün Fişi'n! Artık müdavim oldun.");
  assert.equal(dailyMilestoneLine({ played: 50, best: 400, yesterday: 300 }, 250, 400), "50. Günün Fişi'n! Elli fiş oldu, helal olsun.");
  assert.equal(dailyMilestoneLine({ played: 100, best: 400, yesterday: 300 }, 250, 400), "100. Günün Fişi'n! Yüz fiş, büyük emek.");

  for (const n of [1, 2, 4, 6, 8, 9, 11, 24, 26, 49, 51, 99, 101]) {
    assert.equal(dailyMilestoneLine({ played: n, best: 400, yesterday: 300 }, 250, 400), '', `played=${n}`);
  }
});

test('dailyMilestoneLine combines a new all-time best and a milestone count on the same day', () => {
  assert.equal(
    dailyMilestoneLine({ played: 10, best: 420, yesterday: 310 }, 420, 390),
    "Yeni rekor! Bugüne kadarki en iyi Günün Fişi'n. Önceki en iyin 390. 10. Günün Fişi'n! Bırakmadın.",
  );
});

test('trimLog default keeps at least 100 days so the 100-receipt milestone is reachable', () => {
  const log = {};
  for (let i = 1; i <= 110; i += 1) {
    const d = new Date(2026, 0, i, 12);
    log[dayKey(d)] = 200 + i;
  }
  assert.equal(Object.keys(trimLog(log)).length, 110);
});

test('dailyImageModel is spoiler-free: names, tiers and total, no prices', () => {
  const m = dailyImageModel({ key: '2026-11-26', names: ['Benzin', 'Dolar', 'Ekmek', 'Simit', 'Çay'], scores: [90, 75, 50, 25, null], streak: 3 });
  assert.equal(m.title, 'GÜNÜN FİŞİ · 26 KASIM');
  assert.deepEqual(m.rows.map((r) => r.tier), ['great', 'good', 'mid', 'poor', 'bad']);
  assert.equal(m.total, '240/500');
  assert.equal(m.streakLine, '🔥 3 gün');
  assert.ok(!/₺/.test(JSON.stringify(m)));
  assert.equal(dailyImageModel({ key: '2026-11-26', names: ['A'], scores: [10], streak: 1 }).streakLine, null);
});

test('fitText ellipsizes to the measured width and layout grows with rows', () => {
  const measure = (s) => s.length * 10;
  assert.equal(fitText('Kısa', 100, measure), 'Kısa');
  const cut = fitText('Çok uzun bir ürün adı burada', 100, measure);
  assert.ok(cut.endsWith('…') && measure(cut) <= 100);
  assert.equal(fitText('Abcdef', 5, measure), 'A…');
  assert.equal(fitText('Asgari ücret (ele geçen, bekâr)', 130, measure), 'Asgari ücret');
  assert.ok(dailyImageLayout(5, true).height > dailyImageLayout(5, false).height);
});

test('dailyProductIds returns the product ids in today\'s daily receipt from the everyday pool', () => {
  const withNonEveryday = [
    ...sampleQuestions,
    { id: 'motorin@2018-01', productId: 'motorin', date: '2018-01' },
  ];
  const expected = new Set(dailyQuestions(sampleQuestions, '2026-10-26', categoryOf).map((q) => q.productId));
  const got = dailyProductIds(withNonEveryday, '2026-10-26', categoryOf);
  assert.deepEqual(got, expected);
  assert.equal(got.has('motorin'), false);
  // Passing null for everydayIds uses the whole list without filtering.
  const allMode = dailyProductIds([{ id: 'motorin@2018-01', productId: 'motorin', date: '2018-01' }], '2026-10-26', categoryOf, null);
  assert.deepEqual(allMode, new Set(['motorin']));
  assert.deepEqual(dailyProductIds([], '2026-10-26', categoryOf), new Set());
});

test('lastSevenDays: oldest first, today last, local weekday labels', () => {
  const days = lastSevenDays({ '2026-11-26': 412, '2026-11-24': 300 }, '2026-11-26');
  assert.deepEqual(days.map((d) => d.key), [
    '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26',
  ]);
  assert.deepEqual(days.map((d) => d.label), ['Cum', 'Cmt', 'Paz', 'Pzt', 'Sal', 'Çar', 'Per']);
  assert.deepEqual(days.map((d) => d.total), [null, null, null, null, 300, null, 412]);
});

test('lastSevenDays: crosses a month boundary (non-leap February)', () => {
  const days = lastSevenDays({ '2026-02-28': 250, '2026-03-02': 400 }, '2026-03-02');
  assert.deepEqual(days.map((d) => d.key), [
    '2026-02-24', '2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02',
  ]);
  assert.deepEqual(days.map((d) => d.label), ['Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz', 'Pzt']);
  assert.deepEqual(days.map((d) => d.total), [null, null, null, null, 250, null, 400]);
});

test('lastSevenDays: crosses a year boundary', () => {
  const days = lastSevenDays({ '2025-12-31': 333 }, '2026-01-03');
  assert.equal(days[0].key, '2025-12-28');
  assert.equal(days[0].label, 'Paz');
  assert.equal(days[6].label, 'Cmt');
  assert.equal(days[3].total, 333);
});

test('lastSevenDays: ignores bad entries and days outside the window', () => {
  const log = { '2026-11-25': 'x', '2026-11-19': 500, 'bad': 5, '2026-11-26': 0 };
  const days = lastSevenDays(log, '2026-11-26');
  assert.deepEqual(days.map((d) => d.total), [null, null, null, null, null, null, 0]);
  assert.equal(lastSevenDays(null, '2026-11-26').length, 7);
  assert.deepEqual(lastSevenDays({}, 'nope'), []);
});

test('lastSevenDays: matches dayKey/prevDayKey for today', () => {
  const today = dayKey();
  const days = lastSevenDays({}, today);
  assert.equal(days[6].key, today);
  assert.equal(days[5].key, prevDayKey(today));
});

test('weekStripVisible: needs at least 2 played days', () => {
  assert.equal(weekStripVisible(lastSevenDays({ '2026-11-26': 412 }, '2026-11-26')), false);
  assert.equal(weekStripVisible(lastSevenDays({}, '2026-11-26')), false);
  assert.equal(weekStripVisible(lastSevenDays({ '2026-11-26': 412, '2026-11-20': 0 }, '2026-11-26')), true);
  assert.equal(weekStripVisible([]), false);
});
