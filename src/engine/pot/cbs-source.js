// 출처: risupot 2.3.0 src/cbs-source.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { evaluateCbsVisibility } from './cbs-visibility.js';

const CBS_SOURCE_LIMITS=Object.freeze({contextKeys:4000,contextChars:1000000,defaultChars:100000,fieldChars:100000});
const CBS_SOURCE_TEXT_FIELDS=['content','text','prompt','data','description','entry'];
const CBS_SOURCE_METADATA=['name','title','comment','displayName','key','keys','keywords','secondkey','aliases','alias'];
const CBS_SOURCE_CARD_GROUPS=[['name'],['displayName'],['nickname'],['desc','description'],['personality'],['scenario'],['firstMessage','first_message'],['systemPrompt','system_prompt'],['postHistoryInstructions'],['creatorNotes','creator_notes'],['exampleDialogue','example_dialogue','mes_example'],['note'],['characterNote','character_note']];
const CBS_SOURCE_CARD_ROOTS=['data','character','customData'];
const CBS_SOURCE_BINDINGS=new WeakMap(),CBS_SOURCE_PROJECTED_LORE=new WeakSet();
const cbsSourceRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const cbsSourceScalar=value=>typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value);
const cbsSourceString=value=>typeof value==='string'||typeof value==='number'?String(value).trim():'';
const cbsSourceSyntax=value=>typeof value==='string'&&/\{\{|\}\}|(?:^|[^{])\{#/.test(value);
const cbsSourceId=character=>cbsSourceString(cbsSourceOwn(character,'chaId'))||cbsSourceString(cbsSourceOwn(character,'id'))||cbsSourceString(cbsSourceOwn(character,'name'));
const cbsSourceChatKey=chat=>cbsSourceString(cbsSourceOwn(chat,'risupotWikiScopeId'))||cbsSourceString(cbsSourceOwn(chat,'id'));
const cbsSourceIndex=value=>Number.isInteger(value)&&value>=0;
function cbsSourceHash(value){let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(36);}
function cbsSourceOwn(object,key){try{const descriptor=object&&Object.getOwnPropertyDescriptor(object,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;}catch{return undefined;}}
function cbsSourceVariables(character,chat,reasons){
  const variables=Object.create(null);if(!cbsSourceRecord(chat)){reasons.add('chat-values-unavailable');return variables;}let size=0,count=0;
  const assign=(key,value)=>{if(typeof key!=='string'||key.length>1000||!cbsSourceScalar(value))return;const text=String(value),prior=Object.hasOwn(variables,key)?variables[key].length+key.length:0,nextSize=size-prior+key.length+text.length;if((!Object.hasOwn(variables,key)&&count>=CBS_SOURCE_LIMITS.contextKeys)||nextSize>CBS_SOURCE_LIMITS.contextChars){delete variables[key];reasons.add('context-limit');return;}if(!Object.hasOwn(variables,key))count++;variables[key]=text;size=nextSize;};
  const defaults=cbsSourceOwn(character,'defaultVariables');if(typeof defaults==='string'){
    if(defaults.length>CBS_SOURCE_LIMITS.defaultChars)reasons.add('default-values-limit');
    else{const seen=new Set();for(const line of defaults.split('\n')){const[key,value]=line.split('=');if(key&&value&&!seen.has(key)){seen.add(key);assign(key,value);}}}
  }
  const scriptstate=cbsSourceOwn(chat,'scriptstate');if(cbsSourceRecord(scriptstate))for(const key of Object.keys(scriptstate)){
    if(!key.startsWith('$'))continue;const descriptor=Object.getOwnPropertyDescriptor(scriptstate,key),value=cbsSourceOwn(scriptstate,key),name=key.slice(1);if(!descriptor||!Object.hasOwn(descriptor,'value')){delete variables[name];reasons.add('unknown-script-value');continue;}if(value===null||value===undefined)continue;
    if(cbsSourceScalar(value))assign(name,value);else{delete variables[name];reasons.add('unknown-script-value');}
  }
  return variables;
}
function cbsSourceContext(character,chat,coordinates,options={},current=true,reasons=new Set()){
  const variables=current?cbsSourceVariables(character,chat,reasons):Object.create(null),globals=Object.create(null),nickname=cbsSourceOwn(character,'nickname'),name=cbsSourceOwn(character,'name'),characterName=typeof nickname==='string'&&nickname?nickname:typeof name==='string'?name:undefined;
  const scope={characterId:cbsSourceId(character),chatKey:cbsSourceChatKey(chat),characterIndex:coordinates.characterIndex??null,chatIndex:coordinates.chatIndex??null};
  const actor=typeof options.userName==='string'?{userName:options.userName}:{},data={variables:Object.freeze(variables),globals:Object.freeze(globals),...(characterName!==undefined?{characterName}:{}),...actor,scope:Object.freeze(scope)};
  const signature='cbs:'+cbsSourceHash(JSON.stringify({...data,variables:Object.keys(variables).sort().map(key=>[key,variables[key]])}));
  return Object.freeze({...data,signature,current,available:current&&cbsSourceRecord(chat),reasonCodes:Object.freeze([...reasons])});
}
async function cbsSourceCurrent(options){try{return typeof options.isCurrent!=='function'||await options.isCurrent();}catch{return false;}}
async function cbsSourceCoordinates(api){if(typeof api?.getCurrentCharacterIndex!=='function'||typeof api?.getCurrentChatIndex!=='function')return null;const characterIndex=await api.getCurrentCharacterIndex(),chatIndex=await api.getCurrentChatIndex();return cbsSourceIndex(characterIndex)&&cbsSourceIndex(chatIndex)?{characterIndex,chatIndex}:null;}
const cbsSourceSameCoordinates=(a,b)=>Boolean(a&&b&&a.characterIndex===b.characterIndex&&a.chatIndex===b.chatIndex);
async function cbsSourceReadCharacter(api,index){if(cbsSourceIndex(index)&&typeof api?.getCharacterFromIndex==='function')return await api.getCharacterFromIndex(index);if(typeof api?.getCharacter==='function')return await api.getCharacter();return undefined;}
async function cbsSourceReadChat(api,coordinates){return cbsSourceIndex(coordinates.characterIndex)&&cbsSourceIndex(coordinates.chatIndex)&&typeof api?.getChatFromIndex==='function'?await api.getChatFromIndex(coordinates.characterIndex,coordinates.chatIndex):undefined;}

/** No database/DOM/Lua/parser API is used. Global toggle state is unavailable and deliberately stays unknown. */
export async function collectCbsReferenceContext(api,{character,chat,characterIndex,chatIndex,isCurrent,userName}={}){
  const options={isCurrent,userName},reasons=new Set(),coordinates={characterIndex:cbsSourceIndex(characterIndex)?characterIndex:null,chatIndex:cbsSourceIndex(chatIndex)?chatIndex:null};let current=true;
  try{
    if(!await cbsSourceCurrent(options)){current=false;reasons.add('scope-changed');}
    const before=current?await cbsSourceCoordinates(api):null;
    if(before){if(coordinates.characterIndex!==null&&coordinates.characterIndex!==before.characterIndex||coordinates.chatIndex!==null&&coordinates.chatIndex!==before.chatIndex){current=false;reasons.add('scope-changed');}else Object.assign(coordinates,before);}
    if(current){if(!cbsSourceRecord(character))character=await cbsSourceReadCharacter(api,coordinates.characterIndex);if(!cbsSourceRecord(chat))chat=await cbsSourceReadChat(api,coordinates);}
    const after=before?await cbsSourceCoordinates(api):null;if(before&&!cbsSourceSameCoordinates(before,after)||!await cbsSourceCurrent(options)){current=false;reasons.add('scope-changed');}
  }catch{current=false;reasons.add('context-read-failed');}
  let context=cbsSourceContext(character,chat,coordinates,options,current,reasons);CBS_SOURCE_BINDINGS.set(context,{api,character,chat,coordinates,options});
  if(current&&!await cbsReferenceContextIsCurrent(api,context)){reasons.add('context-changed');context=cbsSourceContext(character,chat,coordinates,options,false,reasons);CBS_SOURCE_BINDINGS.set(context,{api,character,chat,coordinates,options});}
  return context;
}
/** Re-reading after source collection also catches a variable-only change in the same bot and chat. */
export async function cbsReferenceContextIsCurrent(api,context,{isCurrent}={}){
  if(context?.current===false)return false;const binding=CBS_SOURCE_BINDINGS.get(context);if(!binding)return true;const options={...binding.options,...(isCurrent?{isCurrent}:{})};
  try{
    if(!await cbsSourceCurrent(options))return false;const before=await cbsSourceCoordinates(api);if(before&&!cbsSourceSameCoordinates(before,binding.coordinates))return false;
    // Supplied snapshots are reused when indexed reads are unavailable; they are never rewritten.
    const canReadChat=cbsSourceIndex(binding.coordinates.characterIndex)&&cbsSourceIndex(binding.coordinates.chatIndex)&&typeof api?.getChatFromIndex==='function';
    const canReadCharacter=typeof api?.getCharacterFromIndex==='function'&&cbsSourceIndex(binding.coordinates.characterIndex)||typeof api?.getCharacter==='function';
    const character=canReadCharacter?await cbsSourceReadCharacter(api,binding.coordinates.characterIndex):binding.character,chat=canReadChat?await cbsSourceReadChat(api,binding.coordinates):binding.chat;
    const after=before?await cbsSourceCoordinates(api):null;if(before&&!cbsSourceSameCoordinates(before,after)||!await cbsSourceCurrent(options))return false;
    return cbsSourceContext(character,chat,binding.coordinates,options).signature===context.signature;
  }catch{return false;}
}

function cbsSourceDiagnostics(){return{hasCbs:false,evaluated:0,removed:0,hiddenBlocks:0,unknownBlocks:0,unknownInline:0,unsupported:0,reasonCodes:[]};}
function cbsSourceDiagnosticAdd(target,result){target.hasCbs ||= Boolean(result.hasCbs);target.evaluated+=Number(Boolean(result.hasCbs));target.hiddenBlocks+=result.hiddenBlocks||0;target.unknownBlocks+=result.unknownBlocks||0;target.unknownInline+=result.unknownInline||0;target.unsupported+=Number(Boolean(result.unsupported));target.reasonCodes=[...new Set([...target.reasonCodes,...(result.reasonCodes||[])])];}
export function projectCbsText(text,context={}){return evaluateCbsVisibility(text,context);}
function cbsSourceMetadata(entry,context,diagnostics){const result={...entry};for(const field of CBS_SOURCE_METADATA){const raw=entry[field];if(typeof raw==='string'&&cbsSourceSyntax(raw)){const projection=projectCbsText(raw,context);cbsSourceDiagnosticAdd(diagnostics,projection);result[field]=projection.text;}else if(Array.isArray(raw)&&raw.some(cbsSourceSyntax))result[field]=raw.flatMap(value=>{if(typeof value!=='string')return[];const projection=projectCbsText(value,context);cbsSourceDiagnosticAdd(diagnostics,projection);return projection.text?[projection.text]:[];});}return result;}
function cbsSourceEntryHas(entry){return cbsSourceRecord(entry)&&[...CBS_SOURCE_TEXT_FIELDS,...CBS_SOURCE_METADATA].some(field=>cbsSourceSyntax(entry[field])||Array.isArray(entry[field])&&entry[field].some(cbsSourceSyntax));}
function cbsSourceCardRoots(character){return[character,...CBS_SOURCE_CARD_ROOTS.map(key=>character?.[key])].filter(cbsSourceRecord);}
export function hasCbsReferenceContent({entries,character}={}){return(Array.isArray(entries)&&entries.some(cbsSourceEntryHas))||cbsSourceCardRoots(character).some(root=>[...CBS_SOURCE_CARD_GROUPS.flat(),...CBS_SOURCE_METADATA].some(field=>cbsSourceSyntax(root[field])||Array.isArray(root[field])&&root[field].some(cbsSourceSyntax)));}
function cbsSourceEntryDisabled(entry){return!entry||entry.enabled===false||entry.disabled===true||entry.disable===true||entry.isDisabled===true||entry.mode==='disabled'||entry.mode==='folder'||entry.type==='folder'||entry.isFolder===true;}
export function projectCbsLoreEntries(entries,context={}){
  const diagnostics=cbsSourceDiagnostics();if(!Array.isArray(entries))return{entries:[],diagnostics,signature:context.signature||''};
  const projected=entries.map(entry=>{
    if(!cbsSourceRecord(entry))return null;if(CBS_SOURCE_PROJECTED_LORE.has(entry))return entry;if(!cbsSourceEntryHas(entry))return entry;
    diagnostics.hasCbs=true;if(cbsSourceEntryDisabled(entry)){diagnostics.removed++;return null;}
    const primary=CBS_SOURCE_TEXT_FIELDS.find(field=>typeof entry[field]==='string'&&entry[field].trim()),projection=projectCbsText(primary?entry[primary]:'',context);cbsSourceDiagnosticAdd(diagnostics,projection);
    if(!projection.text.trim()||projection.unsupported||context.current===false){diagnostics.removed++;return null;}
    const priorUnsupported=diagnostics.unsupported,copy=cbsSourceMetadata(entry,context,diagnostics);if(diagnostics.unsupported>priorUnsupported){diagnostics.removed++;return null;}for(const field of CBS_SOURCE_TEXT_FIELDS)delete copy[field];copy.content=projection.text;CBS_SOURCE_PROJECTED_LORE.add(copy);return copy;
  });
  return{entries:projected,diagnostics,signature:diagnostics.hasCbs?context.signature||'cbs:unknown':''};
}
export function projectCbsCharacter(character,context={}){
  const diagnostics=cbsSourceDiagnostics();if(!cbsSourceRecord(character)||!hasCbsReferenceContent({character}))return{character,diagnostics,signature:''};
  diagnostics.hasCbs=true;let visibleBody=false,originalBody=false,unsupported=false;const projectRoot=root=>{if(!cbsSourceRecord(root))return root;const priorUnsupported=diagnostics.unsupported,next=cbsSourceMetadata(root,context,diagnostics);unsupported ||= diagnostics.unsupported>priorUnsupported;for(const group of CBS_SOURCE_CARD_GROUPS){const source=group.find(field=>typeof root[field]==='string'&&root[field].trim());if(!source)continue;const isBody=!['name','displayName','nickname'].includes(source);originalBody ||= isBody;const projection=projectCbsText(root[source],context);cbsSourceDiagnosticAdd(diagnostics,projection);unsupported ||= projection.unsupported;visibleBody ||= isBody&&Boolean(projection.text.trim());for(const field of group)delete next[field];if(projection.text.trim())next[group[0]]=projection.text;}return next;};
  const projected=projectRoot(character);for(const key of CBS_SOURCE_CARD_ROOTS)if(cbsSourceRecord(character[key]))projected[key]=projectRoot(character[key]);
  if(unsupported||context.current===false||originalBody&&!visibleBody){diagnostics.removed++;return{character:null,diagnostics,signature:context.signature||'cbs:unknown'};}
  return{character:projected,diagnostics,signature:context.signature||'cbs:unknown'};
}
export function combineCbsSourceDiagnostics(...items){const result=cbsSourceDiagnostics();for(const item of items){if(!item)continue;result.hasCbs ||= item.hasCbs;for(const key of ['evaluated','removed','hiddenBlocks','unknownBlocks','unknownInline','unsupported'])result[key]+=item[key]||0;result.reasonCodes=[...new Set([...result.reasonCodes,...(item.reasonCodes||[])])];}return result;}
