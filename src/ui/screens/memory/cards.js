// 카드 탭: 이 봇에서 만든 카드를 모아 보고, 크게 보기·PNG 저장·삭제를 한다.
import { h, replace, download } from "../../dom.js";
import { btn, badge, modal, confirmDialog } from "../../kit.js";
import { fail, gradeBadge } from "./common.js";
import { cardPreview } from "../../card/preview.js";
import { cardPng } from "../../card/render.js";
import { colorOf } from "../../../engine/card/grade.js";

const when = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? "" : d.toLocaleDateString(); };

export async function renderCards(env, host) {
  const { ctx, bot } = env, M = ctx.memory;
  const list = await M.cards.list(bot.id);
  if (!list.length) return replace(host, h("div", { class: "rb-empty" }, "아직 만든 카드가 없어요. '새 봇 만들기'의 카드 단계에서 만들고 저장할 수 있어요."));
  replace(host, h("p", { class: "rb-muted" }, `이 봇에서 만든 카드 ${list.length}장`), h("div", { class: "rb-mem-grid" }, list.map((it) =>
    h("button", { type: "button", class: "rb-mem-card rb-card-tile", style: { "--g": colorOf(it.grade) }, onClick: () => openCard(env, it.id) },
      gradeBadge(it.grade), h("span", { class: "txt" }, h("span", { class: "name" }, it.name), h("span", { class: "meta" }, when(it.createdAt)))))));
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
    return h("div", { class: "rb-dialog rb-card-dialog", role: "dialog", "aria-modal": "true" }, h("h3", null, card.name, " ", badge(card.grade, "acc")), pv.el,
      h("p", { class: "rb-muted" }, `${card.keyword || ""} · 태그 ${card.tags.length}개 · 기억 ${card.memories.length}개`),
      h("div", { class: "rb-dialog-actions" }, del, btn("닫기", { onClick: () => done(null) }), save));
  });
}
