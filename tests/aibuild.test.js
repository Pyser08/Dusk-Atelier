// v1.6.7 1~2단계: 봇빌더 엔진 이식 + 편집기 작업본 직접 연결(실시간 반영 다리)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiBuild } from '../src/dev/aibuild/controller.js';
import { createAiStore } from '../src/dev/aibuild/store.js';
import { toDraft, toView } from '../src/dev/aibuild/bridge.js';
import { regexTest } from '../src/dev/aibuild/regextest.js';
import { newPresetState, assemblePreset } from '../src/dev/aibuild/preset-engine.js';
import { TASKS, composeMessages, defaultPrompt, snapshot, restoreSnapshot, newSession } from '../src/dev/aibuild/core.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k), _m: m };
};
const reply = (obj) => ({ type: 'success', result: JSON.stringify(obj) });
function fixture(answer) {
  let view = { chaId: 'c1', name: '히나', desc: '풍기위원장', personality: '', scenario: '', firstMessage: '안녕', defaultVariables: '', lorebook: [{ key: '히나', content: '선도부장', comment: '히나', mode: 'normal', extentions: { da_rid: 'r1' } }], regex: [], trigger: [], extra: 7 };
  const calls = [];
  const undo = [];
  const api = { pluginStorage: memStorage(), runLLMModel: async (o) => { calls.push(o); return typeof answer === 'function' ? answer(o) : answer; } };
  const host = {
    getView: () => view,
    targetId: () => 'c1',
    assets: () => [],
    replaceView: (next, label) => { undo.push(view); view = structuredClone(next); host.last = label; },
    undo: () => { const p = undo.pop(); if (p) view = p; return !!p; },
    canUndo: () => undo.length > 0
  };
  return { api, host, calls, get view() { return view; }, set view(v) { view = v; } };
}

test('toDraft/toView: Dusk view ↔ 봇빌더 draft 왕복, 알 수 없는 필드 보존', () => {
  const view = { chaId: 'c', name: 'n', lorebook: [{ key: 'a', content: 'b' }], regex: [{ in: 'x', out: 'y' }], trigger: [], extra: 1 };
  const d = toDraft(view, []);
  assert.deepEqual(d.globalLore, view.lorebook);
  assert.equal(d.lorebook, undefined);
  const back = toView(d);
  assert.deepEqual(back, view);
  assert.equal(back.additionalAssets, undefined);
});

test('요청 → 수정안 → 적용: 편집기 작업본이 바로 바뀌고 기존 항목의 Dusk 확장 필드는 유지', async () => {
  const f = fixture(reply({ schemaVersion: 1, task: 'lorebook', data: { upsert: [{ ref: 'l0', entry: { content: '선도부장 겸 풍기위원장' } }, { ref: null, entry: { key: '아코', content: '행정위원' } }], remove: [] } }));
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  b.setTask('lorebook');
  b.setRequest('lorebook', '아코 추가');
  await b.sendRequest();
  const s = b.state.s;
  assert.equal(s.candidates.length, 1);
  assert.equal(b.candidateState(s.candidates[0]), 'ok');
  assert.ok(f.calls[0].messages.some((m) => m.content.includes('아코 추가')));
  b.applyCandidate(s.candidates[0]);
  assert.equal(f.view.lorebook.length, 2);
  assert.equal(f.view.lorebook[0].content, '선도부장 겸 풍기위원장');
  assert.deepEqual(f.view.lorebook[0].extentions, { da_rid: 'r1' });
  assert.equal(f.view.extra, 7);
  assert.equal(b.candidateState(s.candidates[0]), 'applied');
  // 되돌리기 1단계
  assert.ok(b.canUndo());
  b.undo();
  assert.equal(f.view.lorebook.length, 1);
});

test('손으로 고치면 대기 수정안은 원고가 바뀜(stale)으로 처리', async () => {
  const f = fixture(reply({ schemaVersion: 1, task: 'description', data: { text: '새 설명' } }));
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  b.setTask('description');
  b.setRequest('description', '설명 다시');
  await b.sendRequest();
  const c = b.state.s.candidates[0];
  assert.equal(b.candidateState(c), 'ok');
  f.view = { ...f.view, desc: '손으로 고침' };
  assert.equal(b.candidateState(c), 'stale');
  assert.throws(() => b.applyCandidate(c), /다른 시점/);
});

