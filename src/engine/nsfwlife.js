// 장기기억 애드온: 인물의 '살아 있는' 상태를 엔진만으로 계산한다(모델 호출 없음, 순수).
// 성욕 게이지 · 피로 · 마지막 관계 뒤 경과 · 경험 횟수와 익숙함 · 체위 사용 횟수 · 보고 싶음 · 기념일 · 관계 온도 추세 · 질투.
// 시간 기준은 응답 번호(folder.cursor.at). 이야기 날짜는 월경 구획의 '날짜:'가 있으면 기념일에 같이 적는다.
// 저장: folder.life = { turn, p: { [문서 id]: L } }
//   L = { lust, refr, fat, seen, seenPrev, sex:{n,last,first,by:{k:{name,n,first}}}, uses:{label:n}, lover:{k:{name,turn,date}}, met:{k:{name,turn,date}}, temp:{k:{name,h:[]}} }
import { effectiveTags } from "./memoryhuman.js";
import { isLover } from "./lover.js";
import { parseCycleBody } from "./pot/cycle-tracking.js";
import { normalizeGauge } from "./gaugemult.js";
import { partOf } from "./humanitems.js";

const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
export const TEMP_LEN = 10, REFRACTORY = 4, ABSTAIN_AT = 40, MISS_AT = 30;

export const emptyLife = () => ({ lust: 30, refr: -1, fat: 0, mood: {}, habits: {}, trace: [], sat: [], seen: null, seenPrev: null, sex: { n: 0, last: null, first: null, by: {} }, uses: {}, lover: {}, met: {}, temp: {} });
const docsOf = (f) => Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
const namesOf = (d) => [d.title, ...(d.aliases ?? [])].filter(Boolean);
export function docByName(f, name) {
  const k = nk(name); if (!k) return null;
  return docsOf(f).find((d) => namesOf(d).some((n) => nk(n) === k)) ?? null;
}

import { raceFor, raceLustK } from "./races.js";   // 0.3.22 종족 체질(발정기·보름·성욕 배수)
// ── 월경 주기 단계(성욕 보정용) ──
const dayN = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!m) return NaN; const t = new Date(0); t.setUTCFullYear(+m[1], +m[2] - 1, +m[3]); return t.getTime() / 864e5; };   // 0~99년도 그대로(판타지 연호)
export function cycleOf(doc) {
  const sec = (doc?.sections ?? []).find((x) => x?.provenance?.slotId === "cycle.state" || x?.heading === "월경·임신");
  return sec ? parseCycleBody(sec.body) : null;
}
export function phaseOf(st) {
  if (!st) return null;
  if (st.conception) return "preg";
  const L = st.length, diff = dayN(st.date) - dayN(st.start);
  if (!Number.isFinite(diff) || diff < 0) return null;
  const day = (diff % L) + 1, ov = L - 14;
  return day <= 5 ? "period" : day < ov - 4 ? "after" : day <= ov + 1 ? "fertile" : day <= L - 4 ? "luteal" : "pre";
}
// 2.2.19: 주기 단계별 기분·몸 상태(성격 자체는 그대로, 그날의 결만 바꿈). 주입은 한국어 짧은 구절, 화면은 label.
export const PHASE_MOOD = Object.freeze({
  period: { label: "생리 중 · 몸이 무겁고 예민", line: "생리 중: 아랫배가 묵직하고 쉽게 지침, 평소보다 예민하고 혼자 쉬고 싶어함" },
  after: { label: "생리 끝 · 가볍고 개운", line: "생리 끝남: 몸이 가볍고 기분이 맑아 활발함" },
  fertile: { label: "배란기 · 자신감·끌림 올라감", line: "배란기: 자신감이 오르고 꾸미고 싶어하며 끌리는 상대에게 더 적극적" },
  luteal: { label: "배란 지남 · 차분하고 나른함", line: "배란 지남: 차분하고 나른하며 따뜻한 것·단 것이 당김" },
  pre: { label: "생리 앞 · 짜증·감정 기복", line: "생리 앞(PMS): 붓고 피곤해 작은 일에 짜증·서운함이 커지고 감정 기복이 있음" },
  preg: { label: "임신 중 · 몸 변화에 민감", line: "임신 중: 몸 변화에 민감하고 쉽게 피곤하며 보호받고 싶어함" },
});
export const PHASE_MULT = Object.freeze({ period: 0.6, after: 1, fertile: 1.6, luteal: 1.1, pre: 0.9, preg: 0.8 });

