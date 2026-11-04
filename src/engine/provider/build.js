// 요청 만들기 (v1.9.3, 순수): 연결+프로필+메시지 → {url, method, headers, body}. 네트워크 없음.
import { kindOf, isReasoningModel } from "./catalog.js";
import { normalize, mergeSame, splitSystem, startWithUser } from "./messages.js";

const join = (base, path) => `${String(base || "").replace(/\/+$/, "")}${path}`;
const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null || o[k] === "" || (Array.isArray(o[k]) && !o[k].length)) delete o[k]; return o; };
const BLOCKED_BODY = new Set(["model", "messages", "contents", "system", "input", "stream"]);
const BLOCKED_HEADER = /^(authorization|proxy-authorization|x-api-key|x-goog-api-key|api-key|host|content-length|content-type|connection|transfer-encoding|accept-encoding|origin|referer|user-agent)$/i;
// 사용자 JSON(추가 본문·헤더)은 필수 항목을 못 덮어쓰게 걸러 낸다
export function safeExtra(params, headers) {
  const body = {}, hdr = {};
  for (const [k, v] of Object.entries(params ?? {})) if (!BLOCKED_BODY.has(k)) body[k] = v;
  for (const [k, v] of Object.entries(headers ?? {})) if (!BLOCKED_HEADER.test(k) && typeof v === "string") hdr[k] = v;
  return { body, headers: hdr };
}
const sampling = (p) => p.sampling ?? {};
const think = (p) => p.thinking ?? {};

