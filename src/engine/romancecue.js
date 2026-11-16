// 2.2.6 썸 행동 지침(순수): 이성적 호감(attraction 0~10) 단계와 그 인물의 성격(위키 기본 성격 6축)에 맞춰
// 응답 모델이 끌림을 ‘자연스럽게, 천천히’ 보여 주게 하는 줄을 만든다. 기억 블록(memoryinject)에 들어간다.
import { isLover, strayRisk, loverPairs } from "./lover.js";
import { unrequited, triangles, isSecret, awkwardLeft, exPairs } from "./romance.js";

const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
export const ROMANCE_RULE = "Slow burn: show attraction only through small, natural behaviour that fits the stage and the character's personality. Never skip a stage or confess early; keep ambiguity, mixed signals and plausible deniability; one-sided pull stays one-sided. Low or no attraction toward {{user}} means no romantic behaviour toward {{user}}.";

// 단계: [최소값, 이름, 행동]
export const STAGES = Object.freeze([
  [9, "on the verge", "can barely hold it in; lingering looks, protective, a confession or decisive move may come only if the moment truly allows"],
  [7, "charged ambiguity (some)", "push and pull, testing the other's reaction, touches with an excuse, teasing that hides real feelings, small jealousy, still no clear words"],
  [5, "flustered", "self-conscious near them, plays it off, notices where they are, finds reasons to be close, reacts to their name"],
  [3, "curious", "small excuses to talk, remembers little details, light teasing, a glance that stays a beat too long"],
  [1, "faint interest", "only notices them a little more than others; nothing overt"]
]);

const axisVal = (v) => (typeof v === "number" ? v : Number.isFinite(v?.value) ? v.value : Number.isFinite(v?.score) ? v.score : null);
// 성격 6축 → 끌림을 드러내는 방식
export function styleOf(axes) {
  const a = (k) => axisVal(axes?.[k]);
  const out = [];
  if (a("guardedness") >= 65) out.push("hides it behind denial, sarcasm or coldness while small slips leak");
  if (a("emotionalExpressiveness") >= 65) out.push("readable at once: blushes, bright reactions");
  else if (a("emotionalExpressiveness") != null && a("emotionalExpressiveness") <= 35) out.push("shows almost nothing on the face; it comes out in actions");
  if (a("expressionDirectness") >= 65) out.push("bold, blunt teasing");
  if (a("relationalInitiative") >= 65) out.push("creates chances and makes the first small move");
  else if (a("relationalInitiative") != null && a("relationalInitiative") <= 35) out.push("waits for the other to move and reacts instead");
  if (a("impulsivity") >= 65) out.push("acts on sudden urges, then regrets or doubles down");
  if (a("relationshipPersistence") >= 65) out.push("keeps coming back even after a rebuff");
  return out.slice(0, 3).join("; ");
}

// 이름 → 위키 성격 축
function axesByName(folder) {
  const w = folder?.wiki, map = new Map();
  for (const [id, p] of Object.entries(w?.people?.profiles ?? {})) {
    const d = w?.documents?.[id];
    for (const n of [d?.title, p?.name, ...(d?.aliases ?? [])]) if (n) map.set(key(n), p?.axes ?? null);
  }
  return map;
}