// ── 감정(이 인물이 남에게 느끼는 것 중 가장 큰 값) ──
export function feelOf(f, names, now) {
  const self = new Set(names.map(nk)); let att = 0, aff = 0, hos = 0, pos = 0, top = null;
  for (const p of Object.values(f?.emo ?? {})) {
    if (!self.has(nk(p.from))) continue;
    const t = effectiveTags(p, now);
    if ((t.attraction ?? 0) > att) { att = t.attraction; top = p.to; }
    aff = Math.max(aff, t.affection ?? 0); hos = Math.max(hos, t.hostility ?? 0); pos = Math.max(pos, t.possess ?? 0, t.exclusive ?? 0);
  }
  return { att, aff, hos, pos, top };
}

// 한 턴에 오르는 성욕(배수 적용 전). interest: 성적 관심 0~100
export const LUST_BASE = 1.5;   // interest 50의 기본 속도 → 배수 1
export function lustRate({ interest = 50, phase = null, att = 0, hos = 0, lover = false, sinceSex = null, refractory = false, fat = 0 }) {
  let r = 0.5 + interest / 50;                                   // 0.5 ~ 2.5
  r *= PHASE_MULT[phase] ?? 1;
  r *= clamp(1 + (att - hos) / 20, 0.5, 1.6);                     // 끌림은 올리고 적대감은 내린다
  if (lover) r *= 1.2;
  if (sinceSex != null && sinceSex >= ABSTAIN_AT) r *= 1.3;       // 오래 안 했으면 빨리
  if (refractory) r *= 0.2;                                        // 막 끝난 뒤
  if (fat >= 70) r *= 0.6;                                         // 지쳤으면 덜
  return r;
}

