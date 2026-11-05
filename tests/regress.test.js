import test from "node:test";
import assert from "node:assert/strict";
import { regressSlice, regressCandidates, regressLine } from "../src/engine/regress.js";
import { createRegressChat } from "../src/data/regress.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { createEmptyWikiScope, createWikiDocument } from "../src/engine/pot/wiki-schema.js";

const folder = () => ({
  v: 2, chaId: "c1", chatId: "t1", chatName: "원래 채팅",
  people: {
    "시로코": { name: "시로코", aliases: ["시로"], digest: "은행을 턴 적 있음", records: [{ id: "r1", at: 120, mid: "m120", h: "hh", act: "은행을 털었다", g: "A", at_ms: 1 }, { id: "r2", at: 5, h: "x", act: "고아", g: "D", orphan: true }] },
    "호시노": { name: "호시노", records: [{ id: "r3", at: 7, h: "y", act: "낮잠", g: "C" }] }
  },
  rels: { "시로코>{{user}}": { from: "시로코", to: "{{user}}", items: [{ d: "믿게 됨", at: 100, src: { hash: "s" } }] }, "호시노>{{user}}": { from: "호시노", to: "{{user}}", items: [{ d: "x" }] } },
  emo: { "시로코>{{user}}": { from: "시로코", to: "{{user}}", tags: { trust: 3 }, log: [{ t: { trust: 3 }, from: {}, src: { chatId: "m120", hash: "s", at: 120 } }] } },
  talk: { "시로코>{{user}}": { from: "시로코", to: "{{user}}", call: "선생님" }, "호시노>시로코": { from: "호시노", to: "시로코", call: "시로코쨩" }, "호시노>{{user}}": { from: "호시노", to: "{{user}}", call: "아저씨" } },
  bonds: [{ a: "시로코", b: "{{user}}", moment: "첫 임무" }, { a: "호시노", b: "{{user}}", moment: "x" }],
  beliefs: [{ who: "시로코", thinks: "선생님은 믿을 만하다", open: true }],
  scenes: [{ id: "s1", sum: "옛 장면", at: 120, h: "hh" }], open: [{ id: "o1", text: "약속" }],
  gauge: { vals: { d1: { "시로코": { v: 5 }, "호시노": { v: 1 } } }, log: [1], run: 3 },
  wiki: { schemaVersion: 1, revision: 9, scope: { characterId: "c1", chatKey: "t1" }, documents: { a: { id: "a", type: "Character", title: "시로코" }, b: { id: "b", type: "Character", title: "호시노" } }, history: [{}], people: { profiles: { a: { x: 1 }, b: { x: 2 } }, candidates: { z: {} }, pins: {} } }
});

test("고른 인물의 기억만 옮기고, 출처를 떼어 새 채팅에서 고아·되돌림이 생기지 않음", () => {
  const out = regressSlice(folder(), "시로", { scope: { characterId: "c1", chatKey: "new" }, fromChat: "원래 채팅" });
  const s = out.slice;
  assert.equal(out.person, "시로코");
  assert.deepEqual(Object.keys(s.people), ["시로코"]);
  assert.equal(s.people["시로코"].records.length, 1, "고아 기록은 뺌");
  assert.equal(s.people["시로코"].records[0].at, null); assert.equal(s.people["시로코"].records[0].carried, true);
  assert.equal(s.people["시로코"].digest, "은행을 턴 적 있음");
  assert.deepEqual(Object.keys(s.rels), ["시로코>{{user}}"]); assert.equal(s.rels["시로코>{{user}}"].items[0].src, undefined);
  assert.deepEqual(Object.keys(s.talk).sort(), ["시로코>{{user}}", "호시노>시로코"], "시로코가 낀 짝만");
  assert.equal(s.bonds.length, 1); assert.equal(s.beliefs.length, 1);
  assert.deepEqual(s.scenes, []); assert.deepEqual(s.open, []);
  assert.deepEqual(Object.keys(s.gauge.vals.d1), ["시로코"]);
  assert.deepEqual(Object.keys(s.wiki.documents), ["a"]); assert.equal(s.wiki.scope.chatKey, "new"); assert.deepEqual(Object.keys(s.wiki.people.profiles), ["a"]);
  assert.equal(s.regress.person, "시로코");
  // 새 채팅(메시지 1개)에서 대조해도 감정·기록이 그대로
  const nf = structuredClone(s);
  reconcile(nf, [{ role: "char", data: "안녕", chatId: "z" }]);
  assert.equal(nf.emo["시로코>{{user}}"].tags.trust, 3);
  assert.equal(nf.people["시로코"].records[0].orphan, false);
  // 주입: 회귀 줄 + 기록이 최근 메시지로 빠지지 않음
  const block = buildBlock({ ...nf, chaId: "c1", chatId: "new" }, { messageCount: 1 }).text ?? "";
  assert.match(String(block), /Regression: 시로코/);
  assert.match(String(block), /은행을 털었다/);
});

