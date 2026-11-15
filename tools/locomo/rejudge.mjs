// 이미 받은 답을 다른 채점 모델로 다시 채점한다(답변 호출 없이 채점만).
// 사용: NODE_USE_ENV_PROXY=1 node tools/locomo/rejudge.mjs --dir <결과 폴더> --judge google/gemini-3.8-flash [--tier flex] [--field plugin|noPlugin]
import fs from "node:fs";
import path from "node:path";
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] == null ? "1" : all[i + 1]]] : a), []));
const DIR = args.dir, JUDGE = args.judge ?? "google/gemini-3.8-flash", TIER = args.tier ?? "flex", FIELD = args.field ?? "plugin", CONC = Number(args.conc ?? 8);
const KEY = process.env.OPENROUTER_API_KEY || "proxy-injected";
let cost = 0;
const judgePrompt = (q, gold, ans, who = null) => [{ role: "user", content: `You are grading an answer to a question about a long conversation${who ? ` between ${who.a} and ${who.b}` : ""}.\nQuestion: ${q}\nGold answer: ${gold}\nGenerated answer: ${ans}\n\n${who ? `The answer was written by ${who.b}, so "I", "me", "my", "we", "나", "내", "우리" in it refer to ${who.b}.\n` : ""}Grade generously, like the standard LoCoMo judge:\n- CORRECT if it refers to the same thing as the gold answer (same entity, event or fact), even if worded differently, in another language or format, or with extra detail.\n- Dates: CORRECT if it names the same day or the same period the gold describes (e.g. "the Sunday before 2023-05-25" vs "2023-05-21").\n- Lists: CORRECT if it covers most of the gold items and does not contradict them.\n- WRONG if it contradicts the gold, names a different thing, or misses the main point.\nReply with exactly one word: CORRECT or WRONG.` }];
async function judge(msgs) {
  for (let k = 0; ; k++) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ model: JUDGE, messages: msgs, max_tokens: 1000, temperature: 0, usage: { include: true }, ...(TIER ? { service_tier: TIER } : {}) }), signal: AbortSignal.timeout(180000) });
      const j = await r.json(); if (!r.ok || j.error) throw new Error(JSON.stringify(j.error ?? j).slice(0, 200));
      cost += Number(j.usage?.cost ?? 0); const t = j.choices?.[0]?.message?.content ?? ""; if (!t && k < 3) throw new Error("empty");
      return /CORRECT/i.test(t) && !/WRONG/i.test(t);
    } catch (e) { if (k >= 5) throw e; await new Promise((r) => setTimeout(r, 2000 * 2 ** k)); }
  }
}
const rows = [];
for (const f of fs.readdirSync(DIR).filter((x) => /^qa-\d+\.json$/.test(x))) {
  const c = f.match(/\d+/)[0], kf = path.join(DIR, `ko-${c}.json`), conv = fs.existsSync(kf) ? JSON.parse(fs.readFileSync(kf, "utf8")).conversation : null;
  const who = conv ? { a: conv.speaker_a, b: conv.speaker_b } : null;
  rows.push(...JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")).map((r) => ({ ...r, who })));
}
let next = 0; const ok = new Array(rows.length);
await Promise.all(Array.from({ length: CONC }, async () => { while (next < rows.length) { const i = next++; ok[i] = await judge(judgePrompt(rows[i].q, rows[i].gold, rows[i][FIELD], rows[i].who)); } }));
const C = { 1: "multi-hop", 2: "temporal", 3: "open-domain", 4: "single-hop" }, acc = (f) => { const rs = rows.map((r, i) => [r, ok[i]]).filter(([r]) => f(r)); return rs.length ? +(100 * rs.filter(([, o]) => o).length / rs.length).toFixed(1) : null; };
if (args.save) fs.writeFileSync(args.save, JSON.stringify(rows.map((r, i) => ({ q: r.q, category: r.category, evidence: r.evidence, ok: ok[i] }))));   // --save <파일>: 문항별 판정
console.log(JSON.stringify({ dir: path.basename(DIR), field: FIELD, judge: JUDGE, n: rows.length, overall: acc(() => true), byCategory: Object.fromEntries(Object.entries(C).map(([k, n]) => [n, acc((r) => String(r.category) === k)])), cost: +cost.toFixed(4) }));