// 이벤트(기록기 줄): {kind:"act", name, partner, act:"sex"|"climax"|"kiss"|"touch", labels:[]}, {kind:"sleep", name}
// opt: { turn, present:[이름], events, date, gauge, interestOf(doc)→0~100, posOf(doc)→positions }
// 성적 욕망·이상성향 글의 핵심 낱말(2글자 이상, 흔한 말 빼고)이 이번 응답 글에 나오면 관련 상황으로 본다
const STOP = new Set(["그리고", "하지만", "때문에", "있다", "없다", "한다", "하는", "되는", "으로", "에서", "에게", "상대", "자신", "좋아한다", "느낀다", "끌린다", "원한다", "싶어", "싶다", "것을", "것이", "추정", "미확인", "사람", "생각", "마음", "모습", "정도", "가끔", "자주", "항상", "특히", "관계", "행위", "성적", "성관계", "흥분한다", "흥분"]);
export function triggerHit(desc, text) {
  const t = String(text ?? "").normalize("NFKC").toLowerCase(); if (!t || !desc) return false;
  const words = [...new Set(String(desc).normalize("NFKC").toLowerCase().replace(/<[^>]*>/g, " ").split(/[^0-9a-z가-힣]+/).map((w) => w.replace(/(을|를|이|가|은|는|에|의|도|과|와|로|한|할|하고|하며|해서)$/u, "")).filter((w) => w.length >= 2 && !STOP.has(w)))];
  let score = 0; for (const w of words) if (t.includes(w)) score += w.length >= 3 ? 2 : 1;
  return score >= 1;
}
export const TRACE_MAX = 14, MOOD_DECAY = 5;
export const MOOD_KEYS = Object.freeze(["joy", "irritation", "anxiety", "sadness", "excitement"]);
export const MOOD_LABEL = Object.freeze({ joy: "기쁨", irritation: "짜증", anxiety: "불안", sadness: "슬픔", excitement: "설렘" });
const PHASE_WHY = { fertile: "가임기", period: "생리 중", luteal: "황체기", pre: "생리 앞", preg: "임신 중" };
// 지금 성향 보정: 성적 즉흥성·주도성(0~100) 평균으로 0.85~1.15배. 대화로 성향이 바뀌면 속도도 따라 바뀐다
export function traitAdj(pr) { const sp = Number.isFinite(pr?.spont) ? pr.spont : 50, ini = Number.isFinite(pr?.initiative) ? pr.initiative : 50; return 0.85 + ((sp + ini) / 200) * 0.3; }
// 하루 리듬: 이야기 시간 글(장면 when)과 이번 응답 글로. 밤·새벽 성욕↑, 아침 성욕↓, 술 성욕↑, 늦은 밤·새벽 피로↑
export function dayFactor(when = "", text = "") {
  const w = String(when ?? ""), t = String(text ?? "");
  let lust = 1, fat = 0; const why = [];
  if (/밤|자정|night|midnight/i.test(w)) { lust *= 1.25; why.push("밤"); }
  else if (/새벽|dawn/i.test(w)) { lust *= 1.1; fat += 1; why.push("새벽"); }
  else if (/아침|morning/i.test(w)) { lust *= 0.9; why.push("아침"); }
  else if (/저녁|evening/i.test(w)) { lust *= 1.1; why.push("저녁"); }
  if (/술|취해|취했|맥주|와인|소주|위스키|칵테일|drunk|alcohol/i.test(t)) { lust *= 1.3; why.push("술"); }
  return { lust, fat, label: why.join("·") };
}
// 최근 만족도(+1 좋음, 0 보통, -1 아쉬움) 평균이 아쉬우면 다음엔 더 빨리 찬다
export function satFactor(sat) { if (!sat?.length) return 1; const m = sat.reduce((a, b) => a + b, 0) / sat.length; return m < -0.2 ? 1.15 : m > 0.5 ? 0.95 : 1; }
// 성감대 개발도: 자극받은 부위마다 +6(게이지 배수), 30·60·85에서 단계 1·2·3(보고된 단계보다 내려가지 않음)
export const DEV_STEP = 6, DEV_LEVELS = Object.freeze([30, 60, 85]);
export const devLevel = (dev) => DEV_LEVELS.reduce((k, at, i) => (dev >= at ? i + 1 : k), 0);
export function developZones(f, docId, parts, g = { up: 1 }) {
  const out = [], n = f.nsfw?.[docId]; if (!n || !parts?.length) return out;
  const zs = [...(n.zones ?? [])];
  for (const raw of parts.slice(0, 4)) {
    const p = partOf(raw); if (!p) continue;
    const i = zs.findIndex((z) => z.part === p.id), cur = i >= 0 ? zs[i] : { part: p.id, level: 0, note: "", dev: 0 };
    const dev = Math.min(100, Math.round((cur.dev ?? 0) + DEV_STEP * (g.up ?? 1))), level = Math.max(cur.level ?? 0, devLevel(dev));
    const z = { ...cur, dev, level };
    if (level === 0) { z.level = 0; }
    if (i >= 0) zs[i] = z; else zs.push(z);
    out.push(`${p.label} 개발 ${dev}${level > (cur.level ?? 0) ? ` → ${level}단계` : ""}`);
  }
  f.nsfw[docId] = { ...n, zones: zs };
  return out;
}
// interestOf(doc) → 성적 관심(숫자) 또는 { interest, mult(0.5~2), boost:[글…] }  · text: 이번 응답 글(욕망·이상성향 반응용)
export function tickLife(f, { turn, present = [], events = [], date = "", gauge = null, text = "" } = {}, interestOf = () => 50) {
  if (!f || !Number.isFinite(turn)) return [];
  f.life ??= { turn: null, p: {} }; f.life.p ??= {};
  const last = Number.isFinite(f.life.turn) && f.life.turn <= turn ? f.life.turn : turn;   // 앞선 번호가 남아 있으면 지금부터 다시 센다
  const dt = clamp(turn - last, 0, 60);                            // 아주 긴 공백(지난 대화 분석 처음)은 60턴까지만
  const g = normalizeGauge(gauge), here = new Set(present.map(nk)), changed = [];
  const evBy = new Map();
  // 같은 응답을 다시 받으면(리롤) 이미 반영한 턴의 행위·게이지 보고는 다시 세지 않는다. 한 턴에 인물·종류마다 게이지 보고는 하나만
  // 2.2.22: 같은 턴(리롤)만 건너뛴다. 번호가 앞서 있으면(지난 대화 분석·삭제·분기) 새 흐름으로 보고 반영(예전엔 영영 버렸다)
  const fresh = !(Number.isFinite(f.life.evAt) && turn === f.life.evAt);
  if (events.length && fresh) f.life.evAt = turn;
  const seenG = new Set();
  events = fresh ? events.filter((e) => { if (e.kind !== "gauge") return true; const k = `${nk(e.name)}|${e.key}`; if (seenG.has(k)) return false; seenG.add(k); return true; }) : events.filter((e) => e.kind === "past");
  for (const e of events) { const d = docByName(f, e.name); if (!d) continue; if (!evBy.has(d.id)) evBy.set(d.id, []); evBy.get(d.id).push(e); }
  for (const d of docsOf(f)) {
    const isHere = namesOf(d).some((n) => here.has(nk(n)));
    const L0 = f.life.p[d.id];
    if (!L0 && !isHere && !evBy.has(d.id)) continue;
    const L = f.life.p[d.id] = { ...emptyLife(), ...(L0 ?? {}) };
    L.sex = { n: 0, last: null, first: null, by: {}, ...(L.sex ?? {}) };
    const names = namesOf(d), fe = feelOf(f, names, turn), lover = !!fe.top && names.some((n) => isLover(f, n, fe.top));
    // 성욕·피로 자연 변화
    const pr0 = interestOf(d), pr = typeof pr0 === "object" && pr0 ? pr0 : { interest: pr0 };
    const mult = Math.max(0.5, Math.min(2, Number(pr.mult) || 1)) * traitAdj(pr);   // AI 배수 × 지금 성향(즉흥성·주도성) 보정
    const tr = (t) => { L.trace = [...(L.trace ?? []), { turn, text: t }].slice(-TRACE_MAX); };
    const day = dayFactor(pr.when, text);
    let lustK = 1;
    if (dt > 0) {
      const sinceSex = L.sex.last == null ? null : turn - L.sex.last, phase = phaseOf(cycleOf(d));
      const satAdj = satFactor(L.sat);
      const rk = raceLustK(raceFor(f, names), date, { cal: f?.extra?.climate?.mdays ? f.extra.climate : null, hemi: f?.extra?.climate?.hemi ?? "N", seed: d.id });
      // 성욕은 저절로 오르지 않는다(AI가 장면을 보고 gauge 줄로 판단). 성향·주기·끌림은 AI가 올린 폭에만 곱한다
      lustK = rk.k * mult * (g.lust ?? 1) * day.lust * satAdj * lustRate({ interest: pr.interest ?? 50, phase, att: fe.att, hos: fe.hos, lover, sinceSex, refractory: turn <= L.refr, fat: L.fat }) / LUST_BASE;
      const before = L.lust;
      L.fat = r1(clamp(L.fat - 2 * dt * g.down + day.fat * dt));
      // 기분은 시간이 지나면 0으로 돌아간다(턴당 5)
      L.mood = Object.fromEntries(Object.entries(L.mood ?? {}).map(([k, v]) => [k, Math.max(0, r1(v - MOOD_DECAY * dt))]).filter(([, v]) => v > 0));
      const why = [PHASE_WHY[phase], fe.att >= 5 && "끌림", fe.hos >= 5 && "적대감", lover && "애인", sinceSex != null && sinceSex >= ABSTAIN_AT && "오래 안 함", turn <= L.refr && "막 끝남", L.fat >= 70 && "피로", day.label, satAdj > 1 && "아쉬움", mult !== 1 && `속도 ×${mult.toFixed(2)}`, rk.heat.on && rk.heat.label, rk.k !== 1 && !rk.heat.on && `종족 ×${rk.k}`].filter(Boolean);
      if (L.lust !== before) tr(`자연 ${L.lust > before ? "+" : ""}${r1(L.lust - before)}${why.length ? ` (${why.join("·")})` : ""}`);
    }
    // 만남
    if (isHere) { if (L.seen != null && L.seen < turn) L.seenPrev = L.seen; L.seen = turn; }
    // 관계 기념일: 처음 같이 나온 날 / 애인이 된 날
    for (const o of present) { const ok = nk(o); if (!ok || names.some((n) => nk(n) === ok) || !isHere) continue; L.met[ok] ??= { name: o, turn, date }; }
    for (const o of Object.keys(L.met)) { const nm = L.met[o].name; if (!L.lover[o] && names.some((n) => isLover(f, n, nm))) L.lover[o] = { name: nm, turn, date }; }
    // 관계 온도: 상대마다 (끌림+호감-적대) 기록, 신뢰도 같이
    for (const p of Object.values(f?.emo ?? {})) {
      if (!names.some((n) => nk(n) === nk(p.from))) continue;
      const t = effectiveTags(p, turn), k = nk(p.to), s0 = (t.attraction ?? 0) + (t.affection ?? 0) - (t.hostility ?? 0);
      const cur = L.temp[k] ?? { name: p.to, h: [], trust: [] };
      if (dt > 0 || !cur.h.length) { cur.h = [...cur.h, s0].slice(-TEMP_LEN); cur.trust = [...(cur.trust ?? []), t.trust ?? 0].slice(-TEMP_LEN); }
      L.temp[k] = cur;
    }
    // 성적 욕망·이상성향 스위치: 관련 상황이면 더 빨리 찬다
    const hit = !!text && (pr.boost ?? []).some((b) => triggerHit(b, text));   // 욕망·이상성향 상황: AI가 올린 폭을 1.3배
    for (const e of evBy.get(d.id) ?? []) {
      if (e.kind === "gauge") { const k = e.key === "fat" ? "fat" : "lust", dd = Math.max(-30, Math.min(30, Math.round(Number(e.delta) || 0))); if (!dd) continue;
        const before = L[k]; L[k] = r1(clamp(L[k] + dd * (dd > 0 ? g.up * (k === "lust" ? clamp(lustK, 0.2, 2.5) * (hit ? 1.3 : 1) : 1) : g.down))); if (L[k] !== before) { changed.push(`${d.title} ${k === "fat" ? "피로" : "달아오름"} ${Math.round(before)}→${Math.round(L[k])}`); tr(`${k === "fat" ? "피로" : "대화"} ${dd > 0 ? "+" : ""}${r1(L[k] - before)}${e.quote ? ` “${String(e.quote).slice(0, 30)}”` : ""}`); } continue; }
      if (e.kind === "past") { const pk2 = nk(e.partner); if (!pk2) continue; const b = L.sex.by[pk2] ?? { name: e.partner, n: 0, first: null }; if (e.est && b.prior != null) continue; b.prior = Math.max(0, Math.min(999, Math.round(Number(e.count) || 0))); b.est = !!e.est; L.sex.by[pk2] = b; changed.push(`${d.title}·${e.partner} 이야기 전 경험 ${b.est ? "약 " : ""}${b.prior}번`); continue; }
      if (e.kind === "sleep") { if (L.fat) { changed.push(`${d.title} 잠 · 피로 풀림`); tr("잠 · 피로 0"); } L.fat = 0; continue; }
      if (e.kind === "mood") { const k = MOOD_KEYS.includes(e.mood) ? e.mood : null, dd = Math.max(-40, Math.min(40, Math.round(Number(e.delta) || 0))); if (!k || !dd) continue;
        L.mood = { ...(L.mood ?? {}) }; L.mood[k] = r1(clamp((L.mood[k] ?? 0) + dd)); if (!L.mood[k]) delete L.mood[k]; changed.push(`${d.title} ${MOOD_LABEL[k]} ${dd > 0 ? "+" : ""}${dd}`); continue; }
      if (e.kind === "bond") { const pk3 = nk(e.partner), t = String(e.text ?? "").trim().slice(0, 60); if (!pk3 || !t) continue; L.habits = { ...(L.habits ?? {}) }; const cur = L.habits[pk3] ?? { name: e.partner, list: [] };
        if (!cur.list.some((x) => nk(x) === nk(t))) { cur.list = [...cur.list, t].slice(-4); L.habits[pk3] = cur; changed.push(`${d.title}·${e.partner} 둘만의 버릇: ${t}`); } continue; }
      if (e.kind === "touch") { const r = developZones(f, d.id, e.parts ?? [], g); if (r.length) { changed.push(`${d.title} ${r.join(", ")}`); tr(`개발 ${r.join(", ")}`); } continue; }
      if (e.kind === "sat") { const pk4 = nk(e.partner), v = e.level === "good" ? 1 : e.level === "bad" ? -1 : 0; L.sat = [...(L.sat ?? []), v].slice(-5);
        if (pk4) { const b = L.sex.by[pk4]; if (b) { b.sat = [...(b.sat ?? []), v].slice(-5); } }
        if (v > 0) { L.refr = Math.max(L.refr, turn + REFRACTORY + 2); tr("만족 · 더 오래 잠잠"); } else if (v < 0) tr("아쉬움 · 다음엔 더 빨리 참"); continue; }
      if (e.kind !== "act") continue;
      const pk = nk(e.partner);
      for (const lab of e.labels ?? []) { const l = String(lab).trim().slice(0, 40); if (l) L.uses[l] = (L.uses[l] ?? 0) + 1; }
      if (e.act === "sex") {
        L.sex.n += 1; L.sex.last = turn; L.sex.first ??= { turn, date, with: e.partner || "" };
        if (pk) { const b = L.sex.by[pk] ?? { name: e.partner, n: 0, first: { turn, date } }; b.n += 1; L.sex.by[pk] = b; }
        L.fat = r1(clamp(L.fat + 25 * g.up));
      }
      if (e.act === "sex" || e.act === "climax") { const before = L.lust; L.lust = r1(clamp(L.lust - 60 * g.down)); L.refr = turn + REFRACTORY; changed.push(`${d.title} 해소 ${Math.round(before)}→${Math.round(L.lust)}`); tr(`${e.act === "sex" ? "관계" : "절정"} ${r1(L.lust - before)}${e.partner ? ` · ${e.partner}` : ""}`); }
      else if (e.act === "kiss" || e.act === "touch") { const before = L.lust; L.lust = r1(clamp(L.lust + (e.act === "kiss" ? 6 : 10) * g.up)); tr(`${e.act === "kiss" ? "키스" : "스킨십"} +${r1(L.lust - before)}`); }
    }
  }
  f.life.turn = turn;
  return changed;
}

