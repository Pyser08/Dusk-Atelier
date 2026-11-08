import test from "node:test";
import assert from "node:assert/strict";
import { createProviderStore } from "../src/data/provider/store.js";
import { createKeyVault } from "../src/data/provider/keyvault.js";
import { createProviderRunner, parseToolCalls, stripToolCalls } from "../src/data/provider/runner.js";
import { createToolExec, prefetchSearch } from "../src/data/provider/toolexec.js";
import { createRisuTools } from "../src/data/provider/risutools.js";
import { createGeminiCache } from "../src/data/provider/gemcache.js";
import { createRegistrar, providerName } from "../src/data/provider/register.js";
import { listModels, parseModels } from "../src/data/provider/models.js";
import { normalizeConfig } from "../src/engine/provider/profile.js";

const enc = new TextEncoder();
const oa = (t) => `data: {"choices":[{"delta":{"content":${JSON.stringify(t)}}}]}\n\n`;
const oaEnd = (u = '{"prompt_tokens":10,"completion_tokens":5}') => `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: {"usage":${u}}\n\ndata: [DONE]\n\n`;
const sseRes = (chunks, { failAfter = false } = {}) => ({ ok: true, status: 200, text: async () => "", json: async () => { throw new Error("no"); }, body: { getReader() { let i = 0; return { read: async () => { if (i < chunks.length) return { done: false, value: enc.encode(chunks[i++]) }; if (failAfter) throw new Error("연결 끊김"); return { done: true }; } }; } } });
const errRes = (status, msg) => ({ ok: false, status, text: async () => JSON.stringify({ error: { message: msg } }), json: async () => ({ error: { message: msg } }), body: null });
const jsonRes = (j) => ({ ok: true, status: 200, text: async () => JSON.stringify(j), json: async () => j, body: null });
async function collect(rs) { const r = rs.getReader(); let out = ""; for (;;) { const { done, value } = await r.read(); if (done) return out; out += value; } }

function harness({ cfgOver = {}, keys = { k1: "sk-key-one-1111", k2: "sk-key-two-2222" }, script = [] } = {}) {
  const mem = new Map(), api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } } };
  const store = createProviderStore(api);
  const vault = { values: async (ids) => ids.map((i) => keys[i]).filter(Boolean), has: async (i) => !!keys[i] };
  const calls = []; let n = 0;
  const transport = { send: async (req, opt) => { calls.push({ req, opt }); const s = script[Math.min(n++, script.length - 1)]; if (typeof s === "function") return s(req, opt); if (s instanceof Error) throw s; return s; } };
  const notes = []; const sleeps = [];
  const base = { enabled: true, connections: [{ id: "c1", kind: "openai", keyIds: ["k1", "k2"], keyMode: "rotate" }, { id: "c2", kind: "anthropic", keyIds: ["k2"] }],
    profiles: [{ id: "p1", connectionId: "c1", model: "gpt-4o", retry: 2 }, { id: "p2", connectionId: "c2", model: "claude-x" }], purposes: { main: { profileId: "p1" } }, ...cfgOver };
  const ready = store.save(base);
  const runner = createProviderRunner({ api, store, vault, transport, notify: (t) => notes.push(t), sleep: async (ms) => { sleeps.push(ms); }, ...(harness.extra ?? {}) });
  return { api, store, runner, calls, notes, sleeps, ready, mem };
}
const req = (o = {}) => ({ mode: "model", prompt_chat: [{ role: "system", content: "S" }, { role: "user", content: "hi" }], ...o });

