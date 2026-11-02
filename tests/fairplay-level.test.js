import test from "node:test";
import assert from "node:assert/strict";
import { DICE_LEVELS, DICE_LEVEL_IDS, DEFAULT_CUTS, normalizeCuts, normalizeCount, resolveDice, makeDice, diceRules, buildFairText } from "../src/engine/fairplay.js";
import { createFairPlay, DICE_LEVEL_KEY, DICE_CUTS_KEY, DICE_COUNT_KEY, loadDiceLevel } from "../src/data/fairplay.js";

const mem = () => { const store = new Map(); return { store, api: { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, addRisuReplacer: async () => {} } }; };

test("강도 3단계: 보통은 예전 값(20·50·75·95) 그대로, 약하게<보통<강하게", () => {
  assert.deepEqual(DICE_LEVEL_IDS, ["weak", "normal", "strong"]);
  assert.deepEqual(DICE_LEVELS.normal, { easy: 20, normal: 50, hard: 75, extreme: 95 });
  assert.deepEqual(DEFAULT_CUTS, DICE_LEVELS.normal);
  for (const k of ["easy", "normal", "hard", "extreme"]) { assert.ok(DICE_LEVELS.weak[k] < DICE_LEVELS.normal[k]); assert.ok(DICE_LEVELS.normal[k] < DICE_LEVELS.strong[k]); }
});
test("직접 입력 정리: 정수 1~100, 오름차순 아니면 되돌림, 숫자 아니면 기본값", () => {
  assert.deepEqual(normalizeCuts({ easy: "10", normal: 40.6, hard: 70, extreme: 120 }), { easy: 10, normal: 41, hard: 70, extreme: 100 });
  assert.deepEqual(normalizeCuts({ easy: 60, normal: 30, hard: 70, extreme: 90 }), DEFAULT_CUTS);
  assert.deepEqual(normalizeCuts({ easy: "a" }), DEFAULT_CUTS);
  assert.deepEqual(normalizeCuts(null), DEFAULT_CUTS);
  assert.equal(normalizeCount(5), 5); assert.equal(normalizeCount(0), 1); assert.equal(normalizeCount(99), 6); assert.equal(normalizeCount("x"), 3);
});
test("resolveDice: 프리셋은 개수 3, custom은 저장한 수치·개수", () => {
  assert.deepEqual(resolveDice("strong"), { cuts: DICE_LEVELS.strong, count: 3 });
  assert.deepEqual(resolveDice("weird"), { cuts: DICE_LEVELS.normal, count: 3 });
  assert.deepEqual(resolveDice("custom", { easy: 5, normal: 30, hard: 60, extreme: 90 }, 4), { cuts: { easy: 5, normal: 30, hard: 60, extreme: 90 }, count: 4 });
});
test("지침에 난이도 수치와 굴림 개수가 들어가고, 기본은 예전 문장 그대로", () => {
  const d = makeDice([{ role: "user", content: "x" }], "reinterpret", () => 0, { cuts: DICE_LEVELS.strong, count: 5 });
  assert.equal(d.rolls.length, 5); assert.deepEqual(d.cuts, DICE_LEVELS.strong);
  const t = diceRules(d); assert.ok(t.includes("easy 30, normal 60, hard 85, extreme 98"));
  assert.ok(buildFairText({ rolls: [1, 2, 3], mode: "respect", hint: false }).includes("easy 20, normal 50, hard 75, extreme 95"));
});
test("훅: 강도·직접 수치 저장, 요청에 반영, 기본 보통", async () => {
  const { store, api } = mem(); let n = 0;
  const f = createFairPlay(api, { rng: () => (n++ % 100) / 100 });
  const m = [{ role: "system", content: "S" }, { role: "user", content: "그를 협박한다" }];
  await f.start(); await f.set(true); await f.setDice(true);
  assert.equal(f.diceLevel(), "normal");
  assert.ok((await f.beforeRequest(m, "model"))[1].content.includes("easy 20, normal 50, hard 75, extreme 95"));
  await f.setDiceLevel("strong"); assert.equal(store.get(DICE_LEVEL_KEY), "strong");
  assert.ok((await f.beforeRequest(m, "model"))[1].content.includes("easy 30, normal 60, hard 85, extreme 98"));
  await f.setDiceCustom({ easy: 10, normal: 40, hard: 65, extreme: 90 }, 4);
  assert.equal(f.diceLevel(), "custom"); assert.equal(store.get(DICE_LEVEL_KEY), "custom"); assert.equal(store.get(DICE_COUNT_KEY), "4");
  assert.deepEqual(JSON.parse(store.get(DICE_CUTS_KEY)), { easy: 10, normal: 40, hard: 65, extreme: 90 });
  const r4 = await f.beforeRequest(m, "model"); assert.ok(r4[1].content.includes("easy 10, normal 40, hard 65, extreme 90")); assert.ok(/Dice \(1-100\), use in order: \d+, \d+, \d+, \d+(\n|$)/.test(r4[2].content));
  const g = createFairPlay(api); await g.start(); assert.equal(g.diceLevel(), "custom"); assert.equal(await loadDiceLevel(api), "custom");
});
