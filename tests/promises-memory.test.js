// docs/PROMISES.md 장기기억 약속을 문장 그대로 검사한다(저장값이 아니라 결과: 모델 호출 횟수·요청 글).
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../src/data/memorystore.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { createSwitches } from "../src/data/memoryswitches.js";

const LONG = "비가 내리는 옥상에서 미나가 하루의 손을 잡고 오래 숨겨 둔 비밀을 처음으로 털어놓았다. 하루는 아무 대답도 하지 못했다. ".repeat(2);
const good = JSON.stringify({ people: [{ name: "미나", act: "하루에게 비밀을 털어놓음", p: 2, s: 2, r: 2 }], scene: { sum: "비 오는 옥상", facts: ["비밀 공개"], place: "옥상", who: ["미나", "하루"], changed: true } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function setup() {
  const m = new Map();
  const chat = { id: "t1", name: "채팅1", message: [{ role: "user", data: "안녕" }, { role: "char", data: LONG, chatId: "m1" }] };
  const character = { chaId: "c1", name: "봇", chats: [chat] };
  const api = {
    pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat,
    addRisuScriptHandler: async (n, f) => { api.hooks[n] = f; }, hooks: {}
  };
  const store = createMemoryStore(api);
  store.updateIndex((i) => { i.settings.staged = false; i.settings.confirm = "now"; i.settings.debounceSec = 0.01; });
  return { api, chat, store };
}
const newReply = (chat, n) => { chat.message[1].data = LONG + n; chat.message[1].chatId = "m" + n; };

test("M-2 홈에서 장기 기억(모든 채팅)을 끄면 새 응답에 보조 모델 호출이 0회다", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; } });
  await runner.start();
  await createSwitches({ api, store }).setMemoryEverywhere(false);   // 홈 스위치가 부르는 것과 같은 함수
  newReply(chat, 2); api.hooks.output("x"); await wait(80);
  assert.equal(calls, 0);
  await createSwitches({ api, store }).setMemoryEverywhere(true);
  newReply(chat, 3); api.hooks.output("x"); await wait(80);
  assert.equal(calls, 1, "다시 켜면 기록한다(이 시험이 실제 호출을 보는지 확인)");
});

test("M-2 저장 위치를 '끔'으로 바꾸면(실행 중이어도) 보조 모델 호출이 0회다", async () => {
  const { api, store, chat } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return good; } });
  await runner.start();
  await store.updateIndex((i) => { i.settings.backend = "off"; });
  newReply(chat, 2); api.hooks.output("x"); await wait(80);
  assert.equal(calls, 0);
});
