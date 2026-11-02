// {{user}} = 나(플레이어) (1.8.3, 순수). 분석 결과에서 플레이어를 가리키는 이름을 모두 "{{user}}" 하나로 모은다.
// 리스가 프롬프트의 {{user}}를 페르소나 이름으로 바꿔 보내면 AI가 그 이름(또는 user·유저)으로 적어 같은 사람이 둘로 갈라지기 때문.
export const USER = "{{user}}";
const GENERIC = ["{{user}}", "user", "유저", "플레이어", "player", "{{persona}}"];
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
export function userKeySet(names = []) { return new Set([...GENERIC, ...names].map(key).filter(Boolean)); }
export function normalizeUserNames(result, names = []) {
  if (!result || typeof result !== "object") return result;
  const set = userKeySet(names), fix = (n) => (typeof n === "string" && set.has(key(n)) ? USER : n);
  const arr = (a) => (Array.isArray(a) ? [...new Set(a.map(fix))] : a);
  return {
    ...result,
    ...(Array.isArray(result.people) ? { people: result.people.map((p) => ({ ...p, name: fix(p?.name), ...(p?.know ? { know: arr(p.know) } : {}) })) } : {}),
    ...(Array.isArray(result.rel) ? { rel: result.rel.map((x) => ({ ...x, from: fix(x?.from), to: fix(x?.to) })) } : {}),
    ...(Array.isArray(result.emo) ? { emo: result.emo.map((x) => ({ ...x, from: fix(x?.from), to: fix(x?.to) })) } : {}),
    ...(result.scene?.who ? { scene: { ...result.scene, who: arr(result.scene.who) } } : {})
  };
}
