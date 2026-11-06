import test from "node:test";
import assert from "node:assert/strict";
import { parseManifest, pickUpdates, cmpVer, rowState } from "../src/engine/addons.js";
import { createAddons } from "../src/data/addons.js";
import { sha256 } from "../src/engine/hash.js";

const H = (c) => sha256(new TextEncoder().encode(c));
async function setup({ hooks = false } = {}) {
  const kv = new Map();
  const store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const files = {}, log = [];
  const api = { getLocalPluginStorage: () => store, pluginStorage: store };
  const put = async (version, body) => { files["https://x/a.js"] = body; files.manifest = JSON.stringify({ format: 1, addons: [{ id: "a", name: "A", version, minCore: "2.0.0", url: "https://x/a.js", sha256: await H(body), hooks }] }); };
  const fetcher = async (_api, url) => (url.endsWith("addons.json") ? files.manifest : files[url] ?? null);
  // 코드 문자열의 첫 줄로 동작을 정한다: "ok:<v>" 정상, "bad" activate에서 오류
  const importer = async (code) => ({ activate: async (_api, ctx) => { if (code.startsWith("bad")) throw new Error("터짐"); log.push(["on", code, ctx.version]); return { deactivate: () => log.push(["off", code]) }; } });
  const A = createAddons(api, { core: "2.0.0", fetcher, importer, log: () => {} });
  return { A, kv, files, log, put };
}

test("목록 검사: 잘못된 항목은 버림", () => {
  const m = parseManifest({ format: 1, addons: [{ id: "ok", version: "1.0.0", sha256: "a".repeat(64), url: "https://x" }, { id: "BAD", version: "1", sha256: "", url: "http://x" }] });
  assert.equal(m.addons.length, 1); assert.equal(m.errors.length, 1);
  assert.equal(parseManifest("{").errors.length, 1);
});
test("버전 비교·업데이트 고르기(코어 낮으면 미룸)", () => {
  assert.equal(cmpVer("2.0.10", "2.0.9"), 1);
  const list = [{ id: "a", version: "1.1.0", minCore: "2.0.0" }, { id: "b", version: "2.0.0", minCore: "3.0.0" }];
  const r = pickUpdates({ a: { version: "1.0.0" }, b: { version: "1.0.0" } }, list, "2.0.0");
  assert.deepEqual(r.updates.map((x) => x.id), ["a"]); assert.deepEqual(r.held.map((x) => x.id), ["b"]);
  assert.equal(rowState(list[1], null, "2.0.0"), "needs-core");
});
test("받기 → 바로 켜짐, 확인값이 다르면 거부", async () => {
  const { A, log, put, files } = await setup();
  await put("1.0.0", "ok:1"); await A.loadManifest();
  await A.install("a");
  assert.deepEqual(log.at(-1), ["on", "ok:1", "1.0.0"]); assert.ok(A.running("a"));
  files["https://x/a.js"] = "변조"; await A.remove("a");
  await assert.rejects(A.install("a"), /확인값/);
});
test("다시 시작하면 저장해 둔 코드로 켠다(네트워크 없이)", async () => {
  const { A, log, put, files } = await setup();
  await put("1.0.0", "ok:1"); await A.loadManifest(); await A.install("a");
  delete files.manifest;
  const { kv } = { kv: null };
  await A.dispose(); log.length = 0;
  await A.boot();
  assert.deepEqual(log[0], ["on", "ok:1", "1.0.0"]);
  await A.dispose();
});
test("자동 업데이트: 훅 없는 애드온은 바로 껐다 켬", async () => {
  const { A, log, put } = await setup();
  await put("1.0.0", "ok:1"); await A.loadManifest(); await A.install("a");
  await put("1.1.0", "ok:2");
  const r = await A.check({ force: true });
  assert.equal(r.updates.length, 1);
  assert.deepEqual(log.slice(-2), [["off", "ok:1"], ["on", "ok:2", "1.1.0"]]);
  assert.equal((await A.getIndex()).a.version, "1.1.0");
  await A.dispose();
});
test("훅 있는 애드온 업데이트는 다음 시작부터", async () => {
  const { A, log, put } = await setup({ hooks: true });
  await put("1.0.0", "ok:1"); await A.loadManifest(); await A.install("a");
  await put("1.1.0", "ok:2"); await A.check({ force: true });
  assert.deepEqual(log.at(-1), ["on", "ok:1", "1.0.0"]);
  assert.equal((await A.getIndex()).a.pendingRestart, true);
  await A.dispose(); await A.boot();
  assert.deepEqual(log.at(-1), ["on", "ok:2", "1.1.0"]);
  await A.dispose();
});
test("새 버전이 켜지다 실패하면 전 버전으로 되돌림", async () => {
  const { A, log, put } = await setup();
  await put("1.0.0", "ok:1"); await A.loadManifest(); await A.install("a");
  await put("1.1.0", "bad"); await A.check({ force: true });
  const idx = await A.getIndex();
  assert.equal(idx.a.version, "1.0.0"); assert.equal(idx.a.rolledBack, "1.1.0");
  assert.deepEqual(log.at(-1), ["on", "ok:1", "1.0.0"]); assert.ok(A.running("a"));
  await A.dispose();
});
test("끄기·지우기", async () => {
  const { A, log, put, kv } = await setup();
  await put("1.0.0", "ok:1"); await A.loadManifest(); await A.install("a");
  await A.setOn("a", false); assert.ok(!A.running("a")); assert.deepEqual(log.at(-1), ["off", "ok:1"]);
  await A.remove("a"); assert.equal(kv.has("dusk.addon.code.a"), false); assert.deepEqual(await A.getIndex(), {});
});
test("호스트처럼 getLocalPluginStorage()가 Promise로 와도 저장된다(d.setItem is not a function)", async () => {
  const kv = new Map(), store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const body = "ok:1", sha = await H(body);
  const files = { manifest: JSON.stringify({ format: 1, addons: [{ id: "a", version: "1.0.0", url: "https://x/a.js", sha256: sha }] }), "https://x/a.js": body };
  const fetcher = async (_a, u) => (u.endsWith("addons.json") ? files.manifest : files[u]);
  const importer = async () => ({ activate: async () => ({}) });
  for (const api of [{ getLocalPluginStorage: async () => store, pluginStorage: null }, { getLocalPluginStorage: async () => ({}), pluginStorage: store }]) {
    kv.clear();
    const A = createAddons(api, { core: "2.0.0", fetcher, importer, log: () => {} });
    await A.install("a");
    assert.equal(kv.get("dusk.addon.code.a"), body);
    assert.equal(typeof kv.get("dusk.addon.index"), "string");
    await A.dispose();
  }
});

