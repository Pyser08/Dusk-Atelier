// 공정한 전개 훅 (v1.6.8). 장기기억과 무관하게 설정에서 켜고 끈다. 기본 꺼짐.
// 유저 편향 없애기(코드 주사위): 공정한 전개가 켜져 있을 때만 작동. 기본 꺼짐, 결과 처리 기본은 '재해석'.
import { insertFairness, makeDice, turnKey, resolveDice, normalizeCuts, normalizeCount, DICE_MODES, DICE_LEVEL_IDS } from "../engine/fairplay.js";

export const FAIR_KEY = "dusk.ui.fairPlay";
export const DICE_KEY = "dusk.ui.fairDice";
export const DICE_MODE_KEY = "dusk.ui.fairDiceMode";
export const DICE_LEVEL_KEY = "dusk.ui.fairDiceLevel";   // weak | normal | strong | custom (기본 normal)
export const DICE_CUTS_KEY = "dusk.ui.fairDiceCuts";     // custom일 때만 쓰는 난이도 수치(JSON)
export const DICE_COUNT_KEY = "dusk.ui.fairDiceCount";   // custom일 때만 쓰는 굴림 개수
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
export async function loadDiceLevel(api) {
  try { const m = await api.pluginStorage.getItem(DICE_LEVEL_KEY); return DICE_LEVEL_IDS.includes(m) || m === "custom" ? m : "normal"; } catch { return "normal"; }
}
export async function loadDiceCustom(api) {
  let cuts = null, count = null;
  try { cuts = JSON.parse(await api.pluginStorage.getItem(DICE_CUTS_KEY)); } catch { /* 기본값 */ }
  try { count = await api.pluginStorage.getItem(DICE_COUNT_KEY); } catch { /* 기본값 */ }
  return { cuts: normalizeCuts(cuts), count: normalizeCount(count) };
}
// 주사위 기록 (1.8.3): 굴릴 때마다 채팅과 함께 남긴다(최근 300). 화면 '최근 판정 기록'이 읽는다.
export const DICE_LOG_KEY = "dusk-dice-log";
const DICE_LOG_MAX = 300;
export async function loadDiceLog(api) {
  try { const raw = await api.pluginStorage.getItem(DICE_LOG_KEY); const v = typeof raw === "string" ? JSON.parse(raw) : raw; return Array.isArray(v?.recs) ? v.recs : []; } catch { return []; }
}
export async function clearDiceLog(api) { await api.pluginStorage.setItem(DICE_LOG_KEY, JSON.stringify({ v: 1, recs: [] })); }
export function createFairPlay(api, { log = (...a) => console.log("[Dusk 공정]", ...a), rng, chatOf = null, saveMs = 1500 } = {}) {
  // 기록은 요청을 붙잡지 않게 뒤에서 모아 저장한다
  let queue = [], saveTimer = null, saving = Promise.resolve();
  const flushLog = () => {
    clearTimeout(saveTimer); saveTimer = null;
    if (!queue.length) return saving;
    const add = queue; queue = [];
    saving = saving.then(async () => { const recs = await loadDiceLog(api); recs.push(...add); await api.pluginStorage.setItem(DICE_LOG_KEY, JSON.stringify({ v: 1, recs: recs.slice(-DICE_LOG_MAX) })); }).catch((e) => log("주사위 기록 저장 실패", e?.message ?? e));
    return saving;
  };
  const record = (d) => {
    (async () => {
      let c = null; try { c = chatOf ? await chatOf() : null; } catch { /* 채팅 정보 없이 */ }
      queue.push({ at: Date.now(), rolls: d.rolls, cuts: d.cuts, mode: d.mode, ...(c ? { chaId: c.chaId, chatId: c.chatId, botName: c.botName, chatName: c.chatName } : {}) });
      clearTimeout(saveTimer); saveTimer = setTimeout(flushLog, saveMs);
    })();
  };
  let sameTurn = null, last = null, on = false, hooked = false, dice = false, mode = "reinterpret", level = "normal", custom = { cuts: null, count: 3 };
  async function beforeRequest(messages, type) {
    try {
      if (!on || (type && type !== "model")) return messages;
      let d = null;
      if (dice) {
        // 같은 턴을 다시 생성(리롤)·재시도하면 같은 주사위 값을 쓴다: 마음에 드는 판정이 나올 때까지 돌리는 걸 막고 프롬프트도 그대로 둔다
        const rd = resolveDice(level, custom.cuts, custom.count), tk = turnKey(messages);
        const same = sameTurn && sameTurn.key === tk && sameTurn.rolls.length === rd.count && Date.now() - sameTurn.at < 6 * 3600e3;
        d = makeDice(messages, mode, rng, { ...rd, ...(same ? { rolls: sameTurn.rolls } : {}) });
        if (!same) { sameTurn = { key: tk, rolls: d.rolls, at: Date.now() }; record(d); }
        last = { at: Date.now(), rolls: d.rolls, cuts: d.cuts, mode: d.mode };   // 응답 아래 '주사위 결과 표시'용
      }
      return insertFairness(messages, { dice: d });
    } catch (e) { log("지침 삽입 실패", e?.message ?? e); return messages; }
  }
  async function hook() {
    if (hooked || typeof api.addRisuReplacer !== "function") return hooked;
    try { await api.addRisuReplacer("beforeRequest", beforeRequest); hooked = true; } catch (e) { log("훅 등록 실패", e?.message ?? e); }
    return hooked;
  }
  async function start() { on = await loadFairOn(api); dice = await loadDiceOn(api); mode = await loadDiceMode(api); level = await loadDiceLevel(api); custom = await loadDiceCustom(api); if (on) await hook(); return on; }
  async function set(v) { on = !!v; await api.pluginStorage.setItem(FAIR_KEY, on ? "on" : "off"); return on ? hook() : true; }
  async function setDice(v) { dice = !!v; await api.pluginStorage.setItem(DICE_KEY, dice ? "on" : "off"); return dice; }
  async function setDiceMode(m) { mode = DICE_MODES.includes(m) ? m : "reinterpret"; await api.pluginStorage.setItem(DICE_MODE_KEY, mode); return mode; }
  async function setDiceLevel(l) { level = DICE_LEVEL_IDS.includes(l) ? l : "normal"; await api.pluginStorage.setItem(DICE_LEVEL_KEY, level); return level; }
  // 고급 직접 입력: 수치·개수를 저장하고 강도를 'custom'으로 바꾼다.
  async function setDiceCustom(cuts, count) {
    custom = { cuts: normalizeCuts(cuts), count: normalizeCount(count) }; level = "custom";
    await api.pluginStorage.setItem(DICE_CUTS_KEY, JSON.stringify(custom.cuts)); await api.pluginStorage.setItem(DICE_COUNT_KEY, String(custom.count)); await api.pluginStorage.setItem(DICE_LEVEL_KEY, level);
    return { ...custom };
  }
  return { start, set, setDice, setDiceMode, setDiceLevel, setDiceCustom, diceLevel: () => level, lastDice: () => last, flushLog: async () => { await new Promise((r) => setTimeout(r, 0)); return flushLog(); }, diceCustom: () => ({ ...custom }), isOn: () => on, isDiceOn: () => dice, diceMode: () => mode, beforeRequest };
}
