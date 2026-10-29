// 장기기억 주입 훅: 요청 사본에만 [Dusk Memory] 블록을 넣는다(저장 데이터 불변).
import { extractMessageText, isUserMessage } from "../engine/chattext.js";
import { buildBlock, insertBlock, injectVerdict, upsertLoreEntry } from "../engine/memoryinject.js";
import { stateText } from "../engine/storytime.js";
import { loadReconciled } from "./memoryload.js";

// onRequest: 메인 모델 요청 직전에 부른다(기다리지 않음). 러너가 '다음 입력 때 직전 응답 확정'을 시작하는 데 쓴다.
export function createMemoryInjector(api, { store, storyNow = null, onRequest = null, log = (...a) => console.log("[Dusk 기억]", ...a) } = {}) {
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
  // 블록을 만든다. 주입하지 않으면 text가 빈 글이고 reason에 이유 코드가 들어간다(화면에서 "왜 빠졌는지" 보여 주는 용도).
  async function compose({ character, chat }, { focus = null, mark = true } = {}) {
    const none = (reason) => ({ text: "", manifest: null, position: null, reason });
    const idx = await store.getIndex();
    if (idx.settings.backend === "off") return none("backend-off");
    if (idx.settings.inject.on === false) return none("inject-off");
    if (idx.bots[String(character.chaId)]?.on === false) return none("bot-off");
    const msgs = chat.message ?? [];
    const folder = await loadReconciled(store, character.chaId, chat.id, msgs);  // 읽기 시점 대조(저장 안 함)
    const userTurns = msgs.filter(isUserMessage).length;
    const verdict = injectVerdict(folder, idx.settings.inject, userTurns);
    if (!verdict.ok) return none(verdict.reason);
    let now = ""; try { const s = await storyNow?.(character.chaId, chat.id); now = s ? stateText(s) : ""; } catch { now = ""; }
    const tail = msgs.slice(-2).map(extractMessageText).join("\n");
    const { text, manifest } = buildBlock(folder, { messageCount: msgs.length, recentText: tail, settings: idx.settings.inject, messages: msgs, focus, storyNow: now });
    if (mark && text && idx.settings.inject.plus !== false && manifest.recordIds?.length) markUsed(character, chat, manifest.recordIds, msgs.length);
    return { text, manifest, position: idx.settings.inject.position, reason: text ? "" : "empty" };
  }
  async function beforeRequest(messages, type, { focus = null } = {}) {
    try {
      if (type && type !== "model") return messages;
      const cur = await current(); if (!cur) return messages;
      const c = await compose(cur, { focus });
      try { Promise.resolve(onRequest?.()).catch(() => {}); } catch { /* 요청을 막지 않는다 */ }
      if (!c?.text) { last = { at: Date.now(), injected: false, manifest: c?.manifest ?? null, reason: c?.reason ?? "" }; return messages; }
      last = { at: Date.now(), injected: true, manifest: c.manifest, text: c.text };
      return insertBlock(messages, c.text, c.position);
    } catch (e) { log("주입 실패", e?.message ?? e); return messages; }
  }
  // 지금 열린 채팅에 다음 요청 때 들어갈 블록을 미리 만들어 본다. 저장 데이터·사용 횟수는 건드리지 않는다.
  async function preview() {
    const cur = await current(); if (!cur) return { ok: false, why: "리스에서 채팅을 연 상태에서 볼 수 있어요." };
    const c = await compose(cur, { mark: false });
    if (!c?.text) return { ok: true, injected: false, manifest: c?.manifest ?? null, reason: c?.reason ?? "" };
    return { ok: true, injected: true, text: c.text, manifest: c.manifest, position: c.position, botId: String(cur.character.chaId), chatId: String(cur.chat.id) };
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
  return { start, stop, beforeRequest, compose, preview, syncLore, current, lastRequest: () => last, mode: () => mode };
}
