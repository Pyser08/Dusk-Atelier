// 2.2.6 썸 행동 지침(순수): 이성적 호감(attraction 0~10) 단계와 그 인물의 성격(위키 기본 성격 6축)에 맞춰
// 응답 모델이 끌림을 ‘자연스럽게, 천천히’ 보여 주게 하는 줄을 만든다. 기억 블록(memoryinject)에 들어간다.
import { isLover } from "./lover.js";

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
  rows.sort((a, b) => b.v - a.v);
  const lines = rows.slice(0, limit).map(({ p, v, lover }) => {
    const style = styleOf(ax.get(key(p.from)));
    if (lover) return `- ${p.from} → ${p.to}: lovers (attraction ${v}); shows love in their own way${style ? ` — ${style}` : ""}`;
    const [, name, act] = STAGES.find(([min]) => v >= min);
    return `- ${p.from} → ${p.to}: ${name} (attraction ${v}): ${act}${style ? ` — as this person: ${style}` : ""}`;
  });
  return lines.length ? [ROMANCE_RULE, ...lines] : [];
}
