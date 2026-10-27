// 출처: risupot 2.3.0 src/speech-continuity.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const SPEECH_CONTINUITY_NOTE='기존 대상별 말투를 유지했습니다. 이번 대화의 미확인은 말투 변경 근거가 아닙니다.';
const speechContinuityText=value=>String(value??'').normalize('NFC').toLocaleLowerCase().replace(/[\s.!?。·,:：;()[\]{}"'“”‘’]+/gu,'');
function isUnobservedSpeech(value){
 const parts=String(value??'').split(/[.!?。\n/;·()]+/).map(item=>item.trim()).filter(Boolean);if(parts.length>1)return parts.every(isUnobservedSpeech);
 const text=speechContinuityText(value);if(!text)return true;if(text.length>240)return false;
 if(/^(?:(?:현재|아직|정확한|구체적인|대상별|대상|직접|발화|발언|말투|화법|어조|호칭|은|는|을|를|이|가|및|정보|확인이))*?(?:미확인|미상|불명|불명확|알수없음|확인불가|확인되지않음|확인되지않았다|파악되지않음|판단불가|정보없음|자료없음|unknown|unconfirmed|notknown|notobserved|notestablished)$/.test(text))return true;
 if(/^(?:반말인지존댓말인지|반말존댓말여부|존대여부|말투종류)(?:는|가)?(?:미확인|알수없음|확인불가)$/.test(text))return true;
 // This covers only entries whose entire conclusion is no observation. A mixed
 // record with an actual register/style remains an ordinary, evidence-checked edit.
 if(/반말|존댓말|존대|해요체|하십시오체|격식체|하오체|해체|친근|정중|공손|거친|반존대/.test(text))return false;
 return /^(?:(?:현재|이번턴|이번대화|최근대화|해당장면|이장면)(?:에서|에서는|에)?)*(?:[\p{L}\p{N}_]{1,25}(?:에게|와의|과의|와|과|에대한))?(?:직접)?(?:대화|발화|발언|말한적|말투|상호작용)(?:가|를|은|는|이|을)?(?:직접)?(?:없음|없다|없었다|없어|없어서|없으므로|없기에|관찰되지않아|관찰되지않음|확인되지않아|확인되지않음|확인할수없음)(?:(?:현재|구체적인|정확한|말투|어조|호칭|정보|은|는|이|가|아직|따라서|미확인|미상|확인불가|알수없음|판단할수없음))*$/u.test(text);
}
export function shouldPreserveSpeech(slotId,previous,next){return (slotId==='core.speech'||/^(?:affinity|openness|suspicion)\.speech\.(?:qualitative|numeric)$/.test(slotId||''))&&!isUnobservedSpeech(previous)&&isUnobservedSpeech(next);}
