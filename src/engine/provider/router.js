// 라우터 (2.0.0, 순수): 요청이 조건에 맞으면 그 프로필로 보낸다. 용도·봇별 프로필 위에 얹는 규칙 한 겹.
// 조건: 용도 · 글자 수(이상·이하) · 들어 있는 글(쉼표로 여럿, 하나라도 있으면). 위에서부터 첫 일치. 없으면 ""(기본 규칙을 따름).
// 라우터 규칙의 짜임은 Yumi Provider Manager v1.19.3(원작자 허락)의 라우팅을 참고했어요.
import { PURPOSES } from "./catalog.js";
const num = (v) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Math.floor(Number(v)));
export function normalizeRouteRule(r) {
  return { id: String(r?.id || Math.random().toString(36).slice(2, 10)), name: String(r?.name ?? "규칙").slice(0, 40) || "규칙", enabled: r?.enabled !== false,
    purposes: Array.isArray(r?.purposes) ? r.purposes.filter((p) => PURPOSES.includes(p)) : [], minChars: num(r?.minChars), maxChars: num(r?.maxChars), contains: String(r?.contains ?? "").slice(0, 400), profileId: String(r?.profileId ?? "") };
}
const textOf = (m) => (typeof m?.content === "string" ? m.content : Array.isArray(m?.content) ? m.content.map((x) => x?.text ?? "").join("") : "");
export function pickByRules(router, { purpose = "main", messages = [] } = {}) {
  if (!router?.enabled) return "";
  const all = messages.map(textOf).join("\n"), len = all.length, words = (r) => r.contains.split(",").map((x) => x.trim()).filter(Boolean);
  for (const r of router.rules ?? []) {
    if (!r.enabled || !r.profileId) continue;
    if (r.purposes.length && !r.purposes.includes(purpose)) continue;
    if (r.minChars !== null && len < r.minChars) continue;
    if (r.maxChars !== null && len > r.maxChars) continue;
    const w = words(r); if (w.length && !w.some((x) => all.includes(x))) continue;
    if (r.minChars === null && r.maxChars === null && !w.length) continue;   // 조건이 하나도 없는 규칙은 쓰지 않는다(실수로 전부 가로채지 않게)
    return r.profileId;
  }
  return "";
}
