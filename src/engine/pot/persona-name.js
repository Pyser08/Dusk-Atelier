// 출처: risupot 2.3.0 src/persona-name.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { loadUserActor, verifyUserIdentityContext } from './user-identity.js';

const PERSONA_NAME_LIMIT=160;
function personaNameScopeKey(scope){const value=scope?.scope||scope;return typeof value?.characterId==='string'&&value.characterId&&typeof value?.chatKey==='string'&&value.chatKey?JSON.stringify([value.characterId,value.chatKey]):'';}
function validatePersonaName(value){if(typeof value!=='string')throw new Error('페르소나 이름을 입력해주세요.');const name=value.normalize('NFC').trim();if(!name||name.length>PERSONA_NAME_LIMIT||/[\u0000-\u001f\u007f]|\{\{|\}\}/.test(name))throw new Error('치환 문구가 아닌 실제 이름을 1~160자로 입력해주세요.');return name;}
export function normalizePersonaNames(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>2000)throw new Error('채팅별 페르소나 이름 설정이 잘못되었습니다.');
  const result={};for(const[key,entry]of Object.entries(raw)){let parts;try{parts=JSON.parse(key);}catch{throw new Error('페르소나 이름의 채팅 구분이 잘못되었습니다.');}if(!Array.isArray(parts)||parts.length!==2||parts.some(p=>typeof p!=='string'||!p||p.length>500)||JSON.stringify(parts)!==key||!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(k=>!['name','binding'].includes(k))||typeof entry.binding!=='string'||entry.binding.length>200)throw new Error('페르소나 이름 설정의 범위나 형식이 잘못되었습니다.');result[key]={name:validatePersonaName(entry.name),binding:entry.binding};}return result;
}
function personaNamePreference(settings,scope,binding=''){const key=personaNameScopeKey(scope),entry=key?settings?.personaNamesByScope?.[key]:null;return entry&&entry.binding===String(binding||'')?entry:null;}
function personaNamePreferenceStamp(settings,scope){return JSON.stringify(settings?.personaNamesByScope?.[personaNameScopeKey(scope)]??null);}

