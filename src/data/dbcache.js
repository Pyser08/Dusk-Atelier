// 읽기 전용 getDatabase 짧은 캐시 (v1.8.1 최적화).
// getDatabase(["characters", …])는 호스트가 DB를 통째로 복사해 넘기므로(봇·모듈이 많을수록 수백 ms, 리스 화면까지 멈춤)
// 탭을 오갈 때마다 다시 부르면 부담이 크다. 같은 키 묶음은 TTL 동안 한 번만 읽고, 동시에 부른 것도 하나로 합친다.
// · 돌려줄 때는 복사본을 줘서 부른 쪽이 고쳐도 캐시가 오염되지 않는다.
// · 쓰기 계열 호출이 있거나 invalidate()가 불리면(Dusk 창을 열 때 등) 바로 비운다.
// · 새 봇·모듈 감지처럼 항상 최신이어야 하는 곳은 fresh()를 쓴다.
const clone = (v) => (typeof structuredClone === "function" ? structuredClone(v) : v);
// 화면 목록·상태처럼 '읽기 전용'으로 쓰는 곳이 부른다. 캐시가 없는 환경(시험 등)에서는 그냥 getDatabase.
// shared:true — 읽기 전용으로 쓰는 호출이라 복사본을 만들지 않는다(v1.8.3: 봇·모듈이 많을 때 통째 복사가 화면을 멈추던 원인).
// 받은 값을 고치면 안 된다(최상위 객체는 새로 만들어 줘서 db.characters = … 같은 교체는 괜찮다).
export const dbRead = (api, keys) => (typeof api.getDatabaseCached === "function" ? api.getDatabaseCached(keys, { shared: true }) : api.getDatabase(keys));
// 화면용 짧은 캐시 전체의 세대 번호. 쓰기 계열 호출·invalidate 때 올라가고, 다른 캐시(열린 채팅 등)는 이 값이 바뀌면 버린다.
let GEN = 0;
export const cacheGen = () => GEN;
export const bumpCacheGen = () => ++GEN;
export const WRITE_RE = /^(set|add|remove|delete|create|import|update|save|replace|move|rename|trash|restore)/i;

export function createDbCache(raw, { ttl = 45000, max = 12, now = () => Date.now() } = {}) {
  // 키(characters·modules…)마다 따로 담는다: 화면마다 키 묶음이 달라도 이미 읽은 키는 다시 읽지 않는다(v1.8.3).
  const map = new Map();    // key → { t, value }
  const pend = new Map();   // key → Promise<{[key]: value}> (읽는 중)
  let gen = 0;              // 쓰기·비우기 때마다 올려서, 그 전에 시작한 읽기가 캐시에 남지 않게 한다
  const isList = (keys) => Array.isArray(keys) && keys.length > 0 && keys.every((k) => typeof k === "string");
  const invalidate = () => { gen++; GEN++; map.clear(); pend.clear(); };
  // 창을 열 때: 방금(maxAge 안) 읽은 것은 남기고 오래된 것만 버린다. 쓰기가 있었다면 이미 hard invalidate로 비워졌다.
  const soften = (maxAge = 15000) => { const t = now(); for (const [k, e] of map) if (t - e.t >= maxAge) map.delete(k); };
  const fresh = (keys) => raw.getDatabase(keys);
  const out = (keys, src, shared) => { const o = {}; for (const k of keys) if (k in src) o[k] = shared ? src[k] : clone(src[k]); return o; };
  const put = (keys, value) => { if (!value || typeof value !== "object") return; const t = now(); for (const k of keys) if (k in value) { map.delete(k); map.set(k, { t, value: value[k] }); } while (map.size > max) map.delete(map.keys().next().value); };

  async function get(keys, { shared = false } = {}) {
    if (!isList(keys)) {   // 전체 읽기("*")는 캐시하지 않는다
      return raw.getDatabase(keys);
    }
    const t = now(), have = {}, wait = [];
    const missing = [];
    for (const k of keys) {
      const e = map.get(k);
      if (e && t - e.t < ttl) have[k] = e.value;
      else if (pend.has(k)) wait.push(pend.get(k));
      else missing.push(k);
    }
    if (missing.length) {
      const g = gen;
      const p = Promise.resolve(raw.getDatabase(missing));
      for (const k of missing) pend.set(k, p);
      const done = p.then((v) => { if (g === gen) put(missing, v); return v; });
      done.then(() => {}, () => {}).then(() => { for (const k of missing) if (pend.get(k) === p) pend.delete(k); });
      wait.push(done);
    }
    const parts = await Promise.all(wait);
    const merged = { ...have };
    for (const part of parts) if (part && typeof part === "object") for (const k of keys) if (k in part && !(k in merged)) merged[k] = part[k];
    // 읽기 권한이 없는 등으로 빈 값이 오면 그대로 돌려준다(호출한 쪽이 처리)
    if (!keys.some((k) => k in merged) && parts.length === 1 && !parts[0]) return parts[0];
    return out(keys, merged, shared);
  }
  // 감시처럼 '항상 최신'으로 읽어야 하는 곳이 읽은 결과도 캐시에 넣어 둔다(탭을 처음 열 때 다시 읽지 않게)
  async function warm(keys) { const g = gen, v = await raw.getDatabase(keys); if (g === gen && isList(keys)) put(keys, v); return v; }
  // 이미 (유효하게) 담겨 있는지 / 다른 경로로 읽은 값을 직접 담기(단계별로 읽은 봇 목록 등)
  const has = (keys) => isList(keys) && keys.every((k) => { const e = map.get(k); return e && now() - e.t < ttl; });
  const store = (keys, value) => { if (isList(keys)) put(keys, value); };
  return { get, fresh, warm, has, store, invalidate, soften, size: () => map.size };
}
