// 2.2.4 기본 성격 6축: 관찰이 쌓이면 막대가 움직이고, 한 번 반영한 뒤에도 같은 방향 관찰이 다시 쌓이면 또 움직인다.
import test from "node:test";
import assert from "node:assert/strict";
import { applyWriterProposalAtomic } from "../src/engine/pot/writer-apply.js";
import * as L from "../src/engine/pot/wiki-schema.js";

const now = "2026-01-01T00:00:00Z";
function setup() {
  let sc = L.createWikiDocument(L.createEmptyWikiScope({ characterId: "c", chatKey: "k", characterName: "봇", chatName: "채팅" }, now), { type: "Character", title: "미나", aliases: [], sections: [], tags: [], links: [], metrics: [] }, { now });
  const id = Object.keys(sc.documents)[0];
  return { sc, id };
}
const contract = (id) => ({ catalog: { documentRefs: { d: id }, documents: {}, entryRefs: {} }, knownCharacterNames: [] });
const obs = (scene) => ({ document_ref: "d", operation: "observe", axis: "relationalInitiative", direction: "increase", pattern: "관계 주도성 높아지는 모습", strength: 60, confidence: 70, scene_key: scene, evidence_refs: ["source:rp"], evidence_quote: "x", reason: "앞장섬" });
const step = (sc, id, ops, n) => applyWriterProposalAtomic(sc, { request_ref: `req${n}`, schema_version: 1, documents: [], metric_ops: [], people_ops: ops, issues: [] }, contract(id), { now: `2026-01-0${1 + (n % 8)}T00:00:0${n % 10}Z`, batchRef: `batch:${n}` }).scope;

test("성격 관찰 4개·장면 3곳이 모이면 막대가 오르고, 다시 모이면 또 오른다", () => {
  let { sc, id } = setup();
  sc = step(sc, id, [{ document_ref: "d", operation: "init", summary: "미나", core_traits: [], values: [], axes: {}, evidence_refs: ["source:rp"], reason: "처음" }], 0);
  const axis = () => sc.people.profiles[id].axes.relationalInitiative;
  const start = axis();
  let n = 1;
  for (const s of ["s1", "s2", "s3", "s3"]) sc = step(sc, id, [obs(s)], n++);
  const first = axis();
  assert.ok(first > start, `처음 반영: ${start} → ${first}`);
  for (const s of ["s4", "s5", "s6", "s6"]) sc = step(sc, id, [obs(s)], n++);
  assert.ok(axis() > first, `두 번째 반영: ${first} → ${axis()}`);
  assert.ok(Object.keys(sc.people.candidates).filter((k) => k.includes("#done")).length >= 2, "반영한 후보는 보관 이름으로");
});
