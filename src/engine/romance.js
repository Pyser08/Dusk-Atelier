// 2.2.6 연애 흐름(순수): 고백 → 수락(사귐)/거절(어색한 기간), 이별(미련이 천천히 식음), 오랜만의 재회(그리움),
// 질투가 저절로 생기기(애인·짝사랑 상대가 다른 사람과 가까워질 때), 삼각관계(연적), 짝사랑, 비밀 연애, 관계 연표.
// 상태는 folder.romance = { events: [...], awkward: {쌍: 끝 턴}, secret: {쌍: true}, lovers: [쌍 키] }에 둔다.
import { loverPairs, pairKey } from "./lover.js";
import { scaleDelta } from "./gaugemult.js";

const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const USER = "{{user}}";
export const EVENT_MAX = 80, AWKWARD_TURNS = 8, REUNION_GAP = 15;
export const EVENT_LABEL = Object.freeze({ known: "이미 아는 사이로 시작", met: "처음 만남", confess: "고백", accept: "사귀기 시작", reject: "고백 거절", breakup: "헤어짐", reunion: "오랜만에 재회", jealous: "질투", rivalry: "연적이 됨", fight: "첫 다툼" });

const R = (folder) => (folder.romance ??= { events: [] });
const tagsOf = (folder, a, b) => folder?.emo?.[key(a) + ">" + key(b)]?.tags ?? {};
const latest = (folder) => [...(folder?.scenes ?? [])].reverse().find((s) => !s.orphan) ?? null;
function addEvent(folder, ev) {
  const r = R(folder);
  r.events.push(ev);
  if (r.events.length > EVENT_MAX) r.events = r.events.slice(-EVENT_MAX);
}
const hasEvent = (folder, kind, a, b) => (folder?.romance?.events ?? []).some((e) => e.kind === kind && pairKey(e.a, e.b) === pairKey(a, b));
function bump(folder, from, to, tag, d, why, at, now, gauge) {
  const k = key(from) + ">" + key(to), p = (folder.emo ??= {})[k] ??= { from, to, tags: {}, log: [] };
  const step = scaleDelta(d, gauge); if (!step) return 0;
  const before = p.tags[tag], v = Math.max(0, Math.min(10, (before ?? 0) + step));
  if (v === before) return 0;
  p.tags[tag] = v; p.log.push({ t: { [tag]: v }, from: { [tag]: before ?? null }, why, at, at_ms: now });
  return 1;
}

// 짝사랑: A→B 끌림 5 이상, B→A 끌림 2 이하(또는 없음), 애인 아님
export function unrequited(folder) {
  const lovers = new Set(loverPairs(folder).map((p) => pairKey(p.a, p.b))), out = [];
  for (const p of Object.values(folder?.emo ?? {})) {
    const v = p?.tags?.attraction ?? 0;
    if (v < 5 || lovers.has(pairKey(p.from, p.to))) continue;
    const back = tagsOf(folder, p.to, p.from).attraction ?? 0;
    if (back <= 2) out.push({ from: p.from, to: p.to, v, back });
  }
  return out;
}
// 삼각관계: 두 사람(A, C)이 같은 B에게 끌림 5 이상(또는 한쪽은 B의 애인)
export function triangles(folder) {
  const by = new Map();
  for (const p of Object.values(folder?.emo ?? {})) if ((p?.tags?.attraction ?? 0) >= 5) { const k = key(p.to); (by.get(k) ?? by.set(k, { to: p.to, who: [] }).get(k)).who.push(p.from); }
  for (const lp of loverPairs(folder)) for (const [x, y] of [[lp.a, lp.b], [lp.b, lp.a]]) { const k = key(y); const g = by.get(k) ?? by.set(k, { to: y, who: [] }).get(k); if (!g.who.some((w) => key(w) === key(x))) g.who.push(x); }
  const out = [];
  for (const g of by.values()) for (let i = 0; i < g.who.length; i++) for (let j = i + 1; j < g.who.length; j++) out.push({ a: g.who[i], c: g.who[j], over: g.to });
  return out;
}
export const isSecret = (folder, a, b) => !!folder?.romance?.secret?.[pairKey(a, b)];
export function setSecret(folder, a, b, on) { const r = R(folder); r.secret ??= {}; if (on) r.secret[pairKey(a, b)] = true; else delete r.secret[pairKey(a, b)]; }
export const awkwardLeft = (folder, a, b, at) => Math.max(0, (folder?.romance?.awkward?.[pairKey(a, b)] ?? -1) - (at ?? 0));
export const exPairs = (folder) => (folder?.romance?.events ?? []).filter((e) => e.kind === "breakup" && !loverPairs(folder).some((p) => pairKey(p.a, p.b) === pairKey(e.a, e.b)));

