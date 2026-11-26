// Dusk Saga → 장기기억 창구(memoryApi)만 쓴다. 장기기억이 없거나 꺼져 있으면 아무것도 하지 않고 게임은 그대로 돈다. AI 호출 없음
import { memState, recordSheets, recordBattle, recordLedger, rpgSection, unitView, seedFromMemory } from "../engine/memlink.js";

export function createMemoryLink(ext, { enabled = () => true, log = () => {} } = {}) {
  const api = () => { if (!enabled()) return null; const M = ext?.get?.("svc", "memoryApi"); return M && M.version >= 1 ? M : null; };
  // 쓰기 직전에 채팅이 바뀌었으면 다른 채팅에 적지 않는다(expect = 전투를 시작한 채팅)
  const write = async (expect, fn) => {
    const M = api(); if (!M) return false;
    try {
      const c = await M.currentChat(); if (!c || (expect && (c.chaId !== expect.chaId || c.chatId !== expect.chatId))) return false;
      let r = false; const ok = await M.update((f) => { if (expect && f.chaId != null && (String(f.chaId) !== String(expect.chaId) || String(f.chatId) !== String(expect.chatId))) return; r = fn(f); }); return ok === false ? false : r;
    } catch (e) { log("장기기억 기록 실패", e?.message ?? e); return false; }
  };
  const read = async (fn, none) => { const M = api(); if (!M) return none; try { const f = await M.folder(); return f ? fn(f) : none; } catch (e) { log("장기기억 읽기 실패", e?.message ?? e); return none; } };
  return {
    ready: () => !!api(), chat: async () => (await api()?.currentChat?.().catch(() => null)) ?? null,
    sheets: (S, why, chat) => write(chat, (f) => recordSheets(f, S, why)), ledger: (L, chat) => write(chat, (f) => recordLedger(f, L)), battle: (S, id, ev, chat) => write(chat, (f) => recordBattle(f, S, id, ev)),
    section: (present) => read((f) => rpgSection(f, present), ""), view: (name) => read((f) => unitView(f, name), null), seed: (name) => read((f) => seedFromMemory(f, name), {}), state: (names) => read((f) => memState(f, names), null),
  };
}
