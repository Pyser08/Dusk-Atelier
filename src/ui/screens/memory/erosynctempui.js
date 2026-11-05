// 인물 위키 NSFW 탭의 '관계 온도' 칸: 상대별 호감·끌림·반감이 턴마다 어떻게 변했는지 그래프로 보여 주고, 장면 판단에 변화량을 넣을지 정한다.
// 값은 Erosync가 이미 쓰는 관계 수치를 턴마다 적어 둔 것이라 AI 호출이 없다.
import { h } from "../../dom.js";
import { switchEl, setSwitch } from "../../kit.js";
import { eroTemp, tempPath } from "../../../engine/erosyncview.js";

const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); for (const c of kids) if (c) e.append(c); return e; };
export const TEMP_LINES = [["a", "호감", "var(--rb-accent, #6aa5ff)"], ["e", "끌림", "#e07aa6"], ["h", "반감", "#c9a24a"]];

function chart(t, w = 240, h2 = 70) {
  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h2}`, width: "100%", height: h2, role: "img", "aria-label": `${t.toName}에 대한 관계 온도`, preserveAspectRatio: "none", "data-to": t.to });
  for (const y of [0, 50, 100]) svg.append(svgEl("line", { x1: 0, x2: w, y1: h2 - (y / 100) * h2, y2: h2 - (y / 100) * h2, stroke: "currentColor", "stroke-opacity": y === 50 ? 0.25 : 0.1, "stroke-width": 1 }));
  for (const [k, label, color] of TEMP_LINES) svg.append(svgEl("polyline", { points: tempPath(t.points, k, w, h2), fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "data-k": k }, svgEl("title", {}, label)));
  return svg;
}

export function eroTempCard(ctx, card, snap, person) {
  const list = eroTemp(snap, person.id);
  const er = ctx.erosync;
  if (!list.length) return null;
  const rows = list.map((t) => {
    const a = t.points[0], b = t.points[t.points.length - 1], sign = (v) => (v > 0 ? `+${v}` : `${v}`);
    return h("div", { class: "rb-ero-temp", "data-to": t.to, style: "display:grid;gap:4px" },
      h("div", { style: "display:flex;justify-content:space-between;gap:8px" }, h("b", null, t.toName), h("small", { class: "rb-muted" }, `${a.turn}~${b.turn}턴 · 호감 ${sign(b.a - a.a)} · 끌림 ${sign(b.e - a.e)} · 반감 ${sign(b.h - a.h)}`)),
      chart(t));
  });
  const legend = h("div", { class: "rb-muted", style: "display:flex;gap:12px;font-size:12px" }, ...TEMP_LINES.map(([, label, color]) => h("span", null, h("i", { style: `display:inline-block;width:10px;height:3px;background:${color};margin-right:4px;vertical-align:middle` }), label)));
  const sw = switchEl(true, { label: "관계 온도 변화를 장면 판단에 반영", onChange: async (v, el) => { setSwitch(el, v); await er?.tempTrend?.(v); } });
  er?.tempTrend?.().then((v) => setSwitch(sw, !!v)).catch(() => {});
  return card("관계 온도", [h("small", { class: "rb-muted" }, "턴마다 이 인물이 상대에게 느끼는 호감·끌림·반감을 적어 둔 거예요. AI를 더 부르지 않아요."), ...rows, legend,
    h("div", { class: "rb-toggle", id: "rb-ero-temp-inject" }, h("div", { class: "t" }, h("b", null, "장면 판단에 반영"), h("small", null, "최근 몇 턴의 변화량을 함께 알려 줘요")), sw)], h("small", { class: "rb-wk2-badge" }, "Erosync"), "rb-wk2-ero");
}
