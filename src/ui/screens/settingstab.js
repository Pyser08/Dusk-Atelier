// 설정 탭 (v1.7.0 7단계, 계획 §3.13): 화면(모드·메뉴 위치·플러그인 꾸미기) → (고급) 개발자 → 백업 → 둘러보기·새로 바뀐 점.
// 세부는 고급 모드에서만: 주사위·로어북·기억 버튼·테마 대상·기록·설정 정리·업데이트 설정·정보.
import { renderPrompts } from './promptstab.js';
import { h, replace } from '../dom.js';
import { advFold, guidePanel, pageHead, segmented } from '../kit.js';
import { icon } from '../icons.js';
import { openTour } from '../tour.js';
import { CHANGELOG, openChangelog } from '../whatsnew.js';
import { LORE_DEFAULTS, loadLoreSettings, saveLoreSettings } from '../../data/lorerules.js';
import { devToggleCard } from './devtools.js';
import { renderCleanup, tile, fullBackup, fullRestore } from './tools.js';
import { renderSettings } from './settings.js';
import { renderUpdateSettings } from './updsettings.js';
import { openAbout } from './about.js';
import { loadMemoryButtonOn } from '../../data/memorybutton.js';
import { loadDiceMode, DICE_MODE_KEY } from '../../data/fairplay.js';

