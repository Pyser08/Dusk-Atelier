// 기억 탭 맨 위: 장기기억 방식(저장소). 고급 모드에서만 보인다 (v1.7.0).
// 간단 모드에서는 화면을 숨기고 저장소를 '자동'으로 맞춘다. 리수폿 기능 스위치는 리수폿 탭으로 옮겨서 여기서 뺐다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { segmented, note, confirmDialog } from "../../kit.js";
import { hasBardWiki } from "../../../data/memorybackend.js";
import { fail, askRefresh } from "./common.js";

export async function renderModeBar(ctx, host, { redraw }) {
  const M = ctx.memory, idx = await M.store.getIndex(), S = idx.settings;
  // 간단 모드: 저장소는 늘 자동. 예전에 직접 골라 둔 값이 있으면 자동으로 되돌린다(훅은 다음에 불러올 때 반영).
  if (!ctx.prefs.advanced) {
    replace(host);
    if ((S.backend ?? "auto") !== "auto") await M.store.updateIndex((i) => { i.settings.backend = "auto"; }).catch(() => {});
    return;
  }
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

// 처음 설치했을 때 딱 한 번: 리스바드(BardWiki)가 감지되면 플러그인 기억으로 바꿀지 묻는다.
// 어느 쪽을 골라도 다시 묻지 않는다(바꾸고 싶으면 고급 모드의 '장기기억 방식').
export async function maybeAskBardWiki(ctx) {
  const M = ctx.memory;
  if (!M || !hasBardWiki(ctx.api)) return false;
  const idx = await M.store.getIndex();
  if (idx.bardAsked) return false;
  await M.store.updateIndex((i) => { i.bardAsked = true; }).catch(() => {});
  if ((idx.settings.backend ?? "auto") !== "auto") return false;  // 이미 직접 고른 사람은 묻지 않는다
  const yes = await confirmDialog(ctx.win, {
    title: "리스바드가 감지됐어요",
    body: "지금은 리스바드의 기억(BardWiki)을 읽어 써요.\nDusk Atelier의 기억으로 바꿀까요?\n\n바꾸면 응답마다 Dusk가 직접 기억을 쌓고 넣어 줘요. 나중에 고급 모드에서 다시 바꿀 수 있어요.",
    ok: "플러그인으로 바꾸기", cancel: "그대로 두기"
  });
  if (!yes) return false;
  await M.store.updateIndex((i) => { i.settings.backend = "local"; });
  ctx.toast("기억을 플러그인으로 바꿨어요.");
  askRefresh(ctx);
  return true;
}
