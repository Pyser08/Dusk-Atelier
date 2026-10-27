// 출처: risupot 2.3.0 src/npc-relationship.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

function npcRelationshipSlot(slotId){
  const id=String(slotId||'');
  return id==='core.relationship'||id==='core.speech'||id==='core.npc_emotion'||id.startsWith('affinity.')||id.startsWith('suspicion.');
}

function npcOnlyTargets(targetRefs=[]){
  return Array.isArray(targetRefs)&&targetRefs.length>0&&!targetRefs.includes('actor:user');
}

function npcRelationshipRecord(slotId,targetRefs=[]){
  return npcRelationshipSlot(slotId)&&npcOnlyTargets(targetRefs);
}

export function npcRelationshipAllowed(slotId,targetRefs,enabled){
  return enabled!==false||!npcRelationshipRecord(slotId,targetRefs);
}
