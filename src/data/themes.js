// 테마 스튜디오: 일반 리스 / 포켓리스 계열 테마를 따로 만들고 저장·적용한다.
// 두 계열은 구조가 달라 테마가 호환되지 않는다. 공통은 디자인 토큰(색·폰트·반경)뿐이고,
// 토큰 → CSS 변환은 계열별 어댑터가 맡는다.

export var THEME_KEY = "rbm:themes:v1";
export var THEME_FILE_KIND = "dusk-theme";
var STYLE_ID = "rb-dusk-theme";

// 디자인 토큰 (계열 공통 편집 필드)
export var TOKENS = [
  { k: "bg", label: "배경", type: "color", def: "#14121f", group: "색" },
  { k: "panel", label: "패널", type: "color", def: "#1c1a2c", group: "색" },
  { k: "border", label: "테두리", type: "color", def: "#3b3659", group: "색" },
  { k: "accent", label: "강조", type: "color", def: "#7c5cf0", group: "색" },
  { k: "accent2", label: "강조 2 (그라데이션 끝)", type: "color", def: "#4f7cf7", group: "색" },
  { k: "text", label: "글자", type: "color", def: "#ecebf6", group: "글자" },
  { k: "sub", label: "보조 글자", type: "color", def: "#9d99c1", group: "글자" },
  { k: "italic", label: "기울임(행동)", type: "color", def: "#b8acff", group: "글자" },
  { k: "bold", label: "굵게", type: "color", def: "#ffffff", group: "글자" },
  { k: "quote", label: "대사(따옴표)", type: "color", def: "#e8c9a6", group: "글자" },
  { k: "userBubble", label: "내 말풍선", type: "color", def: "#2c2942", group: "말풍선" },
  { k: "botBubble", label: "봇 말풍선", type: "color", def: "#1b1930", group: "말풍선" },
  { k: "font", label: "글꼴", type: "font", def: "", group: "글자" },
  { k: "size", label: "글자 크기", type: "range", min: 12, max: 22, step: 1, unit: "px", def: 15, group: "글자" },
  { k: "line", label: "줄 간격", type: "range", min: 1.2, max: 2.2, step: 0.05, unit: "", def: 1.7, group: "글자" },
  { k: "radius", label: "모서리 둥글기", type: "range", min: 0, max: 28, step: 1, unit: "px", def: 14, group: "말풍선" },
  { k: "gap", label: "메시지 간격", type: "range", min: 0, max: 32, step: 1, unit: "px", def: 12, group: "말풍선" },
  { k: "width", label: "채팅 최대 너비", type: "range", min: 560, max: 1400, step: 20, unit: "px", def: 900, group: "말풍선" }
];
export var defaultTokens = () => Object.fromEntries(TOKENS.map((t) => [t.k, t.def]));

