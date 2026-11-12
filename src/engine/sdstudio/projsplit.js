// 에셋 제작 작업 묶음을 저장 단위로 쪼개기(순수). 바뀐 조각만 저장하려고.
// head = 설정·조각 모음·폴더(소속 포함)·세트 목록·캐릭터 순서 / c:<세트>:<캐릭터id> = 캐릭터 하나(씬·그림 목록 포함)
// 지금 세트의 캐릭터와 다른 세트(sets.store)의 캐릭터를 같은 방식으로 쪼갠다.
export var HEAD = "head";
export var charKey = (setId, cid) => `c:${setId}:${cid}`;

export function splitProject(p) {
  const sets = p.sets ?? { active: "sfw", list: [], store: {} };
  const recs = new Map();
  const order = {};
  const put = (setId, chars) => { order[setId] = chars.map((c) => c.id); for (const c of chars) recs.set(charKey(setId, c.id), JSON.stringify(c)); };
  put(sets.active, p.chars ?? []);
  const store = {};
  for (const [sid, v] of Object.entries(sets.store ?? {})) { put(sid, v.chars ?? []); store[sid] = { members: v.members ?? {} }; }
  const head = { v: p.v ?? 2, settings: p.settings, pieces: p.pieces, folders: p.folders, loreSkip: p.loreSkip ?? [], sets: { active: sets.active, list: sets.list, store }, order };
  recs.set(HEAD, JSON.stringify(head));
  return recs;
}

// get(key) → 문자열|null. 빠진 캐릭터 기록은 건너뛰고 missing에 적는다(조용히 잃지 않게 호출 쪽이 알림)
export function joinProject(get) {
  const hs = get(HEAD);
  if (!hs) return null;
  const head = JSON.parse(hs), missing = [];
  const charsOf = (sid) => (head.order?.[sid] ?? []).map((id) => { const s = get(charKey(sid, id)); if (!s) { missing.push(charKey(sid, id)); return null; } try { return JSON.parse(s); } catch { missing.push(charKey(sid, id)); return null; } }).filter(Boolean);
  const sets = head.sets ?? {};
  const store = {};
  for (const [sid, v] of Object.entries(sets.store ?? {})) store[sid] = { chars: charsOf(sid), members: v.members ?? {} };
  const p = { v: head.v, settings: head.settings, pieces: head.pieces, folders: head.folders, loreSkip: head.loreSkip, chars: charsOf(sets.active), sets: { active: sets.active, list: sets.list, store } };
  return { project: p, missing };
}

// 지난번 저장(prev: Map key→문자열)과 견줘 바뀐 것만. → { puts: [[k, v]], dels: [k] }
export function diffRecords(prev, next) {
  const puts = [], dels = [];
  for (const [k, v] of next) if (prev?.get(k) !== v) puts.push([k, v]);
  if (prev) for (const k of prev.keys()) if (!next.has(k)) dels.push(k);
  return { puts, dels };
}
