import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const out = await build({ entryPoints: ["src/engine/tideplan.js"], bundle: true, format: "esm", write: false });
const { safeDiff } = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
const join = (p, op) => p.filter((x) => x.op === "same" || x.op === op).map((x) => x.text).join("");
test("작은 글은 양쪽을 그대로 되살린다", () => {
  const r = safeDiff("가 나 다", "가 라 다");
  assert.equal(join(r.parts, "del"), "가 나 다"); assert.equal(join(r.parts, "add"), "가 라 다"); assert.equal(r.cut, false);
});
test("아주 큰 글도 조각 수와 시간이 작다", () => {
  const a = "<p>안녕, 줄.</p>\n".repeat(500000);
  for (const b of ["x" + a + "y", a.replace("안녕", "반가워"), a.replaceAll("안녕", "하이")]) {
    const t = Date.now(), r = safeDiff(a, b);
    assert.ok(r.cut); assert.ok(r.parts.length < 20000); assert.ok(Date.now() - t < 3000);
    assert.ok(r.parts.reduce((n, p) => n + p.text.length, 0) < 60000);
  }
});
