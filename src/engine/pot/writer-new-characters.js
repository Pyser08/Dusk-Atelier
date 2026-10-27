// 출처: risupot 2.3.0 src/writer-new-characters.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { identityCandidates } from './contextual-identity.js';
import { normalizeUserActor } from './user-identity.js';
import { namedCharacterMention } from './wiki-retrieval.js';

const newPersonText=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
const newPersonKey=value=>newPersonText(value).toLocaleLowerCase();
const newPersonEscape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
const newPersonRoles='과장|대리|차장|부장|팀장|실장|사원|주임|대표|사장|선생님|교수|교수님|박사|박사님|의사|기사|경위|형사|대장|단장|장군|선장|왕자|공주|백작|공작';
const newPersonGeneric=new Set(['그','이','저','새','새로운','젊은','늙은','다른','어떤','어느','우리','해당','담당','모든','전','현','user','assistant','system','사용자','유저','나레이션','서술']);
const newPersonSurname=/^[김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용]/u;
const newPersonTenureLabel=new RegExp('^차\\s*(?:'+newPersonRoles+')(?:님)?$','u');
const newPersonTenureSpan=new RegExp('(?:\\d+(?:\\.\\d+)?|[일이삼사오육칠팔구십백천한두세네다섯여섯일곱여덟아홉몇여러]+)\\s*(?:년|개월|달|주|일)[\\s*_`]*차[\\s*_`]*(?:'+newPersonRoles+')(?:님)?','gu');
function newPersonMention(text,name){return namedCharacterMention(newPersonTenureLabel.test(newPersonText(name))?String(text).replace(newPersonTenureSpan,' '):text,name);}
export function validateRouterNewCharacters(items,{text='',catalog={},userIdentity=null,maxCandidates=12}={}){
  if(!Array.isArray(items))return[];
  const source=newPersonText(text),actor=normalizeUserActor(userIdentity),known=new Set([actor.title,...actor.aliases,...Object.values(catalog).filter(item=>String(item.type).toLowerCase()==='character').flatMap(item=>[item.title,...(item.aliases||[])])].map(newPersonKey)),seen=new Set(),result=[];
  for(const item of items.slice(0,maxCandidates*4)){
    if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.name!=='string')continue;
    const name=newPersonText(item.name),key=newPersonKey(name);
    if(!name||name.length>80||newPersonGeneric.has(key)||known.has(key)||seen.has(key))continue;
    const quote=typeof item.evidence_quote==='string'?newPersonText(item.evidence_quote):'',quoteValid=Boolean(quote&&quote.length<=800&&source.includes(quote)&&namedCharacterMention(quote,name));
    const aliases=Array.isArray(item.aliases)?[...new Set(item.aliases.filter(alias=>typeof alias==='string'&&alias.trim()&&alias.length<=80).map(newPersonText))].slice(0,6):[];
    // Keep the candidate even when a quote is missing or paraphrased. Only a verified quote is carried as a quote.
    const position=source.toLocaleLowerCase().indexOf(name.toLocaleLowerCase()),evidence=quoteValid?quote:position>=0?source.slice(Math.max(0,position-40),position+240):'';
    seen.add(key);result.push({name,aliases,reason:typeof item.reason==='string'&&item.reason.trim()?item.reason.trim().slice(0,300):'Router가 제안한 미등록 인물 후보',evidence_quote:evidence});
    if(result.length>=maxCandidates)break;
  }
  return result;
}
export function collectWriterNewCharacters({scope,rpText='',candidateNames=[],userIdentity=null}={}){
  const text=String(rpText||'').normalize('NFC'),actor=normalizeUserActor(userIdentity),known=new Set([actor.title,...actor.aliases,...Object.values(scope?.documents||{}).filter(item=>item.type==='Character').flatMap(item=>[item.title,...(item.aliases||[])])].map(newPersonKey)),candidates=new Map();
  const add=(name,aliases=[],origin='router',quote='')=>{name=newPersonText(name);aliases=[...new Set(aliases.map(newPersonText).filter(Boolean))];if(!name||name.length>80||newPersonGeneric.has(newPersonKey(name))||known.has(newPersonKey(name))||[name,...aliases].some(value=>[actor.title,...actor.aliases].some(actorName=>newPersonKey(actorName)===newPersonKey(value))))return;const matched=[name,...aliases].find(value=>newPersonMention(text,value));if(!matched)return;const key=newPersonKey(name),index=text.toLocaleLowerCase().indexOf(matched.toLocaleLowerCase()),existing=candidates.get(key);candidates.set(key,{name,aliases:[...new Set([...(existing?.aliases||[]),...aliases])],origin:existing?.origin||origin,evidence_quote:quote||text.slice(Math.max(0,index-40),Math.min(text.length,index+240))});};
  for(const item of candidateNames||[])if(item&&typeof item.name==='string')add(item.name,Array.isArray(item.aliases)?item.aliases:[],'router');
  // Only explicit speaker labels and named role subjects are inferred locally. Ordinary nouns are not scanned as names.
  const roleRegex=new RegExp('(?:^|[^\\p{L}\\p{N}_])([가-힣]{1,4})\\s*('+newPersonRoles+')(?:님)?\\s*(?:은|는|이|가)(?=\\s|[^\\p{L}\\p{N}_]|$)','gu');
  for(const match of text.matchAll(roleRegex)){const name=match[1];if(newPersonGeneric.has(name)||!newPersonSurname.test(name)||/(?:팀|부서|그룹|회사|개발|담당)$/.test(name))continue;const label=name+' '+match[2],compact=name+match[2];add(name.length===1?label:name,[...(name.length===1?[]:[label]),...(match[0].includes(compact)?[compact]:[])],'rp-role');}
  for(const match of text.matchAll(/(?:^|\n)\s*[^\p{L}\p{N}\n]{0,12}?([가-힣]{2,8}|[A-Z][A-Za-z'-]+(?: [A-Z][A-Za-z'-]+){0,2})(?:\*\*|\]|】)?\s*[:：|]\s*["“「『]/gu)){if(newPersonGeneric.has(newPersonKey(match[1])))continue;add(match[1],[],'rp-speaker',match[0].trim());}
  // Prefer the longer sourced name when a Router alias and an explicit role subject identify the same token.
  const result=[];for(const item of [...candidates.values()].sort((a,b)=>(a.origin==='router'?0:1)-(b.origin==='router'?0:1)||b.name.length-a.name.length)){const names=new Set([item.name,...item.aliases].map(newPersonKey)),existing=result.find(other=>[other.name,...other.aliases].some(name=>names.has(newPersonKey(name))));if(existing)existing.aliases=[...new Set([...existing.aliases,item.name,...item.aliases])].filter(name=>newPersonKey(name)!==newPersonKey(existing.name));else result.push(item);}
  // Bound the explicit roster; the Writer still discovers additional people from RP.
  return result.slice(0,32).map((item,index)=>({candidate_ref:'candidate:n'+(index+1),...item}));
}
export function writerContextualIdentityCandidates({scope,rpText='',userText='',recentContext='',candidateNames=[],userIdentity=null,npcRelationshipEnabled=true}={}){
  const unresolved=collectWriterNewCharacters({scope,rpText,candidateNames,userIdentity});if(!unresolved.length)return[];
  return identityCandidates(scope?.documents||{},{labels:unresolved.flatMap(item=>[item.name,...item.aliases]),contextText:[userText,recentContext,rpText].filter(Boolean).join('\n'),limit:6,npcRelationshipEnabled});
}
