// 내 프롬프트(장기기억 분석 단계)를 플러그인의 모든 AI 호출에 같은 위치(앞·중간·뒤)로 끼운다 (v1.8.1). 순수 함수.
//  앞=시스템 글 맨 앞 · 중간=첫 문단(역할 설명) 뒤 · 뒤=시스템 글 맨 끝. 장기기억 분석은 이미 직접 끼우므로(표식) 건너뛴다.
export const USER_PROMPT_MARK = "[USER ADDED RULES";

export function applyUserPrompts(messages, c) {
  if (!c || !(c.front || c.middle || c.back) || !Array.isArray(messages)) return messages;
  if (messages.some((m) => typeof m?.content === "string" && m.content.includes(USER_PROMPT_MARK))) return messages;
  const out = messages.map((m) => ({ ...m }));
  let i = out.findIndex((m) => m?.role === "system" && typeof m.content === "string");
  if (i < 0) { out.unshift({ role: "system", content: "" }); i = 0; }
  const text = out[i].content, p = text.indexOf("\n\n"), l = text.indexOf("\n"), cut = p >= 0 ? p : l >= 0 ? l : text.length;
  const head = text.slice(0, cut).trim(), rest = text.slice(cut).trim();
  out[i].content = [c.front, head, c.middle, rest, c.back].filter(Boolean).join("\n\n");
  return out;
}