// ── 계열별 어댑터 ──
// selectors: 테마가 꾸미는 자리. 리스 업데이트로 바뀌면 여기(또는 스튜디오의 [셀렉터] 칸)만 고치면 된다.
// vars: 앱이 이미 쓰는 CSS 변수 → 토큰 연결.
export var TARGETS = {
  risu: {
    id: "risu",
    label: "일반 리스",
    vars: {
      "--risu-theme-bgcolor": "bg",
      "--risu-theme-darkbg": "panel",
      "--risu-theme-borderc": "border",
      "--risu-theme-darkborderc": "border",
      "--risu-theme-selected": "accent",
      "--risu-theme-textcolor": "text",
      "--risu-theme-textcolor2": "sub",
      "--risu-theme-darkbutton": "panel",
      "--FontColorStandard": "text",
      "--FontColorItalic": "italic",
      "--FontColorBold": "bold",
      "--FontColorItalicBold": "italic",
      "--FontColorQuote1": "quote",
      "--FontColorQuote2": "quote"
    },
    selectors: {
      chat: ".risu-chat",
      user: ".risu-chat[data-role=user], .risu-chat.user",
      bot: ".risu-chat[data-role=char], .risu-chat.char",
      text: ".chattext",
      list: ".chat-width",
      input: ".input-text, textarea#messageInput"
    },
    // 리스 설정의 커스텀 CSS 칸에도 넣을 수 있다
    dbCss: "customCSS",
    dbHtml: "guiHTML"
  },
  pocket: {
    id: "pocket",
    label: "포켓리스",
    vars: {
      "--risu-theme-bgcolor": "bg",
      "--risu-theme-darkbg": "panel",
      "--risu-theme-borderc": "border",
      "--risu-theme-selected": "accent",
      "--risu-theme-textcolor": "text",
      "--risu-theme-textcolor2": "sub",
      "--FontColorStandard": "text",
      "--FontColorItalic": "italic",
      "--FontColorBold": "bold",
      "--FontColorQuote1": "quote",
      "--FontColorQuote2": "quote"
    },
    // 포켓리스 DOM은 계열마다 다를 수 있어 [셀렉터 찾기]로 확인·수정하길 권한다
    selectors: {
      chat: ".message, .chat-message",
      user: ".message.user, .chat-message.user, [data-role=user]",
      bot: ".message.bot, .message.char, .chat-message.char, [data-role=char]",
      text: ".message-text, .chattext",
      list: ".message-list, .chat-list",
      input: "textarea"
    },
    dbCss: "customCSS",
    dbHtml: "guiHTML"
  }
};
export var TARGET_IDS = Object.keys(TARGETS);

// 실행 중인 환경 추측. 리스 화면 문서(getRootDocument)는 비동기 래퍼라 모든 호출을 await 한다.
// 각 계열의 메시지 셀렉터가 몇 개 잡히는지 비교하고, 못 정하면 UA·일반 리스.
export async function detectTarget(doc) {
  try {
    if (/pocket/i.test(globalThis.navigator?.userAgent ?? "")) return "pocket";
    if (doc) {
      if (await doc.querySelector("[class*=pocket], #pocket-app")) return "pocket";
      const [r, p] = await Promise.all([countSel(doc, TARGETS.risu.selectors.chat), countSel(doc, TARGETS.pocket.selectors.chat)]);
      if (p > 0 && r === 0) return "pocket";
    }
  } catch {
  }
  return "risu";
}
async function countSel(doc, sel) {
  if (!sel) return 0;
  const list = await doc.querySelectorAll(sel);
  if (!list) return 0;
  const n = typeof list.length === "function" ? await list.length() : list.length;
  return Number(n) || 0;
}

// ── 저장 ──
// { v:1, target, themes:{ risu:[...], pocket:[...] }, active:{ risu:id|null, pocket:id|null } }
function blank() {
  return { v: 1, target: null, themes: { risu: [], pocket: [] }, active: { risu: null, pocket: null } };
}
export async function loadThemes(api) {
  try {
    const raw = await api.pluginStorage.getItem(THEME_KEY);
    const d = raw ? JSON.parse(raw) : null;
    if (!d || d.v !== 1) return blank();
    const b = blank();
    for (const t of TARGET_IDS) {
      b.themes[t] = Array.isArray(d.themes?.[t]) ? d.themes[t].map((x) => normalize(x, t)) : [];
      b.active[t] = d.active?.[t] ?? null;
    }
    b.target = TARGETS[d.target] ? d.target : null;
    b.forceApply = !!d.forceApply;
    if (d.dbBackup) b.dbBackup = d.dbBackup;
    return b;
  } catch {
    return blank();
  }
}
export async function saveThemes(api, data) {
  await api.pluginStorage.setItem(THEME_KEY, JSON.stringify(data));
}
var uid = () => "th_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function normalize(t, target) {
  const tokens = { ...defaultTokens(), ...t?.tokens ?? {} };
  return {
    id: t?.id || uid(),
    name: String(t?.name || "새 테마"),
    target,
    tokens,
    selectors: { ...TARGETS[target].selectors, ...t?.selectors ?? {} },
    css: String(t?.css ?? ""),
    html: String(t?.html ?? ""),
    updated: t?.updated ?? Date.now()
  };
}
export function newTheme(target, name = "새 테마") {
  return normalize({ name }, target);
}
export function duplicateTheme(t) {
  return normalize({ ...structuredClone(t), id: null, name: t.name + " 사본", updated: Date.now() }, t.target);
}
// 다른 계열로: 토큰만 넘긴다 (구조가 달라 CSS·HTML은 안 넘김)
export function copyTokensTo(t, target) {
  return normalize({ name: `${t.name} (${TARGETS[t.target].label}에서)`, tokens: { ...t.tokens } }, target);
}

