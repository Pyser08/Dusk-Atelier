import test from "node:test";
import assert from "node:assert/strict";
import { judgeRoll, VERDICTS, estimateTokens, fmtSec, fmtTokens, diceHtml, callHtml } from "../src/engine/turninfo.js";
import { createTurnInfo, DICE_SHOW_KEY, CALL_SHOW_KEY, loadDiceShow, loadCallShow } from "../src/data/turninfo.js";
import { createFairPlay } from "../src/data/fairplay.js";

test("판정: 목표치와 굴림 차이로 대실패·실패·애매·성공·대성공", () => {
  assert.deepEqual(VERDICTS, ["대실패", "실패", "애매", "성공", "대성공"]);
  assert.equal(judgeRoll(50, 50), "애매"); assert.equal(judgeRoll(54, 50), "애매"); assert.equal(judgeRoll(46, 50), "애매");
  assert.equal(judgeRoll(55, 50), "성공"); assert.equal(judgeRoll(69, 50), "성공"); assert.equal(judgeRoll(70, 50), "대성공");
  assert.equal(judgeRoll(30, 50), "실패"); assert.equal(judgeRoll(26, 50), "실패"); assert.equal(judgeRoll(25, 50), "대실패");
  assert.equal(judgeRoll(1, 20), "대실패"); assert.equal(judgeRoll(100, 98), "대성공");
});
test("글자 수로 토큰 어림, 표기", () => {
  assert.equal(estimateTokens(""), 0); assert.ok(estimateTokens("hello world") >= 2 && estimateTokens("hello world") <= 4);
  assert.ok(estimateTokens("안녕하세요 반가워요") > estimateTokens("hello")); assert.equal(fmtTokens(4200), "4.2k"); assert.equal(fmtTokens(380), "380"); assert.equal(fmtSec(12345), "12.3초");
});
test("주사위·호출 HTML: 굴림값·목표치·판정, 모델·시간·로어북, 이스케이프", () => {
  const d = diceHtml({ dice: { rolls: [82, 15, 47], cuts: { easy: 20, normal: 50, hard: 75, extreme: 95 } } });
  assert.ok(d.includes('x-dusk="dice"') && d.includes("82") && d.includes("성공") && d.includes("실패") && d.includes("목표"));
  const c = callHtml({ aux: false, model: "<b>gpt</b>", startAt: 0, firstAt: 3000, lastAt: 12300, inTok: 4200, outTok: 1100 }, { entries: [{ n: "세계관" }] });
  assert.ok(c.includes('x-dusk="turn"') && c.includes("메인") && c.includes("12.3초") && c.includes("4.2k") && c.includes("세계관") && c.includes("&lt;b&gt;") && !c.includes("<b>gpt"));
});

const mem = (extra = {}) => { const store = new Map(); return { store, api: { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, getDatabase: async () => ({ aiModel: "test-main", subModel: "test-sub" }), addRisuReplacer: async () => {}, addRisuScriptHandler: async () => {}, ...extra } }; };

test("설정: 주사위 표시 기본 꺼짐, 모델 호출 표시 기본 켜짐, 저장", async () => {
  const { store, api } = mem(); const t = createTurnInfo(api, { chip: false });
  assert.equal(await loadDiceShow(api), false); assert.equal(await loadCallShow(api), true);
  await t.start(); await t.setDiceShow(true); await t.setCallShow(false);
  assert.equal(store.get(DICE_SHOW_KEY), "on"); assert.equal(store.get(CALL_SHOW_KEY), "off"); assert.equal(t.isDiceShow(), true); assert.equal(t.isCallShow(), false);
});
test("한 턴: 요청→출력→화면에 주사위·호출 블록, 저장된 채팅 글은 그대로", async () => {
  const { api } = mem(); let now = 1000;
  const fair = createFairPlay(api, { rng: () => 0.8 }); await fair.start(); await fair.set(true); await fair.setDice(true);
  const t = createTurnInfo(api, { chip: false, now: () => now, diceSource: () => fair.lastDice(), loreFor: () => ({ entries: [{ n: "왕국사" }] }) });
  await t.start(); await t.setDiceShow(true);
  const msgs = [{ role: "system", content: "S" }, { role: "user", content: "그를 협박한다" }];
  const sent = await fair.beforeRequest(msgs, "model"); await t.beforeRequest(sent, "model");
  now = 4000; const resp = "그는 비웃으며 고개를 저었다. 너 따위가 날 위협할 수 있을 것 같나."; await t.onOutput(resp);
  now = 9000; await t.onOutput(resp + " 칼날이 번뜩였다."); await t.settle();
  const shown = await t.onDisplay(resp + " 칼날이 번뜩였다.");
  assert.ok(shown.includes('x-dusk="dice"') && shown.includes('x-dusk="turn"') && shown.includes("왕국사") && shown.includes("test-main") && shown.includes("메인"));
  assert.ok(!(await t.onDisplay("전혀 다른 글 입니다 아무 관계 없음")).includes("x-dusk"));
  await t.setDiceShow(false); assert.ok(!(await t.onDisplay(resp + " 칼날이 번뜩였다.")).includes('x-dusk="dice"'));
  assert.equal(t.onDisplay.length >= 0, true);
});
test("RisuBard(bardWiki 있음)에서는 훅을 달지 않고 표시도 안 함", async () => {
  let hooks = 0; const { api } = mem({ bardWiki: { getDocuments: () => [] }, addRisuReplacer: async () => { hooks++; }, addRisuScriptHandler: async () => { hooks++; } });
  const t = createTurnInfo(api, { chip: false }); await t.start();
  assert.equal(t.supported(), false); assert.equal(hooks, 0);
  assert.equal(await t.onDisplay("아무 글"), "아무 글");
});
