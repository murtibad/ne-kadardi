import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contextComment,
  hintComment,
  yearAnchor,
  ytlNote,
  stampTitle,
  OVER_COMMENTS,
  UNDER_COMMENTS,
  PRODUCT_POOLS,
  HINT_LINES,
} from '../js/banter.js';

test('every pool line is a non-empty string, <= 90 characters, and contains no digits', () => {
  const allPools = [
    ...Object.values(PRODUCT_POOLS),
    OVER_COMMENTS,
    UNDER_COMMENTS,
    HINT_LINES,
  ];

  for (const pool of allPools) {
    assert.ok(Array.isArray(pool));
    for (const line of pool) {
      assert.equal(typeof line, 'string');
      assert.ok(line.trim().length > 0, 'line must be non-empty');
      assert.ok(line.length <= 90, `line exceeds 90 chars (${line.length}): "${line}"`);
      assert.ok(!/\d/.test(line), `line must not contain any digits: "${line}"`);
    }
  }
});

test('pools meet required minimum sizes', () => {
  assert.ok(OVER_COMMENTS.length >= 4, 'OVER_COMMENTS should have >= 4 lines');
  assert.ok(UNDER_COMMENTS.length >= 4, 'UNDER_COMMENTS should have >= 4 lines');
  assert.ok(HINT_LINES.length >= 5, 'HINT_LINES should have >= 5 lines');


  const requiredProductIds = [
    'plastik-poset',
    'ekmek',
    'sigara-marlboro',
    'benzin',
    'motorin',
    'big-mac',
    'dolar',
    'euro',
    'gram-altin',
    'ceyrek-altin',
    'iphone',
    'asgari-ucret',
    'kopru',
    'taksi-acilis',
    'trafik-cezasi',
    'spotify',
    'netflix',
    'playstation',
    'pasaport-harci',
    'schengen-vize',
  ];

  for (const id of requiredProductIds) {
    const pool = PRODUCT_POOLS[id];
    assert.ok(Array.isArray(pool), `PRODUCT_POOLS should have pool for "${id}"`);
    assert.ok(pool.length >= 3, `product pool for "${id}" must have >= 3 lines`);
  }
});

test('contextComment threshold checks (factor 2.4 vs 2.5)', () => {
  // factor 2.4 is below the 2.5 threshold: over and under return null
  assert.equal(contextComment({ direction: 'over', factor: 2.4 }, () => 0.5), null);
  assert.equal(contextComment({ direction: 'under', factor: 2.4 }, () => 0.5), null);

  // factor 2.5 meets the threshold: returns lines from over and under pools
  const overLine = contextComment({ direction: 'over', factor: 2.5 }, () => 0.5);
  assert.ok(OVER_COMMENTS.includes(overLine));

  const underLine = contextComment({ direction: 'under', factor: 2.5 }, () => 0.5);
  assert.ok(UNDER_COMMENTS.includes(underLine));

  // exact direction returns null
  assert.equal(contextComment({ direction: 'exact', factor: 3 }, () => 0.5), null);

  // safe defaults for empty or missing argument
  assert.equal(contextComment(), null);
  assert.equal(contextComment(null), null);
});

test('contextComment product pool easter egg and rng behavior', () => {
  // When rng() < 0.45, selects from product pool
  const productLine = contextComment({ productId: 'ekmek', direction: 'over', factor: 3 }, () => 0.1);
  assert.ok(PRODUCT_POOLS.ekmek.includes(productLine));

  // When rng() >= 0.45, skips product pool and falls back to over/under pool
  const fallbackLine = contextComment({ productId: 'ekmek', direction: 'over', factor: 3 }, () => 0.5);
  assert.ok(OVER_COMMENTS.includes(fallbackLine));

  // When product pool does not exist, goes straight to over/under pool
  const unknownProdLine = contextComment({ productId: 'bilinmeyen-urun', direction: 'under', factor: 3 }, () => 0.1);
  assert.ok(UNDER_COMMENTS.includes(unknownProdLine));
});

test('contextComment deterministic rng checks', () => {
  const fixedRng = () => 0.2;
  const line1 = contextComment({ productId: 'dolar', direction: 'over', factor: 3 }, fixedRng);
  const line2 = contextComment({ productId: 'dolar', direction: 'over', factor: 3 }, fixedRng);
  assert.equal(line1, line2);

  const fixedRngHigh = () => 0.7;
  const over1 = contextComment({ direction: 'over', factor: 4 }, fixedRngHigh);
  const over2 = contextComment({ direction: 'over', factor: 4 }, fixedRngHigh);
  assert.equal(over1, over2);
});

test('hintComment returns line from HINT_LINES and is deterministic', () => {
  assert.ok(HINT_LINES.length >= 5);

  const fixedRng = () => 0.33;
  const comment1 = hintComment(fixedRng);
  const comment2 = hintComment(fixedRng);
  assert.equal(comment1, comment2);
  assert.ok(HINT_LINES.includes(comment1));

  const lineStart = hintComment(() => 0);
  const lineEnd = hintComment(() => 0.999);
  assert.ok(typeof lineStart === 'string' && lineStart.length > 0);
  assert.ok(typeof lineEnd === 'string' && lineEnd.length > 0);
});

