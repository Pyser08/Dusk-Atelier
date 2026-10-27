// 출처: risupot 2.3.0 src/manual-ai-reference.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { cbsReferenceContextIsCurrent, collectCbsReferenceContext } from '../../engine/pot/cbs-source.js';
import { extractRecentRp, extractRpAt, readCurrentRpSource, readWriterSourceCharacter, readWriterSourceChat, writerSourceIsCurrent } from './chat-source.js';
import { collectHypaReference } from '../../engine/pot/hypa-reference.js';
import { normalizeManualAIReferenceOptions } from '../../engine/pot/manual-ai-options.js';
import { collectPeopleKeywordSources } from './people-import.js';
import { normalizeUserActor } from '../../engine/pot/user-identity.js';

const manualAIReferenceAssert=(condition,message)=>{if(!condition)throw new Error(message);};
const manualAIReferenceSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function manualAIReferencePairs(chat,count){
  const messages=Array.isArray(chat?.message)?chat.message:Array.isArray(chat?.messages)?chat.messages:[],view={message:messages},pairs=[];let cursor=messages.length-1;
  while(cursor>=0&&pairs.length<count){while(cursor>=0&&!['char','assistant','bot','model'].includes(String(messages[cursor]?.role).toLowerCase()))cursor--;if(cursor<0)break;const pair=extractRpAt(view,cursor);if(!pair.user||!pair.assistant){cursor--;continue;}pairs.push(pair);cursor=pair.user.index-1;}
  return pairs;
}
function manualAIReferenceAnchor(source){const actor=normalizeUserActor(source.userIdentity);return{characterIndex:source.characterIndex,chatIndex:source.chatIndex,chatKey:source.chatKey,messageCount:source.messageCount,user:source.user,assistant:source.assistant,userActor:{title:actor.title,known:actor.known,aliases:actor.aliases,description:actor.description}};}

export async function collectManualAIReferences(api,wikiScope,person,options={}){
  const selected=normalizeManualAIReferenceOptions(options),scope=wikiScope?.scope||wikiScope;
  manualAIReferenceAssert(scope?.characterId&&scope?.chatKey&&person?.type==='Character'&&typeof person.title==='string','현재 채팅과 작성할 인물을 먼저 확인해주세요.');
  const requestSettings={stageContext:{writer:0}},source=await readCurrentRpSource(api,scope,requestSettings),chat=await readWriterSourceChat(api,source),recent=extractRecentRp(chat),pairs=manualAIReferencePairs(chat,selected.recentTurns);
  manualAIReferenceAssert(manualAIReferenceSame({assistant:source.assistant,user:source.user,messageCount:source.messageCount},recent),'참고 대화를 읽는 동안 RP가 변경되었습니다.');
  let character=await readWriterSourceCharacter(api,source);
  const characterId=character?.chaId??character?.id;if(characterId!==undefined&&characterId!==null)manualAIReferenceAssert(String(characterId)===String(scope.characterId),'참고 자료를 읽는 동안 현재 봇이 변경되었습니다.');
  let related={sources:[]};
  try{related=await collectPeopleKeywordSources(api,[person.title,...(person.aliases||[])]);}
  catch(error){if(/(?:채팅|범위|조건 값).*(?:바뀌|변경)|CBS.*상태/u.test(String(error?.message||'')))throw error;}
  const references={},add=(ref,label,content,kind)=>{if(typeof content==='string'&&content.trim())references[ref]={label,content,kind};};
  pairs.forEach((pair,index)=>{add(index?'source:chat_'+(index+1):'source:rp','확정 대화 '+(index+1),pair.assistant.text,'confirmed_chat');add('source:chat_user_'+(index+1),'사용자 발언 '+(index+1),pair.user.text,'user_context');});
  for(const item of related.sources||[])add(item.ref,item.label||'관련 로어·설정',item.content,'baseline');
  let memory={items:[],counts:{hypa:0,hypaplus:0},characters:0};
  if(selected.memorySource!=='off'&&selected.memoryLimit>0){
    if(selected.memorySource==='hypaplus'&&!character)character=await readWriterSourceCharacter(api,source);
    memory=await collectHypaReference({api,character,chat,query:[person.title,...(person.aliases||[])].join(' '),nativeEnabled:selected.memorySource==='hypa',plusEnabled:selected.memorySource==='hypaplus',maxItems:selected.memoryLimit});
    memory.items.forEach((item,index)=>add('source:memory_'+(index+1),item.source==='hypa'?'하이파 기억':'하이파 플러스 기억',item.text,'memory_context'));
  }
  const fresh=await readCurrentRpSource(api,scope,requestSettings),freshChat=await readWriterSourceChat(api,source);
  manualAIReferenceAssert(manualAIReferenceSame(manualAIReferenceAnchor(source),manualAIReferenceAnchor(fresh))&&manualAIReferenceSame(pairs,manualAIReferencePairs(freshChat,selected.recentTurns)),'참고 자료를 읽는 동안 대화 또는 페르소나가 변경되었습니다.');
  if(related.cbsSignature){const context=await collectCbsReferenceContext(api,{chat:freshChat,characterIndex:source.characterIndex,chatIndex:source.chatIndex});manualAIReferenceAssert(context.current&&context.signature===related.cbsSignature&&await cbsReferenceContextIsCurrent(api,context),'참고 자료를 읽는 동안 CBS 조건 값이 변경되었습니다.');}
  manualAIReferenceAssert(await writerSourceIsCurrent(api,source),'참고 자료를 읽는 동안 현재 채팅이 변경되었습니다.');
  const usage={requestedTurns:selected.recentTurns,includedTurns:pairs.length,memorySource:selected.memorySource,requestedMemory:selected.memoryLimit,includedMemory:memory.items.length,memoryCharacters:memory.characters,loreSources:(related.sources||[]).length,referenceCharacters:Object.values(references).reduce((sum,item)=>sum+item.content.length,0)};
  return{source,related,references,usage,options:selected,signature:JSON.stringify({scope:{characterId:scope.characterId,chatKey:scope.chatKey,wikiRevision:wikiScope?.revision??null},options:selected,source:manualAIReferenceAnchor(source),pairs,related:related.sources||[],cbsSignature:related.cbsSignature||'',memory})};
}
