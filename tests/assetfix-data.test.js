import test from "node:test";
import assert from "node:assert/strict";
import { loadRange, applyFix, undoFix, UNDO_KEY } from "../src/data/assetfix.js";
import { messageIdentity } from "../src/engine/chattext.js";

function fakeApi() {
  const store = new Map();
  const msgs = [
    { role: "user", data: "안녕", chatId: "u1" },
    { role: "char", data: '<img="kaguya.nude.Smiling"> 하나', chatId: "c1" },
    { role: "user", data: "응", chatId: "u2" },
    { role: "char", data: '<img="Kaguya.nude.smiling"> 둘', chatId: "c2" },
  ];
  const db = { chat: { id: "chatA", message: msgs } };
  return {
    db,
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => ({ chaId: "botA", chats: [db.chat] }),
    getChatFromIndex: async () => structuredClone(db.chat),
    setChatToIndex: async (ci, ti, chat) => { db.chat = structuredClone(chat); },
  };
}
function fakeStore(folder) {
  let f = folder;
  return { getFolder: async () => (f ? structuredClone(f) : null), updateFolder: async (a, b, fn) => { await fn(f); }, get: () => f };
}

test("loadRange picks the last N AI replies (oldest first) and earlier replies for outfit memory", async () => {
  const api = fakeApi();
  const r = await loadRange(api, 1);
  assert.deepEqual(r.picks.map((p) => p.key), [3]);
  assert.deepEqual(r.before, ['<img="kaguya.nude.Smiling"> 하나']);
  assert.equal(r.chaId, "botA"); assert.equal(r.chatId, "chatA");
  assert.equal((await loadRange(api, 10)).picks.length, 2);
});

test("applyFix writes only changed replies, moves memory identities, and undo restores both", async () => {
  const api = fakeApi();
  const old = api.db.chat.message[1];
  const oldId = messageIdentity(old);
  const store = fakeStore({ recs: [{ h: oldId, at: 1 }], done: [oldId] });
  const range = await loadRange(api, 10);
  const res = await applyFix(api, store, range, [{ key: 1, before: old.data, after: '<img="Kaguya.nude.smiling"> 하나' }]);
  assert.equal(res.changed, 1);
  assert.equal(api.db.chat.message[1].data, '<img="Kaguya.nude.smiling"> 하나');
  assert.equal(api.db.chat.message[3].data, '<img="Kaguya.nude.smiling"> 둘');
  const newId = messageIdentity(api.db.chat.message[1]);
  assert.notEqual(newId, oldId);
  assert.deepEqual(store.get(), { recs: [{ h: newId, at: 1 }], done: [newId] });
  assert.ok(await api.pluginStorage.getItem(UNDO_KEY));
  const u = await undoFix(api, store);
  assert.equal(u.restored, 1);
  assert.equal(api.db.chat.message[1].data, old.data);
  assert.deepEqual(store.get(), { recs: [{ h: oldId, at: 1 }], done: [oldId] });
  await assert.rejects(() => undoFix(api, store), /되돌릴/);
});

test("a reply edited after preview is skipped instead of overwritten", async () => {
  const api = fakeApi();
  const range = await loadRange(api, 10);
  api.db.chat.message[1].data = "사용자가 그새 고친 글";
  const res = await applyFix(api, null, range, [{ key: 1, before: '<img="kaguya.nude.Smiling"> 하나', after: "x" }]);
  assert.equal(res.changed, 0);
  assert.equal(res.skipped, 1);
  assert.equal(api.db.chat.message[1].data, "사용자가 그새 고친 글");
});

test("no memory folder: nothing is created", async () => {
  const api = fakeApi();
  const store = { getFolder: async () => null, updateFolder: async () => { throw new Error("만들면 안 됨"); } };
  const range = await loadRange(api, 10);
  const res = await applyFix(api, store, range, [{ key: 1, before: api.db.chat.message[1].data, after: "y" }]);
  assert.equal(res.changed, 1);
});
