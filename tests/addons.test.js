import test from "node:test";
import assert from "node:assert/strict";
import { parseManifest, pickUpdates, cmpVer, rowState } from "../src/engine/addons.js";
import { createAddons, latin1ToUtf8 } from "../src/data/addons.js";
import { sha256 } from "../src/engine/hash.js";

const H = (c) => sha256(new TextEncoder().encode(c));
async function setup({ hooks = false } = {}) {
  const kv = new Map();
  const store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const files = {}, log = [];
  const api = { getLocalPluginStorage: () => store, pluginStorage: store };
  const put = async (version, body) => { files["https://x/a.js"] = body; files.manifest = JSON.stringify({ format: 1, addons: [{ id: "a", name: "A", version, minCore: "2.0.0", url: "https://x/a.js", sha256: await H(body), hooks }] }); };
  const fetcher = async (_api, url0) => { const url = url0.split("?")[0]; return url.endsWith("addons.json") ? files.manifest : files[url] ?? null; };   // 주소 뒤 캐시 우회 값은 떼고 본다
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
test("훅 있는 애드온도 업데이트하면 새로고침 없이 바로 새 버전", async () => {
  const { A, log, put } = await setup({ hooks: true });
  await put("1.0.0", "ok:1"); await A.loadManifest(); await A.install("a");
  await put("1.1.0", "ok:2"); await A.check({ force: true });
  assert.deepEqual(log.slice(-2), [["off", "ok:1"], ["on", "ok:2", "1.1.0"]]);
  assert.equal((await A.getIndex()).a.pendingRestart, undefined);
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
  const fetcher = async (_a, u0) => { const u = u0.split("?")[0]; return u.endsWith("addons.json") ? files.manifest : files[u]; };
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
  const A = createAddons({ pluginStorage: store }, { core: "2.0.0", storage: store, fetcher: async (_a, url) => (url.split("?")[0].endsWith(".json") ? manifest : code), importer: async () => ({ activate: async () => ({ deactivate() {} }) }) });
  const r = await A.adopt([["memory", async () => false], ["cards", async () => true], ["widgets", async () => false]]);
  assert.deepEqual(r.got, ["cards"]);
  const idx = await A.getIndex();
  assert.ok(idx.memory && idx.cards && !idx.widgets, "필요 애드온(memory)도 같이 받음");
  assert.equal(files.get(ADOPT_KEY), "1");
  assert.deepEqual((await A.adopt([["widgets", async () => true]])).got, []);
});

test("애드온이 단 훅은 끌 때 모두 떼고, 프로바이더는 같은 이름으로 다시 달면 처리기만 바뀐다", async () => {
  const { createAddons } = await import("../src/data/addons.js");
  const { sha256 } = await import("../src/engine/hash.js");
  const files = new Map(), store = { getItem: async (k) => files.get(k) ?? null, setItem: async (k, v) => { files.set(k, v); }, removeItem: async (k) => { files.delete(k); } };
  const hooks = [], provs = new Map(); let hostAdds = 0;
  const api = { pluginStorage: store,
    addRisuReplacer: async (t, f) => { hooks.push(f); }, removeRisuReplacer: async (t, f) => { const i = hooks.indexOf(f); if (i >= 0) hooks.splice(i, 1); },
    addProvider: async (n, f) => { hostAdds++; provs.set(n, f); } };
  let ver = "0.1.0"; const code = () => `// ${ver}`;
  const man = async () => JSON.stringify({ format: 1, addons: [{ id: "memory", name: "장기기억", version: ver, hooks: true, sha256: await sha256(new TextEncoder().encode(code())), url: "https://x/m.js" }] });
  const asked = [];
  const A = createAddons(api, { core: "2.0.0", onPendingRestart: (x) => asked.push(x), fetcher: async (_a, url) => (url.split("?")[0].endsWith(".js") ? code() : await man()),
    importer: async (c) => ({ activate: async (sapi) => { const v = c; await sapi.addRisuReplacer("beforeRequest", () => v); await sapi.addProvider("Dusk", async () => v); return { deactivate() {} }; } }) });
  await A.loadManifest(); await A.install("memory");
  assert.equal(hooks.length, 1);
  ver = "0.1.1"; await A.loadManifest(); await A.install("memory");
  assert.equal(asked.length, 0, "새로고침 안내 없음");
  assert.equal(hooks.length, 1, "예전 훅은 떼고 새 훅 하나만");
  assert.equal(hooks[0](), "// 0.1.1");
  assert.equal(hostAdds, 1, "프로바이더는 호스트에 한 번만");
  assert.equal(await provs.get("Dusk")(), "// 0.1.1");
  await A.setOn("memory", false);
  assert.equal(hooks.length, 0);
  await assert.rejects(provs.get("Dusk")(), /꺼져 있어요/);
});

test("실행 중에도 주기적으로 확인하고, 목록·파일은 캐시를 건너뛴 주소로 받는다", async () => {
  const { createAddons } = await import("../src/data/addons.js");
  const files = new Map(), store = { getItem: async (k) => files.get(k) ?? null, setItem: async (k, v) => { files.set(k, v); }, removeItem: async (k) => { files.delete(k); } };
  const urls = [], ticks = []; let t = 1e12;
  const A = createAddons({ pluginStorage: store }, { core: "2.0.0", now: () => t, timers: { setTimeout: (f) => { ticks.push(["once", f]); return 0; }, setInterval: (f, ms) => { ticks.push(["every", f, ms]); return 0; } },
    fetcher: async (_a, url) => { urls.push(url); return JSON.stringify({ format: 1, addons: [] }); } });
  await A.boot();
  const every = ticks.find((x) => x[0] === "every");
  assert.ok(every && every[2] <= 3600e3, "주기 확인이 걸림(1시간 이하)");
  await A.check({ force: true });
  assert.match(urls.at(-1), /[?&]t=\d+/, "목록 주소에 캐시 우회 값");
  const n = urls.length; t += 3600e3 + 1; await every[1](); assert.ok(urls.length > n, "한 시간 지나면 주기 확인이 실제로 목록을 받음");
  const m = urls.length; t += 30e3; await A.checkSoon(); assert.equal(urls.length, m, "방금(1분 안) 확인했으면 창을 열어도 다시 안 받음");
  t += 40e3; await A.checkSoon(); assert.ok(urls.length > m, "1분 지나면 창을 열 때 확인(애드온을 올리고 바로 열어도 잡히게)");
});

test("시작: 서로 상관없는 애드온은 동시에 켜고, 필요 애드온이 있으면 그것만 기다린다", async () => {
  const { createAddons } = await import("../src/data/addons.js");
  const files = new Map(), store = { getItem: async (k) => { await new Promise((r) => setTimeout(r, 20)); return files.get(k) ?? null; }, setItem: async (k, v) => { files.set(k, v); }, removeItem: async (k) => { files.delete(k); } };
  const idx = { memory: { version: "0.1.0", on: true }, widgets: { version: "0.1.0", on: true }, manage: { version: "0.1.0", on: true }, cards: { version: "0.1.0", on: true, requires: ["memory"] } };
  files.set("dusk.addon.index", JSON.stringify(idx));
  for (const id of Object.keys(idx)) files.set(`dusk.addon.code.${id}`, `// ${id}`);
  const order = [];
  const importer = async (code) => { const id = code.slice(3); order.push(`+${id}`); await new Promise((r) => setTimeout(r, 100)); order.push(`-${id}`); return { activate: async () => ({}) }; };
  const A = createAddons({ pluginStorage: store }, { core: "2.0.0", storage: store, importer, timers: { setTimeout: () => 0, setInterval: () => 0 }, fetcher: async () => null });
  const t0 = Date.now(); await A.boot(); const ms = Date.now() - t0;
  assert.ok(ms < 320, `동시에 켬(차례로면 400ms 넘음): ${ms}ms`);
  assert.ok(order.indexOf("+cards") > order.indexOf("-memory"), "cards는 memory가 켜진 뒤");
  assert.ok(["cards", "manage", "memory", "widgets"].every((id) => A.running(id)), "모두 켜짐");
});

test("여러 애드온을 동시에 받아도 모두 설치된다(서로의 기록을 덮어쓰지 않음)", async () => {
  const kv = new Map();
  // 저장이 느린 기기 흉내: 읽기·쓰기 사이에 다른 받기가 끼어들 틈을 준다
  const wait = () => new Promise((r) => setTimeout(r, 5));
  const store = { getItem: async (k) => { await wait(); return kv.get(k) ?? null; }, setItem: async (k, v) => { await wait(); kv.set(k, structuredClone(v)); }, removeItem: async (k) => { kv.delete(k); } };
  const ids = ["a", "b", "c", "d"], files = {};
  const addons = await Promise.all(ids.map(async (id) => { const body = `ok:${id}`; files[`https://x/${id}.js`] = body; return { id, name: id, version: "1.0.0", minCore: "2.0.0", url: `https://x/${id}.js`, sha256: await H(body) }; }));
  files.manifest = JSON.stringify({ format: 1, addons });
  const fetcher = async (_api, u) => { await wait(); const url = u.split("?")[0]; return url.endsWith("addons.json") ? files.manifest : files[url] ?? null; };
  const importer = async () => ({ activate: async () => ({ deactivate() {} }) });
  const A = createAddons({ getLocalPluginStorage: () => store, pluginStorage: store }, { core: "2.0.0", fetcher, importer, log: () => {} });
  await A.loadManifest();
  await Promise.all(ids.map((id) => A.install(id)));
  assert.deepEqual(Object.keys(await A.getIndex()).sort(), ids);
  // 한 번에 받기
  const r = await A.installMany(["a", "b"]);
  assert.ok(r.every((x) => x.ok));
});

test("'업데이트 확인' 버튼(fresh): 브랜치 최신 커밋으로 고정한 주소로 받아 raw 캐시(최대 5분)에 걸리지 않는다", async () => {
  const kv = new Map(), store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const api = { getLocalPluginStorage: () => store, pluginStorage: store };
  const base = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/addons/addons/";
  const SHA = "abc123def4567890abc123def4567890abc12345";
  const pinned = `https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/${SHA}/addons/`;
  const body = "export default 1";
  const hOld = await H("old"), hNew = await H(body);
  const mf = (ver, b) => JSON.stringify({ format: 1, addons: [{ id: "a", name: "A", version: ver, minCore: "2.0.0", url: base + "dist/a.js", sha256: b === "old" ? hOld : hNew }] });
  const seen = [];
  const fetcher = async (_api, u0) => { const u = u0.split("?")[0]; seen.push(u);
    if (u === "https://api.github.com/repos/Pyser08/Dusk-Atelier/git/ref/heads/addons") return JSON.stringify({ object: { sha: SHA } });
    if (u === base + "addons.json") return mf("1.0.0", "old");            // 캐시된 예전 목록
    if (u === base + "dist/a.js") return "old";
    if (u === pinned + "addons.json") return mf("1.1.0", body);           // 최신
    if (u === pinned + "dist/a.js") return body;
    return null; };
  const A = createAddons(api, { core: "2.0.0", fetcher, importer: async () => ({ activate: async () => ({}) }), log: () => {} });
  await A.install("a");   // 예전 목록으로 1.0.0 설치
  const r = await A.check({ force: true, fresh: true });
  assert.ok(seen.includes(pinned + "addons.json") && seen.includes(pinned + "dist/a.js"), seen.join("\n"));
  assert.equal((await A.getIndex()).a?.version, "1.1.0", "버튼 한 번에 최신으로");
  assert.equal(r.error, undefined);
});

test("새로 생긴 애드온만 알린다(처음 확인·버전만 오른 것·이미 받은 것은 알리지 않음)", async () => {
  const { createAddons } = await import("../src/data/addons.js");
  const files = new Map(), store = { getItem: async (k) => files.get(k) ?? null, setItem: async (k, v) => { files.set(k, v); }, removeItem: async (k) => { files.delete(k); } };
  let list = [{ id: "a", name: "A", version: "1.0.0" }];
  const man = async () => JSON.stringify({ format: 1, addons: await Promise.all(list.map(async (x) => ({ ...x, minCore: "2.0.0", url: `https://x/${x.id}.js`, sha256: await sha256(new TextEncoder().encode("//" + x.version)) }))) });
  const seen = [];
  const A = createAddons({ pluginStorage: store }, { core: "2.0.0", onNewAddons: (xs) => seen.push(xs.map((x) => x.id)), fetcher: async (_a, url) => (url.split("?")[0].endsWith("addons.json") ? await man() : "//" + list.find((x) => url.includes(`/${x.id}.js`)).version), importer: async () => ({ activate: async () => ({}) }) });
  await A.check({ force: true });
  assert.deepEqual(seen, [], "처음 확인은 기준만 잡음");
  list = [{ id: "a", name: "A", version: "1.1.0" }, { id: "b", name: "B", version: "0.1.0" }];
  await A.check({ force: true });
  assert.deepEqual(seen, [["b"]], "b만 새로 생김");
  list = [{ id: "a", name: "A", version: "1.2.0" }, { id: "b", name: "B", version: "0.2.0" }];
  await A.check({ force: true });
  assert.deepEqual(seen, [["b"]], "버전만 오르면 알리지 않음");
});

test("목록이 옛 사본이라 확인값이 어긋나면 고정 주소로 목록을 다시 받아 설치", async () => {
  const kv = new Map();
  const store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const api = { getLocalPluginStorage: () => store, pluginStorage: store };
  const sha = "1".repeat(40), body = "ok:new";
  const mf = async (h) => JSON.stringify({ format: 1, addons: [{ id: "a", name: "A", version: "2.0.0", minCore: "2.0.0", url: "https://raw.githubusercontent.com/o/r/addons/addons/dist/a.js", sha256: h }] });
  const stale = await mf(await H("ok:old"));
  const fetcher = async (_a, url) => {
    if (url.includes("api.github.com")) return JSON.stringify({ object: { sha } });
    if (url.includes(`/${sha}/addons/addons.json`)) return mf(await H(body));
    if (url.includes("addons.json")) return stale;
    return body;
  };
  const A = createAddons(api, { core: "2.0.0", fetcher, importer: async () => ({ activate: async () => ({}) }), log: () => {} });
  await A.loadManifest();
  await A.install("a");
  assert.ok(A.running("a"));
});

test("호스트가 UTF-8을 latin1로 풀어 줘도 되살려 설치", async () => {
  const kv = new Map();
  const store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const api = { getLocalPluginStorage: () => store, pluginStorage: store };
  const body = "ok:한글 애드온";
  const broken = String.fromCharCode(...new TextEncoder().encode(body));
  const man = JSON.stringify({ format: 1, addons: [{ id: "a", name: "A", version: "1.0.0", minCore: "2.0.0", url: "https://x/a.js", sha256: await H(body) }] });
  const fetcher = async (_a, url) => (url.includes("addons.json") ? man : broken);
  const A = createAddons(api, { core: "2.0.0", fetcher, importer: async () => ({ activate: async () => ({}) }), log: () => {} });
  await A.loadManifest(); await A.install("a");
  assert.ok(A.running("a"));
  assert.equal(latin1ToUtf8("abc"), null);
});
