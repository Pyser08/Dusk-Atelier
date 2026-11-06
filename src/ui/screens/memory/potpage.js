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
  replace(host, loading("리수폿을 불러오는 중", { rows: 3 }));
  const ov = await potOverview(ctx, redraw);
  const { env, cur, idx, pot, setOn } = ov;
  const sub = cur ? `${cur.botName || "이름 없는 캐릭터"} · ${cur.chatName || "이 채팅"} · 인물별 위키를 자동으로 쌓아요` : "인물별 위키를 자동으로 쌓아요";
  const head = pageHead("리수폿", { sub, back, ...(pot ? { sw: { on: pot.on, label: "모든 채팅에서 사용", onChange: (v) => setOn(v) } } : {}) });
  const seg = segmented(POT_TABS, tab, (v) => { m.potTab = v; redraw(); }, "리수폿 화면");
  const pane = h("div", { class: "rb-pot-pane", style: "display:grid;gap:12px", "data-pot-tab": tab });
  replace(host, h("div", { class: "rb-mem2-main", id: "rb-mem-pot" }, head, seg, pane));
  if (tab === "home") return replace(pane, ...ov.nodes);
  if (!env) return replace(pane, note("info", "채팅을 열면 이 탭을 쓸 수 있어요."));
  if (tab === "settings") {
    replace(pane, loading("불러오는 중", { rows: 3 }));
    return flowSections(ctx, pane, { redraw }).catch(fail(ctx));
  }
  if (tab === "track") {
    return replace(pane, await autoTrackingBox(env, { noAdvanced: true }));
  }
  return replace(pane, ...advancedPot(ctx, env, cur, idx, redraw));
}
