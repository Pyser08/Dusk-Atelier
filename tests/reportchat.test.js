import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createHub as createClient } from "../src/data/hub.js";
import { chatState } from "../src/ui/screens/reportchat.js";
const { createHub } = createRequire(import.meta.url)("../server/dusk-hub/hub.cjs");

async function rig(fn, over = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hubchat-"));
  const hub = createHub({ port: 0, host: "127.0.0.1", adminToken: "test-token-1234567890", dataDir: dir, repo: "o/r", githubToken: "", webhookSecret: "", discordWebhook: "", publicUrl: "", trustProxy: false, pollMinutes: 0, chatWaitMs: 1500, ...over });
  const srv = http.createServer((q, s) => hub.handle(q, s)); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const post = async (p, b, h = {}) => { const r = await fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: JSON.stringify(b) }); return { code: r.status, ...(await r.json()) }; };
  const l = await fetch(base + "/login", { method: "POST", redirect: "manual", body: new URLSearchParams({ token: "test-token-1234567890" }) });
  const ck = { cookie: l.headers.get("set-cookie").split(";")[0], "x-hub": "1" };
  const rep = await post("/api/report", { id: "abcdef12-3456", v: "2.2.57", text: "화면이 하얘요" });
  const user = (op, b = {}) => post("/api/chat", { key: rep.key, op, ...b }), dev = (op, b = {}) => post(`/api/admin/chat/${rep.no}`, { op, ...b }, ck);
  const get = async (p) => (await fetch(base + p, { headers: ck })).json();
  const patch = (b) => fetch(`${base}/api/admin/reports/${rep.no}`, { method: "PATCH", headers: { ...ck, "Content-Type": "application/json" }, body: JSON.stringify(b) });
  try { await fn({ user, dev, post, get, patch, rep, hub, base }); } finally { srv.closeAllConnections?.(); srv.close(); hub.store.flush(); fs.rmSync(dir, { recursive: true, force: true }); }
}
const texts = (x) => x.msgs.map((m) => m.text);

test("기다리던 쪽에 새 글이 바로 간다", () => rig(async ({ user, dev }) => {
  let u = await user("open"); assert.equal(u.in, true); await dev("join"); u = await user("poll", { after: u.seq });
  const p = user("poll", { after: u.seq, sig: u.sig }); await new Promise((r) => setTimeout(r, 80));
  const t = Date.now(); await dev("send", { text: "안녕하세요", cid: "a1" });
  const got = await p; assert.ok(Date.now() - t < 300); assert.ok(texts(got).includes("안녕하세요")); assert.equal(got.otherOnline, true);
}));
test("나가면 상대의 연결도 바로 끊기고, 다시 들어오면 이어진다", () => rig(async ({ user, dev }) => {
  let u = await user("open"); const d = await dev("join"); u = await user("poll", { after: u.seq });
  const p = user("poll", { after: u.seq, sig: u.sig }); await new Promise((r) => setTimeout(r, 60));
  const t = Date.now(); await dev("leave"); const out = await p;
  assert.ok(Date.now() - t < 300); assert.equal(out.in, false); assert.equal(out.left.by, "dev"); assert.ok(texts(out).includes("개발자가 채팅을 나갔어요"));
  const t2 = Date.now(); assert.equal((await user("poll", { after: out.seq })).in, false); assert.ok(Date.now() - t2 < 300);   // 붙잡지 않는다
  assert.equal((await dev("poll", { after: d.seq })).in, false);
  const no = await user("send", { text: "x" }); assert.equal(no.code, 400); assert.equal(no.left, true);
  assert.equal((await user("open", { after: out.seq })).in, false);   // 창만 열어서는 다시 들어오지 않는다
  assert.equal((await user("join")).in, true); assert.equal((await dev("peek")).otherIn, true); assert.equal((await dev("join")).in, true);
  assert.equal((await user("send", { text: "다시 왔어요", cid: "c" })).code, 200);
  await user("leave"); assert.equal((await dev("peek")).left.by, "user");
}));
test("같은 글을 다시 보내도 한 번만, 읽음·안 읽은 수·버전이 맞다", () => rig(async ({ user, dev, get }) => {
  await user("open"); await user("send", { text: "하나", cid: "k", v: "2.2.57" }); await user("send", { text: "하나", cid: "k", v: "2.2.57" });
  const list = await get("/api/admin/reports"); assert.equal(list[0].unread, 1); assert.equal(list[0].chat, undefined); assert.equal(list[0].key, undefined);
  const d = await dev("open"); const m = d.msgs.filter((x) => x.from === "user"); assert.equal(m.length, 1); assert.equal(m[0].v, "2.2.57"); assert.equal(m[0].cid, undefined);
  assert.equal((await get("/api/admin/summary")).reports.unread, 0); assert.ok((await user("peek")).read >= m[0].id);
}));
test("예전 답장은 첫 글이 되고, 새 글은 옛 플러그인 답장에도 보인다", () => rig(async ({ user, dev, post, patch, rep, hub }) => {
  hub.store.data.reports[0].reply = "예전 답장";
  assert.equal((await user("open")).msgs[0].text, "예전 답장");
  await dev("join"); await dev("send", { text: "새\n답", cid: "z" });
  assert.equal((await post("/api/report-status", { keys: [rep.key] }))[0].reply, "새 답");
  await patch({ reply: "한 줄" }); assert.ok(texts(await user("peek")).includes("한 줄"));
}));
test("닫은 대화·모르는 키·너무 많은 글을 막는다", () => rig(async ({ user, dev, post }) => {
  await user("open"); await dev("close", { closed: true }); assert.equal((await user("join")).code, 400); await dev("close", { closed: false }); await user("join");
  assert.equal((await post("/api/chat", { key: "nope-nope-nope-nope", op: "peek" })).code, 404);
  const codes = []; for (let i = 0; i < 25; i++) codes.push((await user("send", { text: "t" + i, cid: "i" + i })).code);
  assert.ok(codes.includes(429)); assert.equal((await user("send", { text: "  " })).code >= 400, true);
}));
test("한쪽 창을 여러 개 열어도 기다리는 연결은 둘까지", () => rig(async ({ user }) => {
  const o = await user("open"); const t = Date.now(); const first = user("poll", { after: o.seq }); await new Promise((r) => setTimeout(r, 40));
  const rest = [user("poll", { after: o.seq }), user("poll", { after: o.seq })];
  await first; assert.ok(Date.now() - t < 800); await Promise.all(rest);
}));
test("클라이언트: 키를 가리고 risuFetch로 되풀이하지 않는다", async () => {
  const mem = new Map([["dusk.hub.url", "https://hub.test"]]); let sent = null, risu = 0;
  const c = createClient({ pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => mem.set(k, v) }, risuFetch: async () => { risu++; }, nativeFetch: async (u, o) => { sent = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ msgs: [] }) }; } }, { version: "9.9" });
  await c.chat("k", "send", { text: "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV" }); assert.ok(!sent.text.includes("ABCDEFG")); assert.equal(sent.v, "9.9"); assert.equal(risu, 0);
});
test("상태 글", () => { assert.match(chatState({ in: false, left: { by: "dev" } }), /나가서 연결을 끊었어요/); assert.match(chatState({ in: false, otherIn: true }), /다시 채팅하기/); assert.match(chatState({ in: true, otherOnline: true }), /접속 중/); });
