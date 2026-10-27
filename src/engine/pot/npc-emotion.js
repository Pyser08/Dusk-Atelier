// 출처: risupot 2.3.0 src/npc-emotion.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const NPC_EMOTION_SLOT='core.npc_emotion';
export const NPC_EMOTION_LIMIT=360;
export const NPC_EMOTION_CONTROL='For each owner -> target pair, maintain exactly ONE core.npc_emotion entry. Reuse its supplied entry_ref and replace its complete current feelings/reason when updating; never append a new entry for a new turn, feeling, or reason. Do not accumulate past emotion stages in the current text. If duplicate entries already exist, return one current upsert for that target, not updates for each old entry. For core.npc_emotion, write only CURRENT emotions felt by this Character toward exactly one other NPC. Use 1-3 short Korean emotion names plus one brief evidenced reason: "[emotion1, emotion2] brief reason." The reason must be one short sentence explaining the depicted appraisal of the target that causes the named feeling, not a scene recap or a sequence of actions. Mention an action only as a brief cue. Do not invent motives or expectations; if the cause is unknown, say so. When revising an action-summary reason, preserve supported feelings and appraisal rather than every action detail. Do not add numeric scores. Relationship status and roles stay in core.relationship; broader attitudes, intentions and knowledge gaps remain in their existing slots. Do not infer feelings from being coworkers, partners, co-present, or a general personality trait. If this slot is missing and current RP supports a feeling, initialize it without requiring a relationship change. Otherwise update only for a material current feeling change, an evidenced cause change, or the requested correction of an action-summary reason; preserve unchanged correct data. Do not mirror these new NPC emotion tags into legacy affinity.regard.qualitative. Never invent the reciprocal direction, target actor:user, or target the owning Character. Do not copy a relationship paragraph into this slot.';
const emotionText=value=>String(value??'').normalize('NFC').trim();
export function npcEmotionParts(text){
  const raw=emotionText(text);let names='',reason='';
  const bracket=raw.match(/^(?:감정\s*[:：]\s*)?\[([^\]]+)\]\s*([\s\S]+)$/u);
  if(bracket){names=bracket[1];reason=bracket[2];}
  else{const lines=raw.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);if(lines.length>=2){names=lines[0].replace(/^(?:감정|키워드)\s*[:：]\s*/u,'');reason=lines.slice(1).join(' ');}}
  const tags=[...new Set(names.split(/[,，·|/]/u).map(emotionText).filter(Boolean))];reason=reason.replace(/^(?:이유|사유)\s*[:：]\s*/u,'').replace(/\s+/gu,' ').trim();
  const valid=tags.length>=1&&tags.length<=3&&tags.every(tag=>tag.length<=16&&!/[\[\]\n\r:：<>]/u.test(tag))&&reason.length>=1&&reason.length<=280&&raw.length<=NPC_EMOTION_LIMIT;
  return{valid,tags:valid?tags:[],reason:valid?reason:raw};
}
function formatNpcEmotion(tags,reason){
  const list=Array.isArray(tags)?tags:String(tags??'').split(/[,，·|/]/u),text='['+list.map(emotionText).filter(Boolean).join(', ')+'] '+emotionText(reason).replace(/\s+/gu,' '),parsed=npcEmotionParts(text);
  if(!parsed.valid)throw new Error('감정은 1~3개(각 16자 이하), 이유는 1~280자로 입력해주세요.');
  return'['+parsed.tags.join(', ')+'] '+parsed.reason;
}
export function canonicalNpcEmotionText(text){const parsed=npcEmotionParts(text);if(!parsed.valid)throw new Error('NPC 감정은 [감정1, 감정2] 짧은 이유 형식으로 작성해주세요.');return formatNpcEmotion(parsed.tags,parsed.reason);}
export function npcEmotionTargetAllowed(owner,targets){return Array.isArray(targets)&&targets.length===1&&targets[0]!=='actor:user'&&targets[0]!==owner;}
export function npcEmotionReference(section,documents={}){
  if(section.provenance?.slotId!==NPC_EMOTION_SLOT)return{heading:section.heading,body:section.body};
  const refs=section.provenance.targetRefs||[];
  return{heading:section.heading,body:section.body,slot_id:NPC_EMOTION_SLOT,target_refs:[...refs],target_names:refs.map(ref=>documents[ref]?.title||ref)};
}
