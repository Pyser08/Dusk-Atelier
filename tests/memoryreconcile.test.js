import test from "node:test";
import assert from "node:assert/strict";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { hashText } from "../src/engine/chattext.js";

const msg = (text, chatId) => ({ role: "char", data: text, chatId });
const rec = (at, text, mid) => ({ id: "r" + at, at, mid, h: hashText(text) });

test("keeps matching anchors", () => {
  const msgs = [msg("hi"), msg("안녕 세계")];
  const f = { people: { a: { records: [rec(1, "안녕 세계")] } }, scenes: [] };
  assert.equal(reconcile(f, msgs), 0);
  assert.equal(f.people.a.records[0].at, 1);
});
test("fixes shifted index after middle deletion", () => {
  const msgs = [msg("두번째 응답")];
  const f = { people: { a: { records: [rec(2, "두번째 응답")] } }, scenes: [] };
  reconcile(f, msgs);
  assert.equal(f.people.a.records[0].at, 0);
  assert.ok(!f.people.a.records[0].orphan);
});
test("reroll makes old record orphan", () => {
  const msgs = [msg("새로 생성된 응답")];
  const f = { people: { a: { records: [rec(0, "이전 응답")] } }, scenes: [], cursor: { at: 0, h: hashText("이전 응답") } };
  assert.equal(reconcile(f, msgs), 1);
  assert.equal(f.people.a.records[0].orphan, true);
  assert.equal(f.cursor, null);
});
test("mid has priority and duplicate/inherited mids are ignored", () => {
  const msgs = [msg("x", "m1"), msg("y", "m2")];
  const f = { people: { a: { records: [rec(0, "y", "m2")] } }, scenes: [] };
  reconcile(f, msgs);
  assert.equal(f.people.a.records[0].at, 1);
  const dup = [msg("p", "d"), msg("q", "d")];
  const g = { people: { a: { records: [rec(1, "q", "d")] } }, scenes: [] };
  reconcile(g, dup);
  assert.equal(g.people.a.records[0].at, 1);
  assert.ok(!g.people.a.records[0].orphan);
});
test("legacy items untouched", () => {
  const f = { people: { a: { records: [{ id: "x", legacy: true, at: 5 }] } }, scenes: [] };
  assert.equal(reconcile(f, []), 0);
  assert.equal(f.people.a.records[0].at, 5);
});
