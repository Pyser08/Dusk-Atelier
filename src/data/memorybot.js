// 장기기억에서 합성한 새 봇 객체 만들기. 원본 봇은 수정하지 않는다(새 객체만 반환).
import { newCharacterBase, uniqueDisplayName } from "../engine/character.js";
import { copyLore, originNote, relationLore } from "../engine/memorycompose.js";

// opts: {name, desc, firstMessage, relationship, source(원본 봇), records, mainName, lorePicks, asAlways, perRecord, useImage, copyExtras, minGrade, chatName, characters}
export function buildMemoryCharacter(opts) {
  const { source = {}, characters = [] } = opts;
  const c = newCharacterBase({ fields: {}, risuFields: {}, refs: {} });
  c.name = uniqueDisplayName(String(opts.name || source.name || "새 봇").trim(), characters);
  c.desc = opts.desc ?? "";
  c.firstMessage = opts.firstMessage ?? "";
  c.creatorNotes = originNote({ bot: source.name ?? "?", chat: opts.chatName ?? "?", minGrade: opts.minGrade ?? "C" });
  const lore = [...copyLore(source.globalLore, opts.lorePicks ?? [])];
  lore.push(...relationLore({ relationship: opts.asAlways === false ? "" : opts.relationship, name: opts.mainName ?? c.name, records: opts.records ?? [], perRecord: opts.perRecord !== false }));
  c.globalLore = lore;
  if (opts.useImage && source.image) c.image = source.image;
  if (opts.copyExtras) {
    for (const k of ["customscript", "triggerscript", "modules"]) if (source[k] != null) c[k] = structuredClone(source[k]);
  }
  return c;
}
