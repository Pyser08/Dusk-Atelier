// 출처: risupot 2.3.0 src/writer-partial.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { redirectMergedWriterReferences } from './identity-links.js';
import { INFORMATION_CONTINUITY_NOTE } from './information-continuity.js';
import { applyWriterProposalAtomic } from './writer-apply.js';
import { WriterProposalError, parseAndValidateWriterProposal, readWriterProposalInput } from './writer-proposal.js';

const partialClone=value=>JSON.parse(JSON.stringify(value));
const partialRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const partialSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const partialText=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
const partialDocumentFields=new Set(['document_ref','operation','type','title','aliases_add','aliases_remove','tags_add','tags_remove','event_context','entries']);
const partialCount=proposal=>proposal.documents.reduce((n,d)=>n+(d.operation==='create'?1:0)+(d.entries?.length||0)+(d.aliases_add?.length||0)+(d.aliases_remove?.length||0)+(d.tags_add?.length||0)+(d.tags_remove?.length||0),0)+proposal.metric_ops.length+proposal.people_ops.length;
function removeMatching(list,value){const index=list.findIndex(item=>partialSame(item,value));if(index<0)return false;list.splice(index,1);return true;}
function unchangedPartialEntry(unit,contract){
  if(unit.kind!=='entry'||unit.value?.operation!=='upsert')return false;const value=unit.value,mapped=contract.catalog.entryRefs?.[value.entry_ref];if(!mapped||mapped.documentId!==contract.catalog.documentRefs[unit.documentRef])return false;
  const existing=contract.catalog.documents[unit.documentRef]?.entries?.find(entry=>entry.entry_ref===value.entry_ref);return Boolean(existing&&partialText(existing.text)===partialText(value.text)&&existing.assertion===value.assertion&&partialSame(existing.target_refs||[],value.target_refs||[])&&(existing.context_key??null)===(value.context_key??null)&&partialSame(existing.links||[],value.links||[])&&(!value.label||existing.label===value.label));
}
function partialIssue(issue,contract){
  if(!partialRecord(issue))return null;const detail=typeof issue.detail==='string'?issue.detail:typeof issue.reason==='string'?issue.reason:null;if(!detail?.trim()||detail.length>1200)return null;
  const rawRef=issue.document_ref,ref=typeof rawRef==='string'&&contract.catalog.documents[rawRef]?rawRef:null,code=typeof issue.code==='string'&&issue.code.trim()&&issue.code.length<=120?issue.code:'note';
  return{code:ref===rawRef||rawRef==null?code:'note',document_ref:ref,detail:((rawRef!=null&&ref===null?'[대상 미확인 '+String(rawRef).slice(0,100)+'] ':'')+detail).slice(0,1200)};
}
function partialErrorCode(kind,reason){if(kind==='unchanged')return reason.startsWith('기존 대상별 말투를 유지')?'speech-preserved':reason===INFORMATION_CONTINUITY_NOTE?'information-preserved':'entry-unchanged';if(kind==='normalized-issue')return'issue-normalized';if(/기존 Character의 제목·별칭/.test(reason))return'duplicate-character';if(/대상|target_refs/.test(reason))return'target-ref';if(/근거|인용/.test(reason))return kind.startsWith('metric')?'metric-evidence':'evidence-ref';if(/필드 오류|unknown field|필수 누락/.test(reason))return'json-fields';if(/문서 참조/.test(reason))return'document-ref';if(kind.startsWith('metric'))return'metric-policy';return kind+'-invalid';}
function partialSummary(report){return{rejected:report.filter(item=>!['unchanged','normalized-issue'].includes(item.kind)).length,unchanged:report.filter(item=>item.kind==='unchanged').length,normalized:report.filter(item=>item.kind==='normalized-issue').length,metricRejected:report.filter(item=>['metric','metric-event'].includes(item.kind)).length,details:report.slice(0,32).map(item=>({kind:item.kind,code:partialErrorCode(item.kind,item.reason),documentRef:item.documentRef||null,documentTitle:item.documentTitle||'',slotId:item.slotId||null,reason:item.reason.slice(0,400)}))};}
export function writerPartialMessage(summary,catalog=null){if(!summary||!(summary.rejected||summary.unchanged||summary.normalized))return'';const title=`검증 결과 · 오류 제외 ${summary.rejected||0}건 · 반복 생략 ${summary.unchanged||0}건 · 설명 정리 ${summary.normalized||0}건`;return[title,...(summary.details||[]).map(item=>`${item.documentTitle||catalog?.documents?.[item.documentRef]?.title||item.documentRef||'공통'}${item.slotId?' / '+item.slotId:''} [${item.code||item.kind}]: ${item.reason}`)].join('\n').slice(0,2000);}
export function writerValidationActivity(summary,catalog=null){if(!summary||!(summary.rejected||summary.unchanged||summary.normalized))return null;const details=(summary.details||[]).slice(0,16).map(item=>({kind:String(item.kind||'operation').slice(0,60),code:String(item.code||partialErrorCode(item.kind||'operation',item.reason||'')).slice(0,80),documentRef:typeof item.documentRef==='string'?item.documentRef.slice(0,160):null,documentTitle:String(item.documentTitle||catalog?.documents?.[item.documentRef]?.title||'').slice(0,120),slotId:typeof item.slotId==='string'?item.slotId.slice(0,160):null,reason:String(item.reason||'').slice(0,400)}));return{rejected:summary.rejected||0,unchanged:summary.unchanged||0,normalized:summary.normalized||0,details,truncated:(summary.details||[]).length>details.length||summary.rejected+summary.unchanged+summary.normalized>details.length};}
export function preparePartialWriterProposal(raw,contract,scope,{applyContract=contract,batchRef,allowEmptyRejected=false}={}){
  let working=redirectMergedWriterReferences(readWriterProposalInput(raw),contract.catalog?.mergedReferenceMap||{});const originalChanges=partialRecord(working)&&['documents','metric_ops','people_ops'].some(key=>Array.isArray(working[key])&&working[key].length),report=[],reviewedRefs=new Set(),failedBootstrap=new Set(),failedMetricRequirements=new Set();
  const originalNames=new Map((Array.isArray(working?.documents)?working.documents:[]).filter(partialRecord).map(d=>[d.document_ref,typeof d.title==='string'?d.title:'']));
  // Root/ID/array/unsafe-data errors have no operation location and must remain fatal.
  const requirementKey=value=>`${value.document_ref}\n${value.slot_id}\n${value.operation}`;
  const note=(unit,error,kind=unit.kind)=>{const op=unit.kind==='metric-event'?unit.operation:unit.value,ref=unit.documentRef||op?.document_ref;report.push({kind,documentRef:typeof ref==='string'?ref:null,documentTitle:contract.catalog.documents[ref]?.title||originalNames.get(ref)||'',slotId:op?.slot_id||unit.value?.slot_id||null,reason:String(error.message||error).slice(0,600)});if(ref&&contract.catalog.documents[ref])reviewedRefs.add(ref);};
  const effectiveContract=()=>({...contract,bootstrapRequiredRefs:(contract.bootstrapRequiredRefs||[]).filter(ref=>!failedBootstrap.has(ref)),speechBootstrapRequiredRefs:(contract.speechBootstrapRequiredRefs||[]).filter(ref=>!failedBootstrap.has(ref)),requiredMetricSetups:(contract.requiredMetricSetups||[]).filter(item=>!failedMetricRequirements.has(requirementKey(item))),reviewCandidateRefs:(contract.reviewCandidateRefs||[]).filter(ref=>!reviewedRefs.has(ref)),mentionedCharacterRefs:(contract.mentionedCharacterRefs||[]).filter(ref=>!reviewedRefs.has(ref))});
  const rejected=[];
  for(let pass=0;pass<4096;pass++){
    let proposal;
    try{
      proposal=parseAndValidateWriterProposal(JSON.stringify(working),effectiveContract());
      const summary=partialSummary(report),hasChanges=partialCount(proposal)>0;
      if(!hasChanges&&originalChanges&&report.some(item=>!['unchanged','issue','normalized-issue'].includes(item.kind))){if(allowEmptyRejected)return{proposal,applied:{scope,refToId:{},metricReport:{applied:0,ignored:0,changes:[]},peopleReport:{initialized:0,observed:0,reviewReady:0,changedDocumentIds:new Set()}},summary:{...summary,allRejected:true},rejected};throw new WriterProposalError('검증을 통과한 변경이 없어 인물정보를 반영하지 않았습니다. '+report.slice(0,3).map(item=>item.reason).join(' · '));}
      const applied=applyWriterProposalAtomic(scope,proposal,applyContract,{batchRef});
      return{proposal,applied,summary,rejected};
    }catch(error){
      if(proposal&&error.writerUnit){working=partialClone(proposal);}
      let unit=error.writerUnit;
      // Incomplete bootstrap requirements may not discard valid changes to other people.
      if(!unit&&report.length){const message=String(error.message||'');const ref=(contract.bootstrapRequiredRefs||[]).concat(contract.speechBootstrapRequiredRefs||[]).find(ref=>!failedBootstrap.has(ref)&&message.includes(ref)&&/bootstrap_required/.test(message));if(ref){failedBootstrap.add(ref);note({kind:'requirement',documentRef:ref},error);continue;}
        const req=(contract.requiredMetricSetups||[]).find(item=>!failedMetricRequirements.has(requirementKey(item))&&message.includes(item.slot_id)&&(/required_metric_setup|intimacy trigger/.test(message)));if(req){failedMetricRequirements.add(requirementKey(req));working.metric_ops=working.metric_ops.filter(op=>!(op.document_ref===req.document_ref&&op.slot_id===req.slot_id&&partialSame(op.target_refs||[],req.target_refs||[])));note({kind:'requirement',value:req},error);continue;}
        const review=(contract.reviewCandidateRefs||[]).concat(contract.mentionedCharacterRefs||[]).filter(ref=>!reviewedRefs.has(ref)&&message.includes(ref)&&/검토가 누락/.test(message));if(review.length){for(const ref of review)note({kind:'requirement',documentRef:ref},error);continue;}}
      if(!unit){if(report.length){error.partialValidation=partialSummary(report);error.message=report[0].reason+' · '+error.message;}throw error;}
      let removed=false,isNoop=false,normalizedIssue=false;
      if(unit.kind==='document'){
        const document=working.documents.find(item=>partialSame(item,unit.value))||working.documents.find(item=>item?.document_ref===unit.value?.document_ref);if(!document)throw error;
        const extra=Object.keys(document).filter(key=>!partialDocumentFields.has(key));
        if(extra.length&&/필드 오류/.test(error.message)){for(const key of extra)delete document[key];removed=true;}
        else{const ref=document.document_ref;const duplicates=working.documents.filter(item=>item?.document_ref===ref).length>1;working.documents=working.documents.filter(item=>duplicates?item?.document_ref!==ref:item!==document);removed=true;if(document.operation==='create')rejected.push(ref);}
      }else if(unit.kind==='entry'){
        const document=working.documents.find(item=>item?.document_ref===unit.documentRef);removed=Boolean(document&&removeMatching(document.entries,unit.value));isNoop=removed&&(error.speechPreserved===true||error.informationPreserved===true||unchangedPartialEntry(unit,contract));
      }else if(unit.kind==='metric-event'){
        const operation=working.metric_ops.find(item=>partialSame(item,unit.operation));if(operation){removed=removeMatching(operation.events,unit.value);if(!operation.events.length)removeMatching(working.metric_ops,operation);}
      }else if(unit.kind==='metric')removed=removeMatching(working.metric_ops,unit.value);
      else if(unit.kind==='people'){removed=removeMatching(working.people_ops,unit.value);isNoop=removed&&error.informationPreserved===true;}
      else if(unit.kind==='issue'){
        const index=working.issues.findIndex(item=>partialSame(item,unit.value));if(index>=0){const normalized=partialIssue(working.issues[index],contract);if(normalized&&!partialSame(normalized,working.issues[index])){working.issues[index]=normalized;normalizedIssue=true;}else working.issues.splice(index,1);removed=true;}
      }
      if(!removed){error.partialValidation=partialSummary(report);throw error;}
      note(unit,error,isNoop?'unchanged':normalizedIssue?'normalized-issue':unit.kind);
      // A real validation warning is a diagnostic, never a claim about RP facts.
      const diagnosticCode=unit.kind.startsWith('metric')&&/근거|인용/.test(error.message)?'evidence_conflict':'incomplete_contract';
      if(working.issues.length<32&&!working.issues.some(issue=>issue?.code===diagnosticCode&&issue.document_ref===null))working.issues.push({code:diagnosticCode,document_ref:null,detail:'JS 검증에서 오류 또는 반복된 변경을 제외했습니다. 제외한 작업과 이유는 Inspector의 부분 반영 내역을 확인하세요.'});
    }
  }
  const error=new WriterProposalError('Writer 부분 검증 작업 한도를 초과해 저장하지 않았습니다.');error.partialValidation=partialSummary(report);throw error;
}
