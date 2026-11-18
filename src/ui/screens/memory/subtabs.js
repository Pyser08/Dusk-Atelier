// 장기기억 애드온: 인물 위키 탭 안의 구역 이동.
// PC·모바일 모두 한 장에 모든 구역을 띄우고, 이동 장치로 그 구역 위치만 찾아간다.
//  · PC: 오른쪽에 떠 있는 아이콘 독. 독 위 마우스 휠 / ↑↓ 로도 옮긴다.
//  · 모바일(≤760px): 아래 홈·기억·관리 막대 바로 위에 떠 있는 반원 휠.
//    - 잡고 돌리면 손가락을 따라 돌고, 칸을 지날 때마다 톡 진동. 놓을 때 빠르게 튕기면 관성으로 더 돈다.
//    - 처음·끝에서는 고무줄처럼 버티고 더 안 돈다(이어 돌지 않음). 멈출 땐 스프링으로 칸에 딱 맞춘다.
//    - 화면을 스크롤하면 지금 위치(구역 사이 비율까지)에 맞춰 휠이 같이 돈다.
// items: [{ id, label, icon?, hint?, n?, render: () => Node | Node[] }]  · state: 마지막으로 본 구역(ctx.state 아래)
import { h } from "../../dom.js";

export const DIAL_STEP = 40;   // 휠에서 이웃 칸 사이 각도(도)
// 위치 p(실수, 0 ~ n-1)일 때 각 칸의 각도
export const dialAngles = (n, p, step = DIAL_STEP) => Array.from({ length: n }, (_, i) => (i - p) * step);
// 끝을 넘어 끌면 고무줄처럼 줄어든 만큼만(최대 0.35칸)
export function rubber(p, n) {
  const lo = 0, hi = n - 1, band = (d) => 0.35 * (1 - 1 / (d / 0.35 + 1));
  return p < lo ? lo - band(lo - p) : p > hi ? hi + band(p - hi) : p;
}
// 놓을 때 속도(칸/ms)로 멈출 칸: 관성 거리 = v × 180ms, 처음·끝 안으로
export const flingTarget = (p, v, n) => Math.max(0, Math.min(n - 1, Math.round(p + v * 180)));
// 구역 윗변들(tops, 오름차순)과 기준선 y → 실수 위치(구역 사이는 비율)
export function progressOf(tops, y) {
  if (!tops.length || y <= tops[0]) return 0;
  for (let i = 0; i < tops.length - 1; i++) if (y < tops[i + 1]) return i + (y - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
  return tops.length - 1;
}
export const isNarrow = (win) => !!win?.ownerDocument?.defaultView?.matchMedia?.("(max-width: 760px)")?.matches;
const scrollerOf = (el) => { for (let e = el?.parentElement; e; e = e.parentElement) { const o = e.ownerDocument.defaultView.getComputedStyle(e).overflowY; if (/(auto|scroll)/.test(o) && e.scrollHeight > e.clientHeight) return e; } return null; };

export function subTabs(ctx, state, key, items, { label = "세부 탭" } = {}) {
  const list = items.filter(Boolean), n = list.length;
  if (n <= 1) return h("div", { class: "rb-sub one" }, ...[].concat(list[0]?.render?.() ?? []));
  const narrow = isNarrow(ctx.win), win = ctx.win?.ownerDocument?.defaultView ?? globalThis;
  const raf = (f) => (win.requestAnimationFrame ?? ((g) => setTimeout(() => g(Date.now()), 16)))(f);
  const secs = list.map((x) => h("section", { class: "rb-sub-sec", "data-sid": x.id, "aria-label": x.label },
    h("h4", { class: "rb-sub-h" }, x.label, x.n ? h("small", null, ` ${x.n}`) : null), ...[].concat(x.render() ?? []).filter(Boolean)));
  let cur = Math.max(0, list.findIndex((x) => x.id === state[key])), sc = null, lock = 0;
  const anchorY = () => (sc ? sc.getBoundingClientRect().top + Math.min(120, sc.clientHeight * 0.25) : 0);
  const scrollTo = (i, smooth = true) => {
    if (!sc) return secs[i].scrollIntoView?.({ behavior: smooth ? "smooth" : "auto", block: "start" });
    const top = sc.scrollTop + secs[i].getBoundingClientRect().top - sc.getBoundingClientRect().top - 8;
    lock = Date.now(); sc.scrollTo?.({ top, behavior: smooth ? "smooth" : "auto" }) ?? (sc.scrollTop = top);
  };
  const posNow = () => {
    if (!sc) return cur;
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) return n - 1;
    return progressOf(secs.map((s) => s.getBoundingClientRect().top), anchorY());
  };
  const nav = narrow ? wheel() : dock();
  const root = h("div", { class: ["rb-sub", narrow ? "dial" : "dock"] }, h("div", { class: "rb-sub-body" }, secs), nav.el);
  nav.set(cur, true);
  setTimeout(() => {
    sc = scrollerOf(root); if (!sc) return;
    // 모바일 휠: 스크롤 영역의 아래 여백만큼 내려서 아래 홈·기억·관리 막대에 딱 붙인다(sticky는 여백 안쪽에서 멈춘다)
    if (narrow) { const pad = parseFloat(sc.ownerDocument.defaultView.getComputedStyle(sc).paddingBottom) || 0; nav.el.style.bottom = `${-pad}px`; }
    if (cur > 0 && root.isConnected) scrollTo(cur, false);
    const onScroll = () => { if (!root.isConnected) return sc.removeEventListener("scroll", onScroll); nav.follow(posNow()); };
    sc.addEventListener("scroll", onScroll, { passive: true });
  }, 0);
  return root;

  function mark(i) { cur = i; state[key] = list[i].id; }
  // ── PC 독 ──
  function dock() {
    const btns = list.map((x, i) => h("button", { type: "button", role: "tab", class: "rb-sub-k", "aria-label": x.label, title: x.hint ? `${x.label} — ${x.hint}` : x.label, onClick: () => go(i) },
      h("span", { class: "ic2", "aria-hidden": "true" }, x.icon || x.label.slice(0, 1)), h("span", { class: "tip" }, x.label, x.n ? ` ${x.n}` : "")));
    const set = (i) => { mark(i); btns.forEach((b, j) => { b.classList.toggle("sel", j === i); b.setAttribute("aria-selected", j === i ? "true" : "false"); b.tabIndex = j === i ? 0 : -1; }); };
    const go = (i) => { const j = Math.max(0, Math.min(n - 1, i)); set(j); scrollTo(j); };
    const el = h("nav", { class: "rb-sub-nav dock", role: "tablist", "aria-label": `${label} — 누르면 그 구역으로 가요` }, btns);
    let wheelAt = 0;
    el.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) < 8) return; e.preventDefault(); const t = Date.now(); if (t - wheelAt < 300) return; wheelAt = t; go(cur + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
    el.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); go(cur + (e.key === "ArrowDown" ? 1 : -1)); btns[cur].focus?.(); } });
    return { el, set, follow: (p) => { if (Date.now() - lock < 700) return; const k = Math.round(p - 0.35); if (k !== cur && k >= 0) set(Math.min(n - 1, k)); } };
  }
  // ── 모바일 휠 ──
  function wheel() {
    let p = cur, anim = 0, last = Math.round(p), dragging = false, moved = false;
    const tick = () => { try { win.navigator?.vibrate?.(6); } catch { /* 진동 없음 */ } };
    const btns = list.map((x, i) => h("button", { type: "button", role: "tab", class: "rb-sub-d", tabindex: "-1", onClick: (e) => { if (moved) { e.preventDefault(); return; } go(i); } },
      h("span", null, x.label), x.n ? h("small", null, String(x.n)) : null));
    const ticks = h("div", { class: "ticks", "aria-hidden": "true" }, Array.from({ length: 36 }, (_, i) => h("i", { style: { "--t": `${i * 10}deg` } })));
    const glow = h("i", { class: "glow", "aria-hidden": "true" });
    const el = h("nav", { class: "rb-sub-dial", role: "tablist", "aria-label": `${label} — 잡고 돌려서 옮겨요` }, h("div", { class: "arc", "aria-hidden": "true" }, ticks, glow), h("i", { class: "notch", "aria-hidden": "true" }), btns);
    const draw = () => {
      const ang = dialAngles(n, p);
      btns.forEach((b, i) => { const a = ang[i], d = Math.abs(i - p);
        b.style.setProperty("--a", `${a}deg`); b.style.setProperty("--s", String(Math.max(0.82, 1.12 - d * 0.3))); b.style.opacity = String(Math.max(0, 1 - Math.max(0, d - 1.2) * 0.9));
        const on = Math.round(p) === i; b.classList.toggle("sel", on); b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; b.style.pointerEvents = Math.abs(a) > 80 ? "none" : ""; });
      ticks.style.setProperty("--r", `${-p * DIAL_STEP}deg`);
      el.classList.toggle("edge", p < -0.02 || p > n - 1 + 0.02);
      const r = Math.round(Math.max(0, Math.min(n - 1, p))); if (r !== last) { last = r; tick(); el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
    };
    // 스프링(감쇠 진동)으로 목표 칸까지. done: 다 멈춘 뒤
    const springTo = (target, v0 = 0, done = null) => {
      cancel(); let v = v0 * 16, t0 = null; const k = 0.16, damp = 0.72;   // v: 칸/프레임
      const step = (t) => { if (t0 === null) t0 = t;
        v = (v + (target - p) * k) * damp; p += v; draw();
        if (Math.abs(target - p) < 0.002 && Math.abs(v) < 0.002) { p = target; draw(); anim = 0; done?.(); return; }
        anim = raf(step); };
      anim = raf(step);
    };
    const cancel = () => { if (anim) (win.cancelAnimationFrame ?? clearTimeout)(anim); anim = 0; };
    const go = (i) => { const j = Math.max(0, Math.min(n - 1, i)); mark(j); scrollTo(j); springTo(j); };
    // 끌기: 가로 거리 → 위치. 최근 이동으로 속도 계산
    const PX = 64;   // 한 칸 = 64px
    let x0 = 0, p0 = 0, hist = [];
    el.addEventListener("pointerdown", (e) => { dragging = true; moved = false; x0 = e.clientX; p0 = p; hist = [[e.timeStamp, e.clientX]]; cancel(); });
    el.addEventListener("pointermove", (e) => {
      if (!dragging) return; const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) { moved = true; el.classList.add("drag"); try { el.setPointerCapture(e.pointerId); } catch { /* 없음 */ } }
      p = rubber(p0 - dx / PX, n); draw();
      hist.push([e.timeStamp, e.clientX]); if (hist.length > 6) hist.shift();
    });
    const end = (e) => {
      if (!dragging) return; dragging = false; el.classList.remove("drag");
      if (!moved) return;
      const a = hist[0], b = hist[hist.length - 1], dt = Math.max(1, (b?.[0] ?? 0) - (a?.[0] ?? 0)), v = -((b?.[1] ?? 0) - (a?.[1] ?? 0)) / PX / dt;   // 칸/ms
      const target = flingTarget(p, Math.abs(v) > 0.0015 ? v : 0, n);
      mark(target); scrollTo(target); springTo(target, Math.max(-0.08, Math.min(0.08, v)));
      setTimeout(() => { moved = false; }, 0); void e;
    };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("lostpointercapture", end);
    el.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(cur + (e.key === "ArrowRight" ? 1 : -1)); } });
    return { el, set: (i) => { mark(i); p = i; last = i; draw(); },
      // 스크롤 위치를 따라 돈다(끄는 중·튕기는 중·눌러서 이동 직후는 빼고)
      follow: (q) => { if (dragging || anim || Date.now() - lock < 650) return; p = q; draw(); const r = Math.round(q); if (r !== cur) mark(r); } };
  }
}

