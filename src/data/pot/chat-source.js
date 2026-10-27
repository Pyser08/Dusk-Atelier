// 출처: risupot 2.3.0 src/chat-source.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { CHAT_SCOPE_FIELD } from '../../engine/pot/chat-scope.js';
import { STAGE_CONTEXT_MAX, stageContextCount } from '../../engine/pot/stage-context.js';
import { chatTraceTurn } from './trace-turn.js';
import { loadUserActor } from '../../engine/pot/user-identity.js';

const WRITER_RECENT_CONTEXT_MAX_CHARS=16000;

export function messageText(message) {
  if (!message || typeof message !== 'object') return '';
  if (Array.isArray(message.swipes) && message.swipes.length) {
    const selected = message.swipes[Number.isInteger(message.swipeId) ? message.swipeId : message.swipes.length - 1];
    if (typeof selected === 'string' && selected.trim()) return selected;
  }
  for (const value of [message.data, message.content, message.text, message.saying]) {
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.text === 'string' && value.text.trim()) return value.text;
    if (Array.isArray(value)) {
      const text = value.map(item => typeof item === 'string' ? item : typeof item?.text === 'string' ? item.text : '').join('');
      if (text.trim()) return text;
    }
  }
  return '';
}
const assistantRole = role => ['char', 'assistant', 'bot', 'model'].includes(String(role || '').toLowerCase());
const userRole = role => ['user', 'human'].includes(String(role || '').toLowerCase());
export function extractRecentRp(chat) {
  const messages = Array.isArray(chat?.message) ? chat.message : Array.isArray(chat?.messages) ? chat.messages : [];
  let assistant = null, user = null;
  for (let index = messages.length - 1; index >= 0; index--) {
    const item = messages[index], text = messageText(item);
    if (!text) continue;
    if (!assistant && assistantRole(item.role)) assistant = { index, id: String(item.chatId || item.id || `index:${index}`), text };
    else if (assistant && index < assistant.index && userRole(item.role)) { user = { index, id: String(item.chatId || item.id || `index:${index}`), text }; break; }
  }
  return { assistant, user, messageCount: messages.length };
}
export function extractRpAt(chat, assistantIndex) {
  const messages = Array.isArray(chat?.message) ? chat.message : [];
  const item = messages[assistantIndex], text = messageText(item);
  if (!item || !assistantRole(item.role) || !text) return { assistant: null, user: null, messageCount: messages.length };
  let user = null; for (let index = assistantIndex - 1; index >= 0; index--) if (userRole(messages[index]?.role) && messageText(messages[index])) { user = { index, id: String(messages[index].chatId || messages[index].id || `index:${index}`), text: messageText(messages[index]) }; break; }
  return { assistant: { index: assistantIndex, id: String(item.chatId || item.id || `index:${assistantIndex}`), text }, user, messageCount: messages.length };
}
export function extractWriterRecentContext(chat,currentAssistantIndex,{pairs=2,maxChars=WRITER_RECENT_CONTEXT_MAX_CHARS}={}){const messages=Array.isArray(chat?.message)?chat.message:Array.isArray(chat?.messages)?chat.messages:[],current=extractRpAt(chat,currentAssistantIndex),found=[];let cursor=current.user?.index??currentAssistantIndex;while(found.length<Math.max(0,Math.min(STAGE_CONTEXT_MAX,Number(pairs)||0))){let assistant=null;for(let index=cursor-1;index>=0;index--){const text=messageText(messages[index]);if(assistantRole(messages[index]?.role)&&text){assistant={index,id:String(messages[index].chatId||messages[index].id||`index:${index}`),text};break;}}if(!assistant)break;let user=null;for(let index=assistant.index-1;index>=0;index--){const text=messageText(messages[index]);if(userRole(messages[index]?.role)&&text){user={index,id:String(messages[index].chatId||messages[index].id||`index:${index}`),text};break;}}if(!user)break;found.push({user,assistant});cursor=user.index;}const limit=Math.max(0,Math.min(WRITER_RECENT_CONTEXT_MAX_CHARS,Number(maxChars)||0)),blocks=[];let used=0;for(let index=0;index<found.length&&used<limit;index++){const pair=found[index],header=`[PRIOR COMPLETED TURN ${index+1} · NEWEST FIRST]\nUSER (${pair.user.id}):\n`,middle=`\nASSISTANT (${pair.assistant.id}):\n`,available=limit-used-header.length-middle.length;if(available<=0)break;let userText=pair.user.text,assistantText=pair.assistant.text;if(userText.length+assistantText.length>available){const userBudget=Math.min(userText.length,Math.floor(available/2)),assistantBudget=Math.min(assistantText.length,available-userBudget);userText=userText.slice(0,userBudget);assistantText=assistantText.slice(0,assistantBudget);const spare=available-userText.length-assistantText.length;if(spare>0&&pair.assistant.text.length>assistantText.length)assistantText+=pair.assistant.text.slice(assistantText.length,assistantText.length+spare);}const block=header+userText+middle+assistantText;blocks.push(block);used+=block.length;}return{pairs:found,content:blocks.join('\n\n').slice(0,limit),maxChars:limit};}
export async function readCurrentRpSource(api, expectedScope = null, settings = null) {
  for (const name of ['getCurrentCharacterIndex', 'getCurrentChatIndex', 'getChatFromIndex']) if (typeof api[name] !== 'function') throw new Error('최근 RP를 읽는 호스트 기능을 사용할 수 없습니다.');
  const characterIndex = await api.getCurrentCharacterIndex(), chatIndex = await api.getCurrentChatIndex();
  const chat = await api.getChatFromIndex(characterIndex, chatIndex);
  if (!chat || typeof chat !== 'object') throw new Error('현재 채팅을 읽지 못했습니다.');
  const chatKey = String(chat[CHAT_SCOPE_FIELD] || chat.id || '');
  if (expectedScope && (String(expectedScope.chatKey) !== chatKey || String(expectedScope.characterIndex ?? characterIndex) !== String(characterIndex) || String(expectedScope.chatIndex ?? chatIndex) !== String(chatIndex))) throw new Error('현재 채팅 범위가 바뀌었습니다.');
  const recent=extractRecentRp(chat),recentContext=recent.assistant?extractWriterRecentContext(chat,recent.assistant.index,{pairs:stageContextCount(settings,'writer')}).content:'';return { characterIndex, chatIndex, chatKey, chatName: String(chat.name || chat.title || `Chat ${chatIndex + 1}`), ...recent,recentContext,userIdentity:await loadUserActor(api,chat,{characterId:expectedScope?.characterId,chatKey,characterIndex,chatIndex}),turnNumber:chatTraceTurn(chat,recent.assistant?.index??null) };
}
export async function writerSourceIsCurrent(api,source){
  try{if(await api.getCurrentCharacterIndex()!==source.characterIndex||await api.getCurrentChatIndex()!==source.chatIndex)return false;const chat=await api.getChatFromIndex(source.characterIndex,source.chatIndex);return String(chat?.[CHAT_SCOPE_FIELD]||chat?.id||'')===source.chatKey;}catch{return false;}
}
export async function readWriterSourceCharacter(api,source){
  if(!await writerSourceIsCurrent(api,source))throw new Error('Writer 자료를 읽기 전에 현재 채팅이 변경되었습니다.');
  return typeof api.getCharacterFromIndex==='function'?await api.getCharacterFromIndex(source.characterIndex):null;
}
export async function readWriterSourceChat(api,source){
  if(!source||await api.getCurrentCharacterIndex()!==source.characterIndex||await api.getCurrentChatIndex()!==source.chatIndex)throw new Error('참고 대화를 읽기 전에 현재 채팅이 변경되었습니다.');
  const chat=await api.getChatFromIndex(source.characterIndex,source.chatIndex);
  if(!chat||String(chat[CHAT_SCOPE_FIELD]||chat.id||'')!==source.chatKey||await api.getCurrentCharacterIndex()!==source.characterIndex||await api.getCurrentChatIndex()!==source.chatIndex)throw new Error('참고 대화를 읽는 동안 현재 채팅이 변경되었습니다.');
  return chat;
}
