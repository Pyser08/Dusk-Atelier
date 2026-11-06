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
