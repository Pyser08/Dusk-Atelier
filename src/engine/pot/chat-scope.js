// 출처: risupot 2.3.0 src/chat-scope.mjs — 원작자 허락을 받아 이식 (addon-rebuild부터 Dusk 소스 — 직접 고침, 원본과 다른 곳은 주석)

export const CHAT_SCOPE_FIELD = 'risupotWikiScopeId';

const scopeText = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const scopedIdentityCharacter=(character,chat)=>({personas:(Array.isArray(character?.personas)?character.personas:[]).filter(persona=>persona?.id===chat?.bindedPersona).map(({id,name,personaPrompt,aliases})=>({id,name,personaPrompt,aliases}))});
export const wikiScopeStorageKey = (characterId, chatKey) => `risupot.wiki.v1:${encodeURIComponent(characterId)}:${encodeURIComponent(chatKey)}`;
function chatIdentityFingerprint(chat) {
  if (!chat || typeof chat !== 'object') return '';
  const stable = scopeText(chat[CHAT_SCOPE_FIELD]) || scopeText(chat.id);
  if (stable) return `id:${stable}`;
  const messages = Array.isArray(chat.message) ? chat.message : [];
  const tail = messages.slice(-3).map(item => [item?.role, item?.chatId, item?.time, item?.data]);
  return JSON.stringify([chat.name, chat.title, chat.lastDate, messages.length, tail]);
}
// gets a new chat.id, so the chat whose id equals the scope id is the original wherever it sits in the list.
// 신고 #13: 분기를 다시 분기하면 범위 ID가 어느 채팅의 id와도 같지 않다. 그때는 분기 표식(branchedfrom::<원본 id>)을 보고,
// 없으면 목록 위쪽을 사본으로 본다(리스는 복사·분기 채팅을 맨 위에 넣는다). 예전에는 아래쪽을 사본으로 봐서 원본이 기억을 잃었다.
const branchedFrom = (chat) => {
  const list = Array.isArray(chat?.message) ? chat.message : [];
  for (let i = list.length - 1; i >= 0; i--) { const m = /\{\{specialcomment::branchedfrom::([^:}]+)::/.exec(String(list[i]?.data ?? '')); if (m) return m[1]; }
  return '';
};
const hasTwinId = (chats, chatIndex, id) => chats.some((c, i) => i !== chatIndex && (scopeText(c?.id) === id || scopeText(c?.[CHAT_SCOPE_FIELD]) === id));
export function scopeIsCopy(chats, chatIndex, chat, pluginId) {
  const twins = chats.map((candidate, index) => ({ candidate, index })).filter(item => item.index !== chatIndex && scopeText(item.candidate?.[CHAT_SCOPE_FIELD]) === pluginId);
  const id = scopeText(chat?.id);
  if (!twins.length || id === pluginId) return false;
  if (twins.some(item => scopeText(item.candidate?.id) === pluginId)) return true;
  const from = branchedFrom(chat);
  if (from && twins.some(item => scopeText(item.candidate?.id) === from)) return true;
  if (id && twins.some(item => branchedFrom(item.candidate) === id)) return false;
  return twins.some(item => item.index > chatIndex);
}
function scopeRandomId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `chat-${uuid}` : `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
export class ChatScopeManager {
  constructor(api, { idFactory = scopeRandomId, isEnabled = () => true } = {}) { this.api = api; this.idFactory = idFactory; this.isEnabled = isEnabled; this.pendingForks = new Map(); }
  forkKey(characterId, chatIndex, source) { return `${characterId}\n${chatIndex}\n${source}`; }
  // 갈라진 범위는 그 채팅의 고유 id를 쓴다(다음 분기 때 어느 쪽이 원본인지 바로 안다). 다른 채팅이 쓰는 id면 새로 만든다.
  forkTarget(pendingKey, chats, chatIndex, chat) {
    const id = scopeText(chat?.id);
    if (id && !hasTwinId(chats, chatIndex, id)) return id;
    if (!this.pendingForks.has(pendingKey)) this.pendingForks.set(pendingKey, this.idFactory());
    return this.pendingForks.get(pendingKey);
  }
  completeFork(characterId, chatIndex, source) { this.pendingForks.delete(this.forkKey(characterId, chatIndex, source)); }
  async pin(characterIndex, chatIndex, seenChat, nextId) {
    if (!this.isEnabled()) return false;
    let fresh = null;
    for (let attempt = 0; attempt < 2 && !fresh; attempt++) { try { fresh = await this.api.getChatFromIndex(characterIndex, chatIndex); } catch { /* Retry once. */ } }
    if (!fresh || typeof fresh !== 'object' || chatIdentityFingerprint(fresh) !== chatIdentityFingerprint(seenChat)) return false;
    if (!this.isEnabled()) return false;
    try { await this.api.setChatToIndex(characterIndex, chatIndex, { ...fresh, [CHAT_SCOPE_FIELD]: nextId }); return true; }
    catch { return false; }
  }
  async resolve() {
    try {
      if (!this.isEnabled()) return { available: false, writeBlocked: true, warning: '리수폿 전체 전원이 OFF입니다.' };
      for (const method of ['getCurrentCharacterIndex', 'getCurrentChatIndex', 'getCharacter', 'getChatFromIndex', 'setChatToIndex']) if (typeof this.api[method] !== 'function') throw new Error();
      // Sequential calls prevent a later synchronous RPC setup failure from orphaning
      // an earlier rejecting Promise as an unhandled rejection.
      const characterIndex = await this.api.getCurrentCharacterIndex();
      const chatIndex = await this.api.getCurrentChatIndex();
      const character = await this.api.getCharacter();
      if (!Number.isInteger(characterIndex) || characterIndex < 0 || !Number.isInteger(chatIndex) || chatIndex < 0 || !character || typeof character !== 'object') throw new Error();
      const chat = await this.api.getChatFromIndex(characterIndex, chatIndex);
      if (!chat || typeof chat !== 'object') throw new Error();
      const characterId = scopeText(character.chaId) || scopeText(character.id) || scopeText(character.name);
      if (!characterId) return { available: false, writeBlocked: true, warning: '캐릭터의 안정 ID를 확인할 수 없습니다.' };
      const characterName = scopeText(character.name) || characterId;
      const chatName = scopeText(chat.name) || scopeText(chat.title) || `Chat ${chatIndex + 1}`;
      const chats = Array.isArray(character.chats) ? character.chats : [];
      const pluginId = scopeText(chat[CHAT_SCOPE_FIELD]);
      if (pluginId) {
        if (scopeIsCopy(chats, chatIndex, chat, pluginId)) {
          const pendingKey = this.forkKey(characterId, chatIndex, pluginId);
          const candidateChatKey = this.forkTarget(pendingKey, chats, chatIndex, chat);
          return { available: false, writeBlocked: true, duplicate: true, warning: '복사·분기된 채팅이 기존 Wiki 범위를 공유하고 있습니다. 독립 범위로 분리하는 중입니다.', characterId, characterName, chatName, characterIndex, chatIndex, chat, sourceChatKey: pluginId, candidateChatKey };
        }
        return { available: true, writeBlocked: false, personaBinding:String(chat.bindedPersona||''), identityCharacter:scopedIdentityCharacter(character,chat), characterId, characterName, chatName, characterIndex, chatIndex, chatKey: pluginId, source: CHAT_SCOPE_FIELD };
      }
      const adopted = scopeText(chat.id) || this.idFactory();
      const pinned = await this.pin(characterIndex, chatIndex, chat, adopted);
      if (!pinned) return { available: false, writeBlocked: true, warning: '채팅 목록이 바뀌었거나 범위 ID를 기록하지 못했습니다. 현재 Wiki 쓰기를 잠급니다.' };
      return { available: true, writeBlocked: false, personaBinding:String(chat.bindedPersona||''), identityCharacter:scopedIdentityCharacter(character,chat), characterId, characterName, chatName, characterIndex, chatIndex, chatKey: adopted, source: chat.id ? 'chat.id:pinned' : `${CHAT_SCOPE_FIELD}:generated` };
    } catch {
      return { available: false, writeBlocked: true, warning: '현재 채팅 범위를 읽지 못했습니다. 다른 설정은 계속 사용할 수 있습니다.' };
    }
  }
  async resolveAt(character, chat, characterIndex, chatIndex) {
    if (!this.isEnabled() || !character || !chat) return { available: false, writeBlocked: true };
    const characterId = scopeText(character.chaId) || scopeText(character.id) || scopeText(character.name); if (!characterId) return { available: false, writeBlocked: true };
    const characterName = scopeText(character.name) || characterId, chatName = scopeText(chat.name) || scopeText(chat.title) || `Chat ${chatIndex + 1}`;
    const pluginId = scopeText(chat[CHAT_SCOPE_FIELD]);
    if (pluginId) {
      const chats = Array.isArray(character.chats) ? character.chats : [];
      if (scopeIsCopy(chats, chatIndex, chat, pluginId)) { const pendingKey = this.forkKey(characterId, chatIndex, pluginId); const candidateChatKey = this.forkTarget(pendingKey, chats, chatIndex, chat); return { available: false, duplicate: true, characterId, characterName, chatName, characterIndex, chatIndex, chat, sourceChatKey: pluginId, candidateChatKey }; }
      return { available: true, writeBlocked: false, personaBinding:String(chat.bindedPersona||''), identityCharacter:scopedIdentityCharacter(character,chat), characterId, characterName, chatName, characterIndex, chatIndex, chatKey: pluginId, source: CHAT_SCOPE_FIELD };
    }
    const adopted = scopeText(chat.id) || this.idFactory();
    if (!await this.pin(characterIndex, chatIndex, chat, adopted)) return { available: false, writeBlocked: true };
    return { available: true, writeBlocked: false, personaBinding:String(chat.bindedPersona||''), identityCharacter:scopedIdentityCharacter(character,chat), characterId, characterName, chatName, characterIndex, chatIndex, chatKey: adopted, source: 'target:pinned' };
  }
}
