// 로어북 내용에서 고른 부분을 확률로 나오게 만들기 (선택 → 🎲 버튼 → 팝업)
// 고른 글을 리스 CBS로 감싼다: {{#if {{? {{random}} < 0.3}}}}글{{:else}}대신 글{{/if}}
// 플러그인이 없어도 리스가 그대로 읽는다. 프롬프트를 만들 때마다 새로 굴려진다.
import { h } from './dom.js';
import { btn } from './kit.js';

var OPEN = /\{\{#if \{\{\? \{\{random\}\} < ([0-9.]+)\}\}\}\}/g;
var TAG = /\{\{#[a-z_]+|\{\{\/[a-z_]*\}\}|\{\{:else\}\}/g;

// 확률 블록을 찾는다 (안쪽에 다른 #if가 있어도 짝을 세어서 맞춘다)
export function findProbBlocks(text) {
  const out = [];
  OPEN.lastIndex = 0;
  let m;
  while ((m = OPEN.exec(text))) {
    const start = m.index, bodyStart = start + m[0].length;
    let depth = 1, elseAt = -1, end = -1, bodyEnd = -1;
    TAG.lastIndex = bodyStart;
    let t;
    while ((t = TAG.exec(text))) {
      if (t[0].startsWith("{{#")) depth++;
      else if (t[0] === "{{:else}}") { if (depth === 1 && elseAt < 0) elseAt = t.index; }
      else if (--depth === 0) { bodyEnd = t.index; end = t.index + t[0].length; break; }
    }
    if (end < 0) continue;
    const pct = Math.round(Number(m[1]) * 1000) / 10;
    const mainEnd = elseAt >= 0 ? elseAt : bodyEnd;
    out.push({
      start, end, pct,
      body: text.slice(bodyStart, mainEnd),
      other: elseAt >= 0 ? text.slice(elseAt + "{{:else}}".length, bodyEnd) : ""
    });
  }
  return out;
}
export function wrapProb(body, pct, other = "") {
  const p = String(Math.round(pct * 10) / 1000);
  return `{{#if {{? {{random}} < ${p}}}}}${body}${other ? `{{:else}}${other}` : ""}{{/if}}`;
}
// 고른 범위가 {{ }} 짝을 깨지 않는지
function balanced(s) {
  let d = 0;
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === "{" && s[i + 1] === "{") { d++; i++; }
    else if (s[i] === "}" && s[i + 1] === "}") { if (--d < 0) return false; i++; }
  }
  return d === 0;
}
// 고른 범위가 확률 블록을 반만 걸치지 않는지
function crossesBlock(blocks, s, e) {
  return blocks.some((b) => (s > b.start && s < b.end && e > b.end) || (s < b.start && e > b.start && e < b.end));
}

// textarea를 감싼 칸을 돌려준다. win은 팝업을 붙일 창
// hooks(선택): { onAi(): 'AI로 다시 쓰기' 버튼을 눌렀을 때, onSelect({s,e}): 글을 고를 때마다 }
export function attachProbPick(ta, win, onChange, hooks) {
  const bar = h("button", { type: "button", class: "rb-pp-bar", hidden: true, onMousedown: (ev) => ev.preventDefault(), onTouchstart: (ev) => ev.preventDefault() });
  const aiBar = hooks?.onAi ? h("button", { type: "button", class: "rb-pp-bar rb-pp-ai", hidden: true, onMousedown: (ev) => ev.preventDefault(), onTouchstart: (ev) => ev.preventDefault() }, "✨ AI로 다시 쓰기") : null;
  const inner = h("div", { class: "rb-pp-in" });
  const back = h("div", { class: "rb-pp-back", "aria-hidden": "true" }, inner);
  const wrap = h("div", { class: "rb-pp-wrap" }, back, ta, bar, aiBar);
  ta.classList.add("rb-pp-ta");
  let cur = null;

  // 확률 블록을 상자로 보여 주기: 글자 뒤에 같은 글을 깔고 블록만 칠한다
  const draw = () => {
    const cs = getComputedStyle(ta);
    if (!cs.fontSize || !ta.isConnected) return;
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const sb = Math.max(0, ta.offsetWidth - ta.clientWidth - bl - br);
    Object.assign(back.style, {
      width: ta.offsetWidth + "px", height: ta.offsetHeight + "px",
      font: cs.font, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, tabSize: cs.tabSize,
      padding: `${cs.paddingTop} calc(${cs.paddingRight} + ${sb}px) ${cs.paddingBottom} ${cs.paddingLeft}`,
      borderStyle: "solid", borderColor: "transparent", borderWidth: `${cs.borderTopWidth} ${br}px ${cs.borderBottomWidth} ${bl}px`
    });
    const text = ta.value, parts = [];
    let at = 0;
    for (const b of findProbBlocks(text)) {
      if (b.start < at) continue;
      parts.push(document.createTextNode(text.slice(at, b.start)));
      parts.push(h("mark", { class: "rb-pp-mark" }, text.slice(b.start, b.end)));
      at = b.end;
    }
    parts.push(document.createTextNode(text.slice(at) + "\n "));
    inner.replaceChildren(...parts);
    inner.style.transform = `translateY(${-ta.scrollTop}px)`;
  };
  ta.addEventListener("input", draw);
  ta.addEventListener("scroll", () => { inner.style.transform = `translateY(${-ta.scrollTop}px)`; });
  if (typeof ResizeObserver === "function") new ResizeObserver(draw).observe(ta);
  requestAnimationFrame(draw);

  const targetNow = () => {
    const s = ta.selectionStart ?? 0, e = ta.selectionEnd ?? 0;
    const blocks = findProbBlocks(ta.value);
    const hit = blocks.find((b) => s >= b.start && e <= b.end);
    if (hit) return { mode: "edit", block: hit, s, e, blocks };
    if (e > s && ta.value.slice(s, e).trim()) return { mode: "new", s, e, blocks };
    return null;
  };
  const paint = () => {
    const s0 = ta.selectionStart ?? 0, e0 = ta.selectionEnd ?? 0, picked = e0 > s0 && ta.value.slice(s0, e0).trim();
    if (aiBar) { aiBar.hidden = !picked; if (picked) hooks.onSelect?.({ s: s0, e: e0 }); }
    cur = targetNow();
    if (!cur) { bar.hidden = true; return; }
    bar.textContent = cur.mode === "edit" ? `🎲 ${cur.block.pct}% 확률 수정` : "🎲 확률로 만들기";
    bar.hidden = false;
  };
  let timer = 0;
  const later = () => { clearTimeout(timer); timer = setTimeout(paint, 30); };
  for (const ev of ["select", "keyup", "mouseup", "touchend", "input", "focus"]) ta.addEventListener(ev, later);
  ta.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== bar) bar.hidden = true; if (aiBar && document.activeElement !== aiBar) aiBar.hidden = true; }, 200));
  bar.addEventListener("click", () => { if (cur) open(cur); });
  aiBar?.addEventListener("click", () => { hooks.onSelect?.({ s: ta.selectionStart ?? 0, e: ta.selectionEnd ?? 0 }); hooks.onAi(); });

  function replaceRange(s, e, text) {
    ta.focus();
    ta.setRangeText(text, s, e, "select");
    ta.dispatchEvent(new Event("input"));
    draw();
    onChange?.();
    paint();
  }

  function open(t) {
    const edit = t.mode === "edit";
    let s = t.s, e = t.e, selText = ta.value.slice(s, e);
    if (!edit) {
      // 앞뒤 공백·줄바꿈은 감싸지 않고 밖에 둔다
      const lead = selText.length - selText.trimStart().length, trail = selText.length - selText.trimEnd().length;
      s += lead; e -= trail; selText = ta.value.slice(s, e);
    }
    const back = h("div", { class: "rb-modal", onMousedown: (ev) => { if (ev.target === back) back.remove(); } });
    const pct0 = edit ? t.block.pct : 30;
    const range = h("input", { type: "range", min: 1, max: 99, step: 1, value: String(Math.min(99, Math.max(1, Math.round(pct0)))), class: "rb-da-range", "aria-label": "나올 확률" });
    const num = h("input", { type: "number", min: 1, max: 99, step: 1, value: String(Math.round(pct0)), class: "rb-input", style: "width:72px" });
    const other = h("textarea", { class: "rb-textarea", spellcheck: "false", style: "min-height:60px;font-family:inherit;font-size:14px", placeholder: "비워 두면 안 나올 때 아무것도 안 넣어요" });
    other.value = edit ? t.block.other : "";
    const warn = h("p", { class: "rb-muted", style: "color:var(--rb-warn,#e0a44c);margin:0" });
    const shown = (edit ? t.block.body : selText).replace(/\s+/g, " ");
    const problem = edit ? "" : !balanced(selText) ? "고른 부분의 {{ }} 짝이 맞지 않아요. 짝이 맞게 다시 골라 주세요." : crossesBlock(t.blocks, s, e) ? "이미 만든 확률 블록을 반만 걸치고 있어요. 다시 골라 주세요." : "";
    warn.textContent = problem;
    const val = () => Math.min(99, Math.max(1, Math.round(Number(num.value) || 1)));
    range.addEventListener("input", () => { num.value = range.value; });
    num.addEventListener("input", () => { range.value = String(val()); });
    const apply = btn(edit ? "수정" : "만들기", { kind: "primary", onClick: () => {
      if (problem) return;
      const p = val(), o = other.value.trim();
      if (edit) replaceRange(t.block.start, t.block.end, wrapProb(t.block.body, p, o));
      else replaceRange(s, e, wrapProb(selText, p, o));
      back.remove();
    } });
    if (problem) apply.disabled = true;
    const box = h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-label": "확률로 만들기" },
      h("h3", { class: "rb-h3" }, edit ? "확률 수정" : "확률로 만들기"),
      h("div", { class: "rb-pp-prev" }, shown.length > 160 ? shown.slice(0, 160) + "…" : shown),
      h("div", { style: "display:flex;gap:10px;align-items:center" }, h("span", { class: "rb-label", style: "margin:0" }, "나올 확률"), range, num, h("span", null, "%")),
      h("span", { class: "rb-label", style: "margin:0" }, "안 나올 때 대신 넣을 글 (선택)"),
      other,
      warn,
      h("p", { class: "rb-muted", style: "margin:0;font-size:12.5px" }, "프롬프트를 만들 때마다 새로 굴려져요. 리롤하면 다시 정해져요."),
      h(
        "div",
        { class: "btns" },
        edit ? btn("해제", { onClick: () => { replaceRange(t.block.start, t.block.end, t.block.body); back.remove(); } }) : null,
        btn("취소", { onClick: () => back.remove() }),
        apply
      )
    );
    back.appendChild(box);
    win.appendChild(back);
    num.focus();
  }
  return wrap;
}

export var PROB_CSS = `
.rb-pp-wrap{position:relative;display:block;border-radius:12px;background:var(--rb-surf)}
.rb-pp-back{position:absolute;left:0;top:0;z-index:0;overflow:hidden;pointer-events:none;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;color:transparent}
.rb-pp-ta{position:relative;z-index:1;background:transparent !important}
.rb-pp-mark{color:transparent;background:color-mix(in srgb,var(--rb-acc-text) 16%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--rb-acc-text) 55%,transparent);border-radius:4px}
.rb-pp-bar{position:absolute;right:10px;bottom:10px;z-index:5;padding:7px 12px;border-radius:999px;border:1px solid var(--rb-line3);background:var(--rb-win);color:var(--rb-text);font-weight:600;font-size:13px;box-shadow:var(--rb-shadow);cursor:pointer}
.rb-pp-ai{bottom:52px}
.rb-pp-bar[hidden]{display:none}
.rb-pp-prev{padding:10px 12px;border-radius:10px;background:var(--rb-surf);border:1px solid var(--rb-line);font-size:13.5px;line-height:1.6;max-height:96px;overflow:auto;word-break:break-word}
`;
