import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../js/version.js';

test('footer version matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(VERSION, pkg.version);
});

test('service worker cache version matches package.json', () => {
  // The cache name comes from this constant; if a release forgot it, players would keep
  // the old cached files until the browser happened to refetch them.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const match = sw.match(/^const VERSION = '([^']+)';$/m);
  assert.ok(match, 'sw.js must declare const VERSION = \'x.y.z\';');
  assert.equal(match[1], pkg.version);
});
