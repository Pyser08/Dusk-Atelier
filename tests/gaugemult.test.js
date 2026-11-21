import test from "node:test";
import assert from "node:assert/strict";
// 2.2.26: 이성적 호감(attraction)은 따로 — 장기 기억 설정에서 인간적 호감·그 밖의 감정 / 이성적 호감 배수를 나눔
test("이성적 호감 배수는 따로, 나머지는 원래 배수", async () => {
  const { scaleDelta, normalizeGauge, isDefaultGauge } = await import("../src/engine/gaugemult.js");
  const g = normalizeGauge({ up: 1, down: 1, romUp: 0, romDown: 2 });
  assert.equal(scaleDelta(2, g, { tag: "attraction" }), 0, "이성적 호감 오를 때 ×0");
  assert.equal(scaleDelta(-1, g, { tag: "attraction" }), -2, "이성적 호감 내릴 때 ×2");
  assert.equal(scaleDelta(2, g, { tag: "affection" }), 2, "인간적 호감은 원래 배수");
  assert.equal(scaleDelta(2, g), 2, "태그 없으면 원래 배수(위키 호감도·성격 막대)");
  assert.deepEqual(normalizeGauge({ up: 2 }), { up: 2, down: 1, romUp: 2, romDown: 1, negUp: 2, negDown: 1, lust: 1 }, "예전 저장값: 이성적 호감은 오를 때·내릴 때를 따라감(업데이트로 속도가 안 바뀌게)");
  assert.equal(isDefaultGauge({ romUp: 1.5 }), false);
});

// 2.2.27: 부정적 감정(적대감·두려움) 배수도 따로
test("부정적 감정 배수는 따로, 따로 정하기 전엔 오를 때·내릴 때를 따라감", async () => {
  const { scaleDelta, normalizeGauge } = await import("../src/engine/gaugemult.js");
  const g = normalizeGauge({ negUp: 0, negDown: 3 });
  assert.equal(scaleDelta(2, g, { tag: "hostility" }), 0); assert.equal(scaleDelta(-1, g, { tag: "fear" }), -3);
  assert.equal(scaleDelta(2, g, { tag: "trust" }), 2, "다른 감정은 원래 배수"); assert.equal(scaleDelta(2, g, { tag: "attraction" }), 2);
  const old = normalizeGauge({ up: 2, down: 0.5 }); assert.equal(old.negUp, 2); assert.equal(old.negDown, 0.5);
});
