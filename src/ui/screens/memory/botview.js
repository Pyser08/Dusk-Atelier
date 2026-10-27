import { h, replace } from "../../dom.js";
import { diagText } from "../../../engine/memorydiag.js";
import { icon } from "../../icons.js";
import { btn, badge, switchEl, setSwitch, loading, note } from "../../kit.js";
import { mem, loadBots, loadChats, loadFolder, fail } from "./common.js";
import { renderPeopleTab } from "./wikiview.js";
import { renderScenes } from "./scenes.js";
import { renderOpen, renderRels, renderTimeline } from "./ledger.js";
import { renderBotSettings, renderBotAnalysis } from "./settings.js";
import { openChatInfo } from "./settingstools.js";

const TABS = [["people", "등장인물"], ["scenes", "상황"], ["timeline", "시간선"], ["open", "열린 항목"], ["rels", "관계"]];

export async function renderBotView(ctx, host, { redraw, redrawView, back, quiet }) {
  const m = mem(ctx), M = ctx.memory;
  if (!quiet) replace(host, loading("불러오는 중", { rows: 4 }));
  const bots = await loadBots(ctx), bot = bots.find((b) => b.id === m.botId);
  if (!bot) { m.botId = ""; return replace(host, h("div", { class: "rb-empty" }, "봇을 찾지 못했어요. 목록을 새로고침해 주세요.")); }
  const chats = await loadChats(ctx, bot);
  if (m.chatIndex >= chats.length) m.chatIndex = 0;
  const chatItem = chats[m.chatIndex];
  if (!chatItem) return replace(host, h("div", { class: "rb-empty" }, "이 봇에는 채팅이 아직 없어요."));
  const view = await loadFolder(ctx, bot, chatItem);
  const { folder, backend, idx } = view, caps = M.capabilities(backend.id);
  const botCfg = idx.bots[bot.id] ?? { on: true };
  const autoOn = botCfg.on !== false && !botCfg.paused;
  const cycleOn = await M.flow?.settings?.().then((st) => { const r = st.rawSnapshot(); return r.features?.openness?.cycle === true && r.sexualDesireEnabled === true; }).catch(() => false);
  const advanced = idx.settings.flow?.advanced === true && idx.settings.flow?.on === true;
  const env = { ctx, bot, chats, advanced, chatItem, folder, view, backend, caps, idx, cycleOn, redraw, redrawView: redrawView ?? redraw, sess: M.runner?.session?.().calls ?? 0 };

  const sw = switchEl(autoOn && caps.analyze, { label: "자동 기록", disabled: !caps.analyze, onChange: async (v, el) => {
    setSwitch(el, v);
    await M.store.updateIndex((i) => { const b = i.bots[bot.id] ??= { on: true, ignore: [], fails: 0 }; b.on = v; if (v) { b.paused = false; b.fails = 0; } }).catch(fail(ctx));
    redraw();
  } });
  const injMode = M.injector?.mode?.() ?? "none";
  const injText = !caps.inject ? "리스바드가 직접 처리해요" : idx.settings.inject.on === false ? "꺼짐" : `켜짐 · ${idx.settings.inject.fromTurn}번째 턴부터${injMode === "lore" ? " (로어북 방식)" : ""}`;
  const status = h("div", { class: "rb-card rb-mem-status" },
    h("div", null, h("b", null, "저장소 "), backend.id === "bardwiki" ? "리스바드 BardWiki" : backend.id === "off" ? "꺼짐" : "플러그인", h("span", { class: "rb-muted" }, ` · ${backend.reason}`)),
    h("div", null, h("b", null, "장기기억 주입 "), injText),
    caps.analyze ? h("div", { class: "rb-muted" }, `이번 세션 분석 호출 ${env.sess}회${botCfg.paused ? " · 이 봇은 연속 실패로 자동 기록이 멈춰 있어요" : ""}${idx.status.lastError ? " · 마지막 오류: " + idx.status.lastError.slice(0, 80) : ""}`) : null,
    caps.analyze ? h("div", { class: "rb-muted rb-mem-diag" }, diagText(M.runner?.session?.() ?? {})) : null,
    view.snapshot ? note("warn", `스냅샷 ${new Date(folder.at_ms ?? 0).toLocaleString()} — 그 채팅을 열고 새로고침하면 갱신돼요.`) : null,
    view.missing ? note("warn", "이 채팅을 열면 볼 수 있어요.") : null,
    backend.duplicate ? note("warn", "BardWiki와 장기기억이 중복돼요. 비용이 두 번 들 수 있어요.") : null);

  const chatRow = chats.length > 12
    ? h("select", { class: "rb-input", "aria-label": "채팅 선택", onChange: (e) => { m.chatIndex = +e.target.value; m.personKey = ""; (redrawView ?? redraw)(); } }, chats.map((c) => h("option", { value: c.index, selected: c.index === m.chatIndex }, `${c.index + 1}. ${c.name} (${c.count})`)))
    : h("div", { class: "rb-mem-chats", role: "tablist", "aria-label": "채팅 선택" }, chats.map((c) => h("button", { type: "button", class: "rb-chip", "aria-pressed": c.index === m.chatIndex ? "true" : "false", onClick: () => { m.chatIndex = c.index; m.personKey = ""; (redrawView ?? redraw)(); } }, `${c.index + 1}. ${c.name}`, h("small", null, `${c.count}`))));

  // '설정' 폴드: 자동 기록 토글 옆 버튼으로 여닫는다. 내용은 지난 대화 분석·제외 이름·초기화·상태.
  const setBtn = btn("설정", { size: "sm", icon: "sliders", onClick: () => toggleSettings() });
  setBtn.setAttribute("aria-expanded", m.settingsOpen ? "true" : "false");
  const setPanel = h("div", { class: "rb-mem-fold-panel", hidden: !m.settingsOpen }, renderBotSettings(env));
  const toggleSettings = () => { m.settingsOpen = !m.settingsOpen; setPanel.hidden = !m.settingsOpen; setBtn.setAttribute("aria-expanded", m.settingsOpen ? "true" : "false"); };
  const body = h("div", { class: "rb-mem-body" });
  // 탭 전환은 아래 본문만 다시 그린다(폴더·채팅·설정을 다시 읽지 않는다). 저장·분석 같은 변경은 기존처럼 전체를 다시 그린다.
  const DRAW = { people: renderPeopleTab, scenes: renderScenes, timeline: renderTimeline, open: renderOpen, rels: renderRels };
  const drawBody = () => (DRAW[m.tab] ?? renderPeople)(env, body);
  const tabBtns = TABS.map(([id, label]) => h("button", { type: "button", role: "tab", class: "rb-chip", "aria-pressed": m.tab === id ? "true" : "false", onClick: () => { if (m.tab === id) return; m.tab = id; m.page = 1; tabBtns.forEach((b, k) => b.setAttribute("aria-pressed", TABS[k][0] === id ? "true" : "false")); Promise.resolve(drawBody()).catch(fail(ctx)); } }, label));
  const tabs = h("div", { class: "rb-mem-tabs", role: "tablist" }, tabBtns);
  replace(host,
    h("div", { class: "rb-mem-head" }, h("span", { class: "rb-mem-back" }, btn("뒤로", { size: "sm", icon: "back", onClick: back })), h("h2", null, bot.character.name || "이름 없는 캐릭터"), h("span", { class: ["rb-mem-mode", backend.id], title: backend.reason }, backend.id === "bardwiki" ? "BardWiki 모드" : backend.id === "off" ? "기억 꺼짐" : "플러그인 모드"), h("span", { style: "flex:1" }), sw, btn("이 채팅", { size: "sm", title: "이 채팅의 추적 인물·내 이름·관찰자·프롬프트 보기", onClick: () => openChatInfo(env).catch(fail(ctx)) }), setBtn),
    setPanel, status, chatRow, renderBotAnalysis(env), tabs, body);
  await drawBody();
}
