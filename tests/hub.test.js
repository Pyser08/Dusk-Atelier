import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { redactSecrets, pushLog, recentLogs, createHub as createClient } from "../src/data/hub.js";

const require = createRequire(import.meta.url);
const { createHub } = require("../server/dusk-hub/hub.cjs");

test("버그 신고에 붙는 글은 키처럼 보이는 부분을 가린다", () => {
  const s = redactSecrets("key sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV and AIzaSyA1234567890abcdefghijk url?key=secret123 Bearer abcdefghijklmnopqrstuvwxyz");
  assert.ok(!s.includes("ABCDEFGHIJKLMNOP"));
  assert.ok(!s.includes("AIzaSyA123"));
  assert.ok(!s.includes("secret123"));
  assert.ok(!s.includes("abcdefghijklmnopqrstuvwxyz"));
  assert.ok(s.includes("[가림]"));
});

test("같은 오류가 이어지면 한 줄로 묶어 센다", () => {
  pushLog("error", "같은 오류"); pushLog("error", "같은 오류");
  const last = recentLogs().at(-1);
  assert.equal(last.text, "같은 오류"); assert.equal(last.n, 2);
});

test("서버 주소가 어디에도 없으면(hub.json도 비면) 통계를 보내지 않는다", async () => {
  let calls = 0;
  const api = { pluginStorage: { getItem: async () => null, setItem: async () => {} }, nativeFetch: async (u, o) => { if (o?.method === "POST") calls++; return { ok: true, json: async () => ({ url: "" }), text: async () => JSON.stringify({ url: "" }) }; } };
  const c = createClient(api, { version: "t" });
  assert.equal(await c.pingSoon(), false);
  assert.equal(calls, 0);
});

test("통계를 끄면 핑을 보내지 않는다", async () => {
  const mem = new Map([["dusk.hub.url", "https://hub.test"], ["dusk.hub.stats", "off"]]);
  let calls = 0;
  const api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => mem.set(k, v) }, nativeFetch: async () => { calls++; return { ok: true, json: async () => ({}) }; } };
  assert.equal(await createClient(api, { version: "t" }).pingSoon(), false);
  assert.equal(calls, 0);
});

async function withServer(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-"));
  const cfg = { port: 0, host: "127.0.0.1", adminToken: "test-token-1234567890", dataDir: dir, repo: "o/r", githubToken: "", webhookSecret: "whsec", discordWebhook: "", publicUrl: "", trustProxy: false, pollMinutes: 0 };
  const hub = createHub(cfg);
  const srv = http.createServer((q, s) => hub.handle(q, s));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try { await fn({ base, hub, cfg }); } finally { srv.close(); hub.store.flush(); fs.rmSync(dir, { recursive: true, force: true }); }
}

test("핑·신고를 받고 관리 화면은 로그인해야 보인다", () => withServer(async ({ base }) => {
  const post = (p, b, h = {}) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: typeof b === "string" ? b : JSON.stringify(b) });
  assert.equal((await post("/api/ping", { id: "abcdef12-3456", v: "2.2.46", addons: [{ id: "memory", v: "0.3.1", on: true }] })).status, 200);
  assert.equal((await post("/api/ping", { id: "x" })).status, 400);
  const r = await (await post("/api/report", { id: "abcdef12-3456", v: "2.2.46", text: "화면이 하얘요", logs: [{ kind: "error", text: "TypeError" }] })).json();
  assert.equal(r.no, 1);
  assert.equal((await fetch(base + "/api/admin/summary")).status, 401);
  const login = await fetch(base + "/login", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "token=test-token-1234567890" });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const s = await (await fetch(base + "/api/admin/summary", { headers: { cookie } })).json();
  assert.equal(s.d1, 1); assert.deepEqual(s.addons[0], ["memory", 1]); assert.equal(s.reports.new, 1);
  // 쓰기 요청은 X-Hub 머리말이 있어야 한다(CSRF)
  assert.equal((await fetch(base + "/api/admin/reports/1", { method: "PATCH", headers: { cookie }, body: "{}" })).status, 403);
  const up = await (await fetch(base + "/api/admin/reports/1", { method: "PATCH", headers: { cookie, "X-Hub": "1" }, body: JSON.stringify({ status: "done", memo: "고침" }) })).json();
  assert.equal(up.status, "done");
  const bad = await fetch(base + "/login", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "token=wrong" });
  assert.equal(bad.headers.get("set-cookie"), null);
}));

