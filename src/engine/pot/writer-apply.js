// 출처: risupot 2.3.0 src/writer-apply.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { preserveFirstAppraisalSections } from './appraisal-records.js';
import { ensureOverviewInSections } from './character-overview.js';
import { CYCLE_HEADING, CYCLE_SLOT, formatCycleBody, isCycleSection, nextCycleState, parseCycleBody, takeCycleMarkers } from './cycle-tracking.js';
import { applyMetricOperations } from './metric-engine.js';
import { preservePeoplePins } from './people-pins.js';
import { applyPeopleOperations } from './people-profile.js';
import { applySpeechSign } from './speech-variety.js';
import { createWikiDocument, makeWikiId, normalizeWikiScope, updateWikiDocument } from './wiki-schema.js';
import { WRITER_MANUAL_IMPORT, writerManualReason } from './writer-import-mode.js';

// and identity checks work even when the model left aliases_add empty.

const TYPE_NAME={character:'Character',event:'Event',scene:'Scene',location:'Location',faction:'Faction',item:'Item',concept:'Concept',other:'Other'};
const cloneWriterData=value=>JSON.parse(JSON.stringify(value));
const unique=values=>[...new Set(values)];
function patchList(existing,add,remove){const removed=new Set(remove.map(item=>item.toLocaleLowerCase()));return unique([...existing.filter(item=>!removed.has(item.toLocaleLowerCase())),...add]);}
function writerProvenance(entry,requestRef,featureModes,entryRef,refToId,manualImport=false){const featureId=entry.slot_id.split('.')[0]||'core',stable=ref=>ref==='actor:user'?ref:refToId[ref]||ref;return{kind:'writer',entryRef,slotId:entry.slot_id,featureId,mode:featureId==='core'?'core':featureModes[featureId]||'enabled',targetRefs:entry.target_refs.map(stable),contextKey:entry.context_key,assertion:entry.assertion,evidenceRefs:[...entry.evidence_refs],links:entry.links.map(stable),reason:entry.reason,requestRef,...(manualImport?{manualEdited:true}:{})};}
function eventSections(context,requestRef,sectionIdFactory,refToId,existing=[],manualImport=false){const values=[['작중 날짜',context.date.text],['작중 시간',context.time.text],['발생 장소',context.places.map(place=>place.name).join('\n')],...(context.end?[['종료',`${context.end.date.text} · ${context.end.time.text}`]]:[])];return values.map(([heading,body])=>{const previous=existing.find(section=>section.heading===heading&&section.provenance?.slotId==='event_context');return{id:previous?.id||sectionIdFactory(),heading,body,provenance:{kind:'writer',entryRef:previous?.provenance?.entryRef||`entry:${makeWikiId('event')}`,slotId:'event_context',featureId:'core',mode:'core',targetRefs:[],contextKey:null,assertion:'fact',evidenceRefs:[...context.evidence_refs],links:context.places.map(place=>place.document_ref).filter(Boolean).map(ref=>refToId[ref]||ref),reason:manualImport?writerManualReason('Event 맥락'):'Writer가 반환한 Event 전체 맥락',requestRef,...(manualImport?{manualEdited:true}:{})}}});}

