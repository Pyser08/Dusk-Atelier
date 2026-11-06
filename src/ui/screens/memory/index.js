// 기억 탭 진입점 (1.7.0 3단계). 화면은 셋: home(기억) · detail(기록 보기) · bots(봇별 기억). 상태는 ctx.state.mem.page.
import { h, replace } from "../../dom.js";
import { mem, fail } from "./common.js";
import { renderMemoryHome } from "./mhome.js";
import { renderMemoryDetail } from "./mdetail.js";
import { renderMemoryBots } from "./mbots.js";
import { maybeAskHypa } from "./hypamodal.js";
import { renderMemorySkills } from "./skills.js";
import { renderMemoryMe } from "./mepage.js";
import { renderMemoryErosync } from "./erosyncpage.js";
import { renderMemoryPot } from "./potpage.js";

const PAGES = { home: renderMemoryHome, detail: renderMemoryDetail, bots: renderMemoryBots, skills: renderMemorySkills, me: renderMemoryMe, erosync: renderMemoryErosync, pot: renderMemoryPot };

export async function renderMemory(ctx) {
  const m = mem(ctx);
  if (!ctx.memory) return replace(ctx.main, h("div", { class: "rb-empty" }, "기억 기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  const page = PAGES[m.page] ? m.page : "home";
  const host = h("div", { class: "rb-mem2 rb-scroll", "data-page": page });
  replace(ctx.main, host);
  const redraw = () => renderMemory(ctx).catch(fail(ctx));
  // 기능 맛보기: 가 본 장기 기억 페이지 기록(app.js noteVisit과 같은 칸)
  try { const key = `memory:${page}`, have = ctx.prefs.ui?.visited ?? []; if (ctx.prefs.ui && !have.includes(key)) { ctx.prefs.ui.visited = [...have, key].slice(-60); ctx.prefs.saveUi({ visited: ctx.prefs.ui.visited }).catch(() => {}); } } catch { /* 기록 없이 */ }
  try { await PAGES[page](ctx, host, { redraw }); } catch (e) { fail(ctx)(e); }
  maybeAskHypa(ctx).catch(() => {});  // 처음 들어갔을 때 HypaPlus가 있으면 안내(화면을 막지 않는다)
}
