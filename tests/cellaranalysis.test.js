import test from "node:test";
import assert from "node:assert/strict";
import { createServerAnalysis, slimMessages } from "../src/data/cellaranalysis.js";
import { createMemoryStore } from "../src/data/memorystore.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";

const LONG = "비가 내리는 옥상에서 미나가 하루의 손을 잡고 오래 숨겨 둔 비밀을 처음으로 털어놓았다. 하루는 아무 대답도 하지 못했다. ".repeat(2);
const good = JSON.stringify({ people: [{ name: "미나", act: "비밀", p: 2, s: 2, r: 2 }], scene: { sum: "옥상", facts: ["비밀"], place: "옥상", who: ["미나"], changed: true } });
const sleep0 = () => Promise.resolve();
const CONN = { conn: { url: "http://x", via: "native" }, model: {} };
const reply = (status, json) => ({ status, json: async () => json });

function fakeCellar(script = {}) {
  const calls = []; let n = 0;
  const api = { nativeFetch: async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    calls.push(body.action);
    if (body.action === "start") return script.start ? script.start(body) : reply(200, { ok: true, job: { id: "a1", state: "running", total: 2, done: 0, failed: 0 } });
    if (body.action === "status") { n++; return script.status ? script.status(n) : reply(200, { ok: true, job: { id: "a1", state: n < 2 ? "running" : "done", total: 2, done: n < 2 ? 1 : 2, failed: 0, reasons: [] } }); }
    if (body.action === "cancel") return reply(200, { ok: true });
    return reply(404, {});
  } };
  return { api, calls };
}
const cellarOk = { status: async () => ({ ok: true, url: "http://x", via: "native", features: ["mem", "analysis"] }) };
const remoteOk = { state: () => ({ mode: "remote", online: true }) };
const mk = (api) => createServerAnalysis(api, { cellar: cellarOk, remote: remoteOk, pollMs: 0, sleep: sleep0 });

test("slimMessages는 분석에 필요한 필드만 보낸다", () => {
  assert.deepEqual(slimMessages([{ role: "user", data: "a", extra: 1 }]), [{ role: "user", data: "a" }]);
});

test("run: start → 진행 폴링 → 결과(server:true)", async () => {
  const { api, calls } = fakeCellar();
  const seen = [];
  const out = await mk(api).run(CONN, { chaId: "c" }, { onProgress: (n, t) => seen.push([n, t]) });
  assert.equal(out.server, true); assert.equal(out.total, 2); assert.deepEqual(out.failed, []);
  assert.equal(calls[0], "start"); assert.deepEqual(seen.at(-1), [2, 2]);
});

test("run: 서버가 연결 안 되거나 미지원이면 null(기기에서 분석), 시작 뒤 오류는 던진다", async () => {
  assert.equal(await mk({ nativeFetch: async () => { throw new Error("끊김"); } }).run(CONN, {}), null);
  assert.equal(await mk(fakeCellar({ start: () => reply(501, { ok: false, error: "엔진 없음" }) }).api).run(CONN, {}), null);
  await assert.rejects(mk(fakeCellar({ start: () => reply(409, { ok: false, error: "이미 분석 중이에요" }) }).api).run(CONN, {}), /이미 분석 중/);
  await assert.rejects(mk(fakeCellar({ status: () => reply(200, { ok: true, job: { state: "error", error: "모델 오류" } }) }).api).run(CONN, {}), /모델 오류/);
});

test("run: 상태 확인이 계속 끊기면 오류로 알리고, 취소하면 서버에 cancel을 보낸다", async () => {
  let n = 0;
  const dead = { nativeFetch: async (u, init) => { if (JSON.parse(init.body).action === "start") return reply(200, { ok: true, job: { state: "running" } }); n++; throw new Error("끊김"); } };
  await assert.rejects(mk(dead).run(CONN, {}), /연결이 끊겼어요/);
  assert.ok(n >= 6);
  const { api, calls } = fakeCellar({ status: () => reply(200, { ok: true, job: { state: "cancelled", total: 2, done: 1, failed: 0 } }) });
  const ctrl = new AbortController(); ctrl.abort();
  await mk(api).run(CONN, {}, { signal: ctrl.signal });
  assert.ok(calls.includes("cancel"));
});

