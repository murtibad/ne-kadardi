import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestions, pickRandom, pickByCategory, scoreGuess, buildContextLine, buildContextModel, getShortUnit, getCountUnit, scoreTier, COUNT_UNITS, WAGE_SHARE, percentOf, actualLabel, buildWageBasketLine, WAGE_BASKET_IDS, formatWageDuration } from '../js/game.js';
import { readFileSync } from 'node:fs';

// Fixture prices are fake and exist only for tests. Never copy them into data/prices.json.
const fixture = {
  products: [{
    id: 'p',
    name: 'Product',
    unit: '1 unit',
    current: { date: '2026-10', price: 100, status: 'verified', source: { title: 't', url: 'https://x' } },
    prices: [
      { date: '2010-01', price: 1, status: 'verified', source: { title: 't', url: 'https://x' } },
      { date: '2015', price: 5, status: 'verified', source: { title: 't', url: 'https://x' }, unit: '2 units' },
      { date: '2020', price: null, status: 'todo', source: null },
    ],
  }],
};

test('buildQuestions keeps only verified entries', () => {
  const qs = buildQuestions(fixture);
  assert.equal(qs.length, 2);
  assert.equal(qs[1].unit, '2 units');
  assert.equal(qs[0].year, 2010);
});

test('buildQuestions carries product explain, null when absent', () => {
  const e = { date: '2020-01', price: 1, status: 'verified', source: { title: 't', url: 'https://x.test' } };
  const qs = buildQuestions({ products: [
    { id: 'a', name: 'A', unit: 'u', explain: 'Açıklama', prices: [e] },
    { id: 'b', name: 'B', unit: 'u', prices: [e] },
  ] });
  assert.equal(qs[0].explain, 'Açıklama');
  assert.equal(qs[1].explain, null);
});

test('buildQuestions carries product image', () => {
  const f = { products: [{ id: 'p1', name: 'A', unit: 'U', image: { src: 'img/test.svg', alt: 'Test', credit: 'C' }, prices: [{ date: '2010-01', price: 1, status: 'verified', source: {} }] }] };
  const qs = buildQuestions(f);
  assert.equal(qs[0].image.src, 'img/test.svg');
  
  const f2 = { products: [{ id: 'p2', name: 'B', unit: 'U', prices: [{ date: '2010-01', price: 1, status: 'verified', source: {} }] }] };
  const qs2 = buildQuestions(f2);
  assert.equal(qs2[0].image, null);
});

test('buildQuestions carries product tax', () => {
  const f = { products: [{ id: 'p1', name: 'A', unit: 'U', tax: { method: 'm' }, prices: [{ date: '2010-01', price: 1, status: 'verified', source: {} }] }] };
  const qs = buildQuestions(f);
  assert.equal(qs[0].tax?.method, 'm');
  
  const f2 = { products: [{ id: 'p2', name: 'B', unit: 'U', prices: [{ date: '2010-01', price: 1, status: 'verified', source: {} }] }] };
  const qs2 = buildQuestions(f2);
  assert.equal(qs2[0].tax, null);
});

test('getShortUnit matches units precisely', () => {
  assert.equal(getShortUnit('1 litre'), 'litre');
  assert.equal(getShortUnit('1 gram'), 'gram');
  assert.equal(getShortUnit('100 gr'), 'gram');
  assert.equal(getShortUnit('1 adet'), 'adet');
  assert.equal(getShortUnit('1 adet, 250 gr'), 'adet');
  assert.equal(getShortUnit('1 USD'), 'dolar');
  assert.equal(getShortUnit('Bir paket'), 'adet');
});

test('monthly products are counted by name in the purchasing-power line', () => {
  const wage = { productId: 'asgari-ucret', date: '2018-07', price: 1603, current: { date: '2026-01', price: 28075 } };
  const dorm = { productId: 'kyk-yurt-ucreti', name: 'KYK yurt ücreti', unit: '1 ay, en ucuz oda tipi', date: '2018-09', price: 168, current: { date: '2026-09', price: 1000 } };
  assert.equal(getCountUnit(dorm), 'aylık yurt ücreti');
  assert.equal(getCountUnit({ productId: 'benzin', unit: '1 litre' }), 'litre benzin');
  assert.equal(getCountUnit({ productId: 'unknown', unit: '1 litre' }), 'litre');
  assert.equal(buildContextLine(dorm, [wage, dorm]), 'O tarihte 1 asgari ücretle 9 aylık yurt ücreti ödenebiliyordu, bugün 28 aylık yurt ücreti ödenebiliyor.');
  assert.equal(buildContextModel(dorm, [wage, dorm]).unit, 'aylık yurt ücreti');
});

test('pickRandom avoids an immediate repeat', () => {
  const qs = buildQuestions(fixture);
  for (let i = 0; i < 20; i++) {
    assert.notEqual(pickRandom(qs, qs[0].id).id, qs[0].id);
  }
  assert.equal(pickRandom([], null), null);
});

test('scoreGuess is symmetric for over and under guesses', () => {
  const over = scoreGuess(20, 10);
  const under = scoreGuess(5, 10);
  assert.equal(over.direction, 'over');
  assert.equal(under.direction, 'under');
  assert.equal(over.factor, 2);
  assert.equal(under.factor, 2);
  assert.equal(over.score, under.score);
});

test('scoreGuess gives 100 within 10% and 0 at 5x', () => {
  assert.equal(scoreGuess(10.5, 10).score, 100);
  assert.equal(scoreGuess(10.5, 10).direction, 'exact');
  assert.equal(scoreGuess(50, 10).score, 0);
  assert.equal(scoreGuess(1, 10).score, 0);
});

// Fake wage fixtures for the context line; never copy into data/prices.json.
const wageNow = { price: 20000 };
const wages = [
  { productId: 'asgari-ucret', date: '2010-01', price: 500, current: wageNow },
  { productId: 'asgari-ucret', date: '2015-01', price: 1000, current: wageNow },
];

test('buildContextLine counts cheap items and compares with today', () => {
  const q = { productId: 'x', name: 'Ekmek', unit: '1 adet', date: '2010-03', price: 1, current: { price: 10 } };
  assert.equal(buildContextLine(q, wages), 'O tarihte 1 asgari ücretle 500 adet alınabiliyordu, bugün 2.000 adet alınabiliyor.');
});

test('buildContextLine expresses expensive items as wage multiples, never "0 adet"', () => {
  const q = { productId: 'x', name: 'iPhone', unit: '1 adet', date: '2010-05', price: 1300, current: { price: 60000 } };
  assert.equal(buildContextLine(q, wages), 'O tarihte bir iPhone 2,6 asgari ücret ediyordu, bugün 3 asgari ücret.');
});

test('formatWageDuration formats wage counts as rounded years and months', () => {
  assert.equal(formatWageDuration(12.0), '1 yıllık');
  assert.equal(formatWageDuration(24), '2 yıllık');
  assert.equal(formatWageDuration(13), '1 yıl 1 aylık');
  assert.equal(formatWageDuration(38.4), '3 yıl 2 aylık');
  assert.equal(formatWageDuration(53.4), '4 yıl 5 aylık');
  assert.equal(formatWageDuration(23.6), '2 yıllık');
  assert.equal(formatWageDuration(12.4), '1 yıllık');
  assert.equal(formatWageDuration(12.5), '1 yıl 1 aylık');
});

