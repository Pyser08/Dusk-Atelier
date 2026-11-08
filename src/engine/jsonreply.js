// 모델 응답 → 완성된 JSON 글만 남기기(순수). 리수폿 인물 도구(수치 AI·직접 지시·인물 새로고침·필드 작성)는 응답 전체를 JSON.parse해서
// 생각 글(<think>…)·앞뒤 설명·끝의 쉼표 하나만 있어도 "완성된 JSON을 읽지 못했습니다"로 실패했다. 고칠 수 있으면 고친 글을, 못 고치면 원문을 돌려준다.
const tryParse = (t) => { try { JSON.parse(t); return true; } catch { return false; } };
function balanced(s, start) {
  const open = s[start], close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return s.slice(start, i + 1);
  }
  return null;
}
export function cleanJsonReply(raw) {
  const text = String(raw ?? "");
  const t = text.trim();
  if (!t || tryParse(t)) return text;
  const body = t.replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, "").replace(/^[\s\S]*?<\/(think|thinking)>/i, "").trim();
  const cands = [];
  for (const m of body.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) cands.push(m[1].trim());
  cands.push(body);
  for (const c of cands) {
    if (tryParse(c)) return c;
    for (let i = 0; i < c.length; i++) {
      if (c[i] !== "{" && c[i] !== "[") continue;
      const seg = balanced(c, i); if (!seg) continue;
      if (tryParse(seg)) return seg;
      const fixed = seg.replace(/,\s*([}\]])/g, "$1");
      if (tryParse(fixed)) return fixed;
      if (c[i] === "{") break;   // 가장 바깥 객체 하나만 본다(안쪽 조각을 정답으로 착각하지 않게)
    }
  }
  return text;
}
