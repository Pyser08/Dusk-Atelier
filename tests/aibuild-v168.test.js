// v1.6.8: 요청 용량 · 로어북 선택 · 부분 수정
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiBuild } from '../src/dev/aibuild/controller.js';
import { normalizeSettings } from '../src/dev/aibuild/store.js';
import { migrateInputSettings, checkInputSize, inputSize, DEFAULT_INPUT_CHARS, MAX_INPUT_CHARS, PROMPT_BYTES_LIMIT } from '../src/dev/aibuild/limits.js';
import { reconcileLoreSelection, compactLoreData, loreChanges, validLoreIncluded } from '../src/dev/aibuild/loreselect.js';
import { snapshot, restoreSnapshot, newSession, composeMessages, defaultPrompt, applyPacket } from '../src/dev/aibuild/core.js';

const memStorage = () => { const m = new Map(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k) }; };
const reply = (o) => ({ type: 'success', result: JSON.stringify(o) });
const lore = (n) => Array.from({ length: n }, (_, i) => ({ key: 'k' + i, content: '내용' + i, comment: '항목' + i, mode: 'normal', insertorder: 100 + i, alwaysActive: false, selective: false }));
function fixture(answer, n = 4) {
  let view = { chaId: 'c1', name: '히나', desc: 'd', personality: '', scenario: '', firstMessage: '안녕', defaultVariables: '', lorebook: lore(n), regex: [], trigger: [] };
  const calls = [];
  const api = { pluginStorage: memStorage(), runLLMModel: async (o) => { calls.push(o); return answer(o); } };
  const host = { getView: () => view, targetId: () => 'c1', assets: () => [], replaceView: (next) => { view = structuredClone(next); } };
  return { api, host, calls, get view() { return view; }, set view(v) { view = v; } };
}

test('한도: 기본 300만 자, 최대 1,000만 자, 32MiB. 옛 설정은 새 기본값 이상으로 올린다', () => {
  assert.equal(DEFAULT_INPUT_CHARS, 3e6); assert.equal(MAX_INPUT_CHARS, 1e7); assert.equal(PROMPT_BYTES_LIMIT, 32 * 1024 * 1024);
  assert.equal(normalizeSettings().maxInputChars, 3e6);
  assert.equal(normalizeSettings({ maxInputChars: 1e5 }).maxInputChars, 3e6); // 옛 값
  assert.equal(normalizeSettings({ maxInputChars: 5e6 }).maxInputChars, 5e6);
  const cur = normalizeSettings({ maxInputChars: 5e4, inputLimitVersion: 2 }); // 새 버전에서 직접 낮춘 값은 유지
  assert.equal(cur.maxInputChars, 5e4);
  assert.equal(normalizeSettings(cur).maxInputChars, 5e4);
  assert.equal(normalizeSettings({ maxInputChars: 2e7, inputLimitVersion: 2 }).maxInputChars, 3e6); // 범위 밖
  assert.deepEqual(migrateInputSettings({}), { maxInputChars: 3e6, inputLimitVersion: 2 });
});
test('한도 검사: 글자·바이트로만 재고 자르지 않는다', () => {
  const msgs = [{ role: 'user', content: '가'.repeat(1000) }];
  assert.deepEqual(inputSize(msgs), { chars: 1000, bytes: 3000 });
  assert.throws(() => checkInputSize(msgs, 999), /한도/);
  assert.equal(checkInputSize(msgs, 1000).chars, 1000);
  assert.equal(msgs[0].content.length, 1000);
  // 글자 한도 안이어도 바이트(32MiB)가 넘으면 막는다 — 한글 1,200만 자 = 3,600만 바이트
  assert.throws(() => checkInputSize([{ role: 'user', content: '가'.repeat(12e6) }], 1e9), /32MiB/);
  assert.equal(checkInputSize([{ role: 'user', content: '가'.repeat(MAX_INPUT_CHARS) }], MAX_INPUT_CHARS).chars, MAX_INPUT_CHARS);
});

