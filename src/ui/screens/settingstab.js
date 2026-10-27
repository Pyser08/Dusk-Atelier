// 설정 탭: 흩어져 있던 설정을 한곳에. (도구와 개발 탭 사이)
import { h, replace } from '../dom.js';
import { guidePanel, note, segmented } from '../kit.js';
import { icon } from '../icons.js';
import { openTour } from '../tour.js';
import { LORE_DEFAULTS, loadLoreSettings, saveLoreSettings } from '../../data/lorerules.js';
import { devToggleCard } from './devtools.js';
import { renderCleanup, tile, fullBackup, fullRestore } from './tools.js';
import { renderSettings } from './settings.js';
import { renderUpdateSettings } from './updsettings.js';
import { renderThemeStudio, targetToggle } from './themestudio.js';
import { renderThemeBuilder } from './themebuilder.js';
import { loadThemes, saveThemes, detectTarget, TARGETS } from '../../data/themes.js';

export async function renderSettingsTab(ctx) {
  if (ctx.state.sub === "theme") return renderSettings(ctx);
  if (ctx.state.sub === "updset") return renderUpdateSettings(ctx);
  if (ctx.state.sub === "cleanup") return renderCleanup(ctx);
  if (ctx.state.sub === "themestudio") return renderThemeStudio(ctx);
  if (ctx.state.sub === "themebuilder") return renderThemeBuilder(ctx);
  const themes = await loadThemes(ctx.api);
  const rootDoc = await ctx.api.getRootDocument?.().catch(() => null) ?? null;
  const here = await detectTarget(rootDoc, ctx.api);
  const tTarget = themes.target ?? here;
  const tInfo = h("div", { class: "rb-muted", style: "font-size:12.5px;line-height:1.7;word-break:keep-all" });
  const paintInfo = (v) => {
    const n = themes.themes[v].length, on = themes.themes[v].find((x) => x.id === themes.active[v]);
    tInfo.textContent = `${TARGETS[v].label} 테마 ${n}개${on ? ` · 켜짐: ${on.name}` : ""}${v !== here ? ` · 지금 화면은 ${TARGETS[here].label} 계열이라 여기서 켜면 모양이 깨질 수 있어요` : ""}`;
    tInfo.animate?.([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 220 });
  };
  paintInfo(tTarget);
  const tToggle = targetToggle(tTarget, async (v) => {
    themes.target = v;
    paintInfo(v);
    await saveThemes(ctx.api, themes).catch(() => {
    });
  });
  const lore = await loadLoreSettings(ctx.api).catch(() => ({ ...LORE_DEFAULTS }));
  const saved = h("span", { class: "rb-muted", style: "font-size:12.5px" });
  const setLore = async (patch) => {
    Object.assign(lore, patch);
    try {
      await saveLoreSettings(ctx.api, lore);
      ctx.loreRuntime?.setSettings?.(lore);
      ctx.loreLog?.setSettings?.(lore);
      saved.textContent = "저장했어요";
      setTimeout(() => saved.textContent = "", 1500);
    } catch (e) {
      ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  };
  const section = (ic, title, desc, ...kids) => h(
    "div",
    { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:12px;margin-bottom:14px" },
    h("div", { style: "display:flex;gap:12px;align-items:center" }, h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(ic, 20)), h("div", { style: "flex:1;min-width:0" }, h("b", { style: "font-size:15px" }, title), h("div", { class: "rb-muted", style: "font-size:13px;margin-top:2px;word-break:keep-all" }, desc))),
    ...kids
  );
  const rerollSeg = segmented([["new", "새로 굴리기"], ["keep", "이전 결과 유지"]], lore.reroll === "keep" ? "keep" : "new", (v) => setLore({ reroll: v }), "리롤 때 확률");
  const logSeg = segmented([["on", "켜기"], ["off", "끄기"]], lore.log === false ? "off" : "on", (v) => setLore({ log: v === "on" }), "로어북 로그");
  const btnSeg = segmented([["on", "보이기"], ["off", "숨기기"]], lore.button === false ? "off" : "on", (v) => setLore({ button: v === "on" }), "응답 아래 로어북 버튼");
  const bdSeg = segmented([["off", "끄기"], ["short", "짧은 이름만"], ["all", "모든 키"]], ["off", "all"].includes(lore.boundary) ? lore.boundary : "short", (v) => setLore({ boundary: v }), "이름 경계 기본값");
  const row = (label, seg) => h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" }, h("b", { style: "font-size:13.5px;min-width:120px" }, label), h("div", { style: "flex:1;min-width:240px" }, seg));
  const content = h(
    "div",
    { class: "rb-section", style: "flex:1;min-width:0;max-width:880px" },
    section(
      "palette",
      "화면 꾸미기",
      "색 · 메뉴 위치 · 줄 간격 · 글자 크기 · 고대비를 눌러서 고르고, 바로 바뀌어요.",
      h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px" }, tile("palette", "화면 꾸미기 열기", "색 프리셋 한 번 클릭, 홈 카드/왼쪽/위쪽 메뉴, 큰 글자, 고대비", () => ctx.go("settings", "theme"), "rb-set-theme"))
    ),
    section(
      "zap",
      "로어북",
      "로어북 규칙과 로어북 로그 설정이에요.",
      h("div", { style: "display:flex;flex-direction:column;gap:8px" }, h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" }, h("b", { style: "font-size:13.5px;min-width:120px" }, "다시 생성(리롤) 때"), h("div", { style: "flex:1;min-width:240px" }, rerollSeg), saved), h(
        "div",
        { class: "rb-muted", style: "font-size:12.5px;line-height:1.7;word-break:keep-all" },
        h("div", null, "· 새로 굴리기: 응답이 끝나면 같은 턴을 미리 다시 계산해 두어, 리롤할 때마다 확률·연쇄가 새로 정해져요."),
        h("div", null, "· 이전 결과 유지: 리롤해도 입력할 때 정한 항목이 그대로 들어가요. 확률이 없는 규칙은 어느 쪽이든 같아요.")
      )),
      row("이름 경계", bdSeg),
      h("div", { class: "rb-muted", style: "font-size:12.5px;line-height:1.7;word-break:keep-all" }, "키가 다른 낱말 속에 끼어 잘못 켜지는 걸 막아요. 예) '얀'이 '하얀'에, '시하'가 '지시하는'에 걸리지 않고 '얀이·얀에게·시하였다'에는 걸려요. 짧은 이름만: 한글 1~2글자 키에만 자동 적용(추천). 모든 키: 영문 포함 전부. Dusk 규칙이 켜진 로어북에 적용돼요. 항목별 '이름 경계' 스위치는 그대로 쓸 수 있어요."),
      row("로어북 로그", logSeg),
      row("응답 아래 버튼", btnSeg),
      h("div", { class: "rb-muted", style: "font-size:12.5px;line-height:1.7;word-break:keep-all" }, "응답마다 들어간 로어북(Dusk 규칙이 없는 봇도)을 남겨요. 도구 → 로어북 로그에서 보고, AI 응답 아래 [📖 로어북] 버튼으로도 바로 봐요. 채팅 내용은 바꾸지 않아요.")
    ),
    section(
      "palette",
      "테마 대상",
      "테마 스튜디오에서 만들 계열을 골라요. 두 계열은 구조가 달라 테마가 서로 호환되지 않아요.",
      h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" }, tToggle, h("div", { style: "flex:1;min-width:200px" }, tInfo)),
      h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px" }, tile("palette", "테마 빌더", "스타일과 색만 고르면 완성. 지식 없이도 예쁜 채팅 테마", () => ctx.go("settings", "themebuilder"), "rb-set-themebuilder"), tile("brush", "테마 스튜디오", "색·글꼴·말풍선 편집, 실시간 미리보기, CSS·채팅 HTML, 내보내기·가져오기", () => ctx.go("settings", "themestudio"), "rb-set-themestudio"))
    ),
    section(
      "history",
      "기록 · 백업",
      "업데이트·편집·삭제 전 상태를 되돌리거나, 모듈과 설정을 통째로 백업·복원해요.",
      h(
        "div",
        { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px" },
        tile("history", "기록 · 되돌리기", `업데이트·편집·삭제 전 상태 보기와 되돌리기 (채팅은 그대로)${ctx.state.histCount ? ` · ${ctx.state.histCount}개` : ""}`, () => ctx.go("settings", "history"), "rb-set-backups"),
        tile("download", "전체 백업", "모든 모듈(꺼진 것 포함)·에셋·프리셋·폴더·색 설정을 zip 한 파일로", () => fullBackup(ctx), "rb-set-fullbackup"),
        tile("upload", "전체 복원", "전체 백업 zip에서 모듈과 설정을 되살리기", () => fullRestore(ctx), "rb-set-restore")
      )
    ),
    h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-bottom:14px" },
      tile("help", "처음 둘러보기", "Dusk Atelier 사용법을 다섯 장으로 다시 봐요", () => openTour(ctx), "rb-set-tour"),
      tile("refresh", "업데이트 설정", "새로 가져온 봇 자동 감지, 받은 사본 정리, 채팅 백업", () => ctx.go("settings", "updset"), "rb-set-updset"),
      tile("trash", "설정 정리", "이 플러그인이 저장한 순서·폴더·프리셋·연결 정보를 골라서 지우기", () => ctx.go("settings", "cleanup"), "rb-set-cleanup")
    ),
    devToggleCard(ctx, () => {
      ctx.refreshTabs();
      renderSettingsTab(ctx);
    })
  );
  const guide = guidePanel("이럴 땐 여기로", "하고 싶은 일을 누르면 해당 화면으로 가요.", [
    { label: "색·글자 크기를 바꾸고 싶어요", text: "화면 꾸미기", onClick: () => ctx.go("settings", "theme") },
    { label: "모듈이 꼬였어요, 되돌리고 싶어요", text: "기록 · 되돌리기", onClick: () => ctx.go("settings", "history") },
    { label: "다른 기기로 옮기고 싶어요", text: "전체 백업·복원", onClick: () => fullBackup(ctx) },
    { label: "새 봇을 알아서 잡아 주면 좋겠어요", text: "업데이트 설정", onClick: () => ctx.go("settings", "updset") },
    { label: "쌓인 설정을 정리하고 싶어요", text: "설정 정리", onClick: () => ctx.go("settings", "cleanup") },
    { label: "내 채팅 테마를 만들고 싶어요", text: "테마 빌더", onClick: () => ctx.go("settings", "themebuilder") }
  ]);
  replace(ctx.main, h("div", { class: "rb-scroll rb-twocol" }, content, guide));
}
