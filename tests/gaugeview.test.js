import test from "node:test";
import assert from "node:assert/strict";
import { gaugeBoxHtml } from "../src/engine/gaugeview.js";
import { normalizeDef } from "../src/engine/gauge.js";

test("게이지 박스: 이름 이스케이프, 모양별 렌더, 정의 없는 항목 무시, 인라인 style만", () => {
  const defs = ["orb", "bar", "ring", "ticks"].map((shape, i) => normalizeDef({ name: "<b>g" + i, look: { shape, hue: i * 80 }, on: true }));
  const snap = defs.map((d) => ({ g: d.id, who: "아리<x>", v: 4 })).concat([{ g: "zz", who: "x", v: 1 }]);
  const html = gaugeBoxHtml({ snap, items: [{ g: defs[0].id, who: "아리<x>", from: 3, to: 4, why: "도와줌" }] }, defs);
  assert.ok(html.includes('x-dusk="gauge"'));
  assert.ok(!html.includes("<b>g0") && !html.includes("아리<x>") && !/<style|<script/.test(html));
  assert.ok(html.includes("conic-gradient") && html.includes("▲"));
  assert.equal(gaugeBoxHtml({ snap: [] }, defs), "");
});
