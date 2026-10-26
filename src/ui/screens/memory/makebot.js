// 카드 → 새 봇 만들기(공용). 카드 이미지 PNG를 에셋으로 저장하고, 카드를 저장한 뒤, 봇을 추가한다.
import { buildCardCharacter } from "../../../data/cardbot.js";
import { insertCharacter } from "../../../data/addcharacter.js";
import { ensureCharacterInOrder } from "../../../engine/character.js";
import { isGenerating, Busy } from "../../../engine/safety.js";
import { cardPng } from "../../card/render.js";

// o: {card, link, first, name, imageUse, withPng, copyExtras, picks, withRel, bmp, minGrade, chatName}
export async function makeBotFromCard(env, o) {
  const { ctx, bot } = env, card = o.card;
  if (!o.link) throw new Error("연결 문서가 없어서 새 봇을 만들 수 없어요.");
  const need = o.imageUse === "card" || o.withPng;
  let cardAssetKey = null;
  if (need) {
    cardAssetKey = await ctx.api.saveAsset(await cardPng(card, o.bmp ?? null));
    if (typeof cardAssetKey !== "string" || !cardAssetKey) throw new Error("카드 이미지를 저장하지 못했어요.");
  }
  await ctx.memory.cards.save({ ...card, link: o.link, first: o.first ?? "" });
  const db = await ctx.api.getDatabase(["characters"]), characters = Array.isArray(db?.characters) ? db.characters : [];
  const { created } = await insertCharacter(ctx.api, { characters, hooks: { created: (id) => ctx.watcher?.markKnown?.(id) }, ensureInOrder: (id) => ensureCharacterInOrder(ctx.api, id), isGenerating, Busy,
    build: (all) => buildCardCharacter({ source: bot.character, name: o.name, card, link: o.link, firstMessage: o.first || bot.character.firstMessage || "", lorePicks: o.picks ?? [], withRelationship: o.withRel !== false, characters: all, chatName: o.chatName ?? card.source?.chatName, minGrade: o.minGrade ?? card.source?.minGrade, imageUse: o.imageUse ?? "source", illustrationPath: card.image?.ref, cardAssetKey, withPng: !!o.withPng, copyExtras: !!o.copyExtras }) });
  return created;
}
