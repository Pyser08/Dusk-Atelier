// v1.6.7 4단계: 로어북 Dusk 방식 — 설계 JSON 변환·검사, 프롬프트, 컨트롤러 흐름(재요청 포함)
import test from 'node:test';
import assert from 'node:assert/strict';
import { convertDesign, applyDesignToResponse, designExamples, duskContext, resolveLoreMode, ruleToDesign } from '../src/dev/aibuild/duskdesign.js';
import { createAiBuild } from '../src/dev/aibuild/controller.js';
import { composeMessages, defaultPrompt, newSession, applyPacket, parseResponse } from '../src/dev/aibuild/core.js';
import { toDraft } from '../src/dev/aibuild/bridge.js';
import { collectManaged, evaluate, AFF_PREFIX, PLACE_PREFIX, ridOf, ruleOf, folderIdOf, isAff, isPlace, parentOf, validateRules, bodyOf } from '../src/engine/lorerules.js';

const example = (i) => JSON.parse(designExamples()[i]).data.design;
const applyConv = (lore, r) => {
  const out = structuredClone(lore);
  for (const u of r.upsert) {
    if (u.ref === null) out.push(structuredClone(u.entry));
    else { const i = Number(u.ref.slice(1)); out[i] = { ...out[i], ...u.entry }; }
  }
  return out.filter((_, i) => !r.remove.includes('l' + i));
};

