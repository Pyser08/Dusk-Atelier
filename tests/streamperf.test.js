import test from "node:test";
import assert from "node:assert/strict";
import { createLoreLog } from "../src/data/lorelog.js";
import { createLoreRuntime } from "../src/data/lorerules.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { noteStreamChunk, resetStreamSignal } from "../src/data/genstate.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function fakeApi(over = {}) {
  const calls = { char: 0, chat: 0 };
  const chat = { id: "c1", message: [{ role: "user", data: "안녕" }, { role: "char", data: "응답입니다 응답입니다" }], localLore: [] };
  const character = { chaId: "x", name: "봇", chats: [chat], globalLore: [], loreSettings: {} };
  const store = {};
  return { calls, chat, api: {
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => { calls.char++; return character; },
    getChatFromIndex: async () => { calls.chat++; return chat; },
    getDatabase: async () => ({ modules: [], enabledModules: [], username: "유저" }),
    pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } },
    ...over } };
}

test("로어북 로그: 스트리밍 중 앞부분이 청크마다 바뀌어도 캐릭터를 청크마다 가져오지 않는다", async () => {
  const { api, calls } = fakeApi();
  const log = createLoreLog(api, { quietMs: 30, log: () => {} });
  await log.onOutput("<think>생각 중 가나다라마바사</think>시작 본문 하나 둘 셋");  // 첫 청크(바로 처리)
  const base = calls.char;
  for (let i = 0; i < 20; i++) { await log.onOutput(`<Thought${i}>접힌 생각 ${"가".repeat(i + 4)}</Thought>본문 ${i}`); await wait(2); }
  assert.equal(calls.char, base, "스트리밍 중에는 캐릭터 조회 없음");
  await wait(80);  // 잠잠해진 뒤 한 번
  assert.ok(calls.char - base <= 1, `끝난 뒤 최대 1번만 (실제 ${calls.char - base})`);
});

test("로어 규칙: 최근에 스트리밍 청크가 있으면 채팅을 가져오지 않고 미룬다", async () => {
  const { api, calls } = fakeApi({ addRisuScriptHandler: async () => {} });
  const rt = createLoreRuntime(api, { log: () => {} });
  noteStreamChunk(); noteStreamChunk();   // 잇따른 청크 = 스트리밍
  await rt.prepareReroll();
  assert.equal(calls.chat + calls.char, 0);
  resetStreamSignal();
});

test("장기기억: 생성 중 재확인은 캐릭터를 통째로 가져오지 않는다", async () => {
  const { api, calls, chat } = fakeApi();
  chat.isStreaming = true;
  let idx = { settings: { debounceSec: 0, confirm: "now" }, bots: {}, status: {} };
  const store = { getIndex: async () => idx, updateIndex: async (fn) => { fn(idx); }, migrate: async () => {} };
  const runner = createMemoryRunner(api, { store, retryMs: 10, call: async () => ({}) });
  await runner.tick?.();
  await wait(80);
  assert.equal(calls.char, 0, "캐릭터 통째 조회 없음");
  assert.ok(calls.chat >= 1);
  chat.isStreaming = false;  // 대기 타이머가 끝나도록 풀어 준다
  await wait(80);
});

test("스트리밍 신호: 단발 출력은 스트리밍이 아니고, 잇따른 청크만 스트리밍으로 본다", async () => {
  const { recentlyStreamed } = await import("../src/data/genstate.js");
  resetStreamSignal();
  noteStreamChunk();
  assert.equal(recentlyStreamed(), false);
  noteStreamChunk();
  assert.equal(recentlyStreamed(), true);
  assert.equal(recentlyStreamed(0), false);
  resetStreamSignal();
});
