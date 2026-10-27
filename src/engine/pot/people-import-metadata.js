// 출처: risupot 2.3.0 src/people-import-metadata.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { peopleSourceNormalize } from './people-source-match.js';
import { WIKI_LIMITS } from './wiki-schema.js';

export const PEOPLE_IMPORT_METADATA_LIMITS=Object.freeze({aliases:64,tags:16,characters:80});
export const peopleImportMetadataKey=value=>peopleSourceNormalize(value).replace(/\s+/gu,'');
const metadataVisibleText=value=>typeof value==='string'&&value.trim()&&!/[<>]|\{\{|\}\}|\\[bdsw]|\(\?|\^|\$|\|/iu.test(value)&&!/^\/.*\/[gimsuy]*$/u.test(value.trim());
const metadataTagAllowed=value=>metadataVisibleText(value)&&!/^(?:slot|feature|mode|writer|system|policy|owner|target|document|entry|actor|new|risupot):/iu.test(value.trim());
export function peopleImportMetadataList(values,{kind='alias',limit=64,notes=[]}={}){
  if(values===undefined)return[];if(!Array.isArray(values)){notes.push((kind==='tag'?'태그':'별칭')+' 목록 형식이 잘못되어 추가 정보를 제외했습니다.');return[];}
  const result=[],seen=new Set();for(const raw of values){if(typeof raw!=='string'){notes.push('문자열이 아닌 '+(kind==='tag'?'태그':'별칭')+'을 제외했습니다.');continue;}const value=raw.normalize('NFC').trim(),key=peopleImportMetadataKey(value);if(!value)continue;
    if(value.length>WIKI_LIMITS.listItemChars||!key||!(kind==='tag'?metadataTagAllowed(value):metadataVisibleText(value))){notes.push('저장할 수 없는 '+(kind==='tag'?'태그':'별칭')+' 형식 또는 길이를 제외했습니다.');continue;}if(seen.has(key))continue;seen.add(key);if(result.length>=limit){notes.push((kind==='tag'?'태그':'별칭')+' 추가 개수 한도를 넘어 일부를 제외했습니다.');continue;}result.push(value);
  }return result;
}
export function peopleImportAliasInSources(alias,sources){
  const normalized=peopleSourceNormalize(alias),key=peopleImportMetadataKey(alias);if(!normalized||!key)return false;
  const escaped=normalized.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const inBody=new RegExp('(?:^|[^\\p{L}\\p{N}_])'+escaped+'(?=$|[^\\p{L}\\p{N}_]|(?:은|는|이|가|을|를|의|와|과|에게|한테|께|도|만|씨|님)(?=$|[^\\p{L}\\p{N}_]))','u');
  return(sources||[]).some(source=>[source.label,...(source.keys||[])].some(value=>peopleImportMetadataKey(value)===key)||inBody.test(peopleSourceNormalize(source.content)));
}
export function peopleImportSourceAliases(original,proposed,sources){
  const notes=[],base=peopleImportMetadataList(original,{limit:65,notes}),keys=new Set(base.map(peopleImportMetadataKey)),aliases=[...base];
  for(const alias of peopleImportMetadataList(proposed,{notes})){const key=peopleImportMetadataKey(alias);if(keys.has(key))continue;if(!peopleImportAliasInSources(alias,sources)){notes.push('제공된 근거에 없는 별칭을 제외했습니다: '+alias);continue;}if(aliases.length>=65){notes.push('별칭 추가 개수 한도를 넘어 일부를 제외했습니다.');continue;}keys.add(key);aliases.push(alias);}
  return{aliases,metadataNotes:[...new Set(notes)].slice(0,12)};
}
function peopleImportIdentityNames(candidate){return Array.isArray(candidate.identityNames)?candidate.identityNames:[candidate.name,...(candidate.aliases||[])];}
export function peopleImportIdentityMatch(scope,candidate){
  const names=new Set(peopleImportIdentityNames(candidate).map(peopleImportMetadataKey).filter(Boolean)),matches=Object.values(scope?.documents||{}).filter(document=>document.type==='Character'&&[document.title,...(document.aliases||[])].some(name=>names.has(peopleImportMetadataKey(name))));
  return matches.length===1?{status:'existing',document:matches[0]}:matches.length>1?{status:'ambiguous',document:null}:{status:'new',document:null};
}
export function peopleImportMetadataForCandidate(scope,candidate,otherCandidates=[]){
  const match=peopleImportIdentityMatch(scope,candidate),target=match.document,notes=[...(candidate.metadataNotes||[])],canonical=peopleImportMetadataKey(candidate.name),others=Object.values(scope?.documents||{}).filter(document=>document.type==='Character'&&document.id!==target?.id);
  const inputKeywords=peopleImportMetadataList(candidate.inputKeywords||[],{notes}),inputKeys=new Set(inputKeywords.map(peopleImportMetadataKey));
  const occupied=new Set(others.flatMap(document=>[document.title,...(document.aliases||[])]).map(peopleImportMetadataKey));
  for(const other of otherCandidates){if(other===candidate||other.id===candidate.id||target&&peopleImportIdentityMatch(scope,other).document?.id===target.id)continue;for(const name of peopleImportIdentityNames(other))occupied.add(peopleImportMetadataKey(name));}
  const existing=new Set((target?.aliases||[]).map(peopleImportMetadataKey)),aliases=peopleImportMetadataList([...inputKeywords,...(candidate.aliases||[])],{notes}).filter(alias=>{
    const key=peopleImportMetadataKey(alias);if(key===canonical&&!inputKeys.has(key))return false;if(occupied.has(key)&&!existing.has(key)){notes.push('다른 인물과 겹치는 별칭을 제외했습니다: '+alias);return false;}return true;
  }),tags=peopleImportMetadataList(candidate.tags??candidate.profile?.tags??[],{kind:'tag',limit:16,notes});
  const fit=(items,previous,kind)=>{const seen=new Set((previous||[]).map(peopleImportMetadataKey));let available=WIKI_LIMITS.listItems-(previous||[]).length;return items.filter(value=>{const key=peopleImportMetadataKey(value);if(seen.has(key))return true;if(available<=0){notes.push('기존 '+kind+'은 보존하고 추가 한도를 넘는 새 값은 제외했습니다.');return false;}available--;seen.add(key);return true;});};
  return{...candidate,aliases:fit(aliases,target?.aliases,'별칭'),tags:fit(tags,target?.tags,'태그'),metadataNotes:[...new Set(notes)].slice(0,12),matchStatus:match.status,documentId:target?.id||'',existingProfile:Boolean(target&&scope.people?.profiles?.[target.id]),ambiguous:match.status==='ambiguous'};
}
export function mergePeopleImportMetadata(document,candidate,scope,otherCandidates=[]){
  const safe=peopleImportMetadataForCandidate(scope,candidate,otherCandidates),notes=[...safe.metadataNotes],titleKey=peopleImportMetadataKey(document.title),inputKeys=new Set((candidate.inputKeywords||[]).map(peopleImportMetadataKey));
  const append=(previous,incoming,kind)=>{const result=[...(previous||[])],seen=new Set(result.map(peopleImportMetadataKey));for(const value of incoming){const key=peopleImportMetadataKey(value);if(kind==='alias'&&key===titleKey&&!inputKeys.has(key)||seen.has(key))continue;if(result.length>=WIKI_LIMITS.listItems){notes.push('기존 '+(kind==='alias'?'별칭':'태그')+'은 보존하고 추가 한도를 넘는 새 값은 제외했습니다.');continue;}seen.add(key);result.push(value);}return result;};
  return{aliases:append(document.aliases,safe.aliases,'alias'),tags:append(document.tags,safe.tags,'tag'),metadataNotes:[...new Set(notes)].slice(0,12)};
}