export class PersonaNameController{
  constructor({api,settingsStore,wikiController,isBusy=()=>false}){Object.assign(this,{api,settingsStore,wikiController,isBusy});this.operation='';this.pendingWrite=null;this.listeners=new Set();this.disposed=false;}
  configuration(){const state=this.settingsStore.status(),key=[state.revision,state.phase,state.loaded].join(':');if(this.configKey!==key){this.configKey=key;this.configCache=this.settingsStore.snapshot();}return this.configCache;}
  context(){const wiki=this.wikiController.status(),context=this.wikiController.personaNameContext;return wiki.phase==='ready'&&wiki.enabled!==false&&context&&personaNameScopeKey(context)===personaNameScopeKey(wiki.scope)?context:null;}
  status(){const context=this.context(),wiki=this.wikiController.status(),config=this.configuration(),manual=context?personaNamePreference(config,context,context.binding):null,automatic=context?wiki.userIdentity:null,key=personaNameScopeKey(context),saving=this.settingsStore.status();return{ready:!!context&&!saving.blocked,scopeKey:key,binding:context?.binding||'',preferenceStamp:personaNamePreferenceStamp(config,context),mode:manual?'manual':'auto',manualName:manual?.name||'',automaticName:automatic?.known?automatic.title:'',name:manual?.name||(automatic?.known?automatic.title:''),known:!!manual||!!automatic?.known,pending:!!wiki.userIdentityPending,operation:this.operation,busy:!!this.operation,modelBusy:!!this.isBusy(),pendingSave:!!this.pendingWrite&&this.pendingWrite.scopeKey===key&&saving.dirty};}
  displayName(){const context=this.context(),wiki=this.wikiController.status(),manual=context?personaNamePreference(this.configuration(),context,context.binding):null;return manual?.name||(context&&wiki.userIdentity?.known?wiki.userIdentity.title:wiki.userIdentityPending?'이름 확인 중':'페르소나 미확인');}
  subscribe(listener){this.listeners.add(listener);listener(this.status());return()=>this.listeners.delete(listener);}
  emit(){if(this.disposed)return;for(const listener of this.listeners)try{listener(this.status());}catch{}}
  async verify(expected,{write=false}={}){const context=this.context(),state=this.status();if(this.disposed||!state.ready||!context||expected?.scopeKey!==state.scopeKey||expected.binding!==state.binding)throw new Error('채팅 또는 페르소나가 바뀌었습니다. 현재 채팅에서 설정을 다시 열어주세요.');if(write&&this.isBusy())throw new Error('진행 중인 작성이 끝난 뒤 이름을 변경해주세요.');const chat=await verifyUserIdentityContext(this.api,context);if(!chat||this.context()!==context)throw new Error('현재 채팅을 다시 확인해주세요. 다른 채팅의 이름은 변경하지 않았습니다.');return{context,chat};}
  async recheck(expected){
    if(this.operation)throw new Error('진행 중인 이름 처리가 끝난 뒤 다시 시도해주세요.');this.operation='query';this.emit();
    try{const{context,chat}=await this.verify(expected),wiki=this.wikiController,sequence=++wiki.userIdentitySequence;wiki.userIdentity=null;wiki.userIdentityPending=true;wiki.emit();
      const apply=actor=>{if(!this.disposed&&this.context()===context&&wiki.userIdentitySequence===sequence){wiki.userIdentity={title:actor.title,known:actor.known,source:actor.source};wiki.userIdentityPending=false;wiki.emit();this.emit();}return actor;};
      wiki.userIdentityPromise=loadUserActor(this.api,chat,{characterId:context.characterId,chatKey:context.chatKey,characterIndex:context.characterIndex,chatIndex:context.chatIndex,force:true,ignoreManual:true,onResolved:apply}).then(apply);return await wiki.userIdentityPromise;
    }finally{this.operation='';this.emit();}
  }
  async save(name,expected){return this.write(name===null?null:validatePersonaName(name),expected);}
  async write(name,expected){
    if(this.operation)throw new Error('진행 중인 이름 처리가 끝난 뒤 다시 시도해주세요.');this.operation='save';this.emit();
    try{const{context}=await this.verify(expected,{write:true}),key=personaNameScopeKey(context),desired=name===null?null:{name,binding:context.binding},desiredStamp=JSON.stringify(desired);
      if(personaNamePreferenceStamp(this.settingsStore.snapshot(),context)!==expected.preferenceStamp)throw new Error('이름 설정이 다른 곳에서 변경되었습니다. 설정을 다시 열어 확인해주세요.');
      this.pendingWrite={scopeKey:key,binding:context.binding,stamp:desiredStamp};
      if(expected.preferenceStamp!==desiredStamp)this.settingsStore.update(config=>{if(personaNamePreferenceStamp(config,context)!==expected.preferenceStamp)throw new Error('이름 설정이 변경되었습니다. 다시 확인해주세요.');const map={...(config.personaNamesByScope||{})};if(desired)map[key]=desired;else delete map[key];config.personaNamesByScope=normalizePersonaNames(map);});
      if(this.settingsStore.status().phase==='save-error')await this.settingsStore.retry();else await this.settingsStore.flush();
      if(this.settingsStore.status().phase==='save-error'||this.settingsStore.status().dirty)throw new Error('이름은 화면에 반영됐지만 저장하지 못했습니다. 저장 다시 시도를 눌러주세요.');this.pendingWrite=null;this.wikiController.emit();return this.status();
    }catch(error){if(this.pendingWrite&&this.pendingWrite.stamp!==JSON.stringify(this.settingsStore.snapshot().personaNamesByScope?.[this.pendingWrite.scopeKey]??null))this.pendingWrite=null;throw error;}finally{this.operation='';this.emit();}
  }
  async retry(expected){
    if(this.operation)throw new Error('진행 중인 이름 처리가 끝난 뒤 다시 시도해주세요.');this.operation='save';this.emit();
    try{const{context}=await this.verify(expected,{write:true});if(!this.pendingWrite||this.pendingWrite.scopeKey!==personaNameScopeKey(context)||this.pendingWrite.stamp!==personaNamePreferenceStamp(this.settingsStore.snapshot(),context))throw new Error('다시 저장할 이름 설정이 바뀌었습니다. 설정을 다시 확인해주세요.');await this.settingsStore.retry();if(this.settingsStore.status().phase==='save-error'||this.settingsStore.status().dirty)throw new Error('이름 설정을 아직 저장하지 못했습니다. 다시 시도해주세요.');this.pendingWrite=null;this.wikiController.emit();return this.status();}finally{this.operation='';this.emit();}
  }
  async automatic(expected){await this.save(null,expected);return this.recheck(this.status());}
  dispose(){this.disposed=true;this.listeners.clear();}
}
