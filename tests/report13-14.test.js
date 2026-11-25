import test from "node:test";
import assert from "node:assert/strict";
import { scopeIsCopy, ChatScopeManager } from "../src/engine/pot/chat-scope.js";
import { createTurnInfo, TURN_LOG_KEY } from "../src/data/turninfo.js";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";

const F = "risupotWikiScopeId";
test("#13: 분기를 다시 분기해도(목록 맨 위) 원본이 범위를 지킨다", () => {
  const orig = { id: "b", [F]: "chat-x", message: [] }, br = { id: "c", [F]: "chat-x", message: [] };
  assert.equal(scopeIsCopy([br, orig], 0, br, "chat-x"), true);
  assert.equal(scopeIsCopy([br, orig], 1, orig, "chat-x"), false);
});
test("#13: 목록 순서를 바꿔도 분기 표식으로 사본을 가린다", () => {
  const orig = { id: "b", [F]: "chat-x", message: [] }, br = { id: "c", [F]: "chat-x", message: [{ data: "{{specialcomment::branchedfrom::b::이름::m1::}}" }] };
  assert.equal(scopeIsCopy([orig, br], 1, br, "chat-x"), true);
  assert.equal(scopeIsCopy([orig, br], 0, orig, "chat-x"), false);
});
test("#13: 첫 분기는 그대로, 갈라진 범위는 채팅 id", async () => {
  const orig = { id: "a", [F]: "a", message: [] }, br = { id: "c", [F]: "a", message: [] }, char = { chaId: "B", chats: [br, orig] };
  const m = new ChatScopeManager({});
  assert.equal((await m.resolveAt(char, orig, 0, 1)).chatKey, "a");
  const r = await m.resolveAt(char, br, 0, 0);
  assert.equal(r.duplicate, true); assert.equal(r.candidateChatKey, "c");
});
test("#13: 이어받은 위키는 새 채팅 키를 가진다", async () => {
  const m = new Map(), store = createMemoryStoreV3({}, { storage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } } });
  await store.updateFolder("b", "a", (f) => { f.wiki = { scope: { characterId: "b", chatKey: "a" }, documents: {} }; });
  await store.adoptFolder("b", "a", "c");
  assert.equal((await store.getWiki("b", "c")).scope.chatKey, "c");
  assert.equal((await store.getWiki("b", "a")).scope.chatKey, "a");
});

const BG = '<div class="hud">상단 배경 화면 모듈 표시 영역입니다</div>', REPLY = "문이 삐걱 열렸다. 안은 어두웠고 바람이 불었다.";
function host(messages, saved) {
  const kv = new Map(); if (saved) kv.set(TURN_LOG_KEY, JSON.stringify(saved));
  return { pluginStorage: { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); } }, getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getChatFromIndex: async () => ({ message: messages.slice() }), addRisuReplacer: async () => {}, addRisuScriptHandler: async () => {} };
}
test("#14: 배경 HTML은 주사위를 가져가지 않고, 새 응답에 붙는다", async () => {
  const msgs = [{ role: "user", data: "문을 연다" }, { role: "char", data: REPLY }];
  let dice = null; const t = createTurnInfo(host(msgs), { chip: false, diceSource: () => dice });
  await t.start(); await t.setDiceShow(true); await t.beforeRequest([{ role: "user", content: "문을 연다" }], "model");
  dice = { at: Date.now(), rolls: [42], cuts: undefined, mode: "reinterpret" };
  assert.equal(await t.onDisplay(BG), BG);
  assert.match(await t.onDisplay(REPLY), /x-dusk="dice"/);
});
test("#14: 이미 배경에 붙어 저장된 옛 주사위도 표시하지 않는다", async () => {
  const { headKey } = await import("../src/engine/lorelog.js");
  const rec = { at: 1, head: headKey(BG), tail: "", mid: "", dice: { rolls: [7] } };
  const t = createTurnInfo(host([{ role: "char", data: REPLY }], { v: 1, recs: [rec] }), { chip: false });
  await t.start(); await t.setDiceShow(true);
  assert.equal(await t.onDisplay(BG), BG);
});
