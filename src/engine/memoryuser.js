// {{user}} = 나(플레이어) (1.8.3, 순수). 분석 결과에서 플레이어를 가리키는 이름을 모두 "{{user}}" 하나로 모은다.
// 리스가 프롬프트의 {{user}}를 페르소나 이름으로 바꿔 보내면 AI가 그 이름(또는 user·유저)으로 적어 같은 사람이 둘로 갈라지기 때문.
import { counterparts, pairView, nowOf, momentsOf } from "./memoryhuman.js";
export const USER = "{{user}}";
const GENERIC = ["{{user}}", "user", "유저", "플레이어", "player", "{{persona}}"];
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
export function userKeySet(names = []) { return new Set([...GENERIC, ...names].map(key).filter(Boolean)); }
export function normalizeUserNames(result, names = []) {
  if (!result || typeof result !== "object") return result;
  const set = userKeySet(names), fix = (n) => (typeof n === "string" && set.has(key(n)) ? USER : n);
  const arr = (a) => (Array.isArray(a) ? [...new Set(a.map(fix))] : a);
  return {
    ...result,
    ...(Array.isArray(result.people) ? { people: result.people.map((p) => ({ ...p, name: fix(p?.name), ...(p?.know ? { know: arr(p.know) } : {}) })) } : {}),
    ...(Array.isArray(result.rel) ? { rel: result.rel.map((x) => ({ ...x, from: fix(x?.from), to: fix(x?.to) })) } : {}),
    ...(Array.isArray(result.emo) ? { emo: result.emo.map((x) => ({ ...x, from: fix(x?.from), to: fix(x?.to) })) } : {}),
    ...(result.scene?.who ? { scene: { ...result.scene, who: arr(result.scene.who) } } : {})
  };
}

// ── 예전 기록 합치기 (1.8.3): 페르소나 이름(·user·유저 등)으로 따로 쌓인 인물을 {{user}} 하나로. 사용자가 미리 보기를 확인한 뒤에만 실행. ──
const isU = (set, n) => typeof n === "string" && set.has(key(n)) && key(n) !== key(USER);
const sideOf = (set, n) => (isU(set, n) ? USER : n);
function sources(folder, set) {
  return Object.entries(folder?.people ?? {}).filter(([pk, p]) => pk !== key(USER) && (isU(set, p?.name) || set.has(pk)));
}
export function userMergePlan(folder, names = []) {
  const set = userKeySet(names);
  const people = sources(folder, set).map(([pk, p]) => ({ key: pk, name: p.name, records: (p.records ?? []).length }));
  let links = 0;
  const touch = (...ns) => { if (ns.some((n) => isU(set, n))) links++; };
  for (const x of Object.values(folder?.emo ?? {})) touch(x.from, x.to);
  for (const x of Object.values(folder?.talk ?? {})) touch(x.from, x.to);
  for (const x of Object.values(folder?.rels ?? {})) touch(x.from, x.to);
  for (const x of Object.values(folder?.faces ?? {})) touch(x.who, x.to);
  for (const x of Object.values(folder?.exp ?? {})) touch(x.a, x.b);
  for (const x of [...(folder?.bonds ?? []), ...(folder?.rifts ?? [])]) touch(x.a, x.b);
  for (const x of folder?.beliefs ?? []) touch(x.who, x.by);
  for (const x of Object.values(folder?.start ?? {})) touch(x.a, x.b);
  return { people, links };
}
// 맵(키 = 이름 키 조합)을 새 이름으로 다시 키를 매긴다. 겹치면 merge(old, incoming)로 합친다.
function rekey(map, set, fields, keyOf, merge, to = USER, hit = isU) {
  if (!map) return map;
  const out = {};
  for (const v of Object.values(map)) {
    const nv = { ...v }; let moved = false;
    for (const f of fields) if (hit(set, nv[f])) { nv[f] = to; moved = true; }
    const k = keyOf(nv);
    out[k] = out[k] ? (moved ? merge(out[k], nv) : merge(nv, out[k])) : nv;
  }
  return out;
}

