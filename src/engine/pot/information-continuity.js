// 출처: risupot 2.3.0 src/information-continuity.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { PERSONALITY_TEXT_KEYS, PROFILE_TEXT_FIELDS } from './people-field.js';

export const INFORMATION_CONTINUITY_NOTE='기존 정보를 유지했습니다. 미확인이나 빈 내용으로 기존 기록을 덮어쓸 수 없습니다.';
const INFORMATION_PLACEHOLDER_LABELS=new Set([
 '정보','기본정보','인물개요','프로필','성격','기본성격','성격요약','핵심기질','기질','가치관','중요가치',
 '감정','감정표현','감정표현방식','방어반응','친밀표현','친밀표현방식','말투','화법','어조','호칭','이유','사유',
 '관계','관계기록','관계태도','관계태도인지차이','사용자와의관계','지식','알고있는정보',
 '행동','행동경향','습관','장기변화','장기성격변화후보','성적욕망','이상성욕','비밀','불륜의심',
 '나이','직업','소속','summary','coretraits','values','emotionexpression','defenseresponse','intimacystyle'
]);
function isInformationPlaceholder(value){
 if(Array.isArray(value))return value.every(isInformationPlaceholder);
 if(value===null||value===undefined)return true;
 if(typeof value!=='string')return false;
 const text=value.normalize('NFC').trim();if(!text)return true;
 const bracket=text.match(/^\[([^\]]+)\]\s*(.+)$/u);
 if(bracket)return bracket[1].split(/[,，·|/]/u).every(isInformationPlaceholder)&&isInformationPlaceholder(bracket[2]);
 const parts=text.split(/[\n.!?。;；]+/u).map(part=>part.trim()).filter(Boolean);
 if(parts.length>1)return parts.every(isInformationPlaceholder);
 let compact=text.toLowerCase().replace(/[\s.!?。,:：;；()[\]{}"'“”‘’*`#·]+/gu,'');
 if(!compact)return true;
 // Only complete placeholder expressions count. Never search a substantive sentence for keywords.
 const placeholder=/^(?:미확인|미상|불명|불명확|알수없음|알수없다|알수없습니다|확인불가|확인되지않음|확인되지않았다|확인할수없음|파악되지않음|판단불가|정보없음|정보가없음|자료없음|자료가없음|unknown|unconfirmed|notknown|notobserved|notestablished|noinformation|n\/a)(?:입니다|이다)?$/u;
 if(placeholder.test(compact))return true;
 compact=compact.replace(/^(?:(?:현재|아직|정확한|구체적인|관련|이번대화|최근대화|이번장면|해당장면|제공된자료)(?:에서는|에서|에는|에|의)?)+/u,'');
 if(placeholder.test(compact))return true;
 for(const label of INFORMATION_PLACEHOLDER_LABELS)if(compact.startsWith(label)&&placeholder.test(compact.slice(label.length).replace(/^(?:은|는|이|가|을|를)/u,'')))return true;
 return false;
}
export function shouldPreserveInformation(previous,next){
 return !isInformationPlaceholder(previous)&&isInformationPlaceholder(next);
}
export function preservePersonalityInformation(previous,proposed,issues){
 for(const key of PERSONALITY_TEXT_KEYS)if(shouldPreserveInformation(previous[key],proposed[key])){
  proposed[key]=JSON.parse(JSON.stringify(previous[key]));
  issues.push((PROFILE_TEXT_FIELDS[key]?.label||key)+': '+INFORMATION_CONTINUITY_NOTE);
 }
 return proposed;
}
