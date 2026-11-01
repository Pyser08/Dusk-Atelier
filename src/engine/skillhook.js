// 스킬 주입 공급자 연결점 + 최근 호출 기록 (v1.8.1). main.js가 등록하고, 리수폿 단계 호출·기억 분석 호출이 부른다.
// 공급자가 없거나 실패하면 "" → 프롬프트는 원문 그대로. 기록은 이번 접속 동안 메모리에만 두고(저장 안 함) 화면의 '최근 호출'에서 본다.
let provider = null;
const calls = [];
export function setSkillBlockProvider(fn) { provider = fn; }
export function noteCall(e) { calls.unshift({ at: Date.now(), ...e }); if (calls.length > 30) calls.length = 30; }
export function noteTools(stage, tools) { const c = calls.find((x) => x.stage === stage); if (c) c.tools = tools; }
export const recentCalls = () => calls.slice();
export function clearCalls() { calls.length = 0; }
export async function skillBlock(stage) {
  let b = "";
  try { b = (await provider?.(stage)) || ""; } catch { b = ""; }
  noteCall({ stage, chars: b.length });
  return b;
}
