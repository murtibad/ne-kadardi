import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceName, sourceLinkText } from '../js/source-name.js';

test('maps frequent publishers explicitly', () => {
  const cases = {
    'https://bianet.org/x': 'Bianet',
    'https://www.tcmb.gov.tr/a': 'TCMB',
    'https://bildirim.epdk.gov.tr/b': 'EPDK',
    'https://www.csgb.gov.tr/c': 'ÇSGB',
    'https://csgb.gov.tr/c': 'ÇSGB',
    'https://www.resmigazete.gov.tr/eskiler/1.htm': 'Resmî Gazete',
    'https://www.hurriyet.com.tr/d': 'Hürriyet',
    'https://www.ntv.com.tr/e': 'NTV',
    'https://dokuman.osym.gov.tr/f': 'ÖSYM',
    'https://thedocs.worldbank.org/x.xlsx': 'Dünya Bankası',
    'https://uzmanpara.milliyet.com.tr/g': 'Milliyet'
  };
  for (const [url, name] of Object.entries(cases)) assert.equal(sourceName(url), name, url);
});

test('web.archive.org copies are named after the archived site', () => {
  assert.equal(sourceName('https://web.archive.org/web/20200810224020/https://boxofficeturkiye.com/yillik'), 'Box Office');
  assert.equal(sourceName('https://web.archive.org/web/2020/https://www.kgm.gov.tr/x'), 'KGM');
});

test('unknown hosts fall back to the capitalized label without www and TLD', () => {
  assert.equal(sourceName('https://www.ornekhaber.com.tr/a'), 'Ornekhaber');
  assert.equal(sourceName('https://foo.bar.example.org/a'), 'Example');
});

test('bad input gives an empty name', () => {
  assert.equal(sourceName(''), '');
  assert.equal(sourceName('not a url'), '');
  assert.equal(sourceName(undefined), '');
});

test('sourceLinkText adds the price year', () => {
  assert.equal(sourceLinkText({ url: 'https://bianet.org/x' }, '2022-08'), 'Bianet (2022)');
  assert.equal(sourceLinkText({ url: 'https://bianet.org/x' }, ''), 'Bianet');
  assert.equal(sourceLinkText({ url: 'nope' }, '2022-08'), '');
});

test('every source in prices.json gets a readable short name', () => {
  const data = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
  let n = 0;
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (o.source?.url) {
      const name = sourceName(o.source.url);
      assert.ok(name && name.length <= 13, `${o.source.url} -> "${name}"`);
      n++;
    }
    Object.values(o).forEach(walk);
  })(data);
  assert.ok(n > 100);
});
