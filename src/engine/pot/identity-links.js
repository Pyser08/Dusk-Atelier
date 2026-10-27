// 출처: risupot 2.3.0 src/identity-links.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const identityLinkAssert=(condition,message)=>{if(!condition)throw new Error(message);};
const identityLinkRef=value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=160&&!['__proto__','prototype','constructor'].includes(value);
export function normalizeIdentityRedirects(raw,documents,assert=identityLinkAssert){
  if(raw===undefined)return{};assert(raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.keys(raw).length<=2000,'통합 인물 연결 정보가 잘못되었습니다.');
  const result=Object.create(null);
  for(const[source,target]of Object.entries(raw)){
    assert(identityLinkRef(source)&&identityLinkRef(target)&&!Object.hasOwn(documents,source),'통합 전 인물 ID가 잘못되었거나 현재 인물과 충돌합니다.');
    const seen=new Set([source]);let current=target;
    while(Object.hasOwn(raw,current)){assert(!seen.has(current)&&seen.size<64,'통합 인물 연결이 순환합니다.');seen.add(current);assert(identityLinkRef(raw[current]),'통합 인물 대상 ID가 잘못되었습니다.');current=raw[current];}
    assert(!seen.has(current)&&documents[current]?.type==='Character','통합 후 인물을 찾을 수 없습니다.');result[source]=current;
  }
  return result;
}
export function resolveMergedIdentity(scope,id){let current=id;const visited=new Set();while(Object.hasOwn(scope?.identityRedirects||{},current)){if(visited.has(current))return null;visited.add(current);current=scope.identityRedirects[current];}return scope?.documents?.[current]?.type==='Character'?current:null;}
export function mergedWriterReferenceMap(scope,catalog,referenceForId){
  const currentRefs=new Map(Object.entries(catalog.documentRefs).map(([ref,id])=>[id,ref])),result={};
  for(const oldId of Object.keys(scope.identityRedirects||{})){const canonicalId=resolveMergedIdentity(scope,oldId),target=currentRefs.get(canonicalId);if(!target)continue;for(const oldRef of [oldId,referenceForId(oldId)])if(!Object.hasOwn(catalog.documents,oldRef))result[oldRef]=target;}
  return result;
}
export function redirectMergedWriterReferences(value,redirects={}){
  const resolve=ref=>typeof ref==='string'&&Object.hasOwn(redirects,ref)?redirects[ref]:ref,list=items=>Array.isArray(items)?items.map(resolve):items;
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const next=JSON.parse(JSON.stringify(value));
  for(const key of ['documents','metric_ops','people_ops','issues'])for(const item of Array.isArray(next[key])?next[key]:[]){if(!item||typeof item!=='object'||Array.isArray(item))continue;if(Object.hasOwn(item,'document_ref'))item.document_ref=resolve(item.document_ref);if(Object.hasOwn(item,'target_refs'))item.target_refs=list(item.target_refs);if(key==='documents'){
    for(const entry of Array.isArray(item.entries)?item.entries:[]){if(!entry||typeof entry!=='object'||Array.isArray(entry))continue;if(Object.hasOwn(entry,'target_refs'))entry.target_refs=list(entry.target_refs);if(Object.hasOwn(entry,'links'))entry.links=list(entry.links);}
    for(const place of Array.isArray(item.event_context?.places)?item.event_context.places:[])if(place&&typeof place==='object')place.document_ref=resolve(place.document_ref);
  }}
  return next;
}
