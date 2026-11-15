// LoCoMo 평가: 플러그인 없음(최근 대화만) vs 장기기억 켬(같은 최근 대화 + [Dusk Memory] 블록).
// 기록과 주입은 플러그인 코드(createMemoryRunner.analyzeAt, createMemoryInjector.compose)를 그대로 쓰고, 모델 호출만 OpenRouter로 바꾼다.
// 사용: node tools/locomo/run.mjs --data locomo10.json --out <dir> [--conv 0] [--phase record|qa|all] [--limit N]
// Node 내장 fetch가 프록시를 쓰게 하려면 NODE_USE_ENV_PROXY=1 로 실행한다. --upto N: 메시지 N개까지만 기록(시험용)
// --lang ko: 대화·질문을 한국어로 번역해서(처음 한 번, 파일로 저장) 시험한다. --memOnly: 답할 때 기억 블록만 본다(최근 대화 없음).
// --embed: 플러그인의 Voyage 임베딩 기억 고르기를 켠다(api.voyageai.com, 키는 프록시 주입).
// 키는 OPENROUTER_API_KEY 또는 프록시 주입(값이 없으면 placeholder를 보낸다).
import fs from "node:fs";
import path from "node:path";
import { createMemoryStore } from "../../src/data/memorystore.js";
import { createMemoryRunner } from "../../src/data/memoryrunner.js";
import { createMemoryInjector } from "../../src/data/memoryinject.js";
import { insertBlock } from "../../src/engine/memoryinject.js";
import { createEmbedder } from "../../src/data/embed.js";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] == null ? "1" : all[i + 1]]] : a), []));
const CONV = Number(args.conv ?? 0), OUT = args.out ?? "locomo-out", PHASE = args.phase ?? "all", LIMIT = Number(args.limit ?? Infinity);
const MAIN = args.main ?? "google/gemini-3-flash-preview", MAIN_TIER = args.tier ?? "flex";
const AUX = args.aux ?? "deepseek/deepseek-v4.1-flash";
const JUDGE = args.judge ?? MAIN;
const RECENT_TOKENS = Number(args.recent ?? 8000), MIN_CHARS = Number(args.minChars ?? 20), CONC = Number(args.conc ?? 6);
const LANG = args.lang ?? "en", MEM_ONLY = args.memOnly === "1", EMBED = args.embed === "1";
const KEY = process.env.OPENROUTER_API_KEY || "proxy-injected";
fs.mkdirSync(OUT, { recursive: true });

