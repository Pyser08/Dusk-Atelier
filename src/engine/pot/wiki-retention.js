// 출처: risupot 2.3.0 src/wiki-retention.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const WIKI_RETENTION_DEFAULTS=Object.freeze({history:60,activity:30});
export const WIKI_RETENTION_MAX=200;
const WIKI_AUTOMATION_GUARDS=200;
export function normalizeWikiRetention(value){
  if(value===undefined)return{...WIKI_RETENTION_DEFAULTS};
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!Object.hasOwn(WIKI_RETENTION_DEFAULTS,key)))throw new Error('기록 보관 설정이 잘못되었습니다.');
  const result={...WIKI_RETENTION_DEFAULTS,...value};
  for(const limit of Object.values(result))if(!Number.isInteger(limit)||limit<1||limit>WIKI_RETENTION_MAX)throw new Error('기록 보관 개수는 1~200개로 설정해주세요.');
  return result;
}
export function wikiRetentionStatus(scope){const limits=normalizeWikiRetention(scope?.recordRetention);return{history:{count:scope?.history?.length||0,limit:limits.history},activity:{count:Object.values(scope?.automation?.records||{}).filter(record=>!record.hidden).length,limit:limits.activity}};}
const wikiRetentionGuardFields=['identity','messageId','contentHash','requestRef','batchRef','historyIds','status','at','characterIndex','chatIndex','messageIndex','messageKey','documentCount'];
function wikiRetentionGuard(record){return{...Object.fromEntries(wikiRetentionGuardFields.filter(key=>Object.hasOwn(record,key)).map(key=>[key,record[key]])),hidden:true};}
// Called only at the persistent store boundary, after a whole Writer proposal is assembled.
// Keeping all IDs on surviving guards makes a partially expired rollback fail atomically.
export function compactWikiRecords(scope){
  const limits=normalizeWikiRetention(scope.recordRetention),next={...scope,history:scope.history.slice(-limits.history)},automation=scope.automation||{records:{},activeByMessage:{},lastStatus:null};
  const entries=Object.entries(automation.records).map(([id,record],index)=>({id,record,index})).sort((a,b)=>String(b.record.at).localeCompare(String(a.record.at))||b.index-a.index);
  const pending=entries.filter(item=>item.record.status==='pending'&&item.id===automation.lastStatus?.identity),live=new Set(pending.map(item=>item.id)),visible=entries.filter(item=>!item.record.hidden&&!live.has(item.id)).slice(0,Math.max(0,limits.activity-pending.length)),detailed=new Set([...pending,...visible].map(item=>item.id));
  const guards=entries.filter(item=>!detailed.has(item.id)),retainedGuards=new Set(guards.slice(0,WIKI_AUTOMATION_GUARDS).map(item=>item.id));
  let prunedThrough=automation.prunedThrough??-1,unindexedPruned=automation.unindexedPruned===true;
  for(const {record}of guards.slice(WIKI_AUTOMATION_GUARDS)){if(Number.isInteger(record.messageIndex)&&record.messageIndex>=0)prunedThrough=Math.max(prunedThrough,record.messageIndex);else unindexedPruned=true;}
  const records=Object.create(null);
  // Preserve original order for stable serialization and existing diagnostics.
  for(const[id,record]of Object.entries(automation.records)){if(detailed.has(id))records[id]=record;else if(retainedGuards.has(id))records[id]=wikiRetentionGuard(record);}
  const activeByMessage=Object.fromEntries(Object.entries(automation.activeByMessage).filter(([,id])=>Object.hasOwn(records,id))),lastStatus=automation.lastStatus&&Object.hasOwn(records,automation.lastStatus.identity)?automation.lastStatus:null;
  next.automation={records,activeByMessage,lastStatus,...(prunedThrough>=0?{prunedThrough}:{}),...(unindexedPruned?{unindexedPruned:true}:{})};
  return{scope:next,changed:JSON.stringify(scope.history)!==JSON.stringify(next.history)||JSON.stringify(automation)!==JSON.stringify(next.automation)};
}
export function automaticRecordExpired(scope,{messageIndex,messageKey,identity}){
  const ledger=scope.automation;if(!ledger)return false;
  if(ledger.activeByMessage?.[messageKey]||Object.values(ledger.records||{}).some(record=>record.identity===identity))return false;
  return ledger.unindexedPruned===true||Number.isInteger(ledger.prunedThrough)&&messageIndex<=ledger.prunedThrough;
}
