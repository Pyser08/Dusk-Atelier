import test from "node:test";
import assert from "node:assert/strict";
import { autoMergeUser } from "../src/data/usermerge.js";
import { primaryUserName } from "../src/data/usernames.js";
import { createMemoryStore } from "../src/data/memorystore.js";

test("primaryUserName: 선택한 페르소나 이름이 username보다 먼저", () => {
  assert.equal(primaryUserName({ username: "User", personas: [{ name: "하윤" }, { name: "테드" }], selectedPersona: 1 }), "테드");
  assert.equal(primaryUserName({ username: "User", personas: [] }), "User");
  assert.equal(primaryUserName({}), "");
});

test("autoMergeUser: 페르소나 이름으로 갈라진 기록을 {{user}}로 합치고, 합칠 게 없으면 쓰지 않는다", async () => {
  const m = new Map();
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } } };
  const store = createMemoryStore(api);
  await store.updateFolder("c", "t", (f) => {
    f.people["하윤"] = { name: "하윤", aliases: [], pinned: false, records: [{ id: "r1", act: "비밀을 말함", at: 1, g: "A" }] };
  });
  const names = ["하윤"];
  let f = await store.getFolder("c", "t");
  const r = await autoMergeUser(store, "c", "t", f, names);
  assert.ok(r && r.people === 1 && r.names.includes("하윤"));
  f = await store.getFolder("c", "t");
  assert.equal(f.people["하윤"], undefined); assert.ok(f.people["{{user}}"].records.length >= 1);
  assert.equal(await autoMergeUser(store, "c", "t", f, names), null, "두 번째는 합칠 게 없다");
  assert.equal(await autoMergeUser(store, "c", "t", f, []), null);
});
