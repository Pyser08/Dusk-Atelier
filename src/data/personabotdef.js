// 봇 기본 페르소나 (aibuild 애드온 전용 — 페르소나 공방의 '이 봇 기본 페르소나'를 Dusk 방식으로)
// 봇마다 리스 페르소나 하나를 정해 두면, 그 봇의 채팅 중 페르소나가 연결되지 않은 채팅의 요청 사본에
// 그 페르소나 설명을 넣는다. 설명은 요청 때마다 리스 페르소나에서 읽으므로 페르소나를 고치면 바로 따라간다(자동 갱신).
// 저장된 채팅·봇·페르소나는 바꾸지 않는다(HOST-COMPAT 4). 이름표·이미지는 그대로.
export var BOTDEF_KEY = "dusk.personaBotDefaults";
export var MARK = "[Dusk · bot default persona]";

export async function loadBotDefaults(api) {
  try {
    const raw = await api.pluginStorage.getItem(BOTDEF_KEY);
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
export async function saveBotDefaults(api, map) {
  await api.pluginStorage.setItem(BOTDEF_KEY, JSON.stringify(map ?? {}));
}

// 메시지 목록에 설명 블록 하나를 채팅 기록 앞(첫 memo 달린 user/assistant 앞)에 넣는다. 예전 블록은 지운다.
export function injectBlock(messages, text) {
  const out = (messages ?? []).filter((m) => !(m && m.role === "system" && String(m.content ?? "").startsWith(MARK)));
  if (!text) return out;
  const block = `${MARK}\nThe user's character for this chat is described below. It replaces any other description of the user's character; earlier text may still use another name for the same person, and the name below wins.\n${text}`;
  const at = out.findIndex((m) => m && typeof m.memo === "string" && m.memo && (m.role === "user" || m.role === "assistant"));
  out.splice(at < 0 ? out.length : at, 0, { role: "system", content: block });
  return out;
}

export function createBotDefaults(api, { log = (...a) => console.log("[Dusk Atelier] 봇 기본 페르소나", ...a) } = {}) {
  let map = {}, hooked = false, loaded = false;
  const bot = { ci: null, id: "", name: "" };   // 지금 봇 (getCharacterFromIndex는 카드를 통째로 복사하므로 봇이 바뀔 때만 읽는다)
  async function current() {
    const ci = await api.getCurrentCharacterIndex?.(), chi = await api.getCurrentChatIndex?.();
    if (ci == null || ci < 0) return null;
    const chat = await api.getChatFromIndex?.(ci, chi);
    if (!chat) return null;
    if (bot.ci !== ci) {
      let c = null;
      try { c = await api.getCharacterFromIndex(ci); } catch { /* 봇 정보 없이 */ }
      bot.ci = ci; bot.id = c?.chaId ? String(c.chaId) : ""; bot.name = c?.name ?? "";
    }
    return { ci, chi, chat, botId: bot.id, botName: bot.name };
  }
  async function personaText(pid) {
    const db = await api.getDatabase(["personas", "selectedPersona"]);
    const list = db?.personas ?? [];
    const i = list.findIndex((p) => p?.id === pid);
    if (i < 0) return "";
    if (i === db?.selectedPersona) return "";   // 이미 전역 페르소나로 쓰는 중이면 겹쳐 넣지 않는다
    return String(list[i].personaPrompt ?? "").trim();
  }
  async function beforeRequest(messages, type) {
    try {
      if (type && type !== "model") return messages;
      if (!Object.keys(map).length) return injectBlock(messages, "");
      const cur = await current();
      if (!cur || cur.chat.bindedPersona || !cur.botId || !map[cur.botId]?.pid) return injectBlock(messages, "");
      return injectBlock(messages, await personaText(map[cur.botId].pid));
    } catch (e) {
      log("넣지 못함", e?.message ?? e);
      return messages;
    }
  }
  async function hook() {
    if (hooked || typeof api.addRisuReplacer !== "function") return hooked;
    try { await api.addRisuReplacer("beforeRequest", beforeRequest); hooked = true; } catch (e) { log("훅 등록 실패", e?.message ?? e); }
    return hooked;
  }
  async function start() {
    map = await loadBotDefaults(api);
    loaded = true;
    if (Object.keys(map).length) await hook();
    return map;
  }
  async function set(botId, pid, botName = "") {
    if (!loaded) await start();
    if (!botId) return map;
    if (pid) map = { ...map, [botId]: { pid, bot: botName } };
    else { map = { ...map }; delete map[botId]; }
    await saveBotDefaults(api, map);
    if (Object.keys(map).length) await hook();
    return map;
  }
  async function replaceAll(next) {
    map = { ...(next ?? {}) };
    await saveBotDefaults(api, map);
    if (Object.keys(map).length) await hook();
    return map;
  }
  async function stop() {
    if (hooked && typeof api.removeRisuReplacer === "function") { try { await api.removeRisuReplacer("beforeRequest", beforeRequest); } catch { /* 다음 시작에 정리 */ } }
    hooked = false;
  }
  return { start, set, replaceAll, stop, list: () => ({ ...map }), current, isHooked: () => hooked, beforeRequest };
}
