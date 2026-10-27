// 출처: risupot 2.3.0 src/people-lore-selector.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { cbsReferenceContextIsCurrent, collectCbsReferenceContext, hasCbsReferenceContent, projectCbsLoreEntries, projectCbsText } from './cbs-source.js';
import { peopleSourceKeys } from './people-source-match.js';

const PEOPLE_LORE_SELECTOR_LIMITS=Object.freeze({entryChars:100000,totalChars:2000000});
const LORE_SELECTOR_TEXT_FIELDS=['content','text','prompt','data','description','entry'];
const LORE_SELECTOR_ERRORS=new WeakSet();
const loreSelectorRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const loreSelectorScalar=value=>typeof value==='string'||typeof value==='number'?String(value).trim():'';
const loreSelectorBot=character=>loreSelectorScalar(character?.chaId)||loreSelectorScalar(character?.id)||loreSelectorScalar(character?.name);
const loreSelectorChat=chat=>loreSelectorScalar(chat?.risupotWikiScopeId)||loreSelectorScalar(chat?.id);
const loreSelectorFolder=value=>loreSelectorScalar(value).replace(/^\uF000(?:folder:)?/u,'').replace(/^folder:/u,'');
const loreSelectorIndex=value=>Number.isInteger(value)&&value>=0;
function loreSelectorHash(text){let left=2166136261,right=5381;for(let index=0;index<text.length;index++){const code=text.charCodeAt(index);left=Math.imul(left^code,16777619);right=Math.imul(right,33)^code;}return(left>>>0).toString(36)+'-'+(right>>>0).toString(36)+'-'+text.length.toString(36);}
function loreSelectorError(code,message){const error=Object.assign(new Error(message),{code});LORE_SELECTOR_ERRORS.add(error);return error;}
function loreSelectorText(entry){for(const field of LORE_SELECTOR_TEXT_FIELDS)if(typeof entry?.[field]==='string'&&entry[field].trim())return entry[field];return'';}
function loreSelectorLabel(entry,index,context){const raw=[entry?.comment,entry?.name,entry?.title,entry?.displayName].find(value=>typeof value==='string'&&value.trim())||'';return projectCbsText(raw,context||{}).text.trim().slice(0,200)||'로어북 '+(index+1);}
function loreSelectorIsFolder(entry){return entry?.mode==='folder'||entry?.type==='folder'||entry?.isFolder===true||typeof entry?.key==='string'&&/^\uF000folder:/u.test(entry.key);}
function loreSelectorOff(entry){return entry?.enabled===false||entry?.disabled===true||entry?.disable===true||entry?.isDisabled===true||entry?.mode==='disabled';}
function loreSelectorBodyPresent(text){return Boolean(text.replace(/^\s*@@[^\r\n]*(?:\r?\n|$)/gm,'').trim());}
function loreSelectorPublic(item){return{id:item.id,ref:item.ref,index:item.index,label:item.label,keys:[...item.keys],content:item.content,available:item.available,reason:item.reason,alwaysActive:item.alwaysActive,...(item.folder?{folder:item.folder}:{}),...(item.folderId?{folderId:item.folderId}:{}),characters:item.content.length};}

