import test from "node:test";
import assert from "node:assert/strict";
import { xifyCss, wireTabs, mirrorName } from "../src/data/cardoverlay.js";

test("2.2.30: 리스는 x- 속성만 → data-·class는 x- 짝, CSS도 x- 선택자 짝", () => {
  assert.equal(mirrorName("data-tab"), "x-tab"); assert.equal(mirrorName("class"), "x-class"); assert.equal(mirrorName("style"), "");
  const css = xifyCss("details[data-dusk=tab]>summary{color:red}.dk-a .b{opacity:.5}@keyframes k{from{opacity:0}}");
  assert.match(css, /div\[x-dusk=tab\]>div\{color:red\}/);
  assert.match(css, /\[x-class~="dk-a"\] \[x-class~="b"\]\{opacity:\.5\}/);
  assert.ok(!/x-class~="5"/.test(css), "값 안 소수점은 그대로");
});

test("2.2.30: 탭(div)은 누르면 그 탭만 보이고 강조", async () => {
  const mk = () => { const e = { style: "", on: null, setStyleAttribute: async (s) => { e.style = s; }, addEventListener: async (_, f) => { e.on = f; } }; return e; };
  const tabs = ["g", "n"].map((k, i) => ({ group: "x", kind: k, open: i === 0, sumStyle: "a:1", panelStyle: "b:1", sum: mk(), panel: mk() }));
  await wireTabs(tabs);
  assert.match(tabs[0].panel.style, /display:block/); assert.match(tabs[1].panel.style, /display:none/);
  tabs[1].sum.on(); await new Promise((r) => setTimeout(r, 10));
  assert.match(tabs[1].panel.style, /display:block/); assert.match(tabs[0].panel.style, /display:none/);
  assert.match(tabs[1].sum.style, /e8578e/, "NSFW 탭은 분홍");
});