function openaiMessages(msgs) {
  return msgs.map((m) => (m.images.length ? { role: m.role, content: [...(m.text ? [{ type: "text", text: m.text }] : []), ...m.images.map((im) => ({ type: "image_url", image_url: { url: `data:${im.mime};base64,${im.data}` } }))] } : { role: m.role, content: m.text }));
}
function buildOpenAI(conn, p, msgs, o) {
  const s = sampling(p), t = think(p), reasoning = isReasoningModel(p.model) && conn.kind === "openai", effort = t.effort && t.effort !== "default" ? t.effort : "";
  const body = { model: p.model, messages: openaiMessages(mergeSame(msgs, "\n\n")), stream: !!o.stream, stream_options: o.stream ? { include_usage: true } : undefined };
  if (!reasoning || effort === "none") { body.temperature = s.temperature; body.top_p = s.topP; body.frequency_penalty = s.frequencyPenalty; body.presence_penalty = s.presencePenalty; }
  body.seed = s.seed; body.stop = s.stop;
  if (s.maxTokens) body[reasoning ? "max_completion_tokens" : "max_tokens"] = s.maxTokens;
  if (effort) { if (conn.kind === "openrouter") body.reasoning = { effort }; else body.reasoning_effort = effort; }
  if (p.verbosity) body.verbosity = p.verbosity;
  if (p.tier && p.tier !== "auto") body.service_tier = p.tier;
  if (p.cache?.openai && p.cache.openai !== "off") body.prompt_cache_retention = p.cache.openai;
  if (p.search === "auto" && conn.kind === "openrouter") body.plugins = [{ id: "web" }];
  if (conn.kind === "openrouter" && conn.providerSlug) body.provider = { order: [conn.providerSlug] };
  if (o.tools?.length) body.tools = o.tools.map((x) => ({ type: "function", function: { name: x.name, description: x.description, parameters: x.parameters } }));
  if (o.extraMessages?.length) body.messages.push(...o.extraMessages);
  return { path: "/chat/completions", body };
}
function buildResponses(conn, p, msgs, o) {
  const s = sampling(p), t = think(p), { system, rest } = splitSystem(mergeSame(msgs));
  const body = { model: p.model, instructions: system.join("\n\n") || undefined, store: false, stream: !!o.stream,
    input: rest.map((m) => ({ role: m.role, content: [...(m.text ? [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.text }] : []), ...m.images.map((im) => ({ type: "input_image", image_url: `data:${im.mime};base64,${im.data}` }))] })) };
  if (s.maxTokens) body.max_output_tokens = s.maxTokens;
  if (!isReasoningModel(p.model)) { body.temperature = s.temperature; body.top_p = s.topP; }
  if (t.effort && t.effort !== "default") body.reasoning = { effort: t.effort, summary: "auto" };
  if (p.verbosity) body.text = { verbosity: p.verbosity };
  if (p.tier && p.tier !== "auto") body.service_tier = p.tier;
  if (p.cache?.openai && p.cache.openai !== "off") body.prompt_cache_retention = p.cache.openai;
  const inc = [];
  if (t.continuation && body.reasoning) inc.push("reasoning.encrypted_content");
  if (inc.length) body.include = inc;
  if (o.reasoningState?.length) body.input.unshift(...o.reasoningState);
  const tools = [];
  if (p.search === "auto") tools.push({ type: "web_search" });
  for (const x of o.tools ?? []) tools.push({ type: "function", name: x.name, description: x.description, parameters: x.parameters });
  if (tools.length) body.tools = tools;
  return { path: "/responses", body };
}
// Anthropic: 캐시 TTL·중단점. system의 마지막 블록과 최근 사용자 메시지에 cache_control
function buildAnthropicBody(p, msgs, o, { vertex = false } = {}) {
  const s = sampling(p), t = think(p), c = p.cache ?? {};
  const { system, rest } = splitSystem(mergeSame(msgs));
  const turns = startWithUser(rest);
  const cc = c.claude && c.claude !== "off" ? { type: "ephemeral", ...(c.claude === "1h" ? { ttl: "1h" } : {}) } : null;
  const messages = turns.map((m) => ({ role: m.role, content: [...m.images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mime, data: im.data } })), ...(m.text ? [{ type: "text", text: m.text }] : [])] }));
  if (cc) { // 중단점 최대 4개: system 1 + 사용자 메시지 끝에서부터 최대 3
    const users = messages.map((m, i) => (m.role === "user" ? i : -1)).filter((i) => i >= 0).slice(-Math.min(3, c.breakpoints ?? 2));
    for (const i of users) { const blocks = messages[i].content; if (blocks.length) blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: cc }; }
  }
  const sys = system.length ? system.map((x, i) => ({ type: "text", text: x, ...(cc && i === system.length - 1 ? { cache_control: cc } : {}) })) : undefined;
  const body = { ...(vertex ? { anthropic_version: "vertex-2023-10-16" } : { model: p.model }), max_tokens: s.maxTokens || 4096, system: sys, messages, stream: !!o.stream };
  const budget = t.mode === "budget" && t.budget >= 1024, adaptive = t.mode === "adaptive";
  if (budget) { body.thinking = { type: "enabled", budget_tokens: t.budget, ...(t.display ? { display: t.display } : {}) }; body.max_tokens = Math.max(body.max_tokens, t.budget + 1024); }
  else if (adaptive) { body.thinking = { type: "adaptive", ...(t.display ? { display: t.display } : {}) }; if (t.effort && t.effort !== "default") body.output_config = { effort: t.effort }; }
  else { body.temperature = s.temperature; body.top_p = s.topP; }
  if (!budget && !adaptive) body.top_k = s.topK;
  body.stop_sequences = s.stop;
  if (p.search === "auto" && !vertex) (body.tools = body.tools ?? []).push({ type: "web_search_20250305", name: "web_search", max_uses: 3 });
  for (const x of o.tools ?? []) (body.tools = body.tools ?? []).push({ name: x.name, description: x.description, input_schema: x.parameters });
  return body;
}
function buildAnthropic(conn, p, msgs, o) { return { path: "/messages", body: buildAnthropicBody(p, msgs, o) }; }

