import test from "node:test";
import assert from "node:assert/strict";
import { loadChats } from "../src/ui/screens/memory/chatload.js";

test("채팅 목록: 본문은 보는 채팅 하나만 읽고, 이름·개수는 이미 읽은 정보로 만든다", async () => {
  let reads = 0;
  const bot = { id: "b", index: 3, character: { chats: Array.from({ length: 6 }, (_, i) => ({ id: "c" + i, name: "채팅" + i, message: new Array(i + 1) })) } };
  const ctx = { state: { mem: { chatIndex: 2 } }, api: { getChatFromIndex: async (ci, ti) => { reads++; return { id: "c" + ti, name: "채팅" + ti, message: new Array(ti + 1).fill(0) }; } } };
  const v = await loadChats(ctx, bot);
  assert.equal(reads, 1); assert.ok(v[2].chat); assert.equal(v[0].chat, null); assert.equal(v[5].count, 6);
  ctx.state.mem.chatIndex = 4; await loadChats(ctx, bot); assert.equal(reads, 2, "다른 채팅을 열 때만 추가로 읽는다");
  await loadChats(ctx, bot); assert.equal(reads, 2, "캐시");
  ctx.state.mem.chatIndex = 99; const w = await loadChats(ctx, bot, true); assert.ok(w[0].chat, "범위 밖이면 0번");
});
