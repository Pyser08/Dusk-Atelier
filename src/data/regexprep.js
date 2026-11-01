// v1.8.1 정규식 전처리 공급자: 이 채팅에 적용할 정규식 목록을 모아 준다. 읽기만 하며 실패하면 빈 목록(기억 흐름을 막지 않는다).
import { collectEntries, applyRegex } from "../engine/regexprep.js";

export function createRegexPrep(api, { store, log = (...a) => console.log("[Dusk 정규식]", ...a) } = {}) {
  let dbCache = null, dbAt = 0;
  const readDb = async () => {
    if (dbCache && Date.now() - dbAt < 30000) return dbCache;
    let db = null;
    try { db = typeof api.getDatabase === "function" ? await api.getDatabase(["modules", "enabledModules"]) : null; } catch (e) { log("모듈 읽기 실패", e?.message ?? e); }
    dbCache = { modules: Array.isArray(db?.modules) ? db.modules : [], enabled: Array.isArray(db?.enabledModules) ? db.enabledModules : [] }; dbAt = Date.now();
    return dbCache;
  };
  // 이 채팅에 적용할 정규식. 꺼져 있으면 DB도 읽지 않는다.
  async function entriesFor(character, chat) {
    try {
      const idx = await store.getIndex(), cfg = idx.settings.regex;
      if (!cfg?.on) return [];
      const db = cfg.useModules === false ? { modules: [], enabled: [] } : await readDb();
      const enabledIds = Array.isArray(chat?.modules) && chat.modules.length ? chat.modules : db.enabled;
      return collectEntries({ cfg, character, modules: db.modules, enabledIds });
    } catch (e) { log("정규식 모으기 실패", e?.message ?? e); return []; }
  }
  return { entriesFor, apply: applyRegex, refresh: () => { dbCache = null; } };
}