test('buildContextLine expresses 12+ wages as years and months while keeping <12 as ratios', () => {
  const car = { productId: 'fiat-egea-easy', name: 'Fiat Egea', unit: '1 araç', date: '2010-03', price: 19200, current: { price: 1068000 } };
  assert.equal(buildContextLine(car, wages), 'O tarihte bir Fiat Egea 3 yıl 2 aylık asgari ücret ediyordu, bugün 4 yıl 5 aylık.');
  assert.equal(buildContextLine({ ...car, price: 12000, current: null }, wages), 'O tarihte bir Fiat Egea 2 yıllık asgari ücret ediyordu.');

  // Mixed <12 and >=12 halves.
  assert.equal(buildContextLine({ ...car, price: 5000, current: { price: 260000 } }, wages), 'O tarihte bir Fiat Egea 10 aylık asgari ücret ediyordu, bugün 1 yıl 1 aylık.');
  assert.equal(buildContextLine({ ...car, price: 6000, current: { price: 160000 } }, wages), 'O tarihte bir Fiat Egea 1 yıllık asgari ücret ediyordu, bugün 8 aylık.');

  // Just below 12 keeps the decimal ratio wording.
  assert.equal(buildContextLine({ ...car, price: 5950, current: { price: 238000 } }, wages), 'O tarihte bir Fiat Egea 11,9 asgari ücret ediyordu, bugün 11,9 asgari ücret.');

  // Present-only 12+ wages.
  const todayCar = { productId: 'fiat-egea-easy', name: 'Fiat Egea', unit: '1 araç', date: '2015-03', price: 540000, current: { date: '2015-03', price: 540000 } };
  assert.equal(buildContextLine(todayCar, wages), 'Bugün bir Fiat Egea 2 yıl 3 aylık asgari ücret ediyor.');
  assert.equal(buildContextLine({ ...todayCar, price: 240000, current: { date: '2015-03', price: 240000 } }, wages), 'Bugün bir Fiat Egea 1 yıllık asgari ücret ediyor.');
});

