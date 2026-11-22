// 11-22 제보: 직접 하지 않았거나 관여하지 않은 일(다른 주요 인물이 한 행동)까지 내 캐릭터의 기억에 기록됨
import test from "node:test";
import assert from "node:assert/strict";
import { othersAct } from "../src/engine/actowner.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";

test("다른 인물이 주어인 행동이면서 이 인물이 안 나오면 남의 행동", () => {
  const names = ["세라", "카엘", "{{user}}"];
  assert.equal(othersAct({ name: "{{user}}", act: "세라가 카엘의 뺨을 때렸다" }, names, ["Jade", "제이드"]), true);
  assert.equal(othersAct({ name: "{{user}}", act: "세라에게 꽃을 건넸다" }, names), false, "주어가 아님");
  assert.equal(othersAct({ name: "{{user}}", act: "세라가 제이드에게 고백했다" }, names, ["제이드"]), false, "이 인물이 관여함");
  assert.equal(othersAct({ name: "카엘", act: "카엘은 칼을 뽑았다" }, names), false);
  assert.equal(othersAct({ name: "카엘", act: "세라는 카엘을 감쌌다" }, names), false, "카엘이 관여");
  assert.equal(othersAct({ name: "카엘", act: "세라는 혼자 시장에 갔다" }, names), true);
});

test("applyAnalysis가 남의 행동을 다른 인물 기억에 쌓지 않음", () => {
  const f = { people: {}, scenes: [] };
  applyAnalysis(f, { people: [{ name: "카엘", act: "세라는 혼자 시장에 갔다", p: 2, s: 2, r: 2 }, { name: "세라", act: "세라는 혼자 시장에 갔다", p: 2, s: 2, r: 2 }], scene: { sum: "x", who: ["세라", "카엘"] } }, { at: 1, mid: "m1", h: "h1" });
  assert.equal((f.people["카엘"]?.records ?? []).length, 0);
  assert.equal(f.people["세라"].records.length, 1);
});
