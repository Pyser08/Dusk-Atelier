import test from "node:test";
import assert from "node:assert/strict";
import { firstRunFeatures, potInstalled, wizardSummary, WIZARD } from "../src/engine/firstrun.js";
import { levelOf, applyLevel, levelPatch } from "../src/engine/trackpreset.js";

test("처음 켜기: 켜진 기능이 없으면 ‘기본’으로 맞춘다", () => {
  const off = applyLevel(levelPatch("basic"), "basic"); for (const k of Object.keys(off)) off[k] = { ...off[k], enabled: false };
  assert.equal(levelOf(firstRunFeatures(off)), "basic");
  assert.equal(levelOf(firstRunFeatures(undefined)), "basic");
});
test("처음 켜기: 이미 정한 설정은 그대로", () => {
  const f = applyLevel(levelPatch("basic"), "light"); assert.equal(firstRunFeatures(f), f);
});
test("리수폿 동시 설치 감지", () => {
  assert.equal(potInstalled([{ name: "risupot", enabled: true }]), true);
  assert.equal(potInstalled([{ name: "RisuPot", enabled: false }]), false);
  assert.equal(potInstalled([{ name: "DuskAtelier" }]), false);
  assert.equal(potInstalled(null), false);
});
test("마법사 3단계와 요약", () => {
  assert.equal(WIZARD.length, 3);
  assert.equal(wizardSummary({ easyKind: "risuai", level: "basic", mode: "fast" }), "리스 보조 모델 · 기본 · 빠르게");
  assert.equal(wizardSummary({ easyKind: "api", level: "full", mode: "accurate" }), "내 API · 전부 · 더 정확하게");
});

import { GUIDE, GUIDE_ORDER } from "../src/engine/memoryguide.js";
test("가이드: 모든 주제에 제목과 단계가 있다", () => {
  for (const k of GUIDE_ORDER) { assert.ok(GUIDE[k].title); assert.ok(GUIDE[k].steps.length >= 3); }
  assert.equal(GUIDE.home.again, true);
});
