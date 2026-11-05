// 요청 변환 (v1.9.3, 순수): 시스템 프롬프트 주입 규칙 · 캐시 친화 정렬 · 요청 해부.
import { estimateTokens } from "./messages.js";
const safeRe = (s) => { try { return s ? new RegExp(s, "i") : null; } catch { return null; } };
export function applyRules(messages, rules, { purpose = "main", model = "", charName = "" } = {}) {
  let out = [...messages];
  for (const r of rules ?? []) {
    if (!r.enabled || !r.text.trim()) continue;
    if (r.purposes?.length && !r.purposes.includes(purpose)) continue;
    const mr = safeRe(r.modelRegex), cr = safeRe(r.charRegex);
    if (mr && !mr.test(model)) continue; if (cr && !cr.test(charName)) continue;
    const msg = { role: r.role, content: r.text };
    if (r.position === "start") out.unshift(msg);
    else if (r.position === "afterFirst") out.splice(Math.min(1, out.length), 0, msg);
    else if (r.position === "beforeLast") out.splice(Math.max(0, out.length - 1), 0, msg);
    else out.push(msg);
  }
  return out;
}
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const textOf = (m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? ""));
// 요청 해부: 블록별 해시·토큰. prev(이전 해부)와 비교해 같은 앞부분 길이(캐시 적중 가능 구간)를 알려 준다.
export function anatomy(messages, prev = null) {
  const blocks = messages.map((m, i) => ({ i, role: m.role === "char" ? "assistant" : m.role, h: hash(textOf(m)), tokens: estimateTokens(textOf(m)), head: textOf(m).replace(/\s+/g, " ").slice(0, 60) }));
  let same = 0; if (prev) while (same < blocks.length && same < prev.blocks.length && blocks[same].h === prev.blocks[same].h) same++;
  const total = blocks.reduce((a, b) => a + b.tokens, 0), stable = blocks.slice(0, same).reduce((a, b) => a + b.tokens, 0);
  return { blocks, total, sameBlocks: same, stableTokens: stable, changed: prev ? blocks.filter((b, i) => !prev.blocks[i] || prev.blocks[i].h !== b.h).map((b) => b.i) : [] };
}
// 캐시 친화 정렬: 이전 요청에도 있던 시스템 블록을 맨 앞 시스템 묶음으로 올린다(같은 내용·순서 유지 → 앞부분 일치 길이 증가).
export function orderForCache(messages, prev) {
  if (!prev) return messages;
  const old = new Set(prev.blocks.filter((b) => b.role === "system").map((b) => b.h));
  const lead = [], rest = [], later = [];
  let inLead = true;
  for (const m of messages) {
    const sys = (m.role === "system"), known = sys && old.has(hash(textOf(m)));
    if (inLead && sys) lead.push(m); else { inLead = false; (known ? later : rest).push(m); }
  }
  return [...lead, ...later, ...rest];
}
// 마커 기준 분리(Gemini 명시적 캐시 수동 모드): 마커 앞 = 캐시 대상, 뒤 = 변하는 부분
export function splitAtMarker(messages, marker) {
  const i = messages.findIndex((m) => textOf(m).includes(marker));
  if (i < 0) return null;
  const strip = (m) => ({ ...m, content: textOf(m).replace(marker, "").trim() });
  return { prefix: messages.slice(0, i).concat([strip(messages[i])]), tail: messages.slice(i + 1) };
}
export { hash as hashText };
