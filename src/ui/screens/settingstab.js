// 설정 탭: 흩어져 있던 설정을 한곳에. (도구와 개발 탭 사이)
import { h, replace } from '../dom.js';
import { note, segmented } from '../kit.js';
import { icon } from '../icons.js';
import { LORE_DEFAULTS, loadLoreSettings, saveLoreSettings } from '../../data/lorerules.js';
import { devToggleCard } from './devtools.js';
import { renderCleanup, tile } from './tools.js';
import { renderSettings } from './settings.js';
import { renderUpdateSettings } from './updsettings.js';

export async function renderSettingsTab(ctx) {
  if (ctx.state.sub === "theme") return renderSettings(ctx);
  if (ctx.state.sub === "updset") return renderUpdateSettings(ctx);
  if (ctx.state.sub === "cleanup") return renderCleanup(ctx);
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
  const row = (label, seg) => h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" }, h("b", { style: "font-size:13.5px;min-width:120px" }, label), h("div", { style: "flex:1;min-width:240px" }, seg));
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1;max-width:820px" },
    h("h2", { class: "rb-h2" }, "설정"),
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
      row("로어북 로그", logSeg),
      row("응답 아래 버튼", btnSeg),
      h("div", { class: "rb-muted", style: "font-size:12.5px;line-height:1.7;word-break:keep-all" }, "응답마다 들어간 로어북(Dusk 규칙이 없는 봇도)을 남겨요. 도구 → 로어북 로그에서 보고, AI 응답 아래 [📖 로어북] 버튼으로도 바로 봐요. 채팅 내용은 바꾸지 않아요.")
    ),
    h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-bottom:14px" },
      tile("palette", "색 바꾸기", "테마 색, 직접 고른 색, 밝기(RisuAI 따라가기/다크/라이트)", () => ctx.go("settings", "theme"), "rb-set-theme"),
      tile("refresh", "업데이트 설정", "새로 가져온 봇 자동 감지, 받은 사본 정리, 채팅 백업", () => ctx.go("settings", "updset"), "rb-set-updset"),
      tile("trash", "설정 정리", "이 플러그인이 저장한 순서·폴더·프리셋·연결 정보를 골라서 지우기", () => ctx.go("settings", "cleanup"), "rb-set-cleanup")
    ),
    devToggleCard(ctx, () => {
      ctx.refreshTabs();
      renderSettingsTab(ctx);
    })
  ));
}
