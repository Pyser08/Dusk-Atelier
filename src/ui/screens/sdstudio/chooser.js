// 에셋 제작 — 대표 고르기: 씬마다 후보 그림을 펼쳐 놓고 ←/→로 넘기며 F로 즐겨찾기, Enter로 정하고 다음 씬.
import { createLazy } from "./thumbs.js";
import { h, replace } from "../../dom.js";
import { btn } from "../../kit.js";
import * as P from "../../../engine/sdstudio/project.js";
import { ico } from "./look.js";

// scenes: [{ cid, sid }] — 그림이 있는 씬만 돌아요. opts.onlyNoFav = 즐겨찾기 없는 씬만
export function openChooser(S, scenes, { start = 0, onlyNoFav = false } = {}) {
  let only = onlyNoFav, si = 0, ci = 0, url = null;
  const all = scenes.filter((x) => P.sceneOf(S.proj, x.cid, x.sid)?.images.length);
  const list = () => all.filter((x) => { const sc = P.sceneOf(S.proj, x.cid, x.sid); return sc?.images.length && (!only || !P.hasFav(sc) || x === cur0); });
  let cur0 = all[start] ?? null;   // 지금 보는 씬은 즐겨찾기를 정해도 목록에서 바로 빠지지 않게
  const img = h("img", { alt: "후보 그림", id: "sds-ch-img" });
  const navL = h("button", { type: "button", class: "nav", style: "left:12px", "aria-label": "이전 후보", onClick: () => move(-1) }, ico("chevL", 22));
  const navR = h("button", { type: "button", class: "nav", style: "right:12px", "aria-label": "다음 후보", onClick: () => move(1) }, ico("chevR", 22));
  const star = h("span", { class: "sds-ch-star", "aria-hidden": "true" }, "★");
  const stage = h("div", { class: "stage" }, img, star, navL, navR);
  const head = h("div", { class: "rb-full-head", style: "min-height:52px" });
  const strip = h("div", { class: "sds-ch-strip rb-scroll", id: "sds-ch-strip" });
  const acts = h("div", { class: "sds-ch-acts" });
  const over = h("div", { class: "sds-over", role: "dialog", "aria-label": "대표 고르기", id: "sds-chooser", tabIndex: -1 }, head, h("div", { class: "sds-ch" }, stage, strip, acts));
  const close = () => { stripLazy?.disconnect(); if (url) URL.revokeObjectURL(url); over.remove(); S.paint(); };
  const scenesNow = () => list();
  const cur = () => { const L = scenesNow(); const x = L[si]; return x ? { x, sc: P.sceneOf(S.proj, x.cid, x.sid), c: P.charOf(S.proj, x.cid) } : null; };
  const imgs = () => { const k = cur(); return k ? P.sortedImages(k.sc) : []; };
  function move(d) { const n = imgs().length; if (!n) return; ci = (ci + d + n) % n; paint(); }
  function goScene(d) {
    const L = scenesNow(); if (!L.length) return;
    si = Math.max(0, Math.min(L.length - 1, si + d)); cur0 = L[si]; ci = 0;
    const L2 = scenesNow(); si = Math.max(0, L2.indexOf(cur0)); paint();
  }
  function fav(on) {
    const k = cur(); const im = imgs()[ci]; if (!k || !im) return;
    S.set(P.setImage(S.proj, k.x.cid, k.x.sid, im.path, { fav: on ?? !im.fav }));
    // 정렬이 즐겨찾기를 앞으로 당기므로 보던 그림을 따라간다
    ci = Math.max(0, imgs().findIndex((i) => i.path === im.path)); paint();
  }
  function decide() {
    const im = imgs()[ci]; if (!im) return;
    if (!im.fav) fav(true);
    const L = scenesNow(), at = L.indexOf(cur0);
    if (at >= L.length - 1) { S.toast("마지막 씬이에요"); return; }
    cur0 = L[at + 1]; ci = 0; si = Math.max(0, scenesNow().indexOf(cur0)); paint();
  }
  async function paint() {
    const L = scenesNow();
    if (!L.length) { S.toast(only ? "즐겨찾기 없는 씬이 없어요" : "그림이 있는 씬이 없어요"); return close(); }
    if (!cur0 || !L.includes(cur0)) cur0 = L[Math.min(si, L.length - 1)];
    si = L.indexOf(cur0);
    const { x, sc, c } = cur(), list2 = P.sortedImages(sc);
    ci = Math.max(0, Math.min(ci, list2.length - 1));
    const im = list2[ci], favN = list2.filter((i) => i.fav).length;
    const noFavN = all.filter((y) => { const s2 = P.sceneOf(S.proj, y.cid, y.sid); return s2 && !P.hasFav(s2); }).length;
    replace(head,
      h("button", { type: "button", class: "rb-icon-btn", "aria-label": "닫기", onClick: close }, ico("x", 20)),
      h("div", { class: "ttl" }, h("small", null, `씬 ${si + 1} / ${L.length} · 즐겨찾기 없는 씬 ${noFavN}`), h("b", { id: "sds-ch-title" }, `${c.name} › ${sc.name}`)),
      h("span", { class: "sp", style: "flex:1" }),
      h("label", { class: "sds-sw", style: "display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;cursor:pointer" },
        h("input", { type: "checkbox", id: "sds-ch-only", checked: only, onChange: (e) => { only = e.target.checked; paint(); } }), "즐겨찾기 없는 씬만"));
    star.hidden = !im?.fav;
    navL.hidden = navR.hidden = list2.length < 2;
    // 후보 줄은 씬(목록)이 바뀔 때만 새로 그림 — 넘길 때마다 썸네일 수십 장을 다시 부르지 않게. 보일 때만 4장씩
    const sig = list2.map((it) => `${it.path}${it.fav ? "*" : ""}`).join("|");
    if (sig === stripSig) { [...strip.children].forEach((b, k) => { b.classList.toggle("on", k === ci); b.setAttribute("aria-pressed", String(k === ci)); }); }
    else { stripSig = sig; stripLazy?.disconnect(); stripLazy = createLazy(strip, (p) => S.loadThumb(p), { concurrency: 4 });
    replace(strip, ...list2.map((it, k) => {
      const b = h("button", { type: "button", class: ["sds-ch-th", k === ci && "on", it.fav && "fav"], "aria-label": `후보 ${k + 1}${it.fav ? " 즐겨찾기" : ""}`, "aria-pressed": String(k === ci), onClick: () => { ci = k; paint(); }, onDblclick: () => { ci = k; fav(); } },
        S.thumb(it.path, { lazy: stripLazy }), h("span", { class: "n" }, String(k + 1)), it.fav ? h("span", { class: "f" }, "★") : null);
      return b;
    })); }
    strip.querySelector(".on")?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    replace(acts,
      h("span", { class: "rb-muted", style: "font-size:12px" }, `후보 ${ci + 1} / ${list2.length} · 즐겨찾기 ${favN}`),
      h("span", { class: "sp", style: "flex:1" }),
      btn("이전 씬", { size: "sm", icon: "chevL", id: "sds-ch-prev", disabled: si <= 0, onClick: () => goScene(-1) }),
      btn(im?.fav ? "즐겨찾기 풀기 (F)" : "즐겨찾기 (F)", { size: "sm", icon: "sparkle", id: "sds-ch-fav", kind: im?.fav ? "primary" : "", onClick: () => fav() }),
      btn("이걸로 정하고 다음 씬 (Enter)", { size: "sm", kind: "primary", icon: "check", id: "sds-ch-next", onClick: () => decide() }),
      btn("다음 씬", { size: "sm", icon: "chevR", id: "sds-ch-skip", disabled: si >= L.length - 1, onClick: () => goScene(1) }));
    if (!over.contains(document.activeElement) || document.activeElement === over) over.focus({ preventScroll: true });
    if (!im) { img.removeAttribute("src"); return; }
    // 썸네일을 먼저 보여 주고(바로), 원본으로 바꿈. 앞뒤 후보 원본은 미리 받아 둠
    const want = im.path;
    S.loadThumb(want).then((t) => { if (t && imgs()[ci]?.path === want && img.dataset.full !== want) img.src = t; }).catch(() => {});
    for (const d of [1, -1, 2]) { const nb = list2[ci + d]; if (nb) S.bytes(nb.path).catch(() => {}); }
    try { const u = await S.url(im.path); img.dataset.full = want; if (imgs()[ci]?.path !== im.path) { URL.revokeObjectURL(u); return; } if (url) URL.revokeObjectURL(url); url = u; img.src = u; } catch { img.removeAttribute("src"); }
  }
  over.addEventListener("keydown", (e) => {
    if (S.ctx.win.querySelector(".rb-modal, .rb-menu")) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName ?? "") && e.target.type !== "checkbox") return;
    const k = e.key;
    if (k === "Escape") { e.stopPropagation(); close(); return; }
    const map = { ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowUp: () => goScene(-1), ArrowDown: () => goScene(1), PageUp: () => goScene(-1), PageDown: () => goScene(1), Enter: () => decide(), f: () => fav(), F: () => fav() };
    const fn = map[k] ?? (/^[1-9]$/.test(k) ? () => { const n = Number(k) - 1; if (n < imgs().length) { ci = n; paint(); } } : null);
    if (!fn) return;
    e.preventDefault(); e.stopPropagation(); fn();
  });
  let stripSig = "", stripLazy = null;
  S.el.appendChild(over);
  over.focus();
  paint();
  return { close };
}
