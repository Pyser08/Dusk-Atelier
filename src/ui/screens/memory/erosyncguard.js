// Erosync 화면의 '집착 방지' 카드: 집착성 상한, 같은 대상 연속 목표 턴, 쉬는 턴. 값은 Dusk 쪽(dusk.erosync.guard)에 저장된다.
import { h } from "../../dom.js";
import { switchEl, setSwitch } from "../../kit.js";

export function erosyncGuardCard(ctx) {
  const er = ctx.erosync;
  const g = er.guard?.() ?? { on: false, obsessionCap: 60, sameTargetTurns: 3, restTurns: 4 };
  const num = (id, label, key, lo, hi, hint) => h("div", { class: "rb-mem-field" }, h("span", null, label, h("small", { class: "rb-muted" }, ` ${hint}`)),
    h("input", { type: "number", id, min: lo, max: hi, value: g[key], onChange: (e) => { const v = Math.min(hi, Math.max(lo, Math.round(Number(e.target.value) || lo))); e.target.value = v; er.setGuard({ [key]: v }); } }));
  const sw = switchEl(g.on, { label: "집착 방지", onChange: (v, el) => { setSwitch(el, v); er.setGuard({ on: v }); } });
  return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-guard", style: "display:grid;gap:14px" }, h("h3", null, "집착 방지"),
    h("p", { class: "rb-muted", style: "white-space:normal" }, "켜면 인물의 집착성 값을 상한으로 눌러 장면 판단에 넘기고, 한 인물이 같은 대상으로 목표를 너무 오래 이어 가면 잠시 쉬게 해요. 껐을 때는 평소처럼 움직여요."),
    h("div", { class: "rb-mem-field row" }, h("span", null, "집착 방지 켜기"), sw),
    num("rb-erosync-g-cap", "집착성 상한", "obsessionCap", 0, 100, "(0~100, 기본 60)"),
    num("rb-erosync-g-same", "같은 대상 연속 목표", "sameTargetTurns", 1, 20, "(턴, 기본 3)"),
    num("rb-erosync-g-rest", "반복 후 쉬는 턴", "restTurns", 1, 50, "(턴, 기본 4)"));
}
