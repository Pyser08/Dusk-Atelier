import test from "node:test";
import assert from "node:assert/strict";
import { createLoreRuntime } from "../src/data/lorerules.js";
import { readChat, dropReads } from "../src/data/apiread.js";
import { scopeApi } from "../src/data/addonscope.js";
import { createStartGate } from "../src/data/startgate.js";
import { bumpCacheGen } from "../src/data/dbcache.js";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function loreApi(entries, { list = true, fail = false } = {}) {
  const n = { chat: 0, pos: 0, lore: 0 }, hooks = {}, o = { ci: 0 };
  const api = { pluginStorage: { getItem: async () => null, setItem: async () => {} }, addRisuScriptHandler: async (t, f) => { hooks[t] = f; },
    getCurrentCharacterIndex: async () => { n.pos++; await wait(2); return o.ci; }, getCurrentChatIndex: async () => 0,
    getChatFromIndex: async () => { n.chat++; return { id: "c", message: [{ role: "user", data: "a" }, { role: "char", data: "b" }], scriptstate: {} }; },
    getCharacterFromIndex: async () => ({ globalLore: entries, chats: [{}], triggerscript: [] }), getDatabase: async () => ({ modules: [] }), setChatToIndex: async () => {} };
  if (list) api.getCurrentLorebookEntries = async () => { n.lore++; if (fail) throw new Error("x"); return entries; };
  return { api, n, hooks, o };
}
const ruled = [{ comment: "r", content: "x", extentions: { da_rule: { prob: 50 }, da_rid: "r1" } }];
test("리롤 준비: 규칙이 없으면 채팅을 읽지 않고, 있거나 확인 못 하면 예전처럼 읽는다", async () => {
  for (const [entries, opt, chat] of [[[], {}, 0], [ruled, {}, 1], [[], { list: false }, 1], [[], { fail: true }, 1]]) {
    const { api, n } = loreApi(entries, opt); const r = createLoreRuntime(api); r.setSettings({ reroll: "redraw" });
    await r.prepareReroll(); assert.equal(n.chat > 0, chat > 0, JSON.stringify([entries.length, opt]));
  }
});
test("리롤 준비: 표시 여러 줄에도 위치를 몰아 묻고, 채팅을 바꾸면 다시 준비한다", async () => {
  const { api, n, hooks, o } = loreApi([]); const r = createLoreRuntime(api); r.setSettings({ reroll: "redraw" }); await r.start();
  await r.prepareReroll(); const a = n.pos;
  for (let i = 0; i < 30; i++) hooks.display("x"); await wait(40); assert.ok(n.pos - a <= 2, String(n.pos - a));
  const lore = n.lore; hooks.display("x"); o.ci = 1; hooks.display("x"); await wait(2700); assert.equal(n.lore, lore + 1);   // 바뀐 채팅
});
test("읽기 공유: 원본 api와 애드온 api가 같은 요청을 나눠 쓰고, 쓰기 뒤에는 다시 읽는다", async () => {
  dropReads(); let n = 0; const base = { getChatFromIndex: async () => { n++; await wait(5); return {}; } };
  const a = scopeApi(base).api, b = scopeApi(base).api;
  const [x, y, z] = await Promise.all([readChat(base, 0, 0), readChat(a, 0, 0), readChat(b, 0, 0)]);
  assert.equal(n, 1); assert.ok(x === y && y === z);
  await readChat({ getChatFromIndex: async () => { n++; return {}; } }, 0, 0); assert.equal(n, 2);   // 다른 api는 나누지 않음
  await readChat(a, 0, 0); bumpCacheGen(); await readChat(b, 0, 0); assert.equal(n, 4);
});
test("시작 문: 열릴 때까지, 길어도 정해진 시간까지만 기다린다", async () => {
  const g = createStartGate(1000); let done = false; const p = g.wait().then(() => { done = true; });
  await wait(5); assert.equal(done, false); g.open(); await p; assert.equal(g.wait(), null);
  const keep = setTimeout(() => {}, 500), h = createStartGate(20), t = Date.now(); await h.wait(); clearTimeout(keep); assert.ok(Date.now() - t < 300); assert.equal(h.wait(), null);
});
test("애드온 시작: 켤 목록과 각 애드온이 켜졌는지(실패해도) 알려 준다", async () => {
  const { createAddons } = await import("../src/data/addons.js");
  const kv = new Map([["dusk.addon.index", JSON.stringify({ memory: { version: "1", on: true }, bad: { version: "1", on: true }, off: { version: "1", on: false } })]]);
  const store = { getItem: async (k) => kv.get(k) ?? (/code/.test(k) ? "code:" + k : null), setItem: async (k, v) => { kv.set(k, v); }, removeItem: async () => {} };
  const got = { ids: null, done: [] };
  const A = createAddons({ getLocalPluginStorage: () => store, pluginStorage: store }, { core: "2.0.0", log: () => {}, fetcher: async () => null, timers: { setTimeout() {}, setInterval() {}, clearTimeout() {}, clearInterval() {} },
    importer: async (_c, id) => ({ activate: async () => { if (id === "bad") throw new Error("x"); return {}; } }) });
  for (const k of [...kv.keys()]) if (!(await A.getIndex()).memory) throw new Error("색인 키가 달라요 " + k);
  await A.boot({ onIndex: (ids) => { got.ids = ids; }, onSettled: (id, ok) => got.done.push([id, ok]) });
  assert.deepEqual([...got.ids].sort(), ["bad", "memory"]);
  assert.deepEqual(got.done.sort(), [["bad", false], ["memory", true]]);
});
