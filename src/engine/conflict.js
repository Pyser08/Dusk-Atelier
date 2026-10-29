// v1.7.0 4단계: 롤백 충돌 '변경 비교'(순수). 응답을 고치기 전의 자동 기록이 있는데 그 뒤에 인물 문서를 직접 고쳐서
// 자동으로 되돌릴 수 없을 때(record.status "manual" · errorCode "rollback-conflict") 무엇이 겹쳤는지 보여 준다.
export var ROLLBACK_CODE = "rollback-conflict";

// 아직 안 닫은 충돌 목록(최신순)
export var conflictsOf = (scope) => Object.entries(scope?.automation?.records ?? {})
  .filter(([, r]) => r?.status === "manual" && r.errorCode === ROLLBACK_CODE && !r.hidden)
  .map(([key, r]) => ({ key, at: r.at ?? "", messageIndex: r.messageIndex }))
  .sort((a, b) => String(b.at).localeCompare(String(a.at)));

// 슬롯 이름 → 화면에 보일 말
var SLOT_LABEL = { "affinity.score": "호감도", "affinity.taste_band": "첫인상", "openness.score": "음란도", "suspicion.score": "의심도", "core.relationship": "관계·호칭", "core.current_state": "지금 상태", "core.speech": "말투", "core.profile": "프로필" };
export var slotLabel = (id) => SLOT_LABEL[id] ?? id ?? "수치";

var val = (v) => v == null || v === "" ? "없음" : String(v);
function itemsOf(doc) {
  const out = new Map();
  for (const s of doc?.sections ?? []) out.set(`s:${s.id}`, { label: s.heading || s.title || slotLabel(s.provenance?.slotId) || "본문", text: s.body ?? "" });
  for (const m of doc?.metrics ?? []) out.set(`m:${m.id}`, { label: slotLabel(m.slotId), text: m.value });
  return out;
}

// 같은 응답을 자동 기록한 변경(완료 기록)마다 [원래 → AI가 바꿈 → 지금]을 견준다. AI 변경 뒤에 내가 고친 줄은 mine=true.
export function compareChanges(scope, conflict) {
  const ids = new Set(Object.values(scope?.automation?.records ?? {})
    .filter((r) => r?.status === "completed" && r.messageIndex === conflict?.messageIndex)
    .flatMap((r) => r.historyIds ?? []));
  const out = [];
  for (const e of scope?.history ?? []) {
    if (!ids.has(e.id)) continue;
    const before = itemsOf(e.before), after = itemsOf(e.after), now = itemsOf(scope.documents?.[e.documentId]);
    const rows = [];
    for (const [k, a] of after) {
      const b = before.get(k), n = now.get(k);
      if (b && String(b.text) === String(a.text)) continue;   // AI가 안 바꾼 줄
      rows.push({ label: a.label, before: val(b?.text), ai: val(a.text), now: val(n?.text), mine: !n || String(n.text) !== String(a.text) });
    }
    if (rows.length) out.push({ title: e.after?.title ?? e.before?.title ?? e.documentId, rows: rows.sort((x, y) => y.mine - x.mine) });
  }
  return out;
}

// '그대로 두기': 충돌 기록을 숨긴다(고친 문서는 그대로). 반환: 새 범위
export function dismissConflict(scope, key) {
  const next = structuredClone(scope);
  const r = next.automation?.records?.[key];
  if (!r) return scope;
  r.hidden = true;
  next.revision = (next.revision ?? 0) + 1;
  return next;
}
