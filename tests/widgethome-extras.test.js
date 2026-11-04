import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { parseDice, rollDice, daysUntil, ddayLabel, normalizeDdays, fmtClock, catalogStats } from "../src/widgethome/extras.js";
const L = createRequire(import.meta.url)("../src/widgethome/lib/widget-layout.cjs");

test("주사위 식", () => {
  assert.deepEqual(parseDice("2d6+1"), { n: 2, sides: 6, mod: 1 });
  assert.deepEqual(parseDice("d20"), { n: 1, sides: 20, mod: 0 });
  assert.deepEqual(parseDice("3d8 - 2"), { n: 3, sides: 8, mod: -2 });
  assert.equal(parseDice("abc"), null);
  assert.equal(parseDice("99d6").n, 20);
  const r = rollDice({ n: 2, sides: 6, mod: 1 }, () => 0.999);
  assert.deepEqual(r, { rolls: [6, 6], total: 13 });
});
test("D-day 계산과 표시", () => {
  const now = new Date(2026, 10, 4, 15).getTime();
  assert.equal(daysUntil("2026-11-04", now), 0);
  assert.equal(daysUntil("2026-11-14", now), 10);
  assert.equal(daysUntil("2026-11-01", now), -3);
  assert.equal(daysUntil("bad", now), null);
  assert.deepEqual([0, 10, -3].map(ddayLabel), ["D-day", "D-10", "D+3"]);
  assert.equal(normalizeDdays([{ title: "a", date: "2026-01-01" }, { title: 1, date: "x" }, null]).length, 1);
});
test("시간 표시", () => { assert.equal(fmtClock(65000), "01:05"); assert.equal(fmtClock(3723000), "1:02:03"); });
test("한눈에 통계", () => {
  const now = new Date(2026, 10, 4, 15).getTime(), day = 86400000;
  const model = { status: "ready", counts: { characters: 7 }, recent: [{ name: "A", charId: "a", time: now - 1000 }, { name: "A", charId: "a", time: now - 2000 }, { name: "B", charId: "b", time: now - 3 * day }, { name: "C", charId: "c", time: now - 30 * day }] };
  const s = catalogStats(model, [now, now - day, now - 2 * day, now - 4 * day], now);
  assert.deepEqual(s, { chars: 7, today: 1, week: 3, streak: 3, top: "A" });
});
test("예전 배치(6개)도 살리고 새 위젯은 아래에 붙인다", () => {
  const old = { version: 1, items: { music: { x: 0, y: 0, w: 12, h: 4 }, photo: { x: 0, y: 4, w: 6, h: 6 }, clock: { x: 6, y: 4, w: 3, h: 6 }, recent: { x: 9, y: 4, w: 3, h: 6 }, added: { x: 0, y: 10, w: 6, h: 6 }, memo: { x: 6, y: 10, w: 6, h: 6 } } };
  const n = L.normalize("desktop", old);
  assert.ok(n);
  assert.deepEqual(n.items.music, old.items.music);
  for (const id of ["dusk", "dday", "timer", "dice", "stats"]) assert.ok(n.items[id].y >= 16, id);
  const m = L.metrics(1200, "desktop");
  const fit = L.fit(old, "desktop", m);
  const items = Object.values(fit.items);
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) assert.ok(!L.overlap(items[i], items[j]));
  const def = L.defaults("mobile", L.metrics(390, "mobile"));
  assert.equal(Object.keys(def.items).length, L.IDS.length);
});
