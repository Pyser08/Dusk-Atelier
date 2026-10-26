// 기억 탭 진입점. 상태는 ctx.state.mem 한 객체로만 관리한다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { mem, fail } from "./common.js";
import { renderBotList } from "./botlist.js";
import { renderBotView } from "./botview.js";

export async function renderMemory(ctx) {
  const m = mem(ctx);
  if (!ctx.memory) return replace(ctx.main, h("div", { class: "rb-empty" }, "장기 기억 기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  const listHost = h("div", { class: "rb-mem-col list" }), viewHost = h("div", { class: "rb-mem-col view" });
  const redraw = () => renderMemory(ctx).catch(fail(ctx));
  // 화면 폭 판정은 JS가 아니라 CSS(컨테이너 폭)가 한다: 좁으면 한 번에 한 칸(data-view), 넓으면 두 칸.
  const showView = true, showList = true;
  replace(ctx.main, h("div", { class: "rb-mem-wrap" }, h("div", { class: "rb-mem-root", "data-view": m.view === "bot" && m.botId ? "bot" : "bots" }, listHost, viewHost)));
  const open = (id) => { m.botId = id; m.chatIndex = 0; m.tab = "people"; m.personKey = ""; m.view = "bot"; m.compose = null; redraw(); };
  if (showList) await renderBotList(ctx, listHost, { open, redraw });
  if (showView) {
    if (m.botId) await renderBotView(ctx, viewHost, { redraw, back: () => { m.view = "bots"; redraw(); } });
    else replace(viewHost, h("div", { class: "rb-empty" }, icon("search", 22), h("div", null, "왼쪽에서 봇을 골라 주세요.")));
  }
}
