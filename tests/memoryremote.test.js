import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRemote, mergeFolder, FLAG_KEY, QUEUE_KEY, REMOTE_PREFIX } from "../src/data/memoryremote.js";
import { createMemoryStoreV3, INDEX_KEY } from "../src/data/memorystore3.js";
import { folderIdOf } from "../src/data/memorystore.js";

// 가짜 Dusk Cellar: /cellar/mem 규칙(rev·baseRev·opId·ifRev·batch)을 그대로 흉내 낸다
function fakeCellar() {
  const data = new Map(); let down = false; const log = [];
  const r = (status, body) => ({ status, json: async () => body, text: async () => JSON.stringify(body) });
  const put = (o) => {
    const cur = data.get(o.key);
    if (o.opId && cur?.ops.includes(o.opId)) return { ok: true, key: o.key, rev: cur.rev, duplicate: true };
    if (o.baseRev !== undefined && o.baseRev !== (cur?.rev ?? 0)) return { ok: false, key: o.key, status: 409, conflict: true, rev: cur?.rev ?? 0 };
    if (o.op === "del") { data.delete(o.key); return { ok: true, key: o.key, deleted: !!cur }; }
    const rev = (cur?.rev ?? 0) + 1;
    data.set(o.key, { rev, value: o.value, ops: [...(cur?.ops ?? []), ...(o.opId ? [o.opId] : [])] });
    return { ok: true, key: o.key, rev };
  };
  const nativeFetch = async (u, o) => {
    if (down) throw new Error("connection refused");
    const url = new URL(u); log.push([o.method, url.pathname + url.search]);
    if (url.pathname === "/cellar/health") return r(200, { ok: true, name: "dusk-cellar", version: "0.1.0", auth: true, features: ["mem"] });
    if (url.pathname === "/cellar/mem/batch" && o.method === "POST") return r(200, { ok: true, results: JSON.parse(o.body).ops.map(put) });
    if (url.pathname === "/cellar/mem") return r(200, { ok: true, items: [...data.keys()].filter((k) => k.startsWith(url.searchParams.get("prefix") ?? "")).map((key) => ({ key, rev: data.get(key).rev })) });
    const key = decodeURIComponent(url.pathname.slice("/cellar/mem/".length)), cur = data.get(key);
    if (!cur) return r(404, { ok: false });
    if (url.searchParams.get("ifRev") === String(cur.rev)) return r(200, { ok: true, key, rev: cur.rev, same: true });
    return r(200, { ok: true, key, rev: cur.rev, value: cur.value });
  };
  return { data, log, nativeFetch, setDown: (v) => { down = v; } };
}
const storage = () => { const m = new Map(); return { m, getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } }; };
const cellarOf = (api) => ({ status: async () => { try { const res = await api.nativeFetch("http://127.0.0.1:6011/cellar/health", { method: "GET" }); const j = await res.json(); return { ok: true, url: "http://127.0.0.1:6011", via: "native", features: j.features }; } catch (e) { return { ok: false, error: e.message }; } } });

function setup({ server = fakeCellar(), ps = storage() } = {}) {
  const api = { pluginStorage: ps, nativeFetch: server.nativeFetch };
  const notes = [];
  let t = 1000;
  const remote = createMemoryRemote(api, { cellar: cellarOf(api), notify: (x) => notes.push(x), log: () => {}, now: () => t, retryMs: 30e3 });
  const store = createMemoryStoreV3(api, { storage: remote.storage });
  remote.attach({ serial: store.serial, dropCache: () => store.dropCache(), folderKeys: async () => Object.keys((await store.getIndex()).folders).map((id) => REMOTE_PREFIX + id) });
  return { api, ps, server, remote, store, notes, tick: (ms) => { t += ms; } };
}
const keyOf = (c, h) => REMOTE_PREFIX + folderIdOf(c, h);
const addRecord = (store, c, h, id) => store.updateFolder(c, h, (f) => { f.people.A ??= { name: "A", records: [] }; f.people.A.records.push({ id, act: id }); });
const ids = (f) => f.people.A.records.map((r) => r.id);

test("Cellar가 없으면 지금처럼 플러그인 저장소에만 쓴다", async () => {
  const server = fakeCellar(); server.setDown(true);
  const s = setup({ server });
  await s.remote.init(); await s.remote.detect();
  await addRecord(s.store, "b", "c", "r1");
  assert.equal(s.remote.state().mode, "local");
  assert.ok(s.ps.m.has(keyOf("b", "c")));
  assert.equal(s.ps.m.has(FLAG_KEY), false);
});

