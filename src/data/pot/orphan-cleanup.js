// 출처: risupot 2.3.0 src/orphan-cleanup.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { wikiScopeStorageKey } from '../../engine/pot/chat-scope.js';
import { RUN_TRACE_KEY } from './runtime-trace.js';
import { resetUserIdentityCache } from '../../engine/pot/user-identity.js';
import { WIKI_CATALOG_KEY } from './wiki-store.js';

const orphanRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const orphanId=value=>String(value??'').normalize('NFC').trim();
async function cleanupReadOperation(read,label,timeoutMs=20000){
  let timer;
  try{return await Promise.race([Promise.resolve().then(read),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} 응답이 ${Math.round(timeoutMs/1000)}초 동안 없어 중단했습니다. 다시 시도해주세요.`)),timeoutMs);})]);}
  finally{clearTimeout(timer);}
}
async function loadAuthoritativeCharacterDatabase(api,{timeoutMs=20000}={}){
  if(typeof api?.getDatabase!=='function')throw new Error('전체 캐릭터 DB 조회 기능을 사용할 수 없습니다.');
  const errors=[];
  for(const key of ['characters','characterList']){
    let database;
    try{database=await cleanupReadOperation(()=>api.getDatabase([key]),'전체 채팅 DB 조회',timeoutMs);}
    catch(error){errors.push(`${key}: ${String(error?.message||error)}`);if(String(error?.message).includes('동안 없어'))break;continue;}
    // A null result must not prevent Coconut's second, host-authorized compatibility read.
    if(database===null){errors.push(`${key}: null`);continue;}
    if(Array.isArray(database?.[key])&&database[key].length)return{characters:database[key],source:key};
    errors.push(`${key}: 전체 채팅 목록 없음`);
  }
  const detail=errors.join(' / ');
  if(errors.every(error=>error.endsWith(': null')))throw new Error(`호스트가 전체 채팅 DB를 반환하지 않았습니다 (${detail}). 아래 DB 연결 다시 확인을 누른 뒤, 호스트의 DB 접근 확인창에 응답해주세요. 이미 허용했다면 호스트의 권한 상태가 반영되지 않았을 수 있습니다.`);
  throw new Error(`전체 채팅 목록을 읽지 못했습니다. ${detail}`.slice(0,600));
}

const cleanupScopeToken=scope=>scope?.characterId&&scope?.chatKey?`${scope.characterId}\n${scope.chatKey}`:'';
const memoryValueBytes=value=>value==null?0:new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).byteLength;
const formatMemoryMegabytes=bytes=>Number.isFinite(bytes)?`${(bytes/1024/1024).toFixed(2)} MB`:'확인 불가';
async function withVisibleDatabasePrompt(api,read,shouldRestore=()=>true){
  let hidden=false;
  try{
    if(typeof api.hideContainer==='function'&&typeof api.showContainer==='function'){await api.hideContainer();hidden=true;}
    return await read();
  }finally{if(hidden&&shouldRestore())await api.showContainer('fullscreen');}
}
function authoritativeScopeSets(database,currentScope=null){const characters=Array.isArray(database?.characters)?database.characters:Array.isArray(database?.characterList)?database.characterList:null;if(!characters?.length)throw new Error('전체 characters 배열을 확인하지 못해 삭제를 중단했습니다.');const wikiKeys=new Set(),scopeIds=new Set();for(const character of characters){if(!orphanRecord(character)||!Array.isArray(character.chats))throw new Error('characters 데이터가 불완전해 삭제를 중단했습니다.');const characterId=orphanId(character.chaId||character.id||character.name);if(!characterId)throw new Error('캐릭터 식별자가 없어 삭제를 중단했습니다.');for(const chat of character.chats){if(!orphanRecord(chat))throw new Error('채팅 데이터가 불완전해 삭제를 중단했습니다.');const chatKey=orphanId(chat.risupotWikiScopeId||chat.id);if(!chatKey)continue;wikiKeys.add(wikiScopeStorageKey(characterId,chatKey));scopeIds.add(`${characterId}\n${chatKey}`);}}
  const protectedWiki=new Set(),protectedScopes=new Set();if(currentScope?.characterId&&currentScope?.chatKey){protectedWiki.add(wikiScopeStorageKey(currentScope.characterId,currentScope.chatKey));protectedScopes.add(`${currentScope.characterId}\n${currentScope.chatKey}`);wikiKeys.add([...protectedWiki][0]);scopeIds.add([...protectedScopes][0]);}return{wikiKeys,scopeIds,protectedWiki,protectedScopes};}

export class OrphanCleanupController{
  constructor({api,wikiController,traceStore,scheduler=globalThis,now=()=>Date.now(),isBusy=()=>false,beforeDelete=()=>{},withDatabasePrompt=async read=>read()}){this.api=api;this.withDatabasePrompt=withDatabasePrompt;this.databasePromise=null;this.databaseFailure=null;this.reconnecting=false;this.isBusy=isBusy;this.beforeDelete=beforeDelete;this.usage={phase:'idle',orphanBytes:null,currentBytes:null,totalBytes:null,error:'',scopeToken:''};this.usagePromise=null;this.usageStamp='';this.usageAt=0;this.usageEpoch=0;this.byteCache=new Map();this.scopeCache=null;this.scopeCacheAt=0;this.wikiController=wikiController;this.traceStore=traceStore;this.scheduler=scheduler;this.now=now;this.phase='idle';this.operation='';this.message='';this.error='';this.removedScopes=0;this.removedTraces=0;this.approximateBytes=0;this.candidateScopes=0;this.elapsedMs=0;this.startedAt=0;this.timer=null;this.listeners=new Set();this.disposed=false;}
  status(){return{usage:{...this.usage},reconnecting:this.reconnecting,phase:this.phase,operation:this.operation,message:this.message,error:this.error,removedScopes:this.removedScopes,removedTraces:this.removedTraces,approximateBytes:this.approximateBytes,candidateScopes:this.candidateScopes,elapsedMs:this.elapsedMs,running:this.phase==='running'};}
  subscribe(listener){this.listeners.add(listener);listener(this.status());return()=>this.listeners.delete(listener);}
  emit(){for(const listener of this.listeners)try{listener(this.status())}catch{}}
  start(operation,message){this.usageEpoch++;this.stopTimer();this.phase='running';this.operation=operation;this.message=message;this.error='';this.removedScopes=0;this.removedTraces=0;this.approximateBytes=0;this.candidateScopes=0;this.elapsedMs=0;this.startedAt=this.now();if(typeof this.scheduler?.setInterval==='function'){this.timer=this.scheduler.setInterval(()=>{if(this.phase!=='running')return;this.elapsedMs=Math.max(0,this.now()-this.startedAt);this.emit();},1000);this.timer?.unref?.();}this.emit();}
  stopTimer(){if(this.timer!==null&&typeof this.scheduler?.clearInterval==='function')this.scheduler.clearInterval(this.timer);this.timer=null;if(this.startedAt)this.elapsedMs=Math.max(0,this.now()-this.startedAt);}
  async run(){if(this.phase==='running'||this.reconnecting||this.disposed)return this.status();this.start('orphan','저장된 Wiki·Inspector 범위를 확인하는 중…');try{this.assertIdle();this.beforeDelete();if(typeof this.wikiController?.repository?.listStoredScopeKeys!=='function'||typeof this.wikiController?.repository?.cleanupOrphanScopes!=='function'||typeof this.traceStore?.storedScopeIds!=='function'||typeof this.traceStore?.clearOrphanScopes!=='function')throw new Error('Wiki 또는 Inspector 저장소가 안전한 고아 삭제를 지원하지 않습니다.');const current=this.wikiController.status().scope,currentWiki=current?.characterId&&current?.chatKey?wikiScopeStorageKey(current.characterId,current.chatKey):'',currentTrace=current?.characterId&&current?.chatKey?`${current.characterId}\n${current.chatKey}`:'',storedWiki=await this.wikiController.repository.listStoredScopeKeys(),storedTrace=this.traceStore.storedScopeIds(),wikiCandidates=storedWiki.filter(key=>key!==currentWiki),traceCandidates=storedTrace.filter(key=>key!==currentTrace);this.candidateScopes=wikiCandidates.length+traceCandidates.length;if(this.candidateScopes===0){this.phase='completed';this.message='삭제할 고아 메모리가 없습니다.';return this.status();}this.message=`저장 범위 ${this.candidateScopes}건을 실제 채팅 목록과 대조하는 중…`;this.emit();const database=await this.readDatabase({force:true}),sets=authoritativeScopeSets(database,current),orphanWikiCount=storedWiki.filter(key=>!sets.wikiKeys.has(key)&&!sets.protectedWiki.has(key)).length;this.message=orphanWikiCount?`고아 Wiki 삭제 준비 · 0/${orphanWikiCount}`:'고아 Wiki 없음 · Inspector 기록 확인 중…';this.emit();const wiki=await this.wikiController.repository.cleanupOrphanScopes(sets.wikiKeys,sets.protectedWiki,{storedKeys:storedWiki,onProgress:progress=>{this.message=`고아 Wiki 삭제 ${progress.done}/${progress.total}`;this.emit();}});this.message='고아 Inspector 기록을 정리하는 중…';this.emit();const traces=await this.traceStore.clearOrphanScopes(sets.scopeIds,sets.protectedScopes);this.removedScopes=wiki.removedKeys.length;this.removedTraces=traces.removed;this.approximateBytes=traces.approximateBytes;const failed=wiki.failedKeys?.length||0,size=this.approximateBytes>=1024*1024?(this.approximateBytes/(1024*1024)).toFixed(2)+' MB':this.approximateBytes>=1024?(this.approximateBytes/1024).toFixed(1)+' KB':this.approximateBytes+' bytes';this.phase='completed';this.message=`고아 Wiki ${this.removedScopes}개 · Inspector 기록 ${this.removedTraces}건 삭제${failed?` · Wiki 삭제 실패 ${failed}개`:''} · Inspector 약 ${size}`;}catch(error){this.phase='failed';this.error=String(error?.message||'고아 메모리 삭제에 실패했습니다.').slice(0,600);}finally{this.stopTimer();this.invalidateUsage();this.emit();if(this.listeners.size)void this.refreshUsage();}return this.status();}
  async clearCurrent(){if(this.phase==='running'||this.reconnecting||this.disposed)return this.status();this.start('current','현재 방의 Wiki·인물·수치·기록을 삭제하는 중…');try{this.assertIdle();this.beforeDelete();if(typeof this.wikiController?.clearCurrentMemory!=='function'||typeof this.traceStore?.clearScope!=='function')throw new Error('현재 방 저장소를 안전하게 초기화할 수 없습니다.');const scope=this.wikiController.status().scope;if(!scope)throw new Error('현재 채팅 Wiki 범위를 확인할 수 없습니다.');const result=await this.wikiController.clearCurrentMemory(),traceStatus=await this.traceStore.clearScope(scope);if(traceStatus?.phase==='save-error'||traceStatus?.blocked)throw new Error('현재 방 Wiki는 비웠지만 Inspector 실행 기록 저장에 실패했습니다.');this.phase='completed';this.message=`현재 방 메모리 삭제 완료 · 문서 ${result.documents}개 · 인물 ${result.profiles}명 · 이력 ${result.history}건 · 활동 ${result.activity}건`;}catch(error){this.phase='failed';this.error=String(error?.message||'현재 방 메모리 삭제에 실패했습니다.').slice(0,600);}this.stopTimer();this.invalidateUsage();this.emit();if(this.listeners.size)void this.refreshUsage();return this.status();}


  async readDatabase({force=false}={}){
    if(this.databasePromise)return this.databasePromise;
    if(!force&&this.databaseFailure)throw this.databaseFailure;
    if(!force&&this.scopeCache&&this.now()-this.scopeCacheAt<60000)return this.scopeCache;
    this.databasePromise=loadAuthoritativeCharacterDatabase(this.api).then(database=>{
      this.scopeCache=database;this.scopeCacheAt=this.now();this.databaseFailure=null;resetUserIdentityCache(this.api);return database;
    },error=>{this.databaseFailure=error;throw error;});
    try{return await this.databasePromise;}finally{this.databasePromise=null;}
  }
  async reconnectDatabase(){
    if(this.disposed||this.phase==='running'||this.reconnecting)return this.status();
    this.reconnecting=true;this.usageEpoch++;this.error='';this.message='DB 연결을 다시 확인하는 중…';this.emit();
    try{
      // Let an existing scan settle before changing visibility or opening another host dialog.
      try{await this.usagePromise;await this.databasePromise;}catch{}
      await this.withDatabasePrompt(()=>this.readDatabase({force:true}));
      this.phase='idle';this.message='전체 채팅 DB 연결 확인 완료';
    }catch(error){this.databaseFailure=error;this.phase='failed';this.error=String(error?.message||error);this.message='';}
    finally{
      this.reconnecting=false;this.usageStamp='';this.emit();
      if(!this.disposed)await this.refreshUsage();
    }
    return this.status();
  }

  usageSignature(){const state=this.wikiController?.status();return cleanupScopeToken(state?.scope)+'|'+(state?.store?.revision??'')+'|'+(state?.store?.persistedRevision??'')+'|'+(this.traceStore?.status?.().revision??'');}
  assertIdle(){if(this.isBusy())throw new Error('진행 중인 생성·저장이 끝난 뒤 메모리를 삭제해주세요.');}
  invalidateUsage(){this.usageEpoch++;this.usageStamp='';this.byteCache.clear();this.scopeCache=null;}
  async refreshUsage({force=false}={}){
    if(this.disposed||this.phase==='running'||this.reconnecting)return this.usage;
    if(this.usagePromise)return this.usagePromise;
    const repository=this.wikiController?.repository,storage=repository?.storage,current=this.wikiController?.status().scope,scopeToken=cleanupScopeToken(current);
    if(!storage||typeof repository.listStoredScopeKeys!=='function')return this.usage;
    const stamp=this.usageSignature();
    if(!force&&stamp===this.usageStamp&&this.now()-this.usageAt<60000)return this.usage;
    const currentKey=scopeToken?wikiScopeStorageKey(current.characterId,current.chatKey):'';
    if(force||this.now()-this.usageAt>=60000)this.byteCache.clear();
    this.byteCache.delete(currentKey);
    this.usageStamp=stamp;this.usageAt=this.now();
    const epoch=this.usageEpoch;
    this.usage={phase:'loading',orphanBytes:null,currentBytes:null,totalBytes:null,error:'',scopeToken};this.emit();
    const task=async()=>{
      const result={phase:'ready',orphanBytes:null,currentBytes:scopeToken?0:null,totalBytes:0,error:'',scopeToken};
      try{
        const wikiKeys=await cleanupReadOperation(()=>repository.listStoredScopeKeys(),'저장 목록 조회');
        const liveKeys=new Set(wikiKeys);
        for(const key of this.byteCache.keys())if(!liveKeys.has(key))this.byteCache.delete(key);
        // Read only memory keys. Settings, credentials, and unrelated plugins never enter this scan.
        for(let index=0;index<wikiKeys.length;index+=8){
          if(epoch!==this.usageEpoch||this.disposed)return this.usage;
          await Promise.all(wikiKeys.slice(index,index+8).map(async key=>{
            if(!this.byteCache.has(key))this.byteCache.set(key,memoryValueBytes(await cleanupReadOperation(()=>storage.getItem(key),'메모리 용량 조회')));
          }));
        }
        if(epoch!==this.usageEpoch||this.disposed)return this.usage;
        const [catalog,rawTrace]=await cleanupReadOperation(()=>Promise.all([storage.getItem(WIKI_CATALOG_KEY),storage.getItem(RUN_TRACE_KEY)]),'기록 용량 조회');
        result.totalBytes=wikiKeys.reduce((sum,key)=>sum+this.byteCache.get(key),0)+memoryValueBytes(catalog)+memoryValueBytes(rawTrace);
        if(scopeToken)result.currentBytes=this.byteCache.get(currentKey)||0;
        const trace=typeof rawTrace==='string'?JSON.parse(rawTrace):rawTrace;
        if(trace!=null&&(!Array.isArray(trace.records)||trace.records.some(record=>!orphanRecord(record)||typeof record.scopeKey!=='string')))throw new Error('Inspector 기록 형식이 잘못되어 방별 용량을 계산하지 못했습니다.');
        const records=trace?.records||[];
        if(scopeToken)result.currentBytes+=records.filter(record=>record.scopeKey===scopeToken).reduce((sum,record)=>sum+memoryValueBytes(record),0);
        const otherKeys=wikiKeys.filter(key=>key!==currentKey),otherRecords=records.filter(record=>record.scopeKey!=='unscoped'&&record.scopeKey!==scopeToken);
        if(!otherKeys.length&&!otherRecords.length)result.orphanBytes=0;
        else{
          try{
            const database=await this.readDatabase({force});
            const sets=authoritativeScopeSets(database,current);
            result.orphanBytes=otherKeys.filter(key=>!sets.wikiKeys.has(key)).reduce((sum,key)=>sum+this.byteCache.get(key),0)+otherRecords.filter(record=>!sets.scopeIds.has(record.scopeKey)).reduce((sum,record)=>sum+memoryValueBytes(record),0);
          }catch(error){result.error=String(error?.message||error);}
        }
      }catch(error){result.phase='failed';result.totalBytes=null;result.currentBytes=null;result.orphanBytes=null;result.error=String(error?.message||error);}
      if(epoch===this.usageEpoch&&!this.disposed&&scopeToken===cleanupScopeToken(this.wikiController.status().scope)){this.usage=result;this.emit();}
      return this.usage;
    };
    this.usagePromise=task();
    try{return await this.usagePromise;}finally{this.usagePromise=null;if((epoch!==this.usageEpoch||stamp!==this.usageSignature())&&!this.disposed&&this.phase!=='running')void this.refreshUsage();}
  }
  async clearAll(){
    if(this.phase==='running'||this.reconnecting||this.disposed)return this.status();
    this.start('all','모든 방의 리수폿 메모리를 삭제하는 중…');
    try{
      this.assertIdle();this.beforeDelete();
      const repository=this.wikiController?.repository;
      if(typeof repository?.clearAllMemory!=='function'||typeof this.traceStore?.clear!=='function')throw new Error('전체 메모리 삭제를 지원하지 않는 저장소입니다.');
      const wiki=await repository.clearAllMemory(progress=>{this.message='전체 Wiki 삭제 '+progress.done+'/'+progress.total;this.emit();});
      this.removedScopes=wiki.removedKeys.length;
      if(wiki.failedKeys.length)throw new Error('Wiki '+wiki.failedKeys.length+'개 삭제 실패 · 이미 삭제한 항목 '+this.removedScopes+'개. 다시 시도해주세요.');
      this.removedTraces=this.traceStore.status().count;
      const traces=await this.traceStore.clear();
      if(traces.phase==='save-error')throw new Error('Wiki 삭제 완료 · Inspector 기록 삭제 실패. 다시 시도해주세요.');
      this.phase='completed';this.message='리수폿 전체 메모리 삭제 완료 · 설정·프롬프트·API 키 보존';
    }catch(error){this.phase='failed';this.error=String(error?.message||error).slice(0,600);}
    finally{
      // Reattach a fresh store so an old in-memory Wiki cannot resurrect deleted data.
      try{await this.wikiController.refresh?.();}catch{}
      this.stopTimer();this.invalidateUsage();this.emit();if(this.listeners.size)void this.refreshUsage();
    }
    return this.status();
  }

  dispose(){this.disposed=true;this.usageEpoch++;this.stopTimer();this.listeners.clear();}
}