// ---- OpenRouter ----
const cost = { aux: 0, main: 0, judge: 0 }, usage = { aux: [0, 0, 0], main: [0, 0, 0], judge: [0, 0, 0] };
const flat = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => p?.text ?? "").join("") : String(c ?? ""));
const AUX_PROVIDER = args.auxProvider ? { order: args.auxProvider.split(","), quantizations: ["fp8", "bf16", "fp16", "unknown"], allow_fallbacks: false } : null;   // --auxProvider deepinfra : 보조 모델 제공자 고정(fp8 이상)
const providers = {};
async function chat(kind, model, messages, { maxTokens = 8000, tier = null } = {}) {
  const body = { model, messages: messages.map((m) => ({ role: m.role === "char" ? "assistant" : m.role, content: flat(m.content) })), max_tokens: maxTokens, usage: { include: true } };
  if (tier) body.service_tier = tier;
  if (kind !== "aux") body.temperature = 0;   // 답변·채점은 온도 0(같은 블록이면 같은 답 — 시험 흔들림 줄이기). 기록(aux)은 플러그인 실제 동작 그대로
  if (kind === "aux" && AUX_PROVIDER) body.provider = AUX_PROVIDER;
  for (let k = 0; ; k++) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error ?? j).slice(0, 300)}`);
      const u = j.usage ?? {}; const pk = `${kind}:${j.provider ?? "?"}`; providers[pk] = (providers[pk] ?? 0) + 1;
      cost[kind] += Number(u.cost ?? 0); usage[kind][0] += u.prompt_tokens ?? 0; usage[kind][1] += u.completion_tokens ?? 0; usage[kind][2]++;
      const text = j.choices?.[0]?.message?.content ?? "";
      if (!text && k < 4) throw new Error("empty content");
      return text;
    } catch (e) {
      if (k >= 5) throw e;
      await new Promise((res) => setTimeout(res, 2000 * 2 ** k));
    }
  }
}

// ---- LoCoMo → 리스 채팅 ----
const data = JSON.parse(fs.readFileSync(args.data ?? "locomo10.json", "utf8"));
const sample = data[CONV];
if (LANG === "ko") await translateSample(sample);
const conv = sample.conversation;
const A = conv.speaker_a, B = conv.speaker_b;   // A = {{user}}, B = 봇(char)
const messages = [];
for (let s = 1; conv[`session_${s}`]; s++) {
  const date = conv[`session_${s}_date_time`];
  conv[`session_${s}`].forEach((t, i) => {
    let text = t.text + (t.blip_caption ? ` [shares a photo: ${t.blip_caption}]` : "");
    if (i === 0) text = `(${date}) ${text}`;   // 세션 날짜는 첫 줄에 붙여 이야기 시간으로 읽히게
    messages.push({ role: t.speaker === A ? "user" : "char", data: text, chatId: t.dia_id, speaker: t.speaker });
  });
}
console.log(`대화 ${CONV}: ${A}(user) ↔ ${B}(char), 메시지 ${messages.length}개, 질문 ${sample.qa.length}개`);

// ---- 한국어 번역(번역 모델 = 메인 모델, 세션 단위, 결과는 파일에 저장해 다시 쓴다) ----
async function translateSample(smp) {
  const file = path.join(OUT, `ko-${CONV}.json`);
  if (fs.existsSync(file)) { const ko = JSON.parse(fs.readFileSync(file, "utf8")); smp.conversation = ko.conversation; smp.qa = ko.qa; return; }
  const ask = async (items, what) => {
    for (let k = 0; k < 4; k++) {
      const raw = await chat("main", MAIN, [{ role: "system", content: `Translate each string of the JSON array into natural Korean (${what}). Keep personal names in their original Latin spelling. Convert dates to Korean format like "2023년 5월 8일 오후 1:56". Empty strings stay empty. Return ONLY a JSON array of the same length, same order.` }, { role: "user", content: JSON.stringify(items) }], { maxTokens: 30000, tier: MAIN_TIER });
      try { const t = raw.replace(/```(?:json)?/g, ""); const a = JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1)); if (Array.isArray(a) && a.length === items.length) return a.map(String); } catch { /* 다시 */ }
    }
    throw new Error("번역 실패: " + what);
  };
  const c = smp.conversation, jobs = [];
  for (let s = 1; c[`session_${s}`]; s++) jobs.push((async () => {
    const turns = c[`session_${s}`], items = [c[`session_${s}_date_time`], ...turns.flatMap((t) => [t.text, t.blip_caption ?? ""])];
    const out = await ask(items, "a casual chat between two friends; the first string is a date/time");
    c[`session_${s}_date_time`] = out[0]; turns.forEach((t, i) => { t.text = out[1 + 2 * i]; if (t.blip_caption) t.blip_caption = out[2 + 2 * i]; });
  })());
  const qa = smp.qa.filter((q) => q.category !== 5);
  for (let i = 0; i < qa.length; i += 40) { const part = qa.slice(i, i + 40); jobs.push((async () => { const out = await ask(part.flatMap((q) => [q.question, String(q.answer)]), "questions and short answers about the chat"); part.forEach((q, k) => { q.question = out[2 * k]; q.answer = out[2 * k + 1]; }); })()); }
  await Promise.all(jobs); smp.qa = qa;
  fs.writeFileSync(file, JSON.stringify({ conversation: c, qa }, null, 1));
  console.log(`번역 끝 (메인 모델 비용 $${cost.main.toFixed(4)})`);
}