test('buildContextLine uses the wage in force on the date, from the same year only', () => {
  const q = { productId: 'x', name: 'Ekmek', unit: '1 adet', date: '2010-08', price: 1, current: null };
  assert.equal(buildContextLine(q, wages), 'O tarihte 1 asgari ücretle 500 adet alınabiliyordu.');
  assert.equal(buildContextLine({ ...q, date: '2012-03' }, wages), null);
  assert.equal(buildContextLine({ ...q, date: '2010' }, wages), 'O tarihte 1 asgari ücretle 500 adet alınabiliyordu.');
  const twoRaises = [...wages, { productId: 'asgari-ucret', date: '2010-07', price: 600, current: wageNow }];
  assert.equal(buildContextLine({ ...q, date: '2010' }, twoRaises), null);
  assert.equal(buildContextLine({ ...q, date: '2010-08' }, twoRaises), 'O tarihte 1 asgari ücretle 600 adet alınabiliyordu.');
  assert.equal(buildContextLine({ ...q, date: '2015-02' }, wages), 'O tarihte 1 asgari ücretle 1.000 adet alınabiliyordu.');
});
test("buildContextLine tells a question about today's price in the present, against today's wage", () => {
  const cheap = { productId: 'x', name: 'Ekmek', unit: '1 adet', date: '2015-03', price: 10, current: { date: '2015-03', price: 10 } };
  assert.equal(buildContextLine(cheap, wages), 'Bugün 1 asgari ücretle 2.000 adet alınabiliyor.');
  const dear = { productId: 'x', name: 'Araba', unit: '1 adet', date: '2015-03', price: 60000, current: { date: '2015-03', price: 60000 } };
  assert.equal(buildContextLine(dear, wages), 'Bugün bir Araba 3 asgari ücret ediyor.');
  const pension = { productId: 'kyk-burs', name: 'KYK bursu', unit: '1 ay', date: '2015-03', price: 5000, current: { date: '2015-03', price: 5000 } };
  assert.match(buildContextLine(pension, wages), /^.+ bugün asgari ücretin %25'i kadar\.$/);
});
// Basket fixtures are fake and exist only for tests. Never copy them into data/prices.json.
const basketWageNow = { date: '2026-07', price: 28000, status: 'verified' };
const basketWage = { productId: 'asgari-ucret', name: 'Asgari ücret', unit: '1 ay', date: '2010-01', price: 740, status: 'verified', current: basketWageNow };
const basketRow = (productId, date, price, current) => ({ productId, name: productId, unit: '1', date, price, status: 'verified', current });
const goldNow = { date: '2026-11', price: 4800, status: 'verified' };
const fuelNow = { date: '2026-11', price: 54.9, status: 'verified' };
const gold2010 = basketRow('gram-altin', '2010-01', 100, goldNow);
const fuel2010 = basketRow('benzin', '2010-01', 4.68, fuelNow);

test('every wage basket item has a count unit', () => {
  for (const id of WAGE_BASKET_IDS) assert.ok(COUNT_UNITS[id], id);
});

test('buildWageBasketLine compares one wage then and today with the first two basket items', () => {
  const dollar = basketRow('dolar', '2010-01', 1.5, { date: '2026-11', price: 40, status: 'verified' });
  const all = [basketWage, gold2010, fuel2010, dollar];
  const line = 'O tarihte 1 asgari ücretle 7,4 gram altın ya da 158 litre benzin alınabiliyordu; bugün 5,8 gram altın ya da 510 litre benzin.';
  assert.equal(buildWageBasketLine(basketWage, all), line);
  assert.equal(buildContextLine(basketWage, all), line);
  // Receipt bars stay off for the wage itself.
  assert.equal(buildContextModel(basketWage, all), null);
});

test('buildWageBasketLine pairs a wage only with item prices of the same month', () => {
  const july = { ...basketWage, date: '2010-07' };
  // January gold and June/September fuel are not July prices: a July wage must not use them.
  const all = [july, gold2010, fuel2010, basketRow('benzin', '2010-06', 5, fuelNow), basketRow('benzin', '2010-09', 9, fuelNow)];
  assert.equal(buildWageBasketLine(july, all), null);
  const withJuly = [...all, basketRow('benzin', '2010-07', 5, fuelNow)];
  assert.equal(buildWageBasketLine(july, withJuly), 'O tarihte 1 asgari ücretle 148 litre benzin alınabiliyordu; bugün 510 litre benzin.');
});

test('buildWageBasketLine skips unverified, other-year and no-current items', () => {
  const todoBread = { productId: 'ekmek', date: '2010-01', price: null, status: 'todo', current: { date: '2026-11', price: 20, status: 'verified' } };
  const oldDollar = basketRow('dolar', '2009-12', 1.5, { date: '2026-11', price: 40, status: 'verified' });
  const goldNoCurrent = basketRow('gram-altin', '2010-01', 100, undefined);
  const all = [basketWage, goldNoCurrent, fuel2010, todoBread, oldDollar];
  assert.equal(buildWageBasketLine(basketWage, all), 'O tarihte 1 asgari ücretle 158 litre benzin alınabiliyordu; bugün 510 litre benzin.');
  assert.equal(buildWageBasketLine(basketWage, [basketWage, todoBread, oldDollar, goldNoCurrent]), null);
});

test('buildWageBasketLine tells the newest wage only in the present', () => {
  const wageToday = { ...basketWage, date: '2026-07', price: 28000 };
  const all = [wageToday, basketRow('gram-altin', '2026-07', 4800, goldNow), basketRow('benzin', '2026-07', 54.9, fuelNow)];
  assert.equal(buildWageBasketLine(wageToday, all), 'Bugün 1 asgari ücretle 5,8 gram altın ya da 510 litre benzin alınabiliyor.');
});

test('buildWageBasketLine leaves out "bugün" without a current wage', () => {
  const noNow = { ...basketWage, current: null };
  assert.equal(buildWageBasketLine(noNow, [noNow, fuel2010]), 'O tarihte 1 asgari ücretle 158 litre benzin alınabiliyordu.');
});

test('scoreTier maps scores to five colour tiers', () => {
  assert.equal(scoreTier(100), 'great');
  assert.equal(scoreTier(85), 'great');
  assert.equal(scoreTier(84), 'good');
  assert.equal(scoreTier(70), 'good');
  assert.equal(scoreTier(69), 'mid');
  assert.equal(scoreTier(45), 'mid');
  assert.equal(scoreTier(44), 'poor');
  assert.equal(scoreTier(20), 'poor');
  assert.equal(scoreTier(19), 'bad');
  assert.equal(scoreTier(0), 'bad');
});

test('buildContextLine names the models when the current price is a newest-launch price', () => {
  const wages = [
    { productId: 'asgari-ucret', date: '2019-07', price: 2020, current: { price: 28075 } },
  ];
  const q = { productId: 'iphone', name: 'Yeni iPhone', label: 'iPhone 11', date: '2019-10', price: 7299, unit: '1 adet', current: { date: '2025-09', price: 77999, label: 'En yeni iPhone 17' } };
  assert.match(buildContextLine(q, wages), /O tarihte bir iPhone 11 .* asgari ücret ediyordu, bugün iPhone 17 ise .* asgari ücret\./);
});

test('buildQuestions prefers an entry image over the product image', () => {
  const f = { products: [{ id: 'p1', name: 'A', unit: 'U', image: { src: 'img/p.svg', alt: 'P' }, prices: [
    { date: '2010-01', price: 1, status: 'verified', source: {}, image: { src: 'img/e.svg', alt: 'E' } },
    { date: '2011-01', price: 2, status: 'verified', source: {} },
  ] }] };
  const qs = buildQuestions(f);
  assert.equal(qs[0].image.src, 'img/e.svg');
  assert.equal(qs[1].image.src, 'img/p.svg');
});

test('pickByCategory never repeats a recent product and visits all products before repeating', () => {
  const qs = [];
  for (const id of ['a', 'b', 'c', 'd']) {
    for (let y = 0; y < (id === 'a' ? 17 : 2); y += 1) qs.push({ id: `${id}@${y}`, productId: id });
  }
  const recent = [];
  let prev = null;
  const seenInRound = [];
  for (let i = 0; i < 40; i += 1) {
    const q = pickByCategory(qs, recent, prev);
    assert.ok(!recent.slice(-3).includes(q.productId), 'repeated a product within the last 3 questions');
    recent.push(q.productId); prev = q.id; seenInRound.push(q.productId);
  }
  // the 17-entry product must not dominate: roughly a quarter of 40 picks
  const a = seenInRound.filter((p) => p === 'a').length;
  assert.ok(a >= 6 && a <= 14, `product a picked ${a} times`);
});

test('pickByCategory works with a single product', () => {
  const qs = [{ id: 'x@1', productId: 'x' }, { id: 'x@2', productId: 'x' }];
  assert.notEqual(pickByCategory(qs, ['x'], 'x@1').id, 'x@1');
  assert.equal(pickByCategory([], [], null), null);
});

test('pickByCategory prefers unseen questions and falls back when all of the product are seen', () => {
  const qs = [
    { id: 'a@1', productId: 'a' }, { id: 'a@2', productId: 'a' }, { id: 'a@3', productId: 'a' },
    { id: 'b@1', productId: 'b' },
  ];
  const zero = () => 0; // picks the first fresh product ('a') and the first item in the pool
  // Without `seen`, rng()=0 would pick 'a@1'; marking 'a@1' and 'a@2' seen picks 'a@3'.
  assert.equal(pickByCategory(qs, [], null, zero).id, 'a@1');
  assert.equal(pickByCategory(qs, [], null, zero, new Set(['a@1', 'a@2'])).id, 'a@3');
  // When every question of the chosen product is seen, fall back and still avoid previousId.
  const allA = new Set(['a@1', 'a@2', 'a@3']);
  assert.equal(pickByCategory(qs, [], null, zero, allA).id, 'a@1');
  assert.equal(pickByCategory(qs, [], 'a@1', zero, allA).id, 'a@2');
  // Unseen filtering also avoids previousId: if the only unseen is previousId, fall back to the others.
  assert.equal(pickByCategory(qs, [], 'a@3', zero, new Set(['a@1', 'a@2'])).id, 'a@1');
});

test('buildContextModel mirrors buildContextLine numbers and nulls', () => {
  const cheap = { productId: 'x', name: 'Ekmek', unit: '1 adet', date: '2010-03', price: 1, current: { price: 10 } };
  assert.deepEqual(buildContextModel(cheap, wages), { kind: 'count', today: false, unit: 'adet', nowUnit: 'adet', then: 500, now: 2000 });

  const dear = { productId: 'x', name: 'iPhone', unit: '1 adet', date: '2010-05', price: 1300, current: { price: 60000 } };
  assert.deepEqual(buildContextModel(dear, wages), { kind: 'wages', name: 'iPhone', nowName: null, today: false, then: 1300 / 500, now: 3 });

  // One wage no longer buys a single item: now is 0, not negative or null.
  const pricey = { ...cheap, price: 100, current: { price: 30000 } };
  assert.equal(buildContextModel(pricey, wages).now, 0);
  assert.match(buildContextLine(pricey, wages), /bugün 1 asgari ücretle bir tane bile alınamıyor/);

  // Near one wage the count would round 1,25 and 1,6 down to 1: it compares as a share instead.
  const near = { ...cheap, productId: 'trafik-cezasi', price: 400, current: { price: 12000 } };
  assert.deepEqual(buildContextModel(near, wages), { kind: 'share', better: 'lower', name: 'Kırmızı ışık cezası', today: false, then: 0.8, now: 0.6 });
  assert.match(buildContextLine(near, wages), /^Kırmızı ışık cezası o tarihte asgari ücretin %80'i kadardı; bugün %60'ı\.$/);

  // Same small count then and now (5 and 5) says nothing changed: share instead.
  const same = { ...cheap, productId: 'trafik-cezasi', price: 100, current: { price: 3900 } };
  assert.equal(buildContextModel(same, wages).kind, 'share');

  // No current price: now is null; no wage in the same half-year or the wage itself: null.
  assert.deepEqual(buildContextModel({ ...cheap, current: null }, wages), { kind: 'count', today: false, unit: 'adet', nowUnit: 'adet', then: 500, now: null });
  assert.equal(buildContextModel({ ...cheap, date: '2012-08' }, wages), null);
  assert.equal(buildContextModel({ ...cheap, productId: 'asgari-ucret' }, wages), null);
});

test('every product has a plain count name or compares as a share of the wage', () => {
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  for (const p of data.products) {
    if (p.id === 'asgari-ucret') continue;
    assert.ok(COUNT_UNITS[p.id] || WAGE_SHARE[p.id], `${p.id} needs a COUNT_UNITS name in js/game.js`);
  }
});

test('pensions and grants read as a share of the minimum wage, not as items bought', () => {
  const pension = { productId: 'emekli-en-dusuk-aylik', name: 'En düşük emekli aylığı', unit: '1 ay', date: '2010-03', price: 250, current: { price: 15000 } };
  assert.equal(buildContextLine(pension, wages), "En düşük emekli aylığı o tarihte asgari ücretin %50'si kadardı; bugün %75'i.");
  assert.deepEqual(buildContextModel(pension, wages), { kind: 'share', better: 'higher', name: 'En düşük emekli aylığı', today: false, then: 0.5, now: 0.75 });
  assert.equal(buildContextLine({ ...pension, current: null }, wages), "En düşük emekli aylığı o tarihte asgari ücretin %50'si kadardı.");
});

test('model-changing products name the model on both sides of the count', () => {
  const pods = { productId: 'airpods', name: 'AirPods', label: 'AirPods 2', unit: '1 adet', date: '2010-03', price: 100, current: { price: 5000, label: 'AirPods 4' } };
  assert.equal(buildContextLine(pods, wages), 'O tarihte 1 asgari ücretle 5 tane AirPods 2 alınabiliyordu, bugün 4 tane AirPods 4 alınabiliyor.');
  const bread = { productId: 'simit', name: 'Simit', unit: '1 adet, 100 gram', date: '2010-03', price: 1, current: { price: 10 } };
  assert.equal(buildContextLine(bread, wages), 'O tarihte 1 asgari ücretle 500 simit alınabiliyordu, bugün 2.000 simit alınabiliyor.');
  const car = { productId: 'fiat-egea-easy', name: 'Sıfır Fiat Egea Sedan 1.4 Fire Easy (manuel, benzinli)', unit: '1 araç', date: '2010-03', price: 5000, current: { price: 200000 } };
  assert.equal(buildContextLine(car, wages), 'O tarihte bir Fiat Egea 10 asgari ücret ediyordu, bugün 10 asgari ücret.');
});

test('percentOf adds the Turkish possessive the way the number is read aloud', () => {
  const cases = { 0: "%0'ı", 0.49: "%49'u", 0.84: "%84'ü", 0.32: "%32'si", 1.05: "%105'i", 1.11: "%111'i",
    0.14: "%14'ü", 0.62: "%62'si", 0.6: "%60'ı", 1: "%100'ü", 0.1: "%10'u", 0.4: "%40'ı", 0.5: "%50'si",
    0.7: "%70'i", 0.8: "%80'i", 0.9: "%90'ı", 0.2: "%20'si", 0.3: "%30'u", 0.03: "%3'ü", 0.06: "%6'sı", 10: "%1.000'i",
    0.0102: "%1'i", 0.0107: "%1,1'i", 0.014: "%1,4'ü", 0.056: "%5,6'sı", 0.099: "%9,9'u" };
  for (const [share, text] of Object.entries(cases)) assert.equal(percentOf(Number(share)), text);
});

test('paper fees are paid, not bought, and a wage that no longer covers one says so plainly', () => {
  const card = { productId: 'kimlik-karti', name: 'Kimlik kartı', unit: '1 adet', date: '2010-03', price: 50, current: { price: 1000 } };
  assert.equal(buildContextLine(card, wages), 'O tarihte 1 asgari ücretle 10 kimlik kartı ücreti ödenebiliyordu, bugün 20 kimlik kartı ücreti ödenebiliyor.');
  const imei = { productId: 'imei-kayit-harci', name: 'IMEI', unit: '1 telefon', date: '2010-03', price: 100, current: { price: 30000 } };
  assert.equal(buildContextLine(imei, wages), 'O tarihte 1 asgari ücretle 5 yurt dışı telefon kaydı ödenebiliyordu; bugün 1 asgari ücretle bir tane bile ödenemiyor.');
});

test('the newest value is not compared with itself: it is told once, as today', () => {
  const q = { productId: 'simit', name: 'Simit', unit: '1 adet', date: '2015-03', price: 1, current: { date: '2015-03', price: 1 } };
  assert.equal(buildContextLine(q, wages), 'Bugün 1 asgari ücretle 20.000 simit alınabiliyor.');
});

test('pensions and wages are labelled as an amount, prices as a price', () => {
  assert.equal(actualLabel('emekli-en-dusuk-aylik'), 'Gerçek tutar');
  assert.equal(actualLabel('asgari-ucret'), 'Gerçek tutar');
  assert.equal(actualLabel('kidem-tavani'), 'Gerçek tutar');
  assert.equal(actualLabel('simit'), 'Gerçek fiyat');
});

test('isAmount marks money people get, not things they buy', async () => {
  const { isAmount } = await import('../js/game.js');
  assert.equal(isAmount('emekli-bayram-ikramiyesi'), true);
  assert.equal(isAmount('asgari-ucret'), true);
  assert.equal(isAmount('big-mac'), false);
});

test('openerFor serves the oldest question of each opener product, then stops', async () => {
  const { openerFor, OPENER_IDS } = await import('../js/game.js');
  const qs = [
    { id: 'e2', productId: 'ekmek', date: '2020-01' }, { id: 'e1', productId: 'ekmek', date: '2019-06' },
    { id: 'b1', productId: 'benzin', date: '2016-01' },
  ];
  assert.equal(OPENER_IDS[0], 'benzin'); // a nationwide price, not the Istanbul-subsidised 0,75 TL bread
  assert.equal(openerFor(qs, 0).id, 'b1');
  assert.equal(openerFor(qs, 1), null); // big-mac missing here
  assert.equal(openerFor(qs, OPENER_IDS.indexOf('ekmek')).id, 'e1');
  assert.equal(openerFor(qs, OPENER_IDS.length), null);
});

test('exam fees and car parks read as what they let you do', () => {
  const yds = { productId: 'yds', name: 'YDS', unit: '1 sınav', date: '2010-03', price: 50, current: { price: 1000 } };
  assert.equal(buildContextLine(yds, wages), "O tarihte 1 asgari ücretle 10 kez YDS'ye girilebiliyordu, bugün 20 kez girilebiliyor.");
  const park = { productId: 'ispark-otopark', name: 'İSPARK', unit: '1 saat', date: '2010-03', price: 100, current: { price: 30000 } };
  assert.equal(buildContextLine(park, wages), 'O tarihte 1 asgari ücretle 5 saat park edilebiliyordu; bugün 1 asgari ücretle bir saat bile park edilemiyor.');
  const train = { productId: 'yht-bilet', name: 'YHT', unit: '1 bilet', date: '2010-03', price: 100, current: { price: 1000 } };
  assert.match(buildContextLine(train, wages), /hızlı tren bileti alınabiliyordu/);
});

test('pickFollowUp picks another product from the same year, avoiding recent products and same category when possible', async () => {
  const { pickFollowUp, yearOf } = await import('../js/game.js');
  const zero = () => 0;
  const q = { id: 'benzin@2020-01', productId: 'benzin', date: '2020-01' };
  const qs = [
    q,
    { id: 'benzin@2020-07', productId: 'benzin', date: '2020-07' },
    { id: 'motorin@2020-01', productId: 'motorin', date: '2020-01' }, // same category (ulasim)
    { id: 'ekmek@2020-03', productId: 'ekmek', date: '2020-03' }, // different category (gunluk)
    { id: 'dolar@2020-06', productId: 'dolar', date: '2020-06' }, // different category (para)
    { id: 'ekmek@2019-01', productId: 'ekmek', date: '2019-01' }, // different year
  ];

  // Picks same year, different product, and prefers a different category over motorin.
  const f1 = pickFollowUp(q, qs, [], zero);
  assert.equal(yearOf(f1.date), 2020);
  assert.notEqual(f1.productId, 'benzin');
  assert.equal(f1.id, 'ekmek@2020-03');

  // Avoids recentProducts (last 8) when an alternative exists.
  const f2 = pickFollowUp(q, qs, ['ekmek'], zero);
  assert.equal(f2.id, 'dolar@2020-06');

  // Everyday products (FOLLOW_UP_IDS) win over a fresh but obscure one (motorin is not listed).
  const f3 = pickFollowUp(q, qs, ['ekmek', 'dolar'], zero);
  assert.equal(f3.id, 'ekmek@2020-03');
  // Without any everyday product that year, an obscure one is still offered.
  const f3b = pickFollowUp(q, qs.filter((x) => x.productId !== 'ekmek' && x.productId !== 'dolar'), [], zero);
  assert.equal(f3b.id, 'motorin@2020-01');

  // Falls back to recent products (still preferring another category) when all same-year products are recent.
  const f4 = pickFollowUp(q, qs, ['motorin', 'ekmek', 'dolar'], zero);
  assert.equal(f4.id, 'ekmek@2020-03');

  // Never returns the same product and returns null when no other product exists in that year.
  assert.equal(pickFollowUp(q, [q, { id: 'benzin@2020-07', productId: 'benzin', date: '2020-07' }, { id: 'ekmek@2019-01', productId: 'ekmek', date: '2019-01' }], [], zero), null);
  assert.equal(pickFollowUp(null, qs, [], zero), null);
});

test('updateStreak and streakAlive track consecutive calendar days across month, year and leap boundaries', async () => {
  const { updateStreak, streakAlive } = await import('../js/game.js');

  // Null or empty prev starts at 1.
  assert.equal(streakAlive(null, '2026-01-10'), false);
  assert.equal(streakAlive({ last: null, count: 0, best: 0 }, '2026-01-10'), false);
  const s1 = updateStreak(null, '2026-01-10');
  assert.deepEqual(s1, { last: '2026-01-10', count: 1, best: 1 });
  assert.deepEqual(updateStreak({ last: null, count: 0, best: 0 }, '2026-01-10'), { last: '2026-01-10', count: 1, best: 1 });

  // Same day is unchanged.
  assert.equal(streakAlive(s1, '2026-01-10'), true);
  assert.deepEqual(updateStreak(s1, '2026-01-10'), { last: '2026-01-10', count: 1, best: 1 });

  // Next day increments count and best.
  assert.equal(streakAlive(s1, '2026-01-11'), true);
  const s2 = updateStreak(s1, '2026-01-11');
  assert.deepEqual(s2, { last: '2026-01-11', count: 2, best: 2 });
  assert.deepEqual(updateStreak(s2, '2026-01-11'), { last: '2026-01-11', count: 2, best: 2 });

  // Gap of 2 days resets count to 1 and keeps best.
  assert.equal(streakAlive(s2, '2026-01-13'), false);
  const afterGap = updateStreak(s2, '2026-01-13');
  assert.deepEqual(afterGap, { last: '2026-01-13', count: 1, best: 2 });

  // Month end: 2026-01-31 to 2026-02-01.
  const janEnd = { last: '2026-01-31', count: 3, best: 3 };
  assert.equal(streakAlive(janEnd, '2026-02-01'), true);
  assert.deepEqual(updateStreak(janEnd, '2026-02-01'), { last: '2026-02-01', count: 4, best: 4 });

  // Year end: 2025-12-31 to 2026-01-01.
  const decEnd = { last: '2025-12-31', count: 5, best: 5 };
  assert.equal(streakAlive(decEnd, '2026-01-01'), true);
  assert.deepEqual(updateStreak(decEnd, '2026-01-01'), { last: '2026-01-01', count: 6, best: 6 });

  // Leap day: 2028-02-29 to 2028-03-01.
  const leapDay = { last: '2028-02-29', count: 2, best: 4 };
  assert.equal(streakAlive(leapDay, '2028-03-01'), true);
  assert.deepEqual(updateStreak(leapDay, '2028-03-01'), { last: '2028-03-01', count: 3, best: 4 });
});

test('pickFromCategory picks another product from the same category and returns null when none fits', async () => {
  const { pickFromCategory } = await import('../js/game.js');
  const { categoryOf } = await import('../js/categories.js');
  const qs = [
    { id: 'benzin@2020-01', productId: 'benzin', date: '2020-01' },
    { id: 'motorin@2021-01', productId: 'motorin', date: '2021-01' },
    { id: 'otogaz@2022-01', productId: 'otogaz', date: '2022-01' },
    { id: 'ekmek@2020-01', productId: 'ekmek', date: '2020-01' },
  ];
  const zero = () => 0;
  const last = () => 0.99;

  // Picks from 'ulasim' while excluding 'benzin'.
  const p1 = pickFromCategory(qs, 'ulasim', 'benzin', categoryOf, zero);
  assert.equal(p1.id, 'motorin@2021-01');
  const p2 = pickFromCategory(qs, 'ulasim', 'benzin', categoryOf, last);
  assert.equal(p2.id, 'otogaz@2022-01');

  // Returns null when the excluded product is the only one in that category.
  assert.equal(pickFromCategory(qs, 'gunluk', 'ekmek', categoryOf, zero), null);
  // Returns null when no question belongs to the category or inputs are empty.
  assert.equal(pickFromCategory(qs, 'teknoloji', 'benzin', categoryOf, zero), null);
  assert.equal(pickFromCategory(qs, null, 'benzin', categoryOf, zero), null);
  assert.equal(pickFromCategory([], 'ulasim', 'benzin', categoryOf, zero), null);
});

test('pickByCategory keeps a product away for 15 questions and caps a category at 3 of the last 10', async () => {
  const { cutoffKey } = await import('../js/game.js');
  const { CATEGORIES } = await import('../js/categories.js');
  const qs = [];
  for (const c of CATEGORIES) for (const id of c.products.slice(0, 8)) qs.push({ id: `${id}@2015-01`, productId: id, date: '2015-01' });
  let s = 12345;
  const rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const recent = [];
  for (let i = 0; i < 200; i += 1) {
    const q = pickByCategory(qs, recent, null, rng, new Set(), new Date(2026, 9, 26));
    assert.ok(!recent.slice(-15).includes(q.productId), `repeat within 15 at ${i}`);
    const last10 = [...recent.slice(-10), q.productId].slice(-10);
    const n = last10.filter((id) => CATEGORIES.find((c) => c.products.includes(id)).id === CATEGORIES.find((c) => c.products.includes(q.productId)).id).length;
    assert.ok(n <= 3 || i < 3, `category over cap at ${i}`);
    recent.push(q.productId);
  }
  assert.equal(cutoffKey(new Date(2026, 9, 26)), '2025-10-26');
  assert.equal(cutoffKey('2026-02-05'), '2025-02-05');
});

test('pickByCategory skips the last 12 months when the product has older questions', () => {
  const qs = [
    { id: 'dolar@2020-01', productId: 'dolar', date: '2020-01' },
    { id: 'dolar@2026-07', productId: 'dolar', date: '2026-07' },
    { id: 'euro@2026-07', productId: 'euro', date: '2026-07' },
  ];
  const today = new Date(2026, 9, 26);
  for (let i = 0; i < 20; i += 1) {
    assert.equal(pickByCategory(qs.slice(0, 2), [], null, () => i / 20, new Set(), today).id, 'dolar@2020-01');
  }
  // euro has only a recent question: it is kept
  assert.equal(pickByCategory([qs[2], qs[0]], ['dolar'], null, () => 0, new Set(), today).id, 'euro@2026-07');
});

test('pickFollowUp avoids recent products in the everyday pool, rotates them and never repeats the last offer', async () => {
  const { pickFollowUp } = await import('../js/game.js');
  const ids = ['ekmek', 'simit', 'cay', 'big-mac', 'dolar'];
  const q = { id: 'benzin@2020-01', productId: 'benzin', date: '2020-01' };
  const qs = [q, ...ids.map((id) => ({ id: `${id}@2020-03`, productId: id, date: '2020-03' }))];
  const zero = () => 0;
  assert.equal(pickFollowUp(q, qs, ['ekmek', 'simit'], zero).productId, 'cay');
  assert.notEqual(pickFollowUp(q, qs, [], zero, 'ekmek').productId, 'ekmek');
  // all recent: the one answered longest ago
  assert.equal(pickFollowUp(q, qs, ['cay', 'ekmek', 'dolar', 'simit', 'big-mac'], zero).productId, 'cay');
  // only candidate is the last offer: still offered
  assert.equal(pickFollowUp(q, [q, qs[1]], [], zero, 'ekmek').productId, 'ekmek');
});

test('updateStreak and streakAlive survive the clock moving back', async () => {
  const { updateStreak, streakAlive } = await import('../js/game.js');
  const prev = { last: '2026-01-10', count: 3, best: 5 };
  assert.equal(streakAlive(prev, '2026-01-09'), true);
  assert.equal(streakAlive(prev, '2026-01-07'), true);
  assert.deepEqual(updateStreak(prev, '2026-01-09'), { last: '2026-01-10', count: 3, best: 5 });
  // the kept later date still lets the next real day extend the streak
  assert.equal(updateStreak(updateStreak(prev, '2026-01-09'), '2026-01-11').count, 4);
});

test('isFirstAnswerOfDay is false when the clock moved back', async () => {
  const { isFirstAnswerOfDay } = await import('../js/game.js');
  assert.equal(isFirstAnswerOfDay(null, '2026-11-05'), true);
  assert.equal(isFirstAnswerOfDay({ last: '2026-11-04', count: 3 }, '2026-11-05'), true);
  assert.equal(isFirstAnswerOfDay({ last: '2026-11-05', count: 3 }, '2026-11-05'), false);
  assert.equal(isFirstAnswerOfDay({ last: '2026-11-07', count: 3 }, '2026-11-05'), false);
});

test('the worked example in "Puan nasıl hesaplanır?" matches the formula', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /gerçek fiyat 100 lira, sen 200 ya da 50 yazdıysan 61 puan/);
  assert.equal(scoreGuess(200, 100).score, 61);
  assert.equal(scoreGuess(50, 100).score, 61);
});

