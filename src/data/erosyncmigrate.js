// 원래 Erosync 플러그인을 쓰던 사람의 기록 감지. 저장 키(erosync_*)가 원본과 같아서 복사는 필요 없고,
// 여기서는 '이미 이어서 쓸 기록이 얼마나 있는지'만 읽는다. 원본 기록은 지우지도 바꾸지도 않는다.
const PROFILES = "erosync_profiles_v3";
const REGISTRY = "erosync_character_registry_v3";
const OVERRIDES = "erosync_bot_overrides_v1";
const SESSION = "erosync_session_v3:";
const BEHIND = "erosync_behind_v1:";
const parse = (raw) => {
  if (raw && typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
};
const size = (o) => (o && typeof o === "object" ? Object.keys(o).length : 0);
async function read(store, key) {
  try { return parse(await store.getItem(key)); } catch { return null; }
}
// → { found, profiles, characters, botSettings, sessions, behind, canListSessions }
export async function scanOriginalErosync(api) {
  const store = api?.pluginStorage;
  const out = { found: false, profiles: 0, characters: 0, botSettings: 0, sessions: 0, behind: 0, canListSessions: false };
  if (!store || typeof store.getItem !== "function") return out;
  const [pf, reg, ov] = await Promise.all([read(store, PROFILES), read(store, REGISTRY), read(store, OVERRIDES)]);
  out.profiles = size(pf?.profiles);
  out.characters = size(reg?.entities);
  out.botSettings = size(ov?.bots ?? ov);
  if (typeof store.keys === "function") {
    out.canListSessions = true;
    try {
      const keys = (await store.keys()).map(String);
      out.sessions = keys.filter((k) => k.startsWith(SESSION)).length;
      out.behind = keys.filter((k) => k.startsWith(BEHIND)).length;
    } catch { out.canListSessions = false; }
  }
  out.found = out.profiles + out.characters + out.botSettings + out.sessions + out.behind > 0;
  return out;
}
