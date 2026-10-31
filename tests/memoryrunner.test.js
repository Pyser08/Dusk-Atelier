import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../src/data/memorystore.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { hashText, extractMessageText, messageIdentity } from "../src/engine/chattext.js";
import { reconcile } from "../src/engine/memoryreconcile.js";

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

test("messages with the same first 200 characters get distinct full identities and backfill state", () => {
  const prefix = "x".repeat(240);
  const a = { role: "char", chatId: "same-prefix-a", data: prefix + "tail-A" };
  const b = { role: "char", chatId: "same-prefix-b", data: prefix + "tail-B" };
  assert.equal(hashText(a.data), hashText(b.data), "legacy hashes collide on the shared prefix");
  assert.notEqual(messageIdentity(a), messageIdentity(b), "new identity includes message ID and the full body");
  assert.notEqual(messageIdentity(a), messageIdentity({ ...a, data: prefix + "tail changed" }), "the same ID with a different full body is also a different identity");
  const { api, store } = setup();
  const runner = createMemoryRunner(api, { store, call: async () => good });
  const plan = runner.planBackfill([a, b]);
  assert.equal(plan.total, 2);
  assert.equal(plan.todo, 2);
  assert.equal(plan.calls, 1);
  const done = { done: [messageIdentity(a)], people: {}, scenes: [] };
  const after = runner.planBackfill([a, b], {}, done);
  assert.equal(after.done, 1);
  assert.equal(after.todo, 1);
  assert.equal(after.groups.flat().length, 1);
  assert.equal([a, b][after.groups[0][0]].chatId, "same-prefix-b");
});

test("10 streaming output hook calls → exactly 1 analysis, text returned unchanged", async () => {
  const { api, store } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; }, notify: () => {} });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.02; });
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
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; i.bots.c1 = { on: false }; });
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
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
  await runner.start(); api.hooks.output("x"); await wait(60);
  assert.equal(calls, 0);
  chat.isStreaming = false; await wait(80);
  assert.equal(calls, 1);
});
test("5 consecutive failures pause the bot and notify", async () => {
  const { api, store, chat } = setup(); let calls = 0, note = "";
  const runner = createMemoryRunner(api, { store, notify: (t) => { note = t; }, call: async () => { calls++; return "not json"; } });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
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
test("backfill progress is not capped at 1,000 and old ones are restored from anchors", async () => {
  const { api, store, chat } = setup();
  chat.message = []; for (let i = 0; i < 1200; i++) { chat.message.push({ role: "user", data: "u" + i }, { role: "char", data: "응답 " + i }); }
  const runner = createMemoryRunner(api, { store, call: async () => good });
  const hs = chat.message.filter((m) => m.role === "char").map((m) => messageIdentity(m));
  await store.updateFolder("c1", "t1", (f) => { f.done = hs; });  // 1,200개를 전부 분석한 상태
  const f = await store.getFolder("c1", "t1");
  const plan = runner.planBackfill(chat.message, {}, f);
  assert.equal(plan.total, 1200); assert.equal(plan.done, 1200); assert.equal(plan.calls, 0, "1,000개 넘어도 완료 목록이 유지된다");
  // 예전 데이터: 완료 목록이 최근 1,000개뿐이어도 오래된 쪽의 장면 앵커는 분석됨으로 본다
  const old = { done: hs.slice(-1000), scenes: [{ id: "s", h: hs[5] }], people: { a: { records: [{ id: "r", h: hs[7] }, { id: "r2", h: hs[9], orphan: true }] } } };
  const p2 = runner.planBackfill(chat.message, {}, old);
  assert.equal(p2.done, 1003); assert.equal(p2.todo, 197); assert.equal(p2.calls, 66);
  // 실패 표시
  const p3 = runner.planBackfill(chat.message, {}, { ...old, failedBackfill: [hs[0], hs[1], hs[5]] });
  assert.equal(p3.failed, 2, "미처리 중 실패한 것만 센다(분석됨인 hs[5]는 제외)");
});
test("reconcile trims done to messages still in the chat", async () => {
  const msgs = [{ role: "char", data: "하나" }, { role: "char", data: "둘" }];
  const f = { people: {}, scenes: [], done: [messageIdentity(msgs[0]), hashText("사라진 응답")], failedBackfill: [hashText("사라진 응답")] };
  reconcile(f, msgs);
  assert.deepEqual(f.done, [messageIdentity(msgs[0])]); assert.deepEqual(f.failedBackfill, []);
});

test("display hook alone triggers a check for a fresh response (output hook never fires)", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  chat.message[1].time = Date.now();
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; } });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
  await runner.start();
  assert.equal(api.hooks.display("화면"), "화면");
  await wait(120);
  assert.equal(calls, 1);
  assert.equal(runner.session().tick.result.length > 0, true);
  assert.equal(runner.session().hooks, 0);
  assert.equal(runner.session().displays, 1);
});
test("display hook ignores old chats (last AI message older than 10 minutes)", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  chat.message[1].time = Date.now() - 30 * 60e3;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; } });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
  await runner.start(); api.hooks.display("x"); await wait(100);
  assert.equal(calls, 0);
});
test("keeps waiting for a long generation (more than 5 retries) and records diagnostics", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  chat.isStreaming = true;
  const runner = createMemoryRunner(api, { store, retryMs: 10, call: async () => { calls++; return good; } });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
  await runner.start(); api.hooks.output("x"); await wait(150);
  assert.equal(calls, 0);
  assert.equal(runner.session().tick.result, "generating");
  assert.ok(runner.session().hooks >= 1);
  chat.isStreaming = false; await wait(60);
  assert.equal(calls, 1);
  assert.equal(runner.session().tick.result.length > 0, true);
});
test("skip reasons are visible in diagnostics (short response)", async () => {
  const { api, store, chat } = setup();
  const runner = createMemoryRunner(api, { store, call: async () => good });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
  await runner.start(); chat.message[1].data = "짧아요"; chat.message[1].chatId = "mm"; api.hooks.output("x"); await wait(80);
  assert.equal(runner.session().tick.result, "short");
});