// ---- 가짜 리스 API (플러그인 저장소는 파일로 남겨 이어 돌릴 수 있게) ----
const STORE_FILE = path.join(OUT, `store-${CONV}.json`);
const kv = new Map(fs.existsSync(STORE_FILE) ? Object.entries(JSON.parse(fs.readFileSync(STORE_FILE, "utf8"))) : []);
const saveKv = () => fs.writeFileSync(STORE_FILE, JSON.stringify(Object.fromEntries(kv)));
const chatObj = { id: `locomo-${CONV}`, name: `LoCoMo ${CONV}`, message: [] };
const character = { chaId: `locomo-${CONV}`, name: B, chats: [chatObj] };
const api = {
  pluginStorage: { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } },
  getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
  getCharacterFromIndex: async () => character, getChatFromIndex: async () => chatObj,
  getDatabase: async () => ({ username: A, personas: [{ name: A }] }),
  getLocalPluginStorage: async () => api.pluginStorage, nativeFetch: (u, o) => fetch(u, o)
};
const store = createMemoryStore(api);
await store.updateIndex((i) => { i.settings.minChars = MIN_CHARS; i.settings.confirm = "now"; if (args.inject) Object.assign(i.settings.inject, JSON.parse(args.inject)); });   // --inject '{"recallTokens":1500}' 로 주입 설정 시험
const quiet = (...a) => { if (process.env.DEBUG) console.log("[dusk]", ...a); };
const runner = createMemoryRunner(api, { store, log: quiet, notify: () => {}, call: (msgs) => chat("aux", AUX, msgs, { maxTokens: 12000 }) });
const embedder = EMBED ? createEmbedder(api, { log: quiet }) : null;
if (embedder) await embedder.save({ on: true, key: "proxy-injected", timeoutMs: 20000, rerank: args.rerank === "1" });   // --rerank: 보야지 재정렬 켜기
const injector = createMemoryInjector(api, { store, log: quiet, embedder });

const progressFile = path.join(OUT, `progress-${CONV}.json`);
const progress = fs.existsSync(progressFile) ? JSON.parse(fs.readFileSync(progressFile, "utf8")) : { recordedUpTo: -1, cost: { aux: 0 }, usage: { aux: [0, 0, 0] } };

// ---- 1단계: 응답마다 장기기억 자동 기록 ----
async function record() {
  const t0 = Date.now(); let n = 0, results = {};
  const UPTO = Number(args.upto ?? Infinity);
  for (let i = 0; i < Math.min(messages.length, UPTO); i++) {
    if (i <= progress.recordedUpTo || messages[i].role !== "char") continue;
    chatObj.message = messages.slice(0, i + 1);
    try { const r = await runner.analyzeAt(0, 0, [i]); const key = typeof r === "string" ? r : "ok"; results[key] = (results[key] ?? 0) + 1; }
    catch (e) { results.error = (results.error ?? 0) + 1; console.log(`  #${i} 기록 실패: ${String(e?.message ?? e).slice(0, 160)}`); }
    progress.recordedUpTo = i; progress.cost.aux += cost.aux; usage.aux.forEach((v, k) => (progress.usage.aux[k] += v)); cost.aux = 0; usage.aux = [0, 0, 0];
    saveKv(); fs.writeFileSync(progressFile, JSON.stringify(progress));
    if (++n % 10 === 0) console.log(`  기록 ${i + 1}/${messages.length}  보조 비용 $${progress.cost.aux.toFixed(4)}  ${Math.round((Date.now() - t0) / 1000)}초  ${JSON.stringify(results)}`);
  }
  console.log("제공자:", JSON.stringify(providers));
  console.log(`기록 끝: ${JSON.stringify(results)}  보조 합계 $${progress.cost.aux.toFixed(4)}  토큰 in ${progress.usage.aux[0]} / out ${progress.usage.aux[1]} / 호출 ${progress.usage.aux[2]}`);
}

