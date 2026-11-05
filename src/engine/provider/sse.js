// 스트림 해독 (v1.9.3, 순수): SSE 줄 → 형식별 이벤트. 이벤트 {type:"text"|"thinking"|"usage"|"tool"|"finish"|"error", ...}
export function createSseParser() {
  let buf = "";
  return {
    push(chunk) {
      buf += String(chunk ?? "").replace(/\r\n?/g, "\n");
      const out = [];
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, i); buf = buf.slice(i + 2);
        let event = "", data = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
        }
        if (data.length) out.push({ event, data: data.join("\n") });
      }
      return out;
    },
    flush() { const rest = buf.trim(); buf = ""; if (!rest) return []; const data = rest.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).replace(/^ /, "")); return data.length ? [{ event: "", data: data.join("\n") }] : []; }
  };
}
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const usageOpenAI = (u) => u ? { input: num(u.prompt_tokens ?? u.input_tokens), output: num(u.completion_tokens ?? u.output_tokens), cached: num(u.prompt_tokens_details?.cached_tokens ?? u.input_tokens_details?.cached_tokens), reasoning: num(u.completion_tokens_details?.reasoning_tokens ?? u.output_tokens_details?.reasoning_tokens) } : null;
export const usageAnthropic = (u) => u ? { input: num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens), output: num(u.output_tokens), cached: num(u.cache_read_input_tokens), cacheWrite: num(u.cache_creation_input_tokens) } : null;
export const usageGemini = (u) => u ? { input: num(u.promptTokenCount), output: num(u.candidatesTokenCount) + num(u.thoughtsTokenCount), cached: num(u.cachedContentTokenCount), reasoning: num(u.thoughtsTokenCount) } : null;

// 스트림 디코더: 형식별로 data 한 건을 이벤트 배열로
export function createStreamDecoder(format) {
  const tools = new Map(); // 도구 호출 조각 모음
  const fmt = format === "responses" ? "responses" : format === "anthropic" ? "anthropic" : format === "gemini" || format === "vertex-gemini" ? "gemini" : format === "vertex-claude" ? "anthropic" : "openai";
  const parser = createSseParser();
  function one(ev) {
    const out = [];
    if (ev.data === "[DONE]") return [{ type: "finish", reason: "done" }];
    let j; try { j = JSON.parse(ev.data); } catch { return out; }
    if (j.error && fmt !== "responses") out.push({ type: "error", message: String(j.error.message ?? j.error.type ?? JSON.stringify(j.error)).slice(0, 400), code: j.error.code ?? j.error.status });
    if (fmt === "openai") {
      const ch = j.choices?.[0], d = ch?.delta;
      if (d?.content) out.push({ type: "text", text: typeof d.content === "string" ? d.content : (d.content ?? []).map((p) => p?.text ?? "").join("") });
      const th = d?.reasoning_content ?? d?.reasoning;
      if (typeof th === "string" && th) out.push({ type: "thinking", text: th });
      for (const t of d?.tool_calls ?? []) { const c = tools.get(t.index ?? 0) ?? { id: "", name: "", args: "" }; if (t.id) c.id = t.id; if (t.function?.name) c.name += t.function.name; if (t.function?.arguments) c.args += t.function.arguments; tools.set(t.index ?? 0, c); }
      if (j.usage) out.push({ type: "usage", usage: usageOpenAI(j.usage) });
      if (ch?.finish_reason) { out.push({ type: "finish", reason: ch.finish_reason }); if (tools.size) out.push({ type: "tool", calls: [...tools.values()] }); }
    } else if (fmt === "responses") {
      const t = j.type ?? ev.event;
      if (t === "response.output_text.delta" && j.delta) out.push({ type: "text", text: j.delta });
      else if ((t === "response.reasoning_summary_text.delta" || t === "response.reasoning_text.delta") && j.delta) out.push({ type: "thinking", text: j.delta });
      else if (t === "response.output_item.done" && j.item?.type === "function_call") out.push({ type: "tool", calls: [{ id: j.item.call_id, name: j.item.name, args: j.item.arguments ?? "" }] });
      else if (t === "response.output_item.done" && j.item?.type === "reasoning" && j.item.encrypted_content) out.push({ type: "reasoning-state", item: j.item });
      else if (t === "response.completed") { out.push({ type: "usage", usage: usageOpenAI(j.response?.usage) }); out.push({ type: "finish", reason: j.response?.status ?? "completed" }); }
      else if (t === "response.failed" || t === "error") out.push({ type: "error", message: String(j.response?.error?.message ?? j.error?.message ?? j.message ?? "응답 실패").slice(0, 400) });
      else if (t === "response.incomplete") out.push({ type: "finish", reason: j.response?.incomplete_details?.reason ?? "incomplete" });
    } else if (fmt === "anthropic") {
      const t = j.type;
      if (t === "message_start") out.push({ type: "usage", usage: usageAnthropic(j.message?.usage), partial: true });
      else if (t === "content_block_start" && j.content_block?.type === "tool_use") tools.set(j.index, { id: j.content_block.id, name: j.content_block.name, args: "" });
      else if (t === "content_block_delta") {
        const d = j.delta ?? {};
        if (d.type === "text_delta") out.push({ type: "text", text: d.text ?? "" });
        else if (d.type === "thinking_delta") out.push({ type: "thinking", text: d.thinking ?? "" });
        else if (d.type === "input_json_delta") { const c = tools.get(j.index); if (c) c.args += d.partial_json ?? ""; }
        else if (d.type === "signature_delta") out.push({ type: "signature", signature: d.signature });
      } else if (t === "message_delta") { if (j.usage) out.push({ type: "usage", usage: usageAnthropic(j.usage), partial: true }); if (j.delta?.stop_reason) { out.push({ type: "finish", reason: j.delta.stop_reason }); if (tools.size) out.push({ type: "tool", calls: [...tools.values()] }); } }
      else if (t === "error") out.push({ type: "error", message: String(j.error?.message ?? "오류").slice(0, 400), code: j.error?.type });
    } else {
      if (j.promptFeedback?.blockReason) out.push({ type: "error", message: `차단됨(${j.promptFeedback.blockReason})`, code: "blocked" });
      const c = j.candidates?.[0];
      for (const p of c?.content?.parts ?? []) {
        if (p.functionCall) out.push({ type: "tool", calls: [{ id: p.functionCall.name, name: p.functionCall.name, args: JSON.stringify(p.functionCall.args ?? {}) }] });
        else if (typeof p.text === "string" && p.text) out.push({ type: p.thought ? "thinking" : "text", text: p.text });
        if (p.thoughtSignature || p.thought_signature) out.push({ type: "signature", signature: p.thoughtSignature ?? p.thought_signature });
      }
      if (j.usageMetadata) out.push({ type: "usage", usage: usageGemini(j.usageMetadata), partial: true });
      if (c?.finishReason) out.push({ type: "finish", reason: c.finishReason });
    }
    return out;
  }
  return { push: (chunk) => parser.push(chunk).flatMap(one), flush: () => parser.flush().flatMap(one) };
}

