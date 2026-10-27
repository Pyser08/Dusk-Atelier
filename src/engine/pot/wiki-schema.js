// 출처: risupot 2.3.0 src/wiki-schema.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { normalizeIdentityRedirects } from './identity-links.js';
import { coalesceNpcEmotionUpdates } from './npc-emotion-upsert.js';
import { normalizePeopleLayout } from './people-folders.js';
import { emptyPeopleState, normalizePeopleState } from './people-profile.js';
import { RELATIONSHIP_HISTORY_MAX, normalizeRelationshipHistory, preserveRelationshipHistory, relationshipHistoryLimit } from './relationship-history.js';
import { WIKI_RETENTION_MAX, normalizeWikiRetention } from './wiki-retention.js';
import { validateWriterReceipts } from '../../data/pot/writer-receipts.js';

const WIKI_SCHEMA_VERSION = 1;
const WIKI_TYPES = ['Character', 'Event', 'Scene', 'Location', 'Faction', 'Item', 'Concept', 'Other'];
export const WIKI_LIMITS = { documents: 500, bodyChars: 100000, titleChars: 120, listItems: 64, listItemChars: 80, sections: 128, metrics: 64, metricContributions: 64, links: 128, history: 60 };

const cloneWiki = value => JSON.parse(JSON.stringify(value));
const wikiRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const forbiddenWikiKeys = new Set(['__proto__', 'constructor', 'prototype']);
export class WikiValidationError extends Error { constructor(message) { super(message); this.name = 'WikiValidationError'; this.code = 'invalid-wiki'; } }
const wikiAssert = (condition, message) => { if (!condition) throw new WikiValidationError(message); };

export function assertSafeWikiData(value, depth = 0, seen = new Set()) {
  wikiAssert(depth <= 80, 'Wiki 데이터 중첩이 너무 깊습니다.');
  if (typeof value === 'number') wikiAssert(Number.isFinite(value), 'Wiki 숫자는 유한해야 합니다.');
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;
  wikiAssert(typeof value === 'object' && !seen.has(value), '일반 JSON Wiki 데이터만 사용할 수 있습니다.');
  const proto = Object.getPrototypeOf(value);
  wikiAssert(Array.isArray(value) || proto === Object.prototype || proto === null, '일반 JSON Wiki 객체만 사용할 수 있습니다.');
  seen.add(value);
  for (const key of Object.keys(value)) { wikiAssert(!forbiddenWikiKeys.has(key), 'Wiki에 허용되지 않는 객체 키가 있습니다.'); assertSafeWikiData(value[key], depth + 1, seen); }
  seen.delete(value);
}
export function makeWikiId(prefix = 'wiki') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
const textValue = (value, label, maximum, required = false) => {
  wikiAssert(typeof value === 'string', `${label}은(는) 문자열이어야 합니다.`);
  const text = value.normalize('NFC').trim();
  wikiAssert(!required || text.length > 0, `${label}을(를) 입력해주세요.`);
  wikiAssert(text.length <= maximum, `${label}은(는) ${maximum}자 이하여야 합니다.`);
  return text;
};
function uniqueTextList(value, label, maximumItems, maximumChars = WIKI_LIMITS.listItemChars) {
  wikiAssert(Array.isArray(value), `${label} 목록이 필요합니다.`);
  wikiAssert(value.length <= maximumItems, `${label}은(는) ${maximumItems}개 이하여야 합니다.`);
  const result = [], seen = new Set();
  for (const item of value) {
    const text = textValue(item, label, maximumChars);
    if (!text) continue;
    const key = text.toLocaleLowerCase();
    if (!seen.has(key)) { seen.add(key); result.push(text); }
  }
  return result;
}
const headingKey = value => value.normalize('NFC').trim().toLocaleLowerCase();
function normalizeSectionProvenance(value, { allowMissing = false } = {}) {
  if (value === undefined && allowMissing) return { kind: 'manual' };
  wikiAssert(wikiRecord(value), 'Wiki 절 provenance가 손상되었습니다.');
  if (value.kind === 'manual') { wikiAssert(Object.keys(value).every(key => ['kind', 'editedFromWriter'].includes(key)) && (value.editedFromWriter === undefined || typeof value.editedFromWriter === 'boolean'), '수동 provenance 형식이 잘못되었습니다.'); return { kind: 'manual', ...(value.editedFromWriter ? { editedFromWriter: true } : {}) }; }
  const keys = ['kind', 'entryRef', 'slotId', 'featureId', 'mode', 'targetRefs', 'contextKey', 'assertion', 'evidenceRefs', 'links', 'reason', 'requestRef', 'manualEdited'];
  wikiAssert(value.kind === 'writer' && Object.keys(value).every(key => keys.includes(key)), 'Writer provenance 형식이 잘못되었습니다.');
  for (const key of ['entryRef', 'slotId', 'featureId', 'mode', 'assertion', 'reason', 'requestRef']) wikiAssert(typeof value[key] === 'string' && value[key].length > 0 && value[key].length <= 800, 'Writer provenance 텍스트가 잘못되었습니다.');
  wikiAssert(value.contextKey === null || (typeof value.contextKey === 'string' && value.contextKey.length <= 120), 'Writer context key가 잘못되었습니다.');
  for (const key of ['targetRefs', 'evidenceRefs', 'links']) wikiAssert(Array.isArray(value[key]) && value[key].length <= 32 && value[key].every(item => typeof item === 'string' && item.length <= 160), 'Writer provenance 참조가 잘못되었습니다.');
  wikiAssert(value.manualEdited === undefined || typeof value.manualEdited === 'boolean', 'Writer 수동 편집 표기가 잘못되었습니다.');
  return { kind: 'writer', entryRef: value.entryRef, slotId: value.slotId, featureId: value.featureId, mode: value.mode, targetRefs: [...value.targetRefs], contextKey: value.contextKey, assertion: value.assertion, evidenceRefs: [...value.evidenceRefs], links: [...value.links], reason: value.reason, requestRef: value.requestRef, ...(value.manualEdited ? { manualEdited: true } : {}) };
}

