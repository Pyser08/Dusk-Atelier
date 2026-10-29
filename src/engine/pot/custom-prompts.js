// 출처: risupot 2.3.0 src/custom-prompts.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { cycleBlock } from './cycle-tracking.js';
import { observerModeBlock } from './observer-mode.js';
import { speechVarietyBlock } from './speech-variety.js';

// each scoped to every chat, one bot or one chat. They follow the built-in rules and never replace output contracts.
const CUSTOM_PROMPT_STAGES = ['router', 'director', 'writer', 'memory'];
const CUSTOM_PROMPT_SCOPES = ['all', 'bot', 'chat'];
const CUSTOM_PROMPT_LIMITS = Object.freeze({ items: 40, id: 40, name: 60, text: 12000, key: 500, label: 200 });
const CUSTOM_PROMPT_LIMITS_REF = CUSTOM_PROMPT_LIMITS;
const customPromptRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function customPromptFail(message) { throw new Error(message); }
function customPromptText(value, max, label, { trim = false, required = false } = {}) {
  if (typeof value !== 'string') customPromptFail(`추가 프롬프트 ${label}: 문자열이 필요합니다.`);
  const text = trim ? value.trim() : value;
  if (required && !text) customPromptFail(`추가 프롬프트 ${label}: 값이 필요합니다.`);
  if (text.length > max) customPromptFail(`추가 프롬프트 ${label}은 ${max.toLocaleString()}자 이내로 입력해주세요.`);
  return text;
}
function normalizeCustomPromptScope(raw, label) {
  if (!customPromptRecord(raw) || !CUSTOM_PROMPT_SCOPES.includes(raw.kind)) customPromptFail(`추가 프롬프트 ${label}: 범위가 잘못되었습니다.`);
  if (raw.kind === 'all') { if (Object.keys(raw).length !== 1) customPromptFail(`추가 프롬프트 ${label}: 범위 항목이 잘못되었습니다.`); return { kind: 'all' }; }
  const allowed = raw.kind === 'bot' ? ['kind', 'characterId', 'label'] : ['kind', 'characterId', 'chatKey', 'label'];
  if (Object.keys(raw).some(key => !allowed.includes(key))) customPromptFail(`추가 프롬프트 ${label}: 범위 항목이 잘못되었습니다.`);
  const scope = { kind: raw.kind, characterId: customPromptText(raw.characterId, CUSTOM_PROMPT_LIMITS_REF.key, label + ' 봇 ID', { required: true }) };
  if (raw.kind === 'chat') scope.chatKey = customPromptText(raw.chatKey, CUSTOM_PROMPT_LIMITS_REF.key, label + ' 채팅 ID', { required: true });
  scope.label = raw.label === undefined ? '' : customPromptText(raw.label, CUSTOM_PROMPT_LIMITS_REF.label, label + ' 범위 이름', { trim: true });
  return scope;
}
export function normalizeCustomPrompts(raw) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) customPromptFail('추가 프롬프트 목록 형식이 잘못되었습니다.');
  if (raw.length > CUSTOM_PROMPT_LIMITS_REF.items) customPromptFail(`추가 프롬프트는 최대 ${CUSTOM_PROMPT_LIMITS_REF.items}개까지 저장할 수 있습니다.`);
  const seen = new Set();
  return raw.map((item, index) => {
    const label = `${index + 1}번`;
    if (!customPromptRecord(item) || Object.keys(item).some(key => !['id', 'name', 'stages', 'stage', 'scope', 'enabled', 'text', 'position'].includes(key))) customPromptFail(`추가 프롬프트 ${label}: 항목 형식이 잘못되었습니다.`);
    const id = customPromptText(item.id, CUSTOM_PROMPT_LIMITS_REF.id, label + ' ID', { required: true });
    if (!/^[A-Za-z0-9_-]+$/.test(id) || seen.has(id)) customPromptFail(`추가 프롬프트 ${label}: ID가 잘못되었거나 중복됩니다.`);
    seen.add(id);
    const rawStages = item.stages !== undefined ? item.stages : item.stage !== undefined ? [item.stage] : null;
    if (item.stages !== undefined && item.stage !== undefined) customPromptFail(`추가 프롬프트 ${label}: 적용 단계 형식이 잘못되었습니다.`);
    if (!Array.isArray(rawStages) || !rawStages.length || rawStages.some(stage => !CUSTOM_PROMPT_STAGES.includes(stage)) || new Set(rawStages).size !== rawStages.length) customPromptFail(`추가 프롬프트 ${label}: 적용 단계(Router·Director·Writer)를 하나 이상 선택해주세요.`);
    const stages = CUSTOM_PROMPT_STAGES.filter(stage => rawStages.includes(stage));
    if (typeof item.enabled !== 'boolean') customPromptFail(`추가 프롬프트 ${label}: 사용 여부는 ON/OFF 값이어야 합니다.`);
    return { id, name: customPromptText(item.name ?? '', CUSTOM_PROMPT_LIMITS_REF.name, label + ' 이름', { trim: true }), stages, scope: normalizeCustomPromptScope(item.scope, label), enabled: item.enabled, text: customPromptText(item.text, CUSTOM_PROMPT_LIMITS_REF.text, label + ' 본문'), position: item.position === undefined ? 'back' : ['front', 'middle', 'back'].includes(item.position) ? item.position : customPromptFail(`추가 프롬프트 ${label}: 넣을 위치가 잘못되었습니다.`) };
  });
}
/** scope: the current Wiki scope ({characterId, chatKey}); a bot/chat item never applies without a matching scope. */
function customPromptApplies(item, scope) {
  if (item.scope.kind === 'all') return true;
  const characterId = String(scope?.characterId || ''), chatKey = String(scope?.chatKey || '');
  if (!characterId || item.scope.characterId !== characterId) return false;
  return item.scope.kind === 'bot' || (Boolean(chatKey) && item.scope.chatKey === chatKey);
}
function activeCustomPrompts(settings, stage, scope, position) {
  return (Array.isArray(settings?.customPrompts) ? settings.customPrompts : []).filter(item => item.enabled && item.stages.includes(stage) && item.text.trim() && customPromptApplies(item, scope) && (!position || (item.position || 'back') === position));
}
/** One block appended after the stage's built-in rules, or '' when nothing applies. */
// 장기기억 분석 호출용: 위치별 사용자 프롬프트 글(내장 규칙 없이). 없으면 ''.
export function customPromptPlain(settings, stage, scope, position) {
  const items = activeCustomPrompts(settings, stage, scope, position);
  if (!items.length) return '';
  return `[USER ADDED RULES · ${stage.toUpperCase()}]\nThe user added the following rules. Apply them together with the other rules, but they never change the required JSON output format or the safety limits.\n\n` + items.map((item, index) => `## ${item.name || `추가 규칙 ${index + 1}`}\n${item.text.trim()}`).join('\n\n');
}
export function customPromptBlock(settings, stage, scope, position = 'back') {
  const items = activeCustomPrompts(settings, stage, scope, position), builtIn = position === 'back' ? [observerModeBlock(settings, stage, activeCustomPrompts(settings, stage, scope)), cycleBlock(settings, stage), speechVarietyBlock(settings, stage)].filter(Boolean).join('\n\n') : '';
  if (!items.length) return builtIn;
  return (builtIn ? builtIn + '\n\n' : '') + `[USER ADDED RULES · ${stage.toUpperCase()}]\nThe user added the following rules for this stage. Apply them together with the rules ${position === 'front' ? 'below' : position === 'middle' ? 'around them' : 'above'}. They never change the required output format, JSON contract, evidence rules or safety limits.\n\n` + items.map((item, index) => `## ${item.name || `추가 규칙 ${index + 1}`}\n${item.text.trim()}`).join('\n\n');
}
