// 출처: risupot 2.3.0 src/main-wiki-hook.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { trackedDocumentIds } from '../../engine/pot/auto-tracking.js';
import { cbsReferenceContextIsCurrent, collectCbsReferenceContext, hasCbsReferenceContent, projectCbsLoreEntries } from '../../engine/pot/cbs-source.js';
import { messageText } from './chat-source.js';
import { identityCandidates, identityEvidence } from '../../engine/pot/contextual-identity.js';
import { customPromptBlock } from '../../engine/pot/custom-prompts.js';
import { directorMainControl } from '../../engine/pot/director-facts.js';
import { assembleDirectorPass1Prompt, assembleDirectorPass2Prompt, parseDirectorResponse, renderDirectorNote } from './director-runtime.js';
import { createDirectorSearchSnapshot, directorSearchSnapshotMatches, executeDirectorSearchBatch } from './director-search.js';
import { sortRelatedWikiDocuments } from '../../engine/pot/event-chronology.js';
import { collectHypaReference, directorMemoryLimit, selectedHypaSource } from '../../engine/pot/hypa-reference.js';
import { callWriterModel } from './llm-client.js';
import { effectiveRelationshipSettings, relationshipDocumentType } from '../../engine/pot/relationship-mode.js';
import { filterRouterFixedDocuments, filterRouterFixedLore, filterRouterFixedNewCharacters, includeTrackedRouterDocuments, retrieveRouterFixed, routerFixedControl, routerFixedKeywords, routerFixedScope, routerFixedSettings } from '../../engine/pot/router-fixed.js';
import { buildRouterPrompt, buildRouterRequest, containsLbProcess, formattedText, parseRouterResponse, routerCacheHash } from './router-runtime.js';
import { traceModelCall } from './runtime-trace.js';
import { featureSettingsFor } from '../../engine/pot/settings.js';
import { recentStageMessages, stageContextCount } from '../../engine/pot/stage-context.js';
import { chatTraceInputTurn } from './trace-turn.js';
import { loadUserActor } from '../../engine/pot/user-identity.js';
import { includeMentionedCharacters, renderWikiReference, replaceWikiMarker } from '../../engine/pot/wiki-retrieval.js';

// Writer's automatic-run switch does not invalidate an in-flight Router/Director request.
const AUX = new Set(['memory', 'emotion', 'translate', 'otherax', 'submodel', 'sub-model']);
const compact = value => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
// Only a request carrying this chat's latest user turn as a user message, plus its prior reply (or a chat-shaped history), is the main RP request.
const requestUserRole = message => ['user','human'].includes(String(message?.role).toLowerCase());
// DB text keeps CBS like {{user}} while the request carries the rendered text, so macros are skipped and the remaining pieces must appear in order.
const cbsPieces = value => compact(value).split(/\{\{[\s\S]*?\}\}/).map(compact).filter(Boolean);
function containsPieces(text, pieces) { let from = 0; for (const piece of pieces) { const at = text.indexOf(piece, from); if (at < 0) return false; from = at + piece.length; } return pieces.length > 0; }
function mainChatRequestEvidence(messages, list) {
  const chatList = Array.isArray(list) ? list : [], userIndex = chatList.findLastIndex(requestUserRole), actual = compact(messageText(chatList[userIndex]));
  if (!actual || !Array.isArray(messages)) return { main: false, matched: false, exact: false };
  const users = messages.filter(requestUserRole).map(message => compact(formattedText(message.content))), pieces = cbsPieces(actual);
  const exact = users.some(text => text === actual || (actual.length >= 2 && text.includes(actual))), matched = exact || users.some(text => containsPieces(text, pieces));
  if (!matched) return { main: false, matched: false, exact: false };
  let prior = '';
  for (let index = userIndex - 1; index >= 0; index--) { const text = cbsPieces(messageText(chatList[index])).join(' '); if (text && !requestUserRole(chatList[index])) { prior = text; break; } }
  if (!prior) return { main: true, matched: true, exact };
  const joined = messages.map(message => compact(formattedText(message.content))).join('\n'), size = 24;
  const probes = prior.length <= size ? [prior] : [prior.slice(0, size), prior.slice(Math.floor((prior.length - size) / 2), Math.floor((prior.length - size) / 2) + size), prior.slice(-size)];
  const chatShaped = messages.filter(message => String(message?.role).toLowerCase() !== 'system').length >= 3;
  return { main: chatShaped || probes.some(probe => joined.includes(probe)), matched: true, exact };
}
const contentSettingsRevision=store=>{const status=store.status();return status.contentRevision??status.revision;};

