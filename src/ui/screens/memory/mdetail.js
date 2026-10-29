// 기록 보기 (1.7.0 3단계, 계획 §3.2): 인물 위키 · 상황 · 시간선 · 열린 항목 · 관계를 한 화면에 쌓고, 위 칩은 그 자리로 스크롤만 한다.
import { h, replace } from "../../dom.js";
import { btn, loading, note } from "../../kit.js";
import { mem, loadBots, loadChats, loadFolder, fail, potOn } from "./common.js";
import { renderPeopleTab } from "./wikiview.js";
import { renderScenes } from "./scenes.js";
import { renderOpen, renderRels, renderTimeline } from "./ledger.js";
import { renderBotSettings } from "./settings.js";

export const DETAIL_TABS = [["people", "인물 위키"], ["scenes", "상황"], ["timeline", "시간선"], ["open", "열린 항목"], ["rels", "관계"]];
const DRAW = { people: renderPeopleTab, scenes: renderScenes, timeline: renderTimeline, open: renderOpen, rels: renderRels };

export async function renderMemoryDetail(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory;
  const back = () => { m.page = "home"; redraw(); };
  replace(host, loading("불러오는 중", { rows: 4 }));
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
    ? h("select", { class: "rb-input", "aria-label": "채팅 선택", onChange: (e) => { m.chatIndex = +e.target.value; m.personKey = ""; redraw(); } }, chats.map((c) => h("option", { value: c.index, selected: c.index === m.chatIndex }, `${c.name} (${c.count})`)))
    : h("div", { class: "rb-mem-chats", role: "tablist", "aria-label": "채팅 선택" }, chats.map((c) => h("button", { type: "button", class: "rb-chip", "aria-pressed": c.index === m.chatIndex ? "true" : "false", onClick: () => { m.chatIndex = c.index; m.personKey = ""; redraw(); } }, `${c.name} · ${c.count}`)))) : null;

  const inner = Object.fromEntries(DETAIL_TABS.map(([id]) => [id, h("div", { class: "rb-mem-anchor-body" })]));
  const wraps = Object.fromEntries(DETAIL_TABS.map(([id, label]) => [id, h("section", { class: "rb-mem-anchor", "data-sec": id }, id === "people" ? null : h("h3", { class: "rb-mem-anchortitle" }, label), inner[id])]));
  const setActive = (id) => tabBtns.forEach((b, k) => b.setAttribute("aria-pressed", DETAIL_TABS[k][0] === id ? "true" : "false"));
  const tabBtns = DETAIL_TABS.map(([id, label]) => h("button", { type: "button", role: "tab", class: "rb-chip", "aria-pressed": m.tab === id ? "true" : "false", onClick: () => { m.tab = id; setActive(id); wraps[id].scrollIntoView({ behavior: "smooth", block: "start" }); } }, label));
  host.onscroll = () => { const top = host.getBoundingClientRect().top + 70; let c = DETAIL_TABS[0][0]; for (const [id] of DETAIL_TABS) if (wraps[id].getBoundingClientRect().top <= top) c = id; if (c !== m.tab) { m.tab = c; setActive(c); } };
  await Promise.all(DETAIL_TABS.map(([id]) => Promise.resolve(DRAW[id](env, inner[id])).catch(fail(ctx))));

  const more = ctx.prefs.advanced ? h("details", { class: "rb-mem-man" }, h("summary", null, "이 봇의 세부 설정"), renderBotSettings(env)) : null;
  replace(host,
    h("div", { class: "rb-mem2-head" }, btn("← 기억으로", { size: "sm", onClick: back }), h("h2", { class: "rb-h2" }, bot.character.name || "이름 없는 캐릭터"), h("span", { class: "rb-muted" }, "기록 보기")),
    view.snapshot ? note("warn", `스냅샷 ${new Date(folder.at_ms ?? 0).toLocaleString()} — 그 채팅을 열고 새로고침하면 갱신돼요.`) : null,
    view.missing ? note("warn", "이 채팅을 열면 볼 수 있어요.") : null,
    chatRow, h("div", { class: "rb-mem-tabs rb-mem-navtabs", role: "tablist", "aria-label": "이 채팅의 기억 구역" }, tabBtns),
    h("div", { class: "rb-mem-body" }, DETAIL_TABS.map(([id]) => wraps[id])), more);
}
