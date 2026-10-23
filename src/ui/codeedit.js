// 가벼운 코드 편집기: 투명한 textarea 뒤에 색을 입힌 pre를 겹쳐 VS Code처럼 보이게 한다
// lang: "js"(기본) · "regex"(정규식 패턴) · "replace"(정규식 바꿀 내용: $1, {{CBS}}, HTML) · "lua" · "text"(글: {{CBS}}, <img=…>, HTML)
// 커서가 괄호 옆에 있으면 짝 괄호를 함께 표시한다
import { h } from './dom.js';
import { attachUndo } from './undo.js';

var CSS = `
.rb-code{--c-bg:#1e1e1e;--c-fg:#d4d4d4;--c-gut:#858585;--c-line:#2b2b2b;border-radius:12px;border:1px solid var(--rb-line);background:var(--c-bg);overflow:auto;max-height:68vh;min-height:320px;position:relative;font:12.5px/1.6 ui-monospace,"Cascadia Code","D2Coding",Menlo,Consolas,monospace;tab-size:2}
.rb-code:focus-within{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-code-in{display:grid;grid-template-columns:auto 1fr;min-width:100%;width:max-content;min-height:100%}
.rb-code-gut{position:sticky;left:0;z-index:2;background:var(--c-bg);color:var(--c-gut);text-align:right;padding:12px 10px 12px 12px;border-right:1px solid var(--c-line);user-select:none;white-space:pre}
.rb-code-area{position:relative}
.rb-code pre,.rb-code textarea{margin:0;padding:12px 16px;font:inherit;white-space:pre;word-wrap:normal;letter-spacing:0;tab-size:inherit}
.rb-code pre{color:var(--c-fg);pointer-events:none;min-height:100%}
.rb-code textarea{position:absolute;inset:0;width:100%;height:100%;resize:none;border:0;outline:none;background:transparent;color:transparent;caret-color:#aeafad;overflow:hidden;-webkit-text-fill-color:transparent}
.rb-code textarea::selection{background:#264f78;-webkit-text-fill-color:transparent}
.rb-code textarea::placeholder{color:#6b6b6b;-webkit-text-fill-color:#6b6b6b}
.rb-code .t-com{color:#6a9955}
.rb-code .t-meta{color:#c586c0;font-weight:600}
.rb-code .t-str{color:#ce9178}
.rb-code .t-num{color:#b5cea8}
.rb-code .t-kw{color:#c586c0}
.rb-code .t-decl{color:#569cd6}
.rb-code .t-lit{color:#569cd6}
.rb-code .t-fn{color:#dcdcaa}
.rb-code .t-prop{color:#9cdcfe}
.rb-code .t-key{color:#4fc1ff;font-weight:700}
.rb-code .t-type{color:#4ec9b0}
.rb-code .t-api{color:#ffd166;font-weight:700}
.rb-code .t-esc{color:#d7ba7d}
.rb-code .t-cls{color:#ce9178}
.rb-code .t-clsb{color:#ffd700}
.rb-code .t-grp{color:#da70d6;font-weight:600}
.rb-code .t-q{color:#4fc1ff}
.rb-code .t-anc{color:#c586c0;font-weight:600}
.rb-code .t-alt{color:#ff8c69;font-weight:700}
.rb-code .t-dot{color:#dcdcaa}
.rb-code .t-ref{color:#4ec9b0;font-weight:700}
.rb-code .t-cbs{color:#c586c0}
.rb-code .t-cbsn{color:#dcdcaa;font-weight:600}
.rb-code .t-tag{color:#569cd6}
.rb-code .t-attr{color:#9cdcfe}
.rb-code .t-cbsk{color:#ff79c6;font-weight:700}
.rb-code.wrap .rb-code-in{width:100%}
.rb-code.wrap .rb-code-gut{position:relative;white-space:pre}
.rb-code.wrap .rb-code-gut i{position:absolute;right:10px;font-style:normal}
.rb-code.wrap .rb-code-gut b{visibility:hidden;font-weight:inherit}
.rb-code.wrap pre,.rb-code.wrap textarea{white-space:pre-wrap;overflow-wrap:anywhere}
.rb-code.prose{--c-bg:var(--rb-surf);--c-fg:var(--rb-text);font-size:14px;line-height:1.7;font-family:inherit;tab-size:4}
.rb-code.prose textarea{caret-color:var(--rb-text)}
.rb-code.prose textarea::selection{background:rgba(100,140,255,.32)}
.rb-code.prose .t-com{color:#3fa66a}
.rb-code.prose .t-str{color:#e0607e}
.rb-code.prose .t-cbs{color:#a46ff0;font-weight:600}
.rb-code.prose .t-cbsn{color:#d18a1f;font-weight:600}
.rb-code.prose .t-cbsk{color:#e0559b;font-weight:700}
.rb-code.prose .t-tag{color:#3b82f6;font-weight:600}
.rb-code.prose .t-attr{color:#0ea5c6}
.rb-code.prose pre span{font-weight:inherit!important}
.rb-code.prose .t-br{background:rgba(128,128,160,.28);box-shadow:inset 0 0 0 1px rgba(128,128,160,.7)}
.rb-code .t-br{background:rgba(255,255,255,.24);box-shadow:inset 0 0 0 1px #b4b4b4;border-radius:2px}
.rb-code .t-br-bad{background:rgba(255,80,80,.28);box-shadow:inset 0 0 0 1px #ff6b6b;border-radius:2px}
`;

