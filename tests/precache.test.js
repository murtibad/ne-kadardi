import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

// Run sw.js in a sandbox with a stub `self` and read its top-level PRECACHE constant.
function loadPrecache() {
  const ctx = vm.createContext({ self: { addEventListener() {}, location: { origin: 'https://x' } } });
  vm.runInContext(readFileSync(new URL('sw.js', root), 'utf8'), ctx);
  return vm.runInContext('PRECACHE', ctx);
}

const precache = loadPrecache();
const files = precache.filter(p => p !== './');

test('precache list has no duplicates', () => {
  assert.equal(new Set(precache).size, precache.length);
});

test('every precached file exists', () => {
  for (const path of files) {
    assert.ok(existsSync(new URL(path, root)), `missing precached file: ${path}`);
  }
});

test('every js module is precached (lazy imports too)', () => {
  for (const name of readdirSync(new URL('js/', root)).filter(n => n.endsWith('.js'))) {
    assert.ok(precache.includes(`js/${name}`), `add js/${name} to PRECACHE in sw.js`);
  }
});

test('every image is precached', () => {
  for (const name of readdirSync(new URL('img/', root))) {
    assert.ok(precache.includes(`img/${name}`), `add img/${name} to PRECACHE in sw.js`);
  }
});

test('every sound is precached', () => {
  for (const name of readdirSync(new URL('sounds/', root))) {
    assert.ok(precache.includes(`sounds/${name}`), `add sounds/${name} to PRECACHE in sw.js`);
  }
});

test('app shell and data are precached', () => {
  for (const path of ['./', 'index.html', 'css/style.css', 'data/prices.json', 'manifest.webmanifest']) {
    assert.ok(precache.includes(path), `${path} must be precached`);
  }
});

test('local files referenced by index.html and the manifest are precached', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map(m => m[1]);
  const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', root), 'utf8'));
  refs.push(...manifest.icons.map(icon => icon.src));
  assert.ok(refs.length > 3);
  for (const ref of refs) assert.ok(precache.includes(ref), `add ${ref} to PRECACHE in sw.js`);
});

test('product images in the data are precached', () => {
  const data = JSON.parse(readFileSync(new URL('data/prices.json', root), 'utf8'));
  const srcs = new Set();
  for (const product of data.products) {
    if (product.image?.src) srcs.add(product.image.src);
    for (const entry of product.prices ?? []) if (entry.image?.src) srcs.add(entry.image.src);
  }
  assert.ok(srcs.size > 0);
  for (const src of srcs) assert.ok(precache.includes(src), `add ${src} to PRECACHE in sw.js`);
});
