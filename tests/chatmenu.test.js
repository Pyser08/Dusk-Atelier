import test from "node:test";
import assert from "node:assert/strict";
import { createChatMenu, CHAT_MENU_KEY } from "../src/data/chatmenu.js";

const mk = (extra = {}) => {
  const store = new Map(), parts = new Map(), calls = [];
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
    registerButton: async (arg, cb) => { calls.push(arg); parts.set(arg.id, { ...arg, cb }); return { id: arg.id }; }, unregisterUIPart: async (id) => void parts.delete(id), ...extra };
  const st = { fair: false, dice: false, show: false };
  const fair = { isOn: () => st.fair, isDiceOn: () => st.dice, set: async (v) => { st.fair = v; }, setDice: async (v) => { st.dice = v; } };
  const turn = { isDiceShow: () => st.show, setDiceShow: async (v) => { st.show = v; } };
  return { store, parts, calls, api, st, fair, turn };
};
test("입력창 옆 메뉴(chat)에 토글 3개, 누르면 바뀌고 이름(켜짐/꺼짐)이 그 자리에서 바뀐다", async () => {
  const t = mk(); const menu = createChatMenu(t.api, { fairPlay: t.fair, turnInfo: t.turn });
  await menu.start();
  assert.equal(t.parts.size, 3); assert.ok([...t.parts.values()].every((p) => p.location === "chat"));
  assert.match(t.parts.get("dusk-qt-fair").name, /공정한 전개.*꺼짐/);
  await t.parts.get("dusk-qt-dice").cb();
  assert.equal(t.st.dice, true); assert.equal(t.st.fair, true, "유저 편향을 켜면 공정한 전개도 켠다");
  assert.match(t.parts.get("dusk-qt-dice").name, /켜짐/); assert.match(t.parts.get("dusk-qt-fair").name, /켜짐/);
  await t.parts.get("dusk-qt-show").cb(); assert.equal(t.st.show, true);
  await t.parts.get("dusk-qt-fair").cb(); assert.equal(t.st.fair, false);
});
test("설정에서 끄면 버튼을 빼고 저장, 버튼 API가 없으면 조용히 넘어감", async () => {
  const t = mk(); const menu = createChatMenu(t.api, { fairPlay: t.fair, turnInfo: t.turn });
  await menu.start(); await menu.setOn(false);
  assert.equal(t.parts.size, 0); assert.equal(t.store.get(CHAT_MENU_KEY), "off");
  const g = createChatMenu({ pluginStorage: t.api.pluginStorage }, { fairPlay: t.fair, turnInfo: t.turn }); assert.equal(await g.start(), false);
});
