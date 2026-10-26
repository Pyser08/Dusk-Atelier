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
 const allowed=names.length?names.join(", "):"미리 지정된 이름 없음: 식별 가능한 이름 있는 인물을 모두 기록하고, 이름을 지어내지 말 것.";
 const previousTime=last||"unknown";
 const previousScene=lastSituation||"(기록된 장면 없음)";
 return [
  "[Dusk Atelier | 이야기 메타데이터 — 조용히 따를 것]",
  "먼저 평소와 같은 역할극 답변을 작성하고, 최종 출력은 태깅 보고서가 아닌 자연스러운 이야기로 유지한다. 마커는 나중에 프로그램이 추출할 숨김 메타데이터다.",
  "",
  "우선순위",
  "1. 장면, 인물 묘사, 말투, 속도감, 연속성을 보존한다. 마커를 넣기 위해 자연스러운 답변을 희생하지 않는다.",
  "2. 대화와 이야기 맥락으로 뒷받침되는 정보만 기록한다. 마커를 채우려고 사건, 이름, 날짜, 장소, 관계를 만들어 내지 않는다.",
  "3. 마커 문법을 정확히 지킨다. S와 C 블록은 서로 겹치거나 중첩될 수 없다.",
  "",
  "시간(T) — 답변 맨 처음에 ⟦T:...⟧ 마커를 정확히 하나 둔다.",
  "이전 확인 시간: "+previousTime+". 이전 시간에서 자연스럽게 이어 간다. 이야기에서 날짜와 시각을 충분히 알 수 있을 때는 ⟦T:YYYY-MM-DD HH:mm⟧ 형식을 쓴다. 상대적인 시간만 알 수 있다면 ⟦T:D+1 저녁⟧처럼 한국어 상대 시간으로 기록한다. 합리적으로 추정할 수 없다면 정밀한 시간을 꾸며 내지 말고 ⟦T:unknown⟧을 쓴다. 이야기에서 암시하는 만큼만 시간을 진행하며, 명시적인 시간 이동 없이 시간을 초기화하거나 과거로 되돌리지 않는다.",
  "",
  "장면(S) — 매 순간을 기록하지 말고, 공유 상태를 기록한다.",
  "마지막 기록 장면: "+JSON.stringify(previousScene)+".",
  "이전 장면 기록이 없다면 T 바로 뒤에 현재 확정된 장면을 설명하는 ⟦S⟧...⟦/S⟧ 블록을 하나 쓴다. 이후에는 공유 상태가 실질적으로 바뀔 때만 S를 추가한다. 예: 장소나 배경의 변화, 인물의 등장·퇴장·합류, 진행 중인 사건의 중요한 전환, 의미 있는 상태나 관계 상황의 변화. 평범한 대사, 표정, 작은 몸짓, 일상적인 행동에는 S를 붙이지 않는다. 상황을 이해하는 데 필요한 사실만 1~2문장으로 기록한다(장소, 함께 있는 인물, 진행 중인 활동, 핵심 변화). 실질적인 변화가 없다면 S를 생략한다. 새로운 상황을 전제로 하는 C 블록보다 먼저, 상황이 바뀌는 지점에 S를 둔다.",
  "",
  "인물 상호작용(C) — {{user}}와 직접 상호작용하는 내용을 기록한다.",
  "알려진 인물 이름: "+allowed+". "+(names.length?"실제 이야기 속 인물과 일치하는 이름을 사용한다. 별칭은 플러그인에서 정규화할 수 있다.":"미리 지정된 이름 목록이 없다면 {{user}}와 상호작용하는, 식별 가능한 이름 있는 인물을 모두 기록한다."),
  "C의 판정 기준은 말하는 인물이 아니라 대사·행동의 상대다. 반드시 {{user}}와 직접 주고받는 상호작용만 태깅한다. 캐릭터가 다른 NPC에게 하는 말(예: 하연이 설지에게 하는 말), NPC끼리의 대화, {{user}}와 무관한 행동은 C로 감싸지 않는다. 반대로 {{user}}의 말이나 행동에 답하는 캐릭터의 대사·반응은 짧더라도 태깅한다. {{user}}에게 하는 직접 대사와 그에 밀접하게 연결된 행동·반응을 하나의 ⟦C:이름⟧...⟦/C⟧ 블록으로 묶는다. {{user}}에게 말을 거는 것, 질문이나 말에 답하는 것, 의미 있는 시선·몸짓·접촉, 무언가를 주거나 받는 행동, {{user}}를 향한 것이 분명한 행동이 포함된다. 대사와 연결된 행동은 함께 둔다. 행동만 마커 안에 넣고 대사를 밖에 두거나 그 반대로 하지 않는다. 여러 인물과 {{user}}가 실제로 함께 상호작용한다면 ⟦C:이름1,이름2⟧...⟦/C⟧를 쓴다. 짧은 상호작용이라도 누락하지 않는다. 예: {{user}}가 미오이고 하연이 미오에게 대답하면 ⟦C:하연⟧대사⟦/C⟧로 감싸지만, 하연이 설지에게 하는 대사는 마커 밖에 둔다.",
  "",
  "출력 형식",
  "평소의 이야기 답변에 인라인 마커만 넣어 출력한다. 마커에 대한 설명, 서문, 요약을 덧붙이지 않고 코드 블록도 사용하지 않는다. T 마커 하나로 시작한다. S는 첫 장면이거나 상황이 실질적으로 바뀔 때만 추가한다. {{user}}와 직접 상호작용하는 인물의 대사·행동은 C로 묶는다. 모든 S/C 블록을 닫는다. S나 T를 C 안에 넣지 않고, C를 S 안에 넣지 않는다. 직접 상호작용에 해당하지 않는 일반 서술은 블록 밖에 둔다.",
  "",
  "전송 전 확인",
  "• T가 맨 처음에 정확히 한 번 있으며, 이미 확정된 시간과 모순되지 않는다.",
  "• S는 최초 장면 또는 실질적인 변화에만 있으며, 변화 없는 장면에서는 생략한다.",
  "• {{user}}와 직접 상호작용하는 모든 내용을 C 안에 넣고, 연결된 대사와 행동을 함께 둔다.",
  "• 이름과 장면 정보는 대화 맥락에 근거하며, 모든 블록이 닫혀 있고 서로 겹치지 않는다."
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
