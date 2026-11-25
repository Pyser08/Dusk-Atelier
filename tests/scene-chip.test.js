import test from "node:test";
import assert from "node:assert/strict";
import { scenePanelHtml } from "../src/engine/scenepanel.js";
test("등장인물 상태창은 알약 칸 밖에 펼쳐진다", () => {
  const h = scenePanelHtml({ force: true, people: [{ name: "유리", card: "<b>카드</b>" }] });
  const d = h.slice(h.indexOf('<details x-dusk="pc"'));
  assert.match(d, /<summary[^>]*border-radius:999px[^>]*>/);
  assert.doesNotMatch(h, /border-radius:999px[^>]*>(?:<span[^>]*>.<\/span>)?<details x-dusk="pc"/);
  assert.match(scenePanelHtml({ force: true, people: [{ name: "유리", card: "C", id: "d1" }] }), /<summary data-pid="d1" class="dusk-pid-d1"/);
});
