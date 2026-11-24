import test from "node:test";
import assert from "node:assert/strict";
import { stepUserCycle, userCycleState, userCycleSection, userFemale } from "../src/engine/usercycle.js";
import { cycleFrom } from "../src/engine/recorder.js";
import { lifeView } from "../src/engine/nsfwlife.js";
import { userNsfwDoc } from "../src/engine/usernsfw.js";
const g = (x, by = "story") => ({ gender: { "actor:user": { g: x, by } } });
const D = (d) => `[2026년 3월 ${d}일 밤]`;
test("여성이면 시작하고 리롤하면 앞 상태에서 다시, 남성이면 멈춘다", () => {
  const f = g("f"); assert.deepEqual(stepUserCycle(f, { text: D(1) + "a", at: 2 }), ["주기 시작"]);
  const s1 = JSON.stringify(f.userCycle.state);
  assert.deepEqual(stepUserCycle(f, { text: D(1) + "a", at: 2 }), [], "같은 응답은 한 번");
  const rep = { sex: [{ partner: "하루", contraception: "none" }] };
  stepUserCycle(f, { report: rep, text: D(2) + "b", at: 4, random: () => 0 }); assert.equal(f.userCycle.state.conception, "2026-03-02"); assert.match(userCycleSection(f), /모름/);
  stepUserCycle(f, { text: D(2) + "리롤", at: 4 }); assert.equal(f.userCycle.state.conception, ""); assert.equal(f.userCycle.hist.length, 2);
  stepUserCycle(f, { report: { sex: [{ partner: "하루", contraception: "used" }] }, text: D(3), at: 6, random: () => 0 }); assert.equal(f.userCycle.state.conception, "", "피임");
  f.gender["actor:user"].g = "m"; assert.equal(userCycleState(f), null); assert.equal(userCycleSection(f), "");
  assert.ok(s1.includes("2026-03-01"));
});
test("남자·모름은 시작하지 않고, 그 응답에서 바뀌면 바로 시작", () => {
  const f = g("m"); assert.deepEqual(stepUserCycle(f, { text: D(1), at: 2 }), []); assert.ok(!f.userCycle?.state);
  assert.deepEqual(stepUserCycle(f, { text: D(2), at: 4, changes: [{ kind: "sex", name: "{{user}}", g: "f" }] }), ["주기 시작"]);
  assert.equal(userFemale({}), false);
});
test("임신·출산·유산·생리", () => {
  const f = g("f"); stepUserCycle(f, { text: D(1), at: 1 }); stepUserCycle(f, { report: { sex: [{ partner: "x", contraception: "none" }] }, text: D(2), at: 3, random: () => 0 });
  assert.ok(stepUserCycle(f, { report: { known: true }, text: D(20), at: 5 }).includes("임신을 알게 됨")); assert.ok(stepUserCycle(f, { report: { loss: true }, text: D(21), at: 7 }).includes("유산")); assert.equal(userCycleState(f).conception, "");
  stepUserCycle(f, { report: { period: true }, text: D(25), at: 9 }); assert.equal(userCycleState(f).start, "2026-03-25");
  assert.equal(lifeView({ ...f, life: { p: { "actor:user": {} } }, wiki: { documents: {} } }, userNsfwDoc(), 1)?.phase, "period");
});
test("유저 줄은 켰을 때만 읽는다", () => { assert.equal(cycleFrom("women|{{user}}", []).length, 0); assert.equal(cycleFrom("women|{{user}}", [], Math.random, { user: true })[0].name, "{{user}}"); });
