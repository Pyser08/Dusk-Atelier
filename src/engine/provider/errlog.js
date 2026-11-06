// 오류 기록 (2.0.0, 순수): 재시도·실패를 하나씩 남기는 작은 링 버퍼. 키처럼 보이는 글자는 가린다. 요청 내용은 저장하지 않는다.
// 오류 기록·재시도 정책은 Yumi Provider Manager v1.19.3(원작자 허락)을 참고했어요.
const KEYLIKE = /\b(sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{12,}|[A-Za-z0-9_-]{32,})\b/g;
export const maskSecrets = (s) => String(s ?? "").replace(KEYLIKE, "***");
export function createErrorLog({ max = 200, now = () => Date.now() } = {}) {
  let rows = []; const subs = new Set();
  return {
    add(r) { rows = [{ at: now(), model: String(r.model ?? ""), purpose: String(r.purpose ?? ""), kind: String(r.kind ?? ""), status: Number(r.status) || 0, attempt: Number(r.attempt) || 0, ms: Number(r.ms) || 0, action: String(r.action ?? ""), message: maskSecrets(r.message).slice(0, 300) }, ...rows].slice(0, max); for (const f of subs) { try { f(rows); } catch { /* 구독자 오류 무시 */ } } },
    list: () => rows,
    clear() { rows = []; for (const f of subs) { try { f(rows); } catch { /* 무시 */ } } },
    setMax(n) { max = Math.max(3, Math.min(2000, Number(n) || 200)); rows = rows.slice(0, max); },
    load(list) { rows = Array.isArray(list) ? list.slice(0, max) : []; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); }
  };
}
// 복사용 글(한 줄에 하나, 키는 이미 가려져 있음)
const KIND_LABEL = { ok: "성공", rate: "한도", auth: "인증", timeout: "시간초과", server: "서버", network: "네트워크", blocked: "차단", empty: "빈응답", client: "요청오류", abort: "취소" };
export const kindLabel = (k) => KIND_LABEL[k] ?? k;
export const formatLog = (rows) => rows.map((r) => `${new Date(r.at).toISOString().replace("T", " ").slice(0, 19)} ${kindLabel(r.kind)}(${r.kind}) ${r.status || "-"} ${r.model || "-"} ${r.purpose || "-"} 시도${r.attempt} ${r.ms ? `${(r.ms / 1000).toFixed(1)}s ` : ""}${r.action || ""} ${r.message || ""}`.trim()).join("\n");