export class PeopleLoreSelector{
  constructor({api,wikiController,onChange=null}={}){this.api=api;this.wikiController=wikiController;this.onChange=onChange;this.phase='idle';this.error='';this.items=[];this.selected=new Set();this.snapshot=null;this.scopeKey='';this.generation=0;this.selectionRevision=0;this.disposed=false;this.listeners=new Set();}
  status(){const selected=this.items.filter(item=>item.available&&this.selected.has(item.id));return{phase:this.phase,error:this.error,items:this.items.map(loreSelectorPublic),selectedIds:selected.map(item=>item.id),selectedCount:selected.length,totalChars:selected.reduce((sum,item)=>sum+item.content.length,0),scopeKey:this.scopeKey};}
  subscribe(callback){this.listeners.add(callback);callback(this.status());return()=>this.listeners.delete(callback);}
  emit(){const status=this.status();if(typeof this.onChange==='function')try{this.onChange(status);}catch{}for(const callback of this.listeners)try{callback(status);}catch{}}
  _scope(){const status=this.wikiController?.status?.()||{},stored=this.wikiController?.snapshot?.(),scope=stored?.scope||status.scope;if(status.writeBlocked||status.phase==='loading'||!scope?.characterId||!scope?.chatKey)throw loreSelectorError('scope-unavailable','현재 봇과 채팅을 먼저 불러와주세요.');return{characterId:String(scope.characterId),chatKey:String(scope.chatKey),key:String(scope.characterId)+'\n'+String(scope.chatKey)};}
  _alive(generation=null){return!this.disposed&&(generation===null||generation===this.generation);}
  _sameScope(expected){try{return this._scope().key===expected.key;}catch{return false;}}
  async _host(expected){
    const api=this.api;for(const method of ['getCurrentCharacterIndex','getCurrentChatIndex','getChatFromIndex','getCurrentLorebookEntries'])if(typeof api?.[method]!=='function')throw loreSelectorError('host-unsupported','현재 로어북 목록을 읽는 호스트 기능을 사용할 수 없습니다.');
    if(typeof api.getCharacterFromIndex!=='function'&&typeof api.getCharacter!=='function')throw loreSelectorError('host-unsupported','현재 봇을 확인하는 호스트 기능을 사용할 수 없습니다.');
    const characterIndex=await api.getCurrentCharacterIndex(),chatIndex=await api.getCurrentChatIndex();if(!loreSelectorIndex(characterIndex)||!loreSelectorIndex(chatIndex))throw loreSelectorError('scope-changed','현재 봇이나 채팅이 변경되었습니다. 목록을 다시 열어주세요.');
    const character=typeof api.getCharacterFromIndex==='function'?await api.getCharacterFromIndex(characterIndex):await api.getCharacter(),chat=await api.getChatFromIndex(characterIndex,chatIndex);
    if(loreSelectorBot(character)!==expected.characterId||loreSelectorChat(chat)!==expected.chatKey||!this._sameScope(expected)||await api.getCurrentCharacterIndex()!==characterIndex||await api.getCurrentChatIndex()!==chatIndex)throw loreSelectorError('scope-changed','현재 봇이나 채팅이 변경되었습니다. 목록을 다시 열어주세요.');
    return{characterIndex,chatIndex,character,chat};
  }
  async _read(generation=null){
    if(!this._alive(generation))throw loreSelectorError('cancelled','로어북 조회가 취소되었습니다.');const scope=this._scope(),host=await this._host(scope);if(!this._alive(generation))throw loreSelectorError('cancelled','로어북 조회가 취소되었습니다.');
    const raw=await this.api.getCurrentLorebookEntries();if(!Array.isArray(raw))throw loreSelectorError('invalid-lore','현재 로어북 목록을 읽지 못했습니다.');
    const context=hasCbsReferenceContent({entries:raw})?await collectCbsReferenceContext(this.api,{...host,isCurrent:()=>this._alive(generation)&&this._sameScope(scope)}):null;
    if(context&&(!context.current||context.scope.characterId!==scope.characterId||context.scope.chatKey!==scope.chatKey))throw loreSelectorError('cbs-changed','로어북을 읽는 동안 CBS 조건 값이나 채팅이 변경되었습니다. 다시 불러와주세요.');
    const folders=new Map();raw.forEach((entry,index)=>{if(loreSelectorIsFolder(entry)){const folderId=loreSelectorFolder(entry.id||entry.key);if(folderId)folders.set(folderId,loreSelectorLabel(entry,index,context));}});
    const items=raw.map((entry,index)=>{
      let serialized;try{serialized=JSON.stringify(entry)??'null';}catch{throw loreSelectorError('invalid-lore','로어북 항목 형식을 읽지 못했습니다.');}const digest=loreSelectorHash(serialized),base={id:'lore:'+index+':'+digest,ref:'source:people_selected_lore_'+index,index,serialized,digest,hasCbs:hasCbsReferenceContent({entries:[entry]}),label:loreSelectorLabel(entry,index,context),keys:[],content:'',available:false,reason:'',alwaysActive:entry?.alwaysActive===true||entry?.constant===true||entry?.forceActivation===true||entry?.mode==='constant',folderId:loreSelectorFolder(entry?.folder)};if(base.folderId)base.folder=folders.get(base.folderId)||base.folderId;
      if(!loreSelectorRecord(entry)){base.reason='읽을 수 없는 로어북 항목입니다.';return base;}if(loreSelectorIsFolder(entry)){base.reason='폴더는 분석 대상으로 선택할 수 없습니다.';return base;}if(loreSelectorOff(entry)){base.reason='꺼진 로어북 항목입니다.';return base;}
      const projection=projectCbsLoreEntries([entry],context||{}),visible=projection.entries[0],body=loreSelectorText(visible);
      if(!visible||!loreSelectorBodyPresent(body)){base.reason=projection.diagnostics.unsupported?'현재 CBS 문법을 안전하게 처리할 수 없는 항목입니다.':projection.diagnostics.unknownBlocks||projection.diagnostics.unknownInline?'현재 조건 값을 확인할 수 없어 본문을 분석하지 않습니다.':projection.diagnostics.hasCbs?'현재 CBS 조건에서 보이는 본문이 없습니다.':'분석할 본문이 없습니다.';return base;}
      if(body.length>PEOPLE_LORE_SELECTOR_LIMITS.entryChars){base.reason='본문이 100,000자를 넘어 분석할 수 없습니다. 원본 항목을 나눈 뒤 다시 불러와주세요.';return base;}
      base.label=loreSelectorLabel(visible,index,context);base.keys=peopleSourceKeys(visible);base.content=body;base.available=true;if(projection.diagnostics.hiddenBlocks||projection.diagnostics.unknownBlocks||projection.diagnostics.unknownInline)base.reason='숨김·미확인 CBS 구역을 제외한 현재 본문만 분석합니다.';return base;
    });
    const after=await this._host(scope);if(after.characterIndex!==host.characterIndex||after.chatIndex!==host.chatIndex||!this._alive(generation)||context&&!await cbsReferenceContextIsCurrent(this.api,context))throw loreSelectorError('scope-changed','로어북을 읽는 동안 채팅 또는 조건 값이 변경되었습니다. 다시 불러와주세요.');
    return{scope,items,contextSignature:context?.signature||'',context,signature:loreSelectorHash(items.map(item=>item.digest).join('|')+'|'+(context?.signature||''))};
  }
  async load(){
    if(this.disposed)return this.status();const generation=++this.generation;this.phase='loading';this.error='';this.items=[];this.selected.clear();this.snapshot=null;this.scopeKey='';this.selectionRevision++;this.emit();
    try{const snapshot=await this._read(generation);if(!this._alive(generation))return this.status();this.snapshot=snapshot;this.items=snapshot.items;this.scopeKey=snapshot.scope.key;this.phase='ready';}
    catch(error){if(!this._alive(generation))return this.status();this.phase='failed';this.error=LORE_SELECTOR_ERRORS.has(error)?error.message:'로어북 목록을 불러오지 못했습니다. 다시 시도해주세요.';}
    this.emit();return this.status();
  }
  toggle(id,checked=true){return this.select([id],checked);}
  select(ids,checked=true){
    if(this.disposed||this.phase!=='ready'||!Array.isArray(ids)||typeof checked!=='boolean')return this.status();let changed=false;const available=new Set(this.items.filter(item=>item.available).map(item=>item.id));
    for(const id of ids){if(typeof id!=='string')continue;if(checked){if(available.has(id)&&!this.selected.has(id)){this.selected.add(id);changed=true;}}else if(this.selected.delete(id))changed=true;}
    if(changed){this.selectionRevision++;this.emit();}return this.status();
  }
  _stale(snapshot,message){if(this.disposed||this.snapshot!==snapshot)return;this.phase='stale';this.error=message;this.selected.clear();this.items=this.items.map(item=>({...item,available:false,content:'',keys:[],reason:message}));this.selectionRevision++;this.emit();}
  async _validate(snapshot,selectedItems,{markStale=true}={}){
    if(this.disposed||!snapshot||!this._sameScope(snapshot.scope)){if(markStale)this._stale(snapshot,'봇이나 채팅이 바뀌었습니다. 로어북 목록을 다시 불러와주세요.');return false;}
    try{
      const fresh=await this._read(),requiresCbs=selectedItems.some(item=>item.hasCbs),same=fresh.scope.key===snapshot.scope.key&&(!requiresCbs||fresh.contextSignature===snapshot.contextSignature)&&selectedItems.every(item=>{const current=fresh.items[item.index];return current&&current.serialized===item.serialized&&current.available&&current.content===item.content&&JSON.stringify(current.keys)===JSON.stringify(item.keys)&&current.label===item.label;});
      if(!same&&markStale)this._stale(snapshot,'선택한 로어북이나 CBS 조건이 바뀌었습니다. 목록을 다시 불러와 선택해주세요.');return same;
    }catch{if(markStale)this._stale(snapshot,'선택한 로어북의 현재 상태를 확인하지 못했습니다. 목록을 다시 불러와주세요.');return false;}
  }
  async validateCurrent(){const snapshot=this.snapshot;if(!snapshot||this.phase!=='ready'||this.disposed)return false;const selectedItems=snapshot.items.filter(item=>item.available&&this.selected.has(item.id));return await this._validate(snapshot,selectedItems.length?selectedItems:snapshot.items.filter(item=>item.available));}
  async prepareSources(){
    if(this.disposed||this.phase!=='ready'||!this.snapshot)throw loreSelectorError('not-ready','로어북 목록을 먼저 불러와주세요.');const snapshot=this.snapshot,selectionRevision=this.selectionRevision,selectedItems=snapshot.items.filter(item=>item.available&&this.selected.has(item.id));
    if(!selectedItems.length)throw loreSelectorError('empty-selection','분석할 로어북을 하나 이상 체크해주세요.');const totalChars=selectedItems.reduce((sum,item)=>sum+item.content.length,0);if(totalChars>PEOPLE_LORE_SELECTOR_LIMITS.totalChars)throw loreSelectorError('source-limit','선택한 로어북 본문이 2,000,000자를 넘습니다. 선택 항목을 줄여주세요.');
    if(!await this._validate(snapshot,selectedItems))throw loreSelectorError('stale-selection',this.error||'선택한 로어북이 변경되었습니다. 다시 불러와주세요.');if(this.snapshot!==snapshot||this.phase!=='ready'||this.selectionRevision!==selectionRevision)throw loreSelectorError('selection-changed','분석 준비 중 체크한 항목이 바뀌었습니다. 다시 분석해주세요.');
    const sources=selectedItems.map(item=>({ref:item.ref,kind:'lore',label:item.label,keys:[...item.keys],content:item.content,discovery:true})),selectedIds=selectedItems.map(item=>item.id),signature=loreSelectorHash(snapshot.scope.key+'|'+selectedItems.map(item=>item.digest).join('|')+'|'+(selectedItems.some(item=>item.hasCbs)?snapshot.contextSignature:''));
    return{mode:'lore-selected',sources,scopeKey:snapshot.scope.key,selectedIds,totalChars,signature,cbsSignature:selectedItems.some(item=>item.hasCbs)?snapshot.contextSignature:'',validateCurrent:()=>this._validate(snapshot,selectedItems)};
  }
  reset(){if(this.disposed)return this.status();this.generation++;this.selectionRevision++;this.phase='idle';this.error='';this.items=[];this.selected.clear();this.snapshot=null;this.scopeKey='';this.emit();return this.status();}
  dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.phase='disposed';this.error='';this.items=[];this.selected.clear();this.snapshot=null;this.scopeKey='';this.listeners.clear();this.onChange=null;}
}
