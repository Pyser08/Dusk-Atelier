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
  assert.ok(![...t.parts.values()].some((p) => /장기/.test(p.name)), "열기 함수가 없으면 장기 기억 바로가기는 만들지 않는다");
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
test("장기 기억 바로가기가 공정한 전개 바로 위에 나오고, 누르면 열기 함수를 부른다(켜짐/꺼짐 이름 없음)", async () => {
  const t = mk(); let opened = 0; const menu = createChatMenu(t.api, { fairPlay: t.fair, turnInfo: t.turn, openMemory: () => { opened++; } });
  await menu.start();
  assert.equal(t.parts.size, 4);
  assert.deepEqual(t.calls.slice(0, 2).map((c) => c.id), ["dusk-qt-memory", "dusk-qt-fair"], "등록 순서 = 메뉴 순서: 장기 기억이 맨 위");
  const m = t.parts.get("dusk-qt-memory"); assert.equal(m.location, "chat"); assert.equal(m.name, "장기 기억");
  await m.cb(); assert.equal(opened, 1);
  await t.parts.get("dusk-qt-fair").cb();   // 다른 토글을 눌러도 이름 갱신은 장기 기억 버튼을 다시 만들지 않는다
  assert.equal(t.calls.filter((c) => c.id === "dusk-qt-memory").length, 1);
  assert.equal(t.parts.get("dusk-qt-memory").name, "장기 기억");
  await menu.setOn(false); assert.equal(t.parts.size, 0, "빠른 설정을 숨기면 바로가기도 함께 숨긴다");
});

// 2.2.22 버그리포트: 시작(show)과 애드온 바로가기 여러 개(addLink)가 겹치면 '떼고 다시 붙이기'가 서로 엉켜 버튼이 사라졌다
test("시작과 바로가기 추가가 겹쳐도 모든 버튼이 남고 순서도 맞음", async () => {
  const reg = new Map(); const order = [];
  const tick = () => new Promise((r) => setTimeout(r, Math.random() * 4));
  const api = { pluginStorage: { getItem: async () => null, setItem: async () => {} },
    registerButton: async (o) => { await tick(); reg.set(o.id, o.name); if (!order.includes(o.id)) order.push(o.id); },
    unregisterUIPart: async (id) => { await tick(); reg.delete(id); const i = order.indexOf(id); if (i >= 0) order.splice(i, 1); } };   // 리스처럼: 새 id는 맨 뒤, 떼면 빠짐
  const { createChatMenu } = await import("../src/data/chatmenu.js");
  const m = createChatMenu(api, { fairPlay: { isOn: () => false, isDiceOn: () => false, set: async () => {}, setDice: async () => {} }, turnInfo: { isDiceShow: () => false, setDiceShow: async () => {} } });
  const started = m.start();
  await new Promise((r) => setTimeout(r, 6));   // 본체가 버튼을 등록하는 도중에 애드온이 끼어든다
  const links = [];
  for (const k of ["dusk", "memory", "regress", "diary"]) links.push(await m.addLink({ id: `dusk-qt-${k}`, key: k, title: k, open: () => {} }));
  await started; await new Promise((r) => setTimeout(r, 50));
  for (const k of ["dusk", "memory", "regress", "diary", "fair", "dice", "show"]) assert.ok(reg.has(`dusk-qt-${k}`), `${k} 버튼 남음`);
  assert.deepEqual(order.slice(0, 4), ["dusk-qt-dusk", "dusk-qt-memory", "dusk-qt-regress", "dusk-qt-diary"], "바로가기가 맨 위, 추가한 순서");
});
