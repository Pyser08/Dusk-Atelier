// 훅 (2.0.0, 순수): 모델별 요청 전(글 바꾸기)·응답 후(글 바꾸기) 처리. 정규식 찾아 바꾸기만 — 코드는 실행하지 않는다.
const FLAGS = (f) => String(f ?? "g").replace(/[^gimsu]/g, "") || "g";
const part = (p) => ({ find: String(p?.find ?? "").slice(0, 300), replace: String(p?.replace ?? "").slice(0, 2000), flags: FLAGS(p?.flags) });
export function normalizeHook(h) {
  return { id: String(h?.id || Math.random().toString(36).slice(2, 10)), name: String(h?.name ?? "훅").slice(0, 40) || "훅", enabled: h?.enabled !== false, modelRegex: String(h?.modelRegex ?? "").slice(0, 200), pre: part(h?.pre), post: part(h?.post) };
}
const forModel = (hooks, model) => (hooks ?? []).filter((h) => { if (!h.enabled) return false; if (!h.modelRegex) return true; try { return new RegExp(h.modelRegex, "i").test(model); } catch { return false; } });
const run = (text, p) => { if (!p.find || text.length > 400000) return text; try { return text.replace(new RegExp(p.find, p.flags), p.replace); } catch { return text; } };
const textOf = (c) => (typeof c === "string" ? c : null);
export function applyPre(messages, hooks, model) {
  const hs = forModel(hooks, model).filter((h) => h.pre.find); if (!hs.length) return messages;
  return messages.map((m) => { const t = textOf(m.content); if (t === null) return m; let x = t; for (const h of hs) x = run(x, h.pre); return x === t ? m : { ...m, content: x }; });
}
export function applyPost(text, hooks, model) { let x = String(text ?? ""); for (const h of forModel(hooks, model)) if (h.post.find) x = run(x, h.post); return x; }
export const hasPost = (hooks, model) => forModel(hooks, model).some((h) => h.post.find);
