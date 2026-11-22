// 장기기억 애드온: ‘나’(페르소나) 위키 문서(순수). 설정 inject.meDoc을 켜면 채팅마다 자동으로 만든다.
// 11-22: 켜면 리수폿 위키에도 나의 인물 문서(페르소나 이름 + {{user}} 별칭)를 만들어 기록 AI가 다른 인물처럼 채운다(기본 성격·수치·감정 등).
// 성인 프로필·몸 상태는 그대로 유저 칸(actor:user, engine/usernsfw.js)에 두고, 장면 계획·주입에서 나를 움직이지 않는다.
export const ME = "{{user}}";
export function ensureMeDoc(folder, { name = "", desc = "", now = Date.now() } = {}) {
  if (!folder || typeof folder !== "object") return false;
  folder.people ??= {};
  let changed = false;
  if (!folder.people[ME]) { folder.people[ME] = { name: ME, aliases: [], pinned: false, records: [] }; changed = true; }
  const n = String(name ?? "").trim().slice(0, 80), d = String(desc ?? "").trim().slice(0, 4000);
  if (!folder.meDoc || folder.meDoc.name !== n || folder.meDoc.desc !== d) { folder.meDoc = { name: n, desc: d, at: now }; changed = true; }
  return changed;
}
export const meVisible = (folder, p) => !!folder?.meDoc && p?.name === ME;

// 리수폿 위키에 나의 인물 문서가 없으면 만든다(위키가 아직 없으면 다음 턴에). 반환: 만들었으면 true
import { createWikiDocument, normalizeWikiScope } from "./pot/wiki-schema.js";
import { userKeySet } from "./memoryuser.js";
const nkey = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
export function findMeWikiDoc(wiki, names = []) {
  const set = userKeySet(names); set.add(nkey(ME));
  return Object.values(wiki?.documents ?? {}).find((d) => d?.type === "Character" && [d.title, ...(d.aliases ?? [])].some((n) => set.has(nkey(n)))) ?? null;
}
export function ensureMeWikiDoc(folder, { name = "", now = new Date().toISOString() } = {}) {
  if (!folder?.wiki?.documents) return false;
  const n = String(name ?? "").trim().slice(0, 80);
  if (findMeWikiDoc(folder.wiki, n ? [n] : [])) return false;
  folder.wiki = createWikiDocument(normalizeWikiScope(folder.wiki), { type: "Character", title: n || ME, aliases: n ? [ME] : [], tags: [], links: [], sections: [], metrics: [] }, { now });
  return true;
}
