// 카드 저장소: 카드 본문(dusk.mem.v2.card.<id>), 목록 인덱스, 카드 설정. 직렬 쓰기.
import { DEFAULT_TAG_TEXT } from "../engine/card/tags.js";

export const CARD_PREFIX = "dusk.mem.v2.card.";
export const CARD_INDEX_KEY = "dusk.mem.v2.cardidx";
export const CARD_CFG_KEY = "dusk.mem.v2.cardcfg";

export const DEFAULT_CARD_CFG = Object.freeze({
  tagText: DEFAULT_TAG_TEXT, lang: "ko", extra: "", linkExtra: "", entryLevels: ["M2", "M3"], withPng: true, imageUse: "card"
});
const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw && typeof raw === "object" ? raw : null; } catch { return null; } };
const brief = (c) => ({ id: c.id, chaId: String(c.source?.chaId ?? ""), chatId: String(c.source?.chatId ?? ""), name: c.name, grade: c.grade, createdAt: c.createdAt, modifiedAt: c.modifiedAt });

export function createCardStore(api) {
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };
  const get = async (k) => parse(await api.pluginStorage.getItem(k));
  const set = (k, v) => api.pluginStorage.setItem(k, JSON.stringify(v));
  const readIndex = async () => { const r = await get(CARD_INDEX_KEY); return r?.v === 1 && Array.isArray(r.list) ? r : { v: 1, list: [] }; };
  return {
    serial,
    list: async (chaId) => { const { list } = await readIndex(); return (chaId == null ? list : list.filter((x) => x.chaId === String(chaId))).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); },
    get: async (id) => { const c = await get(CARD_PREFIX + id); return c?.v === 1 ? c : null; },
    save: (card) => serial(async () => {
      if (!card?.id) throw new Error("카드 id가 없어요.");
      await set(CARD_PREFIX + card.id, card);
      const idx = await readIndex(), b = brief(card), i = idx.list.findIndex((x) => x.id === card.id);
      if (i >= 0) idx.list[i] = b; else idx.list.push(b);
      await set(CARD_INDEX_KEY, idx);
      return b;
    }),
    remove: (id) => serial(async () => {
      await api.pluginStorage.removeItem(CARD_PREFIX + id);
      const idx = await readIndex(); idx.list = idx.list.filter((x) => x.id !== id); await set(CARD_INDEX_KEY, idx);
    }),
    // 설정: 저장된 값에 기본값을 덮어 합친다. 태그 정의가 비면 기본 정의를 쓴다.
    getCfg: async () => { const r = await get(CARD_CFG_KEY); const c = { ...DEFAULT_CARD_CFG, ...(r && typeof r === "object" ? r : {}) }; if (!String(c.tagText ?? "").trim()) c.tagText = DEFAULT_CARD_CFG.tagText; if (!Array.isArray(c.entryLevels) || !c.entryLevels.length) c.entryLevels = [...DEFAULT_CARD_CFG.entryLevels]; return c; },
    setCfg: (patch) => serial(async () => { const cur = (await get(CARD_CFG_KEY)) ?? {}; const next = { ...cur, ...patch }; await set(CARD_CFG_KEY, next); return { ...DEFAULT_CARD_CFG, ...next }; }),
    resetAll: () => serial(async () => { const idx = await readIndex(); for (const x of idx.list) await api.pluginStorage.removeItem(CARD_PREFIX + x.id); await set(CARD_INDEX_KEY, { v: 1, list: [] }); })
  };
}
