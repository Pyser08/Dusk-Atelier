// 로어북 규칙 런타임
// 사용자가 입력하면(리스가 프롬프트를 조립하기 전) 규칙을 평가해 채팅 변수(da_xxxx)를 1/0으로 쓴다.
// 관리 항목은 '@@activate + {{#if {{getvar::da_xxxx}}}}'로 감싸져 있어서, 리스가 평소대로 CBS 파싱·배치·토큰 계산을 한다.
// - 요청 훅을 쓰지 않으므로 추가 권한이 필요 없다.
// - 발동 기록은 채팅 변수 da_state에 둔다. 채팅을 복사·분기하면 기록도 따라가고, 현재 턴 이상 기록은 무시하므로 되돌리기에도 맞다.
// - 다시 생성(리롤)은 입력이 없으므로 직전 결정이 그대로 쓰인다.
import { STATE_VAR, collectManaged, evaluate, gateValues } from '../engine/lorerules.js';

export function createLoreRuntime(api, { log = (...a) => console.log("[Dusk 규칙]", ...a) } = {}) {
  let lastFired = [];

  async function loreEntries(charIdx, chatIdx) {
    if (typeof api.getCurrentLorebookEntries === "function") {
      try {
        const r = await api.getCurrentLorebookEntries();
        if (Array.isArray(r)) return r;
      } catch {
      }
    }
    const ch = await api.getCharacterFromIndex(charIdx);
    return [...(ch?.globalLore ?? []), ...(ch?.chats?.[chatIdx]?.localLore ?? [])];
  }

  // 순수 계산: 채팅과 새 입력으로 바뀔 scriptstate 조각을 돌려준다 (테스트용으로도 씀)
  function decide(entries, chat, input) {
    const items = collectManaged(entries);
    if (!items.length) return null;
    const msgs = (chat?.message ?? []).map((m) => ({ role: m.role === "user" ? "user" : "char", data: m.data ?? "" }));
    if (input !== void 0 && input !== null) msgs.push({ role: "user", data: String(input) });
    const turn = msgs.filter((m) => m.role === "user").length;
    const ss = chat?.scriptstate ?? {};
    let state = {};
    try {
      state = JSON.parse(String(ss["$" + STATE_VAR] ?? "{}")) || {};
    } catch {
    }
    const res = evaluate({ items, messages: msgs, turn, state, vars: ss });
    const patch = { ["$" + STATE_VAR]: JSON.stringify(res.state) };
    for (const [k, v] of Object.entries(gateValues(items, res.fired))) patch["$" + k] = v;
    return { patch, fired: res.fired, turn };
  }

  async function onInput(text) {
    try {
      const charIdx = await api.getCurrentCharacterIndex();
      const chatIdx = await api.getCurrentChatIndex();
      if (!(charIdx >= 0) || !(chatIdx >= 0)) return text;
      const entries = await loreEntries(charIdx, chatIdx);
      if (!collectManaged(entries).length) return text;
      const chat = await api.getChatFromIndex(charIdx, chatIdx);
      if (!chat) return text;
      const d = decide(entries, chat, text);
      if (!d) return text;
      chat.scriptstate = { ...(chat.scriptstate ?? {}), ...d.patch };
      await api.setChatToIndex(charIdx, chatIdx, chat);
      lastFired = d.fired.map((a) => ({ name: a.entry.comment || a.rid, why: a.why }));
      log(`턴 ${d.turn}: ${lastFired.length ? lastFired.map((x) => `${x.name}(${x.why})`).join(", ") : "켜진 항목 없음"}`);
    } catch (e) {
      log("규칙 적용 실패 — 이번 턴은 직전 결정을 그대로 씀", e?.message ?? e);
    }
    return text;
  }

  async function start() {
    await api.addRisuScriptHandler("input", onInput);
  }

  return { start, decide, onInput, get lastFired() {
    return lastFired;
  } };
}
