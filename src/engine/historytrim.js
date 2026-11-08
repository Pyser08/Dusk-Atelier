// 요약된 옛 대화 빼고 보내기(2.0.1): 장기 기억에 이미 분석된(coveredAt 이하) 옛 대화를 모델 요청 사본에서 뺀다.
// 최근 keepTurns턴(사용자 말 기준)은 언제나 남긴다. 요청 글과 채팅 글을 앞부분으로 맞춰 보고, 못 맞춘 글은 건드리지 않는다(안전).
import { extractMessageText, isUserMessage } from "./chattext.js";

const norm = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const KEY = 48;
const keyOf = (t) => { const n = norm(t); return n.length >= 12 ? n.slice(0, KEY) : null; };

export function trimCovered(reqMsgs, chatMsgs, { keepTurns = 20, coveredAt = -1, textOf = extractMessageText } = {}) {
  const same = { messages: reqMsgs, dropped: 0 };
  if (!Array.isArray(reqMsgs) || !Array.isArray(chatMsgs) || !(coveredAt >= 0)) return same;
  const users = []; chatMsgs.forEach((m, i) => { if (isUserMessage(m)) users.push(i); });
  if (users.length <= keepTurns) return same;
  const cut = users[users.length - keepTurns];          // 이 위치부터는 남긴다
  const until = Math.min(cut - 1, coveredAt);           // 이 위치까지(포함)만 뺄 수 있다
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
