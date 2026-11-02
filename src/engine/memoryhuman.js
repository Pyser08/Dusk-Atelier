// v1.8.3 사람다운 기억(순수). 추가 AI 호출 없음.
//  코드만: ④ 감정 식기(effectiveTags·coolEmo) · ② 재등장 공백(returnGap) · ③ 변화 이전 기록(earlierIds) · ⑪ 흐려짐(fading) · ⑨ 관계 진도(stageOf)
//  분석에 얹기: ⑥ 호칭·말투(talk) · ⑩ 둘만의 추억(bond) · ⑤ 잘못된 믿음(belief/cleared, 설정 켤 때만)
// 저장은 폴더의 새 키(talk·bonds·beliefs)만 쓰고 기존 형식은 바꾸지 않는다. 사라진 응답(리롤)에서 생긴 것은 되돌린다(src).
import { srcOf } from "./memoryreconcile.js";

const cut = (v, n) => String(v ?? "").trim().slice(0, n);
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const nk = (v) => String(v ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
const oneLine = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const rid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const has = (rel, name) => !rel || rel.has(key(name));

// ── ④ 감정 식기 ──
// 반감기(메시지 수)와 바닥 비율. 신뢰·존경은 저절로 식지 않는다(행동으로만 바뀜). 원한은 바닥값만큼 남는다.
export const COOL_HALF = Object.freeze({ hostility: 80, fear: 120, dependence: 240, affection: 400 });
export const COOL_FLOOR = Object.freeze({ hostility: 0.3, fear: 0.3, dependence: 0.5, affection: 0.6 });
function lastRealChange(pair, tag) {
  for (let i = (pair.log ?? []).length - 1; i >= 0; i--) {
    const e = pair.log[i];
    if (e.orphan || e.why === "cooled" || e.t?.[tag] == null) continue;
    return e.at == null ? null : { v: e.t[tag], at: e.at };
  }
  return null;
}
// now: 지금 메시지 위치. 저장값보다 높아지지는 않는다.
export function effectiveTags(pair, now) {
  const out = {};
  for (const [tag, v] of Object.entries(pair?.tags ?? {})) {
    out[tag] = v;
    if (v == null || !COOL_HALF[tag] || pair.lock?.[tag] || !Number.isFinite(now)) continue;
    const base = lastRealChange(pair, tag);
    if (!base || now <= base.at) continue;
    const floor = Math.round(base.v * COOL_FLOOR[tag]);
    const eff = Math.round(floor + (base.v - floor) * Math.pow(0.5, (now - base.at) / COOL_HALF[tag]));
    out[tag] = Math.min(v, Math.max(0, eff));
  }
  return out;
}
// 분석 직전에 저장값을 실효값으로 내려 적는다(모델이 내는 변화량이 식은 값에 더해지게). 바뀐 태그 수.
export function coolEmo(folder, now, nowMs = Date.now()) {
  let n = 0;
  for (const pair of Object.values(folder?.emo ?? {})) {
    const eff = effectiveTags(pair, now), t = {}, from = {};
    for (const [tag, v] of Object.entries(eff)) if (v < pair.tags[tag]) { from[tag] = pair.tags[tag]; t[tag] = v; pair.tags[tag] = v; n++; }
    if (Object.keys(t).length) { pair.log = [...(pair.log ?? []), { t, from, why: "cooled", at: now, at_ms: nowMs }].slice(-40); }
  }
  return n;
}

// ── ② 재등장 공백 · ③ 이전 기록 · ⑪ 흐려짐 ──
export const GAP_MIN = 60, FADE_AT = 0.6;
export function returnGap(person, scenes, now) {
  const names = new Set([person?.name, ...(person?.aliases ?? [])].map(key).filter(Boolean));
  let last = null;
  for (const r of person?.records ?? []) if (!r.orphan && r.at != null && r.at < now) last = Math.max(last ?? -1, r.at);
  for (const s of scenes ?? []) if (!s.orphan && s.at != null && s.at < now && (s.who ?? []).some((w) => names.has(key(w)))) last = Math.max(last ?? -1, s.at);
  if (last == null) return 0;
  const gap = now - last;
  return gap >= GAP_MIN ? gap : 0;
}
// 가장 최근 '변화' 기록(이전 값이 이어진 기록)보다 앞선 기록들.
export function earlierIds(person) {
  const ch = (person?.records ?? []).filter((r) => r.prev && r.valid !== false && !r.orphan && r.at != null).sort((a, b) => b.at - a.at)[0];
  const out = new Set();
  if (!ch) return out;
  for (const r of person.records) if (r !== ch && !r.orphan && r.at != null && r.at < ch.at) out.add(r.id);
  return out;
}
// 잊히기(forgotten) 전 단계: 사소한 기록(D·C)이 잊힐 시점의 60%를 넘으면 흐릿하게 표시한다.
export function fading(r, now, forgetAfter = 150) {
  if (!forgetAfter || r?.pin || r?.user || (r?.g !== "D" && r?.g !== "C") || r.at == null) return false;
  if ((r.m ?? 1) > 1 && r.g === "C") return false;
  return now - (r.last ?? r.at) > forgetAfter * (r.g === "C" ? 2 : 1) * FADE_AT;
}

// ── ⑨ 관계 진도 ──
export function stageOf(folder, a, b, now) {
  const ka = key(a), kb = key(b);
  const shared = (folder?.scenes ?? []).filter((s) => !s.orphan && (s.who ?? []).some((w) => key(w) === ka) && (s.who ?? []).some((w) => key(w) === kb)).length;
  let warmth = 0;
  for (const p of Object.values(folder?.emo ?? {})) {
    const pf = key(p.from), pt = key(p.to);
    if (!((pf === ka && pt === kb) || (pf === kb && pt === ka))) continue;
    const t = effectiveTags(p, now);
    warmth = Math.max(warmth, t.affection ?? 0, t.trust ?? 0);
  }
  const stage = shared <= 1 && warmth < 3 ? "just met" : shared < 5 || warmth < 4 ? "acquaintances" : warmth < 7 ? "close" : "very close";
  return { stage, shared, warmth };
}
export function stageLines(folder, names, now, limit = 3) {
  const list = [...new Map((names ?? []).filter(Boolean).map((n) => [key(n), n])).values()], out = [];
  for (let i = 0; i < list.length && out.length < limit; i++) for (let j = i + 1; j < list.length && out.length < limit; j++) {
    const s = stageOf(folder, list[i], list[j], now);
    if (!s.shared && !s.warmth) continue;
    const note = s.stage === "just met" || s.stage === "acquaintances" ? " — let closeness grow gradually" : "";
    out.push(`- ${list[i]} ↔ ${list[j]}: ${s.stage} (${s.shared} scene${s.shared === 1 ? "" : "s"} together)${note}`);
  }
  return out;
}

// ── ⑥ 호칭·말투 · ⑩ 둘만의 추억 · ⑤ 잘못된 믿음: 검증 ──
const TONES = new Set(["formal", "casual", "mixed"]);
export function validateHuman(obj, { beliefs = false } = {}) {
  const talk = [], bond = [], belief = [], cleared = [];
  for (const x of Array.isArray(obj?.talk) ? obj.talk : []) {
    const from = cut(x?.from, 60), to = cut(x?.to, 60), call = cut(x?.call, 20), tone = String(x?.tone ?? "").toLowerCase();
    if (!from || !to || key(from) === key(to) || !nk(call) || !TONES.has(tone)) continue;
    talk.push({ from, to, call, tone });
    if (talk.length >= 2) break;
  }
  for (const x of Array.isArray(obj?.bond) ? obj.bond : []) {
    const a = cut(x?.a, 60), b = cut(x?.b, 60), moment = cut(x?.moment, 60), hook = cut(x?.hook, 30);
    if (!a || !b || key(a) === key(b) || !nk(moment)) continue;
    bond.push({ a, b, moment, ...(nk(hook) ? { hook } : {}) });
    break;
  }
  if (beliefs) {
    for (const x of Array.isArray(obj?.belief) ? obj.belief : []) {
      const who = cut(x?.who, 60), thinks = cut(x?.thinks, 60), truth = cut(x?.truth, 60), by = cut(x?.by, 60);
      if (!who || !nk(thinks) || !nk(truth) || nk(thinks) === nk(truth)) continue;
      belief.push({ who, thinks, truth, ...(by ? { by } : {}) });
      if (belief.length >= 2) break;
    }
    for (const id of Array.isArray(obj?.cleared) ? obj.cleared : []) { const s = cut(id, 24); if (s) cleared.push(s); if (cleared.length >= 4) break; }
  }
  return { talk, bond, belief, cleared };
}

// ── 반영 ──
const BOND_MAX = 30, BOND_PAIR = 6, BELIEF_MAX = 20;
const pairKey = (a, b) => [key(a), key(b)].sort().join("|");
export function applyHuman(folder, h, anchor, { important = false, now = Date.now() } = {}) {
  if (!h) return 0;
  const src = srcOf(anchor), at = anchor?.at ?? null;
  let n = 0;
  folder.talk ??= {};
  for (const t of h.talk ?? []) {
    const k = key(t.from) + ">" + key(t.to), cur = folder.talk[k];
    if (cur?.lock || (cur && cur.call === t.call && cur.tone === t.tone)) continue;
    const { back, ...curFlat } = cur ?? {};
    folder.talk[k] = { from: t.from, to: t.to, call: t.call, tone: t.tone, ...(cur ? { prev: { call: cur.call, tone: cur.tone }, back: curFlat } : {}), at, at_ms: now, ...(src ? { src } : {}) };
    n++;
  }
  if (important && h.bond?.length) {
    folder.bonds ??= [];
    for (const b of h.bond) {
      const pk = pairKey(b.a, b.b);
      if (folder.bonds.some((x) => pairKey(x.a, x.b) === pk && nk(x.moment) === nk(b.moment))) continue;
      folder.bonds.push({ id: rid("bd"), a: b.a, b: b.b, moment: b.moment, ...(b.hook ? { hook: b.hook } : {}), at, at_ms: now, ...(src ? { src } : {}) });
      const same = folder.bonds.filter((x) => pairKey(x.a, x.b) === pk);
      if (same.length > BOND_PAIR) folder.bonds.splice(folder.bonds.indexOf(same[0]), 1);
      folder.bonds = folder.bonds.slice(-BOND_MAX);
      n++;
    }
  }
  if (h.belief?.length || h.cleared?.length) {
    folder.beliefs ??= [];
    for (const b of h.belief ?? []) {
      if (folder.beliefs.some((x) => x.open && key(x.who) === key(b.who) && nk(x.thinks) === nk(b.thinks))) continue;
      folder.beliefs.push({ id: rid("bf"), who: b.who, thinks: b.thinks, truth: b.truth, ...(b.by ? { by: b.by } : {}), open: true, at, at_ms: now, ...(src ? { src } : {}) });
      n++;
    }
    for (const id of h.cleared ?? []) {
      const x = folder.beliefs.find((y) => y.id === id && y.open);
      if (x) { x.open = false; x.closedAt = at; if (src) x.closedSrc = src; n++; }
    }
    folder.beliefs = folder.beliefs.slice(-BELIEF_MAX);
  }
  return n;
}
// 사라진 응답에서 생긴 호칭·추억·믿음은 되돌린다.
export function revertHuman(folder, alive) {
  let n = 0;
  for (const [k, t] of Object.entries(folder?.talk ?? {})) {
    if (t.lock || !t.src || alive(t.src)) continue;
    if (t.back) folder.talk[k] = t.back; else delete folder.talk[k];
    n++;
  }
  if (folder?.bonds) { const before = folder.bonds.length; folder.bonds = folder.bonds.filter((b) => !b.src || alive(b.src)); n += before - folder.bonds.length; }
  if (folder?.beliefs) {
    const before = folder.beliefs.length;
    folder.beliefs = folder.beliefs.filter((b) => !b.src || alive(b.src));
    n += before - folder.beliefs.length;
    for (const b of folder.beliefs) if (!b.open && b.closedSrc && !alive(b.closedSrc)) { b.open = true; delete b.closedSrc; delete b.closedAt; n++; }
  }
  return n;
}

// ── 분석 입력 ──
export function talkForPrompt(folder, rel, limit = 6) {
  return Object.values(folder?.talk ?? {}).filter((t) => has(rel, t.from) && has(rel, t.to)).sort((a, b) => (b.at_ms ?? 0) - (a.at_ms ?? 0)).slice(0, limit)
    .map((t) => ({ from: t.from, to: t.to, call: t.call, tone: t.tone }));
}
export const beliefsForPrompt = (folder, limit = 6) => (folder?.beliefs ?? []).filter((b) => b.open).slice(-limit).map((b) => ({ id: b.id, who: b.who, thinks: b.thinks }));

// ── 주입 문장 ──
export function talkLines(folder, rel, limit = 4) {
  return Object.values(folder?.talk ?? {}).filter((t) => has(rel, t.from) && has(rel, t.to)).sort((a, b) => (b.at_ms ?? 0) - (a.at_ms ?? 0)).slice(0, limit)
    .map((t) => `- ${t.from} → ${t.to}: calls them "${oneLine(t.call)}", ${t.tone} speech${t.prev ? ` (was "${oneLine(t.prev.call)}", ${t.prev.tone})` : ""}`);
}
// 장면에 함께 있는 쌍마다 추억 하나(시점에 따라 돌려 가며).
export function bondLines(folder, rel, now, limit = 2) {
  const byPair = new Map();
  for (const b of folder?.bonds ?? []) { if (!has(rel, b.a) || !has(rel, b.b)) continue; const k = pairKey(b.a, b.b); if (!byPair.has(k)) byPair.set(k, []); byPair.get(k).push(b); }
  const out = [];
  for (const list of byPair.values()) {
    const b = list[Math.floor(Math.max(0, now) / 10) % list.length];
    out.push(`- ${b.a} & ${b.b}: ${oneLine(b.moment)}${b.hook ? ` (cue: ${oneLine(b.hook)})` : ""}`);
    if (out.length >= limit) break;
  }
  return out;
}
export function beliefLines(folder, rel, limit = 3) {
  return (folder?.beliefs ?? []).filter((b) => b.open && has(rel, b.who)).slice(-limit)
    .map((b) => `- ${b.who} believes: ${oneLine(b.thinks)} (truth: ${oneLine(b.truth)}${b.by ? `; misled by ${b.by}` : ""}) — ${b.who} acts on this until learning otherwise`);
}

// ── 분석 규칙(짧게: 약한 보조모델 기준) ──
export function humanRules({ beliefs = false } = {}) {
  const r = [
    '`talk` (max 2): {"from","to","call":"how from addresses to","tone":"formal|casual|mixed"} only when first seen or when it changes; `talkState` = current. Otherwise omit.',
    '`bond` (max 1, important moments only): {"a","b","moment":"<=60","hook":"<=30 cue"} a shared moment these two would likely bring up later (inside joke, a first time, a kept promise). Otherwise omit.',
  ];
  if (beliefs) r.push('`belief` (max 2): {"who","thinks":"<=60 false belief","truth":"<=60","by":"who misled, or empty"} only when the text shows someone now believes something false (lied to or misunderstood). `cleared`: ids from `beliefs` whose holder learned the truth. Otherwise omit.');
  return r.join("\n");
}

// ── 인물 위키 화면용 (v1.8.3 개편) ──
import { ATTR_CATS } from "./memorytrust.js";
const GRADE_RANK = { A: 0, B: 1, C: 2, D: 3 };
const live = (r) => r && !r.orphan && r.valid !== false;
// 화면에서 쓰는 '지금' 위치: 마지막으로 분석한 응답(없으면 가장 늦은 기록·장면).
export function nowOf(folder) {
  let n = folder?.cursor?.at ?? null;
  for (const s of folder?.scenes ?? []) if (s.at != null) n = Math.max(n ?? -1, s.at);
  for (const p of Object.values(folder?.people ?? {})) for (const r of p.records ?? []) if (r.at != null) n = Math.max(n ?? -1, r.at);
  return n ?? 0;
}
const keysOf = (names) => new Set((names ?? []).map(key).filter(Boolean));
// 이 인물과 얽힌 상대들(장면을 함께한 횟수 → 관계 온도 순). selfNames: 이름·별칭들.
export function counterparts(folder, selfNames, now = nowOf(folder)) {
  const self = keysOf(selfNames), found = new Map();
  const add = (n) => { const k = key(n); if (k && !self.has(k) && !found.has(k)) found.set(k, String(n)); };
  for (const s of folder?.scenes ?? []) if (!s.orphan && (s.who ?? []).some((w) => self.has(key(w)))) (s.who ?? []).forEach(add);
  for (const p of Object.values(folder?.emo ?? {})) { if (self.has(key(p.from))) add(p.to); if (self.has(key(p.to))) add(p.from); }
  for (const t of Object.values(folder?.talk ?? {})) { if (self.has(key(t.from))) add(t.to); if (self.has(key(t.to))) add(t.from); }
  for (const b of folder?.bonds ?? []) { if (self.has(key(b.a))) add(b.b); if (self.has(key(b.b))) add(b.a); }
  for (const e of Object.values(folder?.exp ?? {})) { if (self.has(key(e.a))) add(e.b); if (self.has(key(e.b))) add(e.a); }
  for (const b of folder?.beliefs ?? []) { if (self.has(key(b.who)) && b.by) add(b.by); if (b.by && self.has(key(b.by))) add(b.who); }
  const me = [...selfNames ?? []][0];
  return [...found.values()].map((name) => ({ name, ...stageOf(folder, me, name, now) })).sort((a, b) => b.shared - a.shared || b.warmth - a.warmth);
}
// 두 사람 사이의 모든 것: 관계 진도 · 감정(양쪽, 식은 것 설명) · 호칭(양쪽) · 추억 · 기대 차이 · 오해.
export function pairView(folder, selfNames, other, now = nowOf(folder)) {
  const self = keysOf(selfNames), ko = key(other), me = [...selfNames][0];
  const feelOf = (fromSelf) => {
    const p = Object.entries(folder?.emo ?? {}).find(([, x]) => fromSelf ? self.has(key(x.from)) && key(x.to) === ko : key(x.from) === ko && self.has(key(x.to)));
    if (!p) return null;
    const [pk, pair] = p, eff = effectiveTags(pair, now);
    const cooled = Object.entries(eff).filter(([t, v]) => pair.tags[t] != null && v < pair.tags[t]).map(([tag, to]) => ({ tag, from: pair.tags[tag], to }));
    return { pk, from: pair.from, to: pair.to, tags: eff, stored: { ...pair.tags }, cooled, lock: pair.lock ?? null };
  };
  const talkOf = (fromSelf) => {
    const e = Object.entries(folder?.talk ?? {}).find(([, t]) => fromSelf ? self.has(key(t.from)) && key(t.to) === ko : key(t.from) === ko && self.has(key(t.to)));
    return e ? { k: e[0], ...e[1] } : null;
  };
  const both = (a, b) => (self.has(key(a)) && key(b) === ko) || (self.has(key(b)) && key(a) === ko);
  return {
    stage: stageOf(folder, me, other, now),
    feel: { ab: feelOf(true), ba: feelOf(false) },
    talk: { ab: talkOf(true), ba: talkOf(false) },
    bonds: (folder?.bonds ?? []).filter((b) => both(b.a, b.b)),
    exp: Object.values(folder?.exp ?? {}).find((e) => both(e.a, e.b)) ?? null,
    beliefs: (folder?.beliefs ?? []).filter((b) => self.has(key(b.who)) && (key(b.by) === ko || !b.by) || key(b.who) === ko).sort((a, b) => (b.open === true) - (a.open === true)),
  };
}
// 요약 탭: 바뀐 것(전 → 지금), 지금 상태, 기억에 남은 순간.
export function changesOf(person, limit = 6) {
  return (person?.records ?? []).filter((r) => live(r) && r.attr && r.prev).sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, limit)
    .map((r) => ({ id: r.id, c: r.attr.c, label: ATTR_CATS[r.attr.c] ?? r.attr.c, k: r.attr.k, from: r.prev.v || r.prev.act, to: r.attr.v }));
}
export function currentAttrs(person, limit = 8) {
  const last = new Map();
  for (const r of [...(person?.records ?? [])].sort((a, b) => (a.at ?? 0) - (b.at ?? 0))) if (live(r) && r.attr && r.attr.tm !== "past") last.set(`${r.attr.c}|${r.attr.k}`, r);
  return [...last.values()].slice(-limit).map((r) => ({ id: r.id, c: r.attr.c, label: ATTR_CATS[r.attr.c] ?? r.attr.c, k: r.attr.k, v: r.attr.v }));
}
export function momentsOf(person, now, { limit = 6, forgetAfter = 150 } = {}) {
  const earlier = earlierIds(person);
  return (person?.records ?? []).filter(live).sort((a, b) => (GRADE_RANK[a.g] ?? 4) - (GRADE_RANK[b.g] ?? 4) || (b.at ?? 0) - (a.at ?? 0)).slice(0, limit)
    .map((r) => ({ r, earlier: earlier.has(r.id), vague: fading(r, now, forgetAfter) }));
}

