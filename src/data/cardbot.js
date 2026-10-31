// 카드로 새 봇 객체 만들기. 원본 봇은 수정하지 않고 새 객체만 반환한다.
import { newCharacterBase, uniqueDisplayName } from "../engine/character.js";
import { copyLore, originNote } from "../engine/memorycompose.js";
import { linkLore } from "../engine/card/prompt.js";

// opts: {source, name, card, link, firstMessage, lorePicks, withRelationship, characters, chatName, minGrade,
//        imageUse: "source"|"illustration"|"card"|"none", illustrationPath, cardAssetKey, withPng, copyExtras}
const replaceChar = (value, name) => {
  if (typeof value === "string") return value.replace(/\{\{\s*char\s*\}\}/gi, name);
  if (Array.isArray(value)) return value.map((v) => replaceChar(v, name));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceChar(v, name)]));
  return value;
};

export function buildCardCharacter(opts) {
  const { source = {}, card, link, characters = [] } = opts;
  const c = newCharacterBase({ fields: {}, risuFields: {}, refs: {} });
  c.name = uniqueDisplayName(String(opts.name || `${source.name ?? "새 봇"} · ${card.name}`).trim(), characters);
  const resolvedLink = replaceChar(link, c.name);
  c.desc = replaceChar(resolvedLink.desc, c.name);
  c.firstMessage = replaceChar(opts.firstMessage ?? "", c.name);
  c.creatorNotes = [originNote({ bot: source.name ?? "?", chat: opts.chatName ?? "?", minGrade: opts.minGrade ?? "C" }), `카드: ${card.name} · ${card.grade} · ${link.mode === "fate" ? "운명 연결" : "기억 연결"}`].join("\n");
  c.globalLore = [...copyLore(source.globalLore, opts.lorePicks ?? []), ...linkLore({ link: resolvedLink, name: card.name, withRelationship: opts.withRelationship !== false })];
  // RisuAI 태그: 원본 봇의 태그에 카드 태그 이름을 합친다(중복 제거).
  c.tags = [...new Set([...(Array.isArray(source.tags) ? source.tags : []), ...(card.tags ?? [])].map((t) => String(t).trim()).filter(Boolean))];
  const use = opts.imageUse ?? "source";
  if (use === "source" && source.image) c.image = source.image;
  else if (use === "illustration" && opts.illustrationPath) c.image = opts.illustrationPath;
  else if (use === "card" && opts.cardAssetKey) c.image = opts.cardAssetKey;
  if (opts.withPng && opts.cardAssetKey) c.additionalAssets = [...c.additionalAssets, [`Dusk 카드 · ${card.name}`, opts.cardAssetKey, "png"]];
  if (opts.copyExtras) for (const k of ["customscript", "triggerscript", "modules"]) if (source[k] != null) c[k] = structuredClone(source[k]);
  return c;
}
