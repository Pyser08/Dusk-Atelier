import test from "node:test";
import assert from "node:assert/strict";
import { createStopButton } from "../src/ui/stopbutton.js";

function fakeDoc() {
  const log = [];
  const el = (n) => ({ n, setAttribute: async () => {}, setStyleAttribute: async () => {}, setInnerHTML: async () => {}, addEventListener: (t, f) => { el.click = f; }, remove: async () => { log.push("remove"); }, appendChild: async () => { log.push("append"); } });
  return { log, doc: { querySelector: async () => el("body"), createElement: async () => el("div") }, el };
}
test("활동 중이면 버튼을 띄우고, 끝나면 지운다. 누르면 중지 콜백", async () => {
  const f = fakeDoc(); let stopped = 0;
  const b = createStopButton(() => f.doc, () => { stopped++; });
  await b.set(true); assert.equal(b.shown(), true);
  await b.set(true); assert.equal(f.log.filter((x) => x === "append").length, 1, "두 번 띄우지 않아요");
  f.el.click(); assert.equal(stopped, 1);
  await b.set(false); assert.equal(b.shown(), false); assert.ok(f.log.includes("remove"));
});
test("메인 화면을 못 쓰면 조용히 넘어간다", async () => {
  const b = createStopButton(() => null, () => {});
  await b.set(true); assert.equal(b.shown(), false);
});
