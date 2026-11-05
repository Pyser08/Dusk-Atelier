// 인물별 선호(페티시) 태그와 금기 태그. 직접 적은 글만 저장하고 AI는 부르지 않는다.
// 키가 erosync_ 로 시작해 장기 기억 파일 내보내기·불러오기·지우기에 자동으로 함께 들어간다.
export const TAGS_KEY = "erosync_dusk_tags_v1";
export const MAX_TAGS = 12;
export const MAX_TAG_LEN = 30;
export function normTagList(v) {
  const src = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n，、]/) : [];
  const out = [];
  for (const x of src) {
    const t = String(x ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LEN);
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}
export function normTags(map) {
  const out = {};
  if (!map || typeof map !== "object" || Array.isArray(map)) return out;
  for (const [id, v] of Object.entries(map).slice(0, 500)) {
    const likes = normTagList(v?.likes), limits = normTagList(v?.limits).filter((t) => !likes.some((l) => l.toLowerCase() === t.toLowerCase()));
    if (id && (likes.length || limits.length)) out[String(id).slice(0, 200)] = { likes, limits };
  }
  return out;
}
export async function loadTags(api) {
  try { const raw = await api.pluginStorage.getItem(TAGS_KEY); return normTags(typeof raw === "string" ? JSON.parse(raw) : raw); } catch { return {}; }
}
export async function saveTags(api, map) {
  const next = normTags(map);
  await api.pluginStorage.setItem(TAGS_KEY, JSON.stringify(next));
  return next;
}
// 한 인물의 태그를 바꾼 새 맵(둘 다 비면 그 인물은 지운다). 한 태그가 선호와 금기에 같이 있으면 금기가 이긴다.
export function withProfileTags(map, id, v) {
  const likes = normTagList(v?.likes), limits = normTagList(v?.limits);
  const lowLimits = new Set(limits.map((t) => t.toLowerCase()));
  return normTags({ ...map, [id]: { likes: likes.filter((t) => !lowLimits.has(t.toLowerCase())), limits } });
}
