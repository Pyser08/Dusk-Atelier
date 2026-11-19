// 갈래 보기: 분기 원본 찾기·나무·갈라진 지점·호감 비교
import test from "node:test";
import assert from "node:assert/strict";
import { buildBranchTree, compareBranches, flattenTree, forkPointOf, parentIdOf } from "../src/engine/branchtree.js";

const rec = (at, act = "함") => ({ id: `r${at}`, at, act });
const base = (chatId, extra = {}) => ({
  chatId, chatName: chatId,
  people: { 리안: { name: "리안", records: [rec(1), rec(4), rec(7, "고백")] } },
  emo: { a: { from: "리안", to: "{{user}}", tags: { affection: 6 } } },
  cursor: { at: 7 }, ...extra
});

test("원본: adoptedFrom 먼저, 없으면 위키 forkedFrom(저장 키 끝도 맞춤), 모르는 id는 무시", () => {
  const ids = new Set(["A", "B", "C"]);
  assert.equal(parentIdOf({ chatId: "B", adoptedFrom: "A" }, ids), "A");
  assert.equal(parentIdOf({ chatId: "B", wiki: { scope: { forkedFrom: "risupot.wiki.bot1.A" } } }, ids), "A");
  assert.equal(parentIdOf({ chatId: "B", adoptedFrom: "Z" }, ids), "");
  assert.equal(parentIdOf({ chatId: "B", adoptedFrom: "B" }, ids), "");
});

test("갈라진 지점: 부모와 같은 기록이 남은 마지막 위치", () => {
  const parent = base("A");
  const child = base("B", { people: { 리안: { name: "리안", records: [rec(1), rec(4), rec(6, "다른 길")] } } });
  assert.equal(forkPointOf(child, parent), 4);
});

test("나무: 부모-자식 연결, 고리는 끊고, 갈래별 호감을 따로 계산", () => {
  const A = base("A");
  const B = base("B", { adoptedFrom: "A", emo: { a: { from: "리안", to: "{{user}}", tags: { hostility: 6 } } } });
  const C = base("C", { adoptedFrom: "B" });
  const X = base("X", { adoptedFrom: "Y" }), Y = base("Y", { adoptedFrom: "X" });
  const t = buildBranchTree([A, B, C, X, Y], { current: "B" });
  assert.equal(t.branched, true);
  assert.equal(t.byId.B.parent, "A"); assert.equal(t.byId.C.parent, "B");
  assert.ok(t.byId.B.current);
  assert.ok(!(t.byId.X.parent && t.byId.Y.parent), "고리는 한쪽이 뿌리");
  assert.equal(t.roots[0].id, "A");
  const rows = flattenTree(t.roots).map((r) => `${r.depth}:${r.node.id}`);
  assert.deepEqual(rows.slice(0, 3), ["0:A", "1:B", "2:C"]);
  const cmp = compareBranches(t.byId.A, t.byId.B);
  assert.equal(cmp[0].name, "리안"); assert.ok(cmp[0].diff < 0);
});

test("비교: 한쪽에만 있는 인물은 차이 없음으로 뒤에", () => {
  const r = compareBranches({ people: [{ id: "a", name: "가", aff: 50 }, { id: "b", name: "나", aff: 50 }] }, { people: [{ id: "a", name: "가", aff: 80 }, { id: "c", name: "다", aff: 30 }] });
  assert.equal(r[0].id, "a"); assert.equal(r[0].diff, 30);
  assert.equal(r.at(-1).diff, null);
});
