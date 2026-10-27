import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyWikiScope, createWikiDocument } from "../src/engine/pot/wiki-schema.js";
import { updatePersonMetric } from "../src/engine/pot/people-records.js";
import { editMetricValue, metricPinKey, editSectionText, setPin, isPinned, sectionPinKey, isPaused, setPaused } from "../src/engine/personedit.js";
import { wikiNote, stateOf } from "../src/engine/personview.js";

function scopeWithPerson() {
  const base = createEmptyWikiScope({ characterId: "c1", chatKey: "chat1" });
  const scope = createWikiDocument(base, { type: "Character", title: "시로코", sections: [{ id: "sec1", heading: "지금 상태", body: "졸린 얼굴로 선생을 기다린다.", provenance: { kind: "manual" } }] });
  return { scope, id: Object.keys(scope.documents)[0] };
}

test("✎ 절 본문 고치기: 새 범위에 반영되고 원본은 그대로다", () => {
  const { scope, id } = scopeWithPerson();
  const sec = scope.documents[id].sections[0];
  const next = editSectionText(scope, id, sec.id, "활기차게 선생을 맞이한다.");
  assert.equal(next.documents[id].sections[0].body, "활기차게 선생을 맞이한다.");
  assert.equal(scope.documents[id].sections[0].body, "졸린 얼굴로 선생을 기다린다.");
});
test("📌 고정한 항목은 고칠 수 없고, 해제하면 다시 고칠 수 있다", () => {
  const { scope, id } = scopeWithPerson();
  const sec = scope.documents[id].sections[0], key = sectionPinKey(sec.id);
  const pinned = setPin(scope, id, key, true);
  assert.equal(isPinned(pinned, id, key), true);
  assert.throws(() => editSectionText(pinned, id, sec.id, "바뀐 글"), /고정/);
  const free = setPin(pinned, id, key, false);
  assert.equal(isPinned(free, id, key), false);
  assert.equal(editSectionText(free, id, sec.id, "바뀐 글").documents[id].sections[0].body, "바뀐 글");
});
test("없는 항목은 고치지 않고 알려 준다", () => {
  const { scope, id } = scopeWithPerson();
  assert.throws(() => editSectionText(scope, id, "없는-id", "x"), /찾지 못했어요/);
});
test("⏸ 이 인물만 기록 쉬기: 이름·별칭 모두 제외 목록에서 켜고 끈다", () => {
  const p = { name: "Hoshino", aliases: ["호시노"] };
  assert.equal(isPaused(["호시노"], p), true);
  assert.equal(isPaused(["시로코"], p), false);
  assert.deepEqual(setPaused(["시로코"], p, true), ["시로코", "Hoshino"]);
  assert.deepEqual(setPaused(["시로코", "Hoshino", "호시노"], p, false), ["시로코"]);
});
test("stateOf는 고칠 항목의 id를 내어 주고, wikiNote는 한 줄을 잘라 보여 준다", () => {
  const doc = { id: "d1", type: "Character", title: "시로코", metrics: [{ id: "m1", slotId: "affinity.score", value: 3, minimum: 0, maximum: 10 }], sections: [{ id: "s1", heading: "관계", body: "x".repeat(300), provenance: { slotId: "core.relationship" } }] };
  const st = stateOf(doc);
  assert.equal(st.docId, "d1"); assert.equal(st.meters[0].metricId, "m1"); assert.equal(st.texts[0].sectionId, "s1");
  const note = wikiNote({ documents: { d1: doc } }, "시로코");
  assert.ok(note.endsWith("…") && note.length <= 161);
  assert.equal(wikiNote({ documents: { d1: doc } }, "없는사람"), "");
});

const POLICY = { minimum: 0, maximum: 10, stage_ceilings: [4, 10], stage_labels: ["낮음", "높음"] };
function scopeWithMetric() {
  const { scope, id } = scopeWithPerson();
  const key = `${scope.scope.characterId}\n${scope.scope.chatKey}`;
  const withMetric = updatePersonMetric(scope, id, { isNew: true, id: "m1", slotId: "openness.score", targetRefs: [], value: 3, reason: "시험", expected: null, scopeKey: key }, POLICY);
  return { scope: withMetric, id };
}
test("수치 ✎: 고정된 수치도 덮어쓰고, 고정은 그대로 남는다 (사용자 결정 2026-10-28)", () => {
  const { scope, id } = scopeWithMetric();
  const key = metricPinKey("m1");
  const pinned = setPin(scope, id, key, true);
  const next = editMetricValue(pinned, id, "m1", 8, "직접 올림", POLICY);
  const m = next.documents[id].metrics.find((x) => x.id === "m1");
  assert.equal(m.value, 8);
  assert.equal(m.reason, "직접 올림");
  assert.equal(isPinned(next, id, key), true);
  assert.equal(pinned.documents[id].metrics[0].value, 3);
});
test("수치 ✎: 고정 안 된 수치는 고정 없이 바뀌고, 범위 밖·정책 없음은 거절한다", () => {
  const { scope, id } = scopeWithMetric();
  const next = editMetricValue(scope, id, "m1", 5, "", POLICY);
  assert.equal(next.documents[id].metrics[0].value, 5);
  assert.equal(next.documents[id].metrics[0].reason, "사용자 직접 수정");
  assert.equal(isPinned(next, id, metricPinKey("m1")), false);
  assert.throws(() => editMetricValue(scope, id, "m1", 11, "x", POLICY), /점수는/);
  assert.throws(() => editMetricValue(scope, id, "m1", 5, "x", null), /직접 고칠 수 없어요/);
  assert.throws(() => editMetricValue(scope, id, "없는수치", 5, "x", POLICY), /찾지 못했어요/);
});
