// v1.6.8: 로어북 부분 다시 쓰기 · 고칠 부분 동기화 · 한 번 그리는 동안 읽기 한 번
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiBuild } from '../src/dev/aibuild/controller.js';
import { partMessages, cleanPart, CTX_CHARS } from '../src/dev/aibuild/partrewrite.js';
import { pickFix, getFix, setFixText, locate, replaceIn, clearFix, onFix } from '../src/ui/aifix.js';

const memStorage = () => { const m = new Map(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k) }; };
const mkTa = (v) => ({ isConnected: true, value: v, events: 0, setRangeText(t, s, e) { this.value = this.value.slice(0, s) + t + this.value.slice(e); }, dispatchEvent() { this.events++; } });

test('요청: 고칠 부분·앞뒤 맥락(길이 제한)·요청이 들어가고 항목 전체를 싣지 않는다', () => {
  const m = partMessages({ text: '검을 뽑았다', request: '더 긴장감 있게', label: '전투', before: 'A'.repeat(5000), after: '뒤 글' });
  assert.equal(m[0].role, 'system'); assert.equal(m[1].role, 'user');
  const u = m[1].content;
  assert.ok(u.includes('[항목] 전투') && u.includes('<<<\n검을 뽑았다\n>>>') && u.includes('[요청]\n더 긴장감 있게') && u.includes('뒤 글'));
  assert.ok(u.length < CTX_CHARS * 2 + 400);
  assert.ok(!partMessages({ text: 't', request: 'r' })[1].content.includes('맥락'));
});
test('응답 정리: 태그 → 코드 펜스 → 통째, 앞뒤 공백은 원래 글을 따른다', () => {
  assert.equal(cleanPart('설명\n<rewrite>새 글</rewrite>\n끝'), '새 글');
  assert.equal(cleanPart('<rewrite>잘린 글'), '잘린 글');
  assert.equal(cleanPart('```\n펜스 글\n```'), '펜스 글');
  assert.equal(cleanPart('  그냥 글  \n'), '그냥 글');
  assert.equal(cleanPart('<rewrite> 새 </rewrite>', '\n원래 글\n'), '\n새\n');
  assert.equal(cleanPart('   '), '');
});
test('고칠 부분: 글칸에서 고르면 상자가 바뀌고, 상자를 고치면 글칸이 바뀐다(같은 선택은 알림 없음)', () => {
  clearFix();
  const ta = mkTa('앞 문장. 고칠 문장. 뒤 문장.');
  let n = 0; const off = onFix(() => n++);
  pickFix({ ta, label: '항목', s: 6, e: 11 });
  assert.equal(getFix().text, '고칠 문장'); assert.equal(n, 1);
  pickFix({ ta, label: '항목', s: 6, e: 11 }); assert.equal(n, 1); // 같은 선택
  pickFix({ ta, label: '항목', s: 3, e: 3 }); assert.equal(getFix().text, '고칠 문장'); // 빈 선택은 무시(대상 유지)
  assert.ok(setFixText('새 문장입니다'));
  assert.equal(ta.value, '앞 문장. 새 문장입니다. 뒤 문장.'); assert.ok(ta.events >= 1);
  assert.equal(getFix().text, '새 문장입니다'); assert.deepEqual(locate(getFix()), { s: 6, e: 13 });
  assert.ok(setFixText('')); assert.equal(ta.value, '앞 문장. . 뒤 문장.');
  off(); clearFix();
});
test('자리 찾기: 앞이 바뀌어 밀려도 한 번만 나오면 따라가고, 겹치면 끊긴다', () => {
  const ta = mkTa('AAA 목표 BBB');
  const r = { ta, s: 4, e: 6, text: '목표' };
  ta.value = '앞에 글이 늘었다 AAA 목표 BBB';
  assert.deepEqual(locate(r), { s: ta.value.indexOf('목표'), e: ta.value.indexOf('목표') + 2 });
  assert.ok(replaceIn(r, '결과')); assert.equal(ta.value, '앞에 글이 늘었다 AAA 결과 BBB');
  ta.value = '목표 목표'; assert.deepEqual(locate({ ta, s: 3, e: 5, text: '목표' }), { s: 3, e: 5 }); // 기록한 자리가 맞으면 그대로
  assert.equal(locate({ ta, s: 9, e: 11, text: '목표' }), null); // 두 곳이라 어디인지 모름
  ta.isConnected = false; assert.equal(locate(r), null); assert.equal(replaceIn(r, 'x'), false);
});
test('컨트롤러: 부분 다시 쓰기는 작은 요청 한 번, 결과 글만 돌려주고 진행 중엔 막는다', async () => {
  const calls = [];
  const view = { chaId: 'c1', name: '히나', desc: 'd', personality: '', scenario: '', firstMessage: '안녕', defaultVariables: '', lorebook: [], regex: [], trigger: [] };
  const api = { pluginStorage: memStorage(), runLLMModel: async (o) => { calls.push(o); return { type: 'success', result: '<rewrite>다듬은 글</rewrite>' }; } };
  const b = createAiBuild({ api, host: { getView: () => view, targetId: () => 'c1', assets: () => [], replaceView() {} } }); await b.init();
  await assert.rejects(b.rewritePart({ text: '', request: 'x' }), /고칠 부분/);
  await assert.rejects(b.rewritePart({ text: 't', request: ' ' }), /어떻게/);
  const p = b.rewritePart({ text: '원래 글', request: '다듬기', label: '항목' });
  await assert.rejects(b.rewritePart({ text: 't', request: 'r' }), /진행 중/);
  assert.equal(await p, '다듬은 글'); assert.equal(calls.length, 1); assert.equal(b.state.job, null);
  assert.ok(calls[0].messages[1].content.includes('원래 글'));
});
test('컨트롤러: batch 안에서는 작업본 읽기를 한 번만 하고 밖에서는 매번 읽는다', async () => {
  let reads = 0;
  const view = { chaId: 'c1', name: '히나', desc: 'd', personality: '', scenario: '', firstMessage: '', defaultVariables: '', lorebook: [], regex: [], trigger: [] };
  const b = createAiBuild({ api: { pluginStorage: memStorage(), runLLMModel: async () => ({ type: 'success', result: '' }) }, host: { getView: () => { reads++; return view; }, targetId: () => 'c1', assets: () => [], replaceView() {} } });
  await b.init(); reads = 0;
  b.batch(() => { b.sync(); b.sync(); b.loreMode(); b.loreList(); });
  assert.equal(reads, 1);
  b.sync(); b.sync(); assert.equal(reads, 3);
});
