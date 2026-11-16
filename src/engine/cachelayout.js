// 캐시용 프롬프트 배치 (순수, 2.2.6): 매 턴 바뀌는 글을 캐시 앞부분 밖(마지막 사용자 말 근처)으로 옮긴다.
// · 하이파 분리: <Past Events Summary> 안의 하이파 V3 요약 중 연관(Similar)·랜덤(Random)으로만 뽑힌 것은 매 턴 바뀐다 →
//   중요·최근(Important·Recent)은 제자리에 두고, 나머지는 마지막 사용자 말 바로 앞 블록으로 옮긴다.
// · 이어붙이기(선택): 키워드로 켜진 로어북 본문과 하이파 연관·랜덤을 '이번 턴 참고' 블록으로 묶어 마지막 사용자 말 뒤에 붙인다.
//   매 턴 바뀌는 시스템 블록도 뒤로 옮겨, 지난 요청 전체가 다음 요청 앞부분과 같아지게 한다(자동 캐시만 되는 모델용).
import { moveVolatileAfterUser } from "./provider/gemplan.js";
export const PES = /<Past Events Summary>([\s\S]*?)<\/Past Events Summary>/;
export const HYPA_MARK = "[Dusk · relevant past for this turn]", REF_MARK = "[Dusk · reference for this turn — background only, not part of the story so far]";
const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("") : String(c ?? "");
const idx = (a, n) => (Array.isArray(a) ? a.filter((i) => Number.isInteger(i) && i >= 0 && i < n) : null);
const lastUser = (list) => { for (let i = list.length - 1; i >= 0; i--) if (list[i]?.role === "user") return i; return -1; };

// 하이파 V3 데이터 → 매 턴 바뀌는 요약 글(연관·랜덤에만 든 것). 지표가 없으면 [].
export function dynamicHypa(data) {
  const s = Array.isArray(data?.summaries) ? data.summaries : [], m = data?.metrics ?? {}, n = s.length;
  const imp = idx(m.lastImportantSummaries, n), rec = idx(m.lastRecentSummaries, n), sim = idx(m.lastSimilarSummaries, n), rnd = idx(m.lastRandomSummaries, n);
  if (!imp || !rec || !sim || !rnd) return [];
  const keep = new Set([...imp, ...rec]);
  return [...new Set([...sim, ...rnd])].filter((i) => !keep.has(i)).sort((a, b) => a - b).map((i) => String(s[i]?.text ?? "").trim()).filter(Boolean);
}
// <Past Events Summary> 블록이 정확히 하나일 때만 그 안에서 글을 뺀다. 반환 {messages, moved:[글]}
function pullFromSummary(list, texts) {
  if (!texts.length) return { messages: list, moved: [] };
  const at = list.map((m, i) => (PES.test(textOf(m?.content)) ? i : -1)).filter((i) => i >= 0);
  if (at.length !== 1) return { messages: list, moved: [] };
  const i = at[0], m = list[i]; let body = textOf(m.content); const moved = [];
  body = body.replace(PES, (all, inner) => { let x = inner; for (const t of texts) if (x.includes(t)) { x = x.replace(t, ""); moved.push(t); } return `<Past Events Summary>${x.replace(/\n{3,}/g, "\n\n")}</Past Events Summary>`; });
  if (!moved.length) return { messages: list, moved };
  const out = list.slice(); out[i] = { ...m, content: body }; return { messages: out, moved };
}
const done = (list) => list.some((m) => m?.role === "system" && (textOf(m.content).startsWith(HYPA_MARK) || textOf(m.content).startsWith(REF_MARK)));   // 이미 옮긴 요청(다시 불림)은 그대로

// 하이파 분리만: 옮긴 요약은 마지막 사용자 말 바로 앞(캐시 경계 밖)
export function splitHypa(messages, hypaData) {
  const list = Array.isArray(messages) ? messages : []; if (done(list)) return { messages: list, moved: 0 };
  const r = pullFromSummary(list, dynamicHypa(hypaData)); if (!r.moved.length) return { messages: list, moved: 0 };
  const u = lastUser(r.messages), at = u < 0 ? r.messages.length : u;
  return { messages: [...r.messages.slice(0, at), { role: "system", content: `${HYPA_MARK}\n${r.moved.join("\n\n")}` }, ...r.messages.slice(at)], moved: r.moved.length };
}
// 이어붙이기: 키워드 로어북 본문(채팅 앞 시스템 글에서 찾은 것)과 하이파 연관·랜덤을 마지막 사용자 말 뒤 참고 블록으로
export function appendLayout(messages, { keywordLore = [], hypaData = null } = {}) {
  if (done(Array.isArray(messages) ? messages : [])) return { messages, lore: 0, moved: 0 };
  let list = moveVolatileAfterUser(Array.isArray(messages) ? messages : []);
  const h = pullFromSummary(list, dynamicHypa(hypaData)); list = h.messages;
  const firstChat = list.findIndex((m) => m?.role === "user" || m?.role === "assistant"), end = firstChat < 0 ? list.length : firstChat, lore = [];
  const bodies = [...new Set(keywordLore.map((t) => String(t ?? "").trim()).filter((t) => t.length >= 12))];
  list = list.map((m, i) => {
    if (i >= end || m?.role !== "system" || typeof m.content !== "string") return m;
    let c = m.content; for (const b of bodies) if (c.includes(b)) { c = c.replace(b, ""); if (!lore.includes(b)) lore.push(b); }
    return c === m.content ? m : { ...m, content: c.replace(/\n{3,}/g, "\n\n") };
  }).filter((m) => !(m?.role === "system" && typeof m.content === "string" && !m.content.trim()));
  if (!lore.length && !h.moved.length) return { messages: list, lore: 0, moved: 0 };
  const u = lastUser(list), at = u < 0 ? list.length : u + 1;
  const ref = [REF_MARK, ...lore, ...(h.moved.length ? ["Relevant past events:", ...h.moved] : [])].join("\n\n");
  return { messages: [...list.slice(0, at), { role: "system", content: ref }, ...list.slice(at)], lore: lore.length, moved: h.moved.length };
}
