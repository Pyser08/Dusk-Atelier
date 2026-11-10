import test from "node:test";
import assert from "node:assert/strict";
import { healDeps, missingDeps, depState } from "../src/engine/settingdeps.js";

const base = (over = {}) => ({
  sexualDesireEnabled: false, relationshipOnlyMode: true, relationshipPerceptionMode: "light",
  features: { openness: { enabled: false, cycle: false, cycleRate: 1 }, perception: { enabled: true, mode: "on" } }, ...over,
});

test("월경·임신 기록을 켜면 필요한 설정(욕구 기록·인물 상태 기록)이 함께 켜진다", () => {
  const s = base(); s.features.openness.cycle = true;
  assert.deepEqual(missingDeps(s).map((d) => d.id), ["cycle.desire", "cycle.state"]);
  const done = healDeps(s);
  assert.equal(s.sexualDesireEnabled, true);
  assert.equal(s.relationshipPerceptionMode, "on");
  assert.equal(done.length, 2);
  assert.deepEqual(missingDeps(s), []);
});

test("월경·임신 기록이 꺼져 있으면 아무것도 바꾸지 않는다", () => {
  const s = base(), before = JSON.stringify(s);
  assert.deepEqual(healDeps(s), []);
  assert.equal(JSON.stringify(s), before);
});

test("서사관계 전용 모드가 꺼져 있으면 인지·정체 인식 값은 건드리지 않는다", () => {
  const s = base({ relationshipOnlyMode: false, sexualDesireEnabled: true }); s.features.openness.cycle = true;
  assert.deepEqual(healDeps(s), []);
  assert.equal(s.relationshipPerceptionMode, "light");
});

test("이미 맞춰져 있으면 다시 고치지 않는다(매 응답 호출해도 안전)", () => {
  const s = base(); s.features.openness.cycle = true;
  healDeps(s);
  assert.deepEqual(healDeps(s), []);
});

test("depState: 켜져 있고 조건이 다 맞으면 working, 빠진 것이 있으면 blocked와 이유", () => {
  const s = base(); s.features.openness.cycle = true;
  const st = depState("cycle", s);
  assert.equal(st.state, "blocked");
  assert.ok(st.missing.length === 2 && st.missing.every((m) => typeof m.label === "string" && m.label));
  healDeps(s);
  assert.equal(depState("cycle", s).state, "working");
  s.features.openness.cycle = false;
  assert.equal(depState("cycle", s).state, "off");
});

test("빠진 칸(features 없음)에도 오류 없이 동작한다", () => {
  assert.deepEqual(healDeps({}), []);
  assert.deepEqual(missingDeps(null), []);
});