// 비스트림 응답 → {text, thinking, usage, finish, blocked, toolCalls}
export function parseResponse(format, j) {
  const r = { text: "", thinking: "", usage: null, finish: "", blocked: "", toolCalls: [], reasoningState: [] };
  if (j?.error) { r.error = String(j.error.message ?? j.error.type ?? JSON.stringify(j.error)).slice(0, 400); return r; }
  if (format === "anthropic" || format === "vertex-claude") {
    for (const b of j?.content ?? []) { if (b.type === "text") r.text += b.text ?? ""; else if (b.type === "thinking") r.thinking += b.thinking ?? ""; else if (b.type === "tool_use") r.toolCalls.push({ id: b.id, name: b.name, args: JSON.stringify(b.input ?? {}) }); }
    r.usage = usageAnthropic(j?.usage); r.finish = j?.stop_reason ?? "";
  } else if (format === "gemini" || format === "vertex-gemini" || format === "vertex") {
    const c = j?.candidates?.[0];
    for (const p of c?.content?.parts ?? []) { if (p.functionCall) r.toolCalls.push({ id: p.functionCall.name, name: p.functionCall.name, args: JSON.stringify(p.functionCall.args ?? {}) }); else if (typeof p.text === "string") { if (p.thought) r.thinking += p.text; else r.text += p.text; } }
    r.usage = usageGemini(j?.usageMetadata); r.finish = c?.finishReason ?? ""; r.blocked = j?.promptFeedback?.blockReason ?? (c?.finishReason === "SAFETY" || c?.finishReason === "PROHIBITED_CONTENT" ? c.finishReason : "");
  } else if (format === "responses") {
    for (const it of j?.output ?? []) {
      if (it.type === "message") for (const p of it.content ?? []) { if (p.type === "output_text") r.text += p.text ?? ""; }
      else if (it.type === "reasoning") { for (const s of it.summary ?? []) r.thinking += s.text ?? ""; if (it.encrypted_content) r.reasoningState.push(it); }
      else if (it.type === "function_call") r.toolCalls.push({ id: it.call_id, name: it.name, args: it.arguments ?? "" });
    }
    r.usage = usageOpenAI(j?.usage); r.finish = j?.status ?? "";
  } else {
    const ch = j?.choices?.[0], m = ch?.message ?? {};
    r.text = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((p) => p?.text ?? "").join("") : (ch?.text ?? "");
    r.thinking = m.reasoning_content ?? m.reasoning ?? "";
    for (const t of m.tool_calls ?? []) r.toolCalls.push({ id: t.id, name: t.function?.name, args: t.function?.arguments ?? "" });
    r.usage = usageOpenAI(j?.usage); r.finish = ch?.finish_reason ?? "";
  }
  return r;
}
