// 출처: risupot 2.3.0 src/writer-receipts.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const receiptClone=value=>JSON.parse(JSON.stringify(value));
const receiptText=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
const receiptQuote=value=>receiptText(value).replace(/[\s"'`“”‘’«»‹›「」『』＂＇]+/gu,'');
function receiptStable(value){if(Array.isArray(value))return value.map(receiptStable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,receiptStable(value[key])]));return value;}
export async function writerReceiptHash(value){const bytes=new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(receiptStable(value))),hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
const receiptRef=(ref,map)=>ref==='actor:user'?ref:map[ref]||ref;
function writerMetricIdentity(op,map={}){return JSON.stringify([receiptRef(op.document_ref,map),op.slot_id,(op.target_refs||[]).map(ref=>receiptRef(ref,map)),op.context_key??null]);}
function receiptUnitValue(kind,value,owner,map,event=null){
  const id=receiptRef(owner||value.document_ref,map);
  if(kind==='metadata')return{kind,id,operation:value.operation,title:value.title||null,type:value.type,aliases_add:value.aliases_add||[],aliases_remove:value.aliases_remove||[],tags_add:value.tags_add||[],tags_remove:value.tags_remove||[],event_context:value.event_context||null};
  if(kind==='entry')return{kind,id,operation:value.operation,slot:value.slot_id,ref:value.entry_ref||null,targets:(value.target_refs||[]).map(ref=>receiptRef(ref,map)),context:value.context_key??null,...(value.entry_ref?{}:{text:receiptText(value.text),assertion:value.assertion})};
  if(kind==='event')return{kind,metric:writerMetricIdentity(value,map),quote:receiptQuote(event.evidence_quote),sources:[...(event.evidence_refs||[])].sort()};
  if(kind==='metric')return{kind,metric:writerMetricIdentity(value,map),operation:value.operation,value:value.value??null,name:value.name??null,choices:value.choices??null};
  return{kind,id,operation:value.operation,axis:value.axis||null,pattern:receiptText(value.pattern),scene:value.scene_key||null};
}
async function receiptKeys(proposal,map){const keys=[];for(const doc of proposal.documents||[]){keys.push(await writerReceiptHash(receiptUnitValue('metadata',doc,null,map)));for(const entry of doc.entries||[])keys.push(await writerReceiptHash(receiptUnitValue('entry',entry,doc.document_ref,map)));}for(const op of proposal.metric_ops||[])if(op.operation==='delta'){for(const event of op.events||[])keys.push(await writerReceiptHash(receiptUnitValue('event',op,null,map,event)));}else keys.push(await writerReceiptHash(receiptUnitValue('metric',op,null,map)));for(const op of proposal.people_ops||[])keys.push(await writerReceiptHash(receiptUnitValue('people',op,null,map)));return keys;}
export function validateWriterReceipts(raw){
  if(raw===undefined)return undefined;const object=value=>value&&typeof value==='object'&&!Array.isArray(value),safeKey=value=>typeof value==='string'&&value.length<=800&&!['__proto__','constructor','prototype'].includes(value);
  if(!object(raw)||Object.keys(raw).length>24)throw new Error('Writer 복구 원장이 손상되었습니다.');
  for(const [key,r]of Object.entries(raw))if(!safeKey(key)||!object(r)||Object.keys(r).some(k=>!['requestRef','rpHash','scopeKey','at','keys','refs','created','metricPrior','resolvedInputs'].includes(k))||r.requestRef!==key||typeof r.rpHash!=='string'||!/^[a-f0-9]{64}$/.test(r.rpHash)||typeof r.scopeKey!=='string'||r.scopeKey.length>1200||typeof r.at!=='string'||r.at.length>80||!Array.isArray(r.keys)||r.keys.length>4096||r.keys.some(k=>typeof k!=='string'||!/^[a-f0-9]{64}$/.test(k))||!object(r.refs)||Object.keys(r.refs).length>512||Object.entries(r.refs).some(([k,v])=>!safeKey(k)||typeof v!=='string'||v.length>160)||!Array.isArray(r.created)||r.created.length>384||r.created.some(k=>typeof k!=='string'||k.length>160)||(r.resolvedInputs!==undefined&&(!Array.isArray(r.resolvedInputs)||r.resolvedInputs.length>24||r.resolvedInputs.some(key=>typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))))||!object(r.metricPrior)||Object.keys(r.metricPrior).length>768||Object.entries(r.metricPrior).some(([k,v])=>!safeKey(k)||!Number.isFinite(v)||Math.abs(v)>1000000))throw new Error('Writer 복구 원장이 손상되었습니다.');
  return receiptClone(raw);
}
export async function mergeWriterReceipt(scope,proposal,referenceMap,{rpText,contributionRef}={}){
  const next=receiptClone(scope),requestRef=proposal.request_ref,scopeKey=scope.scope.characterId+'\n'+scope.scope.chatKey,rpHash=await writerReceiptHash(rpText||''),old=next.writerReceipts?.[requestRef];
  if(old&&(old.rpHash!==rpHash||old.scopeKey!==scopeKey))throw new Error('Writer 복구 원장의 요청 범위가 일치하지 않습니다.');
  const refs={...(old?.refs||{}),...referenceMap},keys=[...new Set([...(old?.keys||[]),...await receiptKeys(proposal,refs)])],created=[...new Set([...(old?.created||[]),...(proposal.documents||[]).filter(d=>d.operation==='create').map(d=>d.document_ref)])],metricPrior={...(old?.metricPrior||{})};
  for(const [index,op]of (proposal.metric_ops||[]).entries())if(op.operation==='delta'){
    const originalKeys=old?.keys||[];if(originalKeys.length&&(await Promise.all((op.events||[]).map(event=>writerReceiptHash(receiptUnitValue('event',op,null,refs,event))))).every(key=>originalKeys.includes(key)))continue;
    const document=scope.documents[refs[op.document_ref]],targets=(op.target_refs||[]).map(ref=>receiptRef(ref,refs)),metric=document?.metrics?.find(m=>m.slotId===op.slot_id&&JSON.stringify(m.targetRefs)===JSON.stringify(targets)&&(m.contextKey??null)===(op.context_key??null)),contribution=metric?.contributions?.find(c=>c.ref===`${contributionRef||requestRef}:${op.slot_id}:${index}`);
    if(contribution&&contribution.requestRef===requestRef){const identity=writerMetricIdentity(op,refs);metricPrior[identity]=(metricPrior[identity]||0)+contribution.scaledDelta;}
  }
  next.writerReceipts={...(next.writerReceipts||{}),[requestRef]:{requestRef,rpHash,scopeKey,at:new Date().toISOString(),keys:keys.slice(-4096),refs,created,metricPrior,resolvedInputs:old?.resolvedInputs||[]}};
  const ordered=Object.entries(next.writerReceipts).sort((a,b)=>b[1].at.localeCompare(a[1].at));next.writerReceipts=Object.fromEntries(ordered.slice(0,24));validateWriterReceipts(next.writerReceipts);return next;
}
export async function excludeAppliedWriterWork(input,receipt,currentCatalog){
  const proposal=receiptClone(input);if(!receipt)return{proposal,excluded:0};for(const key of ['documents','metric_ops','people_ops','issues'])if(!Array.isArray(proposal[key]))throw new Error(key+'는 배열이어야 합니다.');const known=new Set(receipt.keys),refs=receipt.refs,currentRef=id=>Object.keys(currentCatalog.documentRefs).find(ref=>currentCatalog.documentRefs[ref]===id),rewrite=ref=>refs[ref]?currentRef(refs[ref])||ref:ref;let excluded=0;
  const documents=[];
  for(const doc of proposal.documents||[]){if(!doc||typeof doc!=='object'||Array.isArray(doc)||!Array.isArray(doc.entries)){documents.push(doc);continue;}if(doc.operation==='update'&&!Object.hasOwn(doc,'type'))doc.type=currentCatalog.documents[rewrite(doc.document_ref)]?.type;const metadataKey=await writerReceiptHash(receiptUnitValue('metadata',doc,null,refs)),metadataDone=known.has(metadataKey),entries=[];
    for(const entry of doc.entries||[]){if(known.has(await writerReceiptHash(receiptUnitValue('entry',entry,doc.document_ref,refs)))){excluded++;continue;}entries.push({...entry,target_refs:(entry.target_refs||[]).map(rewrite),links:(entry.links||[]).map(rewrite)});}
    let item={...doc,entries};if(metadataDone){excluded++;item={...item,aliases_add:[],aliases_remove:[],tags_add:[],tags_remove:[],title:null,event_context:null};}
    if(receipt.created.includes(doc.document_ref)){const ref=currentRef(refs[doc.document_ref]);if(!ref)throw new Error('이미 생성했던 인물을 찾지 못해 복구를 중단했습니다.');item={...item,document_ref:ref,operation:'update',title:null,type:currentCatalog.documents[ref].type};}else item.document_ref=rewrite(item.document_ref);
    if(item.operation==='create'||entries.length||!metadataDone)documents.push(item);
  }
  proposal.documents=documents;const metrics=[];
  for(const op of proposal.metric_ops||[]){if(!op||typeof op!=='object'||Array.isArray(op)||op.operation==='delta'&&!Array.isArray(op.events)){metrics.push(op);continue;}let item=op;if(op.operation==='delta'){const events=[];for(const event of op.events||[])if(known.has(await writerReceiptHash(receiptUnitValue('event',op,null,refs,event))))excluded++;else events.push(event);if(!events.length)continue;item={...op,events};}else if(known.has(await writerReceiptHash(receiptUnitValue('metric',op,null,refs)))){excluded++;continue;}metrics.push({...item,document_ref:rewrite(item.document_ref),target_refs:(item.target_refs||[]).map(rewrite)});}proposal.metric_ops=metrics;
  const people=[];for(const op of proposal.people_ops||[])if(!op||typeof op!=='object'||Array.isArray(op))people.push(op);else if(known.has(await writerReceiptHash(receiptUnitValue('people',op,null,refs))))excluded++;else people.push({...op,document_ref:rewrite(op.document_ref)});proposal.people_ops=people;proposal.issues=(proposal.issues||[]).map(issue=>issue&&typeof issue==='object'?{...issue,...(issue.document_ref?{document_ref:rewrite(issue.document_ref)}:{})}:issue);
  return{proposal,excluded};
}
