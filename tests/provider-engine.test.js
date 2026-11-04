import test from "node:test";
import assert from "node:assert/strict";
import { buildRequest, safeExtra } from "../src/engine/provider/build.js";
import { createStreamDecoder, parseResponse, createSseParser } from "../src/engine/provider/sse.js";
import { detectRepetition, trimRepetition } from "../src/engine/provider/repeat.js";
import { createKeyPool } from "../src/engine/provider/keypool.js";
import { classifyFailure, planAfterFailure } from "../src/engine/provider/chain.js";
import { costOf, savedByCache, addRecord, summarize, budgetState } from "../src/engine/provider/cost.js";
import { normalizeConfig, normalizeConnection, normalizeProfile, resolve, chainOrder, defaultConfig, toPotPreset } from "../src/engine/provider/profile.js";
import { applyRules, anatomy, orderForCache, splitAtMarker } from "../src/engine/provider/transforms.js";
import { calculate, rollDice, safeFetchUrl, htmlToText, enabledTools, isWriteTool, parseArgs, searchRequest, parseSearch, describeWrite } from "../src/engine/provider/tools.js";
import { protect, restore, glossaryBlock, historyBlock, translationMessages, stripDelims } from "../src/engine/provider/translate.js";
import { purposeOfMode } from "../src/engine/provider/catalog.js";

const conn = (o = {}) => normalizeConnection({ id: "c", kind: "openai", ...o });
const prof = (o = {}) => normalizeProfile({ id: "p", connectionId: "c", model: "gpt-4o", ...o });
const msgs = [{ role: "system", content: "SYS" }, { role: "user", content: "hi" }, { role: "char", content: "yo" }, { role: "user", content: "again" }];

