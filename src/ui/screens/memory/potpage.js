// 장기 기억 → 리수폿 화면(2.0.0): Erosync 화면처럼 위에 상태·켜기, 아래에 탭(개요·설정·자동 기록·고급).
// 예전엔 리수폿 설정이 장기 기억 고급의 '세부 설정'·'자동 기록 · 인물 추적'·'리수폿 고급 설정'에 흩어져 있었다.
import { h, replace } from "../../dom.js";
import { pageHead, segmented, loading, note, statusCard, switchEl, setSwitch } from "../../kit.js";
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
  // Erosync 화면과 같은 짜임: 머리(뒤로) → 큰 카드(이름·상태·켜기·설명) → 탭 → 내용. 머리·카드·탭을 먼저 그려서 개요가 늦거나 실패해도 켜기·설정은 쓴다.
  let allOn = true; try { allOn = await M.switches.potAllOn(); } catch { /* 켜짐으로 표시 */ }
  const stateBox = h("div", { id: "rb-pot-state" }, statusCard(allOn ? "prep" : "off", allOn ? "켜져 있어요. 상태를 읽는 중…" : "꺼져 있어요. 켜면 응답마다 인물 위키를 자동으로 쌓아요."));
  const sw = switchEl(allOn, { label: "리수폿", onChange: async (v, el) => {
    setSwitch(el, v);
    try { await M.switches.setPotAll(v); ctx.toast(v ? "리수폿을 켰어요. 다음 응답부터 위키가 쌓여요." : "리수폿을 껐어요."); } catch (e) { setSwitch(el, !v); fail(ctx)(e); }
    redraw();
  } });
  const hero = h("section", { class: "rb-card rb-mem-sec", id: "rb-pot-hero", style: "display:grid;gap:10px" },
    h("h3", null, "리수폿 (인물 위키 자동 기록)"),
    stateBox,
    h("div", { class: "rb-toggle" }, h("div", { class: "t" }, h("b", null, "리수폿 켜기"), h("small", null, "켜면 다음 응답부터 인물 위키가 쌓여요 · 모든 채팅에 함께 적용돼요")), sw),
    h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "응답이 끝날 때마다 등장한 인물의 성격·관계·최근 일을 인물별 위키 문서로 정리해 두고, 다음 응답에서 관련된 인물만 골라 넣어요. 무엇을 얼마나 자세히 기억할지는 ‘설정’ 탭에서 정해요."),
    h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "AI 호출: 응답마다 정리용으로 1~3번 더 들어가요. ‘설정’ 탭에서 쓸 모델을 고를 수 있어요."));
  const seg = segmented(POT_TABS, tab, (v) => { m.potTab = v; redraw(); }, "리수폿 항목");
  const tabs = h("div", { style: "overflow-x:auto;padding-bottom:2px", id: "rb-pot-tabs" }, seg);
  const pane = h("div", { class: "rb-pot-pane", style: "display:grid;gap:12px", "data-pot-tab": tab }, loading("불러오는 중", { rows: 3 }));
  replace(host, h("div", { class: "rb-me rb-pot-page", id: "rb-mem-pot", style: "display:grid;gap:12px" }, pageHead("리수폿", { back }), hero, tabs, pane));
  let ov = { nodes: [] };
  try { ov = await potOverview(ctx, redraw); }
  catch (e) { console.log("[Dusk Atelier] 리수폿 개요 오류", e); if (tab !== "settings") return replace(pane, note("err", `리수폿 개요를 그리지 못했어요: ${e?.message ?? e}`)); }
  // 큰 카드의 상태: 채팅이 열려 있으면 그 채팅 위키 상태(문서 수·마지막 기록), 아니면 켜짐/꺼짐만
  // 꺼져 있을 땐 상태 칸에 '켜기' 버튼을 두지 않는다(바로 아래 스위치와 겹침 — Erosync와 같게)
  if (ov.status && allOn) stateBox.replaceChildren(ov.status);
  else if (allOn) stateBox.replaceChildren(statusCard("on", "켜져 있어요. 채팅을 열면 그 채팅의 위키 상태를 보여 줘요."));
  const { env, cur, idx } = ov;
  const guide = h("section", { class: "rb-card rb-mem-sec", id: "rb-pot-guide" }, h("h3", null, "어디서 봐요?"),
    h("ul", { class: "rb-muted", style: "white-space:normal;padding-left:18px;margin:0" },
      h("li", null, "인물 위키: 인물마다 쌓인 문서 · 직접 고치기 · AI로 빈칸 채우기·요약 정리"),
      h("li", null, "인물 관계도: 위키의 관계를 선으로 · 가운데가 나"),
      h("li", null, "자동 기록 탭: 새 인물을 따라갈지 · 추적 인물 고르기"),
      h("li", null, "고급 탭: 저장 위치 · 자동 기록 시점 · 되돌리기")));
  if (tab === "home") return replace(pane, ...(ov.nodes ?? []), guide);
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
