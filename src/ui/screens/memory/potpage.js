// 장기 기억 → 리수폿 화면(2.0.0): Erosync 화면처럼 위에 상태·켜기, 아래에 탭(개요·설정·자동 기록·고급).
// 예전엔 리수폿 설정이 장기 기억 고급의 '세부 설정'·'자동 기록 · 인물 추적'·'리수폿 고급 설정'에 흩어져 있었다.
import { h, replace } from "../../dom.js";
import { pageHead, segmented, loading, note } from "../../kit.js";
import { mem, fail } from "./common.js";
import { potOverview, advancedPot } from "../pot.js";
import { flowSections } from "./flowsettings.js";
import { autoTrackingBox } from "./autotrackingbox.js";

export const POT_TABS = [["home", "개요"], ["settings", "설정"], ["track", "자동 기록"], ["adv", "고급"]];

export async function renderMemoryPot(ctx, host, { redraw }) {
  const m = mem(ctx);
  const back = { label: "장기 기억으로", onClick: () => { m.page = "home"; redraw(); } };
  const tab = POT_TABS.some(([k]) => k === m.potTab) ? m.potTab : "home";
  const M = ctx.memory;
  // 머리·탭을 먼저 그린다(개요를 못 그려도 설정·켜기는 쓸 수 있게). 스위치는 켜기·끄기만(모든 채팅 일괄).
  let allOn = true; try { allOn = await M.switches.potAllOn(); } catch { /* 켜짐으로 표시 */ }
  const setAll = async (v) => { try { await M.switches.setPotAll(v); ctx.toast(v ? "리수폿을 켰어요." : "리수폿을 껐어요."); } catch (e) { fail(ctx)(e); } redraw(); };
  const head = pageHead("리수폿", { sub: "인물별 위키를 자동으로 쌓아요 · 켜기·끄기와 설정은 모든 채팅에 함께 적용돼요", back, sw: { on: allOn, text: allOn ? "켜짐" : "꺼짐", label: "리수폿 켜기", onChange: (v) => setAll(v) } });
  const seg = segmented(POT_TABS, tab, (v) => { m.potTab = v; redraw(); }, "리수폿 화면");
  const pane = h("div", { class: "rb-pot-pane", style: "display:grid;gap:12px", "data-pot-tab": tab }, loading("불러오는 중", { rows: 3 }));
  replace(host, h("div", { class: "rb-mem2-main", id: "rb-mem-pot" }, head, seg, pane));
  let ov = { nodes: [] };
  if (tab !== "settings") {
    try { ov = await potOverview(ctx, redraw); }
    catch (e) { console.log("[Dusk Atelier] 리수폿 개요 오류", e); return replace(pane, note("err", `리수폿 개요를 그리지 못했어요: ${e?.message ?? e}`)); }
  }
  const { env, cur, idx } = ov;
  if (tab === "home") return replace(pane, ...(ov.nodes?.length ? ov.nodes : [note("info", "보여 줄 내용이 없어요. 채팅을 연 뒤 다시 열어 주세요.")]));
  // 설정(무엇을 기억할지·AI 모델 등)은 전체 설정이라 채팅이 없어도 바꾼다
  if (tab === "settings") {
    replace(pane, loading("불러오는 중", { rows: 3 }));
    return flowSections(ctx, pane, { redraw }).catch(fail(ctx));
  }
  if (!env) return replace(pane, note("info", "자동 기록·고급은 채팅마다 다른 설정이라, 채팅을 열면 쓸 수 있어요."));
  if (tab === "track") {
    return replace(pane, await autoTrackingBox(env, { noAdvanced: true }));
  }
  return replace(pane, ...advancedPot(ctx, env, cur, idx, redraw));
}
