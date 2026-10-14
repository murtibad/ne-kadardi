import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStats, STAT_KEYS } from '../js/stats.js';

const NP = ['Henüz oynanmadı'];

test('STAT_KEYS has the six score keys and not the theme', () => {
  assert.equal(STAT_KEYS.length, 6);
  assert.ok(!STAT_KEYS.includes('ne-kadardi-theme'));
});

test('empty or null input means nothing played, in menu order', () => {
  for (const raw of [null, {}, Object.fromEntries(STAT_KEYS.map((k) => [k, null]))]) {
    const rows = buildStats(raw);
    assert.deepEqual(rows.map((r) => r.mode), ['Fiyat Tahmini', 'Hangisi Pahalı?', 'Sırala', '60 Saniye', 'Hangi Yıl?', 'Sepet Kurma']);
    assert.ok(rows.every((r) => JSON.stringify(r.lines) === JSON.stringify(NP)));
  }
});

test('full data renders every mode', () => {
  const rows = buildStats({
    'ne-kadardi-session': '{"played":13,"total":247,"best":63}',
    'ne-kadardi-versus-best': '7',
    'ne-kadardi-order-stats': '{"rounds":4,"perfect":1,"total":300}',
    'ne-kadardi-blitz-best': '12',
    'ne-kadardi-yearguess-best': '5',
    'ne-kadardi-basket-best': '88',
  });
  assert.deepEqual(rows[0], { mode: 'Fiyat Tahmini', href: '#tahmin', lines: ['13 soru', 'ortalama 19', 'en iyi 63'] });
  assert.deepEqual(rows[1].lines, ['en iyi seri 7']);
  assert.deepEqual(rows[2].lines, ['4 set', 'ortalama 75', '1 kusursuz']);
  assert.deepEqual(rows[3].lines, ['en iyi 12 doğru']);
  assert.deepEqual(rows[4].lines, ['en iyi seri 5']);
  assert.deepEqual(rows[5].lines, ['en iyi puan 88']);
});

test('old session save without best omits that line', () => {
  const rows = buildStats({ 'ne-kadardi-session': '{"played":2,"total":50}' });
  assert.deepEqual(rows[0].lines, ['2 soru', 'ortalama 25']);
});

test('corrupt JSON counts as not played', () => {
  const rows = buildStats({ 'ne-kadardi-session': '{oops', 'ne-kadardi-order-stats': 'null' });
  assert.deepEqual(rows[0].lines, NP);
  assert.deepEqual(rows[2].lines, NP);
});

test('negative, NaN and garbage numbers never leak into output', () => {
  const rows = buildStats({
    'ne-kadardi-session': '{"played":"x","total":"y","best":-1}',
    'ne-kadardi-versus-best': '-3',
    'ne-kadardi-order-stats': '{"rounds":2,"perfect":"a","total":null}',
    'ne-kadardi-blitz-best': 'NaN',
    'ne-kadardi-yearguess-best': 'abc',
    'ne-kadardi-basket-best': '',
  });
  assert.deepEqual(rows[0].lines, NP);
  assert.deepEqual(rows[1].lines, NP);
  assert.deepEqual(rows[2].lines, ['2 set', 'ortalama 0', '0 kusursuz']);
  for (const r of rows.slice(3)) assert.deepEqual(r.lines, NP);
  assert.ok(!JSON.stringify(rows).includes('NaN'));
});
