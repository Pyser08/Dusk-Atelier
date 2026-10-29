// 리수폿 컨트롤러가 쓰는 저장소(pluginStorage 모양)를 Dusk 저장소 v3 위에 얹는 어댑터 (v1.6.4 4단계).
// 설정 → 인덱스 pot.settings · 위키 카탈로그 → 인덱스 pot.catalog · 채팅별 위키 → 폴더(botId·chatId).wiki
// 그 밖의 키(추적 기록 등)는 실제 pluginStorage로 그대로 보낸다. 인증 키는 이 어댑터를 거치지 않는다(LocalKeyStore).
const SETTINGS_KEY = "risupot.settings", CATALOG_KEY = "risupot.wiki.catalog.v1", WIKI_PREFIX = "risupot.wiki.v1:";

export const scopeIdsOf = (key) => {
  if (!String(key).startsWith(WIKI_PREFIX)) return null;
  const parts = String(key).slice(WIKI_PREFIX.length).split(":");
  if (parts.length !== 2) return null;
  try { return [decodeURIComponent(parts[0]), decodeURIComponent(parts[1])]; } catch { return null; }
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const clone = (v) => v == null ? v : structuredClone(v);

export function createPotStorage(api, store) {
  const raw = api.pluginStorage;
  return {
    async getItem(key) {
      if (key === SETTINGS_KEY) return clone((await store.getIndex()).pot?.settings ?? null);
      if (key === CATALOG_KEY) return clone((await store.getIndex()).pot?.catalog ?? null);
      const ids = scopeIdsOf(key);
      if (ids) return clone(await store.getWiki(ids[0], ids[1]));
      return raw.getItem(key);
    },
    async setItem(key, value) {
      if (key === SETTINGS_KEY) { await store.updateIndex((idx) => { idx.pot ??= {}; idx.pot.settings = clone(value); }); return; }
      if (key === CATALOG_KEY) { await store.updateIndex((idx) => { idx.pot ??= {}; idx.pot.catalog = clone(value); }); return; }
      const ids = scopeIdsOf(key);
      if (ids) {
        const sc = isObj(value) ? value.scope : null;
        await store.updateFolder(ids[0], ids[1], (f) => {
          f.wiki = clone(value);
          if (sc?.characterName) f.botName ||= sc.characterName;
          if (sc?.chatName) f.chatName ||= sc.chatName;
        }, { botName: sc?.characterName ?? "", chatName: sc?.chatName ?? "" }, { fromRuntime: true });
        return;
      }
      return raw.setItem(key, value);
    },
    async removeItem(key) {
      if (key === SETTINGS_KEY) { await store.updateIndex((idx) => { if (idx.pot) idx.pot.settings = null; }); return; }
      if (key === CATALOG_KEY) { await store.updateIndex((idx) => { if (idx.pot) idx.pot.catalog = null; }); return; }
      const ids = scopeIdsOf(key);
      if (ids) {
        if (!(await store.getFolder(ids[0], ids[1]))) return;  // 없던 폴더를 새로 만들지 않는다
        await store.updateFolder(ids[0], ids[1], (f) => { f.wiki = null; }, {}, { fromRuntime: true });
        return;
      }
      return raw.removeItem?.(key);
    },
    async keys() {
      const idx = await store.getIndex();
      const wiki = Object.values(idx.folders ?? {}).filter((f) => f.counts?.wiki > 0).map((f) => `${WIKI_PREFIX}${encodeURIComponent(f.chaId)}:${encodeURIComponent(f.chatId)}`);
      const rest = typeof raw.keys === "function" ? await raw.keys() : [];
      return [...new Set([...wiki, ...rest.filter((k) => !String(k).startsWith(WIKI_PREFIX))])];
    }
  };
}
