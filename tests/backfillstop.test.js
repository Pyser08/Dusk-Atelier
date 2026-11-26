// 지난 대화 분석(backfill): 생성 중지·묶음 크기·동시 처리·기기 처리 비용 (버그 리포트 11-18)
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../src/data/memorystore.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { stopAll, trackAi, aiTask, __resetAiStop } from "../src/engine/aistop.js";
import { parseJson } from "../src/engine/jsonparse.js";
import { applyDigest } from "../src/engine/memorydigest.js";
import { engineNotice } from "../src/data/cellaranalysis.js";

const LONG = "비가 내리는 옥상에서 미나가 하루의 손을 잡고 오래 숨겨 둔 비밀을 처음으로 털어놓았다. 하루는 아무 대답도 하지 못했다. ".repeat(2);
const good = JSON.stringify({ people: [{ name: "미나", act: "하루에게 비밀을 털어놓음", p: 2, s: 2, r: 2 }], scene: { sum: "비 오는 옥상", facts: ["비밀 공개"], place: "옥상", who: ["미나", "하루"], changed: true } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function setup(n, settings = {}) {
  const m = new Map();
  const chat = { id: "t1", name: "채팅1", message: [] };
  for (let i = 0; i < n; i++) chat.message.push({ role: "user", data: "u" + i }, { role: "char", data: LONG + i });
  const character = { chaId: "c1", name: "봇", chats: [chat] };
  const api = {
    pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat,
    addRisuScriptHandler: async () => {}
  };
  const store = createMemoryStore(api);
  store.updateIndex((i) => { i.settings.staged = false; Object.assign(i.settings, settings); });
  return { api, chat, store };
}
// 실제 runAI처럼 호출마다 trackAi로 센다(생성 중지가 이 호출을 끊는다)
const tracked = (fn) => async (msgs, pick, signal) => { const t = trackAi("analysis", signal); try { return await t.race(fn(msgs)); } finally { t.end(); } };

test("aiTask는 작업 신호를 넘기고 생성 중지가 그 신호를 끊는다", async () => {
  __resetAiStop();
  let sig;
  const p = aiTask("시험", async (s) => { sig = s; await wait(20); return 1; });
  await wait(1); assert.equal(sig.aborted, false);
  stopAll(); assert.equal(sig.aborted, true);
  await p; __resetAiStop();
});

test("생성 중지: 지난 대화 분석이 다음 묶음으로 넘어가지 않고, 끊긴 묶음은 실패로 세지 않는다", async () => {
  __resetAiStop();
  const { api, store } = setup(12);
  let calls = 0;
  const runner = createMemoryRunner(api, { store, retryMs: 1, log: () => {}, call: tracked(async () => { calls++; if (calls === 2) setTimeout(stopAll, 5); await wait(30); return good; }) });
  const r = await runner.backfill(0, 0, {});
  assert.equal(calls, 2, `중지 뒤에 더 부르지 않음 (호출 ${calls})`);
  assert.equal(r.failed.length, 0, "중지로 끊긴 묶음은 실패가 아님");
  assert.equal(r.stopped, true);
  const f = await store.getFolder("c1", "t1");
  assert.equal((f.failedBackfill ?? []).length, 0);
  assert.equal((await store.getIndex()).bots.c1.fails ?? 0, 0, "연속 실패 수에도 안 셈");
  __resetAiStop();
});

test("생성 중지: 서버 분석이면 서버 작업에 넘긴 신호가 끊긴다(→ Cellar cancel)", async () => {
  __resetAiStop();
  const { api, store } = setup(6);
  let got = null;
  const server = { prepare: async () => ({ conn: {}, model: {} }), slim: (x) => x, run: async (prep, payload, { signal }) => { got = signal; await new Promise((r) => signal.addEventListener("abort", r)); return { total: 2, failed: [], reasons: [], server: true }; } };
  const runner = createMemoryRunner(api, { store, server, log: () => {}, call: async () => good });
  const p = runner.backfill(0, 0, {});
  await wait(20); assert.ok(got, "서버 작업 시작"); assert.equal(got.aborted, false);
  stopAll();
  await p; assert.equal(got.aborted, true);
  __resetAiStop();
});

test("묶음 크기: 설정 backfillBatch(기본 3)", async () => {
  const { api, store, chat } = setup(10, { backfillBatch: 5 });
  const runner = createMemoryRunner(api, { store, log: () => {}, call: async () => good });
  assert.equal(runner.planBackfill(chat.message, {}).calls, 4, "기본 3개씩");
  assert.equal(runner.planBackfill(chat.message, { size: 5 }).calls, 2);
  const r = await runner.backfill(0, 0, {});
  assert.equal(r.total, 2, "설정한 5개씩");
});

test("동시 처리: backfillParallel 2면 두 묶음을 함께 묻고, 429가 나면 하나씩으로 줄인다", async () => {
  __resetAiStop();
  const { api, store } = setup(18, { backfillParallel: 2 });
  let now = 0, max = 0, calls = 0; const logs = [];
  const runner = createMemoryRunner(api, { store, retryMs: 1, log: (...a) => logs.push(a.join(" ")), call: async () => {
    calls++; now++; max = Math.max(max, now);
    try { await wait(15); if (calls === 3) { throw new Error("429 Too Many Requests"); } return good; } finally { now--; }
  } });
  const r = await runner.backfill(0, 0, {});
  assert.equal(r.failed.length, 0); assert.equal(r.total, 6);
  assert.equal(max, 2, "두 개씩 함께");
  assert.ok(logs.some((l) => /동시 처리를 1개로/.test(l)), "429 뒤에는 하나씩");
  const f = await store.getFolder("c1", "t1");
  assert.equal(f.cursor.at, 35, "끝난 순서와 상관없이 커서는 마지막 응답");
  __resetAiStop();
});

test("기기 처리 비용: 묶음마다 채팅 전체를 다시 해시하지 않는다", async () => {
  const { api, store, chat } = setup(60);
  let reads = 0;
  chat.message = chat.message.map((m) => { const d = m.data; return Object.defineProperty({ role: m.role }, "data", { get() { reads++; return d; }, enumerable: true }); });
  const runner = createMemoryRunner(api, { store, log: () => {}, call: async () => good });
  const base = reads;
  const r = await runner.backfill(0, 0, {});
  assert.equal(r.total, 20);
  const per = (reads - base) / chat.message.length;
  assert.ok(per < 25, `메시지당 본문 읽기 ${per.toFixed(1)}번 (묶음 수 20에 비례하면 안 됨)`);
});

test("사고 출력: <Thoughts> 안에 중괄호가 있어도 JSON과 digest를 읽는다", () => {
  assert.deepEqual(parseJson('<Thoughts>I think {maybe} ok</Thoughts>{"a":1}'), { a: 1 });
  const p = { records: [{ id: 1, act: "a" }] };
  assert.equal(applyDigest(p, p.records, '<Thoughts>{x} hmm</Thoughts>\n{"digest":"요약"}', 1), "요약");
});

test("서버 엔진 버전이 플러그인과 다르면 알림 문구, 같거나 서버 없음이면 null", () => {
  assert.equal(engineNotice("2.2.10", { ok: false }), null);
  assert.equal(engineNotice("2.2.10", { ok: true, features: ["mem"] }), null, "분석 기능 없으면 상관없음");
  assert.equal(engineNotice("2.2.10", { ok: true, features: ["analysis"], engine: "2.2.10" }), null);
  assert.match(engineNotice("2.2.10", { ok: true, features: ["analysis"], engine: "2.2.4" }), /2\.2\.4.*2\.2\.41/);
  assert.equal(engineNotice("2.2.63", { ok: true, features: ["analysis"], engine: "2.2.41" }), null, "신고 #25: 최신 Cellar 엔진이면 조용히");
  assert.match(engineNotice("2.2.10", { ok: true, features: ["analysis"] }), /오래된|업데이트/);
  assert.equal(engineNotice("", { ok: true, features: ["analysis"], engine: "2.2.4" }), null, "플러그인 버전을 모르면(시험) 조용히");
});

import { hubPickOf, followHubPick } from "../src/data/memoryrunner.js";
test("지난 대화 분석 모델: Writer 단계만 내 API로 둬도 그 모델을 따른다(리스 보조 모델로 가서 키 없음 오류 나던 것)", () => {
  const cfg = { easy: { kind: "risuai", presetId: "" }, presets: [{ id: "p1", name: "내 키", preset: { kind: "openai", model: "gpt" } }], stages: { writer: { mode: "dedicated", presetId: "p1" }, router: { mode: "shared" }, director: { mode: "shared" } } };
  const hub = hubPickOf(cfg); assert.deepEqual(hub, { mode: "custom", presetId: "p1" });
  assert.equal(followHubPick({ mode: "submodel", timeoutSec: 600 }, hub).presetId, "p1");
  assert.equal(hubPickOf({ easy: { kind: "risuai" }, presets: [], stages: {} }), null);
});
test("리스 보조 모델 설정: 기본값(메모리 모델)은 보조 모델로, 직접 고른 메모리 모델은 그대로", () => {
  assert.equal(followHubPick({ mode: "memory", timeoutSec: 600 }, null).mode, "submodel");
  assert.equal(followHubPick({ mode: "memory", explicit: true }, null).mode, "memory");
  assert.equal(followHubPick({ mode: "model" }, null).mode, "model");
});
