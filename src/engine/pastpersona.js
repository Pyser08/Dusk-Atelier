// 11-23 장기기억 애드온 전용: 채팅 도중 바꿔서 떼어 둔 옛 페르소나 이름은 {{user}}로 묶지 않는다.
// 코어 usernames.js는 그대로 두고(코어 수정 없이 애드온 배포만으로), 애드온이 이름 목록을 받은 뒤 여기서 거른다. 저장 안 함(턴·관계도에서 그 채팅 폴더 personas로 넣어 줌).
let past = new Set();
const k = (n) => String(n ?? "").trim().toLowerCase();
export function setPastPersonas(names) { past = new Set((names ?? []).map(k).filter(Boolean)); }
export const withoutPast = (list) => (list ?? []).filter((n) => !past.has(k(n)));
