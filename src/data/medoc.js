// ‘나’ 위키 문서 자동 만들기(설정 inject.meDoc, 기본 꺼짐): 지금 채팅 기억 폴더에 나 문서를 만들고 페르소나가 바뀌면 고친다(AI 호출 없음)
import { personaInfo } from "./profileseed.js";
import { ensureMeDoc, ensureMeWikiDoc, findMeWikiDoc } from "../engine/medoc.js";

export async function syncMeDoc(memory, api, { force = false } = {}) {
  const idx = await memory?.store?.getIndex?.().catch?.(() => null);
  if (!force && idx?.settings?.inject?.meDoc !== true) return false;
  const cur = await memory?.switches?.currentChat?.().catch?.(() => null); if (!cur) return false;
  const p = await personaInfo(api).catch(() => null); if (!p) return false;
  let changed = false;
  const f = await memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null);
  if (f && f.meDoc?.name === (p.name ?? "").trim().slice(0, 80) && f.meDoc?.desc === (p.desc ?? "").trim().slice(0, 4000) && f.people?.["{{user}}"] && (!f.wiki?.documents || findMeWikiDoc(f.wiki, [p.name].filter(Boolean)))) return false;   // 그대로면 쓰지 않음
  // 11-22: 위키 인물 문서도 만들어 기록 AI가 채우게
  await memory.store.updateFolder(cur.chaId, cur.chatId, (g) => { changed = ensureMeDoc(g, { name: p.name, desc: p.desc }); if (ensureMeWikiDoc(g, { name: p.name })) changed = true; });
  return changed;
}
