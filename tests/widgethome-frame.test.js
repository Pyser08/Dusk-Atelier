// 위젯 홈이 리스 화면에서 자기 iframe을 찾는 표식(srcdoc 안 글자)이 코어 번들에 실제로 들어 있어야 한다.
// 2.0.0에서 위젯 홈이 애드온으로 빠지며 'dusk-widgethome-open'이 코어에서 사라져 홈 자리 배치가 멈췄다(리스바드 제보).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("코어 번들에 위젯 홈 iframe 찾기 표식이 있고, home-layout이 그 표식으로 찾는다", () => {
  const core = fs.readFileSync("dusk_atelier.js", "utf8"), layout = fs.readFileSync("src/widgethome/lib/home-layout.cjs", "utf8");
  const marks = [...layout.matchAll(/iframe\[srcdoc\*="([^"]+)"\]/g)].map((m) => m[1]);
  assert.ok(marks.some((m) => core.includes(m)), `코어에 없는 표식: ${marks.join(", ")}`);
});
