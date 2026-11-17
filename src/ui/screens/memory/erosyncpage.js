// 장기 기억 → NSFW 설정(Erosync) 화면: 위에 상태·켜기, 아래에 탭 3개(2.2.0: 개요 · 장면·수위 · 분석·관리).
// 인물 값은 인물 위키의 NSFW 탭에서 보고 고친다.
import { pickLoreEntries } from "./erosyncpick.js";
import { chatPeopleList, seedAllChatPeople } from "../../../data/erosyncseedall.js";
import { h, replace } from "../../dom.js";
import { btn, pageHead, segmented, confirmDialog } from "../../kit.js";
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
import { erosyncTurnCard } from "./erosyncturnui.js";
import { clearErosyncFlow } from "./memoryfileui.js";
import { scanOriginalErosync } from "../../../data/erosyncmigrate.js";
import { flowSections } from "./flowsettings.js";

// 2.2.0: 수위·동작·비하인드 → ‘장면·수위’, 분석·검토·프롬프트·데이터 → ‘분석·관리’(예전 탭 값은 새 탭으로 이어 줌)
export const TABS = [["home", "개요"], ["scene", "장면·수위"], ["manage", "분석·관리"]];
const OLD_TAB = { safety: "scene", act: "scene", behind: "scene", ana: "manage", review: "manage", prompt: "manage", data: "manage" };
export const scanLine = (s) => !s?.found ? "" : `원래 Erosync에서 쓰던 기록을 찾았어요 — 인물 프로필 ${s.profiles}개${s.canListSessions ? ` · 채팅 기록 ${s.sessions}개` : ""}${s.botSettings ? ` · 봇별 설정 ${s.botSettings}개` : ""}. 같은 저장 공간을 쓰니 따로 옮길 필요 없이 켜면 그대로 이어져요. 원래 플러그인은 끄고 쓰세요.`;
// addon-rebuild: 전체 분석은 시작 전에 규모(자료·찾기 호출 수)를 보여 주고 확인받는다. 규모를 못 읽어도 확인은 받는다.
export const fullEstimateText = (e) => e?.ok
  ? `자료 ${e.documents}개(약 ${Math.round(e.chars / 1000)}천 자)를 처음부터 훑어 인물을 찾아요. 인물 찾기만 약 ${e.batches}번, 찾은 인물마다 점수·프로필 호출이 더 들어가요(인물이 많으면 수백 번). 대화에 나온 인물만 필요하면 끄고 두세요 — 매 턴 계산이 처음 보는 인물을 한 명씩 만들어요.`
  : "자료 전체를 처음부터 훑어 인물을 찾아요. 자료가 길면 AI 호출이 수백 번 들어갈 수 있어요.";
async function confirmFull(ctx) {
  const e = await ctx.erosync?.profile?.("estimate").catch(() => null);
  return confirmDialog(ctx.win, { title: "전체 인물로 만들까요?", body: fullEstimateText(e), ok: "시작" });
}
const p = (t, id) => h("p", { class: "rb-muted", style: "white-space:normal;margin:0", id }, t);

