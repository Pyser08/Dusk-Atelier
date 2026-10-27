// 출처: risupot 2.3.0 src/npc-emotion-upsert.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { NPC_EMOTION_SLOT, npcEmotionTargetAllowed } from './npc-emotion.js';

export function coalesceNpcEmotionUpdates(before,proposed,owner,pins=[]){
  const target=section=>section?.provenance?.slotId===NPC_EMOTION_SLOT&&npcEmotionTargetAllowed(owner,section.provenance.targetRefs)?section.provenance.targetRefs[0]:null;
  const byId=new Map(before.map(section=>[section.id,section])),updates=new Map();
  for(const section of proposed){const ref=target(section);if(ref!==null&&JSON.stringify(byId.get(section.id))!==JSON.stringify(section))updates.set(ref,section);}
  if(!updates.size)return proposed;
  const replacements=new Map();
  for(const[ref,incoming]of updates){
    const existing=before.filter(section=>target(section)===ref),pinned=existing.filter(section=>pins.includes('section:'+section.id));
    // A pin protects this owner/target pair even when a model supplies a new entry ID.
    // Multiple already-pinned duplicates remain until the user unpins them.
    if(pinned.length){replacements.set(ref,pinned);continue;}
    const anchor=existing.find(section=>section.id===incoming.id)||existing[0];
    replacements.set(ref,[anchor?{...incoming,id:anchor.id,provenance:{...incoming.provenance,entryRef:anchor.provenance.entryRef||incoming.provenance.entryRef,contextKey:null}}:incoming]);
  }
  const emitted=new Set(),result=[];
  for(const section of proposed){const ref=target(section);if(!replacements.has(ref)){result.push(section);continue;}if(!emitted.has(ref)){result.push(...replacements.get(ref));emitted.add(ref);}}
  return JSON.stringify(result)===JSON.stringify(proposed)?proposed:result;
}
