// 폴더 관리/쉬운 로어북 — 봇 요약 캐시 (순수).
// 봇 전체(채팅 포함)를 열 때마다 읽으면 느리다 → 책장에 필요한 것만 요약해 저장하고, 서명(sig)이 바뀐 봇만 다시 훑는다.
//   요약: { id, ci, name, image, sig, genre, kind, todo:[{name, keys:[{key,why,inside}], confirm}], on:[이름], at }
import { scan, isEasy } from "./easylore.js";
import { classify } from "./easyfolder.js";

export const CACHE_VERSION = 2;   // 2: 인물 판별(todo·maybe·other)

// 짧은 해시 (FNV-1a 32비트) — 같은 글이면 같은 값
export function hash(s) {
  let h = 0x811c9dc5;
  const t = String(s ?? "");
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
const loreSig = (l) => (l ?? []).map((e) => [e.key, e.secondkey, e.comment, e.alwaysActive ? 1 : 0, e.useRegex ? 1 : 0, e.mode, (e.content ?? "").length, e.extentions?.da_rid ?? "", e.extentions?.da_easy ? 1 : 0].join("\u0001")).join("\u0002");
// 요약에 영향을 주는 것만으로 서명을 만든다 (채팅 글은 안 본다)
export const sigOf = (c) => hash([c?.name, c?.image, c?.type, (c?.tags ?? []).join(","), String(c?.desc ?? "").slice(0, 3000), String(c?.creatorNotes ?? "").slice(0, 1000), loreSig(c?.globalLore)].join("\u0003"));

// opts: { memNames, overrides, ai } — 인물 판별에 쓰는 것. 바뀌면 다시 훑도록 서명(osig)에 넣는다
export const optSig = (o) => hash(JSON.stringify([o?.memNames ?? [], o?.overrides ?? {}, o?.ai ?? {}]));
export function summarize(c, ci, now = Date.now(), opts = {}) {
  const cls = classify(c);
  const all = scan(c?.globalLore ?? [], opts).map((p) => ({ name: p.name, ek: p.ek, person: p.person, keys: p.risks.map((r) => ({ key: r.key, why: r.why, inside: (r.inside ?? []).slice(0, 4) })), confirm: p.confirm }));
  const todo = all.filter((p) => p.person === "p"), maybe = all.filter((p) => p.person === "?"), other = all.filter((p) => p.person === "n");
  const lore = c?.globalLore ?? [], chats = c?.chats ?? [];
  const on = [...lore, ...chats.flatMap((t) => t?.localLore ?? [])].filter(isEasy).map((e) => e.comment || e.key);
  return { id: String(c.chaId), ci, name: c.name || "(이름 없음)", image: c.image || "", sig: sigOf(c), osig: optSig(opts), genre: cls.genre, kind: cls.kind, todo, maybe, other, on, at: now };
}

// 순서 목록의 봇 id 전부 (폴더 안 포함)
export function orderIds(order) {
  const out = [];
  const walk = (o) => { for (const x of o ?? []) { if (typeof x === "string") out.push(x); else if (x && Array.isArray(x.data)) walk(x.data); } };
  walk(order);
  return [...new Set(out)];
}

// 캐시와 순서 목록 맞추기: 새로 생긴 봇(missing) · 사라진 봇(gone)
export function reconcile(cache, order) {
  const ids = orderIds(order);
  const have = new Set(Object.keys(cache?.bots ?? {}));
  const now = new Set(ids);
  return { missing: ids.filter((id) => !have.has(id)), gone: [...have].filter((id) => !now.has(id)) };
}

// 읽은 봇을 캐시에 반영. 서명이 같으면 다시 훑지 않는다 → { cache, changed:[id] }
export function absorb(cache, read, now = Date.now(), optsFor = () => ({})) {
  const bots = { ...(cache?.bots ?? {}) };
  const changed = [];
  for (const { c, ci } of read) {
    if (!c || c.trashTime || !c.chaId) continue;
    const id = String(c.chaId), old = bots[id];
    const opts = optsFor(id);
    if (old && old.sig === sigOf(c) && old.osig === optSig(opts) && old.maybe) { if (old.ci !== ci) bots[id] = { ...old, ci }; continue; }
    bots[id] = summarize(c, ci, now, opts);
    changed.push(id);
  }
  return { cache: { v: CACHE_VERSION, bots, at: now }, changed };
}
export const drop = (cache, ids) => {
  const bots = { ...(cache?.bots ?? {}) };
  for (const id of ids) delete bots[id];
  return { ...cache, bots };
};
export const freshCache = (raw) => (raw && raw.v === CACHE_VERSION && raw.bots ? raw : { v: CACHE_VERSION, bots: {}, at: 0 });
