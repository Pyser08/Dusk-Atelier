import { listen, removeWith, runOffs } from "./domlisten.js";
// 2.2.25: 채팅 위 떠 있는 버튼(인물 관계도)을 Dusk가 리스 화면에 직접 그린다 — 동그랗고 반투명, 리스 테마 색을 따라감, 끌어서 옮김(모바일 포함).
// 리스 registerButton(action)은 모양을 못 바꾸고 일반 리스 모바일에선 옮길 수 없었다. 리스 화면 권한(mainDom)이 없으면 쓰지 않는다(호출한 쪽이 예전 버튼으로).
// 끌기는 리스가 넘겨주는 이벤트에 좌표가 있을 때. 좌표가 없는 판에서는 길게 누를 때마다 화면 가장자리 자리를 돌아가며 옮긴다.
export const FAB_POS_KEY = "dusk.ui.fabPos";
// 2.2.50: 크기·투명도는 빠른 설정 → 플로팅 버튼 설정에서 고른다
export const FAB_LOOK_KEY = "dusk.ui.fabLook";
export const FAB_LOOK_DEFAULT = { size: 42, opacity: 0.55 };
export const FAB_SIZES = [[34, "작게"], [42, "보통"], [52, "크게"], [60, "아주 크게"]];
export function cleanLook(v) { const size = Math.round(Number(v?.size)), op = Number(v?.opacity); return { size: size >= 28 && size <= 72 ? size : FAB_LOOK_DEFAULT.size, opacity: op >= 0.2 && op <= 1 ? Math.round(op * 100) / 100 : FAB_LOOK_DEFAULT.opacity }; }
export async function loadFabLook(api) { try { const v = await api.pluginStorage?.getItem?.(FAB_LOOK_KEY); return cleanLook(typeof v === "string" ? JSON.parse(v) : v); } catch { return { ...FAB_LOOK_DEFAULT }; } }
export async function saveFabLook(api, look) { const l = cleanLook(look); try { await api.pluginStorage?.setItem?.(FAB_LOOK_KEY, JSON.stringify(l)); } catch { /* 다음에 */ } return l; }
const SIZE = 42, MARGIN = 12, LONG = 600, MOVE = 6;
// 리스 테마 색(--risu-theme-*)을 따라간다. 없으면 보라
// 2.2.50: 더 작고(42px) 더 투명하게(평소 .55, 누르거나 올리면 1) — 채팅을 덜 가리게
// 2.2.29: 테마 색(리스 판마다 이름이 달라 여러 개를 차례로) 위에 위쪽 빛 반사, 반투명, 흰 테두리·그림자
const THEME = "var(--risu-theme-selected,var(--risu-theme-darkbutton,var(--risu-theme-borderc,#7c5cf0)))";
export const FAB_STYLE = (x, y, look = FAB_LOOK_DEFAULT) => `--ico:${Math.round(look.size * 0.46)}px;position:fixed;left:${Math.round(x)}px;top:${Math.round(y)}px;width:${look.size}px;height:${look.size}px;border-radius:50%;z-index:2147482000;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;box-sizing:border-box;`
  + `background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.42),rgba(255,255,255,0) 58%),color-mix(in srgb,${THEME} 48%,transparent);color:#fff;`
  + `border:1px solid rgba(255,255,255,.28);box-shadow:0 4px 12px rgba(0,0,0,.22),inset 0 1px 3px rgba(255,255,255,.22);backdrop-filter:blur(10px) saturate(1.3);-webkit-backdrop-filter:blur(10px) saturate(1.3);opacity:${look.opacity};transition:opacity .2s,transform .15s;`;
export const FAB_CSS = "[data-dusk=fab]:hover{opacity:1!important}[data-dusk=fab]:active{transform:scale(.93)}[data-dusk=fab] svg{width:var(--ico,19px);height:var(--ico,19px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}";
// 길게 눌렀을 때 돌아가는 자리(오른쪽 아래부터 시계 반대 방향). w·h = 화면 크기
export function presetSpots(w, h, size = SIZE) {
  const r = w - size - MARGIN, b = h - size - 96, l = MARGIN, t = 96, mid = Math.round((h - size) / 2);
  return [[r, b], [r, mid], [r, t], [l, t], [l, mid], [l, b]];
}
export const clampPos = (x, y, w, h, size = SIZE) => [Math.max(MARGIN, Math.min(w - size - MARGIN, x)), Math.max(MARGIN, Math.min(h - size - MARGIN, y))];

