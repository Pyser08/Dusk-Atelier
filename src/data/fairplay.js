// 공정한 전개 훅 (v1.6.8). 장기기억과 무관하게 설정에서 켜고 끈다. 기본 꺼짐.
// 유저 편향 없애기(코드 주사위): 공정한 전개가 켜져 있을 때만 작동. 기본 꺼짐, 결과 처리 기본은 '재해석'.
import { insertFairness, makeDice, DICE_MODES } from "../engine/fairplay.js";

export const FAIR_KEY = "dusk.ui.fairPlay";
export const DICE_KEY = "dusk.ui.fairDice";
export const DICE_MODE_KEY = "dusk.ui.fairDiceMode";
const isOn = (raw) => raw === "on" || raw === true || raw === "true";
export async function loadFairOn(api) {
  try { return isOn(await api.pluginStorage.getItem(FAIR_KEY)); } catch { return false; }
}
export async function loadDiceOn(api) {
  try { return isOn(await api.pluginStorage.getItem(DICE_KEY)); } catch { return false; }
}
export async function loadDiceMode(api) {
  try { const m = await api.pluginStorage.getItem(DICE_MODE_KEY); return DICE_MODES.includes(m) ? m : "reinterpret"; } catch { return "reinterpret"; }
}
export function createFairPlay(api, { log = (...a) => console.log("[Dusk 공정]", ...a), rng } = {}) {
  let on = false, hooked = false, dice = false, mode = "reinterpret";
  async function beforeRequest(messages, type) {
    try {
      if (!on || (type && type !== "model")) return messages;
      return insertFairness(messages, { dice: dice ? makeDice(messages, mode, rng) : null });
    } catch (e) { log("지침 삽입 실패", e?.message ?? e); return messages; }
  }
  async function hook() {
    if (hooked || typeof api.addRisuReplacer !== "function") return hooked;
    try { await api.addRisuReplacer("beforeRequest", beforeRequest); hooked = true; } catch (e) { log("훅 등록 실패", e?.message ?? e); }
    return hooked;
  }
  async function start() { on = await loadFairOn(api); dice = await loadDiceOn(api); mode = await loadDiceMode(api); if (on) await hook(); return on; }
  async function set(v) { on = !!v; await api.pluginStorage.setItem(FAIR_KEY, on ? "on" : "off"); return on ? hook() : true; }
  async function setDice(v) { dice = !!v; await api.pluginStorage.setItem(DICE_KEY, dice ? "on" : "off"); return dice; }
  async function setDiceMode(m) { mode = DICE_MODES.includes(m) ? m : "reinterpret"; await api.pluginStorage.setItem(DICE_MODE_KEY, mode); return mode; }
  return { start, set, setDice, setDiceMode, isOn: () => on, isDiceOn: () => dice, diceMode: () => mode, beforeRequest };
}
