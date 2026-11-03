import { test } from "node:test";
import assert from "node:assert/strict";
import { readDb, loadModuleState } from "../src/data/modules.js";
import { listInterop } from "../src/data/plugins.js";

const mk = () => {
  const calls = { raw: 0, cached: 0 };
  const db = { modules: [{ id: "a", name: "A" }], enabledModules: ["a"] };
  return { calls, api: {
    getDatabase: async () => { calls.raw++; return { ...db }; },
    getDatabaseCached: async () => { calls.cached++; return { ...db }; },
    pluginStorage: { getItem: async () => null },
  } };
};

test("모듈 화면 읽기는 공유 캐시를, 고치는 읽기는 새로 읽는다", async () => {
  const { api, calls } = mk();
  await loadModuleState(api);
  assert.equal(calls.cached, 1); assert.equal(calls.raw, 0);
  await readDb(api, ["modules", "enabledModules"]);
  assert.equal(calls.raw, 1);
});

test("캐시 함수가 없는 호스트에서도 읽힌다", async () => {
  const { api } = mk(); delete api.getDatabaseCached;
  const st = await loadModuleState(api);
  assert.equal(st.entries.length, 1);
});

test("연동 값은 한꺼번에 읽어도 이름순·표시가 같다", async () => {
  const store = {
    "da_interop:reg:b": JSON.stringify({ spec: 1, id: "b", name: "Beta", pluginName: "pb" }),
    "da_interop:reg:a": JSON.stringify({ spec: 1, id: "a", name: "Alpha" }),
    "da_interop:reg:x": JSON.stringify({ spec: 2, id: "x" }),
  };
  let live = 0, peak = 0;
  const api = { pluginStorage: {
    keys: async () => Object.keys(store),
    getItem: async (k) => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 1)); live--; return store[k] ?? null; },
  } };
  const r = await listInterop(api, new Set(["pb"]));
  assert.deepEqual(r.map((e) => e.name), ["Alpha", "Beta"]);
  assert.equal(r[1].installed, true);
  assert.ok(peak > 1);
});
