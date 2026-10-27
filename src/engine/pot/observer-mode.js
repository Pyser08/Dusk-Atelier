// 출처: risupot 2.3.0 src/observer-mode.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

// It is stored as an ordinary chat-scoped custom prompt (Director + Writer), so no settings format change is needed,
// the rule text is visible and editable under Prompts > 추가 프롬프트, and older 2.0.0 builds still read the settings.
const OBSERVER_PROMPT_PREFIX = 'observer-';
const OBSERVER_PROMPT_NAME = '관찰자 모드';
const OBSERVER_PROMPT_TEXT = [
  'Observer mode is on for this chat.',
  'The human is not a character in the scene. They only watch, and anything they type is an out-of-character direction, never an action, line, feeling or knowledge of a character.',
  'Do not create a Character for the user. Do not write relationship, appraisal, speech, knowledge or metric entries whose target is actor:user, and do not describe the user as present, addressed or reacted to.',
  'Put that effort into the relations between the NPCs instead. For every pair of NPCs who talk to each other, act toward each other, talk about each other, or visibly react to each other in the RP, record each direction separately (A toward B, and B toward A) whenever the RP gives evidence for that direction: the current feeling and its reason, how they treat and address each other, and what changed in this scene.',
  'Also keep who knows what between the NPCs: what one NPC told, hid from, noticed about or misunderstood about another.',
  'Leave a direction empty when the RP gives no evidence for it. Being in the same scene is not evidence.',
].join('\n');
/** V2 (2.0.2): built-in block for the common setting. Skipped when a chat rule saved by 2.0.1 already applies, so the text is not sent twice. */
export function observerModeBlock(settings, stage, items = []) {
  if (settings?.observerModeEnabled !== true || !['director', 'writer'].includes(stage)) return '';
  if (items.some(item => typeof item?.id === 'string' && item.id.startsWith(OBSERVER_PROMPT_PREFIX))) return '';
  return '[OBSERVER MODE]\n' + OBSERVER_PROMPT_TEXT;
}
const observerScope = scope => { const value = scope?.scope || scope; return typeof value?.characterId === 'string' && value.characterId && typeof value?.chatKey === 'string' && value.chatKey ? value : null; };
const observerHash = text => { let hash = 5381; for (const ch of String(text)) hash = ((hash * 33) ^ ch.codePointAt(0)) >>> 0; return hash.toString(36); };
function observerPromptId(scope) { const value = observerScope(scope); return value ? OBSERVER_PROMPT_PREFIX + observerHash(value.characterId + '\n' + value.chatKey) : ''; }
/** The observer rule saved for this chat (switched on or off), or null. */
function observerPrompt(settings, scope) {
  const value = observerScope(scope); if (!value) return null;
  return (Array.isArray(settings?.customPrompts) ? settings.customPrompts : []).find(item => typeof item?.id === 'string' && item.id.startsWith(OBSERVER_PROMPT_PREFIX) && item.scope?.kind === 'chat' && item.scope.characterId === value.characterId && item.scope.chatKey === value.chatKey) || null;
}
function observerEnabled(settings, scope) { return observerPrompt(settings, scope)?.enabled === true; }
/** Mutates config.customPrompts. Switching off keeps the rule (and any edits to its text) for the next time. */
function setObserverMode(config, scope, on) {
  const value = observerScope(scope); if (!value) throw new Error('현재 채팅을 확인한 뒤 다시 시도해주세요.');
  const list = Array.isArray(config.customPrompts) ? [...config.customPrompts] : [], existing = observerPrompt({ customPrompts: list }, value);
  if (existing) { config.customPrompts = list.map(item => item === existing ? { ...item, enabled: Boolean(on) } : item); return; }
  if (!on) return;
  if (list.length >= 40) throw new Error('추가 프롬프트가 40개로 가득 차 관찰자 모드를 켤 수 없습니다. 프롬프트 탭에서 하나를 지운 뒤 다시 시도해주세요.');
  let id = observerPromptId(value), suffix = 1; while (list.some(item => item.id === id)) id = observerPromptId(value) + '-' + (++suffix);
  config.customPrompts = [...list, { id, name: OBSERVER_PROMPT_NAME, stages: ['director', 'writer'], scope: { kind: 'chat', characterId: value.characterId, chatKey: value.chatKey, label: String(value.chatName || value.characterName || '').slice(0, 200) }, enabled: true, text: OBSERVER_PROMPT_TEXT }];
}
