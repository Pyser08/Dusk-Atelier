// 장기기억 v3 저장소: v2와 같은 메서드 + 채팅별 인물 위키(wiki) + 리수폿 가져오기. 직렬 쓰기 큐.
// v2·v1 원본 키는 지우지 않는다(백업으로 남김). 인덱스를 마지막에 써서 중간에 끊겨도 다시 이전된다.
import { pruneRecords } from "../engine/memorygrade.js";
import { DEFAULT_SETTINGS, INDEX_KEY as V2_INDEX, FOLDER_PREFIX as V2_FOLDER, LEGACY_KEY, folderIdOf, emptyFolder, countsOf, migrateV1 } from "./memorystore.js";
import { V3, indexV2toV3, folderV2toV3, parsePotBundle, botPeople } from "../engine/memoryv3.js";

export const INDEX_KEY = "dusk.mem.v3.index";
export const FOLDER_PREFIX = "dusk.mem.v3.f.";

const newIndex = () => ({ v: V3, settings: structuredClone(DEFAULT_SETTINGS), bots: {}, folders: {}, status: { hook: "pending", processed: 0, lastSuccessAt: 0, lastError: "" }, pot: { settings: null, importedAt: 0, sources: [] } });
const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw && typeof raw === "object" ? raw : null; } catch { return null; } };
const wikiDocs = (w) => Object.keys(w?.documents ?? {}).length;

