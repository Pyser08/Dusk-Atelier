// 11-23 장기기억 애드온 전용: 채팅 도중 바꿔서 떼어 둔 옛 페르소나 이름은 {{user}}로 묶지 않는다.
// 코어 usernames.js는 그대로 두고(코어 수정 없이 애드온 배포만으로), 애드온이 이름 목록을 받은 뒤 여기서 거른다. 저장 안 함(턴·관계도에서 그 채팅 폴더 personas로 넣어 줌).
let past = new Set();
const k = (n) => String(n ?? "").trim().toLowerCase();
export function setPastPersonas(names) { past = new Set((names ?? []).map(k).filter(Boolean)); }
export const withoutPast = (list) => (list ?? []).filter((n) => !past.has(k(n)));
// 신고 #22: 리스의 '모든 페르소나 이름'을 나로 묶으면, NPC와 같은 이름의 페르소나(예: 분기 채팅에서 잠깐 쓴 것)가 있을 때
// 그 NPC 기록이 '나'로 합쳐졌다. 장기기억은 지금 고른 페르소나·username(과 여러 단어 이름의 첫 단어)만 나로 본다.
export function liveUserNames(db) {
  const out = [], ok = (n) => typeof n === "string" && n.trim().length >= 1;
  const add = (n) => { if (ok(n) && !out.some((x) => k(x) === k(n))) out.push(n.trim()); };
  const list = Array.isArray(db?.personas) ? db.personas : [];
  add(db?.username); add(list[db?.selectedPersona ?? 0]?.name);
  for (const n of [...out]) { const w = n.split(/\s+/); if (w.length > 1 && w[0].length >= 2) add(w[0]); }
  return withoutPast(out);
}
