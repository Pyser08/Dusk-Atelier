// 채팅 메시지 텍스트 공통 처리 (장기기억용).
const txt = (v) => typeof v === "string" ? v : Array.isArray(v) ? v.map((p) => typeof p === "string" ? p : txt(p?.text ?? p?.data ?? p?.content ?? "")).join("\n") : v && typeof v === "object" ? txt(v.text ?? v.data ?? v.content ?? v.mes ?? v.message ?? "") : String(v ?? "");

export const extractMessageText = (m) => [m?.data, m?.content, m?.text, m?.mes, m?.message].map(txt).find((v) => v.trim()) ?? "";
export const isUserMessage = (m) => m?.role === "user" || m?.isUser === true || m?.is_user === true || m?.type === "user" || m?.role === "human";

// 확정된 AI 응답의 위치: 마지막 사용자 메시지 바로 앞의 (비어 있지 않은) AI 응답. 없으면 -1.
// 사용자가 다음 말을 보냈다는 건 직전 응답을 받아들였다는 뜻이라, 그 응답은 더 리롤되지 않는다.
export function confirmedAiIndex(messages) {
  const list = messages ?? []; let u = -1;
  for (let i = list.length - 1; i >= 0; i--) if (isUserMessage(list[i])) { u = i; break; }
  for (let i = u - 1; i >= 0; i--) if (!isUserMessage(list[i]) && extractMessageText(list[i]).trim()) return i;
  return -1;
}

// 앵커용 짧은 해시 (본문 앞 200자, 비암호용 FNV-1a 32비트).
export function hashText(text, len = 200) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, len);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
export const snippet = (text, n = 80) => { const s = String(text ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

// safety.js의 isGenerating과 같은 판정(그 파일은 TS 모듈을 끌어와 테스트에서 못 쓴다).
export const isChatGenerating = (ch) => (ch?.chats ?? []).some((c) => c?.isStreaming === true || c?.message?.at?.(-1)?.isStreaming === true || c?.message?.at?.(-1)?.streaming === true);
