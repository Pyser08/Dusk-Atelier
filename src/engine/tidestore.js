// RisuTide가 남긴 기록을 읽는다 (읽기 전용).
// 리스의 플러그인 저장소(pluginStorage)와 기기 저장소(getLocalPluginStorage)는 플러그인끼리 공간이 나뉘지 않아서
// 같은 기기라면 RisuTide의 기준·백업을 그대로 읽을 수 있다. RisuTide 쪽 기록은 고치거나 지우지 않는다.
import { isFingerprintV1 } from '../tide/characterUpdateMerge.ts';
import { decodeCardProvenance } from '../tide/characterMerge/provenance.ts';

let localP = null;
export function localStore(api) {
  localP ??= Promise.resolve().then(() => api.getLocalPluginStorage?.()).catch(() => null);
  return localP;
}
async function keysOf(s) {
  try {
    return (await s?.keys?.()) ?? [];
  } catch {
    return [];
  }
}
async function getOf(s, k) {
  try {
    return (await s.getItem(k)) ?? null;
  } catch {
    return null;
  }
}

// RisuTide mirroredStorage 형식: risutide-mirror/<encoded key>/<time>-<uuid> = { v: 1, value }
async function readMirrored(api, key, valid) {
  const local = await localStore(api);
  const stores = [local, api.pluginStorage].filter(Boolean);
  const prefix = `risutide-mirror/${encodeURIComponent(key)}/`;
  const cands = [];
  for (const s of stores) for (const k of await keysOf(s)) if (k.startsWith(prefix)) cands.push({ s, k });
  cands.sort((a, b) => b.k.localeCompare(a.k));
  for (const { s, k } of cands) {
    const rec = await getOf(s, k);
    if (rec?.v === 1 && valid(rec.value)) return rec.value;
  }
  for (const s of stores) {
    const v = await getOf(s, key);
    if (valid(v)) return v;
  }
  return null;
}
/** RisuTide 기준 지문. kind: "c" | "m" */
export async function tideBase(api, kind, id) {
  try {
    return await readMirrored(api, kind === "c" ? `base/${id}` : `base/module/${encodeURIComponent(id)}`, isFingerprintV1);
  } catch {
    return null;
  }
}

function b64(s) {
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
async function gunzip(u8) {
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
}
async function sha(u8) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", u8))].map((n) => n.toString(16).padStart(2, "0")).join("");
}
async function readPart(local, key) {
  const part = await getOf(local, key);
  if (part?.codec !== "gzip" || typeof part.data !== "string") throw new Error("RisuTide 백업 조각이 없어요");
  const raw = await gunzip(b64(part.data));
  if (await sha(raw) !== key.split("/")[1]) throw new Error("RisuTide 백업 조각이 손상됐어요");
  return JSON.parse(new TextDecoder().decode(raw));
}

/** RisuTide 백업 목록 (Dusk 백업 목록과 같은 모양) */
export async function listTideBackups(api) {
  const local = await localStore(api);
  if (!local) return [];
  const keys = await keysOf(local);
  const deleted = new Set(keys.filter((k) => k.startsWith("backup-deleted/")).map((k) => k.slice(15)));
  const latest = new Map();
  for (const k of keys) {
    if (!k.startsWith("backup-cas/")) continue;
    const [, chaId, id, ver = ""] = k.split("/");
    if (!chaId || !id || deleted.has(`${chaId}/${id}`)) continue;
    const key2 = `${chaId}/${id}`, cur = latest.get(key2);
    const t = Number(ver.split("-")[0]) || 0;
    if (!cur || t > cur.t) latest.set(key2, { k, t });
  }
  const out = [];
  for (const { k } of latest.values()) {
    const man = await getOf(local, k);
    const hd = man?.header;
    if (!hd || (man.v !== 4 && man.v !== 5)) continue;
    const isMod = hd.targetKind === "module";
    out.push({
      id: `tide:${hd.chaId}/${hd.id}`,
      src: "tide",
      kind: isMod ? "module" : "character",
      target: isMod ? hd.moduleId : hd.chaId,
      name: hd.name || "(이름 없음)",
      t: hd.savedAt ?? 0,
      size: hd.bytes ?? 0,
      note: "RisuTide 백업",
      ...man.chats?.length ? { chatCount: man.chats.length } : {},
      summary: [hd.versionFrom && hd.versionTo && hd.versionFrom !== hd.versionTo ? `v${hd.versionFrom} → v${hd.versionTo}` : "", hd.source].filter(Boolean).join(" · "),
      tideKey: k
    });
  }
  return out.sort((a, b) => b.t - a.t);
}

/** RisuTide 백업 하나를 읽어 { fields, keys, base, module } 로 */
export async function loadTideBackup(api, rec) {
  const local = await localStore(api);
  const man = await getOf(local, rec.tideKey);
  if (!man?.header || !Array.isArray(man.fields)) throw new Error("RisuTide 백업을 읽지 못했어요");
  const fields = {};
  for (const [k, ref] of man.fields) fields[k] = await readPart(local, ref);
  const base = man.base ? await readPart(local, man.base).catch(() => null) : null;
  if (rec.kind === "module") {
    if (!fields.moduleSnapshot) throw new Error("RisuTide 모듈 백업 형식이 달라요");
    return { module: fields.moduleSnapshot, base: isFingerprintV1(base) ? base : null };
  }
  // v5: 채팅 백업 (머리 + 32개씩 나눈 메시지)
  const chats = [];
  for (const c of man.chats ?? []) {
    try {
      chats.push({ header: await readPart(local, c.header), chunks: await Promise.all(c.chunks.map((k) => readPart(local, k))) });
    } catch {
    }
  }
  return { fields, keys: Array.isArray(man.header.keys) ? man.header.keys : Object.keys(fields), base: isFingerprintV1(base) ? base : null, chats };
}

/** 합친 봇의 출처 기록: 카드 안(extentions.risutide.merge) → RisuTide 기록(merge/<chaId>) 순서로 */
export async function loadProvenance(api, ch) {
  const inCard = ch?.extentions?.risutide?.merge;
  const fromCard = typeof inCard === "string" ? decodeCardProvenance(inCard) : null;
  if (fromCard) return fromCard;
  try {
    const s = await readMirrored(api, `merge/${ch?.chaId}`, (v) => typeof v === "string" && !!decodeCardProvenance(v));
    return s ? decodeCardProvenance(s) : null;
  } catch {
    return null;
  }
}
