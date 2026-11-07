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

export { SHELL_CSS } from "./stealth-shellcss.js";
import { SHELL_CSS } from "./stealth-shellcss.js";

/** 사이드바 HTML. model: {kind, user, plan, rows[], title, sub, nativeToggles} */
export function shellHtml(model) {
  const K = SHELL_KINDS[model.kind] ?? SHELL_KINDS.claude;
  const nav = K.items.map(([ic, name], i) => `<div class="st-sb-row${i === 0 ? " st-on" : ""}">${ico(ic)}<span>${esc(name)}</span></div>`).join("");
  const rows = (model.rows ?? []).map((r) => `<button type="button" class="st-sb-item${r.current ? " st-on" : ""}" data-st-chat="${r.index}" title="${esc(r.name)}">${esc(r.name)}</button>`).join("");
  const list = rows || (K.empty ? `<div class="st-sb-empty">${esc(K.empty)}</div>` : "");
  const who = String(model.user || "나");
  return `<div class="st-sb-head"><span class="st-sb-word${K.wordSerif ? " st-serif" : ""}">${esc(model.word ?? K.word)}</span></div>`
    + `<div class="st-sb-nav">${nav}</div>`
    + (K.recent ? `<div class="st-sb-sec"><span>${esc(K.recent)}</span></div>` : "")
    + `<div class="st-sb-list">${list}</div>`
    + `<div class="st-sb-foot"><span class="st-sb-av">${esc(who.slice(0, 1).toUpperCase())}</span><span class="st-sb-who">${esc(who)}<small>· ${esc(model.plan ?? K.plan)}</small></span><button type="button" class="st-sb-gear" data-st-gear="1" aria-label="설정">${ico("gear", 18)}</button><button type="button" class="st-sb-gear st-sb-fold" data-st-fold="1" aria-label="사이드바 접기·펴기" title="사이드바 접기·펴기">^</button></div>`;
}
export function topHtml(model) {
  const t = String(model.title ?? "").trim();
  if (!t && !model.mobile) return "";
  // 넓은 화면: 제목 줄만. 좁은 화면(모바일): ≡ · [아이콘] 제목 / 채팅 · 연필 · ⋮ — 클로드 앱처럼 한 줄
  const one = "display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap";
  return `<button type="button" class="st-top-btn" data-st-menu="1" aria-hidden="true" tabindex="-1">${ico("menu", 22)}</button>`
    + `<span class="st-top-t" style="${one}">${t ? `<span class="st-top-ico" style="flex:none;line-height:0">${ico("stack", 17)}</span><b style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(t)}</b>` : ""}${model.sub ? `<span class="st-top-sub" style="flex:0 100 auto;min-width:0;overflow:hidden;text-overflow:ellipsis">/&nbsp; ${esc(model.sub)}</span>` : ""}</span>`
    + `<span class="st-top-btn st-top-deco">${ico("edit", 21)}</span>`
    + `<button type="button" class="st-top-btn st-top-more" data-st-more="1" aria-label="스텔스 상단 줄 접기">${ico("vdots", 21)}</button>`;
}

