// v1.7.1 2단계: 검색 키(순수). 기억을 만들 때 인물·장소·키워드를 함께 저장하고, 현재 장면 글과 코드 키워드 매칭으로 찾는다.
// 한계: 표현이 다르면 놓치고(동의어), 흔한 낱말은 엉뚱한 기억을 부를 수 있다. 정확도는 evalRetrieval로 재어 본다.
const cut = (v, n) => String(v ?? "").trim().slice(0, n);
export const KEYS_MAX = 4, KEY_MIN = 2;
export const normText = (t) => String(t ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");

// 모델이 낸 keys 정리: 중복 제거, 길이 제한, 너무 짧은 낱말 제외.
export function validateKeys(v) {
  const seen = new Set(), out = [];
  for (const x of Array.isArray(v) ? v : []) {
    const s = cut(x, 20), n = normText(s);
    if (n.length < KEY_MIN || seen.has(n)) continue;
    seen.add(n); out.push(s);
    if (out.length >= KEYS_MAX) break;
  }
  return out;
}
// 기록의 검색어: 저장된 keys + 그 기록이 일어난 장면의 장소(코드가 자동으로 붙인다 → 모델 토큰 없음).
export function keysOf(rec, folder) {
  const set = new Set((rec?.keys ?? []).map(normText));
  if (rec?.sit) { const s = (folder?.scenes ?? []).find((x) => x.id === rec.sit && !x.orphan); const p = normText(s?.place); if (p.length >= KEY_MIN) set.add(p); }
  return [...set].filter((k) => k.length >= KEY_MIN);
}
// 현재 장면 글(정규화된 문자열)에 키가 몇 개 들어 있는가.
export function keyHits(rec, folder, qNorm) {
  if (!qNorm) return 0;
  let n = 0; for (const k of keysOf(rec, folder)) if (qNorm.includes(k)) n++;
  return n;
}
export const keyBoost = (hits) => 1 + Math.min(1.5, hits * 0.5);

// 검색 정확도 측정: cases [{name, recentText, need:[기록 id], avoid:[기록 id]}], run(case) → 주입된 기록 id 배열.
// 필요한 기억 포착률 / 불필요한 기억 배제율. '누락으로 인한 연속성 오류'는 사람이 need를 정할 때 반영한다.
export function evalRetrieval(cases, run) {
  const rows = (cases ?? []).map((c) => {
    const got = new Set(run(c) ?? []);
    const hit = (c.need ?? []).filter((id) => got.has(id)), bad = (c.avoid ?? []).filter((id) => got.has(id));
    return { name: c.name ?? "", need: (c.need ?? []).length, hit: hit.length, missed: (c.need ?? []).filter((id) => !got.has(id)), avoid: (c.avoid ?? []).length, leaked: bad };
  });
  const sum = (f) => rows.reduce((a, r) => a + f(r), 0), need = sum((r) => r.need), avoid = sum((r) => r.avoid);
  return { rows, capture: need ? sum((r) => r.hit) / need : 1, exclusion: avoid ? 1 - sum((r) => r.leaked.length) / avoid : 1 };
}
