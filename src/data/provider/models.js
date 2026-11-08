// 모델 목록·잔액 조회 (v1.9.3). 공급자가 지원하는 것만. 실패는 메시지로 돌려준다.
import { kindOf, baseUrlOf } from "../../engine/provider/catalog.js";
const hdr = (conn, cred) => (conn.format === "anthropic" ? { "x-api-key": cred, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } : conn.format === "gemini" ? { "x-goog-api-key": cred } : { authorization: `Bearer ${cred}` });
async function getJson(transport, url, headers, signal, proxyUrl) { const r = await transport.send({ url, method: "GET", headers, body: undefined }, { signal, proxyUrl }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
export function parseModels(conn, j) {
  const rows = j?.data ?? j?.models ?? [];
  return rows.map((m) => String(m.id ?? m.name ?? "").replace(/^models\//, "")).filter(Boolean).sort();
}
export async function listModels(transport, conn, cred, signal) {
  const k = kindOf(conn.kind); if (!k.models) throw new Error("이 공급자는 모델 목록을 불러올 수 없어요");
  const url = `${String(baseUrlOf(conn)).replace(/\/+$/, "")}${k.models}${conn.format === "gemini" ? "?pageSize=200" : ""}`;
  const ids = parseModels(conn, await getJson(transport, url, cred ? hdr(conn, cred) : {}, signal, conn.proxyUrl));
  const hide = new Set(conn.hidden ?? []); return [...new Set([...(conn.userModels ?? []), ...ids])].filter((m) => !hide.has(m));
}
// 잔액·쿼터: 공급자별 공개 조회 주소(응답 모양이 공급자마다 달라서 숫자만 뽑는다)
const BAL = { openrouter: { url: "https://openrouter.ai/api/v1/credits", pick: (j) => ({ label: "남은 크레딧", value: Number(j?.data?.total_credits) - Number(j?.data?.total_usage), unit: "$" }) },
  deepseek: { url: "https://api.deepseek.com/user/balance", pick: (j) => ({ label: "잔액", value: Number(j?.balance_infos?.[0]?.total_balance), unit: j?.balance_infos?.[0]?.currency ?? "" }) } };
export const hasBalance = (kind) => !!BAL[kind];
export async function fetchBalance(transport, conn, cred, signal) {
  const b = BAL[conn.kind]; if (!b) throw new Error("이 공급자는 잔액 조회를 지원하지 않아요");
  const v = b.pick(await getJson(transport, b.url, hdr(conn, cred), signal, conn.proxyUrl)); if (!Number.isFinite(v.value)) throw new Error("잔액을 읽지 못했어요"); return v;
}
