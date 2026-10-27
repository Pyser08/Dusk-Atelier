// 출처: risupot 2.3.0 src/wiki-store.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { wikiScopeStorageKey } from '../../engine/pot/chat-scope.js';
import { preservePeoplePins } from '../../engine/pot/people-pins.js';
import { compactWikiRecords } from '../../engine/pot/wiki-retention.js';
import { WikiValidationError, assertSafeWikiData, createEmptyWikiScope, normalizeWikiScope } from '../../engine/pot/wiki-schema.js';

export const WIKI_CATALOG_KEY = 'risupot.wiki.catalog.v1';
const WIKI_SCOPE_KEY_PREFIX='risupot.wiki.v1:';
const cloneStoredWiki = value => JSON.parse(JSON.stringify(value));
function emptyCatalog() { return { schemaVersion: 1, revision: 0, scopes: Object.create(null) }; }
function normalizeCatalog(raw) {
  if (raw === null || raw === undefined) return emptyCatalog();
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { throw new WikiValidationError('Wiki catalog JSON을 읽지 못했습니다.'); } }
  assertSafeWikiData(raw);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !['schemaVersion', 'revision', 'scopes'].includes(key)) || raw.schemaVersion !== 1 || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || !raw.scopes || typeof raw.scopes !== 'object' || Array.isArray(raw.scopes)) throw new WikiValidationError('Wiki catalog가 손상되었거나 지원하지 않는 버전입니다.');
  const result = emptyCatalog(); result.revision = raw.revision;
  for (const [key, entry] of Object.entries(raw.scopes)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key) || !entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(field => !['characterId', 'chatKey', 'characterName', 'chatName', 'updatedAt'].includes(field)) || typeof entry.characterId !== 'string' || typeof entry.chatKey !== 'string' || typeof entry.characterName !== 'string' || typeof entry.chatName !== 'string' || typeof entry.updatedAt !== 'string' || key !== wikiScopeStorageKey(entry.characterId, entry.chatKey)) throw new WikiValidationError('Wiki catalog 항목이 손상되었습니다.');
    result.scopes[key] = { characterId: entry.characterId, chatKey: entry.chatKey, characterName: entry.characterName, chatName: entry.chatName, updatedAt: entry.updatedAt };
  }
  return result;
}

class WikiScopeStore {
  constructor(repository, metadata, state, { persisted = false } = {}) {
    this.repository = repository; this.metadata = { ...metadata }; this.state = state;
    this.persistedRevision = state.revision; this.persisted = persisted; this.phase = 'ready'; this.error = '';
    this.scopeWrittenRevision = state.revision;
    this.blocked = false; this.worker = null; this.listeners = new Set();
    this.canPersist = () => true;
  }
  snapshot() { return cloneStoredWiki(this.state); }
  status() { return { phase: this.phase, error: this.error, blocked: this.blocked, dirty: this.persistedRevision !== this.state.revision, persisted: this.persisted, revision: this.state.revision, persistedRevision: this.persistedRevision, storageKey: wikiScopeStorageKey(this.metadata.characterId, this.metadata.chatKey) }; }
  subscribe(listener) { this.listeners.add(listener); listener(this.status()); return () => this.listeners.delete(listener); }
  emit() { for (const listener of this.listeners) { try { listener(this.status()); } catch { /* UI diagnostics only. */ } } }
  replace(mutator, { canPersist = () => true, allowPinChanges=false, ignorePins=false } = {}) {
    if (this.blocked || this.repository.maintenance) throw new WikiValidationError('현재 Wiki 저장은 잠겨 있습니다.');
    const proposed=mutator(this.snapshot());
    const normalized=normalizeWikiScope(ignorePins?proposed:preservePeoplePins(this.state,proposed,{allowPinChanges})),compacted=compactWikiRecords(normalized),next=compacted.scope;
    if(compacted.changed&&next.revision<=this.state.revision){next.revision=this.state.revision+1;next.scope={...next.scope,updatedAt:new Date().toISOString()};}
    if (JSON.stringify(next) === JSON.stringify(this.state)) return this.snapshot();
    this.state = next;
    this.canPersist = canPersist;
    if (this.phase !== 'save-error') this.startSave();
    this.emit(); return this.snapshot();
  }
  startSave() {
    if (this.worker || this.blocked || this.persistedRevision === this.state.revision) return;
    this.phase = 'saving'; this.error = '';
    this.worker = (async () => {
      while (this.persistedRevision !== this.state.revision) {
        const target = this.snapshot(), revision = target.revision;
        try { await this.repository.writeScope(this.metadata, target, { canWrite: this.canPersist, onScopeWritten: () => { this.scopeWrittenRevision = revision; } }); this.persistedRevision = revision; this.persisted = true; this.emit(); }
        catch { this.phase = 'save-error'; this.error = 'Wiki 저장에 실패했습니다. 편집본을 유지했으며 명시적으로 다시 시도할 수 있습니다.'; this.emit(); return; }
      }
      this.phase = 'saved'; this.emit();
    })();
    const finish = () => { this.worker = null; if (this.phase !== 'save-error' && this.persistedRevision !== this.state.revision) this.startSave(); };
    void this.worker.then(finish, finish);
  }
  async retry() { if (this.phase === 'save-error') this.phase = 'ready'; this.startSave(); this.emit(); await this.flush(); return this.status(); }
  rollbackUnsaved(snapshot) {
    const safe = normalizeWikiScope(snapshot);
    if (this.persistedRevision !== safe.revision || this.persistedRevision === this.state.revision || this.scopeWrittenRevision > safe.revision) return false;
    this.state = safe; this.canPersist = () => true; this.phase = 'ready'; this.error = ''; this.emit(); return true;
  }
  async flush() { while (this.worker) await this.worker; return this.status(); }
}