// ---- 2단계: 질문 답변 두 쪽 + 채점 ----
const tok = (s) => Math.ceil(String(s).length / 4);
const sysMem = LANG === "ko" ? `너는 ${B}이고 ${A}와 대화하고 있어. 아래 기억 블록은 지금까지 둘의 대화에 대한 너의 기억이야. ${A}가 지난 대화에 대해 질문하면 기억 블록만 근거로 짧게(몇 단어) 답해. "나" 대신 이름을 써서 3인칭으로, 이름과 날짜는 정확히. 모르면 가장 그럴듯한 답을 해.` : `You are ${B}, chatting with ${A}. The memory block below is your memory of your past conversations. Answer ${A}'s question in a short phrase using only that memory, with exact names and dates. If unsure, give your best guess.`;
const sysPrompt = `You are ${B}, chatting with ${A}. The conversation so far is below. ${A} now asks you a question about things that happened in your past conversations. Answer in a short phrase (a few words) in the third person using names (not "I"), with exact names and dates when relevant. If you do not know, give your best guess.`;
function recentMessages() {
  const out = []; let used = 0;
  for (let i = messages.length - 1; i >= 0; i--) { const t = tok(messages[i].data) + 4; if (used + t > RECENT_TOKENS) break; out.unshift(messages[i]); used += t; }
  return out;
}
const toApi = (list) => list.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: `${m.speaker}: ${m.data}` }));
const judgePrompt = (q, gold, ans, who = null) => [{ role: "user", content: `You are grading an answer to a question about a long conversation${who ? ` between ${who.a} and ${who.b}` : ""}.\nQuestion: ${q}\nGold answer: ${gold}\nGenerated answer: ${ans}\n\n${who ? `The answer was written by ${who.b}, so "I", "me", "my", "we", "나", "내", "우리" in it refer to ${who.b}.\n` : ""}Grade generously, like the standard LoCoMo judge:\n- CORRECT if it refers to the same thing as the gold answer (same entity, event or fact), even if worded differently, in another language or format, or with extra detail.\n- Dates: CORRECT if it names the same day or the same period the gold describes (e.g. "the Sunday before 2023-05-25" vs "2023-05-21").\n- Lists: CORRECT if it covers most of the gold items and does not contradict them.\n- WRONG if it contradicts the gold, names a different thing, or misses the main point.\nReply with exactly one word: CORRECT or WRONG.` }];
async function pool(items, fn) { const res = new Array(items.length); let next = 0; await Promise.all(Array.from({ length: CONC }, async () => { while (next < items.length) { const k = next++; res[k] = await fn(items[k], k); } })); return res; }

