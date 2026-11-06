// 오류 기록 (2.0.0, 순수): 재시도·실패를 하나씩 남기는 작은 링 버퍼. 키처럼 보이는 글자는 가린다. 요청 내용은 저장하지 않는다.
// 오류 기록·재시도 정책은 Yumi Provider Manager v1.19.3(원작자 허락)을 참고했어요.
const KEYLIKE = /\b(sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{12,}|[A-Za-z0-9_-]{32,})\b/g;
export const maskSecrets = (s) => String(s ?? "").replace(KEYLIKE, "***");
export function createErrorLog({ max = 200, now = () => Date.now() } = {}) {
  let rows = []; const subs = new Set();
  return {
    add(r) { rows = [{ at: now(), model: String(r.model ?? ""), purpose: String(r.purpose ?? ""), kind: String(r.kind ?? ""), status: Number(r.status) || 0, attempt: Number(r.attempt) || 0, action: String(r.action ?? ""), message: maskSecrets(r.message).slice(0, 300) }, ...rows].slice(0, max); for (const f of subs) { try { f(rows); } catch { /* 구독자 오류 무시 */ } } },
    list: () => rows,
    clear() { rows = []; for (const f of subs) { try { f(rows); } catch { /* 무시 */ } } },
    load(list) { rows = Array.isArray(list) ? list.slice(0, max) : []; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); }
  };
}
