// 출처: risupot 2.3.0 src/manual-ai-options.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { trackingScopeKey, validTrackingScopeKey } from './auto-tracking.js';
import { HYPA_REFERENCE_DEFAULT_ITEMS, HYPA_REFERENCE_MAX_ITEMS } from './hypa-reference.js';
import { STAGE_CONTEXT_MAX } from './stage-context.js';

const MANUAL_AI_REFERENCE_DEFAULTS=Object.freeze({recentTurns:2,memorySource:'off',memoryLimit:HYPA_REFERENCE_DEFAULT_ITEMS});
export function normalizeManualAIReferenceOptions(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['recentTurns','memorySource','memoryLimit'].includes(key)))throw new Error('AI 참고 설정 형식이 잘못되었습니다.');
  const result={...MANUAL_AI_REFERENCE_DEFAULTS,...value};
  if(!Number.isInteger(result.recentTurns)||result.recentTurns<0||result.recentTurns>STAGE_CONTEXT_MAX)throw new Error(`최근 대화는 0~${STAGE_CONTEXT_MAX}턴이어야 합니다.`);
  if(!['off','hypa','hypaplus'].includes(result.memorySource)||!Number.isInteger(result.memoryLimit)||result.memoryLimit<0||result.memoryLimit>HYPA_REFERENCE_MAX_ITEMS)throw new Error(`기억 종류와 참조 개수(0~${HYPA_REFERENCE_MAX_ITEMS})를 확인해주세요.`);
  return result;
}
export function normalizeManualAIReferenceSettings(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>512)throw new Error('채팅별 AI 참고 설정은 최대 512개 채팅의 객체여야 합니다.');
  const result={};for(const[key,options]of Object.entries(value)){if(!validTrackingScopeKey(key))throw new Error('AI 참고 설정의 채팅 키가 잘못되었습니다.');result[key]=normalizeManualAIReferenceOptions(options);}return result;
}
export function manualAIReferenceOptions(settings,scope){const key=trackingScopeKey(scope),map=settings?.manualAIReferencesByScope;return normalizeManualAIReferenceOptions(key&&map&&Object.hasOwn(map,key)?map[key]:{});}
export function setManualAIReferenceOptions(settings,scope,options){
  const key=trackingScopeKey(scope);if(!key)throw new Error('현재 채팅을 확인한 뒤 참고 설정을 저장해주세요.');
  const value=normalizeManualAIReferenceOptions(options),map={...(settings.manualAIReferencesByScope||{})};
  if(!Object.hasOwn(map,key)&&Object.keys(map).length>=512)throw new Error('AI 참고 설정의 채팅 수 한도에 도달했습니다.');map[key]=value;settings.manualAIReferencesByScope=map;return settings;
}
