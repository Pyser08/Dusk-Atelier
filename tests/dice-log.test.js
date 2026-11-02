import test from "node:test";
import assert from "node:assert/strict";
import { diceStats } from "../src/engine/turninfo.js";
import { createFairPlay, loadDiceLog, clearDiceLog, DICE_LOG_KEY } from "../src/data/fairplay.js";

test("판정 통계: 굴림 평균·보통 목표 기준 판정 개수", () => {
  const s = diceStats([{ rolls: [80, 20], cuts: { easy: 20, normal: 50, hard: 75, extreme: 95 } }, { rolls: [50], cuts: { easy: 20, normal: 50, hard: 75, extreme: 95 } }]);
  assert.equal(s.n, 3); assert.equal(s.avg, 50); assert.equal(s.verdicts["대성공"], 1); assert.equal(s.verdicts["애매"], 1); assert.equal(s.verdicts["대실패"], 1);
  assert.equal(diceStats([]).n, 0);
});
test("굴릴 때마다 채팅과 함께 기록(최근 300), 주사위 꺼지면 기록 안 함, 지우기", async () => {
  const store = new Map();
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, addRisuReplacer: async () => {} };
  const f = createFairPlay(api, { rng: () => 0.5, chatOf: async () => ({ chaId: "c1", chatId: "t1", botName: "봇", chatName: "채팅" }), saveMs: 0 });
  await f.start(); await f.set(true);
  const m = [{ role: "user", content: "x" }];
  await f.beforeRequest(m, "model"); await f.flushLog();
  assert.equal((await loadDiceLog(api)).length, 0);
  await f.setDice(true); await f.beforeRequest(m, "model"); await f.beforeRequest(m, "model"); await f.flushLog();
  const log = await loadDiceLog(api); assert.equal(log.length, 2); assert.equal(log[0].chaId, "c1"); assert.equal(log[0].rolls.length, 3); assert.ok(log[0].cuts.normal);
  await clearDiceLog(api); assert.equal((await loadDiceLog(api)).length, 0); assert.ok(store.has(DICE_LOG_KEY));
});
