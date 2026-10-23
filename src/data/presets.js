import { commit, hasAssets, sortIds } from './modules.js';

export var PRESET_KEY = "rbm:presets:v1";
export var DEFAULT_PRESET = "기본";
export var isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(globalThis.navigator?.userAgent ?? "");
export async function loadPresets(api) {
  try {
    const raw = await api.pluginStorage.getItem(PRESET_KEY);
    const v = raw ? typeof raw === "string" ? JSON.parse(raw) : raw : null;
    if (v && typeof v === "object" && v.presets && typeof v.presets === "object") return v;
  } catch {
  }
  return { active: DEFAULT_PRESET, presets: {} };
}
export async function savePresets(api, data) {
  await api.pluginStorage.setItem(PRESET_KEY, JSON.stringify(data));
  return data;
}
export function snapshotOf(entries, enabledModules) {
  const moduleStates = {};
  entries.forEach((e, i) => {
    moduleStates[e.module.id] = { enabled: !!e.enabled, displayOrder: i * 100 };
  });
  return { moduleStates, globalEnabledIds: [...enabledModules] };
}
export async function recordActive(api, entries, enabledModules) {
  const data = await loadPresets(api);
  const name = data.active || DEFAULT_PRESET;
  data.active = name;
  data.presets[name] = snapshotOf(entries, enabledModules);
  await savePresets(api, data);
  return data;
}
export async function applyPreset(api, name) {
  const data = await loadPresets(api);
  const p = data.presets[name];
  if (!p) throw new Error(`프리셋 "${name}"이(가) 없어요.`);
  let skipped = 0;
  await commit(api, (d) => {
    const st = p.moduleStates ?? {};
    for (const e of d.entries) {
      const s = st[e.module.id];
      if (!s) continue;
      if (!s.enabled && hasAssets(e.module)) {
        skipped++;
        e.enabled = true;
        continue;
      }
      e.enabled = !!s.enabled;
    }
    const ord = (id) => st[id]?.displayOrder ?? Infinity;
    d.entries = d.entries.map((e, i) => ({ e, i })).sort((a, b) => ord(a.e.module.id) - ord(b.e.module.id) || a.i - b.i).map((x) => x.e);
    const on = new Set(d.entries.filter((e) => e.enabled).map((e) => e.module.id));
    d.enabledModules = sortIds((p.globalEnabledIds ?? []).filter((id) => on.has(id)), d.entries.map((e) => e.module.id));
  }, { chars: true });
  data.active = name;
  await savePresets(api, data);
  return { skipped };
}
export function pairSwitchTarget(data, deviceType) {
  if (!data) return null;
  const { defaultMobile: m, defaultDesktop: dsk, active, lastDeviceType, presets } = data;
  if (!lastDeviceType || lastDeviceType === deviceType) return null;
  if (!m || !dsk) return null;
  if (active !== m && active !== dsk) return null;
  const target = deviceType === "mobile" ? m : dsk;
  if (target === active || !presets?.[target]) return null;
  return target;
}
export function uniquePresetName(data, base) {
  let name = base.trim() || "새 프리셋", i = 2;
  while (data.presets[name]) name = `${base.trim() || "새 프리셋"} (${i++})`;
  return name;
}
// ── 프리셋 공유 (1.4.6) ──
// 파일/코드 모두 같은 내용: { type: "rbm-presets", v: 2, presets, names: { 모듈id: 이름 } }
// 받는 쪽에서 모듈 id가 다르면 이름으로 다시 연결한다.
var SHARE_PREFIX = "DA-PRESET:";
export function presetBundle(presets, modules) {
  const used = new Set();
  for (const p of Object.values(presets)) {
    for (const id of Object.keys(p?.moduleStates ?? {})) used.add(id);
    for (const id of p?.globalEnabledIds ?? []) used.add(id);
  }
  const names = {};
  for (const m of modules ?? []) if (m?.id && used.has(m.id)) names[m.id] = m.name ?? "";
  return { type: "rbm-presets", v: 2, presets, names };
}
export function encodePresetCode(bundle) {
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return SHARE_PREFIX + btoa(bin);
}
// 파일 내용(JSON)이나 공유 코드를 받아 묶음으로 바꾼다
export function parsePresetBundle(text) {
  let t = String(text ?? "").trim();
  let j;
  if (t.startsWith(SHARE_PREFIX)) {
    const bin = atob(t.slice(SHARE_PREFIX.length).replace(/\s+/g, ""));
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    j = JSON.parse(new TextDecoder().decode(u8));
  } else j = JSON.parse(t);
  const presets = j?.presets && typeof j.presets === "object" ? j.presets : null;
  if (!presets) throw new Error("프리셋 파일·코드가 아니에요");
  const valid = Object.fromEntries(Object.entries(presets).filter(([, p]) => p && typeof p.moduleStates === "object"));
  if (!Object.keys(valid).length) throw new Error("들어 있는 프리셋이 없어요");
  return { presets: valid, names: j.names && typeof j.names === "object" ? j.names : {} };
}
// 받은 프리셋의 모듈 id를 이 기기의 모듈에 맞춘다. 이름이 하나뿐인 모듈만 이름으로 연결한다.
export function remapPreset(p, names, modules) {
  const have = new Set((modules ?? []).map((m) => m.id));
  const byName = new Map();
  for (const m of modules ?? []) {
    const k = String(m.name ?? "").trim();
    if (!k) continue;
    byName.set(k, byName.has(k) ? null : m.id);
  }
  const map = (id) => {
    if (have.has(id)) return id;
    const n = String(names?.[id] ?? "").trim();
    return n && byName.get(n) || null;
  };
  const moduleStates = {};
  let matched = 0, renamed = 0, missing = 0;
  for (const [id, s] of Object.entries(p.moduleStates ?? {})) {
    const to = map(id);
    if (!to) {
      missing++;
      continue;
    }
    if (to !== id) renamed++;
    matched++;
    moduleStates[to] = s;
  }
  const globalEnabledIds = [...new Set((p.globalEnabledIds ?? []).map(map).filter(Boolean))];
  return { preset: { ...p, moduleStates, globalEnabledIds }, matched, renamed, missing };
}
