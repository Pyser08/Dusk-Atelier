import test from "node:test";
import assert from "node:assert/strict";
import { advanceNow, clockOf } from "../src/engine/scenenow.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { sceneOf } from "../src/engine/scenepanel.js";
test("#19 같은 장면이 이어져도 시간이 흐른다", () => {
  const f = { people: {}, scenes: [], open: [], rels: {} };
  const go = (at, when, changed, storyDate = "") => applyAnalysis(f, { people: [], scene: { sum: "s", facts: [], place: "방", when, who: [], changed } }, { at, mid: "m" + at, h: "h" + at }, { storyDate });
  go(1, "20:00", true, "2026-03-02"); go(3, "21:30", false);
  assert.equal(f.scenes.length, 1); assert.equal(f.scenes[0].when, "2026-03-02 20:00");
  let s = sceneOf("", f); assert.deepEqual([s.date, s.time], ["2026-03-02", "21:30"]);
  go(5, "", false); assert.equal(sceneOf("", f).time, "21:30", "시각이 없으면 그대로");
  go(7, "10:00", false); assert.equal(sceneOf("", f).time, "21:30", "회상으로 뒤로 가지 않음");
  go(9, "아침 8시", false, "2026-03-03"); s = sceneOf("", f); assert.deepEqual([s.date, s.time], ["2026-03-03", "08:00"], "날짜도 넘어감");
});
test("#19 자정 넘김·한국어 시각", () => {
  const s = { when: "2026-03-02 23:50" }; assert.ok(advanceNow(s, "00:30")); assert.equal(s.nowWhen, "2026-03-02 00:30");
  assert.equal(clockOf("밤 9시 반"), "21:30"); assert.equal(clockOf("오후 3시"), "15:00"); assert.equal(clockOf("14시 5분"), "14:05"); assert.equal(clockOf("저녁"), "19:00"); assert.equal(clockOf("밤 2시"), "02:00");
});