export function parseWikiMarkdown(markdown, previousSections = [], idFactory = () => makeWikiId('section')) {
  wikiAssert(typeof markdown === 'string', 'Markdown 본문은 문자열이어야 합니다.');
  wikiAssert(markdown.length <= WIKI_LIMITS.bodyChars, `Markdown 본문은 ${WIKI_LIMITS.bodyChars}자 이하여야 합니다.`);
  const previous = new Map();
  for (const section of previousSections || []) {
    const key = headingKey(String(section?.heading || ''));
    if (!previous.has(key)) previous.set(key, []);
    previous.get(key).push(String(section?.id || ''));
  }
  const raw = [], lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let current = { heading: '내용', lines: [] };
  let fence = '';
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const kind = fenceMatch[1][0];
      if (!fence) fence = kind; else if (fence === kind) fence = '';
      current.lines.push(line); continue;
    }
    const match = fence ? null : line.match(/^#{1,6}\s*(\S.*?)\s*#*\s*$/);
    if (match) {
      if (current.lines.length || current.heading !== '내용') raw.push(current);
      current = { heading: match[1], lines: [] };
    } else current.lines.push(line);
  }
  if (current.lines.length || current.heading !== '내용' || raw.length === 0) raw.push(current);
  wikiAssert(raw.length <= WIKI_LIMITS.sections, `본문 절은 ${WIKI_LIMITS.sections}개 이하여야 합니다.`);
  return raw.map(item => {
    const heading = textValue(item.heading, '절 제목', WIKI_LIMITS.titleChars, true);
    const candidates = previous.get(headingKey(heading)) || [];
    const matchedId = candidates.shift();
    const matched = matchedId ? previousSections.find(section => section.id === matchedId) : null;
    const body = item.lines.join('\n').trim();
    const provenance = matched?.provenance?.kind === 'writer' ? { ...cloneWiki(matched.provenance), ...(matched.heading !== heading || matched.body !== body ? { manualEdited: true } : {}) } : { kind: 'manual' };
    return { id: textValue(matchedId || idFactory(), '절 ID', 160, true), heading, body, provenance };
  });
}
export function wikiSectionsToMarkdown(sections) {
  return sections.map(section => `## ${section.heading}${section.body ? `\n\n${section.body}` : ''}`).join('\n\n');
}
function eventMarkdownTemplate() {
  return '## 작중 날짜\n\n미상\n\n## 작중 시간\n\n미상\n\n## 발생 장소\n\n미상\n\n## 내용\n\n';
}
function normalizeMetricRecord(metric){
  const keys=['id','slotId','targetRefs','contextKey','value','minimum','maximum','stageIndex','stageLabel','status','lastDelta','baseDelta','updatedAt','evidenceRefs','reason','requestRef','contributions'];
  wikiAssert(wikiRecord(metric)&&keys.every(key=>Object.hasOwn(metric,key))&&Object.keys(metric).every(key=>keys.includes(key)),'Wiki metric 형식이 잘못되었습니다.');
  const id=textValue(metric.id,'metric ID',200,true),slotId=textValue(metric.slotId,'metric slot',160,true),targetRefs=uniqueTextList(metric.targetRefs,'metric 대상',16,160),contextKey=metric.contextKey===null?null:textValue(metric.contextKey,'metric context',160,true);
  for(const key of ['value','minimum','maximum','lastDelta','baseDelta'])wikiAssert(typeof metric[key]==='number'&&Number.isFinite(metric[key]),'Wiki metric 숫자가 잘못되었습니다.');
  wikiAssert(metric.minimum<=metric.maximum&&metric.value>=metric.minimum&&metric.value<=metric.maximum&&Number.isSafeInteger(metric.stageIndex)&&metric.stageIndex>=0&&metric.stageIndex<=64,'Wiki metric 범위나 단계가 잘못되었습니다.');
  const contributions=metric.contributions;wikiAssert(Array.isArray(contributions)&&contributions.length<=WIKI_LIMITS.metricContributions,'Wiki metric 기여 기록이 너무 많습니다.');
  const normalizedContributions=contributions.map(item=>{const itemKeys=['ref','baseDelta','scaledDelta','appliedDelta','at','requestRef'];wikiAssert(wikiRecord(item)&&itemKeys.every(key=>Object.hasOwn(item,key))&&Object.keys(item).every(key=>itemKeys.includes(key)),'Wiki metric 기여 형식이 잘못되었습니다.');for(const key of ['baseDelta','scaledDelta','appliedDelta'])wikiAssert(typeof item[key]==='number'&&Number.isFinite(item[key]),'Wiki metric 기여 숫자가 잘못되었습니다.');return{ref:textValue(item.ref,'metric 기여 참조',300,true),baseDelta:item.baseDelta,scaledDelta:item.scaledDelta,appliedDelta:item.appliedDelta,at:textValue(item.at,'metric 기여 시각',80,true),requestRef:textValue(item.requestRef,'metric 요청 참조',160,true)}});
  return{id,slotId,targetRefs,contextKey,value:metric.value,minimum:metric.minimum,maximum:metric.maximum,stageIndex:metric.stageIndex,stageLabel:textValue(metric.stageLabel,'metric 단계',160,true),status:textValue(metric.status||'active','metric 상태',80,true),lastDelta:metric.lastDelta,baseDelta:metric.baseDelta,updatedAt:textValue(metric.updatedAt,'metric 갱신 시각',80,true),evidenceRefs:uniqueTextList(metric.evidenceRefs,'metric 근거',32,160),reason:textValue(metric.reason,'metric 이유',800,true),requestRef:textValue(metric.requestRef,'metric 요청 참조',160,true),contributions:normalizedContributions};
}

