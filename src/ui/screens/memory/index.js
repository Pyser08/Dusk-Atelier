// 기억 탭 진입점. 상태는 ctx.state.mem 한 객체로만 관리한다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { stepsGuide } from "../../kit.js";
import { mem, fail } from "./common.js";
import { renderBotList } from "./botlist.js";
import { renderBotView } from "./botview.js";
import { renderGlobalSettings } from "./settings.js";

export async function renderMemory(ctx) {
  const m = mem(ctx);
  if (!ctx.memory) return replace(ctx.main, h("div", { class: "rb-empty" }, "장기 기억 기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  const listHost = h("div", { class: "rb-mem-col list" }), viewHost = h("div", { class: "rb-mem-col view" });
  const redraw = () => { m.chatCache = null; return renderMemory(ctx).catch(fail(ctx)); };
  // 화면 폭 판정은 JS가 아니라 CSS(컨테이너 폭)가 한다: 좁으면 한 번에 한 칸(data-view), 넓으면 두 칸.
  const showView = true, showList = true;
  replace(ctx.main, h("div", { class: "rb-mem-wrap" }, h("div", { class: "rb-mem-root", "data-view": m.view === "bot" && m.botId ? "bot" : "bots" }, listHost, viewHost)));
  const open = (id) => { m.botId = id; m.chatIndex = 0; m.tab = "people"; m.personKey = ""; m.view = "bot"; m.compose = null; redraw(); };
  if (showList) {
    const gHost = h("div"), bHost = h("div", { class: "rb-mem-botwrap" });
    replace(listHost, gHost, bHost);
    await Promise.all([renderGlobalSettings(ctx, gHost, { redraw }), renderBotList(ctx, bHost, { open, redraw })]);
  }
  if (showView) {
    // 탭·채팅 전환은 오른쪽 칸만 다시 그린다(목록·전역 설정은 건드리지 않는다).
    const drawView = (first) => m.botId
      ? renderBotView(ctx, viewHost, { redraw, redrawView: () => drawView(false).catch(fail(ctx)), back: () => { m.view = "bots"; redraw(); }, quiet: !first })
      : Promise.resolve(replace(viewHost, h("div", { class: "rb-empty rb-mem-empty" }, icon("brain", 28), h("div", { style: "font-weight:700;color:var(--rb-text);font-size:15px" }, "왼쪽에서 봇을 골라 주세요."), stepsGuide("처음이라면 이 순서로", ["왼쪽에서 기억을 보고 싶은 봇을 눌러요.", "인물별 기록이 자동으로 쌓여 있어요. 없다면 ‘이 채팅 일괄 분석’을 눌러요.", "마음에 드는 인물은 기억 카드로 만들어 새 봇으로 이어 가요."]))));
    await drawView(true);
  }
}
