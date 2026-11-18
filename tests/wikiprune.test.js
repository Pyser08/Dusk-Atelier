import test from "node:test";
import assert from "node:assert/strict";
import { pruneWiki, similar, importance } from "../src/engine/wikiprune.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";
import { createBlankPerson } from "../src/engine/wikiedit.js";
import { addRecord } from "../src/engine/personrecords.js";

test("알고 있는 정보: 상한을 넘으면 중요도 낮은 것부터 지운다", async () => {
  let w = createEmptyWikiScope({ characterId: "c", chatKey: "t" }); w = createBlankPerson(w, "수아");
  const doc = Object.values(w.documents).find((d) => d.title === "수아");
  for (let i = 0; i < 40; i++) w = addRecord(w, doc.id, { group: "knowledge", text: i === 3 ? "미오의 여동생 이름은 하린이다" : `사소한 이야기 ${"가나다라마바사아자차카타파하"[i % 14]}${i}번째 메모` });
  // 기록기가 쓴 것처럼(직접 쓴 항목은 지우지 않으므로) — 마지막 하나만 직접 쓴 것으로 둔다
  w.documents[doc.id].sections.forEach((x, i, a) => { if (x.provenance?.slotId === "core.knowledge" && i < a.length - 1) x.provenance = { ...x.provenance, manualEdited: false, entryRef: `entry:rp-${i}`, evidenceRefs: ["source:rp"] }; });
  const all = w.documents[doc.id].sections.filter((s) => s.provenance?.slotId === "core.knowledge"), id3 = all[3].id, idLast = all.at(-1).id;
  const r = pruneWiki(w, { "core.knowledge": 30 });
  const left = r.wiki.documents[doc.id].sections.filter((s) => s.provenance?.slotId === "core.knowledge");
  assert.equal(left.length, 30); assert.equal(r.removed.length, 10);
  assert.ok(left.some((s) => s.id === id3), "중요한 오래된 정보는 남김");
  assert.ok(left.some((s) => s.id === idLast), "최근 것은 남김");
});
test("비슷한 글 판단·점수", () => {
  assert.ok(similar("미오는 고양이를 좋아한다", "미오는 고양이를 좋아한다.") > 0.9);
  assert.ok(importance({ body: "약속: 주말에 바다에 가기로 했다" }, 0, 10) > importance({ body: "음" }, 0, 10));
});
