import test from "node:test";
import assert from "node:assert/strict";
import { redirectDuplicateCreates } from "../src/engine/pot-dedupe.js";
import { applyWriterProposalAtomic } from "../src/engine/pot/writer-apply.js";
import * as L from "../src/engine/pot/wiki-schema.js";

const TYPE = { character: "Character" };
const scope = { documents: { d1: { id: "d1", type: "Character", title: "텐도 아리스", aliases: ["아리스"] }, d2: { id: "d2", type: "Character", title: "유즈", aliases: [] } } };
const create = (ref, title, extra = {}) => ({ document_ref: ref, operation: "create", type: "character", title, aliases_add: [], aliases_remove: [], tags_add: [], tags_remove: [], entries: [], ...extra });

test("같은 이름·띄어쓰기만 다른 이름의 새 인물은 기존 문서 갱신으로 바뀐다", () => {
  const r = redirectDuplicateCreates(scope, { documents: [create("n1", "텐도아리스"), create("n2", "하나오카 유즈")] }, TYPE);
  assert.equal(r.proposal.documents[0].operation, "update"); assert.equal(r.proposal.documents[0].title, null);
  assert.equal(r.proposal.documents[1].operation, "create");
  const map = {}; r.link(map); assert.equal(map.n1, "d1"); assert.equal(r.count, 1);
});
test("기존 별칭과 같은 이름도 같은 인물로 본다. 후보의 별칭만 겹치면 합치지 않는다", () => {
  const a = redirectDuplicateCreates(scope, { documents: [create("n1", "아리스")] }, TYPE); assert.equal(a.proposal.documents[0].operation, "update");
  const b = redirectDuplicateCreates(scope, { documents: [create("n1", "새사람", { aliases_add: ["아리스"] })] }, TYPE); assert.equal(b.proposal.documents[0].operation, "create", "별칭끼리 겹침은 합치지 않음");
  const c = redirectDuplicateCreates(scope, { documents: [create("n1", "새사람", { aliases_add: ["유즈"] })] }, TYPE); assert.equal(c.proposal.documents[0].operation, "update", "후보 별칭이 기존 제목과 같으면 같은 사람");
});
test("한 응답 안의 같은 이름은 첫 새 문서에 합친다. 인물이 아니면 건드리지 않는다", () => {
  const r = redirectDuplicateCreates({ documents: {} }, { documents: [create("n1", "미도리"), create("n2", "미도리"), { ...create("n3", "미도리"), type: "event" }] }, TYPE);
  assert.deepEqual(r.proposal.documents.map((d) => d.operation), ["create", "update", "create"]);
  const map = { n1: "docNEW" }; r.link(map); assert.equal(map.n2, "docNEW");
});
test("변경이 없으면 같은 객체를 돌려준다", () => {
  const p = { documents: [create("n1", "처음 보는 사람")] };
  assert.equal(redirectDuplicateCreates(scope, p, TYPE).proposal, p);
});
test("Writer 적용 끝까지: 같은 이름을 create로 보내도 문서가 늘지 않는다", () => {
  const now = "2026-01-01T00:00:00Z";
  const sc = L.createWikiDocument(L.createEmptyWikiScope({ characterId: "c", chatKey: "k", characterName: "봇", chatName: "채팅" }, now), { type: "Character", title: "텐도 아리스", aliases: [], sections: [], tags: [], links: [], metrics: [] }, { now });
  const proposal = { request_ref: "req", schema_version: 1, documents: [create("new1", "텐도 아리스"), create("new2", "텐도아리스")], metric_ops: [], people_ops: [], issues: [] };
  const r = applyWriterProposalAtomic(sc, proposal, { catalog: { documentRefs: {}, documents: {}, entryRefs: {} }, knownCharacterNames: [] }, {});
  assert.deepEqual(Object.values(r.scope.documents).map((x) => x.title), ["텐도 아리스"]);
});
test("같은 제목이 여럿이면 내용이 가장 많은 문서로, 별칭만 겹치는 후보가 여럿이면 합치지 않고 센다", () => {
  const sc = { documents: { a: { id: "a", type: "Character", title: "미도리", aliases: [], sections: [] }, b: { id: "b", type: "Character", title: "미도리", aliases: [], sections: [{}, {}] }, x: { id: "x", type: "Character", title: "철수", aliases: ["별"], sections: [] }, y: { id: "y", type: "Character", title: "영희", aliases: ["별"], sections: [] } } };
  const r = redirectDuplicateCreates(sc, { documents: [create("n1", "미도리"), create("n2", "별")] }, TYPE);
  const map = {}; r.link(map); assert.equal(map.n1, "b");
  assert.equal(r.proposal.documents[1].operation, "create"); assert.equal(r.ambiguous, 1);
});