test('pickByCategory skips excluded (daily) products unless excluding them would empty the pool', () => {
  const qs = [
    { id: 'dolar@2015-01', productId: 'dolar', date: '2015-01' },
    { id: 'benzin@2016-01', productId: 'benzin', date: '2016-01' },
    { id: 'ekmek@2014-01', productId: 'ekmek', date: '2014-01' },
  ];
  const today = new Date(2026, 9, 26);
  const exclude = new Set(['dolar', 'benzin']);
  for (let i = 0; i < 10; i += 1) {
    assert.equal(pickByCategory(qs, [], null, () => i / 10, new Set(), today, exclude).productId, 'ekmek');
  }
  // Even if the only non-excluded product was recently played, it still beats an excluded daily product.
  assert.equal(pickByCategory(qs, ['ekmek'], null, () => 0, new Set(), today, exclude).productId, 'ekmek');
  // When every product is excluded, fall back gracefully instead of returning null.
  const allExcluded = new Set(['dolar', 'benzin', 'ekmek']);
  const fallback = pickByCategory(qs, ['dolar'], null, () => 0, new Set(), today, allExcluded);
  assert.ok(fallback && fallback.productId !== 'dolar');
});

test('pickByCategory avoids the same product family within FAMILY_WINDOW and falls back softly', async () => {
  const { FAMILY_WINDOW } = await import('../js/game.js');
  const today = new Date(2026, 9, 26);
  const breadAndFuel = [
    { id: 'firin-ekmegi@2014-01', productId: 'firin-ekmegi', date: '2014-01' },
    { id: 'dolar@2015-01', productId: 'dolar', date: '2015-01' },
    { id: 'ekmek@2014-01', productId: 'ekmek', date: '2014-01' },
  ];
  // With Halk Ekmek in the last 8, firin-ekmegi (same bread family) is skipped in favour of dolar.
  for (let i = 0; i < 10; i += 1) {
    assert.equal(pickByCategory(breadAndFuel, ['ekmek'], null, () => i / 10, new Set(), today).productId, 'dolar');
  }
  // Still avoided when ekmek is at the oldest slot of FAMILY_WINDOW (8th from last).
  const pad = Array.from({ length: FAMILY_WINDOW - 1 }, (_, i) => `other-${i}`);
  assert.equal(pickByCategory(breadAndFuel, ['ekmek', ...pad], null, () => 0, new Set(), today).productId, 'dolar');
  // Once ekmek drops out of FAMILY_WINDOW, firin-ekmegi is eligible again (rng=0 picks it before dolar).
  assert.equal(pickByCategory(breadAndFuel, ['ekmek', ...pad, 'extra'], null, () => 0, new Set(), today).productId, 'firin-ekmegi');
  // Soft fallback: when only a sibling remains, pick it rather than returning null.
  const onlyFuel = [
    { id: 'benzin@2016-01', productId: 'benzin', date: '2016-01' },
    { id: 'motorin@2016-01', productId: 'motorin', date: '2016-01' },
  ];
  assert.equal(pickByCategory(onlyFuel, ['benzin'], null, () => 0, new Set(), today).productId, 'motorin');
});

