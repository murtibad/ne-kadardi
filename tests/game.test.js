import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestions, pickRandom, scoreGuess, buildContextLine, getShortUnit } from '../js/game.js';

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

test('getShortUnit matches units precisely', () => {
  assert.equal(getShortUnit('1 litre'), 'litre');
  assert.equal(getShortUnit('1 gram'), 'gram');
  assert.equal(getShortUnit('100 gr'), 'gram');
  assert.equal(getShortUnit('1 adet'), 'adet');
  assert.equal(getShortUnit('1 USD'), 'dolar');
  assert.equal(getShortUnit('Bir paket'), 'adet');
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
  assert.equal(buildContextLine(q, wages), 'O tarihte 1 asgari ücretle 500 adet alınabiliyordu, bugün 2000 adet.');
});

test('buildContextLine expresses expensive items as wage multiples, never "0 adet"', () => {
  const q = { productId: 'x', name: 'iPhone', unit: '1 adet', date: '2010-05', price: 1300, current: { price: 60000 } };
  assert.equal(buildContextLine(q, wages), 'O tarihte bir iPhone 2,6 asgari ücret ediyordu, bugün 3 asgari ücret.');
});

test('buildContextLine needs a wage from the same half-year', () => {
  const q = { productId: 'x', name: 'Ekmek', unit: '1 adet', date: '2010-08', price: 1, current: null };
  assert.equal(buildContextLine(q, wages), null);
  assert.equal(buildContextLine({ ...q, date: '2015-02' }, wages), 'O tarihte 1 asgari ücretle 1000 adet alınabiliyordu.');
});