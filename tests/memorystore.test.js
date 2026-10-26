import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore, migrateV1, folderIdOf, FOLDER_PREFIX, INDEX_KEY, LEGACY_KEY, personKey } from "../src/data/memorystore.js";

const mockApi = () => { const m = new Map(); return { m, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { await new Promise((r) => setTimeout(r, 1)); m.set(k, v); }, removeItem: async (k) => { m.delete(k); } } }; };
const rec = (g, act, extra = {}) => ({ id: act, act, g, ...extra });

test("folders are stored under separate keys and indexed", async () => {
  const api = mockApi(), st = createMemoryStore(api);
  await st.updateFolder("c1", "t1", (f) => { f.people.a = { name: "A", records: [rec("B", "x")] }; });
  await st.updateFolder("c1", "t2", (f) => { f.scenes.push({ id: "s", sum: "y" }); });
  const keys = [...api.m.keys()].filter((k) => k.startsWith(FOLDER_PREFIX));
  assert.equal(keys.length, 2);
  const idx = await st.getIndex();
  assert.equal(Object.keys(idx.folders).length, 2);
  assert.deepEqual(idx.folders[folderIdOf("c1", "t1")].counts, { people: 1, records: 1, scenes: 0 });
  assert.equal((await st.getFolder("c1", "t1")).people.a.records.length, 1);
  assert.equal(await st.getFolder("c1", "none"), null);
});
test("concurrent writes are serialized and both kept", async () => {
  const api = mockApi(), st = createMemoryStore(api);
  await Promise.all([
    st.updateFolder("c", "t", async (f) => { await new Promise((r) => setTimeout(r, 5)); f.people.a = { name: "A", records: [] }; }),
    st.updateFolder("c", "t", (f) => { f.people.b = { name: "B", records: [] }; }),
    st.updateIndex((i) => { i.bots.c = { on: false }; })
  ]);
  const f = await st.getFolder("c", "t");
  assert.deepEqual(Object.keys(f.people).sort(), ["a", "b"]);
  assert.equal((await st.getIndex()).bots.c.on, false);
});
test("a failing write does not break the queue", async () => {
  const st = createMemoryStore(mockApi());
  await assert.rejects(st.updateFolder("c", "t", () => { throw new Error("x"); }));
  await st.updateFolder("c", "t", (f) => { f.people.a = { name: "A", records: [] }; });
  assert.ok((await st.getFolder("c", "t")).people.a);
});
test("pruning keeps A/B/pinned when over the cap", async () => {
  const api = mockApi(), st = createMemoryStore(api);
  await st.updateIndex((i) => { i.settings.personCap = 3; });
  await st.updateFolder("c", "t", (f) => { f.people.a = { name: "A", records: [rec("D", "d1"), rec("A", "a1"), rec("D", "d2"), rec("B", "b1"), rec("D", "d3", { pin: true })] }; });
  const r = (await st.getFolder("c", "t")).people.a.records.map((x) => x.act);
  assert.equal(r.length, 3);
  assert.ok(["a1", "b1", "d3"].every((x) => r.includes(x)));
});
test("migrate v1: E→D, S kept, legacy flag, original key untouched", async () => {
  const api = mockApi();
  const old = { v: 1, folders: { k: { charId: "c9", chatId: "t9", charName: "봇", chatName: "채팅", chatIndex: 2, characters: { 미나: { name: "미나", records: [{ id: "m1", action: "행동", grade: "E", situationId: "s1", createdAt: 5 }, { id: "m2", action: "큰일", grade: "S" }] } }, situations: [{ id: "s1", summary: "요약", state: ["a"], createdAt: 7 }] } } };
  api.m.set(LEGACY_KEY, JSON.stringify(old));
  const st = createMemoryStore(api);
  assert.equal(await st.migrate(), 1);
  const f = await st.getFolder("c9", "t9");
  const [a, b] = f.people[personKey("미나")].records;
  assert.equal(a.g, "D"); assert.equal(b.g, "S");
  assert.ok(a.legacy && a.at === null && a.sit === "s1");
  assert.equal(f.scenes[0].sum, "요약"); assert.equal(f.chatIndex, 2);
  assert.ok(api.m.has(LEGACY_KEY));
  assert.equal(await st.migrate(), 0);
});
test("migrate with no v1 data creates an empty v2 index", async () => {
  const api = mockApi(), st = createMemoryStore(api);
  assert.equal(await st.migrate(), 0);
  assert.equal(JSON.parse(api.m.get(INDEX_KEY)).v, 2);
});
test("deleteFolder / deleteBot / resetAll", async () => {
  const api = mockApi(), st = createMemoryStore(api);
  for (const [c, t] of [["a", "1"], ["a", "2"], ["b", "1"]]) await st.updateFolder(c, t, (f) => { f.scenes.push({ id: "s" }); });
  await st.deleteFolder("a", "1"); assert.equal(Object.keys((await st.getIndex()).folders).length, 2);
  await st.deleteBot("a"); assert.equal(Object.keys((await st.getIndex()).folders).length, 1);
  await st.resetAll(); assert.equal([...api.m.keys()].filter((k) => k.startsWith(FOLDER_PREFIX)).length, 0);
});
test("migrateV1 tolerates garbage", () => { assert.deepEqual(migrateV1(null), []); assert.deepEqual(migrateV1({ folders: { x: {} } }), []); });
