// 공정한 전개 훅 (v1.6.8). 장기기억과 무관하게 설정에서 켜고 끈다. 기본 꺼짐.
import { insertFairness } from "../engine/fairplay.js";

export const FAIR_KEY = "dusk.ui.fairPlay";
export async function loadFairOn(api) {
  try { const raw = await api.pluginStorage.getItem(FAIR_KEY); return raw === "on" || raw === true || raw === "true"; } catch { return false; }
}
export function createFairPlay(api, { log = (...a) => console.log("[Dusk 공정]", ...a) } = {}) {
  let on = false, hooked = false;
  async function beforeRequest(messages, type) {
    try { return !on || (type && type !== "model") ? messages : insertFairness(messages); } catch (e) { log("지침 삽입 실패", e?.message ?? e); return messages; }
  }
  async function hook() {
    if (hooked || typeof api.addRisuReplacer !== "function") return hooked;
    try { await api.addRisuReplacer("beforeRequest", beforeRequest); hooked = true; } catch (e) { log("훅 등록 실패", e?.message ?? e); }
    return hooked;
  }
  async function start() { on = await loadFairOn(api); if (on) await hook(); return on; }
  async function set(v) { on = !!v; await api.pluginStorage.setItem(FAIR_KEY, on ? "on" : "off"); return on ? hook() : true; }
  return { start, set, isOn: () => on, beforeRequest };
}
