//@name dusk_atelier_theme_builder
//@display-name Dusk Atelier 테마 빌더
//@api 3.0
//@version 0.1.0
//@update-url https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/parts-updates/parts/theme-builder.js
//@allowed-ipc dusk_atelier
(()=>{function l(e,r,...t){const n=e==="svg"||r?.svg?document.createElementNS("http://www.w3.org/2000/svg",e):document.createElement(e);if(r){for(const[s,a]of Object.entries(r)){if(a===void 0||a===null||a===false||s==="svg")continue;if(s==="class")n.setAttribute("class",Array.isArray(a)?a.filter(Boolean).join(" "):a);else if(s==="style"){if(typeof a==="string")n.style.cssText=a;else for(const[o,i]of Object.entries(a)){if(i===void 0||i===null)continue;if(o.startsWith("--"))n.style.setProperty(o,i);else n.style[o]=i}}else if(s==="ref")a(n);else if(s==="dataset")Object.assign(n.dataset,a);else if(s.startsWith("on")&&typeof a==="function")n.addEventListener(s.slice(2).toLowerCase(),a);else if(s==="value"&&"value"in n)n.value=a;else if(s==="checked"&&"checked"in n)n.checked=!!a;else if(a===true)n.setAttribute(s,"");else n.setAttribute(s,String(a))}}at(n,t);return n}function at(e,r){for(const t of r.flat(Infinity)){if(t===null||t===void 0||t===false||t===true)continue;e.appendChild(t instanceof Node?t:document.createTextNode(String(t)))}return e}function pr(e){while(e.firstChild)e.removeChild(e.firstChild);return e}function b(e,...r){pr(e);return at(e,r)}var ot=typeof document!=="undefined"?document.createElement("template"):null;function it(e){ot.innerHTML=e.trim();return ot.content.firstChild}var lt={module:'<path d="M12 2 3 7l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',character:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',preset:'<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><circle cx="7.5" cy="7" r="1"/><circle cx="16.5" cy="17" r="1"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',tools:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5Z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',upload:'<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M20 21H4"/>',download:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M20 21H4"/>',plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',back:'<path d="m15 18-6-6 6-6"/>',chevron:'<path d="m9 6 6 6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',up:'<path d="m18 15-6-6-6 6"/>',more:'<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',grip:'<circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none"/>',folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',folderPlus:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 11v5"/><path d="M9.5 13.5h5"/>',check:'<path d="M20 6 9 17l-5-5"/>',alert:'<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',brush:'<path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L11 15.8 8.2 13Z"/><path d="M7 14c-2 0-3.5 1.5-3.5 3.5 0 1.2-.7 2-1.5 2.5 1 .7 2.3 1 3.5 1 2.5 0 4.5-2 4.5-4.5Z"/>',palette:'<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-7.8-9-7.8Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',refresh:'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',plugin:'<path d="M9 3h6v3a2 2 0 1 0 4 0V3"/><path d="M5 7h14v4h-2a2 2 0 1 0 0 4h2v6H5v-6h2a2 2 0 1 0 0-4H5Z"/>',code:'<path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/><path d="m13.5 4-3 16"/>',link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',message:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',sliders:'<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',text:'<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>',minus:'<path d="M5 12h14"/>',split:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',list:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'};function Z(e,r=18,t=""){const n=lt[e]??lt.module;return it(`<svg xmlns="http://www.w3.org/2000/svg" width="${r}" height="${r}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${t?` style="${t}"`:""}>${n}</svg>`)}function k(e,{kind:r="",size:t="",icon:n,onClick:s,title:a,disabled:o,id:i,labelClass:c}={}){return l("button",{type:"button",class:["rb-btn",r,t],onClick:s,title:a,disabled:o,id:i},n?Z(n,16):null,e?l("span",{class:c},e):null)}function we(e,r,{onClick:t,boxed:n,id:s}={}){return l("button",{type:"button",class:["rb-icon-btn",n&&"boxed"],"aria-label":r,title:r,onClick:t,id:s},Z(e,18))}function ke(e,{label:r,onChange:t,disabled:n}={}){const s=l("button",{type:"button",class:"rb-switch",role:"switch","aria-checked":e?"true":"false","aria-label":r,disabled:n},l("span"));s.addEventListener("click",a=>{a.stopPropagation();if(s.disabled)return;t?.(s.getAttribute("aria-checked")!=="true",s)});return s}function Se(e,{pressed:r,count:t,onClick:n}={}){return l("button",{type:"button",class:"rb-chip","aria-pressed":r?"true":"false",onClick:n},e,t!==void 0?l("small",null,String(t)):null)}var $e=(e,r)=>l("div",{class:["rb-note",e],role:e==="err"?"alert":"status"},Z(e==="err"?"alert":e==="warn"?"alert":"info",18),l("span",null,r));function ct(e,r){return new Promise(t=>{const n=e.ownerDocument.activeElement;const s=l("div",{class:"rb-modal"});const a=c=>{s.remove();e.ownerDocument.removeEventListener("keydown",o,true);n?.focus?.();t(c)};const o=c=>{if(c.key==="Escape"){c.stopPropagation();a(null)}};const i=r(a);s.appendChild(i);s.addEventListener("mousedown",c=>{if(c.target===s)a(null)});e.ownerDocument.addEventListener("keydown",o,true);e.appendChild(s);(i.querySelector("[data-autofocus]")??i.querySelector("input,button.primary,button"))?.focus()})}function ie(e,{title:r,label:t,value:n="",ok:s="확인",placeholder:a=""}){let o;return ct(e,i=>{o=l("input",{class:"rb-input",value:n,placeholder:a,"aria-label":t??r,"data-autofocus":"1"});o.addEventListener("keydown",c=>{if(c.key==="Enter"&&!c.isComposing){c.preventDefault();i(o.value)}});setTimeout(()=>o.select(),0);return l("div",{class:"rb-dialog",role:"dialog","aria-modal":"true","aria-label":r},l("h3",{class:"rb-h3"},r),t?l("span",{class:"rb-label"},t):null,o,l("div",{class:"btns"},k("취소",{onClick:()=>i(null)}),k(s,{kind:"primary",onClick:()=>i(o.value)})))})}function D(e,r,t,n){const s=l("div",{class:"rb-seg",role:"radiogroup","aria-label":n});const a=o=>s.querySelectorAll("button").forEach(i=>i.setAttribute("aria-checked",i.dataset.v===o?"true":"false"));for(const[o,i]of e)s.appendChild(l("button",{type:"button",role:"radio",dataset:{v:o},onClick:()=>{a(o);t(o)}},i));a(r);return s}var $n=typeof Intl!=="undefined"?new Intl.Collator("ko",{numeric:true,sensitivity:"base"}):null;var mr=new Set(["oaiTTSConfig","oaiVoice","voicevoxConfig","naittsConfig","gptSoVitsConfig","fishSpeechConfig","elevenLabsConfig","hfTTS","ttsReadOnlyQuoted","translatorNote","doNotChangeSeperateModels","escapeOutput","coldstorage","coldStoragedChats"]);var dt=new Set(["type","chaId","chats","chatFolders","chatPage","firstMsgIndex","notes","ttsMode","ttsSpeech","removedQuotes","postHistoryInstructions","imported","lastInteraction","trashTime","modules","memoryPresetId","supaMemory","realmId","scriptstate","reloadKeys","chatImageGenRefs","chatImageGenRefsVersion","chatImageGenGroups","chatImageGenStyleGroups","chatImageGenAppearance","additionalAssetManifest",...mr]);var gr=["name","image","desc","firstMessage","alternateGreetings","personality","scenario","exampleMessage","systemPrompt","replaceGlobalNote","creatorNotes","backgroundHTML","defaultVariables","additionalText","emotionImages"];var On=new Set([...gr,"globalLore","customscript","triggerscript","additionalAssets","characterVersion","additionalData","modification_date"]);var Qn=new Set("and break do else elseif end false for function goto if in local nil not or repeat return then true until while".split(" "));var Lr={lore:"globalLore",regex:"customscript",trigger:"triggerscript",asset:"additionalAssets",emotion:"emotionImages"};var to=[...Object.values(Lr),"alternateGreetings","group_only_greetings"];var W=Uint8Array;var xt=Uint16Array;var Nr=Int32Array;var Rr=new W([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]);var Br=new W([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]);var Ko=new W([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);var yt=function(e,r){var t=new xt(31);for(var n=0;n<31;++n){t[n]=r+=1<<e[n-1]}var s=new Nr(t[30]);for(var n=1;n<30;++n){for(var a=t[n];a<t[n+1];++a){s[a]=a-t[n]<<5|n}}return{b:t,r:s}};var vt=yt(Rr,2);var _r=vt.b;var Dr=vt.r;_r[28]=258,Dr[258]=28;var wt=yt(Br,0);var Uo=wt.b;var Vo=wt.r;var Hr=new xt(32768);for(m=0;m<32768;++m){z=(m&43690)>>1|(m&21845)<<1;z=(z&52428)>>2|(z&13107)<<2;z=(z&61680)>>4|(z&3855)<<4;Hr[m]=((z&65280)>>8|(z&255)<<8)>>1}var z;var m;var le=new W(288);for(m=0;m<144;++m)le[m]=8;var m;for(m=144;m<256;++m)le[m]=9;var m;for(m=256;m<280;++m)le[m]=7;var m;for(m=280;m<288;++m)le[m]=8;var m;var Wr=new W(32);for(m=0;m<32;++m)Wr[m]=5;var m;var Kr=new W(0);var Ur=typeof TextDecoder!="undefined"&&new TextDecoder;var Vr=0;try{Ur.decode(Kr,{stream:true});Vr=1}catch(e){}var kt=[["submodel","보조 모델"],["model","메인 모델"],["otherAx","기타 보조 작업 모델"],["translate","번역 모델"],["memory","메모리 모델"],["emotion","감정 모델"],["static","모델 ID 직접 입력"]];async function St(e,r,t,n){const s={messages:r,mode:t?.mode&&t.mode!=="static"?t.mode:"submodel",allowPlugins:true};if(t?.mode==="static"&&t.staticModel)s.staticModel=t.staticModel;let a=null;for(let o=1;o<=3;o++){if(n?.aborted)throw new Error("AI 작업을 취소했어요.");try{const i=await e.runLLMModel(s);if(n?.aborted)throw new Error("AI 작업을 취소했어요.");const c=typeof i==="string"?i:i?.type==="success"&&typeof i.result==="string"?i.result:null;if(c?.trim())return c.trim();a=new Error(typeof i?.result==="string"?i.result:"모델이 본문을 돌려주지 않았어요.")}catch(i){if(n?.aborted)throw i;a=i}await new Promise(i=>setTimeout(i,1200))}throw a??new Error("AI 응답을 받지 못했어요.")}var $t="rbm:themes:v1";var Ct=[{k:"bg",label:"배경",type:"color",def:"#14121f",group:"색"},{k:"panel",label:"패널",type:"color",def:"#1c1a2c",group:"색"},{k:"border",label:"테두리",type:"color",def:"#3b3659",group:"색"},{k:"accent",label:"강조",type:"color",def:"#7c5cf0",group:"색"},{k:"accent2",label:"강조 2 (그라데이션 끝)",type:"color",def:"#4f7cf7",group:"색"},{k:"text",label:"글자",type:"color",def:"#ecebf6",group:"글자"},{k:"sub",label:"보조 글자",type:"color",def:"#9d99c1",group:"글자"},{k:"italic",label:"기울임(행동)",type:"color",def:"#b8acff",group:"글자"},{k:"bold",label:"굵게",type:"color",def:"#ffffff",group:"글자"},{k:"quote",label:"대사(따옴표)",type:"color",def:"#e8c9a6",group:"글자"},{k:"userBubble",label:"내 말풍선",type:"color",def:"#2c2942",group:"말풍선"},{k:"botBubble",label:"봇 말풍선",type:"color",def:"#1b1930",group:"말풍선"},{k:"font",label:"글꼴",type:"font",def:"",group:"글자"},{k:"size",label:"글자 크기",type:"range",min:12,max:22,step:1,unit:"px",def:15,group:"글자"},{k:"line",label:"줄 간격",type:"range",min:1.2,max:2.2,step:.05,unit:"",def:1.7,group:"글자"},{k:"radius",label:"모서리 둥글기",type:"range",min:0,max:28,step:1,unit:"px",def:14,group:"말풍선"},{k:"gap",label:"메시지 간격",type:"range",min:0,max:32,step:1,unit:"px",def:12,group:"말풍선"},{k:"width",label:"채팅 최대 너비",type:"range",min:560,max:1400,step:20,unit:"px",def:900,group:"말풍선"}];var Gr=()=>Object.fromEntries(Ct.map(e=>[e.k,e.def]));var R={risu:{id:"risu",label:"일반 리스",vars:{"--risu-theme-bgcolor":"bg","--risu-theme-darkbg":"panel","--risu-theme-borderc":"border","--risu-theme-darkborderc":"border","--risu-theme-selected":"accent","--risu-theme-textcolor":"text","--risu-theme-textcolor2":"sub","--risu-theme-darkbutton":"panel","--FontColorStandard":"text","--FontColorItalic":"italic","--FontColorBold":"bold","--FontColorItalicBold":"italic","--FontColorQuote1":"quote","--FontColorQuote2":"quote"},selectors:{chat:".risu-chat",user:".risu-chat[data-role=user], .risu-chat.user",bot:".risu-chat[data-role=char], .risu-chat.char",text:".chattext",list:".chat-width",input:".input-text, textarea#messageInput"},dbCss:"customCSS",dbHtml:"guiHTML"},pocket:{id:"pocket",label:"포켓리스",vars:{"--risu-theme-bgcolor":"bg","--risu-theme-darkbg":"panel","--risu-theme-borderc":"border","--risu-theme-selected":"accent","--risu-theme-textcolor":"text","--risu-theme-textcolor2":"sub","--FontColorStandard":"text","--FontColorItalic":"italic","--FontColorBold":"bold","--FontColorQuote1":"quote","--FontColorQuote2":"quote"},selectors:{chat:".risu-chat > div",user:".risu-chat > div:not(:has(.chat-width))",bot:".risu-chat > div:has(> .chat-width)",text:".chattext",list:".risu-chat",input:"textarea"},dbCss:"customCSS",dbHtml:"guiHTML"}};var qr=Object.keys(R);async function Oe(e,r){try{const t=await r?.getRuntimeInfo?.().catch(()=>null);if(t?.platform==="node")return"pocket";if(/pocket|bard/i.test(globalThis.navigator?.userAgent??""))return"pocket";if(e&&await e.querySelector("[class*=pocket], #pocket-app, [class*=bard]"))return"pocket";const n=String(globalThis.location?.hostname??"");if(/(^|\.)risuai\.xyz$/i.test(n)||globalThis.__TAURI__||globalThis.__TAURI_INTERNALS__)return"risu";if(t?.platform&&/^(web|tauri|capacitor|android|ios|desktop)$/i.test(t.platform))return"risu"}catch{}return"pocket"}function ze(){return{v:1,target:null,themes:{risu:[],pocket:[]},active:{risu:null,pocket:null}}}async function Te(e){try{const r=await e.pluginStorage.getItem($t);const t=r?JSON.parse(r):null;if(!t||t.v!==1)return ze();const n=ze();for(const s of qr){n.themes[s]=Array.isArray(t.themes?.[s])?t.themes[s].map(a=>Mt(a,s)):[];n.active[s]=t.active?.[s]??null}n.target=R[t.target]?t.target:null;n.forceApply=!!t.forceApply;if(t.dbBackup)n.dbBackup=t.dbBackup;return n}catch{return ze()}}async function Ee(e,r){await e.pluginStorage.setItem($t,JSON.stringify(r))}var Jr=()=>"th_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);function Mt(e,r){const t={...Gr(),...e?.tokens??{}};return{id:e?.id||Jr(),name:String(e?.name||"새 테마"),target:r,tokens:t,selectors:{...R[r].selectors,...e?.selectors??{}},css:String(e?.css??""),html:String(e?.html??""),useTokens:e?.useTokens!==false,...e?.builder?{builder:{...e.builder}}:{},updated:e?.updated??Date.now()}}function ce(e,r="새 테마"){return Mt({name:r},e)}var K=e=>typeof e==="number"?e+"px":e;function Zr(e){if(!e)return"";return/[,'"]/.test(e)?e:`'${e}', sans-serif`}function It(e){const r=R[e.target];const t=e.tokens,n=e.selectors;const s=Object.entries(r.vars).map(([i,c])=>`  ${i}: ${t[c]};`).join("\n");const a=Zr(t.font);if(e.useTokens===false)return[`/* Dusk Theme · ${e.name} · ${r.label} */`,e.css.trim()].join("\n");const o=[`/* Dusk Theme · ${e.name} · ${r.label} */`,`:root {
${s}
  --dusk-accent: ${t.accent};
  --dusk-accent2: ${t.accent2};
  --dusk-radius: ${K(t.radius)};
}`,`body { background: ${t.bg}; color: ${t.text};${a?` font-family: ${a};`:""} }`,n.list?`${n.list} { max-width: ${K(t.width)}; margin-left: auto; margin-right: auto; }`:"",n.chat?`${n.chat} { margin-bottom: ${K(t.gap)}; border-radius: ${K(t.radius)}; }`:"",n.user?`${n.user} { background: ${t.userBubble}; }`:"",n.bot?`${n.bot} { background: ${t.botBubble}; border: 1px solid ${t.border}; }`:"",n.text?`${n.text} { font-size: ${K(t.size)}; line-height: ${t.line}; color: ${t.text}; }
${n.text} em { color: ${t.italic}; }
${n.text} strong { color: ${t.bold}; }
${n.text} q, ${n.text} .quote, ${n.text} mark[risu-mark^=quote], ${n.text} mark[risu-mark^=blockquote] { color: ${t.quote}; background: transparent; }`:"",n.input?`${n.input} { background: ${t.panel}; color: ${t.text}; border: 1px solid ${t.border}; border-radius: ${K(Math.max(6,t.radius-4))}; }`:""].filter(Boolean);if(e.css.trim())o.push("/* 직접 쓴 CSS */",e.css.trim());return o.join("\n")}function At(e,r){let t=e.replace(/\{\{\s*(role|char|user|date|time)\s*\}\}/gi,(s,a)=>r[a.toLowerCase()]??"");const n=/\{\{#(?:when|if)::([^}]*?)\}\}((?:(?!\{\{#(?:when|if)::)[\s\S])*?)\{\{\/(?:when|if)\}\}/;for(let s=0;s<50&&n.test(t);s++)t=t.replace(n,(a,o,i)=>{const c=o.split("::");let d;if(c[1]==="is")d=c[0].trim()===c.slice(2).join("::").trim();else if(c[1]==="isnot")d=c[0].trim()!==c.slice(2).join("::").trim();else d=!!c[0].trim()&&c[0].trim()!=="0"&&c[0].trim()!=="false";const[h,g=""]=i.split(/\{\{:else\}\}/);return d?h:g});return t}var C=(e,r=0,t=1)=>Math.min(t,Math.max(r,e));function Rt(e){let r=String(e||"").replace("#","").trim();if(r.length===3)r=[...r].map(t=>t+t).join("");if(!/^[0-9a-f]{6}$/i.test(r))r="7c5cf0";return[0,2,4].map(t=>parseInt(r.slice(t,t+2),16)/255)}var je=e=>"#"+e.map(r=>Math.round(C(r)*255).toString(16).padStart(2,"0")).join("");var Bt=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4;var Lt=e=>e<=.0031308?12.92*e:1.055*e**(1/2.4)-.055;function U(e){const[r,t,n]=Rt(e).map(Bt);const s=Math.cbrt(.4122214708*r+.5363325363*t+.0514459929*n);const a=Math.cbrt(.2119034982*r+.6806995451*t+.1073969566*n);const o=Math.cbrt(.0883024619*r+.2817188376*t+.6299787005*n);const i=.2104542553*s+.793617785*a-.0040720468*o;const c=1.9779984951*s-2.428592205*a+.4505937099*o;const d=.0259040371*s+.7827717662*a-.808675766*o;return{l:i,c:Math.hypot(c,d),h:(Math.atan2(d,c)*180/Math.PI+360)%360}}function zt({l:e,c:r,h:t}){const n=t*Math.PI/180,s=r*Math.cos(n),a=r*Math.sin(n);const o=(e+.3963377774*s+.2158037573*a)**3;const i=(e-.1055613458*s-.0638541728*a)**3;const c=(e-.0894841775*s-1.291485548*a)**3;return[4.0767416621*o-3.3077115913*i+.2309699292*c,-1.2684380046*o+2.6097574011*i-.3413193965*c,-.0041960863*o-.7034186147*i+1.707614701*c]}function v(e,r,t){let n=r;for(let s=0;s<24;s++){const a=zt({l:e,c:n,h:t});if(a.every(o=>o>=-1e-4&&o<=1+1e-4))return je(a.map(Lt));n*=.85}return je(zt({l:e,c:0,h:t}).map(s=>Lt(C(s))))}function Fe(e){const[r,t,n]=Rt(e).map(Bt);return .2126*r+.7152*t+.0722*n}function V(e,r){const[t,n]=[Fe(e),Fe(r)].sort((s,a)=>a-s);return(t+.05)/(n+.05)}function Q(e,r,t=4.5){if(V(e,r)>=t)return e;const n=U(e),s=Fe(r)<.18;for(let a=1;a<=40;a++){const o=C(n.l+(s?1:-1)*a*.02);const i=v(o,n.c,n.h);if(V(i,r)>=t)return i}return s?"#ffffff":"#111111"}function ee(e,r="dark",t=50){const n=.35+1.3*C(t,0,100)/100;const s=U(e),a=s.h,o=Math.min(s.c*(.55+.9*C(t,0,100)/100),.24),i=Math.min(s.c,.2)*n;const c=r==="dark";const d=c?{bg:v(.17,i*.12,a),paper:v(.22,i*.16,a),tint:v(.27,i*.28,a),line:v(.34,i*.22,a),ink:v(.93,i*.05,a),muted:v(.72,i*.12,a),accent:v(C(s.l,.62,.8),o,a),accent2:v(C(s.l,.62,.8),o,(a+40)%360)}:{bg:v(.95,i*.08,a),paper:v(.985,i*.04,a),tint:v(.93,i*.2,a),line:v(.87,i*.15,a),ink:v(.27,i*.12,a),muted:v(.5,i*.15,a),accent:v(C(s.l,.45,.6),o,a),accent2:v(C(s.l,.45,.6),o,(a+40)%360)};d.ink=Q(d.ink,d.paper,7);d.muted=Q(d.muted,d.paper,4.5);d.accentText=Q(d.accent,d.paper,4.5);d.onAccent=V("#ffffff",d.accent)>=V("#111111",d.accent)?"#ffffff":"#111111";d.userBubble=Yr(d.accent,d,c);d.userBubble2=v(U(d.userBubble).l,U(d.userBubble).c,(U(d.userBubble).h+40)%360);d.onUser=Q(Q(d.onAccent,d.userBubble,4.5),d.userBubble2,4.5);d.shadow=(.04+.14*C(t,0,100)/100).toFixed(3);return d}function Yr(e,r,t){const n=U(e);return v(t?.42:.55,Math.min(n.c,.14),n.h)}var Qr="{{#when::{{role}}::is::char}}{{char}}{{:else}}{{user}}{{/when}}";var Xr=`<div class="dt dt-{{role}} dt--h{{date::HH}}">
  <div class="dt-card">
    <div class="dt-head">
      <span class="dt-clock">{{date::HH}}</span>
      <div class="dt-av"><risuicon></risuicon></div>
      <div class="dt-meta"><span class="dt-name">${Qr}</span><span class="dt-date">{{date}}</span></div>
    </div>
    <div class="dt-body"><risutextbox></risutextbox></div>
    <div class="dt-foot"><risugeninfo></risugeninfo><risubuttons></risubuttons></div>
  </div>
</div>`;var en=`.dt,.dt *,.dt *::before,.dt *::after{box-sizing:border-box}
.dt{--risu-font-family:var(--t-font-body);--FontColorStandard:var(--t-ink);--FontColorBold:var(--t-ink);--FontColorItalic:var(--t-muted);--FontColorItalicBold:var(--t-muted);--FontColorQuote1:var(--t-muted);--FontColorQuote2:var(--t-accent-text);
position:relative;display:block;width:100%;max-width:var(--t-card-width);min-width:0;margin:0 auto var(--t-gap);color:var(--t-ink);font-family:var(--t-font-body);font-size:var(--t-font-size);line-height:var(--t-line-height);text-align:left}
.dt-card{position:relative;width:100%;min-width:0}
.dt-head{display:flex;align-items:center;gap:12px;min-width:0}
.dt-av{position:relative;flex:none;width:var(--t-avatar-size);height:var(--t-avatar-size);border-radius:var(--t-avatar-radius);overflow:hidden;background:var(--t-tint)}
.dt-av>*{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;margin:0!important;border:0!important;border-radius:inherit!important;box-shadow:none!important;background-size:cover!important;background-position:center 25%!important}
.dt-av img{object-fit:cover!important;object-position:center 25%!important}
.dt-clock{display:none}
.dt-meta{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0}
.dt-name{--risu-font-family:var(--t-font-display);font-family:var(--t-font-display);font-weight:700;color:var(--t-ink);overflow-wrap:anywhere}
.dt-date{font-size:.78em;color:var(--t-muted);white-space:nowrap}
.dt-body{width:100%;max-width:var(--t-text-width);min-width:0;color:var(--t-ink);overflow-wrap:anywhere;word-break:keep-all}
.dt-body .chattext{--tw-prose-body:var(--t-ink);--tw-prose-headings:var(--t-ink);--tw-prose-bold:var(--t-ink);--tw-prose-links:var(--t-accent-text);--tw-prose-quotes:var(--t-muted);--tw-prose-bullets:var(--t-muted);--tw-prose-counters:var(--t-muted);--tw-prose-code:var(--t-ink);--tw-prose-pre-code:var(--t-ink);--tw-prose-pre-bg:var(--t-tint);max-width:none;color:var(--t-ink);font-size:var(--t-font-size)!important;line-height:var(--t-line-height)!important;word-break:keep-all}
.dt-body :is(p,li,td,th,blockquote){font-size:var(--t-font-size);line-height:var(--t-line-height)}
.dt-body p{margin:0 0 .9em}
.dt-body .chattext>:first-child{margin-top:0}
.dt-body .chattext>:last-child,.dt-body p:last-child{margin-bottom:0}
.dt-body :is(h1,h2,h3,h4,h5,h6){--risu-font-family:var(--t-font-display);font-family:var(--t-font-display);margin:1.2em 0 .5em;color:var(--t-ink);font-weight:700;line-height:1.4}
.dt-body h1{font-size:calc(var(--t-font-size)*1.55)}
.dt-body h2{font-size:calc(var(--t-font-size)*1.32)}
.dt-body h3{font-size:calc(var(--t-font-size)*1.15)}
.dt-body :is(h4,h5,h6){font-size:var(--t-font-size)}
.dt-body strong{color:var(--t-ink);font-weight:700}
.dt-body em{color:var(--t-muted)}
.dt-body mark[risu-mark],.dt-body mark,.dt-body q{background:transparent}
.dt-body mark:is([risu-mark=quote2],[risu-mark=blockquote2]),.dt-body q{color:var(--t-accent-text)}
.dt-body mark:is([risu-mark=quote1],[risu-mark=blockquote1]){color:var(--t-muted)}
.dt-body mark:is([risu-mark=blockquote1],[risu-mark=blockquote2]){display:block;margin:.5em 0;padding:.4em .9em;border-left:2px solid var(--t-accent);background:color-mix(in srgb,var(--t-accent) 9%,transparent)}
.dt-body a{color:var(--t-accent-text);text-decoration:underline}
.dt-body blockquote{margin:.9em 0;padding:.4em 1em;border-left:3px solid var(--t-line);color:var(--t-muted);font-style:normal}
.dt-body blockquote p::before,.dt-body blockquote p::after{content:none}
.dt-body :is(ul,ol){margin:.8em 0;padding-left:1.5em}
.dt-body li{margin:.2em 0;color:var(--t-ink)}
.dt-body li p{margin:0}
.dt-body li::marker{color:var(--t-accent-text)}
.dt-body hr{height:1px;margin:1.3em 0;border:0;background:linear-gradient(90deg,transparent,var(--t-line),transparent)}
.dt-body code{--risu-font-family:ui-monospace,Consolas,monospace;font-family:ui-monospace,Consolas,monospace;font-size:.88em;padding:.1em .35em;border-radius:4px;color:var(--t-ink);background:var(--t-tint)}
.dt-body code::before,.dt-body code::after{content:none}
.dt-body pre{max-width:100%;margin:.9em 0;padding:12px 14px;overflow-x:auto;border:1px solid var(--t-line);border-radius:6px;background:var(--t-tint);color:var(--t-ink);font-size:calc(var(--t-font-size)*.88);line-height:1.6}
.dt-body pre code{padding:0;background:none;color:inherit;font-size:inherit;white-space:pre;overflow-wrap:normal}
.dt-body table{display:block;max-width:100%;overflow-x:auto;margin:.9em 0;border-collapse:collapse}
.dt-body :is(th,td){padding:.4em .7em;border-bottom:1px solid var(--t-line);color:var(--t-ink);text-align:left;vertical-align:top}
.dt-body th{font-weight:700}
.dt-body :is(img,video){display:block;max-width:100%;height:auto;margin:.6em auto;border-radius:6px}
.dt-body textarea.message-edit-area{display:block;width:100%;max-width:100%;min-width:0;min-height:120px;padding:8px 10px;color:var(--t-ink)!important;background:color-mix(in srgb,var(--t-paper) 85%,var(--t-tint))!important;border:1px dashed var(--t-line);border-radius:6px;font:inherit;font-size:var(--t-font-size)!important;line-height:var(--t-line-height)!important}
.dt-foot{--risu-theme-textcolor2:var(--t-muted);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;width:100%;min-width:0;margin-top:10px;font-size:12px;color:var(--t-muted)}
.dt-foot>*{min-width:0;max-width:100%}
.dt-foot>:last-child{margin-left:auto}
.dt-foot>:first-child>div{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;align-items:center!important;gap:4px!important;min-width:0!important}
.dt-foot>:last-child>div,.dt-foot>:last-child>div>div{flex-wrap:wrap;gap:2px;min-width:0}
.dt-foot button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:30px;min-height:30px;margin:0;padding:0 6px;border-radius:999px;color:var(--t-muted);background:transparent;transition:background-color .2s,color .2s}
.dt-foot button svg{flex:none;width:15px;height:15px}
.dt-foot button:hover{background:var(--t-tint);color:var(--t-accent-text)}
.dt-foot .button-icon-remove:hover{color:#e5484d}
.dt-foot .button-icon-translate.text-blue-400{background:var(--t-tint);color:var(--t-accent-text)}
.dt :is(a,button,textarea):focus-visible{outline:2px solid var(--t-accent);outline-offset:2px}
.dt ::selection{color:var(--t-on-accent);background:var(--t-accent)}
@media (max-width:600px){.dt{margin-bottom:calc(var(--t-gap)*.7)}}
@media (pointer:coarse){.dt-foot button{min-width:38px;min-height:38px}}
@media (prefers-reduced-motion:reduce){.dt *,.dt *::before,.dt *::after{animation:none!important;transition:none!important}}`;var Ot=`.dt-body,.dt-foot{margin-inline:auto;max-width:var(--t-text-width)}`;var G=[{id:"letter",name:"편지",desc:"종이 위에 쓴 편지. 명조, 넉넉한 여백, 우표 같은 프로필",mode:"light",accent:"#9a6b4f",vars:{radius:4,fontSize:15.5,lineHeight:1.95,cardWidth:820,gap:26,avatarSize:56,avatarRadius:3},font:"serif",avatar:"stamp",css:`.dt-card{background:var(--t-paper);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(24px*var(--t-space)) calc(30px*var(--t-space)) calc(16px*var(--t-space))}
.dt-head{border-bottom:1px solid var(--t-line);padding-bottom:calc(12px*var(--t-space));margin-bottom:calc(16px*var(--t-space))}
.dt-av{order:2;margin-left:auto}
.dt-name{font-size:1.15em;letter-spacing:.02em}
.dt-date{font-style:italic}
.dt-user .dt-card{background-color:var(--t-tint)}
.dt-foot{border-top:1px dotted var(--t-line);padding-top:8px}
${Ot}
@media (max-width:600px){.dt-card{padding:16px 16px 12px}}`,deco:[{id:"lines",name:"줄 노트",on:true,css:`.dt-body{background-image:repeating-linear-gradient(transparent 0 calc(var(--t-font-size)*var(--t-line-height) - 1px),var(--t-tint) 0 calc(var(--t-font-size)*var(--t-line-height)))}
.dt-user .dt-body{background-image:repeating-linear-gradient(transparent 0 calc(var(--t-font-size)*var(--t-line-height) - 1px),var(--t-line) 0 calc(var(--t-font-size)*var(--t-line-height)))}`},{id:"salute",name:"To. / From.",on:true,css:`.dt-name::before{content:"To. ";font-weight:400;color:var(--t-muted)}
.dt-char .dt-name::before{content:"From. "}`},{id:"shadow",name:"종이 그림자",on:true,css:`.dt-card{box-shadow:0 1px 0 var(--t-line),0 8px 26px rgb(0 0 0/var(--t-shadow))}`},{id:"seal",name:"봉인 도장",on:false,css:`.dt-char .dt-card::after{content:"";position:absolute;right:22px;bottom:-12px;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 35%,var(--t-accent2),var(--t-accent));box-shadow:0 2px 4px rgb(0 0 0/.25)}`}]},{id:"messenger",name:"메신저",desc:"익숙한 메신저 말풍선. 내 말은 오른쪽, 대표색 풍선",mode:"dark",accent:"#7c5cf0",vars:{radius:18,fontSize:15,lineHeight:1.65,cardWidth:860,gap:12,avatarSize:34,avatarRadius:50},font:"sans",avatar:"circle",css:`.dt-card{display:flex;flex-direction:column;align-items:flex-start}
.dt-head{gap:8px;margin:0 0 6px}
.dt-meta{flex-direction:row;align-items:baseline;gap:8px}
.dt-name{font-size:.88em;font-weight:600}
.dt-body{max-width:min(82%,var(--t-text-width));margin-left:calc(var(--t-avatar-size) + 8px);background:var(--t-paper);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(10px*var(--t-space)) calc(14px*var(--t-space))}
.dt-foot{width:auto;max-width:calc(100% - var(--t-avatar-size) - 8px);margin-left:calc(var(--t-avatar-size) + 8px);margin-top:4px;justify-content:flex-start}
.dt-user .dt-card{align-items:flex-end}
.dt-user .dt-head{flex-direction:row-reverse}
.dt-user .dt-meta{flex-direction:row-reverse}
.dt-user .dt-body{margin-left:0;margin-right:calc(var(--t-avatar-size) + 8px);background:var(--t-user-bubble);border-color:transparent}
.dt-user .dt-foot{margin-left:0;margin-right:calc(var(--t-avatar-size) + 8px);justify-content:flex-end}
.dt-user .dt-body,.dt-user .dt-body .chattext,.dt-user .dt-body em,.dt-user .dt-body strong,.dt-user .dt-body mark,.dt-user .dt-body q{color:var(--t-on-user)}
@media (max-width:600px){.dt-body{max-width:92%}}`,deco:[{id:"tail",name:"말풍선 꼬리",on:true,css:`.dt-body{border-top-left-radius:4px}
.dt-user .dt-body{border-top-left-radius:var(--t-radius);border-top-right-radius:4px}`},{id:"name",name:"이름 표시",on:true,css:"",off:`.dt-name{display:none}`},{id:"grad",name:"그라데이션 풍선",on:false,css:`.dt-user .dt-body{background:linear-gradient(135deg,var(--t-user-bubble),var(--t-user-bubble2))}`},{id:"shadow",name:"떠 있는 풍선",on:false,css:`.dt-body{box-shadow:0 3px 12px rgb(0 0 0/var(--t-shadow))}`}]},{id:"card",name:"미니멀 카드",desc:"군더더기 없는 카드. 얇은 선, 왼쪽 대표색 줄",mode:"dark",accent:"#4f9cf7",vars:{radius:12,fontSize:15,lineHeight:1.75,cardWidth:860,gap:14,avatarSize:36,avatarRadius:10},font:"sans",avatar:"style",css:`.dt-card{background:var(--t-paper);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(14px*var(--t-space)) calc(18px*var(--t-space)) calc(10px*var(--t-space))}
.dt-head{margin-bottom:calc(10px*var(--t-space))}
.dt-meta{flex-direction:row;align-items:center;gap:10px}
.dt-name{font-size:.9em;letter-spacing:.03em}
.dt-date{margin-left:auto}
.dt-user .dt-card{background:var(--t-tint)}
${Ot}`,deco:[{id:"bar",name:"왼쪽 대표색 줄",on:true,css:`.dt-card{border-left:3px solid var(--t-accent)}
.dt-user .dt-card{border-left-color:var(--t-muted)}`},{id:"dot",name:"이름 앞 점",on:true,css:`.dt-meta::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--t-accent)}
.dt-user .dt-meta::before{background:var(--t-muted)}`},{id:"caps",name:"대문자 이름",on:true,css:`.dt-name{text-transform:uppercase}`},{id:"glow",name:"은은한 빛",on:false,css:`.dt-char .dt-card{box-shadow:0 0 0 1px color-mix(in srgb,var(--t-accent) 25%,transparent),0 8px 28px color-mix(in srgb,var(--t-accent) 18%,transparent)}`}]},{id:"diary",name:"밤의 일기",desc:"별이 뜬 밤하늘 일기장. 우표 프로필, 날짜 배지, 점선 구분, 가운데 글줄",mode:"dark",accent:"#6a7cf0",vars:{radius:14,fontSize:15,lineHeight:1.85,cardWidth:960,gap:22,avatarSize:92,avatarRadius:3},font:"sans",avatar:"stamp",css:`.dt-card{border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(20px*var(--t-space)) calc(26px*var(--t-space)) calc(10px*var(--t-space));background:linear-gradient(160deg,color-mix(in srgb,var(--t-accent) 14%,var(--t-paper)),var(--t-paper) 55%)}
.dt-head{align-items:flex-end;gap:16px;padding-bottom:calc(16px*var(--t-space));margin-bottom:calc(20px*var(--t-space));border-bottom:1px dashed var(--t-line)}
.dt-meta{gap:8px;padding-bottom:4px}
.dt-name{font-size:.72em;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--t-muted)}
.dt-char .dt-name::before{content:"FROM · ";opacity:.7}
.dt-user .dt-name::before{content:"TO · ";opacity:.7}
.dt-date{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border:1px solid var(--t-line);border-radius:99px;font-size:.74em;color:var(--t-muted)}
.dt-date::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--t-accent)}
.dt-foot{max-width:none;margin-top:calc(16px*var(--t-space));padding-top:8px;border-top:1px dashed var(--t-line)}
.dt-body{margin-inline:auto;max-width:var(--t-text-width)}
.dt-user .dt-card{background:linear-gradient(160deg,color-mix(in srgb,var(--t-accent2) 12%,var(--t-tint)),var(--t-tint) 55%)}
.dt-user .dt-head{flex-direction:row-reverse}
.dt-user .dt-meta{align-items:flex-end}
@media (max-width:600px){.dt-card{padding:14px 14px 8px}.dt-av{width:64px;height:64px}}`,deco:[{id:"stars",name:"별 반짝임",on:true,css:`.dt-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:.55;background:radial-gradient(1px 1px at 22% 18%,var(--t-ink),transparent),radial-gradient(1px 1px at 68% 9%,var(--t-ink),transparent),radial-gradient(1.5px 1.5px at 86% 26%,var(--t-accent2),transparent),radial-gradient(1px 1px at 47% 4%,var(--t-ink),transparent),radial-gradient(1px 1px at 93% 7%,var(--t-ink),transparent)}`},{id:"frame",name:"그라데이션 테두리",on:true,css:`.dt-card{border-color:color-mix(in srgb,var(--t-accent) 35%,var(--t-line))}
.dt-card::after{content:"";position:absolute;left:18px;right:18px;top:-1px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--t-accent),var(--t-accent2),transparent)}`},{id:"quote",name:"대사 강조색",on:true,css:`.dt-body q,.dt-body mark{color:var(--t-accent2)}`},{id:"shadow",name:"깊은 그림자",on:true,css:`.dt-card{box-shadow:0 14px 40px rgb(0 0 0/calc(var(--t-shadow)*2.2))}`}]},{id:"novel",name:"비주얼 노벨",desc:"게임 대사창. 이름표가 붙은 반투명 상자, 상자 안 큰 초상화",mode:"dark",accent:"#e07a9a",vars:{radius:10,fontSize:15.5,lineHeight:1.8,cardWidth:900,gap:24,avatarSize:96,avatarRadius:10},font:"round",avatar:"style",css:`.dt{padding-top:16px}
.dt-card{display:grid;grid-template-columns:var(--t-avatar-size) minmax(0,1fr);column-gap:calc(18px*var(--t-space));align-items:start;background:color-mix(in srgb,var(--t-paper) 90%,transparent);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(24px*var(--t-space)) calc(20px*var(--t-space)) calc(10px*var(--t-space))}
.dt-head{display:contents}
.dt-av{grid-column:1;grid-row:1/3;border:2px solid var(--t-line);box-shadow:0 6px 18px rgb(0 0 0/var(--t-shadow))}
.dt-meta{position:absolute;top:-15px;left:calc(var(--t-avatar-size) + 30px);flex-direction:row;align-items:center;gap:8px;padding:4px 14px;border-radius:calc(var(--t-radius)*.8);background:var(--t-accent);box-shadow:0 3px 10px rgb(0 0 0/var(--t-shadow))}
.dt-name{color:var(--t-on-accent);font-size:.9em}
.dt-date{color:var(--t-on-accent);opacity:.75;font-size:.72em}
.dt-body{grid-column:2;grid-row:1}
.dt-foot{grid-column:2;grid-row:2}
.dt-user .dt-card{grid-template-columns:minmax(0,1fr) var(--t-avatar-size)}
.dt-user .dt-av{grid-column:2}
.dt-user .dt-body,.dt-user .dt-foot{grid-column:1}
.dt-user .dt-meta{left:auto;right:calc(var(--t-avatar-size) + 30px);background:var(--t-muted)}
.dt-user .dt-name,.dt-user .dt-date{color:var(--t-paper)}
@media (max-width:600px){.dt-card{--t-avatar-size:56px;column-gap:12px;padding:22px 12px 8px}.dt-meta{left:12px}.dt-user .dt-meta{right:12px}}`,deco:[{id:"arrow",name:"다음 표시 ▼",on:true,css:`.dt-char .dt-body::after{content:"▼";display:block;text-align:right;font-size:10px;color:var(--t-accent-text);animation:dt-blink 1.4s ease-in-out infinite}
@keyframes dt-blink{50%{opacity:.25}}`},{id:"glass",name:"유리 느낌",on:true,css:`.dt-card{backdrop-filter:blur(8px)}`},{id:"line",name:"윗줄 강조",on:false,css:`.dt-card{border-top:3px solid var(--t-accent)}`},{id:"corner",name:"모서리 장식",on:false,css:`.dt-card::after{content:"";position:absolute;right:8px;bottom:8px;width:14px;height:14px;border-right:2px solid var(--t-accent);border-bottom:2px solid var(--t-accent);border-radius:0 0 4px 0;opacity:.7}`}]}];var O=e=>G.find(r=>r.id===e)??G[0];var fe=[["style","스타일 기본"],["circle","원"],["stamp","우표"],["polaroid","폴라로이드"],["none","없음"]];var _t={circle:`.dt-av{display:block;border-radius:50%}`,stamp:`.dt-av{display:block;padding:4px;background:var(--t-paper);border:2px dashed var(--t-line);border-radius:3px;box-shadow:0 2px 6px rgb(0 0 0/.12);transform:rotate(3deg)}
.dt-av>*{border-radius:2px}`,polaroid:`.dt-av{display:block;width:calc(var(--t-avatar-size) + 4px);height:calc(var(--t-avatar-size) + 14px);padding:4px 4px 14px;box-sizing:border-box;background:#fbfaf6;border-radius:2px;box-shadow:0 3px 10px rgb(0 0 0/.22);transform:rotate(-3deg)}
.dt-av>*{border-radius:1px}`,none:`.dt-av{display:none!important}`};var tn=`@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");`;var de=e=>`@import url("https://fonts.googleapis.com/css2?${e}&display=swap");`;var te=[{id:"style",name:"스타일 기본"},{id:"serif",name:"감성 명조",imp:de("family=Gowun+Batang:wght@400;700&family=Noto+Serif+KR:wght@600;700"),body:"'Gowun Batang','Noto Serif KR','Nanum Myeongjo',serif",display:"'Noto Serif KR','Gowun Batang',serif",size:.3},{id:"sans",name:"깔끔 고딕",imp:tn,body:"'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif",display:"'Pretendard','Noto Sans KR',sans-serif",size:0},{id:"round",name:"동글 고딕",imp:de("family=Gowun+Dodum"),body:"'Gowun Dodum','Noto Sans KR',sans-serif",display:"'Gowun Dodum','Noto Sans KR',sans-serif",size:.3},{id:"hand",name:"손글씨",imp:de("family=Gaegu:wght@400;700"),body:"'Gaegu','Nanum Pen Script',cursive",display:"'Gaegu',cursive",size:2},{id:"mono",name:"타자기",imp:de("family=Nanum+Gothic+Coding:wght@400;700"),body:"'Nanum Gothic Coding','D2Coding',monospace",display:"'Nanum Gothic Coding',monospace",size:-.5}];var Tt=e=>te.find(r=>r.id===e&&r.body);var X=[["narrow","좁게","620px"],["normal","보통","720px"],["wide","넓게","860px"],["full","꽉 차게","100%"]];var Dt=[["vivid","차분","화려"],["round","각지게","둥글게"],["space","촘촘","여유"]];function ue(e="letter"){const r=O(e);return{v:2,style:r.id,accent:r.accent,mode:r.mode,vivid:50,round:50,space:50,avatar:"style",font:"style",width:"normal",deco:Object.fromEntries(r.deco.map(t=>[t.id,t.on]))}}var rn=/^#[0-9a-f]{6}$/i;var Pe=(e,r)=>Number.isFinite(+e)?Math.round(C(+e,0,100)):r;function T(e){const r=e&&typeof e==="object"?e:{};const t=O(String(r.style??"").toLowerCase());const n=ue(t.id);let s=String(r.accent??"").trim();if(/^#?[0-9a-f]{3}$/i.test(s))s="#"+[...s.replace("#","")].map(o=>o+o).join("");if(/^[0-9a-f]{6}$/i.test(s))s="#"+s;const a={...n.deco};if(Array.isArray(r.deco))for(const o of Object.keys(a))a[o]=r.deco.includes(o);else if(r.deco&&typeof r.deco==="object"){for(const o of Object.keys(a))if(typeof r.deco[o]==="boolean")a[o]=r.deco[o]}return{v:2,style:t.id,accent:rn.test(s)?s.toLowerCase():n.accent,mode:r.mode==="light"||r.mode==="dark"?r.mode:n.mode,vivid:Pe(r.vivid,50),round:Pe(r.round,50),space:Pe(r.space,50),avatar:fe.some(([o])=>o===r.avatar)?r.avatar:"style",font:te.some(o=>o.id===r.font)?r.font:"style",width:X.some(([o])=>o===r.width)?r.width:"normal",deco:a,...typeof r.aiCss==="string"&&r.aiCss.trim()?{aiCss:pe(r.aiCss)}:{}}}var Et=`.risu-chat>div:has(.dt){padding:.5rem 1rem;margin:auto;display:flex;justify-content:center;align-items:center;width:100%;box-sizing:border-box}
.risu-chat>div>div:has(>.dt),.risu-chat>div:has(.dt) div:has(>.dt){width:100%!important;max-width:100%!important;min-width:0!important;flex:1 1 0%!important;margin:auto;display:flex;justify-content:center;box-sizing:border-box}
@media (max-width:768px){.risu-chat>div:has(.dt){padding:.25rem}}`;var Pt={risu:`body,.bg-bgcolor{background:var(--t-bg)!important}
.risu-chat{background:transparent!important;border:0!important}
${Et}`,pocket:`body{background:var(--t-bg)!important}
.risu-chat,.risu-chat>div{background:transparent!important;border:0!important}
${Et}
.risu-chat>div:has(>.chat-width):has(.dt){flex-direction:column}
.risu-chat .chat-width{width:100%;max-width:var(--t-card-width);margin:0 auto;color:var(--t-muted);font-size:11px}`};var jt=(e,r)=>r<=2?0:Math.round(C(Math.max(e,2)*2**((r-50)/25),0,32));function nn(e,r){const t=T(e);const n=O(t.style);const s=ee(t.accent,t.mode,t.vivid);const a=n.vars;const o=t.space-50;const i=Tt(t.font==="style"?n.font:t.font)??Tt("sans");const c=t.avatar==="style"?n.avatar:t.avatar;const d={"--t-bg":s.bg,"--t-paper":s.paper,"--t-tint":s.tint,"--t-line":s.line,"--t-ink":s.ink,"--t-muted":s.muted,"--t-accent":s.accent,"--t-accent2":s.accent2,"--t-accent-text":s.accentText,"--t-on-accent":s.onAccent,"--t-user-bubble":s.userBubble,"--t-user-bubble2":s.userBubble2,"--t-on-user":s.onUser,"--t-shadow":s.shadow,"--t-radius":jt(a.radius,t.round)+"px","--t-font-size":+(a.fontSize+i.size+o/50*.6).toFixed(2)+"px","--t-line-height":+(a.lineHeight+o/50*.2).toFixed(2),"--t-space":+(1+o/50*.3).toFixed(2),"--t-card-width":t.width==="full"?"100%":Math.max(a.cardWidth,parseInt(X.find(([g])=>g===t.width)[2])+80)+"px","--t-text-width":X.find(([g])=>g===t.width)[2],"--t-gap":Math.round(a.gap*(1+o/50*.45))+"px","--t-avatar-size":a.avatarSize+"px","--t-avatar-radius":a.avatarRadius===50?"50%":jt(a.avatarRadius,t.round)+"px","--t-font-body":i.body,"--t-font-display":i.display,"--risu-theme-bgcolor":s.bg,"--risu-theme-darkbg":s.paper,"--risu-theme-borderc":s.line,"--risu-theme-darkborderc":s.line,"--risu-theme-selected":s.tint,"--risu-theme-textcolor":s.ink,"--risu-theme-textcolor2":s.muted,"--risu-theme-darkbutton":s.tint,"--FontColorStandard":s.ink,"--FontColorItalic":s.muted,"--FontColorBold":s.ink,"--FontColorQuote1":s.accentText,"--FontColorQuote2":s.accentText};const h=[i.imp,`/* Dusk Theme Builder · ${n.name} · ${r} */`,`:root{
${Object.entries(d).map(([g,M])=>`  ${g}: ${M};`).join("\n")}
}`,Pt[r]??Pt.risu,en,...t.aiCss?["/* AI 스타일 */",t.aiCss]:[n.css,...n.deco.map(g=>t.deco[g.id]?g.css:g.off??"")],t.aiCss&&t.avatar==="style"?"":_t[c]??""].filter(Boolean).join("\n");return{css:Wt(h),html:Xr,palette:s}}var sn=e=>e.replace(/\.dt(?=[-\w]*)/g,".x-risu-dt");function Ht(e){const r=[];let t=0,n="";for(const s of e){if(s==="(")t++;else if(s===")")t--;if(s===","&&t===0){r.push(n);n=""}else n+=s}r.push(n);return r}function Wt(e){let r="",t=0;while(t<e.length){const n=e.indexOf("{",t);if(n<0){r+=e.slice(t);break}const s=e.slice(t,n);let a=1,o=n+1;while(o<e.length&&a){if(e[o]==="{")a++;else if(e[o]==="}")a--;o++}const i=e.slice(n+1,o-1);const c=s.trim();if(/^@media|^@supports/i.test(c))r+=`${s}{${Wt(i)}}`;else if(c.startsWith("@")||!/\.dt/.test(c))r+=`${s}{${i}}`;else{const d=Ht(c.replace(/\/\*[\s\S]*?\*\//g,"")).map(g=>g.trim()).filter(Boolean);const h=[...d,...d.filter(g=>/\.dt/.test(g)).map(sn)];r+=`
${h.join(",")}{${i}}`}t=o}return r}function Kt(e,r,t=null){const n=T(e);const s=O(n.style);const{css:a,html:o,palette:i}=nn(n,r);const c=t??ce(r,s.name+" 테마");c.css=a;c.html=o;c.useTokens=false;c.builder=n;c.tokens={...c.tokens,bg:i.bg,panel:i.paper,border:i.line,accent:i.accent,accent2:i.accent2,text:i.ink,sub:i.muted,quote:i.accentText,userBubble:i.userBubble,botBubble:i.paper};c.updated=Date.now();return c}var on=/(^|;)\s*(position\s*:\s*(fixed|sticky)|behavio[u]?r\s*:|-moz-binding\s*:|content\s*:\s*url)[^;]*/gi;function an(e){return e.replace(/!important/gi,"").replace(/url\s*\([^)]*\)/gi,"none").replace(/expression\s*\(/gi,"(").replace(on,"$1").replace(/[<>]/g,"").trim()}var ln=e=>Ht(e).every(r=>/^\s*\.dt([-\w]*)?([\s.:>+~\[(]|$)/.test(r));function pe(e,r=0){let t=String(e??"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/@import[^;]*;?/gi,"").replace(/@charset[^;]*;?/gi,"");const n=[];let s=0;while(s<t.length){const a=t.indexOf("{",s);if(a<0)break;const o=t.slice(s,a).trim();let i=1,c=a+1;while(c<t.length&&i){if(t[c]==="{")i++;else if(t[c]==="}")i--;c++}const d=t.slice(a+1,c-1);s=c;if(/^@media\b/i.test(o)&&r===0){const h=pe(d,1);if(h)n.push(`${o.replace(/[<>{}]/g,"")}{
${h}
}`)}else if(/^@(-webkit-)?keyframes\s+dt-[\w-]+$/i.test(o)&&r===0){n.push(`${o}{${d.replace(/[<>]/g,"")}}`)}else if(!o.startsWith("@")&&ln(o)){const h=an(d);if(h)n.push(`${o.replace(/\s+/g," ")}{${h}}`)}}return n.join("\n").slice(0,16e3)}function Ft(e){const r=String(e??"");const t=r.match(/```(?:css)?\s*([\s\S]*?)```/i);return(t?t[1]:r.slice(Math.max(0,r.indexOf(".dt")))).trim()}var Ut=`You write CSS for a RisuAI chat theme. The SAME CSS must work in both original RisuAI and PocketRisu-family apps (PocketRisu, RisuBard...). The app already handles the outer differences; you ONLY style the message markup below.

Markup of every message (role is "char" or "user"). The avatar is INSIDE each message card for both roles:
<div class="dt dt-char|dt-user">                    full-width row (already width:100%, centered, max-width var(--t-card-width))
  <div class="dt-card">                             the message box
    <div class="dt-head">                           flex row: avatar + meta
      <div class="dt-av"><risuicon/></div>          avatar (an <img> or div inside)
      <div class="dt-meta"><span class="dt-name"/><span class="dt-date"/></div>
    </div>
    <div class="dt-body"><risutextbox/></div>       message text: p, em, strong, mark, q, code, img, a, ul, blockquote; may be wrapped in .chattext
    <div class="dt-foot"><risugeninfo/><risubuttons/></div>   small icon buttons (regenerate, edit, delete...)
  </div>
</div>

Platform facts (RisuAI): <risuicon> renders a div with INLINE width/height/min-width and a background-image; the base layer already forces it to fill .dt-av, so just size/shape .dt-av. .chattext and the edit textarea have inline font-size; the base already fixes them to the variables. Dialogue appears as mark[risu-mark="quote2"] ("…") and mark[risu-mark="quote1"] ('…'); style those for character. The root also has class dt--hHH (00~23, current hour) if you want time-of-day variations. The actions menu popup is rendered outside the card, so do not style it.
A base layer already exists: .dt is a full-width block; .dt-head is a flex row; .dt-av sized by vars with overflow hidden; .dt-meta is a column; text color/size/line-height from vars; .dt-foot is a small muted row with space-between.
Keep the avatar inside .dt-card. User messages must stay full width (never shrink-wrap or stick to one side unless it is a deliberate bubble layout with align-items:flex-end).

Variables you MUST use for all colors, sizes and fonts (never hard-code colors except transparent / rgb(0 0 0/x) for shadows):
--t-bg --t-paper --t-tint --t-line --t-ink --t-muted --t-accent --t-accent2 --t-accent-text --t-on-accent --t-user-bubble --t-user-bubble2 --t-on-user (text on user bubble) --t-shadow (0~0.2 alpha number, use as rgb(0 0 0/var(--t-shadow)))
--t-radius --t-font-size --t-line-height --t-text-width (max width of .dt-body, already applied) --t-space (spacing multiplier, use calc(Npx*var(--t-space))) --t-gap --t-card-width --t-avatar-size --t-avatar-radius --t-font-body --t-font-display
color-mix(in srgb, var(--t-accent) 30%, transparent) is allowed.

Rules (anything breaking them is deleted automatically):
- Every selector starts with .dt, .dt-char, .dt-user, .dt-av, .dt-card, .dt-head, .dt-meta, .dt-name, .dt-date, .dt-body, .dt-foot (descendants allowed, e.g. ".dt-user .dt-body p"). No :root, html, body, .risu-chat, or app classes.
- No @import, no url(), no !important, no position:fixed/sticky. position:absolute only inside an element you set position:relative on.
- ::before/::after with text or gradients for decoration are welcome. @keyframes names must start with dt- and stay subtle.
- Text must stay readable: text on --t-paper/--t-tint uses --t-ink/--t-muted; text on user bubble uses --t-on-user (also set it for em, strong, mark inside).
- Must not break on a 360px wide phone: add @media (max-width:600px) to shrink paddings/avatar or stack; never fixed widths wider than 100%; use max-width and min-width:0.
- Keep .dt-foot buttons visible and clickable; do not hide .dt-body or .dt-foot; overflow-wrap for long words.
- Both roles must look intentionally different (char vs user).`;function Vt(e,r){const t=T(r);return[{role:"system",content:`${Ut}

Design a NEW, distinctive, polished style that matches the request. Think like a senior UI designer: clear hierarchy, consistent spacing, tasteful decoration, no clutter.
Reply with ONE \`\`\`css code block only. Under 160 lines.`},{role:"user",content:`Request: ${String(e||"").slice(0,600)}
(Colors come from an accent ${t.accent} in ${t.mode} mode via the variables.)`}]}function Gt(e,r){return[{role:"system",content:`${Ut}

You are editing an existing style. Change ONLY what the request asks; keep everything else exactly as it is. Reply with the FULL updated CSS in ONE \`\`\`css code block only.`},{role:"user",content:`Current CSS:
\`\`\`css
${String(r).slice(0,14e3)}
\`\`\`

Request: ${String(e||"").slice(0,600)}`}]}function qt(e){const r=T(e);if(r.aiCss)return r.aiCss;const t=O(r.style);const n=r.avatar==="style"?t.avatar:r.avatar;return[t.css,...t.deco.map(s=>r.deco[s.id]?s.css:s.off??""),_t[n]??""].filter(Boolean).join("\n")}async function Ne(e,r){let t=await r(e);let n=pe(Ft(t));if((n.match(/\{/g)??[]).length<4){t=await r([...e,{role:"assistant",content:String(t).slice(0,2e3)},{role:"user",content:"Most rules were invalid or missing (selectors must start with .dt..., no url/!important/@import). Reply again with the full CSS in one ```css block only."}]);n=pe(Ft(t));if((n.match(/\{/g)??[]).length<4)throw new Error("쓸 수 있는 CSS를 받지 못했어요. 더 큰 모델로 해 보세요")}return n}function cn(e){const r={style:G.map(s=>`${s.id}=${s.name}(${s.desc})`),deco:Object.fromEntries(G.map(s=>[s.id,s.deco.map(a=>`${a.id}=${a.name}`)])),avatar:fe.map(([s,a])=>`${s}=${a}`),font:te.map(s=>`${s.id}=${s.name}`)};const t={style:"letter",accent:"#8a5a44",mode:"light",vivid:35,round:30,space:75,avatar:"stamp",font:"serif",deco:["lines","salute","shadow"],name:"오후의 편지"};const n={style:"messenger",accent:"#ff6fa8",mode:"dark",vivid:85,round:90,space:40,avatar:"circle",font:"round",deco:["tail","name","grad"],name:"네온 수다"};return[{role:"system",content:`You pick options for a chat theme builder. Reply with ONE JSON object only, no prose, no code fence.
Keys: style (enum), width (narrow|normal|wide|full: text column width), accent ("#rrggbb"), mode ("light"|"dark"), vivid/round/space (integers 0-100: calm→flashy, sharp→round, dense→airy), avatar (enum), font (enum), deco (array of deco ids of the chosen style), name (short Korean title).
Catalog: ${JSON.stringify(r)}
Example: ${JSON.stringify(t)}
Example: ${JSON.stringify(n)}`},{role:"user",content:String(e||"").slice(0,600)}]}function Nt(e){let r=String(e??"").replace(/```(?:json)?/gi,"");const t=r.indexOf("{"),n=r.lastIndexOf("}");if(t<0||n<=t)throw new Error("JSON을 찾지 못했어요");r=r.slice(t,n+1);try{return JSON.parse(r)}catch{return JSON.parse(r.replace(/,\s*([}\]])/g,"$1").replace(/'/g,'"').replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g,'$1"$2":'))}}async function Re(e,r){const t=cn(e);let n=await r(t),s;try{s=Nt(n)}catch(o){n=await r([...t,{role:"assistant",content:String(n).slice(0,800)},{role:"user",content:`That was not valid JSON (${o.message}). Reply with the JSON object only.`}]);s=Nt(n)}const a=typeof s?.name==="string"?s.name.trim().slice(0,40):"";return{choice:T(s),name:a}}function Jt(e,r){const t=(n,s=r.muted)=>`<div style="height:4px;width:${n}%;border-radius:2px;background:${s};opacity:.7;margin-top:4px"></div>`;if(e==="letter")return`<div style="background:${r.bg};padding:10px;height:100%;box-sizing:border-box"><div style="background:${r.paper};border:1px solid ${r.line};border-radius:3px;padding:8px;position:relative"><div style="position:absolute;right:6px;top:-6px;width:14px;height:16px;border:1.5px dashed ${r.line};background:${r.tint};transform:rotate(4deg)"></div><div style="height:5px;width:40%;background:${r.ink};opacity:.8;border-radius:2px"></div>${t(90)}${t(80)}${t(60)}</div></div>`;if(e==="diary")return`<div style="background:${r.bg};padding:10px;height:100%;box-sizing:border-box"><div style="border:1px solid ${r.accent};border-radius:8px;padding:7px;background:${r.paper};position:relative"><div style="display:flex;gap:5px;align-items:center"><span style="width:14px;height:14px;border:1px dashed ${r.line};background:${r.tint}"></span><span style="height:6px;width:26px;border-radius:3px;border:1px solid ${r.line}"></span></div>${t(80)}${t(70)}</div></div>`;if(e==="novel")return`<div style="background:${r.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;gap:5px;align-items:flex-end"><span style="width:20px;height:30px;border-radius:4px;background:${r.tint};border:1px solid ${r.line};flex:none"></span><div style="flex:1;position:relative;background:${r.paper};border:1px solid ${r.line};border-radius:5px;padding:9px 6px 5px"><span style="position:absolute;top:-5px;left:5px;width:22px;height:8px;border-radius:3px;background:${r.accent}"></span>${t(90)}${t(60)}</div></div>`;if(e==="messenger")return`<div style="background:${r.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:6px"><div style="display:flex;gap:5px"><span style="width:14px;height:14px;border-radius:50%;background:${r.tint};flex:none"></span><div style="background:${r.paper};border:1px solid ${r.line};border-radius:3px 9px 9px 9px;padding:5px 7px;width:60%">${t(90)}${t(60)}</div></div><div style="align-self:flex-end;background:${r.userBubble};border-radius:9px 3px 9px 9px;padding:5px 7px;width:45%">${t(80,r.onUser)}</div></div>`;return`<div style="background:${r.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:6px"><div style="background:${r.paper};border:1px solid ${r.line};border-left:3px solid ${r.accent};border-radius:6px;padding:6px 8px">${t(30,r.accent)}${t(90)}${t(70)}</div><div style="background:${r.tint};border:1px solid ${r.line};border-left:3px solid ${r.muted};border-radius:6px;padding:6px 8px">${t(80)}</div></div>`}function Zt(e){const r=Array.from({length:24},()=>({n:0,r:0,g:0,b:0}));for(let n=0;n<e.length;n+=16){if(e[n+3]<128)continue;const s=e[n],a=e[n+1],o=e[n+2];const i=Math.max(s,a,o),c=Math.min(s,a,o),d=i-c;if(i<40||i>245&&d<20||d/(i||1)<.25)continue;let h=i===s?(a-o)/d%6:i===a?(o-s)/d+2:(s-a)/d+4;const g=r[Math.floor((h*60+360)%360/15)];const M=d/255;g.n+=M;g.r+=s*M;g.g+=a*M;g.b+=o*M}const t=r.reduce((n,s)=>s.n>n.n?s:n);if(t.n<1)return null;return je([t.r/t.n/255,t.g/t.n/255,t.b/t.n/255])}function Yt(e,r=""){const t=JSON.stringify({...T(e),name:String(r).slice(0,40)});const n=btoa(String.fromCharCode(...new TextEncoder().encode(t)));return"DTB1:"+n}function Qt(e){const r=String(e??"").match(/DTB1:([A-Za-z0-9+/=]+)/);if(!r)throw new Error("테마 빌더 공유 코드(DTB1:…)가 아니에요");const t=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(r[1]),n=>n.charCodeAt(0))));return{choice:T(t),name:typeof t.name==="string"?t.name:""}}var re={studio:null,builder:null};function Xt(){if(!document.getElementById("rb-ts-style"))document.head.appendChild(l("style",{id:"rb-ts-style"},dn))}var dn=`
.rb-ttog{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:14px;background:var(--rb-surf);border:1px solid var(--rb-line);min-width:260px;isolation:isolate}
.rb-ttog button{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:7px;height:38px;border:0;background:transparent;color:var(--rb-sub);font-size:13.5px;cursor:pointer;border-radius:10px;transition:color .25s}
.rb-ttog button[aria-checked=true]{color:#fff;font-weight:700}
.rb-ttog-thumb{position:absolute;z-index:0;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:10px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);box-shadow:0 4px 14px rgba(124,92,240,.35);transition:transform .38s cubic-bezier(.34,1.45,.5,1)}
.rb-ttog[data-v=pocket] .rb-ttog-thumb{transform:translateX(100%)}
.rb-ttog-thumb.bump{animation:rb-ttog-bump .38s ease}
@keyframes rb-ttog-bump{0%{filter:brightness(1)}40%{filter:brightness(1.25);scale:1.04 .92}100%{filter:brightness(1);scale:1}}
@media (prefers-reduced-motion:reduce){.rb-ttog-thumb{transition:none}.rb-ttog-thumb.bump{animation:none}}
.rb-ts{display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:14px;flex:1;min-height:0}
.rb-ts-col{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto}
.rb-ts-field{display:flex;align-items:center;gap:10px;font-size:13px}
.rb-ts-field>span{flex:1;min-width:0}
.rb-ts-field input[type=color]{width:44px;height:30px;border:1px solid var(--rb-line);border-radius:8px;background:none;padding:2px;cursor:pointer}
.rb-ts-field input[type=range]{flex:1.4}
.rb-ts-field input[type=text]{flex:1.4;height:30px;border-radius:8px;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-text);padding:0 8px}
.rb-ts-field output{width:52px;text-align:right;color:var(--rb-sub);font-variant-numeric:tabular-nums}
.rb-ts-prev{display:flex;flex-direction:column;gap:8px;min-height:420px}
.rb-ts-frame{flex:1;display:flex;justify-content:center;background:repeating-conic-gradient(var(--rb-surf) 0 25%,transparent 0 50%) 0 0/18px 18px;border-radius:14px;padding:10px;min-height:400px}
.rb-ts-frame iframe{border:0;border-radius:12px;width:100%;height:100%;min-height:380px;background:#000;transition:width .35s cubic-bezier(.2,.7,.2,1)}
.rb-ts-frame.mobile iframe{width:380px;max-width:100%}
.rb-ts-errs{font-size:12.5px;color:#f0a0a0;line-height:1.6}
@media (max-width:760px){.rb-ts{grid-template-columns:1fr}.rb-ts-frame{min-height:340px}}
`;var pn=[["char",'어서 와. *창밖을 보며 찻잔을 내려놓는다.* **오늘은** 조금 늦었네? "기다렸어."'],["user","미안, 길이 좀 막혔어."],["char",'*고개를 젓는다.* 괜찮아. "앉아, 차가 식기 전에."']];var fn=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/"(.+?)"/g,'<mark risu-mark="quote2">"$1"</mark>');var un=":root{--risu-theme-bgcolor:#1c1c26;--risu-theme-darkbg:#15151d;--risu-theme-borderc:#3a3a4a;--risu-theme-darkborderc:#2a2a36;--risu-theme-selected:#4b4b63;--risu-theme-textcolor:#f0f0f5;--risu-theme-textcolor2:#a0a0b5;--risu-theme-darkbutton:#2a2a36;--FontColorStandard:#f0f0f5;--FontColorItalic:#a0a0b5;--FontColorBold:#fff;--FontColorQuote1:#a0a0b5;--FontColorQuote2:#e8c9a6}body{background:var(--risu-theme-bgcolor);color:var(--risu-theme-textcolor);font-family:sans-serif}.chattext em{color:var(--FontColorItalic)}.chattext strong{color:var(--FontColorBold)}.chattext mark{background:transparent;color:var(--FontColorQuote2)}button{font:inherit;color:inherit;background:var(--risu-theme-darkbutton);border:0;border-radius:6px;padding:4px 8px;cursor:pointer}";function Be(e,r,t){return e.replace(/<risutextbox\b[^>]*>\s*<\/risutextbox>|<risutextbox\b[^>]*\/?>/gi,`<div class="chattext prose" style="font-size:15px;line-height:1.7"><p>${fn(t)}</p></div>`).replace(/<risuicon\b[^>]*>\s*<\/risuicon>|<risuicon\b[^>]*\/?>/gi,`<div style="width:100%;height:100%;min-height:40px;background:${r==="user"?"linear-gradient(135deg,#6b7280,#374151)":"linear-gradient(135deg,#4f7cf7,#7c5cf0)"}"></div>`).replace(/<risugeninfo\b[^>]*>\s*<\/risugeninfo>|<risugeninfo\b[^>]*\/?>/gi,r==="char"?`<div style="display:flex;gap:6px;font-size:12px;color:var(--risu-theme-textcolor2)"><button>모델 · 1.2k 토큰</button></div>`:"").replace(/<risubuttons\b[^>]*>\s*<\/risubuttons>|<risubuttons\b[^>]*\/?>/gi,`<div style="display:flex;gap:4px;justify-content:flex-end"><div style="display:flex;gap:4px"><button title="편집">✎</button><button title="다시 생성">↻</button><button title="복사">⧉</button></div></div>`)}function er(e){const r=e.html.trim();const t=e.target==="pocket";const n={char:"아리아",user:"나"};const s=([h,g],M)=>{const ne={role:h,char:n.char,user:n.user,date:"2026. 10. 24.",time:"10:52"};const se=r?Be(At(r,ne),h,g):`<div style="display:flex;gap:10px;padding:10px 12px"><div style="width:40px;height:40px;flex:none;border-radius:10px;overflow:hidden">${Be("<risuicon></risuicon>",h,"")}</div><div style="flex:1;min-width:0"><b style="font-size:13px">${n[h]}</b>${Be("<risutextbox></risutextbox>",h,g)}</div></div>`;const oe=t&&h==="char"?`<div class="chat-width" style="font-size:11px;opacity:.7;padding:2px 12px"><span data-chat-turn-reference>#${M+1}</span></div>`:"";return`<div class="risu-chat" data-role="${h}"><div>${oe}<div>${se}</div></div></div>`};const a=t?"":`<div style="width:56px;flex:none;background:var(--risu-theme-darkbg);border-right:1px solid var(--risu-theme-borderc)"></div>`;const o=t?`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--risu-theme-borderc)"><span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4f7cf7,#7c5cf0)"></span><b>아리아</b></div>`:"";const i=`<div style="flex:1;overflow:auto;padding:8px 0">${pn.map(s).join("")}</div>`;const c=`<div style="padding:10px;border-top:1px solid var(--risu-theme-borderc)"><textarea rows="1" style="width:100%;box-sizing:border-box;padding:9px;background:var(--risu-theme-darkbg);color:inherit;border:1px solid var(--risu-theme-borderc);border-radius:8px">메시지 입력…</textarea></div>`;const d=`<div style="display:flex;height:100vh">${a}<div style="flex:1;min-width:0;display:flex;flex-direction:column">${o}${i}${c}</div></div>`;return`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>html,body{margin:0}${un}</style><style>${It(e).replace(/<\/style/gi,"<\\/style")}</style></head><body>${d}</body></html>`}var mn=["#9a6b4f","#c2557a","#e07a5f","#d4a72c","#5a9e6f","#3a9ca8","#4f9cf7","#7c5cf0","#8a8fa3"];var gn=`
.rb-tb{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:16px;flex:1;min-height:0}
.rb-tb-side{display:flex;flex-direction:column;gap:16px;overflow:auto;padding-right:4px}
.rb-tb-h{font-size:13px;font-weight:800;margin-bottom:8px}
.rb-tb-styles{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
.rb-tb-style{border:2px solid var(--rb-line);border-radius:12px;background:none;padding:0;cursor:pointer;overflow:hidden;text-align:left;color:inherit;transition:border-color .15s,transform .15s}
.rb-tb-style:hover{transform:translateY(-1px)}
.rb-tb-style[aria-pressed=true]{border-color:var(--rb-accent,#7c5cf0)}
.rb-tb-style .th{height:74px;pointer-events:none}
.rb-tb-style .nm{display:block;padding:6px 8px;font-size:12.5px;font-weight:700}
.rb-tb-sw{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rb-tb-sw button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-shadow:inset 0 0 0 1px rgb(0 0 0/.2)}
.rb-tb-sw button[aria-pressed=true]{border-color:var(--rb-text);transform:scale(1.08)}
.rb-tb-sw input[type=color]{width:34px;height:30px;border:1px solid var(--rb-line);border-radius:8px;background:none;padding:2px;cursor:pointer}
.rb-tb-pal{display:flex;height:22px;border-radius:8px;overflow:hidden;border:1px solid var(--rb-line)}
.rb-tb-pal span{flex:1}
.rb-tb-name{width:100%;box-sizing:border-box;height:34px;border-radius:9px;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-text);padding:0 10px}
.rb-tb-dial{display:grid;grid-template-columns:52px 1fr 52px;align-items:center;gap:8px;font-size:12px;margin-bottom:6px}
.rb-tb-dial span:last-child{text-align:right}
.rb-tb-dial input{width:100%;accent-color:var(--rb-accent,#7c5cf0)}
.rb-tb-chips{display:flex;flex-wrap:wrap;gap:6px}
.rb-tb-deco{display:flex;flex-direction:column;gap:6px}
.rb-tb-ai{border:1px solid var(--rb-line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--rb-surf)}
.rb-tb-ai textarea{width:100%;box-sizing:border-box;min-height:58px;resize:vertical;border-radius:9px;border:1px solid var(--rb-line);background:var(--rb-bg,transparent);color:var(--rb-text);padding:8px 10px;font:inherit;font-size:13px}
.rb-tb-ai select,.rb-tb-ai input{height:32px;border-radius:8px;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-text);padding:0 8px;min-width:0}
@media (max-width:760px){.rb-tb{grid-template-columns:1fr}.rb-tb-side{overflow:visible}}
`;var tr=false;async function rr(e){Xt();if(!tr){document.head.appendChild(l("style",null,gn));tr=true}const r=await Te(e.api);const t=await e.api.getRootDocument?.().catch(()=>null)??null;const n=r.target??await Oe(t,e.api);const s=r.themes[n];const a=s.find(f=>f.id===re.builder&&f.builder)??null;re.builder=null;let o=a?T(a.builder):ue("letter");let i=!!a;const c=l("input",{class:"rb-tb-name",type:"text",value:a?.name??O(o.style).name+" 테마","aria-label":"테마 이름"});let d=!!a;c.addEventListener("input",()=>d=true);const h=l("iframe",{title:"테마 미리보기",sandbox:"allow-same-origin"});const g=l("div",{class:"rb-ts-frame"},h);const M=l("div",{class:"rb-tb-styles",role:"group","aria-label":"스타일"});const ne=l("div",{class:"rb-tb-sw"});const se=l("div",{class:"rb-tb-pal",title:"만들어진 팔레트"});const oe=l("div",{class:"rb-muted",style:"font-size:12px;line-height:1.6"});const We=l("div");const Ke=l("div");const Ue=l("div");const me=l("div",{class:"rb-tb-deco"});const Ve=l("div");const Ge=l("div",{class:"rb-tb-chips",role:"group","aria-label":"프로필 모양"});const qe=l("div",{class:"rb-tb-chips",role:"group","aria-label":"글꼴"});let Je=false;const Ze=()=>Kt(o,n,a?structuredClone(a):null);let Ye=0;const q=()=>{clearTimeout(Ye);Ye=setTimeout(()=>h.srcdoc=er(Ze()),60)};const S=()=>{const f=ee(o.accent,o.mode,o.vivid);b(M,...G.map(p=>{const y=ee(i?o.accent:p.accent,i?o.mode:p.mode,o.vivid);const I=l("div",{class:"th"});I.innerHTML=Jt(p.id,y);return l("button",{type:"button",class:"rb-tb-style","aria-pressed":String(!o.aiCss&&o.style===p.id),title:p.desc,onClick:()=>{const w=ue(p.id);delete o.aiCss;o=i?{...o,style:p.id,deco:w.deco}:{...w,vivid:o.vivid,round:o.round,space:o.space,avatar:o.avatar,font:o.font};if(!d)c.value=p.name+" 테마";S()}},I,l("span",{class:"nm"},p.name))}));const u=l("input",{type:"color",value:o.accent,"aria-label":"직접 고르기",title:"직접 고르기"});u.addEventListener("input",()=>{o.accent=u.value;i=true;ge();q()});u.addEventListener("change",S);const x=l("input",{type:"file",accept:"image/*",style:"display:none"});x.addEventListener("change",async()=>{const p=x.files?.[0];if(!p)return;try{const y=await createImageBitmap(p);const I=Math.min(1,160/Math.max(y.width,y.height));const w=document.createElement("canvas");w.width=Math.max(1,Math.round(y.width*I));w.height=Math.max(1,Math.round(y.height*I));const nt=w.getContext("2d");nt.drawImage(y,0,0,w.width,w.height);const st=Zt(nt.getImageData(0,0,w.width,w.height).data);if(!st)return e.toast("뚜렷한 색을 찾지 못했어요");o.accent=st;i=true;S()}catch(y){e.toast(`사진을 읽지 못했어요: ${y?.message??y}`,{error:true})}});const F=k("사진에서",{size:"sm",icon:"image",title:"캐릭터 사진에서 대표색 뽑기",onClick:()=>x.click()});b(ne,...mn.map(p=>l("button",{type:"button",style:`background:${p}`,"aria-label":p,"aria-pressed":String(p===o.accent),onClick:()=>{o.accent=p;i=true;S()}})),u,F,x);b(We,D([["light","밝게"],["dark","어둡게"]],o.mode,p=>{o.mode=p;i=true;S()},"밝기"));b(Ue,...Dt.map(([p,y,I])=>{const w=l("input",{type:"range",min:"0",max:"100",step:"5",value:String(o[p]),"aria-label":`${y}↔${I}`});w.addEventListener("input",()=>{o[p]=+w.value;ge();q()});if(p==="vivid")w.addEventListener("change",S);return l("label",{class:"rb-tb-dial"},l("span",null,y),w,l("span",null,I))}));if(o.aiCss)b(me,l("div",{class:"rb-muted",style:"font-size:12px"},"AI 스타일을 쓰는 중이라 장식은 AI가 정했어요. 바꾸고 싶으면 위 'AI로 고치기'에 말해 주세요."));else b(me,...O(o.style).deco.map(p=>l("div",{style:"display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px"},l("span",null,p.name),ke(!!o.deco[p.id],{label:p.name,onChange:(y,I)=>{o.deco={...o.deco,[p.id]:y};I.setAttribute("aria-checked",String(y));q()}}))));b(Ve,D(X.map(([p,y])=>[p,y]),o.width,p=>{o.width=p;q()},"본문 너비"));b(Ge,...fe.map(([p,y])=>Se(y,{pressed:o.avatar===p,onClick:()=>{o.avatar=p;S()}})));b(qe,...te.map(p=>Se(p.name,{pressed:o.font===p.id,onClick:()=>{o.font=p.id;S()}})));ge(f);q()};const ge=(f=ee(o.accent,o.mode,o.vivid))=>{b(se,...["bg","paper","tint","line","muted","ink","accent","userBubble"].map(x=>l("span",{style:`background:${f[x]}`,title:x})));const u=V(f.ink,f.paper);b(oe,`${O(o.style).desc}. 글자 대비 ${u.toFixed(1)}:1 — 읽기 편하게 자동으로 맞췄어요.`)};b(Ke,D([["pc","PC"],["mobile","모바일"]],"pc",f=>{Je=f==="mobile";g.classList.toggle("mobile",Je)},"미리보기 크기"));let $={mode:"submodel",staticModel:""};try{$={...$,...JSON.parse(await e.api.pluginStorage.getItem("rbm:aiModel:v1")||"{}")}}catch{}const Qe=()=>e.api.pluginStorage.setItem("rbm:aiModel:v1",JSON.stringify({mode:$.mode,staticModel:$.staticModel})).catch(()=>{});const B=l("textarea",{placeholder:"예: 비 오는 밤 카페에서 쓰는 손편지 느낌, 차분한 남색","aria-label":"원하는 분위기"});const he=l("select",{"aria-label":"AI 모델"},...kt.map(([f,u])=>l("option",{value:f,selected:$.mode===f},u)));const ae=l("input",{type:"text",placeholder:"모델 ID",value:$.staticModel??"",style:$.mode==="static"?"flex:1":"display:none"});he.addEventListener("change",()=>{$.mode=he.value;ae.style.cssText=$.mode==="static"?"flex:1":"display:none";Qe()});ae.addEventListener("change",()=>{$.staticModel=ae.value.trim();Qe()});const P=l("div",{class:"rb-muted",style:"font-size:12px;line-height:1.6"});let be="new";const Xe=l("div");const et=l("div");const j=[];let xe=false;const ye=async(f,u)=>{if(xe)return;if($.mode==="static"&&!$.staticModel)return b(P,"모델 ID를 먼저 적어 주세요.");xe=true;ve.querySelectorAll("button").forEach(x=>x.disabled=true);b(P,f);try{j.push(structuredClone(o));if(j.length>10)j.shift();await u(x=>St(e.api,x,$));i=true;S()}catch(x){j.pop();b(P,`AI가 하지 못했어요: ${x?.message??x}`)}finally{xe=false;ve.querySelectorAll("button").forEach(x=>x.disabled=false);J()}};const ir=k("AI로 만들기",{kind:"primary",size:"sm",icon:"zap",onClick:()=>{if(!B.value.trim())return B.focus();if(be==="pick")return ye("AI가 고르는 중…",async f=>{const u=await Re(B.value,f);o=u.choice;if(u.name&&!d)c.value=u.name;b(P,"골랐어요. 아래에서 마음대로 더 바꿔도 돼요.")});return ye("AI가 새 스타일을 디자인하는 중… (큰 모델일수록 좋아요)",async f=>{const u=await Re(B.value,f).catch(()=>null);const x=u?{...u.choice,avatar:"style"}:{...o};const F=await Ne(Vt(B.value,x),f);o={...x,aiCss:F};if(u?.name&&!d)c.value=u.name;b(P,"새 스타일을 만들었어요. 일반 리스·포켓 계열 모두 같은 규칙으로 보여요. 고치고 싶은 곳은 아래에 말해 주세요.")})}});const _=l("input",{type:"text",placeholder:"예: 이름을 더 크게, 내 말풍선 모서리는 각지게","aria-label":"AI로 고칠 내용",style:"flex:1;min-width:160px"});const tt=k("AI로 고치기",{size:"sm",icon:"brush",onClick:()=>{if(!_.value.trim())return _.focus();ye("AI가 고치는 중…",async f=>{const u=await Ne(Gt(_.value,qt(o)),f);o={...o,aiCss:u};_.value="";b(P,"고쳤어요. 마음에 안 들면 '되돌리기'를 눌러요.")})}});_.addEventListener("keydown",f=>f.key==="Enter"&&!f.isComposing&&tt.click());const J=()=>{b(Xe,D([["new","새 스타일 만들기"],["pick","있는 스타일에서 고르기"]],be,f=>{be=f},"AI 방식"));b(et,o.aiCss||j.length?l("div",{style:"display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px"},o.aiCss?l("span",{class:"rb-muted"},"AI 스타일 사용 중"):null,j.length?k("되돌리기",{size:"sm",icon:"undo",onClick:()=>{o=j.pop();S();J();b(P,"되돌렸어요.")}}):null,o.aiCss?k("기본 스타일로",{size:"sm",onClick:()=>{j.push(structuredClone(o));delete o.aiCss;S();J()}}):null):"")};const ve=l("div",{class:"rb-tb-ai"},l("div",{class:"rb-tb-h",style:"margin:0"},"✨ AI"),Xe,B,l("div",{style:"display:flex;gap:6px;flex-wrap:wrap;align-items:center"},he,ae,ir),l("div",{style:"display:flex;gap:6px;flex-wrap:wrap;align-items:center;border-top:1px dashed var(--rb-line);padding-top:8px"},_,tt),et,P);J();const rt=async f=>{const u=Ze();u.name=c.value.trim()||u.name;const x=s.findIndex(F=>F.id===u.id);if(x>=0)s[x]=u;else s.push(u);try{await Ee(e.api,r)}catch(F){e.toast(`저장하지 못했어요: ${F?.message??F}`,{error:true});return}e.toast(a?"테마를 고쳤어요":"테마를 만들었어요. 스튜디오에서 적용하거나 더 다듬을 수 있어요");if(f){re.studio=u.id;e.go("settings","themestudio")}};const lr=l("div",{style:"display:flex;align-items:center;gap:10px;flex-wrap:wrap"},we("back","설정으로",{onClick:()=>e.go("settings")}),l("b",{style:"font-size:16px"},a?`테마 빌더 · ${a.name}`:"테마 빌더"),l("span",{class:"rb-muted",style:"font-size:12.5px"},R[n].label+"용"),l("div",{style:"margin-left:auto"},Ke));const cr=l("div",{class:"rb-tb-side"},ve,l("div",null,l("div",{class:"rb-tb-h"},"1. 스타일"),M),l("div",null,l("div",{class:"rb-tb-h"},"2. 대표색"),ne),l("div",null,l("div",{class:"rb-tb-h"},"3. 밝기"),We),l("div",{style:"display:flex;flex-direction:column;gap:6px"},se,oe),l("div",null,l("div",{class:"rb-tb-h"},"4. 분위기"),Ue),l("div",null,l("div",{class:"rb-tb-h"},"본문 너비"),Ve),l("div",null,l("div",{class:"rb-tb-h"},"5. 장식"),me),l("div",null,l("div",{class:"rb-tb-h"},"6. 프로필 모양"),Ge),l("div",null,l("div",{class:"rb-tb-h"},"7. 글꼴"),qe),l("div",null,l("div",{class:"rb-tb-h"},"이름"),c),l("div",{style:"display:flex;gap:8px;flex-wrap:wrap"},k("스튜디오에서 열기",{kind:"primary",icon:"check",onClick:()=>rt(true)}),k("저장만",{icon:"check",onClick:()=>rt(false)})),l("div",{style:"display:flex;gap:8px;flex-wrap:wrap"},k("공유 코드 복사",{size:"sm",icon:"link",onClick:async()=>{const f=Yt(o,c.value.trim());try{await navigator.clipboard.writeText(f);e.toast("공유 코드를 복사했어요. 받은 사람은 '코드로 불러오기'에 붙여 넣으면 돼요")}catch{await ie(e.win,{title:"공유 코드",label:"아래 글자를 복사해 주세요",value:f,ok:"닫기"})}}}),k("코드로 불러오기",{size:"sm",icon:"download",onClick:async()=>{const f=await ie(e.win,{title:"공유 코드 불러오기",label:"DTB1: 로 시작하는 코드를 붙여 넣어요",placeholder:"DTB1:…",ok:"불러오기"});if(!f)return;try{const u=Qt(f);o=u.choice;i=true;if(u.name){c.value=u.name;d=true}S();J();e.toast("불러왔어요")}catch(u){e.toast(u?.message??String(u),{error:true})}}})),$e("info","만든 테마는 스튜디오에서 적용하고, CSS·HTML을 직접 더 고칠 수도 있어요. 스튜디오에서 고친 뒤 빌더에서 다시 저장하면 직접 고친 부분은 덮어써져요."));const dr=l("div",{class:"rb-section",style:"flex:1;display:flex;flex-direction:column;gap:12px;min-height:0"},lr,l("div",{class:"rb-tb"},cr,g));b(e.main,l("div",{class:"rb-scroll",style:"flex:1;display:flex;flex-direction:column;padding:4px"},dr));S()}var nr=`
.rb-pp-wrap{position:relative;display:block;border-radius:12px;background:var(--rb-surf)}
.rb-pp-back{position:absolute;left:0;top:0;z-index:0;overflow:hidden;pointer-events:none;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;color:transparent}
.rb-pp-ta{position:relative;z-index:1;background:transparent !important}
.rb-pp-mark{color:transparent;background:color-mix(in srgb,var(--rb-acc-text) 16%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--rb-acc-text) 55%,transparent);border-radius:4px}
.rb-pp-bar{position:absolute;right:10px;bottom:10px;z-index:5;padding:7px 12px;border-radius:999px;border:1px solid var(--rb-line3);background:var(--rb-win);color:var(--rb-text);font-weight:600;font-size:13px;box-shadow:var(--rb-shadow);cursor:pointer}
.rb-pp-bar[hidden]{display:none}
.rb-pp-prev{padding:10px 12px;border-radius:10px;background:var(--rb-surf);border:1px solid var(--rb-line);font-size:13.5px;line-height:1.6;max-height:96px;overflow:auto;word-break:break-word}
`;var sr="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap";var or=`
*{box-sizing:border-box}
[hidden]{display:none !important}
html,body{margin:0;height:100%;background:transparent}
.rb-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--rb-backdrop);
  font:14px/1.5 'IBM Plex Sans KR',system-ui,-apple-system,'Segoe UI','Noto Sans KR',sans-serif;color:var(--rb-text);z-index:10}
.rb-root[hidden]{display:none}
.rb-root button,.rb-root input,.rb-root select,.rb-root textarea{font:inherit;color:inherit}
.rb-win{width:100%;max-width:min(1560px,100%);height:100%;max-height:min(1040px,100%);display:flex;flex-direction:column;overflow:hidden;
  border-radius:18px;background:var(--rb-win);border:1px solid var(--rb-line);box-shadow:var(--rb-shadow);position:relative}
.rb-scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--rb-line3) transparent}
.rb-scroll::-webkit-scrollbar{width:10px;height:10px}.rb-scroll::-webkit-scrollbar-thumb{background:var(--rb-line3);border-radius:10px;border:3px solid var(--rb-win)}

/* 머리줄 */
.rb-head{height:64px;flex-shrink:0;display:flex;align-items:center;gap:14px;padding:0 20px;border-bottom:1px solid var(--rb-line2)}
.rb-brand{display:flex;align-items:center;gap:12px;width:184px;flex-shrink:0}
.rb-logo{width:34px;height:34px;border-radius:10px;background:var(--rb-acc-grad);color:var(--rb-on-acc);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rb-brand b{display:block;font-size:15px;font-weight:700;line-height:1.2}.rb-brand small{display:block;font-size:11px;color:var(--rb-sub)}
.rb-search{flex:1;max-width:420px;height:40px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-sub)}
.rb-search:focus-within{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-search input{flex:1;min-width:0;background:transparent;border:0;outline:none;font-size:14px;color:var(--rb-text)}
.rb-search input::placeholder{color:var(--rb-mute)}
.rb-kbd{font-size:11px;color:var(--rb-mute);border:1px solid var(--rb-line);border-radius:6px;padding:1px 6px}
.rb-spacer{flex:1}

/* 버튼 */
.rb-btn{height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:12px;border:1px solid var(--rb-line3);
  background:var(--rb-surf);color:var(--rb-text);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,filter .15s,transform .08s}
@media (hover: hover){.rb-btn:hover{background:var(--rb-hover)}}
.rb-btn:focus-visible,.rb-chip:focus-visible,.rb-nav a:focus-visible,.rb-switch:focus-visible,.rb-icon-btn:focus-visible{outline:2px solid var(--rb-focus);outline-offset:2px}
.rb-row:focus-visible{outline:2px solid var(--rb-focus);outline-offset:-2px}
.rb-btn.primary{border:0;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-weight:600}
@media (hover: hover){.rb-btn.primary:hover{filter:brightness(1.08)}}
.rb-btn.ghost{border-color:transparent;background:transparent;color:var(--rb-sub)}
@media (hover: hover){.rb-btn.ghost:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-btn.danger{border:0;background:var(--rb-danger-soft);color:var(--rb-danger);font-weight:600}
.rb-btn.lg{height:44px;padding:0 20px}
.rb-btn.sm{height:32px;padding:0 12px;border-radius:10px;font-size:13px}
.rb-btn[disabled]{opacity:.5;cursor:not-allowed;filter:none}
.rb-icon-btn{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;border:0;background:transparent;color:var(--rb-sub);cursor:pointer;flex-shrink:0;transition:background .15s,color .15s,transform .08s}
@media (hover: hover){.rb-icon-btn:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-icon-btn.boxed{border:1px solid var(--rb-line3);background:var(--rb-surf)}

/* 본문 3단 */
.rb-body{flex:1;display:flex;min-height:0}
.rb-nav{width:216px;flex-shrink:0;padding:16px 12px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--rb-line2)}
.rb-nav a{height:44px;display:flex;align-items:center;gap:12px;padding:0 12px;border-radius:12px;color:var(--rb-sub);text-decoration:none;font-size:14px;font-weight:500;cursor:pointer}
@media (hover: hover){.rb-nav a:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-nav a[aria-current=page]{background:var(--rb-sel-bg);color:var(--rb-text);font-weight:600}
.rb-nav a[aria-current=page] svg{color:var(--rb-acc-text)}
.rb-nav a span{flex:1}.rb-nav a small{font-size:12px;color:var(--rb-sub)}
.rb-nav-card{padding:14px;border-radius:14px;background:var(--rb-surf);border:1px solid var(--rb-line);display:flex;flex-direction:column;gap:6px}
.rb-nav-hint{padding:12px 4px 0;font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-main{flex:1;min-width:0;display:flex;flex-direction:column}
.rb-detail{width:380px;flex-shrink:0;border-left:1px solid var(--rb-line2);padding:20px;display:flex;flex-direction:column;gap:18px}

/* 칩·배지 */
.rb-chips{display:flex;align-items:center;gap:8px;padding:16px 20px 12px;flex-wrap:wrap}
.rb-chips.rb-fchips{padding-top:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}
.rb-chips.rb-fchips .rb-chip{flex-shrink:0}
.rb-chip{height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--rb-line);background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
@media (hover: hover){.rb-chip:hover{color:var(--rb-text);border-color:var(--rb-line3)}}
.rb-chip[aria-pressed=true]{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft);color:var(--rb-text);font-weight:600}
.rb-chip small{opacity:.75;font-size:inherit}
.rb-traybtn{height:34px;padding:0 10px 0 12px;border-radius:999px;border:1px solid var(--rb-line);background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}
@media (hover: hover){.rb-traybtn:hover{color:var(--rb-text);border-color:var(--rb-line3)}}
.rb-traybtn b{font-weight:600;color:var(--rb-text)}
.rb-traybtn.on{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft)}
.rb-traybtn[aria-expanded=true]{border-color:var(--rb-sel-ring);color:var(--rb-text)}
.rb-traybtn .chev{display:flex;transition:transform .18s}
.rb-traybtn[aria-expanded=true] .chev{transform:rotate(180deg)}
.rb-tray{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 20px 12px;animation:rb-expand .18s ease-out;transform-origin:top}
.rb-tray .rb-chip{flex-shrink:0}
.rb-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:500;border-radius:999px;padding:2px 8px;white-space:nowrap;flex-shrink:0}
.k-acc{color:var(--rb-acc-text);background:var(--rb-acc-soft)}.k-acc2{color:var(--rb-acc2-text);background:var(--rb-acc2-soft)}
.k-warn{color:var(--rb-warn);background:var(--rb-warn-soft)}.k-ok{color:var(--rb-teal);background:var(--rb-teal-soft)}
.k-danger{color:var(--rb-rose);background:var(--rb-rose-soft)}.k-mute{color:var(--rb-sub);background:var(--rb-surf2)}

/* 목록 줄 */
.rb-list{flex:1;padding:0 12px 16px;display:flex;flex-direction:column;gap:4px}
.rb-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;cursor:pointer;border:0;background:transparent;text-align:left;width:100%;color:inherit;transition:background .15s,box-shadow .15s,opacity .15s}
@media (hover: hover){.rb-row:hover{background:var(--rb-hover)}}
.rb-row[aria-selected=true]{background:var(--rb-sel-bg);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row .grip{color:var(--rb-grip);cursor:grab;flex-shrink:0;display:flex}
.rb-row .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.rb-row .ttl{display:flex;align-items:center;gap:8px;min-width:0}
.rb-row .name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-row .meta{font-size:12px;color:var(--rb-mute)}
.rb-row.off .name{color:var(--rb-mute)}
.rb-row{-webkit-touch-callout:none}
.rb-mcb{display:none;flex-shrink:0;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--rb-grip);align-items:center;justify-content:center;cursor:pointer;color:#fff;margin:-4px -2px}
.rb-mcb::after{content:'';width:10px;height:6px;border:2.5px solid currentColor;border-top:0;border-right:0;transform:rotate(-45deg) translate(1px,-1px);opacity:0}
.picking .rb-mcb{display:flex}
.picking .rb-row{user-select:none;-webkit-user-select:none}
.rb-row.picked{background:var(--rb-acc-soft);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row.picked .rb-mcb{background:var(--rb-acc-grad);border-color:transparent}
.rb-row.picked .rb-mcb::after{opacity:1}
.rb-pickbar{display:flex;flex-shrink:0;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 10px;margin:0 12px 6px;border-radius:12px;background:var(--rb-sel-bg);border:1px solid var(--rb-sel-ring)}
.rb-pickbar b{font-size:13px;margin-right:auto}
.rb-pickbar[hidden]{display:none}
.rb-folder{height:40px;display:flex;align-items:center;gap:10px;padding:0 10px;margin-top:6px;border:0;border-radius:10px;background:transparent;color:var(--rb-text);cursor:pointer;text-align:left;width:100%}
@media (hover: hover){.rb-folder:hover{background:var(--rb-hover)}}
.rb-folder .chev{color:var(--rb-sub);transition:transform .15s;display:flex}
.rb-folder[aria-expanded=true] .chev{transform:rotate(90deg)}
.rb-folder b{font-size:13px;font-weight:600}.rb-folder small{font-size:12px;color:var(--rb-mute)}
.rb-folder-body{display:flex;flex-direction:column;gap:4px;padding-left:14px;margin-left:16px;box-shadow:inset 2px 0 0 var(--rb-line2)}

/* 스위치 */
.rb-switch{flex-shrink:0;width:44px;height:26px;border-radius:999px;border:0;padding:3px;cursor:pointer;display:flex;justify-content:flex-start;background:var(--rb-track-off);transition:background .15s}
.rb-switch>span{width:20px;height:20px;border-radius:999px;background:var(--rb-knob-off);box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s}
.rb-switch[aria-checked=true]{background:var(--rb-acc-grad)}
.rb-switch[aria-checked=true]>span{background:var(--rb-knob-on);transform:translateX(18px)}
.rb-switch[disabled]{opacity:.5;cursor:not-allowed}

/* 카드·필드 */
.rb-card{border-radius:14px;background:var(--rb-surf);overflow:hidden}
.rb-card.pad{padding:16px}
.rb-card.bordered{border:1px solid var(--rb-line)}
.rb-kv{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--rb-line2);font-size:13px}
.rb-kv:last-child{border-bottom:0}.rb-kv>span:first-child{flex:1}.rb-kv>span:last-child{font-size:12px;color:var(--rb-sub)}
.rb-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.rb-stat{padding:12px 14px;border-radius:12px;background:var(--rb-surf)}
.rb-stat small{display:block;font-size:11px;color:var(--rb-sub)}.rb-stat b{display:block;font-size:18px;font-weight:600;margin-top:2px}
.rb-label{font-size:12px;font-weight:600;color:var(--rb-sub)}
.rb-h2{margin:0;font-size:20px;font-weight:700;line-height:1.35}
.rb-h3{margin:0;font-size:16px;font-weight:600}
.rb-p{margin:0;font-size:13px;color:var(--rb-sub);line-height:1.6}
.rb-muted{font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-input{height:44px;width:100%;padding:0 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-text);font-size:14px;outline:none}
.rb-input:focus{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-field{display:flex;flex-direction:column;gap:6px}
.rb-seg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);padding:4px;border-radius:12px;background:var(--rb-surf)}
.rb-seg button{height:36px;border:0;border-radius:9px;background:transparent;color:var(--rb-sub);font-size:13px;cursor:pointer}
.rb-seg-nowrap .rb-seg button{white-space:nowrap;padding:0 10px}
.rb-seg button[aria-checked=true]{background:var(--rb-line);color:var(--rb-text);font-weight:600}
.rb-empty{padding:40px 20px;text-align:center;color:var(--rb-mute);font-size:13px;line-height:1.7}
.rb-section{padding:20px;display:flex;flex-direction:column;gap:20px}
.rb-section.rb-scroll>*{flex-shrink:0}

/* 진행 · 알림 */
.rb-progress{height:8px;border-radius:999px;background:var(--rb-track-off);overflow:hidden}
.rb-progress>i{display:block;height:100%;width:0;border-radius:999px;background:var(--rb-deco-grad);transition:width .2s}
.rb-note{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.6}
.rb-note.warn{background:var(--rb-warn-soft);color:var(--rb-text);box-shadow:inset 0 0 0 1px var(--rb-warn)}
.rb-note.warn svg{color:var(--rb-warn);flex-shrink:0}
.rb-note.info{background:var(--rb-surf2);color:var(--rb-sub)}
.rb-note.info svg{color:var(--rb-acc-text);flex-shrink:0}
.rb-note.err{background:var(--rb-danger-soft);box-shadow:inset 0 0 0 1px var(--rb-danger)}
.rb-note.err svg{color:var(--rb-danger);flex-shrink:0}
.rb-toasts{position:absolute;left:20px;bottom:20px;display:flex;flex-direction:column;gap:8px;z-index:30;pointer-events:none}
.rb-toast{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 14px 12px 16px;border-radius:14px;background:var(--rb-toast);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);font-size:13px;animation:rb-in .18s ease-out}
.rb-toast svg{flex-shrink:0;color:var(--rb-ok)}.rb-toast.err svg{color:var(--rb-danger)}
.rb-toast .act{height:32px;padding:0 12px;border-radius:10px;border:0;background:var(--rb-acc-soft);color:var(--rb-acc-text);font-size:13px;font-weight:600;cursor:pointer}
.rb-drop{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:var(--rb-backdrop);border-radius:18px}
.rb-drop>div{display:flex;align-items:center;gap:12px;padding:28px 36px;border-radius:18px;border:1.5px dashed var(--rb-sel-ring);background:var(--rb-win);color:var(--rb-acc-text);font-size:15px;font-weight:600}
@keyframes rb-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes rb-fade{from{opacity:0}to{opacity:1}}
@keyframes rb-pop{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}
@keyframes rb-rot{to{transform:rotate(360deg)}}
@keyframes rb-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}
@keyframes rb-flash{from{background:var(--rb-acc-soft);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}}
@keyframes rb-expand{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

/* 움직임: 로딩 · 강조 */
.rb-loading{display:flex;flex-direction:column;gap:4px;padding:12px 4px;animation:rb-fade .2s ease-out .12s both}
.rb-skel-row{display:flex;align-items:center;gap:12px;padding:12px 14px;animation:rb-in .25s ease-out var(--d,0ms) both}
.rb-skel{display:block;border-radius:8px;background:linear-gradient(90deg,var(--rb-surf) 25%,var(--rb-surf2) 50%,var(--rb-surf) 75%);background-size:200% 100%;animation:rb-shimmer 1.3s linear infinite}
.rb-loading-label{display:flex;align-items:center;justify-content:center;gap:8px;padding:16px 0 4px;color:var(--rb-mute);font-size:13px}
.rb-spin{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid var(--rb-line3);border-top-color:var(--rb-acc-text);animation:rb-rot .7s linear infinite;vertical-align:-2px;flex-shrink:0}
.rb-row.just-moved{animation:rb-flash .7s ease-out}
.rb-folder-body.just-opened{animation:rb-expand .16s ease-out}
.rb-btn:active:not([disabled]),.rb-icon-btn:active:not([disabled]){transform:translateY(1px)}

/* 대화상자 · 시트 · 메뉴 */
.rb-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--rb-backdrop);animation:rb-fade .15s ease-out}
.rb-dialog{width:100%;max-width:440px;border-radius:18px;background:var(--rb-win);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow);padding:22px;display:flex;flex-direction:column;gap:14px;animation:rb-in .15s ease-out}
.rb-dialog .btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.rb-menu{position:absolute;z-index:60;min-width:200px;padding:6px;border-radius:14px;background:var(--rb-win);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);display:flex;flex-direction:column;animation:rb-pop .13s cubic-bezier(.2,.7,.2,1);transform-origin:top right}
.rb-menu button{height:40px;display:flex;align-items:center;gap:10px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:var(--rb-text);font-size:13px;cursor:pointer;text-align:left}
.rb-menu button:focus-visible{background:var(--rb-hover);outline:none}
@media (hover: hover){.rb-menu button:hover{background:var(--rb-hover)}}
.rb-menu button.danger{color:var(--rb-danger)}
.rb-menu hr{border:0;border-top:1px solid var(--rb-line2);margin:4px 0}
.rb-swatches{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rb-swatch{width:32px;height:32px;border-radius:999px;border:0;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.rb-swatch[aria-pressed=true]{box-shadow:0 0 0 2px var(--rb-win),0 0 0 4px var(--rb-text)}
.rb-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rb-preset{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px;border-radius:12px;cursor:pointer;color:var(--rb-text);background:var(--rb-surf);border:1px solid var(--rb-line)}
.rb-preset[aria-pressed=true]{border-color:var(--rb-text)}
.rb-preset i{display:block;width:100%;height:28px;border-radius:8px}
.rb-color{display:flex;align-items:center;gap:10px;height:48px;padding:0 12px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);cursor:pointer}
.rb-color input{width:28px;height:28px;border:0;padding:0;background:transparent;cursor:pointer}
.rb-color span{flex:1;font-size:13px}.rb-color small{font-size:12px;color:var(--rb-sub)}

/* 전체 화면 패널(에디터·에셋 관리자) */
.rb-full{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;background:var(--rb-win);animation:rb-in .15s ease-out}
.rb-full-head{min-height:64px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--rb-line2);flex-wrap:wrap}
.rb-full-head .ttl{flex:1;min-width:120px;display:flex;flex-direction:column}
.rb-full-head .ttl small{font-size:11px;color:var(--rb-sub)}.rb-full-head .ttl b{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tabs{display:flex;gap:4px;padding:8px 16px 0;border-bottom:1px solid var(--rb-line2);overflow-x:auto;flex-shrink:0}
.rb-tabs button{height:40px;padding:0 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--rb-sub);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap}
.rb-tabs button[aria-selected=true]{color:var(--rb-text);border-bottom-color:var(--rb-acc-text);font-weight:600}
.rb-tabs button small{margin-left:6px;font-size:12px;opacity:.75}
.rb-split{flex:1;display:flex;min-height:0}
.rb-split>*{min-height:0}
.rb-scroll,.rb-split>.pane,.rb-side-list{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.rb-split>.side{width:320px;flex-shrink:0;border-right:1px solid var(--rb-line2);display:flex;flex-direction:column;min-height:0}
.rb-split>.pane{flex:1;min-width:0;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
.rb-side-tools{display:flex;gap:6px;padding:12px;border-bottom:1px solid var(--rb-line2);flex-wrap:wrap}
.rb-side-list{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:2px}
.rb-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;border:0;background:transparent;color:var(--rb-text);text-align:left;cursor:pointer;width:100%;font-size:13px}
@media (hover: hover){.rb-item:hover{background:var(--rb-hover)}}
.rb-item[aria-selected=true]{background:var(--rb-sel-bg);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-item .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-item.off .t{color:var(--rb-mute);text-decoration:line-through}
.rb-item.child{padding-left:28px}
.rb-item-row{display:flex;align-items:center;gap:2px;border-radius:10px}
.rb-item-row>.grip{color:var(--rb-grip);cursor:grab;display:flex;padding:6px 2px;flex-shrink:0;touch-action:none}
.rb-item-row>.rb-item{flex:1;min-width:0}
.rb-item.divider .t{color:var(--rb-mute);font-size:12px;letter-spacing:.02em}
.rb-item.divider{padding-top:6px;padding-bottom:6px}
.rb-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.rb-form .wide{grid-column:1/-1}
.rb-textarea{width:100%;min-height:120px;padding:12px 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-text);font:13px/1.6 ui-monospace,'JetBrains Mono',Consolas,'D2Coding',monospace;resize:vertical;outline:none;tab-size:4}
.rb-textarea:focus{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-textarea.tall{min-height:max(300px,46vh)}
.rb-check{display:flex;align-items:center;gap:10px;min-height:44px;font-size:13px;cursor:pointer}
.rb-check input{width:18px;height:18px;accent-color:var(--rb-acc-a);margin:0}
select.rb-input{appearance:auto}
.rb-issues{display:flex;flex-direction:column;gap:6px}
.rb-issue{display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:8px 10px;border-radius:10px;background:var(--rb-surf2);cursor:pointer;border:0;color:var(--rb-text);text-align:left;width:100%}
.rb-issue.err svg{color:var(--rb-danger)}.rb-issue.warn svg{color:var(--rb-warn)}
.rb-cbs{display:flex;flex-direction:column;gap:4px;max-height:60vh;overflow:auto}
.rb-cbs button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 10px;border-radius:10px;border:0;background:var(--rb-surf);color:var(--rb-text);cursor:pointer;text-align:left}
.rb-cbs code{font:12px ui-monospace,Consolas,monospace;color:var(--rb-acc-text)}.rb-cbs span{font-size:12px;color:var(--rb-sub)}
/* 에셋 격자 */
.rb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;align-content:start}
.rb-tile{position:relative;display:flex;flex-direction:column;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);overflow:hidden;cursor:pointer;text-align:left;padding:0;color:var(--rb-text)}
.rb-tile[aria-selected=true]{border-color:var(--rb-acc-text);box-shadow:0 0 0 2px var(--rb-sel-ring)}
.rb-tile .img{aspect-ratio:1/1;width:100%;background:var(--rb-surf2) center/contain no-repeat;display:flex;align-items:center;justify-content:center;color:var(--rb-mute)}
.rb-tile img{width:100%;height:100%;object-fit:contain;display:block}
.rb-tile .cap{padding:6px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tile .cap small{display:block;color:var(--rb-mute);font-size:11px}
.rb-tile .sel{position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:7px;background:var(--rb-win);border:1px solid var(--rb-line3);display:flex;align-items:center;justify-content:center;color:var(--rb-on-acc)}
.rb-tile[aria-selected=true] .sel{background:var(--rb-acc-grad);border:0}
/* 에셋 목록 보기: 캐릭터별 묶음 */
.rb-grid.list{display:flex;flex-direction:column;gap:4px}
.rb-viewtoggle{position:relative;display:inline-grid;grid-template-columns:1fr 1fr;padding:3px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line3);flex-shrink:0}
.rb-viewtoggle>i{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:9px;background:var(--rb-acc-grad);box-shadow:0 2px 8px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.2,.7,.2,1)}
.rb-viewtoggle[data-v=list]>i{transform:translateX(100%)}
.rb-viewtoggle button{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 14px;border:0;background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;transition:color .15s}
.rb-viewtoggle button[aria-checked=true]{color:var(--rb-on-acc);font-weight:600}
.rb-am-group{margin-top:6px}
.rb-am-group.sub{margin-top:2px;min-height:36px;font-size:13px}
.rb-am-group[aria-expanded=true] .chev{transform:rotate(90deg)}
.rb-am-group-body{display:flex;flex-direction:column;gap:4px;padding-left:14px;animation:rb-expand .16s ease-out}
.rb-grid.list .rb-tile{flex-direction:row;align-items:center;gap:10px;padding:6px 10px 6px 40px;min-height:52px}
.rb-grid.list .rb-tile .img{width:40px;height:40px;aspect-ratio:auto;flex-shrink:0;border-radius:8px;overflow:hidden}
.rb-grid.list .rb-tile .cap{flex:1;min-width:0;padding:0;font-size:13px}
.rb-grid.list .rb-tile .cap small{display:inline;margin-left:8px}
.rb-grid.list .rb-tile .sel{top:50%;left:10px;transform:translateY(-50%)}
.rb-folders{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.rb-lightbox{position:absolute;inset:0;z-index:55;background:rgba(5,6,12,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px}
.rb-lightbox img{max-width:100%;max-height:calc(100% - 80px);object-fit:contain;border-radius:8px}
.rb-lightbox .bar{display:flex;gap:8px;align-items:center;color:#e9eaf6;font-size:13px;flex-wrap:wrap;justify-content:center}
@media (max-width: 760px){
  .rb-split{flex-direction:column}
  .rb-split>.side{width:auto;max-height:38%;border-right:0;border-bottom:1px solid var(--rb-line2)}
  .rb-split>.pane{padding:14px}
  .rb-split>aside{width:auto !important;border-left:0 !important;border-top:1px solid var(--rb-line2);max-height:45%}
  .rb-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
  .rb-am-info.none{display:none !important}
  .rb-am-thumb{max-height:140px !important}
  .rb-split.m-list>.side{max-height:none;flex:1;border-bottom:0}
  .rb-split.m-list>.pane{display:none}
  .rb-split.m-item>.side{display:none}
  .rb-hist-root{flex-direction:column;flex-wrap:nowrap}
  .rb-hist-pane{min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
}
.rb-mobile-only{display:none}
@media (max-width: 760px){ .rb-mobile-only{display:block} }

/* 모바일: 아래 탭 바, 상세는 시트 */
.rb-tabbar{display:none}
.rb-nav a[hidden],.rb-tabbar a[hidden]{display:none!important}
.rb-mobile-search{display:none !important}
.rb-win.rb-nosearch .rb-head .rb-search{visibility:hidden}
.rb-sheet-back{display:none}
.rb-sheet-head{display:none}
@media (max-width: 760px){
  .rb-root{padding:0}
  .rb-win{max-width:none;max-height:none;border-radius:0;border:0}
  .rb-brand{width:auto}.rb-brand small{display:none}
  .rb-head{padding:0 12px;gap:8px;height:60px}
  .rb-head .rb-search{display:none}
  .rb-head .rb-btn .lbl{display:none}.rb-head .rb-btn{width:44px;padding:0}
  .rb-nav{display:none}
  .rb-mobile-search{display:flex !important;flex:0 0 auto;height:44px;margin:12px 16px 0;max-width:none}
  .rb-win.rb-nosearch .rb-mobile-search{display:none !important}
  .rb-tabbar{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);height:68px;flex-shrink:0;border-top:1px solid var(--rb-line2);background:var(--rb-win)}
  .rb-tabbar a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-decoration:none;color:var(--rb-sub);font-size:11px;cursor:pointer}
  .rb-tabbar a[aria-current=page]{color:var(--rb-acc-text);font-weight:600}
  .rb-chips{flex-wrap:nowrap;overflow-x:auto;padding:12px 16px 8px}
  .rb-chip{flex-shrink:0}
  .rb-tray{flex-wrap:nowrap;overflow-x:auto;padding:0 16px 10px}
  .rb-detail{position:absolute;left:0;right:0;bottom:68px;width:auto;max-height:72%;border-left:0;border-radius:22px 22px 0 0;background:var(--rb-win);box-shadow:var(--rb-shadow);z-index:20;overflow:auto;transform:translateY(105%);visibility:hidden;pointer-events:none;transition:transform .2s ease-out,visibility 0s linear .2s}
  .rb-detail.open{transform:none;visibility:visible;pointer-events:auto;transition:transform .2s ease-out}
  .rb-detail::before{content:'';display:block;width:40px;height:5px;border-radius:999px;background:var(--rb-line3);margin:-8px auto 4px}
  .rb-sheet-head{display:flex;justify-content:flex-end;margin:-8px -8px -12px}
  .rb-sheet-back.open{display:block;position:absolute;inset:0;bottom:68px;background:var(--rb-backdrop);z-index:19}
  .rb-presets{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rb-toasts{left:12px;right:12px;bottom:80px}
}
button,a,[role=option],.rb-tile{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
@media (max-width: 760px){ .rb-input,.rb-textarea,.rb-search input,select{font-size:16px !important} }
@media (prefers-reduced-motion: reduce){*{transition:none !important;animation:none !important}}

.rb-thanks{position:relative;margin-top:22px;border-radius:20px;overflow:hidden;padding:22px 22px 54px;background:linear-gradient(135deg,#0d2a4a 0%,#123e66 45%,#1b5a86 100%);color:#e8f6ff;box-shadow:0 14px 40px rgba(6,30,60,.35);animation:rb-fade .4s ease-out}
.rb-thanks-waves{position:absolute;left:0;right:0;bottom:0;height:64px;color:#7fd3ff;pointer-events:none}
.rb-thanks-waves svg{width:200%;height:100%;animation:rb-wave 9s linear infinite}
@keyframes rb-wave{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.rb-thanks-waves svg{animation:none}}
.rb-thanks-body{position:relative;display:flex;gap:18px;align-items:flex-start}
.rb-thanks-emoji{font-size:46px;line-height:1;filter:drop-shadow(0 6px 14px rgba(0,0,0,.3));animation:rb-bob 3.2s ease-in-out infinite}
@keyframes rb-bob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-5px) rotate(4deg)}}
.rb-thanks-body>div{display:flex;flex-direction:column;gap:4px;min-width:0}
.rb-thanks-kicker{font-size:11px;font-weight:800;letter-spacing:.18em;color:#9fe0ff}
.rb-thanks-title{font-size:24px;font-weight:800;letter-spacing:-.01em;background:linear-gradient(90deg,#ffffff,#9fe0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.rb-thanks-text{font-size:13.5px;line-height:1.7;color:#cfeaff;word-break:keep-all}
.rb-da{margin-top:10px;border:1px solid var(--rb-line);border-radius:16px;background:var(--rb-surf);padding:14px;display:flex;flex-direction:column;gap:12px}
.rb-da.on{border-color:var(--rb-sel-ring);box-shadow:0 0 0 1px var(--rb-acc-soft) inset}
.rb-da-head{display:flex;align-items:center;gap:12px}
.rb-da-ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--rb-acc-soft);color:var(--rb-acc-text);flex-shrink:0}
.rb-da-ttl{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rb-da-ttl b{font-size:15px;color:var(--rb-text)}
.rb-da-ttl small{font-size:12.5px;color:var(--rb-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-da-hint,.rb-da-foot{margin:0;font-size:12.5px;line-height:1.6;color:var(--rb-sub);word-break:keep-all}
.rb-da-foot{color:var(--rb-mute)}
.rb-da-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:10px}
.rb-da-card{background:var(--rb-win);border:1px solid var(--rb-line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;min-width:0}
.rb-da-card>header{display:flex;align-items:center;gap:8px;color:var(--rb-text);flex-wrap:wrap}
.rb-da-card>header b{font-size:14px}
.rb-da-card>header small{flex-basis:100%;font-size:12px;color:var(--rb-sub);word-break:keep-all}
.rb-da-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.rb-da-line>.rb-seg{flex:1;min-width:200px}
.rb-da-line>.rb-input{flex:1;min-width:140px}
.rb-da-lab{width:84px;flex-shrink:0;font-size:12.5px;font-weight:600;color:var(--rb-sub)}
.rb-da-note{font-size:12.5px;color:var(--rb-sub)}
.rb-da-conds{display:flex;flex-direction:column;gap:6px}
.rb-da-cond{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;border-radius:10px;background:var(--rb-surf)}
.rb-da-cond .rb-input{height:34px;min-width:0}
.rb-da-cond .rb-da-type{flex:0 1 230px}
.rb-da-params{flex:1 1 220px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.rb-da-params>.rb-input{flex:1 1 110px}
.rb-da-cond>select.rb-input{flex:1 1 180px}
.rb-da-idx{width:22px;height:22px;border-radius:999px;display:grid;place-items:center;font-size:11.5px;font-weight:700;background:var(--rb-acc-soft);color:var(--rb-acc-text);flex-shrink:0}
.rb-da-arrow{font-weight:700;color:var(--rb-acc-text);padding:0 2px}
.rb-da-empty{margin:0;font-size:12.5px;color:var(--rb-mute)}
.rb-da-sub{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px dashed var(--rb-line)}
.rb-da-range{flex:1;min-width:120px;accent-color:var(--rb-acc-text)}
.rb-da .rb-input.rb-da-num{flex:0 0 auto;min-width:0;height:36px;text-align:center;padding:0 6px}
.rb-da .rb-input{height:36px}
.rb-da-params>select.rb-input{flex:1 1 140px;min-width:140px}
.rb-da .rb-seg button{height:auto;min-height:36px;padding:6px 4px;line-height:1.35;word-break:keep-all}
.rb-da-note{line-height:1.55}
.rb-da-err{flex-basis:100%;font-size:12.5px;line-height:1.5;color:var(--rb-danger,#e5484d)}
.rb-da-pair{display:flex;flex-direction:column;gap:4px}
.rb-da-opts{display:flex;gap:12px;align-items:center;flex-wrap:nowrap}
.rb-da-opts .rb-check{white-space:nowrap}
@media (max-width:560px){.rb-da{padding:10px}.rb-da-lab{width:100%}.rb-da-line>.rb-seg{min-width:100%}}
`+nr;var _e="dusk_atelier";var De="dusk-atelier-parts-v1";var E=globalThis.risuai??globalThis.Risuai;var He=false;if(typeof document!=="undefined"){document.head.appendChild(Object.assign(document.createElement("link"),{rel:"stylesheet",href:sr}));document.head.appendChild(Object.assign(document.createElement("style"),{textContent:or}))}var hn=e=>E.log(`[Dusk Theme Builder] ${e}`).catch(()=>{});var ar=async()=>{He=false;document.body.replaceChildren();await E.hideContainer();await E.postPluginChannelMessage(_e,De,{protocol:1,type:"closed",part:"theme-builder"})};var bn=async()=>{He=true;await E.showContainer("fullscreen");const e={api:E,main:document.body,win:globalThis,state:{},toast:hn,go:async(r,t)=>{if(t==="themestudio"){await E.postPluginChannelMessage(_e,De,{protocol:1,type:"open-studio",part:"theme-builder"})}await ar()}};await rr(e)};(async()=>{if(!E)return;await E.addPluginChannelListener(De,async(e,r)=>{if(r?.sender!==_e||e?.protocol!==1||e?.part!=="theme-builder")return;if(e.type==="open")await bn();if(e.type==="close"&&He)await ar()})})().catch(e=>E?.log(`[Dusk Theme Builder] 초기화 실패: ${e?.message??e}`));})();
