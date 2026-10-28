import test from 'node:test';
import assert from 'node:assert/strict';
import { toDraft, toView } from '../src/dev/aibuild/bridge.js';
import { withKind, applyPacket, composeMessages, defaultPrompt, newSession } from '../src/dev/aibuild/core.js';

const view = { id: 'm1', name: '모듈', description: '옛 설명', namespace: 'ns', lorebook: [], regex: [], trigger: [] };

test('모듈: description ↔ desc 왕복, 모듈 전용 칸 보존', () => {
  const d = toDraft(view, [], 'module');
  assert.equal(d.desc, '옛 설명');
  assert.equal('description' in d, false);
  const next = applyPacket(d, { task: 'description', data: { text: '새 설명' } });
  const v = toView(next, 'module');
  assert.equal(v.description, '새 설명');
  assert.equal(v.namespace, 'ns');
  assert.equal(v.id, 'm1');
  assert.equal('desc' in v, false);
});

test('모듈: 첫 메시지·초기 변수 작업은 거부', () => {
  const d = toDraft(view, [], 'module');
  withKind('module', () => {
    assert.throws(() => applyPacket(d, { task: 'greeting', data: { text: 'x' } }), /모듈에는/);
    assert.throws(() => applyPacket(d, { task: 'lua', data: { scripts: [], removeScripts: [], variables: { a: '1' }, removeVariables: [] } }), /초기 변수/);
    const ok = applyPacket(d, { task: 'lua', data: { scripts: [{ ref: null, comment: 'c', code: 'function onStart(a) end' }], removeScripts: [], variables: {}, removeVariables: [] } });
    assert.equal(ok.triggerscript.length, 1);
  });
});

test('모듈: 요청에 봇 전용 칸이 없고 모듈 안내가 붙는다', () => {
  const s = newSession();
  s.draft = toDraft(view, [], 'module');
  const msgs = withKind('module', () => composeMessages(s, 'lorebook', '요청', defaultPrompt('lorebook')));
  assert.match(msgs[0].content, /편집 대상: 모듈/);
  assert.doesNotMatch(msgs[1].content, /"firstMessage"|"personality"|"defaultVariables"/);
});
