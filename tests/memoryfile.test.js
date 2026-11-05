import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../src/data/memorystore.js";
import { buildMemoryFile, readMemoryFile, applyMemoryFile, summarize, clearErosyncData, listEroKeys } from "../src/data/memoryfile.js";
const mkApi = (withKeys = true) => { const m = new Map(); return { m, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, ...(withKeys ? { keys: async () => [...m.keys()] } : {}) } }; };
test("내보내기→불러오기: 기억 폴더와 erosync 키가 다른 저장소로 옮겨진다(꺼져 있어도)", async () => {
  const a = mkApi(), sa = createMemoryStore(a);
  await sa.updateFolder("c1", "t1", (f) => { f.people.민수 = { name: "민수", records: [] }; });
  a.m.set("erosync_profiles_v3", JSON.stringify({ profiles: { x: {} } }));
  a.m.set("erosync_session_v3:s1", "{}"); a.m.set("erosync_local_config_v3", "{}"); a.m.set("other", "1");
  const file = await buildMemoryFile(a, sa);
  assert.deepEqual(Object.keys(file.erosync.items).sort(), ["erosync_profiles_v3", "erosync_session_v3:s1"]);
  assert.deepEqual(summarize(file), { chats: 1, people: 1, ero: 2 });
  const b = mkApi(), sb = createMemoryStore(b);
  const r = await applyMemoryFile(b, sb, readMemoryFile(JSON.stringify(file)));
  assert.deepEqual(r, { chats: 1, ero: 2 });
  assert.ok((await sb.getFolder("c1", "t1")).people.민수);
  assert.equal(b.m.get("erosync_session_v3:s1"), "{}");
  assert.equal(b.m.has("erosync_local_config_v3"), false);
});
test("erosync 제외 옵션과 잘못된 파일", async () => {
  const a = mkApi(), sa = createMemoryStore(a);
  a.m.set("erosync_profiles_v3", "{}");
  assert.equal((await buildMemoryFile(a, sa, { erosync: false })).erosync, null);
  assert.throws(() => readMemoryFile("{깨짐"), /장기 기억 파일/);
  assert.throws(() => readMemoryFile(JSON.stringify({ kind: "x" })), /장기 기억 파일/);
});
test("keys()가 없으면 기본 키만(listable=false), 지우기는 erosync_ 키만", async () => {
  const a = mkApi(false);
  assert.equal((await listEroKeys(a)).listable, false);
  const b = mkApi(); b.m.set("erosync_profiles_v3", "1"); b.m.set("erosync_session_v3:z", "1"); b.m.set("dusk.mem.v2.index", "1");
  assert.equal(await clearErosyncData(b), 2);
  assert.equal(b.m.has("dusk.mem.v2.index"), true);
});
