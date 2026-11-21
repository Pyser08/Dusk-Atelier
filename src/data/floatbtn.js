// 2.2.25: 채팅 위 떠 있는 버튼(인물 관계도)을 Dusk가 리스 화면에 직접 그린다 — 동그랗고 반투명, 리스 테마 색을 따라감, 끌어서 옮김(모바일 포함).
// 리스 registerButton(action)은 모양을 못 바꾸고 일반 리스 모바일에선 옮길 수 없었다. 리스 화면 권한(mainDom)이 없으면 쓰지 않는다(호출한 쪽이 예전 버튼으로).
// 끌기는 리스가 넘겨주는 이벤트에 좌표가 있을 때. 좌표가 없는 판에서는 길게 누를 때마다 화면 가장자리 자리를 돌아가며 옮긴다.
export const FAB_POS_KEY = "dusk.ui.fabPos";
const SIZE = 54, MARGIN = 12, LONG = 600, MOVE = 6;
// 리스 테마 색(--risu-theme-*)을 따라간다. 없으면 보라
// 2.2.29: 테마 색(리스 판마다 이름이 달라 여러 개를 차례로) 위에 위쪽 빛 반사, 반투명, 흰 테두리·그림자
const THEME = "var(--risu-theme-selected,var(--risu-theme-darkbutton,var(--risu-theme-borderc,#7c5cf0)))";
export const FAB_STYLE = (x, y) => `position:fixed;left:${Math.round(x)}px;top:${Math.round(y)}px;width:${SIZE}px;height:${SIZE}px;border-radius:50%;z-index:2147482000;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;box-sizing:border-box;`
  + `background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.42),rgba(255,255,255,0) 58%),color-mix(in srgb,${THEME} 74%,transparent);background-color:${THEME};color:#fff;`
  + "border:1.5px solid rgba(255,255,255,.38);box-shadow:0 8px 22px rgba(0,0,0,.3),inset 0 -3px 8px rgba(0,0,0,.18),inset 0 2px 4px rgba(255,255,255,.25);backdrop-filter:blur(10px) saturate(1.3);-webkit-backdrop-filter:blur(10px) saturate(1.3);opacity:.84;transition:opacity .2s,transform .15s;";
export const FAB_CSS = "[data-dusk=fab]:hover{opacity:1!important}[data-dusk=fab]:active{transform:scale(.93)}[data-dusk=fab] svg{width:24px;height:24px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}";
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
    el = await d.createElement("div"); await el.setAttribute("x-dusk", "fab"); await el.setAttribute("data-dusk", "fab"); await el.setAttribute("title", title); await el.setAttribute("role", "button"); await el.setAttribute("aria-label", title);
    await place();
    try { await el.setInnerHTML(icon); } catch { await el.setInnerText("◎"); }
    // 2.2.29: 판마다 넘겨주는 이벤트가 달라(포켓리스·일반 리스는 포인터 좌표가 없기도) 포인터·터치·마우스를 모두 받는다
    const xy = (ev) => { const t = ev?.touches?.[0] ?? ev?.changedTouches?.[0] ?? ev; return Number.isFinite(t?.clientX) && Number.isFinite(t?.clientY) ? [t.clientX, t.clientY] : null; };
    let t0 = 0, drag = null, moved = false, handled = false, longT = null, lastStart = 0;
    const cycleSpot = () => { const spots = presetSpots(view.w, view.h), i = spots.findIndex(([x, y]) => Math.abs(x - pos[0]) < 8 && Math.abs(y - pos[1]) < 8); pos = spots[(i + 1) % spots.length]; place().catch(() => {}); save(); };
    const start = (ev) => {
      const now = Date.now(); if (now - lastStart < 350) return; lastStart = now;   // 한 번 누름에 포인터·터치·마우스가 같이 와도 한 번만
      t0 = now; moved = false; handled = false; const p = xy(ev); drag = p ? { sx: p[0], sy: p[1], ox: pos[0], oy: pos[1] } : null;
      clearTimeout(longT); longT = setTimeout(() => { if (t0 && !moved) { handled = true; t0 = 0; drag = null; cycleSpot(); } }, LONG);   // 손 뗀 이벤트가 안 와도 길게 누르면 자리 이동
    };
    const move = (ev) => {
      if (!t0 || !drag) return; const p = xy(ev); if (!p) return;
      const dx = p[0] - drag.sx, dy = p[1] - drag.sy;
      if (!moved && Math.hypot(dx, dy) < MOVE) return;
      moved = true; clearTimeout(longT); pos = clampPos(drag.ox + dx, drag.oy + dy, view.w, view.h); place().catch(() => {});
    };
    const end = () => {
      if (!t0) return; const held = Date.now() - t0; t0 = 0; clearTimeout(longT);
      if (moved) { handled = true; drag = null; save(); return; }
      drag = null;
      if (held >= LONG) { handled = true; cycleSpot(); return; }
      handled = true; Promise.resolve().then(open).catch((e) => log("버튼 열기 실패", e?.message ?? e));
    };
    for (const t of ["pointerdown", "touchstart", "mousedown"]) { try { await el.addEventListener(t, start); } catch { /* 그 이벤트가 없는 판 */ } }
    for (const t of ["pointermove", "touchmove", "mousemove"]) { try { await d.addEventListener(t, move); } catch { /* 없음 */ } }
    for (const t of ["pointerup", "touchend", "mouseup", "pointercancel", "touchcancel"]) { try { await d.addEventListener(t, end); } catch { /* 없음 */ } }
    // 누르기 이벤트가 하나도 안 오는 판: click만 와도 열린다
    await el.addEventListener("click", () => { setTimeout(() => { if (!handled && !t0) Promise.resolve().then(open).catch(() => {}); handled = false; }, 60); });
    await (await d.querySelector("body")).appendChild(el);
    return true;
  }
  async function hide() { const e = el; el = null; if (e) { try { await e.remove(); } catch { /* 이미 없음 */ } } }
  return { show, hide, isOn: () => !!el };
}
