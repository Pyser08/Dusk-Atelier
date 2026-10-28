// 로어북 부분 다시 쓰기 (v1.6.8, 순수): 고른 글 한 토막만 AI에게 맡기는 요청을 만들고 응답에서 새 글만 뽑는다.
// 항목 전체 JSON을 주고받지 않아서 요청이 작고 빠르다. 앞뒤 글은 맥락으로만 보낸다.
export const CTX_CHARS = 800;

const SYSTEM = `You rewrite one selected passage of a roleplay lorebook entry.
- Rewrite only the passage marked as the target, following the user's request. Keep everything else out of your answer.
- Keep the passage's language, tone, format, and line breaks unless the request says otherwise. Keep {{...}} macros and @@ lines exactly as they are unless the request is about them.
- Use the surrounding text only as context; do not repeat it.
- Answer with the new passage only, wrapped in <rewrite> and </rewrite>. No explanation, no quotes, no code fence.`;

const clip = (s, n, fromEnd) => { s = String(s ?? ""); return s.length <= n ? s : fromEnd ? "…" + s.slice(-n) : s.slice(0, n) + "…"; };

export function partMessages({ text, request, label = "", before = "", after = "" }) {
  const user = [
    label ? `[항목] ${label}` : "",
    before ? `[앞 글(맥락)]\n${clip(before, CTX_CHARS, true)}` : "",
    `[고칠 부분]\n<<<\n${text}\n>>>`,
    after ? `[뒤 글(맥락)]\n${clip(after, CTX_CHARS, false)}` : "",
    `[요청]\n${String(request).trim()}`
  ].filter(Boolean).join("\n\n");
  return [{ role: "system", content: SYSTEM }, { role: "user", content: user }];
}

// 응답에서 새 글만 뽑는다: <rewrite> 태그 → 코드 펜스 → 통째로. 앞뒤 공백은 원래 글의 것을 따른다(줄바꿈이 늘지 않게).
export function cleanPart(raw, original = "") {
  let t = String(raw ?? "");
  const m = t.match(/<rewrite>([\s\S]*?)<\/rewrite>/i) ?? t.match(/<rewrite>([\s\S]*)$/i);
  if (m) t = m[1];
  else {
    const f = t.match(/^\s*```[a-z]*\n([\s\S]*?)\n```\s*$/i);
    if (f) t = f[1];
  }
  t = t.replace(/^\s*<<<\n?/, "").replace(/\n?>>>\s*$/, "");
  const lead = String(original).match(/^\s*/)?.[0] ?? "", trail = String(original).match(/\s*$/)?.[0] ?? "";
  t = t.trim();
  return t ? lead + t + trail : "";
}