export async function renderMemoryErosync(ctx, host, { redraw }) {
  const m = mem(ctx), er = ctx.erosync;
  const back = { label: "장기 기억으로", onClick: () => { m.page = "home"; redraw(); } };
  await er?.loadGuard?.().catch(() => {});
  const scan = await scanOriginalErosync(ctx.api).catch(() => null);
  if (OLD_TAB[m.eroTab]) m.eroTab = OLD_TAB[m.eroTab];
  const tab = TABS.some(([k]) => k === m.eroTab) ? m.eroTab : "home";
  const live = !!(er?.on() && er?.isRunning());
  const paneHost = h("div", { class: "rb-ero-pane", style: "display:grid;gap:12px" });

  const analysisCard = () => {
    const line = analysisLine(ctx, () => {});
    const run = btn("전체 인물로 만들기", { kind: "primary", id: "rb-erosync-analyze", disabled: !live, onClick: () => confirmFull(ctx).then((ok) => { if (ok) line.start("full", ""); }) });
    // addon-rebuild: 대화에 나와 장기기억에 있는 인물 중 Erosync 값이 없는 인물만 한 명씩(전체 인물 찾기는 안 함)
    const chatStatus = h("p", { class: "rb-muted", style: "white-space:normal;margin:0", id: "rb-erosync-chat-status", role: "status" });
    const chat = btn("대화 속 인물로 만들기", { id: "rb-erosync-analyze-chat", disabled: !live, onClick: async () => {
      const list = await chatPeopleList(ctx).catch(() => []);
      if (!list.length) { chatStatus.textContent = "이 채팅 장기기억의 인물은 모두 Erosync 값이 있어요."; return; }
      if (!(await confirmDialog(ctx.win, { title: `${list.length}명 출발값을 만들까요?`, body: `${list.map((p) => p.name).join(", ")} — 한 명씩 분석해요(인물당 AI 호출 3~4번). 카드·로어북에 없는 인물은 장기기억 기록으로 분석해요.`, ok: "만들기" }))) return;
      chat.disabled = true;
      const res = await seedAllChatPeople(ctx, { list, onProgress: ({ index, total, name }) => { chatStatus.textContent = `${index + 1} / ${total} · ${name} 만드는 중…`; } });
      chat.disabled = false;
      const bad = res.filter((r) => !r.ok);
      chatStatus.textContent = `${res.length - bad.length}명 만들었어요${bad.length ? ` · 실패 ${bad.map((r) => r.name).join(", ")}` : ""}. 인물 위키 NSFW 탭에서 볼 수 있어요.`;
    } });
    const pick = btn("인물 골라서 만들기", { id: "rb-erosync-analyze-pick", disabled: !live, onClick: async () => { const ids = await pickLoreEntries(ctx); if (ids?.length) line.start("lore", ids); } });
    line.watch();
    return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-analysis" }, h("h3", null, "출발값 만들기"),
      p("대화에 처음 나온 인물은 ‘매 턴 계산’이 그 인물만 출발값을 만들어요(‘출발값 자동으로 만들기’). 빠진 인물은 ‘대화 속 인물로 만들기’로 한 번에 만들 수 있고, 로어북·캐릭터 카드로 직접 만들 수도 있어요. ‘전체’는 자료 전체를 훑어 AI 호출이 많이 들어가니(시작 전에 규모를 보여 줘요), 필요한 인물만 골라서 만드는 걸 권해요. 한 명만 다시 하려면 인물 위키의 NSFW 탭을 쓰세요."),
      live ? h("div", { class: "rb-mem-sact" }, chat, run, pick) : p("Erosync를 켜면 분석할 수 있어요."), live ? chatStatus : null, line.el);
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
    // 장면·수위(사용자 순서): 수위(+집착 방지) → 성인 항목(인물 위키 설정에서 옮김) → 동작 → 비하인드 → 장면 되돌리기 → 프리셋
    scene: () => {
      const adult = h("div", { id: "rb-erosync-adult", style: "display:contents" });
      if (ctx.memory?.flow) flowSections(ctx, adult, { redraw, part: "adult" }).catch(() => {});
      return [erosyncLevelCard(ctx), typeof er?.setGuard === "function" ? erosyncGuardCard(ctx) : null, adult,
        erosyncConfigCard(ctx, "act"), typeof er?.behind === "function" ? erosyncBehindCard(ctx) : null,
        typeof er?.undoScene === "function" ? erosyncUndoCard(ctx) : null, typeof er?.presets === "function" ? erosyncPresetCard(ctx, redraw) : null];
    },
    // 분석·관리: 매 턴 계산 → 출발값 만들기(분석 설정) → 결과 검토 → 프롬프트 → 저장된 값
    manage: () => [erosyncTurnCard(ctx), analysisCard(), erosyncConfigCard(ctx, "ana"), typeof er?.review === "function" ? erosyncReviewCard(ctx) : null, erosyncPromptsCard(ctx), dataCard()]
  };
  const show = (k) => { m.eroTab = k; replace(paneHost, ...(panes[k]?.() ?? []).filter(Boolean)); };
  const seg = segmented(TABS, tab, show, "Erosync 항목");
  const tabs = h("div", { style: "overflow-x:auto;padding-bottom:2px", id: "rb-erosync-tabs" }, seg);
  const hero = erosyncSection(ctx, () => {});
  replace(host, h("div", { class: "rb-me rb-ero-page", style: "display:grid;gap:12px" },
    pageHead("NSFW 설정", { back }),
    scan?.found && tab === "home" ? p(scanLine(scan), "rb-erosync-found-top") : null,
    hero, tabs, paneHost));
  show(tab);
}
