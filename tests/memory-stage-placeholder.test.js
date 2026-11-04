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
