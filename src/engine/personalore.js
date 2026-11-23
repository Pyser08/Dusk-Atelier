// 11-23 장기기억(설정 inject.personaLore, 기본 꺼짐): 채팅 도중 페르소나를 바꾸면 옛 페르소나 정보를 봇 로어북 항목으로 넣는다(순수).
// 옛 페르소나는 이제 {{user}}가 아니라 이야기 속 다른 인물이라, 설명 안의 {{user}}는 그 이름으로 바꿔 지운다.
// 표식(extentions.da_wiki = "persona:이름")으로 같은 페르소나는 다시 넣어도 그 항목만 갱신한다(wikilore.upsertWikiLore).
import { WIKI_LORE_MARK } from "./wikilore.js";

const USER_RE = /\{\{\s*(?:user|persona)\s*\}\}/gi;
export const stripUserTag = (text, name) => String(text ?? "").replace(USER_RE, String(name ?? "").trim());

// name: 옛 페르소나 이름, desc: 그 페르소나 설명(personaPrompt). 반환: 로어북 항목 또는 null(설명이 비었으면)
export function personaLoreEntry(name, desc, { maxChars = 3000 } = {}) {
  const n = String(name ?? "").trim(); if (!n || /^\{\{.*\}\}$/.test(n)) return null;
  const body = stripUserTag(desc, n).replace(/\r/g, "").trim();
  if (!body) return null;
  const content = `[인물 정보: ${n}]\n${body.length > maxChars ? body.slice(0, maxChars) + "…" : body}`;
  return { key: n, secondkey: "", insertorder: 100, comment: `[Dusk 옛 페르소나] ${n}`, content, mode: "normal", alwaysActive: false, selective: false, useRegex: false, extentions: { [WIKI_LORE_MARK]: `persona:${n}` } };
}
