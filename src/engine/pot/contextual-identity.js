// 출처: risupot 2.3.0 src/contextual-identity.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { npcRelationshipAllowed } from './npc-relationship.js';
import { isCharacterOverviewSection } from './relationship-mode.js';
import { namedCharacterMention } from './wiki-retrieval.js';

const IDENTITY_LIMITS={documents:500,sections:128,aliases:8,aliasChars:80,titleChars:120,targets:4,excerptChars:640,contextChars:16000,labels:16,candidates:12,outputChars:12000};
const identityObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const identityCharacter=value=>identityObject(value)&&String(value.type||'').toLowerCase()==='character';
const identityRef=value=>typeof value==='string'&&value.length>0&&value.length<=160&&value.trim()===value&&!['__proto__','prototype','constructor'].includes(value);
const identityString=(value,maximum)=>typeof value==='string'?value.slice(0,maximum):'';
const identityName=value=>String(value||'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const identityDistinct=values=>[...new Set(values)];
function identityNames(document){
  const aliases=Array.isArray(document?.aliases)?document.aliases:Array.isArray(document?.aliases_add)?document.aliases_add:[];
  return{title:identityString(document?.title,IDENTITY_LIMITS.titleChars),aliases:identityDistinct(aliases.filter(value=>typeof value==='string'&&value.trim()).slice(0,IDENTITY_LIMITS.aliases).map(value=>value.slice(0,IDENTITY_LIMITS.aliasChars)))};
}
function identitySections(document){return[...(Array.isArray(document?.sections)?document.sections.slice(0,IDENTITY_LIMITS.sections):[]),...(Array.isArray(document?.entries)?document.entries.slice(0,IDENTITY_LIMITS.sections):[])].slice(0,IDENTITY_LIMITS.sections).filter(identityObject);}
const identitySlot=section=>section.provenance?.slotId||section.slot_id||'';
const identityBody=section=>typeof section.body==='string'?section.body:typeof section.text==='string'?section.text:'';
function identityExcerpt(parts,maximum){
  let result='';for(const part of identityDistinct(parts)){if(!part||result.length>=maximum)continue;const separator=result?'\n':'';result+=(separator+part).slice(0,Math.max(0,maximum-result.length));}return result;
}

/** maxChars bounds all quoted body text together; titles, aliases and target IDs have separate fixed caps. */
export function identityEvidence(document,{documents={},maxChars=320,npcRelationshipEnabled=true}={}){
  const metadata=identityNames(document),maximum=Number.isFinite(maxChars)?Math.max(0,Math.min(IDENTITY_LIMITS.excerptChars,Math.floor(maxChars))):320;
  const result={...metadata,identityExcerpt:'',relationshipTargets:[]};
  if(!identityObject(document)||document.type&&!identityCharacter(document))return result;
  const identityParts=[],targets=new Map();
  for(const section of identitySections(document)){
    const slot=identitySlot(section),body=identityBody(section);
    if(slot==='core.identity'||slot==='core.profile'||!slot&&isCharacterOverviewSection(section))identityParts.push(body);
    if(slot!=='core.relationship')continue;
    const refs=section.provenance?.targetRefs||section.target_refs;
    if(!npcRelationshipAllowed(slot,refs,npcRelationshipEnabled))continue;
    for(const ref of (Array.isArray(refs)?refs:[]).slice(0,16)){
      if(!identityRef(ref)||targets.size>=IDENTITY_LIMITS.targets&&!targets.has(ref))continue;
      if(!targets.has(ref))targets.set(ref,[]);targets.get(ref).push(body);
    }
  }
  const identityBudget=targets.size?Math.floor(maximum*.75):maximum;
  result.identityExcerpt=identityExcerpt(identityParts,identityBudget);
  let remaining=maximum-result.identityExcerpt.length,index=0;
  for(const[documentRef,parts]of targets){
    const budget=Math.floor(remaining/(targets.size-index++)),description=identityExcerpt(parts,budget),target=Object.hasOwn(documents||{},documentRef)?documents[documentRef]:null;
    result.relationshipTargets.push({documentRef,title:identityString(target?.title,IDENTITY_LIMITS.titleChars),description});remaining-=description.length;
  }
  return result;
}

/** Ranking is only a review shortlist. Multiple documents with the same name, role or location stay separate. */
export function identityCandidates(documents,{labels=[],contextText='',recentDocumentIds=[],limit=6,npcRelationshipEnabled=true}={}){
  const maximum=Number.isFinite(limit)?Math.max(0,Math.min(IDENTITY_LIMITS.candidates,Math.floor(limit))):6;if(!maximum)return[];
  const entries=identityObject(documents)?Object.entries(documents).filter(([ref,doc])=>identityRef(ref)&&identityCharacter(doc)).slice(0,IDENTITY_LIMITS.documents):[];
  const suppliedLabels=identityDistinct((Array.isArray(labels)?labels:typeof labels==='string'?[labels]:[]).filter(value=>typeof value==='string'&&value.trim()).slice(0,IDENTITY_LIMITS.labels).map(value=>value.slice(0,160))),context=typeof contextText==='string'?contextText.slice(-IDENTITY_LIMITS.contextChars):'';
  if(!suppliedLabels.length&&!context.trim())return[];
  const rows=entries.map(([documentRef,document])=>{const evidence=identityEvidence(document,{documents,npcRelationshipEnabled});return{documentRef,document,evidence,names:[evidence.title,...evidence.aliases].filter(name=>name.trim())};});
  const contextCache=new Map(),contextHas=name=>{if(!contextCache.has(name))contextCache.set(name,namedCharacterMention(context,name));return contextCache.get(name);},mentioned=rows.filter(row=>row.names.some(contextHas)).map(row=>({documentRef:row.documentRef,names:row.names})).slice(0,32);
  const clueTokens=identityDistinct((context.normalize('NFC').toLowerCase().match(/[\p{L}][\p{L}\p{N}_-]+/gu)||[]).filter(token=>token.length>=2&&token.length<=80)).slice(-48);
  const ranked=[];
  for(const row of rows){
    const reasons=new Set(),weights={},add=(reason,points)=>{reasons.add(reason);weights[reason]=Math.max(weights[reason]||0,points);},names=row.names.map(identityName),body=[row.evidence.identityExcerpt,...row.evidence.relationshipTargets.map(target=>target.description)].join('\n');
    if(suppliedLabels.some(label=>identityName(label)&&names.includes(identityName(label)))){add('name',120);}
    if(row.names.some(contextHas)){add('name',70);}
    if(suppliedLabels.some(label=>namedCharacterMention(body,label))){add('identity-context',60);}
    for(const other of mentioned){
      if(other.documentRef===row.documentRef)continue;
      if(row.evidence.relationshipTargets.some(target=>target.documentRef===other.documentRef)){add('relationship-target',95);}
      if(other.names.some(name=>namedCharacterMention(row.evidence.identityExcerpt,name))){add('identity-context',90);}
    }
    const clues=clueTokens.filter(token=>!names.includes(identityName(token))&&namedCharacterMention(body,token));
    if(clues.length>=2||clues.some(token=>token.length>=4)){add('identity-context',20+Math.min(10,clues.length*2));}
    const score=Object.values(weights).reduce((sum,value)=>sum+value,0);if(score)ranked.push({row,score,matchReasons:[...reasons]});
  }
  ranked.sort((a,b)=>b.score-a.score||a.row.documentRef.localeCompare(b.row.documentRef));
  if(suppliedLabels.length){
    const byRef=new Map(rows.map(row=>[row.documentRef,row])),seen=new Set(ranked.map(item=>item.row.documentRef)),explicit=(Array.isArray(recentDocumentIds)?recentDocumentIds:[]).filter(identityRef).slice(0,32),dated=rows.filter(row=>typeof row.document.createdAt==='string'&&Number.isFinite(Date.parse(row.document.createdAt))).sort((a,b)=>Date.parse(b.document.createdAt)-Date.parse(a.document.createdAt)||a.documentRef.localeCompare(b.documentRef)).map(row=>row.documentRef);let added=0;
    for(const ref of identityDistinct([...explicit,...dated])){const row=byRef.get(ref);if(!row||seen.has(ref))continue;ranked.push({row,score:0,matchReasons:['recent']});seen.add(ref);if(++added>=2)break;}
  }
  const result=[];let length=2;
  for(const item of ranked){if(result.length>=maximum)break;const candidate={documentRef:item.row.documentRef,...item.row.evidence,matchReasons:item.matchReasons},size=JSON.stringify(candidate).length+1;if(length+size>IDENTITY_LIMITS.outputChars)break;result.push(candidate);length+=size;}
  return result;
}
