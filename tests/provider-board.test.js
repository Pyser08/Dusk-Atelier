import test from "node:test";
import assert from "node:assert/strict";
import { createBoard, boardHtml } from "../src/engine/provider/board.js";

test("동시 요청: 요청마다 따로 남고, 하나가 끝나도 진행 중인 요청과 창은 그대로", () => {
  let t = 0; const b = createBoard({ now: () => t, linger: 5000 });
  b.start("a", { label: "메인" }); b.start("b", { label: "보조" });
  b.update("a", { phase: "retry", attempt: 2, waitUntil: 30000 });   // 429로 오래 기다리는 요청
  t = 1000; b.end("b", "ok");
  assert.equal(b.active(), 1); assert.equal(b.visible(), true);
  t = 7000; assert.deepEqual(b.sweep(), ["b"], "끝난 카드만 빠짐");
  assert.equal(b.list().length, 1); assert.equal(b.list()[0].id, "a"); assert.equal(b.visible(), true, "진행 중이 남아 있으면 창 유지");
  t = 40000; b.end("a", "error", "HTTP 429");
  assert.equal(b.active(), 0); assert.equal(b.visible(), true, "끝난 카드가 남아 있는 동안은 보임");
  t = 45000; b.sweep(); assert.equal(b.visible(), false, "아무것도 없으면 숨김");
});

test("끝난 뒤 늦게 온 갱신은 무시하고, 화면 글자는 이스케이프", () => {
  const b = createBoard({ now: () => 0 });
  b.start("x", { label: "<script>" }); b.end("x", "ok"); b.update("x", { phase: "recv" });
  assert.equal(b.list()[0].phase, "send");
  assert.ok(!boardHtml(b.list(), 0).includes("<script>"));
});

import { createProgressWindow } from "../src/data/provider/progress.js";
const fakeDoc = () => {
  const made = [], body = { kids: [], appendChild: async (x) => { await new Promise((r) => setTimeout(r, 5)); body.kids.push(x); } };
  const el = () => { const e = { html: "", kids: [], removed: false, setAttribute: async () => {}, setStyleAttribute: async () => {}, setInnerText: async () => {}, setInnerHTML: async (h) => { e.html = h; }, appendChild: async (x) => { e.kids.push(x); }, remove: async () => { e.removed = true; body.kids = body.kids.filter((k) => k !== e); } }; made.push(e); return e; };
  return { made, body, doc: { querySelector: async () => { await new Promise((r) => setTimeout(r, 5)); return body; }, createElement: async () => { await new Promise((r) => setTimeout(r, 5)); return el(); } } };
};
const flush = (w) => w.refresh();

test("진행 창: 동시에 시작해도 창은 하나, 진행 중이 남으면 안 숨김, 껐다 켜도 카드 유지", async () => {
  const { body, doc } = fakeDoc(); let t = 0, on = true;
  const b = createBoard({ now: () => t, linger: 5000 });
  const w = createProgressWindow({ getDoc: async () => doc, board: b, enabled: () => on, now: () => t, timers: { setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {} } });
  b.start("a", { label: "메인" }); b.start("b", { label: "보조" });
  await flush(w);
  assert.equal(body.kids.length, 1, "창 하나");
  t = 1000; b.end("b", "ok"); t = 7000; b.sweep(); await flush(w);
  assert.equal(body.kids.length, 1, "a가 진행 중이면 창 유지");
  assert.match(body.kids[0].kids[1].html, /메인/); assert.doesNotMatch(body.kids[0].kids[1].html, /보조/);
  on = false; await flush(w); assert.equal(body.kids.length, 0, "끄면 창만 치움");
  on = true; await flush(w); assert.equal(body.kids.length, 1); assert.match(body.kids[0].kids[1].html, /메인/, "다시 켜면 진행 중 카드 그대로");
  t = 9000; b.end("a", "ok"); t = 15000; b.sweep(); await flush(w);
  assert.equal(body.kids.length, 0, "남은 게 없으면 숨김");
  await w.stop();
});

test("진행 창: 만들다 실패하면 다음에 다시 만든다", async () => {
  const { body, doc } = fakeDoc(); let fail = true;
  const b = createBoard({ now: () => 0 });
  const w = createProgressWindow({ getDoc: async () => (fail ? null : doc), board: b, timers: { setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {} } });
  b.start("a"); await flush(w); assert.equal(body.kids.length, 0);
  fail = false; b.update("a", { phase: "recv" }); await flush(w); assert.equal(body.kids.length, 1);
  await w.stop();
});

import { createProviderRunner } from "../src/data/provider/runner.js";
test("실행기: 요청마다 카드를 열고, 실패·스트림 끝에서 닫는다", async () => {
  const b = createBoard({ now: () => 0 });
  const store = { get: async () => ({ purposes: {}, profiles: [], connections: [], budget: {}, transforms: { rules: [] }, tools: {}, defaults: {} }), usage: async () => [] };
  const run = createProviderRunner({ api: {}, store, vault: {}, transport: {}, board: b });
  const r = await run.handle({ mode: "model", prompt_chat: [] }, null);
  assert.equal(r.success, false);
  assert.equal(b.list().length, 1); assert.equal(b.list()[0].done, true); assert.equal(b.list()[0].status, "error", "프로필 없음 실패도 카드가 닫힘");
});
