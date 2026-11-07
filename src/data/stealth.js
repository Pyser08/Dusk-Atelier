// 더스크 스텔스: 리스 채팅을 다른 AI 채팅 앱처럼 보이게 하는 테마 5종(클로드·GPT·코덱스·제미나이·딥시크).
// 로고·상표 이미지는 쓰지 않고 색·배치·글꼴 분위기만 따른다. 가짜 문구(제목·모델·도구 줄)는 설정에서 바꾼다.
// 결과는 기존 테마 시스템(data/themes.js)의 테마 한 개({css, html, useTokens:false})로 만들어 같은 길로 적용·되돌린다.
import { TARGETS } from "./themes.js";

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
    font: SANS, accent: "#d97757", radius: 16, input: 24, width: 820, shell: "claude",
    light: { bg: "#ffffff", side: "#f9f9f9", bubble: "#f3f3f3", inputBg: "#ffffff", fg: "#1a1a1a", fg2: "#666666", dim: "#787878", line: "#ebebeb", line2: "#cecece" },
    dark: { bg: "#1a1a1a", side: "#1f1f1f", bubble: "#2b2b2b", inputBg: "#262626", fg: "#ececec", fg2: "#a0a0a0", dim: "#8c8c8c", line: "#2e2e2e", line2: "#3d3d3d" },
    labels: { title: "", sub: "", tool: "명령어 13개 실행함", model: "Sonnet 5.5 낮음   자동", note: "Claude는 AI이며 실수할 수 있습니다.", left: "", think: "✻  Thinking…", user: "", plan: "Pro" }
  },
  claudecode: {
    label: "클로드 코드", desc: "클로드 앱의 Code 탭: 세션 목록 사이드바, 작업 입력창, 하단 모델 줄",
    font: SANS, accent: "#d97757", radius: 16, input: 24, width: 820, shell: "code",
    light: { bg: "#ffffff", side: "#f9f9f9", bubble: "#f3f3f3", inputBg: "#ffffff", fg: "#1a1a1a", fg2: "#666666", dim: "#787878", line: "#ebebeb", line2: "#cecece" },
    dark: { bg: "#1a1a1a", side: "#1f1f1f", bubble: "#2b2b2b", inputBg: "#262626", fg: "#ececec", fg2: "#a0a0a0", dim: "#8c8c8c", line: "#2e2e2e", line2: "#3d3d3d" },
    labels: { title: "새 세션", sub: "", tool: "파일 읽음 2회, 명령 실행함 1회", model: "Opus 5.5 중간   자동", note: "", left: "자동 ⌄      저장소 ⌄", think: "✻  Thinking…", user: "", plan: "Pro" }
  },
  gpt: {
    label: "GPT", desc: "흑백, 오른쪽 회색 말풍선, 알약 모양 입력창",
    font: SANS, accent: "#0d0d0d", radius: 18, input: 28, width: 760,
    light: { bg: "#ffffff", side: "#f9f9f9", bubble: "#f4f4f4", inputBg: "#f4f4f4", fg: "#0d0d0d", fg2: "#5d5d5d", dim: "#8f8f8f", line: "#ececec", line2: "#d9d9d9" },
    dark: { bg: "#212121", side: "#171717", bubble: "#303030", inputBg: "#303030", fg: "#ececec", fg2: "#b4b4b4", dim: "#8e8e8e", line: "#2f2f2f", line2: "#424242" },
    labels: { title: "새 채팅", model: "GPT  ⌄", tool: "", think: "생각하는 중…" }
  },
  codex: {
    label: "코덱스", desc: "터미널 느낌, 고정폭 글꼴, 자리표시 › 와 상태 줄",
    font: MONO, accent: "#10a37f", radius: 4, input: 6, width: 900,
    light: { bg: "#fafafa", side: "#f0f0f0", bubble: "#ececec", inputBg: "#ffffff", fg: "#1f2328", fg2: "#57606a", dim: "#8c959f", line: "#d8dee4", line2: "#c0c7ce" },
    dark: { bg: "#0d1117", side: "#010409", bubble: "#161b22", inputBg: "#0d1117", fg: "#e6edf3", fg2: "#8b949e", dim: "#6e7681", line: "#21262d", line2: "#30363d" },
    labels: { title: "~/projects/api-server  (main)", model: "codex · high · 100% context left", tool: "• Ran 2 commands, read 3 files", think: "• Working…" }
  },
  gemini: {
    label: "제미나이", desc: "연한 파랑 배경, 큰 알약 입력창, 그라데이션 인사",
    font: `"Google Sans", "Product Sans", ${SANS}`, accent: "#4285f4", radius: 20, input: 32, width: 800,
    light: { bg: "#ffffff", side: "#f0f4f9", bubble: "#e9eef6", inputBg: "#f0f4f9", fg: "#1f1f1f", fg2: "#444746", dim: "#747775", line: "#e3e3e3", line2: "#c4c7c5" },
    dark: { bg: "#131314", side: "#1e1f20", bubble: "#282a2c", inputBg: "#1e1f20", fg: "#e3e3e3", fg2: "#c4c7c5", dim: "#8e918f", line: "#2d2f31", line2: "#444746" },
    labels: { title: "새 대화", model: "2.5 Pro  ⌄", tool: "", think: "✦  생각하는 중…" }
  },
  deepseek: {
    label: "딥시크", desc: "파란 포인트, 깔끔한 말풍선, 접힌 '생각 과정' 줄",
    font: SANS, accent: "#4d6bfe", radius: 14, input: 18, width: 780,
    light: { bg: "#ffffff", side: "#f9fafb", bubble: "#eff6ff", inputBg: "#f3f4f6", fg: "#0f1115", fg2: "#4b5563", dim: "#8b919a", line: "#eceef1", line2: "#d4d8de" },
    dark: { bg: "#1b1c1f", side: "#141517", bubble: "#26282d", inputBg: "#292a2e", fg: "#e8eaed", fg2: "#a0a4ab", dim: "#7a7f87", line: "#2a2c30", line2: "#3b3d43" },
    labels: { title: "새 대화", model: "DeepThink  ·  검색", tool: "✓ 깊이 생각함 (소요 12초)", think: "생각하는 중…" }
  }
};
export var PRESET_IDS = Object.keys(PRESETS);
// 이미지·영상 접기(0.3.6): 메시지마다 채팅 HTML에 '›_ 명령어 N개 실행함 ›' 접힘을 하나 두고, 접혀 있으면 그 메시지의 이미지를 모두 숨긴다.
// 이미지가 정규식·에셋 어디서 나오든(글 순서와 상관없이) 메시지 단위로 숨기고 펼치므로 훅이 필요 없다(채팅 열기가 느려지지 않음).
// N(1~9)은 메시지 순서로 돌린다(CSS만).
export function imageFoldCss() {
  // 이미지·배경 그림마다 접힘 줄: 스텔스가 화면에서 각 이미지를 [x-st-fw] 상자로 감싸고 맨 위에 [x-st-fl] 줄을 넣는다(stealth-shell.js wrapMedia).
  // 감싸기 전 잠깐은 이미지를 숨겨 번쩍이지 않게 한다(작은 아이콘 "s"는 그대로). 감싸기에 실패한 것("e")은 숨기고 '명령어 N개 실패함'으로 보인다.
  const L = "[x-st-fw] > [x-st-fl]";
  return `.st-body :is(img, video, [style*="background-image"]):not([x-st-m]):not([x-st-fw] *) { display: none !important; }
[x-st-fw] { display: block; width: 100%; margin: 2px 0 8px; }
${L} { width: fit-content; max-width: 100%; cursor: pointer; color: var(--st-dim); font-size: 14px; line-height: 1.5; user-select: none; display: flex; align-items: center; -webkit-tap-highlight-color: transparent; }
${L}::before { content: "›_"; display: inline-block; width: 1.6em; font-family: var(--st-mono); letter-spacing: -.08em; }
${L}::after { content: "›"; display: inline-block; margin-left: .5em; font-size: 1.15em; transition: transform .15s; }
[x-st-fw][x-open="1"] > [x-st-fl]::after { transform: rotate(90deg); }
${L}:hover { color: var(--st-fg); }
[x-st-fw][x-open="0"] > :not([x-st-fl]) { display: none !important; }
[x-st-fw][x-open="1"] > :not([x-st-fl]) { margin-top: 6px; }
:is(img, video)[x-st-m="e"] { display: none !important; }
[x-st-m="e"]:not(img, video) { background: none !important; width: auto !important; height: auto !important; min-height: 0 !important; aspect-ratio: auto !important; border: 0 !important; padding: 0 !important; margin: 2px 0 8px !important; box-shadow: none !important; transform: none !important; }
[x-st-m="e"]:not(img, video) > * { display: none !important; }
[x-st-m="e"]:not(img, video)::before, [x-st-pe]::before { content: "›_  명령어 " attr(x-st-n) "개 실패함"; display: block; color: var(--st-dim); font-size: 14px; line-height: 1.5; }
[x-st-pe]::before { content: "›_  명령어 " attr(x-st-pe) "개 실패함"; margin: 2px 0 8px; }`;
}
export var LABEL_KEYS = ["title", "sub", "tool", "model", "note", "left", "think", "user", "plan"];

