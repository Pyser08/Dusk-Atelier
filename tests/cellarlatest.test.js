import { test } from "node:test";
import assert from "node:assert/strict";
import { semverNewer, checkCellarUpdate, latestCellarVersion } from "../src/data/cellarlatest.js";

const mk = (store = {}) => ({ pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } } });
const cel = (st) => ({ status: async () => st });

test("버전 비교", () => {
  assert.equal(semverNewer("0.2.0", "0.1.0"), true);
  assert.equal(semverNewer("v0.1.10", "0.1.9"), true);
  assert.equal(semverNewer("0.1.0", "0.1.0"), false);
  assert.equal(semverNewer("0.1.0", "0.2.0"), false);
});
test("새 버전이 있으면 한 번만 알리고 번호를 돌려준다", async () => {
  const api = mk(), toasts = [];
  const o = { toast: (t) => toasts.push(t), latest: async () => "0.2.0" };
  assert.equal(await checkCellarUpdate(api, cel({ ok: true, version: "0.1.0" }), o), "0.2.0");
  assert.equal(await checkCellarUpdate(api, cel({ ok: true, version: "0.1.0" }), o), "0.2.0");
  assert.equal(toasts.length, 1); assert.match(toasts[0], /0\.2\.0/);
});
test("최신이거나 Cellar가 없거나 확인 실패면 아무것도 안 한다", async () => {
  const toasts = [], o = (l) => ({ toast: (t) => toasts.push(t), latest: l });
  assert.equal(await checkCellarUpdate(mk(), cel({ ok: true, version: "0.2.0" }), o(async () => "0.2.0")), null);
  assert.equal(await checkCellarUpdate(mk(), cel({ ok: false }), o(async () => "9.9.9")), null);
  assert.equal(await checkCellarUpdate(mk(), cel({ ok: true, version: "0.1.0" }), o(async () => { throw new Error("x"); })), null);
  assert.equal(toasts.length, 0);
});
test("GitHub 최신 릴리스 태그를 읽는다", async () => {
  const api = { nativeFetch: async (u, o) => { assert.equal(o.method, "GET"); return { status: 200, json: async () => ({ tag_name: "v0.3.1" }) }; } };
  assert.equal(await latestCellarVersion(api), "0.3.1");
  // 대체 경로(전역 fetch)가 실제 네트워크로 나가지 않게 막고 본다
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 404, json: async () => ({}) });
  try { assert.equal(await latestCellarVersion({ nativeFetch: async () => ({ status: 404, json: async () => ({}) }) }), null); } finally { globalThis.fetch = realFetch; }
});