test('수정안 두 개: 하나를 적용하면 나머지는 stale', async () => {
  const f = fixture(reply({ schemaVersion: 1, task: 'description', data: { text: 'A' } }));
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  b.setTask('description');
  b.setRequest('description', '1');
  await b.sendRequest();
  b.setRequest('description', '2');
  await b.sendRequest();
  const [c1, c2] = b.state.s.candidates;
  b.applyCandidate(c1);
  assert.equal(f.view.desc, 'A');
  assert.equal(b.candidateState(c2), 'stale');
});

test('선택한 항목만 범위 밖 변경이 오면 버린다', async () => {
  const f = fixture(reply({ schemaVersion: 1, task: 'lorebook', data: { upsert: [{ ref: null, entry: { key: 'z', content: 'z' } }], remove: [] } }));
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  b.setTask('lorebook');
  b.setScopeOnly(true);
  b.setSelected('lorebook', 0);
  b.setRequest('lorebook', '새 항목');
  await b.sendRequest();
  assert.equal(b.state.s.candidates.length, 0);
  assert.match(b.state.s.thread.at(-1).content, /밖의 변경/);
});

test('요청 중 원고가 바뀌면 결과를 버린다 + 한도 초과 요청은 막는다', async () => {
  let f;
  f = fixture(() => { f.view = { ...f.view, name: '바뀜' }; return reply({ schemaVersion: 1, task: 'description', data: { text: 'x' } }); });
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  b.setTask('description');
  b.setRequest('description', '요청');
  await b.sendRequest();
  assert.equal(b.state.s.candidates.length, 0);
  assert.equal(b.state.s.thread.at(-1).error, true);
  await b.setSettings({ maxInputTokens: 1000 });
  b.setRequest('description', '가'.repeat(3000));
  await assert.rejects(() => b.sendRequest(), /한도/);
});

test('저장본: da_aibuild:* 키에 자동/임시 저장하고 불러오면 대화는 이어지고 원고는 편집기 것 유지', async () => {
  const f = fixture(reply({ schemaVersion: 1, task: 'description', data: { text: 'B' } }));
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  b.setTask('description');
  b.setRequest('description', '설명');
  await b.sendRequest();
  await b.saveSlot('manual');
  assert.ok([...f.api.pluginStorage._m.keys()].every((k) => k.startsWith('da_aibuild:')));
  const b2 = createAiBuild({ api: f.api, host: f.host });
  await b2.init();
  assert.ok(b2.state.slots.manual.session);
  b2.restoreSlot('manual');
  assert.equal(b2.state.s.thread.length, 2);
  assert.equal(b2.candidateState(b2.state.s.candidates[0]), 'ok'); // 원고가 같으면 그대로 쓸 수 있다
  f.view = { ...f.view, desc: '다름' };
  assert.equal(b2.candidateState(b2.state.s.candidates[0]), 'stale');
});

test('스토어: 설정 보정·프롬프트 저장/초기화·봇빌더 JSON 가져오기', async () => {
  const api = { pluginStorage: memStorage() };
  const st = createAiStore(api);
  await st.saveSettings({ model: 'bad', timeout: 5 });
  const s = await st.loadSettings();
  assert.equal(s.model, 'submodel');
  assert.equal(s.timeout, 300);
  const p = defaultPrompt('description');
  await st.savePrompt('description', p);
  assert.ok((await st.loadPrompts()).description);
  await st.resetPrompt('description');
  assert.equal((await st.loadPrompts()).description, undefined);
  const snap = snapshot(newSession());
  assert.equal(st.importBB(JSON.stringify(snap)).kind, 'snapshot');
  assert.equal(st.importBB({ system: 'a', user: 'b' }).kind, 'prompt');
  assert.equal(st.importBB(newPresetState()).kind, 'preset');
  assert.throws(() => st.importBB('{"a":1}'), /알 수 없는/);
  assert.equal(restoreSnapshot(snap).thread.length, 0);
});

test('정규식 시험(RE2JS)과 프리셋 기본 상태', async () => {
  const r = await regexTest({ in: '(\\d+)', out: '[$1]', flag: 'g' }, 'a1 b22');
  assert.equal(r.output, 'a[1] b[22]');
  assert.equal(newPresetState().mode, 'direct');
  const msgs = composeMessages({ ...newSession(), draft: toDraft({ name: 'x', lorebook: [] }, []) }, 'description', '설명', defaultPrompt('description'));
  assert.equal(msgs.length, 2);
  assert.ok(Object.keys(TASKS).includes('workshop'));
  assert.equal(typeof assemblePreset, 'function');
});
