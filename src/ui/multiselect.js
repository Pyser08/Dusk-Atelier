var LONG_MS = 450;
var SLOP = 8;
export function createMulti({ onChange }) {
  const sel = /* @__PURE__ */ new Set();
  let anchor = null, mode = false, suppressAt = 0, list = null, painting = null;
  const changed = () => {
    decorate();
    onChange?.();
  };
  const order = () => list ? [...list.querySelectorAll("[data-pick]")].map((r) => r.dataset.pick) : [];
  function decorate() {
    if (!list) return;
    list.classList.toggle("picking", api.active);
    for (const r of list.querySelectorAll("[data-pick]")) {
      const on = sel.has(r.dataset.pick);
      r.classList.toggle("picked", on);
      r.querySelector(":scope > .rb-mcb")?.setAttribute("aria-checked", on ? "true" : "false");
    }
  }
  function at(x, y) {
    const doc = list.ownerDocument;
    const r = doc.elementFromPoint(x, y)?.closest?.("[data-pick]");
    if (r && list.contains(r) && sel.has(r.dataset.pick) !== painting.on) api.toggle(r.dataset.pick, painting.on);
    const lr = list.getBoundingClientRect();
    if (y < lr.top + 36) list.scrollTop -= 14;
    else if (y > lr.bottom - 36) list.scrollTop += 14;
  }
  const api = {
    sel,
    get active() {
      return mode || sel.size > 0;
    },
    setMode(on) {
      mode = on;
      if (!on) {
        sel.clear();
        anchor = null;
      }
      changed();
    },
    has: (id) => sel.has(id),
    clear() {
      if (!sel.size && !mode) return;
      sel.clear();
      anchor = null;
      mode = false;
      changed();
    },
    set(ids) {
      sel.clear();
      for (const id of ids) sel.add(id);
      mode = true;
      changed();
    },
    // 지금 화면 순서대로 고른 id(화면에 없는 것은 뒤에)
    ordered() {
      const out = order().filter((id) => sel.has(id));
      for (const id of sel) if (!out.includes(id)) out.push(id);
      return out;
    },
    // 끌 때 함께 옮길 것: 고른 줄을 잡았으면 고른 전부, 아니면 그 줄 하나
    dragIds: (id) => sel.has(id) && sel.size > 1 ? api.ordered() : [id],
    toggle(id, on = !sel.has(id)) {
      if (on) sel.add(id);
      else sel.delete(id);
      anchor = id;
      changed();
    },
    range(id, current) {
      const o = order();
      let a = o.indexOf(anchor ?? current ?? id), b = o.indexOf(id);
      if (a < 0) a = b;
      if (a > b) [a, b] = [b, a];
      for (const x of o.slice(a, b + 1)) sel.add(x);
      changed();
    },
    // 줄 클릭을 여기서 처리했으면 true. current: 지금 열려 있는(하나 고른) 항목
    click(ev, id, current) {
      if (suppressAt && Date.now() - suppressAt < 700) {
        suppressAt = 0;
        return true;
      }
      if (ev.shiftKey) {
        if (!sel.size && current) sel.add(current);
        api.range(id, current);
        return true;
      }
      if (ev.ctrlKey || ev.metaKey) {
        if (!sel.size && current && current !== id) sel.add(current);
        api.toggle(id);
        return true;
      }
      if (api.active) {
        api.toggle(id);
        return true;
      }
      anchor = id;
      return false;
    },
    // 목록을 새로 그릴 때마다 한 번: 줄에는 data-pick="<id>"와 체크 칸(.rb-mcb)이 있어야 한다
    attach(el) {
      list = el;
      let timer = 0, x0 = 0, y0 = 0;
      el.addEventListener("touchstart", (ev) => {
        const t = ev.touches[0];
        if (ev.touches.length !== 1 || ev.target.closest("button,input,a,.grip,.rb-mcb")) return;
        const r = ev.target.closest("[data-pick]");
        if (!r) return;
        x0 = t.clientX;
        y0 = t.clientY;
        timer = setTimeout(() => {
          timer = 0;
          suppressAt = Date.now();
          navigator.vibrate?.(15);
          const on = !sel.has(r.dataset.pick);
          painting = { on };
          api.toggle(r.dataset.pick, on);
        }, LONG_MS);
      }, { passive: true });
      el.addEventListener("touchmove", (ev) => {
        const t = ev.touches[0];
        if (timer && Math.hypot(t.clientX - x0, t.clientY - y0) > SLOP) {
          clearTimeout(timer);
          timer = 0;
        }
        if (painting) {
          ev.preventDefault();
          at(t.clientX, t.clientY);
        }
      }, { passive: false });
      const end = () => {
        if (timer) clearTimeout(timer);
        timer = 0;
        painting = null;
      };
      el.addEventListener("touchend", end);
      el.addEventListener("touchcancel", end);
      el.addEventListener("contextmenu", (ev) => {
        if (suppressAt && Date.now() - suppressAt < 1500) ev.preventDefault();
      });
      el.addEventListener("pointerdown", (ev) => {
        const box = ev.target.closest(".rb-mcb");
        if (!box || ev.button !== 0) return;
        const r = box.closest("[data-pick]");
        ev.preventDefault();
        ev.stopPropagation();
        const on = !sel.has(r.dataset.pick);
        painting = { on, pointer: ev.pointerId };
        api.toggle(r.dataset.pick, on);
        try {
          box.setPointerCapture(ev.pointerId);
        } catch {
        }
        const mv = (e) => {
          if (e.pointerId === ev.pointerId && painting) at(e.clientX, e.clientY);
        };
        const up = (e) => {
          if (e.pointerId !== ev.pointerId) return;
          painting = null;
          box.removeEventListener("pointermove", mv);
          box.removeEventListener("pointerup", up);
          box.removeEventListener("pointercancel", up);
        };
        box.addEventListener("pointermove", mv);
        box.addEventListener("pointerup", up);
        box.addEventListener("pointercancel", up);
      });
      el.addEventListener("click", (ev) => {
        if (ev.target.closest(".rb-mcb")) {
          ev.stopPropagation();
          ev.preventDefault();
        }
      }, true);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && api.active) {
          ev.stopPropagation();
          api.clear();
        }
      });
      decorate();
    }
  };
  return api;
}
