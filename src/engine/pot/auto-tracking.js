// 출처: risupot 2.3.0 src/auto-tracking.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { resolveMergedIdentity } from './identity-links.js';

const AUTO_TRACKING_LIMITS=Object.freeze({scopes:512,documents:500,idChars:160,scopeIdChars:500});
const autoTrackingRecord=value=>value&&typeof value==='object'&&!Array.isArray(value);
const autoTrackingValidId=value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=AUTO_TRACKING_LIMITS.idChars&&!['__proto__','prototype','constructor'].includes(value);
export function trackingScopeKey(value){
  const scope=value?.scope||value;if(!scope||typeof scope.characterId!=='string'||typeof scope.chatKey!=='string')return'';
  const ids=[scope.characterId,scope.chatKey];if(ids.some(id=>!id||id.trim()!==id||id.length>AUTO_TRACKING_LIMITS.scopeIdChars))return'';
  try{return'scope:'+ids.map(encodeURIComponent).join(':');}catch{return'';}
}
export function validTrackingScopeKey(key){
  if(typeof key!=='string'||!key.startsWith('scope:'))return false;const parts=key.slice(6).split(':');if(parts.length!==2)return false;
  try{return trackingScopeKey({characterId:decodeURIComponent(parts[0]),chatKey:decodeURIComponent(parts[1])})===key;}catch{return false;}
}
export function normalizeTrackingSelections(value){
  if(!autoTrackingRecord(value)||Object.keys(value).length>AUTO_TRACKING_LIMITS.scopes)throw new Error('자동 추적 설정은 최대 512개 채팅의 객체여야 합니다.');
  const result={};for(const[key,ids]of Object.entries(value)){if(!validTrackingScopeKey(key)||!Array.isArray(ids)||ids.length>AUTO_TRACKING_LIMITS.documents||ids.some(id=>!autoTrackingValidId(id))||new Set(ids).size!==ids.length)throw new Error('자동 추적의 채팅 키 또는 인물 ID 목록이 잘못되었습니다.');result[key]=[...ids];}return result;
}
export function trackingSelectionIds(settings,scope){const key=trackingScopeKey(scope),map=settings?.trackedCharactersByScope;return key&&autoTrackingRecord(map)&&Array.isArray(map[key])?map[key].filter(autoTrackingValidId):[];}
export function trackedDocumentIds(settings,scope){if(!scope?.documents)return[];return[...new Set(trackingSelectionIds(settings,scope).map(id=>resolveMergedIdentity(scope,id)).filter(Boolean))];}
function setTrackingSelection(settings,scope,ids){
  const key=trackingScopeKey(scope);if(!autoTrackingRecord(settings)||!key||!scope?.documents||!Array.isArray(ids)||ids.length>AUTO_TRACKING_LIMITS.documents||ids.some(id=>!autoTrackingValidId(id)))throw new Error('현재 채팅과 추적할 인물을 먼저 확인해주세요.');
  const selected=[...new Set(ids.map(id=>resolveMergedIdentity(scope,id)).filter(Boolean))],map=autoTrackingRecord(settings.trackedCharactersByScope)?{...settings.trackedCharactersByScope}:{};
  if(selected.length){if(!Object.hasOwn(map,key)&&Object.keys(map).length>=AUTO_TRACKING_LIMITS.scopes)throw new Error('자동 추적 설정의 채팅 수 한도에 도달했습니다.');map[key]=selected;}else delete map[key];settings.trackedCharactersByScope=map;return settings;
}
export function automaticTrackingPolicy(settings,scope,fixedFilter=null){
  const tracked=trackedDocumentIds(settings,scope),automatic=settings?.autoWriterEnabled!==false;
  let ownerFilter=fixedFilter;
  if(!automatic)ownerFilter={kind:'router-fixed',keywords:[],canonicalNames:[],documentIds:[...tracked],origin:'tracking-only',trackedDocumentIds:[...tracked]};
  else if(fixedFilter)ownerFilter={...fixedFilter,documentIds:[...new Set([...(fixedFilter.documentIds||[]),...tracked])],origin:tracked.length?'router-fixed-and-tracking':'router-fixed',trackedDocumentIds:[...tracked]};
  return{enabled:Boolean(settings?.enabled&&(automatic||tracked.length)),automatic,trackedDocumentIds:tracked,allowCreate:automatic,ownerFilter,origin:!automatic?'tracking-only':tracked.length?'automatic-and-tracking':'automatic'};
}
/** Match callback A using A's immutable bot/chat snapshot, never the currently visible room B. */
export function trackingCallbackScope(arg){
  const characterId=String(arg?.char?.chaId||arg?.char?.id||arg?.char?.name||'').trim(),chat=arg?.chat,pluginId=String(chat?.risupotWikiScopeId||'').trim(),chatKey=pluginId||String(chat?.id||'').trim();
  if(pluginId&&(Array.isArray(arg?.char?.chats)?arg.char.chats:[]).some((other,index)=>index<arg.chatIndex&&String(other?.risupotWikiScopeId||'').trim()===pluginId))return null;
  const scope={characterId,chatKey};return trackingScopeKey(scope)?scope:null;
}
