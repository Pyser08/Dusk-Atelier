// addon-rebuild: 모델 답이 '검열(거절)'인지 판별. 확실할 때만 검열이라 한다 — 근거는 두 가지뿐:
// ① JSON 대신 거절 문장이 왔을 때(“I can't…”, “죄송하지만…” 등), ② 제공자가 안전 필터로 막았다는 오류를 줬을 때(SAFETY·PROHIBITED_CONTENT·content_filter 등).
// 빈 답·형식 깨짐·항목 누락은 검열로 단정하지 않고 '문제'로 남긴다.
const REFUSAL_RE = /(I can(?:'|’|no)t (?:help|assist|comply|create|generate|provide|write|do|continue|fulfil)|I(?:'|’)m (?:sorry|unable)|I am (?:sorry|unable)|unable to (?:help|assist|comply|provide)|cannot (?:help|assist|comply|create|generate|provide|write) (?:with )?(?:this|that)|against (?:my|the) (?:guidelines|policies|policy|usage)|(?:content|usage|safety) polic|not able to (?:help|provide|create)|sexual content involving|죄송하지만|죄송합니다|도와(?:\s)?드릴 수 없|제공(?:해 드릴|할) 수 없|작성(?:해 드릴|할) 수 없|생성할 수 없|응답할 수 없|요청을 처리할 수 없|정책(?:에|상))/i;
const BLOCK_RE = /\b(SAFETY|PROHIBITED_CONTENT|BLOCKLIST|SPII|content[_ ]filter(?:ed)?|content_policy_violation|responsible ?AI|moderation|flagged|blockReason|finish_?reason["':\s]*(?:content_filter|safety))\b/i;

const looksJson = (t) => /^\s*(?:```[a-z]*\s*)?[[{]/.test(t);

// 모델 답(글자) → 거절이면 짧은 발췌, 아니면 ""
export function refusalText(text) {
  const t = String(text ?? "").trim();
  if (!t || looksJson(t)) return "";
  return REFUSAL_RE.test(t.slice(0, 1500)) ? t.replace(/\s+/g, " ").slice(0, 160) : "";
}
// 오류(제공자 응답 등) → 안전 필터 차단이면 true
export const blockedError = (e) => BLOCK_RE.test(String(e?.message ?? e ?? ""));
// 오류 메시지가 이미 검열로 분류됐는지
export const isCensored = (s) => /^검열[:：]/.test(String(s?.message ?? s ?? "").trim());
export const censorMessage = (detail) => `검열: ${detail}`;
export const problemMessage = (detail) => `문제: ${detail}`;