async function qa() {
  chatObj.message = messages.slice();
  const recent = recentMessages();
  if (embedder) {   // 답하기 전에 기록 벡터를 미리 다 만든다(한 번에 96개씩)
    const { loadReconciled } = await import("../../src/data/memoryload.js"); const { folderIdOf } = await import("../../src/data/memorystore.js"); const { chatKeyOf } = await import("../../src/engine/chatkey.js");
    const folder = await loadReconciled(store, character.chaId, chatKeyOf(chatObj), chatObj.message), fid = folderIdOf(character.chaId, chatKeyOf(chatObj));
    const n = Object.values(folder.people).reduce((a, p) => a + p.records.length, 0) + (folder.scenes ?? []).filter((s) => !s.orphan).length;
    for (let k = 0; k < 20; k++) { const m = await embedder.scores(fid, folder, "warmup " + k, { budgetMs: 120000 }); if (m && m.size >= n) break; }
    chatObj.message = [...messages, { role: "user", data: "원문 임베딩 준비용 질문입니다. 지난 대화에서 있었던 일" }];
    for (let k = 0; k < 8; k++) await injector.compose({ character, chat: chatObj }, { mark: false });   // 원문 조각 벡터(한 번에 256개)
    chatObj.message = messages.slice();
    saveKv(); console.log("임베딩 준비 끝", embedder.status().lastError || "");
  }
  console.log(`최근 대화: ${recent.length}/${messages.length}개 메시지(약 ${RECENT_TOKENS} 토큰)`);
  const qs = sample.qa.filter((q) => q.category !== 5).slice(0, LIMIT);   // 5 = adversarial(정답 없음), 관례대로 뺀다
  if (args.hitOnly === "1") {   // 답변·채점 없이: 정답 근거 대사가 블록에 들어갔는지만 센다
    const byDia = new Map(messages.map((m) => [m.chatId, m.data.replace(/^\([^)]*\)\s*/, "")]));
    const norm = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
    const res = []; let tok = 0;
    for (const q of qs) {
      chatObj.message = [...messages, { role: "user", data: q.question }];
      const c = await injector.compose({ character, chat: chatObj }, { mark: false }); const mem = norm(c?.text ?? ""); tok += c?.manifest?.tokens ?? 0;
      const evs = (q.evidence ?? []).map((e) => norm(byDia.get(String(e).trim()))).filter(Boolean);
      const hit = evs.filter((t) => mem.includes(t.slice(0, 25)) || mem.includes(t.slice(-25))).length;
      res.push({ q: q.question, category: q.category, n: evs.length, hit });
    }
    const full = res.filter((r) => r.n && r.hit === r.n).length, any = res.filter((r) => r.hit > 0).length, withEv = res.filter((r) => r.n).length;
    const byCat = {}; for (const [k, n] of Object.entries({ 1: "multi-hop", 2: "temporal", 3: "open-domain", 4: "single-hop" })) { const rs = res.filter((r) => String(r.category) === k && r.n); byCat[n] = rs.length ? +(100 * rs.filter((r) => r.hit === r.n).length / rs.length).toFixed(1) : null; }
    const out = { conv: CONV, n: withEv, allEvidence: +(100 * full / withEv).toFixed(1), anyEvidence: +(100 * any / withEv).toFixed(1), byCategory: byCat, avgTokens: Math.round(tok / qs.length) };
    fs.writeFileSync(path.join(OUT, `hit-${CONV}.json`), JSON.stringify({ ...out, rows: res }));
    console.log(JSON.stringify(out)); return;
  }
  const rows = await pool(qs, async (q, k) => {
    const question = { role: "user", data: q.question, speaker: A };
    const base = MEM_ONLY ? [{ role: "system", content: sysMem }, { role: "user", content: `${A}: ${q.question}` }] : [{ role: "system", content: sysPrompt }, ...toApi(recent), { role: "user", content: `${A}: ${q.question}` }];
    chatObj.message = [...messages, question];
    const c = await injector.compose({ character, chat: chatObj }, { mark: false });
    const withMem = c?.text ? insertBlock(base, c.text, c.position ?? "end") : base;
    const ONLY_BASE = args.baseOnly === "1";   // --baseOnly: 플러그인 없는 쪽만(천장 측정: --recent 1000000 과 함께)
    const [a0, a1] = await Promise.all([chat("main", MAIN, base, { maxTokens: 2000, tier: MAIN_TIER }), ONLY_BASE ? Promise.resolve("") : chat("main", MAIN, withMem, { maxTokens: 2000, tier: MAIN_TIER })]);
    const jt = args.judgeTier ?? (JUDGE === MAIN ? MAIN_TIER : null);   // --judgeTier flex
    const [j0, j1] = await Promise.all([chat("judge", JUDGE, judgePrompt(q.question, q.answer, a0, { a: A, b: B }), { maxTokens: 1000, tier: jt }), ONLY_BASE ? Promise.resolve("WRONG") : chat("judge", JUDGE, judgePrompt(q.question, q.answer, a1, { a: A, b: B }), { maxTokens: 1000, tier: jt })]);
    const ok = (s) => /CORRECT/i.test(s) && !/WRONG/i.test(s);
    if ((k + 1) % 20 === 0) console.log(`  질문 ${k + 1}/${qs.length}`);
    return { q: q.question, gold: String(q.answer), category: q.category, evidence: q.evidence, noPlugin: a0, plugin: a1, okNo: ok(j0), okMem: ok(j1), memTokens: c?.manifest?.tokens ?? 0, memReason: c?.reason ?? "", memText: c?.text ?? "" };
  });
  const CAT = { 1: "multi-hop", 2: "temporal", 3: "open-domain", 4: "single-hop" };
  const summary = { conv: CONV, lang: LANG, memOnly: MEM_ONLY, embed: EMBED, main: `${MAIN} (${MAIN_TIER})`, aux: AUX, judge: JUDGE, recentTokens: RECENT_TOKENS, n: rows.length, byCategory: {}, cost: { aux: progress.cost.aux, main: cost.main, judge: cost.judge }, usage: { aux: progress.usage.aux, main: usage.main, judge: usage.judge } };
  const acc = (rs, f) => rs.length ? +(100 * rs.filter(f).length / rs.length).toFixed(1) : null;
  summary.overall = { noPlugin: acc(rows, (r) => r.okNo), plugin: acc(rows, (r) => r.okMem), avgMemTokens: Math.round(rows.reduce((s, r) => s + r.memTokens, 0) / rows.length) };
  for (const [k, name] of Object.entries(CAT)) { const rs = rows.filter((r) => String(r.category) === k); summary.byCategory[name] = { n: rs.length, noPlugin: acc(rs, (r) => r.okNo), plugin: acc(rs, (r) => r.okMem) }; }
  fs.writeFileSync(path.join(OUT, `qa-${CONV}.json`), JSON.stringify(rows, null, 1));
  fs.writeFileSync(path.join(OUT, `summary-${CONV}.json`), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary, null, 1));
}

if (PHASE === "record" || PHASE === "all") await record();
if (PHASE === "qa" || PHASE === "all") await qa();
