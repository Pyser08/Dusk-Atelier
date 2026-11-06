// 10단계(2.0.0): MCP·스킬·훅
import test from "node:test";
import assert from "node:assert/strict";
import { rpcRequest, parseRpc, mcpToolDefs, isMcpWrite, normalizeMcpServer, mcpNameOf } from "../src/engine/provider/mcp.js";
import { skillBlock, normalizeSkill } from "../src/engine/provider/skills.js";
import { applyPre, applyPost, hasPost, normalizeHook } from "../src/engine/provider/hooks.js";
import { createMcpClient } from "../src/data/provider/mcpclient.js";
import { normalizeConfig } from "../src/engine/provider/profile.js";

test("MCP: JSON-RPC 요청·응답(JSON·SSE) 읽기", () => {
  assert.deepEqual(rpcRequest(3, "tools/list", {}), { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} });
  assert.deepEqual(parseRpc('{"jsonrpc":"2.0","id":3,"result":{"tools":[]}}', 3), { result: { tools: [] } });
  assert.deepEqual(parseRpc('event: message\ndata: {"jsonrpc":"2.0","method":"ping"}\n\nevent: message\ndata: {"jsonrpc":"2.0","id":3,"result":{"ok":1}}\n\n', 3), { result: { ok: 1 } });
  assert.match(parseRpc('{"jsonrpc":"2.0","id":3,"error":{"code":-1,"message":"nope"}}', 3).error, /nope/);
  assert.match(parseRpc("not json", 1).error, /읽지 못/);
});
test("MCP: 도구 이름·쓰기 판별·서버 정리", () => {
  const srv = normalizeMcpServer({ id: "s1", name: "메모", url: "https://x.test/mcp", tools: [{ name: "read.note", description: "d", inputSchema: { type: "object", properties: { q: { type: "string" } } }, annotations: { readOnlyHint: true } }, { name: "delete_note", inputSchema: { type: "object" } }, { name: "x y", inputSchema: null }] });
  assert.equal(srv.transport, "http"); assert.equal(srv.allowWrite, false);
  assert.equal(mcpNameOf("s1", "read.note"), "mcp_s1_read_note");
  const defs = mcpToolDefs([srv]); assert.deepEqual(defs.map((d) => d.name), ["mcp_s1_read_note"]);   // 쓰기·불명 도구는 기본 숨김
  assert.equal(defs[0].parameters.properties.q.type, "string"); assert.ok(defs[0].mcp);
  const open = mcpToolDefs([{ ...srv, allowWrite: true }]); assert.equal(open.length, 3); assert.equal(open.find((d) => d.mcp.tool === "delete_note").mcp.write, true);
  assert.equal(isMcpWrite({ annotations: { readOnlyHint: true } }), false); assert.equal(isMcpWrite({}), true);
  assert.equal(normalizeMcpServer({ id: "a", url: "javascript:alert(1)" }).url, "");
});
test("스킬: 모델 조건·토큰 상한", () => {
  const skills = [normalizeSkill({ id: "a", name: "말투", text: "존댓말을 써요", models: "" }), normalizeSkill({ id: "b", name: "클로드용", text: "x".repeat(4000), models: "claude", maxTokens: 100 }), normalizeSkill({ id: "c", name: "꺼짐", text: "no", enabled: false })];
  const g = skillBlock(skills, { model: "gpt-4o" }); assert.ok(g.includes("존댓말") && !g.includes("xxxx") && !g.includes("no"));
  const c = skillBlock(skills, { model: "claude-sonnet-4" }); assert.ok(c.includes("xxxx") && c.length < 900);
  assert.equal(skillBlock([], { model: "m" }), "");
});
test("훅: 모델별 앞·뒤 처리, 잘못된 정규식은 건너뜀", () => {
  const hooks = [normalizeHook({ id: "h1", name: "호칭", modelRegex: "gpt", pre: { find: "주인님", replace: "당신" } }), normalizeHook({ id: "h2", name: "꼬리", modelRegex: "", post: { find: "\\s*\\(끝\\)$", replace: "" } }), normalizeHook({ id: "h3", name: "깨짐", post: { find: "(", replace: "" } })];
  const msgs = [{ role: "user", content: "주인님 안녕" }];
  assert.equal(applyPre(msgs, hooks, "gpt-4o")[0].content, "당신 안녕"); assert.equal(applyPre(msgs, hooks, "claude-x")[0].content, "주인님 안녕");
  assert.equal(applyPost("안녕 (끝)", hooks, "claude-x"), "안녕"); assert.equal(hasPost(hooks, "claude-x"), true); assert.equal(hasPost([hooks[0]], "gpt-4o"), false);
});
test("MCP 클라이언트: 초기화 → 목록 → 호출(세션 헤더 유지)", async () => {
  const seen = [];
  const reply = (id, result, headers = {}) => ({ ok: true, status: 200, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, text: async () => JSON.stringify({ jsonrpc: "2.0", id, result }), json: async () => ({}) });
  const transport = { send: async (req) => { seen.push(req); const b = req.body; if (b.method === "initialize") return reply(b.id, { protocolVersion: "2025-03-26", capabilities: {} }, { "mcp-session-id": "S1" }); if (b.method === "notifications/initialized") return { ok: true, status: 202, headers: { get: () => null }, text: async () => "", json: async () => ({}) };
    if (b.method === "tools/list") return reply(b.id, { tools: [{ name: "echo", description: "e", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } }] });
    if (b.method === "tools/call") return reply(b.id, { content: [{ type: "text", text: `echo:${b.params.arguments.q}` }] }); } };
  const c = createMcpClient({ transport });
  const srv = normalizeMcpServer({ id: "s", url: "https://x.test/mcp", headers: { authorization: "Bearer T" } });
  const tools = await c.list(srv); assert.equal(tools[0].name, "echo"); assert.equal(seen[0].headers.authorization, "Bearer T"); assert.equal(seen[1].headers["mcp-session-id"], "S1");
  assert.equal(await c.call(srv, "echo", { q: "hi" }), "echo:hi");
});
test("설정 정리: mcp·skills·hooks 기본값", () => {
  const d = normalizeConfig({}); assert.deepEqual(d.mcp.servers, []); assert.deepEqual(d.skills, []); assert.deepEqual(d.hooks, []);
  const c = normalizeConfig({ skills: [{ id: "a", name: "x", text: "t" }], hooks: [{ id: "h", name: "n" }], mcp: { servers: [{ id: "s", url: "https://a.test/m" }] } });
  assert.equal(c.skills.length, 1); assert.equal(c.mcp.servers[0].transport, "http");
});
