// 1.8.3 점검에서 찾은 버그들 (고치기 전 실패 확인용)
import test from "node:test";
import assert from "node:assert/strict";
import { turnKey } from "../src/engine/fairplay.js";
import { createTurnInfo, TURN_LOG_KEY } from "../src/data/turninfo.js";
import { createSwitches } from "../src/data/memoryswitches.js";
import { createChatMenu } from "../src/data/chatmenu.js";

const memApi = (extra = {}) => { const store = new Map(); return { store, api: { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, addRisuReplacer: async () => {}, addRisuScriptHandler: async () => {}, getDatabase: async () => ({}), ...extra } }; };

test("리롤 열쇠: 장기 기억·이야기 시간 같은 system 내용이 바뀌어도 대화가 같으면 같은 턴", () => {
  const chat = [{ role: "assistant", content: "A" }, { role: "user", content: "U" }];
  assert.equal(turnKey([{ role: "system", content: "기억 1" }, ...chat]), turnKey([{ role: "system", content: "기억 2" }, ...chat]));
  assert.notEqual(turnKey(chat), turnKey([...chat.slice(0, 1), { role: "user", content: "다른 입력" }]));
});
test("캐시 알림만 켜져 있으면 응답 기록을 저장하지 않는다", async () => {
  const { api, store } = memApi(); const t = createTurnInfo(api, { chip: false, quietMs: 1 }); await t.start();
  await t.beforeRequest([{ role: "user", content: "안녕" }], "model");
  await t.onOutput("응답이 이렇게 나왔어요 길게"); await new Promise((r) => setTimeout(r, 900));
  assert.equal(store.get(TURN_LOG_KEY), undefined);
});
test("응답이 오지 않아도 '추론 중' 칩은 5분 뒤 멈추고, 호출 표시를 끄면 다시 생기지 않는다", async () => {
  let now = 0, sets = 0, removed = 0;
  const el = { setInnerText: async () => { sets++; }, setInnerHTML: async () => {}, setAttribute: async () => {}, appendChild: async () => {}, remove: async () => { removed++; } };
  const doc = { querySelector: async () => el, createElement: async () => el };
  const { api } = memApi({ getRootDocument: async () => doc });
  const t = createTurnInfo(api, { now: () => now }); await t.start(); await t.setCallShow(true);
  await t.beforeRequest([{ role: "user", content: "x" }], "model");
  now = 6 * 60e3; await new Promise((r) => setTimeout(r, 800));
  const after = sets; await new Promise((r) => setTimeout(r, 800));
  assert.equal(sets, after, "5분 넘으면 더 갱신하지 않는다"); assert.ok(removed >= 1);
  now = 0; await t.beforeRequest([{ role: "user", content: "y" }], "model"); await t.setCallShow(false);
  const s2 = sets; await new Promise((r) => setTimeout(r, 800)); assert.equal(sets, s2, "끈 뒤에는 칩을 다시 만들지 않는다");
});
test("열린 채팅: fresh로 부르면 캐시를 건너뛴다(채팅 삭제 직후 내 프롬프트 범위)", async () => {
  const s = { copies: 0, id: "t0" };
  const api = { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => { s.copies++; return { chaId: "c", name: "봇", chats: [{ id: s.id }] }; } };
  const sw = createSwitches({ api, store: {} });
  await sw.currentChat(); s.id = "t1";
  assert.equal((await sw.currentChat()).chatId, "t0");
  assert.equal((await sw.currentChat({ fresh: true })).chatId, "t1");
});
test("채팅 메뉴: 응답 아래 표시를 못 쓰는 호스트(RisuBard)에서는 '주사위 결과 표시' 버튼을 빼요", async () => {
  const parts = new Map();
  const api = { pluginStorage: { getItem: async () => null, setItem: async () => {} }, registerButton: async (a) => { parts.set(a.id, a); return { id: a.id }; } };
  const fair = { isOn: () => false, isDiceOn: () => false, set: async () => {}, setDice: async () => {} };
  await createChatMenu(api, { fairPlay: fair, turnInfo: { supported: () => false, isDiceShow: () => false, setDiceShow: async () => {} } }).start();
  assert.deepEqual([...parts.keys()].sort(), ["dusk-qt-dice", "dusk-qt-fair"]);
});
