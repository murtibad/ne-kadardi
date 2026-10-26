import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldTr, matchesQuery, filterByQuery, withinOneEdit } from '../js/search.js';

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

test('withinOneEdit detects insertions, deletions, substitutions within distance 1', () => {
  assert.equal(withinOneEdit('altn', 'altin'), true);
  assert.equal(withinOneEdit('bnzin', 'benzin'), true);
  assert.equal(withinOneEdit('iphne', 'iphone'), true);
  assert.equal(withinOneEdit('benzin', 'benzin'), true);
  assert.equal(withinOneEdit('benzin', 'benzi'), true);
  assert.equal(withinOneEdit('benzi', 'benzin'), true);
  assert.equal(withinOneEdit('benzin', 'benzim'), true);
  assert.equal(withinOneEdit('xyz', 'benzin'), false);
  assert.equal(withinOneEdit('cat', 'dog'), false);
});

test('filterByQuery falls back to typo-tolerant search when exact pass has no hit', () => {
  const items = [
    { name: 'Gram altın' },
    { name: 'Benzin' },
    { name: 'Çeyrek altın' },
    { name: 'iPhone' },
  ];

  // "altn" finds "Gram altın" and "Çeyrek altın"
  assert.deepEqual(
    filterByQuery(items, 'altn').map((i) => i.name),
    ['Gram altın', 'Çeyrek altın']
  );

  // "bnzin" finds "Benzin"
  assert.deepEqual(
    filterByQuery(items, 'bnzin').map((i) => i.name),
    ['Benzin']
  );

  // "iphne" finds "iPhone"
  assert.deepEqual(
    filterByQuery(items, 'iphne').map((i) => i.name),
    ['iPhone']
  );

  // "xyz" finds nothing
  assert.deepEqual(filterByQuery(items, 'xyz'), []);
});

test('query words shorter than 4 letters do not fuzzy-match', () => {
  const items = [{ name: 'Ay' }, { name: 'Benzin' }];
  // "al" is 2 letters; distance to "Ay" is 1, but words < 4 chars must match exactly
  assert.deepEqual(filterByQuery(items, 'al'), []);
});

test('exact hits win and do not add fuzzy extras', () => {
  const items = [
    { name: 'Gram altın' },
    { name: 'Çeyrek altın' },
    { name: 'Altn' },
  ];
  // "altın" matches "Gram altın" and "Çeyrek altın" exactly; "Altn" is not added as a fuzzy match
  assert.deepEqual(
    filterByQuery(items, 'altın').map((i) => i.name),
    ['Gram altın', 'Çeyrek altın']
  );
  // "altn" matches "Altn" exactly; "Gram altın" and "Çeyrek altın" are not added as fuzzy extras
  assert.deepEqual(
    filterByQuery(items, 'altn').map((i) => i.name),
    ['Altn']
  );
});
