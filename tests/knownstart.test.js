import test from "node:test";
import assert from "node:assert/strict";
import { seedFromStart } from "../src/engine/emoseed.js";
import { startFromContext, startLine } from "../src/engine/recorder.js";
import { stageOf } from "../src/engine/memoryhuman.js";
import { timeline, eventText } from "../src/engine/romance.js";

test("유저 입력이 밝힌 ‘이미 아는 사이’: 인용이 유저 입력에 있으면 받는다(본문엔 없어도)", () => {
  const lines = [{ tag: "start", f: ["{{user}}", "close", "3년째 같이 살고 있는"] }];
  assert.deepEqual(startFromContext(lines, "민지", [{ name: "민지" }], "우리는 3년째 같이 살고 있는 사이다"), [{ a: "민지", b: "{{user}}", level: "close", q: "3년째 같이 살고 있는" }]);
  assert.deepEqual(startFromContext(lines, "민지", [], "아무 말"), [], "인용이 없으면 안 받음");
  assert.equal(startLine({ user: "" }).length, 0); assert.match(startLine({ user: "x" })[0], /userInput/);
});

test("이미 아는 사이면 인간적 호감·신뢰를 바닥값까지(낮추지 않음, 한 번만, {{user}} 감정은 안 정함) → 관계 진도도 친한 사이부터", () => {
  const f = { start: { "{{user}}|민지": { a: "민지", b: "{{user}}", level: "close", q: "q", at: 1 } }, emo: { "민지>{{user}}": { from: "민지", to: "{{user}}", tags: { affection: 2, attraction: 2 }, log: [] } }, scenes: [{ who: ["민지", "{{user}}"], at: 1 }] };
  assert.equal(seedFromStart(f, { at: 1 }), 2);
  assert.deepEqual(f.emo["민지>{{user}}"].tags, { affection: 6, attraction: 2, trust: 6 });
  assert.ok(!f.emo["{{user}}>민지"], "{{user}}의 감정은 정하지 않음");
  assert.equal(seedFromStart(f, { at: 2 }), 0, "한 번만");
  f.emo["민지>{{user}}"].tags.affection = 9; seedFromStart(f); assert.equal(f.emo["민지>{{user}}"].tags.affection, 9, "낮추지 않음");
  assert.equal(stageOf(f, "민지", "{{user}}", 1).stage, "close");
});

test("관계 연표: 이미 아는 사이로 시작한 쌍은 ‘처음 만남’ 대신", () => {
  const f = { start: { "{{user}}|민지": { a: "민지", b: "{{user}}", level: "close", q: "3년째", at: 1 } }, romance: { firsts: { met: {} }, events: [] } };
  const tl = timeline(f, "민지", "{{user}}");
  assert.equal(tl[0].kind, "known"); assert.match(eventText(tl[0]), /이미 아는 사이로 시작 · “3년째”/);
});