test("OpenAI: 기본 본문·키·스트림 옵션", () => {
  const r = buildRequest({ conn: conn(), profile: prof({ sampling: { temperature: 0.7, maxTokens: 100 } }), messages: msgs, stream: true, cred: "K" });
  assert.equal(r.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(r.headers.authorization, "Bearer K");
  assert.equal(r.body.stream, true); assert.deepEqual(r.body.stream_options, { include_usage: true });
  assert.equal(r.body.temperature, 0.7); assert.equal(r.body.max_tokens, 100);
  assert.deepEqual(r.body.messages.map((m) => m.role), ["system", "user", "assistant", "user"]);
});
test("OpenAI 추론 모델: max_completion_tokens, 샘플링 제외, effort", () => {
  const r = buildRequest({ conn: conn(), profile: prof({ model: "gpt-5", sampling: { temperature: 1, maxTokens: 50 }, thinking: { effort: "high" } }), messages: msgs });
  assert.equal(r.body.max_completion_tokens, 50); assert.equal(r.body.max_tokens, undefined); assert.equal(r.body.temperature, undefined); assert.equal(r.body.reasoning_effort, "high");
});
test("OpenRouter: reasoning 객체", () => {
  const r = buildRequest({ conn: conn({ kind: "openrouter" }), profile: prof({ thinking: { effort: "low" } }), messages: msgs });
  assert.deepEqual(r.body.reasoning, { effort: "low" }); assert.equal(r.body.reasoning_effort, undefined);
});
test("같은 역할 연속은 합친다", () => {
  const r = buildRequest({ conn: conn(), profile: prof(), messages: [{ role: "user", content: "a" }, { role: "user", content: "b" }] });
  assert.equal(r.body.messages.length, 1); assert.equal(r.body.messages[0].content, "a\n\nb");
});
test("Anthropic: system 분리·헤더·캐시 중단점·사고 예산", () => {
  const r = buildRequest({ conn: conn({ kind: "anthropic" }), profile: prof({ model: "claude-x", cache: { claude: "1h", breakpoints: 2 }, thinking: { mode: "budget", budget: 2000 }, sampling: { maxTokens: 500 } }), messages: msgs, cred: "K" });
  assert.equal(r.url, "https://api.anthropic.com/v1/messages"); assert.equal(r.headers["x-api-key"], "K"); assert.equal(r.headers["anthropic-version"], "2023-06-01");
  assert.equal(r.body.system[0].cache_control.ttl, "1h");
  assert.deepEqual(r.body.thinking, { type: "enabled", budget_tokens: 2000 }); assert.ok(r.body.max_tokens >= 3024); assert.equal(r.body.temperature, undefined);
  const marks = r.body.messages.flatMap((m) => m.content).filter((b) => b.cache_control).length; assert.ok(marks >= 1 && marks <= 3);
  assert.equal(r.body.messages[0].role, "user");
});
test("Anthropic: 어시스턴트로 시작하면 사용자 한 줄을 앞에 둔다", () => {
  const r = buildRequest({ conn: conn({ kind: "anthropic" }), profile: prof({ model: "c" }), messages: [{ role: "assistant", content: "first" }, { role: "user", content: "u" }] });
  assert.equal(r.body.messages[0].role, "user"); assert.equal(r.body.messages[1].role, "assistant");
});
test("Gemini: contents/systemInstruction/thinkingConfig/검색", () => {
  const r = buildRequest({ conn: conn({ kind: "google" }), profile: prof({ model: "gemini-2.5-pro", thinking: { level: "high", include: true }, search: "auto", safety: "BLOCK_NONE", sampling: { maxTokens: 99, topK: 40 } }), messages: msgs, stream: true, cred: "K" });
  assert.match(r.url, /models\/gemini-2\.5-pro:streamGenerateContent\?alt=sse$/); assert.equal(r.headers["x-goog-api-key"], "K");
  assert.equal(r.body.systemInstruction.parts[0].text, "SYS"); assert.deepEqual(r.body.contents.map((c) => c.role), ["user", "model", "user"]);
  assert.deepEqual(r.body.generationConfig.thinkingConfig, { thinkingLevel: "HIGH", includeThoughts: true }); assert.equal(r.body.generationConfig.maxOutputTokens, 99);
  assert.deepEqual(r.body.tools, [{ googleSearch: {} }]); assert.equal(r.body.safetySettings[0].threshold, "BLOCK_NONE");
});
test("Gemini 명시적 캐시: cachedContent 사용 시 systemInstruction 제거", () => {
  const r = buildRequest({ conn: conn({ kind: "google" }), profile: prof({ model: "gemini-2.5-flash" }), messages: msgs, cachedContent: "cachedContents/abc" });
  assert.equal(r.body.cachedContent, "cachedContents/abc"); assert.equal(r.body.systemInstruction, undefined);
});
test("Vertex: Gemini·Claude 경로와 프로젝트 검사", () => {
  const c = conn({ kind: "vertex", vertex: { projectId: "proj", location: "us-east5" } });
  const g = buildRequest({ conn: c, profile: prof({ model: "google/gemini-2.5-pro" }), messages: msgs, stream: true, cred: "TOK" });
  assert.equal(g.url, "https://us-east5-aiplatform.googleapis.com/v1/projects/proj/locations/us-east5/publishers/google/models/gemini-2.5-pro:streamGenerateContent?alt=sse"); assert.equal(g.headers.authorization, "Bearer TOK"); assert.equal(g.format, "vertex-gemini");
  const cl = buildRequest({ conn: { ...c, vertex: { projectId: "proj", location: "global" } }, profile: prof({ model: "claude-sonnet-4" }), messages: msgs });
  assert.match(cl.url, /^https:\/\/aiplatform\.googleapis\.com\/v1\/projects\/proj\/locations\/global\/publishers\/anthropic\/models\/claude-sonnet-4:rawPredict$/);
  assert.equal(cl.body.anthropic_version, "vertex-2023-10-16"); assert.equal(cl.body.model, undefined); assert.equal(cl.format, "vertex-claude");
  assert.throws(() => buildRequest({ conn: conn({ kind: "vertex" }), profile: prof(), messages: msgs }), /프로젝트/);
});
test("Responses: instructions·input·reasoning·include", () => {
  const r = buildRequest({ conn: conn({ format: "responses" }), profile: prof({ model: "gpt-5", thinking: { effort: "medium", continuation: true }, verbosity: "low", search: "auto" }), messages: msgs, stream: true });
  assert.equal(r.url, "https://api.openai.com/v1/responses"); assert.equal(r.body.instructions, "SYS"); assert.equal(r.body.store, false);
  assert.deepEqual(r.body.reasoning, { effort: "medium", summary: "auto" }); assert.deepEqual(r.body.include, ["reasoning.encrypted_content"]); assert.deepEqual(r.body.text, { verbosity: "low" });
  assert.deepEqual(r.body.tools, [{ type: "web_search" }]); assert.equal(r.body.input[1].content[0].type, "output_text");
});
test("추가 JSON은 필수 항목·인증 헤더를 못 덮어쓴다", () => {
  const x = safeExtra({ model: "evil", messages: [], top_p: 0.5, stream: false }, { authorization: "x", "x-api-key": "y", "x-tag": "ok" });
  assert.deepEqual(x.body, { top_p: 0.5 }); assert.deepEqual(x.headers, { "x-tag": "ok" });
  const r = buildRequest({ conn: conn({ params: { seed: 3 }, headers: { "x-a": "1" } }), profile: prof({ params: { model: "evil" } }), messages: msgs, cred: "K" });
  assert.equal(r.body.model, "gpt-4o"); assert.equal(r.body.seed, 3); assert.equal(r.headers["x-a"], "1"); assert.equal(r.headers.authorization, "Bearer K");
});
test("이미지 첨부는 형식별로 변환", () => {
  const m = [{ role: "user", content: "see", multimodals: [{ type: "image", base64: "data:image/png;base64,AAA" }] }];
  assert.equal(buildRequest({ conn: conn(), profile: prof(), messages: m }).body.messages[0].content[1].image_url.url, "data:image/png;base64,AAA");
  assert.equal(buildRequest({ conn: conn({ kind: "anthropic" }), profile: prof(), messages: m }).body.messages[0].content[0].source.data, "AAA");
  assert.equal(buildRequest({ conn: conn({ kind: "google" }), profile: prof(), messages: m }).body.contents[0].parts[1].inlineData.mimeType, "image/png");
});

const feed = (fmt, chunks) => { const d = createStreamDecoder(fmt); return chunks.flatMap((c) => d.push(c)).concat(d.flush()); };
test("SSE: 청크 경계가 중간에서 끊겨도 해독", () => {
  const p = createSseParser(); const a = p.push('data: {"a":'); const b = p.push('1}\n\ndata: [DONE]\n\n');
  assert.equal(a.length, 0); assert.deepEqual(b.map((e) => e.data), ['{"a":1}', "[DONE]"]);
});
test("OpenAI 스트림: 글·사고·사용량·종료", () => {
  const ev = feed("openai", ['data: {"choices":[{"delta":{"reasoning_content":"t"}}]}\n\ndata: {"choices":[{"delta":{"content":"He"}}]}\n\n', 'data: {"choices":[{"delta":{"content":"llo"},"finish_reason":"stop"}]}\n\ndata: {"usage":{"prompt_tokens":10,"completion_tokens":5,"prompt_tokens_details":{"cached_tokens":4}}}\n\ndata: [DONE]\n\n']);
  assert.equal(ev.filter((e) => e.type === "text").map((e) => e.text).join(""), "Hello"); assert.equal(ev.find((e) => e.type === "thinking").text, "t");
  assert.deepEqual(ev.find((e) => e.type === "usage").usage, { input: 10, output: 5, cached: 4, reasoning: 0 }); assert.ok(ev.some((e) => e.type === "finish"));
});
test("OpenAI 스트림: 도구 호출 조각 모으기", () => {
  const ev = feed("openai", ['data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"calculate","arguments":"{\\"expr"}}]}}]}\n\n', 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"ession\\":\\"1+1\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n']);
  const t = ev.find((e) => e.type === "tool"); assert.equal(t.calls[0].name, "calculate"); assert.equal(t.calls[0].args, '{"expression":"1+1"}');
});
test("Anthropic 스트림: 글·사고·사용량", () => {
  const ev = feed("anthropic", ['event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":7,"cache_read_input_tokens":3}}}\n\n', 'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"hm"}}\n\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"ok"}}\n\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":9}}\n\n']);
  assert.equal(ev.find((e) => e.type === "text").text, "ok"); assert.equal(ev.find((e) => e.type === "thinking").text, "hm");
  assert.equal(ev.find((e) => e.type === "usage").usage.cached, 3); assert.equal(ev.find((e) => e.type === "finish").reason, "end_turn");
});
test("Gemini 스트림: 사고 구분·차단·사용량", () => {
  const ev = feed("gemini", ['data: {"candidates":[{"content":{"parts":[{"text":"th","thought":true},{"text":"ans"}]}}]}\n\n', 'data: {"candidates":[{"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2,"thoughtsTokenCount":1}}\n\n']);
  assert.equal(ev.find((e) => e.type === "thinking").text, "th"); assert.equal(ev.find((e) => e.type === "text").text, "ans");
  assert.equal(ev.find((e) => e.type === "usage").usage.output, 3);
  assert.equal(feed("gemini", ['data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n']).find((e) => e.type === "error").code, "blocked");
});
test("Responses 스트림: 글·사고·완료", () => {
  const ev = feed("responses", ['event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"A"}\n\n', 'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":3,"output_tokens":4}}}\n\n']);
  assert.equal(ev.find((e) => e.type === "text").text, "A"); assert.equal(ev.find((e) => e.type === "usage").usage.output, 4);
});
test("비스트림 응답 해석: 형식별", () => {
  assert.equal(parseResponse("openai", { choices: [{ message: { content: "x" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 2 } }).text, "x");
  assert.equal(parseResponse("anthropic", { content: [{ type: "thinking", thinking: "t" }, { type: "text", text: "y" }], usage: { input_tokens: 1, output_tokens: 1 } }).thinking, "t");
  assert.equal(parseResponse("gemini", { candidates: [{ content: { parts: [{ text: "z" }] }, finishReason: "SAFETY" }] }).blocked, "SAFETY");
  assert.equal(parseResponse("responses", { output: [{ type: "message", content: [{ type: "output_text", text: "r" }] }] }).text, "r");
  assert.match(parseResponse("openai", { error: { message: "bad" } }).error, /bad/);
});

test("반복 감지: 같은 글자·같은 덩어리·정상 글은 통과", () => {
  assert.equal(detectRepetition("가".repeat(300)).kind, "char");
  const pat = "그는 말했다. ".repeat(60); const h = detectRepetition("앞 이야기 " + pat); assert.equal(h.kind, "pattern");
  assert.equal(detectRepetition("서로 다른 문장들이 이어지는 평범한 글입니다. ".repeat(1) + "끝."), null);
  const varied = Array.from({ length: 80 }, (_, i) => `문장 ${i}번은 내용이 다르다.`).join(" "); assert.equal(detectRepetition(varied), null);
  const t = trimRepetition("앞" + "ab".repeat(300), detectRepetition("앞" + "ab".repeat(300))); assert.ok(t.length < 20);
});
test("키 풀: 쉬는 키 제외·순환·어피니티", () => {
  let t = 0; const pool = createKeyPool(["a", "b", "c"], { mode: "rotate", now: () => t });
  assert.deepEqual([pool.pick(), pool.pick(), pool.pick(), pool.pick()], ["a", "b", "c", "a"]);
  pool.fail("b", { ms: 100 }); assert.ok(!["b"].includes(pool.pick()) && pool.ready() === 2); t = 200; assert.equal(pool.ready(), 3);
  const aff = createKeyPool(["x", "y"], { mode: "affinity", rand: () => 0.99 }); const k = aff.pick("chat1"); assert.equal(aff.pick("chat1"), k);
  const one = createKeyPool(["k"]); one.fail("k"); assert.equal(one.pick(), null); assert.ok(one.nextReadyIn() > 0);
});
test("실패 분류와 다음 행동", () => {
  assert.equal(classifyFailure({ status: 429 }), "rate"); assert.equal(classifyFailure({ status: 401 }), "auth"); assert.equal(classifyFailure({ status: 503 }), "server");
  assert.equal(classifyFailure({ message: "Content blocked by SAFETY" }), "blocked"); assert.equal(classifyFailure({ empty: true }), "empty"); assert.equal(classifyFailure({ aborted: true }), "abort");
  assert.equal(planAfterFailure("rate", { keysLeft: 1, chainLeft: 1 }), "switch-key");
  assert.equal(planAfterFailure("rate", { keysLeft: 0, chainLeft: 1 }), "next-target");
  assert.equal(planAfterFailure("server", { retriesLeft: 2 }), "retry");
  assert.equal(planAfterFailure("blocked", { chainLeft: 1 }), "next-target");
  assert.equal(planAfterFailure("blocked", { chainLeft: 1, chainOn: false }), "fail");
  assert.equal(planAfterFailure("abort", { retriesLeft: 5, chainLeft: 5 }), "stop");
  assert.equal(planAfterFailure("client", { retriesLeft: 5, chainLeft: 5 }), "fail");
});
test("비용·캐시 절감·예산", () => {
  const pr = { input: 3, output: 15, cached: 0.3, cwrite: 3.75 }; const u = { input: 1000000, cached: 400000, output: 100000 };
  assert.equal(costOf(u, pr).toFixed(3), (600000 * 3 / 1e6 + 400000 * 0.3 / 1e6 + 100000 * 15 / 1e6).toFixed(3)); assert.equal(savedByCache(u, pr).toFixed(3), (400000 * 2.7 / 1e6).toFixed(3));
  const now = Date.parse("2026-11-04T12:00:00Z"); let log = []; log = addRecord(log, { usage: u, cost: 4, purpose: "main", at: now }, { now }); log = addRecord(log, { usage: u, cost: 3, purpose: "memory", at: now }, { now });
  const sum = summarize(log, { now }); assert.equal(sum.total.today, 7); assert.equal(sum.groups.main.cost, 4);
  assert.equal(budgetState(sum, { dailyUsd: 8 }).state, "warn"); assert.equal(budgetState(sum, { dailyUsd: 7 }).state, "over"); assert.equal(budgetState(sum, { dailyUsd: 100 }).state, "ok");
  const old = addRecord(log, { usage: u, cost: 1, at: now - 200 * 864e5 }, { now }); assert.equal(old.length, 2); // 90일 넘은 기록은 버린다
});
test("설정 정리·상속·사슬·perChar", () => {
  const raw = { connections: [{ id: "c1", kind: "anthropic" }, { id: "c2", kind: "openai" }], profiles: [{ id: "p1", connectionId: "c1", model: "claude-x", sampling: { temperature: 1 }, stream: "" }, { id: "p2", connectionId: "c2", model: "gpt-4o" }, { id: "bad", connectionId: "nope", model: "m" }],
    purposes: { main: { profileId: "p1", over: { sampling: { temperature: 0.2 }, stream: "off" } }, translate: { profileId: "p2", over: { stream: "buffered", junk: 1 } } }, chain: ["p2", "zzz"], chainOn: true, perChar: { cha1: { profileId: "p2" } } };
  const cfg = normalizeConfig(raw); assert.equal(cfg.profiles.length, 2); assert.deepEqual(cfg.chain, ["p2"]); assert.equal(cfg.purposes.translate.over.junk, undefined);
  const main = resolve(cfg, "main"); assert.equal(main.profile.sampling.temperature, 0.2); assert.equal(main.profile.stream, "off"); assert.equal(main.conn.kind, "anthropic");
  assert.equal(resolve(cfg, "emotion").profileId, "p1"); // 용도 미지정 → 메인
  assert.equal(resolve(cfg, "main", { chaId: "cha1" }).profileId, "p2"); assert.equal(resolve(cfg, "translate").profile.stream, "buffered");
  assert.deepEqual(chainOrder(cfg, "p1"), ["p1", "p2"]); assert.deepEqual(chainOrder({ ...cfg, chainOn: false }, "p1"), ["p1"]);
  assert.equal(normalizeConfig(null).profiles.length, 0); assert.equal(normalizeConfig({ profiles: [{ connectionId: "x" }] }).profiles.length, 0);
  assert.equal(toPotPreset(cfg.connections[0], cfg.profiles[0]).provider, "claude");
});
test("주입 규칙·캐시 정렬·해부·마커", () => {
  const base = [{ role: "system", content: "S1" }, { role: "user", content: "u" }];
  const out = applyRules(base, [{ enabled: true, text: "RULE", role: "system", position: "end", purposes: ["main"], modelRegex: "gpt", charRegex: "" }, { enabled: true, text: "NO", role: "system", position: "start", purposes: ["translate"], modelRegex: "", charRegex: "" }], { purpose: "main", model: "gpt-4o" });
  assert.deepEqual(out.map((m) => m.content), ["S1", "u", "RULE"]);
  const a1 = anatomy([{ role: "system", content: "A" }, { role: "system", content: "B" }, { role: "user", content: "x" }]); const a2 = anatomy([{ role: "system", content: "A" }, { role: "user", content: "x" }, { role: "system", content: "B" }, { role: "user", content: "y" }], a1);
  assert.equal(a2.sameBlocks, 1); assert.ok(a2.changed.length >= 1);
  const ordered = orderForCache([{ role: "system", content: "A" }, { role: "user", content: "x" }, { role: "system", content: "B" }, { role: "user", content: "y" }], a1);
  assert.deepEqual(ordered.map((m) => m.content), ["A", "B", "x", "y"]);
  assert.equal(orderForCache(base, null), base);
  const sp = splitAtMarker([{ role: "system", content: "stable {{cache_marker}}" }, { role: "user", content: "v" }], "{{cache_marker}}"); assert.equal(sp.prefix[0].content, "stable"); assert.equal(sp.tail.length, 1); assert.equal(splitAtMarker(base, "{{m}}"), null);
});
test("도구: 계산(안전)·주사위·주소 검사", () => {
  assert.equal(calculate("2+3*4"), 14); assert.equal(calculate("(2+3)*4"), 20); assert.equal(calculate("2**3**2"), 512); assert.equal(calculate("sqrt(16)+max(1,5)"), 9); assert.equal(calculate("-3+5"), 2);
  for (const bad of ["process.exit()", "1+", "alert(1)", "1/0", "a+1", ""]) assert.throws(() => calculate(bad), undefined, bad);
  let i = 0; const seq = [0, 0.5, 0.99]; const r = rollDice("3d6+2", () => seq[i++]); assert.deepEqual(r.rolls, [1, 4, 6]); assert.equal(r.total, 13);
  assert.throws(() => rollDice("abc")); assert.throws(() => rollDice("1000d6"));
  assert.equal(safeFetchUrl("https://example.com/a").ok, true);
  for (const u of ["http://localhost/x", "http://127.0.0.1", "http://192.168.0.1", "http://10.0.0.5", "http://172.20.1.1", "http://169.254.169.254/latest", "ftp://x.com", "javascript:alert(1)", "http://[::1]/"]) assert.equal(safeFetchUrl(u).ok, false, u);
  assert.equal(htmlToText("<script>x</script><p>a &amp; b</p><div>c</div>"), "a & b\nc");
});
test("도구: 켜진 것만·쓰기 도구는 별도 스위치", () => {
  const base = { enabled: true, datetime: true, calculator: true, dice: false };
  assert.deepEqual(enabledTools(base).map((d) => d.name), ["get_current_datetime", "calculate"]);
  assert.equal(enabledTools({ ...base, enabled: false }).length, 0);
  assert.ok(!enabledTools({ ...base, risuRead: true }).some((d) => isWriteTool(d.name)));
  assert.equal(enabledTools({ ...base, risuWrite: true }).filter((d) => isWriteTool(d.name)).length, 3);
  assert.deepEqual(parseArgs("{bad"), {}); assert.match(describeWrite("risu_set_chat_note", { value: "x".repeat(300) }), /…$/);
  assert.match(searchRequest({ provider: "brave", key: "K" }, "a b").url, /q=a%20b/); assert.throws(() => searchRequest({ provider: "none" }, "q"));
  assert.equal(parseSearch({ web: { results: [{ title: "T", url: "u", description: "<b>d</b>" }] } })[0].snippet, "d");
});
test("번역 보조: 마크업 보호 복원·누락 보고·용어집/기록 크기", () => {
  const src = "안녕 {{user}} ![img](a.png) `code` <b>굵게</b> https://x.com/a"; const p = protect(src);
  assert.ok(!p.text.includes("{{user}}") && !p.text.includes("https://")); assert.equal(restore(p.text, p.map).text, src);
  const lost = restore("번역됨 ⟦0⟧", p.map); assert.ok(lost.missing.length > 0);
  const g = glossaryBlock([{ key: "A", value: "에이" }, { key: "B", value: "비" }], 18); assert.match(g, /A = 에이/); assert.ok(!g.includes("B = 비"));
  const h = historyBlock([{ source: "1", target: "일" }, { source: "2", target: "이" }, { source: "3", target: "삼" }], 2, 4096); assert.ok(h.includes("<source>3") && h.includes("<source>2") && !h.includes("<source>1"));
  assert.equal(stripDelims("[[x]] hi", ["[["]), "x]] hi");
  const m = translationMessages({ text: "hi {{user}}", lang: "Korean", glossary: "<glossary>\nA = a\n</glossary>" }); assert.equal(m.messages[0].role, "system"); assert.ok(m.messages[0].content.includes("<glossary>")); assert.ok(m.map.length >= 1);
});
test("리스 mode → 용도", () => { assert.equal(purposeOfMode("model"), "main"); assert.equal(purposeOfMode("submodel"), "other"); assert.equal(purposeOfMode("memory"), "memory"); assert.equal(purposeOfMode("???"), "main"); });

import { presetsFor, isOn, apply, PRESETS } from "../src/engine/provider/presets.js";
test("빠른 설정: 켜고 끄면 값이 들어갔다 빠지고, 같은 묶음은 하나만 켜진다", () => {
  const base = { tier: "", params: {}, headers: {} }, f = PRESETS.find((p) => p.id === "or-fallback"), nf = PRESETS.find((p) => p.id === "or-nofallback");
  let p = apply(base, f, true); assert.equal(isOn(p, f), true); assert.equal(p.params.provider.allow_fallbacks, true);
  p = apply(p, nf, true); assert.equal(isOn(p, f), false); assert.equal(isOn(p, nf), true);
  p = apply(p, nf, false); assert.deepEqual(p.params, {});
  const fx = PRESETS.find((x) => x.id === "oa-flex"); assert.equal(apply(base, fx, true).tier, "flex"); assert.equal(apply(apply(base, fx, true), fx, false).tier, "");
  const a = PRESETS.find((x) => x.id === "an-1m"), b = PRESETS.find((x) => x.id === "an-interleave");
  p = apply(apply(base, a, true), b, true); assert.equal(isOn(p, a) && isOn(p, b), true); assert.match(p.headers["anthropic-beta"], /context-1m.*interleaved|interleaved.*context-1m/);
  p = apply(p, a, false); assert.equal(p.headers["anthropic-beta"], "interleaved-thinking-2025-05-14");
  assert.ok(presetsFor("vertex").some((x) => x.id === "vx-flex")); assert.ok(!presetsFor("anthropic").some((x) => x.id === "vx-flex"));
});

test("생각 강도(none·low·medium·high·xhigh)가 형식마다 맞게 들어간다", () => {
  const msgs = [{ role: "user", content: "hi" }], mk = (kind, format, model, effort, extra = {}) => buildRequest({ conn: { id: "c", kind, format, baseUrl: kind === "vertex" ? "" : undefined, vertex: { projectId: "p", location: "global" }, keyIds: [], params: {}, headers: {} }, profile: { model, sampling: {}, thinking: { mode: "", effort, ...extra }, cache: {}, params: {}, headers: {} }, messages: msgs, cred: "k" }).body;
  assert.equal(mk("openai", "openai", "gpt-5.5", "xhigh").reasoning_effort, "xhigh");
  assert.equal(mk("openai", "openai", "gpt-5.5", "none").reasoning_effort, "none");
  const a = mk("anthropic", "anthropic", "claude-x", "high"); assert.equal(a.thinking.type, "adaptive"); assert.equal(a.output_config.effort, "high");
  assert.equal(mk("anthropic", "anthropic", "claude-x", "none").thinking, undefined);
  assert.equal(mk("anthropic", "anthropic", "claude-x", "none", { mode: "budget", budget: 4000 }).thinking, undefined);
  assert.equal(mk("anthropic", "anthropic", "claude-x", "").thinking, undefined);
  assert.equal(mk("google", "gemini", "gemini-2.5-pro", "none").generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(mk("google", "gemini", "gemini-3-pro", "none").generationConfig.thinkingConfig.thinkingLevel, "MINIMAL");
  assert.equal(mk("google", "gemini", "gemini-3-pro", "xhigh").generationConfig.thinkingConfig.thinkingLevel, "HIGH");
  assert.equal(mk("google", "gemini", "gemini-3-pro", "medium").generationConfig.thinkingConfig.thinkingLevel, "MEDIUM");
});
