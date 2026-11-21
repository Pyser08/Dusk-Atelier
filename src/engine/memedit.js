// 장기기억 애드온(인간다움 2단계): 공통 편집의 순수 부분 — 목록 고치기·추가·지우기와 무시 목록.
// 무시 목록 f.ignore = [{k, at, until?}]: 사용자가 지운 항목의 키. 기록기 보고가 같은 키면 반영하지 않는다(until 턴까지, 없으면 계속).
// 고친 값은 잠그지 않는다(user:true 표시만 — 다음 보고가 오면 그 값에서 이어감).
const IGNORE_MAX = 300;
const k1 = (s) => String(s ?? "").replace(/\s+/g, "").toLowerCase();

const KEYS = {
  told: (r) => [r.from, r.to, r.info],
  goal: (r) => [r.name, r.goal],
  status: (r) => [r.name, r.effect],
  mark: (r) => [r.name, r.part, r.desc],
  place: (r) => [r.name], item: (r) => [r.name], faction: (r) => [r.name],
  bond: (r) => [pair(r.a, r.b), r.moment], rift: (r) => [pair(r.a, r.b), r.about], belief: (r) => [r.who, r.thinks],
  bday: (r) => [r.name], couple: (r) => [r.name], plan: (r) => [r.md, r.what], day: (r) => [r.md, r.name], hol: (r) => [r.from, r.name],
};
const pair = (a, b) => [k1(a), k1(b)].sort().join("+");
export function ignoreKeyOf(r) {
  const f = KEYS[r?.kind];
  return f ? [r.kind, ...f(r).map(k1)].join("|") : null;
}

export function addIgnore(f, key, { turn = 0, ttl = 0 } = {}) {
  if (!key) return;
  const list = (Array.isArray(f.ignore) ? f.ignore : []).filter((x) => x.k !== key);
  list.push(ttl > 0 ? { k: key, at: turn, until: turn + ttl } : { k: key, at: turn });
  f.ignore = list.slice(-IGNORE_MAX);
}
export function dropIgnore(f, key) {
  if (Array.isArray(f?.ignore)) f.ignore = f.ignore.filter((x) => x.k !== key);
}
export function isIgnored(f, key, turn = 0) {
  return !!key && Array.isArray(f?.ignore) && f.ignore.some((x) => x.k === key && (x.until == null || turn < x.until));
}
export function filterIgnored(f, reports, turn = 0) {
  if (!Array.isArray(f?.ignore) || !f.ignore.length) return reports ?? [];
  return (reports ?? []).filter((r) => !isIgnored(f, ignoreKeyOf(r), turn));
}

// 분석 결과의 human(호칭·추억·갈등·오해)에서 지운 추억·갈등·오해를 뺀다(memoryhuman은 코어 공유라 반영 전에 거른다)
export function filterHuman(f, hm, turn = 0) {
  if (!hm || !Array.isArray(f?.ignore) || !f.ignore.length) return hm;
  const keep = (kind) => (arr) => (Array.isArray(arr) ? arr.filter((x) => !isIgnored(f, ignoreKeyOf({ ...x, kind }), turn)) : arr);
  return { ...hm, bond: keep("bond")(hm.bond), rift: keep("rift")(hm.rift), belief: keep("belief")(hm.belief) };
}

// 목록 편집(원본은 바꾸지 않고 새 배열)
export const editAt = (arr, i, vals) => arr.map((x, j) => (j === i ? { ...x, ...vals, user: true } : x));
export const addTo = (arr, item) => [...arr, { ...item, user: true }];
export const removeAt = (arr, i) => arr.filter((_, j) => j !== i);
// 그리는 사이에 목록이 바뀌었을 수 있어 원래 항목을 내용으로 다시 찾는다(못 찾으면 -1)
export function findSame(arr, orig, hint = -1) {
  const s = JSON.stringify(orig);
  if (hint >= 0 && JSON.stringify(arr[hint]) === s) return hint;
  return arr.findIndex((x) => JSON.stringify(x) === s);
}
