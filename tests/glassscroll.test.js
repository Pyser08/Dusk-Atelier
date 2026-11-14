// 스크롤 영역 안의 카드에 backdrop-filter가 걸리면 Chromium에서 스크롤 중 화면 전체가 깜빡임
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLASS_CSS } from "../src/ui/glasscss.js";
import { HOMEGRID_CSS } from "../src/ui/screens/homegridcss.js";

const rule = (css, sel) => {
  const i = css.indexOf(sel + "{");
  assert.ok(i >= 0, sel + " 규칙 없음");
  return css.slice(i, css.indexOf("}", i));
};
test("스크롤 안 카드는 배경 블러를 쓰지 않음", () => {
  for (const sel of [".rb-skin-glass .rb-card", ".rb-gcard"]) assert.doesNotMatch(rule(GLASS_CSS, sel), /backdrop-filter:var\(--rb-glass-blur/);
  assert.doesNotMatch(HOMEGRID_CSS, /backdrop-filter:var\(--rb-glass-blur/);
});
