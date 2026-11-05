// Erosync 수위 프리셋: 수위(콘텐츠 모드·극단 행동 수위·NSFW+)·동작 설정·집착 방지를 한 묶음으로 저장하고 지금 열린 봇에 한 번에 적용한다.
// 프리셋 목록은 Dusk 쪽(dusk.erosync.presets)에 저장해 봇과 상관없이 쓴다. 적용은 지금 열린 봇의 수위·공용 동작 설정·집착 방지에 반영된다.
export const PRESET_KEY = "dusk.erosync.presets";
export const MAX_PRESETS = 20;
const str = (v, n) => String(v ?? "").trim().slice(0, n);
export function normPreset(v) {
  if (!v || typeof v !== "object") return null;
  const name = str(v.name, 40);
  if (!name) return null;
  const lv = v.level && typeof v.level === "object" ? v.level : {};
  const level = {};
  if (lv.contentMode === "sfw" || lv.contentMode === "nsfw") level.contentMode = lv.contentMode;
  if (typeof lv.extremityLimit === "string" && lv.extremityLimit) level.extremityLimit = str(lv.extremityLimit, 40);
  if (typeof lv.nsfwPlus === "boolean") level.nsfwPlus = lv.nsfwPlus;
  const config = {};
  for (const [k, x] of Object.entries(v.config && typeof v.config === "object" ? v.config : {})) if (["string", "number", "boolean"].includes(typeof x)) config[str(k, 40)] = x;
  const g = v.guard && typeof v.guard === "object" ? v.guard : null;
  return { id: str(v.id, 40) || `p${Date.now().toString(36)}`, name, level, config, guard: g };
}
export const normPresets = (list) => (Array.isArray(list) ? list : []).map(normPreset).filter(Boolean).slice(0, MAX_PRESETS);
export async function loadPresets(api) {
  try { const raw = await api.pluginStorage.getItem(PRESET_KEY); return normPresets(typeof raw === "string" ? JSON.parse(raw) : raw); } catch { return []; }
}
export async function savePresets(api, list) {
  const next = normPresets(list);
  await api.pluginStorage.setItem(PRESET_KEY, JSON.stringify(next));
  return next;
}
// 같은 이름이면 덮어쓴다. 새 이름이 20개를 넘으면 거절한다.
export function upsertPreset(list, preset) {
  const p = normPreset(preset);
  if (!p) return { ok: false, reason: "이름을 적어 주세요", list };
  const i = list.findIndex((x) => x.name === p.name);
  if (i >= 0) { const next = list.slice(); next[i] = { ...p, id: list[i].id }; return { ok: true, list: next, replaced: true }; }
  if (list.length >= MAX_PRESETS) return { ok: false, reason: `프리셋은 ${MAX_PRESETS}개까지 만들 수 있어요`, list };
  return { ok: true, list: [...list, p], replaced: false };
}
