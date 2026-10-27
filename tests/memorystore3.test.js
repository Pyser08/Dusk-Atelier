import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStoreV3, INDEX_KEY, FOLDER_PREFIX } from "../src/data/memorystore3.js";
import { INDEX_KEY as V2_INDEX, FOLDER_PREFIX as V2_FOLDER, LEGACY_KEY, folderIdOf, personKey } from "../src/data/memorystore.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";
import { parsePotBundle, botPeople } from "../src/engine/memoryv3.js";

const mockApi = () => { const m = new Map(); return { m, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { await new Promise((r) => setTimeout(r, 1)); m.set(k, v); }, removeItem: async (k) => { m.delete(k); } } }; };
const wiki = (cid, chat, rev = 0) => { const w = createEmptyWikiScope({ characterId: cid, chatKey: chat, characterName: "블루 아카이브", chatName: "채팅" }, "2026-10-01T00:00:00.000Z"); w.revision = rev; return w; };

test("v2 → v3: folders moved, v2 keys kept, records untouched", async () => {
  const api = mockApi(), id = folderIdOf("c1", "t1");
  api.m.set(V2_INDEX, JSON.stringify({ v: 2, settings: { personCap: 77 }, bots: { c1: { on: true } }, folders: { [id]: {} }, status: {} }));
  api.m.set(V2_FOLDER + id, JSON.stringify({ v: 2, chaId: "c1", chatId: "t1", people: { [personKey("유우카")]: { name: "유우카", records: [{ id: "r", act: "회계", g: "B" }] } }, scenes: [] }));
  const st = createMemoryStoreV3(api);
  assert.equal(await st.migrate(), 1);
  const f = await st.getFolder("c1", "t1");
  assert.equal(f.v, 3); assert.equal(f.wiki, null); assert.equal(f.people[personKey("유우카")].records[0].g, "B");
  const idx = await st.getIndex();
  assert.equal(idx.settings.personCap, 77); assert.equal(idx.bots.c1.on, true); assert.equal(idx.migratedFrom, 2);
  assert.ok(api.m.has(V2_INDEX) && api.m.has(V2_FOLDER + id));
  assert.equal(await st.migrate(), 0);
});
test("v1 only → v3 directly; nothing → empty v3", async () => {
  const api = mockApi();
  api.m.set(LEGACY_KEY, JSON.stringify({ v: 1, folders: { k: { charId: "c9", chatId: "t9", characters: { 미나: { name: "미나", records: [{ id: "m", action: "x", grade: "E" }] } }, situations: [] } } }));
  const st = createMemoryStoreV3(api);
  assert.equal(await st.migrate(), 1);
  assert.equal((await st.getFolder("c9", "t9")).people[personKey("미나")].records[0].g, "D");
  const empty = createMemoryStoreV3(mockApi());
  assert.equal(await empty.migrate(), 0); assert.equal((await empty.getIndex()).v, 3);
});
test("same API as v2: folder update, serial writes, delete", async () => {
  const api = mockApi(), st = createMemoryStoreV3(api);
  await Promise.all([st.updateFolder("c", "t", async (f) => { await new Promise((r) => setTimeout(r, 5)); f.people.a = { name: "A", records: [] }; }), st.updateFolder("c", "t", (f) => { f.people.b = { name: "B", records: [] }; })]);
  assert.deepEqual(Object.keys((await st.getFolder("c", "t")).people).sort(), ["a", "b"]);
  assert.equal([...api.m.keys()].filter((k) => k.startsWith(FOLDER_PREFIX)).length, 1);
  await st.deleteFolder("c", "t");
  assert.equal(await st.getFolder("c", "t"), null);
});
test("risupot backup import: wiki stored per chat, newer revision wins, settings kept, keys ignored", async () => {
  const st = createMemoryStoreV3(mockApi());
  const full = { kind: "risupot-full-backup", settings: { power: true }, localProviderKeys: { openai: "sk-x" } };
  const r0 = await st.importPot(full);
  assert.equal(r0.settings, true); assert.equal(r0.keysIgnored, true);
  assert.equal(JSON.stringify(await st.getIndex()).includes("sk-x"), false);
  const r1 = await st.importPot({ kind: "risupot-backup", settings: { power: false }, wiki: wiki("c1", "t1", 3) });
  assert.equal(r1.scopes, 1); assert.equal(r1.settings, false);
  assert.equal((await st.getWiki("c1", "t1")).revision, 3);
  assert.equal((await st.getFolder("c1", "t1")).botName, "블루 아카이브");
  const r2 = await st.importPot({ kind: "risupot-backup", wiki: wiki("c1", "t1", 2) });
  assert.equal(r2.skipped, 1); assert.equal((await st.getWiki("c1", "t1")).revision, 3);
  const r3 = await st.importPot({ kind: "risupot-backup", wiki: wiki("c1", "t1", 5) });
  assert.equal(r3.scopes, 1); assert.equal((await st.getWiki("c1", "t1")).revision, 5);
  assert.equal((await st.getIndex()).pot.settings.power, true);
});
test("storage dump import + bad input reported", async () => {
  const w = wiki("c2", "t2", 1), st = createMemoryStoreV3(mockApi());
  const dump = { "risupot.settings": JSON.stringify({ a: 1 }), "risupot.provider-keys": "{}", ["risupot.wiki.v1:c2:t2"]: JSON.stringify(w) };
  const r = await st.importPot(dump);
  assert.equal(r.scopes, 1); assert.equal(r.settings, true); assert.equal(r.keysIgnored, true);
  assert.ok(parsePotBundle({ hello: 1 }).errors.length); assert.ok(parsePotBundle("not json").errors.length);
  assert.ok(parsePotBundle({ kind: "risupot-backup", wiki: { schemaVersion: 99 } }).errors.length);
});
test("bot-wide people merge keeps chatId on records", async () => {
  const st = createMemoryStoreV3(mockApi());
  await st.updateFolder("c", "t1", (f) => { f.people.a = { name: "A", aliases: ["에이"], records: [{ id: "1", act: "x", g: "C" }] }; });
  await st.updateFolder("c", "t2", (f) => { f.people.a = { name: "A", pinned: true, records: [{ id: "2", act: "y", g: "S" }] }; });
  const p = (await st.botPeople("c")).a;
  assert.equal(p.records.length, 2); assert.deepEqual(p.records.map((r) => r.chatId).sort(), ["t1", "t2"]); assert.ok(p.pinned && p.aliases.includes("에이"));
  assert.equal((await st.botFolders("c")).length, 2);
  assert.equal(botPeople([null]).a, undefined);
});
