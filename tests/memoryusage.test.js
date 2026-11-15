import test from "node:test";
import assert from "node:assert/strict";
import { usageOf, injectLine } from "../src/engine/memoryusage.js";

const folder = {
  people: {
    a: { name: "서연", records: [{ id: "r1" }, { id: "r2", digested: true }, { id: "r3" }, { id: "r4", orphan: true }] },
    b: { name: "지호", records: [{ id: "r5" }, { id: "r6" }] }
  }
};

test("기록을 넣음·요약·예산 제한·관련 없음으로 센다(고아 기록 제외)", () => {
  const u = usageOf(folder, { recordIds: ["r1"], excluded: [{ name: "지호", reason: "budget" }] });
  assert.deepEqual(u, { total: 5, used: 1, digested: 1, unrelated: 1, budget: 2 });
});

test("요청이 없으면 전부 관련 없음", () => {
  const u = usageOf(folder, null);
  assert.equal(u.unrelated, 4);
  assert.equal(u.used, 0);
});

test("상태 줄 문구", () => {
  assert.match(injectLine(null, "19:18", ""), /아직 요청/);
  assert.equal(injectLine({ injected: true, manifest: { recordIds: ["a", "b", "c"] } }, "19:18", ""), "마지막 요청 19:18 · 기억 3건을 넣었어요");
  assert.match(injectLine({ injected: false }, "19:18", "기록이 없어요"), /넣지 않았어요 \(기록이 없어요\)/);
});

// 2.1.9 제보: excluded에는 never(끔)·not-relevant(장면 밖)·budget(예산)이 섞여 들어온다 — 예산 제한은 budget만 센다.
test("끔·장면 밖 인물의 기록은 예산 제한이 아니라 관련 없음", () => {
  const u = usageOf(folder, { recordIds: [], excluded: [{ name: "서연", reason: "never" }, { name: "지호", reason: "not-relevant" }] });
  assert.deepEqual(u, { total: 5, used: 0, digested: 1, unrelated: 4, budget: 0 });
});
test("budget 이유만 예산 제한, 이유가 없는 옛 기록은 예전처럼 예산 제한", () => {
  assert.equal(usageOf(folder, { excluded: [{ name: "지호", reason: "budget" }] }).budget, 2);
  assert.equal(usageOf(folder, { excluded: [{ name: "지호" }] }).budget, 2);
});
test("포함된 인물의 깎인 기록(trimmedIds)은 예산 제한으로 센다", () => {
  const u = usageOf(folder, { recordIds: ["r1"], trimmedIds: ["r3", "r5"], excluded: [] });
  assert.deepEqual(u, { total: 5, used: 1, digested: 1, unrelated: 1, budget: 2 });
});
