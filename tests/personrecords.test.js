import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyWikiScope, createWikiDocument } from "../src/engine/pot/wiki-schema.js";
import { addRecord, editRecord, removeRecord, listRecords, recordGroupOf, targetCandidates, checkEmotionText } from "../src/engine/personrecords.js";

function base() {
  let s = createEmptyWikiScope({ characterId: "c1", chatKey: "chat1" });
  s = createWikiDocument(s, { type: "Character", title: "시로코", sections: [] });
  s = createWikiDocument(s, { type: "Character", title: "호시노", sections: [] });
  const [a, b] = Object.values(s.documents).map((d) => d.id);
  return { s, a, b };
}
test("비밀 항목을 직접 추가·고치기·지우기", () => {
  const { s, a } = base();
  const s1 = addRecord(s, a, { group: "secret", text: "사실은 은행을 노렸다." });
  const list = listRecords(s1.documents[a], s1);
  assert.equal(list[0].group, "secret"); assert.equal(list[0].items.length, 1);
  const id = list[0].items[0].id;
  const s2 = editRecord(s1, a, id, "사실은 계획이 없었다.");
  assert.equal(s2.documents[a].sections[0].body, "사실은 계획이 없었다.");
  const s3 = removeRecord(s2, a, id);
  assert.equal(s3.documents[a].sections.length, 0);
});
test("NPC 감정은 다른 인물을 대상으로, 형식을 지켜야 한다", () => {
  const { s, a, b } = base();
  assert.throws(() => addRecord(s, a, { group: "emotion", targetRef: "", text: "[서운함] 이유" }), /대상/);
  assert.throws(() => addRecord(s, a, { group: "emotion", targetRef: a, text: "[서운함] 이유" }), /대상/);
  assert.throws(() => addRecord(s, a, { group: "emotion", targetRef: b, text: "그냥 글" }), /형식|감정/);
  const s1 = addRecord(s, a, { group: "emotion", targetRef: b, text: "[서운함, 질투] 선생이 다른 학생만 챙겨서" });
  const g = listRecords(s1.documents[a], s1).find((x) => x.group === "emotion");
  assert.equal(g.items[0].target, "호시노");
  assert.equal(recordGroupOf(s1.documents[a].sections[0]), "emotion");
  assert.throws(() => addRecord(s1, a, { group: "emotion", targetRef: b, text: "[기쁨] 또" }), /이미/);
});
test("후보는 자기 자신을 뺀 인물, 감정 형식 검사", () => {
  const { s, a } = base();
  assert.equal(targetCandidates(s, a).length, 1);
  assert.equal(checkEmotionText("[기쁨] 이유"), "");
  assert.match(checkEmotionText("그냥"), /형식/);
});

import { makeTools } from "../src/data/memorytools.js";
test("makeTools에 수동 Writer가 들어 있고 처음 상태는 idle이다", () => {
  const rt = { settings: { snapshot: () => ({ enabled: true }), status: () => ({}) }, keys: {}, wiki: { status: () => ({}), snapshot: () => null }, trace: null, auto: null };
  const t = makeTools({ api: {}, rt, sourceLibrary: {}, llmCall: async () => "" });
  assert.equal(t.writer.status().phase, "idle");
  assert.equal(t.writer.status().hasSource, false);
  t.writer.editSource("본문", "입력"); assert.equal(t.writer.status().hasSource, true);
  assert.equal(t.busy(), false);
  assert.doesNotThrow(() => t.dispose());
});