test('로어북 선택: 제외한 항목은 요청에 실리지 않고, 선택은 편집·저장본에서 유지된다', async () => {
  const f = fixture(() => reply({ schemaVersion: 1, task: 'description', data: { text: 'x' } }));
  const b = createAiBuild({ api: f.api, host: f.host }); await b.init();
  assert.equal(b.loreList().length, 4); assert.ok(b.loreList().every((x) => x.included));
  b.setLoreIncluded(1, false);
  assert.deepEqual(b.loreList().map((x) => x.included), [true, false, true, true]);
  const msg = JSON.stringify(b.previewRequest('lorebook').messages);
  assert.ok(msg.includes('항목0') && !msg.includes('항목1') && msg.includes('항목2'));
  assert.ok(msg.includes('"ref":\\"l2\\"') || msg.includes('l2')); // 번호는 원고 기준 그대로
  b.setAllLore(false); assert.ok(b.loreList().every((x) => !x.included));
  assert.ok(!JSON.stringify(b.previewRequest('lorebook').messages).includes('항목0'));
  b.setAllLore(true); b.setLoreIncluded(3, false);
  // 앞에 항목이 새로 생겨도 선택이 항목을 따라간다
  f.view = { ...f.view, lorebook: [{ key: 'n', content: 'n', comment: '새' }, ...f.view.lorebook] };
  assert.deepEqual(b.loreList().map((x) => x.included), [true, true, true, true, false]);
  // 저장본 왕복
  const snap = snapshot(b.state.s);
  assert.deepEqual(restoreSnapshot(snap).loreIncluded, [true, true, true, true, false]);
  const broken = structuredClone(snap); broken.session.loreIncluded = [true, 'x'];
  assert.deepEqual(restoreSnapshot(broken).loreIncluded, Array(5).fill(true));
  assert.throws(() => b.setLoreIncluded(9, false), /없는/);
});
test('선택을 바꾸면 대기 수정안은 맥락이 바뀐 것으로 본다 (promptRevision)', async () => {
  const f = fixture(() => reply({ schemaVersion: 1, task: 'description', data: { text: 'B' } }));
  const b = createAiBuild({ api: f.api, host: f.host }); await b.init();
  b.setTask('description'); b.setRequest('description', 'r'); await b.sendRequest();
  assert.equal(b.pendingCount(), 1);
  b.setLoreIncluded(0, false);
  assert.equal(b.pendingCount(), 0);
});
test('요청에서 뺀 로어북 항목을 AI가 바꾸면 결과를 버린다', async () => {
  const f = fixture(() => reply({ schemaVersion: 1, task: 'lorebook', data: { upsert: [{ ref: 'l1', entry: { content: '바꿈' } }], remove: [] } }));
  const b = createAiBuild({ api: f.api, host: f.host }); await b.init();
  b.setLoreIncluded(1, false);
  b.setTask('lorebook'); b.setRequest('lorebook', 'r'); await b.setLoreMode('plain'); await b.sendRequest();
  assert.equal(b.state.s.candidates.length, 0);
  assert.match(b.state.s.thread.at(-1).content, /포함하지 않은/);
});

test('부분 수정: 바뀐 항목·필드만 남기고 나머지는 보존한다', async () => {
  const L = lore(3);
  const data = { upsert: [{ ref: 'l0', entry: { content: '내용0', comment: '항목0' } }, { ref: 'l1', entry: { content: '새 내용', comment: '항목1', insertorder: 101 } }, { ref: null, entry: { key: 'z', content: 'zz' } }], remove: ['l2'] };
  const c = compactLoreData(data, L);
  assert.equal(c.upsert.length, 2); // l0은 바뀐 게 없어 빠짐
  assert.deepEqual(c.upsert[0], { ref: 'l1', entry: { content: '새 내용' } });
  assert.deepEqual(c.remove, ['l2']);
  const ch = loreChanges({ task: 'lorebook', data: c }, L);
  assert.deepEqual(ch.map((x) => [x.kind, x.name, x.fields.join()]), [['edit', '항목1', 'content'], ['new', 'z', 'key,content'], ['remove', '항목2', '']]);
  // 실제 흐름: l0은 그대로, l1은 content만 바뀌고 나머지 필드·항목은 보존
  const f = fixture(() => reply({ schemaVersion: 1, task: 'lorebook', data }));
  const L0 = structuredClone(f.view.lorebook);
  const b = createAiBuild({ api: f.api, host: f.host }); await b.init();
  b.setTask('lorebook'); b.setRequest('lorebook', 'r'); await b.setLoreMode('plain'); await b.sendRequest();
  const cand = b.state.s.candidates[0];
  assert.deepEqual(cand.packet.data.upsert.map((x) => x.ref), ['l1', null]);
  b.applyCandidate(cand);
  const out = f.view.lorebook;
  assert.deepEqual(out.map((e) => e.comment), ['항목0', '항목1', '항목3', '']); // l2만 삭제, 새 항목은 끝에
  assert.deepEqual(out[0], L0[0]); assert.deepEqual(out[2], L0[3]); // 건드리지 않은 항목은 그대로
  assert.deepEqual(out[1], { ...L0[1], content: '새 내용' }); // 바뀐 필드만 달라짐
});
test('프롬프트 계약: 바뀐 필드만 쓰라는 지침이 들어 있다', () => {
  assert.match(JSON.stringify(composeMessages(newSession(), 'lorebook', 'x', defaultPrompt('lorebook'))), /바뀌는 필드만/);
});
test('reconcileLoreSelection: id·내용·자리 순으로 따라간다', () => {
  assert.deepEqual(reconcileLoreSelection([{ id: 'a' }, { id: 'b' }], [true, false], [{ id: 'b' }, { id: 'c' }, { id: 'a' }]), [false, true, true]);
  assert.deepEqual(reconcileLoreSelection([{ key: 'a', content: '1' }, { key: 'b', content: '2' }], [false, true], [{ key: 'a', content: '1 고침' }, { key: 'b', content: '2' }]), [false, true]);
  assert.deepEqual(validLoreIncluded(undefined, 2), [true, true]);
});
