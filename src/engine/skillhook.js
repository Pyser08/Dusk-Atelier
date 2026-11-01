// 스킬 주입 공급자 연결점 (v1.8.1). main.js가 등록하고, 리수폿 단계 호출·기억 분석 호출이 부른다.
// 공급자가 없거나 실패하면 "" → 프롬프트는 원문 그대로.
let provider = null;
export function setSkillBlockProvider(fn) { provider = fn; }
export async function skillBlock(stage) { try { return (await provider?.(stage)) || ""; } catch { return ""; } }
