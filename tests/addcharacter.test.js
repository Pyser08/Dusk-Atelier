import test from "node:test";
import assert from "node:assert/strict";
import { insertCharacter } from "../src/data/addcharacter.js";

class Busy extends Error {}
const mk = () => { const calls = []; const db = [{ chaId: "old", chats: [] }];
  const api = { setDatabaseLite: async ({ characters }) => calls.push("db" + characters.length), getCharacterFromIndex: async (i) => db[i] ?? null, setChatToIndex: async () => calls.push("chat") };
  return { calls, db, api, hooks: { created: async () => calls.push("hook") }, ensureInOrder: async () => calls.push("order") }; };

test("insert order: hook → push/save → order → verify → first chat", async () => {
  const t = mk(); const build = () => ({ chaId: "new", chats: [{ id: "1" }] });
  const r = await insertCharacter(t.api, { characters: t.db, build, hooks: t.hooks, ensureInOrder: t.ensureInOrder, isGenerating: () => false, Busy });
  assert.deepEqual(t.calls, ["hook", "db2", "order", "chat"]); assert.equal(r.idx, 1);
});
test("blocked while generating, nothing written", async () => {
  const t = mk();
  await assert.rejects(insertCharacter(t.api, { characters: t.db, build: () => ({}), hooks: t.hooks, ensureInOrder: t.ensureInOrder, isGenerating: () => true, Busy }), Busy);
  assert.deepEqual(t.calls, []);
});
test("verify failure throws; first-chat failure is tolerated", async () => {
  const t = mk(); t.api.getCharacterFromIndex = async () => ({ chaId: "other" });
  await assert.rejects(insertCharacter(t.api, { characters: t.db, build: () => ({ chaId: "n", chats: [{}] }), hooks: t.hooks, ensureInOrder: t.ensureInOrder, isGenerating: () => false, Busy }), /추가 후 확인/);
  const u = mk(); u.api.setChatToIndex = async () => { throw new Error("x"); };
  await insertCharacter(u.api, { characters: u.db, build: () => ({ chaId: "n", chats: [{}] }), hooks: u.hooks, ensureInOrder: u.ensureInOrder, isGenerating: () => false, Busy });
});