// ── 변환 ──
var px = (v) => typeof v === "number" ? v + "px" : v;
function fontStack(f) {
  if (!f) return "";
  return /[,'"]/.test(f) ? f : `'${f}', sans-serif`;
}
export function compileCss(theme) {
  const A = TARGETS[theme.target];
  const t = theme.tokens, s = theme.selectors;
  const vars = Object.entries(A.vars).map(([v, k]) => `  ${v}: ${t[k]};`).join("\n");
  const font = fontStack(t.font);
  const out = [
    `/* Dusk Theme · ${theme.name} · ${A.label} */`,
    `:root {\n${vars}\n  --dusk-accent: ${t.accent};\n  --dusk-accent2: ${t.accent2};\n  --dusk-radius: ${px(t.radius)};\n}`,
    `body { background: ${t.bg}; color: ${t.text};${font ? ` font-family: ${font};` : ""} }`,
    s.list ? `${s.list} { max-width: ${px(t.width)}; margin-left: auto; margin-right: auto; }` : "",
    s.chat ? `${s.chat} { margin-bottom: ${px(t.gap)}; border-radius: ${px(t.radius)}; }` : "",
    s.user ? `${s.user} { background: ${t.userBubble}; }` : "",
    s.bot ? `${s.bot} { background: ${t.botBubble}; border: 1px solid ${t.border}; }` : "",
    s.text ? `${s.text} { font-size: ${px(t.size)}; line-height: ${t.line}; color: ${t.text}; }\n${s.text} em { color: ${t.italic}; }\n${s.text} strong { color: ${t.bold}; }\n${s.text} q, ${s.text} .quote { color: ${t.quote}; }` : "",
    s.input ? `${s.input} { background: ${t.panel}; color: ${t.text}; border: 1px solid ${t.border}; border-radius: ${px(Math.max(6, t.radius - 4))}; }` : ""
  ].filter(Boolean);
  if (theme.css.trim()) out.push("/* 직접 쓴 CSS */", theme.css.trim());
  return out.join("\n");
}

// 간단한 CSS 오류 검사 (괄호 짝·따옴표·빈 셀렉터)
export function lintCss(css) {
  const errs = [];
  let depth = 0, line = 1, q = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "\n") line++;
    if (q) {
      if (c === q && css[i - 1] !== "\\") q = null;
      continue;
    }
    if (c === "/" && css[i + 1] === "*") {
      const e = css.indexOf("*/", i + 2);
      if (e < 0) {
        errs.push({ line, msg: "주석이 닫히지 않았어요 (*/)" });
        break;
      }
      line += css.slice(i, e).split("\n").length - 1;
      i = e + 1;
      continue;
    }
    if (c === '"' || c === "'") q = c;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth < 0) {
        errs.push({ line, msg: "여는 괄호 없이 } 가 있어요" });
        depth = 0;
      }
    }
  }
  if (q) errs.push({ line, msg: "따옴표가 닫히지 않았어요" });
  if (depth > 0) errs.push({ line, msg: `{ 가 ${depth}개 닫히지 않았어요` });
  return errs;
}

