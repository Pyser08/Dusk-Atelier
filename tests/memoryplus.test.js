import test from "node:test";
import assert from "node:assert/strict";
import { validate, buildMessages } from "../src/engine/memoryprompt.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { validatePlus, applyRel, applyOpen, openItems, openForPrompt, timelineOf, currentStoryTime, forgotten, strength, lastTouch, knowLines, openLines, relLines, sourceLines } from "../src/engine/memoryplus.js";
import { buildBlock, estimateTokens } from "../src/engine/memoryinject.js";
import { hashText } from "../src/engine/chattext.js";

const rec = (i, g, act, extra = {}) => ({ id: "r" + i, at: i, h: "h" + i, act, g, orphan: false, ...extra });
const base = () => ({ people: {}, scenes: [], runs: 0 });

test("검증: know·rel·open을 정리하고 잘못된 값은 버린다", () => {
  const v = validate({ people: [{ name: "미나", act: "비밀을 털어놓음", p: 3, s: 3, r: 1, know: ["하루", "하루", "", "x".repeat(100)] }],
    rel: [{ from: "미나", to: "하루", d: "신뢰가 깊어짐", dir: "+" }, { from: "미나", to: "미나", d: "자기", dir: "+" }, { from: "a", to: "b", d: "", dir: "-" }, { from: "a", to: "b", d: "변화", dir: "?" }],
    open: { add: [{ text: "내일 다시 만나기로 약속", kind: "promise", who: ["미나"] }, { text: "", kind: "x" }, { text: "정체불명의 편지", kind: "mystery" }], close: ["o1", "o2", "o3", "o4"] } });
  assert.equal(v.people[0].know.length, 2); assert.equal(v.rel.length, 2); assert.equal(v.rel[1].dir, "0");
  assert.deepEqual(v.open.add.map((x) => x.kind), ["promise", "question"]); assert.equal(v.open.close.length, 3);
  assert.deepEqual(validatePlus({}).open, { add: [], close: [] });
});
test("프롬프트: openItems는 있을 때만 payload에 들어간다", () => {
  const a = JSON.parse(buildMessages({ bot: "b", newest: { index: 1, text: "t" } })[1].content), b = JSON.parse(buildMessages({ bot: "b", openItems: [{ id: "o1", text: "약속" }], newest: { index: 1, text: "t" } })[1].content);
  assert.equal(a.openItems, undefined); assert.equal(b.openItems[0].id, "o1");
});
test("분석 반영: know 저장, 중복은 강화(m·lm), 관계·열린 항목 누적과 닫기", () => {
  const f = base(), anchor = { at: 5, h: "x" };
  const res = { people: [{ name: "미나", act: "하루에게 비밀을 털어놓음", p: 3, s: 3, r: 1, know: ["하루"] }], scene: { sum: "옥상", facts: [], place: "옥상", when: "3월 2일 밤", who: ["미나"], changed: true },
    rel: [{ from: "미나", to: "하루", d: "신뢰가 깊어짐", dir: "+" }], open: { add: [{ text: "내일 다시 만나기로 약속", kind: "promise", who: ["미나", "하루"] }], close: [] } };
  const o1 = applyAnalysis(f, res, anchor, { now: 1000 });
  assert.equal(o1.records, 1); assert.deepEqual(f.people["미나"].records[0].know, ["하루"]); assert.equal(o1.rel, 1); assert.equal(o1.open, 1);
  const id = f.open[0].id;
  applyAnalysis(f, { ...res, rel: [], open: { add: [], close: [id] } }, { at: 9, h: "y" }, { now: 2000 });
  const r = f.people["미나"].records[0];
  assert.equal(r.m, 2); assert.equal(r.lm, 9); assert.equal(f.open[0].closed, true); assert.equal(f.open[0].closedAt, 9);
  assert.equal(openItems(f).length, 0); assert.equal(openItems(f, { closed: true }).length, 1);
});
test("열린 항목: 중복 추가 금지, 알 수 없는 id는 무시, 상한 정리는 해결된 것부터", () => {
  const f = base();
  applyOpen(f, { add: [{ text: "편지의 정체는?", kind: "question", who: [] }] }, { at: 1 });
  assert.deepEqual(applyOpen(f, { add: [{ text: "편지의 정체는?", kind: "question", who: [] }], close: ["없는id"] }, { at: 2 }), { added: 0, closed: 0 });
  for (let i = 0; i < 70; i++) applyOpen(f, { add: [{ text: "서로 다른 항목 번호 " + "가나다라마바사아자차"[i % 10] + i + "ㅋ".repeat(i % 7), kind: "promise" }] }, { at: i });
  assert.ok(f.open.length <= 60); assert.equal(openForPrompt(f, 3).length, 3);
});
test("관계 변화량: 같은 변화 반복은 한 번만, 쌍별 20개 상한", () => {
  const f = base();
  applyRel(f, [{ from: "A", to: "B", d: "신뢰가 깊어짐", dir: "+" }], { at: 1 }); applyRel(f, [{ from: "A", to: "B", d: "신뢰가 깊어짐", dir: "+" }], { at: 2 });
  assert.equal(f.rels["a>b"].items.length, 1);
  for (let i = 0; i < 30; i++) applyRel(f, [{ from: "A", to: "B", d: "변화 " + "가나다라마바사"[i % 7] + "abcdefghijklmnopqrstuvwxyz"[i % 26] + i, dir: "-" }], { at: i });
  assert.equal(f.rels["a>b"].items.length, 20);
});
test("세계 시간선: 시각이 있는 상황만 메시지 순서로", () => {
  const f = { scenes: [{ id: "b", at: 9, when: "3월 3일", sum: "나중" }, { id: "a", at: 2, when: "3월 2일", sum: "처음", place: "교실" }, { id: "c", at: 5, sum: "시각 없음" }, { id: "d", at: 7, when: "x", sum: "고아", orphan: true }] };
  assert.deepEqual(timelineOf(f).map((x) => x.id), ["a", "b"]); assert.equal(currentStoryTime(f), "3월 3일"); assert.equal(currentStoryTime({ scenes: [] }), "");
});
test("강화·망각: 언급·사용은 강화, 오래된 D·C는 잊고 핀·사용자 수정·여러 번 언급된 C·B 이상은 남는다", () => {
  assert.ok(strength({ m: 3, u: 2 }) > strength({}));
  assert.equal(lastTouch({ at: 5, lm: 50, lu: 30 }), 50);
  assert.equal(forgotten(rec(1, "D", "x"), 400, 150), true); assert.equal(forgotten(rec(1, "D", "x"), 100, 150), false);
  assert.equal(forgotten(rec(1, "D", "x", { pin: true }), 400), false); assert.equal(forgotten(rec(1, "D", "x", { user: true }), 400), false);
  assert.equal(forgotten(rec(1, "B", "x"), 4000), false); assert.equal(forgotten(rec(1, "C", "x", { m: 2 }), 4000), false);
  assert.equal(forgotten(rec(1, "C", "x"), 200, 150), false); assert.equal(forgotten(rec(1, "C", "x"), 400, 150), true);
  assert.equal(forgotten(rec(1, "D", "x"), 4000, 0), false);
});
test("주입: 오래된 D는 빠지고 자주 언급된 기록은 앞선다", () => {
  const f = { cursor: { at: 1 }, scenes: [{ id: "s", at: 1, sum: "장면", facts: [], who: ["미나"] }], people: { 미나: { name: "미나", records: [rec(1, "D", "아주 오래된 인사"), rec(2, "B", "약속을 함", { m: 4 }), rec(3, "B", "물건을 줍음")] } } };
  const t = buildBlock(f, { messageCount: 600, settings: {} }).text;
  assert.ok(!t.includes("아주 오래된 인사")); assert.ok(t.indexOf("약속을 함") >= 0);
  assert.ok(buildBlock(f, { messageCount: 600, settings: { plus: false } }).text.includes("아주 오래된 인사"), "확장을 끄면 예전처럼 잊지 않는다");
  const kept = buildBlock(f, { messageCount: 100, settings: {} }).text; assert.ok(kept.includes("아주 오래된 인사"));
});
test("주입: 열린 항목·관계·지식 경계·원문 발췌 블록과 예산", () => {
  const text = "그녀가 말했다. 사실은 내가 범인이에요. 아무에게도 말하지 마세요.";
  const msgs = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "char" : "user", data: i === 4 ? text : "일반 메시지 " + i }));
  const f = { cursor: { at: 1 }, scenes: [{ id: "s", at: 4, sum: "고백", facts: [], when: "3월 2일 밤", who: ["미나", "하루"] }],
    people: { 미나: { name: "미나", ctx: "always", records: [rec(4, "EX", "범인임을 고백함", { h: hashText(text), know: ["하루"] })] } },
    rels: { "미나>하루": { from: "미나", to: "하루", items: [{ d: "신뢰가 깊어짐", dir: "+", at: 4, at_ms: 1 }] } },
    open: [{ id: "o1", text: "내일 다시 만나기로 약속", kind: "promise", who: ["미나"], closed: false }, { id: "o2", text: "해결된 일", kind: "question", closed: true }] };
  const { text: t, manifest } = buildBlock(f, { messageCount: 12, messages: msgs, settings: { recentSkip: 2 } });
  assert.match(t, /Current scene \[3월 2일 밤\]/); assert.match(t, /Open threads[\s\S]*\[promise\] 내일 다시/); assert.ok(!t.includes("해결된 일"));
  assert.match(t, /미나 → 하루: 신뢰가 깊어짐 ↑/); assert.match(t, /only 하루 know this/); assert.match(t, /#5 미나: "그녀가 말했다/);
  assert.ok(manifest.included.some((x) => x.kind === "src") && manifest.recordIds.includes("r4"));
  // 원문이 바뀌면(해시 불일치) 발췌하지 않는다
  const changed = msgs.map((m, i) => i === 4 ? { ...m, data: "다른 내용" } : m);
  assert.ok(!buildBlock(f, { messageCount: 12, messages: changed, settings: { recentSkip: 2 } }).text.includes("Source lines"));
  // 끄면 확장 블록 없음, 예산 초과 시 통째로 빠짐
  const off = buildBlock(f, { messageCount: 12, messages: msgs, settings: { plus: false, recentSkip: 2 } }).text; assert.ok(!/Open threads|Knowledge limits|Source lines/.test(off));
  const tiny = buildBlock(f, { messageCount: 12, messages: msgs, settings: { recentSkip: 2, capTokens: 120, targetTokens: 120 } }); assert.ok(estimateTokens(tiny.text) <= 160);
});
test("보조 함수: 빈 입력은 빈 결과", () => {
  assert.deepEqual(knowLines([]), []); assert.deepEqual(openLines({}), []); assert.deepEqual(relLines({}), []); assert.deepEqual(sourceLines({}, []), []);
});