// relevant: 지금 장면 인물 이름 키 집합(없으면 전부). eff(pair, now): 식은 값을 계산하는 함수(없으면 저장값).
export function romanceLines(folder, { relevant = null, now = null, eff = null, limit = 5 } = {}) {
  const ax = axesByName(folder), rows = [];
  for (const p of Object.values(folder?.emo ?? {})) {
    if (relevant && !relevant.has(key(p.from)) && !relevant.has(key(p.to))) continue;
    const t = eff && now != null ? eff(p, now) : p.tags ?? {};
    const v = Math.round(t?.attraction ?? 0);
    if (v < 1) continue;
    rows.push({ p, v, lover: isLover(folder, p.from, p.to) });
  }
  // 2.2.6 애인에게 끌림이 식은 쌍(0도 포함)은 바람 가능성 줄로 따로
  const strayed = new Map();
  for (const n of new Set(Object.values(folder?.emo ?? {}).map((p) => p.from))) {
    if (relevant && !relevant.has(key(n))) continue;
    const sr = strayRisk(folder, n); if (sr) strayed.set(key(n), { name: n, ...sr });
  }
  rows.sort((a, b) => b.v - a.v);
  const lines = rows.filter(({ p, lover }) => !(lover && strayed.has(key(p.from)))).slice(0, limit).map(({ p, v, lover }) => {
    const style = styleOf(ax.get(key(p.from)));
    const sr = strayed.get(key(p.from));
    if (sr && key(sr.partner) !== key(p.to)) {   // 애인이 있는데 다른 사람에게 끌림
      const [, name, act] = STAGES.find(([min]) => v >= min);
      return `- ${p.from} → ${p.to}: ${name} (attraction ${v}) while still with ${sr.partner}: tempted, guilty, hides it; ${act}${style ? ` — as this person: ${style}` : ""}`;
    }
    if (lover) return `- ${p.from} → ${p.to}: lovers (attraction ${v}); shows love in their own way${style ? ` — ${style}` : ""}`;
    const [, name, act] = STAGES.find(([min]) => v >= min);
    return `- ${p.from} → ${p.to}: ${name} (attraction ${v}): ${act}${style ? ` — as this person: ${style}` : ""}`;
  });
  // 2.2.6 연애 흐름 줄: 짝사랑 · 고백 거절 뒤 어색함 · 질투 · 연적 · 헤어진 뒤 미련 · 비밀 연애
  const at = folder?.cursor?.at ?? 0, rel = (n) => !relevant || relevant.has(key(n)), R = folder?.romance ?? {};
  for (const u of unrequited(folder)) if (rel(u.from) || rel(u.to)) {
    const i = lines.findIndex((l) => l.startsWith(`- ${u.from} → ${u.to}:`));
    const note = ` [one-sided: ${u.to} does not return it (attraction ${u.back}) — ${u.to} may not notice, or notices and keeps a polite distance]`;
    if (i >= 0) lines[i] += note; else if (lines.length < limit + 2) lines.push(`- ${u.from} → ${u.to}: unrequited (attraction ${u.v})${note}`);
  }
  for (const e of (R.events ?? []).filter((x) => x.kind === "reject")) { const left = awkwardLeft(folder, e.a, e.b, at); if (left > 0 && (rel(e.a) || rel(e.b))) lines.push(`- ${e.a} & ${e.b}: awkward after ${e.by} turned down ${e.a}'s confession (${left} more turns): avoid eye contact, overly polite, short talks; feelings have not simply vanished`); }
  for (const j of Object.values(R.jealous ?? {})) if (at - (j.at ?? -99) <= 6 && (rel(j.a) || rel(j.b))) lines.push(`- ${j.a}: jealous that ${j.b} grew close to ${j.c} — shows it in their own way (sulking, teasing, clinging or pretending not to care)`);
  for (const t of triangles(folder).slice(0, 2)) if (rel(t.a) || rel(t.c)) lines.push(`- ${t.a} vs ${t.c}: rivals in love over ${t.over} — wary of each other, competing for attention, may clash`);
  for (const x of exPairs(folder).slice(-2)) {
    for (const [p, q] of [[x.a, x.b], [x.b, x.a]]) { const t = folder?.emo?.[key(p) + ">" + key(q)]?.tags ?? {}; if ((t.possess ?? 0) + (t.exclusive ?? 0) > 0 && rel(p)) lines.push(`- ${p} → ${q}: ex — lingering attachment (possessive ${t.possess ?? 0}, exclusive ${t.exclusive ?? 0}) mixed with hurt; it fades slowly`); }
  }
  for (const lp of loverPairs(folder)) if (isSecret(folder, lp.a, lp.b) && (rel(lp.a) || rel(lp.b))) lines.push(`- ${lp.a} & ${lp.b}: secret relationship — act like ordinary acquaintances in front of others; affection only when alone; fear of being found out`);
  for (const sr of strayed.values()) lines.push(`- ${sr.name} → ${sr.partner}: lovers, but the spark has ${sr.why === "faded" ? "faded" : "soured into resentment"}${sr.attraction != null ? ` (attraction ${sr.attraction})` : ""}: may be drawn to someone else — wandering eyes, comparing, excuses to be away; strays only if a real chance comes and it fits their personality, never suddenly`);
  return lines.length ? [ROMANCE_RULE, ...lines] : [];
}
