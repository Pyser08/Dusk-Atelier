// 출처: risupot 2.3.0 src/relationship-history.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const RELATIONSHIP_HISTORY_DEFAULT=4;
export const RELATIONSHIP_HISTORY_MAX=20;
const relationHistoryText=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
const relationHistoryAssert=(condition,message)=>{if(!condition)throw new Error(message);};
export function relationshipHistoryLimit(scope){return Number.isInteger(scope?.relationshipHistoryLimit)?scope.relationshipHistoryLimit:RELATIONSHIP_HISTORY_DEFAULT;}
export function normalizeRelationshipHistory(value,assert=relationHistoryAssert){
  if(value===undefined)return[];
  assert(Array.isArray(value)&&value.length<=RELATIONSHIP_HISTORY_MAX,'관계 이력은 최대 20개여야 합니다.');
  return value.map(item=>{
    assert(item&&typeof item==='object'&&!Array.isArray(item)&&Object.keys(item).every(key=>['body','assertion','at'].includes(key)),'관계 이력 형식이 잘못되었습니다.');
    assert(typeof item.body==='string'&&item.body.trim()&&item.body.length<=100000,'관계 이력 본문이 잘못되었습니다.');
    assert(['fact','belief','assessment'].includes(item.assertion)&&typeof item.at==='string'&&item.at.length<=80&&Number.isFinite(Date.parse(item.at)),'관계 이력의 종류 또는 시각이 잘못되었습니다.');
    return{body:item.body,assertion:item.assertion,at:item.at};
  });
}
const relationSignature=section=>section?.provenance?.slotId==='core.relationship'?JSON.stringify([...(section.provenance.targetRefs||[])].sort())+'\n'+String(section.provenance.contextKey||''):null;
export function preserveRelationshipHistory(before,after,{limit=RELATIONSHIP_HISTORY_DEFAULT,now=new Date().toISOString()}={}){
  if(before?.type!=='Character'||after?.type!=='Character')return after;
  const oldById=new Map(before.sections.map(section=>[section.id,section]));
  return{...after,sections:after.sections.map(section=>{
    const signature=relationSignature(section);if(signature===null)return section;
    let previous=oldById.get(section.id);
    if(previous&&relationSignature(previous)!==signature){const{relationshipHistory:_history,...fresh}=section;return fresh;}
    if(!previous){const matches=before.sections.filter(item=>relationSignature(item)===signature),destinations=after.sections.filter(item=>relationSignature(item)===signature);if(matches.length===1&&destinations.length===1)previous=matches[0];}
    if(!previous)return section;
    const history=normalizeRelationshipHistory(previous.relationshipHistory);
    if(relationHistoryText(previous.body)&&relationHistoryText(previous.body)!==relationHistoryText(section.body))history.push({body:previous.body,assertion:previous.provenance.assertion,at:now});
    const bounded=history.slice(-limit),{relationshipHistory:_history,...current}=section;
    return bounded.length?{...current,relationshipHistory:bounded}:current;
  })};
}
