/* Dusk Atelier 애드온 stealth v0.1.0 — 소스: addons/stealth (AGPL-3.0-only) */
var L=globalThis.__duskLib?.["src/ui/dom.js"];if(!L)throw new Error("Dusk 코어에 src/ui/dom.js가 없어요 — Dusk를 업데이트해 주세요");var{EASE:et,copyText:at,download:ot,fadeUp:rt,fmtBytes:it,fmtWhen:st,h:l,motion:nt,pickFiles:lt,reduceMotion:dt,replace:x,svgFrom:ct,vanish:pt}=L;var R=globalThis.__duskLib?.["src/ui/kit.js"];if(!R)throw new Error("Dusk 코어에 src/ui/kit.js가 없어요 — Dusk를 업데이트해 주세요");var{STATUS_KINDS:mt,actionRow:ft,advFold:ut,badge:ht,btn:k,chip:gt,colorDialog:vt,confirmDialog:z,emptyState:xt,fmtSize:kt,folderDialog:yt,folderPickPrefs:St,guidePanel:wt,iconBtn:Tt,loading:Et,modal:$t,moreNav:Dt,note:P,openMenu:Bt,optionCards:At,pageHead:It,popover:Ct,progressBar:_t,promptDialog:Lt,segmented:j,setSwitch:Rt,sheet:zt,sortBy:Pt,sortChips:jt,sortKeyName:Ft,sortLabel:Ot,sortShort:Ht,spinner:Nt,statusCard:Gt,stepsGuide:Mt,switchEl:Kt,toast:qt,toggleRow:h,tray:Ut,trayBtn:Jt}=R;var F=globalThis.__duskLib?.["src/data/themes.js"];if(!F)throw new Error("Dusk 코어에 src/data/themes.js가 없어요 — Dusk를 업데이트해 주세요");var{RISU_TAGS:Yt,TARGETS:O,TARGET_IDS:Qt,THEME_FILE_KIND:Vt,THEME_KEY:Xt,TOKENS:Zt,applyToDocument:y,compileCss:te,copyTokensTo:ee,defaultTokens:ae,detectTarget:oe,duplicateTheme:re,exportTheme:ie,lintCss:se,lintHtml:ne,loadThemes:S,newTheme:H,parseCssVars:le,parseThemeFile:de,probeSelectors:ce,renderCbs:pe,restoreActiveTheme:be,restoreDatabase:N,saveThemes:w,setCssVar:me,writeToDatabase:G}=F;var $="rbm:stealth:v1",D="스텔스 · ",T=e=>String(e??"").replace(/[\\"\n\r{}<>]/g," ").trim().slice(0,80),V=e=>String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]).slice(0,80),g='ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Malgun Gothic", sans-serif',M='"JetBrains Mono", "Cascadia Code", "D2Coding", Consolas, monospace',c={claude:{label:"클로드",desc:"따뜻한 주황 포인트, 오른쪽 둥근 말풍선, 도구 호출 줄",font:g,accent:"#d97757",radius:16,input:20,width:820,light:{bg:"#ffffff",side:"#f9f9f9",bubble:"#f3f3f3",inputBg:"#ffffff",fg:"#1a1a1a",fg2:"#666666",dim:"#787878",line:"#ebebeb",line2:"#cecece"},dark:{bg:"#191919",side:"#151515",bubble:"#2a2a2a",inputBg:"#202020",fg:"#ededed",fg2:"#9b9b9b",dim:"#757575",line:"#2a2a2a",line2:"#474747"},labels:{title:"Refactor session handler   ·   api-server",model:"Opus 5.5  ⌄      ⚑ Ask permissions",tool:"파일 읽음 2회, 명령 실행함 1회",think:"✻  Thinking…"}},gpt:{label:"GPT",desc:"흑백, 오른쪽 회색 말풍선, 알약 모양 입력창",font:g,accent:"#0d0d0d",radius:18,input:28,width:760,light:{bg:"#ffffff",side:"#f9f9f9",bubble:"#f4f4f4",inputBg:"#f4f4f4",fg:"#0d0d0d",fg2:"#5d5d5d",dim:"#8f8f8f",line:"#ececec",line2:"#d9d9d9"},dark:{bg:"#212121",side:"#171717",bubble:"#303030",inputBg:"#303030",fg:"#ececec",fg2:"#b4b4b4",dim:"#8e8e8e",line:"#2f2f2f",line2:"#424242"},labels:{title:"새 채팅",model:"GPT  ⌄",tool:"",think:"생각하는 중…"}},codex:{label:"코덱스",desc:"터미널 느낌, 고정폭 글꼴, 자리표시 › 와 상태 줄",font:M,accent:"#10a37f",radius:4,input:6,width:900,light:{bg:"#fafafa",side:"#f0f0f0",bubble:"#ececec",inputBg:"#ffffff",fg:"#1f2328",fg2:"#57606a",dim:"#8c959f",line:"#d8dee4",line2:"#c0c7ce"},dark:{bg:"#0d1117",side:"#010409",bubble:"#161b22",inputBg:"#0d1117",fg:"#e6edf3",fg2:"#8b949e",dim:"#6e7681",line:"#21262d",line2:"#30363d"},labels:{title:"~/projects/api-server  (main)",model:"codex · high · 100% context left",tool:"• Ran 2 commands, read 3 files",think:"• Working…"}},gemini:{label:"제미나이",desc:"연한 파랑 배경, 큰 알약 입력창, 그라데이션 인사",font:`"Google Sans", "Product Sans", ${g}`,accent:"#4285f4",radius:20,input:32,width:800,light:{bg:"#ffffff",side:"#f0f4f9",bubble:"#e9eef6",inputBg:"#f0f4f9",fg:"#1f1f1f",fg2:"#444746",dim:"#747775",line:"#e3e3e3",line2:"#c4c7c5"},dark:{bg:"#131314",side:"#1e1f20",bubble:"#282a2c",inputBg:"#1e1f20",fg:"#e3e3e3",fg2:"#c4c7c5",dim:"#8e918f",line:"#2d2f31",line2:"#444746"},labels:{title:"새 대화",model:"2.5 Pro  ⌄",tool:"",think:"✦  생각하는 중…"}},deepseek:{label:"딥시크",desc:"파란 포인트, 깔끔한 말풍선, 접힌 '생각 과정' 줄",font:g,accent:"#4d6bfe",radius:14,input:18,width:780,light:{bg:"#ffffff",side:"#f9fafb",bubble:"#eff6ff",inputBg:"#f3f4f6",fg:"#0f1115",fg2:"#4b5563",dim:"#8b919a",line:"#eceef1",line2:"#d4d8de"},dark:{bg:"#1b1c1f",side:"#141517",bubble:"#26282d",inputBg:"#292a2e",fg:"#e8eaed",fg2:"#a0a4ab",dim:"#7a7f87",line:"#2a2c30",line2:"#3b3d43"},labels:{title:"새 대화",model:"DeepThink  ·  검색",tool:"✓ 깊이 생각함 (소요 12초)",think:"생각하는 중…"}}},B=Object.keys(c),E=(e,t,a)=>Object.entries({bg:t.bg,side:t.side,bubble:t.bubble,input:t.inputBg,fg:t.fg,fg2:t.fg2,dim:t.dim,line:t.line,line2:t.line2}).map(([r,o])=>`  --st-${r}: ${o};`).join(`
`);function A(e,t={}){let a=c[e]?.labels??{},r={};for(let o of Object.keys(a))r[o]=typeof t?.[o]=="string"?t[o]:a[o];return r}function X(e,t={}){let a=c[e];if(!a)throw new Error(`모르는 스텔스 테마예요: ${e}`);let r=["light","dark"].includes(t.scheme)?t.scheme:"auto",o=A(e,t.labels),n=t.hideImages!==!1,d=t.blurAvatars!==!1,p=!!t.hideSidebar,u=r==="dark"?`:root {
${E(a,a.dark)}`:`:root {
${E(a,a.light)}`,m=r==="auto"?`@media (prefers-color-scheme: dark) {
  :root {
${E(a,a.dark).replace(/^/gm,"  ")}
  }
}`:"",i=e==="codex",b=[`/* Dusk Stealth · ${a.label} */`,`${u}
  --st-accent: ${a.accent};
  --st-font: ${a.font};
  --st-mono: ${M};
  --st-r: ${a.radius}px;
  --st-ri: ${a.input}px;
  --st-w: ${a.width}px;
}`,m,`:root {
  --risu-theme-bgcolor: var(--st-bg) !important;
  --risu-theme-darkbg: var(--st-side) !important;
  --risu-theme-borderc: var(--st-accent) !important;
  --risu-theme-selected: var(--st-bubble) !important;
  --risu-theme-textcolor: var(--st-fg) !important;
  --risu-theme-textcolor2: var(--st-dim) !important;
  --risu-theme-darkborderc: var(--st-line) !important;
  --risu-theme-darkbutton: var(--st-bubble) !important;
  --FontColorStandard: var(--st-fg) !important;
  --FontColorBold: var(--st-fg) !important;
  --FontColorItalic: var(--st-fg2) !important;
  --FontColorItalicBold: var(--st-fg2) !important;
  --FontColorQuote1: var(--st-fg) !important;
  --FontColorQuote2: var(--st-fg) !important;
}
.chattext mark[risu-mark] { background-color: transparent !important; color: var(--st-fg) !important; }
.chattext mark[risu-mark^="blockquote"] { border-left: 3px solid var(--st-line2) !important; color: var(--st-fg2) !important; }
body, body *:not(code):not(pre):not(pre *) { font-family: ${i?"var(--st-mono)":"var(--st-font)"} !important; }
body { background: var(--st-bg) !important; color: var(--st-fg); }
div:has(> .default-chat-screen) { background: var(--st-bg) !important; background-image: none !important; }
.default-chat-screen { font-size: ${i?14:15}px; line-height: ${i?1.55:1.65}; }`,p?".rs-sidebar, .risu-sidebar { display: none !important; }":".rs-sidebar, .risu-sidebar { background: var(--st-side) !important; box-shadow: none !important; border-right: 1px solid var(--st-line); }",d?".sidebar-avatar, .avatar img, .avatar div { filter: grayscale(1) blur(4px) opacity(.4); }":"",o.title?`.default-chat-screen::after {
  content: "${T(o.title)}"; display: block; position: sticky; top: 0; z-index: 5; margin-bottom: auto;
  padding: 12px 24px; background: var(--st-bg); border-bottom: 1px solid var(--st-line);
  color: var(--st-fg2); font-size: 13px; font-weight: 500; white-space: pre; overflow: hidden; text-overflow: ellipsis;
}`:"",`.risu-chat > div { margin: 0 auto !important; padding: 6px 24px !important; max-width: var(--st-w); width: 100%; }
.st-msg { width: 100%; min-width: 0; position: relative; color: var(--st-fg); display: flex; flex-direction: column; }
.st-body { min-width: 0; }
.st-user { align-items: flex-end; }
.st-user .st-body { max-width: 78%; background: var(--st-bubble); border-radius: var(--st-r); padding: 10px 16px; }
.st-user .st-tool, .st-system .st-tool { display: none; }
.st-tool { width: fit-content; max-width: 100%; margin: 4px 0 10px; color: var(--st-dim); font-size: 14px; line-height: 1.5; }
.st-tchev { margin-left: 6px; font-size: 10px; }
.st-body .chattext, .st-body .chattext p, .st-body .chattext li, .st-body .chattext span { color: var(--st-fg); font-size: ${i?14:15}px !important; line-height: ${i?1.55:1.65} !important; }
.st-body .chattext p { margin: 0 0 .8em !important; }
.st-body .chattext p:last-child { margin-bottom: 0 !important; }
.st-body .chattext em, .st-body .chattext i { color: var(--st-fg2) !important; }
.st-body .chattext strong, .st-body .chattext b { color: var(--st-fg) !important; font-weight: 600; }
.st-body .chattext code { font-family: var(--st-mono) !important; font-size: .87em; color: var(--st-fg) !important; background: var(--st-bubble) !important; border: 1px solid var(--st-line); border-radius: 5px; padding: 1px 5px; }
.st-body .chattext code::before, .st-body .chattext code::after { content: none !important; }
.st-body .chattext h1, .st-body .chattext h2, .st-body .chattext h3 { color: var(--st-fg) !important; font-weight: 600; margin: .8em 0 .4em !important; }
.st-body .chattext a { color: var(--st-accent) !important; }
.st-body .chattext hr { border-color: var(--st-line) !important; }
.st-body .chattext blockquote { border-left: 3px solid var(--st-line2) !important; color: var(--st-fg2) !important; }`,n?".st-body img, .st-body video { display: none !important; }":"",i?`.st-user .st-body { max-width: 100%; background: transparent; border-radius: 0; padding: 0 0 0 1.4em; text-indent: -1.4em; }
.st-user .st-body::before { content: "›"; color: var(--st-accent); font-weight: 700; margin-right: .6em; }
.st-char .st-body::before { content: "•"; color: var(--st-dim); margin-right: .6em; }
.st-user { align-items: stretch; }`:"",`.st-btns { opacity: 0; transition: opacity .15s; font-size: 12px; margin-top: 2px; }
.st-msg:hover .st-btns { opacity: .8; }
.st-btns button { color: var(--st-dim) !important; }
.st-btns button:hover { color: var(--st-fg) !important; }
.st-body textarea { background: var(--st-input) !important; color: var(--st-fg) !important; font-size: 15px !important; border: 1px solid var(--st-line2) !important; border-radius: 10px !important; }
div:has(> .text-input-area) {
  position: relative; box-sizing: border-box; width: calc(100% - 48px) !important; max-width: calc(var(--st-w) - 48px);
  margin: 8px auto 20px !important; padding: 10px 10px ${o.model?8:10}px 6px !important;
  background: var(--st-input) !important; border: 1px solid var(--st-line2); border-radius: var(--st-ri);
  box-shadow: 0 2px 10px rgba(0, 0, 0, .06); align-items: flex-start !important;
}
div:has(> .text-input-area):focus-within { border-color: var(--st-dim); }`,o.model?`div:has(> .text-input-area)::after { content: "${T(o.model)}"; position: absolute; left: 56px; bottom: 12px; color: var(--st-dim); font-size: 12.5px; white-space: pre; pointer-events: none; }`:"",`.text-input-area { margin: 0 0 ${o.model?34:0}px 0 !important; padding: 4px 10px !important; font-size: 15px !important; color: var(--st-fg) !important; border: none !important; border-radius: 0 !important; background: transparent !important; }
.text-input-area::placeholder { color: var(--st-dim); }
div:has(> .text-input-area) > div, div:has(> .text-input-area) > button {
  margin: 0 0 0 4px !important; border: none !important; border-radius: 10px !important; background: transparent !important;
  color: var(--st-dim) !important; padding: 7px !important; align-self: flex-end;
}
div:has(> .text-input-area) > div:hover, div:has(> .text-input-area) > button:hover { color: var(--st-fg) !important; background: var(--st-bubble) !important; }
div:has(> .text-input-area) > .button-icon-send { background: var(--st-accent) !important; color: #fff !important; }
div:has(> .text-input-area) > .button-icon-send:hover { filter: brightness(1.08); }`,`.loadmove { animation: none !important; border: none !important; width: 1em !important; height: 1em !important; }
.loadmove::before { content: "■"; font-size: 11px; color: var(--st-fg); }`,o.think?`.loadmove::after { content: "${T(o.think)}"; position: absolute; left: 18px; top: -30px; color: var(--st-accent); font-size: 13.5px; white-space: pre; animation: st-pulse 1.4s ease-in-out infinite; pointer-events: none; }
@keyframes st-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }`:"",`::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--st-line2); border-radius: 5px; border: 2px solid var(--st-bg); }
::-webkit-scrollbar-track { background: transparent; }`].filter(Boolean).join(`
`),f=['<div class="st-msg st-{{role}}">',o.tool?`<div class="st-tool">${V(o.tool)}<span class="st-tchev">▸</span></div>`:"",'<div class="st-body"><risutextbox></risutextbox></div>','<div class="st-btns"><risubuttons></risubuttons></div>',"</div>"].filter(Boolean).join(`
`);return{name:D+a.label,css:b,html:f}}function K(e,t={},a="risu"){if(!O[a])throw new Error(`모르는 계열이에요: ${a}`);let r=X(e,t);return{name:r.name,target:a,css:r.css,html:r.html,useTokens:!1,stealth:e}}var Z=()=>({v:1,active:null,scheme:"auto",hideImages:!0,blurAvatars:!0,hideSidebar:!1,labels:{}});function I(e){let t=Z();if(!e||typeof e!="object"||e.v!==1)return t;let a={};for(let r of B){let o=e.labels?.[r];if(o&&typeof o=="object"){a[r]={};for(let n of["title","model","tool","think"])typeof o[n]=="string"&&(a[r][n]=o[n].slice(0,80))}}return{v:1,active:c[e.active]?e.active:null,scheme:["auto","light","dark"].includes(e.scheme)?e.scheme:"auto",hideImages:e.hideImages!==!1,blurAvatars:e.blurAvatars!==!1,hideSidebar:!!e.hideSidebar,labels:a}}var q=(e,t)=>({scheme:e.scheme,hideImages:e.hideImages,blurAvatars:e.blurAvatars,hideSidebar:e.hideSidebar,labels:e.labels?.[t]??{}});async function U(e){try{let t=await e.pluginStorage.getItem($);return I(t?JSON.parse(t):null)}catch{return I(null)}}var J=(e,t)=>e.pluginStorage.setItem($,JSON.stringify(t)),W=e=>String(e??"").startsWith(D);async function C(e,t,a,{target:r="risu"}={}){if(!c[t])throw new Error(`모르는 스텔스 테마예요: ${t}`);let o=await S(e),n=K(t,q(a,t),r),d=(o.themes[r]??=[]).filter(b=>!W(b.name)),p={...H(r,n.name),css:n.css,html:n.html,useTokens:!1};d.push(p),o.themes[r]=d,o.active[r]=p.id,o.target=r;let u=!!a.active,m=await G(e,p);(!u||!o.dbBackup?.[r])&&(o.dbBackup={...o.dbBackup,[r]:m}),await w(e,o);let i=await e.getRootDocument?.().catch(()=>null);return i&&await y(i,p).catch(()=>!1),{...a,active:t}}async function Y(e,t,{target:a="risu"}={}){let r=await S(e),o=r.dbBackup?.[a];if(o){await N(e,a,o);let{[a]:d,...p}=r.dbBackup;r.dbBackup=p}r.themes[a]=(r.themes[a]??[]).filter(d=>!W(d.name)),r.active[a]=null,r.forceApply=!1,await w(e,r);let n=await e.getRootDocument?.().catch(()=>null);return n&&await y(n,null).catch(()=>{}),{...t,active:null}}var tt=[["title","상단 제목"],["model","입력창 아래 문구"],["tool","답변 앞 작업 줄"],["think","생성 중 문구"]];async function Q(e){let t=await U(e.api),a=t.active??"claude",r=l("div",{class:"rb-section",style:"display:flex;flex-direction:column;gap:12px"}),o=()=>J(e.api,t).catch(i=>e.toast(`저장하지 못했어요: ${i?.message??i}`,{error:!0})),n=async(i,b)=>{try{t=await i(),await o(),b&&e.toast(b)}catch(f){e.toast(`적용하지 못했어요: ${f?.message??f}`,{error:!0})}m()},d=()=>t.active&&n(()=>C(e.api,t.active,t)),p=i=>n(()=>C(e.api,i,t),`${c[i].label} 모양을 켰어요. 새로고침하면 가장 확실해요`),u=async()=>{await z(e.win,{title:"스텔스 끄기",body:"리스 설정의 커스텀 CSS·채팅 HTML을 켜기 전 값으로 되돌려요.",ok:"끄기"})&&n(()=>Y(e.api,t),"원래 모양으로 되돌렸어요")};function m(){let i=A(a,t.labels?.[a]),b=B.map(s=>l("button",{type:"button",class:["rb-card","bordered"],"aria-pressed":s===a?"true":"false",style:`text-align:left;cursor:pointer;${s===a?"outline:2px solid var(--rb-accent, #7a6cf0)":""}`,onClick:()=>{a=s,m()}},l("b",null,c[s].label+(t.active===s?"  ● 켜짐":"")),l("small",{class:"rb-muted",style:"display:block"},c[s].desc))),f=tt.map(([s,_])=>{let v=l("input",{type:"text",class:"rb-input",value:i[s],maxlength:80,placeholder:"비우면 이 장식을 빼요","aria-label":_});return v.addEventListener("change",()=>{t.labels={...t.labels,[a]:{...t.labels?.[a],[s]:v.value}},o()}),l("label",{class:"rb-lfield"},l("b",null,_),v)});x(r,l("h3",{class:"rb-h3"},"더스크 스텔스"),l("p",{class:"rb-muted"},"리스 채팅을 다른 AI 채팅 앱처럼 보이게 해요. 켜면 리스의 커스텀 CSS·채팅 HTML 칸을 쓰고, 끄면 원래 값으로 되돌려요."),l("div",{style:"display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px"},...b),j([["auto","기기 설정 따라"],["light","항상 밝게"],["dark","항상 어둡게"]],t.scheme,s=>{t.scheme=s,o(),d()},"밝기"),h("본문 이미지 숨기기","일러스트가 화면에 보이지 않게 해요",t.hideImages,s=>{t.hideImages=s,o(),d()}),h("사이드바 아바타 흐리게","캐릭터 얼굴이 작게 보여도 알아보기 어렵게 해요",t.blurAvatars,s=>{t.blurAvatars=s,o(),d()}),h("사이드바 숨기기","왼쪽 목록을 통째로 숨겨요",t.hideSidebar,s=>{t.hideSidebar=s,o(),d()}),l("h4",{class:"rb-h4"},`${c[a].label} 문구`),...f,l("div",{class:"rb-row",style:"display:flex;gap:8px"},k(t.active===a?"문구·옵션 다시 적용":`${c[a].label} 켜기`,{kind:"primary",onClick:()=>p(a)}),t.active?k("끄고 원래대로",{onClick:u}):null),P("info","화면에 안 바뀌면 리스를 새로고침해 주세요. 리스 업데이트로 화면 구조가 바뀌면 일부가 어긋날 수 있어요."))}m(),x(e.main,r)}async function $e(e,t){let a=t.ext;if(!a)throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");let r=[a.add("screen","tools/stealth",Q),a.add("row","tools.frequent",{id:"rb-tool-stealth",icon:"palette",title:"더스크 스텔스",desc:"리스를 다른 AI 앱처럼 꾸미기",onClick:o=>o.go("tools","stealth")})];return{deactivate(){r.forEach(o=>o())}}}export{$e as activate};
