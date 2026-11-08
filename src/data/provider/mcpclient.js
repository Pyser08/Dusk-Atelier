// MCP 클라이언트 (2.0.0): streamable-http. 서버마다 initialize → notifications/initialized → 호출. 세션 id를 헤더로 이어 붙인다.
import { rpcRequest, parseRpc, nextRpcId } from "../../engine/provider/mcp.js";
export function createMcpClient({ transport, timeoutMs = 20000 }) {
  const sessions = new Map();   // 서버 id → { sid }
  async function post(srv, body, sid, id) {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await transport.send({ url: srv.url, method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...srv.headers, ...(sid ? { "mcp-session-id": sid } : {}) }, body }, { signal: ac.signal });
      const got = res.headers?.get?.("mcp-session-id") ?? null;
      if (!res.ok && res.status !== 202) throw new Error(`MCP 서버 오류 (HTTP ${res.status})`);
      const text = await res.text(); return { text, sid: got, status: res.status };
    } finally { clearTimeout(to); }
  }
  async function open(srv) {
    const id = nextRpcId(), r = await post(srv, rpcRequest(id, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "dusk-atelier", version: "2" } }), "", id);
    const p = parseRpc(r.text, id); if (p.error) throw new Error(p.error);
    const s = { sid: r.sid ?? "" }; sessions.set(srv.id, s);
    try { await post(srv, { jsonrpc: "2.0", method: "notifications/initialized" }, s.sid, 0); } catch { /* 알림 실패는 무시 */ }
    return s;
  }
  async function rpc(srv, method, params) {
    let s = sessions.get(srv.id) ?? await open(srv);
    for (let tryN = 0; tryN < 2; tryN++) {
      const id = nextRpcId();
      try { const r = await post(srv, rpcRequest(id, method, params), s.sid, id); const p = parseRpc(r.text, id); if (p.error) throw new Error(p.error); return p.result; }
      catch (e) { if (tryN === 0) { sessions.delete(srv.id); s = await open(srv); continue; } throw e; }   // 세션이 끊겼으면 한 번 다시 연결
    }
  }
  return {
    async list(srv) { const r = await rpc(srv, "tools/list", {}); return Array.isArray(r?.tools) ? r.tools : []; },
    async call(srv, tool, args) {
      const r = await rpc(srv, "tools/call", { name: tool, arguments: args ?? {} });
      const text = (r?.content ?? []).map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n");
      if (r?.isError) throw new Error(text || "도구 오류"); return text;
    },
    forget(id) { sessions.delete(id); }
  };
}
