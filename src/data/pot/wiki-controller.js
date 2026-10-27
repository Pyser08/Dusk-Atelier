// 출처: risupot 2.3.0 src/wiki-controller.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { ensureOverviewInSections } from '../../engine/pot/character-overview.js';
import { ChatScopeManager } from '../../engine/pot/chat-scope.js';
import { deletePersonCandidate, updatePersonCandidateText } from '../../engine/pot/people-candidate-edit.js';
import { applyPeopleLayout, peopleFolderScopeKey } from '../../engine/pot/people-folders.js';
import { peoplePatternKey, setPeopleItemPin } from '../../engine/pot/people-pins.js';
import { deletePersonProfile, emptyPeopleState, reviewPersonCandidate, updateAllPeopleSexualStyle, updatePeopleSexualEnabled, updatePeopleSexualField, updatePeopleSexualStyle, updatePersonPatternSlot, updatePersonPatternText, updatePersonProfile } from '../../engine/pot/people-profile.js';
import { deletePersonItem, updatePersonMetric, updatePersonRecord, updatePersonSection } from '../../engine/pot/people-records.js';
import { applyPersonMerge, planPersonMerge } from '../../engine/pot/person-merge.js';
import { RELATIONSHIP_HISTORY_MAX } from '../../engine/pot/relationship-history.js';
import { loadUserActor } from '../../engine/pot/user-identity.js';
import { normalizeWikiRetention, wikiRetentionStatus } from '../../engine/pot/wiki-retention.js';
import { createEmptyWikiScope, createWikiDocument, deleteWikiDocument, normalizeWikiScope, parseWikiMarkdown, restoreWikiHistory, searchValidatedWikiDocuments, updateWikiDocument } from '../../engine/pot/wiki-schema.js';
import { WikiRepository } from './wiki-store.js';

