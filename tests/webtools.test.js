import test from "node:test";
import assert from "node:assert/strict";
import { createWebTools, normalizeWebCfg, defaultWebCfg, WEB_KEY } from "../src/data/webtools.js";
import { setWebWrapProvider, webWrap } from "../src/engine/webhook.js";
import { setSkillBlockProvider, skillBlock, recentCalls, clearCalls } from "../src/engine/skillhook.js";

const mk = (fetchImpl, init = {}) => { const m = new Map(Object.entries(init)); return { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, nativeFetch: fetchImpl, _m: m }; };
const ok = (body) => async () => ({ ok: true, status: 200, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

test("cfg: default off, sanitized", () => {
  assert.equal(defaultWebCfg().on, false);
  const c = normalizeWebCfg({ on: true, stages: ["writer", "bogus"], provider: "nope", lang: "x/y", maxSteps: 99, maxResults: 0, key: " K " });
  assert.deepEqual([c.on, c.stages, c.provider, c.lang, c.maxSteps, c.key], [true, ["writer"], "wikipedia", "ko", 3, "K"]);
  assert.equal(normalizeWebCfg(null).on, false);
});

test("search + fetch go through nativeFetch; SSRF blocked before any request", async () => {
  const sent = [];
  const api = mk(async (u, i) => { sent.push([u, i]); return u.includes("wikipedia") ? { ok: true, text: async () => JSON.stringify({ query: { search: [{ title: "A", snippet: "s" }] } }) } : { ok: true, text: async () => "<p>페이지</p>" }; });
  const w = createWebTools(api, { log() {} });
  const r = await w.search("q"); assert.equal(r[0].title, "A"); assert.equal(sent[0][1].method, "GET");
  assert.equal(await w.fetchPage("https://example.com/x"), "페이지");
  assert.equal(sent[1][1].redirect, "error");
  const before = sent.length;
  await assert.rejects(() => w.fetchPage("http://169.254.169.254/"), /내부/);
  await assert.rejects(() => w.exec("web_fetch", { url: "http://localhost:3000" }), /내부/);
  assert.equal(sent.length, before);
  await assert.rejects(() => createWebTools(mk(async () => ({ ok: false, status: 500 }))).search("q"), /HTTP 500/);
  await assert.rejects(() => createWebTools(mk(ok("not json"))).search("q"), /읽을 수 없/);
  await assert.rejects(() => createWebTools({ pluginStorage: api.pluginStorage }).search("q"), /웹 요청/);
});

test("wrap: off / other stage / not ready => one plain call; on => instruction + tool loop", async () => {
  const api = mk(ok({ query: { search: [{ title: "서울", snippet: "도시" }] } }));
  const w = createWebTools(api, { log() {} }), prompts = [];
  const call = async (p) => { prompts.push(p); return prompts.length === 1 ? '[[tool:web_search {"query":"서울"}]]' : "FINAL"; };
  assert.equal(await w.wrap("director", "P", async (p) => { prompts.push(p); return "plain"; }), "plain");
  assert.deepEqual(prompts, ["P"]);                                   // 꺼짐: 원문 그대로 한 번
  await w.saveCfg({ ...defaultWebCfg(), on: true, stages: ["director"] }); prompts.length = 0;
  assert.equal(await w.wrap("writer", "P", async (p) => { prompts.push(p); return "x"; }), "x"); assert.deepEqual(prompts, ["P"]);   // 다른 단계
  await w.saveCfg({ ...defaultWebCfg(), on: true, provider: "brave", key: "" }); prompts.length = 0;
  await w.wrap("director", "P", async (p) => { prompts.push(p); return "x"; }); assert.deepEqual(prompts, ["P"]);                   // 키 없음 = 준비 안 됨
  await w.saveCfg({ ...defaultWebCfg(), on: true }); prompts.length = 0; clearCalls(); setSkillBlockProvider(null); await skillBlock("director");
  assert.equal(await w.wrap("director", "P", call), "FINAL");
  assert.equal(prompts.length, 2);
  assert.match(prompts[0], /^P\n\n\[Tools\]/);
  assert.match(prompts[1], /\[Tool Result: web_search\]\n1\. 서울/);
  assert.deepEqual(recentCalls()[0].tools, ["web_search"]);
  assert.ok(api._m.get(WEB_KEY));
});

test("hooks: no wrapper => direct call; call log keeps newest first, capped", async () => {
  setWebWrapProvider(null); assert.equal(await webWrap("director", "P", async (p) => p + "!"), "P!");
  setWebWrapProvider(async (s, p, c) => c(p + s)); assert.equal(await webWrap("writer", "P", async (p) => p), "Pwriter"); setWebWrapProvider(null);
  clearCalls(); setSkillBlockProvider(async () => "BLK");
  for (let i = 0; i < 40; i++) await skillBlock(i % 2 ? "writer" : "analysis");
  assert.equal(recentCalls().length, 30); assert.equal(recentCalls()[0].chars, 3); setSkillBlockProvider(null);
  await skillBlock("router"); assert.equal(recentCalls()[0].chars, 0);
});