test("Cellar를 찾으면 기존 기억을 올리고, 그다음부터는 서버에만 쓴다", async () => {
  const s = setup();
  await addRecord(s.store, "b", "c", "r1");             // 아직 로컬
  const localBefore = s.ps.m.get(keyOf("b", "c"));
  await s.remote.init(); await s.remote.detect();
  assert.equal(s.remote.state().mode, "remote");
  assert.equal(JSON.parse(s.ps.m.get(FLAG_KEY)).on, true);
  assert.equal(s.server.data.get(keyOf("b", "c")).value, localBefore, "그대로 올라감");
  assert.match(s.notes[0], /1개 채팅/);
  await addRecord(s.store, "b", "c", "r2");
  await addRecord(s.store, "b", "x", "r9");
  assert.equal(s.ps.m.get(keyOf("b", "c")), localBefore, "플러그인 사본은 더 이상 바뀌지 않는다(옛 사본)");
  assert.equal(s.ps.m.has(keyOf("b", "x")), false, "새 채팅 기억은 플러그인에 안 생김");
  assert.deepEqual(ids(JSON.parse(s.server.data.get(keyOf("b", "c")).value)), ["r1", "r2"]);
  assert.deepEqual(ids(await s.store.getFolder("b", "x")), ["r9"]);
  assert.ok(s.ps.m.has(INDEX_KEY), "인덱스·설정은 플러그인에 남는다");
});

test("다시 켜면 표시만 보고 바로 서버 모드(감지를 기다리지 않음), 다시 올리지 않는다", async () => {
  const s1 = setup(); await addRecord(s1.store, "b", "c", "r1"); await s1.remote.init(); await s1.remote.detect();
  const posts = s1.server.log.filter(([m]) => m === "POST").length;
  const s2 = setup({ server: s1.server, ps: s1.ps });
  assert.equal(await s2.remote.init(), "remote");
  await addRecord(s2.store, "b", "c", "r2");
  await s2.remote.detect();
  assert.equal(s1.server.log.filter(([m]) => m === "POST").length, posts + 1, "새 쓰기 한 번만, 다시 올리기 없음");
  assert.deepEqual(ids(JSON.parse(s1.server.data.get(keyOf("b", "c")).value)), ["r1", "r2"]);
});

test("rev가 같으면 값을 다시 받지 않는다(ifRev)", async () => {
  const s = setup(); await addRecord(s.store, "b", "c", "r1"); await s.remote.init(); await s.remote.detect();
  s.store.dropCache(); s.server.log.length = 0;
  await s.store.getFolder("b", "c");
  assert.match(s.server.log[0][1], /ifRev=1$/);
});

test("끊기면 변경을 대기열에 모으고, 읽기는 대기열 값을 쓰고, 다시 연결되면 올린 뒤 비운다", async () => {
  const s = setup(); await addRecord(s.store, "b", "c", "r1"); await s.remote.init(); await s.remote.detect();
  s.server.setDown(true);
  await addRecord(s.store, "b", "c", "r2");
  await addRecord(s.store, "b", "c", "r3");
  await addRecord(s.store, "b", "n", "n1");
  const q = JSON.parse(s.ps.m.get(QUEUE_KEY));
  assert.equal(q.length, 2, "폴더마다 마지막 값 하나");
  assert.equal(s.remote.state().online, false);
  s.store.dropCache();
  assert.deepEqual(ids(await s.store.getFolder("b", "c")), ["r1", "r2", "r3"]);
  s.server.setDown(false); s.tick(31e3);
  assert.equal(await s.remote.flush(), 2);
  assert.equal(s.ps.m.has(QUEUE_KEY), false);
  assert.deepEqual(ids(JSON.parse(s.server.data.get(keyOf("b", "c")).value)), ["r1", "r2", "r3"]);
  assert.deepEqual(ids(JSON.parse(s.server.data.get(keyOf("b", "n")).value)), ["n1"]);
  assert.ok(s.notes.some((n) => /2건/.test(n)));
});

test("끊긴 채로 새로 켜도 옛 사본+대기열로 읽고, 다른 기기가 바꾼 서버 값과 합친다", async () => {
  const s1 = setup(); await addRecord(s1.store, "b", "c", "r1"); await s1.remote.init(); await s1.remote.detect();
  await addRecord(s1.store, "b", "c", "r2");   // 서버: r1 r2 / 옛 사본: r1
  s1.server.setDown(true);
  const s2 = setup({ server: s1.server, ps: s1.ps });
  await s2.remote.init(); await s2.remote.detect();
  assert.deepEqual(ids(await s2.store.getFolder("b", "c")), ["r1"], "연결 없이 켜면 옛 사본");
  await addRecord(s2.store, "b", "c", "x1");   // 대기열: r1 x1 (baseRev 모름)
  s1.server.setDown(false);
  // 그사이 다른 기기가 서버에 r3 추가
  const other = setup({ server: s1.server, ps: storage() }); other.ps.m.set(FLAG_KEY, s1.ps.m.get(FLAG_KEY)); other.ps.m.set(INDEX_KEY, s1.ps.m.get(INDEX_KEY));
  await other.remote.init(); await other.remote.detect();
  await addRecord(other.store, "b", "c", "r3");
  s2.tick(31e3);
  await s2.remote.detect();
  assert.deepEqual(ids(JSON.parse(s1.server.data.get(keyOf("b", "c")).value)), ["r1", "r2", "r3", "x1"], "id로 합쳐 아무것도 잃지 않는다");
});