class WikiController {
  constructor(api, storage = api.pluginStorage, options = {}) {
    this.api=api;this.userIdentity=null;this.userIdentityPromise=null;this.userIdentityPending=false;this.userIdentitySequence=0;this.personaNameContext=null;
    this.scopeManager = options.scopeManager || new ChatScopeManager(api, options);
    this.repository = options.repository || new WikiRepository(storage);
    this.isEnabled = options.isEnabled || (() => true);
    this.phase = 'idle'; this.error = ''; this.warning = ''; this.scope = null; this.store = null;
    this.refreshSequence = 0; this.listeners = new Set(); this.storeUnsubscribe = null;
  }
  status() {
    const enabled = Boolean(this.isEnabled());
    return { userIdentityPending:this.userIdentityPending,userIdentity:this.userIdentity?{...this.userIdentity}:null,phase: this.phase, enabled, error: this.error, warning: this.warning, writeBlocked: !enabled || this.phase === 'loading' || !this.store || this.store.status().blocked, scope: this.scope ? { characterId: this.scope.characterId, chatKey: this.scope.chatKey, characterName: this.scope.characterName, chatName: this.scope.chatName, source: this.scope.source } : null, store: this.store?.status() || null };
  }
  snapshot() { return this.store?.snapshot() || null; }
  planPersonMerge(keepId,sourceId,options={}){const store=this.requireStore();if(this.mergingPeople||store.status().dirty||store.status().phase==='save-error')throw new Error('진행 중인 기억 저장이 끝난 뒤 통합 내용을 확인해주세요.');return planPersonMerge(store.snapshot(),keepId,sourceId,options);}
  async applyPersonMerge(plan,choices){
    const store=this.requireStore();if(this.mergingPeople||store.status().dirty||store.status().phase==='save-error')throw new Error('진행 중인 기억 저장이 끝난 뒤 통합해주세요.');const before=store.snapshot();let appliedToMemory=false,saveMayHaveStarted=false;
    this.mergingPeople=true;try{
      const result=applyPersonMerge(before,plan,choices),contextMatches=()=>this.isEnabled()&&this.phase!=='loading'&&this.store===store&&this.scope?.characterId+'\n'+this.scope?.chatKey===plan.scopeKey;
      // Only the repository's execution gate marks a write as possibly started. A
      // scope write can succeed before its catalog write fails, leaving the store's
      // persistedRevision unchanged; that state must never be rolled back in memory.
      const canPersist=()=>{const allowed=contextMatches();if(allowed)saveMayHaveStarted=true;return allowed;};
      if(!contextMatches())throw new Error('통합할 채팅이 바뀌었습니다. 다시 확인해주세요.');
      store.replace(current=>{if(current.revision!==before.revision)throw new Error('통합 직전에 기억이 바뀌었습니다. 다시 확인해주세요.');return result.scope;},{ignorePins:true,canPersist});appliedToMemory=true;await store.flush();
      if(!contextMatches()){const rolledBack=!saveMayHaveStarted&&store.status().revision===result.scope.revision&&store.rollbackUnsaved(before);const error=new Error(rolledBack?'채팅 또는 전원이 바뀌어 통합 저장을 취소했습니다.':'통합 중 채팅 또는 전원이 바뀌었습니다. 원래 채팅의 저장 상태를 확인해주세요.');error.appliedToMemory=!rolledBack;throw error;}
      if(store.status().phase==='save-error'){const error=new Error('통합은 현재 기억에 반영했지만 저장에 실패했습니다. 기억 저장의 다시 시도를 사용해주세요.');error.appliedToMemory=true;throw error;}
      return result;
    }catch(error){if(appliedToMemory&&error.appliedToMemory===undefined)error.appliedToMemory=true;throw error;}finally{this.mergingPeople=false;}
  }
  subscribe(listener) { this.listeners.add(listener); listener(this.status()); return () => this.listeners.delete(listener); }
  emit() { for (const listener of this.listeners) { try { listener(this.status()); } catch { /* UI only. */ } }
  }
  attachStore(store) {
    this.storeUnsubscribe?.(); this.store = store;
    this.storeUnsubscribe = store?.subscribe(() => this.emit()) || null;
  }
  async refresh() {
    if (!this.isEnabled()) { this.disable(); return this.status(); }
    const sequence = ++this.refreshSequence;this.userIdentitySequence++;this.personaNameContext=null;this.userIdentity=null;this.userIdentityPending=true; this.phase = 'loading'; this.error = ''; this.warning = ''; this.emit();
    const resolved = await this.scopeManager.resolve();
    if (sequence !== this.refreshSequence) return this.status();
    if (resolved.duplicate) {
      const sourceMeta = { characterId: resolved.characterId, chatKey: resolved.sourceChatKey, characterName: resolved.characterName, chatName: resolved.chatName };
      const targetMeta = { characterId: resolved.characterId, chatKey: resolved.candidateChatKey, characterName: resolved.characterName, chatName: resolved.chatName, forkedFrom: resolved.sourceChatKey };
      if (!this.isEnabled()) { this.disable(); return this.status(); }
      const forked = await this.repository.forkScope(sourceMeta, targetMeta, { canWrite: () => this.isEnabled() && sequence === this.refreshSequence });
      if (!forked || sequence !== this.refreshSequence || !await this.scopeManager.pin(resolved.characterIndex, resolved.chatIndex, resolved.chat, resolved.candidateChatKey)) {
        if (sequence === this.refreshSequence) { this.phase = 'warning'; this.warning = '복사·분기된 채팅의 Wiki를 독립 범위로 나누지 못했습니다. 공유 저장을 피하기 위해 쓰기를 잠급니다.'; this.scope = null; this.attachStore(null); this.emit(); }
        return this.status();
      }
      resolved.available = true; resolved.writeBlocked = false; resolved.chatKey = resolved.candidateChatKey; resolved.source = 'forked';
      this.scopeManager.completeFork?.(resolved.characterId, resolved.chatIndex, resolved.sourceChatKey);
    }
    if (!resolved.available) {
      this.phase = 'warning'; this.warning = resolved.warning || '현재 채팅 Wiki 범위를 사용할 수 없습니다.'; this.scope = null; this.attachStore(null); this.emit(); return this.status();
    }
    const metadata = { characterId: resolved.characterId, chatKey: resolved.chatKey, characterName: resolved.characterName, chatName: resolved.chatName };
    const store = await this.repository.openScope(metadata, { refresh: true });
    if (sequence !== this.refreshSequence) return this.status();
    this.scope = { ...metadata, source: resolved.source }; this.attachStore(store);
    if (store.status().blocked) { this.phase = 'error'; this.error = store.status().error; }
    else this.phase = 'ready';
    this.personaNameContext={characterId:resolved.characterId,chatKey:resolved.chatKey,characterIndex:resolved.characterIndex,chatIndex:resolved.chatIndex,binding:String(resolved.personaBinding??resolved.chat?.bindedPersona??'')};
    const identitySequence=this.userIdentitySequence;
    const applyIdentity=actor=>{if(sequence===this.refreshSequence&&identitySequence===this.userIdentitySequence&&(actor.known||!this.userIdentity?.known)){this.userIdentityPending=false;this.userIdentity={title:actor.title,known:actor.known,source:actor.source};this.emit();}return actor;};
    this.userIdentityPromise=loadUserActor(this.api,{risupotWikiScopeId:resolved.chatKey,bindedPersona:resolved.personaBinding??resolved.chat?.bindedPersona??''},{characterId:resolved.characterId,chatKey:resolved.chatKey,characterIndex:resolved.characterIndex,chatIndex:resolved.chatIndex,character:resolved.identityCharacter,force:true,ignoreManual:true,onResolved:applyIdentity}).then(applyIdentity);
    this.emit(); return this.status();
  }
  requireStore() { if (!this.isEnabled() || this.phase === 'loading' || !this.store || this.store.status().blocked) throw new Error('현재 채팅 Wiki 쓰기가 잠겨 있습니다.'); return this.store; }
  create(input, options) { if(input.type==='Character'){const {markdown,...rest}=input;input={...rest,sections:ensureOverviewInSections(input.sections||parseWikiMarkdown(markdown||''))};}return this.requireStore().replace(scope => createWikiDocument(scope, input, options)); }
  update(id, input, options) { if(input.type==='Character'){const {markdown,...rest}=input;input={...rest,sections:ensureOverviewInSections(input.sections||parseWikiMarkdown(markdown||'',this.snapshot()?.documents?.[id]?.sections||[]))};}return this.requireStore().replace(scope => updateWikiDocument(scope, id, input, options)); }
  delete(id, options) { if(this.snapshot()?.people?.pins?.[id]?.length)throw new Error('고정핀을 해제한 뒤 인물을 삭제해주세요.');return this.requireStore().replace(scope => deleteWikiDocument(scope, id, options)); }
  restore(historyId, options) { return this.requireStore().replace(scope => restoreWikiHistory(scope, historyId, options)); }
  retentionStatus(){return wikiRetentionStatus(this.snapshot());}
  async updatePeopleLayout(command,options){
    const store=this.requireStore(),matches=()=>this.store===store&&this.phase!=='loading'&&this.isEnabled()&&peopleFolderScopeKey(this.scope)===options?.expectedScope;
    if(!matches())throw new Error('인물 폴더를 정리할 채팅이 바뀌었습니다.');
    if(store.status().phase==='save-error')throw new Error('이전 저장에 실패했습니다. 저장 다시 시도를 먼저 눌러주세요.');
    store.replace(scope=>{if(!matches())throw new Error('채팅이 바뀌었습니다.');return applyPeopleLayout(scope,command,options);},{canPersist:matches});await store.flush();
    if(store.status().phase==='save-error')throw new Error('폴더 변경은 화면에 반영됐지만 저장에 실패했습니다. 저장 다시 시도를 눌러주세요.');return store.snapshot();
  }
  async setRecordRetention(kind,limit,expectedScope){
    if(!['history','activity'].includes(kind))throw new Error('보관할 기록 종류가 잘못되었습니다.');
    normalizeWikiRetention({[kind]:limit});const store=this.requireStore(),matches=()=>this.store===store&&this.phase!=='loading'&&this.isEnabled()&&this.scope?.characterId===expectedScope?.characterId&&this.scope?.chatKey===expectedScope?.chatKey;
    if(!matches())throw new Error('채팅이 바뀌었습니다. 현재 채팅에서 다시 설정해주세요.');
    const activity=store.snapshot().automation;if(activity.lastStatus?.phase==='pending'&&activity.records[activity.lastStatus.identity]?.status==='pending')throw new Error('Writer가 처리 중입니다. 완료된 뒤 보관 개수를 적용해주세요.');
    store.replace(scope=>{if(!matches())throw new Error('채팅이 바뀌었습니다.');const next=normalizeWikiScope(scope),retention=normalizeWikiRetention(next.recordRetention);if(retention[kind]===limit)return next;next.recordRetention={...retention,[kind]:limit};next.revision++;next.scope.updatedAt=new Date().toISOString();return next;},{canPersist:matches});
    if(store.status().phase==='save-error')await store.retry();else await store.flush();
    if(store.status().phase==='save-error')throw new Error('보관 설정과 정리는 메모리에 적용됐지만 저장에 실패했습니다. 다시 적용해주세요.');
    return wikiRetentionStatus(store.snapshot());
  }
  async setPersonPin(documentId,key,enabled){const store=this.requireStore();store.replace(scope=>setPeopleItemPin(scope,documentId,key,enabled),{allowPinChanges:true});await store.flush();if(store.status().phase==='save-error')throw new Error('고정핀 저장에 실패했습니다. Wiki 저장을 다시 시도해주세요.');return store.snapshot();}
  async savePersonRecord(documentId,input,options){const store=this.requireStore();store.replace(scope=>updatePersonRecord(scope,documentId,input,options));await store.flush();if(store.status().phase==='save-error')throw new Error('정보는 메모리에 반영됐지만 저장에 실패했습니다. Wiki 저장 다시 시도를 사용해주세요.');return store.snapshot();}
  async deletePersonItem(documentId,input){const store=this.requireStore();store.replace(scope=>deletePersonItem(scope,documentId,input));await store.flush();if(store.status().phase==='save-error')throw new Error('항목은 메모리에서 삭제했지만 저장에 실패했습니다. 저장 다시 시도를 사용해주세요.');return store.snapshot();}
  async deletePersonCandidate(documentId,input){const store=this.requireStore();store.replace(scope=>deletePersonCandidate(scope,documentId,input));await store.flush();if(store.status().phase==='save-error')throw new Error('변화 후보 삭제를 저장하지 못했습니다. 저장 다시 시도를 사용해주세요.');return store.snapshot();}
  async savePersonSection(documentId,input){const store=this.requireStore();store.replace(scope=>updatePersonSection(scope,documentId,input));if(store.status().phase==='save-error')await store.retry();else await store.flush();if(store.status().phase==='save-error'){const error=new Error('항목은 메모리에 반영됐지만 저장에 실패했습니다. 다시 저장해주세요.');error.appliedSection=JSON.stringify(store.snapshot().documents[documentId]?.sections.find(section=>section.id===input.id));throw error;}return store.snapshot();}
  async savePersonMetric(documentId,input,policy){const store=this.requireStore();store.replace(scope=>updatePersonMetric(scope,documentId,input,policy));if(store.status().phase==='save-error')await store.retry();else await store.flush();if(store.status().phase==='save-error'){const error=new Error('수치는 메모리에 반영됐지만 저장에 실패했습니다. 다시 저장해주세요.');error.appliedItem=JSON.stringify(store.snapshot().documents[documentId]?.metrics.find(metric=>metric.id===input.id));throw error;}return store.snapshot();}
  async setRelationshipHistoryLimit(limit,expectedScope){
    if(!Number.isInteger(limit)||limit<1||limit>RELATIONSHIP_HISTORY_MAX)throw new Error('관계 이력은 1~20개로 설정해주세요.');
    const store=this.requireStore();store.replace(scope=>{
      if(scope.scope.characterId+'\n'+scope.scope.chatKey!==expectedScope)throw new Error('채팅이 바뀌었습니다. 다시 설정해주세요.');
      const next=normalizeWikiScope(scope),now=new Date().toISOString();next.relationshipHistoryLimit=limit;
      for(const document of Object.values(next.documents)){let changed=false;for(const section of document.sections)if(section.relationshipHistory?.length>limit){section.relationshipHistory=section.relationshipHistory.slice(-limit);changed=true;}if(changed){document.version++;document.updatedAt=now;}}
      next.revision++;next.scope.updatedAt=now;return next;
    });await store.flush();if(store.status().phase==='save-error')throw new Error('관계 이력 설정은 메모리에 반영했지만 저장에 실패했습니다. 저장 다시 시도를 사용해주세요.');return store.snapshot();
  }
  updatePerson(documentId,input,options){return this.requireStore().replace(scope=>updatePersonProfile(scope,documentId,input,options));}
  async savePersonPatternSlot(documentId,input,options){const store=this.requireStore();store.replace(scope=>updatePersonPatternSlot(scope,documentId,input,options));if(store.status().phase==='save-error')await store.retry();else await store.flush();if(store.status().phase==='save-error'){const error=new Error('장기변화는 메모리에 반영됐지만 저장에 실패했습니다. 다시 저장해주세요.');if(!options?.remove){error.appliedPattern=String(input.text||'').normalize('NFC').trim();error.appliedPatternKey=peoplePatternKey(error.appliedPattern);}throw error;}return store.snapshot();}
  async savePersonPatternText(documentId,input){const store=this.requireStore();store.replace(scope=>updatePersonPatternText(scope,documentId,input));if(store.status().phase==='save-error')await store.retry();else await store.flush();if(store.status().phase==='save-error'){const error=new Error('장기 변화는 메모리에 반영됐지만 저장에 실패했습니다. 다시 저장해주세요.');error.appliedProfileField=JSON.stringify(store.snapshot().people.profiles[documentId].longTermPatterns);throw error;}return store.snapshot();}
  updateSexualField(documentId,field,text,options){return this.requireStore().replace(scope=>updatePeopleSexualField(scope,documentId,field,text,options));}
  updateSexualEnabled(documentId,field,enabled,options){return this.requireStore().replace(scope=>updatePeopleSexualEnabled(scope,documentId,field,enabled,options));}
  updateSexualStyle(documentId,enabled,options){return this.requireStore().replace(scope=>updatePeopleSexualStyle(scope,documentId,enabled,options));}
  async updateAllSexualStyle(enabled){const store=this.requireStore();let report={changed:0};store.replace(scope=>{const result=updateAllPeopleSexualStyle(scope,enabled);report={changed:result.changed};return result.scope;});await store.flush();if(store.status().phase==='save-error')throw new Error('전체 발정 버전은 메모리에 반영됐지만 저장에 실패했습니다.');return report;}
  async deletePerson(documentId){const store=this.requireStore();let report;store.replace(scope=>{const result=deletePersonProfile(scope,documentId);report={removedCandidates:result.removedCandidates};return result.scope;});await store.flush();if(store.status().phase==='save-error')throw new Error('인물 정보는 현재 메모리에서 삭제됐지만 기기 저장에 실패했습니다. Wiki 저장을 다시 시도해주세요.');return report;}
  async savePersonCandidateText(documentId,input){const store=this.requireStore();store.replace(scope=>updatePersonCandidateText(scope,documentId,input));await store.flush();if(store.status().phase==='save-error')throw new Error('변화 후보 저장에 실패했습니다. 저장 다시 시도를 사용해주세요.');return store.snapshot();}
  reviewPersonCandidate(candidateId,action){return this.requireStore().replace(scope=>reviewPersonCandidate(scope,candidateId,action));}
  clearFailedAutomationRecords() {
    let removed=0;const now=new Date().toISOString(),snapshot=this.requireStore().replace(scope=>{const next=normalizeWikiScope(scope),ids=Object.entries(next.automation.records).filter(([,record])=>record.status==='failed').map(([id])=>id);removed=ids.length;if(!removed)return next;for(const id of ids)delete next.automation.records[id];for(const[key,id]of Object.entries(next.automation.activeByMessage))if(ids.includes(id))delete next.automation.activeByMessage[key];if(next.automation.lastStatus&&ids.includes(next.automation.lastStatus.identity)){const latest=Object.entries(next.automation.records).sort((a,b)=>String(b[1].at).localeCompare(String(a[1].at)))[0];next.automation.lastStatus=latest?{phase:latest[1].status,identity:latest[0],at:latest[1].at}:null;}next.revision++;next.scope.updatedAt=now;return next;});return{removed,snapshot};
  }
  clearHistory() {
    let removed=0;const now=new Date().toISOString(),snapshot=this.requireStore().replace(scope=>{const next=normalizeWikiScope(scope);removed=next.history.length;if(!removed)return next;next.history=[];next.revision++;next.scope.updatedAt=now;return next;});return{removed,snapshot};
  }
  clearAutomationActivity() {
    let removed=0,guards=0;const now=new Date().toISOString(),snapshot=this.requireStore().replace(scope=>{const next=normalizeWikiScope(scope),records=Object.create(null);let changed=false;for(const[id,record]of Object.entries(next.automation.records)){if(record.hidden&&record.status==='completed'){records[id]=record;guards++;continue;}removed++;changed=true;if(record.status!=='completed')continue;records[id]={identity:record.identity,messageId:record.messageId,contentHash:record.contentHash,requestRef:record.requestRef,batchRef:record.batchRef,historyIds:[...record.historyIds],status:'completed',at:record.at,characterIndex:record.characterIndex,chatIndex:record.chatIndex,messageIndex:record.messageIndex,messageKey:record.messageKey,documentCount:record.documentCount,hidden:true};guards++;}if(!changed)return next;const active=Object.create(null);for(const[key,id]of Object.entries(next.automation.activeByMessage))if(records[id])active[key]=id;next.automation={...next.automation,records,activeByMessage:active,lastStatus:null};next.revision++;next.scope.updatedAt=now;return next;});return{removed,guards,snapshot};
  }
  async clearWikiData(){const store=this.requireStore(),now=new Date().toISOString();let report={documents:0,history:0,preservedPeopleShells:0};store.replace(scope=>{const next=normalizeWikiScope(scope),profiles=new Set(Object.keys(next.people?.profiles||{})),documents=Object.create(null);report.documents=Object.keys(next.documents).length;report.history=next.history.length;for(const[id,document]of Object.entries(next.documents))if(document.type==='Character'&&profiles.has(id)){documents[id]={...document,tags:[],links:[],sections:[],metrics:[],updatedAt:now,version:document.version+1};report.preservedPeopleShells++;}next.documents=documents;if(next.identityRedirects){for(const[key,target]of Object.entries(next.identityRedirects))if(!documents[target])delete next.identityRedirects[key];if(!Object.keys(next.identityRedirects).length)delete next.identityRedirects;}next.history=[];next.revision++;next.scope.updatedAt=now;return next;},{ignorePins:true});await store.flush();if(store.status().phase==='save-error')throw new Error('Wiki 자료는 메모리에서 비웠지만 기기 저장에 실패했습니다.');return report;}
  async clearPeopleData(){const store=this.requireStore();let report={profiles:0,candidates:0};store.replace(scope=>{const next=normalizeWikiScope(scope);report={profiles:Object.keys(next.people?.profiles||{}).length,candidates:Object.keys(next.people?.candidates||{}).length};next.people=emptyPeopleState();next.revision++;next.scope.updatedAt=new Date().toISOString();return next;},{ignorePins:true});await store.flush();if(store.status().phase==='save-error')throw new Error('People 자료는 메모리에서 비웠지만 기기 저장에 실패했습니다.');return report;}
  async clearCurrentMemory() {
    const store=this.requireStore(),current=store.snapshot(),now=new Date().toISOString(),metadata={characterId:current.scope.characterId,chatKey:current.scope.chatKey,characterName:current.scope.characterName,chatName:current.scope.chatName},next=createEmptyWikiScope(metadata,current.scope.createdAt);next.revision=current.revision+1;next.scope.createdAt=current.scope.createdAt;next.scope.updatedAt=now;if(current.scope.forkedFrom)next.scope.forkedFrom=current.scope.forkedFrom;store.replace(()=>next,{ignorePins:true});await store.flush();if(store.status().phase==='save-error')throw new Error('현재 방 메모리는 비웠지만 저장에 실패했습니다.');return{documents:Object.keys(current.documents).length,profiles:Object.keys(current.people?.profiles||{}).length,history:current.history.length,activity:Object.values(current.automation?.records||{}).filter(record=>!record.hidden).length,snapshot:store.snapshot()};
  }
  search(query, type) { return this.store ? searchValidatedWikiDocuments(this.store.snapshot(), query, type) : []; }
  async retrySave() { if (!this.isEnabled()) { this.disable(); return this.status(); } if (!this.store) return this.status(); await this.store.retry(); this.emit(); return this.status(); }
  async retryLoad() { if (!this.isEnabled()) { this.disable(); return this.status(); } this.repository.retryReads(); return await this.refresh(); }
  disable() { this.refreshSequence++; this.phase = 'disabled'; this.warning = '리수폿 전체 전원이 OFF입니다. 기존 Wiki는 보존됩니다.'; this.emit(); }
  destroy() { this.refreshSequence++; this.storeUnsubscribe?.(); this.storeUnsubscribe = null; this.listeners.clear(); }
}
