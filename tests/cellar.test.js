import { test } from "node:test";
import assert from "node:assert/strict";
import { cellarRequest, probeCellar, createCellar, loadCellarUrl, saveCellarUrl, CELLAR_DEFAULT_URL, CELLAR_URL_KEY } from "../src/data/cellar.js";

const res = (status, body) => ({ status, json: async () => body, text: async () => JSON.stringify(body) });
const store = () => { const m = new Map(); return { m, getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } }; };

test("nativeFetch(GET)로 health를 읽어 연결됨", async () => {
  const calls = [];
  const api = { nativeFetch: async (u, o) => { calls.push([u, o.method]); return res(200, { ok: true, name: "dusk-cellar", version: "0.1.0", auth: true }); } };
  const r = await probeCellar(api, "http://127.0.0.1:6011");
  assert.deepEqual(r, { ok: true, version: "0.1.0", url: "http://127.0.0.1:6011", via: "native", auth: true, features: [] });
  assert.deepEqual(calls, [["http://127.0.0.1:6011/cellar/health", "GET"]]);
});

test("nativeFetch가 실패하면 일반 fetch로 다시 시도", async () => {
  const api = { nativeFetch: async () => { throw new Error("blocked"); } };
  const orig = globalThis.fetch;
  globalThis.fetch = async () => res(200, { name: "dusk-cellar", version: "0.2.0" });
  try { const r = await probeCellar(api, "http://x"); assert.equal(r.ok, true); assert.equal(r.via, "fetch"); }
  finally { globalThis.fetch = orig; }
});

test("다른 서버가 응답하거나 오류면 연결 안 됨(이유 포함)", async () => {
  const orig = globalThis.fetch; globalThis.fetch = undefined;
  try {
    assert.equal((await probeCellar({ nativeFetch: async () => res(200, { name: "other" }) }, "http://x")).ok, false);
    const r = await probeCellar({ nativeFetch: async () => res(502, {}) }, "http://x");
    assert.equal(r.ok, false); assert.match(r.error, /502/);
    assert.equal((await probeCellar({}, "http://x")).ok, false);
  } finally { globalThis.fetch = orig; }
});

test("주소: 기본값, 저장·되돌리기, 잘못된 주소 거절", async () => {
  const ps = store(); const api = { pluginStorage: ps };
  assert.equal(await loadCellarUrl(api), CELLAR_DEFAULT_URL);
  await saveCellarUrl(api, "https://my.duckdns.org/cellar/");
  assert.equal(await loadCellarUrl(api), "https://my.duckdns.org/cellar");
  await assert.rejects(saveCellarUrl(api, "ftp://x"));
  await saveCellarUrl(api, "");
  assert.equal(ps.m.has(CELLAR_URL_KEY), false);
});

test("상태는 1분 동안 기억하고, 동시에 물으면 한 번만 보낸다", async () => {
  let n = 0, t = 0;
  const api = { pluginStorage: store(), nativeFetch: async () => { n++; return res(200, { name: "dusk-cellar", version: "1" }); } };
  const c = createCellar(api, { now: () => t });
  await Promise.all([c.status(), c.status()]);
  assert.equal(n, 1);
  t = 30e3; await c.status(); assert.equal(n, 1);
  t = 61e3; await c.status(); assert.equal(n, 2);
  await c.status({ fresh: true }); assert.equal(n, 3);
  assert.equal(c.peek().ok, true);
});

test("cellarRequest: GET은 method만, POST는 JSON 본문. 연결 문제는 network 표시", async () => {
  const calls = [];
  const api = { nativeFetch: async (u, o) => { calls.push([u, o]); return res(o.method === "POST" ? 409 : 200, { ok: o.method !== "POST", conflict: true, rev: 3 }); } };
  const g = await cellarRequest(api, { url: "http://c", via: "native" }, "/cellar/mem/k");
  assert.equal(g.status, 200);
  const p = await cellarRequest(api, { url: "http://c", via: "native" }, "/cellar/mem/batch", { method: "POST", body: { ops: [] } });
  assert.equal(p.status, 409); assert.equal(p.json.rev, 3);
  assert.deepEqual(calls[0][1], { method: "GET" });
  assert.equal(calls[1][1].body, '{"ops":[]}'); assert.equal(calls[1][1].headers["content-type"], "application/json");
  await assert.rejects(cellarRequest({ nativeFetch: async () => res(502, {}) }, { url: "http://c" }, "/x"), (e) => e.network && e.status === 502);
  await assert.rejects(cellarRequest({ nativeFetch: async () => { throw new Error("down"); } }, { url: "http://c" }, "/x"), (e) => e.network);
  await assert.rejects(cellarRequest({ nativeFetch: async () => res(401, { ok: false }) }, { url: "http://c" }, "/x"), (e) => e.network);
  await assert.rejects(cellarRequest({}, { url: "http://c" }, "/x"), (e) => e.network, "nativeFetch가 없으면 일반 fetch로 바꾸지 않는다");
});