test('free play on real data avoids today\'s Günün Fişi products and recent product families', async () => {
  const { FAMILY_WINDOW } = await import('../js/game.js');
  const { categoryOf, familyOf } = await import('../js/categories.js');
  const { dayKey, dailyProductIds } = await import('../js/daily.js');
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const all = buildQuestions(data);
  const today = new Date(2026, 9, 26);
  const dailyExclude = dailyProductIds(all, dayKey(today), categoryOf);
  assert.equal(dailyExclude.size, 5);

  let s = 424242;
  const rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const recent = [];
  for (let i = 0; i < 100; i += 1) {
    const q = pickByCategory(all, recent, null, rng, new Set(), today, dailyExclude);
    assert.ok(!dailyExclude.has(q.productId), `picked daily product ${q.productId} at ${i}`);
    assert.ok(!recent.slice(-15).includes(q.productId), `repeated product ${q.productId} within 15 at ${i}`);
    const recentFams = recent.slice(-FAMILY_WINDOW).map(familyOf);
    assert.ok(!recentFams.includes(familyOf(q.productId)), `repeated family ${familyOf(q.productId)} within ${FAMILY_WINDOW} at ${i}`);
    recent.push(q.productId);
  }
});

test('shouldReplaceBestGuess replaces when nothing valid is stored or when score is strictly higher', async () => {
  const { shouldReplaceBestGuess } = await import('../js/game.js');
  assert.equal(shouldReplaceBestGuess(null, 0), true);
  assert.equal(shouldReplaceBestGuess(undefined, 96), true);
  assert.equal(shouldReplaceBestGuess({ bad: true }, 50), true);
  assert.equal(shouldReplaceBestGuess({ productId: 'benzin', date: '2015-01', score: 0 }, 0), false);
  assert.equal(shouldReplaceBestGuess({ productId: 'benzin', date: '2015-01', score: 90 }, 90), false);
  assert.equal(shouldReplaceBestGuess({ productId: 'benzin', date: '2015-01', score: 90 }, 89), false);
  assert.equal(shouldReplaceBestGuess({ productId: 'benzin', date: '2015-01', score: 90 }, 96), true);
  assert.equal(shouldReplaceBestGuess({ productId: 'benzin', date: '2015-01', score: 90 }, NaN), false);
  assert.equal(shouldReplaceBestGuess({ productId: 'benzin', date: '2015-01', score: 90 }, -1), false);
});

