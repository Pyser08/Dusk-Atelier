// 값을 고르는 칸(슬라이더 + 숫자 입력)과 선택 칸. 브라우저 기본 모양 대신 Dusk 스타일(.rb-fld)을 쓴다.
import { h } from "./dom.js";
import { switchEl, setSwitch, optionCards } from "./kit.js";

const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));
// 슬라이더를 끌 때는 숫자만 바뀌고, 놓을 때(change) 또는 숫자 칸에서 확정할 때 onCommit(값)을 한 번 부른다.
export function sliderField({ label, hint = "", value, min = 0, max = 100, step = 1, unit = "", onCommit, id, disabled = false }) {
  let cur = clampInt(value, min, max);
  const range = h("input", { type: "range", class: "rb-range", min, max, step, value: cur, "aria-label": label, id: id ? `${id}-range` : undefined, disabled });
  const num = h("input", { type: "number", class: "rb-input", min, max, step, value: cur, "aria-label": `${label} 값`, id, disabled });
  const paint = (v) => { range.style.setProperty("--pct", `${max === min ? 0 : ((v - min) / (max - min)) * 100}%`); };
  const show = (v) => { range.value = String(v); num.value = String(v); paint(v); };
  const commit = (raw) => { const v = clampInt(raw, min, max); if (v === cur) { show(v); return; } cur = v; show(v); onCommit?.(v); };
  range.addEventListener("input", () => { const v = clampInt(range.value, min, max); num.value = String(v); paint(v); });
  range.addEventListener("change", () => commit(range.value));
  num.addEventListener("change", () => commit(num.value));
  paint(cur);
  return h("div", { class: "rb-fld", "data-fld": id || "" },
    h("div", { class: "rb-fld-top" }, h("div", { class: "rb-fld-lab" }, h("b", null, label), hint ? h("small", null, hint) : null),
      h("div", { class: "rb-fld-val" }, num, unit ? h("span", { class: "rb-muted" }, unit) : null)),
    range, h("div", { class: "rb-fld-ends rb-muted" }, h("span", null, String(min)), h("span", null, String(max))));
}
// 선택 칸: 이름 + 설명 + Dusk 모양 select(.rb-input)
export function selectField({ label, hint = "", options, value, onChange, id, disabled = false }) {
  const sel = h("select", { class: "rb-input", id, "aria-label": label, disabled, onChange: (e) => onChange?.(e.target.value) },
    ...options.map(([v, t]) => h("option", { value: v, selected: v === value }, t)));
  return h("div", { class: "rb-fld", "data-fld": id || "" }, h("div", { class: "rb-fld-lab" }, h("b", null, label), hint ? h("small", null, hint) : null), sel);
}
// 이름 + 설명 + 아무 컨트롤(분할 버튼 등)
export function controlField({ label, hint = "", control, id }) {
  return h("div", { class: "rb-fld", "data-fld": id || "" }, h("div", { class: "rb-fld-lab" }, h("b", null, label), hint ? h("small", null, hint) : null), control);
}
// 켜고 끄는 칸: 이름 + 설명 + 스위치(한 줄)
export function toggleField({ label, hint = "", on, onChange, id, disabled = false }) {
  const sw = switchEl(on === true, { label, disabled, onChange: (v, el) => { setSwitch(el, v); onChange?.(v); } });
  return h("div", { class: "rb-toggle", "data-fld": id || "" }, h("div", { class: "t" }, h("b", null, label), hint ? h("small", null, hint) : null), sw);
}
// 고르는 칸(설명이 붙은 카드형 선택): options = [[값, 이름, 짧은 설명]]
export function choiceField({ label, hint = "", options, value, onChange, id }) {
  const cards = optionCards(options.map(([v, l, t]) => ({ value: v, label: l, text: t })), value, onChange, label);
  if (id) cards.id = id;
  return controlField({ label, hint, control: cards, id: id ? `${id}-field` : "" });
}
