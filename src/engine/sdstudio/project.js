// 에셋 제작(애드온 sdstudio) 봇별 작업 묶음: 캐릭터(프롬프트·만든 이미지)와 폴더(복장 베리에이션·소속 정리). 순수.
// - 폴더는 안에 폴더를 둘 수 있고(parent), 한 캐릭터를 여러 폴더에 넣을 수 있다(members는 참조). 캐릭터 자체는 한 번만 저장.
// - 모든 함수는 사본을 돌려준다(원본 안 바꿈).
import { SIZES, DEFAULT_UC } from "./nai.js";

export var MAX_IMAGES = 200;   // 캐릭터당 기록 상한(넘으면 오래된 것부터 목록에서만 빠짐)
var str = (v, n = 4000) => String(v ?? "").slice(0, n);
var newId = () => Math.random().toString(36).slice(2, 10);

export function emptyProject() {
  return { v: 1, top: "", neg: DEFAULT_UC, size: "portrait", chars: [], folders: [] };
}
export function normalizeProject(x) {
  const e = emptyProject();
  if (!x || typeof x !== "object") return e;
  const chars = (Array.isArray(x.chars) ? x.chars : []).filter((c) => c && typeof c.id === "string" && c.id).map((c) => ({
    id: c.id, name: str(c.name, 80) || "이름 없음", prompt: str(c.prompt), cover: typeof c.cover === "string" ? c.cover : "",
    images: (Array.isArray(c.images) ? c.images : []).filter((i) => i && typeof i.path === "string" && i.path).slice(0, MAX_IMAGES)
      .map((i) => ({ path: i.path, seed: Number.isFinite(i.seed) ? i.seed : null, at: Number.isFinite(i.at) ? i.at : 0 }))
  }));
  const charIds = new Set(chars.map((c) => c.id));
  const raw = (Array.isArray(x.folders) ? x.folders : []).filter((f) => f && typeof f.id === "string" && f.id);
  const fIds = new Set(raw.map((f) => f.id));
  const folders = raw.map((f) => ({
    id: f.id, name: str(f.name, 80) || "새 폴더", kind: f.kind === "outfit" || f.kind === "group" ? f.kind : "",
    parent: typeof f.parent === "string" && fIds.has(f.parent) && f.parent !== f.id ? f.parent : null,
    members: [...new Set((Array.isArray(f.members) ? f.members : []).filter((m) => charIds.has(m)))]
  }));
  // 부모 고리가 생겼으면 끊는다
  const byId = new Map(folders.map((f) => [f.id, f]));
  for (const f of folders) { const seen = new Set([f.id]); let p = f.parent; while (p) { if (seen.has(p)) { f.parent = null; break; } seen.add(p); p = byId.get(p)?.parent ?? null; } }
  return { v: 1, top: str(x.top), neg: typeof x.neg === "string" ? str(x.neg) : e.neg, size: SIZES[x.size] ? x.size : e.size, chars, folders };
}

export function addChar(p, { name = "", prompt = "" } = {}, mkId = newId) {
  return { ...p, chars: [...p.chars, { id: mkId(), name: str(name, 80).trim() || "새 캐릭터", prompt: str(prompt), cover: "", images: [] }] };
}
export function updateChar(p, id, patch) {
  return { ...p, chars: p.chars.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c)) };
}
export function removeChar(p, id) {
  return { ...p, chars: p.chars.filter((c) => c.id !== id), folders: p.folders.map((f) => ({ ...f, members: f.members.filter((m) => m !== id) })) };
}

