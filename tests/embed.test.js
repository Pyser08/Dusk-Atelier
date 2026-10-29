import test from "node:test";
import assert from "node:assert/strict";
import { normCfg, isContextual, endpointOf, buildRequest, parseResponse, pack, unpack, cosine, semBoost, isReady } from "../src/engine/embed.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { createEmbedder } from "../src/data/embed.js";

test("주소·요청·응답", () => {
  assert.equal(endpointOf("https://a.com/v1/"), "https://a.com/v1/embeddings");
  assert.equal(endpointOf("https://a.com/v1/embeddings"), "https://a.com/v1/embeddings");
  assert.equal(endpointOf("a.com"), "");
  const r = buildRequest({ url: "https://a.com/v1", model: "m" }, "K", ["x"]);
  assert.equal(r.headers.Authorization, "Bearer K"); assert.deepEqual(JSON.parse(r.body), { model: "m", input: ["x"] });
  assert.deepEqual(parseResponse({ data: [{ index: 1, embedding: [0, 1, 0, 0] }, { index: 0, embedding: [1, 0, 0, 0] }] }, 2), [[1, 0, 0, 0], [0, 1, 0, 0]]);
  assert.equal(parseResponse({ data: [] }, 1), null);
  assert.ok(!isReady(normCfg({ on: true, url: "https://a.com", model: "m" }), false));
  assert.ok(isReady(normCfg({ on: true, url: "http://localhost:11434/v1", model: "m" }), false));
});
test("보야지 컨텍스트 형식", () => {
  const cfg = normCfg({ on: true, url: "https://api.voyageai.com/v1/contextualizedembeddings", model: "voyage-context-4" });
  assert.ok(isContextual(cfg)); assert.equal(endpointOf(cfg.url), cfg.url);
  const r = buildRequest(cfg, "K", { groups: [["a", "b"], ["c"]], type: "query" });
  assert.deepEqual(JSON.parse(r.body), { model: "voyage-context-4", inputs: [["a", "b"], ["c"]], input_type: "query" });
  const v = (x) => [x, 0, 0, 0];
  const res = { data: [{ index: 1, data: [{ index: 0, embedding: v(3) }] }, { index: 0, data: [{ index: 1, embedding: v(2) }, { index: 0, embedding: v(1) }] }] };
  assert.deepEqual(parseResponse(res, 3, true), [v(1), v(2), v(3)]); assert.equal(parseResponse(res, 2, true), null);
  assert.equal(normCfg(null).model, "voyage-4-large"); assert.equal(normCfg(null).url, "https://api.voyageai.com/v1/embeddings"); assert.ok(!isContextual(normCfg(null)));
  assert.ok(JSON.parse(buildRequest(normCfg({ url: "https://api.voyageai.com/v1", model: "voyage-4" }), "", ["x"]).body).input_type);
});
test("압축·유사도·가중치", () => {
  const a = [0.3, 0.9, -0.2, 0.1], b = unpack(pack(a));
  assert.ok(cosine(a, b) > 0.99); assert.ok(cosine([1, 0, 0, 0], [0, 1, 0, 0]) < 0.01);
  assert.equal(semBoost(0.1), 1); assert.ok(semBoost(0.6) > 2); assert.equal(semBoost(0.99), 3);
});
test("buildBlock: 유사도가 높은 낮은 등급 기록을 끌어올린다", () => {
  const rec = (id, act, g) => ({ id, at: 1, mid: "m", h: id, act, g, m: 1, orphan: false });
  const f = { people: { 하루: { name: "하루", aliases: [], records: [rec("a", "서랍에서 낡은 열쇠를 발견함", "D"), ...Array.from({ length: 6 }, (_, i) => rec("b" + i, "도움 " + i, "B"))] } }, scenes: [{ id: "s", at: 0, sum: "x", who: ["하루"], orphan: false }], runs: 5 };
  const base = buildBlock(f, { messageCount: 60, recentText: "하루가 말했다", settings: { recentSkip: 0 } });
  const sem = buildBlock(f, { messageCount: 60, recentText: "하루가 말했다", settings: { recentSkip: 0 }, sem: new Map([["a", 0.8]]) });
  assert.ok(!base.manifest.recordIds.includes("a") && sem.manifest.recordIds.includes("a"));
});
test("embedder: 호출·캐시·실패 폴백", async () => {
  const store = {}; let calls = 0, fail = false;
  const api = { safeLocalStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } },
    nativeFetch: async (u, o) => { calls++; if (fail) throw new Error("net"); const inp = JSON.parse(o.body).input; return { ok: true, json: async () => ({ data: inp.map((t, i) => ({ index: i, embedding: /열쇠|키/.test(t) ? [1, 0, 0, 0] : [0, 1, 0, 0] })) }) }; } };
  const E = createEmbedder(api, { log() {} });
  assert.equal(await E.scores("f", { people: {} }, "열쇠"), null);
  await E.save({ on: true, url: "https://a.com/v1", model: "m", key: "K" });
  const f = { people: { 하루: { name: "하루", records: [{ id: "a", act: "열쇠를 발견함" }, { id: "b", act: "차를 마심" }] } } };
  const s = await E.scores("f", f, "열쇠가 보였다");
  assert.ok(s.get("a") > 0.9 && s.get("b") < 0.1);
  const n = calls; await E.scores("f", f, "열쇠가 보였다"); assert.equal(calls, n, "캐시");
  fail = true; assert.equal(await E.scores("f", f, "전혀 다른 새 글"), null, "실패하면 null");
  assert.ok(!JSON.stringify(store).includes("Bearer"));
});
test("embedder: 컨텍스트 모드는 인물별 묶음 + 장면은 query로 보낸다", async () => {
  const store = {}, seen = [];
  const api = { safeLocalStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } },
    nativeFetch: async (u, o) => { const b = JSON.parse(o.body); seen.push(b); return { ok: true, json: async () => ({ data: b.inputs.map((g, i) => ({ index: i, data: g.map((t, j) => ({ index: j, embedding: /열쇠/.test(t) ? [1, 0, 0, 0] : [0, 1, 0, 0] })) })) }) }; } };
  const E = createEmbedder(api, { log() {} });
  await E.save({ on: true, key: "K", url: "https://api.voyageai.com/v1/contextualizedembeddings", model: "voyage-context-4" });
  const f = { people: { 하루: { name: "하루", records: [{ id: "a", act: "열쇠 발견" }, { id: "b", act: "차 마심" }] }, 미나: { name: "미나", records: [{ id: "c", act: "열쇠 숨김" }] } } };
  const s = await E.scores("g", f, "열쇠");
  assert.ok(s.get("a") > 0.9 && s.get("b") < 0.1 && s.get("c") > 0.9);
  assert.ok(seen.some((b) => b.input_type === "query") && seen.some((b) => b.input_type === "document" && b.inputs.length === 2));
});