test('resolveBestGuess matches stored productId and date against playable questions', async () => {
  const { resolveBestGuess } = await import('../js/game.js');
  const qs = [
    { id: 'benzin@2015-01', productId: 'benzin', name: 'Benzin', date: '2015-01', price: 4.2 },
    { id: 'ekmek@2014-01', productId: 'ekmek', name: 'Ekmek', date: '2014-01', price: 0.75 },
  ];
  assert.deepEqual(resolveBestGuess({ productId: 'benzin', date: '2015-01', score: 96 }, qs), {
    question: qs[0],
    score: 96,
  });
  assert.equal(resolveBestGuess(null, qs), null);
  assert.equal(resolveBestGuess({ productId: 'removed', date: '2015-01', score: 96 }, qs), null);
  assert.equal(resolveBestGuess({ productId: 'benzin', date: '2011-01', score: 96 }, qs), null);
  assert.equal(resolveBestGuess({ productId: 'benzin', date: '2015-01', score: -1 }, qs), null);
  assert.equal(resolveBestGuess({ productId: 'benzin', date: '2015-01', score: 96 }, []), null);
});

test('matchGuessedPeriod finds the closest verified row within ±20% in ratio terms and excludes askedDate', async () => {
  const { matchGuessedPeriod } = await import('../js/game.js');
  const rows = [
    { date: '2016-01', price: 4.3, status: 'verified' },
    { date: '2020-01', price: 7.0, status: 'verified' },
    { date: '2022-06', price: 21.0, status: 'verified' },
    { date: '2023-01', price: 20.5, status: 'todo' }, // unverified must be ignored
    { date: '2024-01', price: 40.0, status: 'verified' },
  ];
  const current = { date: '2026-10', price: 50.0, status: 'verified' };

  // Matches closest verified historical row within ±20% (ignoring closer unverified 'todo' row).
  const m1 = matchGuessedPeriod(20, rows, '2016-01', current);
  assert.equal(m1?.kind, 'period');
  assert.equal(m1?.date, '2022-06');
  assert.equal(m1?.price, 21.0);

  // Asked date is excluded even when guess matches it exactly.
  assert.equal(matchGuessedPeriod(4.3, rows, '2016-01', current), null);

  // No match when guess falls in a gap >20% away from every verified row and below current.
  assert.equal(matchGuessedPeriod(12, rows, '2016-01', current), null);

  // Multiple close rows: closest in ratio terms wins (not linear difference).
  // Guess 100 vs 85 (ratio 100/85 = 1.1765) vs 116 (ratio 116/100 = 1.16) -> 116 is closer in ratio.
  const closeRows = [
    { date: '2021-01', price: 85 },
    { date: '2022-01', price: 116 },
  ];
  const mRatio = matchGuessedPeriod(100, closeRows, '2015-01', { date: '2026-10', price: 300 });
  assert.equal(mRatio?.kind, 'period');
  assert.equal(mRatio?.date, '2022-01');

  // Boundary: exactly 1.2x ratio matches; >1.2x does not.
  assert.equal(matchGuessedPeriod(12, [{ date: '2021-01', price: 10 }], '2015-01', null)?.date, '2021-01');
  assert.equal(matchGuessedPeriod(12.01, [{ date: '2021-01', price: 10 }], '2015-01', null), null);
});

