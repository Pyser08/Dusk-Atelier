// 카드 탭: 이 봇에서 만든 카드를 모아 보고, 크게 보기·PNG 저장·삭제를 한다.
import { h, replace, download } from "../../dom.js";
import { btn, badge, modal, confirmDialog, emptyState } from "../../kit.js";
import { fail, gradeBadge, mem } from "./common.js";
import { cardPreview } from "../../card/preview.js";
import { cardPng } from "../../card/render.js";
import { colorOf } from "../../../engine/card/grade.js";
import { makeBotFromCard } from "./makebot.js";
import { runScreenTour } from "../../screentours.js";

const when = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? "" : d.toLocaleDateString(); };

export async function renderCards(env, host) {
  const { ctx, bot } = env, M = ctx.memory;
  const list = await M.cards.list(bot.id);
  // 카드 탭은 m.ctab으로 화면을 고른다(예전엔 m.tab을 바꿔서 '카드 만들기'를 눌러도 목록이 다시 그려지기만 했다 — 1.8.3 수정)
  const toCompose = () => { mem(env.ctx).ctab = "compose"; (env.redrawView ?? env.redraw)(); };
  if (!list.length) return replace(host, emptyState({ icon: "brain", title: "아직 만든 카드가 없어요", text: "인물의 기억을 카드 한 장으로 만들어 두면, 그 카드로 새 봇을 만들 수 있어요.", actions: [{ label: "카드 만들기", icon: "plus", onClick: toCompose }, { label: "만드는 법 보기", icon: "help", onClick: () => runScreenTour(env.ctx) }] }));
  replace(host, h("div", { class: "rb-mem-grid rb-cards3-grid" }, list.map((it) =>
    h("button", { type: "button", class: "rb-mem-card rb-card-tile", style: { "--g": colorOf(it.grade) }, onClick: () => openCard(env, it.id) },
      gradeBadge(it.grade), h("span", { class: "txt" }, h("span", { class: "name" }, it.name), h("span", { class: "meta" }, [when(it.createdAt), it.memories != null ? `기억 ${it.memories}개` : ""].filter(Boolean).join(" · "))))),
    h("button", { type: "button", class: "rb-mem-card rb-card-tile rb-cards3-new", id: "rb-cards-new", onClick: toCompose }, h("span", { class: "txt" }, h("span", { class: "name" }, "＋ 새 카드")))));
}

async function openCard(env, id) {
  const { ctx } = env, M = ctx.memory;
  const card = await M.cards.get(id);
  if (!card) return ctx.toast("카드를 찾지 못했어요.", { error: true });
  const pv = cardPreview(ctx);
  const png = async () => cardPng(card, await pv.bitmapFor(card.image?.ref));
  await modal(ctx.win, (done) => {
    pv.draw(card);
    const save = btn("PNG 저장", { kind: "primary", onClick: async () => { try { download(`${card.name}-${card.grade}.png`, new Blob([await png()], { type: "image/png" })); } catch (e) { fail(ctx)(e); } } });
    const del = btn("삭제", { onClick: async () => {
      if (!await confirmDialog(ctx.win, { title: "카드 삭제", body: `'${card.name}' 카드를 지워요. 이미 만든 새 봇은 그대로예요.`, ok: "지우기", danger: true })) return;
      try { await M.cards.remove(card.id); done(null); env.redraw(); } catch (e) { fail(ctx)(e); }
    } });
    const mk = card.link ? btn("새 봇 만들기", { onClick: async () => {
      try {
        mk.disabled = true; const cfg = await M.cards.getCfg();
        const created = await makeBotFromCard(env, { card, link: card.link, first: card.first, name: `${env.bot.character.name} · ${card.name}`, imageUse: cfg.imageUse, withPng: cfg.withPng, picks: [], bmp: await pv.bitmapFor(card.image?.ref) });
        ctx.toast(`'${created.name}' 봇을 만들었어요.`); done(null); env.ctx.state.mem.bots = null; env.redraw();
      } catch (e) { mk.disabled = false; fail(ctx)(e); }
    } }) : null;
    return h("div", { class: "rb-dialog rb-card-dialog", role: "dialog", "aria-modal": "true" }, h("h3", null, card.name, " ", badge(card.grade, "acc")), pv.el,
      h("p", { class: "rb-muted" }, `${card.keyword || ""} · 태그 ${card.tags.length}개 · 기억 ${card.memories.length}개`),
      h("div", { class: "rb-dialog-actions" }, del, btn("닫기", { onClick: () => done(null) }), mk, save));
  });
}
