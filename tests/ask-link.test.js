import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questionParam, parseQuestionParam, askUrl, askText } from '../js/ask-link.js';

test('questionParam and parseQuestionParam round-trip YYYY, YYYY-MM and YYYY-MM-DD', () => {
  for (const date of ['2020', '2020-07', '2020-07-15']) {
    const q = { productId: 'big-mac', date };
    assert.deepEqual(parseQuestionParam(questionParam(q)), q);
  }
});

test('parseQuestionParam rejects malformed values', () => {
  for (const bad of [null, undefined, '', 'x', 'big-mac.20', 'Big-Mac.2020', 'big_mac.2020', '.2020', 'big-mac.']) {
    assert.equal(parseQuestionParam(bad), null, String(bad));
  }
});

test('askUrl builds and encodes the ?soru query parameter', () => {
  const url = askUrl({ productId: 'big-mac', date: '2020-07' }, 'https://murtibad.github.io/ne-kadardi/');
  assert.equal(url, 'https://murtibad.github.io/ne-kadardi/?soru=big-mac.2020-07');
});

test('askText includes period and title and leaks no price digits', () => {
  const text = askText('Temmuz 2020', 'Big Mac');
  assert.match(text, /Temmuz 2020/);
  assert.match(text, /Big Mac/);
  assert.deepEqual(text.match(/\d+/g), ['2020']);
});
