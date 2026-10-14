import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickYearRound, judgeYear, OPTION_COUNT, MIN_PRICE_GAP } from '../js/year-guess.js';

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const q = (productId, year, price) => ({ id: `${productId}@${year}`, productId, year, date: String(year), price });
const growing = [1, 2, 3, 4, 5, 6].flatMap((n) => [2015, 2017, 2019, 2021, 2023, 2025].map((y, i) => q(`p${n}`, y, n * 10 * 1.5 ** i)));
const short = [2015, 2020, 2025].map((y, i) => q('short', y, 5 * 2 ** i));
const flat = [2010, 2011, 2012, 2013, 2014].map((y) => q('flat', y, 15));
const all = [...growing, ...short, ...flat];

test('rounds have four sorted unique years of one product with clearly different prices', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const { question, options } = pickYearRound(all, seeded(seed));
    assert.equal(options.length, OPTION_COUNT);
    assert.equal(new Set(options).size, OPTION_COUNT);
    assert.deepEqual(options, [...options].sort((a, b) => a - b));
    assert.ok(options.includes(question.year));
    assert.ok(!['short', 'flat'].includes(question.productId));
    for (const y of options.filter((y) => y !== question.year)) {
      const other = all.find((x) => x.productId === question.productId && x.year === y);
      assert.ok(other, `year ${y} exists`);
      assert.ok(Math.max(other.price, question.price) / Math.min(other.price, question.price) >= MIN_PRICE_GAP);
    }
  }
});

test('recent ids are avoided when possible', () => {
  const recent = growing.slice(0, 30).map((x) => x.id);
  for (let seed = 1; seed <= 50; seed++) {
    assert.ok(!recent.includes(pickYearRound(all, seeded(seed), recent).question.id));
  }
});

test('returns null when no product qualifies', () => {
  assert.equal(pickYearRound([], seeded(1)), null);
  assert.equal(pickYearRound([...short, ...flat], seeded(1)), null);
});

test('a distractor year is skipped when any of its prices is close to the answer', () => {
  // 2019 has two prices; its second (18) is within 8% of the 2021 answer (19).
  const multi = [q('m', 2015, 5), { ...q('m', 2019, 12), id: 'm@2019-01' }, { ...q('m', 2019, 18), id: 'm@2019-12' },
    q('m', 2021, 19), q('m', 2023, 36), q('m', 2025, 85), q('m', 2026, 110)];
  for (let seed = 1; seed <= 100; seed++) {
    const round = pickYearRound(multi, seeded(seed));
    if (round.question.price === 19) assert.ok(!round.options.includes(2019), `seed ${seed}`);
  }
});

test('judgeYear reports correctness and distance', () => {
  const round = { question: q('p1', 2019, 10), options: [2015, 2017, 2019, 2021] };
  assert.deepEqual(judgeYear(round, 2019), { correct: true, answer: 2019, off: 0 });
  assert.deepEqual(judgeYear(round, 2015), { correct: false, answer: 2019, off: 4 });
});
