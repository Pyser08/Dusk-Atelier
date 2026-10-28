// 인물 위키 화면이 쓰는 순수 함수: 빈 인물 만들기 · 문서 관리(이름·별칭·태그·연결 문서) · 인물 삭제 · 기본 성격 직접 고치기 · 새 수치 지정.
// 검증은 리수폿 엔진(wiki-schema · people-profile · people-records)이 그대로 한다. 여기서는 입력을 묶어 넘기기만 한다.
import { createWikiDocument, updateWikiDocument, deleteWikiDocument, normalizeWikiScope, makeWikiId } from "./pot/wiki-schema.js";
import { normalizePeopleState, updatePersonProfile, deletePersonProfile } from "./pot/people-profile.js";
import { updatePersonMetric } from "./pot/people-records.js";
import { scopeKeyOf } from "./personedit.js";

const clone = (v) => JSON.parse(JSON.stringify(v));
export const PROFILE_FIELDS = ["summary", "coreTraits", "values", "emotionExpression", "defenseResponse", "intimacyStyle"];
export const PROFILE_AXES = ["relationalInitiative", "expressionDirectness", "emotionalExpressiveness", "guardedness", "impulsivity", "relationshipPersistence"];
export const listOf = (text) => [...new Set(String(text ?? "").split(/[,\n#]/).map((s) => s.trim()).filter(Boolean))];

// 빈 인물 문서 하나. 이름이 겹치면 거절한다.
export function createBlankPerson(scope, name, { now = new Date().toISOString() } = {}) {
  const title = String(name ?? "").trim();
  if (!title) throw new Error("이름을 적어 주세요.");
  const cur = normalizeWikiScope(scope);
  if (Object.values(cur.documents).some((d) => d.type === "Character" && String(d.title).trim().toLowerCase() === title.toLowerCase())) throw new Error("같은 이름의 인물이 이미 있어요.");
  return createWikiDocument(cur, { type: "Character", title, aliases: [], tags: [], links: [], sections: [], metrics: [] }, { now });
}

// 문서 관리: 이름·별칭·태그·연결 문서. 절·수치는 그대로 넘긴다.
export function editDocMeta(scope, docId, { title, aliases, tags, links }, { now = new Date().toISOString() } = {}) {
  const doc = normalizeWikiScope(scope).documents[docId];
  if (!doc || doc.type !== "Character") throw new Error("고칠 인물을 찾지 못했어요.");
  const t = String(title ?? "").trim();
  if (!t) throw new Error("이름은 비울 수 없어요.");
  return updateWikiDocument(scope, docId, { type: doc.type, title: t, aliases: aliases ?? doc.aliases, tags: tags ?? doc.tags, links: links ?? doc.links, sections: doc.sections, metrics: doc.metrics }, { now });
}

// 인물 삭제: 프로필(있으면)과 문서를 함께 지운다. 고정핀이 남아 있으면 엔진이 거절한다.
export function removePerson(scope, docId, { now = new Date().toISOString() } = {}) {
  let next = scope;
  if (next?.people?.profiles?.[docId]) next = deletePersonProfile(next, docId, { now }).scope;
  return deleteWikiDocument(next, docId, { now });
}

// 기본 성격 칸이 아직 없으면 빈 프로필을 만든다(직접 쓰거나 AI가 채운다).
export function ensureProfile(scope, docId, { now = new Date().toISOString() } = {}) {
  const doc = scope?.documents?.[docId];
  if (!doc || doc.type !== "Character") throw new Error("인물을 찾지 못했어요.");
  if (scope.people?.profiles?.[docId]) return scope;
  const next = clone(scope), people = normalizePeopleState(next.people);
  people.profiles[docId] = { documentId: docId, name: doc.title, summary: "", coreTraits: [], values: [], emotionExpression: "", defenseResponse: "", intimacyStyle: "", axes: {}, longTermPatterns: [], sourceRefs: [], manualEdited: true, createdAt: now, updatedAt: now };
  next.people = normalizePeopleState(people);
  next.revision = (next.revision ?? 0) + 1;
  if (next.scope) next.scope.updatedAt = now;
  return next;
}

// 기본 성격의 글·기질·가치·축을 한 번에 고친다. patch에 없는 값은 그대로 둔다. 고정된 칸은 엔진이 지킨다.
export function editProfile(scope, docId, patch, { now = new Date().toISOString() } = {}) {
  const cur = scope?.people?.profiles?.[docId];
  if (!cur) throw new Error("기본 성격이 아직 없어요.");
  const input = {};
  for (const k of PROFILE_FIELDS) input[k] = patch[k] !== undefined ? patch[k] : cur[k];
  input.axes = { ...cur.axes, ...(patch.axes ?? {}) };
  return updatePersonProfile(scope, docId, input, { now });
}

// 아직 없는 수치(호감도·첫인상·음란도·의심도)를 직접 지정한다. policy는 슬롯 정책.
export function addMetric(scope, docId, { slotId, targetRefs, value, reason }, policy, { now = new Date().toISOString() } = {}) {
  return updatePersonMetric(scope, docId, { id: makeWikiId("metric"), slotId, targetRefs, value, reason: String(reason ?? "").trim() || "사용자 직접 지정", expected: null, scopeKey: scopeKeyOf(scope), isNew: true }, policy, { now });
}