// HTML 템플릿에 빠진 필수 자리표시 확인
export function lintHtml(html) {
  if (!html.trim()) return [];
  const errs = [];
  if (!/\{\{\s*(slot|chat|content)/i.test(html)) errs.push({ msg: "메시지 내용 자리({{slot}})가 없어요" });
  const open = (html.match(/<(div|span|section|p)\b/gi) ?? []).length, close = (html.match(/<\/(div|span|section|p)>/gi) ?? []).length;
  if (open !== close) errs.push({ msg: `여는 태그 ${open}개, 닫는 태그 ${close}개로 짝이 안 맞아요` });
  return errs;
}

// ── 적용 ──
// 화면에 <style>로 바로 적용한다 (리스 데이터는 안 건드림). 다시 켜면 시작할 때 자동 적용.
// doc은 getRootDocument()의 비동기 래퍼.
export async function applyToDocument(doc, theme) {
  if (!doc) return false;
  const old = await doc.querySelector(`[x-dusk="${STYLE_ID}"]`);
  if (old) await old.remove();
  if (!theme) return true;
  const css = compileCss(theme);
  const parent = await doc.querySelector("head") ?? await doc.querySelector("body");
  if (!parent) return false;
  try {
    const el = await doc.createElement("style");
    await el.setAttribute("x-dusk", STYLE_ID);
    await el.setInnerText(css);
    await parent.appendChild(el);
  } catch {
    // style을 못 만들면 div 안에 넣는다
    const el = await doc.createElement("div");
    await el.setAttribute("x-dusk", STYLE_ID);
    await el.setStyleAttribute("display:none");
    await el.setInnerHTML(`<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`);
    await (await doc.querySelector("body")).appendChild(el);
  }
  return true;
}

// 리스 설정에 영구 저장 (커스텀 CSS / HTML). 바꾸기 전 값을 돌려줘 되돌릴 수 있게 한다.
export async function writeToDatabase(api, theme) {
  const A = TARGETS[theme.target];
  const db = await api.getDatabase();
  const before = { css: db?.[A.dbCss] ?? "", html: db?.[A.dbHtml] ?? "", theme: db?.theme };
  const patch = { [A.dbCss]: compileCss(theme) };
  if (theme.html.trim()) {
    patch[A.dbHtml] = theme.html;
    patch.theme = "customHTML";
  }
  await api.setDatabaseLite(patch);
  return before;
}
export async function restoreDatabase(api, target, before) {
  const A = TARGETS[target];
  const patch = { [A.dbCss]: before.css ?? "", [A.dbHtml]: before.html ?? "" };
  if (before.theme !== void 0) patch.theme = before.theme;
  await api.setDatabaseLite(patch);
}

// ── 내보내기·가져오기 ──
export function exportTheme(theme) {
  const { id, ...rest } = theme;
  return JSON.stringify({ kind: THEME_FILE_KIND, v: 1, ...rest }, null, 2);
}
// 다른 계열 테마면 { error, target } 을 돌려준다
export function parseThemeFile(text, expected) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    return { error: "테마 파일이 아니에요 (JSON을 읽지 못했어요)" };
  }
  if (d?.kind !== THEME_FILE_KIND) return { error: "Dusk 테마 파일이 아니에요" };
  if (!TARGETS[d.target]) return { error: "어느 계열 테마인지 알 수 없어요" };
  if (expected && d.target !== expected) return { error: `${TARGETS[d.target].label}용 테마예요. 지금은 ${TARGETS[expected].label} 테마를 편집 중이에요.`, target: d.target, theme: normalize({ ...d, id: null }, d.target) };
  return { theme: normalize({ ...d, id: null }, d.target) };
}

// 지금 화면에서 셀렉터가 실제로 몇 개 잡히는지 (셀렉터 찾기)
export async function probeSelectors(doc, selectors) {
  const r = {};
  await Promise.all(Object.entries(selectors).map(async ([k, sel]) => {
    try {
      r[k] = await countSel(doc, sel);
    } catch {
      r[k] = -1;
    }
  }));
  return r;
}
