// 장기기억 애드온: 인물 위키 자동 기록(Writer) 실패 기록 다루기(순수).
// 11-21 제보 — 한 번 실패한 응답은 그 뒤 입력마다 실패를 다시 알렸다. 실패 뒤 AUTO_RETRY_GAP이 지나면 자동으로 한 번 다시 하고,
// 그 뒤엔 조용히 기다린다(처음 실패 때 뜬 알림의 ‘다시 시도’로 직접 다시 할 수 있음).
export const AUTO_RETRY_GAP = 60_000;
export function failedAutoRecord(scope, identity, { manual = false } = {}) {
  if (manual) return null;
  return Object.values(scope?.automation?.records ?? {}).find((r) => r?.identity === identity && r.status === "failed") ?? null;
}
export function autoRetryDue(record, now = Date.now()) {
  if (!record || (record.autoTry ?? 0) >= 1) return false;
  const t = Date.parse(record.at ?? "");
  return !Number.isFinite(t) || now - t >= AUTO_RETRY_GAP;
}
