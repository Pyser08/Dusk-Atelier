// v1.7.0 3단계: 기억 화면 '저장된 기록 막대'(순수). 기록 N건이 마지막 요청에서 어떻게 쓰였는지 4가지로 센다.
//  넣음(요청에 들어감) · 요약에 반영됨(digest로 압축) · 예산 제한(예산이 모자라 통째로 빠진 인물) · 관련 없음(나머지)
export var USAGE_KINDS = [["used", "넣음"], ["digested", "요약에 반영됨"], ["unrelated", "관련 없음"], ["budget", "예산 제한"]];

export function usageOf(folder, manifest) {
  const out = { total: 0, used: 0, digested: 0, unrelated: 0, budget: 0 };
  const ids = new Set(manifest?.recordIds ?? []);
  const cut = new Set((manifest?.excluded ?? []).map((x) => x?.name).filter(Boolean));
  for (const p of Object.values(folder?.people ?? {})) {
    for (const r of p.records ?? []) {
      if (r.orphan) continue;
      out.total++;
      if (ids.has(r.id)) out.used++;
      else if (r.digested) out.digested++;
      else if (cut.has(p.name)) out.budget++;
      else out.unrelated++;
    }
  }
  return out;
}

// 상태 카드 한 줄: 마지막 요청이 있으면 시각 + 넣은 기억 수, 없으면 이유.
export function injectLine(last, hhmm, reasonText) {
  if (!last) return "아직 요청이 없었어요. 다음 응답부터 기억을 넣어요.";
  const n = last.manifest?.recordIds?.length ?? 0;
  if (last.injected) return `마지막 요청 ${hhmm} · 기억 ${n}건을 넣었어요`;
  return `마지막 요청 ${hhmm} · 넣지 않았어요${reasonText ? ` (${reasonText})` : ""}`;
}
