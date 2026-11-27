import { test } from "node:test";
import assert from "node:assert/strict";
import { planRemap } from "../src/data/memoryfile.js";

const F = (chaId, chatId, botName, chatName) => ({ v: 3, chaId, chatId, botName, chatName, people: {} });

test("planRemap: same place, chat id elsewhere, name match, single chat, missing", () => {
  const chars = [
    { chaId: "B1", name: "앨리스", chats: [{ chatId: "c1", name: "첫 만남", ti: 0 }, { chatId: "c2", name: "두 번째", ti: 1 }] },
    { chaId: "B2", name: "보브", chats: [{ chatId: "scope-x", name: "새 채팅", ti: 0 }] },
    { chaId: "B3", name: "캐럴", chats: [{ chatId: "z", name: "아무거나", ti: 0 }] }
  ];
  const folders = [
    F("B1", "c1", "앨리스", "첫 만남"),          // 그대로
    F("OLD", "scope-x", "보브", "다른 이름"),     // 채팅 범위 ID가 따라옴
    F("OLD1", "q", "앨리스", "두 번째"),          // 봇 이름 + 채팅 이름
    F("OLD3", "q3", "캐럴", "다른"),              // 봇 채팅 하나뿐, 파일에도 하나
    F("OLD4", "q4", "없는 봇", "x")               // 못 찾음
  ];
  const p = planRemap(folders, chars);
  assert.equal(p[0], "same");
  assert.deepEqual(p[1], { chaId: "B2", chatId: "scope-x", chatIndex: 0, chatName: "새 채팅", botName: "보브" });
  assert.equal(p[2].chaId, "B1"); assert.equal(p[2].chatId, "c2");
  assert.equal(p[3].chaId, "B3"); assert.equal(p[3].chatId, "z");
  assert.equal(p[4], null);
});

test("planRemap: two folders never land in one chat", () => {
  const chars = [{ chaId: "B", name: "봇", chats: [{ chatId: "s", name: "같은", ti: 0 }] }];
  const p = planRemap([F("X", "s", "봇", "같은"), F("Y", "s", "봇", "같은")], chars);
  assert.equal(p[0].chatId, "s");
  assert.equal(p[1], null);
});
