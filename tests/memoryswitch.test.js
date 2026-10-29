// 1.7.0 2단계: 기억/리수폿 스위치 분리 · v3.1 마이그레이션 · 봇별/인물별 끄기 · 지금 채팅
import test from "node:test";
import assert from "node:assert/strict";
import { INDEX_REV, comboOf, memoryState, migrateIndex, potCharOn, potCharsOff, potConfirm, potOffForBot, potState, scopeKeyOf, setMemoryForBot, setMemoryGlobal, setPotChar, setPotForBot, setPotGlobal } from "../src/engine/memoryswitch.js";
import { createMemoryStoreV3, INDEX_KEY } from "../src/data/memorystore3.js";
import { createSwitches, currentChat } from "../src/data/memoryswitches.js";

const mockApi = () => { const m = new Map(); return { m, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } } }; };
const fresh = () => migrateIndex({ settings: { backend: "auto", potMode: true, confirm: "next", inject: { on: true }, flow: { on: false } }, bots: {} });

test("마이그레이션: 켜져 있던 값은 그대로, 리수폿 설정 칸이 예전 값으로 채워진다(멱등)", () => {
  const old = { v: 3, settings: { backend: "bardwiki", confirm: "now", potMode: true, inject: { on: true }, flow: { on: true, mode: "accurate" } }, bots: { c1: { on: false } } };
  const a = migrateIndex(structuredClone(old));
  assert.equal(a.rev, INDEX_REV);
  assert.deepEqual(a.settings.potStore, { backend: "bardwiki", confirm: "now" });
  assert.equal(a.settings.flow.on, true, "리수폿 켜짐 유지");
  assert.equal(a.settings.inject.on, true, "기억 켜짐 유지");
  assert.equal(a.bots.c1.on, false, "봇별 기억 끔 유지");
  assert.deepEqual(a.potBots, {}); assert.deepEqual(a.potChars, {});
  assert.deepEqual(migrateIndex(structuredClone(a)), a, "다시 돌려도 같다");
  // 이미 따로 저장된 리수폿 설정은 덮어쓰지 않는다
  const b = migrateIndex({ rev: 1, settings: { backend: "auto", confirm: "next", potStore: { backend: "local", confirm: "now" } } });
  assert.deepEqual(b.settings.potStore, { backend: "local", confirm: "now" });
  assert.equal(migrateIndex(null), null);
});

test("저장소: 예전 v3 인덱스를 읽으면 v3.1이 되고, 첫 쓰기 때 저장된다", async () => {
  const api = mockApi();
  api.m.set(INDEX_KEY, JSON.stringify({ v: 3, settings: { confirm: "now", flow: { on: true } }, bots: { c1: { on: true } }, folders: {}, status: {}, pot: {} }));
  const st = createMemoryStoreV3(api);
  const idx = await st.getIndex();
  assert.equal(idx.rev, 1); assert.equal(idx.settings.potStore.confirm, "now"); assert.equal(idx.settings.flow.on, true);
  assert.equal(JSON.parse(api.m.get(INDEX_KEY)).rev, undefined, "읽기만으로는 쓰지 않는다");
  await st.updateIndex((i) => { i.settings.confirm = "next"; });  // 기억의 기록 시점만 바꿔도
  const saved = JSON.parse(api.m.get(INDEX_KEY));
  assert.equal(saved.rev, 1);
  assert.equal(saved.settings.potStore.confirm, "now", "리수폿의 기록 시점은 따로 남는다");
  assert.equal((await createMemoryStoreV3(mockApi()).getIndex()).rev, 1, "새 인덱스도 v3.1");
});

test("기억 상태: 저장소 끔·주입 끔은 전체 꺼짐, 봇별 끔은 그 봇만", () => {
  const idx = fresh();
  assert.deepEqual(memoryState(idx, "c1"), { on: true, reason: "on" });
  setMemoryForBot(idx, "c1", false);
  assert.deepEqual(memoryState(idx, "c1"), { on: false, reason: "bot-off" });
  assert.equal(memoryState(idx, "c2").on, true);
  idx.settings.inject.on = false;
  assert.equal(memoryState(idx, "c2").reason, "global-off");
  const off = fresh(); off.settings.backend = "off";
  assert.equal(memoryState(off, "c1").reason, "global-off");
  setMemoryGlobal(off, true);
  assert.equal(off.settings.backend, "auto", "켜면 저장소 '끔'이었던 것도 되돌린다");
});

