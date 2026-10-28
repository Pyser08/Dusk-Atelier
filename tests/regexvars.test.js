import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segments, describeMatch, summarize } from '../src/engine/regexview.js';
import { parseVars, serializeVars, duplicateKeys } from '../src/engine/vars.js';

test('일치 위치로 글 자르기', () => {
  const m = [{ start: 2, end: 4, text: 'cd', groups: ['c'] }, { start: 6, end: 7, text: 'g', groups: [] }];
  assert.deepEqual(segments('abcdefgh', m), [{ text: 'ab', hit: null }, { text: 'cd', hit: 0 }, { text: 'ef', hit: null }, { text: 'g', hit: 1 }, { text: 'h', hit: null }]);
  assert.deepEqual(segments('abc', []), [{ text: 'abc', hit: null }]);
  assert.deepEqual(segments('', []), []);
});
test('빈 일치는 강조하지 않고 겹침은 건너뜀', () => {
  assert.deepEqual(segments('abc', [{ start: 1, end: 1, text: '', groups: [] }]), [{ text: 'abc', hit: null }]);
  const segs = segments('abcdef', [{ start: 0, end: 3, text: 'abc', groups: [] }, { start: 2, end: 4, text: 'cd', groups: [] }]);
  assert.equal(segs.map((s) => s.text).join(''), 'abcdef');
});
test('일치 설명·요약', () => {
  const m = { start: 3, end: 6, text: '안녕\n', groups: ['안', null] };
  assert.equal(describeMatch(m, 0), '#1  3–6  「안녕↵」  ·  $1=「안」  ·  $2=(없음)');
  const s = summarize(Array.from({ length: 25 }, (_, i) => ({ start: i, end: i + 1, text: 'x', groups: [] })));
  assert.equal(s.count, 25); assert.equal(s.lines.length, 20); assert.equal(s.more, 5);
});
test('변수 읽기·쓰기 왕복', () => {
  const t = 'hp=10\nname=히나\n메모 줄\nurl=a=b\n\n';
  const rows = parseVars(t);
  assert.deepEqual(rows, [{ k: 'hp', v: '10' }, { k: 'name', v: '히나' }, { k: '메모 줄', v: null }, { k: 'url', v: 'a=b' }]);
  assert.equal(serializeVars(rows), 'hp=10\nname=히나\n메모 줄\nurl=a=b');
  assert.equal(serializeVars([]), '');
  assert.equal(serializeVars([{ k: '', v: '' }, { k: 'a', v: '' }]), 'a=');
});
test('중복 변수 이름', () => {
  assert.deepEqual([...duplicateKeys(parseVars('a=1\nb=2\na=3\n메모'))], ['a']);
});
