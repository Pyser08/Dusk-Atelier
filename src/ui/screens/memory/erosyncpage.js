// 장기 기억 → Erosync 화면: 위에 상태·켜기, 아래에 탭(개요·수위·동작·분석·프롬프트·비하인드·데이터).
// 인물 값은 인물 위키의 NSFW 탭에서 보고 고친다.
import { pickLoreEntries } from "./erosyncpick.js";
import { h, replace } from "../../dom.js";
import { btn, pageHead, segmented } from "../../kit.js";
import { mem } from "./common.js";
import { erosyncSection } from "./erosyncui.js";
import { erosyncLevelCard } from "./erosynclevel.js";
import { erosyncGuardCard } from "./erosyncguard.js";
import { erosyncPresetCard } from "./erosyncpresetui.js";
import { erosyncUndoCard } from "./erosyncundoui.js";
import { erosyncReviewCard } from "./erosyncreviewui.js";
import { erosyncConfigCard } from "./erosyncconfig.js";
import { erosyncPromptsCard } from "./erosyncprompts.js";
import { erosyncBehindCard } from "./erosyncbehind.js";
import { analysisLine } from "./erosynceditor.js";
import { clearErosyncFlow } from "./memoryfileui.js";
import { scanOriginalErosync } from "../../../data/erosyncmigrate.js";

export const TABS = [["home", "개요"], ["safety", "수위"], ["act", "동작"], ["ana", "분석"], ["review", "검토"], ["prompt", "프롬프트"], ["behind", "비하인드"], ["data", "데이터"]];
export const scanLine = (s) => !s?.found ? "" : `원래 Erosync에서 쓰던 기록을 찾았어요 — 인물 프로필 ${s.profiles}개${s.canListSessions ? ` · 채팅 기록 ${s.sessions}개` : ""}${s.botSettings ? ` · 봇별 설정 ${s.botSettings}개` : ""}. 같은 저장 공간을 쓰니 따로 옮길 필요 없이 켜면 그대로 이어져요. 원래 플러그인은 끄고 쓰세요.`;
const p = (t, id) => h("p", { class: "rb-muted", style: "white-space:normal;margin:0", id }, t);

export async function renderMemoryErosync(ctx, host, { redraw }) {
  const m = mem(ctx), er = ctx.erosync;
  const back = { label: "장기 기억으로", onClick: () => { m.page = "home"; redraw(); } };
  await er?.loadGuard?.().catch(() => {});
  const scan = await scanOriginalErosync(ctx.api).catch(() => null);
  const tab = TABS.some(([k]) => k === m.eroTab) ? m.eroTab : "home";
  const live = !!(er?.on() && er?.isRunning());
  const paneHost = h("div", { class: "rb-ero-pane", style: "display:grid;gap:12px" });

  const analysisCard = () => {
    const line = analysisLine(ctx, () => {});
    const run = btn("전체 캐릭터 분석", { kind: "primary", id: "rb-erosync-analyze", disabled: !live, onClick: () => line.start("full", "") });
    const pick = btn("인물 골라서 분석", { id: "rb-erosync-analyze-pick", disabled: !live, onClick: async () => { const ids = await pickLoreEntries(ctx); if (ids?.length) line.start("lore", ids); } });
    line.watch();
    return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-analysis" }, h("h3", null, "인물 분석"),
      p("지금 열린 채팅의 인물을 AI로 분석해 성향 값을 만들어요. 전부 분석하면 AI 호출이 많이 들어가니, 필요한 인물만 골라서 분석할 수도 있어요. 이미 분석한 한 명만 다시 하려면 인물 위키의 NSFW 탭을 쓰세요."),
      live ? h("div", { class: "rb-mem-sact" }, run, pick) : p("Erosync를 켜면 분석할 수 있어요."), line.el);
  };
  const dataCard = () => {
    return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-data" }, h("h3", null, "데이터"),
      p("Erosync가 저장한 값(인물 프로필·채팅 기록·봇별 설정)은 장기 기억 파일에 함께 담겨요. Erosync를 꺼 두었어도 저장된 값은 같이 옮겨져요. 파일 내보내기·불러오기는 인물 위키의 ‘더보기’에 있어요."),
      scan?.found ? p(scanLine(scan), "rb-erosync-found") : p("원래 Erosync 플러그인에서 쓰던 기록은 찾지 못했어요.", "rb-erosync-found"),
      h("div", { class: "rb-mem-sact" }, btn("Erosync 값 지우기", { id: "rb-erosync-clear", onClick: () => clearErosyncFlow(ctx, redraw) })));
  };
  const homeExtra = () => h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-guide" }, h("h3", null, "어디서 봐요?"),
    h("ul", { class: "rb-muted", style: "white-space:normal;padding-left:18px;margin:0" },
      h("li", null, "인물 위키 → NSFW 탭: 성적 항목·직접 고치기·다시 분석"),
      h("li", null, "인물 위키 → 요약·관계·상세 정보: 노리는 목표, 경쟁, 8가지 성향"),
      h("li", null, "인물 관계도 → ‘Erosync 목표·경쟁만 보기’: 목표 화살표와 경쟁선")));
  const panes = {
    home: () => [homeExtra()],
    safety: () => [erosyncLevelCard(ctx), typeof er?.setGuard === "function" ? erosyncGuardCard(ctx) : null, typeof er?.presets === "function" ? erosyncPresetCard(ctx, redraw) : null],
    act: () => [erosyncConfigCard(ctx, "act"), typeof er?.undoScene === "function" ? erosyncUndoCard(ctx) : null],
    ana: () => [analysisCard(), erosyncConfigCard(ctx, "ana")],
    review: () => [typeof er?.review === "function" ? erosyncReviewCard(ctx) : null],
    prompt: () => [erosyncPromptsCard(ctx)],
    behind: () => [erosyncBehindCard(ctx)],
    data: () => [dataCard()]
  };
  const show = (k) => { m.eroTab = k; replace(paneHost, ...(panes[k]?.() ?? []).filter(Boolean)); };
  const seg = segmented(TABS, tab, show, "Erosync 항목");
  seg.style.minWidth = "520px";   // 좁은 화면에서는 줄이 옆으로 밀리고 글자는 한 줄로 유지
  const tabs = h("div", { style: "overflow-x:auto;padding-bottom:2px", id: "rb-erosync-tabs" }, seg);
  const hero = erosyncSection(ctx, () => {});
  replace(host, h("div", { class: "rb-me rb-ero-page", style: "display:grid;gap:12px" },
    pageHead("NSFW 설정", { back }),
    scan?.found && tab === "home" ? p(scanLine(scan), "rb-erosync-found-top") : null,
    hero, tabs, paneHost));
  show(tab);
}