test('matchGuessedPeriod handles current price matches, above-current guesses, and invalid inputs', async () => {
  const { matchGuessedPeriod } = await import('../js/game.js');
  const rows = [
    { date: '2016-01', price: 4.3 },
    { date: '2022-06', price: 20.0 },
    { date: '2026-10', price: 50.0 }, // same date as current
  ];
  const current = { date: '2026-10', price: 50.0 };

  // Within ±20% of current returns kind 'current' even when a historical row shares current.date.
  const mCur = matchGuessedPeriod(55, rows, '2016-01', current);
  assert.equal(mCur?.kind, 'current');
  assert.equal(mCur?.price, 50.0);

  // At exact +20% of current (60 vs 50) -> still within ±20% ('current').
  assert.equal(matchGuessedPeriod(60, rows, '2016-01', current)?.kind, 'current');

  // Above current by more than 20% -> 'above-current'.
  const mAbove = matchGuessedPeriod(65, rows, '2016-01', current);
  assert.equal(mAbove?.kind, 'above-current');
  assert.equal(mAbove?.price, 50.0);

  // If the asked question IS today's price, current is excluded (neither 'current' nor 'above-current').
  assert.equal(matchGuessedPeriod(65, rows, '2026-10', current), null);
  assert.equal(matchGuessedPeriod(50, rows, '2026-10', current), null);

  // Invalid inputs return null.
  assert.equal(matchGuessedPeriod(0, rows, '2016-01', current), null);
  assert.equal(matchGuessedPeriod(-5, rows, '2016-01', current), null);
  assert.equal(matchGuessedPeriod(NaN, rows, '2016-01', current), null);
  assert.equal(matchGuessedPeriod(20, null, '2016-01', null), null);
});

test('timeWarpText formats regular prices and amount products with receipt price formatting', async () => {
  const { timeWarpText, isAmount } = await import('../js/game.js');
  const { formatPrice } = await import('../js/format.js');

  assert.equal(
    timeWarpText(20, { kind: 'period', date: '2022-06', price: 21, factor: 1.05 }),
    `Yazdığın ${formatPrice(20)} aslında Haziran 2022'nin fiyatıydı.`,
  );
  assert.equal(
    timeWarpText(50, { kind: 'current', date: '2026-10', price: 50, factor: 1 }),
    'Yazdığın fiyat, bugünkü fiyata yakın.',
  );
  assert.equal(
    timeWarpText(80, { kind: 'above-current', date: '2026-10', price: 50, factor: 1.6 }),
    'Yazdığın fiyat bugünkünden bile yüksek!',
  );

  // Amount products (wages, pensions, grants) say "tutar" instead of "fiyat".
  const amt = { amount: isAmount('asgari-ucret') };
  assert.equal(
    timeWarpText(5500, { kind: 'period', date: '2022-07', price: 5500, factor: 1 }, amt),
    `Yazdığın ${formatPrice(5500)} aslında Temmuz 2022'nin tutarıydı.`,
  );
  assert.equal(
    timeWarpText(28000, { kind: 'current', date: '2026-01', price: 28075, factor: 1.003 }, amt),
    'Yazdığın tutar, bugünkü tutara yakın.',
  );
  assert.equal(
    timeWarpText(40000, { kind: 'above-current', date: '2026-01', price: 28075, factor: 1.42 }, amt),
    'Yazdığın tutar bugünkünden bile yüksek!',
  );

  assert.equal(timeWarpText(20, null), '');
  assert.equal(timeWarpText(0, { kind: 'current', price: 50, factor: 1 }), '');
});