var vars = (p, c, scheme) => Object.entries({
  bg: c.bg, side: c.side, bubble: c.bubble, input: c.inputBg, fg: c.fg, fg2: c.fg2, dim: c.dim, line: c.line, line2: c.line2
}).map(([k, v]) => `  --st-${k}: ${v};`).join("\n");

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
  if (!P) throw new Error(`모르는 스텔스 테마예요: ${id}`);
  const scheme = ["light", "dark"].includes(opts.scheme) ? opts.scheme : "auto";
  const L = mergeLabels(id, opts.labels);
  const hideImages = opts.hideImages !== false, blurAvatars = opts.blurAvatars !== false, hideSidebar = !!opts.hideSidebar;
  const root = scheme === "dark" ? `:root {\n${vars(P, P.dark)}` : `:root {\n${vars(P, P.light)}`;
  const darkBlock = scheme === "auto" ? `@media (prefers-color-scheme: dark) {\n  :root {\n${vars(P, P.dark).replace(/^/gm, "  ")}\n  }\n}` : "";
  const code = id === "codex";
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
  /* 클로드 앱 입력창: 위는 글 칸, 아래 한 줄에 리스 버튼 · 모델 칩 · 둥근 보내기. 리스 버튼은 지우지 않고 작게 */
  div:has(> .text-input-area) { width: calc(100% - 20px) !important; max-width: none; margin: ${P.shell && L.note ? 30 : 8}px 10px 10px !important; padding: 10px 8px 8px !important; border-radius: ${Math.max(P.input, 24)}px; flex-wrap: wrap !important; align-items: center !important; column-gap: 2px; row-gap: 4px; }
  div:has(> .text-input-area) > .text-input-area { flex: 1 0 100% !important; order: -1; min-height: 40px; margin: 0 !important; padding: 4px 10px !important; font-size: 16px !important; }
  div:has(> .text-input-area) > div, div:has(> .text-input-area) > button { flex: none; margin: 0 !important; padding: 6px !important; transform: scale(.9); }
  div:has(> .text-input-area) > .button-icon-send { order: 3; margin-left: auto !important; width: 40px; height: 40px; border-radius: 50% !important; display: flex; align-items: center; justify-content: center; transform: none; }
  ${L.model ? `div:has(> .text-input-area)::after { position: static; order: 2; flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; margin-left: 2px; padding: 6px 12px; border-radius: 999px; background: var(--st-bubble); color: var(--st-fg); font-size: 13px; white-space: nowrap; }` : ""}
  ${P.shell && L.note ? `div:has(> .text-input-area)::before { content: "${cssText(L.note)}"; position: absolute; left: 6px; top: -24px; bottom: auto; color: var(--st-dim); font-size: 12.5px; white-space: nowrap; pointer-events: none; }` : ""}
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
html, body { font-family: ${code ? "var(--st-mono)" : "var(--st-font)"} !important; }
button, input, textarea, select { font-family: inherit; }
code, pre, kbd, samp { font-family: var(--st-mono) !important; }
body { background: var(--st-bg) !important; color: var(--st-fg); }
div:has(> .default-chat-screen) { background: var(--st-bg) !important; background-image: none !important; }
.default-chat-screen { font-size: ${code ? 14 : 15}px; line-height: ${code ? 1.55 : 1.65}; }`,
    hideSidebar || P.shell
      ? (P.shell ? `@media (min-width: 761px) { body[x-dusk-st][x-dusk-fold="0"] .rs-sidebar, body[x-dusk-st][x-dusk-fold="0"] .risu-sidebar { display: none !important; } }` : `.rs-sidebar, .risu-sidebar { display: none !important; }`)
      : `.rs-sidebar, .risu-sidebar { background: var(--st-side) !important; box-shadow: none !important; border-right: 1px solid var(--st-line); }`,
    blurAvatars ? `.sidebar-avatar, .avatar img, .avatar div { filter: grayscale(1) blur(4px) opacity(.4); }` : "",
    P.shell
      ? `:root { --st-sw: clamp(220px, 16vw, 290px); }
