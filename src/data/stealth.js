// 더스크 스텔스: 리스 채팅을 다른 AI 채팅 앱처럼 보이게 하는 테마 5종(클로드·GPT·코덱스·제미나이·딥시크).
// 로고·상표 이미지는 쓰지 않고 색·배치·글꼴 분위기만 따른다. 가짜 문구(제목·모델·도구 줄)는 설정에서 바꾼다.
// 결과는 기존 테마 시스템(data/themes.js)의 테마 한 개({css, html, useTokens:false})로 만들어 같은 길로 적용·되돌린다.
import { TARGETS } from "./themes.js";
import { SHELL_CSS } from "./stealth-shellcss.js";

export var STEALTH_KEY = "rbm:stealth:v1";
export var STEALTH_PREFIX = "스텔스 · ";

/** CSS content: "…" 안에 안전하게 넣는다(따옴표·역슬래시·줄바꿈 제거). */
export var cssText = (s) => String(s ?? "").replace(/[\\"\n\r{}<>]/g, " ").trim().slice(0, 80);
/** HTML 글자 이스케이프. */
export var htmlText = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]).slice(0, 80);

var SANS = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Malgun Gothic", sans-serif`;
var MONO = `"JetBrains Mono", "Cascadia Code", "D2Coding", Consolas, monospace`;

