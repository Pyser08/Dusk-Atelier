// 출처: risupot 2.3.0 src/source-seed.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { cbsReferenceContextIsCurrent, collectCbsReferenceContext, combineCbsSourceDiagnostics, hasCbsReferenceContent, projectCbsCharacter, projectCbsLoreEntries } from './cbs-source.js';
import { overviewNeedsFill } from './character-overview.js';
import { peopleSourceIndex, peopleSourceKeys, peopleSourceMatchRank, peopleSourceNormalize } from './people-source-match.js';
import { namedCharacterMention } from './wiki-retrieval.js';
import { writerCurrentCharacterIds } from './writer-handoff.js';
import { collectWriterNewCharacters } from './writer-new-characters.js';

const CARD_FIELDS=['name','description','desc','personality','scenario','firstMessage','first_message','systemPrompt','system_prompt','postHistoryInstructions','creatorNotes','creator_notes','exampleDialogue','example_dialogue','mes_example','note','characterNote','character_note'];
const LORE_TEXT_FIELDS=['content','text','prompt','data','description','entry'];
const seedCompact=value=>String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();
const seedNormalized=peopleSourceNormalize;
const seedSafeList=value=>Array.isArray(value)?value:typeof value==='string'?value.split(/[,\n]/):[];
function seedFnv(value){let hash=2166136261;for(const ch of String(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)}return(hash>>>0).toString(36)}
function seedRoots(character){return[['character',character],['character.data',character?.data],['character.character',character?.character],['character.customData',character?.customData]];}
function seedCardNames(character){const values=[];for(const[,root]of seedRoots(character)){if(!root||typeof root!=='object')continue;for(const value of [root.name,root.displayName,...seedSafeList(root.aliases),...seedSafeList(root.alias)]){const text=seedCompact(value);if(text&&!values.includes(text))values.push(text)}}return values.slice(0,24);}
function seedCardText(character){const parts=[];for(const[label,root]of seedRoots(character)){if(!root||typeof root!=='object')continue;for(const field of CARD_FIELDS){const value=root[field];if(typeof value==='string'&&value.trim())parts.push(`[${label}.${field}]\n${value.trim()}`)}}return parts.join('\n\n');}
function seedLoreEntries(value){if(Array.isArray(value))return value.filter(item=>item&&typeof item==='object').slice(0,500);if(value&&typeof value==='object')return Object.values(value).filter(item=>item&&typeof item==='object').slice(0,500);return[];}
function seedLoreDisabled(entry){const mode=seedNormalized(entry?.mode);return!entry||entry.enabled===false||entry.disabled===true||entry.disable===true||entry.isDisabled===true||mode==='disabled'||mode==='folder'||entry.type==='folder'||entry.isFolder===true;}
function seedLoreTerms(entry){return[...new Set([...peopleSourceKeys(entry),...[entry.name,entry.title,entry.comment,entry.displayName].filter(value=>typeof value==='string').map(seedCompact)].filter(value=>value.length>=2))].slice(0,64);}
function seedLoreText(entry){for(const field of LORE_TEXT_FIELDS){const value=entry?.[field];if(typeof value==='string'&&value.trim())return value.trim().slice(0,100000)}return'';}
function seedCharacterTargets({wikiScope,rpText,candidateDocumentIds,candidateNames,userIdentity}){
  const targets=[],seen=new Set();const add=(name,aliases,priority)=>{const names=[name,...aliases].filter(value=>typeof value==='string'&&value.trim()).map(seedCompact),key=seedNormalized(names[0]);if(!key||seen.has(key))return;seen.add(key);targets.push({name:names[0],names:[...new Set(names)],priority});};
  for(const person of candidateNames||[])if(person&&typeof person.name==='string')add(person.name,Array.isArray(person.aliases)?person.aliases:[],0);
  for(const person of collectWriterNewCharacters({scope:wikiScope||{documents:{}},rpText,candidateNames,userIdentity}))add(person.name,person.aliases||[],person.origin==='router'?0:1);
  const ids=[...new Set([...(candidateDocumentIds||[]),...writerCurrentCharacterIds(wikiScope||{documents:{}},rpText)])];
  for(const id of ids){const person=wikiScope?.documents?.[id];if(person?.type==='Character')add(person.title,person.aliases||[],overviewNeedsFill(person,wikiScope)||!wikiScope?.people?.profiles?.[id]?2:3);}

  return targets.sort((a,b)=>a.priority-b.priority).slice(0,32);
}
function seedNameOffset(text,names){let best=-1;for(const name of names){const parts=seedNormalized(name).split(/\s+/).filter(Boolean);if(!parts.length)continue;const escaped=parts.map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^\\p{L}\\p{N}_]*'),match=new RegExp(escaped,'iu').exec(text);if(match&&(best<0||match.index<best))best=match.index;}return best;}
function seedMaterial(item,capacity,targets){
  if(item.raw.length<=capacity)return item.raw;
  const header=item.header||'',space=Math.max(0,capacity-header.length),best=Math.max(0,...item.ranks),names=targets.filter((_,index)=>best>0&&item.ranks[index]===best).flatMap(target=>target.names),at=seedNameOffset(item.content,names),start=at>space-160?Math.max(0,at-120):0,marker=start>0?'[Excerpt]\n':'';
  return(header+marker+item.content.slice(start,start+Math.max(0,space-marker.length))).slice(0,capacity);
}
export async function collectWriterSeedSources(api,{character,chat,characterIndex,chatIndex,rpText='',wikiScope,candidateDocumentIds=[],candidateNames=[],userIdentity=null,maxChars=16000,maxSources=8,allowLore=true,searchExistingLore=false,explicitLore=false,peopleProfileEnabled=true,isCurrent=()=>true}={}){
  const sources={},refs=[],diagnostics={card:false,loreRead:false,loreMatched:0,truncated:false,error:'',targetMatches:[]},allTargets=seedCharacterTargets({wikiScope,rpText,candidateDocumentIds,candidateNames,userIdentity}),items=[];
  const people=Object.values(wikiScope?.documents||{}).filter(person=>person.type==='Character'),initial=!wikiScope||Object.keys(wikiScope.documents||{}).length===0,includeExisting=searchExistingLore===true||explicitLore===true;
  const targets=includeExisting?allTargets:allTargets.filter(target=>{const names=new Set(target.names.map(seedNormalized)),matches=people.filter(person=>[person.title,...(person.aliases||[])].some(name=>names.has(seedNormalized(name))));return matches.length!==1||overviewNeedsFill(matches[0],wikiScope)||peopleProfileEnabled&&!wikiScope?.people?.profiles?.[matches[0].id];});
  if(!includeExisting&&!initial&&!targets.length)return{sources,refs,diagnostics:{...diagnostics,skippedExistingLore:true},totalChars:0};
  const allowAmbient=includeExisting||initial;
  const limit=Math.max(0,Math.min(16000,Number(maxChars)||0)),countLimit=Math.max(0,Math.min(8,Math.floor(Number(maxSources)||0))),query=seedNormalized(rpText);
  let cbsContext=null,cbsDiagnostics=null;const ensureCbsContext=async entries=>{if(cbsContext||!hasCbsReferenceContent({entries,character}))return;const targetChat=chat||(Array.isArray(character?.chats)?character.chats.find(item=>String(item?.risupotWikiScopeId||item?.id||'')===wikiScope?.scope?.chatKey):undefined);cbsContext=await collectCbsReferenceContext(api,{character,chat:targetChat,characterIndex,chatIndex,isCurrent,userName:userIdentity?.known?userIdentity.title:undefined});};
  if(allowLore&&typeof api?.getCurrentLorebookEntries==='function')try{
    if(!await isCurrent())throw new Error('Current chat changed before Lore read');let entries=seedLoreEntries(await api.getCurrentLorebookEntries());if(!await isCurrent())throw new Error('Current chat changed during Lore read');diagnostics.loreRead=true;
    await ensureCbsContext(entries);if(cbsContext){const projected=projectCbsLoreEntries(entries,cbsContext);entries=projected.entries;cbsDiagnostics=projected.diagnostics;}
    for(const[index,entry]of entries.entries()){
      if(seedLoreDisabled(entry))continue;const content=seedLoreText(entry);if(!content)continue;
      const terms=seedLoreTerms(entry),label=seedCompact(entry.comment||entry.name||entry.title||entry.displayName||terms[0]||`Lore ${index+1}`).slice(0,200),search=peopleSourceIndex({label,keys:terms,content}),ranks=targets.map(target=>peopleSourceMatchRank(search,target.names));
      const ambient=terms.some(term=>{const word=seedNormalized(term);return word&&query.includes(word);});if(!ranks.some(Boolean)&&!(allowAmbient&&ambient))continue;
      const priorityTerm=term=>targets.some(target=>target.names.some(name=>seedNormalized(term).includes(seedNormalized(name)))),orderedTerms=terms.slice().sort((a,b)=>Number(priorityTerm(b))-Number(priorityTerm(a)));
      const header=`[Lore: ${label}]\n[Keywords: ${orderedTerms.slice(0,12).join(' · ').slice(0,600)}]\n`;items.push({kind:'lore',label,content,header,raw:header+content,ranks,index});
    }
  }catch(error){diagnostics.error=String(error?.message||error||'Lore read failed').slice(0,300);}
  await ensureCbsContext([]);if(cbsContext){const projected=projectCbsCharacter(character,cbsContext);character=projected.character;cbsDiagnostics=combineCbsSourceDiagnostics(cbsDiagnostics,projected.diagnostics);diagnostics.cbs=cbsDiagnostics;}
  const cardNames=seedCardNames(character),card=seedCardText(character).slice(0,100000),cardIndex=peopleSourceIndex({label:cardNames[0]||'Current character card',keys:cardNames,content:card}),cardRanks=targets.map(target=>peopleSourceMatchRank(cardIndex,target.names));
  if(card&&(initial||includeExisting&&cardNames.some(name=>namedCharacterMention(rpText,name))||cardRanks.some(Boolean)))items.push({kind:'card',label:cardNames[0]?`${cardNames[0]} character card`:'Current character card',content:card,header:'',raw:card,ranks:cardRanks,index:items.length});
  if(cbsContext&&!await cbsReferenceContextIsCurrent(api,cbsContext,{isCurrent})){diagnostics.error='CBS reference context changed during collection';diagnostics.cbs={...cbsDiagnostics,reasonCodes:[...new Set([...(cbsDiagnostics?.reasonCodes||[]),'context-changed'])]};return{sources:{},refs:[],diagnostics,totalChars:0,cbsSignature:cbsContext.signature};}
  const selected=[],selectedSet=new Set(),hashes=new Set(),pick=item=>{const hash=seedFnv(item.raw);if(selected.length>=countLimit||selectedSet.has(item)||hashes.has(hash))return;selected.push(item);selectedSet.add(item);hashes.add(hash);};
  for(let index=0;index<targets.length;index++){const matches=items.filter(item=>item.ranks[index]>0).sort((a,b)=>b.ranks[index]-a.ranks[index]||Number(b.kind==='lore')-Number(a.kind==='lore')||a.index-b.index);if(matches.length)pick(matches[0]);}
  for(const item of items.slice().sort((a,b)=>Math.max(0,...b.ranks)-Math.max(0,...a.ranks)||Number(b.kind==='lore')-Number(a.kind==='lore')||a.index-b.index))pick(item);
  if(items.some(item=>!selectedSet.has(item)))diagnostics.truncated=true;
  const share=selected.length?Math.floor(limit/selected.length):0,allocations=selected.map(item=>Math.min(item.raw.length,share));let spare=limit-allocations.reduce((sum,value)=>sum+value,0);
  for(let index=0;index<selected.length&&spare>0;index++){const extra=Math.min(spare,selected[index].raw.length-allocations[index]);allocations[index]+=extra;spare-=extra;}
  let totalChars=0;for(const[index,item]of selected.entries()){
    const content=seedMaterial(item,allocations[index],targets);if(!content.trim())continue;if(content.length<item.raw.length)diagnostics.truncated=true;
    const ref=`source:seed_${item.kind}_${seedFnv(item.label+':'+seedFnv(item.raw))}`;sources[ref]={kind:item.kind,label:item.label,content,...(cbsContext?{cbsSignature:cbsContext.signature}:{})};refs.push(ref);totalChars+=content.length;item.ref=ref;
    if(item.kind==='lore')diagnostics.loreMatched++;else diagnostics.card=true;
  }
  diagnostics.targetMatches=targets.map((target,index)=>({name:target.name,matchedSources:items.filter(item=>item.ranks[index]>0).length,suppliedRefs:selected.filter(item=>item.ref&&item.ranks[index]>0).map(item=>item.ref)}));
  return{sources,refs,diagnostics,totalChars,...(cbsContext?{cbsSignature:cbsContext.signature}:{})};
}
