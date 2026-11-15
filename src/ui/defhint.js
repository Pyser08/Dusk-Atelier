// 조절 가능한 수치 옆에 ‘기본 N’을 보여 주는 작은 글자(2.2.0). 값이 기본과 다를 때도 늘 같은 자리에 보인다.
import { h } from "./dom.js";
export const fmtDef = (v) => (typeof v === "number" ? v.toLocaleString("ko-KR") : String(v));
export const defHint = (def, unit = "") => (def === undefined || def === null ? null : h("small", { class: "rb-def" }, `기본 ${fmtDef(def)}${unit}`));