// 자주 쓴 체위·플레이를 선호 쪽으로(싫어함은 건드리지 않음, 사용자가 고친 프로필도 그대로). 반환: 바뀐 글
export const USE_NEUTRAL = 2, USE_PREFER = 5;
export function usesToPrefs(nsfw, uses) {
  if (!nsfw || nsfw.by === "user" || !uses) return { nsfw, changed: [] };
  const pos = [...(nsfw.positions ?? [])], changed = [];
  for (const [label, n] of Object.entries(uses)) {
    const i = pos.findIndex((p) => nk(p.label) === nk(label));
    if (i >= 0) { if (pos[i].preference === "neutral" && n >= USE_PREFER) { pos[i] = { ...pos[i], preference: "preferred", reason: `${n}번 함` }; changed.push(`${label} 좋아함(${n}번)`); } }
    else if (n >= USE_NEUTRAL && pos.length < 30) { pos.push({ label, preference: n >= USE_PREFER ? "preferred" : "neutral", kind: "play", reason: `${n}번 함` }); changed.push(`${label} 추가(${n}번)`); }
  }
  return changed.length ? { nsfw: { ...nsfw, positions: pos }, changed } : { nsfw, changed };
}

// ── 화면·주입용 계산(저장 안 함) ──
export const LUST_STEPS = Object.freeze([[0, "식음"], [20, "잔잔함"], [40, "의식함"], [60, "달아오름"], [80, "참기 힘듦"], [95, "한계"]]);
export const lustStep = (v) => { let s = LUST_STEPS[0][1]; for (const [at, l] of LUST_STEPS) if (v >= at) s = l; return s; };
export const fatStep = (v) => (v >= 70 ? "지침" : v >= 40 ? "조금 피곤" : "멀쩡함");
export const famStep = (n) => (!n ? "처음" : n === 1 ? "한 번" : n < 5 ? "몇 번" : n < 15 ? "익숙해지는 중" : "익숙함");
export function trendOf(h) {
  if (!h || h.length < 3) return { d: 0, label: "변화 없음" };
  const d = h.at(-1) - h[0];
  return { d, label: d >= 3 ? "가까워지는 중" : d <= -3 ? "식는 중" : "그대로" };
}
// 보고 싶음: 마지막으로 나온 뒤(지금 안 나왔으면) 지난 턴 × 호감
export function missOf(L, turn, aff = 0) {
  if (!L || L.seen == null) return null;
  const gap = turn - L.seen; if (gap < MISS_AT) return null;
  const v = clamp(Math.round(gap / 3 * (0.4 + aff / 10)), 0, 100);
  return { gap, v, label: v >= 70 ? "많이 보고 싶음" : v >= 35 ? "보고 싶음" : "조금 생각남" };
}
// 질투: A가 B에게 소유욕·독점욕(또는 끌림)이 있는데 B가 다른 C에게 끌리거나 애인일 때
export function jealousyOf(f, names, turn) {
  const self = new Set(names.map(nk)), out = [];
  const pairs = Object.values(f?.emo ?? {});
  for (const p of pairs) {
    if (!self.has(nk(p.from))) continue;
    const t = effectiveTags(p, turn), want = Math.max(t.possess ?? 0, t.exclusive ?? 0, (t.attraction ?? 0) * 0.6);
    if (want < 3) continue;
    for (const q of pairs) {
      if (nk(q.from) !== nk(p.to) || self.has(nk(q.to))) continue;
      const u = effectiveTags(q, turn), rival = Math.max(u.attraction ?? 0, isLover(f, q.from, q.to) ? 8 : 0);
      if (rival < 4) continue;
      out.push({ of: p.to, rival: q.to, v: clamp(Math.round(want * rival), 0, 100) });
    }
  }
  return out.sort((a, b) => b.v - a.v).slice(0, 3);
}
// 기념일: [{label, turn, date, ago}]
export function anniversaries(L, turn) {
  if (!L) return [];
  const out = [];
  for (const m of Object.values(L.met ?? {})) out.push({ label: `${m.name}와 처음 만남`, ...m });
  for (const m of Object.values(L.lover ?? {})) out.push({ label: `${m.name}와 사귐`, ...m });
  for (const b of Object.values(L.sex?.by ?? {})) if (b.first) out.push({ label: `${b.name}와 첫 관계`, ...b.first });
  return out.map((x) => ({ label: x.label, turn: x.turn, date: x.date || "", ago: turn - x.turn })).sort((a, b) => a.turn - b.turn).slice(0, 12);
}
// 한 인물 요약(화면·주입 공통)
// 임신 가능성(주기 단계로, 피임 여부는 모름): 화면 표시용
export const PREG_CHANCE = Object.freeze({ fertile: ["높음", "hi"], luteal: ["낮음", "lo"], after: ["낮음", "lo"], pre: ["매우 낮음", "vlo"], period: ["매우 낮음", "vlo"], preg: ["임신 중", "preg"] });
// 기념일 알림: 100턴 단위 앞뒤 2턴, 또는 이야기 날짜의 월·일이 같은 해 다른 날(1년)
export function annAlerts(ann, turn, today = "") {
  const md = (d) => (/^\d{4}-(\d{2}-\d{2})$/.exec(d || "") ?? [])[1] ?? "", out = [];
  for (const a of ann) {
    if (a.ago >= 98) { const r = a.ago % 100; if (r <= 2 || r >= 98) out.push({ ...a, why: `${Math.round(a.ago / 100) * 100}턴째` }); }
    if (today && a.date && md(today) === md(a.date) && today.slice(0, 4) !== a.date.slice(0, 4)) out.push({ ...a, why: `${+today.slice(0, 4) - +a.date.slice(0, 4)}주년` });
  }
  return out.slice(0, 3);
}
// 오늘의 상태 한 줄(사람 말로): 컨디션·성욕·가장 큰 기분
export function todayLine(v, adult = true) {
  const mood = v.moodTop ? `${v.moodTop.label}${v.moodTop.v >= 60 ? "이 큼" : ""}` : "";
  const body = v.fat >= 70 ? "지침" : v.fat >= 40 ? "조금 피곤" : "";
  const lust = !adult ? "" : v.refractory ? "막 끝나서 잠잠" : v.lust >= 90 ? "참기 힘들 만큼 달아오름" : v.lust >= 60 ? "은근히 달아오름" : v.lust >= 40 ? "살짝 의식함" : "";
  return [body, lust, mood].filter(Boolean).join(", ") || "평소와 같음";
}
export function lifeView(f, doc, turn) {
  const L = f?.life?.p?.[doc?.id]; if (!L) return null;
  const names = namesOf(doc), fe = feelOf(f, names, turn);
  // 이야기 전 경험(prior): 기록기 줄이나 성인 프로필의 past. 합친 횟수로 익숙함을 정한다
  const byMap = new Map(Object.entries(L.sex?.by ?? {}).map(([k, b]) => [k, { ...b }]));
  for (const p of f?.nsfw?.[doc.id]?.past ?? []) { const k = nk(p.name); if (!k) continue; const b = byMap.get(k) ?? { name: p.name, n: 0 }; if (b.prior == null) { b.prior = p.count; b.est = !!p.est; } byMap.set(k, b); }
  const by = [...byMap.values()].map((b) => ({ ...b, total: (b.n ?? 0) + (b.prior ?? 0) })).sort((a, b) => b.total - a.total);
  const uses = Object.entries(L.uses ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const mood = MOOD_KEYS.filter((k) => (L.mood?.[k] ?? 0) > 0).map((k) => ({ key: k, label: MOOD_LABEL[k], v: Math.round(L.mood[k]) })).sort((a, b) => b.v - a.v);
  const cyc = cycleOf(doc), phase = phaseOf(cyc), ann = anniversaries(L, turn);
  const satAvg = (a) => (a?.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const v = {
    lust: Math.round(L.lust), lustStep: lustStep(L.lust), refractory: turn <= L.refr,
    fat: Math.round(L.fat), fatStep: fatStep(L.fat),
    sinceSex: L.sex?.last == null ? null : turn - L.sex.last, sexN: (L.sex?.n ?? 0) + by.reduce((a, b) => a + (b.prior ?? 0), 0),
    partners: by.map((b) => ({ name: b.name, n: b.n ?? 0, prior: b.prior ?? null, est: !!b.est, total: b.total, fam: famStep(b.total), sat: satAvg(b.sat) })), uses,
    miss: missOf(L, turn, fe.aff), jealous: jealousyOf(f, names, turn),
    temp: Object.values(L.temp ?? {}).map((t) => ({ name: t.name, h: t.h, trust: t.trust ?? [], ...trendOf(t.h), trustTrend: trendOf(t.trust ?? []) })).filter((t) => t.h.length).slice(0, 6),
    ann, alerts: annAlerts(ann, turn, cyc?.date ?? ""), phase, phaseMood: PHASE_MOOD[phase] ?? null, preg: PREG_CHANCE[phase] ?? null,
    mood, moodTop: mood[0] ?? null, habits: Object.values(L.habits ?? {}).filter((x) => x.list?.length),
    trace: [...(L.trace ?? [])].reverse(), sat: satAvg(L.sat),
  };
  v.today = todayLine(v, true);
  return v;
}
export const LIFE_INJECT_TITLE = "[Body & mood state — computed; let it colour behaviour naturally, never state the numbers]";
// adult: 성인 프로필이 있는 인물만 성욕·경험 줄을 넣는다. 토큰 절약: '오늘' 한 줄 + 꼭 필요한 것만
export function lifeLine(name, v, adult = true) {
  if (!v) return "";
  const parts = [`오늘 ${todayLine(v, adult)}`, v.phaseMood?.line,
    adult && v.sinceSex != null && v.sinceSex >= ABSTAIN_AT && `오래 못 함(${v.sinceSex}턴)`,
    adult && v.partners.length && `경험: ${v.partners.slice(0, 2).map((p) => `${p.name === "{{user}}" ? "{{user}}" : p.name}와 ${p.fam}`).join(", ")}`, adult && v.lust >= 90 && "욕구가 행동으로 드러남",
    v.miss && `${v.miss.label}(${v.miss.gap}턴 못 봄)`, v.jealous[0] && `${v.jealous[0].of}가 ${v.jealous[0].rival}에게 끌려 질투`,
    ...v.temp.filter((t) => t.label !== "그대로" && t.label !== "변화 없음").slice(0, 2).map((t) => `${t.name}와 ${t.label}`),
    ...v.habits.slice(0, 1).map((x) => `${x.name}와 둘만의 버릇: ${x.list.slice(-2).join(", ")}`),
    ...v.alerts.slice(0, 1).map((a) => `${a.label} ${a.why} — 의식하고 있음`)].filter(Boolean);
  return `- ${name}: ${parts.join(" / ")}`.slice(0, 320);
}
export const isAdultProfile = (n) => !!n && Object.keys(n.sexual ?? {}).length > 0;
export function lifeSection(f, present = [], turn, max = 4) {
  const here = new Set(present.map(nk)), lines = [];
  for (const d of docsOf(f)) {
    if (!namesOf(d).some((n) => here.has(nk(n)))) continue;
    const l = lifeLine(d.title, lifeView(f, d, turn), isAdultProfile(f?.nsfw?.[d.id])); if (l) lines.push(l);
    if (lines.length >= max) break;
  }
  return lines.length ? [LIFE_INJECT_TITLE, ...lines].join("\n") : "";
}

// 사람다운 항목(성인과 상관없음) — 장면 인물만
import { humanLine, HUMAN_INJECT_TITLE } from "./humanitems.js";
export function humanSection(f, present = [], max = 4) {
  const here = new Set(present.map(nk)), lines = [];
  for (const d of docsOf(f)) {
    if (!namesOf(d).some((n) => here.has(nk(n)))) continue;
    const l = humanLine(d.title, f?.nsfw?.[d.id]); if (l) lines.push(l);
    if (lines.length >= max) break;
  }
  return lines.length ? [HUMAN_INJECT_TITLE, ...lines].join("\n") : "";
}

// 장면 계획용: 이름 → 달아오름, 달아오름 90 이상인 인물과 가장 끌리는 상대
export function lustOfName(f, name) { const d = docByName(f, name); const L = d ? f?.life?.p?.[d.id] : null; return L && isAdultProfileOf(f, d) ? L.lust : null; }
const isAdultProfileOf = (f, d) => Object.keys(f?.nsfw?.[d.id]?.sexual ?? {}).length > 0;
export function hotActors(f, at = 90) {
  const out = [], turn = Number.isInteger(f?.cursor?.at) ? f.cursor.at : 0;
  for (const d of docsOf(f)) { const L = f?.life?.p?.[d.id]; if (!L || L.lust < at || turn <= L.refr || !isAdultProfileOf(f, d)) continue;
    const fe = feelOf(f, namesOf(d), turn); out.push({ actor: d.title, target: fe.top || "{{user}}" }); }   // 끌림 기록이 아직 없으면 {{user}}에게
  return out;
}
// 확정된 계획을 장면 판단(folder.drive)에 실제 목표로 저장한다(지금 상태 카드에 보이고, 다음 요청에서 반드시 움직임). 반환: 바뀐 글
const gk = (a, t) => `${nk(a)}>${nk(t)}`;
export function ensureHotGoals(f, at = 90) {
  const changed = []; if (!f) return changed;
  // 2.2.22: 해소(관계·절정)로 달아오름이 내려가거나 진정되면(60 미만) 달아오름 계획을 지운다(예전엔 남아 계속 장면을 밀었다)
  for (const [k, g] of Object.entries(f.drive?.goals ?? {})) {
    if (!g?.hot || g.kind !== "sex") continue;
    const v = lustOfName(f, g.actor);
    if (v == null || v < 60) { delete f.drive.goals[k]; changed.push(`${g.actor} 달아오름 계획 끝(진정)`); }
  }
  const hot = hotActors(f, at); if (!hot.length) return changed;
  f.drive ??= { turn: 0, goals: {}, rest: {}, log: [] }; f.drive.goals ??= {};
  for (const { actor, target } of hot) {
    const lust = Math.round(lustOfName(f, actor) ?? at);
    const mine = Object.entries(f.drive.goals).filter(([, g]) => nk(g.actor) === nk(actor) && g.kind === "sex");
    if (mine.length) { for (const [k, g] of mine) if ((g.desire ?? 0) < lust) f.drive.goals[k] = { ...g, desire: lust }; continue; }
    f.drive.goals[gk(actor, target)] = { actor, target, kind: "sex", want: "참아 온 성욕을 풀고 싶다", move: "몸이 먼저 반응해 욕구를 숨기지 못하고, 자기 성격대로 상대에게 다가가 신호를 보낸다", desire: lust, rung: 0, fulfilled: 0, streak: 0, at: f.drive.turn ?? 0, last: null, hot: true };
    changed.push(`${actor}→${target === "{{user}}" ? "{{user}}" : target} 달아오름 ${lust} · 성관계 계획 확정`);
  }
  return changed;
}
