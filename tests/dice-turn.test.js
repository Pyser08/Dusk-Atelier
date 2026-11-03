import test from "node:test";
import assert from "node:assert/strict";
import { parseRollMarks, buildFairText, diceRollText, makeDice } from "../src/engine/fairplay.js";
import { createFairPlay, loadDiceLog } from "../src/data/fairplay.js";
import { createTurnInfo } from "../src/data/turninfo.js";
import { diceHtml } from "../src/engine/turninfo.js";

const memApi = (extra = {}) => { const store = new Map(); return { store, api: { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, addRisuReplacer: async () => {}, addRisuScriptHandler: async () => {}, getDatabase: async () => ({}), ...extra } }; };
const diceMsg = (out) => out.find((m) => String(m.content).startsWith("[Dusk Dice]"))?.content ?? "";

test("⑤ 판정 표식: 고정 규칙에 남기는 법, 응답에서 읽기(여러 개·잘못된 줄 무시)", () => {
  assert.ok(buildFairText({ rolls: [1], mode: "reinterpret" }).includes("<!-- dusk-roll:"));
  const t = "본문…\n<!-- dusk-roll: 경비병 설득 | hard | 62 | fail -->\n<!-- dusk-roll: 담 넘기 | normal | 80 | success -->\n<!-- dusk-roll: 이상한 줄 -->";
  assert.deepEqual(parseRollMarks(t), [{ act: "경비병 설득", diff: "hard", roll: 62, result: "fail" }, { act: "담 넘기", diff: "normal", roll: 80, result: "success" }]);
  assert.deepEqual(parseRollMarks("표식 없음"), []);
});
test("⑤ 지난 턴 판정을 이번 주사위 메시지에 짧게 알려 준다(고정 지침은 그대로)", () => {
  const m = [{ role: "assistant", content: "응답 <!-- dusk-roll: 설득 | hard | 62 | fail -->" }, { role: "user", content: "다시 설득한다" }];
  const d = makeDice(m, "reinterpret", () => 0.5);
  assert.deepEqual(d.prev, [{ act: "설득", diff: "hard", roll: 62, result: "fail" }]);
  const t = diceRollText(d); assert.ok(t.includes("Last turn") && t.includes("설득") && t.includes("fail"));
  assert.ok(!diceRollText({ rolls: [1], hint: false }).includes("Last turn"));
});
test("① 같은 턴 다시 생성(리롤)이면 같은 주사위 값, 새 입력이면 새로 굴림, 기록은 한 번만", async () => {
  const { api } = memApi(); let n = 0;
  const f = createFairPlay(api, { rng: () => ((n += 17) % 100) / 100, saveMs: 0 }); await f.start(); await f.set(true); await f.setDice(true);
  const base = [{ role: "system", content: "S" }, { role: "assistant", content: "A1" }, { role: "user", content: "문을 연다" }];
  const a = diceMsg(await f.beforeRequest(base, "model")), b = diceMsg(await f.beforeRequest(base, "model"));
  assert.equal(a, b, "리롤은 같은 값");
  const c = diceMsg(await f.beforeRequest([...base, { role: "assistant", content: "A2" }, { role: "user", content: "달린다" }], "model"));
  assert.notEqual(a, c);
  await f.flushLog(); assert.equal((await loadDiceLog(api)).length, 2);
});
test("② 캐시 깨짐 알림: 앞부분이 절반도 안 같으면 알림(호출 표시를 꺼도), 기본 켜짐·끌 수 있음", async () => {
  const { api } = memApi(); const alerts = [];
  const t = createTurnInfo(api, { chip: false, onCacheAlert: (p) => alerts.push(p) }); await t.start();
  const long = (s) => s.repeat(3000);
  await t.beforeRequest([{ role: "system", content: long("가") }, { role: "user", content: "a" }], "model");
  await t.beforeRequest([{ role: "system", content: long("가") }, { role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }], "model");
  assert.equal(alerts.length, 0);
  await t.beforeRequest([{ role: "system", content: long("나") }, { role: "user", content: "a" }], "model");
  assert.equal(alerts.length, 1); assert.ok(alerts[0].ratio < 0.5);
  await t.setCacheAlert(false);
  await t.beforeRequest([{ role: "system", content: long("다") }, { role: "user", content: "a" }], "model");
  assert.equal(alerts.length, 1);
});
test("주사위 결과 표시: 응답에 판정 표식이 있으면 실제 행동·난이도·판정을 보여 준다", () => {
  const html = diceHtml({ dice: { rolls: [62, 80, 5], cuts: { easy: 20, normal: 50, hard: 75, extreme: 95 } } }, [{ act: "설득", diff: "hard", roll: 62, result: "fail" }]);
  assert.ok(html.includes("설득") && html.includes("어려움") && html.includes("75"));
});