test('yearAnchor returns verified time capsules and null for 2019 / unverified years', () => {
  // Verified years
  assert.equal(yearAnchor(2015), null);
  assert.ok(typeof yearAnchor(2016) === 'string' && yearAnchor(2016).includes('Pokémon'));
  assert.ok(typeof yearAnchor(2020) === 'string' && yearAnchor(2020).includes('ekmek'));
  assert.ok(typeof yearAnchor(2023) === 'string' && yearAnchor(2023).includes('Cumhuriyet'));

  // Numeric strings are handled
  assert.equal(yearAnchor('2016'), yearAnchor(2016));

  // Explicitly required check: null for 2019
  assert.equal(yearAnchor(2019), null);

  // Other unverified years or invalid inputs return null
  assert.equal(yearAnchor(2010), null);
  assert.equal(yearAnchor(2014), null);
  assert.equal(yearAnchor(2022), null);
  assert.equal(yearAnchor(2024), null);
  assert.equal(yearAnchor(null), null);
  assert.equal(yearAnchor(undefined), null);
  assert.equal(yearAnchor('bilinmeyen'), null);
});

test('ytlNote exact string for known input and null outside range', () => {
  // Known input check
  assert.equal(
    ytlNote(2005, 4.5),
    'Yeni Türk Lirası dönemi: eski parayla 4.500.000 lira'
  );

  // Supported range 2005..2008
  assert.equal(
    ytlNote(2006, 2.5),
    'Yeni Türk Lirası dönemi: eski parayla 2.500.000 lira'
  );
  assert.equal(
    ytlNote(2007, 1),
    'Yeni Türk Lirası dönemi: eski parayla 1.000.000 lira'
  );
  assert.equal(
    ytlNote(2008, 1),
    'Yeni Türk Lirası dönemi: eski parayla 1.000.000 lira'
  );

  // Rounding price * 1e6 to an integer
  assert.equal(
    ytlNote(2005, 1.2345678),
    'Yeni Türk Lirası dönemi: eski parayla 1.234.568 lira'
  );

  // Null outside 2005-2008
  assert.equal(ytlNote(2004, 4.5), null);
  assert.equal(ytlNote(2009, 4.5), null);
  assert.equal(ytlNote(2010, 4.5), null);
  assert.equal(ytlNote(2020, 4.5), null);

  // Null for non-finite or non-positive price
  assert.equal(ytlNote(2005, 0), null);
  assert.equal(ytlNote(2005, -1), null);
  assert.equal(ytlNote(2005, NaN), null);
  assert.equal(ytlNote(2005, Infinity), null);
  assert.equal(ytlNote(2005, -Infinity), null);
  assert.equal(ytlNote(2005, null), null);
  assert.equal(ytlNote(2005, undefined), null);
  assert.equal(ytlNote(2005, '4.5'), null);
});

test('stampTitle boundaries (49/50/74/75/89/90), clamping, and non-finite values', () => {
  // Exact boundaries
  assert.equal(stampTitle(100), 'TAM İSABET');
  assert.equal(stampTitle(90), 'TAM İSABET');

  assert.equal(stampTitle(89), 'ÇOK YAKIN');
  assert.equal(stampTitle(75), 'ÇOK YAKIN');

  assert.equal(stampTitle(74), 'FENA DEĞİL');
  assert.equal(stampTitle(50), 'FENA DEĞİL');

  assert.equal(stampTitle(49), 'BİRAZ UZAK');
  assert.equal(stampTitle(20), 'BİRAZ UZAK');
  assert.equal(stampTitle(19), 'ÇOK UZAK');
  assert.equal(stampTitle(0), 'ÇOK UZAK');

  // Clamping out-of-range values
  assert.equal(stampTitle(-15), 'ÇOK UZAK');
  assert.equal(stampTitle(120), 'TAM İSABET');

  // Non-finite or invalid types return null
  assert.equal(stampTitle(NaN), null);
  assert.equal(stampTitle(Infinity), null);
  assert.equal(stampTitle(-Infinity), null);
  assert.equal(stampTitle(null), null);
  assert.equal(stampTitle(undefined), null);
  assert.equal(stampTitle('80'), null);
});

test('far-off guesses on amounts use amount lines, not price lines', async () => {
  const { contextComment, AMOUNT_OVER_COMMENTS, AMOUNT_UNDER_COMMENTS } = await import('../js/banter.js');
  assert.ok(AMOUNT_OVER_COMMENTS.includes(contextComment({ direction: 'over', factor: 9, amount: true }, () => 0)));
  assert.ok(AMOUNT_UNDER_COMMENTS.includes(contextComment({ direction: 'under', factor: 9, amount: true }, () => 0)));
});

test('every product with prices has its own four receipt lines', async () => {
  const { readFileSync } = await import('node:fs');
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  for (const p of data.products) {
    if (!p.prices.some((e) => e.price != null)) continue;
    const pool = PRODUCT_POOLS[p.id];
    assert.ok(pool, `add PRODUCT_POOLS['${p.id}'] in js/banter.js`);
    assert.equal(pool.length, 4, `${p.id} should have four lines`);
    for (const line of pool) assert.ok(line.length <= 66 && !/\d/.test(line), `${p.id}: short, no digits: ${line}`);
  }
});