// 분석 한 번(응답 하나) 뒤에 부른다. emos: 이번 응답의 감정 변화(deed 있는 줄 포함), loversBefore: 반영 전 애인 쌍 키
export function applyRomance(folder, emos, loversBefore, anchor = null, now = Date.now(), { gauge = null } = {}) {
  const at = anchor?.at ?? null, sc = latest(folder), when = sc?.iso || sc?.when || "";
  const ev = (kind, a, b, extra = {}) => addEvent(folder, { kind, a, b, at, ...(when ? { when } : {}), ...extra });
  const r = R(folder), out = { events: 0 };
  const loversNow = loverPairs(folder), nowKeys = new Set(loversNow.map((p) => pairKey(p.a, p.b)));
  // 처음 만남: 장면에 함께 나온 두 사람(첫 기록)
  if (sc && Array.isArray(sc.who)) for (let i = 0; i < sc.who.length; i++) for (let j = i + 1; j < sc.who.length; j++) {
    const a = sc.who[i], b = sc.who[j];
    const k = pairKey(a, b), first = ((r.firsts ??= {}).met ??= {});
    if (key(a) !== key(b) && !first[k]) { first[k] = { a, b, at, ...(when ? { when } : {}) }; out.events++; }
  }
  // 고백·거절
  for (const e of emos ?? []) {
    if (e.deed === "confess" && !nowKeys.has(pairKey(e.from, e.to))) { ev("confess", e.from, e.to, { by: e.from }); out.events++; }
    if (e.deed === "refuse") {
      const conf = [...(r.events ?? [])].reverse().find((x) => x.kind === "confess" && key(x.by) === key(e.to) && key(x.b) === key(e.from) && at != null && x.at != null && at - x.at <= 3);
      if (conf && !r.events.some((x) => x.kind === "reject" && x.at === at && pairKey(x.a, x.b) === pairKey(e.from, e.to))) {
        ev("reject", e.to, e.from, { by: e.from }); out.events++;
        (r.awkward ??= {})[pairKey(e.from, e.to)] = (at ?? 0) + AWKWARD_TURNS;
        bump(folder, e.to, e.from, "affection", -1, "고백을 거절당해 서먹함", at, now, gauge);
      }
    }
  }
  // 사귀기 시작 / 헤어짐
  for (const p of loversNow) if (!loversBefore.has(pairKey(p.a, p.b))) { ev("accept", p.a, p.b); out.events++; if (r.awkward) delete r.awkward[pairKey(p.a, p.b)]; }
  for (const k of loversBefore) if (!nowKeys.has(k)) {
    const [a, b] = (r.lastLovers ?? {})[k] ?? k.split("~");
    ev("breakup", a, b); out.events++;
  }
  r.lastLovers = Object.fromEntries(loversNow.map((p) => [pairKey(p.a, p.b), [p.a, p.b]]));
  // 오랜만의 재회: 애인끼리 마지막으로 함께한 장면에서 15턴 넘게 지나 다시 같은 장면 → 그리움으로 끌림 +1
  if (sc && at != null) for (const p of loversNow) {
    const inNow = (sc.who ?? []).some((w) => key(w) === key(p.a)) && (sc.who ?? []).some((w) => key(w) === key(p.b));
    if (!inNow) continue;
    const prev = [...folder.scenes].reverse().find((s) => s !== sc && !s.orphan && s.at != null && s.at < at && (s.who ?? []).some((w) => key(w) === key(p.a)) && (s.who ?? []).some((w) => key(w) === key(p.b)));
    if (prev && at - prev.at >= REUNION_GAP) {
      ev("reunion", p.a, p.b, { gap: at - prev.at }); out.events++;
      for (const [x, y] of [[p.a, p.b], [p.b, p.a]]) if (key(x) !== key(USER)) bump(folder, x, y, "attraction", 1, "오랜만에 만나 그리움", at, now, gauge);
    }
  }
  // 질투: 이번 응답에서 B가 C에게(또는 C가 B에게) 끌림·호감이 올랐을 때, B의 애인·B를 짝사랑하는 A
  const ups = (emos ?? []).filter((e) => (e.t?.attraction ?? 0) > 0 || (e.t?.affection ?? 0) > 0 || e.deed === "flirt" || e.deed === "touch");
  for (const e of ups) for (const [b, c] of [[e.from, e.to], [e.to, e.from]]) {
    const watchers = [...loversNow.filter((p) => key(p.a) === key(b) || key(p.b) === key(b)).map((p) => (key(p.a) === key(b) ? p.b : p.a)),
      ...unrequited(folder).filter((u) => key(u.to) === key(b)).map((u) => u.from)];
    for (const a of new Set(watchers)) {
      if (key(a) === key(c) || key(a) === key(USER)) continue;
      const lover = nowKeys.has(pairKey(a, b));
      if (lover) { bump(folder, a, b, "possess", 1, `${c}와 가까워져 질투`, at, now, gauge); bump(folder, a, b, "exclusive", 1, `${c}와 가까워져 질투`, at, now, gauge); }
      (r.jealous ??= {})[key(a)] = { a, b, c, at };
      if (!r.events.some((x) => x.kind === "jealous" && x.at === at && key(x.a) === key(a))) { ev("jealous", a, b, { c }); out.events++; }
    }
  }
  // 연적: 새로 생긴 삼각관계
  for (const t of triangles(folder)) if (!hasEvent(folder, "rivalry", t.a, t.c)) { ev("rivalry", t.a, t.c, { over: t.over }); out.events++; }
  // 첫 다툼(갈등 기록이 처음 생긴 쌍)
  { const first = ((r.firsts ??= {}).fight ??= {});
    for (const rf of folder.rifts ?? []) { const k = pairKey(rf.a, rf.b); if (!rf.orphan && !first[k]) { first[k] = { a: rf.a, b: rf.b, at: rf.at ?? at, ...(when ? { when } : {}) }; out.events++; } } }
  // 미련: 헤어진 쌍의 소유욕·독점욕은 2턴마다 1씩 식는다
  r.exTick = (r.exTick ?? 0) + 1;
  if (r.exTick % 2 === 0) for (const x of exPairs(folder)) for (const [p, q] of [[x.a, x.b], [x.b, x.a]]) for (const tag of ["possess", "exclusive"]) if ((tagsOf(folder, p, q)[tag] ?? 0) > 0) bump(folder, p, q, tag, -1, "헤어진 뒤 미련이 식음", at, now, gauge);
  return out;
}

