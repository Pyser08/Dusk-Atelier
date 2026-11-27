import { test } from "node:test";
import assert from "node:assert/strict";
import { listen, runOffs, removeWith } from "../src/data/domlisten.js";
import { createCardOverlay } from "../src/data/cardoverlay.js";

const fakeEl = (log, name) => {
  let n = 0; const on = new Map();
  return { on, async addEventListener(t, f) { const id = `${name}${++n}`; on.set(id, f); return id; }, async removeEventListener(t, id) { on.delete(id); log.push(`off ${id}`); }, async remove() { log.push(`rm ${name}`); } };
};

test("listen/removeWith: detaches every listener before removing (신고 #31)", async () => {
  const log = [], el = fakeEl(log, "b"), offs = [];
  await listen(el, "click", () => {}, offs); await listen(el, "pointerup", () => {}, offs);
  assert.equal(el.on.size, 2);
  await removeWith(el, offs);
  assert.equal(el.on.size, 0); assert.equal(log.at(-1), "rm b"); assert.equal(offs.length, 0);
  await runOffs(offs);
});

test("card overlay: vanished name spans lose their listeners", async () => {
  const els = new Map(); let present = new Set();
  const mk = (k) => { const e = fakeEl([], k); e.attrs = {}; e.setAttribute = async (a, v) => { e.attrs[a] = v; if (a === "x-dusk-hk") present.add(v); }; return e; };
  const span = mk("s");
  const d = {
    querySelectorAll: async (q) => (q.includes(":not") && !span.attrs["x-dusk-hk"] ? [span] : []),
    querySelector: async (q) => { const m = q.match(/x-dusk-hk="(h\d+)"/); return m && present.has(m[1]) ? span : null; }
  };
  const ov = createCardOverlay({ ensureDoc: async () => d, cardOf: async () => "", pids: () => ["p1"] });
  assert.equal(await ov.hook(), 1);
  assert.equal(span.on.size, 2);
  present.clear();          // 리스가 메시지를 다시 그려 span이 사라짐
  await ov.hook();
  assert.equal(span.on.size, 0);
  ov.stop();
});
