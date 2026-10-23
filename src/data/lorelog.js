// 로어북 로그 런타임
// · 요청 직전(beforeRequest): 보낼 프롬프트에 어떤 로어북 본문이 들어 있는지 찾아 '대기 기록'을 만든다
//   (리스 버전에 따라 이 훅이 없으면 출력 때 키·Dusk 규칙으로 추정한다)
// · 응답이 나오면(output): 응답 앞부분을 열쇠로 기록에 붙여 저장한다
// · 화면에 그릴 때(display): 열쇠가 맞는 응답 아래에 '📖 로어북 N개' 접는 버튼을 붙인다 (저장된 채팅은 건드리지 않음)
import { detectInPrompt, estimateUsed, headKey, loreButtonHtml, matchRecord } from '../engine/lorelog.js';
import { loadLoreSettings } from './lorerules.js';

export const LORE_LOG_KEY = "dusk-lore-log";
const MAX_RECS = 300;
const MAX_ENTRIES = 80;

export async function loadLoreLog(api) {
  try {
    const raw = await api.pluginStorage.getItem(LORE_LOG_KEY);
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(v?.recs) ? v.recs : [];
  } catch {
    return [];
  }
}
export async function clearLoreLog(api) {
  await api.pluginStorage.setItem(LORE_LOG_KEY, JSON.stringify({ v: 1, recs: [] }));
}

const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("\n") : String(c ?? "");

export function createLoreLog(api, { loreRuntime, log = (...a) => console.log("[Dusk 로그]", ...a) } = {}) {
  let recs = null;
  let pending = null;
  let saveTimer = null;
  let settings = null;

  const ensure = async () => recs ??= await loadLoreLog(api);
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api.pluginStorage.setItem(LORE_LOG_KEY, JSON.stringify({ v: 1, recs: (recs ?? []).slice(-MAX_RECS) })).catch((e) => log("저장 실패", e?.message ?? e));
    }, 600);
  };
  const conf = async () => settings ??= await loadLoreSettings(api);

  // 지금 채팅에 걸린 로어북을 출처 이름과 함께 모은다
  async function gather() {
    const charIdx = await api.getCurrentCharacterIndex();
    const chatIdx = await api.getCurrentChatIndex();
    if (!(charIdx >= 0) || !(chatIdx >= 0)) return null;
    const ch = await api.getCharacterFromIndex(charIdx);
    const chat = ch?.chats?.[chatIdx] ?? await api.getChatFromIndex(charIdx, chatIdx);
    const tagged = [];
    for (const e of ch?.globalLore ?? []) tagged.push({ entry: e, src: "캐릭터" });
    for (const e of chat?.localLore ?? []) tagged.push({ entry: e, src: "채팅" });
    let user = "";
    try {
      const db = await api.getDatabase(["modules", "enabledModules", "username"]);
      user = db?.username ?? "";
      const ids = new Set([...(db?.enabledModules ?? []), ...(ch?.modules ?? []), ...(chat?.modules ?? [])]);
      for (const m of db?.modules ?? []) {
        if (!ids.has(m.id)) continue;
        for (const e of m.lorebook ?? []) tagged.push({ entry: e, src: `모듈 · ${m.name || "이름 없음"}` });
      }
    } catch {
    }
    const msgs = (chat?.message ?? []).map((m) => ({ role: m.role === "user" ? "user" : "char", data: m.data ?? "" }));
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.data ?? "";
    return {
      tagged,
      msgs,
      names: { char: ch?.name ?? "", user },
      depth: Number(ch?.loreSettings?.scanDepth) || 5,
      meta: { char: ch?.name ?? "", chatId: chat?.id ?? `${charIdx}:${chatIdx}`, chat: chat?.name ?? "", input: String(lastUser).slice(0, 200), turn: msgs.filter((m) => m.role === "user").length }
    };
  }
  const duskFired = () => Object.fromEntries((loreRuntime?.lastFired ?? []).map((x) => [x.name, x.why]));

  // 요청 직전: 프롬프트를 보고 기록을 만든다. 메시지는 그대로 돌려준다
  async function beforeRequest(messages, type) {
    try {
      if (type && type !== "model") return messages;
      if ((await conf()).log === false) return messages;
      const g = await gather();
      if (!g) return messages;
      const prompt = (Array.isArray(messages) ? messages : []).map((m) => textOf(m?.content)).join("\n");
      pending = { ...g.meta, at: Date.now(), method: "prompt", entries: detectInPrompt(g.tagged, prompt, { names: g.names, duskFired: duskFired() }).slice(0, MAX_ENTRIES) };
    } catch (e) {
      log("프롬프트 확인 실패", e?.message ?? e);
    }
    return messages;
  }

  // 응답: 기록에 응답 열쇠를 붙여 저장 (스트리밍 중 여러 번 불려도 같은 기록을 갱신)
  async function onOutput(text) {
    try {
      if ((await conf()).log === false) return text;
      const head = headKey(text);
      if (head.length < 4) return text;
      await ensure();
      let rec = pending && Date.now() - pending.at < 10 * 60e3 ? pending : null;
      // 같은 요청의 응답이 이어서 들어옴(스트리밍): 앞부분이 이어지면 같은 기록
      if (rec?.id && (head.startsWith(rec.head) || rec.head.startsWith(head))) {
        rec.head = head;
        save();
        return text;
      }
      if (!rec || rec.id) {
        // 프롬프트 훅이 없는 리스(또는 훅 없이 다시 생성): 키·Dusk 규칙으로 추정
        const g = await gather();
        if (!g) return text;
        rec = { ...g.meta, at: Date.now(), method: "estimate", entries: estimateUsed(g.tagged, g.msgs, { depth: g.depth, duskFired: duskFired() }).slice(0, MAX_ENTRIES) };
        pending = rec;
      }
      rec.id = `${rec.at.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      rec.head = head;
      recs.push(rec);
      if (recs.length > MAX_RECS) recs.splice(0, recs.length - MAX_RECS);
      save();
    } catch (e) {
      log("기록 실패", e?.message ?? e);
    }
    return text;
  }

  // 화면: 맞는 기록이 있으면 버튼을 붙인다
  async function onDisplay(text) {
    try {
      if (!recs) return text;
      const s = await conf();
      if (s.button === false) return text;
      if (typeof text !== "string" || text.includes('x-dusk="lore"')) return text;
      const r = matchRecord(recs, text);
      return r ? text + loreButtonHtml(r) : text;
    } catch {
      return text;
    }
  }

  async function start() {
    await ensure().catch(() => recs = []);
    if (typeof api.addRisuReplacer === "function") {
      try {
        await api.addRisuReplacer("beforeRequest", beforeRequest);
      } catch (e) {
        log("프롬프트 훅을 쓸 수 없어 추정으로 기록해요", e?.message ?? e);
      }
    }
    await api.addRisuScriptHandler("output", onOutput);
    await api.addRisuScriptHandler("display", onDisplay);
  }

  return {
    start,
    setSettings(v) {
      settings = { ...(settings ?? {}), ...v };
    },
    async list() {
      return [...await ensure()];
    },
    async clear() {
      recs = [];
      pending = null;
      await clearLoreLog(api);
    },
    // 시험용
    beforeRequest,
    onOutput,
    onDisplay
  };
}