test('homeStreakText greets returning players warmly at 5+ days and keeps short-gap messages', async () => {
  const { homeStreakText } = await import('../js/game.js');

  assert.equal(homeStreakText(null, '2026-01-10'), '');
  assert.equal(homeStreakText({ last: null, count: 0, best: 0 }, '2026-01-10'), '');
  assert.equal(homeStreakText({ last: 'bad', count: 3, best: 3 }, '2026-01-10'), '');
  assert.equal(homeStreakText({ last: '2026-01-10', count: 3, best: 3 }, 'bad'), '');

  // Played today or yesterday.
  assert.equal(homeStreakText({ last: '2026-01-10', count: 3, best: 3 }, '2026-01-10'), '');
  assert.equal(homeStreakText({ last: '2026-01-09', count: 3, best: 3 }, '2026-01-10'), 'Serini koru: bugün bir soru çöz.');
  assert.equal(homeStreakText({ last: '2026-01-09', count: 1, best: 5 }, '2026-01-10'), '');

  // Clock moved back: keep alive rather than breaking or welcoming back.
  assert.equal(homeStreakText({ last: '2026-01-10', count: 3, best: 3 }, '2026-01-09'), 'Serini koru: bugün bir soru çöz.');

  // 2 to 4 days since last play: broken-streak message only when count >= 2.
  assert.equal(
    homeStreakText({ last: '2026-01-08', count: 3, best: 7 }, '2026-01-10'),
    'Serin bozuldu (en uzun: 7 gün). Bugün yeniden başla.',
  );
  assert.equal(
    homeStreakText({ last: '2026-01-06', count: 4, best: 0 }, '2026-01-10'),
    'Serin bozuldu (en uzun: 4 gün). Bugün yeniden başla.',
  );
  assert.equal(homeStreakText({ last: '2026-01-06', count: 1, best: 5 }, '2026-01-10'), '');

  // Exactly 5 days and > 5 days (including month/year boundary): warm welcome back.
  assert.equal(
    homeStreakText({ last: '2026-01-05', count: 4, best: 9 }, '2026-01-10'),
    'Yeniden hoş geldin! En uzun serin 9 gündü; bugün yeni bir seri başlat.',
  );
  assert.equal(
    homeStreakText({ last: '2026-01-05', count: 1, best: 4 }, '2026-01-10'),
    'Yeniden hoş geldin! En uzun serin 4 gündü; bugün yeni bir seri başlat.',
  );
  assert.equal(
    homeStreakText({ last: '2025-12-27', count: 2, best: 2 }, '2026-01-01'),
    'Yeniden hoş geldin! En uzun serin 2 gündü; bugün yeni bir seri başlat.',
  );
  assert.equal(
    homeStreakText({ last: '2026-01-05', count: 1, best: 1 }, '2026-01-10'),
    'Yeniden hoş geldin! Bugün yeni bir seri başlat.',
  );
  assert.equal(
    homeStreakText({ last: '2026-01-01', count: 0, best: 0 }, '2026-01-10'),
    'Yeniden hoş geldin! Bugün yeni bir seri başlat.',
  );
});

test('pickForProduct excludes the shown date, prefers older than 12 months, and returns null when none left', async () => {
  const { pickForProduct } = await import('../js/game.js');
  const today = new Date(2026, 9, 26); // cutoff: 2025-10-26
  const qs = [
    { id: 'dolar@2010-01', productId: 'dolar', date: '2010-01' },
    { id: 'dolar@2018-01', productId: 'dolar', date: '2018-01' },
    { id: 'dolar@2026-07', productId: 'dolar', date: '2026-07' },
    { id: 'solo@2015-01', productId: 'solo', date: '2015-01' },
  ];

  // Excludes the shown 2010-01 date and prefers 2018-01 over recent 2026-07.
  for (let i = 0; i < 10; i += 1) {
    const picked = pickForProduct(qs, 'dolar', { excludeDate: '2010-01', today, rng: () => i / 10 });
    assert.equal(picked.id, 'dolar@2018-01');
  }

  // When excluding the only older date, falls back to the remaining recent date.
  const recentOnly = [qs[0], qs[2]];
  assert.equal(pickForProduct(recentOnly, 'dolar', { excludeDate: '2010-01', today, rng: () => 0 }).id, 'dolar@2026-07');

  // Prefers unseen dates and avoids previousId when multiple older dates remain.
  const multi = [
    { id: 'dolar@2010-01', productId: 'dolar', date: '2010-01' },
    { id: 'dolar@2015-01', productId: 'dolar', date: '2015-01' },
    { id: 'dolar@2018-01', productId: 'dolar', date: '2018-01' },
  ];
  assert.equal(
    pickForProduct(multi, 'dolar', { excludeDate: '2010-01', seen: new Set(['dolar@2015-01']), today, rng: () => 0 }).id,
    'dolar@2018-01',
  );
  assert.equal(
    pickForProduct(multi, 'dolar', { excludeDate: '2010-01', previousId: 'dolar@2015-01', today, rng: () => 0 }).id,
    'dolar@2018-01',
  );

  // Returns null when no other date exists for the product, or on missing inputs.
  assert.equal(pickForProduct(qs, 'solo', { excludeDate: '2015-01', today }), null);
  assert.equal(pickForProduct(qs, 'missing', { excludeDate: '2015-01', today }), null);
  assert.equal(pickForProduct([], 'dolar', { excludeDate: '2010-01', today }), null);
  assert.equal(pickForProduct(qs, null, { today }), null);
});

test('pickForYear asks from the chosen year, prefers another product, and never returns the shown product@date', async () => {
  const { pickForYear, yearOf } = await import('../js/game.js');
  const qs = [
    { id: 'benzin@2014-01', productId: 'benzin', date: '2014-01' },
    { id: 'benzin@2014-07', productId: 'benzin', date: '2014-07' },
    { id: 'ekmek@2014-01', productId: 'ekmek', date: '2014-01' },
    { id: 'dolar@2014-06', productId: 'dolar', date: '2014-06' },
    { id: 'ekmek@2015-01', productId: 'ekmek', date: '2015-01' },
  ];

  // Prefers another product from 2014 over benzin@2014-07.
  for (let i = 0; i < 10; i += 1) {
    const picked = pickForYear(qs, 2014, { excludeProductId: 'benzin', excludeDate: '2014-01', rng: () => i / 10 });
    assert.equal(yearOf(picked.date), 2014);
    assert.ok(picked.productId === 'ekmek' || picked.productId === 'dolar');
  }

  // Prefers unseen questions and avoids previousId when all are seen.
  assert.equal(
    pickForYear(qs, 2014, { excludeProductId: 'benzin', excludeDate: '2014-01', seen: new Set(['ekmek@2014-01']), rng: () => 0 }).id,
    'dolar@2014-06',
  );
  assert.equal(
    pickForYear(qs, 2014, { excludeProductId: 'benzin', excludeDate: '2014-01', previousId: 'ekmek@2014-01', seen: new Set(['ekmek@2014-01', 'dolar@2014-06']), rng: () => 0 }).id,
    'dolar@2014-06',
  );

  // Falls back to another date of the same product when no other product exists in that year.
  const sameProductOnly = [qs[0], qs[1], qs[4]];
  assert.equal(
    pickForYear(sameProductOnly, 2014, { excludeProductId: 'benzin', excludeDate: '2014-01', rng: () => 0 }).id,
    'benzin@2014-07',
  );

  // Never returns the exact shown product@date even when it is the only question in that year.
  assert.equal(pickForYear([qs[0], qs[4]], 2014, { excludeProductId: 'benzin', excludeDate: '2014-01' }), null);
  assert.equal(pickForYear(qs, 2010, { excludeProductId: 'benzin', excludeDate: '2014-01' }), null);
  assert.equal(pickForYear(qs, NaN), null);
  assert.equal(pickForYear(null, 2014), null);
});

test('fact card play helpers never spoil the shown fact on real data', async () => {
  const { pickForProduct, pickForYear, yearOf } = await import('../js/game.js');
  const { pickFact, factYears } = await import('../js/fact.js');
  const { buildTimelines } = await import('../js/timeline.js');
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  const all = buildQuestions(data);
  const tls = buildTimelines(data);
  const today = new Date(2026, 9, 26);

  const randomFact = pickFact(tls, { random: () => 0.3 });
  const prodQ = pickForProduct(all, randomFact.productId, { excludeDate: randomFact.date, today, rng: () => 0 });
  if (prodQ) {
    assert.equal(prodQ.productId, randomFact.productId);
    assert.notEqual(prodQ.date, randomFact.date);
  }

  for (const y of factYears(tls)) {
    const f = pickFact(tls, { random: () => 0, year: y });
    const q = pickForYear(all, y, { excludeProductId: f.productId, excludeDate: f.date, rng: () => 0 });
    assert.ok(q, `expected a non-spoiling question for year ${y}`);
    assert.equal(yearOf(q.date), y);
    assert.notEqual(q.id, `${f.productId}@${f.date}`);
  }
});
