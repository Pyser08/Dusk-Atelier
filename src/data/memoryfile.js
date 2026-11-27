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


// only: {chaId, chatId} → 그 채팅 하나만 담는다(채팅 하나 내보내기)
export async function buildMemoryFile(api, store, { erosync = true, only = null } = {}) {
  const idx = await store.getIndex();
  const folders = [];
  for (const f of Object.values(idx.folders ?? {})) {
    if (only && (String(f.chaId) !== String(only.chaId) || String(f.chatId) !== String(only.chatId))) continue;
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

// 신고 #29(2.2.68): 다른 기기로 옮긴 파일은 봇·채팅 ID가 그 기기와 달라, 불러와도 아무도 안 여는 폴더에 들어가 인물 위키가 비어 보였다.
// 이 기기의 봇·채팅 목록(chars: [{chaId, name, chats:[{chatId, name, ti}]}])에서 맞는 자리를 찾는다.
//  1) 같은 봇·같은 채팅이 있으면 그대로  2) 같은 채팅 ID(채팅 파일로 옮기면 범위 ID가 따라온다)가 한 곳에만 있으면 그리로
//  3) 봇은 ID → 이름(하나뿐일 때)으로, 채팅은 이름(하나뿐일 때) → 그 봇에 채팅이 하나뿐이고 파일에도 그 봇 채팅이 하나뿐이면 그 채팅
// 그대로면 "same", 못 찾으면 null(원래 ID로 둔다 — 이 기기에선 안 보임). 두 폴더가 한 채팅으로 가지는 않는다.
const norm = (x) => String(x ?? "").trim().toLowerCase();
export function planRemap(folders, chars) {
  const byId = new Map(chars.map((c) => [String(c.chaId), c]));
  const chatHome = new Map();
  for (const c of chars) for (const t of c.chats ?? []) { const k = String(t.chatId); chatHome.set(k, chatHome.has(k) ? null : { c, t }); }
  const uniq = (arr) => (arr.length === 1 ? arr[0] : null);
  const perBot = new Map();
  for (const f of folders) perBot.set(String(f.chaId), (perBot.get(String(f.chaId)) ?? 0) + 1);
  const used = new Set(), out = [];
  const pick = (c, t) => { const key = `${c.chaId}\u0000${t.chatId}`; if (used.has(key)) return null; used.add(key); return { chaId: String(c.chaId), chatId: String(t.chatId), chatIndex: t.ti, chatName: t.name ?? "", botName: c.name ?? "" }; };
  for (const f of folders) {
    const c0 = byId.get(String(f.chaId));
    if (c0?.chats?.some((t) => String(t.chatId) === String(f.chatId))) { used.add(`${f.chaId}\u0000${f.chatId}`); out.push("same"); continue; }
    const home = chatHome.get(String(f.chatId));
    if (home) { out.push(pick(home.c, home.t)); continue; }
    const c = c0 ?? uniq(chars.filter((x) => norm(x.name) && norm(x.name) === norm(f.botName)));
    if (!c) { out.push(null); continue; }
    const chats = c.chats ?? [];
    const t = uniq(chats.filter((x) => norm(x.name) && norm(x.name) === norm(f.chatName))) ?? (chats.length === 1 && perBot.get(String(f.chaId)) === 1 ? chats[0] : null);
    out.push(t ? pick(c, t) : null);
  }
  return out;
}
// 이 기기의 봇·채팅 목록(planRemap용). 못 읽으면 빈 목록
export async function listLocalChats(api, chatKeyOf) {
  try {
    const db = await api.getDatabase(["characters"]);
    return (db?.characters ?? []).filter((c) => c?.chaId).map((c) => ({ chaId: String(c.chaId), name: c.name ?? "", chats: (c.chats ?? []).map((t, ti) => ({ chatId: chatKeyOf(t, ti), name: t?.name ?? "", ti })) }));
  } catch { return []; }
}

// 같은 채팅의 기억이 이미 있으면 파일 내용으로 바꾼다. 없는 채팅은 추가. 파일에 없는 채팅은 그대로 둔다.
// target: {chaId, chatId, chatIndex?, chatName?} → 파일의 채팅 하나를 그 채팅(예: 복사한 채팅)에 넣는다.
// 버그 2: 예전에는 v2 폴더만 받아서 지금(v3) 내보낸 파일의 기억이 전부 건너뛰어지고 Erosync 값만 덮어써졌다.
export const FOLDER_VERSIONS = [2, 3];
// remap: (폴더) => 자리 | null — planRemap 결과로 다른 기기에서 옮긴 파일을 이 기기의 봇·채팅에 넣는다.
// pick(폴더 하나)이 있으면 그것만 target 채팅에 넣고 나머지는 remap대로. pick 없이 target이면 채팅 하나짜리 파일만.
export async function applyMemoryFile(api, store, d, { erosync = true, target = null, remap = null, pick = null } = {}) {
  let chats = 0, ero = 0, moved = 0;
  const list = d.folders.filter((f) => f?.chaId && f?.chatId && FOLDER_VERSIONS.includes(f.v));
  if (target && !pick && list.length !== 1) throw new Error("채팅 하나만 담긴 파일만 열린 채팅에 넣을 수 있어요.");
  for (const f of list) {
    const place = (pick ? (f === pick ? target : null) : target) ?? remap?.(f) ?? null;   // 자리 맞추기(채팅 위치·이름·위키 범위)는 옮길 때만
    const to = place ?? f;
    if (place && (String(place.chaId) !== String(f.chaId) || String(place.chatId) !== String(f.chatId))) moved++;
    await store.updateFolder(to.chaId, to.chatId, (cur) => {
      const v = cur.v;
      for (const k of Object.keys(cur)) delete cur[k];
      Object.assign(cur, JSON.parse(JSON.stringify(f)), { v, chaId: String(to.chaId), chatId: String(to.chatId) });
      cur.wiki ??= null;
      if (place) { if (place.chatIndex != null) cur.chatIndex = place.chatIndex; if (place.chatName) cur.chatName = place.chatName; if (place.botName) cur.botName = place.botName; if (cur.wiki?.scope) cur.wiki.scope = { ...cur.wiki.scope, characterId: String(to.chaId), chatKey: String(to.chatId) }; }
    });
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
  return { chats, ero, moved };
}

// Erosync 저장 값 지우기(원본 플러그인 기록도 같은 키라 함께 사라진다 → 호출 쪽에서 확인을 받는다)
export async function clearErosyncData(api) {
  const { keys } = await listEroKeys(api);
  let n = 0;
  for (const k of keys) { try { await api.pluginStorage.removeItem(k); n++; } catch { /* 건너뜀 */ } }
  return n;
}

