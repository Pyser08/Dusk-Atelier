import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, badge, switchEl, setSwitch, loading, note } from "../../kit.js";
import { mem, loadBots, loadChats, loadFolder, fail } from "./common.js";
import { renderPeople } from "./people.js";
import { renderScenes } from "./scenes.js";
import { renderCompose } from "./compose.js";
import { renderSettings } from "./settings.js";

const TABS = [["people", "등장인물"], ["scenes", "상황"], ["compose", "새 봇 만들기"], ["settings", "설정"]];

export async function renderBotView(ctx, host, { redraw, back }) {
  const m = mem(ctx), M = ctx.memory;
  replace(host, loading("불러오는 중", { rows: 4 }));
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
  const env = { ctx, bot, chats, chatItem, folder, view, backend, caps, idx, redraw, sess: M.runner?.session?.().calls ?? 0 };

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
    view.snapshot ? note("warn", `스냅샷 ${new Date(folder.at_ms ?? 0).toLocaleString()} — 그 채팅을 열고 새로고침하면 갱신돼요.`) : null,
    view.missing ? note("warn", "이 채팅을 열면 볼 수 있어요.") : null,
    backend.duplicate ? note("warn", "BardWiki와 장기기억이 중복돼요. 비용이 두 번 들 수 있어요.") : null);

  const chatRow = chats.length > 12
    ? h("select", { class: "rb-input", "aria-label": "채팅 선택", onChange: (e) => { m.chatIndex = +e.target.value; m.personKey = ""; redraw(); } }, chats.map((c) => h("option", { value: c.index, selected: c.index === m.chatIndex }, `${c.index + 1}. ${c.name} (${c.count})`)))
    : h("div", { class: "rb-mem-chats", role: "tablist", "aria-label": "채팅 선택" }, chats.map((c) => h("button", { type: "button", class: "rb-chip", "aria-pressed": c.index === m.chatIndex ? "true" : "false", onClick: () => { m.chatIndex = c.index; m.personKey = ""; redraw(); } }, `${c.index + 1}. ${c.name}`, h("small", null, `${c.count}`))));

  const body = h("div", { class: "rb-mem-body" });
  const tabs = h("div", { class: "rb-mem-tabs", role: "tablist" }, TABS.map(([id, label]) => h("button", { type: "button", role: "tab", class: "rb-chip", "aria-pressed": m.tab === id ? "true" : "false", onClick: () => { m.tab = id; m.page = 1; redraw(); } }, label)));
  replace(host,
    h("div", { class: "rb-mem-head" }, ctx.isMobile() ? btn("뒤로", { size: "sm", icon: "back", onClick: back }) : null, h("h2", null, bot.character.name || "이름 없는 캐릭터"), h("span", { style: "flex:1" }), sw),
    status, chatRow, tabs, body);
  const draw = { people: renderPeople, scenes: renderScenes, compose: renderCompose, settings: renderSettings }[m.tab] ?? renderPeople;
  await draw(env, body);
}
