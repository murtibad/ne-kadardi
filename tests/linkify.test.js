import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkifyNote } from '../js/linkify.js';

test('plain text is escaped and returned as is', () => {
  assert.equal(linkifyNote('a < b & "c"'), 'a &lt; b &amp; &quot;c&quot;');
});

test('a URL becomes a link button with the host', () => {
  const html = linkifyNote('İkinci kaynak: https://www.milliyet.com.tr/galeri/x');
  assert.match(html, /<a class="note-link" href="https:\/\/www\.milliyet\.com\.tr\/galeri\/x" target="_blank" rel="noopener">Link · milliyet\.com\.tr ↗<\/a>/);
  assert.ok(html.startsWith('İkinci kaynak: '));
});

test('trailing punctuation stays outside the link', () => {
  const html = linkifyNote('Bkz https://a.com/x.');
  assert.match(html, /href="https:\/\/a\.com\/x"/);
  assert.ok(html.endsWith('</a>.'));
});

test('several URLs and ampersands in the query are handled', () => {
  const html = linkifyNote('1) http://a.com/?x=1&y=2 2) https://b.org/p');
  assert.equal((html.match(/<a /g) || []).length, 2);
  assert.match(html, /href="http:\/\/a\.com\/\?x=1&amp;y=2"/);
});

test('javascript: and other schemes are not linked', () => {
  assert.equal(linkifyNote('javascript:alert(1)'), 'javascript:alert(1)');
});
