// 출처: risupot 2.3.0 src/writer-controller.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { repairWriterPrompt } from './auto-wiki.js';
import { readCurrentRpSource, readWriterSourceCharacter, writerSourceIsCurrent } from './chat-source.js';
import { callWriterModel } from './llm-client.js';
import { effectiveRelationshipSettings } from '../../engine/pot/relationship-mode.js';
import { writerSourceCheckEnabled } from '../../engine/pot/source-check.js';
import { collectWriterSeedSources } from '../../engine/pot/source-seed.js';
import { executeWriterBatches } from './writer-batch.js';
import { writerPartialMessage } from '../../engine/pot/writer-partial.js';
import { buildWriterPreview } from '../../engine/pot/writer-preview.js';
import { writerReceiptHash } from './writer-receipts.js';
import { buildManualWriterFilter, writerTargetKeywords } from '../../engine/pot/writer-targets.js';

const requestId = () => `req:${globalThis.crypto?.randomUUID?.().replaceAll('-', '_') || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
export class WriterController {
  constructor({ api, settingsStore, keyStore, wikiController, sourceLibrary, traceStore = null, llmCall = callWriterModel }) {
    this.api = api; this.settingsStore = settingsStore; this.keyStore = keyStore; this.wikiController = wikiController; this.sourceLibrary = sourceLibrary; this.traceStore=traceStore; this.llmCall = llmCall;
    this.rpText = ''; this.userText = ''; this.targetKeywords=''; this.source = null; this.proposal = null; this.phase = 'idle'; this.error = ''; this.runToken = 0; this.listeners = new Set();
  }
  status() {
    if (this.proposal?.appliedToMemory && this.wikiController.store?.status().phase === 'saved') { this.proposal = null; this.phase = 'applied'; this.error = ''; }
    const output = this.proposal ? JSON.parse(JSON.stringify(this.proposal.output)) : null;
    return { phase: this.phase, error: this.error, hasSource: Boolean(this.rpText.trim()), hasProposal: Boolean(this.proposal), rpText: this.rpText, userText: this.userText, targetKeywords:this.targetKeywords, proposal: output ? { output, validationWarning:this.proposal.validationWarning||'', preview:this.proposal.preview||null, targetNames:this.proposal.targetNames||[], appliedToMemory: Boolean(this.proposal.appliedToMemory), issues: output.issues, changes: output.documents,metricChanges:output.metric_ops,peopleChanges:output.people_ops||[] } : null };
  }
  subscribe(listener) { this.listeners.add(listener); listener(this.status()); return () => this.listeners.delete(listener); }
  emit() { for (const listener of this.listeners) { try { listener(this.status()); } catch { /* UI only. */ } } }
  editSource(rpText, userText = this.userText) { this.rpText = String(rpText); this.userText = String(userText); this.proposal = null; this.phase = 'idle'; this.error = ''; this.emit(); }
  async pullRecent() {
    this.error = '';
    if (!this.settingsSnapshot().enabled) { this.phase = 'error'; this.error = '리수폿 전체 전원이 OFF입니다.'; this.emit(); return this.status(); }
    try {
      const recent = await readCurrentRpSource(this.api, this.wikiController.status().scope, this.settingsSnapshot());
      this.source = recent; this.rpText = recent.assistant?.text || ''; this.userText = recent.user?.text || ''; this.proposal = null; this.phase = 'idle';
      if (!this.rpText) this.error = '최근 assistant RP가 없습니다. 아래 입력칸에 직접 붙여넣을 수 있습니다.';
    } catch { this.error = '최근 RP를 가져오지 못했습니다. 아래 입력칸에 직접 붙여넣을 수 있습니다.'; }
    this.emit(); return this.status();
  }
  settingsSnapshot() { return effectiveRelationshipSettings(this.settingsStore.snapshot()); }
  resolvedWriterPreset(settings) { const stage = settings.models.stages.writer; return stage.mode === 'dedicated' ? stage.preset : settings.models.shared; }
  async generate({ requestRef: requestedRef = null } = {}) {
    if (this.phase === 'running') return this.status();
    const settings = this.settingsSnapshot(), wiki = this.wikiController.snapshot(), scopeStatus = this.wikiController.status();
    if (!settings.enabled) { this.error = '리수폿 전체 전원이 OFF입니다.'; this.phase = 'error'; this.emit(); return this.status(); }
    if (this.settingsStore.status().dirty || this.settingsStore.status().phase === 'save-error' || !wiki || scopeStatus.writeBlocked || scopeStatus.store?.dirty || scopeStatus.store?.phase === 'save-error' || !this.rpText.trim()) { this.error = '설정과 현재 채팅 Wiki 저장을 완료하고 RP 입력을 확인해주세요.'; this.phase = 'error'; this.emit(); return this.status(); }
    let currentSource;
    try { currentSource = await readCurrentRpSource(this.api, scopeStatus.scope, settings); }
    catch { this.phase = 'error'; this.error = '현재 채팅을 다시 확인하지 못해 Writer 실행을 시작하지 않았습니다.'; this.emit(); return this.status(); }
    let targetKeywords;try{targetKeywords=writerTargetKeywords(this.targetKeywords);}catch(error){this.phase='error';this.error=error.message;this.emit();return this.status();}
    const token = ++this.runToken, requestRef = requestedRef || requestId(), inputRp = this.rpText, inputUser = this.userText;
    const generationSnapshot = { targetKeywords:this.targetKeywords, scope: { ...scopeStatus.scope }, wikiRevision: wiki.revision, settingsRevision: (this.settingsStore.status().contentRevision??this.settingsStore.status().revision), rpText: inputRp, userText: inputUser, source: JSON.parse(JSON.stringify(currentSource)) };
    this.phase = 'running'; this.error = ''; this.proposal = null; this.emit();
    try {
      const character=await readWriterSourceCharacter(this.api,currentSource),seedBundle=await collectWriterSeedSources(this.api,{character,rpText:inputRp,wikiScope:wiki,candidateNames:targetKeywords.map(name=>({name,aliases:[]})),userIdentity:currentSource.userIdentity,searchExistingLore:settings.writerSearchExistingLore===true,peopleProfileEnabled:settings.peopleProfileEnabled!==false,isCurrent:()=>writerSourceIsCurrent(this.api,currentSource)});if(!await writerSourceIsCurrent(this.api,currentSource))throw new Error('Writer 자료 준비 중 현재 채팅이 바뀌었습니다.');
      const sourceIdentity={assistantId:currentSource.assistant?.id||'',assistantHash:await writerReceiptHash(currentSource.assistant?.text||'')};
      const ownerFilter=buildManualWriterFilter(wiki,targetKeywords,seedBundle.sources);
      const preset=this.resolvedWriterPreset(settings),skills=['core',...Object.entries(settings.features).filter(([,feature])=>feature.enabled).map(([id])=>id)],result=await executeWriterBatches({input:{sourceLibrary:this.sourceLibrary,settings,wikiScope:wiki,userIdentity:currentSource.userIdentity,rpText:inputRp,userText:inputUser,recentContext:currentSource.recentContext||'',requestRef,seedSources:seedBundle.sources,ownerFilter,sourceIdentity},preset,api:this.api,keyStore:this.keyStore,llmCall:this.llmCall,traceStore:this.traceStore,traceScope:{...scopeStatus.scope,turnNumber:currentSource.turnNumber??null},traceSkills:skills,batchRef:`batch:${requestRef}`,contributionRef:`manual:${currentSource.assistant?.id||requestRef}`,repairPrompt:repairWriterPrompt,isCurrent:()=>token===this.runToken&&this.settingsSnapshot().enabled&&settingsStoreRevision(this.settingsStore)===generationSnapshot.settingsRevision&&this.wikiController.snapshot()?.revision===generationSnapshot.wikiRevision}),output={schema_version:1,request_ref:requestRef,documents:result.outputs.flatMap(item=>item.documents),metric_ops:result.outputs.flatMap(item=>item.metric_ops),people_ops:result.outputs.flatMap(item=>item.people_ops),issues:result.outputs.flatMap(item=>item.issues)};
      if (token !== this.runToken || !this.settingsSnapshot().enabled) { this.phase = 'idle'; this.error = '실행 중 전원이 꺼지거나 새 실행으로 바뀌어 응답을 폐기했습니다.'; this.emit(); return this.status(); }
      this.proposal = { output,preview:buildWriterPreview(wiki,result.scope,currentSource.userIdentity?.title||'사용자'),targetNames:ownerFilter?ownerFilter.documentIds.map(id=>wiki.documents[id].title):[],validationWarning:writerPartialMessage(result.validationSummary,result.assemblies[0]?.catalog),preparedScope:result.scope,batchCount:result.batchCount,snapshot: generationSnapshot, requestRef, runToken: token };
      this.phase = 'proposal';
    } catch (error) { this.traceStore?.markLatestFailed(scopeStatus.scope,'Writer manual',error);this.phase = 'error'; this.error = error?.message || 'Writer 변경안을 만들지 못했습니다.'; }
    this.emit(); return this.status();
  }
  async isStale(proposal) {
    const settings = this.settingsSnapshot(), wiki = this.wikiController.snapshot(), status = this.wikiController.status();
    if (!settings.enabled || !wiki || status.writeBlocked || status.store?.dirty || status.store?.phase === 'save-error' || settingsStoreRevision(this.settingsStore) !== proposal.snapshot.settingsRevision || wiki.revision !== proposal.snapshot.wikiRevision || status.scope?.characterId !== proposal.snapshot.scope.characterId || status.scope?.chatKey !== proposal.snapshot.scope.chatKey || this.rpText !== proposal.snapshot.rpText || this.userText !== proposal.snapshot.userText||this.targetKeywords!==(proposal.snapshot.targetKeywords||'')) return true;
    try {
      const current = await readCurrentRpSource(this.api, status.scope, settings), previous = proposal.snapshot.source;
      if (!previous) return false;
      const bodyCheck = writerSourceCheckEnabled(settings);
      return current.chatKey !== previous.chatKey || current.messageCount !== previous.messageCount || current.assistant?.id !== previous.assistant?.id || bodyCheck && current.assistant?.text !== previous.assistant?.text || current.user?.id !== previous.user?.id || bodyCheck && current.user?.text !== previous.user?.text || bodyCheck && current.recentContext !== previous.recentContext;
    } catch { return true; }
  }
  async apply() {
    if (!this.proposal || this.phase === 'applying') return this.status();
    const proposal = this.proposal; this.phase = 'applying'; this.error = ''; this.emit();
    if (proposal.appliedToMemory) { this.phase = 'save-error'; this.error = '같은 변경안을 다시 적용하지 않습니다. Wiki 저장의 다시 시도를 사용해주세요.'; this.emit(); return this.status(); }
    if (await this.isStale(proposal)) { this.phase = 'error'; this.error = '채팅·RP·Wiki 또는 기능 설정이 바뀌어 오래된 변경안을 반영하지 않았습니다.'; this.emit(); return this.status(); }
    try {
      if (!this.settingsSnapshot().enabled) throw new Error();
      const beforeScope = this.wikiController.snapshot();
      const scopeStore = this.wikiController.requireStore();
      scopeStore.replace(() => proposal.preparedScope, { canPersist: () => this.settingsSnapshot().enabled && this.runToken === proposal.runToken });
      proposal.appliedToMemory = true;
      await scopeStore.flush();
      if (!this.settingsSnapshot().enabled || this.runToken !== proposal.runToken) { scopeStore.rollbackUnsaved(beforeScope); this.proposal = null; this.phase = 'error'; this.error = '반영 중 리수폿 전원이 꺼져 변경안과 저장을 취소했습니다.'; }
      else if (scopeStore.status().phase === 'save-error') { this.phase = 'save-error'; this.error = '변경안 전체는 현재 메모리 Wiki에 반영했지만 기기 저장에 실패했습니다. 같은 변경안을 다시 적용하지 말고 Wiki의 다시 시도를 사용해주세요.'; }
      else { this.proposal = null; this.phase = 'applied'; }
    } catch { this.phase = 'error'; this.error = '변경안 전체를 검증하거나 저장하지 못했습니다. Wiki에는 일부 변경도 반영하지 않았습니다.'; }
    this.emit(); return this.status();
  }
  invalidate() { this.runToken++; this.proposal = null; if (this.phase === 'running') this.error = '실행을 취소했습니다.'; this.phase = 'idle'; this.emit(); }
  destroy() { this.runToken++; this.listeners.clear(); this.proposal = null; }
}
function settingsStoreRevision(store) { const status=store.status();return status.contentRevision??status.revision; }
