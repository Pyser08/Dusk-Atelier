// 11단계(2.0.0): 다른 플러그인 창구 — pluginStorage 우편함(요청 키 → Dusk가 처리 → 결과 키)
import test from "node:test";
import assert from "node:assert/strict";
import { PREFIX, reqKey, resKey, safeName, parseRequests, pruneResults, normalizeIpc, hasInterest } from "../src/engine/provider/mailbox.js";
import { createMailbox } from "../src/data/provider/mailbox.js";
import { normalizeConfig } from "../src/engine/provider/profile.js";

test("키 이름·플러그인 이름 정리", () => {
  assert.equal(PREFIX, "dusk.ipc.v1.");
  assert.equal(reqKey("My Plugin"), "dusk.ipc.v1.req.My_Plugin"); assert.equal(resKey("a.b-c"), "dusk.ipc.v1.res.a.b-c");
  assert.equal(safeName("  나의/플러그인!! "), "나의_플러그인"); assert.equal(safeName(""), ""); assert.equal(safeName("x".repeat(80)).length, 40);
});
test("요청 읽기: 한 개·배열 모두 받고 잘못된 것은 이유와 함께 버림", () => {
  const ok = { v: 1, id: "a1", messages: [{ role: "user", content: "안녕" }] };
  assert.deepEqual(parseRequests(JSON.stringify(ok)).ok.map((r) => r.id), ["a1"]);
  const many = parseRequests([ok, { id: "a2" }, { id: "", messages: [{ role: "user", content: "x" }] }, { id: "a3", messages: [{ role: "tool", content: "x" }] }, { id: "a4", messages: [{ role: "system", content: "s" }, { role: "user", content: "u" }], maxTokens: 99999999, temperature: 9, profile: "빠른" }]);
  assert.deepEqual(many.ok.map((r) => r.id), ["a1", "a4"]); assert.equal(many.bad.length, 3);
  const r4 = many.ok[1]; assert.equal(r4.maxTokens, 32000); assert.equal(r4.temperature, 2); assert.equal(r4.profile, "빠른");
  assert.deepEqual(parseRequests("not json").ok, []); assert.deepEqual(parseRequests(null).ok, []);
  assert.equal(parseRequests([ok, ok]).ok.length, 1);   // 같은 id는 한 번만
  const big = parseRequests([{ id: "b", messages: [{ role: "user", content: "가".repeat(500001) }] }]); assert.equal(big.ok.length, 0); assert.match(big.bad[0].error, /너무 길/);
});
test("결과 정리: 오래된 것·너무 많은 것 버리기", () => {
  const now = 1_000_000_000_000, rows = Array.from({ length: 14 }, (_, i) => ({ id: `r${i}`, ok: true, at: now - i * 1000 }));
  rows.push({ id: "old", ok: true, at: now - 3 * 3600e3 });
  const kept = pruneResults(rows, now); assert.equal(kept.length, 10); assert.ok(!kept.some((r) => r.id === "old")); assert.equal(kept[0].id, "r0");
});
test("설정: 기본 꺼짐, 값 범위 정리, 허용 목록", () => {
  const d = normalizeIpc(undefined); assert.equal(d.enabled, false); assert.equal(d.concurrency, 2); assert.deepEqual(d.plugins, {});
  const n = normalizeIpc({ enabled: 1, concurrency: 99, pollSec: 0, profileId: "p", plugins: { "나의 플러그인": { allow: true }, bad: { allow: "maybe" }, "": { allow: true } } });
  assert.equal(n.enabled, true); assert.equal(n.concurrency, 8); assert.equal(n.pollSec, 1); assert.deepEqual(n.plugins, { "나의_플러그인": { allow: true } });
  assert.equal(normalizeConfig(null).ipc.enabled, false);
  assert.equal(normalizeConfig({ ipc: { enabled: true, concurrency: 3 } }).ipc.concurrency, 3);
  assert.equal(hasInterest(d), false); assert.equal(hasInterest({ ...d, enabled: true }), true);
});