import { installOrder, bootOrder, parseManifest as pm2 } from "../src/engine/addons.js";
test("필요 애드온(requires): 받을 순서·시작 순서", () => {
  const list = [{ id: "memory", requires: [] }, { id: "cards", requires: ["memory"] }, { id: "erosync", requires: ["memory"] }];
  assert.deepEqual(installOrder("cards", list).order, ["memory", "cards"]);
  assert.deepEqual(installOrder("x", list).missing, ["x"]);
  assert.deepEqual(bootOrder(["erosync", "cards", "memory"], (id) => list.find((a) => a.id === id).requires), ["memory", "erosync", "cards"]);
  const m = pm2({ format: 1, addons: [{ id: "cards", version: "1.0.0", sha256: "a".repeat(64), url: "https://x", requires: ["memory", "cards", "BAD!"] }] });
  assert.deepEqual(m.addons[0].requires, ["memory"]);
});

test("첫 실행 자동 받기(adopt): 쓰던 기능만 받고, 다 받으면 다시 하지 않는다", async () => {
  const { createAddons, ADOPT_KEY } = await import("../src/data/addons.js");
  const files = new Map(), store = { getItem: async (k) => files.get(k) ?? null, setItem: async (k, v) => { files.set(k, v); }, removeItem: async (k) => { files.delete(k); } };
  const code = "export async function activate(){ return { deactivate(){} }; }";
  const { sha256 } = await import("../src/engine/hash.js");
  const h = await sha256(new TextEncoder().encode(code));
  const manifest = JSON.stringify({ format: 1, addons: [{ id: "memory", version: "1.0.0", sha256: h, url: "https://x/m.js" }, { id: "cards", version: "1.0.0", sha256: h, url: "https://x/c.js", requires: ["memory"] }, { id: "widgets", version: "1.0.0", sha256: h, url: "https://x/w.js" }] });
  const A = createAddons({ pluginStorage: store }, { core: "2.0.0", storage: store, fetcher: async (_a, url) => (url.endsWith(".json") ? manifest : code), importer: async () => ({ activate: async () => ({ deactivate() {} }) }) });
  const r = await A.adopt([["memory", async () => false], ["cards", async () => true], ["widgets", async () => false]]);
  assert.deepEqual(r.got, ["cards"]);
  const idx = await A.getIndex();
  assert.ok(idx.memory && idx.cards && !idx.widgets, "필요 애드온(memory)도 같이 받음");
  assert.equal(files.get(ADOPT_KEY), "1");
  assert.deepEqual((await A.adopt([["widgets", async () => true]])).got, []);
});

test("훅 있는 애드온을 켜진 채 업데이트하면 새로고침 안내를 부르고, 다시 시작하면 표시를 지운다", async () => {
  const { createAddons } = await import("../src/data/addons.js");
  const { sha256 } = await import("../src/engine/hash.js");
  const files = new Map(), store = { getItem: async (k) => files.get(k) ?? null, setItem: async (k, v) => { files.set(k, v); }, removeItem: async (k) => { files.delete(k); } };
  let ver = "0.1.0"; const code = () => `// ${ver}`;
  const man = async () => JSON.stringify({ format: 1, addons: [{ id: "memory", name: "장기기억", version: ver, hooks: true, sha256: await sha256(new TextEncoder().encode(code())), url: "https://x/m.js" }] });
  const asked = [];
  const mk = () => createAddons({ pluginStorage: store }, { core: "2.0.0", onPendingRestart: (x) => asked.push(x), fetcher: async (_a, url) => (url.endsWith(".js") ? code() : await man()), importer: async () => ({ activate: async () => ({ deactivate() {} }) }) });
  const A = mk(); await A.loadManifest(); await A.install("memory");
  assert.equal(asked.length, 0, "처음 받기는 바로 켜짐");
  ver = "0.1.1"; await A.loadManifest(); await A.install("memory");
  assert.deepEqual(asked, [{ id: "memory", name: "장기기억", version: "0.1.1" }]);
  assert.equal((await A.getIndex()).memory.pendingRestart, true);
  const B = mk(); await B.boot();
  assert.equal((await B.getIndex()).memory.pendingRestart, undefined);
});
