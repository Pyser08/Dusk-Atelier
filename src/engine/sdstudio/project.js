// 에셋 제작(애드온 sdstudio) 봇·모듈별 작업 묶음. 순수 — 모든 함수는 사본을 돌려준다.
// 구조(v2): settings(상위·하위·네거티브·시드·크기·샘플링·NAI 캐릭터 프롬프트·바이브·레퍼런스) · pieces(조각 모음)
//          chars(캐릭터 = 가운데 카드) → scenes(SDStudio 씬: 표정·포즈, 슬롯 조합·예약·이미지·순위) · folders(복장·소속, 안에 폴더·여러 폴더)
// v1(캐릭터에 이미지가 바로 달림)은 'default' 씬 하나로 옮긴다.
import { RESOLUTIONS, normalizeSampling, clampSize } from "./nai.js";
import { combinationCount, combinationAt, middleOf } from "./prompt.js";

export var MAX_IMAGES = 300;   // 씬당 목록 상한(넘으면 오래된 것부터 목록에서만 빠짐)
export var MAX_JOBS = 500;     // 한 번에 돌릴 예약 상한(조합 폭발 방지)
var str = (v, n = 8000) => String(v ?? "").slice(0, n);
var newId = () => Math.random().toString(36).slice(2, 10);
var num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function emptySettings() {
  return { top: "", back: "", neg: "", seed: { mode: "random", value: 0 }, size: { mode: "scene", w: 832, h: 1216 }, sampling: normalizeSampling(null), chars: [], vibes: [], refs: [], reserveDefault: 1 };
}
export function emptyProject() { return { v: 2, settings: emptySettings(), pieces: [], chars: [], folders: [] }; }