test("prepare: 기억이 서버에 없거나 서버가 분석을 모르거나 리스 보조 모델이면 null", async () => {
  const api = { pluginStorage: { getItem: async () => null } };
  assert.equal(await createServerAnalysis(api, { cellar: cellarOk, remote: { state: () => ({ mode: "local" }) } }).prepare({ mode: "custom" }), null);
  assert.equal(await createServerAnalysis(api, { cellar: { status: async () => ({ ok: true, features: ["mem"] }) }, remote: remoteOk }).prepare({ mode: "custom" }), null);
  assert.equal(await createServerAnalysis(api, { cellar: cellarOk, remote: remoteOk }).prepare({ mode: "submodel" }), null);
});

function runnerSetup(server) {
  const m = new Map();
  const chat = { id: "t1", name: "채팅1", message: [{ role: "user", data: "안녕" }, { role: "char", data: LONG, chatId: "m1" }] };
  const character = { chaId: "c1", name: "봇", chats: [chat] };
  const api = {
    pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat,
    addRisuScriptHandler: async () => {}, getDatabase: async () => ({ username: "하윤" })
  };
  const store = createMemoryStore(api);
  return { runner: createMemoryRunner(api, { store, call: async () => good, server, retryMs: 1 }), store };
}

test("러너: 서버 경로가 가능하면 기기 호출 없이 서버 결과를 돌려준다", async () => {
  let ran = null;
  const server = { slim: slimMessages, prepare: async () => ({ conn: {}, model: {} }), run: async (_p, payload) => { ran = payload; return { total: 1, failed: [], reasons: [], server: true }; } };
  const { runner } = runnerSetup(server);
  const out = await runner.backfill(0, 0, { from: 0, to: 1 }, {});
  assert.equal(out.server, true); assert.equal(ran.chaId, "c1"); assert.equal(ran.chatId, "t1"); assert.ok(ran.userNames.includes("하윤"));
  assert.equal(ran.messages.length, 2); assert.equal(ran.range.to, 1);
});

test("러너: 서버를 못 쓰면(prepare·run이 null) 기기에서 그대로 분석한다", async () => {
  for (const server of [{ slim: slimMessages, prepare: async () => null, run: async () => { throw new Error("부르면 안 돼요"); } }, { slim: slimMessages, prepare: async () => ({}), run: async () => null }, null]) {
    const { runner, store } = runnerSetup(server);
    const out = await runner.backfill(0, 0, { from: 0, to: 1 }, {});
    assert.equal(out.server, undefined); assert.equal(out.total, 1); assert.equal(out.failed.length, 0);
    assert.ok((await store.getFolder("c1", "t1")).people["미나"]);
  }
});

import { serverModelOf, saveCfg, keyStore } from "../src/data/modelhub.js";
import { createModelPreset } from "../src/engine/pot/model-options.js";
import { defaultCfg } from "../src/engine/modelcfg.js";

test("serverModelOf: 리스 보조 모델·미지원 종류·추가 설정은 거절, 지원 모델은 주소·형식을 만든다", async () => {
  const store = new Map();
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } } };
  assert.equal((await serverModelOf(api, { mode: "submodel" })).ok, false);
  const cfg = defaultCfg();
  const mkp = (over) => ({ ...createModelPreset("t", "m1"), ...over });
  const put = async (over) => { const c = JSON.parse(JSON.stringify(cfg)); c.presets = [{ id: "p1", name: "t", preset: mkp(over) }]; await saveCfg(api, c); };
  const pickOf = () => ({ mode: "custom", presetId: "p1" });
  const reasonOf = async (over) => { store.clear(); await put(over); return serverModelOf(api, pickOf()); };
  const g = await reasonOf({ provider: "google", baseUrl: "https://g.example/v1" });
  assert.equal(g.ok, false); assert.match(g.reason, /종류/);
  assert.match((await reasonOf({ provider: "custom", baseUrl: "https://c.example/v1", extraBodyJson: '{"a":1}' })).reason, /추가 요청/);
  assert.match((await reasonOf({ provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-5" })).reason, /추론/);
  assert.match((await reasonOf({ provider: "custom", baseUrl: "not a url" })).reason, /프리셋/, "검증을 통과하지 못한 프리셋은 없는 것으로 본다");
  assert.match((await reasonOf({ provider: "custom", baseUrl: "https://c.example/v1" })).reason, /키/, "지원 종류는 키 단계까지 간다(키가 없으면 키 없음)");
});
