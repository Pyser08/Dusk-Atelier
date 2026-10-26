// 장기기억 등급 D < C < B < A < S < EX. 모델은 p·s·r(0~3)만 내고 등급은 여기서 계산한다.
export const GRADES = ["D", "C", "B", "A", "S", "EX"];
export const GRADE_WEIGHT = { D: 1, C: 2, B: 4, A: 8, S: 16, EX: 32 };
// 합계(0~9) → 등급. 0~1은 기록 안 함.
export const SCORE_TABLE = [null, null, "D", "D", "C", "C", "B", "A", "S", "EX"];
// 한 응답에서 허용하는 최대 개수(넘치면 점수 낮은 것부터 한 단계 강등).
export const GRADE_CAP = { EX: 1, S: 2, A: 3 };
export const MAX_PER_RESPONSE = 6, MAX_PER_PERSON_PER_RESPONSE = 2;

export const clampAxis = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(3, Math.max(0, n)) : 0; };
export const scoreToGrade = (score) => SCORE_TABLE[Math.min(9, Math.max(0, Math.round(score) || 0))] ?? null;
export const gradeRank = (g) => GRADES.indexOf(g);
export const atLeast = (g, min) => gradeRank(g) >= gradeRank(min);

export function scoreEntry(e) {
  const p = clampAxis(e?.p), s = clampAxis(e?.s), r = clampAxis(e?.r);
  const score = p + s + r;
  return { p, s, r, score, g: scoreToGrade(score) };
}

const norm = (t) => String(t ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
const tokens = (t) => { const n = norm(t); const set = new Set(); for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2)); if (n.length === 1) set.add(n); return set; };
export function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size && !B.size) return 1;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// 한 응답의 후보를 점수화·상한 적용. entries: [{name, act, p, s, r}] → 기록할 것만 반환.
export function gradeResponse(entries) {
  const scored = (entries ?? []).map((e) => ({ ...e, ...scoreEntry(e) })).filter((e) => e.g && String(e.act ?? "").trim());
  scored.sort((a, b) => b.score - a.score);
  const perPerson = new Map(), out = [];
  for (const e of scored) {
    const k = norm(e.name); const n = perPerson.get(k) ?? 0;
    if (n >= MAX_PER_PERSON_PER_RESPONSE) continue;
    perPerson.set(k, n + 1); out.push(e);
    if (out.length >= MAX_PER_RESPONSE) break;
  }
  // 상위 등급부터 상한 적용, 넘친 것은 한 단계 강등 후 아래 등급 상한에서 다시 센다.
  for (const g of ["EX", "S", "A"]) {
    const over = out.filter((e) => e.g === g).sort((a, b) => b.score - a.score).slice(GRADE_CAP[g]);
    for (const e of over) e.g = GRADES[gradeRank(g) - 1];
  }
  return out;
}

// 같은 인물의 최근 N건과 비교. 중복이면 {dup:record, upgrade:boolean}, 아니면 null.
export function findDuplicate(records, act, g, recent = 10, threshold = 0.8) {
  const last = (records ?? []).slice(-recent);
  for (let i = last.length - 1; i >= 0; i--) {
    if (similarity(last[i].act, act) >= threshold) return { dup: last[i], upgrade: gradeRank(g) > gradeRank(last[i].g) };
  }
  return null;
}

// 인물당 상한 초과 시 오래된 D부터 삭제. A·B·핀·사용자 수정은 보존.
export function pruneRecords(records, cap = 300) {
  let excess = records.length - cap;
  if (excess <= 0) return records;
  const drop = new Set();
  for (const g of ["D", "C"]) {
    for (const r of records) {
      if (excess <= 0) break;
      if (r.g === g && !r.pin && !r.user && !drop.has(r)) { drop.add(r); excess--; }
    }
  }
  return records.filter((r) => !drop.has(r));
}
