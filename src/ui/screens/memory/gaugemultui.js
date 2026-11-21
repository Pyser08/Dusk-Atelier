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
  // 2.2.26: 인간적 호감·그 밖의 감정 / 이성적 호감을 따로
  const up = row("up", "오를 때", "인간적 호감·신뢰·존경·의존·소유욕·독점욕, 위키 호감도·성격 막대가 올라가는 폭"), down = row("down", "내릴 때", "그 값들이 떨어지는 폭");
  const negUp = row("negUp", "오를 때", "적대감·두려움이 쌓이는 폭"), negDown = row("negDown", "내릴 때", "적대감·두려움이 누그러지는 폭(시간이 지나 식는 것 제외)");
  const romUp = row("romUp", "오를 때", "이성적 호감(끌림)이 올라가는 폭"), romDown = row("romDown", "내릴 때", "이성적 호감이 떨어지는 폭(식는 속도 포함)");
  const lust = row("lust", "달아오르는 속도", "성욕 게이지가 차는 속도 — 인물마다 AI가 정한 배수(0.5~2) 위에 곱해요");
  const grp = (title, ...rows) => h("div", { class: ["rb-gauge-grp", title === "이성적 호감" && "rom", /^부정적/.test(title) && "neg"] }, h("small", { class: "rb-gauge-gh" }, title), ...rows.map((r) => r.el));
  const reset = btn("기본(×1)으로", { size: "sm", id: "rb-gauge-reset", onClick: async () => { Object.assign(state, await saveGauge(api, { up: 1, down: 1, romUp: 1, romDown: 1, negUp: 1, negDown: 1, lust: 1 })); sync(); ctx.toast?.("게이지 배수를 기본으로 돌렸어요."); } });
  const sync = () => {
    for (const [r, k] of [[up, "up"], [down, "down"], [romUp, "romUp"], [romDown, "romDown"], [negUp, "negUp"], [negDown, "negDown"], [lust, "lust"]]) { r.rng.value = String(state[k]); r.val.textContent = fmt(state[k]); }
    reset.hidden = isDefaultGauge(state);
  };
  readGauge(api).then((g) => { Object.assign(state, g); sync(); }).catch(() => {});
  sync();
  return h("section", { class: "rb-card bordered rb-gauge-card", id: "rb-gauge-mult" },
    h("div", { class: "rb-gauge-head" }, h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, icon("sliders", 18)),
      h("span", { class: "t" }, "게이지 배수", h("small", null, "모든 채팅에서 호감도 등 계산되는 게이지(감정·인간적/이성적 호감·소유욕·독점욕, 위키 호감도, 성격 막대, Erosync 매 턴 계산)가 움직이는 폭이에요. ×1이 원래대로, ×0이면 그 방향으로 움직이지 않아요."))),
    grp("인간적 호감 · 그 밖의 감정", up, down), grp("이성적 호감", romUp, romDown), grp("부정적 감정 (적대감·두려움)", negUp, negDown), grp("성욕", lust), h("div", { class: "rb-mem-sact" }, reset));
}
