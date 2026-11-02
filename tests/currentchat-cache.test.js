import test from "node:test";
import assert from "node:assert/strict";
import { createSwitches } from "../src/data/memoryswitches.js";
import { bumpCacheGen } from "../src/data/dbcache.js";

const mk = () => { const s = { ci: 0, ti: 0, copies: 0, name: "A" }; return { s, api: { getCurrentCharacterIndex: async () => s.ci, getCurrentChatIndex: async () => s.ti, getCharacterFromIndex: async () => { s.copies++; return { chaId: "c" + s.ci, name: s.name, chats: [{ id: "t0", name: "채팅" }, { id: "t1", name: "둘" }] }; } } }; };

test("탭을 오가도 같은 봇·채팅이면 캐릭터 통째 복사를 다시 하지 않는다", async () => {
  const { s, api } = mk(); let t = 0; const sw = createSwitches({ api, store: {}, now: () => t });
  assert.equal((await sw.currentChat()).chaId, "c0"); t += 5000; await sw.currentChat(); t += 5000; await sw.currentChat();
  assert.equal(s.copies, 1);
  s.ti = 1; t += 100; assert.equal((await sw.currentChat()).chatId, "t1"); assert.equal(s.copies, 2);   // 채팅이 바뀌면 다시 읽음
  t += 31e3; await sw.currentChat(); assert.equal(s.copies, 3);                                          // 30초 지나면 다시 읽음
  s.name = "B"; bumpCacheGen(); assert.equal((await sw.currentChat()).botName, "B"); assert.equal(s.copies, 4);  // 쓰기·창 열기 때 비움
});
