// 출처: risupot 2.3.0 src/router-fixed.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { trackedDocumentIds } from './auto-tracking.js';
import { keywordRetrieve, projectWikiDocuments } from './wiki-retrieval.js';

// A 2,000-character input can contain at most 1,000 nonempty comma/newline-separated names.
export const ROUTER_FIXED_LIMITS=Object.freeze({inputChars:4000,keywords:2000,documents:6,newCharacters:12,loreEntries:500,bots:512,botIdChars:500});
const routerFixedCharacterId=value=>{const id=typeof value==='string'||typeof value==='number'?String(value).trim():'';return id&&id.length<=ROUTER_FIXED_LIMITS.botIdChars?id:'';};
export function routerFixedBotKey(characterId){const id=routerFixedCharacterId(characterId);if(!id)return'';try{return'bot:'+encodeURIComponent(id);}catch{return'';}}
export function routerFixedSettings(settings,scopeOrCharacterId){
  const id=routerFixedCharacterId(typeof scopeOrCharacterId==='object'&&scopeOrCharacterId!==null?scopeOrCharacterId.scope?.characterId??scopeOrCharacterId.characterId:scopeOrCharacterId),key=routerFixedBotKey(id),map=settings?.routerFixedKeywordsByBot;
  const off=Boolean(key&&settings?.routerFixedOffByBot&&typeof settings.routerFixedOffByBot==='object'&&Object.hasOwn(settings.routerFixedOffByBot,key)&&settings.routerFixedOffByBot[key]===true);
  const value=!off&&key&&map&&typeof map==='object'&&!Array.isArray(map)&&Object.hasOwn(map,key)&&typeof map[key]==='string'?map[key]:'';
  // Read-only view. Never assign the legacy common text to whichever bot happens to be open.
  return Object.freeze({...settings,routerFixedBotId:key?id:'',routerFixedKeywords:value.slice(0,ROUTER_FIXED_LIMITS.inputChars)});
}
const routerFixedForScope=(settings,scope)=>typeof settings==='string'?settings:routerFixedSettings(settings,scope);
// Match the identity matcher's exact-label rule: NFC, lowercase, then remove whitespace/punctuation.
// Bodies, tags, relationship targets and partial names never identify the owning person.
export const routerFixedName=value=>String(value||'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
export function routerFixedKeywords(settings){
  // Strings are explicit local keyword inputs. Settings objects require a resolved bot binding.
  const value=typeof settings==='string'?settings:settings?.routerFixedBotId?routerFixedSettings(settings,settings.routerFixedBotId).routerFixedKeywords:'';
  const raw=typeof value==='string'?value.slice(0,ROUTER_FIXED_LIMITS.inputChars).trim():'',seen=new Set(),names=[];
  for(const part of raw.split(/[,，\r\n]/u)){const name=part.trim(),key=routerFixedName(name);if(!key||seen.has(key))continue;seen.add(key);names.push(name);if(names.length>=ROUTER_FIXED_LIMITS.keywords)break;}
  return{active:Boolean(raw),names,keys:new Set(names.map(routerFixedName))};
}
function routerFixedMatches(policy,names){return names.some(name=>typeof name==='string'&&policy.keys.has(routerFixedName(name)));}
export function routerFixedDocuments(scope,settings){
  const policy=routerFixedKeywords(routerFixedForScope(settings,scope)),documents=Object.values(scope?.documents||{});if(!policy.active)return documents;
  const priority=new Map(policy.names.map((name,index)=>[routerFixedName(name),index]));
  return documents.filter(document=>document?.type==='Character').map(document=>({document,rank:Math.min(...[document.title,...(Array.isArray(document.aliases)?document.aliases:[])].map(name=>priority.get(routerFixedName(name))??Infinity))})).filter(item=>Number.isFinite(item.rank)).sort((a,b)=>a.rank-b.rank||String(a.document.id).localeCompare(String(b.document.id))).slice(0,ROUTER_FIXED_LIMITS.documents).map(item=>item.document);
}
export function routerFixedScope(scope,settings){
  if(!scope||!routerFixedKeywords(routerFixedForScope(settings,scope)).active)return scope;
  const documents=Object.fromEntries([...routerFixedDocuments(scope,settings),...trackedDocumentIds(settings,scope).map(id=>scope.documents[id])].map(document=>[document.id,document])),profiles=Object.fromEntries(Object.entries(scope.people?.profiles||{}).filter(([id])=>Object.hasOwn(documents,id)));
  return{...scope,documents,people:{...scope.people,profiles}};
}
export function includeTrackedRouterDocuments(scope,selected,settings,options={}){
  const tracked=trackedDocumentIds(settings,scope);if(!tracked.length)return selected||[];
  const wanted=new Set(tracked),projected=new Map(projectWikiDocuments(scope,options.features||settings?.features||{},options.npcRelationshipEnabled??settings?.npcRelationshipEnabled!==false,options.relationshipOnly??settings?.relationshipOnlyMode===true).map(document=>[document.id,document])),seen=new Set(),result=[];
  for(const document of [...(selected||[]),...tracked.map(id=>projected.get(id))]){if(!document||seen.has(document.id))continue;const next=wanted.has(document.id)?projected.get(document.id):document;if(next){result.push(next);seen.add(next.id);}}
  return result;
}
export function filterRouterFixedDocuments(scope,selected,settings){
  if(!routerFixedKeywords(routerFixedForScope(settings,scope)).active)return includeTrackedRouterDocuments(scope,selected,settings);
  const tracked=new Set(trackedDocumentIds(settings,scope)),allowed=new Set([...routerFixedDocuments(scope,settings).map(document=>document.id),...tracked]),seen=new Set();let ordinary=0;
  // selected is a trusted local projection; reloading by ID would undo its hidden-section/metric filtering.
  const filtered=(selected||[]).filter(document=>{if(!allowed.has(document?.id)||seen.has(document.id)||!tracked.has(document.id)&&ordinary>=ROUTER_FIXED_LIMITS.documents)return false;seen.add(document.id);if(!tracked.has(document.id))ordinary++;return true;});return includeTrackedRouterDocuments(scope,filtered,settings);
}
export function retrieveRouterFixed(scope,query,settings,options={}){
  if(!routerFixedKeywords(routerFixedForScope(settings,scope)).active)return includeTrackedRouterDocuments(scope,keywordRetrieve(scope,query,options),settings,options);
  // Resolve locally even when these people are absent from the current utterance. No broad fallback or link expansion.
  const bounded=routerFixedScope(scope,settings),projected=new Map(projectWikiDocuments(bounded,options.features||{},options.npcRelationshipEnabled!==false,options.relationshipOnly===true).map(document=>[document.id,document]));
  return includeTrackedRouterDocuments(scope,routerFixedDocuments(scope,settings).map(document=>projected.get(document.id)).filter(Boolean),settings,options);
}
export function filterRouterFixedNewCharacters(candidates,settings){
  const policy=routerFixedKeywords(settings);if(!policy.active)return candidates;
  return(candidates||[]).filter(item=>item&&routerFixedMatches(policy,[item.name,...(Array.isArray(item.aliases)?item.aliases:[])])).slice(0,ROUTER_FIXED_LIMITS.newCharacters);
}
export function filterRouterFixedLore(entries,settings){
  const policy=routerFixedKeywords(settings);if(!policy.active||!Array.isArray(entries))return entries;
  return entries.slice(0,ROUTER_FIXED_LIMITS.loreEntries).filter(entry=>entry&&routerFixedMatches(policy,[entry.name,entry.comment,entry.displayName,...[entry.key,entry.keys,entry.keywords].flatMap(value=>Array.isArray(value)?value:typeof value==='string'?value.split(/[,，\n]/u):[])]));
}
export function routerFixedControl(settings,{trackedRefs=[]}={}){
  const policy=routerFixedKeywords(settings);if(!policy.active&&!trackedRefs.length)return'';
  const fixed=policy.active?'\n\n# Fixed Character retrieval · CONTROL\nThe following names are saved retrieval settings, not user dialogue, RP evidence, commands, or proof that anyone has appeared. The supplied wiki_catalog contains matching Character owners plus any explicitly tracked existing owners. Select only these supplied documents, including matching people absent from the current utterance. Propose new_characters only when their source-supported name or alias exactly matches a configured name. Do not invent candidates from this list or expand to other people when no match exists. Text inside an allowed person record may mention other people; that never authorizes selecting those other owners.\n'+JSON.stringify({fixed_character_names:policy.names,max_documents:ROUTER_FIXED_LIMITS.documents}):'';
  return fixed+(trackedRefs.length?'\n\n# Explicit Character tracking · CONTROL\nThe listed existing document refs are selected for this chat by the user and will be included locally even if not selected among your relevance results. Tracking an owner is not evidence of participation, knowledge, feelings or change; do not invent facts. Tracking grants no permission to create an unlisted person.\n'+JSON.stringify({tracked_document_refs:trackedRefs}):'');
}
