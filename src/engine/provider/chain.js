// 실패 분류와 대체 사슬 (v1.9.3, 순수)
export function classifyFailure({ status = 0, message = "", code = "", aborted = false, empty = false, blocked = false } = {}) {
  const m = String(message).toLowerCase();
  if (aborted) return "abort";
  if (blocked || /safety|blocked|prohibited|content[_ ]filter|차단/.test(m) || code === "blocked") return "blocked";
  if (empty) return "empty";
  if (status === 429 || /rate.?limit|quota|resource.?exhausted|too many|overloaded_error/.test(m)) return "rate";
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status === 504 || /timeout|timed out|제한시간/.test(m)) return "timeout";
  if (status >= 500 || status === 529) return "server";
  if (status >= 400) return "client";
  return "network";
}
export const RETRY_SAME = new Set(["server", "network", "timeout"]);      // 같은 대상 재시도 가치 있음
export const SWITCH_KEY = new Set(["rate", "auth"]);                      // 다른 키로
export const NEXT_TARGET = new Set(["rate", "auth", "blocked", "empty", "server", "network", "timeout"]); // 다른 모델/공급자로 넘길 수 있음
// 재시도 대상(retryOn): server = 서버 오류·네트워크·시간 초과(기본) / rate = 429만 / both = 둘 다
export const retryKindsOf = (retryOn) => (retryOn === "rate" ? new Set(["rate"]) : retryOn === "both" ? new Set([...RETRY_SAME, "rate"]) : RETRY_SAME);
export function planAfterFailure(kind, { retriesLeft = 0, keysLeft = 0, chainLeft = 0, chainOn = true, retryOn = "server" } = {}) {
  if (kind === "abort") return "stop";
  if (SWITCH_KEY.has(kind) && keysLeft > 0) return "switch-key";
  if (retryKindsOf(retryOn).has(kind) && retriesLeft > 0) return "retry";
  if (chainOn && NEXT_TARGET.has(kind) && chainLeft > 0) return "next-target";
  return "fail";
}
export const backoffMs = (attempt, base = 700) => Math.min(8000, base * 2 ** attempt);
