// 장기기억 v3 저장소: v2와 같은 메서드 + 채팅별 인물 위키(wiki) + 리수폿 가져오기. 직렬 쓰기 큐.
// v2·v1 원본 키는 지우지 않는다(백업으로 남김). 인덱스를 마지막에 써서 중간에 끊겨도 다시 이전된다.
import { pruneRecords } from "../engine/memorygrade.js";
import { DEFAULT_SETTINGS, INDEX_KEY as V2_INDEX, FOLDER_PREFIX as V2_FOLDER, LEGACY_KEY, folderIdOf, emptyFolder, countsOf, migrateV1 } from "./memorystore.js";
import { V3, indexV2toV3, folderV2toV3, parsePotBundle, botPeople } from "../engine/memoryv3.js";
import { migrateIndex } from "../engine/memoryswitch.js";
import { followDefaults, DUSK_FOLLOW } from "../engine/defaultfollow.js";

export const INDEX_KEY = "dusk.mem.v3.index";
export const FOLDER_PREFIX = "dusk.mem.v3.f.";

const newIndex = () => ({ v: V3, settings: structuredClone(DEFAULT_SETTINGS), bots: {}, folders: {}, status: { hook: "pending", processed: 0, lastSuccessAt: 0, lastError: "" }, pot: { settings: null, importedAt: 0, sources: [] } });
const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw && typeof raw === "object" ? raw : null; } catch { return null; } };
const wikiDocs = (w) => Object.keys(w?.documents ?? {}).length;

