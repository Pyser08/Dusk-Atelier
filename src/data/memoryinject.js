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
  // 기억 강화: 이번 요청에 실제로 들어간 기록의 사용 횟수(u)와 마지막 사용 위치(lu)를 올린다. 요청을 막지 않게 기다리지 않는다.
  function markUsed(character, chat, ids, count) {
    const set = new Set(ids);
    store.updateFolder(String(character.chaId), String(chat.id), (f) => {
      for (const p of Object.values(f.people ?? {})) for (const r of p.records ?? []) if (set.has(r.id) && (r.lu ?? -99) < count - 2) { r.u = (r.u ?? 0) + 1; r.lu = count; }
    }).catch((e) => log("사용 기록 실패", e?.message ?? e));
  }
  // 블록을 만든다. 주입 조건이 아니면 null.
  async function compose({ character, chat }, { focus = null } = {}) {
    const idx = await store.getIndex();
    if (idx.settings.backend === "off" || idx.settings.inject.on === false || idx.bots[String(character.chaId)]?.on === false) return null;
    const folder = await store.getFolder(String(character.chaId), String(chat.id));
    const msgs = chat.message ?? [];
    const userTurns = msgs.filter(isUserMessage).length;
    if (!shouldInject(folder, idx.settings.inject, userTurns)) return null;
    const tail = msgs.slice(-2).map(extractMessageText).join("\n");
    const { text, manifest } = buildBlock(folder, { messageCount: msgs.length, recentText: tail, settings: idx.settings.inject, messages: msgs, focus });
    if (text && idx.settings.inject.plus !== false && manifest.recordIds?.length) markUsed(character, chat, manifest.recordIds, msgs.length);
    return { text, manifest, position: idx.settings.inject.position };
  }
  async function beforeRequest(messages, type, { focus = null } = {}) {
    try {
      if (type && type !== "model") return messages;
      const cur = await current(); if (!cur) return messages;
      const c = await compose(cur, { focus });
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
  // v1.6.4: 턴 흐름이 요청 직전 훅 하나로 위키·Dusk 블록을 같이 넣을 때는 이 훅을 내려 이중 주입을 막는다.
  async function stop() {
    if (mode !== "hook") return false;
    try { await api.removeRisuReplacer?.("beforeRequest", beforeRequest); mode = "none"; return true; } catch (e) { log("beforeRequest 훅 해제 실패", e?.message ?? e); return false; }
  }
  return { start, stop, beforeRequest, compose, syncLore, current, lastRequest: () => last, mode: () => mode };
}
