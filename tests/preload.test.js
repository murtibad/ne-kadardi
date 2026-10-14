import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// Static imports reachable from main.js. Dynamic import() is skipped on purpose:
// those modules load on demand and must not be preloaded.
function staticGraph(entry) {
  const seen = new Set();
  const visit = (path) => {
    for (const [, spec] of read(path).matchAll(/^import\s[^;]*?from\s+'(\.\/[^']+)'/gm)) {
      const dep = `js/${spec.slice(2)}`;
      if (!seen.has(dep)) { seen.add(dep); visit(dep); }
    }
  };
  visit(entry);
  return seen;
}

test('index.html modulepreloads exactly the static imports of main.js', () => {
  const html = read('index.html');
  const preloaded = new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]));
  assert.deepEqual([...preloaded].sort(), [...staticGraph('js/main.js')].sort());
});

test('index.html preloads the price data that main.js fetches', () => {
  const html = read('index.html');
  const url = read('js/main.js').match(/const DATA_URL = '([^']+)'/)[1];
  assert.match(html, new RegExp(`<link rel="preload" href="${url}" as="fetch" crossorigin>`));
});
