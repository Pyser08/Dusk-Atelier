// 로어북 규칙 한 번에 바꾸기 창(2.2.68, 신고 #30). 고른 칸만 바꾸고 ‘그대로’인 칸은 손대지 않는다.
// 돌려주는 값: editor.js bulkRule()에 넘길 patch(바꿀 칸만), 닫으면 null
import { h } from '../dom.js';
import { btn, modal, note } from '../kit.js';

const KEEP = "";
const sel = (opts, aria) => h("select", { class: "rb-input", "aria-label": aria, style: "height:34px;min-width:120px" }, h("option", { value: KEEP }, "그대로"), ...opts.map(([v, t]) => h("option", { value: v }, t)));
const num = (ph, { min = 0, max } = {}) => h("input", { class: "rb-input", type: "number", min, max, placeholder: ph, style: "height:34px;width:90px" });
const txt = (ph) => h("input", { class: "rb-input", placeholder: ph, style: "height:34px;flex:1;min-width:140px" });
const row = (label, ...kids) => h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, h("span", { style: "min-width:96px;font-weight:600;font-size:13px" }, label), ...kids);
const small = (t) => h("span", { class: "rb-muted", style: "font-size:12px" }, t);

// 화면 입력 → patch (순수 함수, 시험용으로 내보냄)
export function readBulkPatch(v) {
  const p = {};
  const n = (x) => (x === "" || x == null || !Number.isFinite(Number(x)) ? null : Number(x));
  if (n(v.prob) !== null) p.prob = Math.max(0, Math.min(100, n(v.prob)));
  if (v.once) { p.once = v.once; if (v.once === "cooldown" && n(v.cool) !== null) p.cool = Math.max(1, n(v.cool)); }
  if (n(v.hold) !== null) p.hold = Math.max(0, Math.floor(n(v.hold)));
  if (n(v.scan) !== null) p.scan = Math.max(1, Math.floor(n(v.scan)));
  const tag = String(v.scanTag ?? "").trim();
  if (tag === "-") p.scanTag = null; else if (tag) p.scanTag = tag.replace(/^<\/?|>$/g, "");
  if (v.whole) p.whole = v.whole === "on";
  if (v.common) p.common = v.common === "on";
  const g = String(v.group ?? "").trim();
  if (g === "-") p.group = ""; else if (g) p.group = g;
  if (v.at) { p.at = v.at; if (v.at === "depth" && n(v.depth) !== null) p.depth = Math.max(0, n(v.depth)); }
  if (v.role) p.role = v.role;
  return p;
}

export function bulkRuleDialog(ctx, count) {
  return modal(ctx.win, (done) => {
    const f = {
      prob: num("그대로", { max: 100 }),
      once: sel([["none", "제한 없음"], ["chat", "채팅에서 한 번"], ["cooldown", "쉬었다가"]], "반복"),
      cool: num("턴", { min: 1 }),
      hold: num("그대로"),
      scan: num("그대로", { min: 1 }),
      scanTag: txt("그대로 · 예) status · 지우려면 -"),
      whole: sel([["on", "켜기"], ["off", "끄기"]], "이름 경계"),
      common: sel([["on", "켜기"], ["off", "끄기"]], "흔한 낱말 이름"),
      group: txt("그대로 · 지우려면 -"),
      at: sel([["top", "로어북 자리"], ["depth", "대화 사이"], ["bottom", "대화 맨 끝"]], "위치"),
      depth: num("개", { min: 0 }),
      role: sel([["system", "system"], ["user", "user"], ["assistant", "assistant"]], "역할")
    };
    const coolRow = row("", small("켜진 뒤"), f.cool, small("턴 쉬기"));
    const depthRow = row("", small("끝에서"), f.depth, small("개 메시지 위"));
    const sync = () => { coolRow.style.display = f.once.value === "cooldown" ? "flex" : "none"; depthRow.style.display = f.at.value === "depth" ? "flex" : "none"; };
    f.once.addEventListener("change", sync); f.at.addEventListener("change", sync); sync();
    const status = h("div");
    const apply = () => {
      const patch = readBulkPatch(Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value])));
      if (!Object.keys(patch).length) { status.replaceChildren(note("warn", "바꿀 칸을 하나 이상 정해 주세요.")); return; }
      done(patch);
    };
    return h("div", { class: "rb-dialog", role: "dialog", "aria-label": "규칙 한 번에 바꾸기", style: "max-width:560px;display:flex;flex-direction:column;gap:10px" },
      h("h3", { class: "rb-h3" }, `규칙 한 번에 바꾸기 · ${count}개`),
      h("p", { class: "rb-muted", style: "margin:0" }, "정한 칸만 바뀌고 ‘그대로’·빈 칸은 항목마다 원래 값을 둬요. 규칙이 꺼져 있던 항목은 켜고 바꿔요. 조건·연쇄·변수는 항목마다 따로 고쳐 주세요."),
      row("켜질 확률", f.prob, small("%")),
      row("반복", f.once), coolRow,
      row("유지", f.hold, small("턴 (0·1이면 그 턴만)")),
      row("찾는 범위", small("최근"), f.scan, small("개 메시지")),
      row("태그 안만", f.scanTag),
      row("이름 경계", f.whole),
      row("흔한 낱말 이름", f.common),
      row("중복 금지 그룹", f.group),
      row("위치", f.at), depthRow,
      row("역할", f.role),
      status,
      h("div", { class: "btns" }, btn("닫기", { onClick: () => done(null) }), btn("바꾸기", { kind: "primary", onClick: apply })));
  });
}
