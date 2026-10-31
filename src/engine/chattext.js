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

// 예전 데이터 호환용 해시: 기존 버전은 정규화한 본문 앞 200자만 사용했다.
export function hashText(text, len = 200) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, len);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

// 본문 전체를 훑는 64비트(두 개의 32비트 해시 결합) 해시.
// 암호학적 용도가 아니라 대화 메시지를 구별하기 위한 값이다.
export function fullTextHash(text) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a ^= c; a = Math.imul(a, 0x01000193) >>> 0;
    b ^= c; b = Math.imul(b, 0x01000193) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

// 실제 메시지 ID가 있으면 본문 전체 해시와 함께 식별한다.
// chatId가 없는 오래된/가져온 메시지는 본문 전체 해시만 사용한다.
export const messageIdOf = (m) => typeof m?.chatId === "string" && m.chatId && !m.chatId.startsWith("inherited:") ? m.chatId : null;
export const messageIdentity = (m) => {
  const mid = messageIdOf(m);
  return `${mid ? `mid:${mid}:` : "body:"}${fullTextHash(extractMessageText(m))}`;
};
export const legacyMessageHash = (m) => hashText(extractMessageText(m));
export const snippet = (text, n = 80) => { const s = String(text ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

// safety.js의 isGenerating과 같은 판정(그 파일은 TS 모듈을 끌어와 테스트에서 못 쓴다).
export const isChatGenerating = (ch) => (ch?.chats ?? []).some((c) => c?.isStreaming === true || c?.message?.at?.(-1)?.isStreaming === true || c?.message?.at?.(-1)?.streaming === true);
