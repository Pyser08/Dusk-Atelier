var EDGE = 48;
var START_PX = 5;
// 마우스·펜: 줄 어디를 잡아도 5px 움직이면 끌기 시작 (클릭은 그대로 클릭).
// 터치: 손잡이(grip)로만 끈다. 줄을 길게 누르는 건 여러 개 고르기에 쓰인다.
// 브라우저 기본 끌기(draggable)는 RisuAI 플러그인 창 안에서 막힐 수 있어 포인터 이벤트로만 처리한다.
var SKIP = "button:not(.rb-item),input,textarea,select,a,[role=switch],.rb-mcb,[contenteditable=true],.rb-icon-btn";
export function gripDrag({ grip, row: row2, root, scroller, onDrop, mouse = true, count, skip, whole = true }) {
  if (grip) {
    grip.style.touchAction = "none";
    grip.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      if (ev.pointerType === "mouse" && !mouse && !whole) return;
      ev.preventDefault();
      ev.stopPropagation();
      begin(ev, grip);
    });
  }
  if (whole) {
    row2.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0 || ev.pointerType === "touch") return;
      if (ev.target.closest(SKIP) || ev.target.closest(".grip")) return;
      const doc = row2.ownerDocument;
      const x0 = ev.clientX, y0 = ev.clientY;
      const move = (e) => {
        if (e.pointerId !== ev.pointerId) return;
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < START_PX) return;
        stop();
        doc.defaultView.getSelection?.()?.removeAllRanges();
        // 끌기가 끝난 뒤 따라오는 클릭 한 번은 무시 (줄 선택이 바뀌지 않게)
        const eat = (c) => {
          c.stopPropagation();
          c.preventDefault();
        };
        row2.addEventListener("click", eat, { capture: true, once: true });
        setTimeout(() => row2.removeEventListener("click", eat, { capture: true }), 400);
        begin(ev, row2, e);
      };
      const stop = () => {
        doc.removeEventListener("pointermove", move);
        doc.removeEventListener("pointerup", stop);
        doc.removeEventListener("pointercancel", stop);
      };
      doc.addEventListener("pointermove", move);
      doc.addEventListener("pointerup", stop);
      doc.addEventListener("pointercancel", stop);
    });
  }
  function begin(ev, capture, firstMove) {
    const doc = row2.ownerDocument, win = doc.defaultView;
    const host = root.closest(".rb-win") ?? root.closest(".rb-full") ?? doc.body;
    const r = row2.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const dy = ev.clientY - r.top;
    const ghost = row2.cloneNode(true);
    Object.assign(ghost.style, {
      position: "absolute",
      left: `${r.left - hr.left}px`,
      top: `${r.top - hr.top}px`,
      width: `${r.width}px`,
      opacity: "0.92",
      pointerEvents: "none",
      zIndex: "70",
      boxShadow: "0 12px 30px rgba(0,0,0,.35)",
      background: "var(--rb-surf2)",
      borderRadius: "12px",
      margin: "0",
      transform: "scale(1.01)",
      transition: "transform .12s"
    });
    ghost.setAttribute("aria-hidden", "true");
    const n = count?.() ?? 1;
    if (n > 1) ghost.appendChild(dragBadge(doc, n));
    host.appendChild(ghost);
    const dim = n > 1 ? [...root.querySelectorAll(".picked")] : [row2];
    if (!dim.includes(row2)) dim.push(row2);
    for (const d of dim) d.style.opacity = "0.35";
    const prevSel = doc.body.style.userSelect;
    doc.body.style.userSelect = "none";
    try {
      capture.setPointerCapture(ev.pointerId);
    } catch {
    }
    let target = null, lastY = ev.clientY, raf = 0;
    const clear2 = () => {
      if (target?.el) {
        target.el.style.boxShadow = target.prev ?? "";
      }
      target = null;
    };
    const pick = (x, y) => {
      const under = doc.elementFromPoint(x, y);
      const el = under?.closest?.("[data-drop-row],[data-drop-folder]");
      if (!el || !root.contains(el) || el === row2 || skip?.(el)) {
        clear2();
        return;
      }
      const rr = el.getBoundingClientRect();
      const isRow = el.hasAttribute("data-drop-row");
      const after = isRow && y > rr.top + rr.height / 2;
      if (target?.el === el && target.after === after) return;
      clear2();
      target = { el, prev: el.style.boxShadow, isRow, after, id: el.getAttribute("data-drop-row"), folder: el.getAttribute("data-drop-folder") };
      el.style.boxShadow = isRow ? after ? "inset 0 -3px 0 var(--rb-acc-text)" : "inset 0 3px 0 var(--rb-acc-text)" : "inset 0 0 0 2px var(--rb-sel-ring)";
    };
    const tick = () => {
      raf = 0;
      if (!scroller) return;
      const sr = scroller.getBoundingClientRect();
      let v = 0;
      if (lastY < sr.top + EDGE) v = -Math.ceil((sr.top + EDGE - lastY) / 4);
      else if (lastY > sr.bottom - EDGE) v = Math.ceil((lastY - (sr.bottom - EDGE)) / 4);
      if (v) {
        scroller.scrollTop += v;
        raf = win.requestAnimationFrame(tick);
      }
    };
    const move2 = (e) => {
      if (e.pointerId !== ev.pointerId) return;
      e.preventDefault();
      lastY = e.clientY;
      ghost.style.top = `${e.clientY - dy - hr.top}px`;
      pick(e.clientX, e.clientY);
      if (!raf) raf = win.requestAnimationFrame(tick);
    };
    const end = async (e) => {
      if (e.pointerId !== ev.pointerId) return;
      capture.removeEventListener("pointermove", move2);
      capture.removeEventListener("pointerup", end);
      capture.removeEventListener("pointercancel", end);
      if (raf) win.cancelAnimationFrame(raf);
      ghost.remove();
      for (const d of dim) d.style.opacity = "";
      doc.body.style.userSelect = prevSel;
      const t = target;
      clear2();
      if (!t || e.type === "pointercancel") return;
      if (t.isRow) await onDrop({ beforeId: t.id, after: t.after, folderId: void 0 });
      else await onDrop({ beforeId: null, after: false, folderId: t.folder || null });
    };
    capture.addEventListener("pointermove", move2);
    capture.addEventListener("pointerup", end);
    capture.addEventListener("pointercancel", end);
    if (firstMove) move2(firstMove);
  }
}
export function dragBadge(doc, n) {
  const b = doc.createElement("span");
  b.textContent = `${n}개`;
  Object.assign(b.style, { position: "absolute", top: "-8px", right: "-6px", padding: "2px 9px", borderRadius: "999px", background: "var(--rb-acc-grad, #5b5bd6)", color: "#fff", fontSize: "12px", fontWeight: "700", boxShadow: "0 4px 12px rgba(0,0,0,.3)" });
  return b;
}
export function placeIds(ids, moving, beforeId, after) {
  const set = new Set(moving);
  const out = ids.filter((x) => !set.has(x));
  const at = out.indexOf(beforeId);
  out.splice(at < 0 ? out.length : at + (after ? 1 : 0), 0, ...moving);
  return out;
}