export function addFolder(p, { name = "", kind = "", parent = null } = {}, mkId = newId) {
  const par = parent && p.folders.some((f) => f.id === parent) ? parent : null;
  return { ...p, folders: [...p.folders, { id: mkId(), name: str(name, 80).trim() || "새 폴더", kind: kind === "outfit" || kind === "group" ? kind : "", parent: par, members: [] }] };
}
export function updateFolder(p, id, patch) {
  const { name, kind } = patch;
  return { ...p, folders: p.folders.map((f) => (f.id === id ? { ...f, ...(name != null ? { name: str(name, 80).trim() || f.name } : {}), ...(kind != null ? { kind } : {}) } : f)) };
}
var descendants = (p, id) => {
  const out = new Set([id]);
  for (let grew = true; grew;) { grew = false; for (const f of p.folders) if (f.parent && out.has(f.parent) && !out.has(f.id)) { out.add(f.id); grew = true; } }
  return out;
};
export function moveFolder(p, id, parent) {
  if (parent && descendants(p, id).has(parent)) throw new Error("폴더를 자기 안으로 옮길 수 없어요");
  return { ...p, folders: p.folders.map((f) => (f.id === id ? { ...f, parent: parent || null } : f)) };
}
// 폴더와 그 안의 폴더를 지운다. 캐릭터는 남는다(어느 폴더에도 없으면 '폴더 없음'에 보임).
export function removeFolder(p, id) {
  const gone = descendants(p, id);
  return { ...p, folders: p.folders.filter((f) => !gone.has(f.id)) };
}
export function setMember(p, folderId, charId, on) {
  return { ...p, folders: p.folders.map((f) => {
    if (f.id !== folderId) return f;
    const has = f.members.includes(charId);
    if (on && !has) return { ...f, members: [...f.members, charId] };
    if (!on && has) return { ...f, members: f.members.filter((m) => m !== charId) };
    return f;
  }) };
}
export var foldersOf = (p, charId) => p.folders.filter((f) => f.members.includes(charId));

// 화면 한 칸: folderId 안의 하위 폴더들과 그 폴더에 직접 든 캐릭터. 맨 위(null)는 어느 폴더에도 없는 캐릭터.
export function view(p, folderId) {
  const byId = new Map(p.chars.map((c) => [c.id, c]));
  const folders = p.folders.filter((f) => (f.parent ?? null) === (folderId ?? null));
  if (!folderId) {
    const filed = new Set(p.folders.flatMap((f) => f.members));
    return { folders, chars: p.chars.filter((c) => !filed.has(c.id)) };
  }
  const f = p.folders.find((x) => x.id === folderId);
  return { folders, chars: (f?.members ?? []).map((m) => byId.get(m)).filter(Boolean) };
}
// 폴더 줄에 보일 캐릭터: 직접 든 캐릭터 + 하위 폴더의 캐릭터(겹치면 한 번)
export function rowChars(p, folderId) {
  const byId = new Map(p.chars.map((c) => [c.id, c]));
  const ids = new Set();
  for (const fid of descendants(p, folderId)) for (const m of p.folders.find((f) => f.id === fid)?.members ?? []) ids.add(m);
  return [...ids].map((m) => byId.get(m)).filter(Boolean);
}
export var countIn = (p, folderId) => rowChars(p, folderId).length;
export function pathOf(p, folderId) {
  const byId = new Map(p.folders.map((f) => [f.id, f]));
  const out = [];
  for (let f = byId.get(folderId); f && out.length < 50; f = f.parent ? byId.get(f.parent) : null) out.unshift(f);
  return out;
}

export function addImage(p, charId, img, now = Date.now) {
  return updateChar(p, charId, { images: [{ path: img.path, seed: Number.isFinite(img.seed) ? img.seed : null, at: now() }, ...(p.chars.find((c) => c.id === charId)?.images ?? [])].slice(0, MAX_IMAGES) });
}
export function removeImage(p, charId, path) {
  const c = p.chars.find((x) => x.id === charId);
  if (!c) return p;
  return updateChar(p, charId, { images: c.images.filter((i) => i.path !== path), cover: c.cover === path ? "" : c.cover });
}
export var coverOf = (c) => (c?.cover && c.images.some((i) => i.path === c.cover) ? c.cover : c?.images?.[0]?.path ?? "");

var tidy = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
export var composePrompt = (top, own) => [...tidy(top), ...tidy(own)].join(", ");