export function createMemoryStoreV3(api) {
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };
  const get = async (k) => parse(await api.pluginStorage.getItem(k));
  const set = (k, v) => api.pluginStorage.setItem(k, JSON.stringify(v));
  const rm = (k) => api.pluginStorage.removeItem(k);

  const readIndex = async () => {
    const raw = await get(INDEX_KEY);
    if (!raw || raw.v !== V3) return newIndex();
    const base = newIndex();
    return { ...base, ...raw, settings: { ...base.settings, ...raw.settings, inject: { ...base.settings.inject, ...raw.settings?.inject }, loreRef: { ...base.settings.loreRef, ...raw.settings?.loreRef }, model: { ...base.settings.model, ...raw.settings?.model } }, bots: raw.bots ?? {}, folders: raw.folders ?? {}, status: { ...base.status, ...raw.status }, pot: { ...base.pot, ...raw.pot } };
  };
  const writeFolder = async (idx, folder) => {
    for (const p of Object.values(folder.people)) p.records = pruneRecords(p.records ?? [], idx.settings.personCap);
    const id = folderIdOf(folder.chaId, folder.chatId);
    await set(FOLDER_PREFIX + id, folder);
    idx.folders[id] = { chaId: folder.chaId, chatId: folder.chatId, updatedAt: Date.now(), counts: { ...countsOf(folder), wiki: wikiDocs(folder.wiki) } };
    await set(INDEX_KEY, idx);
    return id;
  };
  const readFolder = async (chaId, chatId) => { const f = await get(FOLDER_PREFIX + folderIdOf(chaId, chatId)); return f?.v === V3 ? f : null; };
  const blank = (chaId, chatId, extra) => ({ ...emptyFolder(chaId, chatId, extra), v: V3, wiki: null });

  return {
    serial,
    getIndex: () => readIndex(),
    updateIndex: (fn) => serial(async () => { const idx = await readIndex(); const r = await fn(idx); await set(INDEX_KEY, idx); return r; }),
    getFolder: readFolder,
    // 임계구역 안에서 읽고-수정-쓰기. LLM 호출은 이 밖에서 할 것.
    updateFolder: (chaId, chatId, fn, init = {}) => serial(async () => {
      const idx = await readIndex();
      const folder = (await readFolder(chaId, chatId)) ?? blank(chaId, chatId, init);
      const r = await fn(folder, idx);
      await writeFolder(idx, folder);
      return r;
    }),
    deleteFolder: (chaId, chatId) => serial(async () => {
      const idx = await readIndex(); const id = folderIdOf(chaId, chatId);
      await rm(FOLDER_PREFIX + id); delete idx.folders[id]; await set(INDEX_KEY, idx);
    }),
    deleteBot: (chaId) => serial(async () => {
      const idx = await readIndex();
      for (const [id, f] of Object.entries(idx.folders)) if (f.chaId === String(chaId)) { await rm(FOLDER_PREFIX + id); delete idx.folders[id]; }
      delete idx.bots[String(chaId)]; await set(INDEX_KEY, idx);
    }),
    resetAll: () => serial(async () => {
      const idx = await readIndex();
      for (const id of Object.keys(idx.folders)) await rm(FOLDER_PREFIX + id);
      await set(INDEX_KEY, { ...newIndex(), settings: idx.settings, pot: idx.pot });
    }),

    // 인물 위키(채팅별)
    getWiki: async (chaId, chatId) => (await readFolder(chaId, chatId))?.wiki ?? null,
    // 봇 전체 보기: 채팅 폴더 목록 / 인물 합치기(기록마다 chatId 포함)
    botFolders: async (chaId) => Object.values((await readIndex()).folders).filter((f) => f.chaId === String(chaId)),
    botPeople: async (chaId) => {
      const list = Object.values((await readIndex()).folders).filter((f) => f.chaId === String(chaId));
      return botPeople(await Promise.all(list.map((f) => readFolder(f.chaId, f.chatId))));
    },

    // 리수폿 가져오기. bundle = 파일 내용(문자열·객체). 더 새 위키(revision)만 덮어쓰고, 인증 키는 받지 않는다.
    // 반환: { scopes, skipped, settings, keysIgnored, errors }
    importPot: async (bundle, { force = false } = {}) => {
      const p = parsePotBundle(bundle);
      let scopes = 0, skipped = 0;
      for (const w of p.scopes) {
        const { characterId, chatKey, characterName, chatName } = w.scope;
        const took = await serial(async () => {
          const idx = await readIndex();
          const folder = (await readFolder(characterId, chatKey)) ?? blank(characterId, chatKey, { botName: characterName, chatName });
          if (folder.wiki && !force && folder.wiki.revision >= w.revision) return false;
          folder.wiki = w; folder.botName ||= characterName; folder.chatName ||= chatName;
          await writeFolder(idx, folder);
          return true;
        });
        took ? scopes++ : skipped++;
      }
      let settings = false;
      if (p.settings) await serial(async () => {
        const idx = await readIndex();
        if (!idx.pot.settings || force) { idx.pot.settings = p.settings; settings = true; }
        idx.pot.importedAt = Date.now(); idx.pot.sources = [...new Set([...(idx.pot.sources ?? []), "risupot"])];
        await set(INDEX_KEY, idx);
      });
      return { scopes, skipped, settings, keysIgnored: p.keysIgnored, errors: p.errors };
    },

    // v3 인덱스가 없을 때 한 번만 v2(없으면 v1)에서 이전. 반환: 이전한 폴더 수.
    migrate: () => serial(async () => {
      if ((await get(INDEX_KEY))?.v === V3) return 0;
      const v2 = await get(V2_INDEX);
      let idx, n = 0;
      if (v2?.v === 2) {
        idx = indexV2toV3(v2); idx.migratedFrom = 2; idx.folders = {};
        for (const [id, meta] of Object.entries(v2.folders ?? {})) {
          const f = await get(V2_FOLDER + id);
          if (f?.v !== 2) continue;
          await writeFolder(idx, folderV2toV3(f)); n++; void meta;
        }
      } else {
        idx = newIndex();
        const old = await get(LEGACY_KEY);
        const folders = migrateV1(old);
        for (const f of folders) await writeFolder(idx, { ...f, v: V3, wiki: null });
        idx.migratedFrom = folders.length ? 1 : 0; n = folders.length;
      }
      await set(INDEX_KEY, idx);
      return n;
    })
  };
}
