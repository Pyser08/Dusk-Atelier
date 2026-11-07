import { PRESETS, mergeLabels } from "./stealth.js";
import { setFoldOn } from "./stealth-fold.js";
// 더스크 스텔스 '껍데기': 클로드·클로드 코드 모양의 왼쪽 사이드바와 위쪽 제목 줄을 플러그인이 리스 화면 문서에 직접 그린다.
// · 최근 항목 = 지금 열린 봇의 채팅 목록(누르면 그 채팅으로)
// · 아래 설정 = 순정 리스 사이드바에 있던 모듈 토글(customModuleToggle) 켜고 끄기
// 순수 함수(parseToggles·chatRows·shellHtml)와 화면에 붙이는 mountShell로 나뉜다.

var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** customModuleToggle 글 → [{key,label,type,options}] . 형식: key=라벨 / key=라벨=select=가,나 / key=라벨=text / key=라벨=textarea. 구분선·그룹·설명 줄은 건너뛴다. */
export function parseToggles(text) {
  const out = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const p = line.split("=").map((x) => x.trim());
    if (p.length < 2 || !p[0]) continue;
    const type = (p[2] ?? "").toLowerCase();
    if (["group", "groupend", "divider", "caption"].includes(type)) continue;
    if (type === "select") out.push({ key: p[0], label: p[1] || p[0], type: "select", options: String(p.slice(3).join("=")).split(",").map((x) => x.trim()).filter(Boolean) });
    else if (type === "text" || type === "textarea") out.push({ key: p[0], label: p[1] || p[0], type: "text", options: [] });
    else out.push({ key: p[0], label: p[1] || p[0], type: "toggle", options: [] });
  }
  return out;
}
/** 같은 key는 한 번만(앞이 우선). */
export function collectToggles(sources) {
  const seen = new Set(), out = [];
  for (const s of sources) for (const t of parseToggles(s)) if (!seen.has(t.key)) { seen.add(t.key); out.push(t); }
  return out;
}
export var toggleVarKey = (key) => `toggle_${key}`;
export function toggleValue(t, vars) {
  const v = vars?.[toggleVarKey(t.key)];
  if (t.type === "toggle") return v === "1" || v === 1 || v === true;
  return v == null ? "" : String(v);
}

/** 봇 한 개의 채팅 목록 → 최근 항목 줄(위에서 최근). 이름이 없으면 "채팅 N". */
export function chatRows(char, currentIndex, limit = 30) {
  const chats = Array.isArray(char?.chats) ? char.chats : [];
  const rows = chats.map((c, i) => ({ index: i, name: String(c?.name || c?.title || "").trim() || `채팅 ${i + 1}`, current: i === currentIndex, at: Number(c?.lastDate ?? c?.date ?? 0) || 0 }));
  rows.sort((a, b) => (b.at - a.at) || (b.index - a.index));
  return rows.slice(0, limit);
}

