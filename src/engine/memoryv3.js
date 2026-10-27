// 장기기억 v3 순수 변환: v2 → v3, 리수폿 백업/저장소 덤프 → v3 조각, 봇 전체 인물 모으기.
import { normalizeWikiScope } from "./pot/wiki-schema.js";

export const V3 = 3;
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const parseMaybe = (raw) => { if (typeof raw !== "string") return raw; try { return JSON.parse(raw); } catch { return null; } };

// v2 인덱스 → v3 인덱스. 설정·봇·폴더 목록은 그대로 두고 pot 구획만 더한다.
export function indexV2toV3(idx) {
  const out = { ...structuredClone(idx ?? {}), v: V3 };
  out.pot = isObj(out.pot) ? out.pot : { settings: null, importedAt: 0, sources: [] };
  out.folders = out.folders ?? {};
  return out;
}

// v2 폴더 → v3 폴더. 기록·상황은 건드리지 않고 wiki 칸만 비워 둔다.
export function folderV2toV3(f) {
  return { ...structuredClone(f), v: V3, wiki: f?.wiki ?? null };
}

// 리수폿 파일 한 개(또는 저장소 덤프) → { settings, scopes, keysIgnored, errors }
// - risupot-backup(채팅 하나) · risupot-full-backup(설정) · risupot-settings-preset · 저장소 덤프({ "risupot.…": 값 })
// 인증 키(localProviderKeys 등)는 가져오지 않는다.
export function parsePotBundle(raw) {
  const out = { settings: null, scopes: [], keysIgnored: false, errors: [] };
  const v = parseMaybe(raw);
  if (!isObj(v)) { out.errors.push("파일을 읽지 못했어요"); return out; }
  const addScope = (w, label) => { try { out.scopes.push(normalizeWikiScope(w)); } catch (e) { out.errors.push((label ? label + ": " : "") + (e?.message ?? "인물 위키가 올바르지 않아요")); } };
  if (v.kind === "risupot-backup") {
    if (isObj(v.settings)) out.settings = v.settings;
    if (v.wiki) addScope(v.wiki, "채팅 위키");
  } else if (v.kind === "risupot-full-backup" || v.kind === "risupot-settings-preset") {
    if (isObj(v.settings)) out.settings = v.settings;
    out.keysIgnored = isObj(v.localProviderKeys) ? Object.keys(v.localProviderKeys).length > 0 : !!v.localProviderKeys;
  } else if (Object.keys(v).some((k) => k.startsWith("risupot."))) {
    const s = parseMaybe(v["risupot.settings"]);
    if (isObj(s)) out.settings = s;
    out.keysIgnored = v["risupot.provider-keys"] != null;
    for (const [k, w] of Object.entries(v)) if (k.startsWith("risupot.wiki.v1:")) addScope(w, decodeURIComponent(k.slice(16).split(":")[1] ?? ""));
  } else out.errors.push("리수폿 백업이 아니에요");
  return out;
}

// 봇 전체 보기: 채팅별 폴더의 인물을 이름으로 합친다. 기록마다 chatId를 달아 출처를 남긴다.
export function botPeople(folders) {
  const out = {};
  for (const f of folders) {
    if (!f) continue;
    for (const [key, p] of Object.entries(f.people ?? {})) {
      const cur = out[key] ??= { name: p.name, aliases: [...(p.aliases ?? [])], pinned: !!p.pinned, records: [] };
      cur.pinned = cur.pinned || !!p.pinned;
      for (const a of p.aliases ?? []) if (!cur.aliases.includes(a)) cur.aliases.push(a);
      for (const r of p.records ?? []) cur.records.push({ ...r, chatId: f.chatId });
    }
  }
  return out;
}