test("default timing (next input): output hook alone never analyzes; the next input confirms the previous reply; rerolls are left alone", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; } });
  await store.updateIndex((i) => { i.settings.debounceSec = 0.01; });  // confirm은 기본값(next)
  await runner.start();
  api.hooks.output("x"); api.hooks.display("x"); await wait(80);
  assert.equal(calls, 0, "응답 직후에는 기록하지 않는다");
  chat.message.push({ role: "user", data: "다음 말" });  // 다음 입력을 보냄
  await runner.confirmNext(); await wait(120);
  assert.equal(calls, 1);
  const f1 = await store.getFolder("c1", "t1"); assert.equal(f1.cursor.at, 1); assert.equal(f1.scenes.length, 1);
  // 새 응답 → 리롤 두 번: 다음 입력 전에는 아무것도 하지 않는다
  chat.message.push({ role: "char", data: LONG + " 새 응답", chatId: "m2" }); api.hooks.output("x"); await wait(60);
  chat.message[3] = { role: "char", data: LONG + " 리롤된 응답", chatId: "m3" }; api.hooks.output("x"); await wait(60);
  assert.equal(calls, 1, "리롤되는 응답은 기록하지 않는다");
  chat.message.push({ role: "user", data: "또 다음 말" });
  await runner.confirmNext(); await wait(120);
  assert.equal(calls, 2); const f2 = await store.getFolder("c1", "t1"); assert.equal(f2.cursor.at, 3);
  await runner.confirmNext(); await wait(120);
  assert.equal(calls, 2, "같은 응답은 다시 분석하지 않는다");
});
test("immediate timing (now): confirmNext does nothing", async () => {
  const { api, store } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; } });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
  await runner.start(); await runner.confirmNext(); await wait(80);
  assert.equal(calls, 0);
});
