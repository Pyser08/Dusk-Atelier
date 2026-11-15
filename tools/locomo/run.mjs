// LoCoMo 평가: 플러그인 없음(최근 대화만) vs 장기기억 켬(같은 최근 대화 + [Dusk Memory] 블록).
// 기록과 주입은 플러그인 코드(createMemoryRunner.analyzeAt, createMemoryInjector.compose)를 그대로 쓰고, 모델 호출만 OpenRouter로 바꾼다.
// 사용: node tools/locomo/run.mjs --data locomo10.json --out <dir> [--conv 0] [--phase record|qa|all] [--limit N]
// Node 내장 fetch가 프록시를 쓰게 하려면 NODE_USE_ENV_PROXY=1 로 실행한다. --upto N: 메시지 N개까지만 기록(시험용)
// 키는 OPENROUTER_API_KEY 또는 프록시 주입(값이 없으면 placeholder를 보낸다).
import fs from "node:fs";
import path from "node:path";
import { createMemoryStore } from "../../src/data/memorystore.js";
import { createMemoryRunner } from "../../src/data/memoryrunner.js";
import { createMemoryInjector } from "../../src/data/memoryinject.js";
import { insertBlock } from "../../src/engine/memoryinject.js";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] == null ? "1" : all[i + 1]]] : a), []));
const CONV = Number(args.conv ?? 0), OUT = args.out ?? "locomo-out", PHASE = args.phase ?? "all", LIMIT = Number(args.limit ?? Infinity);
const MAIN = args.main ?? "google/gemini-3-flash-preview", MAIN_TIER = args.tier ?? "flex";
const AUX = args.aux ?? "deepseek/deepseek-v4.1-flash";
const JUDGE = args.judge ?? MAIN;
const RECENT_TOKENS = Number(args.recent ?? 8000), MIN_CHARS = Number(args.minChars ?? 20), CONC = Number(args.conc ?? 6);
const KEY = process.env.OPENROUTER_API_KEY || "proxy-injected";
fs.mkdirSync(OUT, { recursive: true });