export var SHELL_KINDS = {
  claude: { word: "Claude", wordSerif: true, items: [["plus", "새로 만들기"], ["search", "검색"], ["folder", "프로젝트"], ["cube", "아티팩트"], ["clock", "예약됨"], ["bag", "사용자 지정"]], recent: "최근 항목", empty: "", plan: "Pro" },
  code: { word: "Code", wordSerif: true, items: [["plus", "새로 만들기"], ["search", "검색"], ["cube", "아티팩트"], ["bag", "사용자 지정"], ["more", "더 보기"]], recent: "", empty: "시작한 세션이 여기에 표시됩니다", plan: "Pro" }
};
var ICON = {
  menu: '<path d="M4 7h16M4 12h10M4 17h13"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>', vdots: '<path d="M12 6h.01M12 12h.01M12 18h.01" stroke-width="3"/>', stack: '<rect x="6" y="9" width="12" height="11" rx="2"/><path d="M8 6h8M10 3h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>', folder: '<path d="M4 7h6l2 2h8v9H4z"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  bag: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6h6v2"/>', more: '<path d="M6 12h.01M12 12h.01M18 12h.01"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'
};
var ico = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] ?? ""}</svg>`;

export var SHELL_CSS = `
html body [x-dusk][x-vis="0"]{display:none !important}
[x-c~="st-sb-fold"]{font-size:16px;line-height:1;font-weight:600;width:28px;height:28px}
[x-dusk="stealth-sb"][x-fold="1"]{top:auto;width:auto;left:10px;bottom:10px;border:1px solid var(--st-line2);border-radius:10px}
[x-dusk="stealth-sb"][x-fold="1"] > :not([x-c~="st-sb-foot"]){display:none}
[x-dusk="stealth-sb"][x-fold="1"] [x-c~="st-sb-foot"]{border-top:0;padding:4px}
[x-dusk="stealth-sb"][x-fold="1"] [x-c~="st-sb-foot"] > :not([x-c~="st-sb-fold"]){display:none}
[x-dusk="stealth-sb"][x-fold="1"] [x-c~="st-sb-fold"]{transform:rotate(180deg)}
body[x-dusk-fold="1"][x-dusk-st]{padding-left:0 !important}
body[x-dusk-fold="1"] [x-dusk="stealth-top"]{display:none !important}
body[x-dusk-fold="1"] [x-dusk="stealth-note"]{left:0}
[x-dusk="stealth-sb"]{position:fixed;left:0;top:0;bottom:0;width:var(--st-sw,260px);z-index:9000;display:flex;flex-direction:column;box-sizing:border-box;background:var(--st-side);border-right:1px solid var(--st-line);color:var(--st-fg);font-size:13.5px;user-select:none}
[x-dusk="stealth-sb"] *{box-sizing:border-box}
[x-c~="st-sb-head"]{display:flex;align-items:center;gap:8px;padding:14px 14px 8px}
[x-c~="st-sb-word"]{font-size:21px;font-weight:600;letter-spacing:-.01em}
[x-c~="st-sb-word"][x-c~="serif"]{font-family:"Tiempos Headline","Source Serif Pro",Georgia,"Noto Serif KR","Nanum Myeongjo",serif !important}
[x-c~="st-sb-nav"]{display:flex;flex-direction:column;padding:6px 8px;gap:1px}
[x-c~="st-sb-row"]{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;color:var(--st-fg);cursor:default;border:0;background:transparent;text-align:left;font:inherit;width:100%}
[x-c~="st-sb-row"][x-c~="act"]{cursor:pointer}
[x-c~="st-sb-row"]:hover{background:var(--st-bubble)}
[x-c~="st-sb-row"][x-c~="on"]{background:var(--st-bubble)}
[x-c~="st-sb-sec"]{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 6px;color:var(--st-dim);font-size:12px}
[x-c~="st-sb-list"]{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px}
[x-c~="st-sb-item"]{display:block;width:100%;padding:8px 10px;border-radius:8px;border:0;background:transparent;color:var(--st-fg);font:inherit;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[x-c~="st-sb-item"]:hover,[x-c~="st-sb-item"][x-c~="on"]{background:var(--st-bubble)}
[x-c~="st-sb-empty"]{padding:28px 16px;color:var(--st-dim);text-align:center;font-size:12.5px}
[x-c~="st-sb-foot"]{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--st-line)}
[x-c~="st-sb-av"]{width:26px;height:26px;border-radius:50%;background:var(--st-bubble);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex:none}
[x-c~="st-sb-who"]{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[x-c~="st-sb-who"] small{color:var(--st-dim);margin-left:4px;font-size:12px}
[x-c~="st-sb-gear"]{border:0;background:transparent;color:var(--st-fg2);padding:6px;border-radius:8px;cursor:pointer;display:flex}
[x-c~="st-sb-gear"]:hover{background:var(--st-bubble);color:var(--st-fg)}
[x-dusk="stealth-top"]{position:fixed;left:var(--st-sw,260px);right:0;top:0;height:44px;z-index:8990;display:flex;align-items:center;padding:0 24px;background:var(--st-bg);border-bottom:1px solid var(--st-line);color:var(--st-fg2);font-size:13.5px;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[x-dusk="stealth-top"] b{color:var(--st-fg);font-weight:500;margin-right:8px}
[x-dusk="stealth-note"]{position:fixed;left:var(--st-sw,260px);right:0;bottom:10px;z-index:8980;text-align:center;color:var(--st-dim);font-size:12px;pointer-events:none}
[x-dusk="stealth-pop"]{position:fixed;left:10px;bottom:56px;width:calc(var(--st-sw,260px) - 20px);max-height:60vh;overflow-y:auto;z-index:9100;background:var(--st-input);border:1px solid var(--st-line2);border-radius:12px;padding:8px;box-shadow:0 8px 28px rgba(0,0,0,.35);color:var(--st-fg);font-size:13px}
[x-dusk="stealth-pop"] h4{margin:4px 8px 6px;font-size:12px;font-weight:500;color:var(--st-dim)}
[x-c~="st-pop-row"]{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 8px;border-radius:8px}
[x-c~="st-pop-row"]:hover{background:var(--st-bubble)}
[x-c~="st-pop-row"] label{flex:1;min-width:0}
[x-dusk="stealth-pop"] select,[x-dusk="stealth-pop"] input[type=text]{max-width:120px;background:var(--st-bg);color:var(--st-fg);border:1px solid var(--st-line2);border-radius:6px;padding:3px 6px;font:inherit}
[x-c~="st-sw"]{appearance:none;width:30px;height:18px;border-radius:9px;background:var(--st-line2);position:relative;cursor:pointer;flex:none;border:0}
[x-c~="st-sw"]::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .12s}
[x-c~="st-sw"]:checked{background:var(--st-accent)}
[x-c~="st-sw"]:checked::after{left:14px}
[x-c~="st-top-btn"]{display:none}
[x-c~="st-top-t"]{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
[x-c~="st-top-ico"]{display:none}
[x-c~="st-top-sub"]{color:var(--st-fg2);overflow:hidden;text-overflow:ellipsis}
@media (max-width:760px){
[x-dusk="stealth-note"]{display:none}
[x-dusk="stealth-sb"][x-fold="1"]{display:none}
[x-dusk="stealth-sb"][x-fold="0"]{width:min(86vw,320px);z-index:9200;box-shadow:0 0 0 100vmax rgba(0,0,0,.45)}
body[x-dusk-st] [x-dusk="stealth-top"]{display:flex !important;left:0;height:56px;padding:0 6px 0 4px;gap:2px;border-bottom:0;pointer-events:none;font-size:16px}
[x-c~="st-top-more"]{pointer-events:auto}
[x-c~="st-top-btn"]{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;border:0;background:transparent;color:var(--st-fg);border-radius:10px;cursor:pointer;padding:0}
[x-c~="st-top-ico"]{display:inline-flex;color:var(--st-fg2)}
[x-dusk="stealth-top"] b{font-weight:600;color:var(--st-fg)}
[x-c~="st-top-sub"]{font-weight:400;color:var(--st-fg2)}
[x-dusk="stealth-top"][x-plain="1"]{left:auto;width:auto;background:transparent}
[x-dusk="stealth-top"][x-plain="1"] > :not([x-c~="st-top-more"]){display:none !important}
}

`;

/** 사이드바 HTML. model: {kind, user, plan, rows[], title, sub, nativeToggles} */
export function shellHtml(model) {
  const K = SHELL_KINDS[model.kind] ?? SHELL_KINDS.claude;
  const nav = K.items.map(([ic, name], i) => `<div x-c="st-sb-row${i === 0 ? " on" : ""}">${ico(ic)}<span>${esc(name)}</span></div>`).join("");
  const rows = (model.rows ?? []).map((r) => `<button type="button" x-c="st-sb-item${r.current ? " on" : ""}" x-st-chat="${r.index}" title="${esc(r.name)}">${esc(r.name)}</button>`).join("");
  const list = rows || (K.empty ? `<div x-c="st-sb-empty">${esc(K.empty)}</div>` : "");
  const who = String(model.user || "나");
  return `<div x-c="st-sb-head"><span x-c="st-sb-word${K.wordSerif ? " serif" : ""}">${esc(model.word ?? K.word)}</span></div>`
    + `<div x-c="st-sb-nav">${nav}</div>`
    + (K.recent ? `<div x-c="st-sb-sec"><span>${esc(K.recent)}</span></div>` : "")
    + `<div x-c="st-sb-list">${list}</div>`
    + `<div x-c="st-sb-foot"><span x-c="st-sb-av">${esc(who.slice(0, 1).toUpperCase())}</span><span x-c="st-sb-who">${esc(who)}<small>· ${esc(model.plan ?? K.plan)}</small></span><button type="button" x-c="st-sb-gear" x-st-gear="1" aria-label="설정">${ico("gear", 18)}</button><button type="button" x-c="st-sb-gear st-sb-fold" x-st-fold="1" aria-label="사이드바 접기·펴기" title="사이드바 접기·펴기">^</button></div>`;
}
export function topHtml(model) {
  const t = String(model.title ?? "").trim();
  if (!t && !model.mobile) return "";
  // 넓은 화면: 제목 줄만. 좁은 화면(모바일): ≡ · [아이콘] 제목 / 채팅 · 연필 · ⋮ — 클로드 앱처럼 한 줄
  const one = "display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap";
  return `<button type="button" x-c="st-top-btn" x-st-menu="1" aria-hidden="true" tabindex="-1">${ico("menu", 22)}</button>`
    + `<span x-c="st-top-t" style="${one}">${t ? `<span x-c="st-top-ico" style="flex:none;line-height:0">${ico("stack", 17)}</span><b style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(t)}</b>` : ""}${model.sub ? `<span x-c="st-top-sub" style="flex:0 100 auto;min-width:0;overflow:hidden;text-overflow:ellipsis">/&nbsp; ${esc(model.sub)}</span>` : ""}</span>`
    + `<span x-c="st-top-btn st-top-deco">${ico("edit", 21)}</span>`
    + `<button type="button" x-c="st-top-btn st-top-more" x-st-more="1" aria-label="스텔스 상단 줄 접기">${ico("vdots", 21)}</button>`;
}

// Dusk 창이 열려 있으면 껍데기를 감춘다(모바일에서 창 위에 상단 줄이 겹치던 문제). 애드온이 showContainer·hideContainer를 감싸 알려 준다
// 두 가지로 판단한다: ① 플러그인 iframe의 크기(창을 닫으면 리스가 숨겨 0이 된다) ② showContainer·hideContainer 호출(잡히는 판에서만).
// 크기가 0이면 무조건 닫힘, 크기가 있으면 hideContainer가 마지막으로 불린 경우만 닫힘.
var duskOpen = { v: false, fn: null, call: undefined };
export var frameVisible = (w = globalThis) => (Number(w?.innerWidth) || 0) > 0 && (Number(w?.innerHeight) || 0) > 0;
export function duskIsOpen(size, call) { return !!size && call !== false; }
export function refreshDuskOpen(w) { const v = duskIsOpen(frameVisible(w), duskOpen.call); if (v !== duskOpen.v) { duskOpen.v = v; duskOpen.fn?.(); } return v; }
export function setDuskOpen(v, w) { duskOpen.call = !!v; duskOpen.v = !v; return refreshDuskOpen(w); }

// ── 화면에 붙이기 ──
export var shellInfo = { draws: 0, error: "", warn: "" };   // 진단용: 마지막으로 그린 결과
var ROOT = "stealth-sb", NOTE = "stealth-note", TOP = "stealth-top", POP = "stealth-pop", STY = "stealth-shell-css";

/**
 * 껍데기를 만들고 돌려준다: { refresh(), close(), destroy() }.
 * opts: { kind, word, title, sub, plan, getUser?, log, poll(ms) }
 */
export function createShell(api, opts = {}) {
  const log = opts.log ?? ((...a) => console.log("[Dusk Atelier]", ...a));
  let folded = true, plain = false, onChat = true, doc = null, timer = null, last = "", dead = false, busy = false, popOpen = false, inflight = Promise.resolve();
  const cache = { idx: "", at: 0, char: null, user: "", userAt: 0 };
  const FRESH = opts.freshMs ?? 90000, USER_TTL = 120000;
  const kind = opts.kind ?? "claude";
  const FOLD_KEY = "rbm:stealth:fold";
  const foldReady = (async () => { try { const v = await api.pluginStorage?.getItem?.(FOLD_KEY); if (v === "0") folded = false; } catch { /* 기본(접힘) */ } })();
  async function ensureDoc() { if (doc) return doc; doc = await api.getRootDocument?.(); return doc; }
  // 봇 전체 읽기는 채팅이 많으면 무겁다 → 지금 봇·채팅 번호가 같으면 FRESH 동안 지난 결과를 그대로 쓴다. 번호는 가벼운 호출이라 자주 본다.
  const safe = async (fn) => { try { return await fn(); } catch (e) { shellInfo.warn = String(e?.message ?? e); return undefined; } };   // 호스트가 채팅이 없을 때 던지는 오류는 목록만 비우고 넘어간다
  async function chatInfo(force = false) {
    const ci = await safe(() => api.getCurrentCharacterIndex?.()), ti = await safe(() => api.getCurrentChatIndex?.());
    if (!Number.isInteger(ci) || ci < 0) return { ci: -1, ti: -1, char: null, light: true };
    const idx = `${ci}:${ti}`, now = Date.now();
    if (!force && cache.char && cache.idx === idx && now - cache.at < FRESH) return { ci, ti, char: cache.char, light: true };
    const char = await safe(() => api.getCharacterFromIndex(ci));
    cache.idx = idx; cache.at = now; cache.char = char ? { name: char.name, page: Number.isInteger(char.chatPage) ? char.chatPage : -1, chats: (char.chats ?? []).map((c) => ({ name: c?.name ?? c?.title ?? "", lastDate: c?.lastDate ?? c?.date ?? 0 })) } : null;
    return { ci, ti, char: cache.char, light: false };
  }
  async function userName() {
    const now = Date.now();
    if (cache.user && now - cache.userAt < USER_TTL) return cache.user;
    try { const db = await api.getDatabase(["username", "personas", "selectedPersona"]); const p = db?.personas?.[db?.selectedPersona ?? 0]; cache.user = String(p?.name || db?.username || "").trim(); cache.userAt = now; } catch { /* 지난 값 유지 */ }
    return cache.user;
  }
  async function put(d, id, tag, html, style) {
    let el = await d.querySelector(`[x-dusk="${id}"]`);
    if (!html) { if (el) await el.remove(); return null; }
    if (!el) { el = await d.createElement(tag); await el.setAttribute("x-dusk", id); await (await d.querySelector("body")).appendChild(el); }
    await el.setInnerHTML(html);
    return el;
  }
  function render(force = false) {
    if (dead || busy) return inflight;
    busy = true;
    inflight = draw(force).finally(() => { busy = false; });
    return inflight;
  }
  async function draw(force) {
    try {
      const d = await ensureDoc(); if (!d) { shellInfo.error = "리스 화면 문서에 접근하지 못했어요"; return; }
      await foldReady;
      onChat = !!(await d.querySelector(".default-chat-screen, .text-input-area").catch(() => null));
      const { ci, ti, char } = await chatInfo(force);
      const user = opts.user || (opts.getUser ? await opts.getUser() : await userName());
      if (dead) return;
      const rows = chatRows(char, Number.isInteger(ti) ? ti : char?.page ?? -1);
      const key = JSON.stringify([folded, onChat, kind, ci, ti, user, rows.map((r) => [r.index, r.name])]);
      if (!force && key === last) return;
      last = key;
      try { const b = await d.querySelector("body"); if (b) { await b.setAttribute("x-dusk-st", "1"); await b.setAttribute("x-dusk-fold", folded || !onChat ? "1" : "0"); } } catch { /* 표식 없이도 사이드바는 보인다 */ }
      if (!(await d.querySelector(`[x-dusk="${STY}"]`))) {
        const st = await d.createElement("style"); await st.setAttribute("x-dusk", STY); await st.setInnerText(SHELL_CSS);
        await (await d.querySelector("head") ?? await d.querySelector("body")).appendChild(st);
      }
      const cur = rows.find((r) => r.current);
      const model = { mobile: true, kind, word: opts.word, user, plan: opts.plan, rows, title: opts.title || char?.name || "", sub: opts.sub || cur?.name || "" };
      const rootEl = await put(d, ROOT, "div", shellHtml(model), "st-sb"); await rootEl?.setAttribute("x-fold", folded ? "1" : "0");
      await setVis(d);
      await put(d, TOP, "div", topHtml(model), "st-top");
      await put(d, NOTE, "div", opts.note ? esc(opts.note) : "", "st-note");
      for (const r of rows) {
        const b = await d.querySelector(`[x-dusk="${ROOT}"] [x-st-chat="${r.index}"]`);
        if (b) await b.addEventListener("click", () => switchChat(ci, r.index).catch((e) => log("채팅 전환 실패", e?.message ?? e)));
      }
      const g = await d.querySelector(`[x-dusk="${ROOT}"] [x-st-gear]`);
      const topEl = await d.querySelector(`[x-dusk="${TOP}"]`); await topEl?.setAttribute("x-plain", plain ? "1" : "0");
      const more = await d.querySelector(`[x-dusk="${TOP}"] [x-st-more]`);
      if (more) await more.addEventListener("click", async () => { plain = !plain; try { const t = await d.querySelector(`[x-dusk="${TOP}"]`); await t?.setAttribute("x-plain", plain ? "1" : "0"); } catch (e) { log("상단 줄 접기 실패", e?.message ?? e); } });
      const fb = await d.querySelector(`[x-dusk="${ROOT}"] [x-st-fold]`);
      if (fb) await fb.addEventListener("click", () => toggleFold(d));
      shellInfo.draws++; shellInfo.error = "";
      if (g) await g.addEventListener("click", () => togglePop().catch((e) => log("설정 열기 실패", e?.message ?? e)));
    } catch (e) { shellInfo.error = String(e?.message ?? e); log("스텔스 사이드바 그리기 실패", e?.message ?? e); }
  }
  async function setVis(d) {   // 채팅 화면이고 Dusk 창이 닫혀 있을 때만 보인다
    const v = onChat && !duskOpen.v ? "1" : "0";
    for (const id of [ROOT, TOP, NOTE, POP]) { const e = await d.querySelector(`[x-dusk="${id}"]`); await e?.setAttribute("x-vis", v); }
  }
  async function toggleFold(d) {   // 다시 그리지 않고 속성만 바꾼다
    try {
      folded = !folded; api.pluginStorage?.setItem?.(FOLD_KEY, folded ? "1" : "0");
      const r = await d.querySelector(`[x-dusk="${ROOT}"]`); await r?.setAttribute("x-fold", folded ? "1" : "0");
      const bd = await d.querySelector("body"); await bd?.setAttribute("x-dusk-fold", folded || !onChat ? "1" : "0");
    } catch (e) { log("사이드바 접기 실패", e?.message ?? e); }
  }
  async function switchChat(ci, idx) {
    const char = await safe(() => api.getCharacterFromIndex(ci));
    if (!char || !Array.isArray(char.chats) || !char.chats[idx]) return;
    char.chatPage = idx;
    await api.setCharacterToIndex(ci, char);
    cache.at = 0; last = ""; await render(true);
  }
  async function popModel() {
    const ci = await api.getCurrentCharacterIndex?.();
    const char = Number.isInteger(ci) && ci >= 0 ? await api.getCharacterFromIndex(ci) : null;
    const db = await api.getDatabase(["modules", "enabledModules", "globalChatVariables"]);
    const enabled = new Set([...(db?.enabledModules ?? []), ...(char?.modules ?? [])]);
    const mods = (db?.modules ?? []).filter((m) => enabled.has(m?.id));
    const toggles = collectToggles([char?.customModuleToggle, ...mods.map((m) => m.customModuleToggle)]);
    return { toggles, vars: db?.globalChatVariables ?? {} };
  }
  async function setVar(key, value) {
    const db = await api.getDatabase(["globalChatVariables"]);
    await api.setDatabaseLite({ globalChatVariables: { ...(db?.globalChatVariables ?? {}), [toggleVarKey(key)]: String(value) } });
  }
  async function togglePop() {
    const d = await ensureDoc();
    if (popOpen) return closePop();
    const { toggles, vars } = await popModel();
    const rows = toggles.length ? toggles.map((t, i) => {
      const v = toggleValue(t, vars);
      const ctl = t.type === "toggle" ? `<input x-c="st-sw" type="checkbox" x-st-t="${i}" ${v ? "checked" : ""}>`
        : t.type === "select" ? `<select x-st-t="${i}">${t.options.map((o, j) => `<option value="${j}" ${String(v) === String(j) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
          : `<input type="text" x-st-t="${i}" value="${esc(v)}">`;
      return `<div x-c="st-pop-row"><label>${esc(t.label)}</label>${ctl}</div>`;
    }).join("") : `<div x-c="st-sb-empty">이 봇에는 켜고 끌 토글이 없어요</div>`;
    const el = await put(d, POP, "div", `<h4>설정</h4>${rows}`, "st-pop");
    popOpen = true;
    for (let i = 0; i < toggles.length; i++) {
      const t = toggles[i], c = await d.querySelector(`[x-dusk="${POP}"] [x-st-t="${i}"]`);
      if (!c) continue;
      await c.addEventListener("change", async (ev) => {
        try {
          const val = t.type === "toggle" ? (await c.getChecked?.() ?? ev?.target?.checked) : (await c.getValue?.() ?? ev?.target?.value);
          await setVar(t.key, t.type === "toggle" ? (val ? "1" : "0") : val ?? "");
        } catch (e) { log("토글 저장 실패", e?.message ?? e); }
      });
    }
    return el;
  }
  async function closePop() { popOpen = false; try { const d = await ensureDoc(); await put(d, POP, "div", ""); } catch { /* 이미 없음 */ } }
  async function destroy() {
    dead = true; clearInterval(timer);
    await inflight.catch(() => {});   // 그리던 중이면 끝난 뒤에 지운다(지운 뒤 다시 붙는 것 방지)
    try { const d = await ensureDoc(); const b = await d?.querySelector("body"); if (b) await b.removeAttribute?.("x-dusk-st"); for (const id of [ROOT, NOTE, TOP, POP, STY]) { const el = await d?.querySelector(`[x-dusk="${id}"]`); if (el) await el.remove(); } } catch { /* 화면이 이미 없음 */ }
  }
  timer = setInterval(() => render(false), opts.poll ?? 4000);
  render(true);
  duskOpen.fn = async () => { try { const d = await ensureDoc(); if (d) await setVis(d); } catch { /* 다음 그리기에서 */ } };
  return { refresh: () => render(true), close: closePop, destroy, _render: render };
}

// ── 이미지 접힘 줄 펴고 접기: 채팅 HTML의 .st-ftool에 클릭을 달아 x-open을 바꾼다(details를 지우는 판 대응) ──
var listItems = async (list) => { if (!list) return []; const n = typeof list.length === "function" ? await list.length() : list.length; const out = []; for (let i = 0; i < n; i++) out.push(typeof list.at === "function" ? await list.at(i) : list[i]); return out; };
// 이미지·배경 그림 하나마다 위에 '›_ 명령어 N개 실행함 ›' 줄을 붙인다: 그 요소를 우리 상자([x-st-fw])로 바꿔 끼우고(replaceWith) 줄 + 원래 요소를 넣는다.
// 줄을 누르면 상자의 x-open이 바뀌어 그 이미지만 펴고 접힌다. 아주 작은 아이콘(48px 미만)은 건너뛴다.
export var MEDIA_SEL = '.st-msg .st-body :is(img, video, [style*="background-image"]):not([x-st-m]):not([x-st-fw] *)';
export async function wrapMedia(d, { log = () => {}, rand = () => 1 + Math.floor(Math.random() * 9) } = {}) {
  let n = 0;
  for (const el of await listItems(await d.querySelectorAll(MEDIA_SEL))) {
    if (!el) continue;
    try {
      await el.setAttribute("x-st-m", "1");
      const r = await el.getBoundingClientRect?.().catch?.(() => null);
      if (r && r.width > 0 && r.height > 0 && r.width < 48 && r.height < 48) { await el.setAttribute("x-st-m", "s"); continue; }
      const box = await d.createElement("div"), lab = await d.createElement("div");
      await box.setAttribute("x-st-fw", "1"); await box.setAttribute("x-open", "0");
      await lab.setAttribute("x-st-fl", "1"); await lab.setInnerText(`명령어 ${rand()}개 실행함`);
      await el.replaceWith(box);
      await box.appendChild(lab); await box.appendChild(el);
      let open = false;
      await lab.addEventListener("click", async () => { open = !open; try { await box.setAttribute("x-open", open ? "1" : "0"); } catch (e) { log("이미지 펴기 실패", e?.message ?? e); } });
      n++;
    } catch (e) {
      // 감싸지 못하면 이미지를 숨기고 '명령어 N개 실패함'으로 보인다(밖에서 이미지가 드러나지 않게). 배경 그림은 그 요소에, <img>·<video>는 부모에 글자를 단다
      log("이미지 접기 실패", e?.message ?? e);
      try { await el.setAttribute("x-st-m", "e"); await el.setAttribute("x-st-n", String(rand())); } catch { /* 표시 못 해도 CSS가 숨긴다 */ }
      try { const tag = String(await el.nodeName?.() ?? el.nodeName ?? "").toUpperCase(); if (tag === "IMG" || tag === "VIDEO") { const p = await el.getParent?.(); await p?.setAttribute("x-st-pe", String(rand())); } } catch { /* 부모 없음 */ }
    }
  }
  return n;
}
var folder = null;
function startFolder(api, log) {
  if (folder) return;
  let busy = false;
  const tick = async () => { if (busy) return; busy = true; try { const d = await api.getRootDocument?.(); if (d) await wrapMedia(d, { log }); } catch { /* 다음에 */ } finally { busy = false; } };
  folder = setInterval(tick, 1500); folder?.unref?.(); tick();
}
function stopFolder() { if (folder) { clearInterval(folder); folder = null; } }

// ── 하나만 켜 두는 관리: 설정이 바뀔 때마다 부른다 ──
var current = null;
export async function syncShell(api, state, log) {
  const id = state?.active, P = id ? PRESETS[id] : null;
  setFoldOn(!!(P && state.hideImages !== false));
  if (P && state.hideImages !== false) startFolder(api, log ?? (() => {})); else stopFolder();
  const want = P?.shell ? id : null;
  if (current) { const c = current; current = null; await c.shell.destroy().catch(() => {}); }
  if (!want) return null;
  const L = mergeLabels(id, state.labels?.[id]);
  const shell = createShell(api, { kind: P.shell, title: L.title, sub: L.sub, note: L.note, user: L.user, plan: L.plan || undefined, log });
  current = { id, shell };
  return shell;
}
export var shellState = () => current?.id ?? null;