test('설계 → 소속 폴더·구성원·장소로 변환 (블루 아카이브 예시)', () => {
  const r = convertDesign(example(0), []);
  assert.deepEqual(r.errors, []);
  const lore = applyConv([], r);
  assert.equal(lore.length, 5);
  const [geh, sun, hina, iori, office] = lore;
  assert.ok(isAff(geh) && isAff(sun));
  assert.equal(geh.comment, AFF_PREFIX + '게헨나');
  assert.equal(parentOf(sun), folderIdOf(geh)); // 선도부 ⊂ 게헨나
  assert.equal(parentOf(hina), folderIdOf(sun));
  const prob = sun.extentions.da_folder.aff.prob;
  assert.equal(prob[ridOf(hina)], 100);
  assert.equal(prob[ridOf(iori)], 60);
  assert.equal(sun.extentions.da_folder.aff.max, 2);
  assert.ok(ridOf(hina) && ruleOf(hina).on === true);
  assert.match(hina.content, /\{\{#if \{\{getvar::da_[a-zA-Z0-9]+\}\}\}\}/); // 게이트는 Dusk가 감싼다
  assert.equal(bodyOf(hina.content), '소라사키 히나. 게헨나 학원 선도부의 부장이다.');
  assert.deepEqual(validateRules(lore).filter((x) => x.level === 'err'), []);
  assert.ok(r.preview.some((p) => p.kind === 'affiliation' && p.name === '선도부'));
});

test('누적 조건·연쇄·수식 규칙이 규칙 구조로 변환된다', () => {
  const base = applyConv([], convertDesign(example(0), []));
  const r = convertDesign(example(1), base);
  assert.deepEqual(r.errors, []);
  const lore = applyConv(base, r);
  const e = lore.at(-1);
  const rule = ruleOf(e);
  assert.equal(rule.once, 'chat');
  assert.deepEqual(rule.cond, [{ t: 'count', keys: '야근,서류', min: 3 }]);
  assert.equal(rule.set[0].op, 'expr');
  assert.equal(rule.chain[0].rid, ridOf(lore[2])); // 히나
  // 기존 항목 '히나'는 이미 규칙이 있으므로 바뀌지 않는다
  assert.equal(r.upsert.length, 1);
  // 설계로 다시 읽으면 이름으로 보인다
  assert.equal(ruleToDesign(rule, (id) => lore.find((x) => ridOf(x) === id)?.comment).chain[0].target, '히나');
});

test('잘못된 설계는 이유와 함께 막힌다', () => {
  const bad = (design, re, lore = []) => assert.ok(convertDesign(design, lore).errors.some((m) => re.test(m)), JSON.stringify(convertDesign(design, lore).errors));
  bad({ entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', rule: { chain: [{ target: '없는사람' }] } }] }, /찾지 못했어요/);
  bad({ entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', rule: { chain: [{ target: 'A' }] } }] }, /자기 자신/);
  bad({ entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', folder: '없는폴더' }] }, /폴더/);
  bad({ entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', rule: { conditions: [{ type: 'moon' }] } }] }, /조건 종류/);
  bad({ entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', rule: { set: [{ var: 'v', op: 'expr', value: 'min(1,' }] } }] }, /수식/);
  bad({ entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', rule: { chance: 150 } }] }, /0~100/);
  bad({ entries: [{ ref: null, name: 'A', keys: '', content: 'x' }] }, /keys/);
  bad({ folders: [{ name: 'G', affiliation: { members: { 유령: 50 } } }] }, /찾지 못했어요/);
  bad({ folders: [{ name: 'A', parent: 'B' }, { name: 'B', parent: 'A' }] }, /순환/);
  bad({}, /비었/);
  const lore = applyConv([], convertDesign({ entries: [{ ref: null, name: '히나', keys: '히나', content: '부장' }] }, []));
  bad({ entries: [{ ref: null, name: '히나', keys: '히나', content: '또' }] }, /이미 있는 항목/, lore);
  bad({ entries: [{ ref: 'l9', content: 'x' }] }, /없어요/, lore);
  bad({ remove: ['l0'], entries: [{ ref: 'l0', content: '고침' }] }, /고치면서 지우/, lore);
});

test('규칙이 꺼진 기존 항목을 연쇄 대상으로 쓰면 자동으로 켜고 알려 준다', () => {
  const lore = [{ key: '유우카', secondkey: '', content: '회계', comment: '유우카', mode: 'normal', insertorder: 100, alwaysActive: false, selective: false, useRegex: false }];
  const r = convertDesign({ entries: [{ ref: null, name: '노아', keys: '노아', content: '서기', rule: { chain: [{ target: '유우카', chance: 40 }] } }] }, lore);
  assert.deepEqual(r.errors, []);
  assert.ok(r.fixes.some((f) => /유우카/.test(f)));
  const out = applyConv(lore, r);
  assert.ok(ruleOf(out[0]).on);
  assert.equal(ruleOf(out[1]).chain[0].rid, ridOf(out[0]));
});

test('누적 조건에 반복이 없으면 경고', () => {
  const r = convertDesign({ entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', rule: { conditions: [{ type: 'count', words: '비', min: 2 }] } }] }, []);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((m) => /누적 조건/.test(m)));
});

test('확률 블록은 content 안에서 감싸진다', () => {
  const r = convertDesign({ entries: [{ ref: null, name: 'A', keys: 'a', content: '평소 말투. 가끔 한숨을 쉰다.', probBlocks: [{ text: '가끔 한숨을 쉰다.', chance: 30 }] }] }, []);
  assert.deepEqual(r.errors, []);
  assert.match(r.upsert[0].entry.content, /\{\{#if \{\{\? \{\{random\}\} < 0\.3\}\}\}\}가끔 한숨을 쉰다\.\{\{\/if\}\}/);
  assert.ok(convertDesign({ entries: [{ ref: null, name: 'A', keys: 'a', content: '글', probBlocks: [{ text: '없는 글', chance: 30 }] }] }, []).errors.length);
});

test('장소: 소속에 연결하거나 폴더 안에 둔다', () => {
  const r = convertDesign({ folders: [{ name: '트리니티', affiliation: {} }], entries: [{ ref: null, kind: 'place', name: '대성당', keys: '대성당', content: '큰 성당', links: ['트리니티'] }] }, []);
  assert.deepEqual(r.errors, []);
  const lore = applyConv([], r);
  assert.ok(isPlace(lore[1]));
  assert.equal(lore[1].comment, PLACE_PREFIX + '대성당');
  assert.deepEqual(lore[1].extentions.da_place.links, [folderIdOf(lore[0])]);
  assert.ok(convertDesign({ entries: [{ ref: null, kind: 'place', name: 'X', keys: 'x', content: 'c', links: ['없음'] }] }, []).errors.length);
});

test('방식 결정: 기억 > 설정 > 로어북 내용', () => {
  assert.equal(resolveLoreMode({ setting: 'auto', lore: [] }), 'plain');
  assert.equal(resolveLoreMode({ setting: 'auto', lore: [{ extentions: { da_rule: {} } }] }), 'dusk');
  assert.equal(resolveLoreMode({ setting: 'dusk', lore: [] }), 'dusk');
  assert.equal(resolveLoreMode({ setting: 'dusk', remembered: 'plain', lore: [] }), 'plain');
});

test('프롬프트: Dusk 방식에는 설계 안내·구조 맥락이, 일반 방식에는 없다', () => {
  const s = newSession();
  s.draft.globalLore = applyConv([], convertDesign(example(0), []));
  const msg = (lore) => composeMessages(s, 'lorebook', '소속 더 만들어줘', defaultPrompt('lorebook'), { lore })[1].content;
  const dusk = msg('dusk'), plain = msg('plain');
  assert.match(dusk, /\[로어북 방식: Dusk\]/);
  assert.match(dusk, /"design"/);
  assert.match(dusk, /affiliation/);
  assert.ok(dusk.includes('"kind":"affiliation"'));
  assert.doesNotMatch(dusk, /@@activate\\n/); // 게이트 문구는 맥락에 새지 않는다
  assert.doesNotMatch(plain, /\[로어북 방식: Dusk\]/);
  assert.match(plain, /허용 필드: lore entry=/);
  const ctx = duskContext(s.draft.globalLore);
  assert.equal(ctx[1].parent, '게헨나');
  assert.equal(ctx[2].folder, '선도부');
  assert.equal(ctx[1].affiliation.members['히나'], 100);
});

test('일반 방식 응답에는 Dusk 필드를 허용하지 않고, 관리 항목의 내용을 고쳐도 게이트가 유지된다', () => {
  const lore = applyConv([], convertDesign(example(0), []));
  const draft = { ...newSession().draft, globalLore: lore };
  const resp = (entry) => JSON.stringify({ schemaVersion: 1, task: 'lorebook', data: { upsert: [{ ref: 'l2', entry }], remove: [] } });
  assert.throws(() => parseResponse(resp({ extentions: { da_rid: 'x' } }), 'lorebook', draft), /허용하지 않는 필드/);
  const packet = parseResponse(resp({ content: '새 내용' }), 'lorebook', draft);
  const out = applyPacket(draft, packet);
  assert.equal(bodyOf(out.globalLore[2].content), '새 내용');
  assert.match(out.globalLore[2].content, /\{\{#if \{\{getvar::da_/);
  assert.equal(ridOf(out.globalLore[2]), ridOf(lore[2])); // 규칙은 그대로
});

// ---- 컨트롤러 흐름 ----
const memStorage = () => { const m = new Map(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k) }; };
function fixture(answers, lore = []) {
  let view = { chaId: 'c1', name: '테스트', desc: '', personality: '', scenario: '', firstMessage: '', defaultVariables: '', lorebook: lore, regex: [], trigger: [] };
  const undo = [], calls = [];
  const queue = [...answers];
  const api = { pluginStorage: memStorage(), runLLMModel: async (o) => { calls.push(o); return { type: 'success', result: queue.length > 1 ? queue.shift() : queue[0] }; } };
  const host = { getView: () => view, targetId: () => 'c1', assets: () => [], replaceView: (n) => { undo.push(view); view = structuredClone(n); }, undo: () => { const p = undo.pop(); if (p) view = p; return !!p; }, canUndo: () => undo.length > 0 };
  return { api, host, calls, get view() { return view; } };
}
const reply = (design) => JSON.stringify({ schemaVersion: 1, task: 'lorebook', data: { design } });

test('컨트롤러: Dusk 방식 요청 → 수정안 카드(미리보기) → 적용 → 탭에 반영 → 되돌리기', async () => {
  const f = fixture([reply(example(0))]);
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  await b.setLoreMode('dusk');
  b.setTask('lorebook');
  b.setRequest('lorebook', '게헨나 선도부를 만들어줘');
  await b.sendRequest();
  const c = b.state.s.candidates[0];
  assert.ok(c, b.state.s.thread.at(-1)?.content);
  assert.equal(c.packet.dusk, true);
  assert.ok(c.dusk.preview.length >= 5);
  assert.match(f.calls[0].messages[1].content, /\[로어북 방식: Dusk\]/);
  b.applyCandidate(c);
  assert.equal(f.view.lorebook.length, 5);
  assert.ok(f.view.lorebook.some((e) => isAff(e)));
  assert.deepEqual(validateRules(f.view.lorebook).filter((x) => x.level === 'err'), []);
  assert.ok(b.undo());
  assert.equal(f.view.lorebook.length, 0);
});

test('컨트롤러: 검사에 걸리면 오류를 붙여 한 번 다시 요청하고, 끄면 바로 실패한다', async () => {
  const badDesign = { entries: [{ ref: null, name: 'A', keys: 'a', content: 'x', rule: { chain: [{ target: '유령' }] } }] };
  const f = fixture([reply(badDesign), reply(example(0))]);
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  await b.setLoreMode('dusk');
  b.setTask('lorebook'); b.setRequest('lorebook', '만들어줘');
  await b.sendRequest();
  assert.equal(f.calls.length, 2);
  assert.match(f.calls[1].messages.at(-1).content, /찾지 못했어요/);
  assert.equal(b.state.s.candidates.length, 1);

  const g = fixture([reply(badDesign)]);
  const b2 = createAiBuild({ api: g.api, host: g.host });
  await b2.init();
  await b2.setLoreMode('dusk');
  await b2.setSettings({ retry: false });
  b2.setTask('lorebook'); b2.setRequest('lorebook', '만들어줘');
  await b2.sendRequest();
  assert.equal(g.calls.length, 1);
  assert.equal(b2.state.s.candidates.length, 0);
  assert.match(b2.state.s.thread.at(-1).content, /Dusk 설계 검사/);
});

test('컨트롤러: 방식은 봇마다 기억하고, 일반 방식에서는 설계 응답을 변환하지 않는다', async () => {
  const f = fixture([JSON.stringify({ schemaVersion: 1, task: 'lorebook', data: { upsert: [{ ref: null, entry: { comment: '항구', key: '항구', content: '배가 뜬다' } }], remove: [] } })]);
  const b = createAiBuild({ api: f.api, host: f.host });
  await b.init();
  assert.equal(b.loreMode(), 'plain'); // Dusk 규칙이 없는 봇의 기본값
  await b.setLoreMode('dusk');
  assert.equal(b.loreMode(), 'dusk');
  await b.setLoreMode('plain');
  b.setTask('lorebook'); b.setRequest('lorebook', '항구');
  await b.sendRequest();
  const c = b.state.s.candidates[0];
  assert.ok(c && !c.packet.dusk && !c.dusk);
  assert.doesNotMatch(f.calls[0].messages[1].content, /\[로어북 방식: Dusk\]/);
  b.applyCandidate(c);
  assert.equal(f.view.lorebook[0].comment, '항구');
});

test('설계 변환은 워크숍(설계 대화)의 로어북 변경에도 적용된다', () => {
  const resp = { schemaVersion: 1, task: 'workshop', data: { reply: '만들었어요', changes: [{ task: 'lorebook', data: { design: example(0) } }] } };
  const res = applyDesignToResponse(resp, []);
  assert.deepEqual(res.errors, []);
  assert.equal(resp.dusk, true);
  assert.ok(Array.isArray(resp.data.changes[0].data.upsert));
  const draft = { ...newSession().draft, globalLore: [] };
  const out = applyPacket(draft, resp);
  assert.equal(out.globalLore.length, 5);
});

test('변환 결과를 실제 규칙 엔진에 넣으면 소속·구성원이 설계대로 켜진다', () => {
  const lore = applyConv([], convertDesign(example(0), []));
  const items = collectManaged(lore);
  const fired = (text) => evaluate({ items, messages: [{ role: 'user', data: text }], turn: 1, rng: () => 0.01 }).fired.map((a) => a.entry.comment);
  const a = fired('선도부 이야기를 해줘');
  assert.ok(a.includes('[소속] 선도부') && a.includes('히나') && a.includes('이오리'));
  const b = fired('히나 안녕');
  assert.ok(b.includes('히나') && b.includes('[소속] 게헨나') && !b.includes('이오리'));
});