export function normalizeWikiDocument(input, { previous = null, idFactory = () => makeWikiId('doc'), sectionIdFactory = () => makeWikiId('section'), now = new Date().toISOString(), preserveVersion = false } = {}) {
  wikiAssert(wikiRecord(input), 'Wiki 문서 객체가 필요합니다.'); assertSafeWikiData(input);
  const allowed = preserveVersion ? ['id', 'type', 'title', 'aliases', 'tags', 'sections', 'metrics', 'links', 'provenance', 'createdAt', 'updatedAt', 'version'] : ['id', 'type', 'title', 'aliases', 'tags', 'sections', 'metrics', 'links', 'markdown'];
  wikiAssert(Object.keys(input).every(key => allowed.includes(key)), 'Wiki 문서에 지원하지 않는 항목이 있습니다.');
  const id = previous?.id || textValue(input.id || idFactory(), '문서 ID', 160, true);
  wikiAssert(!forbiddenWikiKeys.has(id), '문서 ID가 올바르지 않습니다.');
  const type = String(input.type || 'Other'); wikiAssert(WIKI_TYPES.includes(type), '지원하는 Wiki 타입을 선택해주세요.');
  const title = textValue(input.title || '', '문서 제목', WIKI_LIMITS.titleChars, true);
  const aliases = uniqueTextList(input.aliases || [], '별칭', WIKI_LIMITS.listItems);
  const tags = uniqueTextList(input.tags || [], '태그', WIKI_LIMITS.listItems);
  const links = uniqueTextList(input.links || [], '연결 문서', WIKI_LIMITS.links, 160);
  const sections = input.markdown !== undefined ? parseWikiMarkdown(input.markdown, previous?.sections || [], sectionIdFactory) : (input.sections || []).map(section => {
    wikiAssert(wikiRecord(section) && Object.keys(section).every(key => ['id', 'heading', 'body', 'provenance', 'relationshipHistory'].includes(key)), 'Wiki 절에 지원하지 않는 항목이 있습니다.');
    const provenance = normalizeSectionProvenance(section.provenance, { allowMissing: !preserveVersion });
    const sectionId = textValue(section.id, '절 ID', 160, true); wikiAssert(!forbiddenWikiKeys.has(sectionId), '절 ID가 올바르지 않습니다.');
    const relationshipHistory=normalizeRelationshipHistory(section.relationshipHistory,wikiAssert);wikiAssert(!relationshipHistory.length||provenance.slotId==='core.relationship','이력은 관계 항목에만 저장할 수 있습니다.');
    return { ...(relationshipHistory.length?{relationshipHistory}:{}), id: sectionId, heading: textValue(section.heading, '절 제목', WIKI_LIMITS.titleChars, true), body: textValue(section.body || '', '절 본문', WIKI_LIMITS.bodyChars), provenance };
  });
  wikiAssert(sections.length <= WIKI_LIMITS.sections, `본문 절은 ${WIKI_LIMITS.sections}개 이하여야 합니다.`);
  wikiAssert(wikiSectionsToMarkdown(sections).length <= WIKI_LIMITS.bodyChars, `Markdown 본문은 ${WIKI_LIMITS.bodyChars}자 이하여야 합니다.`);
  const metrics=(input.metrics??previous?.metrics??[]).map(normalizeMetricRecord);wikiAssert(metrics.length<=WIKI_LIMITS.metrics,'Wiki 문서 metric이 너무 많습니다.');wikiAssert(new Set(metrics.map(metric=>metric.id)).size===metrics.length,'Wiki metric ID가 중복됐습니다.');
  const version = preserveVersion ? input.version : previous ? previous.version + 1 : 1;
  wikiAssert(Number.isSafeInteger(version) && version >= 1, '문서 version이 잘못되었습니다.');
  if (preserveVersion) wikiAssert(wikiRecord(input.provenance) && input.provenance.kind === 'manual' && Object.keys(input.provenance).length === 1, '현재 Wiki 문서 provenance는 manual이어야 합니다.');
  return { id, type, title, aliases, tags, sections, metrics, links, provenance: { kind: 'manual' }, createdAt: previous?.createdAt || now, updatedAt: now, version };
}

