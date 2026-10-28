// 이야기 시간 훅 (v1.6.8). 장기기억을 켜든 끄든 독립으로 동작하고, 설정에서 켜고 끈다. 기본 꺼짐.
// 값은 채팅별로 저장한다(dusk.storytime.<봇>.<채팅>). 장기기억 주입도 같은 값을 읽는다.
import { latestStoryState, insertTime, emptyState } from "../engine/storytime.js";

export const STORY_TIME_KEY = "dusk.ui.storyTime";
const stateKey = (chaId, chatId) => `dusk.storytime.${chaId}.${chatId}`;
export async function loadStoryTimeOn(api) {
  try { const raw = await api.pluginStorage.getItem(STORY_TIME_KEY); return raw === "on" || raw === true || raw === "true"; } catch { return false; }
}
export function createStoryTime(api, { log = (...a) => console.log("[Dusk 시간]", ...a) } = {}) {
  let on = false, hooked = false, last = emptyState();
  const read = async (chaId, chatId) => { try { const r = await api.pluginStorage.getItem(stateKey(chaId, chatId)); const v = typeof r === "string" ? JSON.parse(r) : r; return v && typeof v === "object" ? { ...emptyState(), ...v } : null; } catch { return null; } };
  // 장기기억이 쓰는 지금 값 (꺼져 있거나 값이 없으면 null)
  async function current(chaId, chatId) { if (!on) return null; const s = await read(chaId, chatId); return s && (s.date || s.time || s.place) ? s : null; }
  async function beforeRequest(messages, type) {
    try {
      if (!on || (type && type !== "model")) return messages;
      const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
      if (!(ci >= 0) || !(ti >= 0)) return messages;
      const [character, chat] = [await api.getCharacterFromIndex(ci), await api.getChatFromIndex(ci, ti)];
      const state = latestStoryState(chat?.message ?? []);
      last = state;
      if (character && chat && (state.date || state.time || state.place)) {
        const prev = await read(character.chaId, chat.id);
        if (JSON.stringify(prev) !== JSON.stringify(state)) await api.pluginStorage.setItem(stateKey(character.chaId, chat.id), JSON.stringify(state)).catch(() => {});
      }
      return insertTime(messages, state);
    } catch (e) { log("시간 삽입 실패", e?.message ?? e); return messages; }
  }
  async function hook() {
    if (hooked || typeof api.addRisuReplacer !== "function") return hooked;
    try { await api.addRisuReplacer("beforeRequest", beforeRequest); hooked = true; } catch (e) { log("훅 등록 실패", e?.message ?? e); }
    return hooked;
  }
  async function start() { on = await loadStoryTimeOn(api); if (on) await hook(); return on; }
  async function set(v) {
    on = !!v;
    await api.pluginStorage.setItem(STORY_TIME_KEY, on ? "on" : "off");
    if (on) return hook(); // 껐다 켜도 훅은 한 번만 등록하고, 꺼져 있으면 beforeRequest가 그대로 통과시킨다
    return true;
  }
  return { start, set, isOn: () => on, beforeRequest, current, last: () => last };
}
