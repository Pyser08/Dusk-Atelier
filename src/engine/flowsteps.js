// 이번 턴 진행 점 5개(고르기 → 회상 → 정리 → 주입 → 저장). 순수 함수: 마지막 턴 기록만 보고 상태를 만든다.
export const STEP_LABELS = { pick: "고르기", recall: "회상", note: "정리", inject: "주입", save: "저장" };
const SKIP_DIRECTOR = new Set(["", "idle", "skipped", "disabled", "off", "none"]);

// state: "done" | "skip" | "wait"
export function stepsOf({ on = false, mode = "fast", last = null, inject = null, session = null, lastSuccessAt = 0 } = {}) {
  if (!on) return Object.keys(STEP_LABELS).map((id) => ({ id, label: STEP_LABELS[id], state: "wait", hint: "" }));
  const had = !!last?.at, focus = last?.focus ?? [];
  const accurate = mode === "accurate";
  const dir = String(last?.director ?? "");
  return [
    { id: "pick", state: had ? "done" : "wait", hint: accurate ? "모델로 골랐어요" : "키워드로 골랐어요" },
    { id: "recall", state: !had ? "wait" : focus.length ? "done" : "skip", hint: focus.length ? `${focus.length}명의 기록` : "찾을 기록이 없었어요" },
    { id: "note", state: !accurate ? "skip" : !had ? "wait" : SKIP_DIRECTOR.has(dir) ? "skip" : "done", hint: accurate ? "" : "빠른 모드에서는 건너뛰어요" },
    { id: "inject", state: inject ? (inject.injected ? "done" : "skip") : "wait", hint: inject?.injected ? "기억 블록을 넣었어요" : inject ? "이번엔 넣지 않았어요" : "" },
    { id: "save", state: (session?.calls ?? 0) > 0 || lastSuccessAt ? "done" : "wait", hint: lastSuccessAt ? "마지막 저장 성공" : "" },
  ].map((s) => ({ ...s, label: STEP_LABELS[s.id] }));
}