export class MainWikiHook {
  constructor(api, store, wiki, keyStore, sourceLibrary, auto, progressPanel = null, traceStore = null) {
    this.api=api; this.store=store; this.wiki=wiki; this.keyStore=keyStore; this.sourceLibrary=sourceLibrary; this.auto=auto; this.progressPanel=progressPanel;this.traceStore=traceStore;
    this.state='pending'; this.last={requestedMode:'keyword',actualMode:'keyword',mode:'keyword',count:0,documents:[],fallback:false,skippedReason:'',message:'',at:'',director:{status:'idle',note:'',error:''}};
    this.listeners=new Set(); this.cache=new Map(); this.directorCache=new Map(); this.worker=null; this.disposed=false; this.epoch=0; this.listener=(messages,type)=>this.before(messages,type);
  }
  subscribe(fn) { this.listeners.add(fn); fn(this.last); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) try { fn(this.last); } catch {} }
  clearDirectorCache() { this.directorCache.clear(); }
  settingsForBot(characterId) { return effectiveRelationshipSettings(featureSettingsFor(this.store.rawSnapshot?.() ?? this.store.snapshot(), characterId)); }
  reset(mode) { this.cache.clear(); this.directorCache.clear(); this.result(mode,mode,[]); this.emit(); }
  result(requested,actual,docs,message='',skippedReason='') {
    this.last={requestedMode:requested,actualMode:actual,mode:actual,count:docs.length,documents:docs.map(document=>({id:document.id,type:document.type,title:document.title})),fallback:requested!==actual,skippedReason,message,at:new Date().toISOString(),director:{status:'idle',note:'',error:''}};
  }
  skip(mode,message,reason='') { this.result(mode,mode,[],message,reason||message); this.emit(); }
  async targetValid(characterIndex,chatIndex,userIndex,actualId,actualText,expectedChatKey='') {
    try {
      const currentCharacter=await this.api.getCurrentCharacterIndex(),currentChat=await this.api.getCurrentChatIndex(),chat=await this.api.getChatFromIndex(currentCharacter,currentChat),item=chat?.message?.[userIndex],id=String(item?.chatId||item?.id||`index:${userIndex}`);
      return currentCharacter===characterIndex&&currentChat===chatIndex&&(!expectedChatKey||String(chat?.risupotWikiScopeId||chat?.id||'')===expectedChatKey)&&id===actualId&&compact(messageText(item))===actualText;
    } catch { return false; }
  }
  async scopeValid(characterIndex,chatIndex,expectedChatKey=''){try{if(await this.api.getCurrentCharacterIndex()!==characterIndex||await this.api.getCurrentChatIndex()!==chatIndex)return false;if(!expectedChatKey)return true;const chat=await this.api.getChatFromIndex(characterIndex,chatIndex);return String(chat?.risupotWikiScopeId||chat?.id||'')===expectedChatKey}catch{return false}}
  setHook(state) { this.state=state; this.emit(); }
  validateTraced(stage,scope,callback) { try{return callback();}catch(error){this.traceStore?.markLatestFailed(scope,stage,error);throw error;} }
  async before(messages,type) {
    let progressToken=null,mode='keyword';
    try {
      const epoch=this.epoch,settingsRevision=contentSettingsRevision(this.store);let settings=effectiveRelationshipSettings(this.store.snapshot());
      mode=settings.retrievalMode;
      if(this.disposed||!settings.enabled||AUX.has(String(type||'').toLocaleLowerCase())||!Array.isArray(messages)||messages.some(message=>containsLbProcess(message.content)))return messages;
      const formatted=[...messages].reverse().find(message=>['user','human'].includes(String(message.role).toLowerCase())),formattedUser=formattedText(formatted?.content);
      if(!formattedUser)return messages;
      const characterIndex=await this.api.getCurrentCharacterIndex(),chatIndex=await this.api.getCurrentChatIndex(),chat=await this.api.getChatFromIndex(characterIndex,chatIndex),list=chat?.message||[],evidence=mainChatRequestEvidence(messages,list),userIndex=list.findLastIndex(message=>['user','human'].includes(String(message?.role).toLowerCase())),initialChatKey=String(chat?.risupotWikiScopeId||chat?.id||''),actualMessage=list[userIndex],actualUser=messageText(actualMessage),actualId=String(actualMessage?.chatId||actualMessage?.id||`index:${userIndex}`),actualCompact=compact(actualUser),formattedCompact=compact(formattedUser),databaseMatched=Boolean(actualCompact&&(actualCompact===formattedCompact||(actualCompact.length>=2&&formattedCompact.includes(actualCompact)))),currentUser=databaseMatched?actualUser:formattedUser,currentCompact=compact(currentUser),expectedKey={value:initialChatKey},guard=()=>databaseMatched?this.targetValid(characterIndex,chatIndex,userIndex,actualId,currentCompact,expectedKey.value):this.scopeValid(characterIndex,chatIndex,expectedKey.value);
      if(!evidence.main)return messages;
      progressToken=this.progressPanel?.searchStart(mode)??null;
      if(this.auto?.scopeBusy?.(`${characterIndex}:${chatIndex}`))this.progressPanel?.waitingForWriter(progressToken);
      if(this.auto&&!await this.auto.waitForScope(characterIndex,chatIndex)){this.skip(mode,'리수폿 중지로 Writer 대기 해제 · 원본 Main 요청 진행');this.progressPanel?.mainReady(progressToken,0,[],'리수폿이 중지되어 Wiki 대기를 해제했습니다.');return messages;}
      if(this.disposed||epoch!==this.epoch||!await guard())return messages;
      await this.wiki.refresh();
      // V (2.0.2): a copied chat gets its own Wiki scope inside refresh(); follow the new scope id instead of cancelling this turn.
      if(expectedKey.value){let movedKey='';try{movedKey=String((await this.api.getChatFromIndex(characterIndex,chatIndex))?.risupotWikiScopeId||'');}catch{}if(movedKey&&movedKey!==expectedKey.value&&this.wiki.snapshot()?.scope?.chatKey===movedKey)expectedKey.value=movedKey;}
      if(this.disposed||epoch!==this.epoch||!await guard()){this.skip(mode,'채팅 변경 감지 · 검색 전 취소');return messages;}
      const scope=this.wiki.snapshot(),scopeRevision=scope?.revision;this.traceStore?.beginPipeline?.({...scope?.scope,turnNumber:chatTraceInputTurn(chat,userIndex,{matched:databaseMatched})});
      settings=routerFixedSettings(this.settingsForBot(scope?.scope?.characterId),scope);
      const handoffTicket=scope?await this.auto?.reviewHandoff?.begin({scope:scope.scope,characterIndex,chatIndex,chat,userIndex:databaseMatched?userIndex:list.length,currentUser,userId:databaseMatched?actualId:null}):null;
      const usableDocuments=scope?Object.values(scope.documents).filter(document=>!settings.relationshipOnlyMode||relationshipDocumentType(document.type)):[],emptyRelationshipMemory=Boolean(settings.relationshipOnlyMode&&scope&&!usableDocuments.length);if(!scope||(!settings.relationshipOnlyMode&&!usableDocuments.length)){this.result(mode,mode,[],'Wiki 비어 있음 · 주입 생략','empty-wiki');this.progressPanel?.mainReady(progressToken,0,[],'첫 턴 · 아직 저장된 Wiki가 없습니다.');this.emit();return replaceWikiMarker(messages,'');}
      const userIdentity=await loadUserActor(this.api,chat,{characterId:scope.scope.characterId,chatKey:scope.scope.chatKey,characterIndex,chatIndex});
      const stage=settings.models.stages.router,preset=stage.mode==='dedicated'?stage.preset:settings.models.shared,end=databaseMatched?userIndex+1:list.length;
      const recent=recentStageMessages(list,end,stageContextCount(settings,'router'),messageText,databaseMatched?null:currentUser),directorRecent=recentStageMessages(list,end,stageContextCount(settings,'director'),messageText,databaseMatched?null:currentUser),query=[currentUser,...recent.filter(item=>item.text!==currentUser).map(item=>item.text)].join('\n');
      let docs,newCharacters=[];
      if(emptyRelationshipMemory){docs=[];this.result(mode,'relationship-memory',docs,'인물정보 없음 · 하이파·최근 채팅만 Director에 전달');}
      else if(mode==='router'){
        try{docs=await this.route(scope,currentUser,recent,settings,preset,databaseMatched?userIndex:list.length,userIdentity,names=>{newCharacters=names});this.result('router','router',docs);}
        catch{newCharacters=[];docs=retrieveRouterFixed(scope,query,settings,{features:settings.features,primaryQuery:currentUser,npcRelationshipEnabled:settings.npcRelationshipEnabled!==false,relationshipOnly:settings.relationshipOnlyMode===true});this.result('router','keyword',docs,'Router 실패 · 이 턴만 키워드 검색으로 대체');this.progressPanel?.searchFallback?.(progressToken,docs.length);}
      } else { docs=retrieveRouterFixed(scope,query,settings,{features:settings.features,primaryQuery:currentUser,npcRelationshipEnabled:settings.npcRelationshipEnabled!==false,relationshipOnly:settings.relationshipOnlyMode===true});this.result(mode,'keyword',docs); }
      docs=sortRelatedWikiDocuments(docs);
      if(this.disposed||epoch!==this.epoch||!await guard()||contentSettingsRevision(this.store)!==settingsRevision||this.store.snapshot().retrievalMode!==mode){this.skip(mode,'채팅·설정 변경 감지 · 주입 취소');if(progressToken!==null)this.progressPanel?.hide(progressToken);return messages;}
      const latest=this.wiki.snapshot();
      if(latest&&(latest.scope?.characterId!==scope.scope.characterId||latest.scope?.chatKey!==scope.scope.chatKey)){if(progressToken!==null)this.progressPanel?.hide(progressToken);return messages;}
      if(latest?.revision!==scopeRevision){
        if(latest?.scope?.chatKey!==scope.scope.chatKey){if(progressToken!==null)this.progressPanel?.hide(progressToken);return messages;}
        const latestSettings=this.settingsForBot(scope.scope.characterId);docs=retrieveRouterFixed(latest,query,latestSettings,{features:latestSettings.features,primaryQuery:currentUser,npcRelationshipEnabled:latestSettings.npcRelationshipEnabled!==false,relationshipOnly:latestSettings.relationshipOnlyMode===true});this.result(mode,'keyword',docs,latestSettings.relationshipOnlyMode?'인물정보 변경 감지 · 최신 인물 검색으로 대체':'Wiki 변경 감지 · 최신 키워드 검색으로 대체');
      }
      docs=routerFixedKeywords(settings).active?filterRouterFixedDocuments(latest||scope,docs,settings):includeMentionedCharacters(latest||scope,docs,currentUser,recent,{features:settings.features,npcRelationshipEnabled:settings.npcRelationshipEnabled!==false,relationshipOnly:settings.relationshipOnlyMode===true});docs=includeTrackedRouterDocuments(latest||scope,docs,settings);newCharacters=filterRouterFixedNewCharacters(newCharacters,settings);this.result(this.last.requestedMode,this.last.actualMode,docs,this.last.message);
      const directorScope=latest||scope,directorRevision=directorScope.revision,directorScopeKey=directorScope.scope.characterId+'\n'+directorScope.scope.chatKey;
      let directorNote='[CONTROL · RISUPOT KNOWLEDGE BOUNDARY] '+directorMainControl(settings.directorRole);
      if(this.sourceLibrary.base?.director&&this.sourceLibrary.base?.director_schema){this.progressPanel?.directorStart(progressToken);try{const director=await this.direct(directorScope,docs,currentUser,directorRecent,settings,{characterIndex,chatIndex,chat,userIdentity});directorNote=renderDirectorNote(director,settings.directorRole);this.last.director={status:'completed',note:director.note,error:'',searches:director.search_count||0,memory:director.memory_counts||{hypa:0,hypaplus:0},memoryCharacters:director.memory_characters||0};}catch(error){this.progressPanel?.directorFailure?.(progressToken,String(error?.message||'Director 호출 실패'));this.last.director={status:'failed',note:'',error:String(error?.message||'Director 호출 실패').slice(0,600),searches:0,memory:{hypa:0,hypaplus:0},memoryCharacters:0};this.last.message=(this.last.message?this.last.message+' · ':'')+'Director 실패 · '+(settings.relationshipOnlyMode?'인물정보만':'Wiki만')+' Main에 전달';}}
      if(this.disposed||epoch!==this.epoch||!await guard()||contentSettingsRevision(this.store)!==settingsRevision){this.skip(mode,'Director 실행 중 채팅·설정 변경 감지 · 주입 취소');if(progressToken!==null)this.progressPanel?.hide(progressToken);return messages;}
      const finalWiki=this.wiki.snapshot();if(finalWiki?.revision!==directorRevision||finalWiki?.scope?.characterId+'\n'+finalWiki?.scope?.chatKey!==directorScopeKey){this.skip(mode,'Director 실행 중 인물정보 변경 감지 · 이전 결과 주입 취소');return messages;}
      this.auto?.reviewHandoff?.commit(handoffTicket,docs,newCharacters);
      this.progressPanel?.mainReady(progressToken,docs.length,docs.map(document=>document.title),this.last.director.status==='completed'?'Director Note 준비 완료':this.last.message);this.emit();
      const injectionSettings=this.settingsForBot(scope.scope.characterId);return replaceWikiMarker(messages,[renderWikiReference(docs,injectionSettings.features,undefined,injectionSettings.npcRelationshipEnabled!==false,injectionSettings.relationshipOnlyMode===true),directorNote].filter(Boolean).join('\n\n'));
    } catch {
      this.skip(mode,'Wiki 검색 실패 · 원본 Main 요청 유지');
      if(progressToken!==null)this.progressPanel?.mainReady(progressToken,0,[],'Wiki 검색 실패 · Main 원본 요청을 진행합니다.');
      return messages;
    }
  }
  async route(scope,currentUser,recentChat,settings,preset,userIndex,userIdentity=null,onNewCharacters=()=>{}) {
    settings=routerFixedSettings(settings,scope);
    const fixed=routerFixedKeywords(settings),retrievalScope=routerFixedScope(scope,settings),sourceDocuments=Object.values(retrievalScope.documents).filter(document=>!settings.relationshipOnlyMode||relationshipDocumentType(document.type)),refs=Object.fromEntries(sourceDocuments.sort((a,b)=>a.id.localeCompare(b.id)).map((document,index)=>[`doc:r${index+1}`,document]));
    const catalog=Object.fromEntries(Object.entries(refs).map(([ref,document])=>[ref,{type:document.type,title:document.title,aliases:document.aliases,tags:document.tags}]));
    const idToRouterRef=new Map(Object.entries(refs).map(([ref,document])=>[document.id,ref])),contextText=[currentUser,...recentChat.map(item=>item.text||'')].join('\n'),preferred=identityCandidates(retrievalScope.documents,{contextText,limit:12,npcRelationshipEnabled:settings.npcRelationshipEnabled!==false}).map(item=>item.documentRef),recent=sourceDocuments.filter(doc=>doc.type==='Character').sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,8).map(doc=>doc.id),ordered=[...new Set([...preferred,...recent,...sourceDocuments.map(doc=>doc.id)])];let identityBudget=12000;
    for(const id of ordered){const ref=idToRouterRef.get(id),document=retrievalScope.documents[id];if(!ref||document?.type!=='Character')continue;const evidence=identityEvidence(document,{documents:retrievalScope.documents,maxChars:preferred.includes(id)?280:120,npcRelationshipEnabled:settings.npcRelationshipEnabled!==false}),hint={identity_excerpt:evidence.identityExcerpt,relationships:evidence.relationshipTargets.map(target=>({document_ref:idToRouterRef.get(target.documentRef)||target.documentRef,title:target.title,description:target.description}))},size=JSON.stringify(hint).length;if(!hint.identity_excerpt&&!hint.relationships.length||size>identityBudget)continue;catalog[ref].identity_context=hint;identityBudget-=size;}
    const identity={characterId:scope.scope.characterId,scope:scope.scope.chatKey,userIndex,currentUser,recentChat,wikiRevision:scope.revision,settingsRevision:contentSettingsRevision(this.store),fixedKeywords:settings.routerFixedKeywords||'',userIdentity,mode:'router'},hash=await routerCacheHash(identity);
    if(this.cache.has(hash)){const cached=this.cache.get(hash);onNewCharacters(filterRouterFixedNewCharacters(cached.newCharacters||[],settings));return filterRouterFixedDocuments(scope,cached.documents,settings);}
    let newCharacters=[];
    const requestRef=`req:router_${hash.slice(0,32)}`,manifest=buildRouterRequest({requestRef,currentUser,recentChat,catalog,userIdentity,maxDocuments:6}),base=(settings.prompts['router:common']??this.sourceLibrary.router.common)+(customPromptBlock(settings,'router',scope.scope)?'\n\n'+customPromptBlock(settings,'router',scope.scope):'')+routerFixedControl(settings,{trackedRefs:trackedDocumentIds(settings,scope).map(id=>idToRouterRef.get(id)).filter(Boolean)}),prompt=buildRouterPrompt(base,manifest),raw=await traceModelCall(this.traceStore,'Router',preset,prompt,onUsage=>(this.llmCall??callWriterModel)(this.api,this.keyStore,preset,prompt,{onUsage,stageLabel:'Router'}),scope.scope),selected=this.validateTraced('Router',scope.scope,()=>parseRouterResponse(raw,{requestRef,allowedRefs:new Set(Object.keys(refs)),maxDocuments:6,bindToCurrentRequest:true,sourceText:[currentUser,...recentChat.map(item=>item.text||'')].join('\n'),catalog,userIdentity,onNewCharacters:names=>{newCharacters=filterRouterFixedNewCharacters(names,settings)}})),selectedDocs=selected.map(item=>refs[item.document_ref]),docs=fixed.active?filterRouterFixedDocuments(scope,[...selectedDocs,...sourceDocuments],settings):includeTrackedRouterDocuments(scope,selectedDocs,settings);
    this.cache.set(hash,{documents:docs,newCharacters});onNewCharacters(newCharacters);if(this.cache.size>24)this.cache.delete(this.cache.keys().next().value);return docs;
  }
  async runDirectorPass(label,preset,assembled,scope,skills,parseOptions){const raw=await traceModelCall(this.traceStore,label,preset,assembled.prompt,onUsage=>(this.llmCall??callWriterModel)(this.api,this.keyStore,preset,assembled.prompt,{onUsage,stageLabel:label}),scope.scope,skills);return this.validateTraced(label,scope.scope,()=>parseDirectorResponse(raw,parseOptions));}
  async direct(scope,documents,currentUser,recentChat,settings,context){
    const key=await routerCacheHash({kind:'director',characterId:scope?.scope?.characterId,chatKey:scope?.scope?.chatKey,wikiRevision:scope?.revision,currentUser,recentChat,documents:(documents||[]).map(document=>document.id),settingsRevision:contentSettingsRevision(this.store),userIdentity:context?.userIdentity?.title||''});
    if(this.directorCache.has(key))return structuredClone(this.directorCache.get(key));
    const result=await this.directUncached(scope,documents,currentUser,recentChat,settings,context);
    this.directorCache.set(key,structuredClone(result));while(this.directorCache.size>4)this.directorCache.delete(this.directorCache.keys().next().value);
    return result;
  }
  async directUncached(scope,documents,currentUser,recentChat,settings,{characterIndex,chatIndex,chat,userIdentity=null}){
    settings={...settings,customPromptScope:scope?.scope||null};
    settings=routerFixedSettings(settings,scope);
    const searchScope=routerFixedScope(scope,settings);documents=filterRouterFixedDocuments(scope,documents,settings);
    const memorySource=selectedHypaSource(settings),memoryLimit=directorMemoryLimit(settings);
    let character=null;if(settings.relationshipOnlyMode&&memorySource==='hypaplus'&&memoryLimit>0&&typeof this.api.getCharacterFromIndex==='function')try{character=await this.api.getCharacterFromIndex(characterIndex)}catch{}const memoryQuery=[currentUser,...recentChat.map(item=>item.text||''),...documents.flatMap(document=>[document.title,...(document.aliases||[])])].join('\n'),longTermMemory=await (this.mergeRecall??(memory=>memory))(settings.relationshipOnlyMode?await collectHypaReference({api:this.api,character,chat,query:memoryQuery,nativeEnabled:memorySource==='hypa',plusEnabled:memorySource==='hypaplus',maxItems:memoryLimit}):{items:[],counts:{hypa:0,hypaplus:0},characters:0},{scope,documents,currentUser,recentChat,characterIndex,chatIndex,chat}),peopleProfiles=settings.peopleProfileEnabled!==false?(searchScope.people?.profiles||{}):{},identity={characterId:scope.scope.characterId,chatKey:scope.scope.chatKey,wikiRevision:scope.revision,currentUser,recentChat,documents:documents.map(document=>document.id),memoryCounts:longTermMemory.counts,memoryCharacters:longTermMemory.characters,settingsRevision:contentSettingsRevision(this.store)},hash=await routerCacheHash(identity),stage=settings.models.stages.director,preset=stage.mode==='dedicated'?stage.preset:settings.models.shared,requestRef1=`req:director_p1_${hash.slice(0,28)}`,pass1=assembleDirectorPass1Prompt({sourceLibrary:this.sourceLibrary,settings,currentUser,recentChat,userIdentity,documents,peopleProfiles,longTermMemory,requestRef:requestRef1,searchBudget:8,allowedTools:['chat_search','wiki_search','lore_seed_search']}),skills=['core',...pass1.skills],decision=await this.runDirectorPass('Director pass 1',preset,pass1,scope,skills,{requestRef:requestRef1,pass:pass1.pass,allowedRefs:pass1.allowedRefs,documentRefs:pass1.documentRefs,rhythmEnabled:settings.directorRole!=='facts'&&Boolean(settings.features.rhythm?.enabled),allowedTools:pass1.allowedTools,searchBudget:pass1.searchBudget});
    if(decision.decision==='final')return{...decision,search_count:0,memory_counts:longTermMemory.counts,memory_characters:longTermMemory.characters};
    let loreEntries=null,cbsContext=null;
    if(decision.searches.some(search=>search.tool==='lore_seed_search')&&typeof this.api.getCurrentLorebookEntries==='function'){
      let rawLore=null;try{rawLore=await this.api.getCurrentLorebookEntries();}catch{}
      if(Array.isArray(rawLore)){
        if(hasCbsReferenceContent({entries:rawLore})){
          cbsContext=await collectCbsReferenceContext(this.api,{character,chat,characterIndex,chatIndex,userName:userIdentity?.title,isCurrent:()=>!this.disposed&&this.scopeValid(characterIndex,chatIndex,scope.scope.chatKey)});
          if(!cbsContext.current)throw new Error('Director CBS 자료 수집 중 채팅·변수 상태가 변경되어 결과를 폐기했습니다.');
          if(cbsContext.scope.characterId!==scope.scope.characterId||cbsContext.scope.chatKey!==scope.scope.chatKey)throw new Error('Director CBS 자료의 봇·채팅 범위가 변경되어 결과를 폐기했습니다.');
        }
        loreEntries=filterRouterFixedLore(projectCbsLoreEntries(rawLore,cbsContext||{}).entries,settings);
      }
    }
    const cbsCurrent=()=>!cbsContext||cbsReferenceContextIsCurrent(this.api,cbsContext);
    const expected=createDirectorSearchSnapshot({characterIndex,chatIndex,chat,scope}),batch=executeDirectorSearchBatch({searches:decision.searches,chat,scope:searchScope,preferredDocuments:documents,features:settings.features,peopleProfiles,npcRelationshipEnabled:settings.npcRelationshipEnabled!==false,relationshipOnly:settings.relationshipOnlyMode===true,loreEntries,cbsContext:cbsContext||{}}),freshChat=await this.api.getChatFromIndex(characterIndex,chatIndex),freshScope=this.wiki.snapshot(),current=createDirectorSearchSnapshot({characterIndex,chatIndex,chat:freshChat,scope:freshScope});if(!directorSearchSnapshotMatches(expected,current)||!await cbsCurrent())throw new Error('Director 검색 중 채팅·변수·Wiki가 변경되어 결과를 폐기했습니다.');
    const requestRef2=`req:director_p2_${hash.slice(0,28)}`,pass2=assembleDirectorPass2Prompt({sourceLibrary:this.sourceLibrary,settings,currentUser,recentChat,userIdentity,documentCatalog:batch.wiki_catalog,longTermMemory,requestRef:requestRef2,searchResults:batch.results,searchSourceCatalog:batch.source_catalog}),final=await this.runDirectorPass('Director pass 2',preset,pass2,scope,skills,{requestRef:requestRef2,pass:2,allowedRefs:pass2.allowedRefs,documentRefs:pass2.documentRefs,rhythmEnabled:Boolean(settings.features.rhythm?.enabled)});if(!await cbsCurrent())throw new Error('Director 실행 중 CBS 변수나 채팅이 변경되어 결과를 폐기했습니다.');return{...final,search_count:decision.searches.length,memory_counts:longTermMemory.counts,memory_characters:longTermMemory.characters};
  }
  async ensure() { if(this.worker)return await this.worker;if(this.state==='ready')return this.state;this.worker=(async()=>{try{if(typeof this.api.addRisuReplacer!=='function')return this.state='unsupported';await this.api.addRisuReplacer('beforeRequest',this.listener);return this.state='ready';}catch{return this.state='failed';}})();try{return await this.worker;}finally{this.worker=null;} }
  destroy() { this.disposed=true;this.epoch++;this.cache.clear();this.directorCache.clear();this.auto?.reviewHandoff?.clear();this.listeners.clear();this.state='disposed'; }
}