// Dusk 창이 열려 있으면 껍데기를 감춘다(모바일에서 창 위에 상단 줄이 겹치던 문제). 애드온이 showContainer·hideContainer를 감싸 알려 준다
// 두 가지로 판단한다: ① 플러그인 iframe의 크기(창을 닫으면 리스가 숨겨 0이 된다) ② showContainer·hideContainer 호출(잡히는 판에서만).
// 크기가 0이면 무조건 닫힘, 크기가 있으면 hideContainer가 마지막으로 불린 경우만 닫힘.
export var duskOpen = { v: false, fn: null, call: undefined };
export var frameVisible = (w = globalThis) => (Number(w?.innerWidth) || 0) > 0 && (Number(w?.innerHeight) || 0) > 0;
// shown: Dusk 창 본체(.rb-root)가 숨겨지지 않았는가. 포켓리스는 창을 닫아도 iframe 크기가 남고 hideContainer도 안 잡혀, 이것으로 닫힘을 안다.
export function duskIsOpen(size, call, shown = true) { return !!size && call !== false && shown !== false; }
var duskShown = (w = globalThis) => { try { const r = w?.document?.querySelector?.(".rb-root"); return r ? !r.hidden : true; } catch { return true; } };
export function refreshDuskOpen(w) { const v = duskIsOpen(frameVisible(w), duskOpen.call, duskShown(w)); if (v !== duskOpen.v) { duskOpen.v = v; duskOpen.fn?.(); } return v; }
// 진단용: 지금 이 순간의 판단 근거(마지막으로 그린 때가 아니라). 진단 버튼은 Dusk 창 안에서 누르므로 '5초 뒤 진단'으로 창을 닫은 뒤 재야 뜻이 있다.
export function shellFlags() {
  refreshDuskOpen();
  const vis = shellInfo.onChat && !duskOpen.v;
  return `채팅 화면 ${shellInfo.onChat ? "찾음" : "못 찾음"} · 순정 사이드바 ${shellInfo.nativeOpen ? "열림" : "닫힘"} · Dusk 창 ${duskOpen.v ? "열림으로 판단" : "닫힘"}(창 크기 ${frameVisible() ? `${globalThis.innerWidth}×${globalThis.innerHeight}` : "0"}, 마지막 호출 ${duskOpen.call === undefined ? "없음" : duskOpen.call ? "열기" : "닫기"}) · ${shellInfo.folded ? "접힘" : "펼침"} → ${vis && !shellInfo.nativeOpen ? "보임" : "숨김"}`;
}
// 리스 화면(우리 iframe 밖)이 눌렸다 = Dusk 창이 화면을 덮고 있지 않다. 포켓리스는 바깥을 눌러 창을 닫아도 아무 신호가 없어 이것으로 안다.
// 리스 순정 사이드바가 열려 있는가: 닫히면 hidden(크기 0)이 된다. 판마다 클래스가 둘(.rs-sidebar·.risu-sidebar)이라 둘 다 본다.
export async function nativeSidebarOpen(d) {
  try {
    const list = await d.querySelectorAll(".rs-sidebar, .risu-sidebar");
    const n = typeof list?.length === "function" ? await list.length() : list?.length ?? 0;
    for (let i = 0; i < n; i++) {
      const el = typeof list.at === "function" ? await list.at(i) : list[i];
      const r = await el?.getBoundingClientRect?.().catch?.(() => null);
      if (r && r.width > 8 && r.height > 8 && r.right > 8) return true;
    }
  } catch { /* 못 보면 닫힘으로 */ }
  return false;
}
// 우리가 만든 HTML 글을 리스 화면에 요소 하나하나로 옮긴다. setInnerHTML은 호스트 소독기(DOMPurify)를 거쳐 판에 따라 class·x-* 속성이 지워진다(포켓리스 → 사이드바가 글자만).
// createElement + setAttribute("x-…")는 어느 판에서나 남는다(이미지 접힘 상자가 이 길). class → x-c, data-st-* → x-st-*, style → setStyleAttribute, 글 → setInnerText.
// <svg>는 통째로 setInnerHTML(소독기가 남긴다). 글과 요소가 섞인 자리는 글을 <span>으로 감싼다.
export async function mountHtml(d, target, html, Parser = globalThis.DOMParser) {
  const root = new Parser().parseFromString(`<body>${html}</body>`, "text/html").body;
  const walk = async (to, node) => {
    const kids = [...node.childNodes], mixed = kids.some((k) => k.nodeType === 1);
    for (const k of kids) {
      if (k.nodeType === 3) {
        const t = k.textContent; if (!t) continue;
        if (!mixed) { await to.setInnerText(t); continue; }
        if (!t.trim()) continue;
        const sp = await d.createElement("span"); await sp.setInnerText(t); await to.appendChild(sp); continue;
      }
      if (k.nodeType !== 1) continue;
      const tag = k.tagName.toLowerCase();
      if (tag === "svg") { const sp = await d.createElement("span"); await sp.setAttribute("x-ico", "1"); await sp.setInnerHTML(k.outerHTML); await to.appendChild(sp); continue; }
      const el = await d.createElement(tag);
      for (const a of [...k.attributes]) {
        const n = a.name.toLowerCase();
        if (n === "class") await el.setAttribute("x-c", a.value);
        else if (n.startsWith("data-")) await el.setAttribute("x-" + n.slice(5), a.value);
        else if (n.startsWith("x-")) await el.setAttribute(n, a.value);
        else if (n === "style") await el.setStyleAttribute?.(a.value);
      }
      await walk(el, k);
      await to.appendChild(el);
    }
  };
  await walk(target, root);
}
export function noteHostClick(w) { if (duskOpen.call === false && !duskOpen.v) return false; duskOpen.call = false; return refreshDuskOpen(w); }
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
  let folded = true, foldUnset = false, nativeOpen = false, plain = false, onChat = true, doc = null, timer = null, last = "", dead = false, busy = false, popOpen = false, inflight = Promise.resolve();
  const cache = { idx: "", at: 0, char: null, user: "", userAt: 0 };
  const FRESH = opts.freshMs ?? 90000, USER_TTL = 120000;
  const kind = opts.kind ?? "claude";
  const FOLD_KEY = "rbm:stealth:fold";
  const foldReady = (async () => { try { const v = await api.pluginStorage?.getItem?.(FOLD_KEY); if (v === "0") folded = false; else if (v !== "1") foldUnset = true; } catch { foldUnset = true; } })();   // 고른 적 없으면 첫 그리기에서 정한다(넓은 화면 = 펼침)
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
    if (id !== POP && typeof globalThis.DOMParser === "function") { await el.setInnerHTML(""); await mountHtml(d, el, html); }   // 소독기를 거치지 않는 길(포켓리스)
    else await el.setInnerHTML(id === POP ? html : String(html).replace(/\sclass="/g, ' x-c="').replace(/\sdata-st-/g, " x-st-"));   // DOMParser 없는 곳: 예전처럼 x-* 속성 글로
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
      if (foldUnset) { foldUnset = false; const r = await (await d.querySelector("body"))?.getBoundingClientRect?.().catch(() => null); folded = !(r && r.width > 760); }   // 기본: PC 펼침 · 휴대폰 접힘(휴대폰은 펼치면 채팅을 덮는다)
      nativeOpen = await nativeSidebarOpen(d);
      const { ci, ti, char } = await chatInfo(force);
      const user = opts.user || (opts.getUser ? await opts.getUser() : await userName());
      if (dead) return;
      const rows = chatRows(char, Number.isInteger(ti) ? ti : char?.page ?? -1);
      const key = JSON.stringify([folded, onChat, kind, ci, ti, user, rows.map((r) => [r.index, r.name])]);
      if (!force && key === last) return;
      last = key;
      try { const b = await d.querySelector("body"); if (b) { await b.setAttribute("x-dusk-st", "1"); await b.setAttribute("x-dusk-fold", folded || !onChat || nativeOpen ? "1" : "0"); } } catch { /* 표식 없이도 사이드바는 보인다 */ }
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
      const bd = await d.querySelector("body");   // 한 번만 단다(body는 다시 그려도 그대로)
      try { if (bd?.addEventListener && await bd.getAttribute?.("x-st-hc") !== "1") { await bd.setAttribute?.("x-st-hc", "1"); await bd.addEventListener("pointerdown", () => { noteHostClick(); setTimeout(() => { recheckNative().catch(() => {}); }, 350); }); } } catch (e) { log("바깥 클릭 감지 실패", e?.message ?? e); }
      const fb = await d.querySelector(`[x-dusk="${ROOT}"] [x-st-fold]`);
      if (fb) await fb.addEventListener("click", () => toggleFold(d));
      shellInfo.draws++; shellInfo.error = "";
      if (g) await g.addEventListener("click", () => togglePop().catch((e) => log("설정 열기 실패", e?.message ?? e)));
    } catch (e) { shellInfo.error = String(e?.message ?? e); log("스텔스 사이드바 그리기 실패", e?.message ?? e); }
  }
  async function setVis(d) {   // 채팅 화면이고, Dusk 창이 닫혀 있고, 리스 순정 사이드바가 닫혀 있을 때만 보인다
    const v = onChat && !duskOpen.v && !nativeOpen ? "1" : "0";
    shellInfo.onChat = onChat; shellInfo.folded = folded; shellInfo.nativeOpen = nativeOpen;
    for (const id of [ROOT, TOP, NOTE, POP]) { const e = await d.querySelector(`[x-dusk="${id}"]`); await e?.setAttribute("x-vis", v); }
  }
  async function recheckNative() {   // 순정 사이드바를 열고 닫는 클릭 뒤에 바로 다시 본다(4초 주기를 기다리지 않게)
    const d = await ensureDoc(); if (!d || dead) return;
    const was = nativeOpen; nativeOpen = await nativeSidebarOpen(d);
    if (was === nativeOpen) return;
    await setVis(d);
    const bd = await d.querySelector("body"); await bd?.setAttribute("x-dusk-fold", folded || !onChat || nativeOpen ? "1" : "0");
  }
  async function toggleFold(d) {   // 다시 그리지 않고 속성만 바꾼다
    try {
      folded = !folded; api.pluginStorage?.setItem?.(FOLD_KEY, folded ? "1" : "0");
      const r = await d.querySelector(`[x-dusk="${ROOT}"]`); await r?.setAttribute("x-fold", folded ? "1" : "0");
      const bd = await d.querySelector("body"); await bd?.setAttribute("x-dusk-fold", folded || !onChat || nativeOpen ? "1" : "0");
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
      const ctl = t.type === "toggle" ? `<input class="st-sw" type="checkbox" data-st-t="${i}" ${v ? "checked" : ""}>`
        : t.type === "select" ? `<select data-st-t="${i}">${t.options.map((o, j) => `<option value="${j}" ${String(v) === String(j) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
          : `<input type="text" data-st-t="${i}" value="${esc(v)}">`;
      return `<div class="st-pop-row"><label>${esc(t.label)}</label>${ctl}</div>`;
    }).join("") : `<div class="st-sb-empty">이 봇에는 켜고 끌 토글이 없어요</div>`;
    const el = await put(d, POP, "div", `<h4>설정</h4>${rows}`, "st-pop");
    popOpen = true;
    for (let i = 0; i < toggles.length; i++) {
      const t = toggles[i], c = await d.querySelector(`[x-dusk="${POP}"] [data-st-t="${i}"]`);
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
// 접을 대상: <img>·<video>·인라인 배경 그림(background-image도, background: url(…) 줄임 꼴도).
export var MEDIA_SEL = '.st-msg .st-body :is(img, video, [style*="url("]):not([x-st-m]):not([x-st-fw] *)';
// 큰 그림만 접는다(사용자 선택 11-08): 짧은 변이 이보다 작으면 아이콘·봇 위젯·캐릭터 칸(190px)으로 보고 그대로 둔다.
export var FOLD_MIN = 220;
export async function wrapMedia(d, { log = () => {}, rand = () => 1 + Math.floor(Math.random() * 9) } = {}) {
  let n = 0;
  for (const el of await listItems(await d.querySelectorAll(MEDIA_SEL))) {
    if (!el) continue;
    try {
      // 재기 전엔 CSS가 자리는 두고 안 보이게만 한다(visibility) → 실제 크기를 잴 수 있다. 크기가 0이면 아직 안 받은 것 → 다음 차례에 다시
      const r = await el.getBoundingClientRect?.().catch?.(() => null);
      if (r && !(r.width > 0 && r.height > 0)) continue;
      if (r && Math.min(r.width, r.height) < FOLD_MIN) { await el.setAttribute("x-st-m", "s"); continue; }
      await el.setAttribute("x-st-m", "1");
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
      try {
        const tag = String(await el.nodeName?.() ?? el.nodeName ?? "").toUpperCase();
        // 실패한 것도 누르면 펼친다: 배경 그림은 그 요소, <img>·<video>는 부모가 줄 역할
        const host = tag === "IMG" || tag === "VIDEO" ? await el.getParent?.() : el, key = host === el ? "x-st-o" : "x-st-po";
        if (host !== el) await host?.setAttribute("x-st-pe", String(rand()));
        let o = false;
        await host?.addEventListener("click", async () => { o = !o; try { await host.setAttribute(key, o ? "1" : "0"); } catch { /* 그대로 */ } });
      } catch { /* 부모 없음 */ }
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
