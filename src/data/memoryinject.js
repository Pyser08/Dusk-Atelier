// 장기기억 주입 훅: 요청 사본에만 [Dusk Memory] 블록을 넣는다(저장 데이터 불변).
import { extractMessageText, isUserMessage } from "../engine/chattext.js";
import { buildBlock, insertBlock, shouldInject, upsertLoreEntry } from "../engine/memoryinject.js";

export function createMemoryInjector(api, { store, log = (...a) => console.log("[Dusk 기억]", ...a) } = {}) {
  let last = null, mode = "none";

  async function current() {
    const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
    if (!(ci >= 0) || !(ti >= 0)) return null;
    const character = await api.getCharacterFromIndex(ci), chat = await api.getChatFromIndex(ci, ti);
    return character && chat ? { ci, ti, character, chat } : null;
  }
  // 블록을 만든다. 주입 조건이 아니면 null.
  async function compose({ character, chat }) {
    const idx = await store.getIndex();
    if (idx.settings.backend === "off" || idx.settings.inject.on === false || idx.bots[String(character.chaId)]?.on === false) return null;
    const folder = await store.getFolder(String(character.chaId), String(chat.id));
    const msgs = chat.message ?? [];
    const userTurns = msgs.filter(isUserMessage).length;
    if (!shouldInject(folder, idx.settings.inject, userTurns)) return null;
    const tail = msgs.slice(-2).map(extractMessageText).join("\n");
    const { text, manifest } = buildBlock(folder, { messageCount: msgs.length, recentText: tail, settings: idx.settings.inject });
    return { text, manifest, position: idx.settings.inject.position };
  }
  async function beforeRequest(messages, type) {
    try {
      if (type && type !== "model") return messages;
      const cur = await current(); if (!cur) return messages;
      const c = await compose(cur);
      if (!c?.text) { last = { at: Date.now(), injected: false, manifest: c?.manifest ?? null }; return messages; }
      last = { at: Date.now(), injected: true, manifest: c.manifest, text: c.text };
      return insertBlock(messages, c.text, c.position);
    } catch (e) { log("주입 실패", e?.message ?? e); return messages; }
  }
  // 훅이 없는 환경: 분석 뒤 채팅 localLore의 [Dusk 기억] 항목을 갱신.
  async function syncLore(ci, ti) {
    const cur = { character: await api.getCharacterFromIndex(ci), chat: await api.getChatFromIndex(ci, ti) };
    if (!cur.chat) return false;
    const c = await compose(cur);
    const next = upsertLoreEntry(cur.chat.localLore, c?.text ?? "");
    if (JSON.stringify(next) === JSON.stringify(cur.chat.localLore ?? [])) return false;
    await api.setChatToIndex(ci, ti, { ...cur.chat, localLore: next });
    return true;
  }
  async function start() {
    if (typeof api.addRisuReplacer === "function") {
      try { await api.addRisuReplacer("beforeRequest", beforeRequest); mode = "hook"; return "hook"; } catch (e) { log("beforeRequest 훅 등록 실패", e?.message ?? e); }
    }
    mode = "lore"; return "lore";
  }
  return { start, beforeRequest, compose, syncLore, current, lastRequest: () => last, mode: () => mode };
}
