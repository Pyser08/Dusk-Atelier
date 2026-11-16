// 요약된 옛 대화 빼고 보내기(2.0.1): 장기 기억에 이미 분석된(coveredAt 이하) 옛 대화를 모델 요청 사본에서 뺀다.
// 최근 keepTurns턴(사용자 말 기준)은 언제나 남긴다. 요청 글과 채팅 글을 앞부분으로 맞춰 보고, 못 맞춘 글은 건드리지 않는다(안전).
import { extractMessageText, isUserMessage } from "./chattext.js";

const norm = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const KEY = 48;
const keyOf = (t) => { const n = norm(t); return n.length >= 12 ? n.slice(0, KEY) : null; };

// 묶음 빼기(step): 경계를 step턴마다만 옮긴다 — 그 사이 요청 앞부분이 같아 프롬프트 캐시가 맞는다.
// 최근 keepTurns~keepTurns+step-1턴이 남고, 분석(coveredAt)이 경계에 못 미치면 이전 묶음 경계로 물러난다.
export function trimCovered(reqMsgs, chatMsgs, { keepTurns = 20, step = 1, coveredAt = -1, textOf = extractMessageText } = {}) {
  const same = { messages: reqMsgs, dropped: 0 };
  if (!Array.isArray(reqMsgs) || !Array.isArray(chatMsgs) || !(coveredAt >= 0)) return same;
  const users = []; chatMsgs.forEach((m, i) => { if (isUserMessage(m)) users.push(i); });
  if (users.length <= keepTurns) return same;
  const st = Math.max(1, Math.floor(step) || 1);
  let until;
  if (st === 1) until = Math.min(users[users.length - keepTurns] - 1, coveredAt);
  else {
    let b = Math.floor((users.length - keepTurns) / st) * st;
    while (b > 0 && users[b] - 1 > coveredAt) b -= st;
    until = b > 0 ? users[b] - 1 : -1;
  }
  const cut = users[users.length - keepTurns];          // 이 위치부터는 남긴다
  if (until < 0) return same;
  const want = new Map();                               // 앞부분 → 남은 개수
  for (let i = 0; i <= until; i++) { const k = keyOf(textOf(chatMsgs[i])); if (k) want.set(k, (want.get(k) ?? 0) + 1); }
  if (!want.size) return same;
  const keep = new Set(); for (let i = cut; i < chatMsgs.length; i++) { const k = keyOf(textOf(chatMsgs[i])); if (k) keep.add(k); }   // 최근 글과 같은 앞부분은 빼지 않는다
  let dropped = 0;
  const out = reqMsgs.filter((m) => {
    if (!m || (m.role !== "user" && m.role !== "assistant" && m.role !== "char")) return true;
    const k = keyOf(typeof m.content === "string" ? m.content : textOf(m));
    if (!k || keep.has(k)) return true;
    const n = want.get(k); if (!n) return true;
    want.set(k, n - 1); dropped++; return false;
  });
  return dropped ? { messages: out, dropped } : same;
}
