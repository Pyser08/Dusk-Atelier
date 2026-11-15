// 2.2.0 작업실 개요: 최근 연 것·고정 목록 계산
import test from "node:test";
import assert from "node:assert/strict";
import { pushRecent, togglePin, WORK_GROUPS } from "../src/ui/screens/workhome.js";

test("최근: 앞으로 올리고 중복 없이 8개, 개요·홈은 빼요", () => {
  let l = [];
  for (const id of ["provider", "tools", "provider", "work-home", "home"]) l = pushRecent(l, id, 1);
  assert.deepEqual(l.map((r) => r.id), ["provider", "tools"]);
  for (let i = 0; i < 12; i++) l = pushRecent(l, `t${i}`);
  assert.equal(l.length, 8);
});
test("고정: 누르면 넣고 다시 누르면 빼요", () => {
  assert.deepEqual(togglePin(togglePin([], "tools"), "dev"), ["tools", "dev"]);
  assert.deepEqual(togglePin(["tools", "dev"], "tools"), ["dev"]);
  assert.deepEqual(togglePin(undefined, "x"), ["x"]);
});
test("묶음 4개가 작업실 탭을 겹치지 않게 나눠요", () => {
  const ids = WORK_GROUPS.flatMap((g) => g.ids);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(WORK_GROUPS.length, 4);
});

import { effectiveProfile, dailyCosts } from "../src/ui/screens/provider/glance.js";
test("프로바이더 한눈에: 용도가 실제로 쓰는 프로필(지정 → 보조 → 메인)", () => {
  const cfg = { purposes: { main: { profileId: "m" }, translate: { profileId: "t" }, memory: { profileId: "" } }, subProfileId: "s" };
  assert.equal(effectiveProfile(cfg, "translate"), "t");
  assert.equal(effectiveProfile(cfg, "memory"), "s");
  assert.equal(effectiveProfile({ ...cfg, subProfileId: "" }, "memory"), "m");
  assert.equal(effectiveProfile(cfg, "main"), "m");
});
test("프로바이더 한눈에: 14일 날짜별 비용, 빈 날은 0", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  const log = [{ d: "2026-11-14", cost: 1, input: 0, output: 0, cached: 0, saved: 0 }, { d: "2026-11-10", cost: 2, input: 0, output: 0, cached: 0, saved: 0 }, { d: "2026-10-01", cost: 9, input: 0, output: 0, cached: 0, saved: 0 }];
  const d = dailyCosts(log, 14, now);
  assert.equal(d.length, 14);
  assert.equal(d.at(-1).cost, 1);
  assert.equal(d.find((x) => x.d === "2026-11-10").cost, 2);
  assert.equal(d.reduce((a, x) => a + x.cost, 0), 3);
});

import { aibotStep } from "../src/ui/screens/aibotsteps.js";
test("AI로 봇 만들기: 단계 계산", () => {
  assert.equal(aibotStep({ name: "", way: "blank" }), 0);
  assert.equal(aibotStep({ name: "마녀", way: "blank" }), 2);
  assert.equal(aibotStep({ name: "", way: "edit", botId: "" }), 1);
  assert.equal(aibotStep({ name: "", way: "edit", botId: "x" }), 2);
  assert.equal(aibotStep({ way: "workshop" }), 2);
});
