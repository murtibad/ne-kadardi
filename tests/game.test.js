import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestions, filterByYears, pickRandom, scoreGuess, buildContextLine } from '../js/game.js';

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

test('filterByYears is inclusive', () => {
  const qs = buildQuestions(fixture);
  assert.equal(filterByYears(qs, 2010, 2014).length, 1);
  assert.equal(filterByYears(qs, 2010, 2015).length, 2);
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

test('buildContextLine for cheap product', () => {
  const qs = [
    { productId: 'asgari-ucret', date: '2010-01', price: 500, unit: '1 ay', name: 'Asgari' },
    { productId: 'asgari-ucret', current: { price: 17000 } } // A fake one to trigger current branch
  ];
  const q = { productId: 'ekmek', date: '2010-01', price: 0.5, unit: '1 adet', name: 'Ekmek', current: { price: 10 } };
  const line = buildContextLine(q, qs);
  assert.equal(line.includes('1000 adet'), true);
});

test('buildContextLine for expensive product', () => {
  const qs = [
    { productId: 'asgari-ucret', date: '2010-01', price: 500, unit: '1 ay', name: 'Asgari' },
    { productId: 'asgari-ucret', current: { price: 17000 } }
  ];
  const q = { productId: 'iphone', date: '2010-05', price: 1500, unit: '1 adet', name: 'iPhone', current: { price: 60000 } };
  const line = buildContextLine(q, qs);
  assert.equal(line.includes('3 asgari ücret'), true);
});

test('buildContextLine for cheap product', () => {
  const qs = [
    { productId: 'asgari-ucret', date: '2010-01', price: 500, unit: '1 ay', name: 'Asgari' },
    { productId: 'asgari-ucret', current: { price: 17000 } } // A fake one to trigger current branch
  ];
  const q = { productId: 'ekmek', date: '2010-01', price: 0.5, unit: '1 adet', name: 'Ekmek', current: { price: 10 } };
  const line = buildContextLine(q, qs);
  assert.equal(line.includes('1000 adet'), true);
});

test('buildContextLine for expensive product', () => {
  const qs = [
    { productId: 'asgari-ucret', date: '2010-01', price: 500, unit: '1 ay', name: 'Asgari' },
    { productId: 'asgari-ucret', current: { price: 17000 } }
  ];
  const q = { productId: 'iphone', date: '2010-05', price: 1500, unit: '1 adet', name: 'iPhone', current: { price: 60000 } };
  const line = buildContextLine(q, qs);
  assert.equal(line.includes('3 asgari ücret'), true);
});
