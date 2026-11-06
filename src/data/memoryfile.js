// 장기 기억을 파일 하나로 내보내고 불러오기. 모든 채팅의 기억 폴더 + (있다면) Erosync가 저장해 둔 erosync_* 값.
// Erosync를 꺼 두었어도 저장된 값은 남아 있으므로 엔진을 거치지 않고 저장소 키를 직접 읽고 쓴다.

export const MEMFILE_KIND = "dusk-memory-data";
const ERO_PREFIX = "erosync_";
// 기기 안에서만 쓰는 임시·복구용 키는 파일에 넣지 않는다
const ERO_SKIP = new Set(["erosync_local_config_v3", "erosync_restore_recovery_v1", "erosync_restore_meta_v1", "erosync_state_tx_v1"]);
const ERO_BASE = ["erosync_profiles_v3", "erosync_character_registry_v3", "erosync_scope_catalog_v1", "erosync_bot_overrides_v1", "erosync_profile_audit_v1", "erosync_profile_presets_v1", "erosync_storage_manifest_v1", "erosync_graph_spacing_v1"];
const keep = (k) => k.startsWith(ERO_PREFIX) && !ERO_SKIP.has(k);

// 저장소에 있는 erosync_* 키. keys()가 없으면 기본 키만 → listable=false
export async function listEroKeys(api) {
  const s = api.pluginStorage;
  if (typeof s?.keys === "function") {
    try { return { keys: (await s.keys()).map(String).filter(keep).sort(), listable: true }; } catch { /* 아래로 */ }
  }
  return { keys: [...ERO_BASE], listable: false };
}


export async function buildMemoryFile(api, store, { erosync = true } = {}) {
  const idx = await store.getIndex();
  const folders = [];
  for (const f of Object.values(idx.folders ?? {})) {
    const folder = await store.getFolder(f.chaId, f.chatId).catch(() => null);
    if (folder) folders.push(folder);
  }
  const out = { kind: MEMFILE_KIND, v: 1, at: new Date().toISOString(), folders, bots: idx.bots ?? {}, erosync: null };
  if (erosync) {
    const { keys, listable } = await listEroKeys(api);
    const items = {};
    for (const k of keys) {
      let raw = null;
      try { raw = await api.pluginStorage.getItem(k); } catch { /* 건너뜀 */ }
      if (raw != null && raw !== "") items[k] = typeof raw === "string" ? raw : JSON.stringify(raw);
    }
    out.erosync = { listable, items };
  }
  return out;
}

export function readMemoryFile(text) {
  let d = null;
  try { d = JSON.parse(text); } catch { /* 아래에서 오류 */ }
  if (d?.kind !== MEMFILE_KIND || !Array.isArray(d.folders)) throw new Error("Dusk 장기 기억 파일이 아니에요.");
  return d;
}
export const summarize = (d) => ({
  chats: d.folders.length,
  people: d.folders.reduce((n, f) => n + Object.keys(f.people ?? {}).length, 0),
  ero: d.erosync ? Object.keys(d.erosync.items ?? {}).length : 0
});

// 같은 채팅의 기억이 이미 있으면 파일 내용으로 바꾼다. 없는 채팅은 추가. 파일에 없는 채팅은 그대로 둔다.
export async function applyMemoryFile(api, store, d, { erosync = true } = {}) {
  let chats = 0, ero = 0;
  for (const f of d.folders) {
    if (!f?.chaId || !f?.chatId || f.v !== 2) continue;
    await store.updateFolder(f.chaId, f.chatId, (cur) => { for (const k of Object.keys(cur)) delete cur[k]; Object.assign(cur, JSON.parse(JSON.stringify(f))); });
    chats++;
  }
  await store.updateIndex((i) => { for (const [id, b] of Object.entries(d.bots ?? {})) if (!i.bots[id]) i.bots[id] = b; });
  if (erosync && d.erosync?.items) {
    for (const [k, v] of Object.entries(d.erosync.items)) {
      if (!keep(k) || typeof v !== "string") continue;
      await api.pluginStorage.setItem(k, v);
      ero++;
    }
  }
  return { chats, ero };
}

// Erosync 저장 값 지우기(원본 플러그인 기록도 같은 키라 함께 사라진다 → 호출 쪽에서 확인을 받는다)
export async function clearErosyncData(api) {
  const { keys } = await listEroKeys(api);
  let n = 0;
  for (const k of keys) { try { await api.pluginStorage.removeItem(k); n++; } catch { /* 건너뜀 */ } }
  return n;
}

