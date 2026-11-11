// 보조 호출 장부 (2.1.4): 플러그인·애드온이 부른 보조 모델 호출을 한곳에 알린다 → '모델 호출 표시'가 응답마다 작업별로 묶어 보여 준다.
// 코어·애드온이 따로 번들돼도 같은 장부를 쓰도록 globalThis.__duskAux에 둔다(애드온은 import 없이 globalThis.__duskAux?.note?.(…)로도 알릴 수 있다).
// 항목: { label, inTok, outTok, real } — real=true면 공급자가 알려 준 실제 토큰, 아니면 글자 수 어림.
const BUS = (globalThis.__duskAux ??= { subs: new Set(), note: null });
BUS.note = (e) => { if (!e) return; for (const f of [...BUS.subs]) { try { f(e); } catch { /* 표시 쪽 오류는 무시 */ } } };
export const noteAux = (e) => BUS.note(e);
export function onAux(f) { BUS.subs.add(f); return () => BUS.subs.delete(f); }
export const auxTok = (text) => { const s = String(text ?? ""); let n = 0; for (const ch of s) n += ch.charCodeAt(0) < 128 ? 0.27 : 0.8; return Math.ceil(n); };
export const msgsText = (messages) => (Array.isArray(messages) ? messages : []).map((m) => typeof m?.content === "string" ? m.content : Array.isArray(m?.content) ? m.content.map((p) => typeof p === "string" ? p : p?.text ?? "").join("") : "").join("\n");
// 공급자 사용량 → {inTok, outTok}. OpenAI·Anthropic·Gemini 꼴과 리수폿 normalizeTokenUsage 꼴을 받는다. 못 읽으면 null.
export function usageTokens(u) {
  if (!u || typeof u !== "object") return null;
  const num = (...v) => { for (const x of v) { const n = Number(x); if (Number.isFinite(n) && n >= 0) return n; } return null; };
  const inTok = num(u.input, u.inputTokens, u.input_tokens, u.prompt_tokens, u.promptTokenCount, u.prompt);
  const outBase = num(u.output, u.outputTokens, u.output_tokens, u.completion_tokens, u.candidatesTokenCount, u.completion);
  const think = num(u.reasoning, u.reasoningTokens, u.thoughtsTokenCount, u.completion_tokens_details?.reasoning_tokens) ?? 0;
  if (inTok == null && outBase == null) return null;
  // Gemini는 생각 토큰을 출력에 따로 센다(candidates에 안 들어감). OpenAI의 reasoning_tokens는 completion_tokens 안에 이미 있다.
  const out = (outBase ?? 0) + (u.thoughtsTokenCount != null || u.reasoningIncluded === false ? think : 0);
  return { inTok: inTok ?? 0, outTok: out };
}
// 응답 아래 표시용: 호출들 → [{label, n, inTok, outTok}] 큰 것부터
export function summarizeAux(calls) {
  const m = new Map();
  for (const c of calls ?? []) {
    const k = String(c?.label || "보조 호출"), cur = m.get(k) ?? { label: k, n: 0, inTok: 0, outTok: 0 };
    cur.n++; cur.inTok += Number(c?.inTok) || 0; cur.outTok += Number(c?.outTok) || 0; m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => (b.inTok + b.outTok) - (a.inTok + a.outTok));
}
// 한 호출을 응답의 보조 호출 요약([{label,n,inTok,outTok,est}])에 더한다. est = 어림값이 섞였는지.
export function mergeSide(side, e) {
  const list = Array.isArray(side) ? side.map((x) => ({ ...x })) : [];
  const label = String(e?.label || "보조 호출");
  let cur = list.find((x) => x.label === label);
  if (!cur) { if (list.length >= 12) return list; cur = { label, n: 0, inTok: 0, outTok: 0, est: false }; list.push(cur); }
  cur.n++; cur.inTok += Math.max(0, Number(e?.inTok) || 0); cur.outTok += Math.max(0, Number(e?.outTok) || 0); if (!e?.real) cur.est = true;
  return list.sort((a, b) => (b.inTok + b.outTok) - (a.inTok + a.outTok));
}