export class WikiRepository {
  constructor(storage) { this.storage = storage; this.catalog = null; this.catalogBlocked = false; this.catalogError = ''; this.writeTail = Promise.resolve(); this.scopeStores = new Map(); }
  async loadCatalog() {
    if (this.catalog) return this.catalog;
    try { this.catalog = normalizeCatalog(await this.storage.getItem(WIKI_CATALOG_KEY)); this.catalogBlocked = false; this.catalogError = ''; return this.catalog; }
    catch { this.catalogBlocked = true; this.catalogError = 'Wiki catalog를 읽지 못했습니다. 기존 값을 보존하고 쓰기를 잠급니다.'; throw new WikiValidationError(this.catalogError); }
  }
  async readScope(metadata) {
    await this.loadCatalog();
    const key = wikiScopeStorageKey(metadata.characterId, metadata.chatKey), raw = await this.storage.getItem(key);
    if (raw === null || raw === undefined) return { state: createEmptyWikiScope(metadata), persisted: false };
    const state = normalizeWikiScope(raw);
    if (state.scope.characterId !== metadata.characterId || state.scope.chatKey !== metadata.chatKey) throw new WikiValidationError('저장 키와 Wiki 범위 정보가 일치하지 않습니다.');
    return { state, persisted: true };
  }
  async openScope(metadata, { refresh = true } = {}) {
    if(this.maintenance)throw new WikiValidationError('메모리 정리 중입니다.');
    const key = wikiScopeStorageKey(metadata.characterId, metadata.chatKey), existing = this.scopeStores.get(key),startingRevision=existing?.state.revision;
    if (existing && (!refresh || existing.status().dirty)) return existing;
    try {
      const { state, persisted } = await this.readScope(metadata);
      const latest=this.scopeStores.get(key);
      if(latest&&(latest!==existing||latest.status().dirty||latest.state.revision!==startingRevision))return latest;
      if (existing) { existing.state = state; existing.persistedRevision = state.revision; existing.scopeWrittenRevision = state.revision; existing.persisted = persisted; existing.phase = 'ready'; existing.error = ''; existing.blocked = false; existing.replace(current=>current);existing.emit(); return existing; }
      const store = new WikiScopeStore(this, metadata, state, { persisted }); this.scopeStores.set(key, store);store.replace(current=>current); return store;
    } catch {
      const latest=this.scopeStores.get(key);
      if(latest&&(latest!==existing||latest.status().dirty||latest.state.revision!==startingRevision))return latest;
      const store = existing || new WikiScopeStore(this, metadata, createEmptyWikiScope(metadata)); store.blocked = true; store.phase = 'load-error'; store.error = this.catalogError || 'Wiki 범위를 읽지 못했습니다. 기존 저장값을 보존하고 쓰기를 잠급니다.'; store.emit(); this.scopeStores.set(key, store); return store;
    }
  }
  writeScope(metadata, snapshot, { canWrite = () => true, onScopeWritten = null } = {}) {
    if(this.maintenance)return Promise.reject(new WikiValidationError('메모리 정리 중에는 저장할 수 없습니다.'));
    if (this.catalogBlocked) return Promise.reject(new WikiValidationError(this.catalogError));
    const task = this.writeTail.then(async () => {
      if(this.maintenance)throw new WikiValidationError('메모리 정리 중에는 저장할 수 없습니다.');
      if (!canWrite()) throw new WikiValidationError('Wiki 저장이 실행 직전에 취소되었습니다.');
      const catalog = await this.loadCatalog(), key = wikiScopeStorageKey(metadata.characterId, metadata.chatKey);
      await this.storage.setItem(key, snapshot);
      onScopeWritten?.(snapshot.revision);
      const next = cloneStoredWiki(catalog); next.revision += 1; next.scopes[key] = { characterId: metadata.characterId, chatKey: metadata.chatKey, characterName: metadata.characterName || '', chatName: metadata.chatName || '', updatedAt: snapshot.scope.updatedAt };
      await this.storage.setItem(WIKI_CATALOG_KEY, next); this.catalog = next;
    });
    this.writeTail = task.catch(() => {}); return task;
  }
  async forkScope(sourceMeta, targetMeta, { canWrite = () => true } = {}) {
    try {
      const targetKey = wikiScopeStorageKey(targetMeta.characterId, targetMeta.chatKey);
      if (this.scopeStores.has(targetKey)) return this.scopeStores.get(targetKey);
      const source = await this.readScope(sourceMeta), fork = compactWikiRecords(cloneStoredWiki(source.state)).scope;
      fork.scope = { ...fork.scope, characterId: targetMeta.characterId, chatKey: targetMeta.chatKey, characterName: targetMeta.characterName, chatName: targetMeta.chatName, forkedFrom: wikiScopeStorageKey(sourceMeta.characterId, sourceMeta.chatKey), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (!canWrite()) return null;
      await this.writeScope(targetMeta, fork);
      const store = new WikiScopeStore(this, targetMeta, fork, { persisted: true }); this.scopeStores.set(wikiScopeStorageKey(targetMeta.characterId, targetMeta.chatKey), store); return store;
    } catch { return null; }
  }
  async listStoredScopeKeys(){if(this.catalogBlocked)throw new WikiValidationError(this.catalogError);await this.writeTail;const catalog=await this.loadCatalog(),found=new Set(Object.keys(catalog.scopes));if(typeof this.storage.keys==='function'){let keys;try{keys=await this.storage.keys();}catch{throw new WikiValidationError('Wiki 저장 키 목록을 읽지 못했습니다.');}if(!Array.isArray(keys))throw new WikiValidationError('Wiki 저장 키 목록 형식이 잘못되었습니다.');for(const key of keys)if(typeof key==='string'&&key.startsWith(WIKI_SCOPE_KEY_PREFIX))found.add(key);}return[...found];}
  async cleanupOrphanScopes(validKeys,protectedKeys=new Set(),{storedKeys=null,onProgress=null,batchSize=20}={}) {
    if(this.catalogBlocked)throw new WikiValidationError(this.catalogError);
    if(typeof this.storage.removeItem!=='function'||typeof this.storage.setItem!=='function')throw new WikiValidationError('Wiki 저장소가 안전한 고아 삭제를 지원하지 않습니다.');
    await this.writeTail;
    const catalog=await this.loadCatalog(),valid=validKeys instanceof Set?validKeys:new Set(validKeys),protectedSet=protectedKeys instanceof Set?protectedKeys:new Set(protectedKeys);
    const stored=Array.isArray(storedKeys)?[...new Set(storedKeys)]:await this.listStoredScopeKeys(),keys=stored.filter(key=>!valid.has(key)&&!protectedSet.has(key));
    if(!keys.length)return{removedKeys:[],failedKeys:[],approximateBytes:0};
    const locked=new Map();
    for(const key of keys){const store=this.scopeStores.get(key);if(store){locked.set(key,{store,blocked:store.blocked});store.blocked=true;}}
    const removed=[],failed=[],chunkSize=Math.max(1,Math.min(50,Number(batchSize)||20));
    try{
      await Promise.all([...locked.values()].map(({store})=>store.flush()));
      for(let index=0;index<keys.length;index+=chunkSize){
        const chunk=keys.slice(index,index+chunkSize),results=await Promise.allSettled(chunk.map(key=>this.storage.removeItem(key)));
        results.forEach((result,offset)=>{
          const key=chunk[offset];
          if(result.status==='fulfilled'){removed.push(key);this.scopeStores.delete(key);}
          else failed.push(key);
        });
        try{onProgress?.({phase:'remove',done:Math.min(index+chunk.length,keys.length),total:keys.length,removed:removed.length,failed:failed.length});}catch{}
      }
      if(removed.length){
        const next=cloneStoredWiki(catalog);next.revision++;for(const key of removed)delete next.scopes[key];
        try{await this.storage.setItem(WIKI_CATALOG_KEY,next);}
        catch{throw new WikiValidationError('고아 Wiki 키는 삭제했지만 catalog 갱신에 실패했습니다. 다시 누르면 남은 catalog 항목을 정리합니다.');}
        this.catalog=next;
      }
      return{removedKeys:removed,failedKeys:failed,approximateBytes:0};
    }finally{
      // Restore only keys still on disk; successfully deleted stores remain permanently blocked.
      const deleted=new Set(removed);
      for(const[key,{store,blocked}]of locked)if(!deleted.has(key))store.blocked=blocked;
    }
  }
  async clearAllMemory(onProgress){
    if(this.maintenance)throw new WikiValidationError('이미 메모리 정리 중입니다.');
    const stores=[...this.scopeStores.values()],blocked=new Map(stores.map(store=>[store,store.blocked]));
    this.maintenance=true;
    try{
      await Promise.all(stores.map(store=>store.flush()));
      for(const store of stores)store.blocked=true;
      const result=await this.cleanupOrphanScopes(new Set(),new Set(),{onProgress});
      if(!result.failedKeys.length){
        await this.storage.removeItem(WIKI_CATALOG_KEY);
        this.catalog=emptyCatalog();this.catalogBlocked=false;this.catalogError='';this.scopeStores.clear();
      }
      return result;
    }finally{
      // Deleted store objects stay blocked even if another controller retained a reference.
      for(const store of this.scopeStores.values())if(blocked.has(store))store.blocked=blocked.get(store);
      this.maintenance=false;
    }
  }
  retryReads() { this.catalog = null; this.catalogBlocked = false; this.catalogError = ''; }
}
