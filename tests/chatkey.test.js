import test from "node:test";
import assert from "node:assert/strict";
import { chatKeyOf, legacyChatKeyOf, scopeMismatch } from "../src/engine/chatkey.js";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";

const mem = (fail = false) => { const m = new Map(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { if (fail) return false; m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, m }; };

test("복사·분기된 채팅은 화면과 런타임이 같은 범위 키(risupotWikiScopeId)를 쓴다", () => {
  const copy = { id: "new-id", risupotWikiScopeId: "chat-abc" };
  assert.equal(chatKeyOf(copy, 3), "chat-abc");
  assert.equal(legacyChatKeyOf(copy, 3), "new-id");
  assert.equal(chatKeyOf({ id: "x" }, 0), "x");
  assert.equal(chatKeyOf({}, 2), "2");
  assert.equal(scopeMismatch(copy, 3, "chat-abc"), false);
  assert.equal(scopeMismatch(copy, 3, "old"), true);
});

test("setItem이 false를 돌려주면 저장 실패로 처리한다", async () => {
  const store = createMemoryStoreV3({}, { storage: mem(true) });
  await assert.rejects(() => store.updateFolder("b", "c", (f) => { f.botName = "x"; }));
});

test("예전 키 폴더의 기억을 범위 키 폴더로 옮긴다(빈 칸만)", async () => {
  const store = createMemoryStoreV3({}, { storage: mem() });
  await store.updateFolder("b", "new-id", (f) => { f.people.a = { name: "A", records: [] }; f.wiki = { documents: { d1: { type: "Character" } } }; });
  await store.updateFolder("b", "chat-abc", (f) => { f.people.b = { name: "B", records: [] }; });
  assert.equal(await store.adoptFolder("b", "new-id", "chat-abc"), true);
  const f = await store.getFolder("b", "chat-abc");
  assert.deepEqual(Object.keys(f.people).sort(), ["a", "b"]);
  assert.equal(f.wiki.documents.d1.type, "Character");
  assert.equal(await store.adoptFolder("b", "new-id", "chat-abc"), false);  // 한 번만
});

test("예전 키 폴더의 기억을 전부 옮긴다(관계·감정 등 모든 칸), 화면에서 현재 채팅을 고를 때도", async () => {
  const store = createMemoryStoreV3({}, { storage: mem() });
  await store.updateFolder("b", "chat-id", (f) => {
    f.people.a = { name: "A", records: [{ act: "인사", at: 0 }] }; f.scenes = [{ at: 0, who: ["A"] }];
    f.rels = { "A>B": { from: "A", to: "B", items: [{ d: "친구" }] } }; f.emo = { "A>{{user}}": { from: "A", to: "{{user}}", tags: { 애정: 1 } } }; f.talk = { A: { tone: "반말" } };
  });
  await store.updateFolder("b", "scope-x", (f) => { f.wiki = { documents: { d: { type: "Character", title: "A" } } }; });
  const { createSwitches } = await import("../src/data/memoryswitches.js");
  const api = { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => ({ chaId: "b", name: "봇", chats: [{ id: "chat-id", risupotWikiScopeId: "scope-x", name: "c" }] }), getChatFromIndex: async () => ({ id: "chat-id", risupotWikiScopeId: "scope-x", name: "c", message: [] }), getDatabase: async () => ({}) };
  const sw = createSwitches({ api, store, flow: { apply: async () => {} } });
  const cur = await sw.currentChat();
  assert.equal(cur.chatId, "scope-x");
  const f = await store.getFolder("b", "scope-x");
  assert.ok(f.people.a && f.scenes.length === 1 && f.rels["A>B"] && f.emo["A>{{user}}"] && f.talk.A, JSON.stringify(Object.keys(f)));
  assert.equal(f.wiki.documents.d.title, "A", "런타임이 쓴 위키는 그대로");
});