// 프리셋마다 다른 것: 색(라이트/다크), 글꼴, 모양 값, 기본 문구, 말투 줄(html)과 장식
export var PRESETS = {
  claude: {
    label: "클로드", desc: "클로드 앱: 왼쪽 사이드바(최근 항목=채팅 목록), 둥근 입력창, 작업 줄",
    font: SANS, accent: "#d97757", radius: 16, input: 24, width: 820, shell: "claude", mob: "box",
    light: { bg: "#ffffff", side: "#f9f9f9", bubble: "#f3f3f3", inputBg: "#ffffff", fg: "#1a1a1a", fg2: "#666666", dim: "#787878", line: "#ebebeb", line2: "#cecece", cbg: "#f3f2ee", cline: "#e2e0d8", cfg: "#2f6fb5", mi: "#ffffff", mline: "#e3e2dc", mb: "#f0efea", ms: "#c96442", msf: "#ffffff", mic: "#3d3d3a" },
    dark: { bg: "#1a1a1a", side: "#1f1f1f", bubble: "#2b2b2b", inputBg: "#262626", fg: "#ececec", fg2: "#a0a0a0", dim: "#8c8c8c", line: "#2e2e2e", line2: "#3d3d3d", cbg: "#272727", cline: "#3a3a3a", cfg: "#7ba7e0", mi: "#20201e", mline: "#30302e", mb: "#313131", ms: "#c46141", msf: "#ffffff", mic: "#ececec" },
    labels: { title: "", sub: "", tool: "명령어 13개 실행함", model: "Sonnet 5.5 낮음   자동", note: "Claude는 AI이며 실수할 수 있습니다.", left: "", think: "✻  Thinking…", user: "", plan: "Pro" }
  },
  claudecode: {
    label: "클로드 코드", desc: "클로드 앱의 Code 탭: 세션 목록 사이드바, 작업 입력창, 하단 모델 줄",
    font: SANS, accent: "#d97757", radius: 16, input: 24, width: 820, shell: "code", extra: "code", mob: "box",
    light: { bg: "#ffffff", side: "#f9f9f9", bubble: "#f3f3f3", inputBg: "#ffffff", fg: "#1a1a1a", fg2: "#666666", dim: "#787878", line: "#ebebeb", line2: "#cecece", cbg: "#f3f2ee", cline: "#e2e0d8", cfg: "#2f6fb5", mi: "#ffffff", mline: "#e3e2dc", mb: "#f0efea", ms: "#c96442", msf: "#ffffff", mic: "#3d3d3a" },
    dark: { bg: "#1a1a1a", side: "#1f1f1f", bubble: "#2b2b2b", inputBg: "#262626", fg: "#ececec", fg2: "#a0a0a0", dim: "#8c8c8c", line: "#2e2e2e", line2: "#3d3d3d", cbg: "#272727", cline: "#3a3a3a", cfg: "#7ba7e0", mi: "#20201e", mline: "#30302e", mb: "#313131", ms: "#c46141", msf: "#ffffff", mic: "#ececec" },
    labels: { title: "", sub: "", tool: "파일 3개 읽음, 결제 흐름 검색함", model: "Opus   매우 높음", note: "", left: "자동", think: "✻  Thinking…", user: "", plan: "Pro" }
  },
  gpt: {
    label: "GPT", desc: "흑백, 오른쪽 회색 말풍선, 알약 모양 입력창",
    font: SANS, accent: "#0d0d0d", radius: 18, input: 28, width: 760, sidebar: "gpt", extra: "gpt", mob: { m: 32, h: 46, pl: 5, pr: 8, send: 30, gap: 14, tp: 6, icon: 24, stroke: 2 },
    light: { bg: "#ffffff", side: "#f9f9f9", bubble: "#f4f4f4", inputBg: "#f4f4f4", fg: "#0d0d0d", fg2: "#5d5d5d", dim: "#8f8f8f", line: "#ececec", line2: "#d9d9d9", cbg: "#ececec", cline: "transparent", cfg: "#0d0d0d", mi: "#ffffff", mline: "transparent", mb: "transparent", ms: "#ff7f66", msf: "#ffffff", mic: "#0d0d0d" },
    dark: { bg: "#212121", side: "#171717", bubble: "#303030", inputBg: "#303030", fg: "#ececec", fg2: "#b4b4b4", dim: "#8e8e8e", line: "#2f2f2f", line2: "#424242", cbg: "#424242", cline: "transparent", cfg: "#ececec", mi: "#303030", mline: "transparent", mb: "transparent", ms: "#ff7f66", msf: "#ffffff", mic: "#ececec" },
    labels: { title: "", sub: "", model: "GPT  ⌄", tool: "", think: "생각하는 중…", plan: "Plus" }
  },
  codex: {
    label: "코덱스", desc: "코덱스 앱: 왼쪽 아이콘 줄 + 사이드바(최근 채팅), 둥근 사각 입력창, 오른쪽 말풍선",
    font: SANS, accent: "#ececec", radius: 18, input: 22, width: 820, sidebar: "codex", terminal: false,
    light: { bg: "#ffffff", side: "#f7f7f7", bubble: "#f0f0f0", inputBg: "#ffffff", fg: "#1a1a1a", fg2: "#5f5f5f", dim: "#8a8a8a", line: "#e8e8e8", line2: "#d0d0d0", cbg: "#f0f0f0", cline: "#e0e0e0", cfg: "#1a1a1a" },
    dark: { bg: "#181818", side: "#202020", bubble: "#2f2f2f", inputBg: "#262626", fg: "#ececec", fg2: "#a8a8a8", dim: "#8a8a8a", line: "#2a2a2a", line2: "#3a3a3a", cbg: "#2f2f2f", cline: "#3a3a3a", cfg: "#ececec" },
    labels: { title: "", sub: "", model: "6 Luna Medium  ⌄", tool: "", think: "생각하는 중…", plan: "" }
  },
  gemini: {
    label: "제미나이", desc: "연한 파랑 배경, 큰 알약 입력창, 그라데이션 인사",
    font: `"Google Sans", "Product Sans", ${SANS}`, accent: "#4285f4", radius: 20, input: 32, width: 800, sidebar: "gemini", mob: { m: 19, h: 75, pl: 20, pr: 19, send: 37, gap: 9, tp: 14, icon: 26, stroke: 1.8 },
    light: { bg: "#ffffff", side: "#f0f4f9", bubble: "#e9eef6", inputBg: "#f0f4f9", fg: "#1f1f1f", fg2: "#444746", dim: "#747775", line: "#e3e3e3", line2: "#c4c7c5", cbg: "#e9eef6", cline: "transparent", cfg: "#1f1f1f", mi: "#ffffff", mline: "transparent", mb: "transparent", ms: "#9ed2ff", msf: "#000000", mic: "#1f1f1f" },
    dark: { bg: "#131314", side: "#1e1f20", bubble: "#282a2c", inputBg: "#1e1f20", fg: "#e3e3e3", fg2: "#c4c7c5", dim: "#8e918f", line: "#2d2f31", line2: "#444746", cbg: "#2b2c2f", cline: "transparent", cfg: "#e3e3e3", mi: "#1e1f20", mline: "transparent", mb: "transparent", ms: "#9ed2ff", msf: "#062e6f", mic: "#e3e3e3" },
    labels: { title: "", sub: "", model: "Gemini 자동 모드  ⌄", tool: "", think: "생각하는 중…", plan: "" }
  },
  deepseek: {
    label: "딥시크", desc: "파란 포인트, 깔끔한 말풍선, 접힌 '생각 과정' 줄",
    font: SANS, accent: "#4d6bfe", radius: 14, input: 18, width: 780, sidebar: "deepseek",
    light: { bg: "#ffffff", side: "#f9fafb", bubble: "#eff6ff", inputBg: "#f3f4f6", fg: "#0f1115", fg2: "#4b5563", dim: "#8b919a", line: "#eceef1", line2: "#d4d8de", cbg: "#ececec", cline: "transparent", cfg: "#0f1115" },
    dark: { bg: "#1b1c1f", side: "#141517", bubble: "#26282d", inputBg: "#292a2e", fg: "#e8eaed", fg2: "#a0a4ab", dim: "#7a7f87", line: "#2a2c30", line2: "#3b3d43", cbg: "#33353a", cline: "transparent", cfg: "#e8eaed" },
    labels: { title: "", sub: "", model: "깊은 생각  ·  검색", tool: "✓ 깊이 생각함 (소요 12초)", think: "생각하는 중…", plan: "" }
  }
};
export var PRESET_IDS = Object.keys(PRESETS);
// 이미지·영상 접기(0.3.6): 메시지마다 채팅 HTML에 '›_ 명령어 N개 실행함 ›' 접힘을 하나 두고, 접혀 있으면 그 메시지의 이미지를 모두 숨긴다.
// 이미지가 정규식·에셋 어디서 나오든(글 순서와 상관없이) 메시지 단위로 숨기고 펼치므로 훅이 필요 없다(채팅 열기가 느려지지 않음).
// N(1~9)은 메시지 순서로 돌린다(CSS만).
// GPT 모양만(docs/STEALTH.md 7-1): 답변 위 'Nm SSs 동안 처리함 ›' 줄(시간은 stealth-shell markThinking이 x-st-th로 정해 둔다),
// "…"·'…'(리스 mark risu-mark=quote*)는 줄을 바꿔 앞에 ・
export function gptExtraCss() {
  return `.st-msg.st-char[x-st-th]::before { content: attr(x-st-th) " 동안 처리함  ›"; display: block; color: var(--st-dim); font-size: 14px; padding: 0 0 10px; margin: 0 0 12px; border-bottom: 1px solid var(--st-line); }`;
}
// "…"·'…'(리스 mark risu-mark=quote*)는 줄을 바꿔 앞에 ・ (프리셋 quoteDot: 클로드·GPT, 사용자 지정 11-08)
export var quoteDotCss = (g = "・") => `.chattext mark[risu-mark^="quote"] { display: block; margin: .35em 0; }
.chattext mark[risu-mark^="quote"]::before { content: "${g === true ? "・" : cssText(g)}"; margin-right: .3em; }`;
// 클로드 코드 모양: 사용자 글은 파란 기운 상자 + 파란 글자(docs/STEALTH.md 7-3)
export var codeExtraCss = () => `.st-user .st-body { background: color-mix(in srgb, #4a8cff 15%, var(--st-bg)) !important; border-radius: 12px !important; }
.st-user .st-body .chattext, .st-user .st-body .chattext p, .st-user .st-body .chattext span, .st-user .st-body .chattext li { color: color-mix(in srgb, #4a8cff 75%, var(--st-fg)) !important; }`;
export function imageFoldCss() {
  // 이미지·배경 그림마다 접힘 줄: 스텔스가 화면에서 각 이미지를 [x-st-fw] 상자로 감싸고 맨 위에 [x-st-fl] 줄을 넣는다(stealth-shell.js wrapMedia).
  // 접힌 이미지는 display:none 대신 1px로 숨긴다 — 배경 그림은 display:none이면 받기를 미뤄서, 휴대폰에서 누른 뒤에야 받느라 늦게 떴다(미리 받아 둠).
  // 감싸기 전 잠깐은 자리만 두고 안 보이게(visibility) — 실제 크기를 재서 큰 그림(짧은 변 220px 이상)만 접는다. 작은 것("s")은 그대로 보인다. 감싸기에 실패한 것("e")은 '명령어 N개 실패함' 줄이 되고, 누르면 펼쳐진다.
  const L = "[x-st-fw] > [x-st-fl]";
  const hide = "position: absolute !important; left: 0 !important; top: 0 !important; width: 1px !important; height: 1px !important; min-width: 0 !important; min-height: 0 !important; max-height: 1px !important; aspect-ratio: auto !important; opacity: 0 !important; pointer-events: none !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; border: 0 !important;";
  const lab = "color: var(--st-dim); font-size: 14px; line-height: 1.5; cursor: pointer; user-select: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent;";
  return `.st-body :is(img, video, [style*="url("]):not([x-st-m]):not([x-st-fw] *) { visibility: hidden !important; }
.st-body { position: relative; }
[x-st-fw] { display: block; position: relative; width: 100%; margin: 2px 0 8px; }
${L} { width: fit-content; max-width: 100%; display: flex; align-items: center; ${lab} }
${L}::before { content: "›_"; display: inline-block; width: 1.6em; font-family: var(--st-mono); letter-spacing: -.08em; }
${L}::after { content: "›"; display: inline-block; margin-left: .5em; font-size: 1.15em; transition: transform .15s; }
[x-st-fw][x-open="1"] > [x-st-fl]::after { transform: rotate(90deg); }
${L}:hover { color: var(--st-fg); }
[x-st-fw][x-open="0"] > :not([x-st-fl]) { ${hide} }
[x-st-fw][x-open="1"] > :not([x-st-fl]) { margin-top: 6px; }
:is(img, video)[x-st-m="e"]:not([x-st-o="1"]) { display: none !important; }
[x-st-pe][x-st-po="1"] > :is(img, video)[x-st-m="e"] { display: revert !important; }
[x-st-m="e"]:not(img, video):not([x-st-o="1"]) { background: none !important; width: auto !important; height: auto !important; min-height: 0 !important; aspect-ratio: auto !important; border: 0 !important; padding: 0 !important; margin: 2px 0 8px !important; box-shadow: none !important; transform: none !important; ${lab} }
[x-st-m="e"]:not(img, video):not([x-st-o="1"]) > * { display: none !important; }
[x-st-m="e"]:not(img, video):not([x-st-o="1"])::before { content: "›_  명령어 " attr(x-st-n) "개 실패함  ›"; display: block; }
[x-st-pe]::before { content: "›_  명령어 " attr(x-st-pe) "개 실패함  ›"; display: block; margin: 2px 0 8px; ${lab} }
[x-st-pe][x-st-po="1"]::before { content: "›_  명령어 " attr(x-st-pe) "개 실패함  ⌄"; }`;
}
export var LABEL_KEYS = ["title", "sub", "tool", "model", "note", "left", "think", "user", "plan"];