// opts.storage: getItem/setItem/removeItem을 가진 저장소(기본 api.pluginStorage). Dusk Cellar가 있으면 memoryremote.js가
// 채팅 기억 폴더(dusk.mem.v3.f.*)만 서버로 보낸다(1.8.3).
export function createMemoryStoreV3(api, { storage } = {}) {
  const ps = storage ?? api.pluginStorage;
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };
  // 원문(문자열) 짧은 캐시(v1.8.3, 홈·기억 탭 속도): 인덱스와 채팅 기억 폴더를 같은 화면에서 여러 번 읽던 것을 한 번으로.
  // 문자열만 캐시하고 읽을 때마다 새로 파싱하므로 받은 쪽이 고쳐도 새지 않는다. 이 저장소만 쓰는 키이고,
  // 쓰기·삭제 때 비우며 실패하면 캐시하지 않는다. 시간 제한(5초)은 다른 기기에서 바뀐 값을 늦게라도 보게 하는 안전장치.
  const RAW_TTL = 5000, RAW_MAX = 6;
  const raws = new Map();   // key → { t, p: Promise<raw> }
  const rawGet = (k) => {
    const hit = raws.get(k);
    if (hit && Date.now() - hit.t < RAW_TTL) return hit.p;
    const ent = { t: Date.now(), p: null };
    ent.p = Promise.resolve(ps.getItem(k)).then((r) => { if (typeof r !== "string" && raws.get(k) === ent) raws.delete(k); return r; }, (e) => { if (raws.get(k) === ent) raws.delete(k); throw e; });
    raws.delete(k); raws.set(k, ent);
    while (raws.size > RAW_MAX) raws.delete(raws.keys().next().value);
    return ent.p;
  };
  const get = async (k) => parse(await rawGet(k));
  const set = async (k, v) => {
    raws.delete(k);
    // 일부 호스트는 실패를 throw 대신 false로 알린다 → 저장 실패로 처리(버그 1: 실패를 성공으로 보고 계속 진행하던 문제)
    try { const r = await ps.setItem(k, JSON.stringify(v)); if (r === false) throw new Error("저장소에 쓰지 못했어요(용량 부족 또는 권한)."); return r; } finally { raws.delete(k); }
  };
  const rm = (k) => { raws.delete(k); return ps.removeItem(k); };

  // 직접 바꾸지 않은 기억 넣기 토큰은 기본값을 따라간다(settings.edited = 직접 바꾼 키)
  const withFollow = (idx) => { idx.settings.edited = followDefaults(idx.settings, DEFAULT_SETTINGS, idx.settings.edited, DUSK_FOLLOW); return idx; };
  const readIndex = async () => {
    const raw = await get(INDEX_KEY);
    if (!raw || raw.v !== V3) return withFollow(migrateIndex(newIndex()));
    const base = newIndex();
    // v3.1(rev 1): 리수폿 설정·봇별/인물별 끄기 칸을 채운다. 켜져 있던 것은 그대로다(memoryswitch.js)
    return withFollow(migrateIndex({ ...base, ...raw, settings: { ...base.settings, ...raw.settings, inject: { ...base.settings.inject, ...raw.settings?.inject }, loreRef: { ...base.settings.loreRef, ...raw.settings?.loreRef }, model: { ...base.settings.model, ...raw.settings?.model }, flow: { ...base.settings.flow, ...raw.settings?.flow } }, bots: raw.bots ?? {}, folders: raw.folders ?? {}, status: { ...base.status, ...raw.status }, pot: { ...base.pot, ...raw.pot } }));
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

  // 인물 위키가 '런타임(리수폿 컨트롤러) 밖'에서 바뀌었을 때 알리는 구독자. 화면이 저장소에 직접 쓴 위키를
  // 기억 흐름 런타임의 사본이 모르면 방금 만든 문서를 AI 도구가 못 찾는다(v1.7.0).
  const wikiListeners = new Set();
  return {
    serial,
    // 원문 캐시 비우기(저장 위치가 바뀌었을 때)
    dropCache: () => raws.clear(),
    getIndex: () => readIndex(),
    updateIndex: (fn) => serial(async () => { const idx = await readIndex(); const r = await fn(idx); await set(INDEX_KEY, idx); return r; }),
    getFolder: readFolder,
    onWikiWritten: (fn) => { wikiListeners.add(fn); return () => wikiListeners.delete(fn); },
    // 임계구역 안에서 읽고-수정-쓰기. LLM 호출은 이 밖에서 할 것. opts.fromRuntime: 런타임이 자기 사본을 저장하는 쓰기(알리지 않음)
    updateFolder: (chaId, chatId, fn, init = {}, opts = {}) => serial(async () => {
      const idx = await readIndex();
      const folder = (await readFolder(chaId, chatId)) ?? blank(chaId, chatId, init);
      const wiki0 = folder.wiki, rev0 = wiki0?.revision;
      const r = await fn(folder, idx);
      await writeFolder(idx, folder);
      if (!opts.fromRuntime && folder.wiki && (folder.wiki !== wiki0 || folder.wiki.revision !== rev0)) for (const l of wikiListeners) { try { l(String(chaId), String(chatId)); } catch { /* 알림 실패는 저장에 영향 없음 */ } }
      return r;
    }),
    // 예전 키(chat.id)로 쌓인 기억을 지금 범위 키 폴더로 옮긴다(engine/chatkey.js). 비어 있는 칸만 채우고 원래 폴더는 둔다.
    adoptFolder: (chaId, fromChatId, toChatId) => serial(async () => {
      if (!fromChatId || String(fromChatId) === String(toChatId)) return false;
      const old = await readFolder(chaId, fromChatId); if (!old) return false;
      const idx = await readIndex();
      const cur = (await readFolder(chaId, toChatId)) ?? blank(chaId, toChatId, { botName: old.botName, chatName: old.chatName });
      if (cur.adoptedFrom === String(fromChatId)) return false;
      let moved = false;
      for (const [k, p] of Object.entries(old.people ?? {})) if (!cur.people[k]) { cur.people[k] = p; moved = true; }
      if (!(cur.scenes?.length) && old.scenes?.length) { cur.scenes = old.scenes; cur.cursor ??= old.cursor; moved = true; }
      if (!cur.wiki && old.wiki) { cur.wiki = old.wiki; moved = true; }
      cur.adoptedFrom = String(fromChatId);
      await writeFolder(idx, cur);
      return moved;
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
      await set(INDEX_KEY, { ...newIndex(), settings: idx.settings, pot: idx.pot, rev: idx.rev, potBots: idx.potBots, potChars: idx.potChars });
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
