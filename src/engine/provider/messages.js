// 대화 정규화 (v1.9.3, 순수): 리스 prompt_chat → 공급자별 메시지. 역할 병합·시작 역할·시스템 분리.
const ROLE = { char: "assistant", model: "assistant", assistant: "assistant", user: "user", system: "system", function: "user" };
export function normalize(list) {
  const out = [];
  for (const m of list ?? []) {
    if (!m) continue;
    const role = ROLE[m.role] ?? "user";
    const text = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("") : String(m.content ?? "");
    const images = (m.multimodals ?? []).filter((x) => x?.type === "image" && typeof x.base64 === "string").map((x) => { const mm = /^data:([^;]+);base64,(.*)$/s.exec(x.base64); return mm ? { mime: mm[1], data: mm[2] } : { mime: "image/png", data: x.base64 }; });
    if (!text && !images.length) continue;
    out.push({ role, text, images });
  }
  return out;
}
// 같은 역할이 이어지면 합친다(공급자 대부분이 교대를 요구)
export function mergeSame(msgs, sep = "\n\n") {
  const out = [];
  for (const m of msgs) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) { last.text = [last.text, m.text].filter(Boolean).join(sep); last.images = [...last.images, ...m.images]; }
    else out.push({ ...m, images: [...m.images] });
  }
  return out;
}
// 맨 앞 시스템 묶음 분리. 중간 시스템은 사용자 말로 바꾼다(교대 규칙 유지)
export function splitSystem(msgs) {
  let i = 0; const system = [];
  while (i < msgs.length && msgs[i].role === "system") system.push(msgs[i++].text);
  const rest = msgs.slice(i).map((m) => (m.role === "system" ? { ...m, role: "user", text: `[System]\n${m.text}` } : m));
  return { system, rest };
}
export function startWithUser(msgs, filler = "(계속)") { return msgs.length && msgs[0].role !== "user" ? [{ role: "user", text: filler, images: [] }, ...msgs] : msgs; }
// 프리필: 끝이 어시스턴트면 이어쓰기 말머리로 쓴다
export const prefillOf = (msgs) => (msgs.length && msgs[msgs.length - 1].role === "assistant" ? msgs[msgs.length - 1].text : "");
// 토큰 어림(글자 수 기반, 한글·기호 가중). 정확한 값이 필요 없는 표시용.
export function estimateTokens(text) { let n = 0; for (const ch of String(text ?? "")) n += ch.charCodeAt(0) > 0x2e80 ? 1 : 0.28; return Math.ceil(n); }