// 휴대폰 입력창 아이콘(+·마이크·↑)은 CSS 배경 그림(data: SVG)으로 그린다 — 리스 버튼의 원래 아이콘은 숨긴다. 색은 모양·밝기마다 정해 변수로 넣는다.
var MICO = { plus: '<path d="M12 5v14M5 12h14"/>', mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>' };
export var svgUri = (path, color, sw = 1.8) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='${sw}' stroke-linecap='round' stroke-linejoin='round'>${path.replace(/"/g, "'")}</svg>`)}")`;
var vars = (p, c, scheme) => Object.entries({
  bg: c.bg, side: c.side, bubble: c.bubble, input: c.inputBg, fg: c.fg, fg2: c.fg2, dim: c.dim, line: c.line, line2: c.line2,
  cbg: c.cbg ?? c.bubble, cline: c.cline ?? c.line, cfg: c.cfg ?? c.fg,
  ...(p.mob ? { mi: c.mi, mline: c.mline, mb: c.mb, ms: c.ms, "i-plus": svgUri(MICO.plus, c.mic, p.mob.stroke ?? 1.8), "i-mic": svgUri(MICO.mic, c.mic, p.mob.stroke ?? 1.7), "i-up": svgUri(MICO.up, c.msf, 2) } : {})
}).map(([k, v]) => `  --st-${k}: ${v};`).join("\n");

// 따옴표("…"·'…', 리스 mark risu-mark=quote*)는 그 앱의 인라인 코드처럼 상자로(사용자 지정 11-12, 예전 '・ 줄'을 바꿈). 색은 --st-cbg·--st-cline·--st-cfg
export var quoteBoxCss = () => `.st-body .chattext mark[risu-mark^="quote"] { display: inline; font-family: var(--st-mono) !important; font-size: .88em !important; color: var(--st-cfg) !important; background: var(--st-cbg) !important; border: 1px solid var(--st-cline); border-radius: 6px; padding: .1em .4em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.st-body .chattext mark[risu-mark^="quote"] * { font: inherit !important; color: inherit !important; background: none !important; }`;

// 휴대폰 입력창(사진 11-12, 클로드·클로드 코드·GPT·제미나이). 리스 줄: [스티커?] 글 칸 · (보내기|멈춤) · 메뉴(마지막 칸).
// 메뉴 칸 = '+' 버튼, 그 ::after = 마이크(장식), ::before = 안내 글(클로드). 보내기 = 강조색 동그라미 + ↑.
// "box"(클로드): 위는 글 칸, 아래 줄 [+] [모델 알약] …… [마이크] [보내기]. 알약은 상자의 ::before(모델)·::after(세기, 흐린 글)
// 숫자 묶음(GPT·제미나이): 한 줄 알약 [+] 글 …… [마이크] [보내기]
export function splitModel(label) {
  const t = String(label ?? "").replace(/\s+/g, " ").trim();
  const m = t.match(/^(.*?) ((?:매우 )?(?:낮음|중간|높음)|최대)(?: 자동)?$/);   // 넓은 화면용 꼬리(' 자동')는 뺀다
  return m && m[1] ? [m[1], m[2]] : [t, ""];
}
function mobileInputCss(P, L) {
  const S = "div:has(> .text-input-area)", menu = `${S} > :last-child:is(div, button):not(.text-input-area):not(.button-icon-send):not(:has(.loadmove))`;
  const send = `${S} > .button-icon-send.button-icon-send`, stop = `${S} > div:has(> .loadmove)`;
  const hideIco = `${S} > :not(.text-input-area) > svg { display: none !important; }`;
  if (P.mob === "box") {
    const [m1, m2] = splitModel(L.model);
    const pill = "flex: none; position: static; order: 2; height: 34px; line-height: 34px; padding: 0; font-size: 15px; white-space: pre; background: var(--st-mb); pointer-events: none;";
    return `${S} { display: flex !important; width: calc(100% - 30px) !important; max-width: none; margin: ${L.note ? 30 : 8}px 15px 10px !important; padding: 14px 8px 8px !important; border-radius: 26px; background: var(--st-mi) !important; border: 1px solid var(--st-mline) !important; box-shadow: none; flex-wrap: wrap !important; align-items: center !important; column-gap: 0; row-gap: 12px; }
  ${S} > .text-input-area { flex: 1 0 100% !important; order: -1; min-height: 28px; margin: 0 !important; padding: 2px 8px !important; font-size: 16px !important; resize: none; }
  ${hideIco}
  ${menu} { order: 1; position: static !important; flex: none; width: 34px; height: 34px; margin: 0 8px 0 0 !important; padding: 0 !important; border-radius: 50% !important; transform: none; background: var(--st-i-plus) center / 20px 20px no-repeat var(--st-mb) !important; }
  ${menu}::after { content: ""; position: absolute; right: 50px; bottom: 8px; width: 34px; height: 34px; border-radius: 50%; background: var(--st-i-mic) center / 20px 20px no-repeat var(--st-mb); pointer-events: none; }
  ${L.note ? `${menu}::before { content: "${cssText(L.note)}"; position: absolute; left: 6px; top: -24px; color: var(--st-dim); font-size: 12.5px; white-space: nowrap; pointer-events: none; }` : ""}
  ${m1 ? `${S}::before { content: "${cssText(m1)}"; ${pill} padding: 0 ${m2 ? 5 : 14}px 0 14px; border-radius: ${m2 ? "999px 0 0 999px" : "999px"}; color: var(--st-fg); }` : `${S}::before { content: none; }`}
  ${m1 && m2 ? `${S}::after { content: "${cssText(m2)}"; ${pill} padding: 0 14px 0 0; border-radius: 0 999px 999px 0; color: var(--st-dim); }` : `${S}::after { content: none; }`}
  :is(${send}, ${stop}) { order: 3; flex: none; margin: 0 0 0 auto !important; width: 34px; height: 34px; padding: 0 !important; border-radius: 50% !important; transform: none; display: flex; align-items: center; justify-content: center; }
  ${send} { background: var(--st-i-up) center / 20px 20px no-repeat var(--st-ms) !important; }
  ${stop} { background: var(--st-ms) !important; color: #fff !important; }`;
  }
  const M = P.mob, mic = M.icon + 12;
  return `${S} { display: flex !important; width: calc(100% - ${M.m * 2}px) !important; max-width: none; margin: 8px ${M.m}px 12px !important; padding: ${(M.h - M.send) / 2}px ${M.pr}px ${(M.h - M.send) / 2}px ${M.pl}px !important; min-height: ${M.h}px; border-radius: ${M.h / 2}px; background: var(--st-mi) !important; border: 1px solid var(--st-mline) !important; box-shadow: 0 6px 28px rgba(0, 0, 0, .09), 0 1px 4px rgba(0, 0, 0, .04); flex-wrap: nowrap !important; align-items: flex-end !important; gap: 0; }
  ${S}::before, ${S}::after { content: none !important; }
  ${S} > .text-input-area { flex: 1 1 auto !important; order: 0; min-width: 0; min-height: ${M.send}px; margin: 0 ${mic + M.gap}px 0 0 !important; padding: ${(M.send - 24) / 2}px ${M.tp}px !important; font-size: 16px !important; line-height: 24px !important; resize: none; }
  ${hideIco}
  ${menu} { order: -1; position: static !important; flex: none; width: 36px; height: ${M.send}px; margin: 0 !important; padding: 0 !important; border-radius: 50% !important; transform: none; background: var(--st-i-plus) center / ${M.icon}px ${M.icon}px no-repeat transparent !important; }
  ${menu}::after { content: ""; position: absolute; right: ${M.pr + M.send + M.gap}px; bottom: ${(M.h - M.send) / 2}px; width: ${mic}px; height: ${M.send}px; background: var(--st-i-mic) center / ${M.icon}px ${M.icon}px no-repeat; pointer-events: none; }
  :is(${send}, ${stop}) { order: 3; flex: none; margin: 0 !important; width: ${M.send}px; height: ${M.send}px; padding: 0 !important; border-radius: 50% !important; transform: none; display: flex; align-items: center; justify-content: center; }
  ${send} { background: var(--st-i-up) center / ${Math.round(M.send * .58)}px no-repeat var(--st-ms) !important; }
  ${stop} { background: var(--st-ms) !important; color: #fff !important; }`;
}

/** 기본 문구 + 사용자가 고친 문구. 빈 문자열이면 그 장식을 뺀다. */
export function mergeLabels(id, custom = {}) {
  const base = PRESETS[id]?.labels ?? {};
  const out = {};
  for (const k of LABEL_KEYS) out[k] = typeof custom?.[k] === "string" ? custom[k] : (base[k] ?? "");
  return out;
}

/**
 * 프리셋 한 개 → { name, css, html }.
 * opts: { scheme: "auto"|"light"|"dark", labels:{title,model,tool,think}, hideImages, blurAvatars, hideSidebar }
 */
export function buildStealth(id, opts = {}) {
  const P = PRESETS[id];
  const SB = P?.sidebar ?? P?.shell;   // 사이드바 종류(stealth-shell SHELL_KINDS). P.shell은 클로드식 입력창 배치까지 뜻한다(docs/STEALTH.md)
  if (!P) throw new Error(`모르는 스텔스 테마예요: ${id}`);
  const scheme = ["light", "dark"].includes(opts.scheme) ? opts.scheme : "auto";
  const L = mergeLabels(id, opts.labels);
  const hideImages = opts.hideImages !== false, blurAvatars = opts.blurAvatars !== false, hideSidebar = !!opts.hideSidebar;
  const root = scheme === "dark" ? `:root {\n${vars(P, P.dark)}` : `:root {\n${vars(P, P.light)}`;
  const darkBlock = scheme === "auto" ? `@media (prefers-color-scheme: dark) {\n  :root {\n${vars(P, P.dark).replace(/^/gm, "  ")}\n  }\n}` : "";
  const code = !!P.terminal;   // 터미널 모양(고정폭·› 줄). 코덱스는 11-08 사진대로 일반 채팅 앱이 되어 지금 쓰는 모양 없음
  // 입력창: :has는 화면이 클수록 비싸므로 한 번만 쓰고 나머지는 CSS 중첩으로 이어 쓴다
  const mlab = L.model ? (P.shell
    ? `&::after { content: "${cssText(L.model)}"; position: absolute; right: 6px; bottom: -30px; color: var(--st-fg2); font-size: 12.5px; white-space: pre; pointer-events: none; }`
    : `&::after { content: "${cssText(L.model)}"; position: absolute; left: 56px; bottom: 12px; color: var(--st-dim); font-size: 12.5px; white-space: pre; pointer-events: none; }`) : "";
  const llab = P.shell && L.left ? `&::before { content: "${cssText(L.left)}"; position: absolute; left: 12px; bottom: -30px; color: var(--st-fg2); font-size: 12.5px; white-space: pre; pointer-events: none; }` : "";
  const inputBlock = `div:has(> .text-input-area) {
  position: relative; box-sizing: border-box; width: calc(100% - 48px) !important; max-width: calc(var(--st-w) - 48px);
  margin: 8px auto ${P.shell ? 52 : 20}px !important; padding: 10px 10px ${L.model && !P.shell ? 8 : 10}px 6px !important;
  background: var(--st-input) !important; border: 1px solid var(--st-line2); border-radius: var(--st-ri);
  box-shadow: 0 2px 10px rgba(0, 0, 0, .06); align-items: flex-start !important;
  &:focus-within { border-color: var(--st-dim); }
  ${mlab}
  ${llab}
  > div, > button { margin: 0 0 0 4px !important; border: none !important; border-radius: 10px !important; background: transparent !important; color: var(--st-dim) !important; padding: 7px !important; align-self: flex-end; }
  > div:hover, > button:hover { color: var(--st-fg) !important; background: var(--st-bubble) !important; }
  > .button-icon-send { background: var(--st-accent) !important; color: #fff !important; }
  > .button-icon-send:hover { filter: brightness(1.08); }
}
.text-input-area { margin: 0 0 ${L.model && !P.shell ? 34 : 0}px 0 !important; padding: 4px 10px !important; font-size: 15px !important; color: var(--st-fg) !important; border: none !important; border-radius: 0 !important; background: transparent !important; }
.text-input-area::placeholder { color: var(--st-dim); }
@media (max-width: 760px) {
  .st-msg { max-width: 100%; padding: 6px 18px; }
  .st-user .st-body { max-width: 85%; border-radius: 20px; padding: 10px 16px; }
  .st-body .chattext, .st-body .chattext p, .st-body .chattext li, .st-body .chattext span { font-size: 16px !important; line-height: 1.6 !important; }
  ${P.mob ? mobileInputCss(P, L) : `  /* 클로드 앱 입력창: 위는 글 칸, 아래 한 줄에 리스 버튼 · 모델 칩 · 둥근 보내기. 리스 버튼은 지우지 않고 작게 */
  div:has(> .text-input-area) { width: calc(100% - 20px) !important; max-width: none; margin: ${P.shell && L.note ? 30 : 8}px 10px 10px !important; padding: 10px 8px 8px !important; border-radius: ${Math.max(P.input, 24)}px; flex-wrap: wrap !important; align-items: center !important; column-gap: 2px; row-gap: 4px; }
  div:has(> .text-input-area) > .text-input-area { flex: 1 0 100% !important; order: -1; min-height: 40px; margin: 0 !important; padding: 4px 10px !important; font-size: 16px !important; }
  div:has(> .text-input-area) > div, div:has(> .text-input-area) > button { flex: none; margin: 0 !important; padding: 6px !important; transform: scale(.9); }
  div:has(> .text-input-area) > .button-icon-send { order: 3; margin-left: auto !important; width: 40px; height: 40px; border-radius: 50% !important; display: flex; align-items: center; justify-content: center; transform: none; }
  ${L.model ? `div:has(> .text-input-area)::after { position: static; order: 2; flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; margin-left: 2px; padding: 6px 12px; border-radius: 999px; background: var(--st-bubble); color: var(--st-fg); font-size: 13px; white-space: nowrap; }` : ""}
  ${P.shell && L.note ? `div:has(> .text-input-area)::before { content: "${cssText(L.note)}"; position: absolute; left: 6px; top: -24px; bottom: auto; color: var(--st-dim); font-size: 12.5px; white-space: nowrap; pointer-events: none; }` : ""}`}
}`;
  const css = [
    `/* Dusk Stealth · ${P.label} */`,
    `${root}\n  --st-accent: ${P.accent};\n  --st-font: ${P.font};\n  --st-mono: ${MONO};\n  --st-r: ${P.radius}px;\n  --st-ri: ${P.input}px;\n  --st-w: ${P.width}px;\n}`,
    darkBlock,
    `:root {
  --risu-theme-bgcolor: var(--st-bg) !important;
  --risu-theme-darkbg: var(--st-side) !important;
  --risu-theme-borderc: var(--st-accent) !important;
  --risu-theme-selected: var(--st-bubble) !important;
  --risu-theme-textcolor: var(--st-fg) !important;
  --risu-theme-textcolor2: var(--st-dim) !important;
  --risu-theme-darkborderc: var(--st-line) !important;
  --risu-theme-darkbutton: var(--st-bubble) !important;
  --FontColorStandard: var(--st-fg) !important;
  --FontColorBold: var(--st-fg) !important;
  --FontColorItalic: var(--st-fg2) !important;
  --FontColorItalicBold: var(--st-fg2) !important;
  --FontColorQuote1: var(--st-fg) !important;
  --FontColorQuote2: var(--st-fg) !important;
}
.chattext mark[risu-mark] { background-color: transparent !important; color: var(--st-fg) !important; }
.chattext mark[risu-mark^="blockquote"] { border-left: 3px solid var(--st-line2) !important; color: var(--st-fg2) !important; }
.chattext mark[risu-mark^="quote"] { color: var(--st-dim) !important; }
html, body { font-family: ${code ? "var(--st-mono)" : "var(--st-font)"} !important; }
button, input, textarea, select { font-family: inherit; }
code, pre, kbd, samp { font-family: var(--st-mono) !important; }
body { background: var(--st-bg) !important; color: var(--st-fg); }
div:has(> .default-chat-screen) { background: var(--st-bg) !important; background-image: none !important; }
.default-chat-screen { font-size: ${code ? 14 : 15}px; line-height: ${code ? 1.55 : 1.65}; }`,
    hideSidebar || SB
      ? (SB ? `.rs-sidebar, .risu-sidebar { background: var(--st-side) !important; box-shadow: none !important; border-right: 1px solid var(--st-line); }` : `.rs-sidebar, .risu-sidebar { display: none !important; }`)   // 클로드 계열: 순정 사이드바를 열면 그게 보이고 스텔스 사이드바가 숨는다(stealth-shell nativeSidebarOpen)
      : `.rs-sidebar, .risu-sidebar { background: var(--st-side) !important; box-shadow: none !important; border-right: 1px solid var(--st-line); }`,
    blurAvatars ? `.sidebar-avatar, .avatar img, .avatar div { filter: grayscale(1) blur(4px) opacity(.4); }` : "",
    SB
      ? `:root { --st-sw: ${SB === "codex" ? "clamp(290px, 21vw, 340px)" : "clamp(220px, 16vw, 290px)"}; }
body[x-dusk-st][x-dusk-fold="0"] { padding-left: var(--st-sw) !important; box-sizing: border-box; }
@media (max-width: 760px) { body[x-dusk-st] { padding-left: 0 !important; } }`
      : (L.title ? `body::before { content: "${cssText(L.title)}"; position: fixed; top: 0; left: 0; right: 0; height: 44px; z-index: 30; display: flex; align-items: center; padding: 0 24px; background: var(--st-bg); border-bottom: 1px solid var(--st-line); color: var(--st-fg2); font-size: 13px; font-weight: 500; white-space: pre; overflow: hidden; pointer-events: none; }
` : ""),
    // 포켓리스: .st-msg를 감싼 상자가 내용 폭으로 줄어(313px) 가운데 맞춤이 안 먹고 왼쪽에 붙었다 → 감싼 상자를 꽉 채운다. 범위를 채팅 메시지 상자로 좁힌다(전체 요소에 :has를 걸면 채팅이 바뀔 때마다 화면 전체를 다시 따져 느려진다)
    `.risu-chat .grow > div:has(> .st-msg) { width: 100%; max-width: 100%; min-width: 0; flex: 1 1 100%; }
` +
    `.st-msg { width: 100%; max-width: var(--st-w); margin: 0 auto; padding: 6px 24px; box-sizing: border-box; min-width: 0; position: relative; color: var(--st-fg); display: flex; flex-direction: column; }
.st-body { min-width: 0; }
.st-user { align-items: flex-end; }
.st-user .st-body { max-width: 78%; background: var(--st-bubble); border-radius: var(--st-r); padding: 10px 16px; }
.st-user .st-tool, .st-system .st-tool { display: none; }
.st-tool { width: fit-content; max-width: 100%; margin: 4px 0 10px; color: var(--st-dim); font-size: 14px; line-height: 1.5; }
.st-tchev { margin-left: 6px; font-size: 10px; }
.st-body .chattext, .st-body .chattext p, .st-body .chattext li, .st-body .chattext span { color: var(--st-fg); font-size: ${code ? 14 : 15}px !important; line-height: ${code ? 1.55 : 1.65} !important; }
.st-body .chattext p { margin: 0 0 .8em !important; }
.st-body .chattext p:last-child { margin-bottom: 0 !important; }
.st-body .chattext em, .st-body .chattext i { color: var(--st-fg2) !important; }
.st-body .chattext strong, .st-body .chattext b { color: var(--st-fg) !important; font-weight: 600; }
.st-body .chattext code { font-family: var(--st-mono) !important; font-size: .87em; color: var(--st-fg) !important; background: var(--st-bubble) !important; border: 1px solid var(--st-line); border-radius: 5px; padding: 1px 5px; }
.st-body .chattext code::before, .st-body .chattext code::after { content: none !important; }
.st-body .chattext h1, .st-body .chattext h2, .st-body .chattext h3 { color: var(--st-fg) !important; font-weight: 600; margin: .8em 0 .4em !important; }
.st-body .chattext a { color: var(--st-accent) !important; }
.st-body .chattext hr { border-color: var(--st-line) !important; }
.st-body .chattext blockquote { border-left: 3px solid var(--st-line2) !important; color: var(--st-fg2) !important; }`,
    hideImages ? imageFoldCss() : "",
    P.extra === "gpt" ? gptExtraCss() : "",
    quoteBoxCss(),
    P.extra === "code" ? codeExtraCss() : "",
    SB && !opts.minimal ? `/* Dusk Stealth 사이드바 */\n${SHELL_CSS}` : "",
    code ? `.st-user .st-body { max-width: 100%; background: transparent; border-radius: 0; padding: 0 0 0 1.4em; text-indent: -1.4em; }
.st-user .st-body::before { content: "›"; color: var(--st-accent); font-weight: 700; margin-right: .6em; }
.st-char .st-body::before { content: "•"; color: var(--st-dim); margin-right: .6em; }
.st-user { align-items: stretch; }` : "",
    `.st-btns { opacity: 0; transition: opacity .15s; font-size: 12px; margin-top: 2px; }
.st-msg:hover .st-btns { opacity: .8; }
.st-btns button { color: var(--st-dim) !important; }
.st-btns button:hover { color: var(--st-fg) !important; }
.st-body textarea { background: var(--st-input) !important; color: var(--st-fg) !important; font-size: 15px !important; border: 1px solid var(--st-line2) !important; border-radius: 10px !important; }
${inputBlock}`,
    `.loadmove { animation: none !important; border: none !important; width: 1em !important; height: 1em !important; }
.loadmove::before { content: "■"; font-size: 11px; color: var(--st-fg); }`,
    L.think ? `.loadmove::after { content: "${cssText(L.think)}"; position: absolute; left: 18px; top: -30px; color: var(--st-accent); font-size: 13.5px; white-space: pre; animation: st-pulse 1.4s ease-in-out infinite; pointer-events: none; }
@keyframes st-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }` : "",
    `html { scrollbar-color: var(--st-line2) transparent; }`
  ].filter(Boolean).join("\n");
  const html = [
    `<div class="st-msg st-{{role}}">`,
    L.tool && !hideImages ? `<div class="st-tool">${htmlText(L.tool)}<span class="st-tchev">▸</span></div>` : "",
    `<div class="st-body"><risutextbox></risutextbox></div>`,
    `<div class="st-btns"><risubuttons></risubuttons></div>`,
    `</div>`
  ].filter(Boolean).join("\n");
  // 최소 모드: 리스 전체 화면(html·body·:root·대화 화면·입력창)을 건드리는 규칙을 빼고 말풍선 꾸밈만 남긴다(스크롤·표시 문제를 가려낼 때)
  const out = opts.minimal ? css.replace(/^@media \(max-width: 760px\) \{\n  \.st-msg[\s\S]*?\n\}\n?/m, "").replace(/^(?:html, body|html|body|button, input, textarea, select|div:has\(> \.default-chat-screen\)|\.default-chat-screen|\.text-input-area[^{]*)\s*\{[^}]*\}\n?/gm, "").replace(/^div:has\(> \.text-input-area\) \{[\s\S]*?^\}\n?/m, "").replace(/^:root \{\n  --risu-theme[\s\S]*?^\}\n?/m, "") : css;
  return { name: STEALTH_PREFIX + P.label, css: opts.changeHome ? out : offHome(out), html };   // changeHome: 홈(채팅 밖)도 바꾸기
}

// 리스 홈(채팅 밖)은 건드리지 않는다: 화면 전체 규칙(색 변수·글꼴·배경·순정 사이드바)을 "채팅 화면일 때"로 좁힌다.
// 사이드바 쪽이 body에 x-dusk-chat="0"(채팅 아님)을 달면 꺼진다. 표식이 없으면(사이드바가 안 도는 경우) 예전처럼 적용.
// 0.3.43: :root:has(...) 접두사는 화면의 모든 버튼·입력칸 규칙마다 뿌리 요소를 다시 따지게 해 무거웠다 → body 속성 선택자로(가볍다).
// 색 변수는 body에 두면 그 아래 모든 요소가 물려받는다.
const ON = 'body:not([x-dusk-chat="0"])';
export function offHome(css) {
  return css
    .replace(/^:root \{\n  --risu-theme/m, `${ON} {\n  --risu-theme`)
    .replace(/^html, body \{/m, `${ON} {`)
    .replace(/^button, input, textarea, select \{/m, `${ON} button, ${ON} input, ${ON} textarea, ${ON} select {`)
    .replace(/^code, pre, kbd, samp \{/m, `${ON} code, ${ON} pre, ${ON} kbd, ${ON} samp {`)
    .replace(/^body \{/m, `${ON} {`)
    .replace(/^\.rs-sidebar, \.risu-sidebar \{/m, `${ON} .rs-sidebar, ${ON} .risu-sidebar {`)
    // 0.3.44: 사이드바 아바타 흐림이 홈(채팅 밖)에서도 걸려 리스 순정 사이드바의 캐릭터 목록이 다 흐려졌다
    .replace(/^\.sidebar-avatar, \.avatar img, \.avatar div \{/m, `${ON} .sidebar-avatar, ${ON} .avatar img, ${ON} .avatar div {`);
}

/** 기존 테마 시스템 형식의 테마로(세 번째 인자 target은 리스 계열). */
export function stealthTheme(id, opts = {}, target = "risu") {
  if (!TARGETS[target]) throw new Error(`모르는 계열이에요: ${target}`);
  const b = buildStealth(id, opts);
  return { name: b.name, target, css: b.css, html: b.html, useTokens: false, stealth: id };
}

export var defaultStealthState = () => ({ v: 1, active: null, scheme: "auto", hideImages: true, blurAvatars: true, hideSidebar: false, changeHome: false, labels: {} });
export function normalizeStealthState(raw) {
  const d = defaultStealthState();
  if (!raw || typeof raw !== "object" || raw.v !== 1) return d;
  const labels = {};
  for (const id of PRESET_IDS) {
    const src = raw.labels?.[id];
    if (src && typeof src === "object") {
      labels[id] = {};
      for (const k of LABEL_KEYS) if (typeof src[k] === "string") labels[id][k] = src[k].slice(0, 80);
    }
  }
  const icons = {};   // 모양별 머리 아이콘(사용자가 고른 그림, 기기에만 저장). 안전한 주소만(stealth-shell safeIconUrl과 같은 규칙)
  for (const id of PRESET_IDS) { const v = String(raw.icons?.[id] ?? ""); if (/^(https:\/\/|data:image\/(png|jpeg|webp|gif|svg\+xml);)/i.test(v) && !/['"()\\\s<>]/.test(v.replace(/^data:[^,]*,/, "")) && v.length <= 120000) icons[id] = v; }
  return {
    v: 1, active: PRESETS[raw.active] ? raw.active : null,
    scheme: ["auto", "light", "dark"].includes(raw.scheme) ? raw.scheme : "auto",
    hideImages: raw.hideImages !== false, blurAvatars: raw.blurAvatars !== false, hideSidebar: !!raw.hideSidebar, minimal: !!raw.minimal, changeHome: !!raw.changeHome, appliedVer: typeof raw.appliedVer === "string" ? raw.appliedVer : "", labels, icons
  };
}
export var optsOf = (state, id) => ({ scheme: state.scheme, hideImages: state.hideImages, blurAvatars: state.blurAvatars, hideSidebar: state.hideSidebar, minimal: state.minimal, changeHome: !!state.changeHome, labels: state.labels?.[id] ?? {} });
