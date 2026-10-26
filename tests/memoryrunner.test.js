import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../src/data/memorystore.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";

const LONG = "비가 내리는 옥상에서 미나가 하루의 손을 잡고 오래 숨겨 둔 비밀을 처음으로 털어놓았다. 하루는 아무 대답도 하지 못했다. ".repeat(2);
function setup({ streaming = false } = {}) {
  const m = new Map();
  const chat = { id: "t1", name: "채팅1", message: [{ role: "user", data: "안녕" }, { role: "char", data: LONG, chatId: "m1" }] };
  const character = { chaId: "c1", name: "봇", chats: [chat] };
  const api = {
    pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat,
    addRisuScriptHandler: async (n, f) => { api.hooks[n] = f; }, hooks: {}
  };
  return { api, chat, character, store: createMemoryStore(api), m };
}
const good = JSON.stringify({ people: [{ name: "미나", act: "하루에게 비밀을 털어놓음", p: 2, s: 2, r: 2 }], scene: { sum: "비 오는 옥상", facts: ["비밀 공개"], place: "옥상", who: ["미나", "하루"], changed: true } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("10 streaming output hook calls → exactly 1 analysis, text returned unchanged", async () => {
  const { api, store } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; }, notify: () => {} });
  await store.updateIndex((i) => { i.settings.debounceSec = 0.02; });
  assert.equal(await runner.start(), true);
  for (let i = 0; i < 10; i++) assert.equal(api.hooks.output("본문" + i), "본문" + i);
  await wait(150);
  assert.equal(calls, 1);
  const f = await store.getFolder("c1", "t1");
  assert.equal(f.people["미나"].records[0].g, "B");
  assert.equal(f.scenes.length, 1);
  assert.equal(f.cursor.at, 1);
  api.hooks.output("again"); await wait(100);
  assert.equal(calls, 1, "same last message is not analyzed twice");
});
test("bot switched off → 0 calls; short responses skipped", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; } });
  await store.updateIndex((i) => { i.settings.debounceSec = 0.01; i.bots.c1 = { on: false }; });
  await runner.start(); api.hooks.output("x"); await wait(80);
  assert.equal(calls, 0);
  await store.updateIndex((i) => { i.bots.c1.on = true; });
  chat.message[1].data = "짧아요"; chat.message[1].chatId = "m2"; api.hooks.output("x"); await wait(80);
  assert.equal(calls, 0);
});
test("waits while the main model is generating, then analyzes", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  chat.isStreaming = true;
  const runner = createMemoryRunner(api, { store, retryMs: 20, call: async () => { calls++; return good; } });
  await store.updateIndex((i) => { i.settings.debounceSec = 0.01; });
  await runner.start(); api.hooks.output("x"); await wait(60);
  assert.equal(calls, 0);
  chat.isStreaming = false; await wait(80);
  assert.equal(calls, 1);
});
test("5 consecutive failures pause the bot and notify", async () => {
  const { api, store, chat } = setup(); let calls = 0, note = "";
  const runner = createMemoryRunner(api, { store, notify: (t) => { note = t; }, call: async () => { calls++; return "not json"; } });
  await store.updateIndex((i) => { i.settings.debounceSec = 0.01; });
  await runner.start();
  for (let n = 0; n < 6; n++) { chat.message[1].chatId = "m" + n; chat.message[1].data = LONG + n; api.hooks.output("x"); await wait(70); }
  assert.equal((await store.getIndex()).bots.c1.paused, true);
  assert.match(note, /멈췄어요/);
  const before = calls; chat.message[1].data = LONG + "z"; api.hooks.output("x"); await wait(70);
  assert.equal(calls, before);
});
test("output hook unavailable is reported in status", async () => {
  const { api, store } = setup(); delete api.addRisuScriptHandler;
  const runner = createMemoryRunner(api, { store });
  assert.equal(await runner.start(), false);
  assert.equal((await store.getIndex()).status.hook, "unavailable");
});
test("backfill groups AI responses by 3 and skips already-recorded ones", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  chat.message = []; for (let i = 0; i < 7; i++) { chat.message.push({ role: "user", data: "u" + i }, { role: "char", data: LONG + i }); }
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good.replace("하루에게", "하루에게 " + calls); } });
  const plan = runner.planBackfill(chat.message, {}); assert.equal(plan.calls, 3);
  const r = await runner.backfill(0, 0, {});
  assert.equal(r.total, 3); assert.equal(calls, 3); assert.equal(r.failed.length, 0);
  assert.equal(runner.planBackfill(chat.message, {}, await store.getFolder("c1", "t1")).calls, 0, "already analyzed responses are skipped");
});