// ── 감시기 ──
function harness({ ipc = {}, run = null, ask = async () => true, keysApi = true } = {}) {
  const mem = new Map(), writes = [];
  const api = { pluginStorage: { async getItem(k) { return mem.has(k) ? mem.get(k) : null; }, async setItem(k, v) { writes.push(k); mem.set(k, v); }, ...(keysApi ? { async keys() { return [...mem.keys()]; } } : {}) } };
  const cfg = { ipc: normalizeIpc({ enabled: true, ...ipc }) };
  const subs = new Set();
  const store = { async get() { return cfg; }, async update(fn) { const d = JSON.parse(JSON.stringify(cfg)); Object.assign(cfg, fn(d) ?? d); for (const f of subs) f(cfg); return cfg; }, subscribe(f) { subs.add(f); return () => subs.delete(f); } };
  const calls = []; let inflight = 0, peak = 0;
  const runner = { async handle(req, signal) { calls.push(req); inflight++; peak = Math.max(peak, inflight); try { return run ? await run(req, signal, calls.length) : { success: true, content: `답:${req.prompt_chat.at(-1).content}` }; } finally { inflight--; } } };
  const asked = []; const confirm = async (o) => { asked.push(o); return ask(o); };
  const timers = { set: () => 1, clear: () => {} };
  const mb = createMailbox(api, { store, runner, confirm, notify: () => {}, log: () => {}, now: () => 1_000_000_000_000, timers });
  const put = (plugin, v) => mem.set(reqKey(plugin), typeof v === "string" ? v : JSON.stringify(v));
  const result = (plugin) => { const r = mem.get(resKey(plugin)); return r ? JSON.parse(r) : null; };
  return { mb, mem, put, result, calls, asked, writes, cfg, store, peak: () => peak };
}
const rq = (id, text = id) => ({ v: 1, id, messages: [{ role: "user", content: text }] });

