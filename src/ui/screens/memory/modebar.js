// 기억 탭 맨 위: 장기기억 방식(저장소). 간단·고급 모드 모두에서 선택을 유지하고 바꿀 수 있다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { segmented, note, confirmDialog } from "../../kit.js";
import { hasBardWiki } from "../../../data/memorybackend.js";
import { fail, askRefresh } from "./common.js";

export async function renderModeBar(ctx, host, { redraw }) {
  const M = ctx.memory, idx = await M.store.getIndex(), S = idx.settings;
  const backend = M.backend(S);
  const setBackend = async (v) => {
    if (v === (S.backend ?? "auto")) return;
    try {
      await M.store.updateIndex((i) => { i.settings.backend = v; });
      ctx.toast("기억 저장소를 바꿨어요.");
    } catch (e) { fail(ctx)(e); }
    redraw();
    askRefresh(ctx);
  };
  const seg = segmented([["auto", "자동"], ["local", "플러그인"], ["bardwiki", "BardWiki"], ["off", "끔"]], S.backend ?? "auto", setBackend, "기억 저장소");
  const label = backend.id === "bardwiki" ? "BardWiki" : backend.id === "off" ? "꺼짐" : "플러그인";
  replace(host, h("section", { class: ["rb-card", "rb-mem-modebar"] },
    h("div", { class: "rb-mem-mbrow" }, h("span", { class: "ic" }, icon("brain", 20)), h("div", { class: "t" }, h("b", null, "기억 방식"), h("small", { class: "rb-muted" }, `지금: ${label} · ${backend.reason}`))),
    seg,
    backend.duplicate ? note("warn", "BardWiki와 기억이 중복돼요. 비용이 두 번 들 수 있어요.") : null));
}

// 기억 탭에 처음 들어왔을 때 딱 한 번: 리스바드(BardWiki)가 감지되면 저장소를 선택한다.
// 선택은 기억 탭 맨 위에서 언제든 바꿀 수 있다.
export async function maybeAskBardWiki(ctx) {
  const M = ctx.memory;
  if (!M || !hasBardWiki(ctx.api)) return false;
  const idx = await M.store.getIndex();
  if (idx.bardAsked) return false;
  await M.store.updateIndex((i) => { i.bardAsked = true; }).catch(() => {});
  if ((idx.settings.backend ?? "auto") !== "auto") return false;  // 이미 직접 고른 사람은 묻지 않는다
  const yes = await confirmDialog(ctx.win, {
    title: "리스바드가 감지됐어요",
    body: "장기기억을 어떤 방식으로 사용할까요?\n\nBardWiki: 리스바드가 관리하는 위키를 읽어요.\nDusk 자체 기억: Dusk가 별도로 기록·분석·주입해요. 두 방식은 동작과 비용이 달라요.\n\n선택은 저장되며 기억 탭 맨 위에서 나중에 바꿀 수 있어요.",
    ok: "Dusk 자체 기억", cancel: "BardWiki 사용"
  });
  const backend = yes ? "local" : "bardwiki";
  await M.store.updateIndex((i) => { i.settings.backend = backend; });
  ctx.toast(yes ? "Dusk 자체 기억을 선택했어요." : "BardWiki를 선택했어요.");
  askRefresh(ctx);
  return true;
}
