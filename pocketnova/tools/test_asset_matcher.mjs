import assert from 'node:assert/strict';
import { normalizeName, levenshtein, bestWindowSimilarity, findBestOcrMatch } from '../js/asset-matcher.js';

assert.equal(normalizeName(' 포케 도감 '), '포케도감');
assert.equal(levenshtein('로토무', '로토무'), 0);
assert.equal(levenshtein('로토무', '로도무'), 1);
assert.equal(bestWindowSimilarity('로토무', '123 로 토 무 456'), 1);

const rows = [
  { id:'a', img:'assets/a.webp', text:'상단 제목 로 토 무 카드 본문' },
  { id:'b', img:'assets/b.webp', text:'다른 카드 본문' },
];
const exact = findBestOcrMatch('로토무', rows, {});
assert.equal(exact?.id, 'a');
assert.equal(exact?.exact, true);

const fuzzyRows = [
  { id:'a', img:'assets/a.webp', text:'제목 피카츄우 능력' },
  { id:'b', img:'assets/b.webp', text:'제목 고라파덕 능력' },
];
const fuzzy = findBestOcrMatch('피카츄', fuzzyRows, {});
assert.equal(fuzzy?.id, 'a');
assert.ok(fuzzy.score >= 0.8);

// Two exact winners are intentionally ambiguous.
assert.equal(findBestOcrMatch('로토무', [
  { id:'a', img:'a', text:'로토무' },
  { id:'b', img:'b', text:'로토무' },
], {}), null);

// Short names must not be fuzzy-guessed from arbitrary text.
assert.equal(findBestOcrMatch('뮤츠', [
  { id:'a', img:'a', text:'뮤트' },
  { id:'b', img:'b', text:'다른글' },
], {}), null);

// Aliases are allowed, but still need a unique winner.
const alias = findBestOcrMatch('찌리리공', [
  { id:'a', img:'assets/a.webp', text:'피리리공 카드' },
  { id:'b', img:'assets/b.webp', text:'꼬부기 카드' },
], { '찌리리공':['피리리공'] });
assert.equal(alias?.id, 'a');
assert.equal(alias?.exact, true);

console.log('PASS: asset-matcher regression tests');