/** Applies text and metric changes to one draft per document, then writes one history event per document. */
export function applyWriterProposalAtomic(scope,proposal,contract,options={}){
  let next=normalizeWikiScope(scope);const now=options.now||new Date().toISOString(),idFactory=options.idFactory||(()=>makeWikiId('doc')),sectionIdFactory=options.sectionIdFactory||(()=>makeWikiId('section')),entryIdFactory=options.entryIdFactory||(()=>`entry:${makeWikiId('writer')}`),batchRef=options.batchRef||`batch:${makeWikiId('writer')}`,refToId={...contract.catalog.documentRefs};
  const cycleReports=new Map();
  if(contract.cycle)proposal={...proposal,documents:proposal.documents.map(change=>({...change,entries:change.entries.flatMap(entry=>{if(entry.slot_id!=='core.current_state'||typeof entry.text!=='string')return[entry];const taken=takeCycleMarkers(entry.text);if(!taken.report)return[entry];const prior=cycleReports.get(change.document_ref);cycleReports.set(change.document_ref,prior?{adult:prior.adult||taken.report.adult,sex:[...prior.sex,...taken.report.sex],known:prior.known||taken.report.known,birth:prior.birth||taken.report.birth}:taken.report);return taken.text?[{...entry,text:taken.text}]:[];})}))};
  for(const change of proposal.documents)if(change.operation==='create')refToId[change.document_ref]=idFactory();
  const aliasKey=value=>String(value||'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
  // Names already owned by someone else (existing documents, the user, other documents created in this proposal) are never attached.
  const takenAliasKeys=documentRef=>{const taken=new Set((contract.knownCharacterNames||[]).map(aliasKey));for(const document of Object.values(next.documents))for(const name of [document.title,...(document.aliases||[])])taken.add(aliasKey(name));for(const other of proposal.documents)if(other.operation==='create'&&other.document_ref!==documentRef)for(const name of [other.title,...(other.aliases_add||[])])taken.add(aliasKey(name));taken.delete('');return taken;};
  const candidateAliases=change=>{if(change.type!=='character'||!Array.isArray(contract.newCharacterCandidates))return[];const own=new Set([change.title,...(change.aliases_add||[])].map(aliasKey));own.delete('');
    const matches=contract.newCharacterCandidates.filter(candidate=>candidate&&[candidate.name,...(Array.isArray(candidate.aliases)?candidate.aliases:[])].some(name=>own.has(aliasKey(name))));if(matches.length!==1)return[];
    const taken=takenAliasKeys(change.document_ref),result=[];for(const name of [matches[0].name,...(Array.isArray(matches[0].aliases)?matches[0].aliases:[])]){const text=typeof name==='string'?name.trim():'',key=aliasKey(text);if(!key||text.length>80||key===aliasKey(change.title)||own.has(key)||taken.has(key)||result.some(item=>aliasKey(item)===key))continue;result.push(text);}
    return result;};
  const speechBody=(entry,previous)=>entry.slot_id==='core.speech'?applySpeechSign(previous,entry.text,{level:contract.speechVariety||'off',mode:contract.speechChange||'ask',limit:contract.speechSignLimit||3}):entry.text;
  const drafts=new Map();
  const getDraft=(documentId)=>{if(drafts.has(documentId))return drafts.get(documentId);const existing=next.documents[documentId];if(!existing)throw new Error('변경할 Wiki 문서가 없습니다.');const draft={existing,operation:'update',touched:false,input:{id:existing.id,type:existing.type,title:existing.title,aliases:cloneWriterData(existing.aliases),tags:cloneWriterData(existing.tags),sections:cloneWriterData(existing.sections),metrics:cloneWriterData(existing.metrics||[]),links:cloneWriterData(existing.links)}};drafts.set(documentId,draft);return draft;};
  for(const change of proposal.documents){const documentId=refToId[change.document_ref],existing=next.documents[documentId]||null;let draft;
    if(change.operation==='create'){if(existing)throw new Error('새 Wiki 문서 ID가 충돌했습니다.');draft={existing:null,operation:'create',touched:true,input:{id:documentId,type:TYPE_NAME[change.type],title:change.title,aliases:[],tags:[],sections:[],metrics:[],links:[]}};drafts.set(documentId,draft);}else draft=getDraft(documentId);
    let sections=draft.input.sections;
    if(change.event_context){const headings=new Set(['작중 날짜','작중 시간','발생 장소','종료']);sections=sections.filter(section=>!(headings.has(section.heading)&&section.provenance?.slotId==='event_context'));sections.unshift(...eventSections(change.event_context,proposal.request_ref,sectionIdFactory,refToId,draft.existing?.sections||[],contract[WRITER_MANUAL_IMPORT]===true));}
    for(const entry of change.entries){if(entry.operation==='remove'){const mapped=contract.catalog.entryRefs[entry.entry_ref],index=sections.findIndex(section=>section.id===mapped.sectionId&&section.provenance?.entryRef===entry.entry_ref);if(index<0)throw new Error('제거할 Writer entry가 현재 Wiki에 없습니다.');sections.splice(index,1);continue;}const entryRef=entry.entry_ref||entryIdFactory(),provenance=writerProvenance(entry,proposal.request_ref,contract.featureModes,entryRef,refToId,contract[WRITER_MANUAL_IMPORT]===true);if(entry.entry_ref){const mapped=contract.catalog.entryRefs[entry.entry_ref],index=sections.findIndex(section=>section.id===mapped.sectionId&&section.provenance?.entryRef===entry.entry_ref);if(index<0)throw new Error('수정할 Writer entry가 현재 Wiki에 없습니다.');sections[index]={id:sections[index].id,heading:entry.label,body:speechBody(entry,sections[index].body),provenance};}else sections.push({id:sectionIdFactory(),heading:entry.label,body:speechBody(entry,''),provenance});}
    draft.input.sections=sections;draft.input.aliases=patchList(draft.input.aliases,change.operation==='create'?[...change.aliases_add,...candidateAliases(change)].slice(0,64):change.aliases_add,change.aliases_remove);draft.input.tags=patchList(draft.input.tags,change.tags_add,change.tags_remove);draft.input.title=change.title||draft.input.title;draft.touched=true;
  }
  const cycleRolls=[];
  if(contract.cycle){const date=contract.cycle.date||'',random=options.random||Math.random,reports=new Map([...cycleReports].map(([ref,report])=>[refToId[ref],report]).filter(([id])=>id));
    const ids=new Set(reports.keys());if(date)for(const document of Object.values(next.documents))if(document.type==='Character'&&document.sections.some(isCycleSection))ids.add(document.id);
    for(const id of ids){const sections=drafts.get(id)?.input.sections||next.documents[id]?.sections;if(!sections||(drafts.get(id)?.input.type||next.documents[id]?.type)!=='Character')continue;
      const index=sections.findIndex(isCycleSection),old=index>=0?sections[index]:null,result=nextCycleState(old?parseCycleBody(old.body):null,reports.get(id)||null,date,{rate:contract.cycle.rate,random});if(!result)continue;
      const body=formatCycleBody(result.state);if(old&&old.body===body&&old.provenance?.slotId===CYCLE_SLOT)continue;
      const draft=drafts.get(id)||getDraft(id),at=draft.input.sections.findIndex(isCycleSection),section={id:old?.id||sectionIdFactory(),heading:CYCLE_HEADING,body,provenance:{kind:'writer',entryRef:old?.provenance?.entryRef||entryIdFactory(),slotId:CYCLE_SLOT,featureId:'core',mode:'core',targetRefs:[],contextKey:null,assertion:'fact',evidenceRefs:['source:rp'],links:[],reason:'월경·임신 기록 (프로그램 관리)',requestRef:proposal.request_ref}};
      draft.input.sections=at>=0?draft.input.sections.map((item,i)=>i===at?section:item):[...draft.input.sections,section];draft.touched=true;if(result.rolled)cycleRolls.push({documentId:id,...result.rolled});}
  }
  for(const operation of proposal.metric_ops){const documentId=refToId[operation.document_ref];if(!drafts.has(documentId))getDraft(documentId);}
  for(const ref of contract.overviewRequiredRefs||[]){const id=refToId[ref];if(id&&next.documents[id]?.type==='Character')getDraft(id);}
  for(const draft of drafts.values())if(draft.input.type==='Character'){const sections=ensureOverviewInSections(draft.input.sections,{requestRef:proposal.request_ref,pinned:next.people?.pins?.[draft.input.id]||[]});if(sections!==draft.input.sections){draft.input.sections=sections;draft.touched=true;}}
  let metricReport;try{metricReport=applyMetricOperations({documents:drafts,wikiDocuments:next.documents,proposal,contract,refToId,pins:next.people?.pins||{},now});}catch(error){const wrapped=new Error(String(error?.message||'metric 계산 실패').slice(0,600));wrapped.name='MetricEngineError';if(error.writerUnit)wrapped.writerUnit=error.writerUnit;throw wrapped;}
  if(contract[WRITER_MANUAL_IMPORT]!==true)for(const draft of drafts.values())if(draft.existing){
    const protectedSections=preserveFirstAppraisalSections(draft.existing.sections,draft.input.sections);
    if(protectedSections!==draft.input.sections){draft.input.sections=protectedSections;if(['title','aliases','tags','sections','metrics','links'].every(key=>JSON.stringify(draft.input[key])===JSON.stringify(draft.existing[key])))draft.touched=false;}
  }
  const historyOptions={now,sectionIdFactory,requestRef:proposal.request_ref,batchRef,historyIdFactory:options.historyIdFactory};
  for(const[documentId,draft]of drafts){if(!draft.touched)continue;const stableId=ref=>refToId[ref]||(next.documents[ref]||drafts.has(ref)?ref:null),sectionLinks=draft.input.sections.flatMap(section=>(section.provenance?.links||[]).map(stableId).filter(Boolean)),metricLinks=(draft.input.metrics||[]).flatMap(metric=>metric.targetRefs.filter(ref=>ref!=='actor:user').map(stableId).filter(Boolean)),links=unique([...(draft.input.links||[]),...sectionLinks,...metricLinks]);const input={...draft.input,links};next=draft.operation==='create'?createWikiDocument(next,input,historyOptions):updateWikiDocument(next,documentId,input,historyOptions);}
  const peopleResult=applyPeopleOperations(normalizeWikiScope(next),proposal.people_ops,{refToId,contributionRef:contract.peopleContributionRef||contract.contributionRef||proposal.request_ref,now});
  return{scope:normalizeWikiScope(preservePeoplePins(scope,peopleResult.scope)),refToId,batchRef,metricReport,peopleReport:peopleResult.report,cycleRolls};
}
