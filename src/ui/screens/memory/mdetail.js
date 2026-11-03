// 기록 보기 (1.8.3 목업 3): 인물 위키 · 상황 · 시간선 · 열린 항목 · 관계 중 한 번에 한 구역만 보여 준다.
// 구역 칩에 개수를 붙이고(모바일 한 줄 가로 스크롤), PC는 왼쪽 구역 목록 + 오른쪽 내용. 채팅 고르기는 머리의 ▾ 하나.
import { h, replace } from "../../dom.js";
import { btn, loading, note } from "../../kit.js";
import { mem, loadBots, loadChats, countOf, loadFolder, fail, potOn } from "./common.js";
import { renderPeopleTab } from "./wikiview.js";
import { renderScenes } from "./scenes.js";
import { renderOpen, renderRels, renderTimeline } from "./ledger.js";
import { openItems, timelineOf } from "../../../engine/memoryplus.js";
import { renderBotSettings } from "./settings.js";
import { loadUserName, watchUserName } from "./username.js";

export const DETAIL_TABS = [["people", "인물 위키"], ["scenes", "상황"], ["timeline", "시간선"], ["open", "열린 항목"], ["rels", "관계"]];
const DRAW = { people: renderPeopleTab, scenes: renderScenes, timeline: renderTimeline, open: renderOpen, rels: renderRels };

export async function renderMemoryDetail(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory;
  const back = () => { m.page = "home"; redraw(); };
  replace(host, loading("불러오는 중", { rows: 4 }));
  await loadUserName(ctx);   // {{user}}를 페르소나 이름으로 보여 주려고(표시만)
  if (!host.__duskUser) host.__duskUser = watchUserName(host);
  const bots = await loadBots(ctx), bot = bots.find((b) => b.id === m.botId);
  if (!bot) { m.botId = ""; m.page = "home"; return redraw(); }
  const chats = await loadChats(ctx, bot);
  if (m.chatIndex >= chats.length) m.chatIndex = 0;
  const chatItem = chats[m.chatIndex];
  if (!chatItem) return replace(host, h("div", { class: "rb-mem2-head" }, btn("← 기억으로", { size: "sm", onClick: back })), h("div", { class: "rb-empty" }, "이 봇에는 채팅이 아직 없어요."));
  const view = await loadFolder(ctx, bot, chatItem);
  const { folder, backend, idx } = view, caps = M.capabilities(backend.id);
  const cycleOn = await M.flow?.settings?.().then((st) => { const r = st.rawSnapshot(); return r.features?.openness?.cycle === true && r.sexualDesireEnabled === true; }).catch(() => false);
  const advanced = potOn(idx.settings) && idx.settings.flow?.advanced === true && idx.settings.flow?.on === true;
  const env = { ctx, bot, chats, advanced, chatItem, folder, view, backend, caps, idx, cycleOn, redraw, redrawView: redraw, sess: M.runner?.session?.().calls ?? 0 };

  const chatRow = chats.length > 1 ? (chats.length > 12
    ? h("select", { class: "rb-input", "aria-label": "채팅 선택", onChange: (e) => { m.chatIndex = +e.target.value; m.personKey = ""; redraw(); } }, chats.map((c) => h("option", { value: c.index, selected: c.index === m.chatIndex }, `${c.name}${countOf(c)}`)))
    : h("div", { class: "rb-mem-chats", role: "tablist", "aria-label": "채팅 선택" }, chats.map((c) => h("button", { type: "button", class: "rb-chip", "aria-pressed": c.index === m.chatIndex ? "true" : "false", onClick: () => { m.chatIndex = c.index; m.personKey = ""; redraw(); } }, `${c.name}${c.count == null ? "" : " · " + c.count}`)))) : null;

  // 구역별 개수(칩에 표시)
  const counts = {
    people: Object.values(folder.people ?? {}).filter((p) => !p.orphan).length,
    scenes: (folder.scenes ?? []).filter((x) => !x.orphan).length,
    timeline: (() => { try { return timelineOf(folder).length; } catch { return 0; } })(),
    open: (() => { try { return openItems(folder).length; } catch { return 0; } })(),
    rels: Object.values(folder.rels ?? {}).filter((p) => (p.items ?? []).some((i) => !i.orphan)).length
  };
  if (!DRAW[m.tab]) m.tab = "people";
  const body = h("div", { class: "rb-mem-secbody", role: "tabpanel" });
  const tabBtns = DETAIL_TABS.map(([id, label]) => h("button", { type: "button", role: "tab", class: "rb-chip rb-mem-sectab", dataset: { sec: id }, "aria-selected": m.tab === id ? "true" : "false", "aria-pressed": m.tab === id ? "true" : "false", onClick: () => { if (m.tab === id) return; m.tab = id; if (id !== "people") m.personKey = ""; paintTabs(); drawSec(); } }, label, h("span", { class: "n" }, String(counts[id]))));
  const paintTabs = () => tabBtns.forEach((b) => { const on = b.dataset.sec === m.tab; b.setAttribute("aria-pressed", on ? "true" : "false"); b.setAttribute("aria-selected", on ? "true" : "false"); });
  let drawTok = 0;
  const drawSec = async () => {
    const tok = ++drawTok;
    replace(body, loading("불러오는 중", { rows: 3 }));
    const box = h("div", { class: "rb-mem-anchor", "data-sec": m.tab });
    try { await DRAW[m.tab](env, box); } catch (e) { fail(ctx)(e); }
    if (tok === drawTok) replace(body, box);
  };
  host.onscroll = null;
  const chatPick = chats.length > 1
    ? h("select", { class: "rb-input rb-mem-chatpick", "aria-label": "채팅 선택", onChange: (e) => { m.chatIndex = +e.target.value; m.personKey = ""; redraw(); } }, chats.map((c) => h("option", { value: c.index, selected: c.index === m.chatIndex }, `${c.index + 1}. ${c.name}${countOf(c)}`)))
    : h("span", { class: "rb-muted" }, chatItem.name ?? "");

  const more = ctx.prefs.advanced ? h("details", { class: "rb-mem-man" }, h("summary", null, "이 봇의 세부 설정"), renderBotSettings(env)) : null;
  replace(host,
    h("div", { class: "rb-mem2-head rb-mem-dhead" }, btn("‹ 장기 기억", { size: "sm", onClick: back }), h("h2", { class: "rb-h2" }, bot.character.name || "이름 없는 캐릭터", h("span", { class: "rb-muted", style: "font-weight:500;font-size:14px;margin-left:6px" }, "기록 보기")), chatPick),
    view.snapshot ? note("warn", `스냅샷 ${new Date(folder.at_ms ?? 0).toLocaleString()} — 그 채팅을 열고 새로고침하면 갱신돼요.`) : null,
    view.missing ? note("warn", "이 채팅을 열면 볼 수 있어요.") : null,
    h("div", { class: "rb-mem-dgrid" },
      h("div", { class: "rb-mem-tabs rb-mem-navtabs rb-mem-sectabs", role: "tablist", "aria-label": "이 채팅의 기억 구역" }, tabBtns),
      body),
    more);
  await drawSec();
}
