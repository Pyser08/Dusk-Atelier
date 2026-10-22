var PERSONA_KEY = "rbm:persona:v1";
var isBlocked = (e) => !!e?.hostBlocked || /still loading|not loaded/i.test(String(e?.message ?? e));
export var INJECTED_KEY = "rbm:personaInjected:v1";
export async function loadPersonaMap(api) {
  try {
    const raw = await api.pluginStorage.getItem(PERSONA_KEY);
    const v = raw ? typeof raw === "string" ? JSON.parse(raw) : raw : null;
    if (v && typeof v === "object") return { map: v.map ?? {}, injectedIndex: v.injectedIndex ?? {}, chatInjected: v.chatInjected ?? {} };
  } catch {
  }
  return { map: {}, injectedIndex: {} };
}
export async function savePersonaMap(api, data) {
  await api.pluginStorage.setItem(PERSONA_KEY, JSON.stringify(data));
  return data;
}
export async function setPersonaLink(api, personaId, moduleId, on, orderIds) {
  const data = await loadPersonaMap(api);
  const cur = data.map[personaId] ?? [];
  let next = on ? cur.includes(moduleId) ? cur : [...cur, moduleId] : cur.filter((x) => x !== moduleId);
  if (orderIds) {
    const pos = new Map(orderIds.map((x, i) => [x, i]));
    next = [...next].sort((a, b) => (pos.get(a) ?? 1e9) - (pos.get(b) ?? 1e9));
  }
  if (next.length) data.map[personaId] = next;
  else delete data.map[personaId];
  await savePersonaMap(api, data);
  return data;
}
export var hasPersonaLinks = (data) => Object.keys(data?.map ?? {}).length > 0;
var last = "";
export async function syncPersonaModules(api, { force = false } = {}) {
  const data = await loadPersonaMap(api);
  let inj = await api.pluginStorage.getItem(INJECTED_KEY);
  if (typeof inj === "string") {
    try {
      inj = JSON.parse(inj);
    } catch {
      inj = null;
    }
  }
  const injected = { ...inj && typeof inj === "object" ? inj : {} };
  if (!hasPersonaLinks(data) && !Object.keys(injected).length && !Object.keys(data.chatInjected ?? {}).length) return { changed: false };
  const db = await api.getDatabase(["personas", "selectedPersona"]);
  if (!db) return { changed: false };
  const persona = db.personas?.[db.selectedPersona ?? 0];
  const want = persona?.id ? data.map[persona.id] ?? [] : [];
  const ci = await api.getCurrentCharacterIndex();
  const ch = ci >= 0 ? await api.getCharacterFromIndex(ci) : null;
  if (!ch?.chaId) return { changed: false };
  const key = JSON.stringify([persona?.id, ch.chaId, [...want].sort(), Object.keys(data.chatInjected ?? {}).length ? await api.getCurrentChatIndex() : 0]);
  if (!force && key === last) return { changed: false };
  let changed = false;
  data.chatInjected ??= {};
  const dropFromChat = async (chaId) => {
    const rec = data.chatInjected[chaId];
    if (!rec) return;
    try {
      const chat = await api.getChatFromIndex(rec.idx, rec.chatIdx);
      if (chat && (rec.chatId === void 0 || chat.id === rec.chatId) && Array.isArray(chat.modules)) {
        const n = chat.modules.filter((x) => !rec.ids.includes(x));
        if (n.length !== chat.modules.length) {
          chat.modules = n;
          await api.setChatToIndex(rec.idx, rec.chatIdx, chat);
        }
      }
    } catch (e) {
      console.warn("[Dusk Atelier] 채팅에서 페르소나 모듈 빼기 실패", e);
    }
    delete data.chatInjected[chaId];
    changed = true;
  };
  for (const [chaId, ids] of Object.entries(injected)) {
    if (chaId === ch.chaId) continue;
    const idx = data.injectedIndex[chaId];
    const other = typeof idx === "number" ? await api.getCharacterFromIndex(idx) : null;
    if (other?.chaId === chaId && Array.isArray(other.modules)) {
      const before = other.modules.length;
      other.modules = other.modules.filter((x) => !ids.includes(x));
      if (other.modules.length !== before) {
        try {
          await api.setCharacterToIndex(idx, other);
        } catch (e) {
          console.warn("[Dusk Atelier] 페르소나 모듈 빼기 실패", e);
        }
      }
    }
    delete injected[chaId];
    delete data.injectedIndex[chaId];
    changed = true;
  }
  for (const chaId of Object.keys(data.chatInjected)) if (chaId !== ch.chaId) await dropFromChat(chaId);
  const prev = injected[ch.chaId] ?? [];
  const mods = Array.isArray(ch.modules) ? [...ch.modules] : [];
  const drop = prev.filter((x) => !want.includes(x));
  let next = mods.filter((x) => !drop.includes(x));
  let viaChat = false;
  for (const id of want) if (!next.includes(id)) next.push(id);
  if (JSON.stringify(next) !== JSON.stringify(mods)) {
    try {
      ch.modules = next;
      await api.setCharacterToIndex(ci, ch);
      changed = true;
    } catch (e) {
      if (!isBlocked(e)) throw e;
      viaChat = true;
    }
  }
  if (viaChat || data.chatInjected[ch.chaId]) {
    const chatIdx = await api.getCurrentChatIndex();
    const rec = data.chatInjected[ch.chaId];
    if (rec && (rec.chatIdx !== chatIdx || !want.length)) await dropFromChat(ch.chaId);
    if (viaChat && want.length && chatIdx >= 0) {
      const chat = await api.getChatFromIndex(ci, chatIdx);
      if (chat) {
        const cm = Array.isArray(chat.modules) ? [...chat.modules] : [];
        const old = data.chatInjected[ch.chaId]?.ids ?? [];
        let n = cm.filter((x) => !old.includes(x) || want.includes(x));
        for (const id of want) if (!n.includes(id) && !mods.includes(id)) n.push(id);
        if (JSON.stringify(n) !== JSON.stringify(cm)) {
          chat.modules = n;
          await api.setChatToIndex(ci, chatIdx, chat);
          changed = true;
        }
        data.chatInjected[ch.chaId] = { idx: ci, chatIdx, chatId: chat.id, ids: want.filter((id) => !mods.includes(id)) };
      }
    }
  }
  if (want.length && !viaChat) {
    injected[ch.chaId] = [...want];
    data.injectedIndex[ch.chaId] = ci;
  } else {
    delete injected[ch.chaId];
    delete data.injectedIndex[ch.chaId];
  }
  await api.setDatabaseLite({ [INJECTED_KEY]: injected });
  await savePersonaMap(api, data);
  last = key;
  return { changed, persona: persona?.name, count: want.length };
}
export var resetPersonaSyncCache = () => {
  last = "";
};
