import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldTr, matchesQuery, filterByQuery } from '../js/search.js';

test('empty or blank query matches everything', () => {
  assert.equal(matchesQuery('Benzin', ''), true);
  assert.equal(matchesQuery('Benzin', '   '), true);
  assert.equal(matchesQuery('Benzin', undefined), true);
});

test('matching is case-insensitive with Turkish dotted and dotless i', () => {
  assert.equal(matchesQuery('İstanbul ulaşım', 'istanbul'), true);
  assert.equal(matchesQuery('Çay', 'ÇAY'), true);
  assert.equal(matchesQuery('Sınav ücreti', 'SINAV'), true);
});

test('Turkish characters can be typed without diacritics', () => {
  assert.equal(matchesQuery('Gram altın', 'altin'), true);
  assert.equal(matchesQuery('Köprü geçişi', 'kopru gecisi'), true);
  assert.equal(matchesQuery('Çeyrek altın', 'ceyrek'), true);
  assert.equal(matchesQuery('Ehliyet harcı', 'harci'), true);
  assert.equal(foldTr('ĞÜŞİÖÇI'), 'gusioci');
});

test('every word must match, in any order', () => {
  assert.equal(matchesQuery('Motorlu araç tescil belgesi', 'tescil arac'), true);
  assert.equal(matchesQuery('Motorlu araç tescil belgesi', 'tescil dolar'), false);
});

test('non-matching query is rejected', () => {
  assert.equal(matchesQuery('Benzin', 'motorin'), false);
});

test('filterByQuery keeps order and returns [] for no match', () => {
  const items = [{ name: 'Gram altın' }, { name: 'Benzin' }, { name: 'Çeyrek altın' }];
  assert.deepEqual(filterByQuery(items, 'ALTIN').map((i) => i.name), ['Gram altın', 'Çeyrek altın']);
  assert.deepEqual(filterByQuery(items, 'xyz'), []);
});
