import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 문서가 없는 인물의 '상세 정보'는 목차(140px 칸)가 없어서, 넓은 화면의 2칸 배치에 들어가면 카드가 140px로 좁아졌다.
const css = readFileSync(new URL("../src/ui/styles.js", import.meta.url), "utf8");
const src = readFileSync(new URL("../src/ui/screens/memory/infotab.js", import.meta.url), "utf8");

test("문서 없는 상세 정보 뿌리에 단독 표시 클래스가 붙는다", () => {
  assert.match(src, /if \(!doc\) return h\("div", \{ class: "rb-wk3 rb-wk3-solo" \}/);
});
test("단독 표시는 넓은 화면의 2칸 배치를 덮어쓴다", () => {
  const q = css.indexOf("@container wk2 (min-width:760px){.rb-wk3{display:grid");
  const o = css.indexOf(".rb-wk3.rb-wk3-solo{display:block");
  assert.ok(q > 0 && o > q, "덮어쓰기 규칙이 컨테이너 규칙 뒤에 있어야 한다");
  assert.match(css, /\.rb-wk3-solo \.rb-wk3-grid\{column-count:1/);
});
