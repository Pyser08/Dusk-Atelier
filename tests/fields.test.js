import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("값 칸(fields.js)은 슬라이더·숫자 입력·선택·스위치 칸을 내보내고, 스타일이 styles.js에 있다", () => {
  const src = fs.readFileSync(new URL("../src/ui/fields.js", import.meta.url), "utf8");
  for (const n of ["sliderField", "selectField", "controlField", "toggleField"]) assert.ok(src.includes(`export function ${n}`), n);
  const css = fs.readFileSync(new URL("../src/ui/styles.js", import.meta.url), "utf8");
  for (const c of [".rb-fld{", ".rb-fld.row{", ".rb-range{", ".rb-range::-webkit-slider-thumb", ".rb-range::-moz-range-thumb"]) assert.ok(css.includes(c), c);
});
test("Erosync 설정 카드는 브라우저 기본 모양 입력(class 없는 input/select)을 쓰지 않는다", () => {
  const dir = new URL("../src/ui/screens/memory/", import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => /^erosync.*\.js$/.test(x))) {
    const t = fs.readFileSync(new URL(f, dir), "utf8");
    for (const m of t.matchAll(/h\("(input|select|textarea)", \{([^}]*)/g)) assert.ok(/rb-input|rb-range/.test(m[2]), `${f}: ${m[0].slice(0, 80)}`);
  }
});
