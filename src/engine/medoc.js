// 장기기억 애드온: ‘나’(페르소나) 위키 문서(순수). 설정 inject.meDoc을 켜면 채팅마다 자동으로 만든다.
// 기록 AI가 나를 대신 쓰거나 움직이지 않게, 리수폿 위키 문서(actor:user 규칙)는 건드리지 않고 장기기억 쪽에만 둔다.
// 내용은 리스 페르소나 이름·설명(AI 호출 없음). 요청에는 넣지 않는다(보기 전용).
export const ME = "{{user}}";
export function ensureMeDoc(folder, { name = "", desc = "", now = Date.now() } = {}) {
  if (!folder || typeof folder !== "object") return false;
  folder.people ??= {};
  let changed = false;
  if (!folder.people[ME]) { folder.people[ME] = { name: ME, aliases: [], pinned: false, records: [] }; changed = true; }
  const n = String(name ?? "").trim().slice(0, 80), d = String(desc ?? "").trim().slice(0, 4000);
  if (!folder.meDoc || folder.meDoc.name !== n || folder.meDoc.desc !== d) { folder.meDoc = { name: n, desc: d, at: now }; changed = true; }
  return changed;
}
export const meVisible = (folder, p) => !!folder?.meDoc && p?.name === ME;
