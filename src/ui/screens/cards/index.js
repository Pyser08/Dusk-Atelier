// 카드 탭(기억 카드): 장기기억과 따로. 봇을 고르면 그 채팅의 기억으로 카드를 만들고, 카드 목록·새 봇 만들기·카드 설정을 한곳에서 한다.
// 카드는 기억 기록을 재료로 쓰지만 저장소(cardstore)는 기억 저장소와 완전히 분리돼 있다.
// 1.8.3(목업 2): 봇·채팅은 한 줄 카드('바꾸기'로 봇→채팅 고르기), '만든 카드 / 새로 만들기'는 segmented, 카드 설정은 고급.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { advFold, btn, loading, modal, segmented } from "../../kit.js";
import { runScreenTour } from "../../screentours.js";
import { mem, fail, loadBots, loadChats, countOf, loadFolder } from "../memory/common.js";
import { renderCards } from "../memory/cards.js";
import { renderCompose } from "../memory/compose.js";
import { cardSettings } from "../memory/settings.js";

const TABS = [["list", "만든 카드"], ["compose", "새로 만들기"]];

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
  const choose = () => openPicker(ctx, bots, (botId, chatIndex) => { m.botId = botId; m.chatIndex = chatIndex; m.personKey = ""; m.view = "bot"; m.compose = null; m.ctab = "list"; redraw(); });
  const top = h("div", { class: "rb-cards2-top" });
  if (!m.botId) replace(top, h("div", { class: "rb-card bordered rb-cards3-pick" }, h("span", { class: "t" }, h("b", null, "카드를 만들 봇을 골라요"), h("small", null, "봇과 채팅을 고르면 그 기억으로 카드를 만들어요")), btn("고르기", { kind: "primary", size: "sm", onClick: choose })));
  const viewHost = h("div", { class: "rb-mem-col view" }), advHost = h("div");
  replace(ctx.main, h("div", { class: "rb-cards2 rb-scroll" }, top, h("div", { class: "rb-mem-wrap" }, h("div", { class: "rb-mem-root", "data-view": "bot" }, viewHost)), advHost));
  const drawView = (first) => m.botId ? renderBotCards(ctx, viewHost, { redraw, redrawView: () => drawView(false).catch(fail(ctx)), back: () => {}, quiet: !first, top, choose })
    : Promise.resolve(replace(viewHost, h("div", { class: "rb-empty rb-mem-empty" }, icon("sparkle", 28), h("div", { style: "font-weight:700;color:var(--rb-text);font-size:15px" }, "위에서 봇을 골라 주세요."),
      h("p", { class: "rb-muted", style: "margin:0" }, "처음이라면 어떻게 만드는지 하나씩 짚어 드릴게요."), btn("카드 만드는 법 둘러보기", { kind: "primary", icon: "help", onClick: () => runScreenTour(ctx) }))));
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

// 봇 → 채팅 순서로 고르는 작은 창
function openPicker(ctx, bots, onPick) {
  return modal(ctx.win, (done) => {
    const chatsBox = h("div", { class: "rb-cards3-chats" });
    let botId = mem(ctx).botId || bots[0]?.id || "";
    const drawChats = async () => {
      const b = bots.find((x) => x.id === botId);
      if (!b) return replace(chatsBox);
      replace(chatsBox, loading("불러오는 중"));
      const chats = await loadChats(ctx, b).catch(() => []);
      replace(chatsBox, chats.length ? chats.map((c) => h("button", { type: "button", class: "rb-srow", onClick: () => { done(null); onPick(b.id, c.index); } }, h("span", { class: "t" }, `${c.index + 1}. ${c.name}`, h("small", null, c.count == null ? "" : `기억 ${c.count}개`)), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)))) : h("p", { class: "rb-muted" }, "이 봇에는 채팅이 아직 없어요."));
    };
    const sel = h("select", { class: "rb-input", "aria-label": "카드를 만들 봇", onChange: (e) => { botId = e.target.value; drawChats(); } }, bots.map((b) => h("option", { value: b.id, selected: b.id === botId }, b.character.name || "이름 없는 캐릭터")));
    drawChats();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "봇·채팅 고르기" }, h("h3", null, "봇·채팅 고르기"), h("small", { class: "rb-muted" }, "1. 봇"), sel, h("small", { class: "rb-muted" }, "2. 채팅"), chatsBox,
      h("div", { class: "rb-dialog-actions" }, btn("닫기", { onClick: () => done(null) })));
  });
}

async function renderBotCards(ctx, host, { redraw, redrawView, back, quiet, top, choose }) {
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
  void back; void countOf;
  // 한 줄 카드: 봇 이름 · 채팅 · 기억 수 + 바꾸기
  if (top) replace(top, h("div", { class: "rb-card bordered rb-cards3-pick" },
    h("span", { class: "rb-cards3-av", "aria-hidden": "true" }, (bot.character.name || "?").slice(0, 1)),
    h("span", { class: "t" }, h("b", null, bot.character.name || "이름 없는 캐릭터"), h("small", null, `${chatItem.index + 1}. ${chatItem.name}${chatItem.count == null ? "" : ` · 기억 ${chatItem.count}개`}`)),
    btn("바꾸기", { size: "sm", onClick: choose })));
  const cardCount = await M.cards.list(bot.id).then((l) => l.length).catch(() => 0);
  const tabs = segmented([["list", cardCount ? `만든 카드 ${cardCount}` : "만든 카드"], ["compose", "새로 만들기"]], m.ctab, (v) => { if (m.ctab === v) return; m.ctab = v; redrawView(); }, "카드 화면");
  tabs.classList.add("rb-cards3-seg");
  const body = h("div", { class: "rb-mem-body" });
  replace(host, tabs, body);
  await (m.ctab === "compose" ? renderCompose : renderCards)(env, body);
}
