// 보고된 버그: ① 프롬프트 예시의 'Other'가 이름으로 저장됨 ② 처음부터 친한 사이로 넣어도 '처음 봄'
import test from "node:test";
import assert from "node:assert/strict";
import { fromStage2, parseLines } from "../src/engine/memorylines.js";
import { stageOf } from "../src/engine/memoryhuman.js";

const known = [{ name: "하연", aliases: [] }, { name: "카이", aliases: [] }];
const run = (text, name = "카이", source = "카이는 하연의 손을 잡았다. 하연이 웃었다.") => fromStage2(parseLines(text), name, { known, source });

test("예시 이름 'Other'는 기록하지 않는다 (bond·to·call·rift)", () => {
  const r = run("bond|Other|shared moment|cue\nto|Other|warm|help|손을 잡았다\ncall|Other|형|casual\nrift|Other|싸움|open|some");
  assert.deepEqual(r.bond, []); assert.deepEqual(r.emo, []); assert.deepEqual(r.talk, []); assert.deepEqual(r.rift, []);
});
test("본문에도 없고 아는 사람도 아닌 상대는 기록하지 않는다", () => {
  const r = run("bond|유령|함께 웃었다|웃음");
  assert.deepEqual(r.bond, []);
});
test("아는 사람·{{user}}·본문에 나온 사람은 그대로 기록한다", () => {
  assert.equal(run("bond|하연|함께 웃었다|웃음").bond.length, 1);
  assert.equal(run("bond|{{user}}|옥상에서 약속했다|옥상").bond.length, 1);
  assert.equal(run("bond|새사람|함께 웃었다|웃음", "카이", "카이는 새사람과 웃었다.").bond.length, 1);
});
test("'shared moment' 같은 예시 문구 그대로는 버린다", () => {
  assert.deepEqual(run("bond|하연|shared moment|cue").bond, []);
});

const base = () => ({ scenes: [{ who: ["카이", "하연"], at: 1 }], emo: { a: { from: "카이", to: "하연", tags: { affection: 1 } } }, talk: {}, rels: {}, bonds: [] });
test("처음 만난 사이(근거 없음)는 처음 봄", () => {
  assert.equal(stageOf(base(), "카이", "하연", 1).stage, "just met");
});
test("반말·별칭으로 부르는 사이는 처음 봄이 아니다", () => {
  const f = base(); f.talk = { t: { from: "카이", to: "하연", call: "누나", tone: "casual" } };
  assert.notEqual(stageOf(f, "카이", "하연", 1).stage, "just met");
});
test("함께한 추억·관계 변화 기록이 쌓여 있으면 처음 봄이 아니다", () => {
  const f = base(); f.bonds = [{ a: "카이", b: "하연", moment: "어릴 적 약속" }, { a: "하연", b: "카이", moment: "같이 울었다" }];
  assert.notEqual(stageOf(f, "카이", "하연", 1).stage, "just met");
  const g = base(); g.rels = { r: { from: "카이", to: "하연", items: [{ d: "절친", dir: "+" }, { d: "믿음", dir: "+" }] } };
  assert.notEqual(stageOf(g, "카이", "하연", 1).stage, "just met");
});

// ── 초기 입력에서 명백한 기존 관계 감지 ──
import { applyHuman, validateHuman } from "../src/engine/memoryhuman.js";
const src2 = "카이와 하연은 어릴 때부터 함께 자란 소꿉친구였다. 카이가 웃었다.";
test("start 줄: 본문 근거(인용)가 있을 때만 받는다", () => {
  const ok = run("start|하연|close|함께 자란 소꿉친구", "카이", src2);
  assert.equal(ok.start.length, 1);
  assert.deepEqual([ok.start[0].a, ok.start[0].b, ok.start[0].level], ["카이", "하연", "close"]);
  assert.deepEqual(run("start|하연|close|서로 사랑하는 연인", "카이", src2).start, [], "본문에 없는 인용");
  assert.deepEqual(run("start|하연|close", "카이", src2).start, [], "인용 없음");
  assert.deepEqual(run("start|Other|close|함께 자란 소꿉친구", "카이", src2).start, [], "자리표시자 이름");
});
test("한국어 단계 이름도 받는다", () => {
  assert.equal(run("start|하연|친한|함께 자란 소꿉친구", "카이", src2).start[0].level, "close");
});
test("start가 반영되면 처음 봄이 아니라 '친한 사이'로 시작한다", () => {
  const f = { scenes: [{ who: ["카이", "하연"], at: 1 }], emo: {}, talk: {}, rels: {}, bonds: [] };
  const h = validateHuman({ start: [{ a: "카이", b: "하연", level: "close", q: "함께 자란 소꿉친구" }] });
  assert.equal(h.start.length, 1);
  applyHuman(f, h, { at: 1 }, { now: 1 });
  assert.equal(stageOf(f, "하연", "카이", 1).stage, "close");
  applyHuman(f, validateHuman({ start: [{ a: "카이", b: "하연", level: "friendly", q: "아는 사이" }] }), { at: 2 }, { now: 2 });
  assert.equal(f.start["카이|하연"].level, "close", "이미 있으면 덮어쓰지 않는다");
});
test("friendly는 최소 '아는 사이'", () => {
  const f = { scenes: [], emo: {}, talk: {}, rels: {}, bonds: [] };
  applyHuman(f, validateHuman({ start: [{ a: "카이", b: "하연", level: "friendly", q: "같은 반 친구" }] }), { at: 1 }, { now: 1 });
  assert.equal(stageOf(f, "카이", "하연", 1).stage, "acquaintances");
});

import { mergeIntoUser, userMergePlan } from "../src/engine/memoryuser.js";
import { pairView } from "../src/engine/memoryhuman.js";
test("{{user}}로 합칠 때 처음부터 알던 사이 기록도 따라간다(더 가까운 단계 유지)", () => {
  const f = { people: { sensei: { name: "Sensei", aliases: [], records: [] }, "{{user}}": { name: "{{user}}", aliases: [], records: [] } }, start: { "sensei|하연": { a: "Sensei", b: "하연", level: "friendly", q: "같은 반" }, "{{user}}|하연": { a: "{{user}}", b: "하연", level: "close", q: "소꿉친구" } } };
  assert.ok(userMergePlan(f, ["Sensei"]).links >= 1);
  mergeIntoUser(f, ["Sensei"]);
  assert.deepEqual(Object.keys(f.start), ["{{user}}|하연"]);
  assert.equal(f.start["{{user}}|하연"].level, "close");
});
test("pairView가 처음부터 알던 사이를 돌려준다", () => {
  const f = { scenes: [], emo: {}, talk: {}, rels: {}, bonds: [], start: { "카이|하연": { a: "카이", b: "하연", level: "close", q: "소꿉친구" } } };
  assert.equal(pairView(f, ["하연"], "카이").start.q, "소꿉친구");
  assert.equal(pairView(f, ["하연"], "다른이").start, null);
});
