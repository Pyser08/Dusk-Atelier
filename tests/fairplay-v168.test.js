import test from "node:test";
import assert from "node:assert/strict";
import { insertFairness, FAIR_MARK } from "../src/engine/fairplay.js";
import { createFairPlay, FAIR_KEY } from "../src/data/fairplay.js";

test("맨 앞 시스템 메시지들 뒤에 한 번만 넣고 원본은 그대로", () => {
  const m = [{ role: "system", content: "S1" }, { role: "system", content: "S2" }, { role: "user", content: "hi" }];
  const a = insertFairness(m);
  assert.equal(a.length, 4); assert.ok(a[2].content.startsWith(FAIR_MARK)); assert.equal(m.length, 3);
  assert.equal(insertFairness(a).length, 4);
});
test("훅: 기본 꺼짐 → 켜면 삽입, 모델 요청이 아니면 통과", async () => {
  const store = new Map(); let hooks = 0;
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, addRisuReplacer: async () => { hooks++; } };
  const f = createFairPlay(api); const m = [{ role: "user", content: "x" }];
  assert.equal(await f.start(), false); assert.equal(await f.beforeRequest(m, "model"), m); assert.equal(hooks, 0);
  await f.set(true); await f.set(false); await f.set(true);
  assert.equal(hooks, 1); assert.equal(store.get(FAIR_KEY), "on");
  assert.equal((await f.beforeRequest(m, "model")).length, 2); assert.equal(await f.beforeRequest(m, "memory"), m);
});

import { rollDice, makeDice, looksLikeAction, buildFairText, FAIR_TEXT } from "../src/engine/fairplay.js";
import { DICE_KEY, DICE_MODE_KEY } from "../src/data/fairplay.js";

test("주사위: 1~100 값 3개, 시드 가능", () => {
  const r = rollDice(3, () => 0); assert.deepEqual(r, [1, 1, 1]);
  assert.deepEqual(rollDice(3, () => 0.999999), [100, 100, 100]);
  const x = rollDice(); assert.equal(x.length, 3); assert.ok(x.every((n) => n >= 1 && n <= 100));
});
test("행동 낱말 감지(보조 힌트)", () => {
  assert.ok(looksLikeAction("나는 경비병을 설득해 본다")); assert.ok(looksLikeAction("I try to sneak past"));
  assert.ok(!looksLikeAction("안녕, 오늘 날씨 좋다"));
});
test("주사위 꺼짐이면 기존 지침 그대로, 켜짐이면 굴림값·모드 규칙 포함", () => {
  assert.equal(buildFairText(null), FAIR_TEXT);
  const d = { rolls: [7, 55, 98], mode: "reinterpret", hint: true };
  const t = buildFairText(d);
  assert.ok(t.includes("7, 55, 98")); assert.ok(t.includes("only an attempt")); assert.ok(t.includes("likely contains an action"));
  assert.ok(!t.includes("honor it.")); assert.ok(t.includes("chain breaks"));
  assert.ok(buildFairText({ ...d, mode: "respect", hint: false }).includes("honor it and do not roll"));
  assert.ok(!buildFairText({ ...d, hint: false }).includes("likely contains an action"));
});
test("훅: 주사위 켜면 요청마다 굴려 넣고 한 번만 삽입, 공정한 전개가 꺼지면 아무것도 안 함", async () => {
  const store = new Map(); let n = 0;
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, addRisuReplacer: async () => {} };
  const f = createFairPlay(api, { rng: () => (n++ % 100) / 100 });
  const m = [{ role: "system", content: "S" }, { role: "user", content: "그를 협박한다" }];
  await f.start(); await f.setDice(true); assert.equal(await f.beforeRequest(m, "model"), m);
  await f.set(true);
  const a = await f.beforeRequest(m, "model"), b = await f.beforeRequest(a, "model");
  assert.equal(a.length, 3); assert.equal(b.length, 3); assert.ok(a[1].content.includes("Dice")); assert.notEqual(a[1].content, b[1].content);
  assert.ok(a[1].content.includes("likely contains an action"));
  await f.setDiceMode("respect"); assert.equal(store.get(DICE_MODE_KEY), "respect"); assert.ok((await f.beforeRequest(m, "model"))[1].content.includes("do not roll"));
  await f.setDice(false); assert.equal(store.get(DICE_KEY), "off"); assert.ok(!(await f.beforeRequest(m, "model"))[1].content.includes("Dice"));
});
