import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestions, pickRandom, pickByCategory, scoreGuess, buildContextLine, buildContextModel, getShortUnit, getCountUnit, scoreTier, COUNT_UNITS, WAGE_SHARE, percentOf, actualLabel } from '../js/game.js';
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
    0.7: "%70'i", 0.8: "%80'i", 0.9: "%90'ı", 0.2: "%20'si", 0.3: "%30'u", 0.03: "%3'ü", 0.06: "%6'sı", 10: "%1.000'i" };
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
  assert.equal(openerFor(qs, 0).id, 'e1');
  assert.equal(openerFor(qs, 1).id, 'b1');
  assert.equal(openerFor(qs, 2), null); // big-mac missing here
  assert.equal(openerFor(qs, OPENER_IDS.length), null);
});
