// 출처: risupot 2.3.0 src/new-markers.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

function latestWriterContext(scope){if(!scope)return{record:null,requestRef:'',identity:'',events:[]};const records=scope.automation?.records||{},last=scope.automation?.lastStatus,record=last?.phase==='completed'?records[last.identity]:null;if(record?.status==='completed')return{record,requestRef:String(record.requestRef||''),identity:String(record.identity||''),events:(scope.history||[]).filter(event=>event.requestRef===record.requestRef)};const latest=(scope.history||[]).at(-1);if(!latest)return{record:null,requestRef:'',identity:'',events:[]};return{record:null,requestRef:String(latest.requestRef||''),identity:'',events:(scope.history||[]).filter(event=>(latest.batchRef&&event.batchRef===latest.batchRef)||(!latest.batchRef&&event.requestRef===latest.requestRef))};}
function latestDocumentEvent(scope,documentId){const context=latestWriterContext(scope);return[...context.events].reverse().find(event=>event.documentId===documentId)||null;}
function latestChangedDocumentIds(scope){const result=new Set(),context=latestWriterContext(scope);for(const event of context.events)result.add(event.documentId);for(const affected of context.record?.summary?.affected||[]){const matches=Object.values(scope.documents||{}).filter(document=>document.type===affected.type&&document.title===affected.title);if(matches.length===1)result.add(matches[0].id);}return result;}
function isLatestChangedDocument(scope,documentId){return latestChangedDocumentIds(scope).has(documentId);}
function isLatestChangedSection(scope,section){const requestRef=latestWriterContext(scope).requestRef;return Boolean(requestRef&&section?.provenance?.requestRef===requestRef);}
function isLatestChangedMetric(scope,metric){const requestRef=latestWriterContext(scope).requestRef;return Boolean(requestRef&&metric?.requestRef===requestRef);}
function isLatestChangedMetadata(scope,documentId,field){const event=latestDocumentEvent(scope,documentId);if(!event?.after)return false;if(event.before===null)return true;if(!['title','aliases','tags','links'].includes(field))return false;return JSON.stringify(event.before[field]??null)!==JSON.stringify(event.after[field]??null);}
function isLatestPeopleProfile(scope,documentId,profile){const context=latestWriterContext(scope),event=latestDocumentEvent(scope,documentId);return Boolean(context.record?.summary?.peopleInitialized>0&&event?.at&&profile?.createdAt===event.at);}
function isLatestPeopleSexualField(scope,documentId,profile,field){return Boolean(isLatestPeopleProfile(scope,documentId,profile)&&profile?.[field]?.text&&profile[field].updatedAt===profile.createdAt);}
function isLatestPeopleCandidate(scope,candidate){const identity=latestWriterContext(scope).identity;return Boolean(identity&&candidate?.evidence?.some(item=>item.ref===identity));}

function renderGroupNewMarker(scope,{sections=[],metrics=[],candidates=[]}={}){
  const {requestRef,identity}=latestWriterContext(scope),changed=Boolean(requestRef&&(sections.some(section=>section?.provenance?.requestRef===requestRef)||metrics.some(metric=>metric?.requestRef===requestRef))||identity&&candidates.some(candidate=>candidate?.evidence?.some(item=>item.ref===identity)));
  return changed?' <i class="rp-new-badge rp-section-new" title="최근 갱신된 항목이 있습니다">NEW</i>':'';
}
function tabNewIndicators(scope,settings={}){
  const result={wiki:false,people:false};if(!scope)return result;
  for(const id of latestChangedDocumentIds(scope)){const document=scope.documents?.[id];if(!document)continue;if(!settings.relationshipOnlyMode||document.type==='Character')result.wiki=true;if(document.type==='Character')result.people=true;}
  if(!result.people)for(const candidate of Object.values(scope.people?.candidates||{})){
    if(scope.documents?.[candidate.documentId]?.type!=='Character'||['rejected','reverted'].includes(candidate.status)||!isLatestPeopleCandidate(scope,candidate))continue;
    const profile=scope.people?.profiles?.[candidate.documentId];
    if(candidate.axis==='sexual_desire'&&(!settings.sexualDesireEnabled||profile?.sexualDesireEnabled===false))continue;
    if(candidate.axis==='paraphilia'&&(!settings.paraphiliaEnabled||profile?.paraphiliaEnabled===false))continue;
    result.people=true;break;
  }
  return result;
}