test("온라인 쓰기 중 다른 기기와 부딪히면 합쳐서 다시 쓴다", async () => {
  const s = setup(); await addRecord(s.store, "b", "c", "r1"); await s.remote.init(); await s.remote.detect();
  await s.store.getFolder("b", "c");
  const k = keyOf("b", "c"), cur = s.server.data.get(k), f = JSON.parse(cur.value);
  f.people.A.records.push({ id: "o1" });
  s.server.data.set(k, { rev: cur.rev + 1, value: JSON.stringify(f), ops: [] });   // 다른 기기
  s.store.dropCache();
  await s.store.updateFolder("b", "c", (fo) => fo.people.A.records.push({ id: "r2" }));
  assert.deepEqual(ids(JSON.parse(s.server.data.get(k).value)), ["r1", "o1", "r2"]);
});

test("되돌리기: 서버 기억을 플러그인으로 받아 오고 서버 모드를 끈다(서버 값은 그대로)", async () => {
  const s = setup(); await addRecord(s.store, "b", "c", "r1"); await s.remote.init(); await s.remote.detect();
  await addRecord(s.store, "b", "c", "r2");
  const r = await s.remote.disable();
  assert.equal(r.pulled, 1);
  assert.equal(s.remote.state().mode, "local");
  assert.equal(s.ps.m.has(FLAG_KEY), false);
  assert.deepEqual(ids(JSON.parse(s.ps.m.get(keyOf("b", "c")))), ["r1", "r2"]);
  assert.ok(s.server.data.has(keyOf("b", "c")));
  await addRecord(s.store, "b", "c", "r3");
  assert.deepEqual(ids(JSON.parse(s.ps.m.get(keyOf("b", "c")))), ["r1", "r2", "r3"]);
});

test("연결 없이 되돌리기: 옛 사본 위에 대기열을 얹는다", async () => {
  const s = setup(); await addRecord(s.store, "b", "c", "r1"); await s.remote.init(); await s.remote.detect();
  s.server.setDown(true);
  await addRecord(s.store, "b", "c", "q1");
  const r = await s.remote.disable({ force: true });
  assert.equal(r.pulled, 1);
  assert.deepEqual(ids(JSON.parse(s.ps.m.get(keyOf("b", "c")))), ["r1", "q1"]);
  assert.equal(s.ps.m.has(QUEUE_KEY), false);
});

test("올리기가 실패하면(쓰기 막힘) 플러그인 저장 그대로, 표시 없음", async () => {
  const server = fakeCellar();
  const nf = server.nativeFetch;
  server.nativeFetch = async (u, o) => (o.method === "POST" ? { status: 403, json: async () => ({ ok: false, error: "proxy" }) } : nf(u, o));
  const s = setup({ server });
  await addRecord(s.store, "b", "c", "r1");
  await s.remote.init(); await s.remote.detect();
  assert.equal(s.remote.state().mode, "local");
  assert.equal(s.ps.m.has(FLAG_KEY), false);
  await addRecord(s.store, "b", "c", "r2");
  assert.deepEqual(ids(JSON.parse(s.ps.m.get(keyOf("b", "c")))), ["r1", "r2"]);
});

test("mergeFolder: 기록·장면 id 합치기, 위키는 revision 큰 쪽, 이 기기 삭제는 삭제", () => {
  const sv = { people: { A: { records: [{ id: 1, v: "s" }, { id: 2 }] }, B: { records: [{ id: 9 }] } }, scenes: [{ id: "s1" }], wiki: { revision: 5, d: "s" }, cursor: { at: 1 } };
  const lo = { people: { A: { records: [{ id: 1, v: "l" }, { id: 3 }] } }, scenes: [{ id: "s2" }], wiki: { revision: 4 }, cursor: { at: 2 } };
  const m = mergeFolder(sv, lo);
  assert.deepEqual(m.people.A.records, [{ id: 1, v: "l" }, { id: 2 }, { id: 3 }]);
  assert.deepEqual(m.people.B.records, [{ id: 9 }]);
  assert.deepEqual(m.scenes.map((x) => x.id), ["s1", "s2"]);
  assert.equal(m.wiki.d, "s"); assert.deepEqual(m.cursor, { at: 2 });
  assert.equal(mergeFolder(sv, null), null);
  assert.equal(mergeFolder(null, lo), lo);
});

test("서버가 받지 않는 대기열 항목은 플러그인 사본으로 남기고 나머지는 계속 올린다", async () => {
  const s = setup(); await addRecord(s.store, "b", "c", "r1"); await s.remote.init(); await s.remote.detect();
  s.server.setDown(true);
  await addRecord(s.store, "b", "c", "big");
  await addRecord(s.store, "b", "d", "d1");
  s.server.setDown(false);
  const nf = s.server.nativeFetch;
  s.api.nativeFetch = async (u, o) => (o.method === "POST" && o.body.includes("big") ? { status: 200, json: async () => ({ ok: true, results: [{ ok: false, status: 413, error: "값이 너무 커요" }] }) } : nf(u, o));
  s.tick(31e3);
  assert.equal(await s.remote.flush(), 2);
  assert.deepEqual(ids(JSON.parse(s.ps.m.get(keyOf("b", "c")))), ["r1", "big"], "잃지 않고 플러그인에 남음");
  assert.ok(s.server.data.has(keyOf("b", "d")));
});