// 두 사람의 관계 연표(오래된 것부터, 같은 종류는 처음 것만 — 질투·재회는 모두)
export function timeline(folder, a, b) {
  const k = pairKey(a, b), seen = new Set(), out = [];
  // addon-rebuild: 본문·유저 입력이 ‘이미 아는 사이’라고 밝힌 쌍은 ‘처음 만남’ 대신 ‘이미 아는 사이로 시작’
  const sk = [key(a), key(b)].sort().join("|"), known = folder?.start?.[sk];
  for (const kind of ["met", "fight"]) { const f = folder?.romance?.firsts?.[kind]?.[k]; if (f) out.push(kind === "met" && known ? { ...f, kind: "known", note: known.q } : { kind, ...f }); }
  if (known && !folder?.romance?.firsts?.met?.[k]) out.push({ kind: "known", a, b, at: known.at ?? null, note: known.q });
  for (const e of folder?.romance?.events ?? []) {
    if (pairKey(e.a, e.b) !== k) continue;
    if (!["jealous", "reunion", "confess", "reject"].includes(e.kind)) { if (seen.has(e.kind)) continue; seen.add(e.kind); }
    out.push(e);
  }
  return out.sort((x, y) => (x.at ?? -1) - (y.at ?? -1));
}
export const eventText = (e) => `${EVENT_LABEL[e.kind] ?? e.kind}${e.kind === "confess" || e.kind === "reject" ? ` (${e.by})` : ""}${e.kind === "jealous" && e.c ? ` · ${e.c} 때문에` : ""}${e.kind === "rivalry" && e.over ? ` · ${e.over}를 두고` : ""}${e.kind === "reunion" && e.gap ? ` · ${e.gap}턴 만에` : ""}${e.kind === "known" && e.note ? ` · “${e.note}”` : ""}`;

// 1) 성적 지향: Erosync에서 옮겨 온 folder.orient[이름키] = { g: "f"|"m"|"x"|"u", pref: {f, m, x} }로, A가 B의 성별에 얼마나 끌리는지에 따라 끌림 상한.
// 가장 끌리는 성별 대비 15% 미만이면 1, 40% 미만이면 4, 70% 미만이면 7. 모르면 제한 없음(null).
export function orientCap(folder, a, b) {
  const o = folder?.orient?.[key(a)], g = folder?.orient?.[key(b)]?.g;
  if (!o?.pref || !g || g === "u") return null;
  const share = Number(o.pref[g === "f" ? "f" : g === "m" ? "m" : "x"]) || 0, max = Math.max(Number(o.pref.f) || 0, Number(o.pref.m) || 0, Number(o.pref.x) || 0);
  if (!max) return null;
  const ratio = share / max;
  return ratio < 0.15 ? 1 : ratio < 0.4 ? 4 : ratio < 0.7 ? 7 : null;
}
// Erosync 스냅숏 → folder.orient(이름·별칭마다)
export function orientFromErosync(snap) {
  const out = {};
  for (const p of snap?.people ?? []) {
    if (p.nonPerson) continue;
    const v = { g: ["f", "m", "x"].includes(p.gender) ? p.gender : "u", ...(p.pref && p.pref.total > 0 ? { pref: { f: p.pref.f, m: p.pref.m, x: p.pref.x } } : {}) };
    for (const n of [p.name, ...(p.aliases ?? [])]) if (n) out[key(n)] = v;
  }
  return out;
}
