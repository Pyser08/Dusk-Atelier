import test from "node:test";
import assert from "node:assert/strict";
import { splitBlock, applyLore, loreView, editLine, hideLine, resetLine, addNote, editNote, deleteNote, resetLore, hasLoreEdits, dropStale, NOTES_TITLE } from "../src/engine/memorylore.js";

const RAW = `[Dusk Memory — story so far. Treat as established.]
Story so far:
- A met B at the gate.
- B lied about the key.
Characters (current state):
- A: wary
Current scene: night, rain`;

test("splitBlock: 섹션·줄 분리", () => {
  const s = splitBlock(RAW);
  assert.equal(s.length, 2);
  assert.equal(s[0].lines.length, 2);
  assert.equal(s[1].lines.length, 2);
});
test("applyLore: 수정 없으면 그대로", () => {
  assert.equal(applyLore(RAW, null), RAW);
  assert.equal(applyLore(RAW, { v: 1, edit: {}, hide: {}, add: [] }), RAW);
});
test("수정·숨김·메모 적용", () => {
  const f = {}; const v = loreView(RAW, null), [l1, l2] = v.sections[0].lines;
  editLine(f, l1.key, l1.orig, "A met B at the bridge.");
  hideLine(f, l2.key, l2.orig, true);
  const id = addNote(f, "둘은 비밀 연인이다");
  const out = applyLore(RAW, f.lore);
  assert.match(out, /at the bridge/); assert.doesNotMatch(out, /lied about/);
  assert.match(out, new RegExp(NOTES_TITLE.slice(0, 20))); assert.match(out, /비밀 연인/);
  editNote(f, id, { on: false });
  assert.doesNotMatch(applyLore(RAW, f.lore), /비밀 연인/);
  assert.ok(hasLoreEdits(f));
  resetLine(f, l1.key); deleteNote(f, id); hideLine(f, l2.key, l2.orig, false);
  assert.equal(applyLore(RAW, f.lore), RAW);
});
test("원문이 바뀌면 stale로 분리", () => {
  const f = {}; const l = loreView(RAW, null).sections[0].lines[0];
  editLine(f, l.key, l.orig, "changed");
  const v = loreView(RAW.replace("A met B at the gate.", "A met B elsewhere."), f.lore);
  assert.equal(v.stale.length, 1);
  dropStale(f, v.stale[0].key); assert.equal(loreView(RAW, f.lore).stale.length, 0);
  resetLore(f); assert.ok(!hasLoreEdits(f));
});
