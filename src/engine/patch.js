import { slotted, stableJson } from './util.js';
import { CHAR_LISTS, MOD_LISTS, MOD_SPEC, USER_KEYS, applyView, listItemLabel, merge3, pickView, summarize } from './merge3.js';

var b64 = (u8) => {
  let s = "";
  for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode(...u8.subarray(i, i + 32768));
  return btoa(s);
};
var unb64 = (s) => {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
};
function specFor(kind, base, mine) {
  if (kind === "module") return MOD_SPEC;
  const lists = CHAR_LISTS;
  const scalars = [.../* @__PURE__ */ new Set([...Object.keys(base ?? {}), ...Object.keys(mine ?? {})])].filter((k) => !(k in lists) && !USER_KEYS.includes(k));
  return { scalars, lists, label: (k) => k, itemLabel: listItemLabel };
}
export function viewKeys(kind, base) {
  if (kind === "module") return [...MOD_SPEC.scalars, ...Object.keys(MOD_LISTS)];
  return [.../* @__PURE__ */ new Set([...Object.keys(base ?? {}), ...Object.keys(CHAR_LISTS)])].filter((k) => !USER_KEYS.includes(k));
}
var assetPathsOf = (v) => {
  const out = /* @__PURE__ */ new Set();
  for (const a of v?.assets ?? []) if (a?.[1]) out.add(String(a[1]));
  for (const k of ["emotionImages", "additionalAssets"]) for (const a of v?.[k] ?? []) if (a?.[1]) out.add(String(a[1]));
  if (v?.image) out.add(String(v.image));
  if (v?.icon) out.add(String(v.icon));
  return out;
};
export async function buildPatch({ kind, name, namespace, base, current, readAsset, includeAssets = true, version, note: note2, author }) {
  const keys = viewKeys(kind, base);
  const mine = pickView(current, keys);
  const baseView = pickView(base, keys);
  if (stableJson(mine) === stableJson(baseView)) return null;
  const changes = diffViews(kind, baseView, mine);
  if (!Object.keys(changes.scalars).length && !Object.values(changes.lists).some((l) => l.length)) return null;
  const patch = { type: "rbupatch", v: 2, kind, name, namespace: namespace || void 0, created: Date.now(), version: version || void 0, note: note2 || void 0, author: author || void 0, changes, assets: {} };
  if (includeAssets) {
    const before = assetPathsOf(baseView);
    for (const p of changedAssetPaths(changes)) {
      if (before.has(p)) continue;
      const d = await readAsset(p);
      if (d?.length) patch.assets[p] = b64(d instanceof Uint8Array ? d : new Uint8Array(d));
    }
  }
  return patch;
}
var has = (o, k) => !!o && k in o && o[k] !== void 0;
var listsOf = (kind) => kind === "module" ? MOD_LISTS : CHAR_LISTS;
function diffViews(kind, base, mine) {
  const lists = listsOf(kind);
  const scalars = {}, out = {};
  for (const k of /* @__PURE__ */ new Set([...Object.keys(base), ...Object.keys(mine)])) {
    if (k in lists) continue;
    if (stableJson(base[k] ?? null) === stableJson(mine[k] ?? null) && has(base, k) === has(mine, k)) continue;
    const c = {};
    if (has(base, k)) c.b = base[k];
    if (has(mine, k)) c.m = mine[k];
    scalars[k] = c;
  }
  for (const [k, idOf] of Object.entries(lists)) {
    if (!(k in base) && !(k in mine)) continue;
    const B = slotted(base[k], idOf), M = slotted(mine[k], idOf);
    const bm = new Map(B.map((x) => [x.slot, x.item]));
    const mm = new Map(M.map((x) => [x.slot, x.item]));
    const list = [];
    M.forEach((x, i) => {
      if (bm.has(x.slot)) {
        if (stableJson(bm.get(x.slot)) !== stableJson(x.item)) list.push({ slot: x.slot, b: bm.get(x.slot), m: x.item });
      } else list.push({ slot: x.slot, m: x.item, after: i ? M[i - 1].slot : null });
    });
    for (const x of B) if (!mm.has(x.slot)) list.push({ slot: x.slot, b: x.item });
    out[k] = list;
  }
  return { scalars, lists: out };
}
export var changedAssetPaths = (ch) => assetPathsOf(Object.fromEntries(Object.entries(ch.lists).map(([k, l]) => [k, l.filter((c) => "m" in c).map((c) => c.m)]).concat(Object.entries(ch.scalars).filter(([k, c]) => (k === "image" || k === "icon") && "m" in c).map(([k, c]) => [k, c.m]))));
function expand(patch, target) {
  const kind = patch.kind, lists = listsOf(kind), ch = patch.changes;
  const cur = pickView(target, viewKeys(kind, target));
  const base = {}, mine = {};
  for (const [k, v] of Object.entries(cur)) if (!(k in lists)) {
    base[k] = v;
    mine[k] = v;
  }
  for (const [k, c] of Object.entries(ch.scalars ?? {})) {
    if ("b" in c) base[k] = c.b;
    else delete base[k];
    if ("m" in c) mine[k] = c.m;
    else delete mine[k];
  }
  for (const [k, idOf] of Object.entries(lists)) {
    const changes = ch.lists?.[k] ?? [];
    if (!(k in cur) && !changes.length) continue;
    const bySlot = new Map(changes.map((c) => [c.slot, c]));
    const C = slotted(cur[k], idOf);
    const inCur = new Set(C.map((x) => x.slot));
    const bl = [], ml = [];
    for (const x of C) {
      const c = bySlot.get(x.slot);
      if (!c) {
        bl.push(x.item);
        ml.push({ slot: x.slot, item: x.item });
        continue;
      }
      if ("b" in c) bl.push(c.b);
      if ("m" in c) ml.push({ slot: x.slot, item: c.m });
    }
    for (const c of changes) {
      if (inCur.has(c.slot)) continue;
      if ("b" in c) bl.push(c.b);
      if (!("m" in c)) continue;
      if ("b" in c) {
        ml.push({ slot: c.slot, item: c.m });
        continue;
      }
      const at = c.after == null ? 0 : ml.findIndex((x) => x.slot === c.after) + 1;
      ml.splice(c.after == null ? at : at > 0 ? at : ml.length, 0, { slot: c.slot, item: c.m });
    }
    base[k] = bl;
    mine[k] = ml.map((x) => x.item);
  }
  return { base, mine };
}
export function parsePatch(text) {
  const j = JSON.parse(text);
  if (j?.type !== "rbupatch" || !(j.mine || j.changes) || !j.kind) throw new Error("내 수정 패치(.rbupatch) 파일이 아니에요");
  return j;
}
export function planPatch(patch, target, { choices } = {}) {
  const { base, mine } = patch.changes ? expand(patch, target) : patch;
  const spec = specFor(patch.kind, base, mine);
  const keys = patch.changes ? viewKeys(patch.kind, { ...base, ...mine, ...pickView(target, viewKeys(patch.kind, target)) }) : viewKeys(patch.kind, base);
  const r = merge3(base, pickView(target, keys), mine, spec, { choices: choices ?? /* @__PURE__ */ new Map(), keepExistingOnly: true });
  return { ...r, summary: summarize(r.items) };
}
export async function applyPatch(patch, target, { saveAsset, choices } = {}) {
  const remap = /* @__PURE__ */ new Map();
  for (const [p, data] of Object.entries(patch.assets ?? {})) remap.set(p, await saveAsset(unb64(data)));
  const fix = (v) => JSON.parse(JSON.stringify(v), (k, x) => typeof x === "string" && remap.has(x) ? remap.get(x) : x);
  const p2 = !remap.size ? patch : patch.changes ? { ...patch, changes: fix(patch.changes) } : { ...patch, mine: fix(patch.mine) };
  const r = planPatch(p2, target, { choices });
  return { result: applyView(target, r.view, { userKeys: patch.kind === "character" ? USER_KEYS : [] }), items: r.items, summary: r.summary, uploaded: remap.size };
}