export const SUBTABS_CSS = `
.rb-sub-body{min-width:0;display:flex;flex-direction:column;gap:10px}
.rb-sub-nav .ic{font-style:normal;font-size:15px;line-height:1}
.rb-sub-nav .n{font-size:10.5px;font-variant-numeric:tabular-nums;padding:0 6px;border-radius:999px;background:color-mix(in srgb,currentColor 12%,transparent);line-height:16px}
.rb-sub-nav button{font:inherit;cursor:pointer;border:0;background:transparent;color:var(--rb-sub)}
.rb-sub-nav button:focus-visible{outline:2px solid var(--rb-acc);outline-offset:2px}
/* dock: 오른쪽 떠 있는 독 */
.rb-sub.dock{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:12px;align-items:start}
.rb-sub.dock>.rb-sub-nav{order:2}
.rb-sub-nav.dock{position:sticky;top:8px;display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:26px;background:color-mix(in srgb,var(--rb-surf) 85%,transparent);border:1px solid var(--rb-line2);box-shadow:0 6px 18px color-mix(in srgb,#000 10%,transparent)}
.rb-sub-k{position:relative;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;transition:background .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),transform .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-sub-k .ic2{font-size:17px;line-height:1}
.rb-sub-k.sel{background:var(--rb-acc-grad,var(--rb-acc));transform:scale(1.06)}
.rb-sub-k .tip{position:absolute;right:50px;top:50%;transform:translateY(-50%) translateX(6px);white-space:nowrap;padding:4px 10px;border-radius:8px;background:var(--rb-text);color:var(--rb-win);font-size:12px;opacity:0;pointer-events:none;transition:opacity .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),transform .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}

@media (hover:hover){.rb-sub-k:hover{background:var(--rb-surf2)}.rb-sub-k:hover .tip{opacity:1;transform:translateY(-50%)}}
.rb-sub-k:focus-visible .tip{opacity:1;transform:translateY(-50%)}
/* PC 한 장: 구역 사이를 넉넉히 띄운다 */
.rb-sub.dock>.rb-sub-body,.rb-sub.dial>.rb-sub-body{gap:0}
.rb-sub-sec{display:flex;flex-direction:column;gap:10px;scroll-margin-top:12px}
.rb-sub-sec+.rb-sub-sec{margin-top:36px}
.rb-sub-h{display:flex;align-items:center;gap:8px;margin:0;font-size:13px;font-weight:800;color:var(--rb-text);letter-spacing:.02em}.rb-sub-h::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--rb-acc-grad,var(--rb-acc));box-shadow:0 0 0 3px color-mix(in srgb,var(--rb-acc) 20%,transparent)}.rb-sub-h::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--rb-line2),transparent)}.rb-sub-h small{color:var(--rb-mute);font-weight:500}
/* 모바일 휠: 스크롤 영역 아래(앱 탭 막대 바로 위)에 붙어 떠 있다 */
.rb-sub.dial{display:flex;flex-direction:column}
.rb-sub-dial{position:sticky;bottom:0;margin:8px -12px -4px;height:92px;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab;z-index:5;
  background:linear-gradient(to top,var(--rb-win) 0,color-mix(in srgb,var(--rb-win) 70%,transparent) 55%,transparent);pointer-events:none}
.rb-sub-dial>*{pointer-events:auto}
.rb-sub-dial.drag{cursor:grabbing}
.rb-sub-dial .arc{position:absolute;left:50%;top:14px;width:330px;height:330px;margin-left:-165px;border-radius:50%;
  background:conic-gradient(from 180deg,color-mix(in srgb,var(--rb-acc) 22%,var(--rb-surf)),var(--rb-surf) 25%,var(--rb-surf) 75%,color-mix(in srgb,var(--rb-acc) 22%,var(--rb-surf)));
  border:1px solid color-mix(in srgb,var(--rb-acc) 30%,var(--rb-line2));
  box-shadow:0 -10px 26px color-mix(in srgb,var(--rb-acc) 18%,transparent),inset 0 2px 0 color-mix(in srgb,#fff 60%,transparent),inset 0 0 0 7px color-mix(in srgb,var(--rb-surf2) 70%,transparent)}
.rb-sub-dial .arc::after{content:"";position:absolute;inset:34px;border-radius:50%;border:1px dashed color-mix(in srgb,var(--rb-acc) 25%,var(--rb-line2))}
.rb-sub-dial .ticks{position:absolute;inset:0;transform:rotate(var(--r,0deg));transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.rb-sub-dial.drag .ticks{transition:none}
.rb-sub-dial .ticks i{position:absolute;left:50%;top:3px;width:2px;height:5px;margin-left:-1px;border-radius:1px;background:color-mix(in srgb,var(--rb-acc) 45%,var(--rb-line));transform-origin:50% 162px;transform:rotate(var(--t))}
.rb-sub-dial .ticks i:nth-child(3n+1){height:9px;background:color-mix(in srgb,var(--rb-acc) 70%,var(--rb-line))}
.rb-sub-dial .notch{position:absolute;left:50%;top:8px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:var(--rb-acc-grad,var(--rb-acc));box-shadow:0 0 8px var(--rb-acc);z-index:2}
.rb-sub-dial .glow{position:absolute;left:50%;top:-30px;width:140px;height:80px;margin-left:-70px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--rb-acc) 35%,transparent),transparent);opacity:.55;transition:opacity .3s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-sub-dial.drag .glow{opacity:.9}
.rb-sub-dial.edge .arc{transform:translateY(2px);transition:transform .12s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-sub-dial.pop .notch{animation:rbNotch .28s var(--rb-ease,cubic-bezier(.22,1.12,.36,1))}
@keyframes rbNotch{0%{transform:scale(1)}40%{transform:scale(1.6)}100%{transform:scale(1)}}
.rb-sub-dial .ticks{transition:none!important}
.rb-sub-d{position:absolute;left:50%;top:180px;width:96px;margin-left:-48px;height:30px;border:0;background:transparent;color:var(--rb-sub);font:inherit;font-size:12.5px;cursor:inherit;border-radius:999px;will-change:transform;
  transform-origin:50% 0;transform:rotate(var(--a)) translateY(-142px) rotate(calc(-1 * var(--a))) scale(var(--s,1));transition:color .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),background .25s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),box-shadow .25s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1));display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap}
.rb-sub-d small{font-size:10px;color:var(--rb-mute)}
.rb-sub-d.sel{color:var(--rb-on-acc,#fff);font-weight:700;background:var(--rb-acc-grad,var(--rb-acc));box-shadow:0 4px 12px color-mix(in srgb,var(--rb-acc) 35%,transparent)}
.rb-sub-d.sel small{color:inherit;opacity:.8}
@media (prefers-reduced-motion:reduce){.rb-sub-dial.pop .notch{animation:none}}
`;
