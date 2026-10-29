// 카드 탭(기억 카드): 장기기억과 따로. 봇을 고르면 그 채팅의 기억으로 카드를 만들고, 카드 목록·새 봇 만들기·카드 설정을 한곳에서 한다.
// 카드는 기억 기록을 재료로 쓰지만 저장소(cardstore)는 기억 저장소와 완전히 분리돼 있다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { advFold, btn, stepsGuide, loading } from "../../kit.js";
import { mem, fail, loadBots, loadChats, loadFolder } from "../memory/common.js";
import { renderCards } from "../memory/cards.js";
import { renderCompose } from "../memory/compose.js";
import { cardSettings } from "../memory/settings.js";

const TABS = [["list", "만든 카드"], ["compose", "새 카드·새 봇 만들기"]];

export async function renderCardsTab(ctx) {
  const m = mem(ctx);
  if (!ctx.memory) return replace(ctx.main, h("div", { class: "rb-empty" }, "기억 카드 기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  m.ctab ??= "list";
  const redraw = () => renderCardsTab(ctx).catch(fail(ctx));
  // 지금 열린 채팅이 기본(1.7.0): 처음 들어오면 그 봇·채팅을 바로 고른다. 다른 봇은 위의 드롭다운에서.
  if (!m.botId) {
    const cur = await ctx.memory.switches?.currentChat?.().catch(() => null);
    if (cur) { m.botId = cur.chaId; m.chatIndex = cur.ti; m.view = "bot"; m.compose = null; }
  }
  const bots = await loadBots(ctx);
  const pickBot = h("select", { class: "rb-input", "aria-label": "카드를 만들 봇", onChange: (e) => { m.botId = e.target.value; m.chatIndex = 0; m.personKey = ""; m.view = "bot"; m.compose = null; m.ctab = "list"; redraw(); } },
    !m.botId ? h("option", { value: "", selected: true }, "카드를 만들 봇 고르기") : null,
    ...bots.map((b) => h("option", { value: b.id, selected: b.id === m.botId }, b.character.name || "이름 없는 캐릭터")));
  const top = h("div", { class: "rb-cards2-top" }, h("label", { class: "rb-cards2-pick" }, h("small", null, "카드를 만들 봇"), pickBot));
  const viewHost = h("div", { class: "rb-mem-col view" }), advHost = h("div");
  replace(ctx.main, h("div", { class: "rb-cards2 rb-scroll" }, top, h("div", { class: "rb-mem-wrap" }, h("div", { class: "rb-mem-root", "data-view": "bot" }, viewHost)), advHost));
  const drawView = (first) => m.botId ? renderBotCards(ctx, viewHost, { redraw, redrawView: () => drawView(false).catch(fail(ctx)), back: () => {}, quiet: !first })
    : Promise.resolve(replace(viewHost, h("div", { class: "rb-empty rb-mem-empty" }, icon("sparkle", 28), h("div", { style: "font-weight:700;color:var(--rb-text);font-size:15px" }, "위에서 봇을 골라 주세요."),
      stepsGuide("카드는 이 순서로 만들어요", ["위에서 카드를 만들 봇을 골라요.", "‘새 카드·새 봇 만들기’에서 인물과 범위를 골라요.", "카드가 마음에 들면 새 봇으로 이어 가요."]))));
  await drawView(true);
  // 카드 설정(태그·기본 언어)은 고급에서만
  const sHost = h("div");
  await renderCardSettings(ctx, sHost, redraw);
  replace(advHost, advFold(ctx, "cards", sHost));
}

async function renderCardSettings(ctx, host, redraw) {
  const m = mem(ctx), cfg = await ctx.memory.cards.getCfg();
  const fold = h("details", { class: "rb-mem-fold", open: !!m.cardSetOpen }, h("summary", null, "카드 설정"), h("div", { class: "rb-mem-foldbody" }, cardSettings(ctx, cfg, redraw)));
  fold.addEventListener("toggle", () => { m.cardSetOpen = fold.open; });
  replace(host, fold);
}

async function renderBotCards(ctx, host, { redraw, redrawView, back, quiet }) {
  const m = mem(ctx), M = ctx.memory;
  if (!quiet) replace(host, loading("불러오는 중", { rows: 4 }));
  const bots = await loadBots(ctx), bot = bots.find((b) => b.id === m.botId);
  if (!bot) { m.botId = ""; return replace(host, h("div", { class: "rb-empty" }, "봇을 찾지 못했어요. 목록을 새로고침해 주세요.")); }
  const chats = await loadChats(ctx, bot);
  if (m.chatIndex >= chats.length) m.chatIndex = 0;
  const chatItem = chats[m.chatIndex];
  if (!chatItem) return replace(host, h("div", { class: "rb-empty" }, "이 봇에는 채팅이 아직 없어요."));
  const view = await loadFolder(ctx, bot, chatItem), { folder, backend, idx } = view;
  const env = { ctx, bot, chats, chatItem, folder, view, backend, caps: M.capabilities(backend.id), idx, redraw, redrawView };
  const pick = (i) => { m.chatIndex = i; m.compose = null; redrawView(); };
  const chatRow = chats.length > 12
    ? h("select", { class: "rb-input", "aria-label": "채팅 선택", onChange: (e) => pick(+e.target.value) }, chats.map((c) => h("option", { value: c.index, selected: c.index === m.chatIndex }, `${c.index + 1}. ${c.name} (${c.count})`)))
    : h("div", { class: "rb-mem-chats", role: "tablist", "aria-label": "채팅 선택" }, chats.map((c) => h("button", { type: "button", class: "rb-chip", "aria-pressed": c.index === m.chatIndex ? "true" : "false", onClick: () => pick(c.index) }, `${c.index + 1}. ${c.name}`, h("small", null, `${c.count}`))));
  const tabs = h("div", { class: "rb-mem-tabs", role: "tablist" }, TABS.map(([id, label]) => h("button", { type: "button", role: "tab", class: "rb-chip", "aria-pressed": m.ctab === id ? "true" : "false", onClick: () => { if (m.ctab === id) return; m.ctab = id; redrawView(); } }, label)));
  const body = h("div", { class: "rb-mem-body" });
  replace(host, h("div", { class: "rb-mem-head" }, h("span", { class: "rb-mem-back" }, btn("뒤로", { size: "sm", icon: "back", onClick: back })), h("h2", null, bot.character.name || "이름 없는 캐릭터")), chatRow, tabs, body);
  await (m.ctab === "compose" ? renderCompose : renderCards)(env, body);
}
