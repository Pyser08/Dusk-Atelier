import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUserNames, USER } from "../src/engine/memoryuser.js";
import { SYSTEM_PROMPT } from "../src/engine/memoryprompt.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";

test("분석 지침에 {{user}} = 나(플레이어)라고 분명히 적혀 있다", () => {
  assert.ok(/\{\{user\}\} is the player/.test(SYSTEM_PROMPT)); assert.ok(SYSTEM_PROMPT.includes('"{{user}}"'));
});
test("페르소나 이름·user·유저·플레이어 → {{user}}로 통일 (사람·관계·감정·장면·아는 사람)", () => {
  const r = { people: [{ name: "Sensei", act: "a" }, { name: "유저", act: "b" }, { name: "호시노", act: "c", know: ["user", "호시노"] }],
    rel: [{ from: "호시노", to: "sensei", d: "x" }], emo: [{ from: "호시노", to: "Player", t: { trust: 1 }, why: "y" }], scene: { who: ["Sensei", "호시노"] } };
  const n = normalizeUserNames(r, ["Sensei"]);
  assert.deepEqual(n.people.map((p) => p.name), [USER, USER, "호시노"]);
  assert.deepEqual(n.people[2].know, [USER, "호시노"]);
  assert.equal(n.rel[0].to, USER); assert.equal(n.emo[0].to, USER); assert.deepEqual(n.scene.who, [USER, "호시노"]);
  assert.equal(r.people[0].name, "Sensei");   // 원본은 그대로
});
test("반영: 페르소나 이름으로 와도 {{user}} 한 사람으로 쌓인다", () => {
  const folder = { people: {}, scenes: [], rel: {}, open: [] };
  applyAnalysis(folder, { people: [{ name: "Sensei", act: "인사함", p: 1, s: 1, r: 1 }] }, { at: 1, mid: "m1", h: "h1" }, { userNames: ["Sensei"] });
  applyAnalysis(folder, { people: [{ name: "{{user}}", act: "떠남", p: 2, s: 2, r: 1 }] }, { at: 2, mid: "m2", h: "h2" }, { userNames: ["Sensei"] });
  const keys = Object.keys(folder.people); assert.deepEqual(keys, ["{{user}}"]); assert.equal(folder.people["{{user}}"].records.length, 2);
});
