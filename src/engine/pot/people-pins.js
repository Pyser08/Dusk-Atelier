// 출처: risupot 2.3.0 src/people-pins.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { NPC_EMOTION_SLOT } from './npc-emotion.js';

const PEOPLE_PIN_FIELDS=Object.freeze(['summary','coreTraits','values','emotionExpression','defenseResponse','intimacyStyle','longTermPatterns','sexualDesire','paraphilia',...['relationalInitiative','expressionDirectness','emotionalExpressiveness','guardedness','impulsivity','relationshipPersistence'].map(axis=>'axis:'+axis)]);
const pinClone=value=>JSON.parse(JSON.stringify(value));
const pinRecord=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function peoplePatternKey(text){const value=String(text||'').normalize('NFC').trim();let a=2166136261,b=2246822507;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b^value.charCodeAt(i),3266489909);}return'pattern:'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function normalizePeoplePins(raw){
  const result={};if(!pinRecord(raw))return result;
  for(const[id,items]of Object.entries(raw)){
    if(['__proto__','constructor','prototype'].includes(id)||!Array.isArray(items))continue;
    const keys=[...new Set(items.filter(key=>typeof key==='string'&&key.length<=1200&&(PEOPLE_PIN_FIELDS.includes(key)||/^(section|metric|pattern):.+$/.test(key))))].slice(0,1024);
    if(keys.length)result[id]=keys;
  }
  return result;
}
export const peopleItemPinned=(scope,documentId,key)=>Boolean(scope?.people?.pins?.[documentId]?.includes(key)||key?.startsWith('pattern:')&&scope?.people?.pins?.[documentId]?.includes('longTermPatterns'));
export const peopleProfilePinKey=axis=>axis==='sexual_desire'?'sexualDesire':axis==='paraphilia'?'paraphilia':axis==='qualitative'?'longTermPatterns':'axis:'+axis;
export function setPeopleItemPin(scope,documentId,key,enabled){
  const document=scope.documents?.[documentId];if(document?.type!=='Character')throw new Error('고정할 인물이 없습니다.');
  const profile=scope.people?.profiles?.[documentId];
  if(PEOPLE_PIN_FIELDS.includes(key)){if(!profile)throw new Error('기본 인물정보를 만든 뒤 고정할 수 있습니다.');}
  else if(key.startsWith('section:')){if(!document.sections.some(section=>section.id===key.slice(8)))throw new Error('고정할 항목이 없습니다.');}
  else if(key.startsWith('metric:')){if(!document.metrics.some(metric=>metric.id===key.slice(7)))throw new Error('고정할 수치가 없습니다.');}
  else if(key.startsWith('pattern:')){if(!profile?.longTermPatterns?.some(text=>peoplePatternKey(text)===key))throw new Error('고정할 장기변화가 없습니다.');}
  else throw new Error('지원하지 않는 고정 항목입니다.');
  const next=pinClone(scope),pins=normalizePeoplePins(next.people?.pins),items=new Set(pins[documentId]||[]);
  if(enabled)items.add(key);else items.delete(key);
  if(items.size)pins[documentId]=[...items];else delete pins[documentId];
  if(Object.keys(pins).length)next.people.pins=pins;else delete next.people.pins;
  next.revision++;next.scope.updatedAt=new Date().toISOString();return next;
}
export function preservePinnedProfile(before,after,keys=[]){
  const next=pinClone(after);
  for(const key of keys){
    if(key.startsWith('axis:')){const axis=key.slice(5);if(before.axes&&next.axes)next.axes[axis]=before.axes[axis];}
    else if(PEOPLE_PIN_FIELDS.includes(key)&&Object.hasOwn(before,key))next[key]=pinClone(before[key]);
  }
  const locked=(before.longTermPatterns||[]).map((text,index)=>({text,index})).filter(item=>keys.includes(peoplePatternKey(item.text)));
  if(locked.length&&!keys.includes('longTermPatterns')){const texts=new Set(locked.map(item=>item.text)),patterns=(next.longTermPatterns||[]).filter(text=>!texts.has(text));for(const item of locked)patterns.splice(Math.min(item.index,patterns.length),0,item.text);next.longTermPatterns=patterns.slice(0,30);}
  return next;
}
function pinnedIdentity(item,kind){
  const data=kind==='section'?item.provenance:item;
  if(!data?.slotId)return'';
  return JSON.stringify([data.slotId,[...(data.targetRefs||[])].sort(),data.contextKey??null]);
}
function preservePinnedList(before,after,keys,kind){
  let next=pinClone(after||[]);const originalIds=new Set((before||[]).map(item=>item.id));
  for(const old of before||[]){
    if(!keys.includes(kind+':'+old.id))continue;
    const identity=pinnedIdentity(old,kind),same=item=>item.id===old.id||Boolean(!originalIds.has(item.id)&&(identity&&pinnedIdentity(item,kind)===identity||kind==='section'&&old.provenance?.slotId!==NPC_EMOTION_SLOT&&item.provenance?.slotId!==NPC_EMOTION_SLOT&&item.heading===old.heading));
    const index=next.findIndex(same);next=next.filter(item=>!same(item));next.splice(index<0?Math.min((before||[]).indexOf(old),next.length):Math.min(index,next.length),0,pinClone(old));
  }
  return next;
}
function pinComparableDocument(document){const copy={...document};delete copy.version;delete copy.updatedAt;return JSON.stringify(copy);}
export function preservePeoplePins(before,proposed,{allowPinChanges=false}={}){
  const pins=normalizePeoplePins(before.people?.pins);if(!Object.keys(pins).length&&!Object.keys(proposed.people?.pins||{}).length)return proposed;
  const next=pinClone(proposed);next.people??={profiles:{},candidates:{}};next.people.profiles??={};next.documents??={};
  if(!allowPinChanges){if(Object.keys(pins).length)next.people.pins=pinClone(pins);else delete next.people.pins;}
  const oldHistory=new Set((before.history||[]).map(event=>event.id)),unchangedDocuments=new Set();
  for(const[id,keys]of Object.entries(pins)){
    const oldDocument=before.documents?.[id],oldProfile=before.people?.profiles?.[id];if(!oldDocument)continue;
    if(!next.documents[id]){next.documents[id]=pinClone(oldDocument);unchangedDocuments.add(id);}
    const document=next.documents[id];
    document.sections=preservePinnedList(oldDocument.sections,document.sections,keys,'section');
    document.metrics=preservePinnedList(oldDocument.metrics,document.metrics,keys,'metric');
    if(pinComparableDocument(document)===pinComparableDocument(oldDocument)){next.documents[id]=pinClone(oldDocument);unchangedDocuments.add(id);}
    if(oldProfile&&keys.some(key=>PEOPLE_PIN_FIELDS.includes(key)||key.startsWith('pattern:'))){
      next.people.profiles[id]=preservePinnedProfile(oldProfile,next.people.profiles[id]||oldProfile,keys);
      const comparable=profile=>{const copy={...profile};delete copy.updatedAt;delete copy.manualEdited;return JSON.stringify(copy);};
      if(comparable(next.people.profiles[id])===comparable(oldProfile))next.people.profiles[id]=pinClone(oldProfile);
    }
  }
  next.history=(next.history||[]).filter(event=>oldHistory.has(event.id)||!unchangedDocuments.has(event.documentId)).map(event=>{
    if(oldHistory.has(event.id)||!pins[event.documentId])return event;
    return{...event,after:next.documents[event.documentId]?pinClone(next.documents[event.documentId]):null};
  });
  return next;
}
export function peoplePinManifest(scope,documentRefs){
  const result={};
  for(const[ref,id]of Object.entries(documentRefs||{})){
    const keys=scope.people?.pins?.[id];if(!keys?.length)continue;
    const document=scope.documents[id];result[ref]={profile_fields:keys.filter(key=>PEOPLE_PIN_FIELDS.includes(key)),entries:document.sections.filter(entry=>keys.includes('section:'+entry.id)).map(entry=>({entry_ref:entry.provenance?.entryRef||entry.id,slot_id:entry.provenance?.slotId||entry.heading,target_refs:entry.provenance?.targetRefs||[]})),metrics:document.metrics.filter(metric=>metric.slotId!=='affinity.decorum'&&keys.includes('metric:'+metric.id)).map(metric=>({slot_id:metric.slotId,target_refs:metric.targetRefs,context_key:metric.contextKey}))};
    const patterns=(scope.people?.profiles?.[id]?.longTermPatterns||[]).filter(text=>keys.includes(peoplePatternKey(text)));if(patterns.length)result[ref].long_term_patterns=patterns;
  }
  return result;
}
