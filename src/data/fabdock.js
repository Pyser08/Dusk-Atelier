// 떠 있는 세로 막대(장기기억·Dusk Saga 같이 씀): 장기기억의 동그란 버튼(인물 관계도)과 전투·가방을 세로로 길고 얇은 막대 하나에 모은다.
// 리스 화면 권한(mainDom)이 있을 때만. 없으면 부른 쪽이 리스 버튼(registerButton)으로 돌아간다. 생김새는 Dusk 플로팅 버튼(floatbtn.js)과 같은 계열.
import { loadFabLook, clampPos, cleanLook } from "./floatbtn.js";

const POS_KEY0 = "dusk.saga.dockPos", MARGIN = 12, LONG = 600, MOVE = 6;
const THEME = "var(--risu-theme-selected,var(--risu-theme-darkbutton,var(--risu-theme-borderc,#7c5cf0)))";
const ICONS = {
  relmap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M11 7.3 6.2 15.7M13 7.3l4.8 8.4M7.5 18h9"/></svg>',
  gen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2"/></svg>',
  regress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/><path d="M9.5 18.5h5" stroke-width="2.6"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 8h12l1 12H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 13h6"/></svg>',
};

/** items: [{ key, title, open }] — 위에서 아래로 */
export function createDock(api, { ensureDoc, items, log = () => {}, posKey = POS_KEY0, tag = "sagadock" }) {
  const POS_KEY = posKey;
  let el = null, pos = null, view = { w: 390, h: 800 }, look = { size: 42, opacity: 0.55 }, release = null, list = items.slice();
  const W = () => Math.round(look.size * 0.74), H = () => Math.round(look.size * 0.82) * list.length + 8;
  const style = () => `position:fixed;left:${Math.round(pos[0])}px;top:${Math.round(pos[1])}px;width:${W()}px;padding:4px 0;border-radius:${W() / 2}px;z-index:2147482000;display:flex;flex-direction:column;align-items:stretch;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;`
    + `background:linear-gradient(90deg,rgba(255,255,255,.30),rgba(255,255,255,0) 60%),color-mix(in srgb,${THEME} 48%,transparent);color:#fff;border:1px solid rgba(255,255,255,.28);box-shadow:0 4px 12px rgba(0,0,0,.22),inset 0 1px 3px rgba(255,255,255,.22);backdrop-filter:blur(10px) saturate(1.3);-webkit-backdrop-filter:blur(10px) saturate(1.3);opacity:${look.opacity};transition:opacity .2s;`;
  const itemStyle = (i) => `height:${Math.round(look.size * 0.82)}px;display:flex;align-items:center;justify-content:center;${i ? "border-top:1px solid rgba(255,255,255,.22);" : ""}`;
  const icoCss = () => `width:${Math.round(look.size * 0.42)}px;height:${Math.round(look.size * 0.42)}px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));pointer-events:none`;
  const save = () => { try { api.pluginStorage?.setItem?.(POS_KEY, JSON.stringify(pos)); } catch { /* 위치만 못 기억 */ } };
  const load = async () => { try { const v = JSON.parse((await api.pluginStorage?.getItem?.(POS_KEY)) ?? "null"); return Array.isArray(v) && v.every(Number.isFinite) ? v : null; } catch { return null; } };
  const fit = (x, y) => { const p = clampPos(x, y, view.w, view.h - H() + look.size, look.size); return [Math.max(MARGIN, Math.min(view.w - W() - MARGIN, p[0])), Math.max(MARGIN, Math.min(view.h - H() - MARGIN, p[1]))]; };
  const place = async () => { if (el) await el.setStyleAttribute(style()); };
  const spots = () => { const r = view.w - W() - MARGIN, l = MARGIN, mid = Math.round((view.h - H()) / 2), b = view.h - H() - 96, t = 96; return [[r, b], [r, mid], [r, t], [l, t], [l, mid], [l, b]]; };
  async function show() {
    const d = await ensureDoc(); if (!d) return false; if (el) return true;
    try { const b = await (await d.querySelector("body"))?.getBoundingClientRect?.(); if (b?.width > 100) view = { w: b.width, h: Math.max(b.height, 300) }; } catch { /* 기본 */ }
    try { const ih = await d.defaultView?.innerHeight; if (Number.isFinite(ih) && ih > 300) view.h = ih; } catch { /* 없음 */ }
    look = await loadFabLook(api); pos = fit(...((await load()) ?? spots()[1]));
    const old = await d.querySelector(`[x-dusk="${tag}"]`); if (old) await old.remove();
    el = await d.createElement("div"); await el.setAttribute("x-dusk", tag); try { await el.setAttribute("role", "toolbar"); await el.setAttribute("aria-label", "Dusk 바로가기"); } catch { /* x- 속성만 */ }
    await place();
    await el.setInnerHTML(list.map((it, i) => `<div x-dusk-i="${i}" title="${it.title}" style="${itemStyle(i)}"><span style="${icoCss()};display:block">${it.icon ?? ICONS[it.key] ?? "◎"}</span></div>`).join("").replace(/<svg /g, `<svg style="${icoCss()}" `));
    const xy = (ev) => { const t = ev?.touches?.[0] ?? ev?.changedTouches?.[0] ?? ev; return Number.isFinite(t?.clientX) && Number.isFinite(t?.clientY) ? [t.clientX, t.clientY] : null; };
    const which = (p) => { if (!p) return -1; const k = Math.floor((p[1] - pos[1] - 4) / Math.round(look.size * 0.82)); return k >= 0 && k < list.length ? k : -1; };
    let t0 = 0, drag = null, moved = false, handled = false, longT = null, lastStart = 0, hit = -1, last = -1;
    const fire = (i) => { const it = list[i]; if (it) Promise.resolve().then(it.open).catch((e) => log("열기 실패", e?.message ?? e)); };
    const cycle = () => { const s = spots(), i = s.findIndex(([x, y]) => Math.abs(x - pos[0]) < 8 && Math.abs(y - pos[1]) < 8); pos = s[(i + 1) % s.length]; place().catch(() => {}); save(); };
    const start = (ev, i) => { const now = Date.now(); if (now - lastStart < 350) return; lastStart = now; t0 = now; moved = false; handled = false; const p = xy(ev); hit = i ?? which(p); last = hit; drag = p ? { sx: p[0], sy: p[1], ox: pos[0], oy: pos[1] } : null; clearTimeout(longT); longT = setTimeout(() => { if (t0 && !moved) { handled = true; t0 = 0; drag = null; cycle(); } }, LONG); };
    const move = (ev) => { if (!t0 || !drag) return; const p = xy(ev); if (!p) return; const dx = p[0] - drag.sx, dy = p[1] - drag.sy; if (!moved && Math.hypot(dx, dy) < MOVE) return; moved = true; clearTimeout(longT); pos = fit(drag.ox + dx, drag.oy + dy); place().catch(() => {}); };
    const end = () => { if (!t0) return; const held = Date.now() - t0; t0 = 0; clearTimeout(longT); if (moved) { handled = true; drag = null; save(); return; } drag = null; if (held >= LONG) { handled = true; cycle(); return; } handled = true; fire(hit); };
    const offs = [];
    const on = async (target, t, fn) => { try { const id = await target.addEventListener(t, fn); if (id != null) offs.push([target, t, id]); } catch { /* 그 이벤트가 없는 판 */ } };
    // 칸마다 누르기를 받아 어느 칸인지 안다(좌표가 없는 판 대비)
    const kids = []; for (let i = 0; i < list.length; i++) { const k = await el.querySelector(`[x-dusk-i="${i}"]`); kids.push(k); if (k) for (const t of ["pointerdown", "touchstart", "mousedown"]) await on(k, t, (ev) => start(ev, i)); }
    if (!kids.some(Boolean)) for (const t of ["pointerdown", "touchstart", "mousedown"]) await on(el, t, (ev) => start(ev));
    for (const t of ["pointermove", "touchmove", "mousemove"]) await on(d, t, move);
    for (const t of ["pointerup", "touchend", "mouseup", "pointercancel", "touchcancel"]) await on(d, t, end);
    for (let i = 0; i < kids.length; i++) if (kids[i]) await on(kids[i], "click", () => { setTimeout(() => { if (!handled && !t0) fire(i); handled = false; }, 60); });
    release = async () => { t0 = 0; clearTimeout(longT); for (const [tg, t, id] of offs.splice(0)) { try { await tg.removeEventListener?.(t, id); } catch { /* 없음 */ } } };
    await (await d.querySelector("body")).appendChild(el); return true;
  }
  async function hide() { const e = el, off = release; el = null; release = null; if (off) await off().catch(() => {}); if (e) { try { await e.remove(); } catch { /* 이미 없음 */ } } }
  /** 칸 목록을 바꾼다(장기기억이 늦게 켜졌을 때 등) */
  async function setItems(next) { const same = next.map((x) => x.key).join() === list.map((x) => x.key).join(); list = next.slice(); if (!same && el) { await hide(); await show(); } }
  async function setLook(next) { look = cleanLook(next); if (el) { pos = fit(pos[0], pos[1]); await hide(); await show(); } return true; }
  return { show, hide, setItems, setLook, isOn: () => !!el, items: () => list.slice() };
}
