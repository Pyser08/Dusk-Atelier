// 장기기억 v2 저장소: 인덱스 + 폴더별 키 분할, 직렬 쓰기 큐, v1 마이그레이션.
import { hashText } from "../engine/chattext.js";
import { pruneRecords } from "../engine/memorygrade.js";

export const INDEX_KEY = "dusk.mem.v2.index";
export const FOLDER_PREFIX = "dusk.mem.v2.f.";
export const EXT_PREFIX = "dusk.mem.v2.ext.";
export const LEGACY_KEY = "dusk.episodic-memory.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  autoRecord: true, confirm: "next", startTurn: 1, debounceSec: 4, everyN: 1, minChars: 120, personCap: 300,  // confirm: next=다음 입력을 보낼 때 직전 응답을 확정해 기록(리롤 중인 응답은 건드리지 않음) | now=응답 직후
  model: { mode: "memory" }, modelTimeoutSec: 600, backend: "auto", potMode: true,
  inject: { on: true, m1: true, fromTurn: 1, targetTokens: 1200, capTokens: 2500, sceneTokens: 300, eventTokens: 600, recentSkip: 8, position: "beforeLastUser", plus: true, forgetAfter: 150, knowTokens: 160, openTokens: 160, relTokens: 140, srcTokens: 300 },
  loreRef: { on: false, tokens: 600 },
  // v1.6.4 턴 흐름: on=리수폿 인물 위키·고르기·정리 노트를 Dusk 기록과 한 흐름으로 돌림, mode=fast(키워드 고르기·호출 1회) | accurate(고르기+정리 노트)
  flow: { on: false, mode: "fast", recallTokens: 700 }
});
const newIndex = () => ({ v: 2, settings: structuredClone(DEFAULT_SETTINGS), bots: {}, folders: {}, status: { hook: "pending", processed: 0, lastSuccessAt: 0, lastError: "" } });

export const personKey = (name) => String(name ?? "").toLowerCase().replace(/\s+/g, "");
export const newId = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const folderIdOf = (chaId, chatId) => { const s = String(chaId) + "::" + String(chatId); return hashText(s, 400) + hashText([...s].reverse().join(""), 400); };
export const emptyFolder = (chaId, chatId, extra = {}) => ({ v: 2, chaId: String(chaId), chatId: String(chatId), botName: "", chatName: "", chatIndex: 0, people: {}, scenes: [], cursor: null, ...extra });

export function countsOf(folder) {
  const people = Object.values(folder.people ?? {});
  return { people: people.length, records: people.reduce((n, p) => n + (p.records ?? []).filter((r) => !r.orphan).length, 0), scenes: (folder.scenes ?? []).filter((s) => !s.orphan).length };
}

const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw && typeof raw === "object" ? raw : null; } catch { return null; } };

// v1(단일 JSON, E~S) → v2 폴더 목록. 앵커가 없으므로 legacy:true.
export function migrateV1(old) {
  const out = [];
  for (const f of Object.values(old?.folders ?? {})) {
    if (!f?.charId || f.chatId == null) continue;
    const folder = emptyFolder(f.charId, f.chatId, { botName: f.charName ?? "", chatName: f.chatName ?? "", chatIndex: Number(f.chatIndex) || 0 });
    for (const [k, person] of Object.entries(f.characters ?? {})) {
      const key = personKey(person?.name ?? k); if (!key) continue;
      folder.people[key] = { name: String(person.name ?? k), aliases: [], pinned: false, records: (person.records ?? []).map((r) => ({
        id: r.id || newId("r"), at: null, h: null, act: String(r.action ?? "").slice(0, 80),
        g: r.grade === "E" ? "D" : ["D", "C", "B", "A", "S"].includes(r.grade) ? r.grade : "D",
        score: null, p: null, s: null, r: null, sit: r.situationId ?? null, user: false, pin: false, at_ms: r.createdAt ?? 0, orphan: false, legacy: true
      })) };
    }
    folder.scenes = (f.situations ?? []).map((s) => ({
      id: s.id || newId("s"), at: null, h: null, sum: String(s.currentSummary || s.summary || ""),
      facts: Array.isArray(s.state) ? s.state.map(String) : s.state ? [String(s.state)] : [], place: "", when: "", who: [], at_ms: s.createdAt ?? 0, orphan: false, legacy: true
    }));
    out.push(folder);
  }
  return out;
}