function geminiParts(m) { return [...(m.text ? [{ text: m.text }] : []), ...m.images.map((im) => ({ inlineData: { mimeType: im.mime, data: im.data } }))]; }
function buildGeminiBody(p, msgs, o) {
  const s = sampling(p), t = think(p);
  const { system, rest } = splitSystem(mergeSame(msgs));
  const contents = startWithUser(rest).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: geminiParts(m) }));
  const generationConfig = { temperature: s.temperature, topP: s.topP, topK: s.topK, maxOutputTokens: s.maxTokens, stopSequences: s.stop, seed: s.seed, frequencyPenalty: s.frequencyPenalty, presencePenalty: s.presencePenalty };
  const tc = {};
  if (t.level && t.level !== "off") tc.thinkingLevel = String(t.level).toUpperCase(); else if (Number.isFinite(t.budget) && t.budget !== null && t.budget !== "") tc.thinkingBudget = Number(t.budget);
  if (t.include || t.showThinking) tc.includeThoughts = true;
  if (Object.keys(tc).length) generationConfig.thinkingConfig = tc;
  const body = { contents, systemInstruction: system.length ? { parts: [{ text: system.join("\n\n") }] } : undefined, generationConfig: clean(generationConfig) };
  if (!Object.keys(body.generationConfig).length) delete body.generationConfig;
  if (p.safety) body.safetySettings = ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT", "HARM_CATEGORY_CIVIC_INTEGRITY"].map((category) => ({ category, threshold: p.safety }));
  const tools = [];
  if (p.search === "auto" && !o.tools?.length) tools.push({ googleSearch: {} });
  if (o.tools?.length) tools.push({ functionDeclarations: o.tools.map((x) => ({ name: x.name, description: x.description, parameters: x.parameters })) });
  if (tools.length) body.tools = tools;
  if (o.cachedContent) { body.cachedContent = o.cachedContent; delete body.systemInstruction; }
  if (p.tier && p.tier !== "auto") body.serviceTier = p.tier;
  return body;
}
function buildGemini(conn, p, msgs, o) {
  const model = encodeURIComponent(p.model).replace(/%2F/g, "/");
  return { path: `/models/${model}:${o.stream ? "streamGenerateContent?alt=sse" : "generateContent"}`, body: buildGeminiBody(p, msgs, o) };
}
export const vertexRoute = (conn, p) => (/^claude/i.test(p.model) || /anthropic/i.test(p.model) ? "claude" : "gemini");
function vertexBase(conn) {
  const loc = conn.vertex?.location || "global", proj = conn.vertex?.projectId;
  const host = loc === "global" ? "aiplatform.googleapis.com" : `${loc}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${proj}/locations/${loc}`;
}
function buildVertex(conn, p, msgs, o) {
  const model = String(p.model).replace(/^(google|anthropic)\//, "");
  if (vertexRoute(conn, p) === "claude") return { base: vertexBase(conn), path: `/publishers/anthropic/models/${model}:${o.stream ? "streamRawPredict" : "rawPredict"}`, body: buildAnthropicBody(p, msgs, o, { vertex: true }) };
  return { base: vertexBase(conn), path: `/publishers/google/models/${model}:${o.stream ? "streamGenerateContent?alt=sse" : "generateContent"}`, body: buildGeminiBody(p, msgs, o) };
}

/** 요청 만들기. cred = 인증 값(키 또는 Vertex 토큰). 반환 {url, method, headers, body, format} */
export function buildRequest({ conn, profile, messages, stream = false, cred = "", tools = [], reasoningState = [], cachedContent = "", extraMessages = [] }) {
  const k = kindOf(conn.kind), format = conn.format || k.format;
  const msgs = normalize(messages);
  const o = { stream, tools, reasoningState, cachedContent, extraMessages };
  const b = { openai: buildOpenAI, responses: buildResponses, anthropic: buildAnthropic, gemini: buildGemini, vertex: buildVertex }[format];
  if (!b) throw new Error(`지원하지 않는 요청 형식이에요: ${format}`);
  const r = b(conn, profile, msgs, o);
  const base = r.base ?? conn.baseUrl ?? k.baseUrl;
  if (!base) throw new Error("연결 주소가 비어 있어요");
  if (format === "vertex" && !conn.vertex?.projectId) throw new Error("Vertex 프로젝트 ID가 필요해요");
  const extra = safeExtra({ ...(conn.params ?? {}), ...(profile.params ?? {}) }, { ...(conn.headers ?? {}), ...(profile.headers ?? {}) });
  const body = { ...clean(r.body), ...extra.body };
  const headers = { "content-type": "application/json", ...extra.headers };
  if (format === "anthropic") { if (cred) headers["x-api-key"] = cred; headers["anthropic-version"] = "2023-06-01"; headers["anthropic-dangerous-direct-browser-access"] = "true"; }
  else if (format === "gemini") { if (cred) headers["x-goog-api-key"] = cred; }
  else if (cred) headers.authorization = `Bearer ${cred}`;
  if (stream) headers.accept = "text/event-stream";
  const fmt = format === "vertex" ? `vertex-${vertexRoute(conn, profile)}` : format;
  return { url: join(base, r.path), method: "POST", headers, body, format: fmt };
}