function normImage(i) {
  if (!i || typeof i.path !== "string" || !i.path) return null;
  return { path: i.path, seed: Number.isFinite(i.seed) ? i.seed : null, at: num(i.at, 0), prompt: str(i.prompt), rank: Number.isFinite(i.rank) ? i.rank : null, fav: !!i.fav, w: num(i.w, 0), h: num(i.h, 0), from: typeof i.from === "string" ? i.from.slice(0, 20) : "" };
}
function normScene(sc) {
  if (!sc || typeof sc.id !== "string" || !sc.id) return null;
  const slots = (Array.isArray(sc.slots) ? sc.slots : []).filter(Array.isArray).map((s) => s.filter((x) => x && typeof x === "object").map((x) => ({ prompt: str(x.prompt), on: x.on !== false })));
  const images = (Array.isArray(sc.images) ? sc.images : []).map(normImage).filter(Boolean).slice(0, MAX_IMAGES);
  return { id: sc.id, name: str(sc.name, 80) || "씬", slots, size: typeof sc.size === "string" ? sc.size : "", reserve: Math.max(0, Math.min(99, Math.round(num(sc.reserve, 0)))), cover: typeof sc.cover === "string" ? sc.cover : "", memo: str(sc.memo, 2000), images };
}
export function normalizeProject(x) {
  const e = emptyProject();
  if (!x || typeof x !== "object") return e;
  const v1 = x.v !== 2;
  const st = v1 ? { top: x.top, neg: x.neg, size: { mode: x.size && RESOLUTIONS[x.size] ? x.size : "scene" } } : (x.settings ?? {});
  const settings = {
    top: str(st.top), back: str(st.back), neg: str(st.neg),
    seed: { mode: ["random", "fixed", "chain"].includes(st.seed?.mode) ? st.seed.mode : "random", value: Math.max(0, Math.floor(num(st.seed?.value, 0))) >>> 0 },
    size: { mode: st.size?.mode === "custom" || st.size?.mode === "scene" || RESOLUTIONS[st.size?.mode] ? st.size.mode : "scene", ...clampSize(num(st.size?.w, 832), num(st.size?.h, 1216)) },
    sampling: normalizeSampling(st.sampling),
    chars: (Array.isArray(st.chars) ? st.chars : []).filter((c) => c && typeof c === "object").slice(0, 32).map((c) => ({ id: typeof c.id === "string" ? c.id : newId(), prompt: str(c.prompt), uc: str(c.uc), x: Math.max(0.1, Math.min(0.9, num(c.x, 0.5))), y: Math.max(0.1, Math.min(0.9, num(c.y, 0.5))), on: c.on !== false })),
    vibes: (Array.isArray(st.vibes) ? st.vibes : []).filter((v) => v && typeof v.path === "string").slice(0, 16).map((v) => ({ id: typeof v.id === "string" ? v.id : newId(), path: v.path, strength: Math.max(0, Math.min(1, num(v.strength, 0.6))), info: Math.max(0, Math.min(1, num(v.info, 1))), on: v.on !== false, enc: v.enc && typeof v.enc.data === "string" ? { model: str(v.enc.model, 40), info: num(v.enc.info, 1), data: v.enc.data } : null })),
    refs: (Array.isArray(st.refs) ? st.refs : []).filter((r) => r && typeof r.path === "string").slice(0, 2).map((r) => ({ id: typeof r.id === "string" ? r.id : newId(), path: r.path, strength: Math.max(0, Math.min(1, num(r.strength, 0.6))), fidelity: Math.max(0, Math.min(1, num(r.fidelity, 1))), type: ["character", "style", "character&style"].includes(r.type) ? r.type : "character&style", on: r.on !== false })),
    reserveDefault: Math.max(1, Math.min(20, Math.round(num(st.reserveDefault, 1))))
  };
  const pieces = (Array.isArray(x.pieces) ? x.pieces : []).filter((l) => l && typeof l.name === "string" && l.name).map((l) => ({ name: str(l.name, 40).replace(/[.<>,]/g, ""), pieces: (Array.isArray(l.pieces) ? l.pieces : []).filter((p) => p && typeof p.name === "string" && p.name).map((p) => ({ name: str(p.name, 40).replace(/[.<>,]/g, ""), prompt: str(p.prompt), multi: !!p.multi })) }));
  const chars = (Array.isArray(x.chars) ? x.chars : []).filter((c) => c && typeof c.id === "string" && c.id).map((c) => {
    let scenes = (Array.isArray(c.scenes) ? c.scenes : []).map(normScene).filter(Boolean);
    if (v1 && !c.scenes) scenes = [normScene({ id: `${c.id}-default`, name: "default", images: c.images ?? [], cover: c.cover })];
    return { id: c.id, name: str(c.name, 80) || "이름 없음", prompt: str(c.prompt), cover: typeof c.cover === "string" && !v1 ? c.cover : "", scenes };
  });
  const charIds = new Set(chars.map((c) => c.id));
  const raw = (Array.isArray(x.folders) ? x.folders : []).filter((f) => f && typeof f.id === "string" && f.id);
  const fIds = new Set(raw.map((f) => f.id));
  const folders = raw.map((f) => ({ id: f.id, name: str(f.name, 80) || "새 폴더", kind: f.kind === "outfit" || f.kind === "group" ? f.kind : "", parent: typeof f.parent === "string" && fIds.has(f.parent) && f.parent !== f.id ? f.parent : null, members: [...new Set((Array.isArray(f.members) ? f.members : []).filter((m) => charIds.has(m)))] }));
  const byId = new Map(folders.map((f) => [f.id, f]));
  for (const f of folders) { const seen = new Set([f.id]); let p = f.parent; while (p) { if (seen.has(p)) { f.parent = null; break; } seen.add(p); p = byId.get(p)?.parent ?? null; } }
  return { v: 2, settings, pieces, chars, folders };
}

// ── 설정 ──
export var setSettings = (p, patch) => ({ ...p, settings: { ...p.settings, ...patch } });