test("꺼져 있으면 아무것도 읽지 않는다", async () => {
  const h = harness({ ipc: { enabled: false } }); h.put("p", rq("1")); await h.mb.tick(); assert.equal(h.calls.length, 0); assert.equal(h.result("p"), null);
});
test("허용된 플러그인의 요청을 처리해 결과 키에 쓴다(요청 키는 건드리지 않음)", async () => {
  const h = harness({ ipc: { plugins: { p: { allow: true } } } }); h.put("p", rq("1", "안녕")); const before = h.mem.get(reqKey("p"));
  await h.mb.tick();
  const r = h.result("p"); assert.equal(r.v, 1); assert.equal(r.results.length, 1); assert.deepEqual({ id: r.results[0].id, ok: r.results[0].ok, text: r.results[0].text }, { id: "1", ok: true, text: "답:안녕" });
  assert.equal(h.mem.get(reqKey("p")), before); assert.ok(!h.writes.includes(reqKey("p")));
  assert.equal(h.calls[0].mode, "other"); assert.equal(h.calls[0].__purpose, "other"); assert.equal(h.asked.length, 0);
});
test("같은 요청 id는 다시 처리하지 않는다(요청 키가 남아 있어도)", async () => {
  const h = harness({ ipc: { plugins: { p: { allow: true } } } }); h.put("p", rq("1")); await h.mb.tick(); await h.mb.tick(); assert.equal(h.calls.length, 1);
  h.put("p", [rq("1"), rq("2")]); await h.mb.tick(); assert.equal(h.calls.length, 2); assert.deepEqual(h.result("p").results.map((x) => x.id).sort(), ["1", "2"]);
});
test("처음 보는 플러그인은 한 번만 물어보고, 대답을 저장한다", async () => {
  const yes = harness(); yes.put("새것", rq("1")); await yes.mb.tick(); await yes.mb.tick();
  assert.equal(yes.asked.length, 1); assert.match(yes.asked[0].title ?? yes.asked[0].message ?? "", /새것/); assert.equal(yes.calls.length, 1); assert.equal(yes.cfg.ipc.plugins["새것"].allow, true);
  const no = harness({ ask: async () => false }); no.put("새것", rq("1")); await no.mb.tick(); await no.mb.tick();
  assert.equal(no.calls.length, 0); assert.equal(no.cfg.ipc.plugins["새것"].allow, false);
  const r = no.result("새것").results[0]; assert.equal(r.ok, false); assert.match(r.error, /허용/);
  no.put("새것", rq("2")); await no.mb.tick(); assert.equal(no.asked.length, 1);   // 거절한 곳은 다시 묻지 않음
});
test("동시에 처리하는 수를 넘지 않는다", async () => {
  let release; const gate = new Promise((r) => { release = r; });
  const h = harness({ ipc: { concurrency: 2, plugins: { p: { allow: true } } }, run: async () => { await gate; return { success: true, content: "ok" }; } });
  h.put("p", [rq("1"), rq("2"), rq("3"), rq("4")]);
  const t = h.mb.tick(); await new Promise((r) => setTimeout(r, 20));
  assert.equal(h.calls.length, 2); assert.equal(h.mb.status().inflight, 2); assert.equal(h.mb.status().queued, 2);
  release(); await t; await h.mb.idle();
  assert.equal(h.calls.length, 4); assert.equal(h.peak(), 2); assert.equal(h.result("p").results.length, 4);
});
test("실패는 오류로 돌려주고, 스트림은 글로 모아 돌려준다", async () => {
  const stream = new ReadableStream({ start(c) { c.enqueue("가"); c.enqueue({ text: "나" }); c.close(); } });
  const h = harness({ ipc: { plugins: { p: { allow: true } } }, run: async (req) => (req.prompt_chat[0].content === "bad" ? { success: false, content: "키가 없어요 sk-secret" } : { success: true, content: stream }) });
  h.put("p", [rq("1", "bad"), rq("2", "good")]); await h.mb.tick(); await h.mb.idle();
  const by = Object.fromEntries(h.result("p").results.map((r) => [r.id, r])); assert.equal(by["1"].ok, false); assert.match(by["1"].error, /키가 없어요/); assert.equal(by["2"].text, "가나");
});
test("요청이 지정한 프로필·샘플링이 그대로 runner로 간다. 지정 없으면 창구 기본 프로필", async () => {
  const h = harness({ ipc: { profileId: "pd", plugins: { p: { allow: true } } } }); h.put("p", [{ ...rq("1"), profile: "p9", maxTokens: 50, temperature: 0.3 }, rq("2")]); await h.mb.tick(); await h.mb.idle();
  const a = h.calls.find((c) => c.prompt_chat[0].content === "1"), b = h.calls.find((c) => c.prompt_chat[0].content === "2");
  assert.equal(a.__profile, "p9"); assert.equal(a.max_tokens, 50); assert.equal(a.temperature, 0.3); assert.equal(b.__profile, "pd");
});
test("잘못된 요청은 읽을 수 없다는 결과를 남기고, 옛 요청은 무시한다", async () => {
  const h = harness({ ipc: { plugins: { p: { allow: true } } } }); h.put("p", [{ id: "x", messages: [] }, { ...rq("old"), ts: 1_000_000_000_000 - 3 * 3600e3 }]); await h.mb.tick();
  assert.equal(h.calls.length, 0); const r = h.result("p").results; assert.equal(r.length, 1); assert.equal(r[0].id, "x"); assert.equal(r[0].ok, false);
});
test("키 목록을 못 줘도, 허용 목록에 적힌 플러그인은 살핀다", async () => {
  const h = harness({ keysApi: false, ipc: { plugins: { p: { allow: true } } } }); h.put("p", rq("1")); h.put("q", rq("2")); await h.mb.tick();
  assert.equal(h.calls.length, 1); assert.equal(h.result("q"), null);
});
test("멈추면 더 읽지 않고, 설정을 끄면 대기열을 비운다", async () => {
  const h = harness({ ipc: { plugins: { p: { allow: true } } } }); h.mb.stop(); h.put("p", rq("1")); await h.mb.tick(); assert.equal(h.calls.length, 0);
});
