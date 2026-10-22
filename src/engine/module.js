import { HASH_KEY, assetKey } from './hash.js';
import { slotted, stableJson } from './util.js';

export var AUTHOR_FIELDS = [
  "name",
  "description",
  "regex",
  "trigger",
  "cjs",
  "lowLevelAccess",
  "hideIcon",
  "backgroundEmbedding",
  "namespace",
  "customModuleToggle",
  "mcp"
];
export function loreIdentity(entry2) {
  return JSON.stringify([entry2?.mode ?? "", entry2?.comment ?? "", entry2?.key ?? "", entry2?.secondkey ?? ""]);
}
export function mergeLorebook(existing, incoming, keepExistingOnly) {
  const ex = slotted(existing, loreIdentity);
  const exBySlot = new Map(ex.map((e) => [e.slot, e.item]));
  const inc = slotted(incoming, loreIdentity);
  const incSlots = new Set(inc.map((e) => e.slot));
  const result = [];
  const stat = { added: 0, updated: 0, same: 0, keptExistingOnly: 0, removedExistingOnly: 0 };
  for (const { slot, item } of inc) {
    const old = exBySlot.get(slot);
    if (!old) stat.added++;
    else if (stableJson(old) === stableJson(item)) stat.same++;
    else stat.updated++;
    result.push(item);
  }
  for (const { slot, item } of ex) {
    if (incSlots.has(slot)) continue;
    if (keepExistingOnly) {
      result.push(item);
      stat.keptExistingOnly++;
    } else stat.removedExistingOnly++;
  }
  return { lorebook: result, stat };
}
export function planAssets(existingMod, incomingAssets, knownKeys, keepExistingOnly, incomingIcon) {
  const exAssets = existingMod?.assets ?? [];
  const exByName = /* @__PURE__ */ new Map();
  for (const a of exAssets) {
    const k = `${String(a[0]).toLowerCase()}|${a[2] ?? ""}`;
    if (!exByName.has(k)) exByName.set(k, a);
  }
  const toUpload = [];
  const entries = [];
  const stat = { added: 0, replaced: 0, unchanged: 0, upload: 0, uploadBytes: 0, reused: 0, keptExistingOnly: 0, removedExistingOnly: 0 };
  const uploadByHash = /* @__PURE__ */ new Map();
  const incNames = /* @__PURE__ */ new Set();
  for (const a of incomingAssets) {
    const nameKey = `${a.name.toLowerCase()}|${a.ext}`;
    incNames.add(nameKey);
    const old = exByName.get(nameKey);
    let path;
    if (a.hash) {
      const key = assetKey(a.hash);
      if (old && HASH_KEY.exec(old[1])?.[1] === a.hash) {
        path = old[1];
      } else if (knownKeys.has(key)) {
        path = key;
        stat.reused++;
      } else if (a.offset !== void 0 || a.source) {
        path = key;
        if (!uploadByHash.has(a.hash)) {
          uploadByHash.set(a.hash, a);
          toUpload.push(a);
          stat.upload++;
          stat.uploadBytes += a.size;
        }
      } else path = a.path;
    } else path = a.path ?? "";
    if (!old) stat.added++;
    else if (old[1] === path) stat.unchanged++;
    else stat.replaced++;
    entries.push({ asset: a, path });
  }
  const extra = [];
  for (const a of exAssets) {
    const nameKey = `${String(a[0]).toLowerCase()}|${a[2] ?? ""}`;
    if (incNames.has(nameKey)) continue;
    if (keepExistingOnly) {
      extra.push(a);
      stat.keptExistingOnly++;
    } else stat.removedExistingOnly++;
  }
  let iconPath = null;
  if (incomingIcon?.hash) {
    iconPath = assetKey(incomingIcon.hash);
    const sameAsOld = existingMod?.icon && HASH_KEY.exec(existingMod.icon)?.[1] === incomingIcon.hash;
    if (sameAsOld) iconPath = existingMod.icon;
    else if (!knownKeys.has(iconPath) && !uploadByHash.has(incomingIcon.hash)) {
      const iconAsset = { ...incomingIcon, name: "(모듈 아이콘)", ext: "png" };
      uploadByHash.set(incomingIcon.hash, iconAsset);
      toUpload.push(iconAsset);
      stat.upload++;
      stat.uploadBytes += incomingIcon.size ?? 0;
    }
  }
  return { entries, extra, toUpload, stat, iconPath };
}
export function buildMergedModule(existingMod, incoming, assetPlan, uploaded, opts) {
  const inc = incoming.module;
  const merged = existingMod ? { ...existingMod } : {};
  for (const f of AUTHOR_FIELDS) {
    if (f in inc) merged[f] = inc[f];
    else if (existingMod && f !== "name") delete merged[f];
  }
  merged.name = inc.name ?? existingMod?.name ?? "이름 없는 모듈";
  const lore = mergeLorebook(existingMod?.lorebook, inc.lorebook, opts.keepExistingOnly && !!existingMod);
  merged.lorebook = lore.lorebook;
  merged.assets = [
    ...assetPlan.entries.map(({ asset, path }) => [asset.name, asset.hash && uploaded.get(asset.hash) || path, asset.ext]),
    ...assetPlan.extra
  ];
  if (assetPlan.iconPath) merged.icon = incoming.icon?.hash && uploaded.get(incoming.icon.hash) || assetPlan.iconPath;
  else if (inc.icon && opts.knownKeys.has(inc.icon)) merged.icon = inc.icon;
  else if (existingMod?.icon) merged.icon = existingMod.icon;
  else delete merged.icon;
  merged.id = existingMod?.id ?? opts.newId();
  return { module: merged, lore: lore.stat };
}
export function fieldChanges(existingMod, inc) {
  if (!existingMod) return [];
  const labels = {
    name: "이름",
    description: "설명",
    regex: "정규식",
    trigger: "트리거",
    cjs: "스크립트",
    lowLevelAccess: "저수준 접근",
    hideIcon: "아이콘 숨김",
    backgroundEmbedding: "배경 HTML",
    namespace: "네임스페이스",
    customModuleToggle: "모듈 토글",
    mcp: "MCP"
  };
  const norm = (v) => v === void 0 || v === null || v === false || v === "" || Array.isArray(v) && !v.length ? null : v;
  return AUTHOR_FIELDS.filter((f) => stableJson(norm(existingMod[f])) !== stableJson(norm(inc[f]))).map((f) => labels[f] ?? f);
}
export function collectKnownKeys(modules) {
  const keys = /* @__PURE__ */ new Set();
  for (const m of modules ?? []) {
    for (const a of m?.assets ?? []) if (a?.[1]) keys.add(String(a[1]));
    if (m?.icon) keys.add(String(m.icon));
  }
  return keys;
}