test("여러 명 회귀: 고른 인물 모두의 기억·위키 문서·관계, {{user}}는 대상에서 뺌", () => {
  const f = folder(); f.people["{{user}}"] = { name: "{{user}}", records: [{ id: "u1", act: "나", g: "B" }] };
  assert.ok(!regressCandidates(f).some((p) => p.name === "{{user}}"));
  assert.equal(regressSlice(f, "{{user}}"), null);
  const out = regressSlice(f, ["시로코", "호시노", "{{user}}"], { scope: { characterId: "c1", chatKey: "n" } });
  assert.deepEqual(Object.keys(out.slice.people).sort(), ["시로코", "호시노"]);
  assert.deepEqual(Object.keys(out.slice.wiki.documents).sort(), ["a", "b"]);
  assert.equal(Object.keys(out.slice.talk).length, 3); assert.equal(out.slice.bonds.length, 2);
  assert.deepEqual(out.slice.regress.persons, ["시로코", "호시노"]);
  assert.match(regressLine(out.slice), /시로코, 호시노 have returned/);
});

test("후보는 기억 있는 인물, 고정·기록 많은 순 · 없는 인물은 null", () => {
  assert.deepEqual(regressCandidates(folder()).map((p) => p.name), ["시로코", "호시노"]);
  assert.equal(regressSlice(folder(), "없음"), null);
  assert.equal(regressLine({}), "");
});

test("createRegressChat: 메시지 없는 새 채팅을 덧붙이고 새 폴더에 기억을 씀, 원래 폴더는 그대로", async () => {
  let ch = { chaId: "c1", name: "봇", chats: [{ id: "t1", message: [{ data: "x" }] }] };
  const api = { getCharacterFromIndex: async () => structuredClone(ch), setCharacterToIndex: async (_, v) => { ch = structuredClone(v); } };
  const folders = {};
  const store = { updateFolder: async (a, b, fn) => { const f = folders[`${a}/${b}`] ??= {}; fn(f); }, deleteFolder: async () => {} };
  const src = folder();
  let w = createEmptyWikiScope({ characterId: "c1", chatKey: "t1" });
  w = createWikiDocument(w, { type: "Character", title: "시로코", sections: [] });
  w = createWikiDocument(w, { type: "Character", title: "호시노", sections: [] });
  src.wiki = w;
  const res = await createRegressChat(api, 0, { store, folder: src, who: "시로코" });
  assert.equal(ch.chats.length, 2); assert.deepEqual(ch.chats[0].message, []); assert.equal(ch.chats[0].name, "회귀 · 시로코"); assert.equal(ch.chats[1].id, "t1", "새 채팅은 목록 맨 위");
  assert.equal(ch.chats[0].risupotWikiScopeId, ch.chats[0].id); assert.equal(ch.chatPage, 0);
  const nf = folders[`c1/${res.chat.id}`];
  assert.deepEqual(Object.keys(nf.people), ["시로코"]); assert.equal(nf.wiki.scope.chatKey, res.chat.id);
  assert.equal(res.counts.wiki, true); assert.equal(Object.keys(nf.wiki.documents).length, 1);
  assert.equal(Object.keys(src.people).length, 2, "원래 기억은 그대로");
});