export function createEmptyWikiScope(metadata, now = new Date().toISOString()) {
  wikiAssert(wikiRecord(metadata), 'Wiki 범위 정보가 필요합니다.');
  return { schemaVersion: WIKI_SCHEMA_VERSION, revision: 0, scope: { characterId: textValue(metadata.characterId, '캐릭터 ID', 500, true), chatKey: textValue(metadata.chatKey, '채팅 범위 ID', 500, true), characterName: textValue(metadata.characterName || '', '캐릭터 이름', 200), chatName: textValue(metadata.chatName || '', '채팅 이름', 200), createdAt: now, updatedAt: now, ...(metadata.forkedFrom ? { forkedFrom: textValue(metadata.forkedFrom, '분기 원본', 1000, true) } : {}) }, documents: {},people:emptyPeopleState(), history: [], automation: { records: {}, activeByMessage: {}, lastStatus: null } };
}
function normalizeHistoryEntry(entry) {
  wikiAssert(wikiRecord(entry), 'Wiki 이력이 손상되었습니다.');
  wikiAssert(Object.keys(entry).every(key => ['id', 'at', 'action', 'documentId', 'before', 'after', 'summary', 'requestRef', 'batchRef'].includes(key)), 'Wiki 이력에 지원하지 않는 항목이 있습니다.');
  const action = String(entry.action); wikiAssert(['create', 'update', 'delete', 'restore'].includes(action), 'Wiki 이력 동작이 잘못되었습니다.');
  const id = textValue(entry.id, '이력 ID', 160, true), documentId = textValue(entry.documentId, '이력 문서 ID', 160, true);
  wikiAssert(!forbiddenWikiKeys.has(id) && !forbiddenWikiKeys.has(documentId), 'Wiki 이력 ID가 올바르지 않습니다.');
  return { id, at: textValue(entry.at, '이력 시각', 80, true), action, documentId, before: entry.before === null ? null : normalizeWikiDocument(entry.before, { previous: entry.before, now: entry.before.updatedAt, preserveVersion: true }), after: entry.after === null ? null : normalizeWikiDocument(entry.after, { previous: entry.after, now: entry.after.updatedAt, preserveVersion: true }), summary: textValue(entry.summary || '', '이력 요약', 240), ...(entry.requestRef ? { requestRef: textValue(entry.requestRef, '요청 참조', 160, true) } : {}), ...(entry.batchRef ? { batchRef: textValue(entry.batchRef, '배치 참조', 160, true) } : {}) };
}
export function normalizeWikiScope(raw) {
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { throw new WikiValidationError('저장된 Wiki JSON을 읽지 못했습니다.'); } }
  wikiAssert(wikiRecord(raw) && raw.schemaVersion === WIKI_SCHEMA_VERSION, '지원하지 않는 Wiki 버전입니다.'); assertSafeWikiData(raw);
  wikiAssert(Object.keys(raw).every(key => ['schemaVersion', 'revision', 'scope', 'documents','people', 'history', 'automation','writerReceipts','relationshipHistoryLimit','identityRedirects','recordRetention','peopleLayout'].includes(key)), 'Wiki에 지원하지 않는 항목이 있습니다.');
  wikiAssert(Number.isSafeInteger(raw.revision) && raw.revision >= 0, 'Wiki revision이 잘못되었습니다.');
  wikiAssert(wikiRecord(raw.scope) && Object.keys(raw.scope).every(key => ['characterId', 'chatKey', 'characterName', 'chatName', 'createdAt', 'updatedAt', 'forkedFrom'].includes(key)), 'Wiki 범위 정보에 지원하지 않는 항목이 있습니다.');
  const result = createEmptyWikiScope(raw.scope, raw.scope.createdAt); result.documents = Object.create(null);
  if(raw.relationshipHistoryLimit!==undefined){wikiAssert(Number.isInteger(raw.relationshipHistoryLimit)&&raw.relationshipHistoryLimit>=1&&raw.relationshipHistoryLimit<=RELATIONSHIP_HISTORY_MAX,'관계 이력 보관 개수는 1~20개여야 합니다.');result.relationshipHistoryLimit=raw.relationshipHistoryLimit;}
  result.revision = raw.revision; result.scope.updatedAt = textValue(raw.scope.updatedAt, 'Wiki 갱신 시각', 80, true);
  wikiAssert(wikiRecord(raw.documents), 'Wiki 문서 모음이 손상되었습니다.');
  const entries = Object.entries(raw.documents); wikiAssert(entries.length <= WIKI_LIMITS.documents, `Wiki 문서는 ${WIKI_LIMITS.documents}개 이하여야 합니다.`);
  for (const [id, document] of entries) { const normalized = normalizeWikiDocument(document, { previous: document, now: document.updatedAt, preserveVersion: true }); wikiAssert(id === normalized.id, 'Wiki 문서 키와 ID가 다릅니다.'); result.documents[id] = normalized; }
  if(raw.peopleLayout!==undefined)result.peopleLayout=normalizePeopleLayout(raw.peopleLayout,result.documents);
  if(raw.identityRedirects!==undefined){const redirects=normalizeIdentityRedirects(raw.identityRedirects,result.documents,wikiAssert);if(Object.keys(redirects).length)result.identityRedirects=redirects;}
  result.people=normalizePeopleState(raw.people);
  if(result.people.pins){for(const[id,keys]of Object.entries(result.people.pins)){const document=result.documents[id];const valid=document?.type==='Character'?keys.filter(key=>key.startsWith('section:')?document.sections.some(section=>section.id===key.slice(8)):key.startsWith('metric:')?document.metrics.some(metric=>metric.id===key.slice(7)):Boolean(result.people.profiles[id])):[];if(valid.length)result.people.pins[id]=valid;else delete result.people.pins[id];}if(!Object.keys(result.people.pins).length)delete result.people.pins;}
  for(const id of Object.keys(result.people.profiles))if(result.documents[id]?.type!=='Character')delete result.people.profiles[id];for(const[id,candidate]of Object.entries(result.people.candidates))if(!result.people.profiles[candidate.documentId])delete result.people.candidates[id];
  if(raw.recordRetention!==undefined)result.recordRetention=normalizeWikiRetention(raw.recordRetention);
  wikiAssert(Array.isArray(raw.history) && raw.history.length <= WIKI_RETENTION_MAX, `Wiki 이력은 ${WIKI_RETENTION_MAX}개 이하여야 합니다.`);
  result.history = raw.history.map(normalizeHistoryEntry);
  if (raw.automation !== undefined) {
    wikiAssert(wikiRecord(raw.automation) && Object.keys(raw.automation).every(key => ['records', 'activeByMessage', 'lastStatus','prunedThrough','unindexedPruned'].includes(key)) && wikiRecord(raw.automation.records) && wikiRecord(raw.automation.activeByMessage), '자동 반영 원장이 손상되었습니다.');
    assertSafeWikiData(raw.automation);
    const records = Object.create(null), entries = Object.entries(raw.automation.records); wikiAssert(entries.length <= 500, '자동 반영 원장은 500개 이하여야 합니다.');
    for (const [key, item] of entries) {
      const required = ['identity','messageId','contentHash','requestRef','batchRef','historyIds','status','at','characterIndex','chatIndex','messageIndex','messageKey','documentCount'];
      wikiAssert(!forbiddenWikiKeys.has(key) && wikiRecord(item) && required.every(field => Object.hasOwn(item,field)) && Object.keys(item).every(field => [...required, 'errorCode','failureReason','failureDetail','summary','hidden','validation'].includes(field)), '자동 반영 record가 손상되었습니다.');
      for (const field of ['identity', 'messageId', 'contentHash', 'requestRef', 'batchRef', 'at']) wikiAssert(typeof item[field] === 'string' && item[field].length <= 500, '자동 반영 record 텍스트가 잘못되었습니다.');
      wikiAssert(['pending', 'completed', 'rolled-back', 'failed', 'manual'].includes(item.status) && Array.isArray(item.historyIds) && item.historyIds.length <= WIKI_RETENTION_MAX && item.historyIds.every(id => typeof id === 'string' && id.length <= 160), '자동 반영 record 상태가 잘못되었습니다.'); records[key] = cloneWiki(item);
      for (const field of ['characterIndex','chatIndex','messageIndex']) if (item[field] !== undefined) wikiAssert(Number.isInteger(item[field]) && item[field] >= 0, '자동 반영 source index가 잘못되었습니다.');
      if (item.messageKey !== undefined) wikiAssert(typeof item.messageKey === 'string' && item.messageKey.length <= 160, '자동 message key가 잘못되었습니다.');
      if (item.errorCode !== undefined) wikiAssert(typeof item.errorCode === 'string' && item.errorCode.length <= 80, '자동 오류 코드가 잘못되었습니다.');if(item.failureReason!==undefined)wikiAssert(typeof item.failureReason==='string'&&item.failureReason.length<=200,'자동 실패 이유가 잘못되었습니다.');if(item.failureDetail!==undefined)wikiAssert(typeof item.failureDetail==='string'&&item.failureDetail.length<=600,'자동 실패 상세가 잘못되었습니다.');
      if(item.hidden!==undefined)wikiAssert(typeof item.hidden==='boolean','자동 기록 숨김 표기가 잘못되었습니다.');
      if(item.validation!==undefined){const v=item.validation;wikiAssert(wikiRecord(v)&&Object.keys(v).every(key=>['rejected','unchanged','normalized','details','truncated'].includes(key))&&['rejected','unchanged','normalized'].every(key=>Number.isSafeInteger(v[key])&&v[key]>=0&&v[key]<=65536)&&typeof v.truncated==='boolean'&&Array.isArray(v.details)&&v.details.length<=16,'자동 검증 요약이 잘못되었습니다.');for(const d of v.details)wikiAssert(wikiRecord(d)&&Object.keys(d).every(key=>['kind','code','documentRef','documentTitle','slotId','reason'].includes(key))&&typeof d.kind==='string'&&d.kind.length<=60&&typeof d.code==='string'&&d.code.length<=80&&(d.documentRef===null||typeof d.documentRef==='string'&&d.documentRef.length<=160)&&typeof d.documentTitle==='string'&&d.documentTitle.length<=120&&(d.slotId===null||typeof d.slotId==='string'&&d.slotId.length<=160)&&typeof d.reason==='string'&&d.reason.length<=400,'자동 검증 상세가 잘못되었습니다.');}
      if(item.summary!==undefined){const s=item.summary;wikiAssert(wikiRecord(s)&&Object.keys(s).every(k=>['created','updated','removed','upsertedEntries','removedEntries','metricOpsApplied','metricOpsIgnored','peopleInitialized','peopleObserved','peopleReviewReady','affected','saved','repairAttempted','batchCount'].includes(k)),'자동 활동 요약이 잘못되었습니다.');for(const k of ['created','updated','removed','upsertedEntries','removedEntries','metricOpsIgnored','peopleInitialized','peopleObserved','peopleReviewReady'])wikiAssert(Number.isInteger(s[k]??0)&&(s[k]??0)>=0&&(s[k]??0)<=(k==='metricOpsIgnored'?8192:128),'자동 활동 수가 잘못되었습니다.');if(s.metricOpsApplied!==undefined)wikiAssert(Number.isInteger(s.metricOpsApplied)&&s.metricOpsApplied>=0&&s.metricOpsApplied<=128,'자동 metric 적용 수가 잘못되었습니다.');if(s.batchCount!==undefined)wikiAssert(Number.isInteger(s.batchCount)&&s.batchCount>=1&&s.batchCount<=12,'자동 Writer batch 수가 잘못되었습니다.');wikiAssert(typeof s.saved==='boolean'&&(s.repairAttempted===undefined||typeof s.repairAttempted==='boolean')&&Array.isArray(s.affected)&&s.affected.length<=32&&s.affected.every(a=>wikiRecord(a)&&typeof a.type==='string'&&typeof a.title==='string'&&a.title.length<=120),'자동 활동 문서가 잘못되었습니다.');}
      wikiAssert(Number.isInteger(item.documentCount) && item.documentCount >= 0 && item.documentCount <= 32, '자동 문서 수가 잘못되었습니다.');
      if (item.status === 'completed') wikiAssert((item.documentCount === 0 && item.historyIds.length === 0) || (item.documentCount > 0 && item.historyIds.length > 0 && item.batchRef.length > 0), '완료 자동 record가 불완전합니다.');
    }
    const activeByMessage = Object.create(null); wikiAssert(Object.keys(raw.automation.activeByMessage).length <= 500, '자동 메시지 원장이 너무 큽니다.');
    for (const [key, value] of Object.entries(raw.automation.activeByMessage)) { wikiAssert(!forbiddenWikiKeys.has(key) && typeof value === 'string' && records[value], '자동 메시지 참조가 잘못되었습니다.'); activeByMessage[key] = value; }
    const lastStatus = raw.automation.lastStatus; wikiAssert(lastStatus === null || (wikiRecord(lastStatus) && Object.keys(lastStatus).length === 3 && Object.keys(lastStatus).every(key => ['phase', 'identity', 'at'].includes(key)) && ['pending','completed','failed','manual','rolled-back'].includes(lastStatus.phase) && typeof lastStatus.identity === 'string' && lastStatus.identity.length <= 500 && typeof lastStatus.at === 'string' && lastStatus.at.length <= 80), '자동 반영 마지막 상태가 잘못되었습니다.');
    if(raw.automation.prunedThrough!==undefined)wikiAssert(Number.isSafeInteger(raw.automation.prunedThrough)&&raw.automation.prunedThrough>=0,'정리된 자동 기록 경계가 잘못되었습니다.');
    if(raw.automation.unindexedPruned!==undefined)wikiAssert(typeof raw.automation.unindexedPruned==='boolean','이전 자동 기록 보호 상태가 잘못되었습니다.');
    result.automation = { records, activeByMessage, lastStatus: lastStatus ? cloneWiki(lastStatus) : null,...(raw.automation.prunedThrough!==undefined?{prunedThrough:raw.automation.prunedThrough}:{}),...(raw.automation.unindexedPruned?{unindexedPruned:true}:{}) };
  }
  if(raw.writerReceipts!==undefined)result.writerReceipts=validateWriterReceipts(raw.writerReceipts);
  return result;
}
function appendHistory(scope, action, documentId, before, after, summary, now, idFactory, metadata = {}) {
  const next = cloneWiki(scope); next.revision += 1; next.scope.updatedAt = now;
  const historyId = textValue(idFactory(), '이력 ID', 160, true); wikiAssert(!forbiddenWikiKeys.has(historyId), '이력 ID가 올바르지 않습니다.');
  next.history.push({ id: historyId, at: now, action, documentId, before: before ? cloneWiki(before) : null, after: after ? cloneWiki(after) : null, summary, ...(metadata.requestRef ? { requestRef: metadata.requestRef } : {}), ...(metadata.batchRef ? { batchRef: metadata.batchRef } : {}) });
  // A low user limit is enforced after the complete operation reaches the store,
  // so a multi-document Writer keeps its full rollback ID list until that point.
  next.history = next.history.slice(-Math.max(WIKI_LIMITS.history,normalizeWikiRetention(scope.recordRetention).history)); return next;
}
export function createWikiDocument(scope, input, options = {}) {
  const current = normalizeWikiScope(scope); wikiAssert(Object.keys(current.documents).length < WIKI_LIMITS.documents, `Wiki 문서는 ${WIKI_LIMITS.documents}개까지만 만들 수 있습니다.`);
  const now = options.now || new Date().toISOString(); const document = normalizeWikiDocument(input, { idFactory: options.idFactory, sectionIdFactory: options.sectionIdFactory, now }); wikiAssert(!current.documents[document.id], '이미 존재하는 문서 ID입니다.');
  if(document.type==='Character'&&!current.peopleLayout)current.peopleLayout=normalizePeopleLayout(undefined,current.documents);
  let next = appendHistory(current, 'create', document.id, null, document, options.requestRef ? `Writer 생성 · ${document.title}` : `수동 생성 · ${document.title}`, now, options.historyIdFactory || (() => makeWikiId('history')), options); next.documents[document.id] = document;if(next.peopleLayout)next.peopleLayout=normalizePeopleLayout(next.peopleLayout,next.documents);return next;
}
export function updateWikiDocument(scope, documentId, input, options = {}) {
  const current = normalizeWikiScope(scope), before = current.documents[documentId]; wikiAssert(before, '수정할 Wiki 문서가 없습니다.');
  if(before.type==='Character'&&Array.isArray(input.sections))input={...input,sections:coalesceNpcEmotionUpdates(before.sections,input.sections,documentId,current.people?.pins?.[documentId]||[])};
  const now = options.now || new Date().toISOString(); const normalized = normalizeWikiDocument({ ...input, id: documentId }, { previous: before, sectionIdFactory: options.sectionIdFactory, now }), after=preserveRelationshipHistory(before,normalized,{limit:relationshipHistoryLimit(current),now});
  let next = appendHistory(current, 'update', documentId, before, after, options.requestRef ? `Writer 수정 · ${after.title}` : `수동 수정 · ${after.title}`, now, options.historyIdFactory || (() => makeWikiId('history')), options); next.documents[documentId] = after; return next;
}
export function deleteWikiDocument(scope, documentId, options = {}) {
  const current = normalizeWikiScope(scope), before = current.documents[documentId]; wikiAssert(before, '삭제할 Wiki 문서가 없습니다.'); const now = options.now || new Date().toISOString();
  const next = appendHistory(current, 'delete', documentId, before, null, `수동 삭제 · ${before.title}`, now, options.historyIdFactory || (() => makeWikiId('history'))); delete next.documents[documentId];if(next.identityRedirects){for(const[key,target]of Object.entries(next.identityRedirects))if(target===documentId)delete next.identityRedirects[key];if(!Object.keys(next.identityRedirects).length)delete next.identityRedirects;}return next;
}
export function restoreWikiHistory(scope, historyId, options = {}) {
  const current = normalizeWikiScope(scope), event = current.history.find(item => item.id === historyId); wikiAssert(event, '복원할 이력이 없습니다.'); const now = options.now || new Date().toISOString();
  const before = current.documents[event.documentId] || null, after = event.before ? cloneWiki(event.before) : null;
  if (after) { after.version = (before?.version || after.version) + 1; after.updatedAt = now; after.provenance = { kind: 'manual' }; }
  const next = appendHistory(current, 'restore', event.documentId, before, after, `이력 복원 · ${event.summary}`, now, options.historyIdFactory || (() => makeWikiId('history')));
  if (after) next.documents[event.documentId] = after; else delete next.documents[event.documentId]; return next;
}
export function restoreWikiHistoryBatch(scope, historyIds, options = {}) {
  const current=normalizeWikiScope(scope),expected=new Map(),firstByDocument=new Map();
  wikiAssert(Array.isArray(historyIds)&&new Set(historyIds).size===historyIds.length,'복원할 이력 목록이 잘못되었습니다.');
  for(const id of [...historyIds].reverse()){
    const event=current.history.find(item=>item.id===id);
    wikiAssert(event,'복원할 이력이 없습니다.');
    const actual=expected.has(event.documentId)?expected.get(event.documentId):current.documents[event.documentId]||null;
    wikiAssert(JSON.stringify(actual)===JSON.stringify(event.after),'자동 변경 이후 같은 문서가 수정되었습니다.');
    expected.set(event.documentId,event.before);firstByDocument.set(event.documentId,event);
  }
  let next=current;const now=options.now||new Date().toISOString();
  for(const [id,event]of firstByDocument){
    const before=next.documents[id]||null,after=event.before?cloneWiki(event.before):null;
    if(after){after.version=(before?.version||after.version)+1;after.updatedAt=now;after.provenance={kind:'manual'};}
    next=appendHistory(next,'restore',id,before,after,'이력 복원 · Writer 및 JSON 복구',now,options.historyIdFactory||(()=>makeWikiId('history')),options);
    if(after)next.documents[id]=after;else delete next.documents[id];
  }
  return next;
}
export function searchValidatedWikiDocuments(current, query = '', type = '') {
  const needle = String(query).normalize('NFC').trim().toLocaleLowerCase();
  return Object.values(current.documents).filter(document => (!type || document.type === type) && (!needle || [document.type, document.title, ...document.aliases, ...document.tags, ...document.links, ...document.sections.flatMap(section => [section.heading, section.body])].join('\n').toLocaleLowerCase().includes(needle))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
}
function searchWikiDocuments(scope, query = '', type = '') { return searchValidatedWikiDocuments(normalizeWikiScope(scope), query, type); }
