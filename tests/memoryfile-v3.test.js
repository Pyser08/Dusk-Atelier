import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";
import { buildMemoryFile, applyMemoryFile } from "../src/data/memoryfile.js";

const mem = () => { const m = new Map(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } }; };
const api = { pluginStorage: mem() };

test("지금(v3) 내보낸 파일의 기억을 불러오고, 채팅 하나는 복사한 채팅에 넣을 수 있다", async () => {
  const a = createMemoryStoreV3(api, { storage: mem() });
  await a.updateFolder("bot", "c1", (f) => { f.people.x = { name: "X", records: [] }; f.wiki = { documents: {}, scope: { characterId: "bot", chatKey: "c1" } }; });
  const d = await buildMemoryFile(api, a, { erosync: false, only: { chaId: "bot", chatId: "c1" } });
  assert.equal(d.folders.length, 1);
  const b = createMemoryStoreV3(api, { storage: mem() });
  assert.equal((await applyMemoryFile(api, b, d, { erosync: false })).chats, 1);
  assert.ok((await b.getFolder("bot", "c1")).people.x);
  await applyMemoryFile(api, b, d, { erosync: false, target: { chaId: "bot", chatId: "copy" } });
  const c = await b.getFolder("bot", "copy");
  assert.ok(c.people.x);
  assert.equal(c.wiki.scope.chatKey, "copy");
});
