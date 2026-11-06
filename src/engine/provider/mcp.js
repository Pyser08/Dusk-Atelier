// MCP (2.0.0, 순수): 서버 정리·도구 이름·JSON-RPC 틀·응답 읽기. 네트워크 없음.
// streamable-http 방식(POST 한 번에 JSON 또는 SSE 한 줄로 응답)을 다룬다. 예전 SSE 전용(두 갈래) 서버는 지원하지 않는다.
// MCP 서버·도구 연결 구조는 Yumi Provider Manager v1.19.3(원작자 허락)을 참고했어요.
const str = (v, d = "") => (typeof v === "string" ? v : d);
const safeName = (s) => String(s).replace(/[^A-Za-z0-9_]/g, "_").slice(0, 40);
export const mcpNameOf = (serverId, tool) => `mcp_${safeName(serverId)}_${safeName(tool)}`;
// 읽기 전용이라고 밝힌 도구만 안전으로 본다(밝히지 않으면 쓰기로 취급)
export const isMcpWrite = (t) => t?.annotations?.readOnlyHint !== true;
const httpUrl = (u) => { try { const x = new URL(String(u).trim()); return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : ""; } catch { return ""; } };
const headerObj = (h) => Object.fromEntries(Object.entries(h && typeof h === "object" && !Array.isArray(h) ? h : {}).filter(([k, v]) => typeof v === "string" && /^[A-Za-z0-9-]+$/.test(k) && !/^(host|content-length|content-type|accept|mcp-session-id)$/i.test(k)));
export function normalizeMcpServer(s) {
  const tools = (Array.isArray(s?.tools) ? s.tools : []).filter((t) => t && typeof t.name === "string").slice(0, 100).map((t) => ({ name: t.name, description: str(t.description).slice(0, 400), inputSchema: t.inputSchema && typeof t.inputSchema === "object" ? t.inputSchema : { type: "object", properties: {} }, annotations: t.annotations && typeof t.annotations === "object" ? { readOnlyHint: t.annotations.readOnlyHint === true } : {} }));
  return { id: str(s?.id) || Math.random().toString(36).slice(2, 10), name: str(s?.name, "MCP 서버").slice(0, 40) || "MCP 서버", url: httpUrl(s?.url), transport: s?.transport === "sse" ? "sse" : "http", headers: headerObj(s?.headers), keyId: str(s?.keyId), enabled: s?.enabled !== false, allowWrite: s?.allowWrite === true, tools };
}
export function mcpToolDefs(servers) {
  const out = [];
  for (const s of servers ?? []) {
    if (!s.enabled || !s.url) continue;
    for (const t of s.tools ?? []) {
      const write = isMcpWrite(t); if (write && !s.allowWrite) continue;
      const params = t.inputSchema?.type === "object" ? { type: "object", properties: t.inputSchema.properties ?? {}, required: t.inputSchema.required ?? [] } : { type: "object", properties: {}, required: [] };
      out.push({ name: mcpNameOf(s.id, t.name), description: `[${s.name}] ${t.description || t.name}`.slice(0, 500), parameters: params, group: write ? "write" : "mcp", mcp: { server: s.id, tool: t.name, write } });
    }
  }
  return out;
}
let rid = 0;
export const nextRpcId = () => ++rid;
export const rpcRequest = (id, method, params) => ({ jsonrpc: "2.0", id, method, params });
// 응답(JSON 한 덩어리 또는 SSE 여러 줄)에서 내 id의 결과를 뽑는다
export function parseRpc(text, id) {
  const t = String(text ?? "").trim(); if (!t) return { error: "응답이 비어 있어요" };
  const msgs = [];
  if (/^\s*[{[]/.test(t)) { try { const j = JSON.parse(t); msgs.push(...(Array.isArray(j) ? j : [j])); } catch { return { error: "응답을 읽지 못했어요" }; } }
  else for (const line of t.split("\n")) { const m = /^data:\s*(.*)$/.exec(line); if (!m) continue; try { msgs.push(JSON.parse(m[1])); } catch { /* 다른 줄 */ } }
  const hit = msgs.find((m) => m && m.id === id); if (!hit) return { error: "응답을 읽지 못했어요" };
  if (hit.error) return { error: String(hit.error.message ?? "MCP 오류").slice(0, 300) };
  return { result: hit.result };
}
