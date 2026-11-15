// 홈 위젯 격자(2.2.0): 칸 단위 배치 계산만 한다(DOM 없음).
// 배치 한 칸 = { id, x, y, w, h }. 줄 수는 PC 6칸·모바일 2칸, 저장은 칸 수별로 따로.

export var GRID_COLS = { wide: 6, narrow: 2 };

// 위젯 크기 범위(칸): [최소 w, 최소 h], [최대 w, 최대 h]
export var WIDGET_SIZES = {
  imp: { min: [1, 1], max: [2, 2] },
  mem: { min: [1, 1], max: [2, 2] },
  man: { min: [1, 1], max: [2, 2] },
  wrk: { min: [1, 1], max: [2, 2] },
  n1: { min: [1, 1], max: [2, 1] },
  n2: { min: [1, 1], max: [2, 1] },
  n3: { min: [1, 1], max: [2, 1] },
  n4: { min: [1, 1], max: [2, 1] },
  rec: { min: [2, 2], max: [6, 4] },
  qs: { min: [2, 2], max: [3, 5] },
  cont: { min: [2, 1], max: [6, 2] },
  disc: { min: [2, 1], max: [6, 2] },
  add: { min: [2, 2], max: [6, 60] }   // 높이는 내용에 맞춤(autoH) — 잘리지 않게 넉넉히
};

var row = (a) => ({ id: a[0], x: a[1], y: a[2], w: a[3], h: a[4] });
export var DEFAULT_LAYOUT = {
  6: [["rec", 0, 0, 2, 2], ["imp", 2, 0, 1, 1], ["mem", 3, 0, 1, 1], ["man", 2, 1, 1, 1], ["wrk", 3, 1, 1, 1], ["qs", 4, 0, 2, 5], ["n1", 0, 2, 1, 1], ["n2", 1, 2, 1, 1], ["n3", 2, 2, 1, 1], ["n4", 3, 2, 1, 1], ["cont", 0, 3, 2, 2], ["disc", 2, 3, 2, 2], ["add", 0, 5, 6, 2]],
  2: [["imp", 0, 0, 1, 1], ["mem", 1, 0, 1, 1], ["man", 0, 1, 1, 1], ["wrk", 1, 1, 1, 1], ["n1", 0, 2, 1, 1], ["n2", 1, 2, 1, 1], ["rec", 0, 3, 2, 2], ["cont", 0, 5, 2, 2], ["disc", 0, 7, 2, 2], ["qs", 0, 9, 2, 4], ["add", 0, 13, 2, 3], ["n3", 0, 16, 1, 1], ["n4", 1, 16, 1, 1]]
};
export var defaultLayout = (cols) => (DEFAULT_LAYOUT[cols] ?? DEFAULT_LAYOUT[2]).map(row);

var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
var hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// 크기를 위젯 범위·칸 수 안으로 맞춘다
export function fitSize(it, cols) {
  const s = WIDGET_SIZES[it.id] ?? { min: [1, 1], max: [cols, 6] };
  const w = clamp(Math.round(it.w) || s.min[0], Math.min(s.min[0], cols), Math.min(s.max[0], cols));
  const h = clamp(Math.round(it.h) || s.min[1], s.min[1], s.max[1]);
  return { ...it, w, h, x: clamp(Math.round(it.x) || 0, 0, cols - w), y: Math.max(0, Math.round(it.y) || 0) };
}

// 겹침을 없앤다: fixed(방금 옮긴 것)를 먼저 두고, 나머지는 위→아래 순서로 겹치면 아래로 밀고 빈 곳은 위로 당긴다
export function settle(list, fixed = null) {
  const order = list.filter((i) => i !== fixed).sort((a, b) => a.y - b.y || a.x - b.x);
  const placed = fixed ? [fixed] : [];
  for (const it of order) {
    while (placed.some((p) => hit(p, it))) it.y++;
    while (it.y > 0 && !placed.some((p) => hit(p, { ...it, y: it.y - 1 }))) it.y--;
    placed.push(it);
  }
  if (fixed) while (fixed.y > 0 && !placed.some((p) => p !== fixed && hit(p, { ...fixed, y: fixed.y - 1 }))) fixed.y--;
  return list;
}

// 저장값을 읽어 정리한다: 모르는 위젯·중복은 빼고, 크기를 맞추고, 겹침을 푼다.
// avail = 지금 보일 수 있는 위젯 id 목록(없는 위젯은 숨김 취급하되 저장값은 지우지 않는다)
export function normalizeLayout(saved, cols, avail) {
  const ok = new Set(avail);
  const src = Array.isArray(saved) && saved.length ? saved : defaultLayout(cols);
  const seen = new Set(), out = [];
  for (const it of src) {
    if (!it || !ok.has(it.id) || seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(fitSize(it, cols));
  }
  return settle(out);
}

// 숨긴 위젯을 맨 아래에 다시 넣는다
export function addWidget(list, id, cols) {
  const s = WIDGET_SIZES[id] ?? { min: [1, 1] };
  const bottom = list.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  list.push(fitSize({ id, x: 0, y: bottom, w: s.min[0], h: s.min[1] }, cols));
  return settle(list);
}

// 끄는 중인 픽셀 거리를 칸으로 바꾼다(가장 가까운 칸에 붙음)
export function snapMove(orig, dx, dy, unitX, unitY, cols) {
  return { ...orig, x: clamp(Math.round(orig.x + dx / unitX), 0, cols - orig.w), y: Math.max(0, Math.round(orig.y + dy / unitY)) };
}
export function snapResize(orig, dx, dy, unitX, unitY, cols) {
  const s = WIDGET_SIZES[orig.id] ?? { min: [1, 1], max: [cols, 6] };
  return {
    ...orig,
    w: clamp(Math.round(orig.w + dx / unitX), Math.min(s.min[0], cols), Math.min(s.max[0], cols - orig.x)),
    h: clamp(Math.round(orig.h + dy / unitY), s.min[1], s.max[1])
  };
}

export var gridHeight = (list) => list.reduce((m, i) => Math.max(m, i.y + i.h), 0);
export var overlaps = (list) => list.some((a, i) => list.some((b, j) => j > i && hit(a, b)));
