// 게이지 배수 저장(pluginStorage 한 키). 장기 기억 기록기·위키 기록기·Erosync 매 턴 계산이 같은 값을 읽는다.
import { GAUGE_KEY, normalizeGauge } from "../engine/gaugemult.js";

let cache = null;
export async function readGauge(api) {
  try {
    const raw = await api?.pluginStorage?.getItem?.(GAUGE_KEY);
    cache = normalizeGauge(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch { cache = cache ?? normalizeGauge(null); }
  return cache;
}
export async function saveGauge(api, patch) {
  const next = normalizeGauge({ ...(await readGauge(api)), ...(patch ?? {}) });
  await api.pluginStorage.setItem(GAUGE_KEY, JSON.stringify(next));
  cache = next;
  return next;
}
export const peekGauge = () => cache ?? normalizeGauge(null);
