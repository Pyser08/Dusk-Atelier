import { normalizeMarks, hideMarksForDisplay, extractMessageText, isUserMessage } from "../engine/charsplit.js";
// Keep hidden-mark processing lossless for non-text payloads and consistent across chat paths.
export const CHARSPLIT_KEY="dusk.charsplit.v1";
export const CHARSPLIT_DEFAULTS=Object.freeze({v:1,enabled:true,showTime:false,debug:false,bots:{},ai:{mode:"submodel",staticModel:"",extra:"",lang:"English"}});
const txt=v=>typeof v==="string"?v:Array.isArray(v)?v.map(p=>typeof p==="string"?p:txt(p?.text??p?.data??p?.content??"")).join("\n"):v&&typeof v==="object"?txt(v.text??v.data??v.content??v.mes??v.message??""):String(v??""), idOf=c=>String(c?.chaId??c?.id??"");
const stripMarkText=v=>String(v??"").replace(/⟦C:[^⟧]+⟧|⟦\/C⟧|⟦S⟧|⟦\/S⟧|⟦T:[^⟧]*⟧/g,"");
const mapTextParts=(value,fn)=>{
 if(typeof value==="string")return fn(value);
 if(Array.isArray(value))return value.map(part=>mapTextParts(part,fn));
 if(value&&typeof value==="object"){
  const out={...value};
  for(const key of ["text","data","content","mes","message"])if(typeof out[key]==="string"||Array.isArray(out[key]))out[key]=mapTextParts(out[key],fn);
  return out;
 }
 return value;
};
const stripMessageMarks=m=>{
 const markPattern=/⟦(?:C:|\/C|S⟧|\/S|T:)/;
 const keyWithMarks=["content","data","text","mes","message"].find(k=>m?.[k]!=null&&markPattern.test(txt(m[k])));
 const key=keyWithMarks??["content","data","text","mes","message"].find(k=>m?.[k]!=null&&txt(m[k]).trim());
 if(!key)return {message:{...m},counts:{C:0,S:0,T:0}};
 const raw=txt(m[key]),counts={C:(raw.match(/⟦C:[^⟧]+⟧|⟦\/C⟧/g)||[]).length,S:(raw.match(/⟦S⟧|⟦\/S⟧/g)||[]).length,T:(raw.match(/⟦T:[^⟧]*⟧/g)||[]).length};
 const out={...m};out[key]=mapTextParts(m[key],stripMarkText);
 return {message:out,counts};
};
const appendTextToMessage=(m,suffix)=>{
 const key=["content","data","text","mes","message"].find(k=>m?.[k]!=null);
 if(!key){m.content=suffix;return}
 const value=m[key];
 if(typeof value==="string"){m[key]=value+"\n\n"+suffix;return}
 if(Array.isArray(value)){
  let added=false;
  m[key]=value.map(part=>{
   if(!added&&part&&typeof part==="object"&&typeof part.text==="string"){added=true;return {...part,text:part.text+"\n\n"+suffix}}
   return part;
  });
  if(!added)m[key].push({type:"text",text:suffix});
  return;
 }
 if(value&&typeof value==="object"){
  const field=["text","data","content"].find(k=>typeof value[k]==="string");
  if(field)m[key]={...value,[field]:value[field]+"\n\n"+suffix};
  else m[key]={type:"text",text:txt(value)+"\n\n"+suffix};
  return;
 }
 m[key]=suffix;
};
export async function loadCharSplit(api){try{const raw=await api.pluginStorage.getItem(CHARSPLIT_KEY),v=typeof raw==="string"?JSON.parse(raw):raw;return{...CHARSPLIT_DEFAULTS,...(v&&typeof v==="object"?v:{}),bots:{...(v?.bots??{})},ai:{...CHARSPLIT_DEFAULTS.ai,...(v?.ai??{})}}}catch{return{...CHARSPLIT_DEFAULTS,bots:{},ai:{...CHARSPLIT_DEFAULTS.ai}}}}
export async function saveCharSplit(api,v){const out={...CHARSPLIT_DEFAULTS,...v,v:1,bots:v?.bots??{},ai:{...CHARSPLIT_DEFAULTS.ai,...(v?.ai??{})}};await api.pluginStorage.setItem(CHARSPLIT_KEY,JSON.stringify(out));return out}
export function makeInstruction({names=[],last="",lastSituation=""}={}) {
 const allowed=names.length?names.join(", "):"No preset list: include every identifiable named character; never invent a name.";
 const previousTime=last||"unknown";
 const previousScene=lastSituation||"(no scene recorded yet)";
 return [
  "[Dusk Atelier | STORY METADATA — FOLLOW QUIETLY]",
  "Write the actual in-character continuation first in your planning; the final answer must remain natural fiction, not a report about tagging. The marks are hidden metadata for later extraction.",
  "",
  "PRIORITY",
  "1. Preserve the scene, characterization, tone, pacing, and continuity. Never sacrifice a natural reply just to add metadata.",
  "2. Add only marks supported by the conversation and story context. Never invent events, names, dates, locations, or relationships to fill a mark.",
  "3. Keep each mark syntactically complete. C and S blocks must never overlap or nest.",
  "",
  "TIME (T) — put exactly one ⟦T:...⟧ mark at the very beginning of the reply.",
  "Previous confirmed time: "+previousTime+". Continue from it consistently. Use ⟦T:YYYY-MM-DD HH:mm⟧ when the story gives enough information to determine a date and time. If only relative time is known, use a concise relative value such as ⟦T:D+1 저녁⟧. If time cannot reasonably be inferred, use ⟦T:unknown⟧ rather than fabricate precision. Advance time only as much as the story implies; do not reset it or move it backwards without an explicit time jump.",
  "",
  "SCENE (S) — shared state, not a beat-by-beat transcript.",
  "Last recorded scene: "+JSON.stringify(previousScene)+".",
  "If there is no previous scene, write one ⟦S⟧...⟦/S⟧ block after T describing the current established scene. Later, add S only when the shared state materially changes: a location/setting change; someone arrives, leaves, or becomes involved; the ongoing event takes a consequential turn; or a meaningful condition/relationship situation changes. Do not add S for ordinary dialogue, facial expressions, small gestures, or routine actions. Describe only the updated facts needed to understand what is happening: location, present people, ongoing activity/event, and consequential change. If nothing material changed, omit S entirely. Place a new S at the transition point, before any C block that relies on the new situation.",
  "",
  "CHARACTER INTERACTION (C) — capture each meaningful direct interaction with {{user}}.",
  "Known character names: "+allowed+". "+(names.length?"Use these names when they match the character; aliases may be normalized by the plugin.":"When no preset list is supplied, record every identifiable named character who interacts with {{user}}.")+"",
  "Wrap a character's direct speech to {{user}} and the closely attached action/reaction in one ⟦C:Name⟧...⟦/C⟧ block. This includes addressing {{user}}, responding to {{user}}, meaningful looks/gestures/touch, giving or taking something, and actions clearly directed at {{user}}. Keep the dialogue and its attached action together; do not tag only a gesture while leaving its dialogue outside. For a genuinely shared interaction, use ⟦C:Name1,Name2⟧...⟦/C⟧. Do not tag unrelated dialogue between other characters, general narration, or actions that are not directed at {{user}}. Do not omit a direct interaction merely because it is brief.",
  "",
  "OUTPUT FORMAT",
  "Return the normal story reply with inline marks only. Do not explain the marks, add a preface, or use a code fence. Start with one T mark. Add S only for a new or materially changed scene. Use C for direct character↔{{user}} interaction. Close every S/C block. Never put S or T inside C, and never put C inside S. Keep ordinary prose outside the blocks when it is not part of a direct interaction.",
  "",
  "QUICK CHECK BEFORE SENDING",
  "• T is first, appears once, and does not contradict established time.",
  "• S is present for the initial scene or a material change, and absent for an unchanged scene.",
  "• Every meaningful direct character interaction with {{user}} is inside C, with related dialogue and action kept together.",
  "• Names and scene details are grounded in context; all blocks are closed and non-overlapping."
 ].join("\n");
}
export function createCharSplit(api,{log=(...a)=>console.log("[Dusk 캐릭터 분리]",...a)}={}){let settings=null;const conf=async()=>settings??=await loadCharSplit(api),current=async()=>{try{const i=await api.getCurrentCharacterIndex();return i>=0?await api.getCharacterFromIndex(i):null}catch{return null}},active=(s,c)=>s.enabled!==false&&s.bots?.[idOf(c)]?.on!==false;
function confirmedTimeBeforeLatestUser(messages){
let last="", latestUser=-1;
for(let i=0;i<messages.length;i++){const m=messages[i]??{};if(isUserMessage(m))latestUser=i}
const limit=latestUser>=0?latestUser:Math.max(-1,messages.length-2);
for(let i=0;i<=limit;i++){const m=messages[i]??{};for(const x of extractMessageText(m).matchAll(/⟦T:([^⟧]*)⟧/g))last=x[1]}
return last
}
function confirmedSituationBeforeLatestUser(messages){
let last="", latestUser=-1;
for(let i=0;i<messages.length;i++){const m=messages[i]??{};if(isUserMessage(m))latestUser=i}
const limit=latestUser>=0?latestUser:Math.max(-1,messages.length-2);
for(let i=0;i<=limit;i++){const m=messages[i]??{};for(const x of txt(m.content??m.data??m.text).matchAll(/⟦S⟧([\s\S]*?)⟦\/S⟧/g))if(x[1].trim())last=x[1].trim()}
return last
}
async function beforeRequest(messages,type){try{const s=await conf();if(!Array.isArray(messages)){if(s.debug)log("마커 진단: 요청 입력이 messages 배열이 아님",{type,inputType:typeof messages});return messages}if(type&&type!=="model"){if(s.debug)log("마커 진단: 모델 요청이 아닌 타입이라 프롬프트 주입 생략",{type,messageCount:messages.length});return messages}const ch=await current();if(!ch||!active(s,ch)){if(s.debug)log("마커 진단: 캐릭터 분리 비활성 또는 현재 캐릭터 없음",{hasCharacter:!!ch,enabled:s.enabled!==false,botEnabled:ch?s.bots?.[idOf(ch)]?.on!==false:false});return messages}const cfg=s.bots?.[idOf(ch)]??{},last=confirmedTimeBeforeLatestUser(messages),lastSituation=confirmedSituationBeforeLatestUser(messages),out=[],stripped={C:0,S:0,T:0};for(const original of messages){const result=stripMessageMarks(original??{});out.push(result.message);for(const k of ["C","S","T"])stripped[k]+=result.counts[k]}const inst=makeInstruction({names:cfg.names??[],last,lastSituation});let i=-1;for(let j=out.length-1;j>=0;j--)if(out[j]?.role==="system"){i=j;break}if(i>=0)appendTextToMessage(out[i],inst);else out.unshift({role:"system",content:inst});if(s.debug){const system=out.filter(m=>m?.role==="system").map(m=>txt(m.content)).join("\n");log("마커 진단: 프롬프트 주입 완료",{type,messageCount:messages.length,characterId:idOf(ch),systemMessages:out.filter(m=>m?.role==="system").length,instructionPresent:system.includes("[Dusk Atelier – interaction and situation marks]"),hasCInstruction:system.includes("MANDATORY C MARKS"),hasSInstruction:system.includes("SITUATION MARKS — record scene state"),strippedPriorMarks:stripped})}return out}catch(e){log("프롬프트 처리 실패",e?.message??e);return messages}}
async function onOutput(text){if(typeof text!=="string")return text;try{const s=await conf(),ch=await current();if(!ch||!active(s,ch))return text;if(s.debug){const count=re=>(text.match(re)||[]).length;log("마커 진단: 원본 응답",{characterId:idOf(ch),length:text.length,T:count(/⟦T:[^⟧]*⟧/g),COpen:count(/⟦C:[^⟧]+⟧/g),CClose:count(/⟦\/C⟧/g),SOpen:count(/⟦S⟧/g),SClose:count(/⟦\/S⟧/g),hasOpeningS:/⟦T:[^⟧]*⟧[\s\S]{0,160}⟦S⟧[\s\S]*?⟦\/S⟧/.test(text)})}return normalizeMarks(text,s.bots?.[idOf(ch)]?.aliases??{})}catch(e){log("출력 정리 실패",e?.message??e);return text}}
async function onDisplay(text){if(typeof text!=="string"||!text.includes("⟦"))return text;try{const s=await conf();return hideMarksForDisplay(text,{showTime:s.showTime===true,debug:s.debug===true})}catch{return hideMarksForDisplay(text)}}
async function start(){
  settings=await loadCharSplit(api);
  // 진단 옵션과 무관한 초기화 로그로, 번들이 실행되는지와 공식 훅 등록 여부를 구분해요.
  log("캐릭터 분리 초기화 시작",{debug:settings.debug===true,enabled:settings.enabled!==false,hasReplacer:typeof api.addRisuReplacer==="function",hasScriptHandler:typeof api.addRisuScriptHandler==="function"});
  if(typeof api.addRisuReplacer==="function"){
    try{await api.addRisuReplacer("beforeRequest",beforeRequest);log("요청 훅 등록 완료")}
    catch(e){log("요청 훅 등록 실패",e?.message??e)}
  }else log("요청 훅 등록 불가: addRisuReplacer API 없음");
  try{await api.addRisuScriptHandler("output",onOutput);log("출력 훅 등록 완료")}
  catch(e){log("출력 훅 등록 실패",e?.message??e)}
  try{await api.addRisuScriptHandler("display",onDisplay);log("표시 훅 등록 완료")}
  catch(e){log("표시 훅 등록 실패",e?.message??e)}
}
return{start,beforeRequest,onOutput,onDisplay,settings:()=>conf(),async update(p){settings=await saveCharSplit(api,{...await conf(),...p});return settings},async updateBot(id,p){const s=await conf();s.bots[id]={on:true,names:[],aliases:{},...(s.bots[id]??{}),...p};settings=await saveCharSplit(api,s);return settings},async getBot(id){const s=await conf();return s.bots[id]??{on:true,names:[],aliases:{}}}}}
