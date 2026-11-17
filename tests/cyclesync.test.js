import test from "node:test";
import assert from "node:assert/strict";
import { applyCycleEvents } from "../src/data/cyclesync.js";
import { cycleFrom } from "../src/engine/recorder.js";
import { parseCycleBody, formatCycleBody, CYCLE_HEADING } from "../src/engine/pot/cycle-tracking.js";

const scopeWith = (st) => ({ revision: 1, documents: { d: { id: "d", type: "Character", title: "민지", aliases: [], sections: [{ id: "s", heading: CYCLE_HEADING, body: formatCycleBody(st) }] } } });

test("생리 시작이 보이면 그날을 기준일로, 이미 생리 기간이면 그대로", () => {
  const sc = scopeWith({ length: 28, start: "2026-03-01", date: "2026-03-15", conception: "", partner: "", known: false, birth: "" });
  const r = applyCycleEvents(sc, [{ name: "민지", period: true }]);
  assert.deepEqual(r.changed, ["민지"]);
  assert.equal(parseCycleBody(r.scope.documents.d.sections[0].body).start, "2026-03-15");
  const same = scopeWith({ length: 28, start: "2026-03-13", date: "2026-03-15", conception: "", partner: "", known: false, birth: "" });
  assert.equal(applyCycleEvents(same, [{ name: "민지", period: true }]).changed.length, 0);
});

test("유산이 보이면 임신을 지우고 새 주기", () => {
  const sc = scopeWith({ length: 28, start: "2026-01-01", date: "2026-03-15", conception: "2026-01-15", partner: "도윤", known: true, birth: "" });
  const st = parseCycleBody(applyCycleEvents(sc, [{ name: "민지", loss: true }]).scope.documents.d.sections[0].body);
  assert.equal(st.conception, ""); assert.equal(st.start, "2026-03-15");
});

test("기록기 줄: period·loss·outside(다섯 번에 한 번만 피임 안 함)", () => {
  const r = cycleFrom("woman|민지\nperiod|민지\nloss|수아\nsex|민지|도윤|outside", [{ name: "민지" }, { name: "수아" }], () => 0.9);
  assert.equal(r[0].period, true); assert.equal(r[0].sex[0].contraception, "used");
  assert.equal(r[1].loss, true);
  assert.equal(cycleFrom("sex|민지|도윤|outside", [{ name: "민지" }], () => 0.1)[0].sex[0].contraception, "none");
});

test("women| 줄: 이름들로 여성 표시, none이면 아무도 없음", () => {
  const r = cycleFrom("women|민지, 수아\nsex|민지|도윤|none", [{ name: "민지" }, { name: "수아" }]);
  assert.deepEqual(r.map((x) => x.name), ["민지", "수아"]);
  assert.equal(cycleFrom("women|none", []).length, 0);
});
