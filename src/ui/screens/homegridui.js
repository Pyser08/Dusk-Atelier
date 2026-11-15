// 홈 위젯 격자 화면(2.2.0). 배치 계산은 ../homegrid.js, 여기는 그리기·끌기·크기 바꾸기만.
// '홈 꾸미기' 중에만 끌 수 있다(모바일 스크롤과 안 부딪히게). 키보드: 화살표 = 옮기기, Shift+화살표 = 크기.
import { h } from '../dom.js';
import { GRID_COLS, WIDGET_SIZES, normalizeLayout, settle, snapMove, snapResize, addWidget, defaultLayout, gridHeight } from '../homegrid.js';

var NARROW = 640;   // 이보다 좁으면 2칸

// widgets: { id: { name, el } }  saved: { 6: [...], 2: [...] }  onSave(cols, list)
export function homeGrid({ widgets, saved = {}, onSave = () => {}, onTray = () => {} }) {
  const grid = h("div", { class: "rb-hgrid2", role: "list", "aria-label": "홈 위젯" });
  const ghost = h("div", { class: "rb-hw-ghost", "aria-hidden": "true", hidden: true });
  let cols = 0, list = [], editing = false, avail = Object.keys(widgets);
  const boxes = new Map();
  const unit = () => {
    const cs = getComputedStyle(grid);
    const gap = parseFloat(cs.getPropertyValue("--hw-gap")) || 16, ch = parseFloat(cs.getPropertyValue("--hw-cell")) || 96;
    const cw = (grid.clientWidth - gap * (cols - 1)) / cols;
    return { cw, ch, gap, ux: cw + gap, uy: ch + gap };
  };
  const place = (el, it, u = unit()) => Object.assign(el.style, {
    left: `${it.x * u.ux}px`, top: `${it.y * u.uy}px`, width: `${it.w * u.cw + (it.w - 1) * u.gap}px`, height: `${it.h * u.ch + (it.h - 1) * u.gap}px`
  });
  // 지금 못 보이는 위젯(열린 채팅 없음 등)의 저장 자리는 지우지 않고 남긴다
  const save = () => { const l = [...list.map(({ id, x, y, w, h: hh }) => ({ id, x, y, w, h: hh })), ...(saved[cols] ?? defaultLayout(cols)).filter((i) => !avail.includes(i.id))]; saved = { ...saved, [cols]: l }; onSave(cols, l); };
  const hidden = () => avail.filter((id) => !list.some((i) => i.id === id));

  function boxOf(id) {
    let b = boxes.get(id);
    if (b) return b;
    const wd = widgets[id];
    b = h("div", { class: "rb-hw", role: "listitem", dataset: { w: id }, "aria-label": wd.name },
      wd.el,
      h("button", { type: "button", class: "rb-hw-rm", title: `${wd.name} 숨기기`, "aria-label": `${wd.name} 숨기기`, onClick: () => { list = list.filter((i) => i.id !== id); settle(list); save(); draw(); } }, "✕"),
      h("i", { class: "rb-hw-size", "aria-hidden": "true" }));
    b.addEventListener("pointerdown", (e) => down(e, id));
    b.addEventListener("keydown", (e) => key(e, id));
    // 꾸미는 중에는 안의 버튼이 눌리지 않게 막는다
    b.addEventListener("click", (e) => { if (editing && !e.target.closest(".rb-hw-rm")) { e.preventDefault(); e.stopPropagation(); } }, true);
    boxes.set(id, b);
    return b;
  }

  function draw() {
    const want = grid.clientWidth && grid.clientWidth < NARROW ? GRID_COLS.narrow : GRID_COLS.wide;
    if (want !== cols) { cols = want; list = normalizeLayout(saved[cols], cols, avail); }
    grid.classList.toggle("narrow", cols === GRID_COLS.narrow);
    const u = unit();
    const keep = new Set(list.map((i) => i.id));
    for (const [id, b] of boxes) if (!keep.has(id)) b.remove();
    for (const it of list) {
      const b = boxOf(it.id);
      b.dataset.size = `${it.w}x${it.h}`;
      b.tabIndex = editing ? 0 : -1;
      place(b, it, u);
      if (b.parentNode !== grid) grid.append(b);
    }
    if (ghost.parentNode !== grid) grid.append(ghost);
    grid.style.height = `${Math.max(0, gridHeight(list) * u.uy - u.gap + (editing ? u.uy : 0))}px`;
    grid.style.setProperty("--hw-ux", `${u.ux}px`);
    grid.style.setProperty("--hw-uy", `${u.uy}px`);
    onTray(hidden());
  }

  function down(e, id) {
    if (!editing || e.button > 0 || e.target.closest(".rb-hw-rm")) return;
    const it = list.find((i) => i.id === id), b = boxes.get(id);
    if (!it || !b) return;
    e.preventDefault();
    const resize = !!e.target.closest(".rb-hw-size"), u = unit(), sx = e.clientX, sy = e.clientY, o = { ...it };
    b.classList.add("drag");
    try { b.setPointerCapture(e.pointerId); } catch { /* 일부 호스트는 지원 안 함 */ }
    ghost.hidden = false; place(ghost, it, u);
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (resize) {
        b.style.width = `${o.w * u.cw + (o.w - 1) * u.gap + dx}px`;
        b.style.height = `${o.h * u.ch + (o.h - 1) * u.gap + dy}px`;
        Object.assign(it, snapResize(o, dx, dy, u.ux, u.uy, cols));
      } else {
        b.style.left = `${o.x * u.ux + dx}px`;
        b.style.top = `${o.y * u.uy + dy}px`;
        Object.assign(it, snapMove(o, dx, dy, u.ux, u.uy, cols));
      }
      place(ghost, it, u);
    };
    const up = () => {
      b.removeEventListener("pointermove", move); b.removeEventListener("pointerup", up); b.removeEventListener("pointercancel", up);
      b.classList.remove("drag"); ghost.hidden = true;
      settle(list, it); save(); draw();
    };
    b.addEventListener("pointermove", move); b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
  }

  function key(e, id) {
    if (!editing || e.target !== boxes.get(id)) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const it = list.find((i) => i.id === id);
    Object.assign(it, e.shiftKey ? snapResize(it, d[0], d[1], 1, 1, cols) : snapMove(it, d[0], d[1], 1, 1, cols));
    settle(list, it); save(); draw();
    boxes.get(id)?.focus();
  }

  // 내용 높이에 맞추는 위젯(autoH, 예: 애드온 상자): 크기 범위 안에서 줄 수를 늘리거나 줄인다(저장 안 함 — 내용 따라 매번 다시 맞춤)
  let fitting = false;
  function fitAuto() {
    if (fitting || !cols) return;
    const u = unit();
    let changed = false;
    for (const it of list) {
      const wd = widgets[it.id];
      if (!wd?.autoH || !wd.el.isConnected) continue;
      const b = boxes.get(it.id), cs = b ? getComputedStyle(b) : null;
      const pad = cs ? parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) : 0;
      const need = Math.ceil((wd.el.offsetHeight + pad + u.gap) / u.uy);
      const s = WIDGET_SIZES[it.id] ?? { min: [1, 1], max: [cols, 6] };
      const h2 = Math.max(s.min[1], Math.min(s.max[1], need));
      if (h2 !== it.h) { it.h = h2; settle(list, it); changed = true; }
    }
    if (changed) { fitting = true; draw(); fitting = false; }
  }
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => { draw(); fitAuto(); }).observe(grid);
    const ro = new ResizeObserver(() => fitAuto());
    for (const wd of Object.values(widgets)) if (wd.autoH) ro.observe(wd.el);
  }
  return {
    el: grid,
    draw,
    get editing() { return editing; },
    setEditing(v) { editing = !!v; grid.classList.toggle("editing", editing); draw(); },
    // 보일 수 있는 위젯이 바뀜(읽기 끝·추천 없음 등). 저장된 배치는 그대로 두고 다시 정리한다
    setAvail(ids) { avail = ids.filter((id) => widgets[id]); if (cols) list = normalizeLayout(saved[cols], cols, avail); draw(); },
    add(id) { addWidget(list, id, cols); save(); draw(); },
    reset() { list = normalizeLayout(defaultLayout(cols), cols, avail); save(); draw(); }
  };
}
