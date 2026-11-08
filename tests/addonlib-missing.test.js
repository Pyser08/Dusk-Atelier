// 애드온이 코어 공용 모듈의 함수를 받을 때, 예전 코어에 그 함수가 없으면 'f0 is not a function' 대신
// '본체를 업데이트해 주세요'로 켜기를 멈춰야 한다(2.0.0 제보: 지난 대화 분석에서 f0 is not a function — 코어에 currentState 없음).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("애드온 번들은 코어 모듈에 필요한 이름이 없으면 업데이트 안내로 멈춘다", () => {
  const code = fs.readFileSync("addons/dist/memory.js", "utf8");
  assert.match(code, /currentState/);
  assert.match(code, /업데이트해 주세요/);
  assert.match(code, /없는 기능/, "빠진 이름을 확인하는 문구");
});
