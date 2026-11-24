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
  assert.equal(s.d1, 1); assert.equal(s.addons[0].id, "memory"); assert.equal(s.addons[0].installed, 1); assert.equal(s.addons[0].upToDate, 1); assert.equal(s.reports.new, 1);
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

test("오류 기록은 큰 객체를 통째로 글자로 바꾸지 않고, 일반 log는 건너뛴다", async () => {
  const { startLogCapture: start } = await import("../src/data/hub.js");
  let stringified = 0;
  const big = { toJSON() { stringified++; return {}; } };
  const fake = { console: { log() {}, warn() {}, error() {} }, addEventListener() {} };
  start(fake);
  const before = recentLogs().length;
  for (let i = 0; i < 1000; i++) fake.console.log("그냥 로그", big);
  fake.console.error("[Dusk Atelier] 저장 실패", big);
  assert.equal(stringified, 0);
  assert.equal(recentLogs().length, before + 1);
  assert.match(recentLogs().at(-1).text, /저장 실패 \[Object\]/);
});

test("예전에 저장한 홈 배치에도 버그 신고 상자가 바로가기 4칸 아래에 들어간다", async () => {
  const { insertBelow, normalizeLayout } = await import("../src/ui/homegrid.js");
  const saved = [{ id: "imp", x: 2, y: 0, w: 1, h: 1 }, { id: "mem", x: 3, y: 0, w: 1, h: 1 }, { id: "man", x: 2, y: 1, w: 1, h: 1 }, { id: "wrk", x: 3, y: 1, w: 1, h: 1 }, { id: "n1", x: 2, y: 2, w: 1, h: 1 }];
  const out = insertBelow(saved, "bug", ["imp", "mem", "man", "wrk"], 6);
  const bug = out.find((i) => i.id === "bug");
  assert.deepEqual([bug.x, bug.y, bug.w, bug.h], [2, 2, 2, 1]);
  assert.equal(out.find((i) => i.id === "n1").y, 3);
  assert.equal(insertBelow(out, "bug", ["imp"], 6), out);   // 이미 있으면 그대로
  assert.ok(normalizeLayout(out, 6, out.map((i) => i.id)).some((i) => i.id === "bug"));
});

test("같은 기기 지문으로 새 설치 ID가 오면(업데이트로 ID를 잃음) 한 사람으로 합친다", () => withServer(async ({ hub }) => {
  hub.onPing({ id: "old-install-01", fp: "aaaaaaaaaaaaaaaa", v: "2.2.47" });
  hub.onPing({ id: "new-install-02", fp: "aaaaaaaaaaaaaaaa", v: "2.2.48" });
  hub.onPing({ id: "other-device-3", fp: "bbbbbbbbbbbbbbbb", v: "2.2.48" });
  const s = hub.summary();
  assert.equal(s.total, 2); assert.equal(s.d1, 2);
  hub.onPing({ id: "old-install-01", fp: "aaaaaaaaaaaaaaaa", v: "2.2.48" });   // 옛 ID가 다시 와도 새 ID로 센다
  assert.equal(hub.summary().total, 2);
  // 더 낮은 버전의 새 ID는 다른 기기로 본다
  hub.onPing({ id: "lower-ver-0004", fp: "aaaaaaaaaaaaaaaa", v: "2.2.40" });
  assert.equal(hub.summary().total, 3);
}));

test("지문 없는 옛 기록도 끊긴 직후 더 높은 버전으로 이어지면 합친다", () => withServer(async ({ hub }) => {
  const D = hub.store.data, t = Date.now();
  D.installs["legacy-aaaa-1"] = { first: t - 7200e3, last: t - 3600e3, v: "2.2.46", mobile: false, host: "web", addons: [] };
  D.installs["legacy-bbbb-2"] = { first: t - 1800e3, last: t, v: "2.2.47", mobile: false, host: "web", addons: [] };
  D.installs["legacy-cccc-3"] = { first: t - 1800e3, last: t, v: "2.2.47", mobile: true, host: "web", addons: [] };
  assert.equal(hub.dedupeLegacy(), 1);
  assert.equal(hub.summary().total, 2);
}));

test("하루가 안 지나도 본체나 애드온 버전이 바뀌면 바로 다시 알리고, 그대로면 보내지 않는다", async () => {
  const mem = new Map([["dusk.hub.url", "https://hub.test"]]); let sent = 0; let idx = { memory: { version: "0.3.1" } };
  const api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => mem.set(k, v) }, nativeFetch: async (u, o) => { if (o?.method === "POST") sent++; return { ok: true, json: async () => ({}), text: async () => "{}" }; } };
  const mk = (v) => createClient(api, { version: v, addons: { getIndex: async () => idx } });
  assert.equal(await mk("2.2.49").pingSoon(), true);
  assert.equal(await mk("2.2.49").pingSoon(), false);
  idx = { memory: { version: "0.3.2" } };
  assert.equal(await mk("2.2.49").pingSoon(), true);
  assert.equal(await mk("2.2.50").pingSoon(), true);
  assert.equal(sent, 3);
});