// ── 캐릭터 ──
export function addChar(p, { name = "", prompt = "" } = {}, mkId = newId) {
  const id = mkId();
  return { ...p, chars: [...p.chars, { id, name: str(name, 80).trim() || "새 캐릭터", prompt: str(prompt), cover: "", scenes: [{ id: mkId(), name: "default", slots: [], size: "", reserve: 0, cover: "", memo: "", images: [] }] }] };
}
export var updateChar = (p, id, patch) => ({ ...p, chars: p.chars.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c)) });
export var removeChar = (p, id) => ({ ...p, chars: p.chars.filter((c) => c.id !== id), folders: p.folders.map((f) => ({ ...f, members: f.members.filter((m) => m !== id) })) });
// 복제: 프롬프트·씬 구성만(그림·예약은 안 따라감), 같은 폴더에
export function duplicateChar(p, id, mkId = newId) {
  const c = p.chars.find((x) => x.id === id);
  if (!c) return p;
  const nid = mkId();
  const copy = { ...structuredClone(c), id: nid, name: `${c.name} 사본`, cover: "", scenes: c.scenes.map((s) => ({ ...structuredClone(s), id: mkId(), images: [], cover: "", reserve: 0 })) };
  const i = p.chars.findIndex((x) => x.id === id);
  return { ...p, chars: [...p.chars.slice(0, i + 1), copy, ...p.chars.slice(i + 1)], folders: p.folders.map((f) => (f.members.includes(id) ? { ...f, members: [...f.members, nid] } : f)) };
}
export var charOf = (p, id) => p.chars.find((c) => c.id === id) ?? null;
export var imageCount = (c) => (c?.scenes ?? []).reduce((n, s) => n + s.images.length, 0);
export function charCover(c) {
  if (!c) return "";
  if (c.cover && c.scenes.some((s) => s.images.some((i) => i.path === c.cover))) return c.cover;
  for (const s of c.scenes) { const v = coverOf(s); if (v) return v; }
  return "";
}

