import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toItems, fromItems, applyToDraft, addItem, duplicateItem, removeItem, restoreItem, moveItem, makeMain, setKind, summary, filterItems, neighbor } from '../src/engine/greetings.js';

const mk = () => { let n = 0; return () => 'g' + ++n; };
const draft = () => ({ firstMessage: 'M', alternateGreetings: ['A', 'B', 'C'], groupOnlyGreetings: ['G1'] });
const texts = (items) => items.map((x) => x.kind[0] + ':' + x.text).join(' ');

test('목록 변환은 왕복해도 같다', () => {
  const items = toItems(draft(), mk());
  assert.equal(texts(items), 'm:M a:A a:B a:C g:G1');
  assert.deepEqual(fromItems(items), { firstMessage: 'M', alternateGreetings: ['A', 'B', 'C'], groupOnlyGreetings: ['G1'] });
});
test('그룹 전용 필드가 원래 없고 비어 있으면 만들지 않는다', () => {
  const d = { firstMessage: 'M', alternateGreetings: ['A'] };
  applyToDraft(d, toItems(d, mk()), false);
  assert.equal('groupOnlyGreetings' in d, false);
  const d2 = { firstMessage: 'M', alternateGreetings: [], groupOnlyGreetings: ['X'] };
  const it = toItems(d2, mk()).filter((x) => x.kind !== 'group');
  applyToDraft(d2, it, true);
  assert.deepEqual(d2.groupOnlyGreetings, []);
});
test('추가·복제·삭제·되돌리기', () => {
  const uid = mk();
  let items = toItems(draft(), uid);
  ({ items } = addItem(items, uid, 'alt', 'N'));
  assert.equal(texts(items), 'm:M a:A a:B a:C a:N g:G1');
  let r = duplicateItem(items, items[2].id, uid); // B 복제
  assert.equal(texts(r.items), 'm:M a:A a:B a:B a:C a:N g:G1');
  r = duplicateItem(items, items[0].id, uid); // 대표 복제 → 추가 맨 앞
  assert.equal(texts(r.items), 'm:M a:M a:A a:B a:C a:N g:G1');
  const del = removeItem(items, items[2].id);
  assert.equal(texts(del.items), 'm:M a:A a:C a:N g:G1');
  assert.equal(texts(restoreItem(del.items, del.removed, del.at)), 'm:M a:A a:B a:C a:N g:G1');
  assert.equal(removeItem(items, items[0].id).removed, null, '대표는 지울 수 없음');
});
test('순서 옮기기는 같은 종류 안에서만', () => {
  const items = toItems(draft(), mk());
  const [, a, b, c, g] = items;
  assert.equal(texts(moveItem(items, c.id, a.id, false)), 'm:M a:C a:A a:B g:G1');
  assert.equal(texts(moveItem(items, a.id, c.id, true)), 'm:M a:B a:C a:A g:G1');
  assert.equal(moveItem(items, a.id, g.id, false), items, '다른 종류 위는 무시');
  assert.equal(moveItem(items, items[0].id, a.id, false), items, '대표는 끌지 않음');
});
test('대표로 지정: 이전 대표는 추가 인사말이 된다', () => {
  const items = toItems(draft(), mk());
  const out = makeMain(items, items[2].id); // B
  assert.equal(out.filter((x) => x.kind === 'main').length, 1);
  assert.equal(fromItems(out).firstMessage, 'B');
  assert.deepEqual(fromItems(out).alternateGreetings.sort(), ['A', 'C', 'M']);
  assert.equal(makeMain(items, items[4].id), items, '그룹 전용은 대표가 될 수 없음');
});
test('종류 바꾸기·요약·검색·이웃', () => {
  const items = toItems(draft(), mk());
  assert.equal(texts(setKind(items, items[1].id, 'group')), 'm:M a:B a:C g:A g:G1');
  assert.equal(setKind(items, items[0].id, 'group'), items);
  assert.equal(summary('\n\n  안녕   하세요\n두번째'), '안녕 하세요');
  assert.equal(summary(''), '(비어 있음)');
  assert.equal(summary('가'.repeat(60)).length, 44);
  assert.equal(filterItems(items, 'b').length, 1);
  assert.equal(neighbor(items, items[0].id, -1), items[0].id);
  assert.equal(neighbor(items, items[4].id, 1), items[4].id);
  assert.equal(neighbor(items, items[1].id, 1), items[2].id);
});
