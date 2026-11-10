// 기능끼리의 선행 조건(순수). "켰는데 동작하지 않는" 일을 막는다.
// 어떤 기능을 켜면 그 기능이 실제로 돌기 위해 필요한 다른 설정을 함께 맞추고(healDeps),
// 화면에는 무엇이 함께 켜졌는지·무엇 때문에 멈춰 있는지 알려 준다(depState).
// 새 선행 조건이 생기면 DEPS에 한 줄만 더한다 — 화면과 실행(매 적용)이 같은 표를 본다.
const cycleOn = (s) => s?.features?.openness?.cycle === true;

export const DEPS = [
  // 월경·임신 기록(리수폿 cycleTrackingOn): 욕구 기록이 켜져 있어야 셈을 시작한다.
  { id: "cycle.desire", feature: "cycle", when: cycleOn, ok: (s) => s.sexualDesireEnabled === true, fix: (s) => { s.sexualDesireEnabled = true; }, label: "욕구 기록" },
  // 주기 보고는 인물의 '지금 상태'(core.current_state) 칸에 실려 온다. 서사관계 전용 모드에서는 인지·정체 인식이 '켬'일 때만 그 칸을 쓴다.
  { id: "cycle.state", feature: "cycle", when: cycleOn, ok: (s) => s.relationshipOnlyMode !== true || s.relationshipPerceptionMode === "on", fix: (s) => { s.relationshipPerceptionMode = "on"; }, label: "인물 상태 기록(인지·정체 인식 ‘켬’)" },
];

const FEATURE_ON = { cycle: cycleOn };

// 지금 빠져 있는 선행 조건 목록
export function missingDeps(settings) {
  if (!settings || typeof settings !== "object") return [];
  return DEPS.filter((d) => { try { return d.when(settings) && !d.ok(settings); } catch { return false; } });
}

// 빠진 선행 조건을 채운다(settings를 직접 고침). 반환: 이번에 함께 켠 것의 이름들.
export function healDeps(settings) {
  const done = [];
  for (const d of missingDeps(settings)) { try { d.fix(settings); done.push(d.label); } catch { /* 고칠 수 없는 모양이면 건너뜀 */ } }
  return done;
}

// 기능 하나의 상태: off(꺼짐) | working(동작 중) | blocked(켜졌지만 조건이 빠져 멈춤)
export function depState(feature, settings) {
  const on = FEATURE_ON[feature];
  if (!on || !settings || !on(settings)) return { state: "off", missing: [], needs: [] };
  const mine = DEPS.filter((d) => d.feature === feature), missing = missingDeps(settings).filter((d) => d.feature === feature);
  return { state: missing.length ? "blocked" : "working", missing: missing.map((d) => ({ id: d.id, label: d.label })), needs: mine.map((d) => d.label) };
}

// 이 설정 칸을 다른 기능이 붙잡고 있는가(화면에서 "○○ 때문에 고정돼요"를 보여 줄 때). 반환: 붙잡은 기능 이름 또는 null
export function lockedBy(key, settings) {
  if (key === "relationshipPerceptionMode" && cycleOn(settings) && settings.relationshipOnlyMode === true) return "월경·임신 기록";
  if (key === "sexualDesireEnabled" && cycleOn(settings)) return "월경·임신 기록";
  return null;
}