// ── 폴더 ──
export function addFolder(p, { name = "", kind = "", parent = null } = {}, mkId = newId) {
  const par = parent && p.folders.some((f) => f.id === parent) ? parent : null;
  return { ...p, folders: [...p.folders, { id: mkId(), name: str(name, 80).trim() || "새 폴더", kind: kind === "outfit" || kind === "group" ? kind : "", parent: par, members: [] }] };
}
export function updateFolder(p, id, { name, kind }) {
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
export var removeFolder = (p, id) => { const gone = descendants(p, id); return { ...p, folders: p.folders.filter((f) => !gone.has(f.id)) }; };
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
export function view(p, folderId) {
  const byId = new Map(p.chars.map((c) => [c.id, c]));
  const folders = p.folders.filter((f) => (f.parent ?? null) === (folderId ?? null));
  if (!folderId) { const filed = new Set(p.folders.flatMap((f) => f.members)); return { folders, chars: p.chars.filter((c) => !filed.has(c.id)) }; }
  return { folders, chars: (p.folders.find((x) => x.id === folderId)?.members ?? []).map((m) => byId.get(m)).filter(Boolean) };
}
export function rowChars(p, folderId) {
  const byId = new Map(p.chars.map((c) => [c.id, c])), ids = new Set();
  for (const fid of descendants(p, folderId)) for (const m of p.folders.find((f) => f.id === fid)?.members ?? []) ids.add(m);
  return [...ids].map((m) => byId.get(m)).filter(Boolean);
}
export var countIn = (p, folderId) => rowChars(p, folderId).length;
export function pathOf(p, folderId) {
  const byId = new Map(p.folders.map((f) => [f.id, f])), out = [];
  for (let f = byId.get(folderId); f && out.length < 50; f = f.parent ? byId.get(f.parent) : null) out.unshift(f);
  return out;
}

// ── 씬 ──
var mapScenes = (p, cid, fn) => updateChar(p, cid, { scenes: fn(charOf(p, cid)?.scenes ?? []) });
export function addScene(p, cid, { name = "", prompt = "" } = {}, mkId = newId) {
  const sc = { id: mkId(), name: str(name, 80).trim() || "새 씬", slots: prompt.trim() ? [[{ prompt: str(prompt), on: true }]] : [], size: "", reserve: 0, cover: "", memo: "", images: [] };
  return mapScenes(p, cid, (ss) => [...ss, sc]);
}
export var updateScene = (p, cid, sid, patch) => mapScenes(p, cid, (ss) => ss.map((s) => (s.id === sid ? { ...s, ...patch, id: s.id } : s)));
export var removeScenes = (p, cid, sids) => { const gone = new Set(sids); return mapScenes(p, cid, (ss) => ss.filter((s) => !gone.has(s.id))); };
export function duplicateScene(p, cid, sid, mkId = newId) {
  return mapScenes(p, cid, (ss) => { const i = ss.findIndex((s) => s.id === sid); if (i < 0) return ss; const c = { ...structuredClone(ss[i]), id: mkId(), name: `${ss[i].name} 사본`, images: [], cover: "", reserve: 0 }; return [...ss.slice(0, i + 1), c, ...ss.slice(i + 1)]; });
}
export function moveScene(p, cid, sid, to) {
  return mapScenes(p, cid, (ss) => { const i = ss.findIndex((s) => s.id === sid); if (i < 0) return ss; const a = [...ss]; const [x] = a.splice(i, 1); a.splice(Math.max(0, Math.min(a.length, to)), 0, x); return a; });
}
export var sortScenes = (p, cid, dir = "asc") => mapScenes(p, cid, (ss) => [...ss].sort((a, b) => a.name.localeCompare(b.name, "ko") * (dir === "desc" ? -1 : 1)));
export var sceneOf = (p, cid, sid) => charOf(p, cid)?.scenes.find((s) => s.id === sid) ?? null;
// 이름이 겹치지 않는 씬 이름(감정 이미지 이름이 되므로)
export function uniqueSceneName(c, wanted) {
  const base = String(wanted ?? "").trim() || "새 씬", used = new Set((c?.scenes ?? []).map((s) => s.name.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!used.has(`${base} ${n}`.toLowerCase())) return `${base} ${n}`;
}

// 슬롯(조합 열)
export var setSlots = (p, cid, sid, slots) => updateScene(p, cid, sid, { slots: slots.map((s) => s.map((x) => ({ prompt: str(x.prompt), on: x.on !== false }))) });

// ── 이미지 ──
export function addImage(p, cid, sid, img, now = Date.now) {
  const sc = sceneOf(p, cid, sid);
  if (!sc) return p;
  return updateScene(p, cid, sid, { images: [normImage({ ...img, at: now() }), ...sc.images].filter(Boolean).slice(0, MAX_IMAGES) });
}
export function removeImages(p, cid, sid, paths) {
  const sc = sceneOf(p, cid, sid), gone = new Set(paths);
  if (!sc) return p;
  let next = updateScene(p, cid, sid, { images: sc.images.filter((i) => !gone.has(i.path)), cover: gone.has(sc.cover) ? "" : sc.cover });
  const c = charOf(next, cid);
  if (c && gone.has(c.cover)) next = updateChar(next, cid, { cover: "" });
  return next;
}
export function setImage(p, cid, sid, path, patch) {
  const sc = sceneOf(p, cid, sid);
  return sc ? updateScene(p, cid, sid, { images: sc.images.map((i) => (i.path === path ? { ...i, ...patch, path: i.path } : i)) }) : p;
}
// 보이는 순서: 순위(월드컵) → 즐겨찾기 → 최신
export function sortedImages(sc) {
  return [...(sc?.images ?? [])].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || Number(b.fav) - Number(a.fav) || b.at - a.at);
}
export function coverOf(sc) {
  if (!sc?.images?.length) return "";
  if (sc.cover && sc.images.some((i) => i.path === sc.cover)) return sc.cover;
  return sortedImages(sc)[0].path;
}

// ── 예약·큐 ──
export var setReserve = (p, cid, sid, n) => updateScene(p, cid, sid, { reserve: Math.max(0, Math.min(99, Math.round(n))) });
export var reserveAll = (p, cid, n, sids = null) => mapScenes(p, cid, (ss) => ss.map((s) => (!sids || sids.includes(s.id) ? { ...s, reserve: Math.max(0, Math.min(99, s.reserve + n)) } : s)));
export var clearReserve = (p, cid) => (cid ? mapScenes(p, cid, (ss) => ss.map((s) => ({ ...s, reserve: 0 }))) : { ...p, chars: p.chars.map((c) => ({ ...c, scenes: c.scenes.map((s) => ({ ...s, reserve: 0 })) })) });
// 예약 1장 = 그 씬의 조합 전부(SDStudio와 같음). [{ cid, sid, combo }]
export function planJobs(p, cid = null) {
  const jobs = [];
  for (const c of p.chars) {
    if (cid && c.id !== cid) continue;
    for (const s of c.scenes) {
      const n = combinationCount(s.slots);
      for (let r = 0; r < s.reserve; r++) for (let k = 0; k < n; k++) { if (jobs.length >= MAX_JOBS) return jobs; jobs.push({ cid: c.id, sid: s.id, combo: k }); }
    }
  }
  return jobs;
}
export function reserveSummary(p, cid = null) {
  const cs = p.chars.filter((c) => !cid || c.id === cid);
  const scenes = cs.flatMap((c) => c.scenes);
  return { reserved: scenes.filter((s) => s.reserve > 0).length, scenes: scenes.length, jobs: planJobs(p, cid).length, combos: scenes.reduce((n, s) => n + combinationCount(s.slots), 0) };
}
export var middleFor = (sc, k) => middleOf(combinationAt(sc?.slots ?? [], k) ?? []);

// 시드(seedSchedule): random = 매번 새로 · fixed = 같은 값 · chain = 시작 값에서 장마다 xorshift
export function stepSeed(seed) {
  seed = seed >>> 0; seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
  return Math.max(1, seed);
}
export function seedFor(seedCfg, k, rng = Math.random) {
  const v = seedCfg?.value >>> 0;
  if (seedCfg?.mode === "fixed" && v) return v;
  if (seedCfg?.mode === "chain" && v) { let s = v; for (let i = 0; i < k; i++) s = stepSeed(s); return s; }
  return 1 + Math.floor(rng() * 0xfffffffe);
}
// 크기: 프로젝트가 '각 씬의 설정대로'면 씬 크기(없으면 세로), 아니면 프로젝트 값
export function sizeFor(sizeCfg, sc) {
  const pick = (k) => (RESOLUTIONS[k] ? { width: RESOLUTIONS[k].width, height: RESOLUTIONS[k].height } : null);
  const fromStr = (s) => { const m = /^(\d+)x(\d+)$/.exec(s ?? ""); return m ? clampSize(m[1], m[2]) : null; };
  if (sizeCfg?.mode === "custom") return clampSize(sizeCfg.w, sizeCfg.h);
  if (sizeCfg?.mode && sizeCfg.mode !== "scene") return pick(sizeCfg.mode) ?? pick("portrait");
  return pick(sc?.size) ?? fromStr(sc?.size) ?? pick("portrait");
}

// ── 이미지 월드컵(Tournament): 둘 중 하나를 고르며 올라가고, 떨어진 판의 크기가 순위(1위 = 우승) ──
export function startCup(paths, rng = Math.random) {
  const a = [...new Set(paths)];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.length <= 1) return { players: a, next: [], at: 0, size: a.length, ranks: a[0] ? { [a[0]]: 1 } : {}, total: a.length, done: true };
  return { players: a, next: [], at: 0, size: a.length, ranks: {}, total: a.length, done: false };
}
export var cupDone = (g) => !!g?.done;
export function cupPair(g) {
  if (g.players.length - g.at >= 2) return [g.players[g.at], g.players[g.at + 1]];
  return null;
}
export function cupPick(g, side) {
  const pair = cupPair(g);
  if (!pair) return g;
  const win = pair[side ? 1 : 0], lose = pair[side ? 0 : 1];
  const n = { ...g, next: [...g.next, win], at: g.at + 2, ranks: { ...g.ranks, [lose]: Math.floor(g.size / 2) + 1 } };
  return advanceCup(n);
}
function advanceCup(g) {
  if (g.players.length - g.at >= 2) return g;
  const carry = g.players.length - g.at === 1 ? [g.players[g.at]] : [];   // 홀수면 부전승
  const nextRound = [...g.next, ...carry];
  if (nextRound.length <= 1) return { ...g, players: nextRound, next: [], at: 0, size: nextRound.length, ranks: nextRound[0] ? { ...g.ranks, [nextRound[0]]: 1 } : g.ranks, done: true };
  return { ...g, players: nextRound, next: [], at: 0, size: nextRound.length };
}
export var cupRoundLabel = (g) => (g.done ? "끝" : g.size <= 2 ? "결승" : g.size <= 4 ? "4강" : `${g.size}강`);
export function applyCup(p, cid, sid, ranks) {
  const sc = sceneOf(p, cid, sid);
  return sc ? updateScene(p, cid, sid, { images: sc.images.map((i) => (ranks[i.path] != null ? { ...i, rank: ranks[i.path] } : i)) }) : p;
}