test("GitHub 웹후크는 서명이 맞을 때만 이슈를 넣는다", () => withServer(async ({ base, hub }) => {
  const body = JSON.stringify({ action: "opened", issue: { number: 7, title: "버그", state: "open", user: { login: "u" }, labels: [], html_url: "h", created_at: "2026-11-24T00:00:00Z", updated_at: "2026-11-24T00:00:00Z" } });
  const sig = "sha256=" + crypto.createHmac("sha256", "whsec").update(body).digest("hex");
  assert.equal((await fetch(base + "/api/github", { method: "POST", headers: { "X-GitHub-Event": "issues", "X-Hub-Signature-256": "sha256=00" }, body })).status, 401);
  assert.equal((await fetch(base + "/api/github", { method: "POST", headers: { "X-GitHub-Event": "issues", "X-Hub-Signature-256": sig }, body })).status, 200);
  assert.equal(hub.summary().issues.open, 1);
  assert.equal(hub.summary().issues.unseen, 1);
}));

test("hub.json에 주소가 있으면 그 주소로 보낸다", async () => {
  const sent = [];
  const api = { pluginStorage: { getItem: async () => null, setItem: async () => {} }, nativeFetch: async (u, o) => { if (o?.method === "POST") { sent.push(u); return { ok: true, json: async () => ({}) }; } return { ok: true, text: async () => JSON.stringify({ url: "https://hub.duckdns.org/" }) }; } };
  assert.equal(await createClient(api, { version: "t" }).pingSoon(), true);
  assert.deepEqual(sent, ["https://hub.duckdns.org/api/ping"]);
});

test("비밀번호로 들어가고, 기기 세션은 서버를 다시 켜도 남으며, 나가면 끊긴다", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hubpw-"));
  const cfg = { port: 0, host: "127.0.0.1", adminToken: "test-token-1234567890", dataDir: dir, repo: "o/r", githubToken: "", webhookSecret: "", discordWebhook: "", publicUrl: "", trustProxy: false, pollMinutes: 0 };
  const start = async () => { const hub = createHub(cfg); const srv = http.createServer((q, s) => hub.handle(q, s)); await new Promise((r) => srv.listen(0, "127.0.0.1", r)); return { hub, srv, base: `http://127.0.0.1:${srv.address().port}` }; };
  let a = await start();
  const salt = crypto.randomBytes(16);
  a.hub.store.data.auth = { pw: `scrypt$${salt.toString("hex")}$${crypto.scryptSync("my-password", salt, 32).toString("hex")}` };
  const login = (base, pw) => fetch(base + "/login", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "token=" + encodeURIComponent(pw) });
  assert.equal((await login(a.base, "wrong-pass")).headers.get("set-cookie"), null);
  const set = (await login(a.base, "my-password")).headers.get("set-cookie");
  assert.match(set, /Max-Age=34560000/);
  const cookie = set.split(";")[0];
  a.srv.close(); a.hub.store.touch("auth"); a.hub.store.flush();
  a = await start();
  assert.equal((await fetch(a.base + "/api/admin/summary", { headers: { cookie } })).status, 200);
  await fetch(a.base + "/logout", { method: "POST", redirect: "manual", headers: { cookie } });
  assert.equal((await fetch(a.base + "/api/admin/summary", { headers: { cookie } })).status, 401);
  a.srv.close(); a.hub.store.flush();
});

test("hub.json이 비어 있던 것을 기억해도, 버그 신고 창은 열 때 다시 읽는다", async () => {
  const mem = new Map(); let body = { url: "" };
  const api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => mem.set(k, v) }, nativeFetch: async () => ({ ok: true, text: async () => JSON.stringify(body) }) };
  const c = createClient(api, { version: "t" });
  assert.equal(await c.url(), "");
  body = { url: "https://duskhub.duckdns.org" };
  assert.equal(await c.url(), "");              // 10분 안에는 기억한 빈 값
  assert.equal(await c.configured(), true);     // 창을 열 때는 새로 읽는다
  assert.equal(await c.url(), "https://duskhub.duckdns.org");
});
