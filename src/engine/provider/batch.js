// 배치 (2.0.0, 순수): Anthropic Message Batches 요청·응답 다루기. 네트워크 없음.
// 배치로 보내면 값이 절반이고 오래 걸릴 수 있어요(최대 24시간). 같은 입력은 새 배치를 만들지 않고 이어서 확인해요.
// 기다리기/만들고 끝내기, 같은 입력 재사용은 Yumi Provider Manager v1.19.3(원작자 허락)의 배치 동작을 참고했어요.
import { usageAnthropic } from "./sse.js";
const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}` : JSON.stringify(v));
// 같은 입력인지 가르는 키(stream 여부는 상관없음)
export const batchKey = (body) => { const { stream, ...rest } = body ?? {}; return hash(stable(rest)); };
export const batchBaseOf = (messagesUrl) => `${String(messagesUrl).replace(/\/+$/, "")}/batches`;
const authHeaders = (h) => { const o = {}; for (const k of ["x-api-key", "anthropic-version", "anthropic-dangerous-direct-browser-access", "content-type"]) if (h?.[k] !== undefined) o[k] = h[k]; return o; };
export function batchCreateRequest(reqObj, customId) {
  const { stream, ...params } = reqObj.body ?? {};
  return { url: batchBaseOf(reqObj.url), method: "POST", headers: authHeaders(reqObj.headers), body: { requests: [{ custom_id: customId, params }] } };
}
export const batchStatusRequest = (reqObj, id) => ({ url: `${batchBaseOf(reqObj.url)}/${encodeURIComponent(id)}`, method: "GET", headers: authHeaders(reqObj.headers), body: undefined });
export const batchResultsRequest = (reqObj, status) => ({ url: status.resultsUrl || `${batchBaseOf(reqObj.url)}/${encodeURIComponent(status.id)}/results`, method: "GET", headers: authHeaders(reqObj.headers), body: undefined });
export const parseBatchStatus = (j) => ({ id: String(j?.id ?? ""), ended: j?.processing_status === "ended", resultsUrl: j?.results_url ?? "", counts: j?.request_counts ?? {} });
// 결과 JSONL에서 내 요청 한 줄을 골라 {text, thinking, usage} 또는 {error}
export function parseBatchResults(jsonl, customId) {
  const rows = String(jsonl ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const row = rows.find((r) => r.custom_id === customId) ?? rows[0]; if (!row) return { error: "배치 결과가 비어 있어요" };
  const r = row.result ?? {};
  if (r.type === "succeeded") { const out = { text: "", thinking: "", usage: usageAnthropic(r.message?.usage) }; for (const b of r.message?.content ?? []) { if (b.type === "text") out.text += b.text ?? ""; else if (b.type === "thinking") out.thinking += b.thinking ?? ""; } return out; }
  if (r.type === "errored") return { error: String(r.error?.error?.message ?? r.error?.message ?? "배치 요청이 실패했어요").slice(0, 300) };
  if (r.type === "expired") return { error: "배치가 24시간 안에 끝나지 않아 만료됐어요" };
  if (r.type === "canceled") return { error: "배치가 취소됐어요" };
  return { error: "알 수 없는 배치 결과예요" };
}
