// 캐시용 프롬프트 배치 런타임 (2.2.6): 설정(dusk.cachelayout)과 지금 채팅의 하이파 V3·키워드 로어북을 모아 engine/cachelayout.js로 옮긴다.
// 요청 직전 훅의 맨 뒤(turninfo)에서 Gemini(리스 자체)·Dusk 프로바이더 요청에만 쓴다. 실패하면 원래 요청 그대로.
import { splitHypa, appendLayout } from "../engine/cachelayout.js";
export const LAYOUT_KEY = "dusk.cachelayout";
export const LAYOUT_DEFAULT = Object.freeze({ hypaSplit: true, append: false });
const isConstant = (e) => !!e?.alwaysActive || e?.mode === "constant";
export function createCacheLayout(api, { log = () => {} } = {}) {
  let cfg = null;
  async function get() { if (cfg) return cfg; try { const r = await api.pluginStorage.getItem(LAYOUT_KEY); const v = typeof r === "string" ? JSON.parse(r) : r; cfg = { ...LAYOUT_DEFAULT, ...(v && typeof v === "object" ? v : {}) }; } catch { cfg = { ...LAYOUT_DEFAULT }; } return cfg; }
  async function set(patch) { cfg = { ...(await get()), ...patch }; await api.pluginStorage.setItem(LAYOUT_KEY, JSON.stringify(cfg)); return cfg; }
  async function context(wantLore) {
    const ci = await api.getCurrentCharacterIndex?.(), ti = await api.getCurrentChatIndex?.();
    if (!(ci >= 0) || !(ti >= 0)) return null;
    const ch = await api.getCharacterFromIndex(ci), chat = ch?.chats?.[ti] ?? await api.getChatFromIndex(ci, ti);
    const lore = [];
    if (wantLore) {
      for (const e of [...(ch?.globalLore ?? []), ...(chat?.localLore ?? [])]) if (!isConstant(e)) lore.push(e.content);
      try { const db = await api.getDatabase(["modules", "enabledModules"]); const ids = new Set([...(db?.enabledModules ?? []), ...(ch?.modules ?? []), ...(chat?.modules ?? [])]);
        for (const m of db?.modules ?? []) if (ids.has(m.id)) for (const e of m.lorebook ?? []) if (!isConstant(e)) lore.push(e.content); } catch { /* 모듈 없음 */ }
    }
    return { hypa: chat?.hypaV3Data ?? null, lore };
  }
  // 반환: {messages, info}
  async function apply(messages) {
    try {
      const c = await get(); if (!c.hypaSplit && !c.append) return { messages, info: null };
      const x = await context(c.append); if (!x) return { messages, info: null };
      if (c.append) { const r = appendLayout(messages, { keywordLore: x.lore, hypaData: c.hypaSplit ? x.hypa : null }); return { messages: r.messages, info: { lore: r.lore, moved: r.moved } }; }
      const r = splitHypa(messages, x.hypa); return { messages: r.messages, info: { moved: r.moved } };
    } catch (e) { log("배치 실패", e?.message ?? e); return { messages, info: null }; }
  }
  return { get, set, apply };
}