var KW = new Set(["if", "else", "return", "await", "for", "while", "do", "try", "catch", "finally", "throw", "switch", "case", "break", "continue", "of", "in", "new", "delete", "typeof", "instanceof", "default", "import", "export", "from", "yield"]);
var DECL = new Set(["const", "let", "var", "function", "class", "async", "static", "get", "set", "extends", "this", "super"]);
var LIT = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);
// DA Interop 등록에서 중요한 이름들은 따로 강조
var KEYS = new Set(["id", "name", "version", "pluginName", "description", "fields", "presets", "getValues", "apply", "key", "label", "type", "options", "values", "group", "min", "max", "step", "default"]);
var API = new Set(["registerInterop", "risuai", "Risuai", "risu", "pluginStorage"]);

// ── 토큰 나누기 ── 결과: [시작, 끝, 색 이름, 괄호 무시?] 목록 (겹치지 않고 순서대로)
var JS_TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`?|'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;
function tokJs(code) {
  const out = [];
  let m;
  JS_TOKEN.lastIndex = 0;
  while (m = JS_TOKEN.exec(code)) {
    const [tok, com, str, num, id] = m;
    const s = m.index, e = s + tok.length;
    let cls;
    if (com) cls = com.startsWith("//@") ? "meta" : "com";
    else if (str) cls = "str";
    else if (num) cls = "num";
    else if (id) {
      const before = code[s - 1];
      const after = code.slice(e, e + 40).match(/^\s*(\S)/)?.[1];
      if (API.has(id)) cls = "api";
      else if (before === ".") cls = after === "(" ? "fn" : "prop";
      else if (after === ":" && /[{,]\s*$/.test(code.slice(Math.max(0, s - 200), s).replace(/\/\/[^\n]*/g, ""))) cls = KEYS.has(id) ? "key" : "prop";
      else if (KW.has(id)) cls = "kw";
      else if (DECL.has(id)) cls = "decl";
      else if (LIT.has(id)) cls = "lit";
      else if (after === "(") cls = "fn";
      else if (/^[A-Z]/.test(id)) cls = "type";
    }
    if (cls) out.push([s, e, cls, !!(com || str)]);
  }
  return out;
}

function tokRegex(code) {
  const out = [];
  const n = code.length;
  let i = 0;
  while (i < n) {
    const c = code[i];
    if (c === "\\" && i + 1 < n) {
      out.push([i, i + 2, "esc", true]);
      i += 2;
    } else if (c === "[") {
      // 문자 묶음: 안쪽의 괄호는 글자일 뿐이라 짝 계산에서 뺀다
      let j = i + 1;
      if (code[j] === "^") j++;
      if (code[j] === "]") j++;
      const inner = [];
      while (j < n && code[j] !== "]" && code[j] !== "\n") {
        if (code[j] === "\\" && j + 1 < n) {
          inner.push([j, j + 2, "esc", true]);
          j += 2;
        } else j++;
      }
      out.push([i, i + 1, "clsb", false]);
      let k = i + 1;
      for (const t of inner) {
        if (t[0] > k) out.push([k, t[0], "cls", true]);
        out.push(t);
        k = t[1];
      }
      if (j > k) out.push([k, j, "cls", true]);
      if (j < n && code[j] === "]") {
        out.push([j, j + 1, "clsb", false]);
        j++;
      }
      i = j;
    } else if (c === "(") {
      const g = /^\(\?(?:<[A-Za-z_]\w*>|<=|<!|[:=!])?/.exec(code.slice(i, i + 40));
      const len = g ? g[0].length : 1;
      out.push([i, i + 1, "grp", false]);
      if (len > 1) out.push([i + 1, i + len, "grp", true]);
      i += len;
    } else if (c === ")") {
      out.push([i, i + 1, "grp", false]);
      i++;
    } else if (c === "{") {
      const q = /^\{\d+(?:,\d*)?\}/.exec(code.slice(i, i + 20));
      if (q) {
        const close = i + q[0].length - 1;
        out.push([i, i + 1, "q", false]);
        if (close > i + 1) out.push([i + 1, close, "q", true]);
        out.push([close, close + 1, "q", false]);
        i = close + 1;
        if (code[i] === "?") out.push([i, ++i, "q", true]);
      } else i++;
    } else if (c === "*" || c === "+" || c === "?") {
      const len = code[i + 1] === "?" ? 2 : 1;
      out.push([i, i + len, "q", true]);
      i += len;
    } else if (c === "^" || c === "$") {
      out.push([i, i + 1, "anc", true]);
      i++;
    } else if (c === "|") {
      out.push([i, i + 1, "alt", true]);
      i++;
    } else if (c === ".") {
      out.push([i, i + 1, "dot", true]);
      i++;
    } else i++;
  }
  return out;
}

// 바꿀 내용: $1 · $& · $<이름> · {{CBS}} · HTML 태그
var REP_TOKEN = /(<!--[\s\S]*?-->)|(\$(?:\d{1,2}|&|`|'|\$|<[A-Za-z_]\w*>))|(\{\{)|(\}\})|(<\/?[A-Za-z][\w-]*)((?:\s+[^\s=>"'/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)(\s*\/?>)?/g;
function tokReplace(code) {
  const out = [];
  let m;
  REP_TOKEN.lastIndex = 0;
  while (m = REP_TOKEN.exec(code)) {
    const s = m.index;
    if (m[1]) out.push([s, s + m[1].length, "com", true]);
    else if (m[2]) out.push([s, s + m[2].length, "ref", true]);
    else if (m[3]) {
      out.push([s, s + 2, "cbs", false]);
      const name = /^[^\s:}{]+/.exec(code.slice(s + 2, s + 60));
      if (name) out.push([s + 2, s + 2 + name[0].length, "cbsn", true]);
      REP_TOKEN.lastIndex = s + 2 + (name ? name[0].length : 0);
    } else if (m[4]) out.push([s, s + 2, "cbs", false]);
    else if (m[5]) {
      out.push([s, s + m[5].length, "tag", true]);
      let k = s + m[5].length;
      const attrs = m[6] ?? "";
      const re = /([^\s=>"'/]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>"']+))?/g;
      let a;
      while (a = re.exec(attrs)) {
        const as = k + a.index;
        out.push([as, as + a[1].length, "attr", true]);
        if (a[3]) {
          // 속성 값 안의 {{CBS}}도 색을 입히고 괄호 짝에 넣는다
          const vs = as + a[1].length + a[2].length, val = a[3];
          const cb = /\{\{([^\s:}{]*)|\}\}/g;
          let last = 0, c;
          while (c = cb.exec(val)) {
            if (c.index > last) out.push([vs + last, vs + c.index, "str", false]);
            out.push([vs + c.index, vs + c.index + 2, "cbs", false]);
            if (c[1]) out.push([vs + c.index + 2, vs + c.index + 2 + c[1].length, "cbsn", true]);
            last = c.index + c[0].length;
          }
          if (val.length > last) out.push([vs + last, vs + val.length, "str", false]);
        }
      }
      k += attrs.length;
      if (m[7]) out.push([k, k + m[7].length, "tag", true]);
    }
  }
  return out;
}
// 글 (첫 메시지·인사말): {{CBS}}와 그 안의 ::, <img=이름> 같은 리스 정규식용 글귀, HTML 태그, <!-- 주석 -->
var TEXT_TOKEN = /(<!--[\s\S]*?-->)|(\{\{)|(\}\})|(::)|(<[A-Za-z][\w-]*=)([^>\n]*)(>?)|(<\/?[A-Za-z][\w-]*)((?:\s+[^\s=>"'/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)(\s*\/?>)?/g;
var cbsKind = (name) => /^[#/:]/.test(name) ? "cbsk" : "cbsn";
// 태그 값 안: 기본은 문자열 색, {{CBS}}와 ::는 따로
function pushVal(out, vs, val) {
  const cb = /\{\{([#/:]?[^\s:}{]*)|\}\}|::/g;
  let last = 0, c;
  while (c = cb.exec(val)) {
    if (c.index > last) out.push([vs + last, vs + c.index, "str", false]);
    if (c[0] === "::") out.push([vs + c.index, vs + c.index + 2, "cbs", true]);
    else {
      out.push([vs + c.index, vs + c.index + 2, "cbs", false]);
      if (c[1]) out.push([vs + c.index + 2, vs + c.index + 2 + c[1].length, cbsKind(c[1]), true]);
    }
    last = c.index + c[0].length;
  }
  if (val.length > last) out.push([vs + last, vs + val.length, "str", false]);
}
function tokText(code) {
  const out = [];
  let m, depth = 0;
  TEXT_TOKEN.lastIndex = 0;
  while (m = TEXT_TOKEN.exec(code)) {
    const s = m.index;
    if (m[1]) out.push([s, s + m[1].length, "com", true]);
    else if (m[2]) {
      depth++;
      out.push([s, s + 2, "cbs", false]);
      const name = /^[#/:]?[^\s:}{]*/.exec(code.slice(s + 2, s + 80))[0];
      if (name) {
        out.push([s + 2, s + 2 + name.length, cbsKind(name), true]);
        TEXT_TOKEN.lastIndex = s + 2 + name.length;
      }
    } else if (m[3]) {
      if (depth > 0) depth--;
      out.push([s, s + 2, "cbs", false]);
    } else if (m[4]) {
      if (depth > 0) out.push([s, s + 2, "cbs", true]);
    } else if (m[5]) {
      out.push([s, s + m[5].length, "tag", true]);
      pushVal(out, s + m[5].length, m[6]);
      if (m[7]) out.push([s + m[5].length + m[6].length, s + m[0].length, "tag", true]);
    } else if (m[8]) {
      out.push([s, s + m[8].length, "tag", true]);
      let k = s + m[8].length;
      const attrs = m[9] ?? "";
      const re = /([^\s=>"'/]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>"']+))?/g;
      let a;
      while (a = re.exec(attrs)) {
        const as = k + a.index;
        out.push([as, as + a[1].length, "attr", true]);
        if (a[3]) pushVal(out, as + a[1].length + a[2].length, a[3]);
      }
      k += attrs.length;
      if (m[10]) out.push([k, k + m[10].length, "tag", true]);
    }
  }
  return out;
}
// Lua (트리거 코드): --주석, --[[ ]], 문자열, [[긴 문자열]], 키워드, 함수 호출
var LUA_KW = new Set(["and", "break", "do", "else", "elseif", "end", "for", "function", "goto", "if", "in", "local", "not", "or", "repeat", "return", "then", "until", "while"]);
var LUA_LIT = new Set(["true", "false", "nil"]);
var LUA_TOKEN = /(--\[(=*)\[[\s\S]*?(?:\]\2\]|$)|--[^\n]*)|(\[(=*)\[[\s\S]*?(?:\]\4\]|$)|'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?)|(\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)/g;
function tokLua(code) {
  const out = [];
  let m;
  LUA_TOKEN.lastIndex = 0;
  while (m = LUA_TOKEN.exec(code)) {
    const [tok, com, , str, , num, id] = m;
    const s = m.index, e = s + tok.length;
    let cls;
    if (com) cls = "com";
    else if (str) cls = "str";
    else if (num) cls = "num";
    else if (id) {
      const before = code[s - 1];
      const after = code.slice(e, e + 20).match(/^\s*(\S)/)?.[1];
      if (LUA_KW.has(id)) cls = id === "function" || id === "local" ? "decl" : "kw";
      else if (LUA_LIT.has(id)) cls = "lit";
      else if (after === "(" || after === "\"" || after === "'" || after === "{") cls = "fn";
      else if (before === "." || before === ":") cls = "prop";
      else if (/^[A-Z]/.test(id)) cls = "type";
    }
    if (cls) out.push([s, e, cls, !!(com || str)]);
  }
  return out;
}
var TOKENIZERS = { js: tokJs, regex: tokRegex, replace: tokReplace, lua: tokLua, text: tokText };

// ── 괄호 짝 찾기 ──
// {{ }}는 두 글자가 한 쌍이라 한 글자씩 세면 된다 (첫 글자끼리, 둘째 글자끼리 짝이 맞음)
var OPEN = { "(": ")", "[": "]", "{": "}" }, CLOSE = { ")": "(", "]": "[", "}": "{" };
function skipMask(n, tokens) {
  const mask = new Uint8Array(n);
  for (const [s, e, , skip] of tokens) if (skip) mask.fill(1, s, e);
  return mask;
}
// 커서 바로 뒤 글자 → 바로 앞 글자 순으로 괄호인지 본다. [괄호 위치, 짝 위치(-1이면 짝 없음)]
export function matchBracket(code, caret, tokens) {
  const mask = skipMask(code.length, tokens);
  for (const p of [caret, caret - 1]) {
    const ch = code[p];
    if (p < 0 || p >= code.length || mask[p] || !(OPEN[ch] || CLOSE[ch])) continue;
    const dir = OPEN[ch] ? 1 : -1;
    const other = OPEN[ch] ?? CLOSE[ch];
    let depth = 0;
    for (let i = p; i >= 0 && i < code.length; i += dir) {
      if (mask[i]) continue;
      if (code[i] === ch) depth++;
      else if (code[i] === other && --depth === 0) return [p, i];
    }
    return [p, -1];
  }
  return null;
}

var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 토큰 색과 괄호 표시를 함께 입혀 HTML로
function paintHtml(code, tokens, marks) {
  const cut = /* @__PURE__ */ new Set([0, code.length]);
  for (const [s, e] of tokens) cut.add(s), cut.add(e);
  for (const p of marks.keys()) cut.add(p), cut.add(p + 1);
  const pts = [...cut].filter((x) => x >= 0 && x <= code.length).sort((a, b) => a - b);
  let out = "", ti = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const s = pts[k], e = pts[k + 1];
    while (ti < tokens.length && tokens[ti][1] <= s) ti++;
    const t = tokens[ti] && tokens[ti][0] <= s && s < tokens[ti][1] ? tokens[ti][2] : null;
    let piece = esc(code.slice(s, e));
    if (t) piece = `<span class="t-${t}">${piece}</span>`;
    const mk = marks.get(s);
    if (mk && e === s + 1) piece = `<span class="${mk}">${piece}</span>`;
    out += piece;
  }
  return out + "\n";
}

export function highlight(code, lang = "js") {
  return paintHtml(code, (TOKENIZERS[lang] ?? tokJs)(code), /* @__PURE__ */ new Map());
}

var caretHandlers = /* @__PURE__ */ new WeakMap();
var selListening = false;

// wrap: 긴 줄을 칸 너비에서 줄바꿈 / prose: 일반 글꼴과 테마 색(글 쓰는 칸처럼)
export function codeEditor(value, { onChange, label = "코드", minHeight, maxHeight, lang = "js", tab = "  ", placeholder, gutter = true, wrap = false, prose = false } = {}) {
  if (!document.getElementById("rb-code-style")) document.head.appendChild(h("style", { id: "rb-code-style" }, CSS));
  const tokenize = TOKENIZERS[lang] ?? tokJs;
  const pre = h("pre", { "aria-hidden": "true" });
  const gut = gutter ? h("div", { class: "rb-code-gut", "aria-hidden": "true" }) : null;
  const ta = h("textarea", { spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": label, wrap: wrap ? "soft" : "off", placeholder });
  ta.value = value ?? "";
  const el = h(
    "div",
    { class: ["rb-code", wrap && "wrap", prose && "prose"], style: { minHeight, maxHeight, tabSize: tab === "\t" ? "4" : null } },
    h("div", { class: "rb-code-in", style: gutter ? null : "grid-template-columns:1fr" }, gut, h("div", { class: "rb-code-area" }, pre, ta))
  );
  let raf = 0, lines = 0, tokens = [], lastText = null, lastPair = "";
  const pairNow = () => {
    if (document.activeElement !== ta || ta.selectionStart !== ta.selectionEnd) return null;
    return matchBracket(ta.value, ta.selectionStart, tokens);
  };
  const paint = () => {
    raf = 0;
    const v = ta.value;
    if (v !== lastText) {
      tokens = tokenize(v);
      lastText = v;
    }
    const pair = pairNow();
    const marks = /* @__PURE__ */ new Map();
    if (pair) {
      if (pair[1] < 0) marks.set(pair[0], "t-br-bad");
      else marks.set(pair[0], "t-br").set(pair[1], "t-br");
    }
    lastPair = pair ? pair.join(",") : "";
    pre.innerHTML = paintHtml(v, tokens, marks);
    if (gut && wrap) placeGutter(v);
    else if (gut) {
      const n = v.split("\n").length;
      if (n !== lines) {
        lines = n;
        gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
      }
    }
  };
  // 줄바꿈 모드: 긴 줄이 여러 줄로 보여도 줄 번호는 실제 줄의 첫 칸에만 붙인다 (VS Code처럼)
  let gutKey = "";
  function placeGutter(v) {
    const width = pre.clientWidth;
    const key = width + "|" + v;
    if (key === gutKey) return;
    gutKey = key;
    const starts = [0];
    for (let i = 0; i < v.length; i++) if (v.charCodeAt(i) === 10) starts.push(i + 1);
    const base = pre.getBoundingClientRect().top;
    const lh = parseFloat(getComputedStyle(pre).lineHeight) || 0;
    const rg = document.createRange();
    const walk = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    let node = walk.nextNode(), nodeStart = 0, html = "";
    for (let k = 0; k < starts.length; k++) {
      const s = starts[k];
      while (node && nodeStart + node.data.length <= s) {
        nodeStart += node.data.length;
        node = walk.nextNode();
      }
      if (!node) break;
      // 그 줄의 첫 글자(빈 줄이면 줄바꿈 글자)의 위치
      rg.setStart(node, s - nodeStart);
      rg.setEnd(node, s - nodeStart + 1);
      const r = rg.getClientRects()[0] ?? rg.getBoundingClientRect();
      // 글자 상자는 줄 높이보다 작으므로 줄 상자의 위쪽으로 맞춘다
      const top = r.top - base - (lh && r.height ? (lh - r.height) / 2 : 0);
      html += `<i style="top:${Math.round(top)}px">${k + 1}</i>`;
    }
    gut.innerHTML = `<b>${starts.length}</b>` + html;
  }
  const schedule = () => raf ||= requestAnimationFrame(paint);
  // 칸 너비가 바뀌면 줄바꿈 위치도 바뀌므로 줄 번호를 다시 놓는다
  if (wrap && gut && typeof ResizeObserver === "function") {
    let lastW = 0;
    new ResizeObserver(() => {
      const w = pre.clientWidth;
      if (w && w !== lastW) {
        lastW = w;
        schedule();
      }
    }).observe(el);
  }
  ta.addEventListener("input", () => {
    schedule();
    onChange?.(ta.value);
  });
  // 커서만 움직였을 때는 괄호 짝이 달라진 경우에만 다시 그린다
  const onCaret = () => {
    if (ta.value !== lastText) return schedule();
    const pair = pairNow();
    if ((pair ? pair.join(",") : "") !== lastPair) schedule();
  };
  for (const ev of ["click", "keyup", "focus", "blur", "select"]) ta.addEventListener(ev, onCaret);
  caretHandlers.set(ta, onCaret);
  if (!selListening) {
    selListening = true;
    // 문서 전체에 하나만 걸고, 지금 초점이 있는 편집기에만 알린다 (편집기가 많이 생겨도 이벤트가 쌓이지 않게)
    document.addEventListener("selectionchange", () => caretHandlers.get(document.activeElement)?.());
  }
  const undo = attachUndo(ta);
  // Tab은 들여쓰기, Enter는 윗줄 들여쓰기 유지
  ta.addEventListener("keydown", (e) => {
    if (e.isComposing) return;
    const { selectionStart: s, selectionEnd: t, value: v } = ta;
    if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      ta.setRangeText(tab, s, t, "end");
      ta.dispatchEvent(new Event("input"));
    } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && (lang === "js" || lang === "lua")) {
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      let indent = v.slice(lineStart).match(/^[ \t]*/)[0];
      const cur = v.slice(lineStart, s);
      if (/[{[(]\s*$/.test(cur) || lang === "lua" && /(\bthen|\bdo|\bfunction\b.*\)|\brepeat|\belse)\s*$/.test(cur)) indent += tab;
      e.preventDefault();
      ta.setRangeText("\n" + indent, s, t, "end");
      ta.dispatchEvent(new Event("input"));
    }
  });
  paint();
  return {
    el,
    textarea: ta,
    undo,
    get value() {
      return ta.value;
    },
    set value(v) {
      if (v === ta.value) return;
      const { scrollTop, scrollLeft } = el;
      ta.value = v;
      undo.reset();
      paint();
      el.scrollTop = scrollTop;
      el.scrollLeft = scrollLeft;
    },
    // 해당 글자가 처음 나오는 줄로 스크롤 (도움말에서 "코드에서 보기")
    reveal(text) {
      const i = ta.value.indexOf(text);
      if (i < 0) return false;
      const line = ta.value.slice(0, i).split("\n").length - 1;
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      el.scrollTo({ top: Math.max(0, line * lh - 40), behavior: "smooth" });
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(i, i + text.length);
      return true;
    }
  };
}
