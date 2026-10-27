// 출처: risupot 2.3.0 src/people-records.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { APPRAISAL_CURRENT_SLOT, APPRAISAL_FIRST_SLOT, APPRAISAL_LABELS, isAppraisalSlot } from './appraisal-records.js';
import { ensureOverviewInSections } from './character-overview.js';
import { manuallySetMetric } from './metric-engine.js';
import { NPC_EMOTION_LIMIT, NPC_EMOTION_SLOT, canonicalNpcEmotionText, npcEmotionTargetAllowed } from './npc-emotion.js';
import { overviewSections, resolveOverviewSection } from './overview-owner.js';
import { peopleItemPinned } from './people-pins.js';
import { isCharacterOverviewSection } from './relationship-mode.js';
import { WIKI_LIMITS, makeWikiId, normalizeWikiScope, updateWikiDocument } from './wiki-schema.js';

const PERSON_RELATION_FIELDS={'register.context':'관계·지위·상황','register.stage_assessment':'관계 단계 판단','register.knowledge_gap':'서로 아는 정보의 차이','affinity.intent':'관심과 관계 의도','affinity.stance':'상대를 해석하고 대하는 태도','affinity.bind':'관계의 제약과 대처','affinity.private':'표현하지 않은 감정','affinity.approach':'접근과 확인된 경계'};
const PERSON_TEXT_FIELDS={
  emotion:{[NPC_EMOTION_SLOT]:'감정'},overview:{'core.identity':'기본정보','core.relationship':'확인된 관계'},relationship:PERSON_RELATION_FIELDS,
  behavior:{'core.behavior':'기본 행동 경향','core.current_state':'현재 상태','affinity.surface_actual':'겉으로 보이는 행동과 실제 목적','affinity.behavior.qualitative':'호감에 따른 행동','register.restraint':'감정과 표현의 절제'},
  openness:{'openness.context':'태도의 배경과 조건','openness.attitude.qualitative':'성적 태도','openness.behavior.qualitative':'태도에 따른 행동'},
  appraisal:{[APPRAISAL_FIRST_SLOT]:'첫인상',[APPRAISAL_CURRENT_SLOT]:'현재 평가'},knowledge:{'core.knowledge':'알고 있는 정보'},
  userRelationship:{'core.relationship':'현재 페르소나와의 관계'},speech:{'core.speech':'대상별 말투'},npc:{'core.relationship':'NPC 간 관계'},
  secret:{'perception.secret':'비밀'},suspicion:{'suspicion.clue':'불륜 의심'}
};
const PERSON_RECORD_GROUPS={emotion:{label:'다른 NPC 감정',slot:NPC_EMOTION_SLOT,feature:'core',maximum:NPC_EMOTION_LIMIT},overview:{label:'인물 개요',slot:'core.identity',feature:'core',maximum:700},secret:{label:'비밀',slot:'perception.secret',feature:'perception',maximum:900},suspicion:{label:'불륜 의심',slot:'suspicion.clue',feature:'suspicion',maximum:900},relationship:{label:'관계 태도·인지 차이',slot:'register.context',feature:'register',maximum:900},behavior:{label:'행동 경향',slot:'core.behavior',maximum:900},openness:{label:'음란도 태도·행동',slot:'openness.context',maximum:900},appraisal:{label:'상대별 평가',slot:APPRAISAL_FIRST_SLOT,maximum:900},knowledge:{label:'알고 있는 정보',slot:'core.knowledge',maximum:1200},userRelationship:{label:'현재 페르소나와의 관계',slot:'core.relationship',maximum:900},speech:{label:'대상별 말투',slot:'core.speech',maximum:700},npc:{label:'NPC 간 관계',slot:'core.relationship',maximum:900}};
function personRecordTargetMode(group,slotId){if(group==='userRelationship')return'user';if(group==='npc'||group==='emotion')return'npc';if(['core.identity','core.current_state'].includes(slotId))return'none';if(slotId==='core.speech'||slotId==='core.relationship'||slotId.startsWith('affinity.')||slotId.startsWith('register.'))return'required';return'optional';}
export function resolvePersonRecordInput(scope,documentId,{group,slotId,targetRef=''}){
  if(!Object.hasOwn(PERSON_TEXT_FIELDS,group))throw new Error('작성할 항목 종류를 선택해주세요.');
  const fields=PERSON_TEXT_FIELDS[group],rule=PERSON_RECORD_GROUPS[group];slotId||=rule?.slot;
  if(!fields||!Object.hasOwn(fields,slotId))throw new Error('작성할 항목 종류를 선택해주세요.');
  const mode=personRecordTargetMode(group,slotId);if(mode==='none')targetRef='';if(mode==='user')targetRef='actor:user';
  if((mode==='required'||mode==='npc')&&!targetRef||mode==='npc'&&targetRef==='actor:user'||targetRef&&targetRef!=='actor:user'&&(targetRef===documentId||scope.documents[targetRef]?.type!=='Character'))throw new Error('실제 관계 대상을 선택해주세요.');
  return{slotId,label:fields[slotId],targetRefs:targetRef?[targetRef]:[],featureId:slotId.split('.')[0],mode:slotId.startsWith('core.')?'core':slotId.endsWith('.qualitative')?'qualitative':'enabled',assertion:slotId.startsWith('core.')&&slotId!=='core.speech'&&slotId!==NPC_EMOTION_SLOT?'fact':'assessment'};
}
const newPersonRecordFieldKey=input=>'new:record:'+encodeURIComponent(JSON.stringify(input));
function personTypeTitle(slotId,targetRefs=[]){for(const group of ['behavior','openness','secret','suspicion','speech'])if(Object.hasOwn(PERSON_TEXT_FIELDS[group],slotId||''))return PERSON_TEXT_FIELDS[group][slotId];if(targetRefs.length&&!targetRefs.includes('actor:user')){if(slotId==='core.relationship')return'NPC 간 관계';if(Object.hasOwn(PERSON_RELATION_FIELDS,slotId||''))return PERSON_RELATION_FIELDS[slotId];if(isAppraisalSlot(slotId))return APPRAISAL_LABELS[slotId];if(slotId==='affinity.regard.qualitative')return'호감·비호감 설명';}const computed={'affinity.behavior.numeric':'호감 수치에 따른 행동','openness.behavior.numeric':'음란도 수치에 따른 행동','openness.contraception.numeric':'피임 태도'};return Object.hasOwn(computed,slotId||'')?computed[slotId]:null;}
export function existingSinglePersonRecord(scope,documentId,{group,slotId,targetRefs=[]}){
  if(['knowledge','secret','suspicion'].includes(group))return null;
  return scope.documents?.[documentId]?.sections.find(item=>group==='overview'&&slotId==='core.identity'?isCharacterOverviewSection(item):item.provenance?.slotId===slotId&&JSON.stringify([...(item.provenance.targetRefs||[])].sort())===JSON.stringify([...targetRefs].sort()))||null;
}
export function personRecordTargetExists(scope,documentId,group,targetRef='',slotId=PERSON_RECORD_GROUPS[group]?.slot){
  const person=scope.documents?.[documentId];if(!person)return false;
  if(group==='overview'&&slotId==='core.identity')return overviewSections(person).length>0;
  if(['relationship','openness','appraisal'].includes(group))return person.sections.some(item=>item.provenance?.slotId===slotId&&JSON.stringify(item.provenance.targetRefs||[])===JSON.stringify(targetRef?[targetRef]:[]));
  if(!targetRef)return false;
  if(group==='overview'&&slotId==='core.relationship')return person.sections.some(item=>item.provenance?.slotId==='core.relationship'&&(item.provenance.targetRefs||[]).includes(targetRef));
  if(group==='emotion')return person.sections.some(item=>item.provenance?.slotId===NPC_EMOTION_SLOT&&(item.provenance.targetRefs||[]).includes(targetRef));
  if(group==='speech')return person.sections.some(item=>item.provenance?.slotId==='core.speech'&&((item.provenance.targetRefs||[]).includes(targetRef)||targetRef==='actor:user'&&!item.provenance.targetRefs?.length));
  if(group==='npc')return [...person.sections.map(item=>item.provenance||{}),...(person.metrics||[])].some(item=>(item.slotId==='core.relationship'||String(item.slotId||'').startsWith('affinity.'))&&(item.targetRefs||[]).includes(targetRef)&&!(item.targetRefs||[]).includes('actor:user'));
  return false;
}
function personRecordGroup(section){
  const slot=section?.provenance?.slotId,heading=String(section?.heading||'').replace(/\s+/g,'');
  if(slot===NPC_EMOTION_SLOT)return'emotion';
  if(isCharacterOverviewSection(section))return'overview';
  if(slot==='perception.secret'||!slot&&['비밀','비밀정보'].includes(heading))return'secret';
  if(slot?.startsWith('suspicion.')||!slot&&['불륜의심','의심단서','불륜단서'].includes(heading))return'suspicion';
  if(Object.hasOwn(PERSON_RELATION_FIELDS,slot||''))return'relationship';
  for(const group of ['behavior','openness','appraisal','knowledge','speech'])if(Object.hasOwn(PERSON_TEXT_FIELDS[group],slot||''))return group;
  if(slot==='core.relationship')return section.provenance.targetRefs?.includes('actor:user')?'userRelationship':'npc';
  return null;
}
export function updatePersonSection(scope,documentId,{id,title,text,expected,scopeKey},{now=new Date().toISOString()}={}){
  const next=normalizeWikiScope(scope),person=next.documents[documentId],currentScope=next.scope.characterId+'\n'+next.scope.chatKey;
  if(scopeKey!==currentScope||person?.type!=='Character')throw new Error('편집하던 인물이나 채팅이 바뀌었습니다.');
  const entry=person.sections.find(section=>section.id===id);if(!entry)throw new Error('편집할 항목이 없습니다.');
  if(peopleItemPinned(next,documentId,'section:'+id))throw new Error('고정핀을 먼저 해제해주세요.');
  if(expected!==JSON.stringify(entry))throw new Error('편집 중 항목이 갱신되었습니다. 초안을 보존했으니 최신 내용을 확인해주세요.');
  title=personTypeTitle(entry.provenance?.slotId,entry.provenance?.targetRefs)||title;
  if(typeof title!=='string'||!title.trim()||title.length>WIKI_LIMITS.titleChars||typeof text!=='string'||text.length>WIKI_LIMITS.bodyChars)throw new Error('제목 또는 본문의 길이가 허용 범위를 벗어났습니다.');
  if(entry.heading===title.trim()&&entry.body===text.trim())return next;
  const sections=person.sections.map(section=>section.id===id?{...section,heading:title.trim(),body:text.trim(),provenance:section.provenance?.kind==='writer'?{...section.provenance,manualEdited:true}:section.provenance}:section);
  return updateWikiDocument(next,documentId,{type:person.type,title:person.title,aliases:person.aliases,tags:person.tags,links:person.links,metrics:person.metrics,sections},{now});
}
export function deletePersonItem(scope,documentId,{id,kind,expected,scopeKey},{now=new Date().toISOString()}={}){
  const next=normalizeWikiScope(scope),person=next.documents[documentId];if(scopeKey!==next.scope.characterId+'\n'+next.scope.chatKey||person?.type!=='Character'||!['section','metric'].includes(kind))throw new Error('삭제할 인물 항목이나 채팅이 바뀌었습니다.');
  const list=kind==='metric'?person.metrics:person.sections,item=list.find(entry=>entry.id===id);if(!item)throw new Error('삭제할 항목이 없습니다.');
  if(peopleItemPinned(next,documentId,kind+':'+id))throw new Error('고정핀을 먼저 해제해주세요.');
  if(expected!==JSON.stringify(item))throw new Error('항목이 갱신되었습니다. 최신 내용을 확인한 뒤 삭제해주세요.');
  let sections=person.sections,metrics=person.metrics;if(kind==='metric')metrics=metrics.filter(entry=>entry.id!==id);else{sections=sections.filter(entry=>entry.id!==id);if(isCharacterOverviewSection(item)&&!overviewSections(sections).length)sections=ensureOverviewInSections(sections);}
  return updateWikiDocument(next,documentId,{type:person.type,title:person.title,aliases:person.aliases,tags:person.tags,links:person.links,sections,metrics},{now});
}
export function updatePersonMetric(scope,documentId,{id,value,reason,expected,scopeKey,isNew=false,slotId,targetRefs=[]},policy,{now=new Date().toISOString()}={}){
  const next=normalizeWikiScope(scope),person=next.documents[documentId];
  if(scopeKey!==next.scope.characterId+'\n'+next.scope.chatKey||person?.type!=='Character')throw new Error('편집하던 인물이나 채팅이 바뀌었습니다.');
  if(isNew){
    if(!['affinity.score','affinity.taste_band','openness.score','suspicion.score'].includes(slotId)||typeof id!=='string'||!id||expected!==null)throw new Error('새로 지정할 수치가 잘못되었습니다.');
    const affinity=slotId.startsWith('affinity.'),required=affinity?1:slotId==='suspicion.score'?2:0;
    if(!Array.isArray(targetRefs)||targetRefs.length!==required||new Set(targetRefs).size!==required||targetRefs.some(ref=>ref!=='actor:user'&&(ref===documentId||next.documents[ref]?.type!=='Character'))||affinity&&targetRefs[0]!=='actor:user')throw new Error(affinity?'새 호감도·첫인상은 현재 사용자 대상이어야 합니다.':'의심도는 서로 다른 관계 상대와 의심 상대를 선택해주세요.');
    if(person.metrics.some(item=>item.id===id||item.slotId===slotId&&(!affinity||JSON.stringify(item.targetRefs)===JSON.stringify(targetRefs))))throw new Error('편집 중 수치가 이미 지정되었습니다. 최신 수치를 다시 열어주세요.');
    const initial=manuallySetMetric({id,slotId,targetRefs,contextKey:null,value:0,status:'active',contributions:[]},value,policy,{reason,now});
    initial.lastDelta=0;initial.contributions=initial.contributions.map(item=>({...item,appliedDelta:0}));
    return updateWikiDocument(next,documentId,{type:person.type,title:person.title,aliases:person.aliases,tags:person.tags,links:person.links,sections:person.sections,metrics:[...person.metrics,initial]},{now});
  }
  const metric=person.metrics.find(item=>item.id===id);if(!metric)throw new Error('편집할 수치가 없습니다.');
  if(peopleItemPinned(next,documentId,'metric:'+id))throw new Error('고정핀을 먼저 해제해주세요.');
  if(expected!==JSON.stringify(metric))throw new Error('편집 중 수치가 갱신되었습니다. 초안을 보존했으니 최신 값을 확인해주세요.');
  const changed=manuallySetMetric(metric,value,policy,{reason,now});if(metric.value===changed.value&&metric.reason===changed.reason)return next;
  return updateWikiDocument(next,documentId,{type:person.type,title:person.title,aliases:person.aliases,tags:person.tags,links:person.links,sections:person.sections,metrics:person.metrics.map(item=>item.id===id?changed:item)},{now});
}
export function updatePersonRecord(scope,documentId,{id=null,group,title='',text,expected=null,slotId,targetRef='',scopeKey},{remove=false,now=new Date().toISOString()}={}){
  const next=normalizeWikiScope(scope),document=next.documents[documentId],rule=PERSON_RECORD_GROUPS[group];
  if(scopeKey!==undefined&&scopeKey!==next.scope.characterId+'\n'+next.scope.chatKey)throw new Error('편집하던 채팅이 바뀌어 저장하지 않았습니다.');
  if(document?.type!=='Character'||!rule)throw new Error('관리할 인물 정보가 없습니다.');
  const old=id?document.sections.find(section=>section.id===id):null;
  if(id&&(!old||personRecordGroup(old)!==group))throw new Error('편집할 항목이 변경되었습니다. 다시 열어주세요.');
  if(old&&peopleItemPinned(next,documentId,'section:'+id))throw new Error('고정핀을 해제한 뒤 수정해주세요.');
  if(old&&expected!==JSON.stringify(old))throw new Error('편집 중 인물정보가 갱신되었습니다. 최신 항목을 다시 열어주세요.');
  if(remove&&!old)throw new Error('삭제할 항목이 없습니다.');
  const definition=old?null:resolvePersonRecordInput(next,documentId,{group,slotId,targetRef});
  if(!old&&definition.slotId==='core.identity'&&resolveOverviewSection(document))throw new Error('기본정보가 이미 있습니다. 기존 항목의 편집 또는 AI 작성을 사용해주세요.');
  if(!old&&personRecordTargetExists(next,documentId,group,definition.targetRefs[0],definition.slotId))throw new Error('이미 작성된 대상과 항목입니다. 기존 항목의 편집 또는 AI 작성을 사용해주세요.');
  if(!old&&existingSinglePersonRecord(next,documentId,{group,...definition}))throw new Error('이미 같은 대상의 항목이 있습니다. 기존 항목을 편집해주세요.');
  const maximum=group==='overview'&&definition?.slotId==='core.relationship'?900:rule.maximum;
  if(!remove&&(typeof text!=='string'||!text.trim()||text.length>maximum||typeof title!=='string'||title.length>120))throw new Error(`내용은 1~${maximum}자, 제목은 120자 이하로 입력해주세요.`);
  if(!remove&&(old?.provenance?.slotId||definition?.slotId)===NPC_EMOTION_SLOT){const targets=old?.provenance?.targetRefs||definition.targetRefs;if(!npcEmotionTargetAllowed(documentId,targets))throw new Error('감정 대상은 다른 NPC 1명이어야 합니다.');text=canonicalNpcEmotionText(text);}
  const idValue=old?.id||makeWikiId('section'),sections=document.sections.filter(section=>section.id!==idValue);
  if(!remove){
    // Existing provenance/targets are retained; new records are explicitly user-authored.
    const provenance=old?.provenance?.kind==='writer'?{...old.provenance,manualEdited:true}:{kind:'writer',entryRef:`entry:${makeWikiId('manual')}`,slotId:rule.slot,featureId:rule.feature,mode:group==='overview'?'core':'enabled',targetRefs:[],contextKey:group==='overview'?null:idValue,assertion:group==='overview'?'fact':'assessment',evidenceRefs:['source:manual_input'],links:[],reason:'사용자가 인물 탭에서 직접 입력한 정보',requestRef:`req:manual_${Date.now().toString(36)}`,manualEdited:true};
    if(!old){Object.assign(provenance,definition);delete provenance.label;provenance.contextKey=['knowledge','secret','suspicion'].includes(group)?idValue:null;}
    const record={id:idValue,heading:group==='overview'?(PERSON_TEXT_FIELDS.overview[provenance.slotId]||'기본정보'):['behavior','openness','secret','suspicion','npc','speech'].includes(group)?personTypeTitle(provenance.slotId,provenance.targetRefs)||old?.heading||rule.label:!old&&group==='knowledge'?definition.label:title.trim()||old?.heading||definition?.label||rule.label,body:text.trim(),provenance};
    const index=old?document.sections.findIndex(section=>section.id===idValue):sections.length;sections.splice(index,0,record);
  }
  return updateWikiDocument(next,documentId,{type:document.type,title:document.title,aliases:document.aliases,tags:document.tags,sections:group==='overview'&&!overviewSections(sections).length?ensureOverviewInSections(sections):sections,links:document.links,metrics:document.metrics},{now});
}
