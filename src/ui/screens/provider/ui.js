// 프로바이더 화면 부품: 입력칸·묶음. 값이 바뀌면 onChange(값)만 부른다(저장은 부르는 쪽).
import { h } from "../../dom.js";
export const field = (label, ctl, hint, wide) => h("label", { class: ["rb-pfield", wide && "wide"] }, h("span", { class: "rb-label" }, label), ctl, hint ? h("small", null, hint) : null);
export const text = (v, onChange, { ph = "", type = "text", label } = {}) => h("input", { class: "rb-input", type, value: v ?? "", placeholder: ph, "aria-label": label ?? ph, autocomplete: "off", spellcheck: "false", onChange: (e) => onChange(e.target.value) });
export const num = (v, onChange, { ph = "비워 두면 기본", step = "any", label } = {}) => h("input", { class: "rb-input", type: "number", step, value: v ?? "", placeholder: ph, "aria-label": label ?? ph, onChange: (e) => onChange(e.target.value === "" ? null : Number(e.target.value)) });
export const area = (v, onChange, { ph = "", rows = 4, label } = {}) => h("textarea", { class: "rb-input area", rows, placeholder: ph, "aria-label": label ?? ph, spellcheck: "false", onChange: (e) => onChange(e.target.value) }, v ?? "");
export const select = (opts, v, onChange, label) => h("select", { class: "rb-input", "aria-label": label, onChange: (e) => onChange(e.target.value) }, opts.map(([k, t]) => h("option", { value: k, selected: k === v }, t)));
export const grid = (...kids) => h("div", { class: "rb-pgrid" }, ...kids.filter(Boolean));
export const usd = (n) => `$${(Number(n) || 0) < 1 ? (Number(n) || 0).toFixed(4) : (Number(n) || 0).toFixed(2)}`;
export const kfmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n ?? 0));
