import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";
import { createBlankPerson } from "../src/engine/wikiedit.js";
import { addRecord, editRecord, removeRecord } from "../src/engine/personrecords.js";
import { editSectionText } from "../src/engine/personedit.js";

// 저장된 위키는 표준 형태로 다듬기 전 값(예: 필드 순서·남는 키)을 가질 수 있다 → 고치기·지우기가 ‘편집 중 항목이 갱신’으로 막히면 안 된다
const scope = () => {
  let w = createEmptyWikiScope({ characterId: "c", chatKey: "t" }); w = createBlankPerson(w, "수아");
  const d = Object.values(w.documents)[0]; w = addRecord(w, d.id, { group: "knowledge", text: "고양이를 좋아한다" });
  const sec = w.documents[d.id].sections.at(-1);
  sec.provenance = { ...sec.provenance, manualEdited: false };   // 다듬으면 사라지는 값
  return { w, d, sec };
};
test("다듬기 전 값이 섞여 있어도 고치기가 된다(editRecord·editSectionText)", () => {
  const { w, d, sec } = scope();
  const a = editRecord(w, d.id, sec.id, "강아지를 좋아한다");
  assert.equal(a.documents[d.id].sections.find((x) => x.id === sec.id).body, "강아지를 좋아한다");
  const b = editSectionText(w, d.id, sec.id, "새를 좋아한다");
  assert.equal(b.documents[d.id].sections.find((x) => x.id === sec.id).body, "새를 좋아한다");
});
test("다듬기 전 값이 섞여 있어도 지우기가 된다", () => {
  const { w, d, sec } = scope();
  const r = removeRecord(w, d.id, sec.id);
  assert.ok(!r.documents[d.id].sections.some((x) => x.id === sec.id));
});