test("메인 대화: 스트림으로 이어 주고 사용량을 기록한다", async () => {
  const h = harness({ script: [sseRes([oa("안"), oa("녕"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req()); assert.equal(r.success, true); assert.equal(typeof r.content.getReader, "function");
  assert.equal(await collect(r.content), "안녕");
  assert.equal(h.calls[0].req.headers.authorization, "Bearer sk-key-one-1111"); assert.equal(h.calls[0].req.body.stream, true);
  await new Promise((r) => setTimeout(r, 5)); const u = await h.store.usage(); assert.equal(u.length, 1); assert.equal(u[0].input, 10); assert.equal(u[0].purpose, "main");
});
test("번역 같은 보조 요청은 문자열로 돌려준다(스트림 아님)", async () => {
  const h = harness({ script: [sseRes([oa("번"), oa("역"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req({ mode: "translate" })); assert.equal(r.content, "번역");
});
test("429면 다른 키로 바꿔 다시 보낸다", async () => {
  const h = harness({ script: [errRes(429, "rate limit"), sseRes([oa("ok"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req({ mode: "translate" })); assert.equal(r.content, "ok");
  assert.equal(h.calls.length, 2); assert.notEqual(h.calls[0].req.headers.authorization, h.calls[1].req.headers.authorization);
});
test("서버 오류는 기다렸다 같은 대상에 재시도한다", async () => {
  const h = harness({ keys: { k1: "sk-only-key-1111" }, cfgOver: { connections: [{ id: "c1", kind: "openai", keyIds: ["k1"] }], profiles: [{ id: "p1", connectionId: "c1", model: "m", retry: 2 }] }, script: [errRes(503, "busy"), errRes(503, "busy"), sseRes([oa("fine"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req({ mode: "other" })); assert.equal(r.content, "fine"); assert.equal(h.calls.length, 3); assert.equal(h.sleeps.length, 2); assert.ok(h.sleeps[1] > h.sleeps[0]);
});
test("차단되면 사슬이 켜졌을 때만 다음 프로필로 넘어간다", async () => {
  const blocked = errRes(400, "Content blocked by safety filter"); const ok = jsonRes({ content: [{ type: "text", text: "claude says" }], usage: { input_tokens: 1, output_tokens: 1 } });
  const on = harness({ cfgOver: { chainOn: true, chain: ["p2"] }, script: [blocked, (r) => (r.url.includes("anthropic") ? ok : blocked)] }); await on.ready;
  const r1 = await on.runner.handle(req({ mode: "other" })); assert.equal(r1.content, "claude says"); assert.ok(on.notes.some((t) => /다음 프로필/.test(t)));
  const off = harness({ script: [blocked] }); await off.ready; const r2 = await off.runner.handle(req({ mode: "other" })); assert.equal(r2.success, false); assert.match(r2.content, /safety/i);
});
test("키가 없으면 설정 안내로 실패한다(재시도·대체 없음)", async () => {
  const h = harness({ keys: {}, script: [errRes(500, "x")] }); await h.ready; const r = await h.runner.handle(req({ mode: "other" }));
  assert.equal(r.success, false); assert.match(r.content, /API 키/); assert.equal(h.calls.length, 0);
});
test("키 값은 오류 메시지에 남지 않는다", async () => {
  const h = harness({ script: [errRes(400, "Invalid key sk-key-one-1111 provided")] }); await h.ready; const r = await h.runner.handle(req({ mode: "other" }));
  assert.ok(!r.content.includes("sk-key-one-1111")); assert.match(r.content, /\*\*\*/);
});
test("예산 초과: block이면 요청하지 않고, switch면 싼 프로필로", async () => {
  const day = new Date().toISOString().slice(0, 10);
  const mk = async (budget) => { const h = harness({ cfgOver: { budget }, script: [jsonRes({ content: [{ type: "text", text: "cheap" }], usage: {} }), sseRes([oa("x"), oaEnd()])] }); await h.ready; await h.store.addUsage({ cost: 5, usage: {}, purpose: "main" }); return h; };
  const b = await mk({ dailyUsd: 1, action: "block" }); const rb = await b.runner.handle(req({ mode: "other" })); assert.equal(rb.success, false); assert.match(rb.content, /예산/); assert.equal(b.calls.length, 0);
  const s = await mk({ dailyUsd: 1, action: "switch", switchProfileId: "p2" }); const rs = await s.runner.handle(req({ mode: "other" })); assert.equal(rs.content, "cheap"); assert.match(s.calls[0].req.url, /anthropic/); void day;
});
test("취소하면 빈 성공으로 끝난다", async () => {
  const ac = new AbortController(); const h = harness({ script: [(r, o) => { ac.abort(); throw new Error("x"); }] }); await h.ready;
  const r = await h.runner.handle(req({ mode: "other" }), ac.signal); assert.deepEqual(r, { success: true, content: "" });
});
test("한번에 받기에서 반복이 나오면 잘라 낸다", async () => {
  const rep = "그는 말했다. ".repeat(80);
  const h = harness({ cfgOver: { profiles: [{ id: "p1", connectionId: "c1", model: "m", stream: "buffered" }] }, script: [sseRes([oa("앞부분 "), oa(rep), oa(rep), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req()); assert.ok(r.content.length < 700, `길이 ${r.content.length}`); assert.ok(r.content.startsWith("앞부분"));
});
test("스트림 중간에 끊겨도 받은 만큼은 남긴다(keepPartial)", async () => {
  const h = harness({ script: [sseRes([oa("받은 글 "), oa("이어서 ")], { failAfter: true })] }); await h.ready;
  const r = await h.runner.handle(req()); assert.equal(await collect(r.content), "받은 글 이어서 "); assert.ok(h.notes.some((t) => /끊겨/.test(t)));
});
test("사고 과정 보이기: <Thoughts>로 감싸 앞에 붙인다", async () => {
  const th = (t) => `data: {"choices":[{"delta":{"reasoning_content":${JSON.stringify(t)}}}]}\n\n`;
  const h = harness({ cfgOver: { profiles: [{ id: "p1", connectionId: "c1", model: "m", thinking: { showThinking: true } }] }, script: [sseRes([th("생각중"), oa("답"), oaEnd()])] }); await h.ready;
  const out = await collect((await h.runner.handle(req())).content); assert.equal(out, "<Thoughts>\n생각중\n</Thoughts>\n\n답");
});
test("용도별 덮어쓰기·Risu 샘플링 승계·고정 프로필", async () => {
  const h = harness({ cfgOver: { purposes: { main: { profileId: "p1" }, translate: { profileId: "p1", over: { sampling: { temperature: 0.1 } } } } }, script: [sseRes([oa("a"), oaEnd()])] }); await h.ready;
  await h.runner.handle(req({ mode: "translate", temperature: 0.9, top_p: 0.8, max_tokens: 77 })); const b = h.calls[0].req.body;
  assert.equal(b.temperature, 0.1); assert.equal(b.top_p, 0.8); assert.equal(b.max_tokens, 77);
  const h2 = harness({ script: [jsonRes({ content: [{ type: "text", text: "A" }], usage: {} })] }); await h2.ready; const r = await h2.runner.handle(req({ mode: "other", __profile: "p2" })); assert.equal(r.content, "A");
});
test("도구 루프: 모델이 도구를 부르면 실행하고 결과로 이어 답한다", async () => {
  const exec = createToolExec({ api: {} });
  harness.extra = { toolExec: exec };
  const h = harness({ cfgOver: { tools: { enabled: true, calculator: true } }, script: [sseRes([oa('계산해 볼게요 <tool_call name="calculate">{"expression":"6*7"}</tool_call>'), oaEnd()]), sseRes([oa("답은 42예요"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req()); harness.extra = undefined;
  assert.equal(r.content, "답은 42예요"); assert.equal(h.calls.length, 2);
  assert.ok(JSON.stringify(h.calls[1].req.body.messages).includes("tool_result name=\\\"calculate\\\">42"));
  assert.ok(JSON.stringify(h.calls[0].req.body.messages).includes("도구 사용"));
  assert.deepEqual(parseToolCalls('x <tool_call name="a">{"b":1}</tool_call>'), [{ name: "a", args: { b: 1 } }]); assert.equal(stripToolCalls('x <tool_call name="a">{}</tool_call>'), "x");
});
test("꺼진 도구는 모델이 불러도 실행하지 않는다", async () => {
  harness.extra = { toolExec: async () => "실행됨" };
  const h = harness({ cfgOver: { tools: { enabled: true, calculator: true, dice: false } }, script: [sseRes([oa('<tool_call name="roll_dice">{"spec":"1d6"}</tool_call>'), oaEnd()]), sseRes([oa("끝"), oaEnd()])] }); await h.ready;
  await h.runner.handle(req()); harness.extra = undefined; assert.ok(JSON.stringify(h.calls[1].req.body.messages).includes("꺼져 있어요"));
});

// 쓰기 도구 안전장치
function writeHarness({ confirm, backupFails = false }) {
  let ch = { chaId: "cha1", name: "봇", desc: "원래 설명", globalLore: [{ comment: "a", key: "k", content: "원래" }], chats: [{ id: "t", note: "n", message: [{ role: "user", data: "hi" }] }] };
  const backups = [], writes = [];
  const api = { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => structuredClone(ch), setCharacterToIndex: async (i, c) => { writes.push(c); ch = c; }, getDatabase: async () => ({ personas: [] }) };
  const store = { addBackup: async (b) => { if (backupFails) throw new Error("x"); backups.push(b); return {}; } };
  return { tools: createRisuTools(api, { confirm, store }), backups, writes, get ch() { return ch; } };
}
test("쓰기 도구: 확인을 거절하면 아무것도 바뀌지 않는다", async () => {
  const w = writeHarness({ confirm: async () => false }); const out = await w.tools.run("risu_set_character_info", { field: "desc", value: "새 설명" });
  assert.match(out, /거절/); assert.equal(w.writes.length, 0); assert.equal(w.backups.length, 0); assert.equal(w.ch.desc, "원래 설명");
});
test("쓰기 도구: 확인 → 백업 → 반영 순서, 백업이 실패하면 반영하지 않는다", async () => {
  const order = []; const w = writeHarness({ confirm: async (t, d) => { order.push("confirm"); assert.match(d, /desc/); return true; } });
  const out = await w.tools.run("risu_set_character_info", { field: "desc", value: "새 설명" }); assert.match(out, /고쳤어요/);
  assert.equal(w.ch.desc, "새 설명"); assert.equal(w.backups.length, 1); assert.equal(w.backups[0].note, "AI 쓰기 도구 실행 전"); assert.deepEqual(order, ["confirm"]);
  const bad = writeHarness({ confirm: async () => true, backupFails: true }); const o2 = await bad.tools.run("risu_set_chat_note", { value: "x" });
  assert.match(o2, /백업/); assert.equal(bad.writes.length, 0);
});
test("쓰기 도구: 잘못된 칸·번호·횟수 초과를 막는다", async () => {
  const w = writeHarness({ confirm: async () => true });
  assert.match(await w.tools.run("risu_set_character_info", { field: "chaId", value: "x" }), /바꿀 수 없는/); assert.match(await w.tools.run("risu_set_lorebook_entry", { index: 9, content: "x" }), /없어요/);
  const counter = { n: 0 }; for (let i = 0; i < 3; i++) await w.tools.run("risu_set_chat_note", { value: String(i) }, counter);
  assert.match(await w.tools.run("risu_set_chat_note", { value: "4" }, counter), /횟수/); assert.equal(w.writes.length, 3);
  assert.equal(w.ch.chats[0].note, "2");
});
test("읽기 도구: 캐릭터·채팅·로어북", async () => {
  const w = writeHarness({ confirm: async () => false });
  assert.equal(JSON.parse(await w.tools.run("risu_get_character_info")).desc, "원래 설명"); assert.equal(JSON.parse(await w.tools.run("risu_get_chat_history", { limit: 5 }))[0].text, "hi");
  assert.equal(JSON.parse(await w.tools.run("risu_list_lorebooks"))[0].name, "a"); assert.equal(JSON.parse(await w.tools.run("risu_get_lorebook", { index: 0 })).content, "원래"); assert.match(await w.tools.run("nope"), /알 수 없는/);
});
test("선행 검색: 키워드가 맞을 때만 결과를 넣고 실패하면 그대로", async () => {
  const cfg = normalizeConfig({ tools: { enabled: true, prefetch: { enabled: true, keywords: "날씨", maxResults: 1, position: "beforeLast" } } }); const msgs = [{ role: "system", content: "S" }, { role: "user", content: "오늘 날씨 어때" }];
  const out = await prefetchSearch(async () => JSON.stringify([{ title: "T", url: "u", snippet: "맑음" }, { title: "T2", url: "u2", snippet: "x" }]), cfg, msgs); assert.equal(out.length, 3); assert.match(out[1].content, /맑음/); assert.ok(!out[1].content.includes("T2"));
  assert.equal((await prefetchSearch(async () => "[]", cfg, [{ role: "user", content: "무관한 말" }])).length, 1); assert.equal((await prefetchSearch(async () => { throw new Error("x"); }, cfg, msgs)).length, 2);
});
test("Gemini 명시적 캐시: 수동 마커로 만들고 다음엔 재사용", async () => {
  const gc = createGeminiCache(); const posts = []; const transport = { send: async (r) => { posts.push(r); return jsonRes({ name: "cachedContents/xyz" }); } };
  const conn = { id: "c", kind: "google", baseUrl: "https://g/v1beta" }, profile = { model: "gemini-2.5-flash", cache: { gemini: "manual", geminiTtl: 600, geminiMarker: "{{cache_marker}}" } };
  const big = "긴 설정 ".repeat(1500); const msgs = [{ role: "system", content: `${big} {{cache_marker}}` }, { role: "user", content: "질문" }];
  const a = await gc.prepare({ conn, profile, messages: msgs, cred: "K", transport }); assert.equal(a.cachedContent, "cachedContents/xyz"); assert.equal(a.messages.length, 1); assert.equal(posts.length, 1); assert.match(posts[0].url, /\/cachedContents$/);
  const b = await gc.prepare({ conn, profile, messages: msgs, cred: "K", transport }); assert.equal(b.cachedContent, "cachedContents/xyz"); assert.equal(posts.length, 1); assert.equal(gc.stats().reused, 1);
  const off = await gc.prepare({ conn, profile: { ...profile, cache: { gemini: "off" } }, messages: msgs, cred: "K", transport }); assert.equal(off.cachedContent, undefined);
  const fail = createGeminiCache(); const f = await fail.prepare({ conn, profile, messages: msgs, cred: "K", transport: { send: async () => errRes(500, "x") } }); assert.equal(f.cachedContent, undefined); assert.equal(f.messages.length, 2);
});
test("Gemini 명시적 캐시: 자동 모드는 같은 앞부분이 반복돼야 만든다", async () => {
  const gc = createGeminiCache(); const posts = []; const transport = { send: async (r) => { posts.push(r); return jsonRes({ name: "cachedContents/a" }); } };
  const conn = { id: "c", kind: "google", baseUrl: "https://g/v1beta" }, profile = { model: "m", cache: { gemini: "auto", geminiTtl: 600, geminiMinRepeats: 3 } };
  const big = "기억 ".repeat(2500); const mk = (q) => [{ role: "system", content: big }, { role: "user", content: q }];
  const r = []; for (let i = 0; i < 3; i++) r.push(await gc.prepare({ conn, profile, messages: mk(`q${i}`), cred: "K", transport }));
  assert.equal(r[0].cachedContent, undefined); assert.equal(r[1].cachedContent, undefined); assert.equal(r[2].cachedContent, "cachedContents/a"); assert.equal(posts.length, 1);
});
test("등록: 자동 + 프로필별 이름, 미지원 호스트는 꺼짐", async () => {
  const mem = new Map(), got = []; const api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } }, addProvider: async (n, f, o) => got.push([n, f, o]) };
  const store = createProviderStore(api); await store.save({ enabled: true, connections: [{ id: "c", kind: "openai" }], profiles: [{ id: "p", name: "메인 GPT", connectionId: "c", model: "m" }] });
  const seen = []; const reg = createRegistrar(api, { runner: { handle: async (r) => { seen.push(r.__profile); return { success: true, content: "x" }; } }, store });
  const s = await reg.sync(); assert.deepEqual(s.names, ["Dusk 자동", providerName({ name: "메인 GPT" })]); await got[1][1]({ mode: "model" }); assert.deepEqual(seen, ["p"]);
  await reg.sync(); assert.equal(got.length, 2); // 다시 맞춰도 중복 등록 안 함
  const off = createRegistrar({ pluginStorage: api.pluginStorage }, { runner: {}, store }); assert.deepEqual(await off.sync(), { supported: false, names: [] });
  await store.update((c) => { c.enabled = false; }); const dis = createRegistrar(api, { runner: {}, store }); assert.deepEqual((await dis.sync()).names, []);
});
test("키 보관: 목록엔 끝 4자리만, 삭제·값 조회", async () => {
  let saved = null; const api = { getLocalPluginStorage: async () => ({ getItem: async () => saved, setItem: async (k, v) => { saved = v; } }) };
  const v = createKeyVault(api); const id = await v.add("내 키", "sk-abcdefghij1234"); const list = await v.list(); assert.equal(list[0].tail, "…1234"); assert.ok(!JSON.stringify(list).includes("abcdefghij"));
  assert.deepEqual(await v.values([id, "nope"]), ["sk-abcdefghij1234"]); await v.remove(id); assert.deepEqual(await v.values([id]), []);
  const none = createKeyVault({}); assert.equal(await none.available(), false); await assert.rejects(() => none.add("x", "sk-1234567890"), /저장할 곳/);
});
test("모델 목록: 숨김·직접 추가 반영, 형식별 파싱", async () => {
  assert.deepEqual(parseModels({}, { data: [{ id: "b" }, { id: "a" }] }), ["a", "b"]); assert.deepEqual(parseModels({}, { models: [{ name: "models/gemini-x" }] }), ["gemini-x"]);
  const t = { send: async () => jsonRes({ data: [{ id: "m1" }, { id: "m2" }] }) }; const out = await listModels(t, { kind: "openai", format: "openai", baseUrl: "https://x/v1", hidden: ["m2"], userModels: ["mine"] }, "K"); assert.deepEqual(out, ["mine", "m1"]);
  await assert.rejects(() => listModels(t, { kind: "copilot", format: "openai" }, "K"), /목록/);
});

test("번역기: 서식 토큰을 보호했다가 되돌리고 용어집·안내문을 붙인다", async () => {
  const h = harness({ cfgOver: { translator: { enabled: true, protect: true, glossary: true, guide: "존댓말로", glossaryText: "Dusk = 더스크" } }, script: [(r) => jsonRes({ choices: [{ message: { content: "안녕 ⟦0⟧ 세계" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1 } })] }); await h.ready;
  const r = await h.runner.handle({ mode: "translate", prompt_chat: [{ role: "user", content: "Hello <b>world</b>" }] });
  const sent = JSON.stringify(h.calls[0].req.body);
  assert.match(sent, /⟦0⟧/); assert.match(sent, /더스크/); assert.match(sent, /존댓말로/); assert.doesNotMatch(sent, /<b>/);
  assert.equal(r.content, "안녕 <b> 세계");
});

test("재시도 대상 rate: 429만 같은 키로 다시, 503은 바로 실패", async () => {
  const h = harness({ keys: { k1: "sk-only-key-1111" }, cfgOver: { connections: [{ id: "c1", kind: "openai", keyIds: ["k1"] }], profiles: [{ id: "p1", connectionId: "c1", model: "m", retry: 2 }], defaults: { retryOn: "rate", keyCooldownSec: 0 } }, script: [errRes(429, "slow"), sseRes([oa("ok"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req({ mode: "other" })); assert.equal(r.content, "ok"); assert.equal(h.calls.length, 2);
  const h2 = harness({ keys: { k1: "sk-only-key-1111" }, cfgOver: { connections: [{ id: "c1", kind: "openai", keyIds: ["k1"] }], profiles: [{ id: "p1", connectionId: "c1", model: "m", retry: 2 }], defaults: { retryOn: "rate" } }, script: [errRes(503, "busy"), sseRes([oa("ok"), oaEnd()])] }); await h2.ready;
  const r2 = await h2.runner.handle(req({ mode: "other" })); assert.equal(r2.success, false); assert.equal(h2.calls.length, 1);
});
test("재시도 오류를 하나씩 기록하고 키는 가림", async () => {
  const { createErrorLog } = await import("../src/engine/provider/errlog.js"); const errlog = createErrorLog({ max: 20 });
  harness.extra = { errlog }; const h = harness({ keys: { k1: "sk-only-key-1111" }, cfgOver: { connections: [{ id: "c1", kind: "openai", keyIds: ["k1"] }], profiles: [{ id: "p1", connectionId: "c1", model: "m", retry: 2 }] }, script: [errRes(503, "busy sk-only-key-1111"), errRes(503, "busy"), sseRes([oa("fine"), oaEnd()])] }); await h.ready;
  await h.runner.handle(req({ mode: "other" })); delete harness.extra; const rows = errlog.list().filter((x) => x.kind !== "ok");
  assert.equal(rows.length, 2); assert.ok(rows.every((x) => x.status === 503 && x.model === "m")); assert.ok(!JSON.stringify(rows).includes("sk-only-key-1111"));
});
test("on-error 키 방식: 실패한 뒤에만 다음 키로", async () => {
  const h = harness({ keys: { k1: "sk-key-one-1111", k2: "sk-key-two-2222" }, cfgOver: { connections: [{ id: "c1", kind: "openai", keyIds: ["k1", "k2"], keyMode: "on-error" }] }, script: [sseRes([oa("a"), oaEnd()]), sseRes([oa("b"), oaEnd()]), errRes(429, "rate"), sseRes([oa("c"), oaEnd()])] }); await h.ready;
  const auth = (c) => JSON.stringify(c.req.headers);
  await h.runner.handle(req({ mode: "other" })); await h.runner.handle(req({ mode: "other" })); await h.runner.handle(req({ mode: "other" }));
  assert.ok(auth(h.calls[0]).includes("1111") && auth(h.calls[1]).includes("1111") && auth(h.calls[2]).includes("1111") && auth(h.calls[3]).includes("2222"));
});

test("성공한 요청도 기록에 한 줄 남고 내용은 저장 안 함", async () => {
  const { createErrorLog } = await import("../src/engine/provider/errlog.js"); const errlog = createErrorLog({ max: 20 });
  harness.extra = { errlog }; const h = harness({ keys: { k1: "sk-only-key-1111" }, cfgOver: { connections: [{ id: "c1", kind: "openai", keyIds: ["k1"] }], profiles: [{ id: "p1", connectionId: "c1", model: "m" }] }, script: [sseRes([oa("비밀 본문"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req({ mode: "other" })); if (typeof r.content !== "string") await collect(r.content); delete harness.extra;
  const rows = errlog.list(); assert.equal(rows.length, 1); assert.equal(rows[0].kind, "ok"); assert.equal(rows[0].status, 200); assert.ok(!JSON.stringify(rows).includes("비밀 본문"));
});

test("캐시 학습: 두 번째 요청에 앞부분 끝 표시(Claude)", async () => {
  const an = (t) => `event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":${JSON.stringify(t)}}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`;
  const h = harness({ keys: { k1: "sk-ant-key-1111" }, cfgOver: { connections: [{ id: "c1", kind: "anthropic", keyIds: ["k1"] }], profiles: [{ id: "p1", connectionId: "c1", model: "claude-sonnet-4", cache: { claude: "5m", learn: true, breakpoints: 1 } }] }, script: [sseRes([an("a")]), sseRes([an("b")])] }); await h.ready;
  const turns = (n) => [{ role: "system", content: "S" }, ...Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "char" : "user", content: `m${i}` }))];
  const a = await h.runner.handle(req({ prompt_chat: turns(4) })); if (typeof a.content !== "string") await collect(a.content);
  const second = turns(6); second[4] = { role: "user", content: "바뀜" };
  const b = await h.runner.handle(req({ prompt_chat: second })); if (typeof b.content !== "string") await collect(b.content);
  const marks = (c) => c.req.body.messages.map((m, i) => (m.content.some((x) => x.cache_control) ? i : -1)).filter((i) => i >= 0);
  assert.ok(marks(h.calls[1]).includes(2), JSON.stringify(marks(h.calls[1])));   // 앞 3개(m0~m2)가 같았으니 인덱스 2
});

test("라우터: 조건에 맞으면 그 프로필, 요청이 직접 고른 프로필은 우선", async () => {
  const router = { enabled: true, rules: [{ id: "r", name: "긴 글", minChars: 10, profileId: "p2" }] };
  const h = harness({ cfgOver: { router }, script: [sseRes([oa("x"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req({ prompt_chat: [{ role: "user", content: "열 글자가 넘는 아주 긴 메시지입니다" }] })); if (typeof r.content !== "string") await collect(r.content);
  assert.match(h.calls[0].req.url, /anthropic/);
  const h2 = harness({ cfgOver: { router }, script: [sseRes([oa("y"), oaEnd()])] }); await h2.ready;
  const r2 = await h2.runner.handle(req({ __profile: "p1", prompt_chat: [{ role: "user", content: "열 글자가 넘는 아주 긴 메시지입니다" }] })); if (typeof r2.content !== "string") await collect(r2.content);
  assert.doesNotMatch(h2.calls[0].req.url, /anthropic/);
});

test("훅: 응답 훅이 있으면 한번에 받아 고침", async () => {
  const cfgOver = { hooks: [{ id: "h", name: "꼬리", post: { find: "\\s*\\(끝\\)$", replace: "" } }] };
  const h = harness({ cfgOver, script: [sseRes([oa("안녕 (끝)"), oaEnd()])] }); await h.ready;
  const r = await h.runner.handle(req()); assert.equal(typeof r.content, "string"); assert.equal(r.content, "안녕");
});
test("MCP 도구: 읽기 전용은 바로, 쓰기는 확인을 거침", async () => {
  const mcpSrv = { id: "m", name: "메모", url: "https://x.test/mcp", tools: [{ name: "get", description: "읽기", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } }, { name: "put", description: "쓰기", inputSchema: { type: "object", properties: {} } }], allowWrite: true };
  const called = []; const mcp = { call: async (srv, tool, args) => { called.push(tool); return `결과:${tool}`; } }; let asked = 0;
  const toolText = (name) => `<tool_call name="${name}">{}</tool_call>`;
  harness.extra = { mcp, confirm: async () => { asked++; return false; } };
  const h = harness({ cfgOver: { mcp: { servers: [mcpSrv] } }, script: [sseRes([oa(toolText("mcp_m_get")), oaEnd()]), sseRes([oa(toolText("mcp_m_put")), oaEnd()]), sseRes([oa("끝"), oaEnd()])] }); delete harness.extra; await h.ready;
  const r = await h.runner.handle(req()); assert.equal(r.content, "끝"); assert.deepEqual(called, ["get"]); assert.equal(asked, 1);   // put은 거절되어 실행 안 됨
});
