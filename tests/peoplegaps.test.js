import test from "node:test";
import assert from "node:assert/strict";
import { gapsOf, fillPlan, planLine, isFullyEmpty } from "../src/engine/peoplegaps.js";

const doc = (id, title, { body = "", metrics = [] } = {}) => ({ id, title, type: "Character", sections: body ? [{ id: "s", heading: "개요", body }] : [], metrics: metrics.map((slotId) => ({ slotId })) });
const scope = (docs, profiles = {}) => ({ documents: Object.fromEntries(docs.map((d) => [d.id, d])), people: { profiles } });

test("수치가 없어도 본문·성격이 있는 인물은 '완전히 빈 인물'이 아니다", () => {
  const d = doc("a", "유우카", { body: "회계 담당" });
  const s = scope([d], { a: { summary: "꼼꼼함", coreTraits: [], values: [] } });
  const g = gapsOf(s, d);
  assert.equal(g.body, false); assert.equal(g.profile, false); assert.deepEqual(g.metrics, ["affinity.score", "affinity.taste_band", "openness.score"]);
  assert.equal(isFullyEmpty(g), false);
});
test("채우기 계획: 수치만 빈 인물은 수치만, 본문·성격까지 빈 인물은 전체, 다 찬 인물은 제외", () => {
  const full = doc("a", "노아"), onlyM = doc("b", "유우카", { body: "글" }), done = doc("c", "호시노", { body: "글", metrics: ["affinity.score", "affinity.taste_band", "openness.score"] });
  const s = scope([full, onlyM, done], { b: { summary: "성격", coreTraits: [] }, c: { summary: "성격", coreTraits: [] } });
  const p = fillPlan(s, [full, onlyM, done]);
  assert.deepEqual(p.full.map((x) => x.doc.title), ["노아"]);
  assert.deepEqual(p.metricOnly.map((x) => x.doc.title), ["유우카"]);
  assert.equal(p.total, 2);
  assert.match(planLine(p.metricOnly[0]), /수치 3칸\(호감도·첫인상·음란도\)만 채움, 본문·성격은 그대로/);
  assert.match(planLine(p.full[0]), /전체를 새로 채움/);
});
test("일부 수치만 비어 있으면 그 칸만 센다", () => {
  const d = doc("a", "노아", { body: "글", metrics: ["affinity.score"] });
  const g = gapsOf(scope([d], { a: { summary: "성격" } }), d);
  assert.deepEqual(g.metrics, ["affinity.taste_band", "openness.score"]);
});
