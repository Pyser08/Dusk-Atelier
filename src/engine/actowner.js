// 장기기억 애드온: 남의 행동을 이 인물의 기억으로 적은 것 거르기(순수). 11-22 제보 — 관여하지 않은 다른 주요 인물의 행동이 내 캐릭터 기억에 쌓였다.
// 기록기 지시문(코어 공유)은 그대로 두고 반영 단계에서 거른다: 다른 인물이 주어(이/가/은/는/께서)로 시작하고, 이 인물의 이름이 글에 없으면 남의 행동.
const k = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function othersAct(e, names = [], selfAliases = []) {
  const act = String(e?.act ?? "").trim(); if (!act) return false;
  const self = [e.name, ...selfAliases].filter((n) => typeof n === "string" && n.trim().length >= 2 && !/^\{\{user\}\}$/i.test(n));
  if (self.some((n) => k(act).includes(k(n)))) return false;
  if (/(^|[^가-힣])(나|내가|나는|나를|나에게|저|제가)([^가-힣]|$)/.test(act) && /^\{\{user\}\}$/i.test(e.name ?? "")) return false;
  const others = names.filter((n) => typeof n === "string" && n.trim().length >= 2 && k(n) !== k(e.name) && !self.some((s) => k(s) === k(n)) && !/^\{\{user\}\}$/i.test(n));
  return others.some((n) => new RegExp(`^${esc(n.trim())}\\s*(이|가|은|는|께서|도)(\\s|$)`).test(act));
}