export function createFloatButton(api, { ensureDoc, icon, title, open, log = () => {} }) {
  let release = null, el = null, pos = null, view = { w: 390, h: 800 }, look = { ...FAB_LOOK_DEFAULT };
  const save = () => { try { api.pluginStorage?.setItem?.(FAB_POS_KEY, JSON.stringify(pos)); } catch { /* 위치만 못 기억 */ } };
  const load = async () => { try { const v = JSON.parse((await api.pluginStorage?.getItem?.(FAB_POS_KEY)) ?? "null"); return Array.isArray(v) && v.every(Number.isFinite) ? v : null; } catch { return null; } };
  const place = async () => { if (el) await el.setStyleAttribute(FAB_STYLE(pos[0], pos[1], look)); };
  async function measure(d) {
    try { const b = await (await d.querySelector("body"))?.getBoundingClientRect?.(); if (b?.width > 100) view = { w: b.width, h: Math.max(b.height, 300) }; } catch { /* 기본 크기 */ }
    try { const iw = await d.defaultView?.innerHeight; if (Number.isFinite(iw) && iw > 300) view.h = iw; } catch { /* 없음 */ }
  }
  const elOffs = [];
  async function show() {
    const d = await ensureDoc(); if (!d) return false;
    if (el) return true;
    await measure(d);
    look = await loadFabLook(api);
    pos = await load() ?? presetSpots(view.w, view.h, look.size)[0];
    pos = clampPos(pos[0], pos[1], view.w, view.h, look.size);
    const old = await d.querySelector('[x-dusk="fab"]'); if (old) await old.remove();
    await runOffs(elOffs);   // 다시 만들기 전에 옛 버튼 리스너를 뗀다
    el = await d.createElement("div"); await el.setAttribute("x-dusk", "fab"); for (const [n, v] of [["data-dusk", "fab"], ["title", title], ["role", "button"], ["aria-label", title]]) { try { await el.setAttribute(n, v); } catch { /* 리스는 x- 속성만 허락 */ } }
    await place();
    try { await el.setInnerHTML(icon); } catch { await el.setInnerText("◎"); }
    // 2.2.29: 판마다 넘겨주는 이벤트가 달라(포켓리스·일반 리스는 포인터 좌표가 없기도) 포인터·터치·마우스를 모두 받는다
    const xy = (ev) => { const t = ev?.touches?.[0] ?? ev?.changedTouches?.[0] ?? ev; return Number.isFinite(t?.clientX) && Number.isFinite(t?.clientY) ? [t.clientX, t.clientY] : null; };
    let t0 = 0, drag = null, moved = false, handled = false, longT = null, lastStart = 0;
    const cycleSpot = () => { const spots = presetSpots(view.w, view.h, look.size), i = spots.findIndex(([x, y]) => Math.abs(x - pos[0]) < 8 && Math.abs(y - pos[1]) < 8); pos = spots[(i + 1) % spots.length]; place().catch(() => {}); save(); };
    // 신고 #5: 이동 이벤트는 누르는 동안만 받는다(안 누를 때 화면의 모든 이동이 넘어오던 것). 숨기면 모두 뗀다.
    // 떼지 못하는 판(removeEventListener 없음·실패)에서는 한 번만 달고 그대로 쓴다.
    const MOVES = ["pointermove", "touchmove", "mousemove"];
    let armed = null, sticky = false, gone = false;
    const bind = (types, fn) => types.map((t) => { try { return Promise.resolve(d.addEventListener(t, fn)).then((id) => (id == null ? null : [t, id]), () => null); } catch { return null; } });
    const unbind = async (list) => { for (const p of list) { const r = await p; if (!r) continue; try { await d.removeEventListener(r[0], r[1]); } catch { sticky = true; } } };
    const arm = () => { if (!armed && !gone) armed = bind(MOVES, move); };
    const disarm = () => {
      if (!armed || sticky) return;
      const list = armed; armed = null;
      if (typeof d.removeEventListener !== "function") { armed = list; sticky = true; return; }
      unbind(list).then(() => { if (sticky && !armed) armed = list; });
    };
    const start = (ev) => {
      const now = Date.now(); if (now - lastStart < 350) return; lastStart = now;   // 한 번 누름에 포인터·터치·마우스가 같이 와도 한 번만
      arm(); t0 = now; moved = false; handled = false; const p = xy(ev); drag = p ? { sx: p[0], sy: p[1], ox: pos[0], oy: pos[1] } : null;
      clearTimeout(longT); longT = setTimeout(() => { if (t0 && !moved) { handled = true; t0 = 0; drag = null; disarm(); cycleSpot(); } }, LONG);   // 손 뗀 이벤트가 안 와도 길게 누르면 자리 이동
    };
    const move = (ev) => {
      if (!t0 || !drag) return; const p = xy(ev); if (!p) return;
      const dx = p[0] - drag.sx, dy = p[1] - drag.sy;
      if (!moved && Math.hypot(dx, dy) < MOVE) return;
      moved = true; clearTimeout(longT); pos = clampPos(drag.ox + dx, drag.oy + dy, view.w, view.h, look.size); place().catch(() => {});
    };
    const end = () => {
      disarm(); if (!t0) return; const held = Date.now() - t0; t0 = 0; clearTimeout(longT);
      if (moved) { handled = true; drag = null; save(); return; }
      drag = null;
      if (held >= LONG) { handled = true; cycleSpot(); return; }
      handled = true; Promise.resolve().then(open).catch((e) => log("버튼 열기 실패", e?.message ?? e));
    };
    for (const t of ["pointerdown", "touchstart", "mousedown"]) { try { await listen(el, t, start, elOffs); } catch { /* 그 이벤트가 없는 판 */ } }
    const ends = bind(["pointerup", "touchend", "mouseup", "pointercancel", "touchcancel"], end); await Promise.all(ends);
    release = async () => { gone = true; t0 = 0; clearTimeout(longT); const list = [...ends, ...(armed ?? [])]; armed = null; if (typeof d.removeEventListener === "function") await unbind(list); };
    // 누르기 이벤트가 하나도 안 오는 판: click만 와도 열린다
    await listen(el, "click", () => { setTimeout(() => { if (!handled && !t0) Promise.resolve().then(open).catch(() => {}); handled = false; }, 60); }, elOffs);
    await (await d.querySelector("body")).appendChild(el);
    return true;
  }
  // 신고 #31: 버튼 자체의 pointerdown·mousedown·click도 떼고 지운다
  async function hide() { const e = el, off = release; el = null; release = null; if (off) await off().catch(() => {}); if (e) await removeWith(e, elOffs); }
  // 크기·투명도를 바로 바꾼다(저장은 부른 쪽이 saveFabLook으로)
  async function setLook(next) { look = cleanLook(next); if (el && pos) { pos = clampPos(pos[0], pos[1], view.w, view.h, look.size); await place(); } return true; }
  return { show, hide, setLook, isOn: () => !!el };
}
