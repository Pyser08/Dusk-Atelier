// addon-rebuild: 관계 지우기·별칭을 이름으로(시험판 피드백 — 수동으로 고칠 수 있게)
import test from "node:test";
import assert from "node:assert/strict";
import { removePairMemory, removePairWiki, promoteAlias } from "../src/engine/relremove.js";
import { createEmptyWikiScope, createWikiDocument } from "../src/engine/pot/wiki-schema.js";

test("장기기억 관계 지우기: 두 사람 사이만, 양쪽 방향·별칭까지", () => {
  const f = { emo: { "미오>아저씨": { from: "미오", to: "레스토랑 아저씨" }, "아저씨>Mio": { from: "레스토랑 아저씨", to: "Mio" }, "미오>하연": { from: "미오", to: "하연" } },
    ties: { t1: { a: "미오", b: "레스토랑 아저씨", kind: "friend" }, t2: { a: "미오", b: "하연" } }, rels: { r1: { from: "레스토랑 아저씨", to: "미오", items: [] } } };
  assert.equal(removePairMemory(f, ["미오", "Mio"], ["레스토랑 아저씨"]), 4);
  assert.deepEqual(Object.keys(f.emo), ["미오>하연"]); assert.deepEqual(Object.keys(f.ties), ["t2"]); assert.deepEqual(Object.keys(f.rels), []);
});

test("위키 관계 지우기: 서로를 대상으로 한 절·수치만 빼고 나머지는 그대로", () => {
  let w = createEmptyWikiScope({ characterId: "c", chatKey: "k" });
  w = createWikiDocument(w, { type: "Character", title: "미오", aliases: [], tags: [], links: [], sections: [], metrics: [] });
  w = createWikiDocument(w, { type: "Character", title: "아저씨", aliases: [], tags: [], links: [], sections: [], metrics: [] });
  const [a, b] = Object.keys(w.documents);
  const sec = (heading, refs) => ({ id: `section-${heading}`, heading, body: heading, provenance: { kind: "writer", entryRef: `entry:writer-${heading}`, slotId: "core.identity", featureId: "core", mode: "core", targetRefs: refs, contextKey: null, assertion: "fact", evidenceRefs: ["source:rp"], links: [], reason: "x", requestRef: "r0" } });
  w.documents[a].sections = [sec("기본정보", []), sec("아저씨와의 관계", [b])];
  w.documents[b].sections = [sec("미오와의 관계", [a])];
  const r = removePairWiki(w, a, b);
  assert.equal(r.removed, 2);
  assert.deepEqual(r.scope.documents[a].sections.map((s) => s.heading), ["기본정보"]);
  assert.deepEqual(r.scope.documents[b].sections, []);
});

test("별칭을 대표 이름으로: 옛 이름은 별칭으로", () => {
  assert.deepEqual(promoteAlias("나타샤", ["나탈리야 알렉산드로브나 로마노바", "타샤"], "나탈리야 알렉산드로브나 로마노바"), { title: "나탈리야 알렉산드로브나 로마노바", aliases: ["나타샤", "타샤"] });
  assert.deepEqual(promoteAlias("니지카", ["이지치 니지카"], "이지치 니지카"), { title: "이지치 니지카", aliases: ["니지카"] });
});

test("관계 지우기는 애인 지정·추억·갈등도 두 사람 것만 지운다(관계도 선까지)", () => {
  const f = { lovers: { "미오|아저씨": { on: true, a: "미오", b: "아저씨" }, "미오|하연": { on: true, a: "미오", b: "하연" } },
    bonds: [{ a: "미오", b: "아저씨", moment: "x" }, { a: "미오", b: "하연", moment: "y" }], rifts: [{ a: "아저씨", b: "미오", about: "z" }] };
  removePairMemory(f, ["미오"], ["아저씨"]);
  assert.deepEqual(Object.keys(f.lovers), ["미오|하연"]); assert.deepEqual(f.bonds.map((b) => b.b), ["하연"]); assert.deepEqual(f.rifts, []);
});

test("관계도: 이름을 고친 인물은 위키 대표 이름으로 보이고, 지운 관계 선은 없다", async () => {
  const { buildRelMap } = await import("../src/engine/relmap.js");
  const rec = (id, at) => ({ id, act: "x", g: "A", at, orphan: false });
  const f = { people: { a: { name: "나타샤", records: [rec("r1", 1)] }, b: { name: "아저씨", records: [rec("r2", 2)] } },
    emo: { "나타샤>{{user}}": { from: "나타샤", to: "{{user}}", tags: { affection: 5 }, log: [] }, "아저씨>{{user}}": { from: "아저씨", to: "{{user}}", tags: { affection: 2 }, log: [] } },
    rels: { r: { from: "나타샤", to: "아저씨", items: [{ at: 1, dir: "+", d: "친해짐" }] } }, scenes: [],
    wiki: { documents: { d1: { type: "Character", title: "나탈리야 알렉산드로브나 로마노바", aliases: ["나타샤"] } } } };
  let m = buildRelMap(f);
  assert.ok(m.nodes.some((n) => n.name === "나탈리야 알렉산드로브나 로마노바"), "대표 이름으로 보임");
  assert.equal(m.edges.filter((e) => !String(e.id).includes("user")).length >= 1, true);
  removePairMemory(f, ["나타샤", "나탈리야 알렉산드로브나 로마노바"], ["아저씨"]);
  m = buildRelMap(f);
  assert.equal(m.edges.some((e) => e.k === "r"), false, "지운 관계 선은 없음");
});
