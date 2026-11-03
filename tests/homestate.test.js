import test from "node:test";
import assert from "node:assert/strict";
import { readState } from "../src/ui/screens/homestate.js";

test("홈 상태 읽기: 쓰지 않는 백필 계획·채팅 통째 읽기를 하지 않는다", async () => {
  let planned = 0, chatReads = 0;
  const ctx = {
    api: { getChatFromIndex: async () => { chatReads++; return { message: [] }; } },
    memory: {
      switches: { currentChat: async () => ({ ci: 0, ti: 0, chaId: "c", chatId: "t", botName: "b", chatName: "n" }), state: async () => ({ memory: { on: true } }) },
      store: { getIndex: async () => ({ settings: {}, bots: {} }), getFolder: async () => null },
      backend: () => ({ id: "x" }), capabilities: () => ({ analyze: true }),
      runner: { planBackfill: () => { planned++; return { todo: 1 }; } }, flow: null, injector: null
    }
  };
  const s = await readState(ctx);
  assert.equal(planned, 0); assert.equal(chatReads, 0); assert.equal(s.cur.chaId, "c");
});

test("홈 상태 읽기: 열린 채팅 확인을 기다리는 동안 인덱스 읽기를 같이 시작한다 (홈 속도, 1.8.3)", async () => {
  const order = [];
  const ctx = { memory: {
    switches: { currentChat: async () => { order.push("cur:start"); await new Promise((r) => setTimeout(r, 5)); order.push("cur:end"); return { chaId: "c", chatId: "t" }; }, state: async () => ({}) },
    store: { getIndex: async () => { order.push("index"); return {}; }, getFolder: async () => null },
    flow: null, injector: null
  } };
  await (await import("../src/ui/screens/homestate.js")).readState(ctx);
  assert.ok(order.indexOf("index") < order.indexOf("cur:end"), order.join(","));
});
