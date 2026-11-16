// 장기 기억 → 설정: ‘게이지 배수’ 카드(2.2.6). 인물 위키 설정·NSFW 설정 줄과 아래 설정 박스 사이.
// 전체 채팅에서 계산되는 게이지(장기 기억 감정·호감, 위키 호감도, 기본 성격 막대, Erosync 매 턴 계산)가 오르고 내리는 폭에 곱한다.
import { h } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn } from "../../kit.js";
import { readGauge, saveGauge } from "../../../data/gaugemult.js";
import { GAUGE_MULT_MIN, GAUGE_MULT_MAX, normalizeGauge, isDefaultGauge } from "../../../engine/gaugemult.js";
import { ensureMemAddonCss } from "./memaddoncss.js";

const fmt = (v) => `×${Number(v).toFixed(1)}`;
export function gaugeMultCard(ctx) {
  const api = ctx.api;
  ensureMemAddonCss(ctx);
  const state = normalizeGauge(null);
  const row = (key, label, hint) => {
    const val = h("b", { class: "v" }, fmt(1));
    const rng = h("input", { type: "range", min: GAUGE_MULT_MIN, max: GAUGE_MULT_MAX, step: 0.1, value: 1, id: `rb-gauge-${key}`, "aria-label": label,
      onInput: (e) => { val.textContent = fmt(e.target.value); },
      onChange: async (e) => { try { Object.assign(state, await saveGauge(api, { [key]: Number(e.target.value) })); sync(); } catch (err) { ctx.toast?.(String(err?.message ?? err), { error: true }); } } });
    return { el: h("label", { class: "rb-gauge-row" }, h("span", { class: "t" }, label, h("small", null, hint)), rng, val), rng, val };
  };
  const up = row("up", "오를 때", "호감·끌림·성향 값이 올라가는 폭"), down = row("down", "내릴 때", "값이 떨어지는 폭");
  const reset = btn("기본(×1)으로", { size: "sm", id: "rb-gauge-reset", onClick: async () => { Object.assign(state, await saveGauge(api, { up: 1, down: 1 })); sync(); ctx.toast?.("게이지 배수를 기본으로 돌렸어요."); } });
  const sync = () => {
    for (const [r, k] of [[up, "up"], [down, "down"]]) { r.rng.value = String(state[k]); r.val.textContent = fmt(state[k]); }
    reset.hidden = isDefaultGauge(state);
  };
  readGauge(api).then((g) => { Object.assign(state, g); sync(); }).catch(() => {});
  sync();
  return h("section", { class: "rb-card bordered rb-gauge-card", id: "rb-gauge-mult" },
    h("div", { class: "rb-gauge-head" }, h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, icon("sliders", 18)),
      h("span", { class: "t" }, "게이지 배수", h("small", null, "모든 채팅에서 호감도 등 계산되는 게이지(감정·인간적/이성적 호감·소유욕·독점욕, 위키 호감도, 성격 막대, Erosync 매 턴 계산)가 움직이는 폭이에요. ×1이 원래대로, ×0이면 그 방향으로 움직이지 않아요."))),
    up.el, down.el, h("div", { class: "rb-mem-sact" }, reset));
}