// 관계·감정·말투 등 이름으로 이어진 기록을 names → to 이름으로 옮긴다(겹치면 합침). {{user}} 합치기와 인물 합치기가 같이 쓴다.
function relinkWith(folder, set, to, hit) {
  const side = (n) => (hit(set, n) ? to : n);
  const pair = (a, b) => key(a) + ">" + key(b);
  const newer = (a, b) => ((b.at_ms ?? 0) >= (a.at_ms ?? 0) ? b : a);
  folder.emo = rekey(folder.emo, set, ["from", "to"], (x) => pair(x.from, x.to), (keep, add) => ({ ...keep, tags: { ...add.tags, ...keep.tags }, log: [...(add.log ?? []), ...(keep.log ?? [])] }), to, hit);
  folder.talk = rekey(folder.talk, set, ["from", "to"], (x) => pair(x.from, x.to), newer, to, hit);
  folder.rels = rekey(folder.rels, set, ["from", "to"], (x) => pair(x.from, x.to), (keep, add) => ({ ...keep, items: [...(add.items ?? []), ...(keep.items ?? [])] }), to, hit);
  folder.faces = rekey(folder.faces, set, ["who", "to"], (x) => pair(x.who, x.to), newer, to, hit);
  folder.start = rekey(folder.start, set, ["a", "b"], (x) => [key(x.a), key(x.b)].sort().join("|"), (keep, add) => (keep.level === "close" || add.level !== "close" ? keep : add), to, hit);   // 처음부터 알던 사이: 더 가까운 단계를 남긴다
  folder.exp = rekey(folder.exp, set, ["a", "b"], (x) => [key(x.a), key(x.b)].sort().join("|"), newer, to, hit);
  for (const x of [...(folder.bonds ?? []), ...(folder.rifts ?? [])]) { x.a = side(x.a); x.b = side(x.b); }
  for (const x of folder.beliefs ?? []) { x.who = side(x.who); if (x.by) x.by = side(x.by); }
  for (const s of folder.scenes ?? []) if (Array.isArray(s.who)) s.who = [...new Set(s.who.map((w) => side(w)))];
}
export function relinkNames(folder, names = [], to) {
  const tk = key(to), set = new Set(names.map(key).filter((k) => k && k !== tk));
  if (!set.size || !folder) return;
  relinkWith(folder, set, to, (st, n) => typeof n === "string" && st.has(key(n)));
}
export function mergeIntoUser(folder, names = []) {
  const set = userKeySet(names);
  const src = sources(folder, set);
  const plan = userMergePlan(folder, names);
  if (!src.length && !plan.links) return { people: 0, links: 0 };
  const uk = key(USER);
  const u = folder.people[uk] ??= { name: USER, aliases: [], pinned: false, records: [] };
  for (const [pk, p] of src) {
    u.records = [...(u.records ?? []), ...(p.records ?? [])];
    u.aliases = [...new Set([...(u.aliases ?? []), p.name, ...(p.aliases ?? [])].filter((a) => a && key(a) !== uk))];
    u.pinned = !!(u.pinned || p.pinned);
    delete folder.people[pk];
  }
  u.records.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  relinkWith(folder, set, USER, isU);
  return { people: src.length, links: plan.links };
}

// ── '나' 화면 (1.8.3): 다른 인물들이 나({{user}})를 어떻게 기억하는지 한데 모은다. ──
export const STAGE_LABEL = { "just met": "처음 봄", acquaintances: "아는 사이", close: "친한 사이", "very close": "아주 가까운 사이" };
export const TONE_LABEL = { formal: "존댓말", casual: "반말", mixed: "섞어 씀" };
export function meView(folder, now = nowOf(folder)) {
  const me = folder?.people?.[key(USER)] ?? null;
  const self = [USER];
  const others = counterparts(folder, self, now).map((c) => {
    const pv = pairView(folder, self, c.name, now);
    return {
      name: c.name, stage: c.stage, stageLabel: STAGE_LABEL[c.stage] ?? c.stage, shared: c.shared, warmth: c.warmth,
      feel: pv.feel.ba?.tags ?? {}, myFeel: pv.feel.ab?.tags ?? {},
      callsMe: pv.talk.ba?.call ?? "", toneToMe: pv.talk.ba?.tone ?? "", iCall: pv.talk.ab?.call ?? "",
      face: pv.face.ba ? { alone: pv.face.ba.alone ?? "", public: pv.face.ba.public ?? "" } : null,
      rifts: pv.rifts.filter((r) => !(r.state === "resolved" && (r.grudge ?? "none") === "none")).map((r) => ({ about: r.about ?? "", state: r.state })),
      bond: pv.bonds.at(-1)?.moment ?? "", start: pv.start,
      beliefs: pv.beliefs.filter((b) => b.open && key(b.who) === key(c.name)).map((b) => b.thinks)
    };
  });
  return { records: (me?.records ?? []).filter((r) => !r.orphan).length, moments: me ? momentsOf(me, now, { limit: 5 }) : [], others };
}
