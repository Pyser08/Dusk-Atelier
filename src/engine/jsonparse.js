// 모델 응답에서 JSON 객체를 꺼낸다(코드 펜스·끝 쉼표·잘린 응답 복구). 코어(카드 생성)와 기억 애드온이 같이 쓴다.
// 잘린 JSON 끝을 닫는다(문자열·괄호). 마지막 쉼표 쪽으로 물러서며 해석되는 지점을 찾는다.
function closeTail(s) {
  const st = []; let inStr = false, esc = false;
  for (const ch of s) {
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === "{" || ch === "[") st.push(ch); else if (ch === "}" || ch === "]") st.pop();
  }
  return s + (inStr ? '"' : "") + st.reverse().map((c) => (c === "{" ? "}" : "]")).join("");
}
function salvage(s) {
  for (let i = 0; i < 60 && s; i++) {
    try { return JSON.parse(closeTail(s)); } catch { /* 더 물러선다 */ }
    const k = s.lastIndexOf(",");
    if (k < 0) break;
    s = s.slice(0, k);
  }
  return null;
}
export const looksLikeAnalysis = (o) => o && typeof o === "object" && !Array.isArray(o) && (Array.isArray(o.people) || (o.scene && typeof o.scene === "object"));
export function parseJson(raw) {
  const s = String(raw ?? "").replace(/```(?:json)?/gi, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0) throw new Error("JSON 객체를 찾을 수 없어요.");
  if (b > a) {
    const body = s.slice(a, b + 1);
    try { return JSON.parse(body); } catch { /* 아래에서 고쳐 본다 */ }
    try { return JSON.parse(body.replace(/,\s*([}\]])/g, "$1")); } catch { /* 잘렸을 수 있다 */ }
  }
  const rest = salvage(s.slice(a));   // 토큰이 모자라 잘린 응답: people·scene이 살아 있을 때만 쓴다
  if (looksLikeAnalysis(rest)) return rest;
  throw new Error("JSON을 해석할 수 없어요.");
}