// ---- OpenRouter ----
const cost = { aux: 0, main: 0, judge: 0 }, usage = { aux: [0, 0, 0], main: [0, 0, 0], judge: [0, 0, 0] };
const flat = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => p?.text ?? "").join("") : String(c ?? ""));
async function chat(kind, model, messages, { maxTokens = 8000, tier = null } = {}) {
  const body = { model, messages: messages.map((m) => ({ role: m.role === "char" ? "assistant" : m.role, content: flat(m.content) })), max_tokens: maxTokens, usage: { include: true } };
  if (tier) body.service_tier = tier;
  for (let k = 0; ; k++) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error ?? j).slice(0, 300)}`);
      const u = j.usage ?? {};
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
const sample = data[CONV], conv = sample.conversation;
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
  getDatabase: async () => ({ username: A, personas: [{ name: A }] })
};
const store = createMemoryStore(api);
await store.updateIndex((i) => { i.settings.minChars = MIN_CHARS; i.settings.confirm = "now"; });
const quiet = (...a) => { if (process.env.DEBUG) console.log("[dusk]", ...a); };
const runner = createMemoryRunner(api, { store, log: quiet, notify: () => {}, call: (msgs) => chat("aux", AUX, msgs, { maxTokens: 12000 }) });
const injector = createMemoryInjector(api, { store, log: quiet });

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
  console.log(`기록 끝: ${JSON.stringify(results)}  보조 합계 $${progress.cost.aux.toFixed(4)}  토큰 in ${progress.usage.aux[0]} / out ${progress.usage.aux[1]} / 호출 ${progress.usage.aux[2]}`);
}

// ---- 2단계: 질문 답변 두 쪽 + 채점 ----
const tok = (s) => Math.ceil(String(s).length / 4);
const sysPrompt = `You are ${B}, chatting with ${A}. The conversation so far is below. ${A} now asks you a question about things that happened in your past conversations. Answer in a short phrase (a few words), with exact names and dates when relevant. If you do not know, give your best guess.`;
function recentMessages() {
  const out = []; let used = 0;
  for (let i = messages.length - 1; i >= 0; i--) { const t = tok(messages[i].data) + 4; if (used + t > RECENT_TOKENS) break; out.unshift(messages[i]); used += t; }
  return out;
}
const toApi = (list) => list.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: `${m.speaker}: ${m.data}` }));
const judgePrompt = (q, gold, ans) => [{ role: "user", content: `You are grading an answer to a question about a long conversation.\nQuestion: ${q}\nGold answer: ${gold}\nGenerated answer: ${ans}\n\nBe generous: if the generated answer refers to the same thing as the gold answer (same meaning, date expressed differently but same time period, etc.), it is CORRECT. Otherwise WRONG.\nReply with exactly one word: CORRECT or WRONG.` }];
async function pool(items, fn) { const res = new Array(items.length); let next = 0; await Promise.all(Array.from({ length: CONC }, async () => { while (next < items.length) { const k = next++; res[k] = await fn(items[k], k); } })); return res; }

async function qa() {
  chatObj.message = messages.slice();
  const recent = recentMessages();
  console.log(`최근 대화: ${recent.length}/${messages.length}개 메시지(약 ${RECENT_TOKENS} 토큰)`);
  const qs = sample.qa.filter((q) => q.category !== 5).slice(0, LIMIT);   // 5 = adversarial(정답 없음), 관례대로 뺀다
  const rows = await pool(qs, async (q, k) => {
    const question = { role: "user", data: q.question, speaker: A };
    const base = [{ role: "system", content: sysPrompt }, ...toApi(recent), { role: "user", content: `${A}: ${q.question}` }];
    chatObj.message = [...messages, question];
    const c = await injector.compose({ character, chat: chatObj }, { mark: false });
    const withMem = c?.text ? insertBlock(base, c.text, c.position ?? "end") : base;
    const [a0, a1] = await Promise.all([chat("main", MAIN, base, { maxTokens: 2000, tier: MAIN_TIER }), chat("main", MAIN, withMem, { maxTokens: 2000, tier: MAIN_TIER })]);
    const [j0, j1] = await Promise.all([chat("judge", JUDGE, judgePrompt(q.question, q.answer, a0), { maxTokens: 1000, tier: MAIN_TIER }), chat("judge", JUDGE, judgePrompt(q.question, q.answer, a1), { maxTokens: 1000, tier: MAIN_TIER })]);
    const ok = (s) => /CORRECT/i.test(s) && !/WRONG/i.test(s);
    if ((k + 1) % 20 === 0) console.log(`  질문 ${k + 1}/${qs.length}`);
    return { q: q.question, gold: String(q.answer), category: q.category, evidence: q.evidence, noPlugin: a0, plugin: a1, okNo: ok(j0), okMem: ok(j1), memTokens: c?.manifest?.tokens ?? 0, memReason: c?.reason ?? "" };
  });
  const CAT = { 1: "multi-hop", 2: "temporal", 3: "open-domain", 4: "single-hop" };
  const summary = { conv: CONV, main: `${MAIN} (${MAIN_TIER})`, aux: AUX, judge: JUDGE, recentTokens: RECENT_TOKENS, n: rows.length, byCategory: {}, cost: { aux: progress.cost.aux, main: cost.main, judge: cost.judge }, usage: { aux: progress.usage.aux, main: usage.main, judge: usage.judge } };
  const acc = (rs, f) => rs.length ? +(100 * rs.filter(f).length / rs.length).toFixed(1) : null;
  summary.overall = { noPlugin: acc(rows, (r) => r.okNo), plugin: acc(rows, (r) => r.okMem), avgMemTokens: Math.round(rows.reduce((s, r) => s + r.memTokens, 0) / rows.length) };
  for (const [k, name] of Object.entries(CAT)) { const rs = rows.filter((r) => String(r.category) === k); summary.byCategory[name] = { n: rs.length, noPlugin: acc(rs, (r) => r.okNo), plugin: acc(rs, (r) => r.okMem) }; }
  fs.writeFileSync(path.join(OUT, `qa-${CONV}.json`), JSON.stringify(rows, null, 1));
  fs.writeFileSync(path.join(OUT, `summary-${CONV}.json`), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary, null, 1));
}

if (PHASE === "record" || PHASE === "all") await record();
if (PHASE === "qa" || PHASE === "all") await qa();
