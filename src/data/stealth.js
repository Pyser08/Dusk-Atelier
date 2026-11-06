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
    label: "클로드", desc: "따뜻한 주황 포인트, 오른쪽 둥근 말풍선, 도구 호출 줄",
    font: SANS, accent: "#d97757", radius: 16, input: 20, width: 820,
    light: { bg: "#ffffff", side: "#f9f9f9", bubble: "#f3f3f3", inputBg: "#ffffff", fg: "#1a1a1a", fg2: "#666666", dim: "#787878", line: "#ebebeb", line2: "#cecece" },
    dark: { bg: "#191919", side: "#151515", bubble: "#2a2a2a", inputBg: "#202020", fg: "#ededed", fg2: "#9b9b9b", dim: "#757575", line: "#2a2a2a", line2: "#474747" },
    labels: { title: "Refactor session handler   ·   api-server", model: "Opus 5.5  ⌄      ⚑ Ask permissions", tool: "파일 읽음 2회, 명령 실행함 1회", think: "✻  Thinking…" }
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

var vars = (p, c, scheme) => Object.entries({
  bg: c.bg, side: c.side, bubble: c.bubble, input: c.inputBg, fg: c.fg, fg2: c.fg2, dim: c.dim, line: c.line, line2: c.line2
}).map(([k, v]) => `  --st-${k}: ${v};`).join("\n");