test("리수폿 상태: 기능 끔 · 전체 꺼짐 · 봇별 끔을 구분한다", () => {
  const idx = fresh();
  assert.equal(potState(idx, "c1").reason, "flow-off");
  setPotGlobal(idx, true);
  assert.deepEqual(potState(idx, "c1"), { on: true, reason: "on" });
  setPotForBot(idx, "c1", false);
  assert.equal(potState(idx, "c1").reason, "bot-off"); assert.equal(potOffForBot(idx, "c1"), true); assert.equal(potState(idx, "c2").on, true);
  setPotForBot(idx, "c1", true);
  assert.deepEqual(idx.potBots, {}, "켜면 기록을 지워 전체 기본을 따른다");
  idx.settings.potMode = false;
  assert.equal(potState(idx, "c1").reason, "pot-mode-off");
  setPotGlobal(idx, true);
  assert.equal(idx.settings.potMode, true, "리수폿을 켜면 기능도 함께 켜진다");
});

test("조합: 둘 다 / 기억만 / 리수폿만 / 둘 다 끔 — 서로 영향을 주지 않는다", () => {
  const idx = fresh();
  setPotGlobal(idx, true);
  assert.equal(comboOf(idx, "c1"), "both");
  setPotForBot(idx, "c1", false);
  assert.equal(comboOf(idx, "c1"), "memory");
  setPotForBot(idx, "c1", true); setMemoryForBot(idx, "c1", false);
  assert.equal(comboOf(idx, "c1"), "pot");
  setPotForBot(idx, "c1", false);
  assert.equal(comboOf(idx, "c1"), "none");
  assert.equal(idx.bots.c1.on, false); assert.equal(idx.potBots.c1, false);
});

test("위키 인물(캐릭터)별 끄기: 기본은 켜짐, 범위(채팅)마다 따로", () => {
  const idx = fresh(), s1 = scopeKeyOf("c1", "t1"), s2 = scopeKeyOf("c1", "t2");
  assert.equal(s1, "c1::t1");
  assert.equal(potCharOn(idx, s1, "doc:a"), true);
  setPotChar(idx, s1, "doc:a", false); setPotChar(idx, s1, "doc:b", false); setPotChar(idx, s1, "doc:a", false);
  assert.deepEqual(potCharsOff(idx, s1), ["doc:a", "doc:b"]);
  assert.equal(potCharOn(idx, s1, "doc:a"), false); assert.equal(potCharOn(idx, s2, "doc:a"), true);
  setPotChar(idx, s1, "doc:a", true); setPotChar(idx, s1, "doc:b", true);
  assert.deepEqual(idx.potChars, {}, "다 켜면 기록이 사라진다");
});

test("기록 시점: 리수폿 설정이 우선, 없으면 예전 공용 값", () => {
  assert.equal(potConfirm({ confirm: "now" }), "now");
  assert.equal(potConfirm({ confirm: "now", potStore: { confirm: "next" } }), "next");
  assert.equal(potConfirm({ potStore: { confirm: "now" } }), "now");
  assert.equal(potConfirm({}), "next"); assert.equal(potConfirm(undefined), "next");
});

test("스위치 묶음: 저장되고, 리수폿을 바꾸면 흐름이 다시 적용되며, 지금 채팅이 기본", async () => {
  const api = mockApi(), st = createMemoryStoreV3(api);
  let applied = 0;
  const char = { chaId: "ba", name: "샬레", chats: [{ id: "x0", name: "첫 채팅" }, { id: "t1", name: "예산 회의" }] };
  const rich = { ...api, getCurrentCharacterIndex: async () => 3, getCurrentChatIndex: async () => 1, getCharacterFromIndex: async () => char };
  const sw = createSwitches({ api: rich, store: st, flow: { apply: async () => { applied++; } } });
  assert.deepEqual(await sw.currentChat(), { ci: 3, ti: 1, chaId: "ba", botName: "샬레", chatId: "t1", chatName: "예산 회의" });
  assert.equal((await sw.state("ba")).combo, "memory", "처음엔 기억만 켜짐(리수폿 흐름은 꺼짐)");
  await sw.setPot("ba", true);
  assert.equal(applied, 1);
  assert.equal((await sw.state("ba")).combo, "both");
  await sw.setMemory("ba", false);
  assert.equal((await sw.state("ba")).combo, "pot");
  await sw.setPot("ba", false);
  assert.equal((await sw.state("ba")).combo, "none");
  assert.equal(applied, 2);
  await sw.setMemory("ba", true);
  assert.equal((await sw.state("ba")).memory.on, true);
  await sw.setChar("ba", "t1", "doc:yuuka", false);
  assert.equal(await sw.charOn("ba", "t1", "doc:yuuka"), false);
  assert.equal(await sw.charOn("ba", "t2", "doc:yuuka"), true);
  await sw.setPotEverywhere(false);
  assert.equal(applied, 3);
  // 열린 채팅이 없거나 오류면 null
  assert.equal(await currentChat({ getCurrentCharacterIndex: async () => -1, getCurrentChatIndex: async () => -1 }), null);
  assert.equal(await currentChat({ getCurrentCharacterIndex: async () => { throw new Error("x"); } }), null);
});
