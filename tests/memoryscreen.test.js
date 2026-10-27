import test from "node:test";
import assert from "node:assert/strict";
import { applyLevel, levelOf, levelPatch, summaryOf, needsOf, FEATURE_IDS } from "../src/engine/trackpreset.js";
import { findDoc, stateOf, timelineOf, countsOf, filterTimeline } from "../src/engine/personview.js";
import { stepsOf } from "../src/engine/flowsteps.js";

const feats = () => levelPatch("basic");

test("추적 수준: 프리셋을 적용하면 같은 수준으로 인식된다", () => {
  for (const l of ["light", "basic", "full"]) assert.equal(levelOf(applyLevel(feats(), l)), l);
  const f = applyLevel(feats(), "basic"); f.suspicion.enabled = false;
  assert.equal(levelOf(f), "custom");
  assert.deepEqual(FEATURE_IDS.map((id) => applyLevel(feats(), "light")[id].enabled), [true, true, false, false, false, false]);
});
test("추적 수준: 세부값(증감량)은 덮지 않는다", () => {
  const f = feats(); f.affinity.increase = 3;
  assert.equal(applyLevel(f, "full").affinity.increase, 3);
});
test("기능 카드 요약과 의존 안내", () => {
  assert.match(summaryOf("affinity", { enabled: true, numbers: true, increase: 2, decrease: 1 }), /숫자 표시 · 한 번에 \+2 \/ -1/);
  assert.equal(summaryOf("rhythm", { enabled: false }), "꺼져 있어요");
  const s = { features: { openness: { enabled: true, cycle: true } }, sexualDesireEnabled: false };
  const n = needsOf("openness", s); assert.equal(n.length, 1); n[0].fix(s); assert.equal(s.sexualDesireEnabled, true); assert.equal(needsOf("openness", s).length, 0);
});

const metric = (slotId, value, lastDelta = 1) => ({ id: slotId, slotId, targetRefs: [], contextKey: null, value, minimum: -10, maximum: 10, stageIndex: 0, stageLabel: "", status: "ok", lastDelta, baseDelta: lastDelta, updatedAt: "", evidenceRefs: [], reason: "", requestRef: "", contributions: [] });
const wiki = { documents: [
  { id: "d1", type: "Character", title: "유우카", aliases: ["Yuuka"], metrics: [metric("affinity.score", 4), metric("suspicion.score", 1, -1)], sections: [{ heading: "관계", body: "선생님이라 부른다", provenance: { slotId: "core.relationship" } }, { heading: "x", body: "", provenance: { slotId: "core.speech" } }], updatedAt: "2026-10-28T00:00:00Z" },
  { id: "d2", type: "Location", title: "게헨나", aliases: [], metrics: [], sections: [] }],
  history: [{ id: "h1", at: "2026-10-28T01:00:00Z", action: "update", documentId: "d1", summary: "호감 +1" }, { id: "h2", at: "2026-10-28T02:00:00Z", action: "update", documentId: "dX", summary: "다른 문서" }] };

test("인물 문서 찾기(이름·별칭)와 상태 카드", () => {
  assert.equal(findDoc(wiki, { name: "Yuuka" })?.id, "d1");
  assert.equal(findDoc(wiki, { name: "게헨나" }), null, "Character 문서만");
  assert.equal(findDoc(null, { name: "유우카" }), null);
  const st = stateOf(findDoc(wiki, { name: "유우카" }));
  assert.deepEqual(st.meters.map((m) => [m.label, m.value, m.delta]), [["호감", 4, 1], ["의심", 1, -1]]);
  assert.deepEqual(st.texts.map((t) => t.label), ["관계·호칭"], "빈 본문은 숨김");
});
test("타임라인: 사건·관계·상태·약속을 시간순으로 합치고 거른다", () => {
  const person = { name: "유우카", aliases: [], records: [{ id: "r1", act: "시험 준비", g: "B", at: 3, at_ms: Date.parse("2026-10-28T00:30:00Z") }, { id: "r2", act: "고아", orphan: true, at_ms: 1 }] };
  const folder = { wiki, rels: { a: { from: "유우카", to: "선생님", items: [{ d: "신뢰가 깊어짐", dir: "+", at: 4, at_ms: Date.parse("2026-10-28T03:00:00Z") }] }, b: { from: "노아", to: "미유", items: [{ d: "무관", at_ms: 5 }] } }, open: [{ id: "o1", text: "예산 보고 약속", kind: "promise", who: ["유우카"], at_ms: Date.parse("2026-10-28T04:00:00Z"), closed: false }, { id: "o2", text: "닫힌 것", who: ["유우카"], closed: true }] };
  const tl = timelineOf(folder, person, findDoc(wiki, person));
  assert.deepEqual(tl.map((x) => x.kind), ["event", "state", "rel", "open"]);
  assert.deepEqual(countsOf(tl), { all: 4, event: 1, state: 1, rel: 1, open: 1 });
  assert.equal(filterTimeline(tl, "state")[0].text, "호감 +1");
  assert.equal(filterTimeline(tl, "all").length, 4);
});
test("진행 점: 꺼짐·빠른 모드·정확하게", () => {
  assert.ok(stepsOf({ on: false }).every((s) => s.state === "wait"));
  const fast = stepsOf({ on: true, mode: "fast", last: { at: 1, focus: ["유우카"], director: "idle" }, inject: { injected: true }, session: { calls: 2 } });
  assert.deepEqual(fast.map((s) => s.state), ["done", "done", "skip", "done", "done"]);
  const acc = stepsOf({ on: true, mode: "accurate", last: { at: 1, focus: [], director: "ready" }, inject: { injected: false } });
  assert.deepEqual(acc.map((s) => s.state), ["done", "skip", "done", "skip", "wait"]);
});
