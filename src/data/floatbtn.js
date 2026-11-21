// 2.2.25: 채팅 위 떠 있는 버튼(인물 관계도)을 Dusk가 리스 화면에 직접 그린다 — 동그랗고 반투명, 리스 테마 색을 따라감, 끌어서 옮김(모바일 포함).
// 리스 registerButton(action)은 모양을 못 바꾸고 일반 리스 모바일에선 옮길 수 없었다. 리스 화면 권한(mainDom)이 없으면 쓰지 않는다(호출한 쪽이 예전 버튼으로).
// 끌기는 리스가 넘겨주는 이벤트에 좌표가 있을 때. 좌표가 없는 판에서는 길게 누를 때마다 화면 가장자리 자리를 돌아가며 옮긴다.
export const FAB_POS_KEY = "dusk.ui.fabPos";
const SIZE = 52, MARGIN = 12, LONG = 550, MOVE = 6;
// 리스 테마 색(--risu-theme-*)을 따라간다. 없으면 보라
export const FAB_STYLE = (x, y) => `position:fixed;left:${Math.round(x)}px;top:${Math.round(y)}px;width:${SIZE}px;height:${SIZE}px;border-radius:50%;z-index:2147482000;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent;`
  + "background:color-mix(in srgb,var(--risu-theme-selected,var(--risu-theme-darkbutton,#7c5cf0)) 62%,transparent);color:var(--risu-theme-textcolor,#fff);"
  + "border:1px solid color-mix(in srgb,var(--risu-theme-textcolor,#fff) 22%,transparent);box-shadow:0 6px 20px rgba(0,0,0,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:.86;transition:opacity .2s,transform .15s;";
// 길게 눌렀을 때 돌아가는 자리(오른쪽 아래부터 시계 반대 방향). w·h = 화면 크기
export function presetSpots(w, h) {
  const r = w - SIZE - MARGIN, b = h - SIZE - 96, l = MARGIN, t = 96, mid = Math.round((h - SIZE) / 2);
  return [[r, b], [r, mid], [r, t], [l, t], [l, mid], [l, b]];
}
export const clampPos = (x, y, w, h) => [Math.max(MARGIN, Math.min(w - SIZE - MARGIN, x)), Math.max(MARGIN, Math.min(h - SIZE - MARGIN, y))];

export function createFloatButton(api, { ensureDoc, icon, title, open, log = () => {} }) {
  let el = null, pos = null, view = { w: 390, h: 800 };
  const save = () => { try { api.pluginStorage?.setItem?.(FAB_POS_KEY, JSON.stringify(pos)); } catch { /* 위치만 못 기억 */ } };
  const load = async () => { try { const v = JSON.parse((await api.pluginStorage?.getItem?.(FAB_POS_KEY)) ?? "null"); return Array.isArray(v) && v.every(Number.isFinite) ? v : null; } catch { return null; } };
  const place = async () => { if (el) await el.setStyleAttribute(FAB_STYLE(pos[0], pos[1])); };
  async function measure(d) {
    try { const b = await (await d.querySelector("body"))?.getBoundingClientRect?.(); if (b?.width > 100) view = { w: b.width, h: Math.max(b.height, 300) }; } catch { /* 기본 크기 */ }
    try { const iw = await d.defaultView?.innerHeight; if (Number.isFinite(iw) && iw > 300) view.h = iw; } catch { /* 없음 */ }
  }
  async function show() {
    const d = await ensureDoc(); if (!d) return false;
    if (el) return true;
    await measure(d);
    pos = await load() ?? presetSpots(view.w, view.h)[0];
    pos = clampPos(pos[0], pos[1], view.w, view.h);
    const old = await d.querySelector('[x-dusk="fab"]'); if (old) await old.remove();
    el = await d.createElement("div"); await el.setAttribute("x-dusk", "fab"); await el.setAttribute("title", title); await el.setAttribute("role", "button"); await el.setAttribute("aria-label", title);
    await place();
    try { await el.setInnerHTML(icon); } catch { await el.setInnerText("◎"); }
    let t0 = 0, drag = null, moved = false;
    await el.addEventListener("pointerdown", (ev) => {
      t0 = Date.now(); moved = false;
      drag = Number.isFinite(ev?.clientX) && Number.isFinite(ev?.clientY) ? { sx: ev.clientX, sy: ev.clientY, ox: pos[0], oy: pos[1] } : null;
    });
    await d.addEventListener("pointermove", (ev) => {
      if (!drag || !Number.isFinite(ev?.clientX)) return;
      const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
      if (!moved && Math.hypot(dx, dy) < MOVE) return;
      moved = true; pos = clampPos(drag.ox + dx, drag.oy + dy, view.w, view.h); place().catch(() => {});
    });
    await d.addEventListener("pointerup", () => {
      if (!t0) return;
      const held = Date.now() - t0; t0 = 0;
      if (drag && moved) { drag = null; save(); return; }
      drag = null;
      if (held >= LONG) {   // 길게 누름: 다음 가장자리 자리로
        const spots = presetSpots(view.w, view.h), i = spots.findIndex(([x, y]) => Math.abs(x - pos[0]) < 8 && Math.abs(y - pos[1]) < 8);
        pos = spots[(i + 1) % spots.length]; place().catch(() => {}); save(); return;
      }
      Promise.resolve().then(open).catch((e) => log("버튼 열기 실패", e?.message ?? e));
    });
    await (await d.querySelector("body")).appendChild(el);
    return true;
  }
  async function hide() { const e = el; el = null; if (e) { try { await e.remove(); } catch { /* 이미 없음 */ } } }
  return { show, hide, isOn: () => !!el };
}
