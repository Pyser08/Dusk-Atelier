import test from "node:test";
import assert from "node:assert/strict";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { hashText, messageIdentity } from "../src/engine/chattext.js";

const msg = (text, chatId) => ({ role: "char", data: text, chatId });
const rec = (at, text, mid) => ({ id: "r" + at, at, mid, h: messageIdentity(msg(text, mid)) });

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
test("reroll of the last analyzed reply moves the cursor to the latest surviving record", () => {
  const msgs = [msg("첫 응답"), msg("새로 생성된 응답")];
  const f = { people: { a: { records: [rec(0, "첫 응답"), rec(1, "이전 응답")] } }, scenes: [{ id: "s", ...rec(0, "첫 응답") }], cursor: { at: 1, h: hashText("이전 응답") } };
  reconcile(f, msgs);
  assert.equal(f.people.a.records[1].orphan, true);
  assert.deepEqual({ at: f.cursor.at, h: f.cursor.h }, { at: 0, h: messageIdentity(msg("첫 응답")) });
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

// ── v1.6.5: rels/open 출처·레거시 at_ms·고아 정리 ──
import { cleanOrphans, srcOf } from "../src/engine/memoryreconcile.js";
import { applyRel, applyOpen, openItems, relLines, isClosed } from "../src/engine/memoryplus.js";

const anchor = (at, text, mid) => ({ at, mid, h: messageIdentity(msg(text, mid)) });

test("src가 있는 rels/open은 출처 응답이 사라지면 고아", () => {
  const f = { people: {}, scenes: [] };
  const a = anchor(0, "이전 응답");
  applyRel(f, [{ from: "A", to: "B", d: "가까워짐", dir: "+" }], a, 100);
  applyOpen(f, { add: [{ text: "약속", kind: "promise", who: [] }], close: [] }, a, 100);
  reconcile(f, [msg("새로 생성된 응답")]);
  assert.equal(f.rels["a>b"].items[0].orphan, true);
  assert.equal(f.open[0].orphan, true);
  assert.equal(openItems(f).length, 0);
  assert.equal(relLines(f).length, 0);
  reconcile(f, [msg("이전 응답")]);  // 응답이 돌아오면 되살아난다
  assert.equal(openItems(f).length, 1);
});
test("버린 분석이 닫은 떡밥은 다시 열린다(closedBy)", () => {
  const f = { people: {}, scenes: [] };
  applyOpen(f, { add: [{ text: "복선", kind: "foreshadow", who: [] }], close: [] }, anchor(0, "첫 응답"), 100);
  applyOpen(f, { add: [], close: [f.open[0].id] }, anchor(1, "닫은 응답"), 200);
  assert.ok(isClosed(f.open[0]));
  reconcile(f, [msg("첫 응답"), msg("다시 생성")]);
  assert.equal(f.open[0].closedOrphan, true);
  assert.equal(openItems(f).length, 1);
  assert.equal(openItems(f, { closed: true }).length, 0);
});
test("src 없는 레거시 rels/open은 같은 at_ms의 기록·장면이 전부 고아면 고아", () => {
  const h = hashText("옛 응답");
  const f = { people: { a: { records: [{ id: "r", at: 0, h, at_ms: 500 }] } }, scenes: [{ id: "s", at: 0, h, at_ms: 500 }],
    rels: { "a>b": { from: "A", to: "B", items: [{ d: "x", dir: "0", at_ms: 500 }, { d: "y", dir: "0", at_ms: 999 }] } },
    open: [{ id: "o1", text: "t", kind: "question", at_ms: 500, closed: false }, { id: "o2", text: "u", kind: "question", at_ms: 700, closed: true, closed_ms: 500 }] };
  reconcile(f, [msg("새 응답")]);
  assert.equal(f.rels["a>b"].items[0].orphan, true);
  assert.equal(f.rels["a>b"].items[1].orphan, false);  // 판정할 단서가 없으면 남긴다
  assert.equal(f.open[0].orphan, true);
  assert.equal(f.open[1].orphan, false);
  assert.equal(f.open[1].closedOrphan, true);  // 레거시 닫기도 되돌린다
});
test("고아 정리: rels/open도 지우고 레거시 판정이 기록·장면 삭제보다 먼저", () => {
  const h = hashText("옛 응답");
  const f = { people: { a: { records: [{ id: "r", at: 0, h, at_ms: 500 }] } }, scenes: [{ id: "s", at: 0, h, at_ms: 500 }],
    rels: { "a>b": { from: "A", to: "B", items: [{ d: "x", dir: "0", at_ms: 500 }] } },
    open: [{ id: "o1", text: "t", kind: "question", at_ms: 500, closed: false }] };
  const out = cleanOrphans(f, [msg("새 응답")]);
  assert.deepEqual(out, { records: 1, scenes: 1, rels: 1, open: 1, reopened: 0 });
  assert.equal(f.rels["a>b"], undefined);
  assert.equal(f.open.length, 0);
});
test("srcOf는 해시 없으면 undefined", () => { assert.equal(srcOf({ at: 1 }), undefined); assert.equal(srcOf(anchor(2, "z", "m")).chatId, "m"); });

test("legacy anchors migrate to full identity when the matching message is unambiguous", () => {
  const text = "앞부분 ".repeat(60) + "끝";
  const m = msg(text, "legacy-mid");
  const oldHash = hashText(text);
  const f = { people: { a: { records: [{ id: "old", at: 0, mid: "legacy-mid", h: oldHash }] } }, scenes: [], cursor: { at: 0, mid: "legacy-mid", h: oldHash } };
  reconcile(f, [m]);
  assert.equal(f.people.a.records[0].h, messageIdentity(m));
  assert.equal(f.people.a.records[0].orphan, false);
  assert.equal(f.cursor.h, messageIdentity(m));
});

test("ambiguous legacy done hashes are discarded instead of marking colliding messages done", () => {
  const prefix = "p".repeat(240);
  const a = msg(prefix + "A", "id-a"), b = msg(prefix + "B", "id-b");
  assert.equal(hashText(a.data), hashText(b.data));
  const f = { people: {}, scenes: [], done: [hashText(a.data)], failedBackfill: [hashText(a.data)] };
  reconcile(f, [a, b]);
  assert.deepEqual(f.done, []);
  assert.deepEqual(f.failedBackfill, []);
});