// ── 사용자 편집(위키 화면). 사용자가 고친 것은 잠기고, 리롤로 되돌려지지 않는다(src 없음). ──
export function setTalk(folder, from, to, { call, tone }, nowMs = Date.now()) {
  folder.talk ??= {};
  const k = key(from) + ">" + key(to), cur = folder.talk[k];
  const c = cut(call, 20), t = TONES.has(tone) ? tone : "mixed";
  if (!nk(c)) throw new Error("부르는 말을 적어 주세요.");
  folder.talk[k] = { from, to, call: c, tone: t, ...(cur && (cur.call !== c || cur.tone !== t) ? { prev: { call: cur.call, tone: cur.tone } } : cur?.prev ? { prev: cur.prev } : {}), lock: true, user: true, at: cur?.at ?? null, at_ms: nowMs };
  return folder.talk[k];
}
export function toggleTalkLock(folder, k) { const t = folder?.talk?.[k]; if (t) t.lock = !t.lock; return t?.lock ?? false; }
export function deleteTalk(folder, k) { if (folder?.talk) delete folder.talk[k]; }
export function editBond(folder, id, { moment, hook }) {
  const b = (folder?.bonds ?? []).find((x) => x.id === id); if (!b) return null;
  const m2 = cut(moment, 60); if (!nk(m2)) throw new Error("추억 내용을 적어 주세요.");
  b.moment = m2; const h2 = cut(hook, 30); if (nk(h2)) b.hook = h2; else delete b.hook;
  b.user = true; delete b.src; return b;
}
export function deleteBond(folder, id) { if (folder?.bonds) folder.bonds = folder.bonds.filter((b) => b.id !== id); }
export function resolveBelief(folder, id) { const b = (folder?.beliefs ?? []).find((x) => x.id === id); if (b) { b.open = false; b.closedBy = "user"; delete b.closedSrc; } return b; }
export function deleteBelief(folder, id) { if (folder?.beliefs) folder.beliefs = folder.beliefs.filter((b) => b.id !== id); }
