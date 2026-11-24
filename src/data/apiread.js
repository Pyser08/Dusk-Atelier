// 2.2.23 성능: 캐릭터(getCharacterFromIndex — 딸린 채팅 전부라 큰 채팅은 수십 MB)·채팅(getChatFromIndex) 읽기를 합친다.
// · 같은 것을 읽는 중이면 그 요청을 같이 기다린다(동시에 들어온 같은 요청은 하나로)
// · 다 읽은 뒤 짧게(기본 3초) 재사용한다 — 화면 하나를 그리며 여러 곳이 같은 걸 읽던 것을 한 번으로. 길게 두면 새 메시지를 놓치므로 짧게.
// · Dusk의 쓰기 계열 호출이 있으면(cacheGen이 바뀌면) 버린다.
// 받은 값은 여럿이 같이 쓰므로 고치면 안 된다(고쳐서 다시 저장하는 곳은 api를 직접 부를 것).
import { cacheGen } from "./dbcache.js";

const TTL = 3000, MAX = 8;
const memo = new Map();   // key → { api, g, done, t, p }
// fresh: 다 읽은 값은 쓰지 않지만, 지금 읽는 중인 같은 요청이 있으면 그것을 같이 기다린다(11-24: 홈 한 번에 캐릭터 통째 읽기 최대 4회 → 1회)
function read(api, key, fn, ttl = TTL, fresh = false) {
  const g = cacheGen(), hit = memo.get(key);
  if (hit && hit.api === api && hit.g === g && (!hit.done || (!fresh && Date.now() - hit.t < ttl))) return hit.p;
  const ent = { api, g, done: false, t: 0, p: null };
  ent.p = Promise.resolve().then(fn).then((v) => { ent.done = true; ent.t = Date.now(); return v; }, (e) => { if (memo.get(key) === ent) memo.delete(key); throw e; });
  memo.delete(key); memo.set(key, ent);
  while (memo.size > MAX) memo.delete(memo.keys().next().value);
  return ent.p;
}
// tag: 열린 채팅 위치 등 — 채팅을 바꾸면(새 채팅을 만들었을 수도 있으니) 다시 읽게 키에 넣는다
export const readChar = (api, ci, tag = "", { fresh = false } = {}) => read(api, `c:${ci}:${tag}`, () => api.getCharacterFromIndex(ci), TTL, fresh);
export const readChat = (api, ci, ti, { fresh = false } = {}) => read(api, `t:${ci}:${ti}`, () => api.getChatFromIndex(ci, ti), TTL, fresh);
export const dropReads = () => memo.clear();
