import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  questionParam,
  parseQuestionParam,
  parseScoreParam,
  askUrl,
  askText,
  friendIntroText,
  compareFriendScore,
} from '../js/ask-link.js';

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

test('parseScoreParam and parseQuestionParam accept integer scores 0-100 and ignore others', () => {
  assert.equal(parseScoreParam('86'), 86);
  assert.equal(parseScoreParam('0'), 0);
  assert.equal(parseScoreParam('100'), 100);
  assert.deepEqual(parseQuestionParam('big-mac.2020-07', '86'), { productId: 'big-mac', date: '2020-07', score: 86 });
  assert.deepEqual(parseQuestionParam('big-mac.2020-07', '0'), { productId: 'big-mac', date: '2020-07', score: 0 });
  assert.deepEqual(parseQuestionParam('big-mac.2020-07', '100'), { productId: 'big-mac', date: '2020-07', score: 100 });

  for (const bad of ['101', '-3', 'abc', '8.5', '', null, undefined]) {
    assert.equal(parseScoreParam(bad), null, String(bad));
    assert.deepEqual(parseQuestionParam('big-mac.2020-07', bad), { productId: 'big-mac', date: '2020-07' });
  }
});

test('askUrl builds and encodes ?soru with or without a valid challenge score', () => {
  const q = { productId: 'big-mac', date: '2020-07' };
  const base = 'https://murtibad.github.io/ne-kadardi/';
  assert.equal(askUrl(q, base), 'https://murtibad.github.io/ne-kadardi/?soru=big-mac.2020-07');
  assert.equal(askUrl(q, base, 86), 'https://murtibad.github.io/ne-kadardi/?soru=big-mac.2020-07&p=86');
  assert.equal(askUrl(q, base, 0), 'https://murtibad.github.io/ne-kadardi/?soru=big-mac.2020-07&p=0');
  assert.equal(askUrl(q, base, 100), 'https://murtibad.github.io/ne-kadardi/?soru=big-mac.2020-07&p=100');
  assert.equal(askUrl(q, base, 101), 'https://murtibad.github.io/ne-kadardi/?soru=big-mac.2020-07');
});

test('askText includes period, title, and optional score without leaking price digits', () => {
  const text = askText('Temmuz 2020', 'Big Mac');
  assert.match(text, /Temmuz 2020/);
  assert.match(text, /Big Mac/);
  assert.deepEqual(text.match(/\d+/g), ['2020']);

  const withScore = askText('Temmuz 2020', 'Big Mac', 86);
  assert.match(withScore, /Ben 86 puan aldım, sen kaç alırsın\?/);
  assert.deepEqual(withScore.match(/\d+/g), ['2020', '86']);
});

test('friendIntroText and compareFriendScore format challenge prompts and outcomes', () => {
  assert.equal(friendIntroText(), 'Bir arkadaşın bu soruyu seninle paylaştı.');
  assert.equal(friendIntroText(86), 'Bir arkadaşın bu sorudan 86 puan aldı. Sen kaç alırsın?');

  assert.equal(compareFriendScore(86, 92), 'Arkadaşın: 86 puan · Sen: 92 puan — geçtin!');
  assert.equal(compareFriendScore(86, 86), 'Arkadaşın: 86 puan · Sen: 86 puan — berabere');
  assert.equal(compareFriendScore(86, 70), 'Arkadaşın: 86 puan · Sen: 70 puan — bu sefer o kazandı');
  assert.equal(compareFriendScore(null, 92), null);
});
