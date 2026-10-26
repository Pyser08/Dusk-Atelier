// 공통 채팅 텍스트 처리. 장기기억에서 사용한다.
const txt = (v) => typeof v === "string" ? v : Array.isArray(v) ? v.map((p) => typeof p === "string" ? p : txt(p?.text ?? p?.data ?? p?.content ?? "")).join("\n") : v && typeof v === "object" ? txt(v.text ?? v.data ?? v.content ?? v.mes ?? v.message ?? "") : String(v ?? "");
const MARK_PATTERN = /⟦(?:C:|\\/C|S⟧|\\/S|T:)/;
export const extractMessageText = (m) => {
  const values = [m?.data, m?.content, m?.text, m?.mes, m?.message].map(txt);
  return values.find((v) => MARK_PATTERN.test(v)) ?? values.find((v) => v.trim()) ?? "";
};
export const isUserMessage = (m) => m?.role === "user" || m?.isUser === true || m?.is_user === true || m?.type === "user" || m?.role === "human";
export function stripMarksForPrompt(text, { keepTime = false } = {}) {
  let s = String(text ?? "").replace(/⟦C:[^⟧]+⟧|⟦\\/C⟧|⟦S⟧|⟦\\/S⟧/g, "");
  const time = /⟦T:([^⟧]*)⟧/g;
  const ts = [...s.matchAll(time)];
  if (ts.length > 1) {
    const last = ts.at(-1)[0]; let done = false;
    s = s.replace(time, (m) => { if (!done && m === last) { done = true; return m; } return ""; });
  }
  return keepTime ? s : s.replace(time, "");
}
