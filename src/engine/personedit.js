// 인물 페이지에서 바로 고치는 순수 함수(v1.6.4 ③): ✎ 직접 수정 · 📌 고정 · ⏸ 이 인물만 기록 쉬기.
// 위키 범위(scope)는 리수폿 규칙 그대로 검증한다 — 고정된 항목은 고칠 수 없고, 편집 중 바뀐 항목은 거절한다.
import { updatePersonSection } from "./pot/people-records.js";
import { setPeopleItemPin, peopleItemPinned } from "./pot/people-pins.js";

export const scopeKeyOf = (scope) => `${scope?.scope?.characterId}\n${scope?.scope?.chatKey}`;

// 절 하나의 본문을 고친다. 반환: 새 범위
export function editSectionText(scope, docId, sectionId, text) {
  const sec = scope?.documents?.[docId]?.sections?.find((s) => s.id === sectionId);
  if (!sec) throw new Error("고칠 항목을 찾지 못했어요.");
  return updatePersonSection(scope, docId, { id: sectionId, title: sec.heading, text: String(text ?? ""), expected: JSON.stringify(sec), scopeKey: scopeKeyOf(scope) });
}
export const setPin = (scope, docId, key, on) => setPeopleItemPin(scope, docId, key, on);
export const isPinned = (scope, docId, key) => peopleItemPinned(scope, docId, key);
export const sectionPinKey = (id) => `section:${id}`;
export const metricPinKey = (id) => `metric:${id}`;

// ⏸ 이 인물만 기록 쉬기: 봇의 제외 이름 목록에 이름·별칭을 넣거나 뺀다. 이미 쌓인 기록은 그대로다.
const norm = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
export const isPaused = (ignore, person) => [person?.name, ...(person?.aliases ?? [])].some((n) => (ignore ?? []).some((x) => norm(x) === norm(n)));
export function setPaused(ignore, person, on) {
  const names = [person?.name, ...(person?.aliases ?? [])].filter(Boolean), keys = new Set(names.map(norm));
  const rest = (ignore ?? []).filter((x) => !keys.has(norm(x)));
  return on ? [...rest, person.name] : rest;
}
