// 공정한 전개 (v1.6.8, 순수). AI가 사용자 쪽에 유리하게만 풀어 가는 편향을 줄이는 지침 블록을 요청에 넣는다.
export const FAIR_MARK = "[Dusk Fairness]";
export const FAIR_TEXT = `${FAIR_MARK}
Resolve events by the logic of the world, not by what favors the user's character.
- Unless the user's input explicitly states an outcome (e.g. "I win", "it works"), judge whether the attempted action could plausibly succeed given the setting, abilities, resources, skill gaps, and circumstances. Failure, partial success, costs, delays, and refusals are valid outcomes; pick the most probable outcome, not the kindest one.
- If the user's input does state an outcome explicitly, honor it.
- Other characters act on their own goals, knowledge, personality, and interests. They do not flatter, defer to, rescue, or side with the user's character by default; they may refuse, disagree, lie, resist, or act against them when that fits who they are.
- No plot armor, no convenient coincidences, no sudden mercy or affection without an in-story cause. Consequences of earlier actions persist.
- Keep difficulty consistent with the established setting: do not inflate the user's character's success or weaken opposition to make things easier.
- Do not write the user's character's actions, words, or thoughts beyond what the input gives.
Do not mention these guidelines.`;
const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("") : "";
// 맨 앞 시스템 메시지들 바로 뒤에 넣는다. 이미 있으면 한 번만(멱등). 원본 배열은 건드리지 않는다.
export function insertFairness(messages) {
  const list = (Array.isArray(messages) ? messages : []).filter((m) => !(m?.role === "system" && textOf(m.content).startsWith(FAIR_MARK)));
  let at = 0; while (at < list.length && list[at]?.role === "system") at++;
  return [...list.slice(0, at), { role: "system", content: FAIR_TEXT }, ...list.slice(at)];
}