body[x-dusk-st][x-dusk-fold="0"] { padding-left: var(--st-sw) !important; box-sizing: border-box; }
@media (max-width: 760px) { body[x-dusk-st] { padding-left: 0 !important; } }`
      : (L.title ? `body::before { content: "${cssText(L.title)}"; position: fixed; top: 0; left: 0; right: 0; height: 44px; z-index: 30; display: flex; align-items: center; padding: 0 24px; background: var(--st-bg); border-bottom: 1px solid var(--st-line); color: var(--st-fg2); font-size: 13px; font-weight: 500; white-space: pre; overflow: hidden; pointer-events: none; }
` : ""),
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
  return { name: STEALTH_PREFIX + P.label, css: out, html };
}

/** 기존 테마 시스템 형식의 테마로(세 번째 인자 target은 리스 계열). */
export function stealthTheme(id, opts = {}, target = "risu") {
  if (!TARGETS[target]) throw new Error(`모르는 계열이에요: ${target}`);
  const b = buildStealth(id, opts);
  return { name: b.name, target, css: b.css, html: b.html, useTokens: false, stealth: id };
}

export var defaultStealthState = () => ({ v: 1, active: null, scheme: "auto", hideImages: true, blurAvatars: true, hideSidebar: false, labels: {} });
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
  return {
    v: 1, active: PRESETS[raw.active] ? raw.active : null,
    scheme: ["auto", "light", "dark"].includes(raw.scheme) ? raw.scheme : "auto",
    hideImages: raw.hideImages !== false, blurAvatars: raw.blurAvatars !== false, hideSidebar: !!raw.hideSidebar, minimal: !!raw.minimal, appliedVer: typeof raw.appliedVer === "string" ? raw.appliedVer : "", labels
  };
}
export var optsOf = (state, id) => ({ scheme: state.scheme, hideImages: state.hideImages, blurAvatars: state.blurAvatars, hideSidebar: state.hideSidebar, minimal: state.minimal, labels: state.labels?.[id] ?? {} });
