// 가벼운 코드 편집기: 투명한 textarea 뒤에 색을 입힌 pre를 겹쳐 VS Code처럼 보이게 한다
import { h } from './dom.js';

var CSS = `
.rb-code{--c-bg:#1e1e1e;--c-fg:#d4d4d4;--c-gut:#858585;--c-line:#2b2b2b;border-radius:12px;border:1px solid var(--rb-line);background:var(--c-bg);overflow:auto;max-height:68vh;min-height:320px;position:relative;font:12.5px/1.6 ui-monospace,"Cascadia Code","D2Coding",Menlo,Consolas,monospace;tab-size:2}
.rb-code-in{display:grid;grid-template-columns:auto 1fr;min-width:100%;width:max-content}
.rb-code-gut{position:sticky;left:0;z-index:2;background:var(--c-bg);color:var(--c-gut);text-align:right;padding:12px 10px 12px 12px;border-right:1px solid var(--c-line);user-select:none;white-space:pre}
.rb-code-area{position:relative}
.rb-code pre,.rb-code textarea{margin:0;padding:12px 16px;font:inherit;white-space:pre;word-wrap:normal;letter-spacing:0;tab-size:2}
.rb-code pre{color:var(--c-fg);pointer-events:none;min-height:100%}
.rb-code textarea{position:absolute;inset:0;width:100%;height:100%;resize:none;border:0;outline:none;background:transparent;color:transparent;caret-color:#aeafad;overflow:hidden;-webkit-text-fill-color:transparent}
.rb-code textarea::selection{background:#264f78;-webkit-text-fill-color:transparent}
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
`;

var KW = new Set(["if", "else", "return", "await", "for", "while", "do", "try", "catch", "finally", "throw", "switch", "case", "break", "continue", "of", "in", "new", "delete", "typeof", "instanceof", "default", "import", "export", "from", "yield"]);
var DECL = new Set(["const", "let", "var", "function", "class", "async", "static", "get", "set", "extends", "this", "super"]);
var LIT = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);
// DA Interop 등록에서 중요한 이름들은 따로 강조
var KEYS = new Set(["id", "name", "version", "pluginName", "description", "fields", "presets", "getValues", "apply", "key", "label", "type", "options", "values", "group", "min", "max", "step", "default"]);
var API = new Set(["registerInterop", "risuai", "Risuai", "risu", "pluginStorage"]);

var TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`?|'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function highlight(code) {
  let out = "", last = 0, m;
  TOKEN.lastIndex = 0;
  while (m = TOKEN.exec(code)) {
    out += esc(code.slice(last, m.index));
    last = TOKEN.lastIndex;
    const [tok, com, str, num, id] = m;
    let cls;
    if (com) cls = com.startsWith("//@") ? "meta" : "com";
    else if (str) cls = "str";
    else if (num) cls = "num";
    else if (id) {
      const before = code.slice(Math.max(0, m.index - 1), m.index);
      const after = code.slice(last, last + 40).match(/^\s*(\S)/)?.[1];
      if (API.has(id)) cls = "api";
      else if (before === ".") cls = after === "(" ? "fn" : "prop";
      else if (after === ":" && /[{,]\s*$/.test(code.slice(Math.max(0, m.index - 200), m.index))) cls = KEYS.has(id) ? "key" : "prop";
      else if (KW.has(id)) cls = "kw";
      else if (DECL.has(id)) cls = "decl";
      else if (LIT.has(id)) cls = "lit";
      else if (after === "(") cls = "fn";
      else if (/^[A-Z]/.test(id)) cls = "type";
    }
    out += cls ? `<span class="t-${cls}">${esc(tok)}</span>` : esc(tok);
  }
  return out + esc(code.slice(last)) + "\n";
}

export function codeEditor(value, { onChange, label = "코드" } = {}) {
  if (!document.getElementById("rb-code-style")) document.head.appendChild(h("style", { id: "rb-code-style" }, CSS));
  const pre = h("pre", { "aria-hidden": "true" });
  const gut = h("div", { class: "rb-code-gut", "aria-hidden": "true" });
  const ta = h("textarea", { spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": label, wrap: "off" });
  ta.value = value;
  const el = h("div", { class: "rb-code" }, h("div", { class: "rb-code-in" }, gut, h("div", { class: "rb-code-area" }, pre, ta)));
  let raf = 0, lines = 0;
  const paint = () => {
    raf = 0;
    pre.innerHTML = highlight(ta.value);
    const n = ta.value.split("\n").length;
    if (n !== lines) {
      lines = n;
      gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    }
  };
  const schedule = () => raf ||= requestAnimationFrame(paint);
  ta.addEventListener("input", () => {
    schedule();
    onChange?.(ta.value);
  });
  // Tab은 들여쓰기, Enter는 윗줄 들여쓰기 유지
  ta.addEventListener("keydown", (e) => {
    if (e.isComposing) return;
    const { selectionStart: s, selectionEnd: t, value: v } = ta;
    if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      ta.setRangeText("  ", s, t, "end");
      ta.dispatchEvent(new Event("input"));
    } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      let indent = v.slice(lineStart).match(/^[ \t]*/)[0];
      if (/[{[(]\s*$/.test(v.slice(lineStart, s))) indent += "  ";
      e.preventDefault();
      ta.setRangeText("\n" + indent, s, t, "end");
      ta.dispatchEvent(new Event("input"));
    }
  });
  paint();
  return {
    el,
    get value() {
      return ta.value;
    },
    set value(v) {
      if (v === ta.value) return;
      const { scrollTop, scrollLeft } = el;
      ta.value = v;
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
