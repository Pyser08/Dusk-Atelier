// 읽기 전용 getDatabase 짧은 캐시 (v1.8.1 최적화).
// getDatabase(["characters", …])는 호스트가 DB를 통째로 복사해 넘기므로(봇·모듈이 많을수록 수백 ms, 리스 화면까지 멈춤)
// 탭을 오갈 때마다 다시 부르면 부담이 크다. 같은 키 묶음은 TTL 동안 한 번만 읽고, 동시에 부른 것도 하나로 합친다.
// · 돌려줄 때는 복사본을 줘서 부른 쪽이 고쳐도 캐시가 오염되지 않는다.
// · 쓰기 계열 호출이 있거나 invalidate()가 불리면(Dusk 창을 열 때 등) 바로 비운다.
// · 새 봇·모듈 감지처럼 항상 최신이어야 하는 곳은 fresh()를 쓴다.
const clone = (v) => (typeof structuredClone === "function" ? structuredClone(v) : v);
// 화면 목록·상태처럼 '읽기 전용'으로 쓰는 곳이 부른다. 캐시가 없는 환경(시험 등)에서는 그냥 getDatabase.
export const dbRead = (api, keys) => (typeof api.getDatabaseCached === "function" ? api.getDatabaseCached(keys) : api.getDatabase(keys));
export const WRITE_RE = /^(set|add|remove|delete|create|import|update|save|replace|move|rename|trash|restore)/i;

export function createDbCache(raw, { ttl = 20000, max = 6, now = () => Date.now() } = {}) {
  const map = new Map();   // keyString → { t, value } | { p: Promise }
  let gen = 0;             // 쓰기·비우기 때마다 올려서, 그 전에 시작한 읽기가 캐시에 남지 않게 한다
  const keyOf = (keys) => (Array.isArray(keys) ? [...keys].sort().join(",") : "*");
  const invalidate = () => { gen++; map.clear(); };
  const fresh = (keys) => raw.getDatabase(keys);

  async function get(keys) {
    const k = keyOf(keys), hit = map.get(k);
    if (hit?.value !== undefined && now() - hit.t < ttl) return clone(hit.value);
    if (hit?.p) return clone(await hit.p);
    const g = gen;
    const p = Promise.resolve(raw.getDatabase(keys));
    map.set(k, { p });
    let value;
    try { value = await p; } catch (e) { if (map.get(k)?.p === p) map.delete(k); throw e; }
    if (g === gen && value && typeof value === "object") {
      map.set(k, { t: now(), value: clone(value) });
      while (map.size > max) map.delete(map.keys().next().value);
    } else if (map.get(k)?.p === p) map.delete(k);
    return value;
  }
  return { get, fresh, invalidate, size: () => map.size };
}
