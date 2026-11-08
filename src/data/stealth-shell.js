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
  rows.sort((a, b) => (b.at - a.at) || (a.index - b.index));   // 날짜가 같거나 없으면 앞(0번)이 최신(리스는 새 채팅을 맨 앞에 넣는다)
  return rows.slice(0, limit);
}

// 사이드바 종류(docs/STEALTH.md 5·7절). head: "seg"(클로드식 오른쪽 묶음) | "icons"(headRight 아이콘들). headLeft: 이름 왼쪽 아이콘.
// firstOn: 첫 메뉴 줄 강조. foot2: 발을 두 줄(이름 / 요금제). top: "chat"이면 넓은 화면 위 줄에 [폴더] 채팅 이름 ⌄ … 공유. 글자만 쓰고 상표 그림은 쓰지 않는다.
// 머리 아이콘 그림(사용자 결정 11-08): 모양마다 icon = 기본 그림 주소(https:// 또는 data:image/…). 비우면 그림 없음.
// 사용자가 스텔스 화면에서 고른 그림(state.icons[모양])이 먼저 쓰인다. 기본값은 저장소 관리자가 정한다(지금은 모두 비움).
export function safeIconUrl(u) {
  const v = String(u ?? "").trim();
  if (!/^(https:\/\/|data:image\/(png|jpeg|webp|gif|svg\+xml);)/i.test(v) || /['"()\\\s<>]/.test(v.replace(/^data:[^,]*,/, (m) => m.replace(/[()]/g, "")))) return "";
  return v.length <= 120000 ? v : "";
}
export var SHELL_KINDS = {
  claude: { icon: "", word: "Claude", wordSerif: true, head: "seg", headLeft: "panel", firstOn: true, items: [["plus", "새로 만들기"], ["search", "검색"], ["folder", "프로젝트"], ["cube", "아티팩트"], ["clock", "예약됨"], ["bag", "사용자 지정"]], recent: "최근 항목", empty: "", plan: "Pro" },
  code: { icon: "", word: "", head: "seg", segOn: 1, headLeft: ["panel", "back", "fwd"], items: [["plus", "새로 만들기"], ["folder", "프로젝트", "New"], ["cube", "아티팩트"], ["bag", "사용자 지정"], ["chev", "더 보기"]], recent: "최근 항목", dots: true, footChev: true, empty: "시작한 세션이 여기에 표시됩니다", plan: "" },
  deepseek: { mtop: { menu: "menu2", title: "chat", right: ["pluso"], more: "fwdshare" }, icon: "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/feat/2.0.0/deep.png", word: "deepseek", wordAccent: true, head: "icons", headRight: ["search", "panel"], newBtn: "새로운 채팅", items: [], recent: "오늘", recentIcon: "listi", gearIcon: "more", top: "chat", topPlain: true, empty: "", plan: "" },
  gemini: { mtop: { menu: "back", title: "model", word: "Gemini", sub: "자동 모드", chev: true, right: ["edit"], more: "vdots" }, icon: "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/feat/2.0.0/gem.png", word: "Gemini", top: "none", head: "icons", headRight: ["search", "panel"], items: [["edit", "새 채팅"], ["grid", "라이브러리"], ["image", "이미지"], ["clock", "예약"], ["target", "맞춤설정"], ["video", "동영상"]], recent: "전체", recentIcon: "filter", empty: "", plan: "" },
  codex: { icon: "", word: "Codex", wordChev: true, head: "icons", headRight: ["bell", "search"], rail: ["home", "image", "clock", "book", "plug", "more", "|", "branch"], foot: "noav", items: [["edit", "새 채팅"]], recent: "최근", empty: "", plan: "" },
  gpt: { mtop: { menu: "panel", deco: ["edit"], title: "chat", chev: true, right: ["share"], more: "listdots" }, icon: "", word: "ChatGPT", head: "icons", headRight: ["search", "panel"], foot2: true, top: "chat", items: [["edit", "새 채팅"], ["image", "이미지"], ["clock", "예약"], ["book", "라이브러리"], ["plug", "플러그인"], ["more", "탐색"]], recent: "최근", empty: "", plan: "Plus" }
};
var ICON = {
  menu2: '<path d="M4 8h16M4 16h9"/>', listdots: '<circle cx="6" cy="7.5" r="2.3"/><circle cx="6" cy="16.5" r="2.3"/><path d="M11 7.5h9M11 16.5h9"/>',
  grid: '<rect x="4.5" y="4.5" width="6" height="6" rx="2"/><rect x="13.5" y="4.5" width="6" height="6" rx="2"/><rect x="4.5" y="13.5" width="6" height="6" rx="2"/><rect x="13.5" y="13.5" width="6" height="6" rx="2"/>',
  listi: '<circle cx="6" cy="7" r="1.6"/><circle cx="6" cy="16" r="1.6"/><path d="M10 7h9M10 16h9M10 11h6"/>', pluso: '<circle cx="12" cy="12" r="8"/><path d="M12 8.5v7M8.5 12h7"/>', fwdshare: '<path d="M14 5l6 6-6 6M20 11h-8a7 7 0 0 0-7 7"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', fwd: '<path d="M5 12h14M13 6l6 6-6 6"/>', target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>', video: '<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17M8 6l2 4M13 6l2 4"/>', filter: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
  home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', branch: '<circle cx="7" cy="6" r="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="8" r="2"/><path d="M7 8v8M17 10c0 4-10 2-10 6"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 4.5-4.5 4 4 2-2 4.5 4.5"/>', book: '<path d="M5 4h3v16H5zM10 4h3v16h-3z"/><path d="m15 5 3-.8 3.2 15.3-3 .7z"/>',
  plug: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5h5v3a2.5 2.5 0 0 1-5 0zM11 7v2.5M13 7v2.5M12 15v2"/>', share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>', chev: '<path d="m7 10 5 5 5-5"/>',
  panel: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M8 9v6"/>', chatq: '<path d="M12 4.5a7 7 0 0 0-6.2 10.2L5 19l4.3-.8A7 7 0 1 0 12 4.5z"/><circle cx="15.5" cy="15.5" r="2.2"/><path d="m17.2 17.2 1.6 1.6"/>', code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
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
  const nav = K.items.map(([ic, name, badge], i) => `<div class="st-sb-row${i === 0 && K.firstOn ? " st-on" : ""}">${ico(ic)}<span>${esc(name)}</span>${badge ? `<span class="st-sb-badge">${esc(badge)}</span>` : ""}</div>`).join("");
  const rows = (model.rows ?? []).map((r) => `<button type="button" class="st-sb-item${r.current ? " st-on" : ""}${K.dots ? " st-dot" : ""}" data-st-chat="${r.index}" title="${esc(r.name)}">${esc(r.name)}</button>`).join("");
  const list = rows || (K.empty ? `<div class="st-sb-empty">${esc(K.empty)}</div>` : "");
  const who = String(model.user || "나"), plan = String(model.plan ?? K.plan ?? "").trim();
  // 머리: [왼쪽 아이콘] 앱 이름 ……… [오른쪽: 클로드식 묶음 | 아이콘들] (장식)
  const on = (i) => ((K.segOn ?? 0) === i ? " st-on" : "");
  const right = K.head === "seg" ? `<span class="st-sb-seg"><span class="st-sb-segb${on(0)}">${ico("chatq", 18)}</span><span class="st-sb-segb${on(1)}">${ico("code", 18)}</span></span>`
    : K.head === "icons" ? `<span class="st-sb-hright">${(K.headRight ?? []).map((n) => `<span class="st-sb-hbtn">${ico(n, 20)}</span>`).join("")}</span>` : "";
  const whoHtml = K.foot2 ? `<span class="st-sb-who st-two"><span>${esc(who)}</span>${plan ? `<small>${esc(plan)}</small>` : ""}</span>` : `<span class="st-sb-who">${esc(who)}${plan ? `<small>· ${esc(plan)}</small>` : ""}${K.footChev ? `<span class="st-sb-wchev">${ico("chev", 14)}</span>` : ""}</span>`;
  const gear = `<button type="button" class="st-sb-gear" data-st-gear="1" aria-label="설정">${ico(K.gearIcon ?? "gear", 18)}</button>`, av = `<span class="st-sb-av">${esc(who.slice(0, 1).toUpperCase())}</span>`;
  // 발: 기본 = 이니셜·이름(·요금제)·톱니 / "start" = 코덱스식 '○ 시작하기 … 3개 중 0개' 상자(이니셜은 레일 아래)
  // "noav" = 이니셜은 레일 아래에 있으니 발엔 이름·톱니만(코덱스, '시작하기' 상자는 사용자 요청으로 뺌 11-08)
  const foot = `<div class="st-sb-foot">${K.foot === "noav" ? "" : av}${whoHtml}${gear}</div>`;
  const lefts = [].concat(K.headLeft ?? []).map((n) => `<span class="st-sb-hico">${ico(n, 20)}</span>`).join("");
  const word = model.word ?? K.word;
  const logo = safeIconUrl(model.icon);
  const main = `<div class="st-sb-head">${lefts}${logo ? `<span class="st-sb-logo" style="background-image:url('${logo}')"></span>` : ""}${word ? `<span class="st-sb-word${K.wordSerif ? " st-serif" : ""}${K.wordAccent ? " st-accent" : ""}">${esc(word)}</span>` : ""}${K.wordChev ? `<span class="st-sb-wchev">${ico("chev", 16)}</span>` : ""}${right}</div>`
    + (K.newBtn ? `<div class="st-sb-newwrap"><span class="st-sb-new">${ico("pluso", 18)}<span>${esc(K.newBtn)}</span></span></div>` : "")
    + (nav ? `<div class="st-sb-nav">${nav}</div>` : "")
    + (K.recent ? `<div class="st-sb-sec"><span>${esc(K.recent)}</span>${K.recentIcon ? `<span class="st-sb-secico">${ico(K.recentIcon, 16)}</span>` : ""}</div>` : "")
    + `<div class="st-sb-list">${list}</div>`
    + foot;
  if (!K.rail) return main;
  // 레일(코덱스): 맨 왼쪽 아이콘 줄 + 오른쪽 사이드바 본문. 루트에 x-rail="1"을 단다(draw)
  const rail = K.rail.map((n, i) => n === "|" ? `<span class="st-sb-rsep"></span>` : `<span class="st-sb-rbtn${i === 0 ? " st-on" : ""}">${ico(n, 20)}</span>`).join("");
  return `<div class="st-sb-rail">${rail}<span class="st-sb-rgap"></span>${av}</div><div class="st-sb-main">${main}</div>`;
}
// 휴대폰 위 줄(K.mtop): [메뉴 아이콘=리스 ≡ 자리] [장식] 제목 ……… [장식] [접기 버튼]. 넓은 화면 쪽(st-top-do)과 함께 그려 두고 CSS가 폭에 따라 하나만 보인다.
function mobileTop(K, model) {
  const M = K.mtop, name = String(model.sub || model.title || "").trim();
  const title = M.title === "model" ? `<b>${esc(M.word ?? K.word)}</b><span class="st-top-sub">${esc(M.sub ?? "")}</span>` : `<b style="min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(name)}</b>`;
  const deco = (list) => (list ?? []).map((n) => `<span class="st-top-btn st-top-deco">${ico(n, 21)}</span>`).join("");
  return { menu: M.menu, html: deco(M.deco) + `<span class="st-top-t st-top-mo">${title}${M.chev ? `<span class="st-top-chev">${ico("chev", 16)}</span>` : ""}</span>` + deco(M.right), more: M.more };
}
export function topHtml(model) {
  const K = SHELL_KINDS[model.kind] ?? {};
  if (K.mtop) {   // 넓은 화면 쪽은 st-top-do로 감싸 휴대폰에선 숨긴다
    const m = mobileTop(K, model), K2 = { ...K, mtop: null };
    const desk = topHtml({ ...model, kind: null, _K: K2 });
    const inner = desk.replace(/^<button[^>]*data-st-menu[^>]*>[\s\S]*?<\/button>/, "").replace(/<button[^>]*data-st-more[^>]*>[\s\S]*?<\/button>$/, "");
    return `<button type="button" class="st-top-btn" data-st-menu="1" aria-hidden="true" tabindex="-1">${ico(m.menu, 22)}</button>`
      + `<span class="st-top-do">${inner}</span>` + m.html
      + `<button type="button" class="st-top-btn st-top-more" data-st-more="1" aria-label="스텔스 상단 줄 접기">${ico(m.more, 21)}</button>`;
  }
  return topCore(model, model._K ?? K);
}
function topCore(model, K) {
  if (K.top === "none")   // 제미나이식: 위 줄에 글 없음(휴대폰은 ≡·⋮만)
    return `<button type="button" class="st-top-btn" data-st-menu="1" aria-hidden="true" tabindex="-1">${ico("menu", 22)}</button><span class="st-top-t"></span><button type="button" class="st-top-btn st-top-more" data-st-more="1" aria-label="스텔스 상단 줄 접기">${ico("vdots", 21)}</button>`;
  if (K.top === "chat") {   // GPT식: [폴더] 채팅 이름 ⌄ ……… 공유 (휴대폰도 같은 줄, 왼쪽 ≡)
    const name = String(model.sub || model.title || "").trim();
    return `<button type="button" class="st-top-btn" data-st-menu="1" aria-hidden="true" tabindex="-1">${ico("menu", 22)}</button>`
      + (K.topPlain ? `<span class="st-top-t"><b style="min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:500">${esc(name)}</b></span><span class="st-top-share">${ico("fwdshare", 20)}</span>`
        : `<span class="st-top-t"><span class="st-top-fold">${ico("folder", 18)}</span><b style="min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(name)}</b><span class="st-top-chev">${ico("chev", 16)}</span></span>`
        + `<span class="st-top-share">${ico("share", 18)}<span>공유</span></span>`)
      + `<button type="button" class="st-top-btn st-top-more" data-st-more="1" aria-label="스텔스 상단 줄 접기">${ico("vdots", 21)}</button>`;
  }
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
  let folded = true, nativeOpen = false, plain = false, onChat = true, doc = null, timer = null, last = "", dead = false, busy = false, popOpen = false, inflight = Promise.resolve();
  const cache = { idx: "", at: 0, char: null, user: "", userAt: 0 };
  const FRESH = opts.freshMs ?? 90000, USER_TTL = 120000;
  const kind = opts.kind ?? "claude";
  const foldReady = Promise.resolve();   // 접기 버튼은 없앴다(11-08): 화면 폭으로만 정한다
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
      { const r = await (await d.querySelector("body"))?.getBoundingClientRect?.().catch(() => null); folded = !(r && r.width > 760); }   // 기본: PC 펼침 · 휴대폰 접힘(휴대폰은 펼치면 채팅을 덮는다)
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
      const model = { mobile: true, kind, word: opts.word, user, plan: opts.plan, icon: opts.icon, rows, title: opts.title || char?.name || "", sub: opts.sub || cur?.name || "" };
      const rootEl = await put(d, ROOT, "div", shellHtml(model), "st-sb"); await rootEl?.setAttribute("x-fold", folded ? "1" : "0"); await rootEl?.setAttribute("x-rail", SHELL_KINDS[kind]?.rail ? "1" : "0");
      await setVis(d);
      const topEl0 = await put(d, TOP, "div", topHtml(model), "st-top"); await topEl0?.setAttribute("x-empty", SHELL_KINDS[kind]?.top === "none" ? "1" : "0");
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
export var SMALL_SEL = '.st-msg .st-body :is(img, video, [style*="url("])[x-st-m="s"]:not([x-st-fw] *)';
// '작다'고 본 그림은 이 시간 동안만 다시 잰다. 지나면 "S"로 굳혀 더 재지 않는다(차례마다 재는 일이 끝없이 쌓이지 않게).
export var RECHECK_MS = 20000;
export var WIDE_W = 320, WIDE_H = 60;
export async function wrapMedia(d, { log = () => {}, rand = () => 1 + Math.floor(Math.random() * 9), now = () => Date.now() } = {}) {
  let n = 0, min = FOLD_MIN;
  // '작다'고 본 그림(s)도 다시 잰다: 좁은 창에서 리스가 채팅을 새로 그리면 그림을 받는 중(깨진 아이콘 크기)에 재게 되어
  // 일러스트까지 전부 '작음'으로 남았다(11-08 실기기 진단: 19개 모두 s). 많지 않으니 차례마다 다시 본다.
  const small = [];
  for (const el of await listItems(await d.querySelectorAll(SMALL_SEL)?.catch?.(() => []) ?? [])) {
    if (!el) continue;
    const since = Number(await el.getAttribute?.("x-st-s")?.catch?.(() => null) ?? NaN);
    if (Number.isFinite(since) && now() - since > RECHECK_MS) { try { await el.setAttribute("x-st-m", "S"); } catch { /* 다음에 */ } continue; }
    small.push(el);
  }
  const list = [...await listItems(await d.querySelectorAll(MEDIA_SEL)), ...small.slice(0, 60)];
  if (list.length) {   // 휴대폰(폭 ≤760): 그림이 화면에 맞춰 줄어들어 220px 아래로 떨어진다 → 기준을 화면 폭의 절반으로(11-08 실기기)
    const vw = (await (await d.querySelector?.("body")?.catch?.(() => null))?.getBoundingClientRect?.().catch?.(() => null))?.width ?? 0;
    if (vw > 0 && vw <= 760) min = Math.min(FOLD_MIN, Math.round(vw * 0.4));
  }
  for (const el of list) {
    if (!el) continue;
    try {
      // 재기 전엔 CSS가 자리는 두고 안 보이게만 한다(visibility) → 실제 크기를 잴 수 있다. 크기가 0이면 아직 안 받은 것 → 다음 차례에 다시
      const r = await el.getBoundingClientRect?.().catch?.(() => null);
      if (r && !(r.width > 0 && r.height > 0)) continue;
      // 넓은 띠 그림(캐릭터 컷 등: 폭 ≥320·높이 ≥60)은 짧은 변이 작아도 접는다(11-08 좁은 창 사진: 416×95)
      if (r && Math.min(r.width, r.height) < min && !(r.width >= WIDE_W && r.height >= WIDE_H)) {
        if (!small.includes(el)) { await el.setAttribute("x-st-m", "s"); await el.setAttribute("x-st-s", String(now())); }
        try { await el.setAttribute("x-st-sz", `${Math.round(r.width)}x${Math.round(r.height)}`); } catch { /* 진단용일 뿐 */ }
        continue;
      }
      await el.setAttribute("x-st-m", "1");
      const box = await d.createElement("div"), lab = await d.createElement("div");
      await box.setAttribute("x-st-fw", "1"); await box.setAttribute("x-open", "0");
      await lab.setAttribute("x-st-fl", "1"); await lab.setInnerText(`파일 ${rand()}개 읽음, 명령어 ${rand()}개 실행함`);   // 클로드 코드처럼(11-08 사용자 요청)
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
// 답변마다 'Nm SSs 동안 처리함'에 쓸 시간을 한 번 정해 둔다(x-st-th). GPT 모양 CSS만 이것을 보여 준다.
export async function markThinking(d, rand = Math.random) {
  let n = 0;
  for (const el of await listItems(await d.querySelectorAll(".st-msg.st-char:not([x-st-th])"))) {
    const sec = 8 + Math.floor(rand() * 110);
    try { await el?.setAttribute("x-st-th", sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`); n++; } catch { /* 다음에 */ }
  }
  return n;
}
var folder = null;
function startFolder(api, log) {
  if (folder) return;
  let busy = false;
  const tick = async () => { if (busy) return; busy = true; try { const d = await api.getRootDocument?.(); if (d) { await wrapMedia(d, { log }); await markThinking(d); } } catch { /* 다음에 */ } finally { busy = false; } };
  folder = setInterval(tick, 1500); folder?.unref?.(); tick();
}
function stopFolder() { if (folder) { clearInterval(folder); folder = null; } }

// ── 하나만 켜 두는 관리: 설정이 바뀔 때마다 부른다 ──
var current = null;
export async function syncShell(api, state, log) {
  const id = state?.active, P = id ? PRESETS[id] : null;
  setFoldOn(!!(P && state.hideImages !== false));
  if (P && state.hideImages !== false) startFolder(api, log ?? (() => {})); else stopFolder();
  const want = (P?.sidebar ?? P?.shell) ? id : null;
  if (current) { const c = current; current = null; await c.shell.destroy().catch(() => {}); }
  if (!want) return null;
  const L = mergeLabels(id, state.labels?.[id]);
  const kindId = P.sidebar ?? P.shell;
  const shell = createShell(api, { kind: kindId, icon: safeIconUrl(state.icons?.[id]) || SHELL_KINDS[kindId]?.icon || "", title: L.title, sub: L.sub, note: L.note, user: L.user, plan: L.plan || undefined, log });
  current = { id, shell };
  return shell;
}
export var shellState = () => current?.id ?? null;