export async function renderSettingsTab(ctx) {
  if (ctx.state.sub === "prompts") return renderPrompts(ctx);
  if (ctx.state.sub === "theme") return renderSettings(ctx);
  if (ctx.state.sub === "updset") return renderUpdateSettings(ctx);
  if (ctx.state.sub === "cleanup") return renderCleanup(ctx);
  const adv = ctx.prefs.advanced;
  const fail = (e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });

  const diceModePromise = loadDiceMode(ctx.api).catch(() => "reinterpret");

  // ── 줄 만들기 ──
  const segRow = (title, text, seg, cls = "") => h("div", { class: ["rb-srow has-seg", cls] }, h("span", { class: "t" }, title, text ? h("small", null, text) : null), seg);
  const linkRow = (title, text, onClick, id) => h("button", { type: "button", class: "rb-srow", onClick, id }, h("span", { class: "t" }, title, text ? h("small", null, text) : null), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
  const card = (title, ...rows) => h("section", { class: "rb-card bordered rb-scard" }, title ? h("span", { class: "h" }, title) : null, ...rows);

  const layoutSeg = segmented([["left", "◧ 왼쪽"], ["top", "⬒ 위쪽"]], ctx.prefs.ui?.theme?.layout === "top" ? "top" : "left", (v) => ctx.setLayout(v), "메뉴 위치");
  const main = h(
    "div",
    { class: "rb-mem2-main" },
    pageHead("설정", { sub: "바꾸면 바로 적용되고 자동으로 저장돼요." }),
    card(
      "화면",
      segRow("화면 모드", "고급을 켜면 각 화면에 세부 설정이 더 보여요.", segmented([["simple", "간단"], ["advanced", "고급"]], ctx.prefs.uiMode, (v) => ctx.setUiMode(v), "화면 모드")),
      segRow("메뉴 위치", "PC에서 메뉴를 왼쪽 또는 위쪽에 둬요.", layoutSeg, "rb-pc-only"),
      linkRow("플러그인 꾸미기", "색·밝기·글자 크기", () => ctx.go("look"), "rb-set-look")
    ),
    adv ? devToggleCard(ctx, () => {
      ctx.refreshTabs();
      renderSettingsTab(ctx);
    }) : null,
    card(null, linkRow("백업 만들기", "모듈·에셋·설정을 zip 한 파일로", () => fullBackup(ctx), "rb-set-fullbackup"), linkRow("백업에서 복원", "전체 백업 zip으로 되살리기", () => fullRestore(ctx), "rb-set-restore")),
    card(null, linkRow("처음 둘러보기", null, () => openTour(ctx), "rb-set-tour"), linkRow(`v${ctx.version} 새로 바뀐 점`, null, () => openChangelog(ctx, CHANGELOG.slice(0, 4), "변경 기록"), "rb-set-whatsnew"))
  );

  // 기본 설정은 먼저 보여 주고, 고급 설정 데이터는 뒤에서 불러와요.
  const shell = h("div", { class: "rb-scroll rb-mem2", "data-page": "settings" },
    h("div", { class: ["rb-mem2-grid", adv && "has-adv"] },
      main,
      adv ? h("div", { class: "rb-mem2-side" }, h("div", { class: "rb-card bordered" }, h("span", { class: "h" }, "고급 설정"), h("span", { class: "rb-muted" }, "불러오는 중…"))) : null
    )
  );
  const advSide = shell.querySelector(".rb-mem2-side");
  replace(ctx.main, shell);

  const diceMode = await diceModePromise;
  const diceModeSeg = segmented([["reinterpret", "재해석"], ["respect", "존중"]], diceMode, async (v) => {
    try { if (ctx.fairPlay) await ctx.fairPlay.setDiceMode(v); else await ctx.api.pluginStorage.setItem(DICE_MODE_KEY, v); ctx.toast(v === "respect" ? "내가 적은 결과를 그대로 따를게요." : "내가 적은 결과도 시도로 보고 주사위로 가릴게요."); } catch (e) { fail(e); }
  }, "내가 결과까지 적었을 때");

  // ── 고급 영역 ──
  let advBlocks = [true];
  if (adv) {
    const [memBtnOn, lore] = await Promise.all([
      loadMemoryButtonOn(ctx.api),
      loadLoreSettings(ctx.api).catch(() => ({ ...LORE_DEFAULTS }))
    ]);
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
        fail(e);
      }
    };
    const rerollSeg = segmented([["new", "새로 굴리기"], ["keep", "이전 결과 유지"]], lore.reroll === "keep" ? "keep" : "new", (v) => setLore({ reroll: v }), "리롤 때 확률");
    const logSeg = segmented([["on", "켜기"], ["off", "끄기"]], lore.log === false ? "off" : "on", (v) => setLore({ log: v === "on" }), "로어북 로그");
    const btnSeg = segmented([["on", "보이기"], ["off", "숨기기"]], lore.button === false ? "off" : "on", (v) => setLore({ button: v === "on" }), "응답 아래 로어북 버튼");
    const bdSeg = segmented([["off", "끄기"], ["short", "짧은 이름만"], ["all", "모든 키"]], ["off", "all"].includes(lore.boundary) ? lore.boundary : "short", (v) => setLore({ boundary: v }), "이름 경계 기본값");
    const memBtnSeg = segmented([["on", "보이기"], ["off", "숨기기"]], memBtnOn ? "on" : "off", async (v) => {
      const ok = await ctx.memoryButton?.set(v === "on");
      ctx.toast(ok === false ? "저장했어요. 이 화면에선 바로 안 바뀌어서 리스를 새로 고치면 적용돼요." : v === "on" ? "채팅 메뉴에 기억 버튼을 보여요" : "채팅 메뉴의 기억 버튼을 숨겼어요");
    }, "채팅 메뉴 기억 버튼");
    const note = (...kids) => h("p", { class: "rb-adv-note" }, ...kids);
    const sec = (title, ...kids) => h("section", { class: "rb-lfield", style: "gap:10px" }, h("b", null, title), ...kids);
    const lab = (t, seg) => h("div", { style: "display:flex;flex-direction:column;gap:6px" }, h("span", { style: "font-size:13px;font-weight:600" }, t), seg);
    const tiles = h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px" },
      tile("history", "기록 · 되돌리기", `업데이트·편집·삭제 전 상태 보기와 되돌리기${ctx.state.histCount ? ` · ${ctx.state.histCount}개` : ""}`, () => ctx.go("settings", "history"), "rb-set-backups"),
      tile("refresh", "업데이트 설정", "새로 가져온 봇 자동 감지, 받은 사본 정리, 채팅 백업", () => ctx.go("settings", "updset"), "rb-set-updset"),
      tile("trash", "설정 정리", "저장한 순서·폴더·프리셋·연결 정보를 골라서 지우기", () => ctx.go("settings", "cleanup"), "rb-set-cleanup"),
      tile("info", "정보 · 라이선스", "버전, 라이선스(AGPL-3.0), 소스 위치", () => openAbout(ctx), "rb-set-about")
    );
    advBlocks = [
      sec("이야기 도우미 세부", lab("내가 결과까지 적었을 때", diceModeSeg), note("· 유저 편향 없애기: 요청마다 프로그램이 1~100 값을 3개 굴려 함께 보내고, 결과가 불확실한 행동은 AI가 난이도를 정해 그 값으로 성패를 가려요. 공정한 전개가 켜져 있을 때만 작동해요."), note("· 재해석: 내가 ‘쓰러뜨렸다’처럼 결과까지 적어도 시도로 보고 주사위로 가려요. 존중: 내가 적은 결과는 그대로 따라요."), note("· 공정한 전개는 요청마다 짧은 지침을 함께 보내요. 지침이 늘어난 만큼 요청이 조금 길어져요."), note("· 이야기 시간: 응답 첫 줄 ‘[2026-10-28 15:30 | 교실]’ 같은 상태 줄을 읽어 이어 가요. 실제 현재 시각이 아니라 이야기 속 시각이에요.")),
      sec("로어북", lab("다시 생성(리롤) 때", rerollSeg), lab("이름 경계", bdSeg), lab("로어북 로그", logSeg), lab("응답 아래 버튼", btnSeg), saved, note("· 이름 경계: 키가 다른 낱말 속에 끼어 잘못 켜지는 걸 막아요. 짧은 이름만: 한글 1~2글자 키에만 자동 적용(추천). 모든 키: 영문 포함 전부."), note("· 로어북 로그: 응답마다 들어간 로어북을 남겨요. 도구 → 로어북 로그와 응답 아래 [📖 로어북] 버튼에서 봐요.")),
      sec("채팅 메뉴", lab("기억 버튼", memBtnSeg), note("채팅 입력 옆 메뉴의 [기억] 버튼을 보이거나 숨겨요. 기억 기능 자체는 그대로예요.")),
      sec("정리 · 기록", tiles),
      guidePanel("이럴 땐 여기로", "하고 싶은 일을 누르면 해당 화면으로 가요.", [
        { label: "색·글자 크기를 바꾸고 싶어요", text: "플러그인 꾸미기", onClick: () => ctx.go("look") },
        { label: "모듈이 꼬였어요, 되돌리고 싶어요", text: "기록 · 되돌리기", onClick: () => ctx.go("settings", "history") },
        { label: "다른 기기로 옮기고 싶어요", text: "전체 백업·복원", onClick: () => fullBackup(ctx) },
        { label: "새 봇을 알아서 잡아 주면 좋겠어요", text: "업데이트 설정", onClick: () => ctx.go("settings", "updset") },
        { label: "내 채팅 테마를 만들고 싶어요", text: "채팅 테마 빌더", onClick: () => ctx.go("tools", "chattheme") }
      ])
    ];
  }
  const advEl = advFold(ctx, "settings", ...advBlocks);
  if (advSide && advEl) replace(advSide, advEl);
}