export function createMemoryStore(api) {
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };
  const get = async (k) => parse(await api.pluginStorage.getItem(k));
  const set = (k, v) => api.pluginStorage.setItem(k, JSON.stringify(v));

  const readIndex = async () => {
    const raw = await get(INDEX_KEY);
    if (!raw || raw.v !== 2) return newIndex();
    const base = newIndex();
    if (raw.settings?.inject && !raw.settings.inject.m1) { raw.settings.inject.fromTurn = 1; raw.settings.inject.m1 = true; }  // 1.6.2 초기 빌드(2번째 턴) → 1번째 턴 이전
    return { ...base, ...raw, settings: { ...base.settings, ...raw.settings, inject: { ...base.settings.inject, ...raw.settings?.inject }, loreRef: { ...base.settings.loreRef, ...raw.settings?.loreRef }, model: { ...base.settings.model, ...raw.settings?.model } }, bots: raw.bots ?? {}, folders: raw.folders ?? {}, status: { ...base.status, ...raw.status } };
  };
  const writeFolder = async (idx, folder) => {
    for (const p of Object.values(folder.people)) p.records = pruneRecords(p.records ?? [], idx.settings.personCap);
    const id = folderIdOf(folder.chaId, folder.chatId);
    await set(FOLDER_PREFIX + id, folder);
    idx.folders[id] = { chaId: folder.chaId, chatId: folder.chatId, updatedAt: Date.now(), counts: countsOf(folder) };
    await set(INDEX_KEY, idx);
    return id;
  };

  return {
    serial,
    getIndex: () => readIndex(),
    updateIndex: (fn) => serial(async () => { const idx = await readIndex(); const r = await fn(idx); await set(INDEX_KEY, idx); return r; }),
    getFolder: async (chaId, chatId) => { const f = await get(FOLDER_PREFIX + folderIdOf(chaId, chatId)); return f?.v === 2 ? f : null; },
    // 임계구역 안에서 읽고-수정-쓰기. fn(folder, index) → 반환값 그대로 돌려줌. LLM 호출은 이 밖에서 할 것.
    updateFolder: (chaId, chatId, fn, init = {}) => serial(async () => {
      const idx = await readIndex();
      const cur = await get(FOLDER_PREFIX + folderIdOf(chaId, chatId));
      const folder = cur?.v === 2 ? cur : emptyFolder(chaId, chatId, init);
      const r = await fn(folder, idx);
      await writeFolder(idx, folder);
      return r;
    }),
    deleteFolder: (chaId, chatId) => serial(async () => {
      const idx = await readIndex(); const id = folderIdOf(chaId, chatId);
      await api.pluginStorage.removeItem(FOLDER_PREFIX + id); delete idx.folders[id]; await set(INDEX_KEY, idx);
    }),
    deleteBot: (chaId) => serial(async () => {
      const idx = await readIndex();
      for (const [id, f] of Object.entries(idx.folders)) if (f.chaId === String(chaId)) { await api.pluginStorage.removeItem(FOLDER_PREFIX + id); delete idx.folders[id]; }
      delete idx.bots[String(chaId)]; await set(INDEX_KEY, idx);
    }),
    resetAll: () => serial(async () => {
      const idx = await readIndex();
      for (const id of Object.keys(idx.folders)) await api.pluginStorage.removeItem(FOLDER_PREFIX + id);
      await set(INDEX_KEY, { ...newIndex(), settings: idx.settings });
    }),
    // v1 데이터가 있고 v2 인덱스가 없을 때 한 번만 이전. 원본 v1 키는 지우지 않는다. 반환: 이전한 폴더 수.
    migrate: () => serial(async () => {
      const cur = await get(INDEX_KEY);
      if (cur?.v === 2) return 0;
      const old = await get(LEGACY_KEY);
      const idx = newIndex();
      const folders = migrateV1(old);
      for (const f of folders) await writeFolder(idx, f);
      if (!folders.length) await set(INDEX_KEY, idx);
      idx.migratedFromV1 = folders.length > 0;
      await set(INDEX_KEY, idx);
      return folders.length;
    })
  };
}
