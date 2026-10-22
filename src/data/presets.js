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
