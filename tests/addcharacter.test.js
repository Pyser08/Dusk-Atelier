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

import { createBotDraft } from "../src/data/addcharacter.js";
test("봇 초안: 저장하기 전에는 DB에 아무것도 쓰지 않고, 첫 저장에서 한 번만 추가한다", async () => {
  const t = mk(); const base = { chaId: "draft1", name: "새 봇", chats: [{ id: "c" }] };
  const d = createBotDraft(t.api, { base, getCharacters: async () => t.db, merge: (b, draft) => ({ ...b, name: draft.name }), uniqueName: (n) => n, hooks: t.hooks, ensureInOrder: t.ensureInOrder, isGenerating: () => false, Busy });
  assert.deepEqual(t.calls, []);              // 만들기만 해서는 쓰기 없음
  assert.equal(d.index, -1);
  let updated = 0;
  await d.save({ name: "A" }, {}, async () => { updated++; });
  assert.equal(updated, 0); assert.equal(d.index, 1); assert.equal(t.db.length, 2); assert.equal(t.db[1].chaId, "draft1"); assert.equal(t.db[1].name, "A");
  await d.save({ name: "B" }, {}, async (i) => { updated += i; });   // 두 번째 저장은 추가가 아니라 수정 경로
  assert.equal(t.db.length, 2); assert.equal(updated, 1);
});
test("봇 초안: 생성 중이라 추가가 막히면 초안 상태 그대로 남는다", async () => {
  const t = mk(); const d = createBotDraft(t.api, { base: { chaId: "d", chats: [{}] }, getCharacters: async () => t.db, merge: (b) => b, uniqueName: (n) => n, hooks: t.hooks, ensureInOrder: t.ensureInOrder, isGenerating: () => true, Busy });
  await assert.rejects(d.save({}, {}, async () => {}), Busy);
  assert.equal(d.index, -1); assert.equal(t.db.length, 1);
});