/** 기본 문구 + 사용자가 고친 문구. 빈 문자열이면 그 장식을 뺀다. */
export function mergeLabels(id, custom = {}) {
  const base = PRESETS[id]?.labels ?? {};
  const out = {};
  for (const k of Object.keys(base)) out[k] = typeof custom?.[k] === "string" ? custom[k] : base[k];
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
body, body *:not(code):not(pre):not(pre *) { font-family: ${code ? "var(--st-mono)" : "var(--st-font)"} !important; }
body { background: var(--st-bg) !important; color: var(--st-fg); }
div:has(> .default-chat-screen) { background: var(--st-bg) !important; background-image: none !important; }
.default-chat-screen { font-size: ${code ? 14 : 15}px; line-height: ${code ? 1.55 : 1.65}; }`,
    hideSidebar
      ? `.rs-sidebar, .risu-sidebar { display: none !important; }`
      : `.rs-sidebar, .risu-sidebar { background: var(--st-side) !important; box-shadow: none !important; border-right: 1px solid var(--st-line); }`,
    blurAvatars ? `.sidebar-avatar, .avatar img, .avatar div { filter: grayscale(1) blur(4px) opacity(.4); }` : "",
    L.title ? `.default-chat-screen::after {
  content: "${cssText(L.title)}"; display: block; position: sticky; top: 0; z-index: 5; margin-bottom: auto;
  padding: 12px 24px; background: var(--st-bg); border-bottom: 1px solid var(--st-line);
  color: var(--st-fg2); font-size: 13px; font-weight: 500; white-space: pre; overflow: hidden; text-overflow: ellipsis;
}` : "",
    `.risu-chat > div { margin: 0 auto !important; padding: 6px 24px !important; max-width: var(--st-w); width: 100%; }
.st-msg { width: 100%; min-width: 0; position: relative; color: var(--st-fg); display: flex; flex-direction: column; }
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
    hideImages ? `.st-body img, .st-body video { display: none !important; }` : "",
    code ? `.st-user .st-body { max-width: 100%; background: transparent; border-radius: 0; padding: 0 0 0 1.4em; text-indent: -1.4em; }
.st-user .st-body::before { content: "›"; color: var(--st-accent); font-weight: 700; margin-right: .6em; }
.st-char .st-body::before { content: "•"; color: var(--st-dim); margin-right: .6em; }
.st-user { align-items: stretch; }` : "",
    `.st-btns { opacity: 0; transition: opacity .15s; font-size: 12px; margin-top: 2px; }
.st-msg:hover .st-btns { opacity: .8; }
.st-btns button { color: var(--st-dim) !important; }
.st-btns button:hover { color: var(--st-fg) !important; }
.st-body textarea { background: var(--st-input) !important; color: var(--st-fg) !important; font-size: 15px !important; border: 1px solid var(--st-line2) !important; border-radius: 10px !important; }
div:has(> .text-input-area) {
  position: relative; box-sizing: border-box; width: calc(100% - 48px) !important; max-width: calc(var(--st-w) - 48px);
  margin: 8px auto 20px !important; padding: 10px 10px ${L.model ? 8 : 10}px 6px !important;
  background: var(--st-input) !important; border: 1px solid var(--st-line2); border-radius: var(--st-ri);
  box-shadow: 0 2px 10px rgba(0, 0, 0, .06); align-items: flex-start !important;
}
div:has(> .text-input-area):focus-within { border-color: var(--st-dim); }`,
    L.model ? `div:has(> .text-input-area)::after { content: "${cssText(L.model)}"; position: absolute; left: 56px; bottom: 12px; color: var(--st-dim); font-size: 12.5px; white-space: pre; pointer-events: none; }` : "",
    `.text-input-area { margin: 0 0 ${L.model ? 34 : 0}px 0 !important; padding: 4px 10px !important; font-size: 15px !important; color: var(--st-fg) !important; border: none !important; border-radius: 0 !important; background: transparent !important; }
.text-input-area::placeholder { color: var(--st-dim); }
div:has(> .text-input-area) > div, div:has(> .text-input-area) > button {
  margin: 0 0 0 4px !important; border: none !important; border-radius: 10px !important; background: transparent !important;
  color: var(--st-dim) !important; padding: 7px !important; align-self: flex-end;
}
div:has(> .text-input-area) > div:hover, div:has(> .text-input-area) > button:hover { color: var(--st-fg) !important; background: var(--st-bubble) !important; }
div:has(> .text-input-area) > .button-icon-send { background: var(--st-accent) !important; color: #fff !important; }
div:has(> .text-input-area) > .button-icon-send:hover { filter: brightness(1.08); }`,
    `.loadmove { animation: none !important; border: none !important; width: 1em !important; height: 1em !important; }
.loadmove::before { content: "■"; font-size: 11px; color: var(--st-fg); }`,
    L.think ? `.loadmove::after { content: "${cssText(L.think)}"; position: absolute; left: 18px; top: -30px; color: var(--st-accent); font-size: 13.5px; white-space: pre; animation: st-pulse 1.4s ease-in-out infinite; pointer-events: none; }
@keyframes st-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }` : "",
    `::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--st-line2); border-radius: 5px; border: 2px solid var(--st-bg); }
::-webkit-scrollbar-track { background: transparent; }`
  ].filter(Boolean).join("\n");
  const html = [
    `<div class="st-msg st-{{role}}">`,
    L.tool ? `<div class="st-tool">${htmlText(L.tool)}<span class="st-tchev">▸</span></div>` : "",
    `<div class="st-body"><risutextbox></risutextbox></div>`,
    `<div class="st-btns"><risubuttons></risubuttons></div>`,
    `</div>`
  ].filter(Boolean).join("\n");
  return { name: STEALTH_PREFIX + P.label, css, html };
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
      for (const k of ["title", "model", "tool", "think"]) if (typeof src[k] === "string") labels[id][k] = src[k].slice(0, 80);
    }
  }
  return {
    v: 1, active: PRESETS[raw.active] ? raw.active : null,
    scheme: ["auto", "light", "dark"].includes(raw.scheme) ? raw.scheme : "auto",
    hideImages: raw.hideImages !== false, blurAvatars: raw.blurAvatars !== false, hideSidebar: !!raw.hideSidebar, labels
  };
}
export var optsOf = (state, id) => ({ scheme: state.scheme, hideImages: state.hideImages, blurAvatars: state.blurAvatars, hideSidebar: state.hideSidebar, labels: state.labels?.[id] ?? {} });
