// 2.2.0 홈 위젯 격자: 기본 배치·저장값 정리·스냅·겹침 풀기
import test from "node:test";
import assert from "node:assert/strict";
import { defaultLayout, normalizeLayout, settle, snapMove, snapResize, addWidget, overlaps, fitSize, WIDGET_SIZES } from "../src/ui/homegrid.js";

const ALL = Object.keys(WIDGET_SIZES);

test("기본 배치는 PC·모바일 모두 겹치지 않고 칸 안에 있고 위젯을 다 담는다", () => {
  for (const cols of [6, 2]) {
    const L = defaultLayout(cols);
    assert.equal(overlaps(L), false);
    assert.ok(L.every((i) => i.x >= 0 && i.x + i.w <= cols));
    assert.deepEqual(L.map((i) => i.id).sort(), [...ALL].sort());
  }
});

test("저장값 정리: 모르는 위젯·중복은 빼고, 보일 수 없는 위젯(관리 없음)은 숨긴다", () => {
  const saved = [{ id: "imp", x: 0, y: 0, w: 1, h: 1 }, { id: "imp", x: 1, y: 0, w: 1, h: 1 }, { id: "zzz", x: 0, y: 0, w: 1, h: 1 }, { id: "man", x: 2, y: 0, w: 1, h: 1 }];
  const L = normalizeLayout(saved, 6, ALL.filter((i) => i !== "man"));
  assert.deepEqual(L.map((i) => i.id), ["imp"]);
});

test("크기는 위젯 범위와 칸 수 안으로 맞춘다", () => {
  assert.deepEqual(fitSize({ id: "rec", x: 5, y: 0, w: 9, h: 9 }, 6), { id: "rec", x: 0, y: 0, w: 6, h: 4 });
  assert.equal(fitSize({ id: "imp", x: 0, y: 0, w: 0.2, h: 1 }, 2).w, 1);
  assert.equal(fitSize({ id: "rec", x: 0, y: 0, w: 2, h: 2 }, 2).x, 0);
});

test("끌기는 가장 가까운 칸에 붙고 격자 밖으로 못 나간다", () => {
  const o = { id: "imp", x: 2, y: 0, w: 1, h: 1 };
  assert.deepEqual(snapMove(o, 150, 60, 112, 112, 6), { ...o, x: 3, y: 1 });
  assert.equal(snapMove(o, -9999, -9999, 112, 112, 6).x, 0);
  assert.equal(snapMove(o, 9999, 0, 112, 112, 6).x, 5);
  assert.equal(snapMove(o, 0, -500, 112, 112, 6).y, 0);
});

test("크기 바꾸기도 칸에 붙고 범위·오른쪽 끝을 넘지 않는다", () => {
  const o = { id: "imp", x: 4, y: 0, w: 1, h: 1 };
  assert.deepEqual(snapResize(o, 120, 120, 112, 112, 6), { ...o, w: 2, h: 2 });
  assert.equal(snapResize({ ...o, x: 5 }, 300, 0, 112, 112, 6).w, 1);
  assert.equal(snapResize(o, -500, -500, 112, 112, 6).w, 1);
  assert.equal(snapResize({ id: "rec", x: 0, y: 0, w: 2, h: 2 }, -500, -500, 112, 112, 6).h, 2);
});

test("옮긴 위젯이 겹치면 나머지가 아래로 밀리고 빈 곳은 위로 당겨진다", () => {
  const L = defaultLayout(6);
  const imp = L.find((i) => i.id === "imp");
  imp.x = 0; imp.y = 0;   // 최근 기록 자리로
  settle(L, imp);
  assert.equal(overlaps(L), false);
  assert.deepEqual([imp.x, imp.y], [0, 0]);
  const rec = L.find((i) => i.id === "rec");
  assert.ok(rec.y >= 1);
});

test("숨긴 위젯 다시 넣기는 맨 아래 최소 크기로", () => {
  const L = defaultLayout(6).filter((i) => i.id !== "n4");
  addWidget(L, "n4", 6);
  assert.equal(overlaps(L), false);
  const n4 = L.find((i) => i.id === "n4");
  assert.deepEqual([n4.w, n4.h], [1, 1]);
});
