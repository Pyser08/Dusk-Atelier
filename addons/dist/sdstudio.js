/* Dusk Atelier 애드온 sdstudio v0.1.0 — 소스: addons/sdstudio (AGPL-3.0-only) */
var eo=Object.defineProperty;var no=(e,n)=>{for(var a in n)eo(e,a,{get:n[a],enumerable:!0})};var Qt=globalThis.__duskLib?.["src/ui/kit.js"];if(!Qt)throw new Error("Dusk 코어에 src/ui/kit.js가 없어요 — Dusk를 업데이트해 주세요");{let e=["STATUS_KINDS","actionRow","advFold","badge","btn","chip","colorDialog","confirmDialog","emptyState","fmtSize","folderDialog","folderPickPrefs","guidePanel","iconBtn","loading","modal","moreNav","note","openMenu","optionCards","pageHead","popover","progressBar","promptDialog","segmented","setSwitch","sheet","sortBy","sortChips","sortKeyName","sortLabel","sortShort","spinner","statusCard","stepsGuide","switchEl","toast","toggleRow","tray","trayBtn"].filter(n=>!(n in Qt));if(e.length)throw new Error("Dusk 본체가 이 애드온보다 오래됐어요(src/ui/kit.js에 없는 기능: "+e.slice(0,3).join(", ")+") — Dusk를 업데이트해 주세요")}var{STATUS_KINDS:ri,actionRow:ai,advFold:si,badge:oi,btn:D,chip:ii,colorDialog:li,confirmDialog:$e,emptyState:di,fmtSize:ci,folderDialog:pi,folderPickPrefs:hi,guidePanel:ui,iconBtn:gi,loading:mi,modal:fe,moreNav:bi,note:fi,openMenu:Se,optionCards:wi,pageHead:ki,popover:yi,progressBar:vi,promptDialog:Be,segmented:xe,setSwitch:pt,sheet:xi,sortBy:Ci,sortChips:Pi,sortKeyName:ji,sortLabel:$i,sortShort:zi,spinner:Mi,statusCard:Ai,stepsGuide:_i,switchEl:ht,toast:Si,toggleRow:Li,tray:qi,trayBtn:Ei}=Qt;var Zt=globalThis.__duskLib?.["src/vendor/fflate.js"];if(!Zt)throw new Error("Dusk 코어에 src/vendor/fflate.js가 없어요 — Dusk를 업데이트해 주세요");{let e=["deflateSync","gunzipSync","gzipSync","inflateSync","strFromU8","strToU8","zipSync"].filter(n=>!(n in Zt));if(e.length)throw new Error("Dusk 본체가 이 애드온보다 오래됐어요(src/vendor/fflate.js에 없는 기능: "+e.slice(0,3).join(", ")+") — Dusk를 업데이트해 주세요")}var{deflateSync:Ti,gunzipSync:ut,gzipSync:Oi,inflateSync:gt,strFromU8:ca,strToU8:Fi,zipSync:pa}=Zt;var ua={0:"일반",1:"작가",3:"작품",4:"캐릭터",5:"메타"},bn=e=>String(e??"").toLowerCase().replace(/[_\s]+/g," ").trim();function ga(e){let n=[],a=[],s=[],i=[],t=[],l=0,p=e.length;for(;l<p;){let b=e.indexOf(`
`,l);b<0&&(b=p);let f=e.charCodeAt(b-1)===13?e.slice(l,b-1):e.slice(l,b);if(l=b+1,!f)continue;let w=f.lastIndexOf(","),M=f.lastIndexOf(",",w-1),m=f.lastIndexOf(",",M-1);if(m<=0)continue;let $=f.slice(0,m),L=f.slice(w+1);n.push($),a.push(bn($.includes("/")?$.slice($.lastIndexOf("/")+1):$)+($.includes("/")?"\0"+bn($):"")),s.push(Number(f.slice(m+1,M))||0),i.push(Number(f.slice(M+1,w))||0),t.push(L==="null"?"":L)}return{words:n,keys:a,cats:s,freqs:i,redirs:t,size:n.length}}var ma="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ",to="ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ",ro=["","ㄱ","ㄲ","ㄱㅅ","ㄴ","ㄴㅈ","ㄴㅎ","ㄷ","ㄹ","ㄹㄱ","ㄹㅁ","ㄹㅂ","ㄹㅅ","ㄹㅌ","ㄹㅍ","ㄹㅎ","ㅁ","ㅂ","ㅂㅅ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],ha={ㅘ:"ㅗㅏ",ㅙ:"ㅗㅐ",ㅚ:"ㅗㅣ",ㅝ:"ㅜㅓ",ㅞ:"ㅜㅔ",ㅟ:"ㅜㅣ",ㅢ:"ㅡㅣ",ㄳ:"ㄱㅅ",ㄵ:"ㄴㅈ",ㄶ:"ㄴㅎ",ㄺ:"ㄹㄱ",ㄻ:"ㄹㅁ",ㄼ:"ㄹㅂ",ㄽ:"ㄹㅅ",ㄾ:"ㄹㅌ",ㄿ:"ㄹㅍ",ㅀ:"ㄹㅎ",ㅄ:"ㅂㅅ"};function ba(e){let n="";for(let a of String(e)){let s=a.charCodeAt(0)-44032;if(s>=0&&s<11172){let i=to[Math.floor(s/28)%21];n+=ma[Math.floor(s/588)]+(ha[i]??i)+ro[s%28]}else n+=ha[a]??a}return n}var ao=e=>[...String(e)].map(n=>{let a=n.charCodeAt(0)-44032;return a>=0&&a<11172?ma[Math.floor(a/588)]:n}).join(""),fa=/[ㄱ-ㅎㅏ-ㅣ가-힣]/,so=/^[ㄱ-ㅎ\s]+$/;function oo(e){if(e.ko)return e.ko;let n=[],a=[],s=[];for(let i=0;i<e.size;i++)if(fa.test(e.words[i])){let t=bn(e.words[i]);n.push(i),a.push(ba(t)),s.push(ao(t))}return e.ko={ids:n,jk:a,ck:s}}function wa(e,n,a=8){let s=bn(n);if(!e||s.length<1)return[];let i=[],t=[],l=[];if(fa.test(s)){let w=oo(e),M=so.test(s),m=M?s.replace(/\s+/g,""):ba(s);for(let $=0;$<w.ids.length;$++){let L=M?w.ck[$].replace(/\s+/g,""):w.jk[$],G=L.indexOf(m);if(G<0)continue;let Z=L.lastIndexOf("/");(G===Z+1||G>Z&&L[G-1]===" "?i:G>Z||G===0?t:l).push(w.ids[$])}}else for(let w=0;w<e.size;w++){let M=e.keys[w],m=M.indexOf(s);m<0||(m===0||M[m-1]===" "||M[m-1]==="\0"||M[m-1]==="/"?t:l).push(w)}let p=(w,M)=>e.freqs[M]-e.freqs[w];i.sort(p),t.sort(p),l.sort(p);let b=[],f=new Set;for(let w of[...i,...t,...l]){let M=e.redirs[w]||e.words[w];if(!f.has(M)&&(f.add(M),b.push({word:e.words[w],tag:M,cat:e.cats[w],freq:e.freqs[w]}),b.length>=a))break}return b}function er(e,n){let a=n;for(;a>0&&!`,
|{}[]()<>`.includes(e[a-1]);)a--;for(;a<n&&e[a]===" ";)a++;let s=n;for(;s<e.length&&!`,
|{}[]()<>`.includes(e[s]);)s++;return{start:a,end:s,word:e.slice(a,n)}}function ka(e,n,a){let s=er(e,n),i=e.slice(s.end).replace(/^\s*,?\s*/,""),t=e.slice(0,s.start)+a+", ";return{text:t+i,caret:t.length}}var mt=e=>e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${Math.round(e/1e3)}k`:String(e);var ya=`인원/여자 한 명,0,7943303,1girl
인원/소녀 1명,0,7943303,1girl
인원/여자 1,0,7943303,1girl
인원/혼자,0,6649830,solo
인원/단독,0,6649830,solo
인원/솔로,0,6649830,solo
인원/남자 한 명,0,1996955,1boy
인원/소년 1명,0,1996955,1boy
인원/여자 두 명,0,1353702,2girls
인원/여자 세 명,0,311371,3girls
인원/남자 두 명,0,437777,2boys
인원/여러 여자,0,1996838,multiple girls
인원/여러 남자,0,655055,multiple boys
인원/성별 불명 1명,0,117648,1other
인원/커플,0,95920,couple
인원/형제자매,0,155442,siblings
인원/남매,0,155442,siblings
인원/자매,0,90662,sisters
표정/홍조,0,3875548,blush
표정/볼 붉힘,0,3875548,blush
표정/입 벌림,0,3284156,open mouth
표정/벌린 입,0,3284156,open mouth
표정/입 다묾,0,1814020,closed mouth
표정/다문 입,0,1814020,closed mouth
표정/살짝 벌린 입,0,700578,parted lips
표정/윙크,0,584320,one eye closed
표정/한쪽 눈 감기,0,584320,one eye closed
표정/씩 웃음,0,334412,grin
표정/이 보이는 웃음,0,334412,grin
표정/혀 내밀기,0,393973,tongue out
표정/메롱,0,393973,tongue out
표정/송곳니,0,429127,fang
표정/눈물,0,285037,tears
표정/울음,0,107633,crying
표정/울기,0,107633,crying
표정/땀방울(만화),0,309330,sweatdrop
표정/땀,0,721407,sweat
표정/무표정,0,170594,expressionless
표정/부끄러움,0,133324,embarrassed
표정/창피함,0,133324,embarrassed
표정/반쯤 감은 눈,0,134756,half-closed eyes
표정/졸린 눈,0,134756,half-closed eyes
표정/옅은 미소,0,102782,light smile
표정/살짝 웃음,0,102782,light smile
표정/옅은 홍조,0,115004,light blush
표정/코 홍조,0,140977,nose blush
표정/볼터치 스티커,0,147886,blush stickers
표정/화난 눈썹,0,249332,v-shaped eyebrows
표정/V자 눈썹,0,249332,v-shaped eyebrows
표정/짙은 눈썹,0,133402,thick eyebrows
표정/굵은 눈썹,0,133402,thick eyebrows
표정/이 악물기,0,99068,clenched teeth
표정/물결 입,0,98261,wavy mouth
표정/떨림,0,102961,trembling
표정/덜덜,0,102961,trembling
표정/침,0,144282,saliva
표정/눈웃음,0,148429,^ ^
표정/활짝 웃음,0,807605,:d
표정/놀란 입,0,253230,:o
표정/고양이 입,0,171274,:3
표정/윙크하며 웃음,0,89880,;d
표정/질끈 감은 눈,0,89234,> <
표정/하트 눈동자,0,114322,heart-shaped pupils
표정/모양 눈동자,0,234887,symbol-shaped pupils
표정/세로 동공,0,87944,slit pupils
표정/밝은 동공,0,138834,bright pupils
표정/흰 동공,0,111868,white pupils
표정/속눈썹,0,248049,eyelashes
표정/뾰족한 이,0,116419,sharp teeth
표정/상어 이,0,116419,sharp teeth
표정/살짝 송곳니,0,96007,skin fang
표정/윗니만,0,240511,upper teeth only
표정/이빨,0,723120,teeth
표정/혀,0,524343,tongue
표정/머리카락 너머 보이는 눈,0,99118,eyes visible through hair
표정/빛나는,0,132619,glowing
머리/동물 귀,0,1645868,animal ears
머리/수인 귀,0,1645868,animal ears
머리/고양이 귀,0,386277,cat ears
머리/여우 귀,0,203929,fox ears
머리/토끼 귀,0,307772,rabbit ears
머리/늑대 귀,0,109418,wolf ears
머리/강아지 귀,0,85352,dog ears
머리/말 귀,0,210217,horse ears
머리/귀 털,0,339829,animal ear fluff
머리/가짜 동물 귀,0,220064,fake animal ears
머리/머리띠 귀,0,220064,fake animal ears
머리/귀 네 개,0,86232,extra ears
머리/뾰족 귀,0,557625,pointy ears
머리/엘프 귀,0,557625,pointy ears
머리/뿔,0,645772,horns
머리/악마 뿔,0,131746,demon horns
머리/헤일로,0,458991,halo
머리/광륜,0,458991,halo
머리/머리 꽃,0,375680,hair flower
머리/날리는 머리,0,182308,floating hair
머리/생머리,0,96354,straight hair
머리/다른 머리 모양,0,139393,alternate hairstyle
머리/교차 앞머리,0,97506,crossed bangs
머리/양갈래 앞머리,0,86439,double-parted bangs
머리/옆머리 튜브,0,97644,hair tubes
머리/X 머리핀,0,107514,x hair ornament
머리/곱창 밴드,0,102078,scrunchie
머리/슈슈,0,102078,scrunchie
머리/검은 머리띠,0,138226,black hairband
머리/머리 날개,0,88152,head wings
머리/머리 장비,0,98593,headgear
머리/머리 위 안경,0,90226,eyewear on head
몸/가슴,0,4675105,breasts
몸/작은 가슴,0,672837,small breasts
몸/중간 가슴,0,1152031,medium breasts
몸/큰 가슴,0,2127798,large breasts
몸/거대한 가슴,0,305713,huge breasts
몸/평평한 가슴,0,226576,flat chest
몸/배꼽,0,1515872,navel
몸/쇄골,0,1049259,collarbone
몸/허벅지,0,780491,thighs
몸/두꺼운 허벅지,0,148330,thick thighs
몸/허벅지 틈,0,94101,thigh gap
몸/다리,0,177756,legs
몸/발,0,258217,feet
몸/발가락,0,224587,toes
몸/발바닥,0,140772,soles
몸/배,0,389118,stomach
몸/복근,0,127335,abs
몸/가슴 근육,0,123201,pectorals
몸/근육질 남자,0,132074,muscular male
몸/등,0,115370,back
몸/사타구니,0,181320,groin
몸/손톱,0,256886,fingernails
몸/매니큐어,0,324788,nail polish
몸/검은 손톱,0,113135,black nails
몸/빨간 손톱,0,82557,red nails
몸/입술,0,171281,lips
몸/화장,0,176496,makeup
몸/점,0,372256,mole
몸/눈 밑 점,0,233367,mole under eye
몸/흉터,0,159316,scar
몸/얼굴 흉터,0,100202,scar on face
몸/얼굴 문양,0,143348,facial mark
몸/문신,0,197311,tattoo
몸/수염,0,161043,facial hair
몸/어두운 피부,0,384116,dark skin
몸/갈색 피부 여자,0,238835,dark-skinned female
몸/갈색 피부 남자,0,126022,dark-skinned male
몸/색 피부,0,196952,colored skin
몸/윤기 피부,0,151753,shiny skin
몸/날개,0,587098,wings
몸/깃털 날개,0,96767,feathered wings
몸/꼬리,0,1114130,tail
몸/고양이 꼬리,0,211436,cat tail
몸/여우 꼬리,0,137687,fox tail
몸/말 꼬리,0,120626,horse tail
몸/토끼 꼬리,0,82977,rabbit tail
몸/악마 꼬리,0,83604,demon tail
몸/회색 눈,0,269078,grey eyes
몸/청록 눈,0,242895,aqua eyes
몸/어려진,0,84510,aged down
몸/어린 모습,0,84510,aged down
몸/살 파임,0,154485,skindentation
캐릭터 유형/고양이 소녀,0,148863,cat girl
캐릭터 유형/묘인,0,148863,cat girl
캐릭터 유형/여우 소녀,0,125697,fox girl
캐릭터 유형/말 소녀,0,203455,horse girl
캐릭터 유형/악마 소녀,0,123453,demon girl
캐릭터 유형/엘프,0,107047,elf
캐릭터 유형/마법소녀,0,104156,magical girl
캐릭터 유형/로봇,0,87775,robot
캐릭터 유형/퍼리,0,130150,furry
캐릭터 유형/수인,0,130150,furry
캐릭터 유형/버튜버,0,603123,virtual youtuber
캐릭터 유형/브이튜버,0,603123,virtual youtuber
캐릭터 유형/치비,0,352316,chibi
캐릭터 유형/SD 캐릭터,0,352316,chibi
옷/셔츠,0,2722060,shirt
옷/흰 셔츠,0,1306940,white shirt
옷/검은 셔츠,0,342415,black shirt
옷/파란 셔츠,0,153594,blue shirt
옷/빨간 셔츠,0,103489,red shirt
옷/회색 셔츠,0,99105,grey shirt
옷/칼라 셔츠,0,703728,collared shirt
옷/와이셔츠,0,158636,dress shirt
옷/풀어헤친 셔츠,0,144558,open shirt
옷/민소매 셔츠,0,214258,sleeveless shirt
옷/크롭 탑,0,268594,crop top
옷/탱크톱,0,114570,tank top
옷/나시,0,114570,tank top
옷/긴 소매,0,2210968,long sleeves
옷/반소매,0,854970,short sleeves
옷/퍼프 소매,0,493044,puffy sleeves
옷/퍼프 반소매,0,244057,puffy short sleeves
옷/퍼프 긴소매,0,93535,puffy long sleeves
옷/줄리엣 소매,0,96115,juliet sleeves
옷/프릴 소매,0,113533,frilled sleeves
옷/손등 덮는 소매,0,224418,sleeves past wrists
옷/분리형 칼라,0,176317,detached collar
옷/윙 칼라,0,81989,wing collar
옷/세일러 칼라,0,387324,sailor collar
옷/파란 세일러 칼라,0,86098,blue sailor collar
옷/흰 세일러 칼라,0,84320,white sailor collar
옷/조끼,0,301848,vest
옷/검은 재킷,0,364654,black jacket
옷/흰 재킷,0,180832,white jacket
옷/파란 재킷,0,147192,blue jacket
옷/빨간 재킷,0,88811,red jacket
옷/열린 재킷,0,356651,open jacket
옷/후드 재킷,0,84101,hooded jacket
옷/검은 코트,0,91735,black coat
옷/후드,0,416366,hood
옷/후드 내림,0,135733,hood down
옷/케이프,0,165246,capelet
옷/흰 원피스,0,416108,white dress
옷/검은 원피스,0,350796,black dress
옷/파란 원피스,0,173606,blue dress
옷/빨간 원피스,0,135675,red dress
옷/분홍 원피스,0,89887,pink dress
옷/짧은 원피스,0,124739,short dress
옷/민소매 원피스,0,216482,sleeveless dress
옷/프릴 원피스,0,138758,frilled dress
옷/끈 없는,0,223727,strapless
옷/검은 치마,0,435940,black skirt
옷/파란 치마,0,246187,blue skirt
옷/빨간 치마,0,154314,red skirt
옷/흰 치마,0,132000,white skirt
옷/초록 치마,0,82582,green skirt
옷/프릴 치마,0,108570,frilled skirt
옷/바지,0,656112,pants
옷/검은 바지,0,236357,black pants
옷/검은 반바지,0,183259,black shorts
옷/청바지,0,99791,denim
옷/데님,0,99791,denim
옷/흰 앞치마,0,113504,white apron
옷/오비(기모노 띠),0,103139,obi
옷/군복,0,105704,military
옷/밀리터리,0,105704,military
옷/어깨 갑옷,0,96844,shoulder armor
옷/원피스 수영복,0,174051,one-piece swimsuit
옷/검은 비키니,0,152104,black bikini
옷/흰 비키니,0,125863,white bikini
옷/검은 레오타드,0,103718,black leotard
옷/비치는 옷,0,205975,see-through clothes
옷/트임 옷,0,249934,clothing cutout
옷/줄무늬 옷,0,339249,striped clothes
옷/체크무늬 옷,0,185809,plaid clothes
옷/하이레그,0,157265,highleg
옷/다른 의상,0,608913,alternate costume
옷/공식 다른 의상,0,519944,official alternate costume
옷/코스프레,0,179054,cosplay
옷/속옷,0,976245,underwear
옷/흰 팬티,0,233100,white panties
옷/검은 팬티,0,174038,black panties
옷/검은 브래지어,0,82745,black bra
옷/노브라,0,120138,no bra
옷/검은 니삭스,0,483906,black thighhighs
옷/흰 니삭스,0,326493,white thighhighs
옷/검은 스타킹,0,284600,black pantyhose
옷/흰 스타킹,0,85552,white pantyhose
옷/흰 양말,0,207756,white socks
옷/검은 양말,0,141146,black socks
옷/신발,0,797086,shoes
옷/검은 신발,0,251883,black shoes
옷/흰 신발,0,88151,white shoes
옷/갈색 신발,0,85377,brown shoes
옷/검은 부츠,0,172742,black boots
옷/맨발(신발 없음),0,120068,no shoes
옷/검은 장갑,0,635278,black gloves
옷/흰 장갑,0,413224,white gloves
옷/모자,0,1609396,hat
옷/검은 모자,0,232263,black hat
옷/흰 모자,0,161392,white hat
옷/빨간 모자,0,83391,red hat
옷/마녀 모자,0,129922,witch hat
옷/몹캡,0,100101,mob cap
옷/헬멧,0,107221,helmet
옷/리본(나비),0,1618727,bow
옷/빨간 리본,0,307911,red bow
옷/파란 리본,0,168225,blue bow
옷/검은 리본,0,209324,black bow
옷/흰 리본,0,141836,white bow
옷/분홍 리본,0,112159,pink bow
옷/빨간 리본 끈,0,252777,red ribbon
옷/검은 리본 끈,0,182684,black ribbon
옷/파란 리본 끈,0,104700,blue ribbon
옷/흰 리본 끈,0,83054,white ribbon
옷/빨간 나비넥타이,0,106853,red bowtie
옷/빨간 넥타이,0,112044,red necktie
옷/검은 넥타이,0,99027,black necktie
옷/검은 초커,0,251390,black choker
옷/장신구,0,1498951,jewelry
옷/귀 피어싱,0,100836,ear piercing
옷/보석,0,109151,gem
옷/방울,0,155203,bell
옷/십자가,0,98418,cross
옷/검은 벨트,0,96540,black belt
옷/가면,0,187177,mask
옷/마스크,0,187177,mask
옷/안대,0,99187,eyepatch
옷/고글,0,82298,goggles
옷/선글라스,0,135297,sunglasses
옷/헤드폰,0,129706,headphones
옷/붕대,0,124073,bandages
옷/반창고,0,90931,bandaid
옷/가방,0,311508,bag
옷/배낭,0,95348,backpack
옷/전라,0,271274,completely nude
옷/알몸,0,653864,nude
자세/들고 있음,0,2045489,holding
자세/손 들기,0,522764,hand up
자세/팔 들기,0,287898,arm up
자세/허리에 손,0,215371,hand on own hip
자세/가슴에 손,0,84859,hand on own chest
자세/두 손 모으기,0,109688,own hands together
자세/팔짱,0,115552,crossed arms
자세/팔로 받치기,0,114656,arm support
자세/팔 뻗기,0,89003,outstretched arm
자세/가리키기,0,88369,pointing
자세/주먹 쥐기,0,82739,clenched hand
자세/브이,0,220868,v
자세/V 사인,0,220868,v
자세/고개 갸웃,0,167620,head tilt
자세/다리 벌리기,0,332517,spread legs
자세/다리 들기,0,106441,leg up
자세/무릎 꿇기,0,149944,kneeling
자세/와리자,0,104123,wariza
자세/오리 앉기,0,104123,wariza
자세/올라타기,0,95707,straddling
자세/잠자기,0,96189,sleeping
자세/먹기,0,110284,eating
자세/포옹,0,163942,hug
자세/안기,0,163942,hug
자세/키스,0,89565,kiss
자세/손잡기,0,137669,holding hands
자세/입에 물기,0,96662,mouth hold
자세/정면 보기,0,95634,facing viewer
자세/옆모습,0,172621,profile
자세/옷 들어올리기,0,84325,lifting own clothes
자세/옷 걷어올림,0,273270,clothes lift
자세/옷 당기기,0,103511,clothes pull
자세/묶임,0,104912,bound
자세/무기 들기,0,390951,holding weapon
자세/검 들기,0,166596,holding sword
자세/총 들기,0,95816,holding gun
자세/컵 들기,0,103012,holding cup
자세/음식 들기,0,143037,holding food
자세/폰 들기,0,95464,holding phone
자세/침대 위,0,161385,on bed
구도/남자 중심,0,1059053,male focus
구도/한 명 중심,0,474326,solo focus
구도/1인칭 시점,0,184903,pov
구도/여러 시점,0,251046,multiple views
구도/피사계 심도,0,122117,depth of field
구도/흐림,0,297810,blurry
구도/움직임 선,0,114202,motion lines
구도/날리는 땀방울,0,120621,flying sweatdrops
구도/반짝임,0,217014,sparkle
구도/그림자,0,156090,shadow
구도/햇빛,0,98852,sunlight
배경/야외,0,748297,outdoors
배경/실내,0,518353,indoors
배경/하늘,0,582127,sky
배경/파란 하늘,0,276354,blue sky
배경/흐린 하늘,0,98614,cloudy sky
배경/구름,0,375889,cloud
배경/나무,0,220954,tree
배경/풀,0,110397,grass
배경/잔디,0,110397,grass
배경/나뭇잎,0,134543,leaf
배경/식물,0,97295,plant
배경/꽃,0,833790,flower
배경/흰 꽃,0,137884,white flower
배경/빨간 꽃,0,105469,red flower
배경/분홍 꽃,0,88645,pink flower
배경/장미,0,141411,rose
배경/꽃잎,0,167290,petals
배경/불,0,102142,fire
배경/창문,0,171946,window
배경/커튼,0,88056,curtains
배경/침대,0,131528,bed
배경/침대 시트,0,118564,bed sheet
배경/베개,0,193413,pillow
배경/의자,0,137343,chair
배경/탁자,0,113339,table
배경/사람 없음,0,219688,no humans
배경/배경만,0,219688,no humans
사물/무기,0,773366,weapon
사물/검,0,355385,sword
사물/칼,0,355385,sword
사물/나이프,0,85641,knife
사물/총,0,185896,gun
사물/책,0,181381,book
사물/컵,0,249035,cup
사물/병,0,95762,bottle
사물/음식,0,589412,food
사물/과일,0,143158,fruit
사물/전화기,0,142369,phone
사물/휴대폰,0,128267,cellphone
사물/스마트폰,0,111373,smartphone
사물/우산,0,113869,umbrella
사물/인형,0,113874,stuffed toy
사물/동물 인형,0,90486,stuffed animal
사물/하트,0,841794,heart
사물/별 모양,0,337995,star (symbol)
사물/깃털,0,100844,feathers
동물/동물,0,138703,animal
동물/고양이,0,112129,cat
동물/새,0,142275,bird
동물/벌레,0,94170,bug
동물/포켓몬,0,219450,pokemon (creature)
화풍/흑백,0,809886,monochrome
화풍/모노크롬,0,809886,monochrome
화풍/그레이스케일,0,655256,greyscale
화풍/스케치,0,186588,sketch
화풍/만화,0,694162,comic
화풍/4컷 만화,0,114333,4koma
화풍/말풍선,0,469841,speech bubble
화풍/테두리,0,233308,border
화풍/흰 테두리,0,146646,white border
화풍/외곽선,0,82321,outline
화풍/패러디,0,106620,parody
화풍/크로스오버,0,82037,crossover
화풍/밈,0,83032,meme
메타/서명,0,413766,signature
메타/워터마크,0,226078,watermark
메타/작가 이름,0,577726,artist name
메타/캐릭터 이름,0,289069,character name
메타/영어 글자,0,377148,english text
메타/날짜 표기,0,253993,dated
몸/엉덩이,0,753383,ass
성인/이성애,0,750510,hetero
성인/검열,0,618795,censored
성인/음경,0,559219,penis
성인/음부,0,487482,pussy
메타/트위터 아이디,0,406220,twitter username
성인/모자이크,0,284403,mosaic censoring
성인/검은 띠 검열,0,223228,bar censor
몸/가려진 젖꼭지,0,195240,covered nipples
몸/가려진 배꼽,0,186274,covered navel
성인/무검열,0,185564,uncensored
상태/젖음,0,185128,wet
상태/피,0,179445,blood
성인/음모,0,179010,pubic hair
메타/저작권 표기,0,171094,copyright name
성인/항문,0,158338,anus
얼굴/송곳니,0,147018,fangs
성인/발기,0,140149,erection
인원/여자 4명,0,138948,4girls
성인/고환,0,130549,testicles
성인/여성 음모,0,120910,female pubic hair
성인/캐멀토,0,120892,cameltoe
몸/허벅지 사이로 보이는 엉덩이,0,113213,ass visible through thighs
장르/야오이,0,106940,yaoi
인원/여자 6명 이상,0,103162,6+girls
인원/남자 3명,0,99983,3boys
구도/테두리 밖,0,91274,outside border
성인/가슴 움켜쥐기,0,89910,grabbing another's breast
장르/바라,0,89335,bara
얼굴/점 코,0,88592,dot nose
메타/표지,0,87232,cover
성인/상반신 노출 여성,0,85641,topless female
메타/로고,0,81631,logo
배경/별,0,81380,star (sky)
머리/공식 다른 머리모양,0,81196,official alternate hairstyle
모자/모자 리본,0,80890,hat ribbon
배경/건물,0,80611,building
소품/일본도,0,80332,katana
몸/가슴 크기 변경(크게),0,79464,alternate breast size (larger)
모자/모자 리본 장식,0,79124,hat bow
양말/한쪽 니삭,0,78702,single thighhigh
소품/지팡이,0,78583,staff
옷/흰 소매,0,78359,white sleeves
옷/정장,0,77569,formal clothes
효과/빛 입자,0,77553,light particles
자세/무릎 세움,0,77163,knees up
표정/그늘진 얼굴,0,77148,shaded face
소품/악기,0,77059,instrument
머리/낮은 포니테일,0,77033,low ponytail
인원/몬스터 소녀,0,76804,monster girl
옷/회색 치마,0,76457,grey skirt
몸/발톱,0,75972,claws
모자/파란 모자,0,75716,blue hat
표정/힘줄 분노 표시,0,75684,anger vein
소품/상자,0,75644,box
표정/침 흘림,0,75628,drooling
옷/후드 쓴 모습,0,75073,hood up
머리/어깨 위로 넘긴 머리,0,75005,hair over shoulder
옷/메이드 앞치마,0,74997,maid apron
옷/열린 코트,0,74812,open coat
인원/어린이,0,74765,child
옷/하이레그 레오타드,0,74707,highleg leotard
옷/짧은 재킷,0,74594,cropped jacket
옷/보라색 드레스,0,74026,purple dress
옷/망토,0,73887,cloak
옷/바지 안 입음,0,73710,no pants
옷/파란 넥타이,0,73615,blue necktie
인원/남자 아이 같은 소녀,0,73553,trap
표정/말풍선 하트,0,73220,spoken heart
구도/입상 그림,0,72897,tachi-e
동물/나비,0,72675,butterfly
옷/끈 없는 드레스,0,72625,strapless dress
소품/수건,0,72506,towel
배경/소파,0,72498,couch
얼굴/입 아래 점,0,72254,mole under mouth
옷/빨간 목스카프,0,72245,red neckerchief
효과/음표,0,72215,musical note
옷/손끝 넘는 소매,0,72161,sleeves past fingers
몸/박쥐 날개,0,72069,bat wings
인원/여자 5명,0,71942,5girls
신발/갈색 부츠,0,71940,brown boots
음식/사탕,0,71824,candy
배경/풍경,0,71602,scenery
소품/장병기,0,71463,polearm
소품/둥근 안경,0,71128,round eyewear
효과/김,0,70943,steam
자세/검지 세움,0,70644,index finger raised
얼굴/립스틱,0,70598,lipstick
배경/벚꽃,0,70570,cherry blossoms
몸/파란 손톱,0,70510,blue nails
눈/색 있는 흰자,0,70441,colored sclera
옷/오링,0,70372,o-ring
표정/놀람,0,70290,surprised
소품/초승달,0,70133,crescent
몸/창백한 피부,0,70122,pale skin
성인/성인 용품,0,69964,sex toy
몸/발톱(발),0,69916,toenails
얼굴/아이섀도,0,69724,eyeshadow
양말/줄무늬 니삭,0,69599,striped thighhighs
화풍/SD 캐릭터만,0,69584,chibi only
구도/상반신 잘림,0,69325,cropped torso
몸/분홍 손톱,0,69307,pink nails
몸/용 뿔,0,69164,dragon horns
옷/검은 조끼,0,68984,black vest
자세/자기 얼굴에 손,0,68611,hand on own face
자세/책 들기,0,68290,holding book
옷/허리 앞치마,0,68266,waist apron
소품/마이크,0,68178,microphone
옷/방울 장식,0,68113,pom pom (clothes)
표정/눈물 글썽,0,67785,tearing up
옷/노란 리본,0,67362,yellow bow
구도/레터박스,0,67147,letterboxed
옷/흰 바지,0,67122,white pants
옷/분홍 셔츠,0,67099,pink shirt
옷/흰 코트,0,67076,white coat
소품/한쪽 귀걸이,0,66892,single earring
구도/다리 잘림,0,66863,cropped legs
메타/웹 주소,0,66859,web address
동작/옷 벗는 중,0,66741,undressing
눈/한쪽 눈 가림,0,66595,one eye covered
성인/남성 음모,0,66312,male pubic hair
메타/표지 페이지,0,66031,cover page
구도/원근 단축,0,65887,foreshortening
머리/머리 방울,0,65835,hair bobbles
소품/칼집,0,65761,sheath
효과/바람,0,65742,wind
동작/구속됨,0,65726,restrained
얼굴/얼굴 없음,0,65063,faceless
표정/찌푸린 눈썹,0,65041,furrowed brow
옷/건틀릿,0,65026,gauntlets
자세/가슴 눌림,0,64971,breast press
몸/검은 날개,0,64958,black wings
몸/여러 꼬리,0,64815,multiple tails
옷/변형 의상,0,64496,adapted costume
자세/깍지,0,64474,interlocked fingers
얼굴/수염,0,64426,beard
머리/짧은 머리에 긴 옆머리,0,64322,short hair with long locks
옷/파란 반바지,0,63994,blue shorts
옷/빨간 장갑,0,63756,red gloves
소품/접시,0,63541,plate
소품/목 방울,0,63534,neck bell
소품/파란 꽃,0,63519,blue flower
옷/검은 보타이,0,63186,black bowtie
메타/패트리온 아이디,0,62607,patreon username
옷/갈색 장갑,0,62526,brown gloves
옷/프릴 앞치마,0,62465,frilled apron
자세/가슴 사이,0,62425,between breasts
옷/분홍 치마,0,62235,pink skirt
인원/수인 여성,0,61969,furry female
옷/니트 조끼,0,61932,sweater vest
자세/팔 내림,0,61920,arm at side
동작/안거나 들기,0,61899,carrying
옷/초록 리본,0,61807,green bow
옷/치마 세트,0,61703,skirt set
옷/분홍 리본,0,61541,pink ribbon
옷/보라 리본,0,61511,purple bow
소품/반테 안경,0,61390,semi-rimless eyewear
눈/올라간 눈,0,61387,tsurime
눈/여러 색 눈,0,61222,multicolored eyes
옷/회색 재킷,0,61020,grey jacket
옷/세로줄 무늬 옷,0,61013,vertical-striped clothes
옷/노란 셔츠,0,60523,yellow shirt
표정/혀 내밀기,0,60498,:p
구도/클로즈업,0,60475,close-up
인원/성별 반전,0,60391,genderswap
옷/검은 세일러 칼라,0,60353,black sailor collar
몸/흰 날개,0,60235,white wings
옷/하이넥,0,60172,high collar
얼굴/이마,0,60140,forehead
옷/초록 재킷,0,59954,green jacket
몸/흰 피부,0,59900,white skin
몸/핏줄,0,59762,veins
옷/갈색 재킷,0,59704,brown jacket
속옷/분홍 팬티,0,59579,pink panties
인원/수인 남성,0,59561,furry male
눈/빛나는 눈,0,59451,glowing eyes
몸/검은 뿔,0,59353,black horns
신발/흰 부츠,0,59215,white boots
얼굴/주근깨,0,59091,freckles
상태/젖은 옷,0,59088,wet clothes
소품/자동차 류,0,59064,motor vehicle
인원/중성적,0,59034,androgynous
몸/벌어진 가슴,0,58989,breasts apart
화풍/부분 채색,0,58972,spot color
모자/챙 모자,0,58831,peaked cap
인원/이중 인격,0,58387,dual persona
인원/용 소녀,0,58171,dragon girl
옷/주머니,0,58112,pocket
몸/늑대 꼬리,0,58084,wolf tail
자세/주먹 쥔 손,0,58032,clenched hands
옷/동복,0,57787,winter uniform
소품/부채,0,57634,hand fan
옷/보라 셔츠,0,57268,purple shirt
자세/떠 있음,0,57225,floating
속옷/리본 팬티,0,57163,bow panties
옷/검은 소매,0,57045,black sleeves
옷/옷에 적힌 글자,0,56975,clothes writing
머리/흰 머리띠,0,56961,white hairband
양말/갈색 팬티스타킹,0,56797,brown pantyhose
몸/탄탄한 몸,0,56766,toned
소품/방울,0,56394,jingle bell
소품/구슬,0,56387,beads
자세/은밀한 곳 가리기,0,56376,covering privates
동작/핥기,0,56257,licking
옷/파란 비키니,0,56233,blue bikini
배경/SF,0,56200,science fiction
옷/프릴 셔츠 칼라,0,55823,frilled shirt collar
옷/파란 바지,0,55818,blue pants
상태/얼굴의 피,0,55757,blood on face
옷/한쪽 장갑,0,55643,single glove
몸/큰 가슴근육,0,55637,large pectorals
효과/연기,0,55613,smoke
자세/무릎 하나 세움,0,55485,knee up
눈/처진 눈,0,55253,tareme
인원/늑대 소녀,0,55175,wolf girl
옷/초록 드레스,0,54961,green dress
성인/옷 입은 여자 벗은 남자,0,54853,clothed female nude male
소품/인형,0,54794,doll
소품/유리컵,0,54774,drinking glass
음식/케이크,0,54736,cake
몸/천사 날개,0,54694,angel wings
옷/터틀넥 스웨터,0,54633,turtleneck sweater
화풍/흰 윤곽선,0,54175,white outline
몸/넓은 골반,0,54117,wide hips
인원/토끼 소녀,0,54007,rabbit girl
배경/책상,0,53947,desk
효과/반사,0,53608,reflection
소품/선물,0,53538,gift
배경/눈,0,53529,snow
시선/정면 바라봄,0,53502,looking ahead
소품/검은 테 안경,0,53456,black-framed eyewear
몸/가슴 점,0,53391,mole on breast
소품/메카,0,53341,mecha
옷/셔츠 넣어 입음,0,53287,shirt tucked in
인원/이성 복장,0,53267,crossdressing
옷/보라 치마,0,53260,purple skirt
옷/져지,0,53252,track jacket
옷/초록 셔츠,0,53163,green shirt
효과/생각 말풍선,0,53147,thought bubble
배경/보름달,0,53079,full moon
소품/소총,0,52917,rifle
옷/흰 기모노,0,52907,white kimono
양말/짝짝이 레그웨어,0,52749,asymmetrical legwear
동작/물속 걷기,0,52541,wading
소품/파란 헤일로,0,52478,blue halo
옷/펜슬 스커트,0,52395,pencil skirt
머리/곱창 머리끈,0,52362,hair scrunchie
눈/색 있는 속눈썹,0,51867,colored eyelashes
표정/눈 뜨고 울기,0,51739,crying with eyes open
자세/팔 뒤로,0,51477,arm behind back
몸/긴 손톱,0,51371,long fingernails
옷/흰 반바지,0,51365,white shorts
동작/걷기,0,51315,walking
표정/말풍선 말줄임표,0,51238,spoken ellipsis
소품/권총,0,51098,handgun
옷/앞매듭 상의,0,50868,front-tie top
머리/별 머리장식,0,50839,star hair ornament
구도/정면,0,50708,straight-on
배경/별이 가득한 하늘,0,50631,starry sky
인원/수인귀 모드,0,50545,kemonomimi mode
옷/몸에 붙는 옷,0,50515,skin tight
옷/벨트 버클,0,50173,belt buckle
소품/가짜 꼬리,0,50062,fake tail
옷/파란 보타이,0,49987,blue bowtie
옷/검은 보디수트,0,49955,black bodysuit
자세/상대 머리에 손,0,49907,hand on another's head
화풍/애니 채색,0,49881,anime coloring
자세/입에 손가락,0,49856,finger to mouth
메타/저작권 표시,0,49851,copyright notice
소품/노란 꽃,0,49800,yellow flower
소품/보라 꽃,0,49559,purple flower
자세/주머니에 손,0,49548,hand in pocket
표정/눈 휘둥그레,0,49507,wide-eyed
옷/어깨 갑옷,0,49337,pauldrons
옷/프릴 비키니,0,49219,frilled bikini
효과/주목선,0,49098,notice lines
몸/외뿔,0,48996,single horn
소품/쟁반,0,48936,tray
표정/거친 숨,0,48883,heavy breathing
머리/귀 뒤로 넘긴 머리,0,48877,hair behind ear
성인/가려서 안 보임,0,48870,convenient censoring
소품/파우치,0,48781,pouch
소품/헤드셋,0,48747,headset
자세/팔 머리 뒤로,0,48736,arm behind head
소품/분홍 헤일로,0,48719,pink halo
자세/다리 사이,0,48658,between legs
자세/우산 들기,0,48653,holding umbrella
옷/줄무늬 셔츠,0,48619,striped shirt
효과/렌즈 플레어,0,48509,lens flare
옷/갈색 치마,0,48384,brown skirt
인원/나이 차이,0,48260,age difference
머리/일자로 자른 끝,0,48246,blunt ends
동물/물고기,0,48230,fish
인원/얼굴 없는 남자,0,48171,faceless male
속옷/줄무늬 팬티,0,48130,striped panties
자세/정좌,0,48054,seiza
소품/머리 위 고글,0,47979,goggles on head
모자/산타 모자,0,47770,santa hat
옷/롱 드레스,0,47684,long dress
성인/후타나리,0,47474,futanari
속옷/끈 팬티,0,47328,side-tie panties
소품/들고 있는 모자,0,47279,unworn headwear
자세/지팡이 들기,0,47200,holding staff
옷/칼라 드레스,0,47145,collared dress
눈/공허한 눈,0,47116,empty eyes
소품/모자 없음,0,47016,missing headwear
옷/노란 리본,0,47003,yellow ribbon
눈/반쯤 감긴 눈,0,46923,jitome
음식/술,0,46843,alcohol
머리/땋은 포니테일,0,46795,braided ponytail
몸/지느러미,0,46790,fins
몸/강아지 꼬리,0,46770,dog tail
소품/담배,0,46745,cigarette
메타/중국어 글자,0,46736,chinese text
인원/오니,0,46580,oni
효과/의성어,0,46473,sound effects
옷/빨간 목도리,0,46356,red scarf
옷/골지 스웨터,0,46323,ribbed sweater
소품/숄더백,0,46320,shoulder bag
성인/갈라진 틈,0,46300,cleft of venus
소품/튜브,0,46126,swim ring
옷/리본 단 소매,0,45935,ribbon-trimmed sleeves
자세/손 뻗기,0,45926,reaching
인원/성별 반전(남→여),0,45889,genderswap (mtf)
배경/비,0,45665,rain
소품/펜던트,0,45663,pendant
구도/2컷 만화,0,45599,2koma
인원/강아지 소녀,0,45542,dog girl
시선/곁눈질,0,45324,sideways glance
자세/자기 머리에 손,0,45157,hand in own hair
머리/긴 앞머리,0,45151,long bangs
몸/동물 손,0,44972,animal hands
옷/줄무늬 리본,0,44884,striped bow
머리/흩어진 머리카락,0,44860,hair spread out
효과/집중선,0,44839,emphasis lines
성인/불룩함,0,44641,bulge
인원/남자 4명,0,44599,4boys
몸/용 꼬리,0,44510,dragon tail
옷/갈색 벨트,0,44331,brown belt
성인/봉긋한 젖꼭지,0,44231,puffy nipples
옷/겹친 소매,0,44202,layered sleeves
얼굴/분홍 입술,0,44128,pink lips
성인/콘돔,0,44071,condom
인원/의인화,0,43933,personification
속옷/흰 브라,0,43912,white bra
옷/빨간 비키니,0,43790,red bikini
인원/키 차이,0,43741,height difference
인원/성숙한 남자,0,43714,mature male
소품/귀 덮개,0,43694,ear covers
효과/거품,0,43671,bubble
자세/반쯤 잠김,0,43604,partially submerged
옷/흰 레오타드,0,43594,white leotard
인원/쌍둥이,0,43571,twins
옷/붕대 감은 팔,0,43329,bandaged arm
구도/1인칭 시점 손,0,43212,pov hands
옷/분홍 재킷,0,43131,pink jacket
성인/큰 음경,0,43107,large penis
소품/마스크,0,42962,mouth mask
모자/갈색 모자,0,42816,brown hat
자세/턱 괴기,0,42738,head rest
양말/찢어진 팬티스타킹,0,42721,torn pantyhose
구도/동물 중심,0,42689,animal focus
소품/빨간 장미,0,42655,red rose
옷/비키니 상의만,0,42491,bikini top only
머리/가운데 가르마 앞머리,0,42345,curtained hair
모자/모자 장식,0,42341,hat ornament
동작/달리기,0,42181,running
소품/종이,0,42140,paper
표정/올라간 눈썹,0,42076,raised eyebrows
옷/볼레로,0,42064,shrug (clothing)
구도/프레임 밖,0,42061,out of frame
소품/빨간 테 안경,0,42021,red-framed eyewear
효과/떨어지는 꽃잎,0,41979,falling petals
몸/낮은 날개,0,41961,low wings
소품/찻잔,0,41930,teacup
머리/하트 머리장식,0,41886,heart hair ornament
자세/허리에 손,0,41838,hands on own hips
얼굴/아이라이너,0,41658,eyeliner
소품/그릇,0,41618,bowl
소품/검은 목걸이(초커),0,41598,black collar
옷/파란 원피스 수영복,0,41562,blue one-piece swimsuit
옷/하복,0,41557,summer uniform
동작/날기,0,41519,flying
옷/빨간 망토,0,41441,red cape
인원/부모와 자식,0,41421,parent and child
소품/책가방,0,41357,school bag
소품/색 있는 안경,0,41355,tinted eyewear
옷/오프숄더 드레스,0,41260,off-shoulder dress
얼굴/다크서클,0,40955,bags under eyes
얼굴/까칠한 수염,0,40913,stubble
동물/개,0,40905,dog
소품/빨대,0,40904,drinking straw
인원/괴물,0,40763,monster
메타/한국어 글자,0,40708,korean text
자세/상대 어깨에 손,0,40681,hand on another's shoulder
인원/남자 6명 이상,0,40656,6+boys
자세/양손 브이,0,40224,double v
효과/흐린 전경,0,40175,blurry foreground
자세/무릎 붙이고 발 벌림,0,40138,knees together feet apart
인원/작은 사람,0,40044,mini person
옷/뒤 리본,0,40014,back bow
머리/촉수 머리,0,39995,tentacle hair
소품/꽃다발,0,39937,bouquet
소품/빗자루,0,39911,broom
모자/밀짚모자,0,39696,sun hat
몸/보라 손톱,0,39658,purple nails
옷/크롭 셔츠,0,39612,cropped shirt
옷/회색 바지,0,39607,grey pants
옷/롤리타 패션,0,39564,lolita fashion
자세/꽃 들기,0,39550,holding flower
옷/검은 세일러복,0,39457,black serafuku
자세/쌍수,0,39340,dual wielding
성인/벌린 음부,0,39136,spread pussy
효과/김 나는 몸,0,39095,steaming body
옷/흉갑,0,39077,breastplate
몸/팔 문신,0,38964,arm tattoo
옷/반쯤 손가락 없는 장갑,0,38867,partially fingerless gloves
모자/초록 모자,0,38800,green hat
인원/남매,0,38753,brother and sister
소품/머그컵,0,38688,mug
소품/거울,0,38684,mirror
옷/트레센 학원 교복,0,38604,tracen school uniform
얼굴/눈을 가로지르는 흉터,0,38595,scar across eye
구도/발 잘림,0,38590,foot out of frame
구도/뒤돌아봄,0,38543,facing away
배경/나무 바닥,0,38504,wooden floor
얼굴/콧수염,0,38491,mustache
얼굴/짧은 눈썹,0,38464,short eyebrows
자세/칼 들기,0,38444,holding knife
소품/펼친 책,0,38426,open book
자세/벗은 옷 들기,0,38388,holding unworn clothes
성인/핏줄 선 음경,0,38372,veiny penis
화풍/파란색 위주,0,38302,blue theme
소품/머리 장식 테,0,38278,circlet
성인/넘치는 체액,0,38207,cum overflow
옷/더블 브레스티드,0,38185,double-breasted
옷/흰 스웨터,0,38178,white sweater
옷/갈색 드레스,0,38176,brown dress
자세/의자에 앉음,0,38122,on chair
상태/부상,0,38061,injury
동작/손 흔들기,0,38003,waving
소품/튜브(물놀이),0,37966,innertube
음식/막대사탕,0,37925,lollipop
표정/진지한 표정,0,37913,serious
성인/큰 유륜,0,37912,large areolae
옷/파란 장갑,0,37844,blue gloves
머리/빨간 머리띠,0,37764,red hairband
머리/동물 귀 머리띠,0,37675,animal ear hairband
소품/몬스터볼,0,37633,poke ball
옷/노란 재킷,0,37518,yellow jacket
머리/구레나룻,0,37371,sideburns
자세/하트 손,0,37367,heart hands
옷/파란 기모노,0,37358,blue kimono
배경/석양,0,37325,sunset
얼굴/빨간 입술,0,37311,red lips
옷/털 달린 재킷,0,37290,fur-trimmed jacket
소품/가짜 뿔,0,37269,fake horns
몸/파란 피부,0,37239,blue skin
옷/끈 조절,0,37203,drawstring
소품/하프림 안경,0,37155,under-rim eyewear
몸/페디큐어,0,37122,toenail polish
소품/등불,0,37063,lantern
머리/한쪽 옆 올림머리,0,36995,single side bun
얼굴/얼굴 밴드,0,36989,bandaid on face
효과/화살표,0,36907,arrow (symbol)
메타/동인지 표지,0,36881,doujin cover
옷/검은 망토,0,36815,black cape
자세/바닥에 앉음,0,36809,on floor
몸/겨드랑이 주름,0,36808,armpit crease
양말/망사 팬티스타킹,0,36730,fishnet pantyhose
동물/토끼,0,36707,rabbit
모자/미니 모자,0,36690,mini hat
자세/팔 내림(양쪽),0,36669,arms at sides
동작/흔들리는 가슴,0,36648,bouncing breasts
메타/포켓몬 중심,0,36600,pokemon focus
소품/캔,0,36521,can
효과/색수차,0,36487,chromatic aberration
소품/방패,0,36475,shield
얼굴/이마 무늬,0,36452,forehead mark
자세/뒤에서 안기,0,36451,hug from behind
옷/털 칼라,0,36428,fur collar
표정/삐죽 입,0,36402,:t
자세/콘트라포스토,0,36348,contrapposto
효과/반짝임,0,36336,glint
동물/용,0,36183,dragon
옷/노란 애스콧 타이,0,36113,yellow ascot
눈/소용돌이 눈,0,36110,ringed eyes
배경/눈 내림,0,36057,snowing
자세/다리 모음,0,36030,legs together
머리/비대칭 머리,0,36021,asymmetrical hair
소품/카드,0,35945,card
메타/웨이보 워터마크,0,35880,weibo watermark
표정/벌어진 입,0,35820,split mouth
인원/유령,0,35751,ghost
표정/뾰로통,0,35689,pout
옷/중앙 프릴,0,35678,center frills
자세/가방 들기,0,35667,holding bag
배경/바위,0,35613,rock
자세/모아 올린 가슴,0,35557,breasts squeezed together
자세/다리 사이에 손,0,35490,hand between own legs
인원/성인화,0,35419,aged up
옷/물리법칙 무시 옷,0,35348,impossible clothes
옷/갈색 셔츠,0,35259,brown shirt
소품/캐릭터 인형,0,35193,character doll
자세/볼에 손,0,35192,hand on own cheek
옷/프릴 셔츠,0,35143,frilled shirt
소품/노란 헤일로,0,35137,yellow halo
인원/미소년,0,35100,bishounen
옷/무늬 비키니,0,35077,print bikini
표정/비웃는 미소,0,35064,smirk
배경/타일,0,35003,tiles
성인/젖꼭지 자극,0,34980,nipple stimulation
옷/초록 리본,0,34956,green ribbon
소품/곰 인형,0,34948,teddy bear
메타/작가 로고,0,34892,artist logo
옷/세일러 셔츠,0,34873,sailor shirt
배경/계단,0,34768,stairs
소품/쓰지 않은 모자,0,34747,unworn hat
머리/반묶음 땋기,0,34626,half up braid
성인/여성 자위,0,34613,female masturbation
옷/보라 리본,0,34514,purple ribbon
속옷/팬티스타킹 속 팬티,0,34508,panties under pantyhose
자세/시청자 쪽으로 손 뻗기,0,34502,reaching towards viewer
메타/카드 일러스트,0,34465,card (medium)
눈/검은 흰자,0,34441,black sclera
소품/빨간 헤일로,0,34384,red halo
모자/모자 꽃 장식,0,34358,hat flower
음식/아이스바,0,34212,popsicle
소품/칼집에 꽂힌 칼,0,34066,sheathed
소품/표지판,0,34029,sign
얼굴/머리에 가린 눈썹,0,34002,eyebrows hidden by hair
배경/얼음,0,33966,ice
음식/딸기,0,33901,strawberry
옷/오프숄더 셔츠,0,33888,off-shoulder shirt
모자/바이저 모자,0,33876,visor cap
배경/모래,0,33837,sand
자세/땅에 앉음,0,33720,on ground
소품/수정,0,33657,crystal
몸/쥐 귀,0,33646,mouse ears
소품/핸드백,0,33630,handbag
소품/숟가락,0,33614,spoon
머리/나비 머리장식,0,33601,butterfly hair ornament
소품/해골,0,33566,skull
옷/빨간 조끼,0,33557,red vest
소품/포크,0,33546,fork
모자/비니,0,33440,beanie
옷/검은 스웨터,0,33393,black sweater
상태/옷에 묻은 피,0,33384,blood on clothes
메타/화풍 패러디,0,33245,style parody
성인/인종이 다른 커플,0,33238,interracial
옷/줄무늬 비키니,0,33224,striped bikini
효과/모션 블러,0,33149,motion blur
구도/거꾸로,0,33131,upside-down
몸/몸털,0,33105,body fur
효과/물방울,0,33096,water drop
몸/뾰족한 손톱,0,33073,sharp fingernails
몸/거대한 엉덩이,0,33061,huge ass
소품/함선 장비,0,33011,rigging
음식/아이스크림,0,32944,ice cream
음식/음료,0,32911,drink
옷/스파게티 스트랩,0,32862,spaghetti strap
자세/주머니에 두 손,0,32803,hands in pockets
자세/가슴 아래 팔,0,32767,arm under breasts
모자/간호사 모자,0,32703,nurse cap
몸/흰 털,0,32686,white fur
음식/초콜릿,0,32611,chocolate
옷/갈색 바지,0,32610,brown pants
양말/갈색 니삭,0,32548,brown thighhighs
배경/난간,0,32450,railing
메타/빌린 캐릭터,0,32399,borrowed character
동작/흡연,0,32366,smoking
자세/사람 위에 앉음,0,32358,sitting on person
소품/젓가락,0,32270,chopsticks
메타/다른 색상,0,32203,alternate color
옷/한쪽 어깨 노출,0,32190,single bare shoulder
옷/어깨에 걸친 재킷,0,32124,jacket on shoulders
자세/소파에 앉음,0,32111,on couch
효과/빛줄기,0,32090,light rays
눈/눈 속 기호,0,32071,symbol in eye
신발/파란 신발,0,32025,blue shoes
옷/양면 천,0,32024,two-sided fabric
소품/반다나,0,31940,bandana
옷/검은 원피스 수영복,0,31898,black one-piece swimsuit
옷/흰 목도리,0,31828,white scarf
자세/브이 팔,0,31826,v arms
옷/투톤 드레스,0,31825,two-tone dress
표정/윙크 이모티콘,0,31772,;)
옷/동물 후드,0,31751,animal hood
옷/앞매듭 비키니 상의,0,31745,front-tie bikini top
옷/타바드,0,31722,tabard
구도/다른 대상 중심,0,31711,other focus
옷/광택 나는 옷,0,31625,shiny clothes
배경/나뭇가지,0,31623,branch
옷/흰 케이프,0,31593,white capelet
속옷/파란 팬티,0,31488,blue panties
배경/현대,0,31488,contemporary
자세/물건 껴안기,0,31473,hugging object
자세/장병기 들기,0,31451,holding polearm
머리/머리끈,0,31370,hair tie
옷/운동복,0,31354,sportswear
자세/입 가리기,0,31301,covering own mouth
모자/밀짚모자(챙),0,31283,straw hat
옷/무늬 기모노,0,31180,print kimono
모자/군모,0,31168,military hat
자세/뻗은 손,0,31160,outstretched hand
소품/부적,0,31148,ofuda
화풍/사실적,0,31042,realistic
눈/별 모양 눈동자,0,31029,star-shaped pupils
옷/주름 드레스,0,30995,pleated dress
동작/점프,0,30969,jumping
배경/새해,0,30881,new year
인원/안드로이드,0,30755,android
배경/울타리,0,30563,fence
소품/귀 장식,0,30352,ear ornament
인원/생물,0,30343,creature
옷/파란 레오타드,0,30292,blue leotard
옷/흰 원피스 수영복,0,30280,white one-piece swimsuit
옷/가슴 주머니,0,30279,breast pocket
음식/사과,0,30247,apple
자세/병 들기,0,30206,holding bottle
동물/뱀,0,30164,snake
옷/회색 드레스,0,30109,grey dress
자세/뒤에서 움켜쥐기,0,30060,grabbing from behind
배경/야자수,0,30057,palm tree
소품/카메라,0,30018,camera
구도/셀카,0,29943,selfie
소품/활,0,29934,bow (weapon)
메타/샘플 워터마크,0,29921,sample watermark
자세/상대 얼굴에 손,0,29874,hand on another's face
소품/안경 쓴 모습,0,29860,bespectacled
얼굴/염소수염,0,29792,goatee
소품/화분,0,29775,potted plant
옷/교차 끈 옷,0,29755,cross-laced clothes
얼굴/코,0,29745,nose
소품/꼬리 장식,0,29719,tail ornament
인원/체격 차이,0,29709,size difference
옷/보라 재킷,0,29673,purple jacket
표정/얼굴 전체 홍조,0,29658,full-face blush
자세/마이크 들기,0,29587,holding microphone
몸/사슴뿔,0,29583,antlers
얼굴/코 없음,0,29549,no nose
성인/클리토리스,0,29504,clitoris
옷/검은 기모노,0,29457,black kimono
배경/문,0,29434,door
머리/파란 머리띠,0,29403,blue hairband
화풍/픽셀 아트,0,29380,pixel art
자세/부채 들기,0,29364,holding fan
자세/안경 고쳐 쓰기,0,29305,adjusting eyewear
옷/살짝 보이는 허리,0,29295,midriff peek
머리/머리 방울(종),0,29290,hair bell
표정/말풍선 물음표,0,29265,spoken question mark
성인/재갈,0,29209,gagged
동작/입에 음식,0,29204,food in mouth
효과/색종이,0,29150,confetti
동작/입술 핥기,0,29128,licking lips
인원/엄마와 아이,0,29105,mother and child
성인/상대 엉덩이 움켜쥐기,0,29094,grabbing another's ass
소품/선물 상자,0,29086,gift box
소품/창,0,29054,spear
몸/초록 피부,0,28996,green skin
인원/천사,0,28822,angel
옷/사타구니 솔기,0,28775,crotch seam
화풍/애니화,0,28770,animification
표정/가려진 입,0,28744,covered mouth
배경/물속,0,28674,underwater
자세/쟁반 들기,0,28550,holding tray
인원/쇼타,0,28497,shota
소품/해바라기,0,28422,sunflower
옷/지퍼 손잡이,0,28364,zipper pull tab
양말/보라 니삭,0,28328,purple thighhighs
몸/아담한 체구,0,28311,petite
몸/오금,0,28276,kneepits
메타/쪽 번호,0,28264,page number
소품/펜,0,28167,pen
자세/악기 들기,0,28060,holding instrument
옷/분홍 비키니,0,28055,pink bikini
메타/원신 비전,0,28024,vision (genshin impact)
머리/음식 모양 머리장식,0,28015,food-themed hair ornament
배경/태양,0,28015,sun
구도/머리 잘림,0,28011,head out of frame
표정/동그란 눈,0,27903,o o
배경/수평선,0,27894,horizon
옷/노란 목스카프,0,27871,yellow neckerchief
소품/자동차,0,27832,car
성인/엉덩이 골,0,27810,butt crack
소품/기타,0,27758,guitar
표정/w 입,0,27664,w
옷/이름표,0,27623,name tag
옷/검은 후드티,0,27561,black hoodie
성인/클리토리스 포피,0,27559,clitoral hood
표정/얼굴에 묻은 음식,0,27556,food on face
옷/갸루,0,27478,gyaru
소품/풍선,0,27472,balloon
자세/턱에 손,0,27465,hand on own chin
옷/프릴 리본,0,27425,frilled bow
옷/주황 리본,0,27297,orange bow
메타/심해서함,0,27281,abyssal ship
양말/빨간 니삭,0,27270,red thighhighs
모자/분홍 모자,0,27251,pink hat
메타/유희왕 몬스터,0,27241,duel monster
몸/관절,0,27222,joints
자세/가슴 가리기,0,27200,covering breasts
몸/더듬이,0,27186,antennae
소품/손목시계,0,27186,wristwatch
소품/마법봉,0,27180,wand
메타/다키마쿠라,0,27169,dakimakura (medium)
속옷/하이레그 팬티,0,27131,highleg panties
옷/반장갑,0,27039,half gloves
모자/헌팅캡,0,26943,newsboy cap
인원/그 외 여러 명,0,26905,multiple others
양말/발끝 없는 양말,0,26894,toeless legwear
옷/보라 장갑,0,26887,purple gloves
옷/소매 커프스,0,26855,sleeve cuffs
소품/케이블,0,26849,cable
자세/팔 벌림,0,26839,spread arms
소품/이마 보석,0,26794,forehead jewel
옷/열린 카디건,0,26784,open cardigan
배경/책장,0,26783,bookshelf
머리/긴 옆머리,0,26751,long sidelocks
화풍/3D,0,26731,3d
메타/무언 만화,0,26716,silent comic
화풍/낙서,0,26715,oekaki
옷/체크무늬 옷,0,26713,checkered clothes
구도/1인칭 사타구니,0,26683,pov crotch
효과/침 실,0,26683,saliva trail
옷/프린트 셔츠,0,26677,print shirt
소품/머리 위 가면,0,26668,mask on head
옷/반도 브라,0,26648,bandeau
소품/담요,0,26647,blanket
옷/파란 망토,0,26646,blue cape
머리/비녀,0,26589,hair stick
소품/파란 보석,0,26510,blue gem
자세/머리 만지기,0,26443,adjusting hair
몸/늘어진 가슴,0,26436,hanging breasts
소품/흰 초커,0,26380,white choker
소품/신분증,0,26348,id card
옷/옷 속 비키니,0,26333,bikini under clothes
몸/물고기 꼬리,0,26315,fish tail
소품/접부채,0,26311,folding fan
옷/파일럿 슈트,0,26285,mecha pilot suit
소품/머리 장식,0,26272,headpiece
속옷/한쪽 다리에 걸친 팬티,0,26215,panties around one leg
표정/말하는 중,0,26212,talking
옷/파란 조끼,0,26157,blue vest
성인/살짝 보이는 음부,0,26135,partially visible vulva
소품/시계,0,26124,clock
효과/전기,0,26117,electricity
머리/머리카락 리본,0,26112,tress ribbon
효과/8분음표,0,26083,eighth note
옷/언더버스트,0,26058,underbust
옷/빨간 기모노,0,26051,red kimono
소품/양초,0,26035,candle
소품/몬스터볼(기본),0,26013,poke ball (basic)
옷/겨울옷,0,25993,winter clothes
옷/흰 애스콧 타이,0,25805,white ascot
배경/덤불,0,25799,bush
옷/열린 지퍼,0,25783,open fly
몸/소 귀,0,25768,cow ears
몸/긴 다리,0,25731,long legs
속옷/분홍 브라,0,25690,pink bra
머리/토끼 귀 머리띠,0,25665,rabbit ear hairband
옷/분홍 보타이,0,25633,pink bowtie
자세/머리 위에 올림,0,25631,on head
눈/가려진 눈,0,25533,covered eyes
옷/흰 망토,0,25479,white cape
옷/파란 목스카프,0,25477,blue neckerchief
옷/일본 갑옷,0,25340,japanese armor
옷/검은 민소매,0,25333,black tank top
몸/휘어진 뿔,0,25295,curled horns
소품/바구니,0,25275,basket
옷/하이레그 원피스 수영복,0,25231,highleg one-piece swimsuit
머리/깃털 머리장식,0,25228,feather hair ornament
구도/3컷 만화,0,25196,3koma
성인/음경에 둘러싸임,0,25162,surrounded by penises
동작/마시는 중,0,25115,drinking
자세/뒤로 젖힘,0,25045,leaning back
옷/멀티컬러 재킷,0,25018,multicolored jacket
자세/옆으로 앉음,0,25013,yokozuwari
옷/속옷 셔츠,0,24950,undershirt
효과/필름 그레인,0,24947,film grain
신발/빨간 부츠,0,24923,red boots
메타/회사 이름,0,24908,company name
화풍/제한된 색상,0,24905,limited palette
옷/갈색 코트,0,24860,brown coat
몸/탄탄한 남자,0,24833,toned male
옷/흰 벨트,0,24814,white belt
옷/페티코트,0,24794,petticoat
메타/패트리온 로고,0,24775,patreon logo
소품/컨트롤러,0,24694,controller
성인/하트 검열,0,24679,heart censor
몸/요정 날개,0,24618,fairy wings
자세/꽃다발 들기,0,24573,holding bouquet
옷/노란 드레스,0,24521,yellow dress
양말/파란 니삭,0,24484,blue thighhighs
소품/화살,0,24471,arrow (projectile)
자세/양손으로 얼굴 감쌈,0,24454,hands on own face
효과/다이아몬드 모양,0,24437,diamond (shape)
몸/빨간 뿔,0,24403,red horns
소품/항공기,0,24341,aircraft
몸/비늘,0,24326,scales
소품/유리잔,0,24313,glass
옷/흰 민소매,0,24245,white tank top
옷/할로윈 의상,0,24184,halloween costume
소품/미니 왕관,0,24169,mini crown
자세/모자에 손,0,24157,hand on headwear
소품/일회용 컵,0,24156,disposable cup
몸/어깨 문신,0,24031,shoulder tattoo
옷/흰 손목 커프스,0,24023,white wrist cuffs
성인/오르가즘,0,24020,orgasm
양말/망사 니삭,0,24012,fishnet thighhighs
옷/꽉 끼는 옷,0,23909,tight clothes
소품/빨간 초커,0,23905,red choker
옷/빨간 애스콧 타이,0,23854,red ascot
자세/허리 젖힘,0,23831,arched back
몸/소 뿔,0,23804,cow horns
화풍/레트로,0,23781,retro artstyle
구도/검은 테두리,0,23775,black border
소품/눈알,0,23772,eyeball
옷/하네스,0,23766,harness
자세/동물 안기,0,23741,holding animal
배경/교실 책상,0,23733,school desk
소품/파란 장미,0,23725,blue rose
양말/찢어진 니삭,0,23714,torn thighhighs
자세/펼친 손,0,23710,open hand
옷/흰 칼라,0,23696,white collar
옷/빨간 코트,0,23656,red coat
얼굴/볼 흉터,0,23584,scar on cheek
옷/치어리더,0,23561,cheerleader
옷/흰 후드티,0,23556,white hoodie
소품/치어 방울,0,23516,pom pom (cheerleading)
머리/똥머리 커버,0,23481,bun cover
모자/보라 모자,0,23458,purple hat
옷/털 달린 코트,0,23386,fur-trimmed coat
몸/호랑이 귀,0,23370,tiger ears
옷/일부 풀린 단추,0,23348,partially unbuttoned
성인/같이 목욕,0,23310,shared bathing
자세/투명 의자,0,23260,invisible chair
옷/줄무늬 넥타이,0,23256,striped necktie
표정/식은땀,0,23145,nervous sweating
자세/몬스터볼 들기,0,23140,holding poke ball
동작/쓰다듬기,0,23100,headpat
몸/기계 팔,0,23100,mechanical arms
옷/팔 끈,0,23068,arm strap
옷/팔 보호구,0,23064,vambraces
자세/봉제인형 들기,0,23037,holding stuffed toy
옷/칼라 재킷,0,22993,collared jacket
얼굴/동물 코,0,22934,animal nose
효과/꼬불선,0,22920,squiggle
신발/분홍 신발,0,22912,pink shoes
몸/여러 색 피부,0,22847,multicolored skin
표정/살짝 찡그림,0,22802,light frown
자세/자기 머리에 손,0,22799,hand on own head
메타/인클링,0,22762,inkling
배경/타일 바닥,0,22689,tile floor
성인/후타 x 여성,0,22688,futa with female
동작/독서,0,22599,reading
소품/돌격소총,0,22518,assault rifle
자세/올라탐,0,22445,riding
표정/안쪽 올라간 눈썹,0,22416,raised inner eyebrows
옷/짝짝이 장갑,0,22355,asymmetrical gloves
효과/마법,0,22288,magic
속옷/티팬티,0,22272,thong panties
옷/빨간 바지,0,22270,red pants
성인/쿠퍼액,0,22211,precum
소품/문장,0,22198,emblem
동작/기지개,0,22150,stretching
몸/배,0,22149,belly
자세/접시 들기,0,22143,holding plate
머리/리본 머리띠,0,22128,bow hairband
옷/민소매 터틀넥,0,22119,sleeveless turtleneck
성인/젖꼭지 피어싱,0,22088,nipple piercing
옷/초록 넥타이,0,22083,green necktie
인원/요정,0,22065,fairy
소품/램프,0,22046,lamp
소품/군용 차량,0,22015,military vehicle
머리/대머리,0,21990,bald
얼굴/얼굴 문신,0,21952,facial tattoo
옷/고딕 롤리타,0,21951,gothic lolita
모자/세일러 모자,0,21945,sailor hat
화풍/실루엣,0,21941,silhouette
자세/등 맞댐,0,21898,back-to-back
옷/보라 비키니,0,21882,purple bikini
몸/다리 밴드,0,21879,bandaid on leg
옷/하이레그 비키니,0,21842,highleg bikini
자세/이불 속,0,21796,under covers
몸/회색 피부,0,21761,grey skin
옷/반팔 겹쳐 입기,0,21720,short over long sleeves
신발/파란 부츠,0,21713,blue boots
옷/분홍 기모노,0,21701,pink kimono
몸/새 날개,0,21687,bird wings
머리/개구리 머리장식,0,21686,frog hair ornament
옷/흰 보타이,0,21679,white bowtie
성인/이종간,0,21675,interspecies
옷/겹겹 드레스,0,21666,layered dress
옷/발바닥 장갑,0,21635,paw gloves
효과/그늘,0,21612,shade
소품/깃발,0,21605,flag
동작/춤,0,21586,dancing
옷/빨간 반바지,0,21586,red shorts
동작/옷 잡아당기기,0,21579,pulling own clothes
옷/검은 케이프,0,21537,black capelet
몸/떨어진 손,0,21530,disembodied hand
양말/짝짝이 레그웨어,0,21514,mismatched legwear
표정/웃음,0,21513,laughing
표정/사악한 미소,0,21473,evil smile
소품/함포,0,21462,ship turret
자세/입에 손,0,21447,hand to own mouth
옷/허리에 맨 옷,0,21442,clothes around waist
옷/파란 코트,0,21423,blue coat
몸/초록 손톱,0,21412,green nails
동작/딥키스,0,21408,french kiss
표정/삼각 입,0,21346,triangle mouth
옷/노란 넥타이,0,21346,yellow necktie
소품/기계 헤일로,0,21262,mechanical halo
성인/서서 하는 체위,0,21241,standing sex
자세/상대 팔 잡기,0,21210,grabbing another's arm
옷/빨간 레오타드,0,21203,red leotard
메타/십이지,0,21143,chinese zodiac
옷/보라 보타이,0,21122,purple bowtie
머리/프릴 머리띠,0,21119,frilled hairband
옷/파란 목도리,0,21110,blue scarf
눈/눈동자 없음,0,21061,no pupils
구도/설정화,0,21056,reference sheet
성인/함몰 젖꼭지,0,21027,inverted nipples
소품/삼각 머리장식,0,21012,triangular headpiece
표정/눈 굴리기,0,20982,rolling eyes
옷/신부 베일,0,20942,bridal veil
얼굴/빨간 아이섀도,0,20937,red eyeshadow
옷/겹친 치마,0,20925,layered skirt
옷/동물 의상,0,20920,animal costume
몸/동물 귀 피어싱,0,20904,animal ear piercing
소품/와인잔,0,20888,wine glass
옷/팽팽한 옷,0,20849,taut clothes
인원/모녀,0,20828,mother and daughter
배경/벤치,0,20826,bench
옷/보라 기모노,0,20764,purple kimono
자세/깍지 낀 손,0,20751,own hands clasped
옷/갈색 카디건,0,20740,brown cardigan
옷/붕대 감은 다리,0,20728,bandaged leg
소품/가슴 보석,0,20700,chest jewel
옷/단추 풀림,0,20696,unbuttoned
자세/다리 들기,0,20666,leg lift
옷/노란 비키니,0,20650,yellow bikini
옷/노치드 라펠,0,20642,notched lapels
소품/고헤이,0,20622,gohei
몸/쥐 꼬리,0,20612,mouse tail
성인/스스로 벌림,0,20605,spreading own pussy
소품/열쇠,0,20565,key
몸/아쿠아 손톱,0,20532,aqua nails
화풍/부분 채색(일부),0,20532,partially colored
머리/토끼 머리장식,0,20515,rabbit hair ornament
옷/아쿠아 넥타이,0,20495,aqua necktie
소품/홀스터,0,20482,holster
눈/빨간 눈동자,0,20470,red pupils
소품/토끼 인형,0,20459,stuffed rabbit
표정/겁먹음,0,20453,scared
소품/벗은 안경,0,20385,unworn eyewear
상태/젖은 셔츠,0,20363,wet shirt
머리/귀 리본,0,20355,ear bow
배경/다다미,0,20332,tatami
자세/드레스 잡기,0,20305,holding own dress
소품/낫,0,20296,scythe
인원/남자 5명,0,20293,5boys
얼굴/입 없음,0,20269,no mouth
성인/콘돔 포장,0,20259,condom wrapper
음식/빼빼로,0,20253,pocky
옷/프릴 허벅지 끈,0,20244,frilled thigh strap
자세/몸 보여주기,0,20220,presenting own body
소품/흰 장미,0,20201,white rose
음식/빵,0,20174,bread
몸/피부로 덮인 뿔,0,20159,skin-covered horns
자세/양반다리,0,20076,indian style
옷/줄무늬 드레스,0,20070,striped dress
옷/묶은 셔츠,0,20059,tied shirt
머리/나란한 머리핀,0,20045,parallel hairclips
소품/안대,0,20016,eye mask
자세/자기 팔에 손,0,20014,hand on own arm
옷/가죽,0,20004,leather
소품/단검,0,20000,dagger
머리/화관,0,19998,head wreath
자세/가슴에 손,0,19994,hands on own chest
속옷/리본 브라,0,19982,bow bra
몸/검은 꼬리,0,19946,black tail
소품/닻 기호,0,19943,anchor symbol
자세/경례,0,19876,salute
머리/흰 브릿지,0,19836,white streaks
소품/여러 반지,0,19834,multiple rings
소품/십자가 목걸이,0,19833,cross necklace
옷/갈색 스웨터,0,19828,brown sweater
옷/갈색 반바지,0,19821,brown shorts
소품/도끼,0,19814,axe
동작/전투,0,19810,battle
옷/회색 반바지,0,19803,grey shorts
머리/빨간 브릿지,0,19756,red streaks
효과/도깨비불,0,19731,hitodama
자세/과일 들기,0,19706,holding fruit
눈/다른 눈 색,0,19699,alternate eye color
소품/뿔 장식,0,19699,horn ornament
동물/검은 고양이,0,19683,black cat
소품/양동이,0,19682,bucket
얼굴/둥근 치아,0,19676,round teeth
구도/서로 마주 봄,0,19646,facing another
소품/목에 건 헤드폰,0,19645,headphones around neck
인원/동물화,0,19636,animalization
화풍/망점,0,19588,halftone
소품/별 귀걸이,0,19500,star earrings
자세/꼬리 세움,0,19465,tail raised
자세/허벅지에 손,0,19452,hand on own thigh
몸/상어 꼬리,0,19443,shark tail
구도/얼굴 마주 봄,0,19434,face-to-face
표정/말풍선 느낌표,0,19433,spoken exclamation mark
동작/악기 연주,0,19425,playing instrument
상태/젖은 머리,0,19366,wet hair
소품/컴퓨터,0,19355,computer
구도/글자 중심,0,19327,text focus
소품/찻주전자,0,19322,teapot
옷/주황 셔츠,0,19319,orange shirt
옷/정장 재킷,0,19308,suit jacket
배경/판타지,0,19280,fantasy
인원/흡혈귀,0,19262,vampire
옷/회색 스웨터,0,19250,grey sweater
표정/취함,0,19241,drunk
모자/기울어진 모자,0,19202,tilted headwear
몸/너구리 귀,0,19193,raccoon ears
얼굴/수염 무늬,0,19176,whisker markings
머리/프릴 머리 튜브,0,19158,frilled hair tubes
성인/사용한 콘돔,0,19156,used condom
소품/대포,0,19109,cannon
몸/견갑골,0,19105,shoulder blades
옷/빨간 하카마,0,19077,red hakama
자세/엄지 척,0,19002,thumbs up
표정/씩 웃는 입,0,18975,:>
몸/가슴근육 골,0,18965,pectoral cleavage
옷/로우라이즈,0,18963,lowleg
화풍/분홍색 위주,0,18947,pink theme
머리/잎 머리장식,0,18943,leaf hair ornament
옷/검은 정장,0,18938,black suit
배경/단풍잎,0,18917,autumn leaves
옷/노란 치마,0,18878,yellow skirt
표정/짜증,0,18857,annoyed
모자/동물 모자,0,18840,animal hat
인원/형제,0,18831,brothers
속옷/빨간 팬티,0,18827,red panties
배경/어둠,0,18826,dark
자세/벽에 기댐,0,18814,against wall
효과/공기 방울,0,18783,air bubble
자세/자기 머리 잡기,0,18780,holding own hair
눈/좁아진 눈동자,0,18776,constricted pupils
양말/짝짝이 양말,0,18770,uneven legwear
옷/열린 기모노,0,18732,open kimono
자세/다리 끌어안기,0,18705,hugging own legs
모자/모자 밖으로 나온 귀,0,18684,ears through headwear
소품/구슬 목걸이,0,18674,bead necklace
옷/지퍼 내림,0,18671,unzipped
모자/모자 깃털,0,18585,hat feather
몸/빨간 피부,0,18543,red skin
인원/쥐 소녀,0,18508,mouse girl
몸/드러난 가슴근육,0,18507,bare pectorals
효과/바람에 날리는 치마,0,18503,wind lift
소품/분홍 장미,0,18497,pink rose
효과/입김,0,18492,puff of air
옷/옷 속 수영복,0,18491,swimsuit under clothes
소품/여우 가면,0,18490,fox mask
옷/비치는 소매,0,18487,see-through sleeves
옷/어깨에 걸친 코트,0,18485,coat on shoulders
옷/오프숄더 스웨터,0,18459,off-shoulder sweater
몸/뚱뚱함,0,18450,fat
효과/실로 된 하트,0,18430,heart of string
소품/사진,0,18430,photo (object)
소품/부적 장식,0,18394,charm (object)
옷/털 달린 소매,0,18393,fur-trimmed sleeves
양말/분홍 니삭,0,18391,pink thighhighs
자세/상대 손목 잡기,0,18383,holding another's wrist
소품/벗은 신발,0,18370,unworn shoes
성인/하복부 문신,0,18366,pubic tattoo
옷/초록 비키니,0,18353,green bikini
얼굴/빨간 아이라이너,0,18351,red eyeliner
몸/가슴 문신,0,18333,chest tattoo
소품/란도셀,0,18333,randoseru
몸/꼬리 두 개,0,18320,two tails
자세/공주님 안기,0,18313,princess carry
소품/붓,0,18309,paintbrush
옷/빨간 케이프,0,18299,red capelet
옷/비키니 스커트,0,18227,bikini skirt
성인/한쪽 가슴 노출,0,18203,one breast out
옷/비치는 셔츠,0,18201,see-through shirt
표정/귀 빨개짐,0,18159,ear blush
옷/7부 소매,0,18157,three-quarter sleeves
몸/꿰맨 자국,0,18132,stitches
소품/실,0,18098,string
표정/밤톨 입,0,18077,chestnut mouth
효과/오라,0,18060,aura
소품/지우산,0,18014,oil-paper umbrella
옷/슈퍼히어로 의상,0,18012,superhero costume
옷/팔목 보호대,0,18009,bracer
시선/시선 피함,0,17978,averting eyes
인원/모두,0,17964,everyone
옷/흰 보디수트,0,17919,white bodysuit
눈/투톤 눈,0,17885,two-tone eyes
얼굴/얼굴 피어싱,0,17874,face piercing
소품/하트 귀걸이,0,17847,heart earrings
몸/머리 지느러미,0,17845,head fins
소품/머릿수건,0,17837,headscarf
음식/당근,0,17815,carrot
옷/초록 바지,0,17787,green pants
자세/가슴 사이에 낀 옷,0,17786,clothes between breasts
머리/눈 사이로 내려온 머리,0,17786,long hair between eyes
효과/눈송이,0,17777,snowflakes
자세/한쪽 무릎 꿇음,0,17764,on one knee
화풍/2000년대 스타일,0,17755,2000s (style)
소품/벨트형 목걸이,0,17738,belt collar
옷/검은 목스카프,0,17727,black neckerchief
옷/후드 망토,0,17719,hooded cloak
소품/게임 컨트롤러,0,17716,game controller
자세/선물 들기,0,17713,holding gift
소품/스파이크 목걸이,0,17709,spiked collar
머리/뱀 머리장식,0,17697,snake hair ornament
머리/십자가 머리장식,0,17684,cross hair ornament
얼굴/아랫니만,0,17679,lower teeth only
메타/어색한 해부학,0,17668,bad anatomy
속옷/보라 팬티,0,17646,purple panties
얼굴/페이스 페인팅,0,17633,facepaint
메타/게임 UI,0,17623,gameplay mechanics
신발/신발 밑창,0,17621,shoe soles
인원/고양이 소년,0,17620,cat boy
소품/배,0,17610,watercraft
인원/노인,0,17601,old
동작/키스 직전,0,17585,imminent kiss
몸/탄탄한 여성,0,17578,toned female
모자/보닛,0,17575,bonnet
성인/MMF 쓰리섬,0,17556,mmf threesome
옷/가슴 하네스,0,17551,chest harness
구도/단면도,0,17538,cross-section
옷/파란 스웨터,0,17536,blue sweater
동작/목욕,0,17531,bathing
옷/무릎 보호대,0,17522,knee pads
소품/벨트 파우치,0,17515,belt pouch
소품/칼집(검집),0,17499,scabbard
몸/투톤 피부,0,17497,two-tone skin
옷/체육복 상의,0,17492,gym shirt
몸/배꼽 피어싱,0,17447,navel piercing
자세/머리 위 동물,0,17423,animal on head
자세/발끝으로 섬,0,17410,tiptoes
얼굴/삐져나온 송곳니,0,17363,fang out
옷/오버사이즈 옷,0,17362,oversized clothes
소품/액자,0,17348,picture frame
소품/음료 캔,0,17336,drink can
성인/FFM 쓰리섬,0,17311,ffm threesome
인원/키츠네,0,17302,kitsune
배경/겨울,0,17301,winter
눈/멍한 눈,0,17291,blank eyes
옷/노란 보타이,0,17279,yellow bowtie
옷/줄무늬 보타이,0,17274,striped bowtie
성인/남성 삽입받음,0,17262,male penetrated
눈/십자 눈동자,0,17243,cross-shaped pupils
자세/포크 들기,0,17242,holding fork
효과/잔상,0,17206,afterimage
소품/모니터,0,17183,monitor
머리/초승달 머리장식,0,17170,crescent hair ornament
배경/덩굴,0,17142,vines
소품/귀마개,0,17140,earmuffs
자세/자기 무릎에 손,0,17120,hand on own knee
자세/무릎에 앉음,0,17096,sitting on lap
머리/옆 땋은 머리,0,17090,side braids
옷/분홍 장갑,0,17088,pink gloves
표정/긴장,0,17073,nervous
소품/동물 목줄,0,17064,animal collar
동물/박쥐,0,17051,bat (animal)
몸/얼음 날개,0,17038,ice wings
옷/파란 후드티,0,17027,blue hoodie
옷/검은 목도리,0,17017,black scarf
옷/초록 조끼,0,17017,green vest
상태/손에 묻은 피,0,17014,blood on hand
머리/외줄 옆머리,0,17014,single sidelock
옷/흰 캐미솔,0,16990,white camisole
표정/떨떠름한 입,0,16957,:/
소품/비행기,0,16950,airplane
표정/코피,0,16886,nosebleed
몸/보라 피부,0,16883,purple skin
소품/동전,0,16881,coin
메타/디지몬,0,16879,digimon (creature)
소품/다리 리본,0,16877,leg ribbon
표정/움찔,0,16864,wince
옷/투톤 셔츠,0,16833,two-tone shirt
양말/반바지 속 팬티스타킹,0,16821,pantyhose under shorts
표정/슬픔,0,16800,sad
소품/검은 헤일로,0,16795,black halo
옷/초록 반바지,0,16788,green shorts
소품/빨간 보석,0,16786,red gem
소품/빨간 목걸이,0,16744,red collar
성인/의미 없는 검열,0,16737,pointless censoring
옷/브이넥,0,16737,v-neck
소품/자루,0,16726,sack
인원/아빠와 아이,0,16725,father and child
눈/외눈,0,16721,one-eyed
구도/음식 중심,0,16718,food focus
자세/담배 들기,0,16715,holding cigarette
자세/젓가락 들기,0,16691,holding chopsticks
자세/숟가락 들기,0,16665,holding spoon
옷/털 달린 장갑,0,16661,fur-trimmed gloves
성인/펠라 핥기,0,16660,licking penis
소품/초록 헤일로,0,16614,green halo
소품/파란 초커,0,16544,blue choker
소품/소 방울,0,16542,cowbell
눈/노란 흰자,0,16542,yellow sclera
소품/시메나와,0,16524,shimenawa
효과/엑스레이,0,16523,x-ray
머리/롤리타 머리띠,0,16509,lolita hairband
속옷/파란 브라,0,16460,blue bra
음식/화과자,0,16446,wagashi
옷/사선 무늬 옷,0,16427,diagonal-striped clothes
자세/시청자 가리키기,0,16423,pointing at viewer
자세/사탕 들기,0,16415,holding candy
표정/신음,0,16414,moaning
자세/M자 다리,0,16395,m legs
자세/캔 들기,0,16381,holding can
속옷/검은 스포츠 브라,0,16379,black sports bra
인원/누나x쇼타,0,16356,onee-shota
인원/다중 인격,0,16339,multiple persona
인원/인어족,0,16336,merfolk
속옷/끈 팬티(스트링),0,16305,string panties
옷/회색 장갑,0,16287,grey gloves
몸/아주 어두운 피부,0,16286,very dark skin
옷/분홍 스웨터,0,16283,pink sweater
시선/물건 바라봄,0,16275,looking at object
배경/동아시아 건축,0,16267,east asian architecture
옷/찢어진 셔츠,0,16257,torn shirt
표정/장난스러운 미소,0,16242,>:)
동작/깨물기,0,16241,biting
구도/어깨 너머,0,16225,over shoulder
옷/돌핀 쇼츠,0,16217,dolphin shorts
음식/도넛,0,16193,donut
인원/어두운 인격,0,16166,dark persona
양말/레이스 니삭,0,16149,lace-trimmed thighhighs
동물/개구리,0,16115,frog
표정/느낌표 두 개,0,16070,!!
화풍/알페스 스타일,0,16055,alphes (style)
구도/용기 속,0,16039,in container
옷/반쯤 벗은 재킷,0,16036,jacket partially removed
속옷/레이스 브라,0,16034,lace-trimmed bra
옷/끈 사이 틈,0,16033,strap gap
성인/선정적,0,16026,sexually suggestive
배경/도리이,0,16016,torii
소품/목 고리,0,15975,neck ring
음식/호박,0,15953,pumpkin
머리/구슬 머리장식,0,15886,sphere hair ornament
소품/등에 멘 무기,0,15866,weapon on back
양말/회색 니삭,0,15851,grey thighhighs
배경/어두운 배경,0,15848,dark background
머리/분홍 머리띠,0,15834,pink hairband
자세/활 들기,0,15830,holding bow (weapon)
옷/털 달린 망토,0,15815,fur-trimmed cape
옷/오링 비키니,0,15812,o-ring bikini
화풍/금색,0,15810,gold
몸/이두근,0,15804,biceps
성인/포섬,0,15803,foursome
메타/스퀸스,0,15799,squeans
소품/스툴,0,15766,stool
옷/아쿠아 리본,0,15759,aqua bow
소품/리본 초커,0,15759,ribbon choker
배경/초승달,0,15749,crescent moon
모자/수녀 두건,0,15731,nun headdress
옷/초록 보타이,0,15702,green bowtie
소품/구슬 팔찌,0,15683,bead bracelet
눈/삼백안,0,15656,sanpaku
자세/상대 머리 잡기,0,15633,holding another's hair
동작/노래,0,15628,singing
머리/파란 브릿지,0,15599,blue streaks
옷/투톤 재킷,0,15596,two-tone jacket
음식/차,0,15594,tea
자세/겨냥,0,15579,aiming
옷/빨간 띠,0,15566,red sash
자세/사타구니 가리기,0,15557,covering crotch
성인/거대한 음경,0,15545,huge penis
소품/트럼프 카드,0,15544,playing card
소품/술 귀걸이,0,15519,tassel earrings
소품/조개,0,15509,shell
동작/고개 돌림,0,15508,turning head
효과/그림자,0,15490,drop shadow
소품/일렉기타,0,15481,electric guitar
옷/끈,0,15454,strap
자세/다리 찢기,0,15423,split
옷/털 달린 드레스,0,15418,fur-trimmed dress
머리/노란 머리띠,0,15402,yellow hairband
모자/플랫캡,0,15395,flat cap
몸/갈비뼈,0,15382,ribs
자세/마법봉 들기,0,15379,holding wand
옷/하스노소라 교복,0,15365,hasu no sora school uniform
옷/빨간 스웨터,0,15350,red sweater
옷/세운 칼라,0,15344,popped collar
인원/메카 소녀,0,15334,mecha musume
옷/털 달린 케이프,0,15299,fur-trimmed capelet
화풍/선화,0,15280,lineart
옷/파란 소매,0,15277,blue sleeves
몸/어두운 피부,0,15274,deep skin
양말/무늬 니삭,0,15250,print thighhighs
옷/흰 베일,0,15250,white veil
배경/벽돌 벽,0,15239,brick wall
모자/회색 모자,0,15239,grey hat
소품/히비스커스,0,15239,hibiscus
머리/아주 긴 땋은 머리,0,15234,very long braid
머리/여러 머리 리본,0,15229,multiple hair bows
몸/염소 뿔,0,15223,goat horns
몸/갈색 털,0,15218,brown fur
몸/몸 무늬,0,15217,body markings
몸/호랑이 꼬리,0,15193,tiger tail
소품/프릴 초커,0,15176,frilled choker
구도/나란히,0,15158,side-by-side
몸/잘록한 허리,0,15143,narrow waist
소품/연필,0,15093,pencil
소품/닻,0,15086,anchor
소품/양산,0,15086,parasol
동작/사람 안기,0,15083,carrying person
몸/곰 귀,0,15079,bear ears
소품/진주 목걸이,0,15070,pearl necklace
머리/끝만 다른 색,0,15064,colored extremities
음식/버섯,0,15053,mushroom
신발/통굽 샌들,0,15034,platform sandals
인원/의인화(인간형),0,15018,humanization
옷/갈색 조끼,0,15011,brown vest
눈/빛나는 한쪽 눈,0,14998,glowing eye
옷/비대칭 옷,0,14988,asymmetrical clothes
자세/종이 들기,0,14969,holding paper
옷/캐주얼 원피스 수영복,0,14964,casual one-piece swimsuit
효과/잠자는 표시,0,14946,zzz
구도/탈것 중심,0,14926,vehicle focus
동작/발차기,0,14913,kicking
효과/폭발,0,14901,explosion
머리/큐브 머리장식,0,14883,cube hair ornament
인원/인어,0,14855,mermaid
옷/하트 모양 뚫림,0,14824,heart cutout
옷/가슴 사이 넥타이,0,14810,necktie between breasts
몸/여분의 팔,0,14794,extra arms
동작/추락,0,14776,falling
배경/욕조,0,14763,bath
옷/래글런 소매,0,14749,raglan sleeves
옷/후드 코트,0,14747,hooded coat
옷/노란 장갑,0,14744,yellow gloves
소품/휴대용 게임기,0,14742,handheld game console
자세/머리 맞댐,0,14742,heads together
인원/상어 소녀,0,14736,shark girl
음식/햄버거,0,14730,burger
눈/다이아 모양 눈동자,0,14726,diamond-shaped pupils
자세/겨드랑이 보여주기,0,14720,presenting own armpit
음식/쿠키,0,14712,cookie
배경/산 지평선,0,14709,mountainous horizon
소품/텔레비전,0,14687,television
옷/쇼걸 스커트,0,14653,showgirl skirt
옷/금색 비키니,0,14642,gold bikini
소품/물병,0,14640,water bottle
자세/카드 들기,0,14624,holding card
표정/유혹적인 미소,0,14601,seductive smile
배경/격자 배경,0,14598,grid background
효과/떠오르는 옷,0,14574,floating clothes
효과/물결,0,14566,ripples
몸/분리된 날개,0,14560,detached wings
속옷/레이스 팬티,0,14554,lace-trimmed panties
머리/머리 길이 변경(길게),0,14553,alternate hair length (longer)
옷/멀티컬러 드레스,0,14551,multicolored dress
배경/미닫이문,0,14532,sliding doors
메타/연령 등급,0,14529,content rating
옷/크롭탑 아래로 비치는 가슴,0,14509,crop top overhang
모자/개리슨 캡,0,14505,garrison cap
옷/경찰 제복,0,14505,police uniform
효과/나뭇잎 사이 햇살,0,14474,dappled sunlight
메타/가짜 스크린샷,0,14462,fake screenshot
옷/빨간 보디수트,0,14452,red bodysuit
소품/동물 귀 헤드폰,0,14444,animal ear headphones
소품/망치,0,14443,hammer
옷/보라 넥타이,0,14424,purple necktie
몸/너구리 꼬리,0,14423,raccoon tail
성인/옷 위로 발기,0,14415,erection under clothes
자세/안짱다리,0,14409,pigeon-toed
소품/검은 가방,0,14398,black bag
화풍/공식 스타일,0,14373,official style
옷/멀티컬러 장갑,0,14368,multicolored gloves
옷/주황 치마,0,14308,orange skirt
몸/사자 귀,0,14283,lion ears
성인/동성 목욕,0,14283,same-sex bathing
몸/다리 문신,0,14278,leg tattoo
소품/금 귀걸이,0,14258,gold earrings
옷/민소매 재킷,0,14253,sleeveless jacket
몸/검은 털,0,14240,black fur
몸/노란 손톱,0,14235,yellow nails
소품/이어폰,0,14218,earphones
동물/말,0,14215,horse
옷/초록 기모노,0,14210,green kimono
인원/노인 남성,0,14206,old man
옷/오링 상의,0,14188,o-ring top
옷/해군 제복,0,14165,naval uniform
옷/무늬 드레스,0,14158,print dress
동물/새끼 동물,0,14152,baby animal
소품/곡옥,0,14146,magatama
자세/옆으로 기움,0,14142,leaning to the side
옷/전통 보타이,0,14130,traditional bowtie
배경/여름,0,14084,summer
성인/프레임 밖 처리,0,14082,out-of-frame censoring
몸/무릎,0,14055,knees
소품/팔 대포,0,14037,arm cannon
양말/발등 걸이 레그웨어,0,14034,stirrup legwear
화풍/빨간색 위주,0,14027,red theme
자세/가슴 아래 팔(양팔),0,14026,arms under breasts
옷/상의 없음,0,14022,no shirt
옷/찢어진 바지,0,14002,torn pants
음식/체리,0,13996,cherry
인원/소 소녀,0,13982,cow girl
상태/더러움,0,13978,dirty
옷/컷오프 데님,0,13966,cutoffs
효과/투명,0,13954,transparent
옷/초록 장갑,0,13952,green gloves
옷/드레스 리본,0,13951,dress bow
옷/흰 로브,0,13946,white robe
소품/주황 꽃,0,13921,orange flower
옷/홀터넥 드레스,0,13911,halter dress
몸/처진 귀,0,13892,floppy ears
옷/노란 스웨터,0,13873,yellow sweater
몸/곤충 날개,0,13868,insect wings
자세/비대칭 겹침,0,13865,asymmetrical docking
자세/카메라 들기,0,13844,holding camera
옷/아가일 무늬 옷,0,13832,argyle clothes
성인/여성 오르가즘,0,13817,female orgasm
모자/타테에보시,0,13811,tate eboshi
소품/단풍잎,0,13808,maple leaf
소품/목걸이 끈,0,13786,lanyard
소품/주사기,0,13768,syringe
얼굴/수염(동물),0,13744,whiskers
옷/무네아테,0,13734,muneate
효과/세뇌,0,13733,mind control
자세/펜 들기,0,13726,holding pen
모자/미니 톱햇,0,13716,mini top hat
옷/분홍 카디건,0,13710,pink cardigan
몸/비대칭 날개,0,13685,asymmetrical wings
양말/회색 팬티스타킹,0,13667,grey pantyhose
소품/검은 마스크,0,13662,black mask
몸/등 골,0,13659,median furrow
눈/눈 속 하트,0,13634,heart in eye
인원/뚱뚱한 남자,0,13621,fat man
효과/속도선,0,13616,speed lines
성인/소변,0,13615,pee
몸/가슴털,0,13606,chest hair
인원/그 외 2명,0,13604,2others
소품/거대한 물건,0,13604,oversized object
양말/파란 양말,0,13598,blue socks
배경/가로등,0,13598,lamppost
몸/길고 뾰족한 귀,0,13596,long pointy ears
몸/검은 피부,0,13595,black skin
신발/검은 샌들,0,13590,black sandals
옷/플러그슈트,0,13579,plugsuit (evangelion)
표정/수줍음,0,13571,shy
표정/입가 침,0,13569,mouth drool
배경/전선,0,13561,power lines
옷/미디 드레스,0,13536,medium dress
메타/장면 참고,0,13518,scene reference
구도/눈 잘림,0,13503,eyes out of frame
모자/초승달 모자장식,0,13498,crescent hat ornament
인원/얼굴 없는 여자,0,13497,faceless female
메타/밀레니엄 로고,0,13495,millennium science school logo
옷/흰 목스카프,0,13490,white neckerchief
배경/헐벗은 나무,0,13482,bare tree
메타/성우 연결,0,13482,voice actor connection
메타/명일방주 감염 모니터,0,13477,infection monitor (arknights)
머리/날개 머리장식,0,13472,wing hair ornament
양말/프릴 니삭,0,13451,frilled thighhighs
배경/체크무늬 바닥,0,13447,checkered floor
옷/짧은 넥타이,0,13443,short necktie
옷/소무늬 비키니,0,13442,cow print bikini
소품/거대한 무기,0,13415,huge weapon
몸/구체관절,0,13407,doll joints
표정/하품,0,13404,yawning
몸/숫자 문신,0,13397,number tattoo
옷/흰 넥타이,0,13373,white necktie
눈/타원형 점 눈,0,13364,solid oval eyes
머리/땋은 머리 고리,0,13347,braided hair rings
소품/가위,0,13325,scissors
자세/대칭 겹침,0,13320,symmetrical docking
옷/연미복,0,13319,tailcoat
소품/검은 꽃,0,13318,black flower
옷/체크 리본,0,13314,plaid bow
눈/여분의 눈,0,13311,extra eyes
옷/미타키하라 교복,0,13310,mitakihara school uniform
배경/대나무,0,13301,bamboo
동작/꼬리 흔들기,0,13290,tail wagging
얼굴/코 밴드,0,13273,bandaid on nose
눈/눈 없음,0,13270,no eyes
메타/명조 타세트 마크,0,13268,tacet mark (wuthering waves)
화풍/보라색 위주,0,13265,purple theme
눈/짝짝이 눈동자,0,13262,mismatched pupils
옷/기타 고교 교복,0,13248,kita high school uniform
옷/파란 보디수트,0,13230,blue bodysuit
옷/물방울무늬 리본,0,13226,polka dot bow
자세/양손으로 볼 감쌈,0,13215,hands on own cheeks
동물/파란 나비,0,13181,blue butterfly
옷/팔 보호대,0,13178,arm guards
모자/별 모자장식,0,13165,star hat ornament
음식/케이크 조각,0,13147,cake slice
자세/막대사탕 들기,0,13142,holding lollipop
배경/칠판,0,13127,chalkboard
화풍/해칭,0,13119,hatching (texture)
옷/정강이 갑옷,0,13109,greaves
소품/떠 있는 귀걸이,0,13084,floating earrings
옷/가슴 사라시,0,13082,chest sarashi
눈/눈 속 별,0,13068,star in eye
옷/프릴 칼라,0,13067,frilled collar
양말/줄무늬 팬티스타킹,0,13060,striped pantyhose
배경/무지개,0,13030,rainbow
눈/제3의 눈,0,13015,third eye
메타/이름 연결,0,13010,name connection
옷/세로줄 셔츠,0,13009,vertical-striped shirt
표정/윙크 놀람,0,12986,;o
옷/검은 망토(클로크),0,12974,black cloak
소품/기관단총,0,12971,submachine gun
신발/분홍 부츠,0,12966,pink boots
인원/보이시한 소녀,0,12959,tomboy
음식/복숭아,0,12943,peach
소품/받침 접시,0,12924,saucer
표정/여러 표정,0,12919,multiple expressions
성인/수간,0,12917,zoophilia
효과/햇살,0,12913,sunbeam
소품/분홍 초커,0,12895,pink choker
몸/꼬리 리본,0,12894,tail bow
몸/노란 털,0,12894,yellow fur
음식/커피,0,12883,coffee
몸/원피스 태닝 자국,0,12880,one-piece tan
자세/공 들기,0,12865,holding ball
옷/회색 코트,0,12859,grey coat
화풍/플랫 컬러,0,12856,flat color
소품/곰방대,0,12856,smoking pipe
소품/십자가 귀걸이,0,12845,cross earrings
인원/몬스터 소년,0,12825,monster boy
소품/하트 브로치,0,12814,heart brooch
소품/모빌슈트,0,12814,mobile suit
몸/로봇 관절,0,12809,robot joints
옷/짝짝이 장갑,0,12791,mismatched gloves
성인/포피,0,12789,foreskin
자세/서서 다리 찢기,0,12782,standing split
메타/특징 연결,0,12768,trait connection
양말/한쪽 양말,0,12766,single sock
머리/긴 구레나룻,0,12761,long sideburns
옷/주황 재킷,0,12760,orange jacket
몸/날개 하나,0,12736,single wing
몸/양 뿔,0,12730,sheep horns
화풍/1990년대 스타일,0,12722,1990s (style)
효과/녹화 화면,0,12718,recording
몸/팔 흉터,0,12716,scar on arm
몸/분홍 피부,0,12658,pink skin
인원/강아지 소년,0,12655,dog boy
소품/머리 위 잎,0,12649,leaf on head
구도/메카 중심,0,12644,mecha focus
몸/투톤 털,0,12638,two-tone fur
효과/마법진,0,12618,magic circle
인원/해골,0,12606,skeleton
효과/떠 있는 물체,0,12605,floating object
신발/보라 신발,0,12567,purple shoes
표정/졸림,0,12557,sleepy
몸/여러 색 손톱,0,12544,multicolored nails
모자/털 달린 모자,0,12510,fur-trimmed headwear
옷/비치는 가슴골,0,12507,see-through cleavage
동작/시트 움켜쥠,0,12497,sheet grab
효과/물 튀김,0,12483,splashing
구도/참고 삽입 그림,0,12469,reference inset
옷/터틀넥 셔츠,0,12468,turtleneck shirt
상태/멍,0,12449,bruise
표정/말풍선 음표,0,12435,spoken musical note
자세/모자 손에 들기,0,12430,holding unworn hat
표정/흐르는 눈물,0,12428,streaming tears
성인/하트 니플 패치,0,12424,heart pasties
소품/갈색 가방,0,12409,brown bag
자세/상대 볼에 손,0,12389,hand on another's cheek
옷/회색 조끼,0,12387,grey vest
소품/회색 헤일로,0,12373,grey halo
메타/색이 다른 포켓몬,0,12362,shiny pokemon
음식/수박,0,12358,watermelon
옷/남성 수영복,0,12355,male swimwear
옷/니트 원피스,0,12336,sweater dress
속옷/브라 끈,0,12334,bra strap
동작/머리 묶기,0,12333,tying hair
자세/방아쇠 수칙,0,12332,trigger discipline
표정/외침,0,12321,shouting
효과/뚝뚝 떨어짐,0,12318,dripping
옷/빨간 소매,0,12317,red sleeves
몸/백선,0,12304,linea alba
모자/카우보이 모자,0,12297,cowboy hat
표정/눈 깜빡임,0,12280,blinking
소품/팔 리본,0,12268,arm ribbon
눈/그라데이션 눈,0,12265,gradient eyes
소품/클립보드,0,12263,clipboard
머리/뿌리부터 땋은 머리,0,12254,braided base
배경/선반,0,12226,shelf
옷/변형 메이드,0,12225,unconventional maid
몸/의수·의족,0,12213,prosthesis
메타/작가 자캐 등장,0,12212,artist self-insert
옷/아이돌 의상,0,12210,idol clothes
효과/파란 불꽃,0,12189,blue fire
인원/성별 반전(여→남),0,12170,genderswap (ftm)
자세/배에 손,0,12136,hand on own stomach
배경/기둥,0,12107,pillar
눈/긴 속눈썹,0,12103,long eyelashes
소품/전통 후광,0,12099,traditional halo
성인/수간(동물),0,12090,bestiality
효과/재질 변화,0,12090,material growth
속옷/벗은 팬티,0,12089,unworn panties
옷/술 장식,0,12087,fringe trim
옷/군복 재킷,0,12087,military jacket
소품/오토바이,0,12077,motorcycle
인원/사이보그,0,12071,cyborg
음식/달걀,0,12067,egg
인원/외계인,0,12062,alien
얼굴/수염 자국,0,12062,beard stubble
옷/하트 무늬,0,12057,heart print
자세/그 포즈,0,12055,the pose
옷/가려진 쇄골,0,12046,covered collarbone
눈/분홍 눈동자,0,12037,pink pupils
동작/발 담그기,0,12033,soaking feet
자세/사이에 끼임,0,12021,sandwiched
양말/한쪽 다리 팬티스타킹,0,12004,single leg pantyhose
소품/테이프,0,12001,tape
소품/쌓인 책,0,12000,book stack
자세/가슴 위에 올려놓음,0,11997,breast rest
얼굴/점 여러 개,0,11993,multiple moles
화풍/흑백+컬러 배경,0,11977,greyscale with colored background
소품/호루라기,0,11972,whistle
소품/두루마리,0,11951,scroll
동작/먹여주기,0,11947,feeding
자세/발 들기,0,11928,feet up
옷/무늬 장갑,0,11925,print gloves
효과/측면 조명,0,11923,sidelighting
효과/떨어지는 잎,0,11921,falling leaves
신발/털 달린 부츠,0,11904,fur-trimmed boots
자세/어깨에 멘 무기,0,11902,weapon over shoulder
음식/밥,0,11897,rice
옷/회색 후드티,0,11894,grey hoodie
양말/줄무늬 양말,0,11885,striped socks
소품/음양,0,11881,yin yang
효과/금,0,11850,crack
소품/회전의자,0,11848,swivel chair
머리/해골 머리장식,0,11843,skull hair ornament
옷/꽃무늬 기모노,0,11842,floral print kimono
배경/타일 벽,0,11836,tile wall
효과/머리카락으로 가림,0,11824,convenient hair
소품/스티커,0,11816,sticker
옷/반쯤 내린 지퍼,0,11806,partially unzipped
모자/노란 모자,0,11806,yellow hat
옷/검은 애스콧 타이,0,11802,black ascot
옷/어깨 패드,0,11795,shoulder pads
양말/보라 팬티스타킹,0,11783,purple pantyhose
자세/손가락 사이,0,11777,between fingers
신발/신발 리본,0,11774,footwear bow
표정/노려봄,0,11744,glaring
옷/분홍 넥타이,0,11738,pink necktie
눈/꽃 모양 눈동자,0,11732,flower-shaped pupils
옷/깃발 무늬,0,11728,flag print
옷/붕대 감은 손,0,11724,bandaged hand
성인/질내사정,0,11722,internal cumshot
효과/피 튐,0,11705,blood splatter
몸/용 날개,0,11696,dragon wings
옷/갈색 리본,0,11690,brown bow
상태/입에서 나는 피,0,11686,blood from mouth
음식/맥주,0,11660,beer
옷/도복,0,11652,dougi
얼굴/보라 입술,0,11645,purple lips
성인/체액 실,0,11633,cum string
옷/오비지메,0,11622,obijime
자세/꽂힘,0,11617,planted
옷/검은 코르셋,0,11604,black corset
옷/레이스 퀸,0,11603,race queen
옷/주황 드레스,0,11599,orange dress
인원/악마 소년,0,11593,demon boy
인원/드래프,0,11591,draph
옷/체크 셔츠,0,11589,plaid shirt
음식/와인,0,11588,wine
배경/전봇대,0,11579,utility pole
동작/요리,0,11573,cooking
자세/여우 손 그림자,0,11568,fox shadow puppet
표정/작은 땀방울,0,11567,small sweatdrop
몸/가슴 흉터,0,11553,scar on chest
몸/목 점,0,11550,mole on neck
자세/모자 고쳐 쓰기,0,11548,adjusting headwear
인원/부부,0,11536,husband and wife
옷/단추 사이 틈,0,11528,button gap
소품/종이 상자,0,11525,cardboard box
옷/미디 스커트,0,11522,medium skirt
양말/세로줄 니삭,0,11501,vertical-striped thighhighs
소품/저격총,0,11494,sniper rifle
표정/패배,0,11471,defeat
장르/일상물,0,11447,slice of life
소품/무테 안경,0,11435,rimless eyewear
화풍/SD 변형,0,11424,deformed
소품/꽃 매듭,0,11396,flower knot
옷/코테,0,11387,kote
표정/동그란 눈(0 0),0,11386,0 0
속옷/흰 블루머,0,11386,white bloomers
자세/상대 머리 잡기,0,11384,grabbing another's hair
모자/광대 모자,0,11372,jester cap
몸/목 문신,0,11366,neck tattoo
머리/술 머리장식,0,11364,tassel hair ornament
머리/귀 리본,0,11360,ear ribbon
몸/여러 날개,0,11355,multiple wings
옷/흰 조끼,0,11354,white vest
몸/빨간 날개,0,11345,red wings
속옷/무늬 팬티,0,11342,print panties
메타/평행 세계,0,11333,alternate universe
소품/여행 가방,0,11327,suitcase
옷/비대칭 소매,0,11324,asymmetrical sleeves
자세/빗자루 타기,0,11319,broom riding
옷/허리 케이프,0,11314,waist cape
자세/팔꿈치 괴기,0,11311,elbow rest
인원/미코테,0,11285,miqo'te
소품/백합,0,11284,lily (flower)
소품/성조기,0,11276,american flag
자세/상대 턱에 손,0,11273,hand on another's chin
옷/비키니 하의만,0,11263,bikini bottom only
소품/구슬(오브),0,11259,orb
소품/보라 헤일로,0,11233,purple halo
소품/군번줄,0,11228,dog tags
자세/무릎베개,0,11226,lap pillow
자세/머리 위 물건,0,11224,object on head
소품/이불(후톤),0,11221,futon
옷/다중 끈 비키니 하의,0,11216,multi-strapped bikini bottom
메타/야쿠모 유카리 틈,0,11215,gap (touhou)
인원/절지동물 소녀,0,11212,arthropod girl
머리/가슴 덮은 머리,0,11208,hair over breasts
속옷/프릴 브라,0,11207,frilled bra
옷/통 넓은 바지,0,11204,baggy pants
옷/여러 벨트,0,11187,multiple belts
자세/방패 들기,0,11180,holding shield
소품/초록 보석,0,11173,green gem
상태/땀범벅,0,11173,very sweaty
옷/비치는 브라,0,11169,bra visible through clothes
소품/꽃병,0,11140,vase
음식/콘 아이스크림,0,11131,ice cream cone
옷/분홍 목스카프,0,11129,pink neckerchief
소품/비치 파라솔,0,11122,beach umbrella
인원/호랑이 소녀,0,11117,tiger girl
성인/합동 행위,0,11108,teamwork (sexual)
표정/한쪽 눈썹 올림,0,11100,raised eyebrow
표정/불안한 미소,0,11098,nervous smile
자세/쉿,0,11096,shushing
눈/점 눈,0,11086,solid circle eyes
소품/쿠션,0,11084,cushion
성인/분출,0,11080,projectile cum
속옷/초록 팬티,0,11078,green panties
옷/투톤 장갑,0,11072,two-tone gloves
옷/허리 리본,0,11065,waist bow
자세/빗자루 들기,0,11057,holding broom
동작/주먹질,0,11055,punching
성인/자궁,0,11050,uterus
성인/옷 입은 남자 벗은 여자,0,11042,clothed male nude female
상태/의상 사고,0,11033,wardrobe malfunction
소품/노트북,0,11032,laptop
옷/체크 조끼,0,11019,plaid vest
옷/검은 로브,0,11000,black robe
동작/사진 찍기,0,10992,taking picture
머리/검은 브릿지,0,10983,black streaks
모자/프릴 모자,0,10969,frilled hat
자세/펼친 양손,0,10966,open hands
소품/고양이 귀 헤드폰,0,10962,cat ear headphones
몸/무릎 밴드,0,10952,bandaid on knee
옷/파란 케이프,0,10951,blue capelet
자세/그릇 들기,0,10941,holding bowl
효과/이어진 8분음표,0,10931,beamed eighth notes
인원/신부,0,10930,bride
표정/XD,0,10927,xd
소품/체인 목걸이,0,10915,chain necklace
성인/쭈그려 올라탄 체위,0,10911,squatting cowgirl position
화풍/계단 현상 선,0,10908,jaggy lines
자세/베개 껴안기,0,10895,pillow hug
머리/방울 머리장식,0,10879,pom pom hair ornament
성인/음경 바라봄,0,10867,looking at penis
옷/빨간 벨트,0,10864,red belt
신발/하이힐 샌들,0,10861,high heel sandals
인원/기사,0,10854,knight
화풍/초록색 위주,0,10851,green theme
몸/소 꼬리,0,10844,cow tail
머리/가운데 갈라진 앞머리,0,10840,center-flap bangs
자세/목에 팔 두름,0,10824,arms around neck
신발/회색 신발,0,10824,grey shoes
인원/늑대 소년,0,10811,wolf boy
옷/카리기누,0,10806,kariginu
인원/부녀,0,10797,father and daughter
옷/사쿠라가오카 교복,0,10797,sakuragaoka high school uniform
배경/철망 울타리,0,10790,chain-link fence
자세/벗은 안경 들기,0,10790,holding removed eyewear
머리/빨간 머리띠,0,10785,red headband
소품/철십자,0,10772,iron cross
소품/빨간 완장,0,10770,red armband
옷/코갸루,0,10760,kogal
몸/기계 팔 하나,0,10759,single mechanical arm
자세/상자 들기,0,10727,holding box
옷/줄무늬 재킷,0,10717,striped jacket
자세/치마 잡기,0,10697,holding own skirt
옷/검은 갑옷,0,10683,black armor
동물/여우,0,10680,fox
속옷/프릴 팬티,0,10674,frilled panties
동작/게임하기,0,10674,playing games
소품/사카즈키,0,10671,sakazuki
음식/고기,0,10664,meat
표정/말풍선 홍조,0,10660,spoken blush
자세/기대어 누움,0,10647,reclining
속옷/빨간 브라,0,10645,red bra
메타/명일방주 광석병 증상,0,10631,oripathy lesion (arknights)
자세/어깨 위 동물,0,10624,animal on shoulder
표정/D 입,0,10617,d:
옷/한쪽 어깨 내림,0,10613,single off shoulder
옷/사선 줄무늬 넥타이,0,10609,diagonal-striped necktie
신발/한쪽 신발,0,10602,single shoe
음식/하트 모양 음식,0,10589,heart-shaped food
소품/벗은 재킷,0,10556,unworn jacket
옷/무늬 치마,0,10549,print skirt
옷/풀 아머,0,10533,full armor
소품/교실 의자,0,10532,school chair
몸/바벨 피어싱,0,10513,barbell piercing
표정/남자다운,0,10501,manly
옷/한쪽 긴 장갑,0,10483,single elbow glove
소품/지팡이(지팡이형),0,10481,cane
소품/커피 머그,0,10472,coffee mug
눈/반쯤 감은 눈,0,10460,half-closed eye
소품/팔 가터,0,10446,arm garter
옷/줄무늬 치마,0,10426,striped skirt
자세/손가락 모음(첨탑),0,10422,steepled fingers
자세/공중,0,10418,midair
몸/여러 뿔,0,10402,multiple horns
소품/폭발물,0,10394,explosive
메타/저작권 로고,0,10385,copyright logo
소품/전차,0,10376,tank
인원/네코마타,0,10373,nekomata
음식/면,0,10368,noodles
효과/보케,0,10360,bokeh
옷/큰 리본,0,10345,large bow
소품/바코드,0,10340,barcode
소품/벗은 치마,0,10335,unworn skirt
옷/초록 스웨터,0,10327,green sweater
머리/보라 머리띠,0,10303,purple hairband
배경/별 무늬 배경,0,10300,star symbol background
소품/금 목걸이,0,10297,gold necklace
머리/머리 길이 변경(짧게),0,10294,alternate hair length (shorter)
얼굴/볼 밴드,0,10285,bandaid on cheek
머리/가르마,0,10284,parted hair
메타/회사 연결,0,10278,company connection
자세/사람에게 기댐,0,10272,leaning on person
소품/오링 초커,0,10242,o-ring choker
인원/강시,0,10241,jiangshi
옷/오아라이 교복,0,10241,ooarai school uniform
상태/무기에 묻은 피,0,10222,blood on weapon
옷/파란 벨트,0,10219,blue belt
속옷/팬티 살짝 보임,0,10218,panty peek
옷/보라 레오타드,0,10215,purple leotard
메타/란게이지,0,10211,ranguage
몸/사지 절단,0,10208,amputee
옷/멀티컬러 보디수트,0,10202,multicolored bodysuit
소품/안테나,0,10199,radio antenna
옷/멀티컬러 비키니,0,10196,multicolored bikini
효과/타락,0,10193,corruption
옷/파란 애스콧 타이,0,10189,blue ascot
표정/창백해짐,0,10187,turn pale
옷/회색 카디건,0,10184,grey cardigan
옷/한쪽 어깨 갑옷,0,10165,single pauldron
소품/음료 팩,0,10164,drink carton
소품/쇼핑백,0,10158,shopping bag
머리/올림머리,0,10157,updo
자세/책상 위에 앉음,0,10146,on desk
머리/삐친 머리,0,10143,cowlick
소품/공책,0,10133,notebook
옷/회색 세일러 칼라,0,10123,grey sailor collar
옷/파란 멜빵바지,0,10118,blue overalls
음식/당고,0,10113,dango
자세/자기 엉덩이에 손,0,10112,hand on own ass
옷/세로줄 드레스,0,10111,vertical-striped dress
옷/옷 속 레오타드,0,10100,leotard under clothes
인원/옥토링,0,10099,octoling
화풍/세피아,0,10094,sepia
소품/한쪽 귀 덮개,0,10080,single ear cover
소품/허벅지 홀스터,0,10072,thigh holster
옷/패션,0,10067,fashion
소품/번개 기호,0,10064,lightning bolt symbol
옷/열린 후드,0,10057,open hoodie
옷/보라 소매,0,10055,purple sleeves
효과/눈물방울,0,10046,teardrop
동작/발사,0,10037,firing
자세/얼굴 가리기,0,10032,covering face
자세/도끼 들기,0,10021,holding axe
머리/꽃 화환,0,10018,flower wreath
표정/윙크 혀 내밀기,0,10012,;p
몸/갈색 꼬리,0,10009,brown tail
옷/체크 목도리,0,10002,plaid scarf
소품/하트 모양 안경,0,9989,heart-shaped eyewear
옷/의상 교체,0,9988,costume switch
동작/볼 키스,0,9982,kissing cheek
옷/그라데이션 옷,0,9969,gradient clothes
상태/부서짐,0,9965,broken
표정/비뚤어진 입,0,9952,sideways mouth
자세/베개에 머리 얹음,0,9951,head on pillow
소품/사각 안경,0,9937,rectangular eyewear
양말/회색 양말,0,9936,grey socks
배경/파도,0,9936,waves
표정/점 입,0,9933,dot mouth
자세/상대 등에 손,0,9932,hand on another's back
옷/웨이스트코트,0,9928,waistcoat
동물/쥐,0,9925,mouse (animal)
옷/경기용 스쿨 수영복,0,9908,competition school swimsuit
동물/늑대,0,9907,wolf
인원/에룬,0,9897,erune
옷/세일러 전사 복장,0,9886,sailor senshi uniform
자세/컨트롤러 들기,0,9882,holding controller
효과/뷰파인더,0,9877,viewfinder
옷/분홍 반바지,0,9860,pink shorts
소품/벗은 옷,0,9859,unworn clothes
속옷/보라 브라,0,9842,purple bra
몸/배꼽 털,0,9809,navel hair
옷/빨간 부루마,0,9809,red buruma
옷/노란 카디건,0,9808,yellow cardigan
옷/찢어진 드레스,0,9806,torn dress
소품/포스터,0,9804,poster (object)
자세/자기 가리키기,0,9798,pointing at self
머리/흰 머리띠,0,9792,white headband
옷/허리 갑옷,0,9784,faulds
얼굴/주둥이,0,9783,snout
인원/너구리 소녀,0,9767,raccoon girl
자세/낫 들기,0,9766,holding scythe
몸/파란 날개,0,9762,blue wings
눈/가늘게 뜬 눈,0,9748,narrowed eyes
자세/어깨동무,0,9740,arm around shoulder
소품/맥주잔,0,9721,beer mug
자세/비튼 상체,0,9706,twisted torso
배경/그라데이션 하늘,0,9698,gradient sky
옷/파란 부루마,0,9669,blue buruma
옷/초록 세일러 칼라,0,9649,green sailor collar
모자/페도라,0,9643,fedora
몸/흰 뿔,0,9642,white horns
옷/느슨한 넥타이,0,9640,loose necktie
자세/치어 방울 들기,0,9633,holding pom poms
소품/금 팔찌,0,9624,gold bracelet
소품/금속 목걸이,0,9624,metal collar
몸/새 귀,0,9614,bird ears
인원/여경,0,9606,policewoman
양말/소무늬 니삭,0,9599,cow print thighhighs
옷/초록 망토,0,9586,green cape
상태/더움,0,9571,hot
소품/하트 목걸이,0,9563,heart necklace
소품/트레이딩 카드,0,9559,trading card
몸/겨드랑이털,0,9550,armpit hair
옷/노란 반바지,0,9544,yellow shorts
소품/어뢰,0,9543,torpedo
동작/사람 들어올리기,0,9532,lifting person
효과/슬라임,0,9526,slime (substance)
화풍/회화풍,0,9522,painterly
옷/프릴 장갑,0,9513,frilled gloves
자세/양손 무릎에,0,9511,hands on own knees
자세/가면 들기,0,9509,holding mask
옷/한쪽 분리 소매,0,9503,single detached sleeve
성인/즉석 재갈,0,9501,improvised gag
머리/삐져나온 머리카락,0,9501,loose hair strand
옷/하이웨이스트 반바지,0,9493,high-waist shorts
옷/검은 띠,0,9491,black sash
화풍/정물,0,9490,still life
인원/악마,0,9475,demon
소품/허벅지 벨트,0,9474,thigh belt
인원/용 소년,0,9463,dragon boy
메타/작가 실수,0,9454,artistic error
옷/검은 베일,0,9454,black veil
자세/메탈 손동작,0,9441,\\m/
옷/타이트 바지,0,9437,tight pants
옷/양면 망토,0,9431,two-sided cape
옷/사선 줄무늬 리본,0,9428,diagonal-striped bow
자세/눈 위 브이,0,9426,v over eye
음식/오렌지,0,9418,orange (fruit)
효과/최면,0,9415,hypnosis
자세/소녀 샌드위치,0,9413,girl sandwich
메타/혼합 언어 글자,0,9411,mixed-language text
신발/초록 신발,0,9401,green shoes
자세/수건 들기,0,9401,holding towel
소품/뼈,0,9398,bone
옷/트랙 팬츠,0,9393,track pants
머리/땋은 뿌리 똥머리,0,9383,bun with braided base
자세/유리에 기댐,0,9379,against glass
소품/하트 초커,0,9377,heart choker
소품/폴더폰,0,9375,flip phone
인원/수인x인간,0,9373,furry with non-furry
신발/빨간 신발,0,62984,red shoes
몸/악마 날개,0,62915,demon wings
머리/음표 머리장식,0,9369,musical note hair ornament
옷/민소매 기모노,0,9366,sleeveless kimono
눈/빨간 흰자,0,9353,red sclera
신발/노란 신발,0,9352,yellow shoes
옷/검은 캐미솔,0,9350,black camisole
눈/고르지 않은 눈,0,9322,uneven eyes
몸/멀티컬러 날개,0,9307,multicolored wings
소품/흰 깃털,0,9304,white feathers
옷/하이웨이스트 바지,0,9297,high-waist pants
머리/고양이 머리장식,0,9271,cat hair ornament
소품/물 총,0,9270,water gun
옷/보라 코트,0,9217,purple coat
신발/회색 부츠,0,9192,grey boots
옷/보라 조끼,0,9139,purple vest
얼굴/검은 입술,0,9132,black lips
소품/보라 장미,0,9125,purple rose
옷/노란 목도리,0,9111,yellow scarf
옷/분홍 목도리,0,9105,pink scarf
몸/로봇 귀,0,9096,robot ears
옷/빨간 세일러 칼라,0,9091,red sailor collar
옷/주황 비키니,0,9083,orange bikini
몸/파란 털,0,9081,blue fur
옷/보라 바지,0,9077,purple pants
얼굴/긴 혀,0,9058,long tongue
동물/흰 고양이,0,9056,white cat
옷/한쪽 소매,0,9049,single sleeve
눈/노란 눈동자,0,9045,yellow pupils
옷/산타 드레스,0,9004,santa dress
동물/펭귄,0,8995,penguin
몸/새 꼬리,0,8978,bird tail
옷/아쿠아 셔츠,0,8959,aqua shirt
양말/무늬 팬티스타킹,0,8943,print pantyhose
옷/체크무늬 드레스,0,8913,plaid dress
양말/빨간 양말,0,8894,red socks
옷/겨울 코트,0,8883,winter coat
몸/미니 날개,0,8856,mini wings
배경/주황 하늘,0,8776,orange sky
몸/비대칭 뿔,0,8774,asymmetrical horns
소품/조각상,0,8772,statue
동물/불가사리,0,8771,starfish
배경/열린 문,0,8690,open door
자세/목줄 들기,0,8684,holding leash
옷/아쿠아 보타이,0,8669,aqua bowtie
옷/줄무늬 목도리,0,8654,striped scarf
머리/흰 머리 장식,0,8650,white headdress
옷/비치는 드레스,0,8622,see-through dress
소품/종이 부채,0,8610,paper fan
머리/드릴 옆머리,0,8570,drill sidelocks
옷/초록 코트,0,8525,green coat
얼굴/색 있는 혀,0,8515,colored tongue
옷/칼라 있는 코트,0,8434,collared coat
머리/파란 곱창 머리끈,0,8421,blue scrunchie
양말/양말 없음,0,8400,no socks
옷/파란 띠,0,8384,blue sash
소품/분홍 꽃잎,0,8359,pink petals
동물/게,0,8329,crab
양말/검은 레깅스,0,8326,black leggings
소품/눈사람,0,8297,snowman
눈/파란 눈동자,0,8270,blue pupils
옷/줄무늬 리본,0,8260,striped ribbon
옷/빨간 망토(클로크),0,8253,red cloak
소품/벗은 마스크,0,8227,unworn mask
옷/흰 망토(클로크),0,8188,white cloak
옷/초록 목도리,0,8158,green scarf
머리/검은 머리띠,0,8151,black headband
몸/보라 날개,0,8136,purple wings
옷/갈색 목도리,0,8130,brown scarf
몸/갈색 뿔,0,8129,brown horns
소품/편지,0,8113,letter
속옷/물방울무늬 팬티,0,8112,polka dot panties
머리/빨간 곱창 머리끈,0,8106,red scrunchie
옷/투톤 치마,0,8103,two-tone skirt
옷/분홍 레오타드,0,8097,pink leotard
소품/병(항아리),0,8083,jar
소품/클로버,0,8051,clover
옷/용 무늬,0,8025,dragon print
옷/주황 넥타이,0,8020,orange necktie
양말/파란 팬티스타킹,0,8009,blue pantyhose
옷/주황 리본,0,7994,orange ribbon
몸/수정 날개,0,7979,crystal wings
소품/보라 초커,0,7978,purple choker
양말/빨간 팬티스타킹,0,7962,red pantyhose
자세/인형 들기,0,7950,holding doll
모자/해적 모자,0,7943,pirate hat
몸/나비 날개,0,7940,butterfly wings
배경/천장,0,7916,ceiling
옷/보라 망토,0,7908,purple cape
옷/주황 보타이,0,7882,orange bowtie
몸/주황 손톱,0,7880,orange nails
소품/보라 보석,0,7876,purple gem
소품/꽃 귀걸이,0,7873,flower earrings
옷/아쿠아 드레스,0,7869,aqua dress
몸/기계 날개,0,7847,mechanical wings
몸/회색 털,0,7844,grey fur
소품/닫힌 우산,0,7815,closed umbrella
옷/찢어진 치마,0,7793,torn skirt
옷/골지 셔츠,0,7773,ribbed shirt
옷/검은 카디건,0,7749,black cardigan
옷/초록 소매,0,7717,green sleeves
양말/초록 니삭,0,7716,green thighhighs
몸/십자가 흉터,0,7714,cross scar
신발/보라 부츠,0,7710,purple boots
옷/스트랩리스 비키니,0,7702,strapless bikini
소품/노란 장미,0,7693,yellow rose
소품/오망성,0,7685,pentagram
소품/빨간 밧줄,0,7676,red rope
모자/주황 모자,0,7659,orange hat
소품/벗은 헬멧,0,7651,unworn helmet
속옷/젖은 팬티,0,7635,wet panties
음식/토마토,0,7632,tomato
동물/곰,0,7594,bear
옷/멀티컬러 치마,0,7587,multicolored skirt
소품/흰 헤일로,0,7584,white halo
양말/프릴 양말,0,7527,frilled socks
머리/초록 머리띠,0,7515,green hairband
옷/후드 달린 케이프,0,7487,hooded capelet
소품/금색 사슬,0,7478,gold chain
몸/고양이 발바닥,0,7473,cat paws
옷/보라 반바지,0,7465,purple shorts
옷/노란 기모노,0,7461,yellow kimono
옷/고양이 후드,0,7444,cat hood
옷/민소매 스웨터,0,7439,sleeveless sweater
옷/아쿠아 치마,0,7430,aqua skirt
옷/파란 카디건,0,7427,blue cardigan
소품/분홍 가방,0,7423,pink bag
머리/깃털 머리,0,7381,feather hair
옷/소 무늬 장갑,0,7375,cow print gloves
옷/분홍 소매,0,7375,pink sleeves
옷/파란 세일러복,0,7363,blue serafuku
옷/비치는 베일,0,7342,see-through veil
얼굴/파란 입술,0,7339,blue lips
배경/회색 하늘,0,7305,grey sky
자세/바구니 들기,0,7253,holding basket
음식/피자,0,7251,pizza
속옷/회색 팬티,0,7239,grey panties
속옷/노란 팬티,0,7189,yellow panties
몸/노란 피부,0,7166,yellow skin
옷/프릴 기모노,0,7158,frilled kimono
옷/빨간 갑옷,0,7153,red armor
옷/프릴 원피스 수영복,0,7138,frilled one-piece swimsuit
옷/줄무늬 바지,0,7136,striped pants
옷/주황 장갑,0,7130,orange gloves
신발/갈색 샌들,0,7114,brown sandals
옷/체크무늬 보타이,0,7068,plaid bowtie
옷/보라 세일러 칼라,0,7035,purple sailor collar
옷/흰 띠,0,7008,white sash
동물/고무 오리,0,7006,rubber duck
소품/별 헤일로,0,6969,star halo
몸/흰 꼬리,0,6964,white tail
몸/큰 꼬리,0,6962,large tail
머리/짧은 앞머리,0,6961,short bangs
소품/빨간 가방,0,6953,red bag
음식/샌드위치,0,6920,sandwich
몸/사슴 귀,0,6900,deer ears
음식/우유,0,6871,milk
몸/보라 꼬리,0,6856,purple tail
자세/고양이 들기,0,6846,holding cat
몸/노란 뿔,0,6836,yellow horns
옷/투톤 리본,0,6821,two-tone bow
머리/흰 곱창 머리끈,0,6800,white scrunchie
옷/보라 띠,0,6798,purple sash
몸/금 간 피부,0,6754,cracked skin
몸/작은 뿔,0,6746,small horns
옷/아쿠아 목스카프,0,6744,aqua neckerchief
몸/기계 꼬리,0,6742,mechanical tail
몸/양 귀,0,6740,sheep ears
소품/종이 가방,0,6735,paper bag
동물/문어,0,6733,octopus
모자/큰 모자,0,6724,large hat
동물/오리,0,6711,duck
옷/검은 앞치마,0,6710,black apron
옷/분홍 앞치마,0,6709,pink apron
옷/털 달린 후드,0,6685,fur-trimmed hood
배경/바닥,0,6684,floor
동물/양,0,6675,sheep
옷/메이드 비키니,0,6674,maid bikini
옷/분홍 후드티,0,6652,pink hoodie
소품/우리,0,6620,cage
신발/초록 부츠,0,6599,green boots
몸/고르지 않은 뿔,0,6586,uneven horns
옷/후드 달린 망토,0,6569,hooded cape
신발/노란 부츠,0,6552,yellow boots
소품/검은 깃털,0,6544,black feathers
몸/분홍 털,0,6529,pink fur
옷/흰 카디건,0,6523,white cardigan
옷/초록 후드티,0,6511,green hoodie
옷/투톤 비키니,0,6498,two-tone bikini
소품/흰 머릿수건,0,6488,white headscarf
옷/주황 반바지,0,6474,orange shorts
소품/흰 마스크,0,6472,white mask
옷/스트랩리스 셔츠,0,6455,strapless shirt
옷/퐁퐁한 분리된 소매,0,6446,puffy detached sleeves
옷/분홍 바지,0,6441,pink pants
머리/분홍 브릿지,0,6435,pink streaks
옷/빨간 후드티,0,6422,red hoodie
몸/하트 문신,0,6421,heart tattoo
옷/체크 치마,0,6418,checkered skirt
양말/분홍 양말,0,6415,pink socks
양말/리본 단 니삭,0,6415,ribbon-trimmed thighhighs
옷/라텍스 보디수트,0,6413,latex bodysuit
소품/벗은 브라,0,6398,unworn bra
옷/검은 한푸,0,6397,black hanfu
옷/체크 목도리,0,6397,checkered scarf
동물/호랑이,0,6395,tiger
소품/하트 풍선,0,6353,heart balloon
머리/검은 곱창 머리끈,0,6331,black scrunchie
소품/파란 가방,0,6331,blue bag
자세/등불 들기,0,6305,holding lantern
소품/벗은 셔츠,0,6287,unworn shirt
자세/화살 들기,0,6245,holding arrow
옷/프릴 케이프,0,6231,frilled capelet
옷/초록 레오타드,0,6213,green leotard
옷/보라 목도리,0,6201,purple scarf
배경/빨간 달,0,6194,red moon
속옷/흰 스포츠 브라,0,6186,white sports bra
몸/주황 털,0,6130,orange fur
음식/바나나,0,6123,banana
자세/주사기 들기,0,6113,holding syringe
소품/프릴 베개,0,6110,frilled pillow
옷/보라 보디수트,0,6086,purple bodysuit
몸/멀티컬러 뿔,0,6083,multicolored horns
옷/갈색 리본,0,6072,brown ribbon
모자/고양이 모자,0,6062,cat hat
소품/지도,0,6058,map
옷/우비,0,6050,raincoat
소품/알약,0,6047,pill
배경/보라 하늘,0,6047,purple sky
옷/오버사이즈 셔츠,0,6046,oversized shirt
몸/뱀 꼬리,0,6043,snake tail
소품/흰 가방,0,6033,white bag
동물/닭,0,6031,chicken
동물/봉제 고양이,0,6025,stuffed cat
옷/찢어진 소매,0,6022,torn sleeves
몸/흰 손톱,0,6013,white nails
옷/투톤 보디수트,0,6004,two-tone bodysuit
옷/검은 볼레로,0,6001,black shrug
얼굴/분홍 아이섀도,0,5994,pink eyeshadow
옷/회색 리본,0,5990,grey bow
옷/흰 한푸,0,5990,white hanfu
옷/투톤 수영복,0,5984,two-tone swimsuit
옷/노란 벨트,0,5961,yellow belt
소품/금색 초커,0,5954,gold choker
옷/겹친 비키니,0,5954,layered bikini
옷/아쿠아 리본,0,5952,aqua ribbon
옷/갈색 케이프,0,5948,brown capelet
옷/줄무늬 소매,0,5941,striped sleeves
옷/프릴 손목 커프스,0,5937,frilled wrist cuffs
몸/아주 긴 꼬리,0,5906,very long tail
몸/파란 꼬리,0,5889,blue tail
옷/노란 띠,0,5885,yellow sash
옷/보라 스웨터,0,5875,purple sweater
옷/물방울무늬 비키니,0,5873,polka dot bikini
동물/해파리,0,5872,jellyfish
머리/주황 머리띠,0,5864,orange hairband
신발/흰 샌들,0,5857,white sandals
옷/파란 앞치마,0,5846,blue apron
머리/분홍 곱창 머리끈,0,5833,pink scrunchie
소품/연꽃,0,5813,lotus
소품/빨간 반다나,0,5806,red bandana
소품/빨간 우산,0,5782,red umbrella
소품/깃털 귀걸이,0,5774,feather earrings
속옷/레이스 팬티,0,5760,lace panties
옷/체크무늬 넥타이,0,5726,plaid necktie
옷/찢어진 보디수트,0,5725,torn bodysuit
옷/갈색 세일러 칼라,0,5718,brown sailor collar
옷/분홍 벨트,0,5710,pink belt
옷/노란 조끼,0,5700,yellow vest
동물/흰 새,0,5697,white bird
몸/멀티컬러 털,0,5694,multicolored fur
소품/꽃 장식,0,5677,flower ornament
옷/찢어진 망토,0,5669,torn cape
몸/줄무늬 꼬리,0,5650,striped tail
옷/비치는 치마,0,5637,see-through skirt
몸/기계 뿔,0,5636,mechanical horns
옷/데님 치마,0,5633,denim skirt
몸/파란 뿔,0,5624,blue horns
소품/플라스틱 가방,0,5602,plastic bag
몸/빨간 털,0,5601,red fur
옷/갈색 망토,0,5568,brown cape
옷/리본 단 치마,0,5563,ribbon-trimmed skirt
옷/찢어진 반바지,0,5555,torn shorts
머리/보라 브릿지,0,5545,purple streaks
옷/레이스 달린 드레스,0,5528,lace-trimmed dress
소품/주사위,0,5513,dice
속옷/초록 브라,0,5511,green bra
머리/박쥐 머리장식,0,5506,bat hair ornament
몸/빨간 문신,0,5493,red tattoo
얼굴/파란 아이섀도,0,5481,blue eyeshadow
옷/고르지 않은 장갑,0,5469,uneven gloves
몸/회색 뿔,0,5468,grey horns
옷/검은 하카마,0,5466,black hakama
동물/올빼미,0,5457,owl
옷/주황 목스카프,0,5455,orange neckerchief
옷/회색 기모노,0,5441,grey kimono
옷/열린 드레스,0,5436,open dress
옷/눈송이 무늬,0,5414,snowflake print
옷/초록 목스카프,0,5413,green neckerchief
옷/노란 후드티,0,5403,yellow hoodie
옷/파란 갑옷,0,5388,blue armor
소품/사탕 지팡이,0,5364,candy cane
얼굴/보라 아이섀도,0,5357,purple eyeshadow
옷/회색 소매,0,5329,grey sleeves
양말/갈색 양말,0,5325,brown socks
옷/아쿠아 재킷,0,5321,aqua jacket
옷/파란 하카마,0,5320,blue hakama
머리/멀티컬러 머리띠,0,5294,multicolored hairband
옷/분홍 코트,0,5269,pink coat
몸/분홍 꼬리,0,5261,pink tail
옷/무늬 리본,0,5228,print bow
옷/토끼 후드,0,5228,rabbit hood
옷/주황 기모노,0,5224,orange kimono
소품/튤립,0,5213,tulip
옷/망사 상의,0,5204,fishnet top
옷/멀티컬러 수영복,0,5200,multicolored swimsuit
신발/멀티컬러 신발,0,5197,multicolored shoes
자세/연필 들기,0,5167,holding pencil
소품/하트 모양 베개,0,5153,heart-shaped pillow
몸/줄무늬 뿔,0,5146,striped horns
옷/회색 목스카프,0,5138,grey neckerchief
옷/젖은 수영복,0,5136,wet swimsuit
옷/고양이 무늬,0,5125,cat print
옷/사선 줄무늬 보타이,0,5119,diagonal-striped bowtie
옷/흰 갑옷,0,5109,white armor
옷/보라 벨트,0,5107,purple belt
옷/긴 셔츠,0,5098,long shirt
옷/노란 코트,0,5084,yellow coat
동물/상어,0,5077,shark
머리/노란 곱창 머리끈,0,5074,yellow scrunchie
옷/짧은 조끼,0,5058,cropped vest
옷/분홍 잠옷,0,5047,pink pajamas
소품/보라 우산,0,5016,purple umbrella
양말/노란 니삭,0,5011,yellow thighhighs
옷/프릴 리본,0,5010,frilled ribbon
옷/헐렁한 벨트,0,4969,loose belt
옷/회색 넥타이,0,4965,grey necktie
머리/물고기 머리장식,0,4963,fish hair ornament
옷/금색 갑옷,0,4957,gold armor
옷/주황 바지,0,4927,orange pants
머리/갈색 머리띠,0,4903,brown hairband
자세/지팡이 들기,0,4897,holding cane
몸/보라 뿔,0,4896,purple horns
소품/검은 장미,0,4882,black rose
옷/교차 끈 드레스,0,4882,cross-laced dress
소품/노란 가방,0,4879,yellow bag
옷/짝짝이 비키니,0,4875,mismatched bikini
신발/주황 신발,0,4867,orange shoes
소품/초록 초커,0,4866,green choker
머리/눈송이 머리장식,0,4860,snowflake hair ornament
옷/갈색 넥타이,0,4856,brown necktie
옷/멀티컬러 레오타드,0,4855,multicolored leotard
옷/등 파인 레오타드,0,4850,backless leotard
몸/회색 꼬리,0,4828,grey tail
옷/멀티컬러 셔츠,0,4816,multicolored shirt
소품/파란 완장,0,4814,blue armband
옷/아쿠아 비키니,0,4812,aqua bikini
옷/흰 볼레로,0,4781,white shrug
옷/줄무늬 반바지,0,4777,striped shorts
옷/비치는 레오타드,0,4769,see-through leotard
양말/초록 양말,0,4761,green socks
음식/새우,0,4760,shrimp
옷/토끼 무늬,0,4747,rabbit print
옷/회색 벨트,0,4738,grey belt
얼굴/초록 입술,0,4720,green lips
옷/짧은 후드티,0,4717,cropped hoodie
몸/가짜 날개,0,4714,fake wings
옷/재킷 없음,0,4704,no jacket
몸/부서진 뿔,0,4689,broken horn
소품/금색 반지,0,4677,gold ring
옷/골지 드레스,0,4668,ribbed dress
동물/판다,0,4665,panda
옷/해골 무늬,0,4631,skull print
옷/회색 목도리,0,4617,grey scarf
옷/보라 케이프,0,4610,purple capelet
옷/분홍 보디수트,0,4599,pink bodysuit
옷/세로줄 치마,0,4580,vertical-striped skirt
옷/징 박힌 벨트,0,4573,studded belt
소품/투명 우산,0,4565,transparent umbrella
배경/나무 테이블,0,4565,wooden table
옷/파란 칼라,0,4564,blue collar
자세/팬티 들기,0,4545,holding panties
속옷/레이스 브라,0,4544,lace bra
소품/안경 없음,0,4536,no eyewear
몸/박쥐 귀,0,4520,bat ears
양말/분홍 팬티스타킹,0,4510,pink pantyhose
옷/고르지 않은 소매,0,4503,uneven sleeves
양말/멀티컬러 니삭,0,4495,multicolored thighhighs
옷/주황 보디수트,0,4488,orange bodysuit
배경/빨간 하늘,0,4488,red sky
옷/흰 롬퍼,0,4483,white romper
옷/분홍 조끼,0,4472,pink vest
옷/줄무늬 스웨터,0,4470,striped sweater
모자/날개 달린 헬멧,0,4470,winged helmet
동물/돼지,0,4460,pig
옷/주황 목도리,0,4453,orange scarf
옷/빨간 원피스 수영복,0,4433,red one-piece swimsuit
옷/갈색 기모노,0,4429,brown kimono
속옷/줄무늬 브라,0,4393,striped bra
소품/별 초커,0,4385,star choker
옷/노란 바지,0,4374,yellow pants
머리/푹신한 머리,0,4366,fluffy hair
머리/금색 머리띠,0,4355,gold hairband
옷/빨간 후드,0,4334,red hood
옷/세일러 비키니,0,4326,sailor bikini
소품/빛나는 검,0,4312,glowing sword
자세/베개 들기,0,4301,holding pillow
옷/털 달린 치마,0,4296,fur-trimmed skirt
몸/꽃 문신,0,4295,flower tattoo
옷/체크무늬 바지,0,4282,plaid pants
옷/레이스 달린 소매,0,4281,lace-trimmed sleeves
머리/파란 머리띠,0,4268,blue headband
옷/칼라 있는 망토,0,4260,collared cape
옷/헐렁한 보타이,0,4258,loose bowtie
소품/별 목걸이,0,4254,star necklace
옷/초록 앞치마,0,4250,green apron
소품/금색 왕관,0,4231,gold crown
자세/풍선 들기,0,4224,holding balloon
자세/신발 들기,0,4222,holding shoes
옷/멀티컬러 코트,0,4217,multicolored coat
옷/퐁퐁한 반바지,0,4208,puffy shorts
몸/보라 털,0,4206,purple fur
옷/갈색 코르셋,0,4203,brown corset
모자/학교 모자,0,4201,school hat
옷/산타 비키니,0,4175,santa bikini
옷/파란 로브,0,4174,blue robe
동물/흰 뱀,0,4162,white snake
옷/분홍 칼라,0,4154,pink collar
옷/보라 후드티,0,4151,purple hoodie
소품/가시 달린 초커,0,4130,spiked choker
옷/무늬 보타이,0,4109,print bowtie
옷/그라데이션 드레스,0,4103,gradient dress
옷/파란 망토(클로크),0,4101,blue cloak
옷/십자가 무늬,0,4076,cross print
옷/체크무늬 재킷,0,4074,plaid jacket
양말/골지 양말,0,4065,ribbed socks
얼굴/파란 혀,0,4053,blue tongue
옷/회색 보디수트,0,4045,grey bodysuit
모자/파란 헬멧,0,4039,blue helmet
소품/노란 초커,0,4039,yellow choker
옷/후드 달린 로브,0,4030,hooded robe
머리/곰 머리장식,0,4027,bear hair ornament
몸/분홍 날개,0,4022,pink wings
자세/물 총 들기,0,4015,holding water gun
양말/주황 니삭,0,4010,orange thighhighs
옷/리본 단 칼라,0,4005,ribbon-trimmed collar
옷/검은 후드,0,3984,black hood
옷/털 달린 망토(클로크),0,3979,fur-trimmed cloak
눈/흰자 없음,0,3969,no sclera
옷/흰 후드,0,3941,white hood
얼굴/곱슬 눈썹,0,3920,curly eyebrows
동물/거북이,0,3916,turtle
동물/다람쥐,0,3912,squirrel
옷/보라 세일러복,0,3911,purple serafuku
소품/동물 가방,0,3906,animal bag
옷/흰 세일러복,0,3904,white serafuku
몸/노란 날개,0,3892,yellow wings
옷/팽팽한 드레스,0,3889,taut dress
옷/검은 부루마,0,3887,black buruma
모자/날개 달린 모자,0,3878,winged hat
옷/프릴 커프스,0,3877,frilled cuffs
옷/노란 소매,0,3866,yellow sleeves
소품/금색 암릿,0,3865,gold armlet
모자/체크무늬 모자,0,3863,plaid hat
소품/검은 티아라,0,3861,black tiara
소품/멀티컬러 헤일로,0,3838,multicolored halo
옷/털 달린 기모노,0,3837,fur-trimmed kimono
양말/힙하이,0,3824,hiphighs
옷/옆매듭 레오타드,0,3822,side-tie leotard
소품/검은 완장,0,3820,black armband
양말/아가일 팬티스타킹,0,3818,argyle pantyhose
눈/파란 흰자,0,3801,blue sclera
양말/노란 양말,0,3791,yellow socks
옷/털 달린 칼라,0,3788,fur-trimmed collar
옷/프릴 반바지,0,3774,frilled shorts
양말/세로줄 팬티스타킹,0,3774,vertical-striped pantyhose
옷/분홍 세일러 칼라,0,3754,pink sailor collar
머리/비대칭 옆머리,0,3737,asymmetrical sidelocks
속옷/회색 스포츠 브라,0,3724,grey sports bra
소품/별 브로치,0,3724,star brooch
옷/가죽 벨트,0,3720,leather belt
옷/꽉 끼는 셔츠,0,3720,tight shirt
소품/오니 마스크,0,3717,oni mask
옷/노란 망토,0,3709,yellow cape
동물/공룡,0,3707,dinosaur
옷/파란 튜닉,0,3701,blue tunic
옷/갈색 망토(클로크),0,3700,brown cloak
옷/물방울무늬 드레스,0,3696,polka dot dress
소품/보라 밧줄,0,3696,purple rope
소품/짧은 검,0,3687,short sword
소품/노란 깃털,0,3686,yellow feathers
모자/빨간 헬멧,0,3683,red helmet
옷/퐁퐁한 바지,0,3679,puffy pants
소품/빨간 꽃잎,0,3673,red petals
옷/흰 코르셋,0,3670,white corset
옷/투톤 리본,0,3669,two-tone ribbon
소품/초록 꽃,0,3664,green flower
옷/구름 무늬,0,3653,cloud print
옷/짧은 스웨터,0,3647,cropped sweater
머리/주황 곱창 머리끈,0,3642,orange scrunchie
양말/보라 양말,0,3638,purple socks
동물/거미,0,3623,spider
옷/멀티컬러 리본,0,3620,multicolored bow
동물/고래,0,3619,whale
배경/나무 벽,0,3610,wooden wall
속옷/스트랩리스 브라,0,3603,strapless bra
옷/주황 후드티,0,3598,orange hoodie
옷/갈색 보타이,0,3596,brown bowtie
소품/스포츠 자동차,0,3595,sports car
모자/검은 헬멧,0,3590,black helmet
소품/빨간 마스크,0,3587,red mask
옷/갈색 앞치마,0,3585,brown apron
옷/초록 케이프,0,3573,green capelet
옷/빨간 민소매,0,3565,red tank top
몸/주황 피부,0,3557,orange skin
양말/비치는 레그웨어,0,3554,see-through legwear
옷/라텍스 장갑,0,3553,latex gloves
옷/줄무늬 기모노,0,3552,striped kimono
몸/빨간 꼬리,0,3548,red tail
옷/체크무늬 비키니,0,3542,plaid bikini
성인/어두운 항문,0,3533,dark anus
옷/털 달린 반바지,0,3530,fur-trimmed shorts
옷/투톤 레오타드,0,3529,two-tone leotard
몸/기계 귀,0,3525,mechanical ears
옷/핀스트라이프 재킷,0,3524,pinstripe jacket
옷/망사 장갑,0,3520,fishnet gloves
옷/찢어진 레오타드,0,3509,torn leotard
머리/색 있는 앞머리,0,3507,colored bangs
몸/초록 털,0,3488,green fur
옷/초록 보디수트,0,3486,green bodysuit
옷/깃털 단 소매,0,3479,feather-trimmed sleeves
소품/가시 달린 암릿,0,3467,spiked armlet
옷/보라 애스콧 타이,0,3465,purple ascot
머리/금속 머리띠,0,3453,metal hairband
옷/체크 기모노,0,3417,checkered kimono
소품/주황 초커,0,3411,orange choker
옷/핀스트라이프 셔츠,0,3410,pinstripe shirt
속옷/열린 브라,0,3409,open bra
옷/세로줄 재킷,0,3408,vertical-striped jacket
소품/흰 우산,0,3408,white umbrella
옷/빨간 앞치마,0,3406,red apron
소품/흰 백합,0,3406,white lily
속옷/노란 브라,0,3403,yellow bra
옷/보라 목스카프,0,3394,purple neckerchief
소품/부서진 헤일로,0,3393,broken halo
소품/초록 가방,0,3383,green bag
소품/벗은 부츠,0,3376,unworn boots
옷/초록 튜닉,0,3374,green tunic
소품/빨간 십자가,0,3371,red cross
옷/분홍 캐미솔,0,3369,pink camisole
소품/분홍 보석,0,3367,pink gem
소품/해골 귀걸이,0,3366,skull earrings
속옷/회색 브라,0,3364,grey bra
소품/벗은 양말,0,3357,unworn socks
동물/사자,0,3339,lion
소품/노란 완장,0,3325,yellow armband
몸/초록 꼬리,0,3324,green tail
옷/풀린 넥타이,0,3321,undone necktie
옷/오프숄더 재킷,0,3313,off-shoulder jacket
머리/투톤 머리띠,0,3309,two-tone hairband
소품/파란 깃털,0,3308,blue feathers
동물/원숭이,0,3302,monkey
옷/체크 넥타이,0,3298,checkered necktie
옷/검은 손목 커프스,0,3295,black wrist cuffs
몸/갈색 날개,0,3293,brown wings
옷/노란 앞치마,0,3287,yellow apron
옷/분홍 케이프,0,3256,pink capelet
옷/분홍 원피스 수영복,0,3255,pink one-piece swimsuit
옷/프릴 세일러 칼라,0,3254,frilled sailor collar
옷/파란 타바드,0,3252,blue tabard
자세/초콜릿 들기,0,3251,holding chocolate
소품/트럭,0,3246,truck
옷/무늬 재킷,0,3239,print jacket
옷/분홍 망토,0,3238,pink cape
얼굴/긴 수염,0,3229,long beard
신발/투톤 신발,0,3226,two-tone shoes
배경/열린 창문,0,3223,open window
옷/칼라 있는 조끼,0,3214,collared vest
옷/줄무늬 장갑,0,3213,striped gloves
옷/회색 리본,0,3197,grey ribbon
머리/회색 머리띠,0,3192,grey hairband
옷/파란 잠옷,0,3190,blue pajamas
옷/투톤 보타이,0,3176,two-tone bowtie
소품/아쿠아 헤일로,0,3164,aqua halo
신발/교차 끈 신발,0,3149,cross-laced shoes
몸/주황 꼬리,0,3133,orange tail
몸/분홍 뿔,0,3129,pink horns
소품/부서진 하트,0,3127,broken heart
몸/회색 손톱,0,3104,grey nails
옷/파란 베일,0,3103,blue veil
옷/노란 보디수트,0,3099,yellow bodysuit
옷/교차 끈 소매,0,3094,cross-laced sleeves
몸/하트 꼬리,0,3091,heart tail
옷/민소매 코트,0,3083,sleeveless coat
소품/별 장식,0,3082,star ornament
눈/초록 눈동자,0,3081,green pupils
옷/파란 민소매,0,3074,blue tank top
동물/봉제 상어,0,3068,stuffed shark
옷/주황 조끼,0,3067,orange vest
속옷/무늬 브라,0,3067,print bra
몸/노란 꼬리,0,3061,yellow tail
양말/털 달린 레그웨어,0,3053,fur-trimmed legwear
동물/흰 나비,0,3050,white butterfly
소품/벗은 가방,0,3044,unworn bag
소품/레이스 초커,0,3037,lace choker
음식/주스,0,3036,juice
신발/빨간 샌들,0,3032,red sandals
옷/투톤 원피스 수영복,0,3024,two-tone one-piece swimsuit
소품/해골 마스크,0,3022,skull mask
옷/프릴 레오타드,0,3021,frilled leotard
신발/멀티컬러 부츠,0,3021,multicolored boots
옷/짝짝이 소매,0,3018,mismatched sleeves
머리/줄무늬 머리띠,0,3011,striped hairband
옷/비치는 재킷,0,3006,see-through jacket
소품/주황 헤일로,0,2995,orange halo
옷/초록 벨트,0,2987,green belt
옷/갈색 후드티,0,2981,brown hoodie
머리/초록 머리띠,0,2980,green headband
옷/십자가 타이,0,2979,cross tie
양말/흰 레깅스,0,2979,white leggings
얼굴/가짜 콧수염,0,2977,fake mustache
옷/갈색 소매,0,2976,brown sleeves
옷/옆트임 기모노,0,2975,sideless kimono
옷/카모 재킷,0,2972,camouflage jacket
옷/보라 베일,0,2969,purple veil
옷/열린 벨트,0,2958,open belt
옷/오프숄더 비키니,0,2956,off-shoulder bikini
몸/오버사이즈 날개,0,2953,oversized wings
옷/민소매 후드티,0,2953,sleeveless hoodie
모자/아쿠아 모자,0,2952,aqua hat
옷/회색 민소매,0,2952,grey tank top
옷/교차 끈 상의,0,2949,cross-laced top
옷/카모 바지,0,2942,camouflage pants
옷/회색 비키니,0,2941,grey bikini
옷/주황 벨트,0,2927,orange belt
소품/가시 달린 헤일로,0,2925,spiked halo
양말/아가일 니삭,0,2919,argyle thighhighs
얼굴/눈썹 없음,0,2915,no eyebrows
눈/보라 눈동자,0,2906,purple pupils
옷/가죽 장갑,0,2905,leather gloves
옷/초록 망토(클로크),0,2904,green cloak
양말/주황 팬티스타킹,0,2904,orange pantyhose
동물/돌고래,0,2897,dolphin
동물/보라 나비,0,2888,purple butterfly
몸/투명 날개,0,2879,transparent wings
옷/겹친 셔츠,0,2865,layered shirt
눈/기계 눈,0,2861,mechanical eyes
배경/노란 하늘,0,2848,yellow sky
옷/다중 끈 비키니 상의,0,2846,multi-strapped bikini top
소품/벗은 비키니 상의,0,2837,unworn bikini top
머리/보라 곱창 머리끈,0,2822,purple scrunchie
소품/꽃 목걸이,0,2821,flower necklace
옷/프릴 애스콧 타이,0,2805,frilled ascot
배경/분홍 하늘,0,2799,pink sky
옷/분홍 손목 커프스,0,2789,pink wrist cuffs
옷/꽉 끼는 드레스,0,2787,tight dress
속옷/파란 스포츠 브라,0,2785,blue sports bra
머리/드릴 포니테일,0,2783,drill ponytail
옷/주황 스웨터,0,2783,orange sweater
몸/초록 날개,0,2781,green wings
속옷/얼룩진 팬티,0,2773,stained panties
소품/벗은 샌들,0,2770,unworn sandals
소품/나무 검,0,2767,wooden sword
몸/금속 피부,0,2758,metal skin
머리/딸기 머리장식,0,2758,strawberry hair ornament
배경/둥근 테이블,0,2756,round table
옷/레이스 장갑,0,2748,lace gloves
옷/분홍 애스콧 타이,0,2746,pink ascot
옷/리본 단 드레스,0,2745,ribbon-trimmed dress
옷/세로줄 바지,0,2745,vertical-striped pants
몸/회색 날개,0,2735,grey wings
옷/투톤 망토,0,2730,two-tone cape
자세/리본 들기,0,2724,holding ribbon
옷/후드 달린 스웨터,0,2719,hooded sweater
양말/초록 팬티스타킹,0,2716,green pantyhose
몸/짧은 꼬리,0,2705,short tail
몸/가시 달린 꼬리,0,2703,spiked tail
소품/아쿠아 보석,0,2701,aqua gem
옷/갈색 비키니,0,2698,brown bikini
옷/투톤 목도리,0,2697,two-tone scarf
소품/어두운 헤일로,0,2688,dark halo
옷/꽃무늬 무늬 비키니,0,2683,floral print bikini
소품/꽃 브로치,0,2679,flower brooch
신발/주황 부츠,0,2670,orange boots
옷/파란 후드,0,2666,blue hood
소품/검은 우산,0,2662,black umbrella
소품/벗은 장갑,0,2662,unworn gloves
옷/노란 레오타드,0,2662,yellow leotard
머리/사탕 머리장식,0,2657,candy hair ornament
자세/장신구 들기,0,2643,holding jewelry
자세/편지 들기,0,2634,holding letter
옷/골지 소매,0,2633,ribbed sleeves
속옷/아쿠아 팬티,0,2632,aqua panties
얼굴/검은 아이섀도,0,2632,black eyeshadow
옷/옆트임 드레스,0,2629,sideless dress
옷/찢어진 목도리,0,2619,torn scarf
옷/세로줄 반바지,0,2603,vertical-striped shorts
소품/기계 연필,0,2598,mechanical pencil
옷/하이웨이스트 벨트,0,2595,high-waist belt
옷/거대한 리본,0,2581,huge bow
옷/투톤 코트,0,2573,two-tone coat
옷/하트 칼라,0,2570,heart collar
옷/보라 카디건,0,2569,purple cardigan
옷/칼라 있는 케이프,0,2566,collared capelet
옷/투톤 후드티,0,2562,two-tone hoodie
옷/회색 케이프,0,2558,grey capelet
배경/나무 의자,0,2558,wooden chair
속옷/물방울무늬 브라,0,2557,polka dot bra
옷/개구리 무늬,0,2556,frog print
성인/십자가 니플 패치,0,2554,cross pasties
동물/노란 나비,0,2554,yellow butterfly
소품/주황 장미,0,2551,orange rose
소품/닌자 마스크,0,2543,ninja mask
옷/빨간 카디건,0,2539,red cardigan
머리/뱀 머리,0,2538,snake hair
옷/프릴 재킷,0,2528,frilled jacket
모자/멀티컬러 모자,0,2525,multicolored hat
소품/갈색 초커,0,2517,brown choker
옷/레이스 달린 치마,0,2516,lace-trimmed skirt
자세/피자 들기,0,2512,holding pizza
옷/찢어진 장갑,0,2509,torn gloves
소품/꽃 초커,0,2506,flower choker
동물/빛나는 나비,0,2506,glowing butterfly
옷/빨간 로브,0,2494,red robe
옷/주황 세일러 칼라,0,2493,orange sailor collar
소품/부서진 사슬,0,2491,broken chain
양말/투톤 니삭,0,2484,two-tone thighhighs
소품/벗은 코트,0,2482,unworn coat
머리/벚 머리장식,0,2471,cherry hair ornament
양말/골지 니삭,0,2450,ribbed thighhighs
옷/회색 망토,0,2449,grey cape
옷/옆트임 셔츠,0,2442,sideless shirt
옷/찢어진 재킷,0,2432,torn jacket
옷/회색 세일러복,0,2430,grey serafuku
얼굴/짝짝이 눈썹,0,2430,mismatched eyebrows
옷/검은 반도 브라,0,2426,black bandeau
몸/큰 귀,0,2419,large ears
소품/금색 동전,0,2412,gold coin
옷/프릴 캐미솔,0,2404,frilled camisole
자세/케이크 들기,0,2404,holding cake
몸/그려진 귀,0,2395,drawn ears
옷/물고기 무늬,0,2388,fish print
옷/아쿠아 장갑,0,2387,aqua gloves
소품/갈색 헤일로,0,2385,brown halo
배경/검은 하늘,0,2379,black sky
소품/동물 해골,0,2376,animal skull
모자/흰 헬멧,0,2373,white helmet
소품/십자가 헤일로,0,2371,cross halo
신발/가죽 부츠,0,2364,leather boots
소품/레이스 달린 초커,0,2361,lace-trimmed choker
옷/멀티컬러 기모노,0,2360,multicolored kimono
옷/파란 캐미솔,0,2357,blue camisole
옷/망사 소매,0,2347,fishnet sleeves
배경/둥근 창문,0,2347,round window
옷/주황 소매,0,2343,orange sleeves
옷/초록 민소매,0,2332,green tank top
옷/꽃무늬 무늬 드레스,0,2331,floral print dress
소품/해골 장식,0,2331,skull ornament
소품/벗은 드레스,0,2329,unworn dress
옷/보라 원피스 수영복,0,2326,purple one-piece swimsuit
모자/투톤 모자,0,2324,two-tone hat
소품/초록 완장,0,2318,green armband
소품/수정 귀걸이,0,2315,crystal earrings
몸/초록 뿔,0,2307,green horns
머리/금발 브릿지,0,2306,blonde streaks
소품/마스크 없음,0,2304,no mask
머리/빛나는 머리,0,2303,glowing hair
양말/주황 양말,0,2296,orange socks
머리/줄무늬 머리,0,2293,striped hair
옷/회색 레오타드,0,2280,grey leotard
소품/투톤 헤일로,0,2267,two-tone halo
몸/별 문신,0,2259,star tattoo
옷/장갑 없음,0,2258,no gloves
동물/소,0,2255,cow
눈/초록 흰자,0,2253,green sclera
옷/분홍 띠,0,2252,pink sash
소품/유리 병,0,2251,glass bottle
옷/가죽 바지,0,2248,leather pants
옷/노란 민소매,0,2243,yellow tank top
옷/보라 칼라,0,2238,purple collar
소품/빨간 깃털,0,2231,red feathers
몸/투톤 뿔,0,2231,two-tone horns
옷/흰 숄,0,2228,white shawl
머리/주황 머리띠,0,2219,orange headband
옷/투톤 바지,0,2206,two-tone pants
몸/푹신한 꼬리,0,2202,fluffy tail
옷/초록 카디건,0,2202,green cardigan
옷/보라 타바드,0,2196,purple tabard
얼굴/보라 혀,0,2195,purple tongue
몸/갈색 손톱,0,2192,brown nails
머리/가시 달린 머리띠,0,2178,spiked hairband
옷/흰 벙어리장갑,0,2175,white mittens
눈/짝짝이 흰자,0,2167,mismatched sclera
신발/파란 샌들,0,2161,blue sandals
속옷/찢어진 팬티,0,2159,torn panties
소품/십자가 초커,0,2157,cross choker
옷/레이스 달린 장갑,0,2157,lace-trimmed gloves
옷/무늬 후드티,0,2156,print hoodie
양말/망사 양말,0,2154,fishnet socks
옷/갈색 레오타드,0,2146,brown leotard
옷/주황 애스콧 타이,0,2132,orange ascot
옷/빨간 코르셋,0,2124,red corset
소품/흰 완장,0,2119,white armband
머리/수정 머리,0,2115,crystal hair
옷/주름 반바지,0,2108,pleated shorts
옷/노란 우비,0,2107,yellow raincoat
몸/검은 비늘,0,2102,black scales
옷/털 달린 셔츠,0,2093,fur-trimmed shirt
몸/빛나는 문신,0,2092,glowing tattoo
옷/골지 레오타드,0,2089,ribbed leotard
신발/투톤 부츠,0,2089,two-tone boots
자세/동전 들기,0,2074,holding coin
옷/칼라 있는 볼레로,0,2073,collared shrug
양말/털 달린 니삭,0,2073,fur-trimmed thighhighs
소품/하트 펜던트,0,2071,heart pendant
소품/노란 보석,0,2071,yellow gem
소품/벗은 수영복,0,2070,unworn swimsuit
옷/민소매 보디수트,0,2069,sleeveless bodysuit
옷/후드 달린 카디건,0,2068,hooded cardigan
옷/긴 리본,0,2067,long ribbon
옷/초록 하카마,0,2066,green hakama
속옷/주황 팬티,0,2064,orange panties
배경/금 간 벽,0,2056,cracked wall
소품/파란 반다나,0,2048,blue bandana
양말/하이웨이스트 팬티스타킹,0,2047,high-waist pantyhose
신발/분홍 슬리퍼,0,2046,pink slippers
자세/해골 들기,0,2032,holding skull
속옷/갈색 팬티,0,2027,brown panties
옷/빨간 타바드,0,2026,red tabard
옷/흰 반도 브라,0,2022,white bandeau
머리/노란 머리띠,0,2021,yellow headband
옷/갈색 칼라,0,2020,brown collar
눈/물결 눈,0,2014,wavy eyes
옷/투톤 넥타이,0,2008,two-tone necktie
양말/그라데이션 레그웨어,0,2007,gradient legwear
옷/파란 손목 커프스,0,2005,blue wrist cuffs
머리/아쿠아 머리띠,0,1997,aqua hairband
소품/날개 달린 하트,0,1993,winged heart
배경/거대한 달,0,1990,huge moon
양말/투톤 레그웨어,0,1987,two-tone legwear
옷/빨간 한푸,0,1971,red hanfu
옷/파란 숄,0,1969,blue shawl
동물/회색 고양이,0,1968,grey cat
옷/보라 로브,0,1968,purple robe
옷/헐렁한 셔츠,0,1966,loose shirt
머리/초록 곱창 머리끈,0,1965,green scrunchie
옷/노란 망토(클로크),0,1964,yellow cloak
옷/검은 베이비돌,0,1959,black babydoll
옷/검은 슬링샷 수영복,0,1956,black slingshot swimsuit
옷/후드 달린 드레스,0,1956,hooded dress
옷/회색 보타이,0,1955,grey bowtie
옷/주황 민소매,0,1955,orange tank top
얼굴/거대한 눈썹,0,1951,huge eyebrows
옷/물방울무늬 셔츠,0,1949,polka dot shirt
모자/흰 보닛,0,1946,white bonnet
옷/흰 베이비돌,0,1945,white babydoll
자세/하트 들기,0,1943,holding heart
옷/핀스트라이프 드레스,0,1943,pinstripe dress
몸/그라데이션 뿔,0,1939,gradient horns
소품/징 박힌 초커,0,1938,studded choker
양말/노란 팬티스타킹,0,1937,yellow pantyhose
몸/줄무늬 털,0,1932,striped fur
옷/주황 망토,0,1931,orange cape
소품/플라스틱 병,0,1931,plastic bottle
옷/열린 보디수트,0,1925,open bodysuit
소품/하트 모양 보석,0,1914,heart-shaped gem
옷/줄무늬 후드티,0,1912,striped hoodie
옷/아쿠아 기모노,0,1911,aqua kimono
옷/흰 나이트가운,0,1908,white nightgown
소품/수정 공,0,1907,crystal ball
소품/불타는 검,0,1905,flaming sword
옷/줄무늬 조끼,0,1895,striped vest
눈/주황 눈동자,0,1893,orange pupils
속옷/투톤 스포츠 브라,0,1892,two-tone sports bra
옷/물방울무늬 치마,0,1888,polka dot skirt
옷/오프숄더 원피스 수영복,0,1887,off-shoulder one-piece swimsuit
동물/검은 새,0,1885,black bird
옷/초록 갑옷,0,1877,green armor
소품/짝짝이 귀걸이,0,1877,mismatched earrings
옷/새 무늬,0,1874,bird print
옷/빨간 벙어리장갑,0,1865,red mittens
옷/초록 띠,0,1862,green sash
소품/회색 꽃,0,1860,grey flower
소품/광선검,0,1860,lightsaber
옷/무늬 소매,0,1857,print sleeves
몸/그라데이션 날개,0,1854,gradient wings
배경/흰 하늘,0,1851,white sky
양말/광택 있는 레그웨어,0,1850,shiny legwear
옷/회색 망토(클로크),0,1848,grey cloak
소품/분홍 우산,0,1842,pink umbrella
옷/흰 사롱,0,1842,white sarong
자세/사슬 들기,0,1838,holding chain
신발/아쿠아 신발,0,1836,aqua shoes
소품/파란 우산,0,1831,blue umbrella
옷/파란 점프수트,0,1827,blue jumpsuit
옷/갈색 띠,0,1826,brown sash
머리/초록 브릿지,0,1823,green streaks
소품/꽃 팔찌,0,1822,flower bracelet
옷/숫자 무늬,0,1822,number print
옷/투톤 베일,0,1820,two-tone veil
옷/가죽 갑옷,0,1818,leather armor
소품/징 박힌 팔찌,0,1814,studded bracelet
옷/후드 달린 조끼,0,1812,hooded vest
소품/초록 머릿수건,0,1810,green headscarf
소품/프릴 완장,0,1807,frilled armband
양말/라텍스 레그웨어,0,1801,latex legwear
소품/회색 초커,0,1797,grey choker
옷/무늬 반바지,0,1792,print shorts
양말/찢어진 보디스타킹,0,1791,torn bodystocking
몸/사슴 꼬리,0,1790,deer tail
옷/분홍 민소매,0,1790,pink tank top
옷/투톤 기모노,0,1790,two-tone kimono
몸/긴 뿔,0,1789,long horns
옷/투톤 스웨터,0,1788,two-tone sweater
몸/빛나는 날개,0,1787,glowing wings
옷/젖은 드레스,0,1786,wet dress
소품/새 마스크,0,1785,bird mask
옷/레이스 달린 셔츠,0,1780,lace-trimmed shirt
성인/별 니플 패치,0,1780,star pasties
소품/멀티컬러 꽃,0,1775,multicolored flower
옷/흰 잠옷,0,1771,white pajamas
옷/세로줄 소매,0,1768,vertical-striped sleeves
몸/멀티컬러 꼬리,0,1762,multicolored tail
소품/초록 깃털,0,1761,green feathers
옷/보라 갑옷,0,1758,purple armor
옷/흰 타바드,0,1750,white tabard
소품/고양이 가방,0,1748,cat bag
옷/무늬 하오리,0,1748,print haori
속옷/빨간 스포츠 브라,0,1743,red sports bra
옷/세로줄 기모노,0,1743,vertical-striped kimono
옷/파란 사롱,0,1737,blue sarong
소품/안대 없음,0,1736,no eyepatch
옷/무늬 넥타이,0,1732,print necktie
자세/물고기 들기,0,1730,holding fish
옷/골지 보디수트,0,1727,ribbed bodysuit
소품/눈가리개 없음,0,1726,no blindfold
소품/뱀 귀걸이,0,1720,snake earrings
옷/세로줄 비키니,0,1717,vertical-striped bikini
옷/초록 로브,0,1706,green robe
옷/번개 무늬,0,1702,lightning bolt print
얼굴/색 있는 치아,0,1699,colored teeth
옷/줄무늬 코트,0,1695,striped coat
옷/주황 점프수트,0,1693,orange jumpsuit
옷/고무 장갑,0,1684,rubber gloves
옷/초록 원피스 수영복,0,1678,green one-piece swimsuit
옷/해골 무늬,0,1678,skeleton print
소품/해골 목걸이,0,1676,skull necklace
옷/파란 하오리,0,1674,blue haori
옷/후드 달린 보디수트,0,1667,hooded bodysuit
속옷/체크무늬 팬티,0,1663,plaid panties
몸/빛나는 뿔,0,1660,glowing horns
눈/하트 모양 눈,0,1659,heart-shaped eyes
옷/초록 애스콧 타이,0,1657,green ascot
소품/금색 티아라,0,1651,gold tiara
속옷/다중 끈 팬티,0,1651,multi-strapped panties
동물/흰 호랑이,0,1651,white tiger
옷/보라 망토(클로크),0,1650,purple cloak
옷/멀티컬러 후드티,0,1642,multicolored hoodie
몸/태양 문신,0,1636,sun tattoo
머리/분홍 머리띠,0,1634,pink headband
소품/별 모양 안경,0,1634,star-shaped eyewear
몸/곰 꼬리,0,1631,bear tail
옷/광택 있는 수영복,0,1627,shiny swimsuit
옷/멀티컬러 망토,0,1622,multicolored cape
몸/날개 달린 하트 문신,0,1619,winged heart tattoo
옷/물방울무늬 수영복,0,1616,polka dot swimsuit
자세/열쇠 들기,0,1612,holding key
자세/목걸이 들기,0,1610,holding necklace
자세/십자가 들기,0,1608,holding cross
소품/말굽,0,1608,horseshoe
몸/용 귀,0,1605,dragon ears
신발/금색 신발,0,1605,gold shoes
속옷/아쿠아 브라,0,1602,aqua bra
소품/흰 꽃잎,0,1601,white petals
옷/체크 셔츠,0,1600,checkered shirt
소품/벗은 배낭,0,1598,unworn backpack
소품/회색 가방,0,1592,grey bag
옷/회색 앞치마,0,1589,grey apron
소품/나비 장식,0,1584,butterfly ornament
옷/멀티컬러 넥타이,0,1581,multicolored necktie
머리/번개 머리장식,0,1580,lightning bolt hair ornament
얼굴/초록 아이섀도,0,1579,green eyeshadow
옷/투톤 반바지,0,1577,two-tone shorts
소품/프릴 손목밴드,0,1575,frilled wristband
모자/잎 모자 장식,0,1574,leaf hat ornament
머리/레이스 달린 머리띠,0,1572,lace-trimmed hairband
옷/멀티컬러 목도리,0,1572,multicolored scarf
머리/아쿠아 브릿지,0,1569,aqua streaks
자세/지도 들기,0,1563,holding map
옷/핀스트라이프 바지,0,1563,pinstripe pants
옷/찢어진 코트,0,1563,torn coat
소품/파란 꽃잎,0,1562,blue petals
음식/초록 차,0,1555,green tea
옷/물방울무늬 잠옷,0,1554,polka dot pajamas
속옷/스포츠 팬티,0,1548,sports panties
동물/주황 고양이,0,1541,orange cat
소품/젖은 수건,0,1541,wet towel
옷/초록 칼라,0,1540,green collar
몸/투톤 날개,0,1536,two-tone wings
양말/세로줄 양말,0,1534,vertical-striped socks
자세/수영복 들기,0,1532,holding swimsuit
옷/빨간 하오리,0,1532,red haori
모자/토끼 모자,0,1529,rabbit hat
옷/흰 튜닉,0,1529,white tunic
배경/금 간 바닥,0,1521,cracked floor
소품/프릴 우산,0,1515,frilled umbrella
속옷/갈색 브라,0,1514,brown bra
옷/가시 달린 재킷,0,1510,spiked jacket
머리/체크 머리띠,0,1505,checkered hairband
양말/한쪽 망사 레그웨어,0,1504,single fishnet legwear
옷/노란 캐미솔,0,1493,yellow camisole
옷/금색 벨트,0,1491,gold belt
음식/딸기 케이크,0,1491,strawberry cake
옷/빨간 반도 브라,0,1490,red bandeau
동물/빨간 나비,0,1486,red butterfly
옷/찢어진 망토(클로크),0,1485,torn cloak
옷/갈색 목스카프,0,1484,brown neckerchief
자세/도넛 들기,0,1483,holding donut
옷/아쿠아 레오타드,0,1481,aqua leotard
자세/셔츠 들기,0,1477,holding shirt
몸/흰 비늘,0,1475,white scales
옷/아가일 스웨터,0,1467,argyle sweater
옷/보라 하카마,0,1466,purple hakama
소품/초록 반다나,0,1462,green bandana
얼굴/갈색 입술,0,1461,brown lips
옷/아쿠아 반바지,0,1460,aqua shorts
옷/무늬 스웨터,0,1459,print sweater
옷/분홍 하카마,0,1457,pink hakama
소품/날개 달린 헤일로,0,1455,winged halo
양말/아쿠아 니삭,0,1454,aqua thighhighs
옷/주황 레오타드,0,1453,orange leotard
소품/빨간 왕관,0,1453,red crown
배경/부서진 창문,0,1450,broken window
소품/벗은 비키니,0,1446,unworn bikini
신발/날개 달린 신발,0,1444,winged shoes
소품/벗은 넥타이,0,1435,unworn necktie
옷/체크무늬 리본,0,1433,plaid ribbon
소품/검은 반다나,0,1432,black bandana
자세/보석 들기,0,1432,holding gem
동물/봉제 펭귄,0,1431,stuffed penguin
소품/갈색 꽃,0,1429,brown flower
옷/찢어진 수영복,0,1427,torn swimsuit
옷/무장한 레오타드,0,1425,armored leotard
옷/흰 점프수트,0,1424,white jumpsuit
옷/회색 갑옷,0,1423,grey armor
옷/스트랩리스 원피스 수영복,0,1423,strapless one-piece swimsuit
몸/찢어진 날개,0,1420,torn wings
옷/체크 리본,0,1417,checkered bow
옷/빨간 숄,0,1411,red shawl
옷/검은 점프수트,0,1407,black jumpsuit
모자/검은 보닛,0,1406,black bonnet
옷/회색 캐미솔,0,1406,grey camisole
옷/아쿠아 소매,0,1402,aqua sleeves
옷/레이스 소매,0,1401,lace sleeves
얼굴/노란 치아,0,1400,yellow teeth
소품/하트 모양 장식,0,1399,heart-shaped ornament
양말/교차 끈 레그웨어,0,1398,cross-laced legwear
소품/고양이 마스크,0,1397,cat mask
얼굴/아주 긴 혀,0,1396,very long tongue
옷/교차 끈 치마,0,1394,cross-laced skirt
자세/브라 들기,0,1394,holding bra
옷/체크 띠,0,1393,checkered sash
옷/갈색 벙어리장갑,0,1391,brown mittens
몸/아쿠아 피부,0,1389,aqua skin
옷/비치는 사롱,0,1385,see-through sarong
옷/체크 드레스,0,1383,checkered dress
몸/돼지 귀,0,1381,pig ears
옷/검은 멜빵바지,0,1380,black overalls
소품/보라 가방,0,1379,purple bag
소품/아쿠아 꽃,0,1375,aqua flower
옷/털 달린 레오타드,0,1375,fur-trimmed leotard
옷/줄무늬 잠옷,0,1374,striped pajamas
자세/밧줄 들기,0,1373,holding rope
옷/빨간 손목 커프스,0,1370,red wrist cuffs
동물/파란 새,0,1365,blue bird
자세/방울 들기,0,1362,holding bell
몸/나비 문신,0,1361,butterfly tattoo
속옷/비치는 팬티,0,1361,see-through panties
옷/주황 코트,0,1360,orange coat
신발/뾰족한 신발,0,1360,pointy shoes
동물/코끼리,0,1359,elephant
몸/주황 뿔,0,1357,orange horns
모자/초록 헬멧,0,1356,green helmet
옷/물방울무늬 리본,0,1355,polka dot ribbon
모자/동물 헬멧,0,1354,animal helmet
소품/벗은 비키니 하의,0,1354,unworn bikini bottom
머리/아주 긴 옆머리,0,1347,very long sidelocks
옷/긴 목도리,0,1345,long scarf
소품/나비 브로치,0,1338,butterfly brooch
옷/초록 점프수트,0,1337,green jumpsuit
옷/노란 세일러 칼라,0,1337,yellow sailor collar
배경/어두운 구름,0,1333,dark cloud
신발/분홍 샌들,0,1330,pink sandals
옷/파란 코르셋,0,1328,blue corset
머리/물방울무늬 곱창 머리끈,0,1324,polka dot scrunchie
속옷/딸기 무늬 팬티,0,1320,strawberry print panties
옷/분리된 후드,0,1318,detached hood
자세/달걀 들기,0,1318,holding egg
몸/빨간 비늘,0,1318,red scales
소품/나비 귀걸이,0,1317,butterfly earrings
속옷/새틴 팬티,0,1313,satin panties
소품/흰 반다나,0,1313,white bandana
동물/봉제 개,0,1312,stuffed dog
몸/투톤 꼬리,0,1312,two-tone tail
옷/주황 앞치마,0,1310,orange apron
소품/벗은 반바지,0,1309,unworn shorts
옷/갈색 애스콧 타이,0,1308,brown ascot
몸/초록 비늘,0,1307,green scales
소품/빛나는 꽃,0,1305,glowing flower
소품/부서진 마스크,0,1297,broken mask
옷/금색 칼라,0,1292,gold collar
얼굴/아주 긴 수염,0,1289,very long beard
소품/벗은 머리장식,0,1276,unworn hair ornament
소품/고양이 초커,0,1271,cat choker
옷/털 달린 비키니,0,1271,fur-trimmed bikini
옷/아쿠아 바지,0,1265,aqua pants
옷/투톤 소매,0,1264,two-tone sleeves
소품/잎 우산,0,1262,leaf umbrella
옷/빨간 캐미솔,0,1262,red camisole
머리/꽃 머리띠,0,1261,flower hairband
자세/개 들기,0,1261,holding dog
소품/부서진 안경,0,1260,broken eyewear
소품/벗은 재갈,0,1259,unworn gag
양말/라텍스 니삭,0,1255,latex thighhighs
소품/흰 밧줄,0,1250,white rope
옷/리본 단 비키니,0,1249,ribbon-trimmed bikini
소품/벗은 장신구,0,1249,unworn jewelry
동물/갈색 고양이,0,1248,brown cat
옷/멀티컬러 보타이,0,1247,multicolored bowtie
소품/초록 장미,0,1246,green rose
옷/곰 후드,0,1245,bear hood
옷/노란 원피스 수영복,0,1245,yellow one-piece swimsuit
옷/부서진 갑옷,0,1244,broken armor
몸/큰 뿔,0,1244,large horns
옷/은색 드레스,0,1244,silver dress
신발/흰 슬리퍼,0,1239,white slippers
자세/담요 들기,0,1238,holding blanket
옷/징 박힌 칼라,0,1238,studded collar
소품/빨간 별,0,1237,red star
옷/라텍스 레오타드,0,1236,latex leotard
소품/노란 꽃잎,0,1236,yellow petals
머리/동물 머리장식,0,1234,animal hair ornament
옷/등 파인 수영복,0,1231,backless swimsuit
소품/주황 보석,0,1231,orange gem
옷/무장한 보디수트,0,1230,armored bodysuit
소품/분홍 튤립,0,1228,pink tulip
눈/분홍 흰자,0,1227,pink sclera
옷/교차 끈 비키니,0,1225,cross-laced bikini
옷/노란 반도 브라,0,1224,yellow bandeau
옷/빨간 볼레로,0,1223,red shrug
옷/팽팽한 레오타드,0,1220,taut leotard
동물/분홍 나비,0,1215,pink butterfly
옷/초록 잠옷,0,1211,green pajamas
옷/후드 달린 볼레로,0,1211,hooded shrug
소품/그라데이션 헤일로,0,1210,gradient halo
속옷/분홍 스포츠 브라,0,1209,pink sports bra
동물/봉제 판다,0,1206,stuffed panda
양말/검은 힙하이,0,1201,black hiphighs
모자/호박 모자,0,1197,pumpkin hat
옷/줄무늬 원피스 수영복,0,1195,striped one-piece swimsuit
소품/벗은 망토,0,1194,unworn cape
소품/벗은 목도리,0,1189,unworn scarf
모자/노란 챙 모자,0,1188,yellow visor cap
속옷/금색 브라,0,1185,gold bra
배경/비치는 커튼,0,1184,see-through curtains
옷/흰 하카마,0,1183,white hakama
소품/부서진 검,0,1182,broken sword
옷/회색 애스콧 타이,0,1182,grey ascot
옷/노란 케이프,0,1182,yellow capelet
옷/꽃무늬 무늬 치마,0,1181,floral print skirt
신발/노란 샌들,0,1177,yellow sandals
옷/파란 볼레로,0,1172,blue shrug
머리/하트 모양 머리,0,1172,heart-shaped hair
옷/무늬 바지,0,1170,print pants
소품/가짜 헤일로,0,1169,fake halo
자세/양초 들기,0,1169,holding candle
신발/뾰족한 부츠,0,1169,pointy boots
소품/갈색 깃털,0,1168,brown feathers
옷/갈색 로브,0,1168,brown robe
옷/아쿠아 조끼,0,1166,aqua vest
얼굴/이빨,0,1166,tooth
몸/은색 피부,0,1165,silver skin
양말/분리된 레깅스,0,1164,detached leggings
소품/잎 귀걸이,0,1162,leaf earrings
양말/찢어진 양말,0,1161,torn socks
소품/보라 완장,0,1159,purple armband
몸/파란 비늘,0,1157,blue scales
옷/보라 앞치마,0,1155,purple apron
배경/초록 하늘,0,1153,green sky
동물/작은 용,0,1153,small dragon
옷/초록 멜빵바지,0,1150,green overalls
자세/당근 들기,0,1149,holding carrot
소품/별 풍선,0,1147,star balloon
양말/짝짝이 니삭,0,1143,mismatched thighhighs
옷/보라 민소매,0,1143,purple tank top
옷/검은 하오리,0,1142,black haori
소품/벗은 니삭,0,1142,unworn thighhighs
옷/노란 갑옷,0,1141,yellow armor
옷/체크무늬 반바지,0,1140,plaid shorts
눈/회색 흰자,0,1134,grey sclera
옷/검은 유니타드,0,1133,black unitard
옷/갈색 세일러복,0,1132,brown serafuku
속옷/체크무늬 브라,0,1129,plaid bra
모자/회색 헬멧,0,1128,grey helmet
자세/병(항아리) 들기,0,1127,holding jar
옷/검은 나이트가운,0,1126,black nightgown
자세/깃털 들기,0,1125,holding feather
머리/새 머리장식,0,1118,bird hair ornament
옷/가시 달린 벨트,0,1118,spiked belt
몸/그라데이션 꼬리,0,1115,gradient tail
속옷/세로줄 팬티,0,1111,vertical-striped panties
머리/호박 머리장식,0,1107,pumpkin hair ornament
동물/흰 개,0,1107,white dog
속옷/노란 스포츠 브라,0,1105,yellow sports bra
머리/여우 머리장식,0,1095,fox hair ornament
옷/핀스트라이프 치마,0,1094,pinstripe skirt
옷/검은 오버스커트,0,1091,black overskirt
옷/리본 단 셔츠,0,1091,ribbon-trimmed shirt
옷/물방울무늬 보타이,0,1087,polka dot bowtie
속옷/주황 브라,0,1086,orange bra
옷/초록 후드,0,1085,green hood
몸/십자가 문신,0,1083,cross tattoo
모자/줄무늬 모자,0,1083,striped hat
옷/무늬 앞치마,0,1081,print apron
옷/파란 벙어리장갑,0,1079,blue mittens
눈/보라 흰자,0,1079,purple sclera
몸/구름 문신,0,1077,cloud tattoo
옷/회색 로브,0,1077,grey robe
옷/그라데이션 치마,0,1075,gradient skirt
옷/멀티컬러 리본,0,1074,multicolored ribbon
옷/겹친 장갑,0,1072,layered gloves
몸/양 꼬리,0,1072,sheep tail
양말/망사 보디스타킹,0,1071,fishnet bodystocking
소품/핀,0,1070,pin
소품/벗은 안대,0,1069,unworn eyepatch
옷/아쿠아 목도리,0,1064,aqua scarf
소품/주황 반다나,0,1063,orange bandana
소품/태양 귀걸이,0,1062,sun earrings
소품/날개 달린 가방,0,1059,winged bag
머리/보라 머리띠,0,1055,purple headband
옷/리본 단 케이프,0,1055,ribbon-trimmed capelet
옷/세로줄 조끼,0,1055,vertical-striped vest
옷/무장한 치마,0,1051,armored skirt
머리/검은 머리 장식,0,1050,black headdress
자세/쿠키 들기,0,1050,holding cookie
얼굴/회색 아이섀도,0,1049,grey eyeshadow
옷/체크무늬 소매,0,1048,plaid sleeves
소품/노란 마스크,0,1048,yellow mask
소품/노란 반다나,0,1047,yellow bandana
옷/프릴 숄,0,1046,frilled shawl
옷/가시 달린 갑옷,0,1046,spiked armor
머리/구름 머리장식,0,1042,cloud hair ornament
옷/주황 띠,0,1039,orange sash
소품/큰 주사기,0,1038,large syringe
몸/가짜 발톱,0,1037,fake claws
옷/그라데이션 기모노,0,1036,gradient kimono
몸/뱀 문신,0,1036,snake tattoo
옷/비대칭 바지,0,1035,asymmetrical pants
음식/주황 주스,0,1035,orange juice
옷/칼라 있는 레오타드,0,1034,collared leotard
모자/프릴 보닛,0,1030,frilled bonnet
모자/찢어진 모자,0,1028,torn hat
옷/꽃무늬 무늬 셔츠,0,1026,floral print shirt
머리/머리장식 없음,0,1023,no hair ornament
옷/흰 하오리,0,1022,white haori
옷/흰 슬링샷 수영복,0,1022,white slingshot swimsuit
옷/무늬 목도리,0,1021,print scarf
소품/투톤 마스크,0,1019,two-tone mask
옷/레이스 달린 칼라,0,1016,lace-trimmed collar
옷/핀스트라이프 조끼,0,1016,pinstripe vest
옷/분홍 부루마,0,1015,pink buruma
옷/무늬 사롱,0,1015,print sarong
속옷/하트 무늬 팬티,0,1014,heart print panties
소품/하트 헤일로,0,1013,heart halo
눈/주황 흰자,0,1012,orange sclera
옷/팽팽한 수영복,0,1010,taut swimsuit
얼굴/초록 혀,0,1009,green tongue
옷/비치는 원피스 수영복,0,1009,see-through one-piece swimsuit
옷/회색 원피스 수영복,0,1008,grey one-piece swimsuit
소품/벗은 바지,0,1008,unworn pants
옷/초록 세일러복,0,1007,green serafuku
옷/아쿠아 세일러 칼라,0,1003,aqua sailor collar
옷/젖은 치마,0,1001,wet skirt
옷/카모 셔츠,0,999,camouflage shirt
몸/용 문신,0,999,dragon tattoo
소품/벗은 고글,0,999,unworn goggles
동물/봉제 새,0,998,stuffed bird
배경/유리 문,0,997,glass door
음식/벚 토마토,0,996,cherry tomato
몸/그라데이션 손톱,0,994,gradient nails
옷/노란 잠옷,0,994,yellow pajamas
옷/갈색 보디수트,0,993,brown bodysuit
옷/파란 반도 브라,0,989,blue bandeau
소품/색 있는 눈가리개,0,987,colored blindfold
몸/거대한 뿔,0,987,huge horns
속옷/투톤 팬티,0,987,two-tone panties
양말/비치는 니삭,0,986,see-through thighhighs
소품/은색 팔찌,0,983,silver bracelet
옷/검은 뷔스티에,0,982,black bustier
옷/보라 후드,0,982,purple hood
옷/갈색 숄,0,980,brown shawl
양말/레이스 니삭,0,979,lace thighhighs
소품/분홍 깃털,0,978,pink feathers
소품/파란 마스크,0,973,blue mask
머리/주황 브릿지,0,972,orange streaks
옷/분홍 베이비돌,0,971,pink babydoll
소품/노란 튤립,0,969,yellow tulip
옷/비치는 비키니,0,968,see-through bikini
옷/검은 사롱,0,967,black sarong
소품/이중 헤일로,0,963,double halo
모자/해골 모자 장식,0,963,skull hat ornament
옷/무늬 수영복,0,960,print swimsuit
소품/노란 우산,0,960,yellow umbrella
눈/아쿠아 눈동자,0,959,aqua pupils
몸/아주 긴 귀,0,958,very long ears
소품/노란 머릿수건,0,958,yellow headscarf
양말/무늬 양말,0,956,print socks
몸/짝짝이 날개,0,954,mismatched wings
옷/후드 달린 셔츠,0,953,hooded shirt
옷/그라데이션 재킷,0,952,gradient jacket
옷/보라 캐미솔,0,949,purple camisole
옷/초록 캐미솔,0,948,green camisole
신발/가시 달린 부츠,0,948,spiked boots
옷/체크 리본,0,947,checkered ribbon
옷/교차 끈 코르셋,0,946,cross-laced corset
옷/금속 손목 커프스,0,946,metal wrist cuffs
옷/보라 코르셋,0,945,purple corset
모자/미니 마녀 모자,0,940,mini witch hat
옷/태양 무늬,0,939,sun print
옷/파란 한푸,0,937,blue hanfu
소품/꽃 바구니,0,937,flower basket
옷/비치는 숄,0,936,see-through shawl
머리/가시 달린 머리띠,0,936,spiked headband
옷/줄무늬 목스카프,0,936,striped neckerchief
머리/짧은 땋은 머리,0,935,short braid
옷/갈색 멜빵바지,0,934,brown overalls
몸/그려진 날개,0,934,drawn wings
동물/봉제 양,0,933,stuffed sheep
모자/하트 모자 장식,0,930,heart hat ornament
소품/벗은 목걸이,0,930,unworn necklace
옷/무늬 잠옷,0,929,print pajamas
옷/주름 소매,0,928,pleated sleeves
머리/곱슬 옆머리,0,927,curly sidelocks
몸/주황 날개,0,927,orange wings
옷/패딩 재킷,0,926,padded jacket
속옷/곰 무늬 팬티,0,924,bear print panties
배경/유리 테이블,0,923,glass table
눈/광택 있는 눈,0,922,shiny eyes
소품/하트 장식,0,920,heart ornament
소품/주황 고글,0,913,orange goggles
자세/별 들기,0,912,holding star
옷/징 박힌 장갑,0,911,studded gloves
소품/검은 왕관,0,908,black crown
옷/분리된 바지,0,906,detached pants
옷/검은 숄,0,902,black shawl
옷/초록 한푸,0,902,green hanfu
옷/별 무늬 비키니,0,896,star print bikini
머리/사과 머리장식,0,893,apple hair ornament
옷/프릴 조끼,0,892,frilled vest
옷/멀티컬러 바지,0,892,multicolored pants
소품/나무 상자,0,892,wooden box
옷/아쿠아 코트,0,891,aqua coat
옷/패딩 코트,0,890,padded coat
모자/가시 달린 헬멧,0,889,spiked helmet
옷/프릴 베이비돌,0,887,frilled babydoll
옷/분홍 사롱,0,885,pink sarong
자세/새 들기,0,882,holding bird
소품/빨간 튤립,0,882,red tulip
소품/벗은 슬리퍼,0,881,unworn slippers
소품/분홍 왕관,0,875,pink crown
양말/멀티컬러 팬티스타킹,0,873,multicolored pantyhose
옷/오프숄더 코트,0,873,off-shoulder coat
소품/보라 깃털,0,873,purple feathers
옷/등 파인 셔츠,0,872,backless shirt
소품/흰 튤립,0,872,white tulip
머리/부서진 하트 머리장식,0,871,broken heart hair ornament
머리/아쿠아 곱창 머리끈,0,870,aqua scrunchie
소품/은색 목걸이,0,869,silver necklace
머리/개 머리장식,0,865,dog hair ornament
몸/짝짝이 뿔,0,864,mismatched horns
소품/은색 귀걸이,0,864,silver earrings
옷/무늬 리본,0,863,print ribbon
옷/노란 점프수트,0,862,yellow jumpsuit
옷/빨간 베일,0,860,red veil
옷/체크 하오리,0,859,checkered haori
옷/회색 하카마,0,859,grey hakama
옷/그라데이션 리본,0,857,gradient ribbon
머리/물결 옆머리,0,856,wavy sidelocks
옷/회색 멜빵바지,0,855,grey overalls
소품/빨간 자동차,0,855,red car
옷/투톤 조끼,0,854,two-tone vest
몸/검은 발톱,0,848,black claws
소품/금색 발찌,0,847,gold anklet
얼굴/긴 눈썹,0,847,long eyebrows
소품/벗은 보타이,0,846,unworn bowtie
옷/옆매듭 수영복,0,844,side-tie swimsuit
몸/투톤 손톱,0,844,two-tone nails
머리/날개 달린 머리장식,0,843,winged hair ornament
소품/박쥐 장식,0,842,bat ornament
옷/줄무늬 벨트,0,842,striped belt
옷/멀티컬러 갑옷,0,840,multicolored armor
옷/분홍 세일러복,0,840,pink serafuku
신발/금색 부츠,0,835,gold boots
동물/검은 나비,0,833,black butterfly
모자/니트 모자,0,830,knit hat
동물/봉제 개구리,0,830,stuffed frog
옷/빨간 점프수트,0,829,red jumpsuit
옷/보라 사롱,0,826,purple sarong
눈/불타는 눈,0,825,flaming eyes
모자/분홍 헬멧,0,823,pink helmet
옷/깃털 드레스,0,822,feather dress
몸/아쿠아 날개,0,819,aqua wings
옷/노란 슬링샷 수영복,0,817,yellow slingshot swimsuit
눈/회색 눈동자,0,815,grey pupils
배경/빨간 태양,0,815,red sun
옷/노란 멜빵바지,0,812,yellow overalls
옷/긴 후드티,0,810,long hoodie
모자/빨간 보닛,0,810,red bonnet
소품/하트 안대,0,807,heart eyepatch
양말/물방울무늬 니삭,0,807,polka dot thighhighs
소품/금 간 마스크,0,806,cracked mask
소품/벗은 머리띠,0,805,unworn hairband
옷/아쿠아 스웨터,0,803,aqua sweater
옷/비대칭 드레스,0,802,asymmetrical dress
양말/체크 레그웨어,0,799,checkered legwear
몸/아쿠아 뿔,0,798,aqua horns
옷/그라데이션 소매,0,798,gradient sleeves
옷/검은 튜닉,0,797,black tunic
옷/체크무늬 숄,0,797,plaid shawl
신발/금색 샌들,0,795,gold sandals
옷/프릴 띠,0,794,frilled sash
옷/레이스 칼라,0,792,lace collar
옷/무늬 보디수트,0,790,print bodysuit
모자/무늬 모자,0,790,print hat
소품/팬지,0,789,pansy
옷/체크무늬 앞치마,0,789,plaid apron
소품/무늬 안대,0,788,print eyepatch
옷/아가일 드레스,0,787,argyle dress
얼굴/아쿠아 입술,0,786,aqua lips
신발/라텍스 부츠,0,786,latex boots
옷/금속 장갑,0,786,metal gloves
옷/열린 점프수트,0,785,open jumpsuit
양말/투톤 팬티스타킹,0,784,two-tone pantyhose
옷/비치는 보디수트,0,783,see-through bodysuit
소품/아쿠아 초커,0,781,aqua choker
소품/가시 달린 발찌,0,780,spiked anklet
배경/꽃 침대,0,779,flower bed
자세/토끼 들기,0,779,holding rabbit
옷/주황 카디건,0,779,orange cardigan
소품/보라 꽃잎,0,779,purple petals
옷/세로줄 코트,0,779,vertical-striped coat
옷/옆매듭 치마,0,777,side-tie skirt
속옷/초록 스포츠 브라,0,776,green sports bra
옷/찢어진 비키니,0,776,torn bikini
양말/레이스 팬티스타킹,0,775,lace pantyhose
신발/무늬 부츠,0,775,print boots
옷/노란 칼라,0,775,yellow collar
옷/주름 셔츠,0,774,pleated shirt
머리/물방울무늬 머리띠,0,774,polka dot hairband
옷/찢어진 기모노,0,772,torn kimono
양말/검은 보디스타킹,0,770,black bodystocking
양말/리본 단 양말,0,769,ribbon-trimmed socks
옷/찢어진 스웨터,0,768,torn sweater
배경/젖은 바닥,0,768,wet floor
소품/색 있는 안대,0,767,colored eyepatch
옷/노란 후드,0,767,yellow hood
옷/풀린 목스카프,0,765,undone neckerchief
옷/무지개 비키니,0,762,rainbow bikini
옷/보라 손목 커프스,0,761,purple wrist cuffs
신발/아쿠아 부츠,0,760,aqua boots
옷/갈색 민소매,0,759,brown tank top
머리/레몬 머리장식,0,759,lemon hair ornament
소품/털 달린 초커,0,757,fur-trimmed choker
얼굴/주황 아이섀도,0,757,orange eyeshadow
머리/무늬 머리띠,0,754,print hairband
동물/흰 말,0,753,white horse
옷/옆매듭 드레스,0,752,side-tie dress
머리/은색 머리띠,0,751,silver hairband
얼굴/노란 입술,0,751,yellow lips
옷/보라 튜닉,0,747,purple tunic
소품/벗은 왕관,0,747,unworn crown
얼굴/회색 입술,0,745,grey lips
옷/열린 잠옷,0,743,open pajamas
옷/물방울무늬 캐미솔,0,743,polka dot camisole
옷/골지 카디건,0,741,ribbed cardigan
옷/비대칭 갑옷,0,740,asymmetrical armor
옷/갈색 하카마,0,739,brown hakama
자세/뼈 들기,0,737,holding bone
옷/멀티컬러 반바지,0,734,multicolored shorts
속옷/비치는 브라,0,731,see-through bra
옷/옆매듭 셔츠,0,731,side-tie shirt
양말/체크무늬 양말,0,730,plaid socks
옷/크리스마스 스웨터,0,729,christmas sweater
옷/분홍 로브,0,729,pink robe
신발/털 달린 신발,0,728,fur-trimmed shoes
소품/금색 장신구,0,728,gold jewelry
소품/하트 모양 가방,0,727,heart-shaped bag
옷/줄무늬 민소매,0,726,striped tank top
소품/파란 머릿수건,0,725,blue headscarf
소품/음표 귀걸이,0,725,musical note earrings
양말/아가일 양말,0,724,argyle socks
얼굴/긴 콧수염,0,724,long mustache
옷/비치는 장갑,0,724,see-through gloves
속옷/세로줄 브라,0,724,vertical-striped bra
소품/빛나는 꽃잎,0,722,glowing petals
옷/해골 벨트,0,722,skull belt
옷/아쿠아 망토,0,720,aqua cape
옷/투톤 케이프,0,720,two-tone capelet
동물/봉제 고래,0,717,stuffed whale
얼굴/주황 입술,0,716,orange lips
소품/빨간 머릿수건,0,716,red headscarf
옷/팽팽한 보디수트,0,715,taut bodysuit
소품/빛나는 헤일로,0,714,glowing halo
신발/빨간 슬리퍼,0,714,red slippers
동물/노란 새,0,714,yellow bird
모자/노란 헬멧,0,714,yellow helmet
소품/꽃 안대,0,712,flower eyepatch
옷/군용 코트,0,708,military coat
옷/빨간 튜닉,0,708,red tunic
동물/초록 나비,0,707,green butterfly
속옷/보라 스포츠 브라,0,702,purple sports bra
배경/벚 나무,0,700,cherry tree
옷/데님 멜빵바지,0,699,denim overalls
몸/그려진 꼬리,0,699,drawn tail
소품/흰 자동차,0,699,white car
머리/비치는 머리,0,698,see-through hair
소품/은색 암릿,0,697,silver armlet
소품/벚 귀걸이,0,696,cherry earrings
배경/나무 문,0,696,wooden door
옷/무늬 레오타드,0,695,print leotard
자세/왕관 들기,0,694,holding crown
소품/열린 상자,0,694,open box
옷/빨간 사롱,0,694,red sarong
옷/아쿠아 벨트,0,693,aqua belt
소품/그려진 하트,0,692,drawn heart
몸/늑대 발바닥,0,692,wolf paws
옷/카모 비키니,0,690,camouflage bikini
옷/빨간 슬링샷 수영복,0,690,red slingshot swimsuit
자세/반지 들기,0,689,holding ring
신발/날개 달린 부츠,0,688,winged boots
신발/회색 샌들,0,685,grey sandals
옷/주황 타바드,0,685,orange tabard
배경/부서진 벽,0,684,broken wall
신발/보라 샌들,0,684,purple sandals
동물/기린,0,680,giraffe
배경/멀티컬러 하늘,0,680,multicolored sky
옷/비치는 베이비돌,0,677,see-through babydoll
옷/흰 멜빵바지,0,677,white overalls
모자/갈색 헬멧,0,676,brown helmet
옷/오프숄더 레오타드,0,676,off-shoulder leotard
옷/금색 장갑,0,675,gold gloves
소품/초록 우산,0,675,green umbrella
자세/샌들 들기,0,675,holding sandals
옷/주황 케이프,0,674,orange capelet
옷/회색 칼라,0,673,grey collar
양말/아쿠아 팬티스타킹,0,672,aqua pantyhose
옷/체크무늬 코트,0,672,plaid coat
자세/코트 들기,0,669,holding coat
옷/라텍스 바지,0,668,latex pants
소품/회색 장미,0,667,grey rose
양말/아쿠아 양말,0,666,aqua socks
소품/주황 가방,0,664,orange bag
옷/분홍 갑옷,0,663,pink armor
옷/프릴 코트,0,660,frilled coat
옷/보라 잠옷,0,660,purple pajamas
옷/체크무늬 케이프,0,659,plaid capelet
옷/찢어진 소매,0,659,torn sleeve
소품/오버사이즈 꽃,0,658,oversized flower
옷/분홍 후드,0,656,pink hood
옷/후드 달린 레오타드,0,655,hooded leotard
소품/비치는 마스크,0,655,see-through mask
옷/민소매 볼레로,0,655,sleeveless shrug
옷/털 달린 조끼,0,652,fur-trimmed vest
옷/코트 없음,0,651,no coat
소품/회색 깃털,0,647,grey feathers
신발/검은 슬리퍼,0,646,black slippers
소품/불타는 해골,0,646,flaming skull
옷/그라데이션 넥타이,0,646,gradient necktie
몸/금속 날개,0,646,metal wings
옷/빨간 멜빵바지,0,646,red overalls
눈/무지개 눈,0,639,rainbow eyes
옷/줄무늬 레오타드,0,639,striped leotard
소품/매달린 등불,0,637,hanging lantern
얼굴/노란 혀,0,637,yellow tongue
옷/파란 베이비돌,0,634,blue babydoll
양말/비치는 팬티스타킹,0,633,see-through pantyhose
소품/줄무늬 초커,0,633,striped choker
양말/찢어진 레깅스,0,633,torn leggings
동물/봉제 물고기,0,631,stuffed fish
얼굴/가짜 수염,0,629,fake beard
자세/버섯 들기,0,629,holding mushroom
옷/아쿠아 후드티,0,627,aqua hoodie
옷/금색 레오타드,0,627,gold leotard
머리/수정 머리장식,0,626,crystal hair ornament
몸/금색 뿔,0,626,gold horns
옷/분홍 멜빵바지,0,626,pink overalls
속옷/리본 단 브라,0,626,ribbon-trimmed bra
옷/나비 무늬 기모노,0,625,butterfly print kimono
옷/레이스 달린 앞치마,0,625,lace-trimmed apron
옷/망토 없음,0,625,no cape
옷/금색 드레스,0,623,gold dress
소품/토끼 장식,0,623,rabbit ornament
동물/빨간 판다,0,622,red panda
몸/점박이 털,0,622,spotted fur
소품/십자가 펜던트,0,619,cross pendant
옷/분홍 벙어리장갑,0,619,pink mittens
몸/금색 손톱,0,617,gold nails
소품/분홍 완장,0,616,pink armband
옷/리본 단 리본,0,615,ribbon-trimmed bow
동물/주황 나비,0,613,orange butterfly
옷/세로줄 넥타이,0,613,vertical-striped necktie
양말/물방울무늬 양말,0,612,polka dot socks
머리/리본 단 머리띠,0,612,ribbon-trimmed hairband
소품/파란 자동차,0,610,blue car
소품/나비 목걸이,0,610,butterfly necklace
소품/해골 브로치,0,610,skull brooch
신발/바니 슬리퍼,0,609,bunny slippers
옷/라텍스 볼레로,0,608,latex shrug
소품/열린 가방,0,608,open bag
옷/등 파인 보디수트,0,607,backless bodysuit
소품/흰 보석,0,607,white gem
옷/초록 부루마,0,605,green buruma
옷/갈색 후드,0,604,brown hood
소품/빛나는 보석,0,604,glowing gem
옷/레이스 달린 리본,0,604,lace-trimmed bow
옷/빨간 세일러복,0,603,red serafuku
옷/줄무늬 캐미솔,0,603,striped camisole
옷/세로줄 잠옷,0,603,vertical-striped pajamas
양말/물방울무늬 팬티스타킹,0,599,polka dot pantyhose
양말/줄무늬 레깅스,0,599,striped leggings
얼굴/노란 아이섀도,0,598,yellow eyeshadow
머리/기계 머리,0,597,mechanical hair
소품/검은 머릿수건,0,596,black headscarf
옷/꽃 단 드레스,0,596,flower-trimmed dress
옷/분홍 숄,0,596,pink shawl
옷/칼라 있는 보디수트,0,595,collared bodysuit
소품/수정 검,0,595,crystal sword
옷/노란 숄,0,595,yellow shawl
옷/프릴 가터,0,594,frilled garter
옷/회색 후드,0,594,grey hood
동물/로봇 용,0,594,robot dragon
소품/별 모양 베개,0,594,star-shaped pillow
옷/무늬 띠,0,593,print sash
신발/스포츠 샌들,0,593,sports sandals
옷/회색 띠,0,592,grey sash
동물/봉제 문어,0,592,stuffed octopus
동물/봉제 사자,0,591,stuffed lion
옷/아쿠아 원피스 수영복,0,589,aqua one-piece swimsuit
옷/카모 반바지,0,589,camouflage shorts
옷/검은 잠옷,0,588,black pajamas
소품/파란 왕관,0,587,blue crown
몸/호랑이 발바닥,0,587,tiger paws
소품/나무 등불,0,587,wooden lantern
양말/젖은 팬티스타킹,0,586,wet pantyhose
옷/헐렁한 비키니,0,585,loose bikini
소품/무늬 반다나,0,584,print bandana
소품/벗은 팬티스타킹,0,584,unworn pantyhose
옷/카모 치마,0,583,camouflage skirt
옷/비치는 우비,0,583,see-through raincoat
양말/투톤 양말,0,583,two-tone socks
옷/풀린 보타이,0,582,undone bowtie
소품/색 있는 연필,0,581,colored pencil
옷/체크무늬 세일러 칼라,0,580,plaid sailor collar
양말/파란 레깅스,0,579,blue leggings
자세/닻 들기,0,579,holding anchor
몸/돼지 꼬리,0,578,pig tail
얼굴/광택 있는 입술,0,578,shiny lips
소품/물 풍선,0,578,water balloon
모자/보라 헬멧,0,577,purple helmet
옷/레이스 달린 비키니,0,576,lace-trimmed bikini
양말/금색 니삭,0,575,gold thighhighs
옷/큰 리본,0,575,large ribbon
옷/분홍 코르셋,0,575,pink corset
옷/가죽 치마,0,574,leather skirt
옷/멀티컬러 소매,0,574,multicolored sleeves
소품/주황 완장,0,574,orange armband
신발/파란 슬리퍼,0,573,blue slippers
소품/수정 목걸이,0,573,crystal necklace
자세/샌드위치 들기,0,573,holding sandwich
옷/깃털 단 드레스,0,572,feather-trimmed dress
옷/중국 갑옷,0,570,chinese armor
옷/초록 코르셋,0,569,green corset
소품/줄무늬 베개,0,569,striped pillow
배경/나무 천장,0,569,wooden ceiling
소품/깃털 목걸이,0,568,feather necklace
옷/털 달린 로브,0,568,fur-trimmed robe
머리/갈색 머리띠,0,567,brown headband
옷/무늬 망토,0,567,print cape
옷/리본 단 장갑,0,567,ribbon-trimmed gloves
소품/검은 보석,0,566,black gem
자세/우리 들기,0,566,holding cage
모자/나비 모자 장식,0,565,butterfly hat ornament
옷/히잡,0,564,hijab
옷/보라 숄,0,563,purple shawl
옷/세로줄 장갑,0,563,vertical-striped gloves
음식/검은 차,0,557,black tea
모자/체크 모자,0,557,checkered hat
양말/짝짝이 양말,0,556,mismatched socks
옷/교차 끈 반바지,0,553,cross-laced shorts
옷/초록 사롱,0,553,green sarong
옷/세로줄 목도리,0,553,vertical-striped scarf
옷/분홍 나이트가운,0,551,pink nightgown
옷/파란 오버스커트,0,549,blue overskirt
옷/깅엄 체크 앞치마,0,548,gingham apron
옷/주황 원피스 수영복,0,548,orange one-piece swimsuit
몸/개 발바닥,0,547,dog paws
속옷/주황 스포츠 브라,0,547,orange sports bra
몸/분홍 문신,0,547,pink tattoo
옷/그라데이션 장갑,0,544,gradient gloves
신발/초록 샌들,0,542,green sandals
옷/무지개 무늬,0,542,rainbow print
옷/갈색 튜닉,0,541,brown tunic
모자/여우 모자,0,539,fox hat
속옷/리본 단 팬티,0,539,ribbon-trimmed panties
머리/고르지 않은 앞머리,0,539,uneven bangs
옷/노란 로브,0,539,yellow robe
옷/금속 벨트,0,537,metal belt
양말/겹친 레그웨어,0,536,layered legwear
양말/투톤 레깅스,0,534,two-tone leggings
양말/무장한 레그웨어,0,533,armored legwear
옷/후드 달린 잠옷,0,532,hooded pajamas
옷/꽉 끼는 상의,0,531,tight top
속옷/찢어진 브라,0,531,torn bra
소품/번개 귀걸이,0,529,lightning bolt earrings
옷/비치는 캐미솔,0,526,see-through camisole
옷/검은 벙어리장갑,0,524,black mittens
양말/멀티컬러 양말,0,524,multicolored socks
소품/토끼 마스크,0,524,rabbit mask
옷/찢어진 케이프,0,524,torn capelet
소품/장난감 자동차,0,523,toy car
음식/봉제 당근,0,522,stuffed carrot
소품/벗은 벨트,0,522,unworn belt
소품/비대칭 안경,0,521,asymmetrical eyewear
소품/보라 마스크,0,521,purple mask
옷/풀린 비키니,0,521,undone bikini
옷/파란 슬링샷 수영복,0,520,blue slingshot swimsuit
옷/늑대 후드,0,520,wolf hood
몸/곰 발바닥,0,519,bear paws
옷/개 후드,0,519,dog hood
양말/젖은 니삭,0,519,wet thighhighs
얼굴/금색 치아,0,517,gold teeth
배경/노란 달,0,517,yellow moon
자세/부츠 들기,0,516,holding boots
속옷/골지 팬티,0,516,ribbed panties
옷/털 달린 벙어리장갑,0,515,fur-trimmed mittens
옷/꽃무늬 무늬 소매,0,514,floral print sleeves
옷/물방울무늬 넥타이,0,512,polka dot necktie
소품/장난감 총,0,512,toy gun
얼굴/아쿠아 아이섀도,0,509,aqua eyeshadow
옷/흰 슈미즈,0,508,white chemise
신발/갈색 슬리퍼,0,507,brown slippers
옷/칼라 있는 망토(클로크),0,507,collared cloak
소품/주황 깃털,0,507,orange feathers
옷/멀티컬러 케이프,0,506,multicolored capelet
양말/그라데이션 니삭,0,505,gradient thighhighs
자세/고글 들기,0,505,holding goggles
소품/긴 검,0,505,long sword
동물/로봇 개,0,504,robot dog
소품/벗은 기모노,0,504,unworn kimono
옷/라텍스 드레스,0,502,latex dress
소품/해골 초커,0,501,skull choker
속옷/투톤 브라,0,499,two-tone bra
속옷/고양이 무늬 팬티,0,498,cat print panties
소품/아쿠아 장미,0,497,aqua rose
옷/그라데이션 셔츠,0,497,gradient shirt
옷/흰 우비,0,497,white raincoat
옷/아쿠아 카디건,0,496,aqua cardigan
머리/갈색 곱창 머리끈,0,496,brown scrunchie
옷/프릴 코르셋,0,496,frilled corset
옷/무늬 민소매,0,496,print tank top
옷/줄무늬 앞치마,0,496,striped apron
옷/열린 망토(클로크),0,495,open cloak
자세/사탕 지팡이 들기,0,494,holding candy cane
자세/칼라 들기,0,494,holding collar
속옷/멀티컬러 팬티,0,494,multicolored panties
소품/나비 초커,0,493,butterfly choker
속옷/자수 브라,0,493,embroidered bra
신발/프릴 부츠,0,493,frilled boots
동물/봉제 공룡,0,493,stuffed dinosaur
옷/투톤 망토(클로크),0,493,two-tone cloak
옷/체크 비키니,0,490,checkered bikini
소품/분홍 마스크,0,490,pink mask
옷/체크무늬 칼라,0,490,plaid collar
동물/거대한 뱀,0,489,giant snake
옷/물방울무늬 목도리,0,488,polka dot scarf
옷/찢어진 리본,0,488,torn ribbon
옷/갈색 갑옷,0,487,brown armor
속옷/검은 블루머,0,486,black bloomers
눈/아주 큰 눈,0,486,very big eyes
옷/아가일 리본,0,484,argyle bow
옷/은색 비키니,0,484,silver bikini
옷/소 무늬 소매,0,483,cow print sleeves
속옷/별 무늬 팬티,0,483,star print panties
옷/무늬 코트,0,482,print coat
소품/분홍 베개,0,480,pink pillow
소품/금색 장미,0,478,golden rose
모자/곰 모자,0,477,bear hat
옷/검은 롬퍼,0,477,black romper
자세/장갑 들기,0,477,holding gloves
옷/체크 보타이,0,476,checkered bowtie
소품/빨간 광선검,0,474,red lightsaber
옷/비치는 바지,0,474,see-through pants
옷/회색 베일,0,473,grey veil
소품/나무 지팡이,0,473,wooden staff
몸/해골 문신,0,471,skull tattoo
소품/검은 자동차,0,470,black car
옷/꽃무늬 무늬 띠,0,470,floral print sash
옷/금속 비키니,0,470,metal bikini
소품/눈송이 장식,0,469,snowflake ornament
옷/둥근 칼라,0,468,round collar
속옷/꽃무늬 무늬 브라,0,467,floral print bra
머리/점박이 머리,0,467,spotted hair
머리/줄무늬 머리띠,0,467,striped headband
옷/찢어진 조끼,0,467,torn vest
옷/칼라 있는 스웨터,0,465,collared sweater
옷/아쿠아 애스콧 타이,0,464,aqua ascot
소품/회색 마스크,0,464,grey mask
머리/줄무늬 곱창 머리끈,0,463,striped scrunchie
옷/오버사이즈 재킷,0,462,oversized jacket
소품/깃털 부채,0,461,feather fan
옷/보라 슬링샷 수영복,0,461,purple slingshot swimsuit
옷/털 달린 갑옷,0,460,fur-trimmed armor
소품/줄무늬 완장,0,460,striped armband
옷/롤리타 무늬,0,459,lolita print
소품/투명 가방,0,459,transparent bag
속옷/검은 티팬티,0,458,black thong
옷/빨간 잠옷,0,457,red pajamas
머리/머리 리본 없음,0,456,no hair bow
동물/보라 고양이,0,456,purple cat
옷/세로줄 스웨터,0,453,vertical-striped sweater
동물/흰 늑대,0,453,white wolf
소품/눈송이 귀걸이,0,452,snowflake earrings
소품/곰 가방,0,450,bear bag
소품/투톤 초커,0,450,two-tone choker
옷/분홍 망토(클로크),0,449,pink cloak
옷/프릴 나이트가운,0,448,frilled nightgown
모자/금색 헬멧,0,447,gold helmet
머리/회색 브릿지,0,445,grey streaks
옷/주황 칼라,0,445,orange collar
옷/물방울무늬 목스카프,0,445,polka dot neckerchief
옷/갈색 캐미솔,0,444,brown camisole
신발/초록 슬리퍼,0,444,green slippers
성인/기계 촉수,0,444,mechanical tentacles
소품/물방울무늬 베개,0,444,polka dot pillow
소품/토끼 귀걸이,0,444,rabbit earrings
소품/빨간 고글,0,443,red goggles
옷/소 후드,0,440,cow hood
옷/줄무늬 보디수트,0,440,striped bodysuit
양말/분홍 레깅스,0,439,pink leggings
배경/검은 태양,0,437,black sun
동물/봉제 돌고래,0,437,stuffed dolphin
몸/줄무늬 피부,0,436,striped skin
모자/개구리 모자,0,435,frog hat
옷/깃털 단 재킷,0,434,feather-trimmed jacket
옷/초록 숄,0,434,green shawl
옷/비대칭 재킷,0,433,asymmetrical jacket
소품/갈색 장미,0,433,brown rose
옷/체크 재킷,0,433,checkered jacket
머리/주황 머리장식,0,432,orange hair ornament
소품/별 펜던트,0,432,star pendant
몸/금색 피부,0,431,gold skin
소품/벗은 갑옷,0,431,unworn armor
옷/털 달린 바지,0,430,fur-trimmed pants
옷/분리된 소매 없음,0,430,no detached sleeves
옷/보라 부루마,0,430,purple buruma
옷/줄무늬 반도 브라,0,430,striped bandeau
옷/교차 끈 원피스 수영복,0,429,cross-laced one-piece swimsuit
신발/기계 부츠,0,429,mechanical boots
배경/갈색 하늘,0,425,brown sky
소품/노란 자동차,0,425,yellow car
소품/은색 반지,0,424,silver ring
동물/노란 고양이,0,424,yellow cat
속옷/꽃무늬 무늬 팬티,0,422,floral print panties
배경/거대한 나무,0,422,giant tree
몸/뿔 없음,0,421,no horns
옷/분홍 한푸,0,420,pink hanfu
신발/가시 달린 신발,0,420,spiked shoes
몸/수정 뿔,0,417,crystal horns
머리/물고기 해골 머리장식,0,417,fish skeleton hair ornament
모자/종이 모자,0,416,paper hat
옷/깃털 코트,0,414,feather coat
옷/하트 앞치마,0,414,heart apron
옷/멀티컬러 목스카프,0,413,multicolored neckerchief
옷/분홍 점프수트,0,412,pink jumpsuit
옷/아쿠아 띠,0,411,aqua sash
모자/미니 산타 모자,0,410,mini santa hat
옷/해골 칼라,0,410,skull collar
옷/사선 줄무늬 셔츠,0,409,diagonal-striped shirt
옷/개 무늬,0,409,dog print
옷/깅엄 체크 치마,0,409,gingham skirt
옷/레이스 달린 리본,0,409,lace-trimmed ribbon
모자/토끼 모자 장식,0,409,rabbit hat ornament
소품/고양이 장식,0,408,cat ornament
소품/별 팔찌,0,408,star bracelet
음식/딸기 우유,0,408,strawberry milk
옷/주황 볼레로,0,407,orange shrug
눈/갈색 눈동자,0,406,brown pupils
자세/주사위 들기,0,406,holding dice
소품/종이 인형,0,406,paper doll
머리/무늬 머리띠,0,406,print headband
모자/파란 보닛,0,405,blue bonnet
옷/망사 레오타드,0,405,fishnet leotard
머리/머리띠 없음,0,405,no hairband
머리/무늬 곱창 머리끈,0,405,print scrunchie
옷/깅엄 체크 드레스,0,404,gingham dress
옷/레이스 달린 베일,0,403,lace-trimmed veil
머리/숫자 머리장식,0,403,number hair ornament
소품/은색 티아라,0,403,silver tiara
옷/노란 사롱,0,403,yellow sarong
옷/회색 점프수트,0,402,grey jumpsuit
옷/흰 샅바,0,398,white loincloth
옷/아가일 셔츠,0,397,argyle shirt
얼굴/색 있는 눈썹,0,397,colored eyebrows
옷/보라 볼레로,0,397,purple shrug
얼굴/투톤 수염,0,397,two-tone beard
소품/부서진 접시,0,396,broken plate
몸/검은 귀,0,395,black ears
옷/오프숄더 카디건,0,395,off-shoulder cardigan
신발/찢어진 부츠,0,395,torn boots
소품/파란 광선검,0,394,blue lightsaber
옷/금색 리본,0,394,gold ribbon
옷/무늬 조끼,0,394,print vest
자세/머리띠 들기,0,393,holding hairband
속옷/다중 끈 브라,0,393,multi-strapped bra
옷/멀티컬러 스웨터,0,392,multicolored sweater
옷/주황 잠옷,0,391,orange pajamas
옷/분홍 볼레로,0,390,pink shrug
소품/딸기 귀걸이,0,390,strawberry earrings
옷/갑옷 없음,0,389,no armor
모자/보라 보닛,0,389,purple bonnet
옷/보라 멜빵바지,0,389,purple overalls
옷/민소매 점프수트,0,389,sleeveless jumpsuit
옷/사선 줄무늬 리본,0,388,diagonal-striped ribbon
소품/주황 튤립,0,388,orange tulip
동물/분홍 고양이,0,388,pink cat
옷/교차 끈 레오타드,0,387,cross-laced leotard
옷/프릴 잠옷,0,387,frilled pajamas
옷/메이드 레오타드,0,387,maid leotard
소품/은색 왕관,0,387,silver crown
성인/봉제 재갈,0,387,stuffed gag
옷/검은 타바드,0,386,black tabard
소품/불타는 헤일로,0,386,flaming halo
옷/보라 한푸,0,385,purple hanfu
양말/보라 레깅스,0,385,purple leggings
옷/분리된 망토,0,383,detached cape
소품/흰 티아라,0,383,white tiara
모자/소 모자,0,382,cow hat
옷/레이스 달린 케이프,0,382,lace-trimmed capelet
모자/핀스트라이프 모자,0,382,pinstripe hat
소품/금색 헤일로,0,381,gold halo
소품/분홍 반다나,0,381,pink bandana
속옷/새틴 브라,0,381,satin bra
소품/레이스 달린 안대,0,380,lace-trimmed eyepatch
옷/개구리 후드,0,378,frog hood
속옷/분홍 블루머,0,378,pink bloomers
옷/주황 멜빵바지,0,377,orange overalls
옷/보라 베이비돌,0,377,purple babydoll
속옷/토끼 무늬 팬티,0,377,rabbit print panties
소품/벗은 스웨터,0,376,unworn sweater
옷/비치는 코트,0,375,see-through coat
소품/노란 왕관,0,374,yellow crown
옷/초록 하오리,0,373,green haori
얼굴/물결 눈썹,0,373,wavy eyebrows
옷/체크 조끼,0,372,checkered vest
옷/회색 코르셋,0,372,grey corset
옷/멀티컬러 망토(클로크),0,372,multicolored cloak
음식/흰 초콜릿,0,372,white chocolate
옷/주황 갑옷,0,371,orange armor
옷/퐁퐁한 코트,0,371,puffy coat
머리/아쿠아 머리띠,0,369,aqua headband
소품/음표 장식,0,369,musical note ornament
옷/팽팽한 치마,0,369,taut skirt
몸/아쿠아 꼬리,0,368,aqua tail
옷/꽃무늬 드레스,0,368,floral dress
자세/눈사람 들기,0,368,holding snowman
옷/분홍 베일,0,368,pink veil
동물/사과 토끼,0,367,apple rabbit
옷/아쿠아 튜닉,0,367,aqua tunic
소품/초록 마스크,0,366,green mask
옷/레이스 달린 캐미솔,0,364,lace-trimmed camisole
소품/보라 반다나,0,364,purple bandana
옷/리본 단 기모노,0,364,ribbon-trimmed kimono
옷/비대칭 보디수트,0,362,asymmetrical bodysuit
눈/빛나는 눈동자,0,361,glowing pupils
머리/초록 머리장식,0,361,green hair ornament
몸/흉터 없음,0,361,no scar
옷/비치는 망토,0,360,see-through cape
소품/벗은 리본,0,360,unworn bow
옷/흰 한복,0,360,white hanbok
소품/분홍 밧줄,0,359,pink rope
옷/찢어진 민소매,0,359,torn tank top
소품/빛나는 귀걸이,0,357,glowing earrings
옷/아가일 치마,0,356,argyle skirt
몸/물고기 문신,0,356,fish tattoo
옷/리본 단 앞치마,0,356,ribbon-trimmed apron
몸/빛나는 피부,0,355,glowing skin
모자/초록 보닛,0,355,green bonnet
옷/주황 튜닉,0,355,orange tunic
소품/은색 초커,0,355,silver choker
몸/가시 달린 날개,0,355,spiked wings
소품/흰 왕관,0,354,white crown
옷/니트 스웨터,0,353,knit sweater
소품/무늬 베개,0,352,print pillow
소품/십자가 장식,0,351,cross ornament
옷/회색 숄,0,351,grey shawl
옷/퐁퐁한 드레스,0,351,puffy dress
옷/주름 바지,0,350,pleated pants
신발/은색 신발,0,350,silver shoes
신발/노란 슬리퍼,0,350,yellow slippers
소품/하트 화살,0,349,heart arrow
머리/물방울무늬 머리,0,349,polka dot hair
몸/빨간 발톱,0,349,red claws
옷/아쿠아 칼라,0,348,aqua collar
옷/그라데이션 목스카프,0,348,gradient neckerchief
옷/징 박힌 재킷,0,348,studded jacket
얼굴/검은 혀,0,346,black tongue
몸/비치는 뿔,0,346,see-through horns
옷/비대칭 셔츠,0,345,asymmetrical shirt
눈/갈색 흰자,0,345,brown sclera
옷/깃털 칼라,0,345,feather collar
옷/초록 반도 브라,0,345,green bandeau
소품/크리스마스 별,0,344,christmas star
양말/회색 레깅스,0,344,grey leggings
동물/달 토끼,0,344,moon rabbit
옷/초록 타바드,0,342,green tabard
소품/열린 수건,0,342,open towel
속옷/갈색 스포츠 브라,0,341,brown sports bra
머리/개구리 머리띠,0,341,frog headband
양말/빨간 레깅스,0,340,red leggings
옷/줄무늬 띠,0,340,striped sash
모자/새 모자,0,339,bird hat
몸/금색 문신,0,339,gold tattoo
소품/금속 팔찌,0,339,metal bracelet
소품/수정 꽃,0,338,crystal flower
동물/표범,0,337,leopard
동물/빨간 뱀,0,337,red snake
동물/봉제 여우,0,337,stuffed fox
얼굴/흰 수염,0,337,white beard
옷/노란 튜닉,0,337,yellow tunic
소품/천사 조각상,0,336,angel statue
음식/부서진 달걀,0,336,broken egg
옷/그라데이션 비키니,0,336,gradient bikini
얼굴/흰 입술,0,336,white lips
소품/파란 밧줄,0,335,blue rope
옷/레이스 달린 기모노,0,335,lace-trimmed kimono
옷/주황 사롱,0,335,orange sarong
모자/부서진 헬멧,0,334,broken helmet
옷/금색 슬링샷 수영복,0,334,gold slingshot swimsuit
자세/귀 들기,0,334,holding ears
소품/동물 귀걸이,0,333,animal earrings
옷/보라 반도 브라,0,333,purple bandeau
동물/봉제 호랑이,0,333,stuffed tiger
옷/가죽 반바지,0,332,leather shorts
소품/종이 사슬,0,332,paper chain
소품/체크무늬 베개,0,332,plaid pillow
머리/체크무늬 머리띠,0,331,plaid hairband
옷/레이스 드레스,0,330,lace dress
옷/무늬 없음,0,330,no print
옷/무늬 캐미솔,0,329,print camisole
옷/찢어진 목스카프,0,329,torn neckerchief
머리/금색 머리띠,0,328,gold headband
옷/레이스 셔츠,0,328,lace shirt
머리/레이스 머리띠,0,327,lace hairband
몸/태닝 문신,0,327,tan tattoo
모자/카모 모자,0,326,camouflage hat
소품/고양이 귀걸이,0,326,cat earrings
속옷/자수 팬티,0,326,embroidered panties
옷/레이스 달린 베이비돌,0,326,lace-trimmed babydoll
소품/불 꽃,0,325,fire flower
소품/음식 트럭,0,325,food truck
소품/회색 자동차,0,324,grey car
자세/머리장식 들기,0,324,holding hair ornament
옷/찢어진 리본,0,324,torn bow
소품/꽃 반지,0,323,flower ring
동물/봉제 닭,0,323,stuffed chicken
옷/호랑이 후드,0,323,tiger hood
얼굴/주황 혀,0,322,orange tongue
양말/핀스트라이프 니삭,0,322,pinstripe thighhighs
옷/체크무늬 목스카프,0,322,plaid neckerchief
머리/가시 달린 머리장식,0,322,spiked hair ornament
소품/별 핀,0,321,star pin
배경/체크 벽,0,320,checkered wall
속옷/멀티컬러 브라,0,320,multicolored bra
옷/분홍 슬링샷 수영복,0,320,pink slingshot swimsuit
소품/토끼 가방,0,320,rabbit bag
옷/흰 호랑이 무늬,0,320,white tiger print
소품/갈색 반다나,0,319,brown bandana
양말/레이스 달린 양말,0,319,lace-trimmed socks
몸/보라 비늘,0,319,purple scales
옷/빨간 베이비돌,0,319,red babydoll
얼굴/아쿠아 혀,0,318,aqua tongue
양말/갈색 보디스타킹,0,318,brown bodystocking
옷/가죽 조끼,0,318,leather vest
옷/찢어진 넥타이,0,318,torn necktie
소품/벗은 리본,0,318,unworn ribbon
옷/새틴 비키니,0,317,satin bikini
옷/프릴 넥타이,0,316,frilled necktie
옷/그라데이션 바지,0,316,gradient pants
자세/클로버 들기,0,316,holding clover
머리/태양 머리장식,0,316,sun hair ornament
소품/벗은 눈가리개,0,316,unworn blindfold
옷/노란 한푸,0,316,yellow hanfu
옷/초록 베일,0,315,green veil
옷/흰 오버스커트,0,315,white overskirt
옷/노란 하오리,0,315,yellow haori
신발/무장한 신발,0,312,armored shoes
자세/장식 들기,0,312,holding ornament
옷/주황 캐미솔,0,312,orange camisole
소품/부서진 병,0,311,broken bottle
동물/갈색 개,0,311,brown dog
동물/갈색 말,0,311,brown horse
머리/구름 머리,0,311,cloud hair
옷/물방울무늬 반바지,0,310,polka dot shorts
소품/군용 트럭,0,309,military truck
옷/골지 민소매,0,309,ribbed tank top
머리/금속 머리,0,308,metal hair
머리/금색 머리 장식,0,307,gold headdress
옷/주황 후드,0,307,orange hood
옷/아가일 목도리,0,305,argyle scarf
몸/박쥐 문신,0,305,bat tattoo
옷/비대칭 반바지,0,304,asymmetrical shorts
성인/색 있는 항문,0,304,colored anus
소품/빛나는 깃털,0,304,glowing feather
양말/빨간 힙하이,0,302,red hiphighs
소품/한쪽 편지,0,302,single letter
몸/노란 비늘,0,302,yellow scales
소품/무늬 우산,0,301,print umbrella
소품/벗은 조끼,0,301,unworn vest
옷/회색 튜닉,0,300,grey tunic
옷/체크 목스카프,0,299,checkered neckerchief
소품/투명 공,0,299,transparent ball
몸/아쿠아 털,0,298,aqua fur
몸/고양이 발바닥,0,298,cat paw
몸/동물 귀 없음,0,298,no animal ears
동물/봉제 말,0,297,stuffed horse
옷/체크 소매,0,296,checkered sleeves
신발/그라데이션 부츠,0,296,gradient boots
옷/투톤 목스카프,0,296,two-tone neckerchief
옷/아가일 소매,0,295,argyle sleeves
소품/프릴 팔찌,0,295,frilled bracelet
옷/노란 핫피,0,295,yellow happi
옷/비대칭 치마,0,294,asymmetrical skirt
동물/봉제 늑대,0,294,stuffed wolf
동물/봉제 용,0,293,stuffed dragon
옷/흰 네글리제,0,293,white negligee
동물/파란 고양이,0,292,blue cat
옷/파란 나이트가운,0,292,blue nightgown
옷/털 달린 스웨터,0,292,fur-trimmed sweater
머리/회색 머리띠,0,292,grey headband
소품/분홍 머릿수건,0,292,pink headscarf
옷/투톤 민소매,0,292,two-tone tank top
옷/젖은 반바지,0,292,wet shorts
옷/흰 뷔스티에,0,292,white bustier
양말/체크 니삭,0,291,checkered thighhighs
옷/회색 잠옷,0,291,grey pajamas
신발/회색 슬리퍼,0,291,grey slippers
자세/레그웨어 들기,0,291,holding legwear
소품/투명 부채,0,291,transparent fan
옷/프릴 바지,0,290,frilled pants
소품/체크 담요,0,288,checkered blanket
속옷/털 달린 브라,0,288,fur-trimmed bra
배경/파란 달,0,287,blue moon
배경/부서진 달,0,287,broken moon
소품/초커 없음,0,287,no choker
옷/무늬 하카마,0,287,print hakama
양말/그라데이션 팬티스타킹,0,286,gradient pantyhose
옷/팽팽한 스웨터,0,286,taut sweater
소품/줄무늬 수건,0,285,striped towel
옷/노란 손목 커프스,0,285,yellow wrist cuffs
속옷/라텍스 팬티,0,284,latex panties
소품/벗은 칼라,0,284,unworn collar
소품/부서진 컵,0,283,broken cup
옷/말 무늬,0,283,horse print
옷/후드 달린 기모노,0,282,hooded kimono
옷/주황 망토(클로크),0,282,orange cloak
옷/비 판초,0,282,rain poncho
소품/줄무늬 손목밴드,0,282,striped wristband
신발/고양이 슬리퍼,0,281,cat slippers
속옷/금색 팬티,0,281,gold panties
옷/물방울무늬 앞치마,0,281,polka dot apron
옷/옆트임 레오타드,0,281,sideless leotard
음식/사과 주스,0,280,apple juice
옷/주황 로브,0,280,orange robe
옷/그라데이션 망토,0,279,gradient cape
소품/멀티컬러 장미,0,279,multicolored rose
소품/벗은 머리핀,0,279,unworn hairclip
옷/아쿠아 앞치마,0,278,aqua apron
옷/데님 조끼,0,278,denim vest
몸/빛나는 꼬리,0,278,glowing tail
동물/봉제 돼지,0,278,stuffed pig
옷/교차 끈 장갑,0,277,cross-laced gloves
옷/사선 줄무늬 치마,0,277,diagonal-striped skirt
양말/푹신한 레그웨어,0,277,fluffy legwear
머리/빨간 머리 장식,0,277,red headdress
몸/가시 달린 뿔,0,277,spiked horns
옷/줄무늬 손목 커프스,0,277,striped wrist cuffs
얼굴/회색 혀,0,276,grey tongue
모자/십자가 모자 장식,0,275,cross hat ornament
몸/그려진 뿔,0,275,drawn horns
신발/주황 샌들,0,275,orange sandals
소품/나무 방패,0,275,wooden shield
모자/아가일 모자,0,274,argyle hat
옷/회색 볼레로,0,274,grey shrug
소품/큰 귀걸이,0,274,large earrings
옷/인어 드레스,0,274,mermaid dress
모자/주황 헬멧,0,274,orange helmet
옷/아쿠아 케이프,0,273,aqua capelet
옷/무지개 치마,0,273,rainbow skirt
소품/빛나는 마스크,0,272,glowing mask
옷/겨울 장갑,0,272,winter gloves
소품/나무 연필,0,272,wooden pencil
눈/아쿠아 흰자,0,271,aqua sclera
옷/프릴 망토,0,271,frilled cape
옷/라텍스 비키니,0,271,latex bikini
속옷/줄무늬 스포츠 브라,0,271,striped sports bra
소품/태양 목걸이,0,271,sun necklace
눈/비대칭 눈,0,270,asymmetrical eyes
모자/오버사이즈 모자,0,270,oversized hat
옷/줄무늬 망토,0,269,striped cape
옷/깅엄 체크 셔츠,0,268,gingham shirt
옷/비치는 슬링샷 수영복,0,268,see-through slingshot swimsuit
옷/체크 앞치마,0,267,checkered apron
몸/분리된 뿔,0,267,detached horns
옷/그라데이션 리본,0,267,gradient bow
소품/귀걸이 없음,0,267,no earrings
소품/체크무늬 담요,0,267,plaid blanket
옷/은색 벨트,0,267,silver belt
소품/나무 컵,0,267,wooden cup
옷/검은 네글리제,0,266,black negligee
동물/검은 뱀,0,266,black snake
옷/분홍 상의,0,266,pink top
옷/가시 달린 망토,0,266,spiked cape
동물/검은 말,0,265,black horse
옷/노란 세일러복,0,265,yellow serafuku
몸/박쥐 꼬리,0,264,bat tail
몸/파란 문신,0,263,blue tattoo
소품/무늬 마스크,0,263,print mask
신발/무늬 신발,0,263,print shoes
소품/스포츠 선글라스,0,263,sports sunglasses
옷/줄무늬 카디건,0,263,striped cardigan
얼굴/갈색 아이섀도,0,262,brown eyeshadow
신발/보라 슬리퍼,0,262,purple slippers
동물/로봇 새,0,262,robot bird
동물/파란 고래,0,261,blue whale
옷/갈색 원피스 수영복,0,261,brown one-piece swimsuit
옷/금색 보타이,0,261,gold bowtie
몸/수정 꼬리,0,260,crystal tail
머리/무지개 머리장식,0,260,rainbow hair ornament
소품/가시 달린 손목밴드,0,260,spiked wristband
옷/찢어진 로브,0,259,torn robe
옷/노란 벙어리장갑,0,259,yellow mittens
동물/검은 개,0,258,black dog
배경/사과 나무,0,257,apple tree
옷/라텍스 치마,0,257,latex skirt
소품/벗은 카디건,0,257,unworn cardigan
소품/주황 우산,0,256,orange umbrella
옷/갈색 한푸,0,255,brown hanfu
옷/목도리 없음,0,255,no scarf
옷/은색 갑옷,0,255,silver armor
옷/교차 끈 바지,0,254,cross-laced pants
옷/금색 리본,0,254,gold bow
몸/귀 없음,0,254,no ears
옷/비치는 케이프,0,254,see-through capelet
옷/자수 드레스,0,253,embroidered dress
옷/초록 손목 커프스,0,253,green wrist cuffs
옷/회색 한푸,0,253,grey hanfu
배경/분홍 달,0,253,pink moon
옷/꽃 비키니,0,252,flower bikini
음식/거대한 버섯,0,252,giant mushroom
옷/금색 코르셋,0,252,gold corset
옷/부서진 하트 무늬,0,251,broken heart print
양말/갈색 힙하이,0,251,brown hiphighs
소품/나비 마스크,0,251,butterfly mask
옷/보라 하오리,0,251,purple haori
동물/봉제 오리,0,251,stuffed duck
옷/세로줄 원피스 수영복,0,251,vertical-striped one-piece swimsuit
옷/카모 목도리,0,249,camouflage scarf
음식/크리스마스 케이크,0,249,christmas cake
옷/교차 끈 재킷,0,249,cross-laced jacket
자세/알약 들기,0,249,holding pill
몸/잎 날개,0,249,leaf wings
옷/조끼 없음,0,249,no vest
머리/무지개 머리띠,0,249,rainbow hairband
소품/프릴 발찌,0,248,frilled anklet
소품/체크 베개,0,247,checkered pillow
소품/말 마스크,0,247,horse mask
소품/무늬 가방,0,247,print bag
옷/줄무늬 케이프,0,247,striped capelet
옷/세로줄 앞치마,0,247,vertical-striped apron
눈/그려진 눈,0,246,drawn eyes
옷/세로줄 리본,0,245,vertical-striped bow
배경/유리 벽,0,244,glass wall
옷/갈색 점프수트,0,243,brown jumpsuit
옷/여우 후드,0,243,fox hood
옷/프릴 보타이,0,243,frilled bowtie
소품/회색 우산,0,243,grey umbrella
양말/레이스 양말,0,243,lace socks
소품/레몬 귀걸이,0,243,lemon earrings
옷/골지 수영복,0,243,ribbed swimsuit
소품/장난감 검,0,243,toy sword
모자/카모 헬멧,0,242,camouflage helmet
몸/금색 날개,0,242,golden wings
몸/회색 비늘,0,242,grey scales
소품/토끼 초커,0,242,rabbit choker
옷/여우 무늬,0,241,fox print
옷/겹친 반바지,0,241,layered shorts
속옷/금속 브라,0,241,metal bra
성인/항문 없음,0,241,no anus
옷/물방울무늬 기모노,0,241,polka dot kimono
옷/세일러 원피스 수영복,0,240,sailor one-piece swimsuit
동물/봉제 소,0,240,stuffed cow
옷/아쿠아 민소매,0,239,aqua tank top
소품/그려진 왕관,0,238,drawn crown
동물/초록 새,0,238,green bird
음식/하트 모양 쿠키,0,238,heart-shaped cookie
자세/벨트 들기,0,238,holding belt
옷/무늬 케이프,0,238,print capelet
얼굴/한쪽 이빨,0,238,single tooth
옷/금색 망토,0,237,gold cape
옷/아쿠아 사롱,0,236,aqua sarong
옷/이중 비키니,0,235,double bikini
옷/분홍 반도 브라,0,235,pink bandeau
소품/보라 튤립,0,235,purple tulip
소품/빨간 목줄,0,235,red leash
옷/젖은 재킷,0,235,wet jacket
양말/갈색 레깅스,0,233,brown leggings
옷/털 달린 보디수트,0,233,fur-trimmed bodysuit
옷/가죽 비키니,0,233,leather bikini
소품/금속 안대,0,233,metal eyepatch
옷/세로줄 레오타드,0,233,vertical-striped leotard
소품/그라데이션 깃털,0,232,gradient feathers
모자/분홍 보닛,0,232,pink bonnet
옷/리본 단 반바지,0,232,ribbon-trimmed shorts
머리/찢어진 머리 리본,0,232,torn hair ribbon
옷/초록 볼레로,0,231,green shrug
소품/아쿠아 깃털,0,230,aqua feathers
옷/아가일 코트,0,230,argyle coat
모자/물고기 모자,0,230,fish hat
옷/깅엄 체크 리본,0,230,gingham bow
옷/금색 원피스 수영복,0,230,gold one-piece swimsuit
양말/광택 있는 팬티스타킹,0,230,shiny pantyhose
옷/리본 단 후드,0,229,ribbon-trimmed hood
머리/날개 달린 머리띠,0,229,winged hairband
옷/검은 십자가 타이,0,228,black cross tie
옷/파란 네글리제,0,228,blue negligee
옷/보라 벙어리장갑,0,228,purple mittens
옷/줄무늬 칼라,0,228,striped collar
소품/회색 왕관,0,227,grey crown
소품/벗은 후드티,0,227,unworn hoodie
소품/박쥐 귀걸이,0,226,bat earrings
옷/칼라 있는 점프수트,0,226,collared jumpsuit
옷/꽃무늬 무늬 원피스 수영복,0,226,floral print one-piece swimsuit
옷/헐렁한 바지,0,226,loose pants
옷/리본 단 코르셋,0,226,ribbon-trimmed corset
옷/비치는 반바지,0,226,see-through shorts
옷/젖은 비키니,0,226,wet bikini
머리/갈색 브릿지,0,225,brown streaks
옷/빛나는 갑옷,0,225,glowing armor
옷/스트랩리스 보디수트,0,225,strapless bodysuit
옷/빨간 십자가 타이,0,224,red cross tie
옷/스트랩리스 기모노,0,224,strapless kimono
소품/금색 검,0,223,golden sword
옷/핀스트라이프 코트,0,223,pinstripe coat
옷/갈색 잠옷,0,222,brown pajamas
소품/주황 꽃잎,0,222,orange petals
속옷/비치는 스포츠 브라,0,222,see-through sports bra
소품/벗은 앞치마,0,222,unworn apron
옷/노란 볼레로,0,222,yellow shrug
음식/하트 모양 케이크,0,221,heart-shaped cake
옷/큰 벨트,0,221,large belt
옷/비치는 나이트가운,0,221,see-through nightgown
옷/투톤 한푸,0,221,two-tone hanfu
옷/흰 유니타드,0,221,white unitard
옷/깃털 단 장갑,0,220,feather-trimmed gloves
소품/갈색 마스크,0,219,brown mask
자세/베일 들기,0,219,holding veil
소품/얼음 꽃,0,218,ice flower
소품/둥근 가방,0,217,round bag
옷/민소매 튜닉,0,217,sleeveless tunic
옷/찢어진 앞치마,0,217,torn apron
옷/찢어진 후드티,0,217,torn hoodie
옷/아가일 망토,0,216,argyle cape
소품/검은 밧줄,0,216,black rope
자세/장난감 총 들기,0,216,holding toy gun
소품/물방울무늬 우산,0,216,polka dot umbrella
소품/무늬 수건,0,216,print towel
소품/박쥐 마스크,0,215,bat mask
옷/검은 한복,0,215,black hanbok
옷/기계 장갑,0,214,mechanical gloves
옷/후드 달린 점프수트,0,213,hooded jumpsuit
소품/숫자 풍선,0,213,number balloon
몸/점박이 꼬리,0,213,spotted tail
소품/아쿠아 가방,0,212,aqua bag
옷/새틴 드레스,0,212,satin dress
소품/징 박힌 암릿,0,212,studded armlet
소품/꽃 헤일로,0,211,flower halo
옷/무늬 목스카프,0,211,print neckerchief
옷/체크 바지,0,209,checkered pants
옷/보라 나이트가운,0,209,purple nightgown
성인/파란 항문,0,208,blue anus
몸/은색 손톱,0,208,silver nails
속옷/체크 팬티,0,207,checkered panties
소품/하트 반지,0,207,heart ring
소품/가죽 초커,0,207,leather choker
옷/긴 넥타이,0,207,long necktie
옷/비치는 앞치마,0,207,see-through apron
모자/새 모자 장식,0,206,bird hat ornament
소품/꽃 핀,0,206,flower pin
옷/갈색 샅바,0,205,brown loincloth
옷/깃털 망토,0,205,feather cape
옷/열린 커프스,0,205,open cuffs
소품/비치는 수건,0,205,see-through towel
소품/벗은 사롱,0,205,unworn sarong
옷/갈색 반도 브라,0,204,brown bandeau
소품/금속 마스크,0,204,metal mask
양말/핀스트라이프 팬티스타킹,0,204,pinstripe pantyhose
소품/벗은 목스카프,0,204,unworn neckerchief
옷/칼라 있는 잠옷,0,203,collared pajamas
소품/멀티컬러 우산,0,203,multicolored umbrella
옷/물방울무늬 소매,0,203,polka dot sleeves
옷/프릴 민소매,0,202,frilled tank top
소품/남색 십자가,0,202,navy cross
옷/은색 보디수트,0,202,silver bodysuit
자세/뱀 들기,0,201,holding snake
옷/깃털 소매,0,200,feather sleeves
모자/눈송이 모자 장식,0,200,snowflake hat ornament
옷/그라데이션 목도리,0,199,gradient scarf
몸/얼음 뿔,0,199,ice horns
옷/잎 치마,0,199,leaf skirt
양말/주황 레깅스,0,199,orange leggings
배경/유리 천장,0,198,glass ceiling
몸/찢어진 피부,0,198,torn skin
소품/벗은 망토(클로크),0,198,unworn cloak
자세/재갈 들기,0,197,holding gag
옷/레이스 달린 나이트가운,0,197,lace-trimmed nightgown
옷/골지 장갑,0,197,ribbed gloves
신발/은색 샌들,0,197,silver sandals
옷/투톤 로브,0,197,two-tone robe
옷/아쿠아 보디수트,0,196,aqua bodysuit
모자/고양이 헬멧,0,196,cat helmet
옷/하이웨이스트 드레스,0,196,high-waist dress
옷/주황 부루마,0,196,orange buruma
소품/보라 팬지,0,196,purple pansy
옷/파란 유니타드,0,195,blue unitard
머리/회색 곱창 머리끈,0,195,grey scrunchie
옷/뱀 후드,0,195,snake hood
소품/찢어진 우산,0,195,torn umbrella
소품/장난감 로봇,0,195,toy robot
소품/벗은 머리띠,0,195,unworn headband
옷/프릴 스웨터,0,194,frilled sweater
옷/물방울무늬 바지,0,194,polka dot pants
머리/별 머리띠,0,194,star hairband
옷/아가일 재킷,0,193,argyle jacket
소품/박쥐 브로치,0,193,bat brooch
몸/문신 없음,0,193,no tattoo
옷/핀스트라이프 리본,0,193,pinstripe bow
소품/초록 자동차,0,192,green car
옷/멀티컬러 띠,0,192,multicolored sash
몸/주황 비늘,0,192,orange scales
배경/부서진 문,0,191,broken door
옷/사선 줄무늬 비키니,0,191,diagonal-striped bikini
옷/레이스 달린 반바지,0,191,lace-trimmed shorts
소품/초록 광선검,0,190,green lightsaber
옷/빨간 판초,0,190,red poncho
소품/갈색 머릿수건,0,189,brown headscarf
양말/털 달린 양말,0,189,fur-trimmed socks
소품/회색 완장,0,189,grey armband
소품/눈송이 초커,0,189,snowflake choker
속옷/딸기 브라,0,189,strawberry bra
소품/투톤 우산,0,189,two-tone umbrella
옷/데님 드레스,0,188,denim dress
소품/빛나는 하트,0,188,glowing heart
소품/회색 보석,0,188,grey gem
옷/회색 벙어리장갑,0,188,grey mittens
소품/부서진 우산,0,187,broken umbrella
자세/달 들기,0,187,holding moon
머리/멀티컬러 곱창 머리끈,0,187,multicolored scrunchie
옷/체크무늬 기모노,0,187,plaid kimono
옷/물방울무늬 원피스 수영복,0,187,polka dot one-piece swimsuit
소품/여우 조각상,0,186,fox statue
옷/그라데이션 코트,0,186,gradient coat
옷/초록 슬링샷 수영복,0,186,green slingshot swimsuit
옷/열린 레오타드,0,186,open leotard
몸/무지개 날개,0,186,rainbow wings
옷/리본 단 조끼,0,186,ribbon-trimmed vest
소품/투톤 꽃,0,186,two-tone flower
옷/꽃 드레스,0,185,flower dress
옷/멀티컬러 조끼,0,185,multicolored vest
소품/무늬 부채,0,185,print fan
옷/세로줄 보디수트,0,185,vertical-striped bodysuit
옷/젖은 바지,0,185,wet pants
얼굴/흰 아이섀도,0,185,white eyeshadow
옷/날개 달린 소매,0,185,winged sleeves
옷/검은 슈미즈,0,184,black chemise
얼굴/부서진 이빨,0,184,broken tooth
소품/그라데이션 꽃,0,184,gradient flower
소품/금속 공,0,184,metal ball
소품/은색 사슬,0,184,silver chain
옷/꽃무늬 무늬 재킷,0,183,floral print jacket
소품/멀티컬러 깃털,0,183,multicolored feathers
속옷/세로줄 스포츠 브라,0,183,vertical-striped sports bra
옷/검은 가터,0,181,black garter
자세/안대 들기,0,181,holding eyepatch
옷/라텍스 상의,0,181,latex top
옷/가죽 드레스,0,181,leather dress
옷/빨간 샅바,0,181,red loincloth
옷/패딩 장갑,0,180,padded gloves
자세/숄 들기,0,179,holding shawl
옷/후드 달린 상의,0,179,hooded top
양말/비치는 보디스타킹,0,179,see-through bodystocking
옷/투톤 칼라,0,179,two-tone collar
옷/흰 부루마,0,179,white buruma
속옷/털 달린 팬티,0,178,fur-trimmed panties
옷/초록 벙어리장갑,0,178,green mittens
소품/레이스 달린 눈가리개,0,177,lace-trimmed blindfold
배경/주황 나무,0,177,orange tree
몸/분홍 비늘,0,177,pink scales
옷/아쿠아 잠옷,0,176,aqua pajamas
옷/검은 샅바,0,176,black loincloth
옷/가죽 레오타드,0,176,leather leotard
옷/무장한 코르셋,0,175,armored corset
옷/열린 핫피,0,175,open happi
옷/분홍 네글리제,0,175,pink negligee
옷/핀스트라이프 원피스 수영복,0,175,pinstripe one-piece swimsuit
옷/칼라 있는 로브,0,174,collared robe
옷/옆매듭 반바지,0,174,side-tie shorts
소품/벗은 완장,0,174,unworn armband
소품/갈색 완장,0,173,brown armband
옷/체크 망토,0,173,checkered cape
자세/촉수 들기,0,173,holding tentacle
옷/오버사이즈 스웨터,0,173,oversized sweater
옷/무늬 칼라,0,173,print collar
옷/짧은 카디건,0,172,cropped cardigan
소품/하트 팔찌,0,172,heart bracelet
옷/은색 장갑,0,172,silver gloves
옷/아가일 기모노,0,171,argyle kimono
소품/투톤 가방,0,171,two-tone bag
옷/등 파인 기모노,0,170,backless kimono
옷/카모 민소매,0,170,camouflage tank top
옷/겹친 수영복,0,170,layered swimsuit
소품/호박 마스크,0,170,pumpkin mask
양말/흰 힙하이,0,170,white hiphighs
소품/날개 달린 검,0,170,winged sword
속옷/파란 블루머,0,169,blue bloomers
머리/분홍 머리 장식,0,169,pink headdress
옷/무늬 타바드,0,169,print tabard
옷/아쿠아 하오리,0,168,aqua haori
옷/물방울무늬 재킷,0,168,polka dot jacket
속옷/호랑이 팬티,0,168,tiger panties
소품/큰 십자가,0,167,large cross
속옷/라텍스 브라,0,167,latex bra
소품/잎 부채,0,167,leaf fan
소품/눈송이 목걸이,0,167,snowflake necklace
소품/눈송이 펜던트,0,167,snowflake pendant
소품/찢어진 마스크,0,167,torn mask
모자/개 모자,0,166,dog hat
옷/회색 손목 커프스,0,166,grey wrist cuffs
옷/긴 벨트,0,166,long belt
옷/체크무늬 애스콧 타이,0,166,plaid ascot
옷/골지 캐미솔,0,166,ribbed camisole
옷/꽃 치마,0,165,flower skirt
소품/미니 눈사람,0,165,mini snowman
소품/개 마스크,0,164,dog mask
양말/꽃무늬 무늬 팬티스타킹,0,164,floral print pantyhose
소품/금색 마스크,0,164,gold mask
옷/아쿠아 캐미솔,0,163,aqua camisole
옷/아쿠아 로브,0,163,aqua robe
소품/금 간 휴대폰,0,163,cracked phone
옷/깃털 단 코트,0,163,feather-trimmed coat
양말/체크무늬 팬티스타킹,0,163,plaid pantyhose
모자/늑대 모자,0,163,wolf hat
옷/사탕 무늬,0,162,candy print
소품/뱀 완장,0,162,snake armband
옷/투톤 벨트,0,162,two-tone belt
소품/파란 튤립,0,161,blue tulip
소품/사탕 병(항아리),0,161,candy jar
옷/보라 점프수트,0,161,purple jumpsuit
옷/짧은 망토,0,161,short cape
옷/팽팽한 반바지,0,161,taut shorts
옷/찢어진 하카마,0,161,torn hakama
몸/부서진 뿔,0,160,broken horns
자세/빵 들기,0,160,holding bread
옷/레이스 달린 레오타드,0,160,lace-trimmed leotard
소품/주황 머릿수건,0,160,orange headscarf
양말/체크무늬 니삭,0,160,plaid thighhighs
옷/호박 무늬,0,160,pumpkin print
옷/아쿠아 숄,0,159,aqua shawl
옷/금색 손목 커프스,0,159,gold wrist cuffs
옷/토끼 잠옷,0,159,rabbit pajamas
소품/별 지도,0,159,star map
옷/투톤 손목 커프스,0,159,two-tone wrist cuffs
옷/아가일 넥타이,0,158,argyle necktie
소품/나비 반지,0,158,butterfly ring
옷/소 무늬 재킷,0,158,cow print jacket
옷/프릴 하카마,0,158,frilled hakama
자세/의자 들기,0,158,holding chair
머리/체크무늬 곱창 머리끈,0,158,plaid scrunchie
양말/골지 팬티스타킹,0,158,ribbed pantyhose
옷/풀린 애스콧 타이,0,158,undone ascot
소품/늑대 마스크,0,158,wolf mask
옷/프릴 망토(클로크),0,157,frilled cloak
소품/벗은 소매,0,157,unworn sleeves
옷/노란 코르셋,0,157,yellow corset
몸/갈색 비늘,0,156,brown scales
소품/갈색 우산,0,156,brown umbrella
옷/꽃 칼라,0,156,flower collar
옷/주황 반도 브라,0,156,orange bandeau
소품/그려진 헤일로,0,155,drawn halo
옷/깃털 무늬,0,155,feather print
옷/물고기 해골 무늬,0,155,fish skeleton print
동물/회색 늑대,0,155,grey wolf
옷/물방울무늬 후드티,0,155,polka dot hoodie
소품/투톤 깃털,0,155,two-tone feathers
소품/프릴 안대,0,154,frilled eyepatch
옷/비치는 리본,0,154,see-through bow
소품/해골 반지,0,154,skull ring
눈/짝짝이 눈,0,153,mismatched eyes
소품/멀티컬러 보석,0,153,multicolored gem
소품/분홍 담요,0,153,pink blanket
옷/투톤 갑옷,0,153,two-tone armor
소품/하트 핀,0,152,heart pin
소품/새 해골,0,151,bird skull
옷/나비 무늬 하오리,0,151,butterfly print haori
모자/중국 모자,0,151,chinese hat
옷/비치는 기모노,0,151,see-through kimono
양말/비치는 양말,0,151,see-through socks
배경/줄무늬 벽,0,151,striped wall
옷/노란 베일,0,151,yellow veil
동물/초록 고양이,0,150,green cat
옷/패딩 망토(클로크),0,150,padded cloak
옷/핀스트라이프 캐미솔,0,150,pinstripe camisole
옷/무늬 로브,0,150,print robe
옷/호박 치마,0,150,pumpkin skirt
옷/양 후드,0,150,sheep hood
동물/봉제 거북이,0,150,stuffed turtle
옷/투톤 띠,0,150,two-tone sash
머리/파란 머리 장식,0,149,blue headdress
양말/꽃무늬 무늬 니삭,0,149,floral print thighhighs
소품/프릴 암릿,0,149,frilled armlet
자세/분리된 머리 들기,0,149,holding detached hair
옷/주황 벙어리장갑,0,149,orange mittens
옷/비치는 민소매,0,149,see-through tank top
옷/새 후드,0,148,bird hood
옷/망사 드레스,0,148,fishnet dress
옷/프릴 네글리제,0,148,frilled negligee
옷/하트 비키니,0,148,heart bikini
양말/젖은 양말,0,148,wet socks
소품/금색 꽃,0,147,gold flower
옷/노란 하카마,0,147,yellow hakama
옷/체크 반바지,0,146,checkered shorts
소품/빛나는 화살,0,146,glowing arrow
신발/짝짝이 신발,0,146,mismatched shoes
머리/양 머리장식,0,146,sheep hair ornament
머리/징 박힌 머리띠,0,146,studded hairband
옷/갈색 판초,0,145,brown poncho
옷/망사 베일,0,145,fishnet veil
옷/겹친 케이프,0,145,layered capelet
모자/가시 달린 모자,0,145,spiked hat
옷/가시 달린 셔츠,0,145,spiked shirt
옷/금색 재킷,0,144,gold jacket
옷/초록 판초,0,144,green poncho
양말/멀티컬러 레깅스,0,144,multicolored leggings
소품/토끼 핀,0,144,rabbit pin
소품/빨간 베개,0,144,red pillow
소품/노란 팬지,0,144,yellow pansy
소품/꽃 발찌,0,143,flower anklet
모자/빛나는 모자,0,143,glowing hat
머리/하트 머리띠,0,143,heart hairband
옷/주황 손목 커프스,0,143,orange wrist cuffs
옷/옆트임 반바지,0,143,sideless shorts
옷/투톤 반도 브라,0,143,two-tone bandeau
소품/아쿠아 완장,0,142,aqua armband
옷/체크 칼라,0,142,checkered collar
소품/분홍 자동차,0,142,pink car
옷/노란 판초,0,142,yellow poncho
신발/아쿠아 샌들,0,141,aqua sandals
양말/망사 니하이,0,141,fishnet kneehighs
양말/라텍스 힙하이,0,141,latex hiphighs
옷/핀스트라이프 반바지,0,141,pinstripe shorts
옷/체크무늬 스웨터,0,141,plaid sweater
양말/무늬 레깅스,0,141,print leggings
옷/옆매듭 원피스 수영복,0,141,side-tie one-piece swimsuit
옷/아가일 조끼,0,140,argyle vest
양말/초록 레깅스,0,140,green leggings
소품/멀티컬러 초커,0,140,multicolored choker
소품/종이 풍선,0,140,paper balloon
소품/보라 머릿수건,0,140,purple headscarf
속옷/젖은 브라,0,140,wet bra
동물/아쿠아 나비,0,139,aqua butterfly
모자/갈색 보닛,0,139,brown bonnet
양말/칼라 있는 양말,0,139,collared socks
음식/용 과일,0,139,dragon fruit
몸/그라데이션 털,0,139,gradient fur
자세/헤일로 들기,0,139,holding halo
옷/분홍 하오리,0,139,pink haori
옷/체크무늬 잠옷,0,139,plaid pajamas
동물/빨간 새,0,139,red bird
옷/파란 우비,0,138,blue raincoat
옷/갈색 손목 커프스,0,138,brown wrist cuffs
양말/망사 힙하이,0,138,fishnet hiphighs
옷/물방울무늬 장갑,0,138,polka dot gloves
옷/프릴 후드,0,137,frilled hood
자세/배지 들기,0,137,holding badge
옷/가죽 칼라,0,137,leather collar
속옷/망사 브라,0,136,fishnet bra
신발/큰 신발,0,136,large shoes
소품/빨간 십자가 완장,0,136,red cross armband
머리/불 머리장식,0,135,fire hair ornament
속옷/꽃 팬티,0,135,flower panties
옷/털 달린 판초,0,135,fur-trimmed poncho
옷/멀티컬러 반도 브라,0,135,multicolored bandeau
머리/동물 머리띠,0,134,animal hairband
소품/십자가 브로치,0,134,cross brooch
옷/줄무늬 하오리,0,134,striped haori
옷/체크 민소매,0,133,checkered tank top
옷/털 달린 숄,0,133,fur-trimmed shawl
소품/회색 머릿수건,0,133,grey headscarf
옷/하트 리본,0,133,heart ribbon
소품/가죽 가방,0,133,leather bag
옷/주황 한푸,0,133,orange hanfu
옷/세일러 재킷,0,133,sailor jacket
동물/봉제 원숭이,0,133,stuffed monkey
옷/물 드레스,0,133,water dress
눈/분리된 눈,0,132,detached eyes
음식/악마 과일,0,132,devil fruit
옷/라텍스 반바지,0,132,latex shorts
속옷/잎 브라,0,132,leaf bra
속옷/무늬 스포츠 브라,0,132,print sports bra
옷/흰 가터,0,132,white garter
옷/아쿠아 한푸,0,131,aqua hanfu
옷/프릴 반도 브라,0,131,frilled bandeau
속옷/하트 브라,0,131,heart bra
옷/비치는 볼레로,0,131,see-through shrug
소품/스포츠 병,0,131,sports bottle
소품/노란 밧줄,0,131,yellow rope
몸/분리된 귀,0,130,detached ears
옷/그라데이션 사롱,0,130,gradient sarong
속옷/노란 블루머,0,130,yellow bloomers
자세/바지 들기,0,129,holding pants
배경/보라 달,0,129,purple moon
소품/벗은 팔찌,0,129,unworn bracelet
동물/노란 개,0,129,yellow dog
옷/아가일 바지,0,128,argyle pants
옷/꽃무늬 무늬 바지,0,128,floral print pants
소품/달 공,0,128,moon ball
모자/골지 모자,0,128,ribbed hat
속옷/꽃 브라,0,127,flower bra
성인/금색 니플 패치,0,127,gold pasties
옷/회색 반도 브라,0,127,grey bandeau
옷/광택 있는 레오타드,0,127,shiny leotard
배경/찢어진 커튼,0,127,torn curtains
옷/노란 부루마,0,127,yellow buruma
모자/벚 모자 장식,0,126,cherry hat ornament
소품/소 해골,0,126,cow skull
옷/데님 셔츠,0,126,denim shirt
옷/깅엄 체크 비키니,0,126,gingham bikini
옷/무늬 망토(클로크),0,126,print cloak
소품/토끼 브로치,0,126,rabbit brooch
옷/흰 히잡,0,126,white hijab
옷/아쿠아 망토(클로크),0,125,aqua cloak
옷/찢어진 베일,0,125,torn veil
소품/벗은 반지,0,125,unworn ring
소품/물고기 병,0,124,fish bottle
소품/물고기 귀걸이,0,124,fish earrings
자세/망토(클로크) 들기,0,124,holding cloak
동물/로봇 고양이,0,124,robot cat
몸/호랑이 문신,0,124,tiger tattoo
소품/부서진 조각상,0,123,broken statue
소품/사슴 해골,0,123,deer skull
옷/털 달린 후드티,0,123,fur-trimmed hoodie
옷/비대칭 비키니,0,122,asymmetrical bikini
소품/부서진 뼈,0,122,broken bone
동물/갈색 새,0,122,brown bird
속옷/교차 끈 팬티,0,122,cross-laced panties
속옷/망사 팬티,0,122,fishnet panties
옷/꽃무늬 무늬 사롱,0,122,floral print sarong
소품/회색 반다나,0,122,grey bandana
소품/미니 안경,0,122,mini eyewear
소품/종이 수건,0,122,paper towel
동물/봉제 뱀,0,122,stuffed snake
양말/노란 레깅스,0,122,yellow leggings
음식/빛나는 버섯,0,121,glowing mushroom
머리/초록 하이라이트,0,121,green highlights
옷/겹친 애스콧 타이,0,121,layered ascot
모자/빨간 챙 모자,0,121,red visor cap
소품/박쥐 목걸이,0,120,bat necklace
옷/개구리 우비,0,120,frog raincoat
소품/빛나는 장신구,0,120,glowing jewelry
자세/시계 들기,0,120,holding clock
소품/숫자 양초,0,120,number candle
배경/주황 달,0,120,orange moon
옷/산타 레오타드,0,120,santa leotard
속옷/찢어진 스포츠 브라,0,120,torn sports bra
옷/빛나는 보디수트,0,119,glowing bodysuit
소품/음표 목걸이,0,119,musical note necklace
소품/주황 자동차,0,119,orange car
옷/줄무늬 숄,0,119,striped shawl
소품/검은 암릿,0,118,black armlet
배경/닫힌 커튼,0,118,closed curtains
속옷/리본 단 블루머,0,118,ribbon-trimmed bloomers
소품/벗은 부루마,0,118,unworn buruma
소품/벗은 곱창 머리끈,0,118,unworn scrunchie
소품/초록 왕관,0,117,green crown
옷/주황 숄,0,117,orange shawl
동물/투명 나비,0,117,transparent butterfly
옷/투톤 앞치마,0,117,two-tone apron
소품/투톤 안경,0,117,two-tone eyewear
옷/털 달린 손목 커프스,0,116,fur-trimmed wrist cuffs
소품/금색 총,0,116,golden gun
성인/짝짝이 니플 패치,0,116,mismatched pasties
모자/쥐 모자,0,116,mouse hat
신발/주황 슬리퍼,0,116,orange slippers
옷/세로줄 띠,0,116,vertical-striped sash
소품/새 핀,0,115,bird pin
소품/검은 꽃잎,0,115,black petals
양말/체크 양말,0,115,checkered socks
소품/금색 펜던트,0,115,gold pendant
몸/거대한 귀,0,115,huge ears
소품/잎 팔찌,0,115,leaf bracelet
옷/멀티컬러 원피스 수영복,0,115,multicolored one-piece swimsuit
동물/빨간 고양이,0,115,red cat
머리/옆트임 앞머리,0,115,sideless bangs
소품/해골 컵,0,115,skull cup
옷/소 무늬 앞치마,0,114,cow print apron
옷/프릴 슈미즈,0,114,frilled chemise
모자/물방울무늬 모자,0,114,polka dot hat
소품/토끼 풍선,0,114,rabbit balloon
동물/로봇 물고기,0,114,robot fish
옷/비치는 목도리,0,114,see-through scarf
신발/곰 슬리퍼,0,113,bear slippers
소품/체크 완장,0,113,checkered armband
속옷/개구리 무늬 팬티,0,113,frog print panties
옷/주름 케이프,0,113,pleated capelet
속옷/빨간 티팬티,0,113,red thong
옷/프릴 뷔스티에,0,112,frilled bustier
소품/눈송이 브로치,0,112,snowflake brooch
소품/벗은 벙어리장갑,0,112,unworn mittens
옷/체크 무늬,0,111,checkered print
옷/꽃무늬 무늬 앞치마,0,111,floral print apron
속옷/프릴 블루머,0,111,frilled bloomers
얼굴/금색 입술,0,111,gold lips
옷/스트랩리스 롬퍼,0,111,strapless romper
옷/투톤 잠옷,0,111,two-tone pajamas
양말/세로줄 레깅스,0,111,vertical-striped leggings
옷/짧은 기모노,0,110,cropped kimono
옷/프릴 볼레로,0,110,frilled shrug
옷/털 달린 반도 브라,0,110,fur-trimmed bandeau
옷/주황 하카마,0,110,orange hakama
옷/핀스트라이프 기모노,0,110,pinstripe kimono
몸/토끼 문신,0,110,rabbit tattoo
옷/갈색 타바드,0,109,brown tabard
소품/불 돌,0,109,fire stone
소품/불타는 화살,0,109,flaming arrow
옷/프릴 보디수트,0,109,frilled bodysuit
자세/사롱 들기,0,109,holding sarong
옷/멀티컬러 애스콧 타이,0,109,multicolored ascot
소품/보라 왕관,0,109,purple crown
옷/팽팽한 바지,0,109,taut pants
소품/벗은 레오타드,0,109,unworn leotard
양말/프릴 힙하이,0,108,frilled hiphighs
옷/초록 베이비돌,0,108,green babydoll
소품/초록 밧줄,0,108,green rope
옷/골지 조끼,0,108,ribbed vest
옷/옆트임 수영복,0,108,sideless swimsuit
소품/줄무늬 우산,0,108,striped umbrella
옷/팽팽한 재킷,0,108,taut jacket
옷/털 달린 점프수트,0,107,fur-trimmed jumpsuit
옷/빨간 핫피,0,107,red happi
옷/민소매 로브,0,107,sleeveless robe
소품/눈송이 헤일로,0,107,snowflake halo
옷/젖은 기모노,0,107,wet kimono
속옷/카모 팬티,0,106,camouflage panties
몸/빛나는 귀,0,106,glowing ears
옷/멀티컬러 벨트,0,106,multicolored belt
옷/오프숄더 케이프,0,106,off-shoulder capelet
옷/무늬 손목 커프스,0,106,print wrist cuffs
양말/흰 보디스타킹,0,106,white bodystocking
옷/무장한 칼라,0,105,armored collar
모자/파란 바이저,0,105,blue visor
소품/용 장식,0,105,dragon ornament
옷/메이드 원피스 수영복,0,105,maid one-piece swimsuit
옷/아쿠아 멜빵바지,0,104,aqua overalls
몸/꽃 날개,0,104,flower wings
몸/거대한 발톱,0,104,huge claws
옷/레이스 달린 손목 커프스,0,104,lace-trimmed wrist cuffs
소품/미니 티아라,0,104,mini tiara
동물/고무 닭,0,104,rubber chicken
옷/찢어진 후드,0,104,torn hood
소품/부서진 목걸이,0,103,broken necklace
머리/꽃 머리핀,0,103,flower hairclip
옷/프릴 베일,0,103,frilled veil
얼굴/금색 아이섀도,0,103,gold eyeshadow
옷/비치는 리본,0,103,see-through ribbon
옷/가시 달린 소매,0,103,spiked sleeves
소품/줄무늬 반다나,0,103,striped bandana
옷/투톤 점프수트,0,103,two-tone jumpsuit
소품/곰 마스크,0,102,bear mask
모자/파란 챙 모자,0,102,blue visor cap
머리/갈색 머리 장식,0,102,brown headdress
머리/교차 끈 머리띠,0,102,cross-laced hairband
소품/불 트럭,0,102,fire truck
모자/잎 모자,0,102,leaf hat
옷/후드 없음,0,102,no hood
소품/한쪽 팔찌,0,102,single bracelet
소품/호랑이 백합,0,102,tiger lily
모자/고양이 모자 장식,0,101,cat hat ornament
속옷/벚 무늬 팬티,0,101,cherry print panties
배경/긴 테이블,0,101,long table
속옷/헐렁한 팬티,0,101,loose panties
옷/골지 치마,0,101,ribbed skirt
동물/봉제 코끼리,0,101,stuffed elephant
옷/찢어진 애스콧 타이,0,101,torn ascot
옷/프릴 오버스커트,0,100,frilled overskirt
몸/빛나는 손톱,0,100,glowing nails
동물/초록 뱀,0,100,green snake
몸/하트 날개,0,100,heart wings
옷/라텍스 코르셋,0,100,latex corset
옷/잎 셔츠,0,100,leaf shirt
옷/긴 베일,0,100,long veil
옷/분홍 타바드,0,100,pink tabard
옷/빨간 나이트가운,0,100,red nightgown
소품/가시 달린 목걸이,0,100,spiked necklace
옷/줄무늬 애스콧 타이,0,100,striped ascot
신발/투톤 샌들,0,100,two-tone sandals
소품/물고기 해골 귀걸이,0,99,fish skeleton earrings
소품/무늬 컵,0,99,print cup
소품/투명 꽃,0,99,transparent flower
소품/아쿠아 우산,0,98,aqua umbrella
옷/카모 장갑,0,98,camouflage gloves
소품/체크 손목밴드,0,98,checkered wristband
옷/교차 끈 조끼,0,98,cross-laced vest
옷/가죽 셔츠,0,98,leather shirt
옷/카디건 없음,0,98,no cardigan
모자/주황 챙 모자,0,98,orange visor cap
옷/분홍 오버스커트,0,98,pink overskirt
옷/빨간 뷔스티에,0,98,red bustier
모자/태양 모자 장식,0,98,sun hat ornament
소품/흰 지팡이,0,98,white cane
소품/흰 연꽃,0,98,white lotus
옷/천사 레오타드,0,97,angel leotard
옷/비대칭 코트,0,97,asymmetrical coat
소품/돼지 마스크,0,97,pig mask
옷/무늬 후드,0,97,print hood
모자/딸기 모자 장식,0,97,strawberry hat ornament
소품/벗은 가짜 동물 귀,0,97,unworn fake animal ears
옷/흰 판초,0,97,white poncho
모자/사선 줄무늬 모자,0,96,diagonal-striped hat
소품/그려진 별,0,96,drawn star
옷/레이스 달린 재킷,0,96,lace-trimmed jacket
옷/멀티컬러 볼레로,0,96,multicolored shrug
옷/핀스트라이프 애스콧 타이,0,96,pinstripe ascot
옷/체크무늬 원피스 수영복,0,96,plaid one-piece swimsuit
양말/가시 달린 레그웨어,0,96,spiked legwear
모자/호랑이 모자,0,96,tiger hat
동물/갈색 토끼,0,95,brown rabbit
소품/꽃 암릿,0,95,flower armlet
옷/꽃 단 치마,0,95,flower-trimmed skirt
소품/매달린 꽃,0,95,hanging flower
자세/반바지 들기,0,95,holding shorts
옷/레이스 리본,0,95,lace ribbon
속옷/잎 팬티,0,95,leaf panties
옷/가죽 코트,0,95,leather coat
옷/다중 끈 드레스,0,95,multi-strapped dress
소품/한쪽 깃털,0,95,single feather
옷/가시 달린 커프스,0,95,spiked cuffs
동물/봉제 올빼미,0,95,stuffed owl
동물/물 용,0,95,water dragon
소품/부서진 화살,0,94,broken arrow
자세/개구리 들기,0,94,holding frog
소품/레이스 달린 우산,0,94,lace-trimmed umbrella
옷/핀스트라이프 소매,0,94,pinstripe sleeves
옷/골지 재킷,0,94,ribbed jacket
머리/호랑이 머리장식,0,94,tiger hair ornament
옷/노란 베이비돌,0,94,yellow babydoll
옷/파란 샅바,0,93,blue loincloth
옷/갈색 사롱,0,93,brown sarong
몸/금색 비늘,0,93,gold scales
자세/눈가리개 들기,0,93,holding blindfold
자세/후드티 들기,0,93,holding hoodie
동물/얼음 용,0,93,ice dragon
몸/긴 꼬리,0,93,long tail
옷/다중 끈 수영복,0,93,multi-strapped swimsuit
모자/멀티컬러 헬멧,0,93,multicolored helmet
모자/음표 모자 장식,0,93,musical note hat ornament
몸/피부 없음,0,93,no skin
옷/체크무늬 벨트,0,93,plaid belt
옷/리본 단 코트,0,93,ribbon-trimmed coat
신발/은색 부츠,0,93,silver boots
옷/줄무늬 사롱,0,93,striped sarong
옷/갈색 하오리,0,92,brown haori
성인/소 무늬 니플 패치,0,92,cow print pasties
모자/금 간 헬멧,0,92,cracked helmet
자세/앞치마 들기,0,92,holding apron
동물/멀티컬러 고양이,0,92,multicolored cat
옷/찢어진 반도 브라,0,92,torn bandeau
모자/투톤 헬멧,0,92,two-tone helmet
얼굴/흰 혀,0,92,white tongue
양말/파란 힙하이,0,91,blue hiphighs
소품/카모 가방,0,91,camouflage bag
소품/고양이 목걸이,0,91,cat necklace
속옷/체크 브라,0,91,checkered bra
모자/용 모자,0,91,dragon hat
옷/프릴 로브,0,91,frilled robe
몸/줄무늬 손톱,0,91,striped nails
동물/봉제 다람쥐,0,91,stuffed squirrel
동물/흰 용,0,91,white dragon
소품/고양이 브로치,0,90,cat brooch
소품/그려진 꽃,0,90,drawn flower
옷/꽃 단 소매,0,90,flower-trimmed sleeves
소품/빛나는 지팡이,0,90,glowing staff
옷/초록 우비,0,90,green raincoat
속옷/주황 블루머,0,90,orange bloomers
옷/패딩 조끼,0,90,padded vest
소품/무지개 초커,0,90,rainbow choker
옷/호랑이 무늬 비키니,0,90,tiger print bikini
소품/찢어진 가방,0,90,torn bag
소품/찢어진 초커,0,90,torn choker
옷/아가일 보타이,0,89,argyle bowtie
옷/갈색 볼레로,0,89,brown shrug
옷/체크 벨트,0,89,checkered belt
옷/칼라 있는 비키니,0,89,collared bikini
옷/깃털 케이프,0,89,feather capelet
소품/금색 완장,0,89,gold armband
자세/나무 들기,0,89,holding tree
옷/레이스 치마,0,89,lace skirt
몸/긴 발톱,0,89,long claws
속옷/산타 브라,0,89,santa bra
모자/양 모자,0,89,sheep hat
소품/투명 검,0,89,transparent sword
소품/물 돌,0,89,water stone
모자/흰 챙 모자,0,89,white visor cap
동물/금색 나비,0,88,golden butterfly
옷/초록 나이트가운,0,88,green nightgown
속옷/하이웨이스트 팬티,0,88,high-waist panties
자세/크리스마스 나무 들기,0,88,holding christmas tree
소품/종이 왕관,0,88,paper crown
속옷/빨간 블루머,0,88,red bloomers
양말/은색 레그웨어,0,88,silver legwear
머리/사탕 사과 머리장식,0,87,candy apple hair ornament
옷/교차 끈 스웨터,0,87,cross-laced sweater
옷/회색 부루마,0,87,grey buruma
옷/겹친 갑옷,0,87,layered armor
옷/주황 샅바,0,87,orange loincloth
옷/빨간 오버스커트,0,87,red overskirt
옷/비치는 로브,0,87,see-through robe
몸/비치는 꼬리,0,87,see-through tail
옷/은색 레오타드,0,87,silver leotard
동물/장난감 공룡,0,87,toy dinosaur
소품/나무 접시,0,87,wooden plate
모자/노란 보닛,0,87,yellow bonnet
소품/부서진 휴대폰,0,86,broken phone
옷/갈색 부루마,0,86,brown buruma
신발/체크 신발,0,86,checkered shoes
옷/금 간 갑옷,0,86,cracked armor
옷/사선 줄무늬 목스카프,0,86,diagonal-striped neckerchief
옷/기계 치마,0,86,mechanical skirt
옷/쥐 후드,0,86,mouse hood
몸/보라 귀,0,86,purple ears
소품/리본 단 초커,0,86,ribbon-trimmed choker
옷/아주 긴 망토,0,86,very long cape
옷/카모 드레스,0,85,camouflage dress
옷/체크 장갑,0,85,checkered gloves
속옷/얼룩진 브라,0,85,stained bra
동물/봉제 기린,0,85,stuffed giraffe
옷/동물 목도리,0,84,animal scarf
배경/체크 천장,0,84,checkered ceiling
속옷/소 무늬 팬티,0,84,cow print panties
옷/프릴 목도리,0,84,frilled scarf
옷/털 달린 베일,0,84,fur-trimmed veil
옷/그라데이션 레오타드,0,84,gradient leotard
동물/회색 나비,0,84,grey butterfly
자세/귀걸이 들기,0,84,holding earrings
자세/후드 들기,0,84,holding hood
머리/머리핀 없음,0,84,no hairclip
음식/별 모양 쿠키,0,84,star-shaped cookie
음식/봉제 토마토,0,84,stuffed tomato
동물/검은 양,0,83,black sheep
옷/고양이 잠옷,0,83,cat pajamas
옷/멀티컬러 로브,0,83,multicolored robe
옷/멀티컬러 세일러 칼라,0,83,multicolored sailor collar
속옷/멀티컬러 스포츠 브라,0,83,multicolored sports bra
소품/무늬 완장,0,83,print armband
얼굴/빨간 치아,0,83,red teeth
옷/비치는 슈미즈,0,83,see-through chemise
옷/가시 달린 후드,0,83,spiked hood
머리/별 모양 머리,0,83,star-shaped hair
옷/줄무늬 점프수트,0,83,striped jumpsuit
동물/봉제 게,0,83,stuffed crab
옷/찢어진 보타이,0,83,torn bowtie
옷/아가일 비키니,0,82,argyle bikini
소품/비대칭 마스크,0,82,asymmetrical mask
속옷/교차 끈 브라,0,82,cross-laced bra
몸/불타는 뿔,0,82,flaming horns
동물/멀티컬러 나비,0,82,multicolored butterfly
소품/가시 달린 방패,0,82,spiked shield
소품/투톤 완장,0,82,two-tone armband
신발/동물 신발,0,81,animal shoes
양말/카모 레그웨어,0,81,camouflage legwear
옷/용 후드,0,81,dragon hood
옷/망사 수영복,0,81,fishnet swimsuit
옷/꽃무늬 무늬 반바지,0,81,floral print shorts
옷/깅엄 체크 소매,0,81,gingham sleeves
소품/유리 병(항아리),0,81,glass jar
머리/겹친 머리,0,81,layered hair
옷/짧은 앞치마,0,81,short apron
옷/찢어진 벨트,0,81,torn belt
소품/찢어진 눈가리개,0,81,torn blindfold
소품/벗은 블루머,0,81,unworn bloomers
옷/세로줄 칼라,0,81,vertical-striped collar
몸/젖은 꼬리,0,81,wet tail
신발/날개 달린 샌들,0,81,winged sandals
옷/아가일 망토(클로크),0,80,argyle cloak
배경/검은 달,0,80,black moon
옷/체크 코트,0,80,checkered coat
옷/체크 스웨터,0,80,checkered sweater
몸/빛나는 흉터,0,80,glowing scar
옷/그라데이션 후드티,0,80,gradient hoodie
소품/번개 목걸이,0,80,lightning bolt necklace
소품/주황 마스크,0,80,orange mask
소품/종이 꽃,0,80,paper flower
양말/핀스트라이프 양말,0,80,pinstripe socks
옷/무늬 반도 브라,0,80,print bandeau
소품/호박 귀걸이,0,80,pumpkin earrings
옷/투톤 애스콧 타이,0,80,two-tone ascot
옷/세로줄 리본,0,80,vertical-striped ribbon
소품/날개 달린 해골,0,80,winged skull
옷/카모 후드티,0,79,camouflage hoodie
소품/빛나는 안경,0,79,glowing glasses
속옷/회색 스포츠 팬티,0,79,grey sports panties
옷/레이스 달린 보타이,0,79,lace-trimmed bowtie
옷/쥐 무늬,0,79,mouse print
머리/멀티컬러 머리띠,0,79,multicolored headband
옷/산타 망토,0,79,santa cape
옷/스트랩리스 점프수트,0,79,strapless jumpsuit
옷/줄무늬 후드,0,79,striped hood
옷/아쿠아 후드,0,78,aqua hood
옷/검은 히잡,0,78,black hijab
옷/파란 한복,0,78,blue hanbok
옷/파란 히잡,0,78,blue hijab
소품/사탕 하트,0,78,candy heart
옷/털 달린 목도리,0,78,fur-trimmed scarf
모자/그라데이션 모자,0,78,gradient hat
옷/레이스 달린 세일러 칼라,0,78,lace-trimmed sailor collar
음식/분홍 도넛,0,78,pink donut
소품/체크무늬 가방,0,78,plaid bag
옷/호박 반바지,0,78,pumpkin shorts
몸/토끼 발바닥,0,78,rabbit paws
옷/리본 단 재킷,0,78,ribbon-trimmed jacket
동물/해골 말,0,78,skeleton horse
옷/아가일 장갑,0,77,argyle gloves
소품/부서진 고글,0,77,broken goggles
소품/용 마스크,0,77,dragon mask
몸/드릴 뿔,0,77,drill horn
옷/깃털 치마,0,77,feather skirt
옷/깃털 단 망토,0,77,feather-trimmed cape
소품/물고기 장식,0,77,fish ornament
양말/망사 레깅스,0,77,fishnet leggings
옷/깅엄 체크 보타이,0,77,gingham bowtie
옷/깅엄 체크 넥타이,0,77,gingham necktie
옷/골지 바지,0,77,ribbed pants
소품/딸기 브로치,0,77,strawberry brooch
동물/장난감 말,0,77,toy horse
소품/세로줄 베개,0,77,vertical-striped pillow
소품/노란 베개,0,77,yellow pillow
소품/사과 귀걸이,0,76,apple earrings
소품/파란 팬지,0,76,blue pansy
옷/파란 판초,0,76,blue poncho
몸/분리된 꼬리,0,76,detached tail
동물/빛나는 새,0,76,glowing bird
머리/머리띠 없음,0,76,no headband
모자/비치는 모자,0,76,see-through hat
옷/양 무늬,0,76,sheep print
몸/노란 발톱,0,76,yellow claws
옷/노란 타바드,0,76,yellow tabard
양말/자수 레그웨어,0,75,embroidered legwear
소품/깃털 초커,0,75,feather choker
속옷/회색 블루머,0,75,grey bloomers
옷/회색 하오리,0,75,grey haori
자세/스웨터 들기,0,75,holding sweater
옷/무늬 벨트,0,75,print belt
옷/골지 반도 브라,0,75,ribbed bandeau
소품/은색 장신구,0,75,silver jewelry
소품/별 모양 가방,0,75,star-shaped bag
머리/투톤 머리띠,0,75,two-tone headband
옷/아쿠아 부루마,0,74,aqua buruma
몸/부서진 날개,0,74,broken wing
양말/사선 줄무늬 니삭,0,74,diagonal-striped thighhighs
음식/금색 달걀,0,74,golden egg
자세/펜던트 들기,0,74,holding pendant
속옷/겹친 팬티,0,74,layered panties
소품/호박 장식,0,74,pumpkin ornament
소품/무지개 헤일로,0,74,rainbow halo
옷/찢어진 멜빵바지,0,74,torn overalls
옷/젖은 부루마,0,74,wet buruma
옷/젖은 레오타드,0,74,wet leotard
얼굴/검은 치아,0,73,black teeth
소품/부서진 방패,0,73,broken shield
소품/체크 팔찌,0,73,checkered bracelet
옷/꽃무늬 무늬 리본,0,73,floral print bow
옷/털 달린 오버스커트,0,73,fur-trimmed overskirt
옷/털 달린 볼레로,0,73,fur-trimmed shrug
소품/멀티컬러 티아라,0,73,multicolored tiara
소품/주황 밧줄,0,73,orange rope
소품/호박 브로치,0,73,pumpkin brooch
속옷/보라 블루머,0,73,purple bloomers
머리/아가일 머리띠,0,72,argyle hairband
몸/비대칭 귀,0,72,asymmetrical ears
옷/꽃무늬 무늬 장갑,0,72,floral print gloves
소품/꽃 우산,0,72,flower umbrella
머리/얼음 머리,0,72,ice hair
옷/레이스 베일,0,72,lace veil
옷/잎 드레스,0,72,leaf dress
성인/금속 니플 패치,0,72,metal pasties
옷/멀티컬러 앞치마,0,72,multicolored apron
소품/보라 광선검,0,72,purple lightsaber
성인/토끼 니플 패치,0,72,rabbit pasties
옷/찢어진 타바드,0,72,torn tabard
소품/벗은 반다나,0,72,unworn bandana
몸/아쿠아 비늘,0,71,aqua scales
소품/꽃 풍선,0,71,flower balloon
속옷/꽃 단 브라,0,71,flower-trimmed bra
소품/개구리 마스크,0,71,frog mask
양말/그라데이션 힙하이,0,71,gradient hiphighs
소품/보라 자동차,0,71,purple car
옷/세로줄 멜빵바지,0,71,vertical-striped overalls
소품/흰 담요,0,71,white blanket
옷/파란 십자가 타이,0,70,blue cross tie
신발/개 슬리퍼,0,70,dog slippers
음식/물고기 케이크,0,70,fish cake
소품/프릴 가방,0,70,frilled bag
옷/프릴 카디건,0,70,frilled cardigan
머리/하트 머리띠,0,70,heart headband
얼굴/멀티컬러 아이섀도,0,70,multicolored eyeshadow
신발/멀티컬러 샌들,0,70,multicolored sandals
옷/레오타드 없음,0,70,no leotard
소품/숫자 귀걸이,0,70,number earrings
동물/오버사이즈 거미,0,70,oversized spider
옷/무늬 원피스 수영복,0,70,print one-piece swimsuit
옷/토끼 리본,0,70,rabbit bow
옷/골지 반바지,0,70,ribbed shorts
옷/리본 단 바지,0,70,ribbon-trimmed pants
소품/별 모양 보석,0,70,star-shaped gem
음식/봉제 새우,0,70,stuffed shrimp
옷/찢어진 사롱,0,70,torn sarong
옷/투톤 볼레로,0,70,two-tone shrug
옷/등 파인 스웨터,0,69,backless sweater
옷/갈색 베일,0,69,brown veil
옷/회색 오버스커트,0,69,grey overskirt
소품/밝은 총,0,69,light gun
옷/멀티컬러 잠옷,0,69,multicolored pajamas
몸/음표 문신,0,69,musical note tattoo
옷/분홍 슈미즈,0,69,pink chemise
옷/분홍 히잡,0,69,pink hijab
소품/태양 장식,0,69,sun ornament
소품/투톤 손목밴드,0,69,two-tone wristband
소품/파란 티아라,0,68,blue tiara
옷/갈색 뷔스티에,0,68,brown bustier
동물/갈색 나비,0,68,brown butterfly
속옷/카모 브라,0,68,camouflage bra
소품/고양이 펜던트,0,68,cat pendant
모자/물고기 모자 장식,0,68,fish hat ornament
자세/목스카프 들기,0,68,holding neckerchief
옷/레이스 달린 수영복,0,68,lace-trimmed swimsuit
옷/리본 없음,0,68,no ribbon
옷/분홍 튜닉,0,68,pink tunic
옷/물방울무늬 베이비돌,0,68,polka dot babydoll
옷/줄무늬 멜빵바지,0,68,striped overalls
옷/검은 판초,0,67,black poncho
속옷/검은 스포츠 팬티,0,67,black sports panties
소품/소 마스크,0,67,cow mask
소품/꽃 펜던트,0,67,flower pendant
몸/금색 발톱,0,67,gold claws
옷/그라데이션 애스콧 타이,0,67,gradient ascot
옷/헐렁한 기모노,0,67,loose kimono
소품/오버사이즈 안경,0,67,oversized eyewear
옷/물방울무늬 사롱,0,67,polka dot sarong
얼굴/투톤 눈썹,0,67,two-tone eyebrows
소품/벗은 니하이,0,67,unworn kneehighs
모자/검은 챙 모자,0,66,black visor cap
옷/망사 반바지,0,66,fishnet shorts
옷/꽃무늬 리본,0,66,floral bow
옷/프릴 후드티,0,66,frilled hoodie
얼굴/빛나는 혀,0,66,glowing tongue
동물/회색 새,0,66,grey bird
옷/회색 사롱,0,66,grey sarong
옷/넥타이 없음,0,66,no necktie
옷/골지 칼라,0,66,ribbed collar
옷/세로줄 케이프,0,66,vertical-striped capelet
옷/세로줄 코르셋,0,66,vertical-striped corset
자세/머리띠 들기,0,65,holding headband
머리/번개 머리,0,65,lightning hair
소품/음표 브로치,0,65,musical note brooch
양말/분홍 힙하이,0,65,pink hiphighs
소품/무늬 초커,0,65,print choker
속옷/산타 팬티,0,65,santa panties
옷/날개 달린 장갑,0,65,winged gloves
소품/늑대 브로치,0,65,wolf brooch
소품/검은 목줄,0,64,black leash
동물/갈색 곰,0,64,brown bear
속옷/금색 티팬티,0,64,gold thong
배경/가죽 의자,0,64,leather chair
소품/분홍 목줄,0,64,pink leash
옷/핀스트라이프 리본,0,64,pinstripe ribbon
옷/체크무늬 손목 커프스,0,64,plaid wrist cuffs
옷/광택 있는 장갑,0,64,shiny gloves
옷/찢어진 캐미솔,0,64,torn camisole
옷/아쿠아 손목 커프스,0,63,aqua wrist cuffs
몸/파란 발톱,0,63,blue claws
옷/칼라 있는 튜닉,0,63,collared tunic
옷/깃털 단 레오타드,0,63,feather-trimmed leotard
옷/레이스 리본,0,63,lace bow
옷/멀티컬러 민소매,0,63,multicolored tank top
옷/주황 코르셋,0,63,orange corset
옷/돼지 무늬,0,63,pig print
동물/분홍 새,0,63,pink bird
양말/보라 힙하이,0,63,purple hiphighs
옷/골지 비키니,0,63,ribbed bikini
옷/비치는 손목 커프스,0,63,see-through wrist cuffs
양말/가시 달린 니삭,0,63,spiked thighhighs
옷/줄무늬 하카마,0,63,striped hakama
옷/세로줄 망토,0,63,vertical-striped cape
소품/파란 베개,0,62,blue pillow
몸/고양이 문신,0,62,cat tattoo
옷/체크 애스콧 타이,0,62,checkered ascot
머리/털 달린 머리띠,0,62,fur-trimmed hairband
얼굴/회색 수염,0,62,grey beard
자세/띠 들기,0,62,holding sash
옷/주황 슬링샷 수영복,0,62,orange slingshot swimsuit
옷/주황 베일,0,62,orange veil
옷/분홍 한복,0,62,pink hanbok
모자/리본 단 모자,0,62,ribbon-trimmed hat
소품/산타 백합,0,62,santa lily
신발/찢어진 신발,0,62,torn shoes
소품/벗은 애스콧 타이,0,62,unworn ascot
소품/벗은 베일,0,62,unworn veil
옷/아가일 카디건,0,61,argyle cardigan
옷/카모 망토(클로크),0,61,camouflage cloak
몸/가짜 뾰족한 귀,0,61,fake pointy ears
소품/하트 왕관,0,61,heart crown
옷/레이스 비키니,0,61,lace bikini
옷/레이스 달린 민소매,0,61,lace-trimmed tank top
옷/잎 레오타드,0,61,leaf leotard
소품/잎 목걸이,0,61,leaf necklace
몸/달 문신,0,61,moon tattoo
소품/고글 없음,0,61,no goggles
소품/숫자 안경,0,61,number glasses
옷/체크무늬 캐미솔,0,61,plaid camisole
동물/로봇 말,0,61,robot horse
옷/세일러 레오타드,0,61,sailor leotard
모자/젖은 모자,0,61,wet hat
동물/흰 고래,0,61,white whale
옷/파란 가터,0,60,blue garter
소품/빛나는 왕관,0,60,glowing crown
소품/초록 꽃잎,0,60,green petals
자세/슬리퍼 들기,0,60,holding slippers
옷/니트 목도리,0,60,knit scarf
머리/쥐 머리장식,0,60,mouse hair ornament
옷/멀티컬러 사롱,0,60,multicolored sarong
옷/앞치마 없음,0,60,no apron
옷/체크무늬 장갑,0,60,plaid gloves
머리/보라 머리 장식,0,60,purple headdress
모자/딸기 모자,0,60,strawberry hat
양말/찢어진 힙하이,0,60,torn hiphighs
머리/투톤 곱창 머리끈,0,60,two-tone scrunchie
몸/새 문신,0,59,bird tattoo
소품/갈색 팔찌,0,59,brown bracelet
양말/체크 팬티스타킹,0,59,checkered pantyhose
소품/초록 베개,0,59,green pillow
모자/회색 보닛,0,59,grey bonnet
소품/멀티컬러 손목밴드,0,59,multicolored wristband
소품/종이 접시,0,59,paper plate
몸/분홍 발톱,0,59,pink claws
옷/비치는 후드티,0,59,see-through hoodie
몸/한쪽 기계 날개,0,59,single mechanical wing
옷/팽팽한 비키니,0,59,taut bikini
옷/꽉 끼는 하의,0,59,tight bottoms
옷/찢어진 점프수트,0,59,torn jumpsuit
옷/노란 나이트가운,0,59,yellow nightgown
속옷/아쿠아 스포츠 브라,0,58,aqua sports bra
몸/곰 발톱,0,58,bear claws
양말/사선 줄무늬 레그웨어,0,58,diagonal-striped legwear
옷/꽃무늬 무늬 베일,0,58,floral print veil
자세/레오타드 들기,0,58,holding leotard
옷/레이스 달린 애스콧 타이,0,58,lace-trimmed ascot
옷/라텍스 재킷,0,58,latex jacket
옷/기계 드레스,0,58,mechanical dress
소품/쥐 마스크,0,58,mouse mask
모자/분홍 챙 모자,0,58,pink visor cap
모자/호박 모자 장식,0,58,pumpkin hat ornament
옷/무지개 리본,0,58,rainbow ribbon
머리/짧은 헝클어진 앞머리,0,58,short messy bangs
옷/가시 달린 드레스,0,58,spiked dress
옷/투톤 슬링샷 수영복,0,58,two-tone slingshot swimsuit
옷/세로줄 보타이,0,58,vertical-striped bowtie
옷/늑대 무늬,0,58,wolf print
소품/노란 광선검,0,58,yellow lightsaber
옷/아가일 리본,0,57,argyle ribbon
모자/박쥐 모자 장식,0,57,bat hat ornament
옷/파란 뷔스티에,0,57,blue bustier
얼굴/파란 치아,0,57,blue teeth
옷/나비 무늬 띠,0,57,butterfly print sash
옷/카모 코트,0,57,camouflage coat
소품/빛나는 목걸이,0,57,glowing necklace
옷/그라데이션 보타이,0,57,gradient bowtie
옷/그라데이션 스웨터,0,57,gradient sweater
옷/후드 달린 멜빵바지,0,57,hooded overalls
옷/간호사 드레스,0,57,nurse dress
소품/체크무늬 머릿수건,0,57,plaid headscarf
옷/체크무늬 후드티,0,57,plaid hoodie
소품/무지개 배지,0,57,rainbow badge
옷/빨간 가터,0,57,red garter
옷/리본 단 수영복,0,57,ribbon-trimmed swimsuit
옷/비치는 카디건,0,57,see-through cardigan
옷/줄무늬 로브,0,57,striped robe
소품/장난감 상자,0,57,toy box
몸/젖은 털,0,57,wet fur
옷/칼라 있는 앞치마,0,56,collared apron
옷/데님 앞치마,0,56,denim apron
옷/물고기 후드,0,56,fish hood
옷/털 달린 카디건,0,56,fur-trimmed cardigan
소품/기계 하트,0,56,mechanical heart
옷/무늬 애스콧 타이,0,56,print ascot
소품/무늬 공,0,56,print ball
배경/무늬 커튼,0,56,print curtains
소품/딸기 가방,0,56,strawberry bag
소품/동물 해골 장식,0,55,animal skull ornament
옷/악마 후드,0,55,demon hood
소품/초록 담요,0,55,green blanket
옷/라텍스 소매,0,55,latex sleeves
옷/비치는 후드,0,55,see-through hood
옷/비치는 오버스커트,0,55,see-through overskirt
옷/옆트임 스웨터,0,55,sideless sweater
소품/부서진 지팡이,0,54,broken staff
모자/나비 모자,0,54,butterfly hat
옷/교차 끈 앞치마,0,54,cross-laced apron
소품/용 해골,0,54,dragon skull
양말/프릴 팬티스타킹,0,54,frilled pantyhose
배경/유리 바닥,0,54,glass floor
배경/초록 달,0,54,green moon
옷/하이웨이스트 비키니,0,54,high-waist bikini
자세/발바닥 들기,0,54,holding paw
소품/말 귀걸이,0,54,horse earrings
신발/레이스 달린 부츠,0,54,lace-trimmed boots
옷/라텍스 셔츠,0,54,latex shirt
소품/멀티컬러 가방,0,54,multicolored bag
옷/오프숄더 반도 브라,0,54,off-shoulder bandeau
속옷/물방울무늬 블루머,0,54,polka dot bloomers
옷/무늬 베일,0,54,print veil
소품/빨간 티아라,0,54,red tiara
옷/리본 단 손목 커프스,0,54,ribbon-trimmed wrist cuffs
옷/은색 칼라,0,54,silver collar
옷/비대칭 원피스 수영복,0,53,asymmetrical one-piece swimsuit
옷/파란 핫피,0,53,blue happi
속옷/고양이 브라,0,53,cat bra
모자/엘프 모자,0,53,elf hat
배경/프릴 커튼,0,53,frilled curtains
옷/털 달린 리본,0,53,fur-trimmed bow
옷/털 달린 잠옷,0,53,fur-trimmed pajamas
배경/유리 의자,0,53,glass chair
소품/빛나는 칼,0,53,glowing knife
자세/팔찌 들기,0,53,holding bracelet
자세/유령 들기,0,53,holding ghost
속옷/가죽 브라,0,53,leather bra
소품/멀티컬러 머릿수건,0,53,multicolored headscarf
얼굴/입술 없음,0,53,no lips
동물/주황 새,0,53,orange bird
소품/체크무늬 수건,0,53,plaid towel
옷/리본 단 베이비돌,0,53,ribbon-trimmed babydoll
옷/리본 단 스웨터,0,53,ribbon-trimmed sweater
양말/옆매듭 레그웨어,0,53,side-tie legwear
속옷/별 브라,0,53,star bra
옷/체크 망토(클로크),0,52,checkered cloak
머리/소 머리장식,0,52,cow hair ornament
배경/빛나는 나무,0,52,glowing tree
옷/멀티컬러 점프수트,0,52,multicolored jumpsuit
옷/분홍 가터,0,52,pink garter
옷/투명 리본,0,52,transparent ribbon
옷/풀린 십자가 타이,0,52,undone cross tie
배경/흰 나무,0,52,white tree
동물/노란 뱀,0,52,yellow snake
옷/칼라 있는 기모노,0,51,collared kimono
소품/십자가 핀,0,51,cross pin
옷/사슴 무늬,0,51,deer print
자세/티아라 들기,0,51,holding tiara
소품/잎 장식,0,51,leaf ornament
옷/헐렁한 치마,0,51,loose skirt
옷/베일 없음,0,51,no veil
모자/열린 모자,0,51,open hat
머리/돼지 머리장식,0,51,pig hair ornament
옷/체크무늬 카디건,0,51,plaid cardigan
소품/보라 베개,0,51,purple pillow
동물/해골 뱀,0,51,skeleton snake
옷/별 모양 비키니,0,51,star-shaped bikini
옷/찢어진 부루마,0,51,torn buruma
머리/동물 머리,0,50,animal hair
옷/아쿠아 갑옷,0,50,aqua armor
모자/아쿠아 헬멧,0,50,aqua helmet
소품/부서진 해골,0,50,broken skull
옷/교차 끈 칼라,0,50,cross-laced collar
머리/용 머리장식,0,50,dragon hair ornament
옷/프릴 목스카프,0,50,frilled neckerchief
양말/회색 힙하이,0,50,grey hiphighs
옷/회색 타바드,0,50,grey tabard
자세/고무 오리 들기,0,50,holding rubber duck
옷/오버사이즈 장갑,0,50,oversized gloves
소품/무늬 종이 부채,0,50,print paper fan
옷/무늬 숄,0,50,print shawl
옷/퐁퐁한 칼라,0,50,puffy collar
소품/가시 달린 공,0,50,spiked ball
소품/가시 달린 반지,0,50,spiked ring
머리/찢어진 머리띠,0,50,torn headband
모자/세로줄 모자,0,50,vertical-striped hat
소품/흰 광선검,0,50,white lightsaber
옷/소 무늬 레오타드,0,49,cow print leotard
소품/금 간 해골,0,49,cracked skull
동물/빛나는 물고기,0,49,glowing fish
신발/그라데이션 신발,0,49,gradient shoes
옷/레이스 손목 커프스,0,49,lace wrist cuffs
옷/옆매듭 조끼,0,49,side-tie vest
옷/아주 긴 로브,0,49,very long robe
동물/날개 달린 고양이,0,49,winged cat
동물/검은 곰,0,48,black bear
모자/개구리 모자 장식,0,48,frog hat ornament
옷/털 달린 벨트,0,48,fur-trimmed belt
신발/털 달린 샌들,0,48,fur-trimmed sandals
소품/빛나는 책,0,48,glowing book
머리/회색 머리 장식,0,48,grey headdress
자세/머리 장식 들기,0,48,holding headdress
자세/양 들기,0,48,holding sheep
옷/미니 보타이,0,48,mini bowtie
몸/돼지 문신,0,48,pig tattoo
옷/분홍 우비,0,48,pink raincoat
소품/체크무늬 우산,0,48,plaid umbrella
소품/물방울무늬 가방,0,48,polka dot bag
소품/물방울무늬 담요,0,48,polka dot blanket
옷/아쿠아 하카마,0,47,aqua hakama
얼굴/검은 수염,0,47,black beard
소품/체크 반다나,0,47,checkered bandana
옷/짧은 코트,0,47,cropped coat
소품/십자가 팔찌,0,47,cross bracelet
옷/사슴 후드,0,47,deer hood
소품/이중 안대,0,47,double eyepatch
양말/그라데이션 양말,0,47,gradient socks
소품/하트 모양 병,0,47,heart-shaped bottle
자세/용 공 들기,0,47,holding dragon ball
자세/테이블 들기,0,47,holding table
배경/미니 크리스마스 나무,0,47,mini christmas tree
옷/체크무늬 사롱,0,47,plaid sarong
옷/무늬 멜빵바지,0,47,print overalls
소품/보라 티아라,0,47,purple tiara
옷/무지개 리본,0,47,rainbow bow
몸/광택 있는 뿔,0,47,shiny horns
옷/은색 치마,0,47,silver skirt
옷/얼룩진 유리 무늬,0,47,stained glass print
옷/세로줄 하카마,0,47,vertical-striped hakama
옷/젖은 앞치마,0,47,wet apron
옷/아쿠아 볼레로,0,46,aqua shrug
몸/아가일 피부,0,46,argyle skin
옷/등 파인 비키니 하의,0,46,backless bikini bottom
소품/검은 튤립,0,46,black tulip
소품/체크 가방,0,46,checkered bag
옷/체크 수영복,0,46,checkered swimsuit
옷/꽃무늬 무늬 레오타드,0,46,floral print leotard
양말/깅엄 체크 레그웨어,0,46,gingham legwear
소품/금색 꽃잎,0,46,gold petals
옷/그라데이션 수영복,0,46,gradient swimsuit
성인/초록 항문,0,46,green anus
동물/분홍 개,0,46,pink dog
옷/체크무늬 망토,0,46,plaid cape
소품/태양 헤일로,0,46,sun halo
양말/팽팽한 보디스타킹,0,46,taut bodystocking
옷/찢어진 튜닉,0,46,torn tunic
옷/찢어진 유니타드,0,46,torn unitard
옷/투톤 코르셋,0,46,two-tone corset
소품/벗은 캐미솔,0,46,unworn camisole
옷/아주 긴 베일,0,46,very long veil
소품/노란 담요,0,46,yellow blanket
옷/파란 롬퍼,0,45,blue romper
소품/꽃 단 왕관,0,45,flower-trimmed crown
속옷/초록 블루머,0,45,green bloomers
모자/하트 모양 보닛,0,45,heart-shaped bonnet
옷/레이스 달린 띠,0,45,lace-trimmed sash
속옷/가죽 팬티,0,45,leather panties
옷/기계 칼라,0,45,mechanical collar
옷/핀스트라이프 보타이,0,45,pinstripe bowtie
양말/보라 보디스타킹,0,45,purple bodystocking
몸/보라 발톱,0,45,purple claws
옷/보라 네글리제,0,45,purple negligee
얼굴/빨간 혀,0,45,red tongue
소품/뱀 마스크,0,45,snake mask
소품/딸기 장식,0,45,strawberry ornament
소품/봉제 별,0,45,stuffed star
옷/투명 리본,0,45,transparent bow
소품/노란 티아라,0,45,yellow tiara
소품/파란 검,0,44,blue sword
소품/갈색 자동차,0,44,brown car
성인/고양이 니플 패치,0,44,cat pasties
옷/칼라 있는 원피스 수영복,0,44,collared one-piece swimsuit
소품/유리 접시,0,44,glass plate
옷/그라데이션 망토(클로크),0,44,gradient cloak
모자/초록 챙 모자,0,44,green visor cap
소품/분홍 검,0,44,pink sword
옷/주름 기모노,0,44,pleated kimono
옷/보라 가터,0,44,purple garter
옷/보라 오버스커트,0,44,purple overskirt
양말/민소매 보디스타킹,0,44,sleeveless bodystocking
소품/가시 달린 마스크,0,44,spiked mask
옷/징 박힌 갑옷,0,44,studded armor
소품/투톤 반다나,0,44,two-tone bandana
신발/아쿠아 슬리퍼,0,43,aqua slippers
옷/망사 볼레로,0,43,fishnet shrug
성인/음식 재갈,0,43,food gag
몸/빛나는 발톱,0,43,glowing claws
옷/그라데이션 반바지,0,43,gradient shorts
동물/회색 개,0,43,grey dog
음식/레몬 주스,0,43,lemon juice
옷/짝짝이 바지,0,43,mismatched pants
옷/무늬 슬링샷 수영복,0,43,print slingshot swimsuit
옷/리본 단 가터,0,43,ribbon-trimmed garter
몸/점박이 피부,0,43,spotted skin
옷/젖은 장갑,0,43,wet gloves
동물/나무 물고기,0,43,wooden fish
배경/금 간 천장,0,42,cracked ceiling
옷/깃털 단 케이프,0,42,feather-trimmed capelet
소품/물고기 펜던트,0,42,fish pendant
옷/꽃무늬 무늬 리본,0,42,floral print ribbon
옷/금색 치마,0,42,gold skirt
옷/그라데이션 보디수트,0,42,gradient bodysuit
소품/회색 티아라,0,42,grey tiara
배경/하트 모양 구름,0,42,heart-shaped cloud
옷/레이스 달린 커프스,0,42,lace-trimmed cuffs
머리/레이스 달린 머리장식,0,42,lace-trimmed hair ornament
옷/레이스 달린 숄,0,42,lace-trimmed shawl
몸/잎 문신,0,42,leaf tattoo
옷/열린 수영복,0,42,open swimsuit
옷/주황 하오리,0,42,orange haori
옷/오버사이즈 벨트,0,42,oversized belt
옷/보라 슈미즈,0,42,purple chemise
옷/보라 샅바,0,42,purple loincloth
소품/별 반지,0,42,star ring
옷/줄무늬 슬링샷 수영복,0,42,striped slingshot swimsuit
동물/봉제 해파리,0,42,stuffed jellyfish
몸/호랑이 피부,0,42,tiger skin
속옷/박쥐 팬티,0,41,bat panties
소품/곰 귀걸이,0,41,bear earrings
옷/곰 잠옷,0,41,bear pajamas
배경/부서진 테이블,0,41,broken table
옷/십자가 수영복,0,41,cross swimsuit
옷/데님 비키니,0,41,denim bikini
옷/사선 줄무늬 드레스,0,41,diagonal-striped dress
옷/프릴 사롱,0,41,frilled sarong
머리/초록 머리 장식,0,41,green headdress
얼굴/초록 치아,0,41,green teeth
옷/회색 판초,0,41,grey poncho
옷/레이스 레오타드,0,41,lace leotard
옷/가죽 보디수트,0,41,leather bodysuit
소품/기계 검,0,41,mechanical sword
소품/물방울무늬 수건,0,41,polka dot towel
성인/보라 항문,0,41,purple anus
속옷/보라 티팬티,0,41,purple thong
옷/빨간 롬퍼,0,41,red romper
옷/광택 있는 치마,0,41,shiny skirt
옷/줄무늬 망토(클로크),0,41,striped cloak
소품/찢어진 완장,0,41,torn armband
옷/투톤 세일러 칼라,0,41,two-tone sailor collar
소품/벗은 하오리,0,41,unworn haori
얼굴/아주 긴 콧수염,0,41,very long mustache
옷/아쿠아 베일,0,40,aqua veil
소품/사탕 귀걸이,0,40,candy earrings
속옷/소 무늬 브라,0,40,cow print bra
옷/교차 끈 케이프,0,40,cross-laced capelet
소품/수정 장미,0,40,crystal rose
모자/꽃무늬 무늬 모자,0,40,floral print hat
옷/꽃 단 비키니,0,40,flower-trimmed bikini
신발/털 달린 슬리퍼,0,40,fur-trimmed slippers
동물/거대한 고양이,0,40,giant cat
소품/하트 모양 꽃잎,0,40,heart-shaped petals
옷/거대한 보타이,0,40,huge bowtie
옷/레이스 달린 슈미즈,0,40,lace-trimmed chemise
옷/헐렁한 목스카프,0,40,loose neckerchief
옷/패딩 갑옷,0,40,padded armor
소품/분홍 팬지,0,40,pink pansy
소품/물방울무늬 반다나,0,40,polka dot bandana
옷/보라 판초,0,40,purple poncho
동물/보라 뱀,0,40,purple snake
모자/빨간 바이저,0,40,red visor
옷/비치는 샅바,0,40,see-through loincloth
양말/짧은 레깅스,0,40,short leggings
옷/은색 원피스 수영복,0,40,silver one-piece swimsuit
옷/팽팽한 조끼,0,40,taut vest
양말/아쿠아 레깅스,0,39,aqua leggings
소품/아가일 베개,0,39,argyle pillow
옷/아가일 반바지,0,39,argyle shorts
동물/파란 뱀,0,39,blue snake
소품/나비 안대,0,39,butterfly eyepatch
소품/벚 목걸이,0,39,cherry necklace
자세/소매 들기,0,39,holding sleeve
소품/잎 돌,0,39,leaf stone
신발/기계 신발,0,39,mechanical shoes
소품/열린 해골,0,39,open skull
모자/주황 보닛,0,39,orange bonnet
속옷/분홍 티팬티,0,39,pink thong
옷/빨간 네글리제,0,39,red negligee
옷/투톤 후드,0,39,two-tone hood
옷/풀린 치마,0,39,undone skirt
소품/동물 등불,0,38,animal lantern
소품/아가일 초커,0,38,argyle choker
몸/곰 발바닥,0,38,bear paw
소품/새 귀걸이,0,38,bird earrings
옷/파란 슈미즈,0,38,blue chemise
옷/갈색 오버스커트,0,38,brown overskirt
양말/카모 니삭,0,38,camouflage thighhighs
머리/곱슬 앞머리,0,38,curly bangs
소품/가짜 휴대폰,0,38,fake phone
옷/털 달린 비키니 상의,0,38,fur-trimmed bikini top
자세/나비 들기,0,38,holding butterfly
옷/말 후드,0,38,horse hood
소품/큰 가방,0,38,large bag
옷/겹친 나이트가운,0,38,layered nightgown
몸/멀티컬러 귀,0,38,multicolored ears
옷/무늬 카디건,0,38,print cardigan
옷/보라 한복,0,38,purple hanbok
옷/무지개 드레스,0,38,rainbow dress
옷/산타 후드,0,38,santa hood
옷/비치는 조끼,0,38,see-through vest
소품/눈송이 핀,0,38,snowflake pin
옷/징 박힌 비키니,0,38,studded bikini
동물/봉제 표범,0,38,stuffed leopard
옷/아가일 케이프,0,37,argyle capelet
소품/곰 목걸이,0,37,bear necklace
모자/사탕 모자 장식,0,37,candy hat ornament
몸/짧은 꼬리,0,37,cropped tail
옷/교차 끈 코트,0,37,cross-laced coat
소품/용 검,0,37,dragon sword
몸/깃털 꼬리,0,37,feather tail
옷/꽃무늬 비키니,0,37,floral bikini
소품/털 달린 왕관,0,37,fur-trimmed crown
옷/깅엄 체크 리본,0,37,gingham ribbon
옷/그라데이션 로브,0,37,gradient robe
옷/초록 히잡,0,37,green hijab
자세/콧수염 들기,0,37,holding mustache
소품/가죽 마스크,0,37,leather mask
옷/멀티컬러 카디건,0,37,multicolored cardigan
얼굴/멀티컬러 입술,0,37,multicolored lips
양말/분홍 보디스타킹,0,37,pink bodystocking
옷/핀스트라이프 멜빵바지,0,37,pinstripe overalls
옷/주름 망토,0,37,pleated cape
옷/물방울무늬 스웨터,0,37,polka dot sweater
동물/보라 새,0,37,purple bird
소품/토끼 안대,0,37,rabbit eyepatch
양말/무지개 레그웨어,0,37,rainbow legwear
속옷/골지 브라,0,37,ribbed bra
옷/리본 단 망토,0,37,ribbon-trimmed cape
몸/은색 발톱,0,37,silver claws
배경/세로줄 벽,0,37,vertical-striped wall
성인/아쿠아 항문,0,36,aqua anus
속옷/박쥐 브라,0,36,bat bra
소품/나비 핀,0,36,butterfly pin
옷/그려진 리본,0,36,drawn bow
몸/가짜 흉터,0,36,fake scar
옷/그라데이션 하카마,0,36,gradient hakama
배경/매달린 의자,0,36,hanging chair
소품/말 조각상,0,36,horse statue
옷/레이스 달린 후드,0,36,lace-trimmed hood
옷/가죽 앞치마,0,36,leather apron
양말/보디스타킹 없음,0,36,no bodystocking
소품/왕관 없음,0,36,no crown
소품/오버사이즈 배낭,0,36,oversized backpack
소품/체크무늬 상자,0,36,plaid box
옷/체크무늬 코르셋,0,36,plaid corset
옷/체크무늬 띠,0,36,plaid sash
옷/주름 칼라,0,36,pleated collar
옷/보라 핫피,0,36,purple happi
옷/골지 점프수트,0,36,ribbed jumpsuit
눈/눈송이 눈동자,0,36,snowflake pupils
소품/가시 달린 사슬,0,36,spiked chain
옷/세로줄 점프수트,0,36,vertical-striped jumpsuit
소품/날개 달린 암릿,0,36,winged armlet
소품/아쿠아 반다나,0,35,aqua bandana
속옷/아가일 브라,0,35,argyle bra
소품/새 브로치,0,35,bird brooch
소품/갈색 보석,0,35,brown gem
옷/체크 숄,0,35,checkered shawl
양말/깅엄 체크 양말,0,35,gingham socks
머리/헝클어진 앞머리,0,35,messy bangs
옷/짝짝이 손목 커프스,0,35,mismatched wrist cuffs
눈/멀티컬러 흰자,0,35,multicolored sclera
옷/보타이 없음,0,35,no bowtie
소품/분홍 광선검,0,35,pink lightsaber
음식/무지개 케이크,0,35,rainbow cake
옷/리본 단 망토(클로크),0,35,ribbon-trimmed cloak
소품/비치는 풍선,0,35,see-through balloon
소품/별 안대,0,35,star eyepatch
소품/태양 펜던트,0,35,sun pendant
소품/장난감 트럭,0,35,toy truck
옷/노란 히잡,0,35,yellow hijab
옷/아쿠아 코르셋,0,34,aqua corset
옷/갈색 베이비돌,0,34,brown babydoll
옷/카모 수영복,0,34,camouflage swimsuit
옷/중국 학교 교복·제복,0,34,chinese school uniform
옷/소 무늬 보타이,0,34,cow print bowtie
소품/교차 끈 초커,0,34,cross-laced choker
속옷/꽃 단 팬티,0,34,flower-trimmed panties
동물/금색 뱀,0,34,gold snake
옷/회색 롬퍼,0,34,grey romper
양말/레이스 달린 팬티스타킹,0,34,lace-trimmed pantyhose
몸/잎 꼬리,0,34,leaf tail
몸/긴 동물 귀,0,34,long animal ears
얼굴/짝짝이 아이섀도,0,34,mismatched eyeshadow
옷/멀티컬러 칼라,0,34,multicolored collar
옷/열린 멜빵바지,0,34,open overalls
옷/돼지 후드,0,34,pig hood
옷/체크무늬 후드,0,34,plaid hood
옷/체크무늬 멜빵바지,0,34,plaid overalls
옷/무늬 갑옷,0,34,print armor
옷/무늬 점프수트,0,34,print jumpsuit
옷/보라 뷔스티에,0,34,purple bustier
옷/빨간 우비,0,34,red raincoat
옷/골지 볼레로,0,34,ribbed shrug
속옷/가시 달린 브라,0,34,spiked bra
소품/징 박힌 발찌,0,34,studded anklet
소품/벗은 케이프,0,34,unworn capelet
동물/아쿠아 새,0,33,aqua bird
배경/부서진 천장,0,33,broken ceiling
옷/나비 보타이,0,33,butterfly bowtie
옷/체크 비키니 상의,0,33,checkered bikini top
몸/수정 피부,0,33,crystal skin
몸/불타는 귀,0,33,flaming ears
옷/푹신한 칼라,0,33,fluffy collar
음식/개구리 달걀,0,33,frog egg
머리/깅엄 체크 머리띠,0,33,gingham hairband
옷/깅엄 체크 조끼,0,33,gingham vest
자세/곱창 머리끈 들기,0,33,holding scrunchie
옷/다중 끈 캐미솔,0,33,multi-strapped camisole
배경/체크무늬 커튼,0,33,plaid curtains
모자/무늬 헬멧,0,33,print helmet
동물/빨간 말,0,33,red horse
옷/리본 단 띠,0,33,ribbon-trimmed sash
옷/비치는 넥타이,0,33,see-through necktie
옷/짧은 코트,0,33,short coat
몸/은색 날개,0,33,silver wings
소품/해골 핀,0,33,skull pin
얼굴/투톤 아이섀도,0,33,two-tone eyeshadow
소품/벗은 로브,0,33,unworn robe
옷/아쿠아 베이비돌,0,32,aqua babydoll
소품/아쿠아 자동차,0,32,aqua car
옷/아쿠아 슬링샷 수영복,0,32,aqua slingshot swimsuit
옷/아가일 띠,0,32,argyle sash
성인/박쥐 니플 패치,0,32,bat pasties
소품/부서진 연필,0,32,broken pencil
소품/물고기 가방,0,32,fish bag
옷/망사 비키니,0,32,fishnet bikini
옷/꽃무늬 무늬 코트,0,32,floral print coat
옷/초록 한복,0,32,green hanbok
옷/초록 오버스커트,0,32,green overskirt
자세/똥머리 들기,0,32,holding bun
옷/레이스 달린 로브,0,32,lace-trimmed robe
옷/다중 끈 셔츠,0,32,multi-strapped shirt
소품/체크무늬 반다나,0,32,plaid bandana
옷/물방울무늬 망토,0,32,polka dot cape
소품/빨간 부채,0,32,red fan
소품/빨간 펜던트,0,32,red pendant
양말/줄무늬 힙하이,0,32,striped hiphighs
동물/봉제 거미,0,32,stuffed spider
옷/팽팽한 캐미솔,0,32,taut camisole
옷/찢어진 샅바,0,32,torn loincloth
옷/젖은 스웨터,0,32,wet sweater
몸/날개 달린 꼬리,0,32,winged tail
옷/아쿠아 세일러복,0,31,aqua serafuku
옷/카모 비키니 상의,0,31,camouflage bikini top
옷/카모 소매,0,31,camouflage sleeves
옷/체크 케이프,0,31,checkered capelet
옷/칼라 있는 카디건,0,31,collared cardigan
옷/사선 줄무늬 기모노,0,31,diagonal-striped kimono
머리/프릴 머리띠,0,31,frilled headband
소품/거대한 해골,0,31,giant skull
몸/그라데이션 비늘,0,31,gradient scales
옷/회색 베이비돌,0,31,grey babydoll
자세/이빨 들기,0,31,holding tooth
옷/라텍스 세일러복,0,31,latex serafuku
성인/잎 니플 패치,0,31,leaf pasties
몸/번개 문신,0,31,lightning bolt tattoo
옷/주황 판초,0,31,orange poncho
소품/무늬 안경,0,31,print eyewear
옷/보라 히잡,0,31,purple hijab
소품/빨간 팬지,0,31,red pansy
옷/리본 단 애스콧 타이,0,31,ribbon-trimmed ascot
소품/뱀 팔찌,0,31,snake bracelet
소품/가시 달린 티아라,0,31,spiked tiara
옷/점박이 치마,0,31,spotted skirt
모자/징 박힌 모자,0,31,studded hat
양말/징 박힌 레그웨어,0,31,studded legwear
소품/봉제 꽃,0,31,stuffed flower
머리/늑대 머리 장식,0,31,wolf headdress
모자/아쿠아 보닛,0,30,aqua bonnet
양말/등 파인 팬티스타킹,0,30,backless pantyhose
소품/검은 진주,0,30,black pearl
머리/카모 머리띠,0,30,camouflage hairband
소품/고양이 해골,0,30,cat skull
소품/체크 초커,0,30,checkered choker
배경/가짜 하늘,0,30,fake sky
소품/빛나는 사슬,0,30,glowing chain
소품/금색 장미,0,30,gold rose
소품/얼음 가방,0,30,ice bag
옷/겹친 칼라,0,30,layered collar
옷/가죽 코르셋,0,30,leather corset
옷/주황 롬퍼,0,30,orange romper
옷/체크무늬 민소매,0,30,plaid tank top
몸/물방울무늬 손톱,0,30,polka dot nails
모자/토끼 헬멧,0,30,rabbit helmet
얼굴/은색 입술,0,30,silver lips
소품/벗은 메이드 머리 장식,0,30,unworn maid headdress
옷/세로줄 민소매,0,30,vertical-striped tank top
소품/아쿠아 마스크,0,29,aqua mask
속옷/갈색 블루머,0,29,brown bloomers
옷/나비 리본,0,29,butterfly bow
옷/수정 무늬,0,29,crystal print
속옷/개 무늬 팬티,0,29,dog print panties
동물/프릴 상어,0,29,frilled shark
옷/털 달린 크롭탑,0,29,fur-trimmed crop top
소품/금색 방울,0,29,gold bell
몸/금색 꼬리,0,29,gold tail
소품/금색 깃털,0,29,golden feathers
옷/초록 샅바,0,29,green loincloth
소품/초록 검,0,29,green sword
옷/큰 칼라,0,29,large collar
신발/짝짝이 부츠,0,29,mismatched boots
얼굴/주황 치아,0,29,orange teeth
소품/종이 검,0,29,paper sword
옷/무늬 세일러 칼라,0,29,print sailor collar
동물/비치는 나비,0,29,see-through butterfly
옷/비치는 커프스,0,29,see-through cuffs
옷/점박이 리본,0,29,spotted bow
음식/봉제 바나나,0,29,stuffed banana
옷/투톤 튜닉,0,29,two-tone tunic
소품/벗은 스포츠 브라,0,29,unworn sports bra
소품/늑대 장식,0,29,wolf ornament
모자/아가일 보닛,0,28,argyle bonnet
옷/등 파인 재킷,0,28,backless jacket
동물/검은 용,0,28,black dragon
옷/나비 드레스,0,28,butterfly dress
속옷/벚 브라,0,28,cherry bra
머리/짧은 머리,0,28,cropped hair
머리/깃털 머리띠,0,28,feather hairband
모자/금색 모자,0,28,gold hat
모자/하트 모양 모자,0,28,heart-shaped hat
옷/레이스 케이프,0,28,lace capelet
배경/레이스 커튼,0,28,lace curtains
옷/레이스 달린 망토,0,28,lace-trimmed cape
양말/라텍스 팬티스타킹,0,28,latex pantyhose
옷/분홍 유니타드,0,28,pink unitard
옷/핀스트라이프 비키니,0,28,pinstripe bikini
몸/플라스틱 피부,0,28,plastic skin
소품/빨간 동전,0,28,red coin
옷/리본 단 캐미솔,0,28,ribbon-trimmed camisole
몸/은색 뿔,0,28,silver horns
소품/해골 펜던트,0,28,skull pendant
소품/뱀 반지,0,28,snake ring
옷/가시 달린 바지,0,28,spiked pants
음식/별 모양 초콜릿,0,28,star-shaped chocolate
소품/찢어진 책,0,28,torn book
옷/투톤 유니타드,0,28,two-tone unitard
옷/물 소매,0,28,water sleeves
속옷/젖은 블루머,0,28,wet bloomers
옷/아쿠아 벙어리장갑,0,27,aqua mittens
소품/아쿠아 꽃잎,0,27,aqua petals
옷/갈색 롬퍼,0,27,brown romper
옷/체크 후드티,0,27,checkered hoodie
소품/금 간 검,0,27,cracked sword
신발/데님 부츠,0,27,denim boots
옷/자수 장갑,0,27,embroidered gloves
옷/프릴 한푸,0,27,frilled hanfu
소품/거대한 책,0,27,giant book
성인/빛나는 항문,0,27,glowing anus
소품/빛나는 십자가,0,27,glowing cross
소품/빛나는 방패,0,27,glowing shield
옷/금색 사롱,0,27,gold sarong
음식/초록 주스,0,27,green juice
소품/금속 접시,0,27,metal plate
소품/달 돌,0,27,moon stone
소품/목걸이 없음,0,27,no necklace
옷/체크무늬 레오타드,0,27,plaid leotard
옷/물방울무늬 보디수트,0,27,polka dot bodysuit
옷/물방울무늬 케이프,0,27,polka dot capelet
옷/빨간 히잡,0,27,red hijab
배경/둥근 침대,0,27,round bed
옷/비치는 칼라,0,27,see-through collar
옷/비치는 판초,0,27,see-through poncho
옷/가시 달린 치마,0,27,spiked skirt
양말/세로줄 힙하이,0,27,vertical-striped hiphighs
옷/노란 뷔스티에,0,27,yellow bustier
속옷/아가일 팬티,0,26,argyle panties
소품/파란 펜던트,0,26,blue pendant
소품/파란 알약,0,26,blue pill
옷/카모 조끼,0,26,camouflage vest
머리/체크 머리장식,0,26,checkered hair ornament
옷/사선 줄무늬 목도리,0,26,diagonal-striped scarf
옷/깅엄 체크 목도리,0,26,gingham scarf
옷/빛나는 드레스,0,26,glowing dress
소품/금색 연꽃,0,26,gold lotus
옷/그라데이션 띠,0,26,gradient sash
옷/그라데이션 베일,0,26,gradient veil
모자/말 모자,0,26,horse hat
양말/니트 팬티스타킹,0,26,knit pantyhose
옷/레이스 달린 코트,0,26,lace-trimmed coat
옷/레이스 달린 코르셋,0,26,lace-trimmed corset
머리/미니 머리 리본,0,26,mini hair bow
소품/주황 왕관,0,26,orange crown
옷/패딩 셔츠,0,26,padded shirt
옷/분홍 뷔스티에,0,26,pink bustier
옷/핀스트라이프 넥타이,0,26,pinstripe necktie
소품/체크무늬 완장,0,26,plaid armband
소품/체크무늬 초커,0,26,plaid choker
옷/체크무늬 망토(클로크),0,26,plaid cloak
옷/플라스틱 장갑,0,26,plastic gloves
옷/물방울무늬 조끼,0,26,polka dot vest
몸/무늬 뿔,0,26,print horns
옷/무늬 샅바,0,26,print loincloth
소품/무늬 장식,0,26,print ornament
신발/무늬 샌들,0,26,print sandals
양말/무지개 니삭,0,26,rainbow thighhighs
소품/빨간 양초,0,26,red candle
소품/작은 동물 물 병,0,26,small animal water bottle
소품/뱀 암릿,0,26,snake armlet
소품/딸기 목걸이,0,26,strawberry necklace
소품/태양 십자가,0,26,sun cross
소품/찢어진 수건,0,26,torn towel
소품/장난감 칼,0,26,toy knife
옷/젖은 원피스 수영복,0,26,wet one-piece swimsuit
소품/사과 연필,0,25,apple pencil
옷/아쿠아 히잡,0,25,aqua hijab
모자/곰 모자 장식,0,25,bear hat ornament
옷/검은 우비,0,25,black raincoat
소품/갈색 베개,0,25,brown pillow
속옷/카모 스포츠 브라,0,25,camouflage sports bra
옷/체크 레오타드,0,25,checkered leotard
속옷/데님 팬티,0,25,denim panties
머리/가짜 머리,0,25,fake hair
얼굴/가짜 치아,0,25,fake teeth
옷/깃털 단 기모노,0,25,feather-trimmed kimono
옷/꽃무늬 무늬 하카마,0,25,floral print hakama
신발/프릴 신발,0,25,frilled shoes
옷/프릴 슬링샷 수영복,0,25,frilled slingshot swimsuit
옷/프릴 타바드,0,25,frilled tabard
옷/회색 한복,0,25,grey hanbok
음식/하트 모양 도넛,0,25,heart-shaped donut
얼굴/하트 모양 눈썹,0,25,heart-shaped eyebrows
소품/얼음 돌,0,25,ice stone
옷/니트 카디건,0,25,knit cardigan
옷/니트 수영복,0,25,knit swimsuit
옷/레이스 달린 뷔스티에,0,25,lace-trimmed bustier
머리/레이스 달린 머리 장식,0,25,lace-trimmed headdress
음식/레몬 케이크,0,25,lemon cake
옷/헐렁한 드레스,0,25,loose dress
얼굴/멀티컬러 치아,0,25,multicolored teeth
얼굴/치아 없음,0,25,no teeth
소품/주황 팬지,0,25,orange pansy
소품/분홍 발찌,0,25,pink anklet
옷/체크무늬 벙어리장갑,0,25,plaid mittens
옷/무늬 부루마,0,25,print buruma
신발/무늬 슬리퍼,0,25,print slippers
옷/무지개 벨트,0,25,rainbow belt
속옷/새틴 티팬티,0,25,satin thong
소품/은색 발찌,0,25,silver anklet
옷/얼룩진 수영복,0,25,stained swimsuit
옷/줄무늬 부루마,0,25,striped buruma
옷/흰 핫피,0,25,white happi
옷/캐주얼,0,63018,casual
소품/가시,0,62717,spikes
효과/숨결,0,62684,breath
눈/떨어진 연결된 눈,0,46122,disembodied linked eye
메타/1시간 그림 챌린지,0,45658,one-hour drawing challenge
모자/토킨,0,45490,tokin hat
옷/메이드 옷 입음,0,36881,enmaided
음식/주먹밥,0,9351,onigiri
소품/마이크 스탠드,0,9349,microphone stand
인원/여우 소년,0,9337,fox boy
몸/처진 가슴,0,9334,sagging breasts
자세/상대 팔에 손,0,9333,hand on another's arm
머리/사선 앞머리,0,9321,diagonal bangs
자세/새끼손가락 펴기,0,9320,pinky out
몸/안쪽 색이 다른 동물 귀,0,9309,colored inner animal ears
구도/원근,0,9296,perspective
인원/휴머노이드 로봇,0,9292,humanoid robot
인원/가족,0,9284,family
옷/구형 스쿨 수영복,0,9279,old school swimsuit
자세/음료 들기,0,9276,holding drink
자세/네 손가락 하트,0,9260,four-finger heart hands
효과/에너지,0,9224,energy
몸/젤리 발바닥,0,9222,pawpads
배경/가을,0,9212,autumn
인원/다크 엘프,0,9197,dark elf
효과/다리로 가림,0,9194,convenient leg
표정/변태 같은 표정,0,9171,pervert
인원/성별 불명,0,9159,ambiguous gender
배경/추상 배경,0,9148,abstract background
소품/체스 말,0,9136,chess piece
인원/좀비,0,9134,zombie
몸/V자 지느러미,0,9121,v-fin
얼굴/애교살,0,9118,aegyo sal
옷/반쯤 벗음,0,9108,partially undressed
성인/비키니 하의 젖힘,0,9099,bikini bottom aside
효과/움찔거림,0,9099,twitching
상태/깨문 자국,0,9085,bite mark
동물/까마귀,0,9080,crow
표정/사악한 웃음,0,9062,evil grin
표정/얀데레,0,9052,yandere
소품/삼각형,0,9042,triangle
메타/엉터리 영어 글자,0,9033,engrish text
자세/귀 내림,0,9029,ears down
소품/기둥,0,9011,pole
양말/부츠 속 니삭,0,8981,thighhighs under boots
소품/리볼버,0,8980,revolver
머리/들쭉날쭉 앞머리,0,8971,choppy bangs
옷/다이아 단추,0,8970,diamond button
동작/잠에서 깸,0,8969,waking up
몸/배 문신,0,8959,stomach tattoo
소품/돈,0,8945,money
효과/번개,0,8934,lightning
소품/키보드,0,8931,computer keyboard
소품/뿔 리본,0,8929,horn ribbon
인원/복제,0,8922,clone
자세/상대 머리에 손,0,8921,hand in another's hair
머리/월계관,0,8916,laurel crown
옷/고스 패션,0,8908,goth fashion
소품/목에 두른 수건,0,8891,towel around neck
성인/혼욕,0,8890,mixed-sex bathing
성인/자기 엉덩이 움켜쥠,0,8882,grabbing own ass
시선/동물 바라봄,0,8857,looking at animal
성인/가슴 들어올리기,0,8847,breast lift
성인/의심스러운 액체,0,8832,suggestive fluid
메타/메가진화 포켓몬,0,8827,mega pokemon
머리/닻 머리장식,0,8826,anchor hair ornament
음식/포도,0,8821,grapes
소품/닌텐도 스위치,0,8820,nintendo switch
소품/여러 귀걸이,0,8800,multiple earrings
모자/털모자,0,8798,fur hat
소품/태블릿,0,8796,tablet pc
인원/모자(엄마와 아들),0,8786,mother and son
인원/사람들,0,8782,people
소품/와인병,0,8780,wine bottle
소품/이어피스,0,8760,earpiece
배경/왕좌,0,8750,throne
옷/대비색 칼라,0,8747,contrast collar
자세/끈 잡기,0,8737,holding strap
소품/의료용 안대,0,8732,medical eyepatch
성인/살짝 보이는 음모,0,8729,pubic hair peek
배경/코타츠,0,8709,kotatsu
화풍/차분한 색,0,8701,muted colors
효과/스포트라이트,0,8692,spotlight
메타/말장난,0,8688,pun
자세/상대 허리에 손,0,8686,hand on another's waist
인원/사자 소녀,0,8673,lion girl
머리/머리 구슬,0,8667,hair beads
소품/보트,0,8657,boat
소품/기관총,0,8654,machine gun
몸/동물 발,0,8647,animal feet
소품/에너지 검,0,8637,energy sword
배경/황혼,0,8632,twilight
배경/문간,0,8606,doorway
옷/겹쳐 입은 옷,0,8585,layered clothes
음식/사케,0,8578,sake
소품/자전거,0,8570,bicycle
소품/귀 태그,0,8568,ear tag
구도/필러박스,0,8567,pillarboxed
소품/장미 꽃잎,0,8561,rose petals
옷/팔꿈치 보호대,0,8545,elbow pads
소품/팔걸이,0,8542,arm rest
소품/구슬 귀걸이,0,8540,sphere earrings
옷/코트 자락,0,8526,coattails
메타/앨범 표지,0,8505,album cover
동작/붓기,0,8495,pouring
얼굴/코 흉터,0,8491,scar on nose
옷/양면 재킷,0,8480,two-sided jacket
자세/상대 팔 잡기,0,8469,holding another's arm
자세/위를 가리킴,0,8466,pointing up
소품/막대,0,8463,stick
몸/꼬리 리본,0,8460,tail ribbon
소품/가시덤불,0,8459,thorns
동작/게임하기(비디오),0,8457,playing video games
모자/뒤로 쓴 모자,0,8455,backwards hat
동작/옷 입는 중,0,8452,dressing
배경/사물함,0,8433,locker
옷/허리에 맨 재킷,0,8429,jacket around waist
배경/도로 표지판,0,8426,road sign
인원/아기,0,8398,baby
자세/단검 들기,0,8398,holding dagger
얼굴/갈래 눈썹,0,8394,forked eyebrows
몸/팔털,0,8382,arm hair
머리/시스루 뱅,0,8379,wispy bangs
신발/짝짝이 신발,0,8375,asymmetrical footwear
자세/아이스바 들기,0,8362,holding popsicle
자세/양손으로 머리 만지기,0,8358,hands in own hair
자세/상대 가슴에 손,0,8338,hand on another's chest
상태/손상됨,0,8331,damaged
인원/군중,0,8325,crowd
소품/국자,0,8324,ladle
배경/안락의자,0,8312,armchair
눈/미친 눈,0,8311,crazy eyes
소품/석산(꽃),0,8305,spider lily
인원/남자 메이드,0,8297,male maid
자세/역수 쥐기,0,8295,reverse grip
몸/의수,0,8294,prosthetic arm
옷/꽈배기 니트,0,8292,cable knit
옷/가슴 커튼,0,8289,breast curtains
소품/꽂힌 검,0,8287,planted sword
옷/치마 속 사이클 바지,0,8273,bike shorts under skirt
몸/터질 듯한 가슴,0,8262,bursting breasts
옷/한쪽 눈 붕대,0,8256,bandage over one eye
옷/파워 아머,0,8251,power armor
동작/칼 뽑기,0,8251,unsheathing
몸/허벅지 점,0,8246,mole on thigh
자세/상대 얼굴에 양손,0,8236,hands on another's face
옷/오링 허벅지 끈,0,8230,o-ring thigh strap
인원/알비노,0,8228,albino
음식/대파,0,8223,spring onion
옷/빨간 테두리,0,8212,red trim
자세/상대 허벅지에 손,0,8199,hand on another's thigh
얼굴/부리,0,8191,beak
메타/로마자 글자,0,8184,romaji text
효과/비눗방울,0,8176,soap bubbles
동작/마스크 내림,0,8175,mask pull
동작/싸움,0,8170,fighting
소품/톱니바퀴,0,8146,gears
인원/비인간형 로봇,0,8129,non-humanoid robot
동작/내다봄,0,8123,peeking out
소품/배(큰 배),0,8112,ship
동물/병아리,0,8104,chick
상태/끼임,0,8101,wedgie
인원/역트랩,0,8098,reverse trap
구도/여성 시점,0,8065,female pov
소품/사무용 의자,0,8059,office chair
소품/모자 위 고글,0,8055,goggles on headwear
배경/별똥별,0,8050,shooting star
소품/시험관,0,8032,test tube
효과/변신,0,8014,transformation
구도/어깨 잘림,0,7953,cropped shoulders
표정/몸 홍조,0,7950,body blush
몸/가슴 문신,0,7891,breast tattoo
음식/마카롱,0,7880,macaron
옷/실크,0,7878,silk
자세/벤치에 앉음,0,7854,on bench
자세/팔짱 낀 둘,0,7852,locked arms
성인/색 있는 음모,0,7851,colored pubic hair
효과/상상,0,7851,imagining
음식/껌,0,7824,chewing gum
상태/립스틱 자국,0,7815,lipstick mark
몸/겨드랑이 살짝 보임,0,7801,armpit peek
인원/반인반수,0,7793,taur
표정/말풍선 꼬불선,0,7784,spoken squiggle
화풍/노란색 위주,0,7775,yellow theme
몸/큰 배,0,7774,big belly
자세/가운뎃손가락,0,7774,middle finger
옷/가슴 벨트,0,7767,chest belt
자세/발목 꼬기,0,7761,crossed ankles
동작/찌르기,0,7749,poking
몸/구미호 꼬리,0,7746,kyuubi
인원/새 소녀,0,7740,bird girl
효과/글리치,0,7737,glitch
소품/화살통,0,7722,quiver
몸/사자 꼬리,0,7716,lion tail
옷/갈색 니트 조끼,0,7714,brown sweater vest
표정/생각 중,0,7709,thinking
소품/주황 렌즈 안경,0,7702,orange-tinted eyewear
효과/죽음,0,7700,death
옷/붕대 감은 머리,0,7658,bandaged head
속옷/로우라이즈 팬티,0,7643,lowleg panties
옷/검은 신부 장갑,0,7641,black bridal gauntlets
소품/불투명 안경,0,7639,opaque glasses
소품/수국,0,7636,hydrangea
배경/물웅덩이,0,7629,puddle
옷/지뢰계 패션,0,7628,jirai kei
소품/봉투,0,7622,envelope
상태/출혈,0,7617,bleeding
옷/그리스 로마풍 옷,0,7605,greco-roman clothes
소품/산탄총,0,7605,shotgun
몸/링 피어싱,0,7604,ring piercing
소품/돌격 바이저,0,7603,assault visor
배경/화장실,0,7602,toilet
눈/X자 눈동자,0,7592,x-shaped pupils
머리/헤어팟,0,7586,hairpods
머리/A라인 단발,0,7567,inverted bob
인원/로봇 소녀,0,7520,robot girl
옷/성조기 무늬,0,7518,american flag print
표정/말풍선 느낌물음표,0,7514,spoken interrobang
자세/사람 위에 누움,0,7504,lying on person
소품/손목 리본,0,7501,wrist ribbon
몸/털 많음,0,7493,hairy
음식/레몬,0,7481,lemon
소품/펜던트 초커,0,7460,pendant choker
소품/자물쇠,0,7459,lock
옷/깊게 파인 네크라인,0,7459,plunging neckline
몸/날개 팔,0,7437,winged arms
표정/말풍선 분노 표시,0,7425,spoken anger vein
자세/붓 들기,0,7421,holding paintbrush
자세/팔 껴안기,0,7410,arm hug
인원/무용수,0,7403,dancer
머리/외줄 브릿지,0,7394,single hair streak
몸/빨판,0,7381,suction cups
배경/안개,0,7367,fog
소품/순록 뿔,0,7366,reindeer antlers
소품/말굽 장식,0,7361,horseshoe ornament
머리/당근 머리장식,0,7360,carrot hair ornament
속옷/브라 살짝 보임,0,7358,bra peek
자세/손가락 총,0,7358,finger gun
효과/반사되는 액체,0,7356,reflective liquid
화풍/알록달록,0,7347,colorful
옷/고양이 모양 뚫림,0,7343,cat cutout
효과/파편,0,7342,debris
상태/색 있는 피,0,7324,colored blood
상태/몸에 묻은 음식,0,7321,food on body
배경/거미줄,0,7310,spider web
옷/비치는 실루엣,0,7300,see-through silhouette
옷/옷 사이로 나온 꼬리,0,7299,tail through clothes
동작/노출,0,7282,flashing
효과/회절 빛살,0,7280,diffraction spikes
소품/크리스마스 장식,0,7278,christmas ornaments
메타/색 가이드,0,7270,color guide
신발/텐구 게타,0,7269,tengu-geta
소품/머리 위 수건,0,7251,towel on head
소품/접은 부채,0,7234,folded fan
자세/상대 허리에 팔,0,7221,arm around another's waist
소품/원,0,7221,circle
소품/호스,0,7219,hose
머리/앞머리 넘김,0,7216,bangs pinned back
메타/그림 프로그램 화면,0,7207,art program in frame
옷/우주복,0,7202,spacesuit
소품/야광봉,0,7199,glowstick
옷/단추 푼 셔츠,0,7197,unbuttoned shirt
효과/영주(령주),0,7194,command spell
소품/빨간 렌즈 안경,0,7193,red-tinted eyewear
소품/볼트액션,0,7189,bolt action
소품/조롱박,0,7187,gourd
자세/W자 팔,0,7176,w arms
효과/너무 많음,0,7167,too many
음식/귤,0,7162,mandarin orange
모자/요리사 모자,0,7137,chef hat
인원/부자,0,7137,father and son
소품/삼지창,0,7132,trident
성인/엉덩이 벌림,0,7131,spread ass
인원/퓨전,0,7122,fusion
메타/자막,0,7118,subtitled
성인/옷 위 결박,0,7111,shibari over clothes
메타/옷 입은 포켓몬,0,7109,clothed pokemon
자세/왕좌에 앉음,0,7103,on throne
머리/흘러내린 머리,0,7102,hair flowing over
자세/목에 팔,0,7088,arm around neck
자세/망치 들기,0,7086,holding hammer
머리/뼈 머리장식,0,7075,bone hair ornament
옷/과일 무늬,0,7073,fruit print
소품/목에 건 호루라기,0,7073,whistle around neck
성인/재치 검열,0,7057,novelty censor
몸/다리털,0,7049,leg hair
소품/빛나는 무기,0,7048,glowing weapon
모자/마법사 모자,0,7043,wizard hat
자세/깃발 들기,0,7036,holding flag
메타/초사이어인,0,7036,super saiyan
소품/바이올린,0,7017,violin
머리/낮게 묶은 옆머리,0,7008,low-tied sidelocks
소품/수술용 마스크,0,7007,surgical mask
머리/삼각 머리장식,0,7003,triangle hair ornament
소품/우주선,0,6999,spacecraft
자세/볼 맞대기,0,6975,cheek-to-cheek
자세/유연함,0,6963,flexible
효과/물감 튐,0,6963,paint splatter
옷/하고로모,0,6957,hagoromo
몸/바디페인팅,0,6955,bodypaint
음식/파르페,0,6947,parfait
메타/다른 모습,0,6946,alternate form
옷/가슴 틀,0,6933,framed breasts
배경/글자 배경,0,6926,text background
표정/입술 깨물기,0,6921,biting own lip
소품/도미노 마스크,0,6919,domino mask
동작/수영복 당기기,0,6916,one-piece swimsuit pull
소품/맥주 캔,0,6910,beer can
몸/기계 다리,0,6898,mechanical legs
배경/쇼지,0,6898,shouji
자세/뒤로 들기,0,6895,holding behind back
소품/피크,0,6880,plectrum
효과/에가스미(안개),0,6878,egasumi
소품/조준경,0,6872,scope
머리/뿔 모양 머리,0,6871,hair horns
눈/가로 눈동자,0,6871,horizontal pupils
인원/옷 입은 동물,0,6855,clothed animal
소품/코안경,0,6854,pince-nez
소품/드럼,0,6853,drum
자세/포켓몬 안기,0,6853,holding pokemon
소품/낚싯대,0,6848,fishing rod
눈/두꺼운 속눈썹,0,6830,thick eyelashes
자세/발가락 벌림,0,6828,spread toes
동작/비키니 상의 들어올림,0,6820,bikini top lift
소품/티슈 상자,0,6814,tissue box
인원/양 소녀,0,6807,sheep girl
소품/총알,0,6805,bullet
자세/야구 배트 들기,0,6798,holding baseball bat
옷/오비아게,0,6798,obiage
속옷/팬티 끈,0,6782,panty straps
자세/발가락 오므림,0,6780,toe scrunch
음식/팬케이크,0,6773,pancake
메타/트위터 로고,0,6771,twitter logo
머리/높은 옆 포니테일,0,6760,high side ponytail
몸/혀 피어싱,0,6760,tongue piercing
음식/컵케이크,0,6745,cupcake
모자/동물 귀 모자,0,6736,animal ear headwear
옷/바시티 재킷,0,6716,letterman jacket
얼굴/가려진 얼굴,0,6712,covered face
머리/외줄 머리고리,0,6711,single hair ring
옷/흰 테두리,0,6711,white trim
동물/갈매기,0,6697,seagull
표정/오므린 입술,0,6686,puckered lips
음식/채소,0,6683,vegetable
표정/흥분,0,6658,aroused
자세/업기,0,6658,piggyback
효과/탄막,0,6645,danmaku
인원/아우라,0,6644,au ra
동작/입에 문 머리끈,0,6643,hair tie in mouth
소품/레이피어,0,6637,rapier
동작/냄새 맡기,0,6626,smelling
신발/스케이트,0,6624,skates
자세/볼에 손가락,0,6622,finger to cheek
자세/시청자 조준,0,6621,aiming at viewer
옷/고대 이집트풍,0,6617,ancient egyptian
옷/어깨 스파이크,0,6617,shoulder spikes
소품/목에 건 고글,0,6616,goggles around neck
몸/화상 흉터,0,6615,burn scar
자세/옷 속에 손,0,6615,hand under clothes
소품/등에 멘 검,0,6615,sword on back
소품/쿠나이,0,6613,kunai
자세/컨트롤러 들기,0,6605,holding game controller
옷/빌려 입은 옷,0,6604,borrowed clothes
옷/물리법칙 무시 셔츠,0,6581,impossible shirt
소품/가방 장식,0,6565,bag charm
몸/귀 모양 흉터,0,6557,notched ear
옷/한쪽 손가락 없는 장갑,0,6550,single fingerless glove
자세/곰방대 들기,0,6546,holding smoking pipe
자세/기댐,0,6536,leaning
옷/흰 정장,0,6533,white suit
옷/마이크로 드레스,0,6526,microdress
옷/터틀넥 원피스,0,6522,turtleneck dress
소품/라틴 십자가,0,6520,latin cross
음식/생일 케이크,0,6518,birthday cake
옷/안대 비키니,0,6514,eyepatch bikini
효과/어안렌즈,0,6509,fisheye
자세/클립보드 들기,0,6509,holding clipboard
배경/도시 불빛,0,6508,city lights
소품/소울 젬,0,6490,soul gem
옷/와풍 메이드,0,6480,wa maid
배경/별자리,0,6462,constellation
자세/입 가리기(손),0,6462,hand over own mouth
자세/자기 다리에 손,0,6458,hand on own leg
인원/하피,0,6458,harpy
소품/초승달 귀걸이,0,6444,crescent earrings
구도/여러 4컷 만화,0,6443,multiple 4koma
동물/동양 용,0,6437,eastern dragon
동작/수영,0,6432,swimming
옷/이브닝 드레스,0,6425,evening gown
동작/키스 후,0,6421,after kiss
메타/누드 표지,0,6421,nude cover
동작/던지기,0,6419,throwing
소품/서류가방,0,6417,briefcase
상태/베인 상처,0,6415,cuts
효과/무대 조명,0,6415,stage lights
소품/메가폰,0,6413,megaphone
표정/말풍선 캐릭터,0,6412,spoken character
옷/티백 레오타드,0,6412,thong leotard
옷/고대 그리스풍 옷,0,6394,ancient greek clothes
음식/치즈,0,6392,cheese
소품/리모컨,0,6388,remote control
소품/플루트,0,6379,flute
소품/흰 테 안경,0,6364,white-framed eyewear
소품/시데,0,6362,shide
배경/반짝이 배경,0,6362,sparkle background
화풍/초현실,0,6354,surreal
메타/캐릭터 설정표,0,6347,character profile
옷/변형 바니걸,0,6346,nontraditional playboy bunny
장르/특촬,0,6342,tokusatsu
효과/불씨,0,6334,embers
효과/붉은 실(운명),0,6325,string of fate
소품/화분,0,6322,flower pot
자세/상대 골반에 손,0,6322,hand on another's hip
음식/사과사탕,0,6319,candy apple
효과/높은음자리표,0,6318,treble clef
성인/다리 위 체액,0,6312,cum on legs
동작/샤워,0,6310,showering
소품/서예 붓,0,6303,calligraphy brush
모자/뿔 투구,0,6301,horned helmet
소품/베이스 기타,0,6299,bass guitar
인원/아이들끼리,0,6299,kodomo doushi
옷/잠옷류,0,6297,sleepwear
옷/소매 리본,0,6297,sleeve bow
소품/뽑은 칼,0,6289,unsheathed
성인/벌어짐,0,6288,gaping
소품/노란 테 안경,0,6288,yellow-framed eyewear
얼굴/피부 송곳니,0,6284,skin fangs
음식/찐빵,0,6282,steamed bun
소품/렌치,0,6275,wrench
얼굴/콧구멍,0,6274,nostrils
소품/화장품,0,6267,cosmetics
음식/초밥,0,6260,sushi
옷/검은 가터 끈,0,6254,black garter straps
자세/방아쇠에 손가락,0,6252,finger on trigger
성인/작은 음경,0,6249,small penis
자세/크게 벌린 다리,0,6249,wide spread legs
소품/허벅지 파우치,0,6247,thigh pouch
옷/거미줄 무늬,0,6244,spider web print
동작/상대 입에 손가락,0,6236,finger in another's mouth
옷/깃발 무늬 비키니,0,6222,flag print bikini
`;var nr=globalThis.__duskLib?.["src/engine/aistop.js"];if(!nr)throw new Error("Dusk 코어에 src/engine/aistop.js가 없어요 — Dusk를 업데이트해 주세요");{let e=["STOP_MSG","__resetAiStop","activeCount","activeTasks","aiTask","describeAi","isStopError","justStopped","onAiChange","stopAll","stopError","trackAi","trackedRunLLM"].filter(n=>!(n in nr));if(e.length)throw new Error("Dusk 본체가 이 애드온보다 오래됐어요(src/engine/aistop.js에 없는 기능: "+e.slice(0,3).join(", ")+") — Dusk를 업데이트해 주세요")}var{STOP_MSG:Ri,__resetAiStop:Bi,activeCount:Vi,activeTasks:Ki,aiTask:Hi,describeAi:Gi,isStopError:bt,justStopped:va,onAiChange:Wi,stopAll:Yi,stopError:xa,trackAi:Ca,trackedRunLLM:Ji}=nr;var io=["k_euler_ancestral","k_euler","k_dpmpp_2s_ancestral","k_dpmpp_2m","k_dpmpp_sde","k_dpmpp_2m_sde","ddim_v3"],lo=["k_euler_ancestral","k_euler","k_dpmpp_2s_ancestral","k_dpmpp_2m_sde","k_dpmpp_2m","k_dpmpp_sde"],ft={v5:!1,samplers:io,vibe:!0,reference:!0,varietyPlus:!0,transparent:!1},tr=e=>({v5:!0,samplers:lo,maxScale:10,maxSteps:50,maxChars:32,tokens:e,vibe:!1,reference:!1,varietyPlus:!1,transparent:!0,forcedNoise:"karras"}),kt=[{id:"5-full",label:"V5 Full",gen:"nai-diffusion-5-full",inpaint:"nai-diffusion-5-full-inpainting",...tr(1471)},{id:"5-full-medium",label:"V5 Medium",gen:"nai-diffusion-5-full-medium",inpaint:"nai-diffusion-5-full-medium-inpainting",...tr(1471),noCfgRescale:!0,fixed:{steps:14,sampler:"k_euler_ancestral",uc:"heavy"}},{id:"5-curated",label:"V5 Curated",gen:"nai-diffusion-5-curated",inpaint:"nai-diffusion-4-5-curated-inpainting",...tr(703)},{id:"4-5-full",label:"V4.5 Full",gen:"nai-diffusion-4-5-full",inpaint:"nai-diffusion-4-5-full-inpainting",...ft},{id:"4-5-curated",label:"V4.5 Curated",gen:"nai-diffusion-4-5-curated",inpaint:"nai-diffusion-4-5-curated-inpainting",...ft},{id:"4-full",label:"V4 Full",gen:"nai-diffusion-4-full",inpaint:"nai-diffusion-4-full-inpainting",...ft},{id:"4-curated",label:"V4 Curated",gen:"nai-diffusion-4-curated-preview",inpaint:"nai-diffusion-4-curated-inpainting",...ft}],Le=e=>kt.find(n=>n.id===e)??kt.find(n=>n.id==="4-5-full"),sr={k_euler_ancestral:"Euler Ancestral",k_euler:"Euler",k_dpmpp_2s_ancestral:"DPM++ 2S Ancestral",k_dpmpp_2m:"DPM++ 2M",k_dpmpp_sde:"DPM++ SDE",k_dpmpp_2m_sde:"DPM++ 2M SDE",ddim_v3:"DDIM"},or=["native","karras","exponential","polyexponential"],ke={portrait:{width:832,height:1216,label:"세로"},landscape:{width:1216,height:832,label:"가로"},square:{width:1024,height:1024,label:"정사각"},small_portrait:{width:512,height:768,label:"작은 세로"},small_landscape:{width:768,height:512,label:"작은 가로"},small_square:{width:640,height:640,label:"작은 정사각"},large_portrait:{width:1024,height:1536,label:"큰 세로"},large_landscape:{width:1536,height:1024,label:"큰 가로"},large_square:{width:1472,height:1472,label:"큰 정사각"},wallpaper_portrait:{width:1088,height:1920,label:"배경화면 세로"},wallpaper_landscape:{width:1920,height:1088,label:"배경화면 가로"}},Qi={portrait:ke.portrait,landscape:ke.landscape,square:ke.square},Tn=(e,n,a=28)=>e*n<=1024*1024&&a<=28;function Ze(e,n){let a=s=>Math.max(64,Math.min(2048,Math.round((Number(s)||0)/64)*64));return{width:a(e),height:a(n)}}var co={"4-5-full":", very aesthetic, masterpiece, no text","4-5-curated":", location, masterpiece, no text, -0.8::feet::, rating:general","4-full":", no text, best quality, very aesthetic, absurdres","4-curated":", rating:general, amazing quality, very aesthetic, absurdres"},po={standard:"very aesthetic, masterpiece, no text",light:"very aesthetic, amazing quality, no text",none:""},ir={standard:"표준",light:"가벼움",none:"없음"},Pa="nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page",ja="lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page",$a="{worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic",rr={heavy:ja,light:"lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::",humanFocus:ja+", @_@, mismatched pupils, glowing eyes, bad anatomy",furryFocus:$a},lr={"5-full":rr,"5-full-medium":rr,"5-curated":rr,"4-5-full":{heavy:Pa,light:"nsfw, lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page",humanFocus:Pa+", @_@, mismatched pupils, glowing eyes, bad anatomy",furryFocus:"nsfw, "+$a},"4-5-curated":{heavy:"blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page",light:"blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page",humanFocus:"blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page"},"4-full":{heavy:"nsfw, blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page",light:"nsfw, blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page"},"4-curated":{heavy:"blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts, white blank page, blank page",light:"blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, logo, dated, signature"}},za={heavy:"강함",light:"약함",humanFocus:"인물 중심",furryFocus:"퍼리 중심",none:"없음"},dr=e=>["heavy","light","humanFocus","furryFocus","none"].filter(n=>n==="none"||lr[e]?.[n]!==void 0),ar=(e,n)=>!n||n==="none"?"none":lr[e]?.[n]!==void 0?n:"none",On=(e,n)=>{let a=ar(e,n);return a==="none"?"":lr[e]?.[a]??""};function ho(e,n,a,s=!1){let i=e;if(s&&(i=i?`transparent background, ${i}`:"transparent background"),a==="none")return i;if(Le(n).v5){let t=po[a];return t?i?`${i}, ${t}`:t:i}return i+(co[n]??"")}var uo=(e,n,a)=>{let s=On(n,a);return s?e?`${s}, ${e}`:s:e},go={heavy:0,light:1,furryFocus:2,humanFocus:3,none:4},mo={none:0,heavy:2,light:3,humanFocus:4,furryFocus:5},bo={standard:1,light:3,none:0};function wt(e){return!e||e.indexOf("::")<0?e:e.replace(/(-?\d*\.?\d+::)([^:]*?)(::)/g,(n,a,s,i)=>{if(!s.trim())return n;let t=s;return/^\d/.test(t)&&(t=" "+t),/\d$/.test(t)&&(t=t+" "),a+t+i})}var fo={model:"4-5-full",sampler:"k_euler_ancestral",steps:28,scale:5,cfgRescale:0,noise:"karras",quality:"standard",ucPreset:"heavy",varietyPlus:!1,transparent:!1,useCoords:!1,legacyUc:!1,normalizeVibes:!0};function fn(e){let n={...fo,...e&&typeof e=="object"?e:{}},a=Le(n.model);n.model=a.id,a.samplers.includes(n.sampler)||(n.sampler="k_euler_ancestral"),n.steps=Math.max(1,Math.min(a.maxSteps??50,Math.round(Number(n.steps)||28))),n.scale=Math.max(0,Math.min(a.maxScale??10,Number(n.scale)||0)),n.cfgRescale=Math.max(0,Math.min(1,Number(n.cfgRescale)||0)),or.includes(n.noise)||(n.noise="karras"),n.quality in ir||(n.quality="standard"),dr(a.id).includes(n.ucPreset)||(n.ucPreset="heavy");for(let s of["varietyPlus","transparent","useCoords","legacyUc","normalizeVibes"])n[s]=!!n[s];return n}function Fn({prompt:e,uc:n="",width:a=832,height:s=1216,size:i,seed:t,settings:l,action:p="generate",image:b,mask:f,strength:w=.7,noise:M=0,addOriginal:m=!0,chars:$=[],vibes:L=[],refs:G=[]}={}){let Z=String(e??"").trim();if(!Z)throw new Error("프롬프트를 적어 주세요");i&&ke[i]&&({width:a,height:s}=ke[i]);let h=fn(l),N=Le(h.model),R=N.v5,U=N.fixed,X=U?U.sampler:h.sampler,he=R?h.quality:h.quality==="none"?"none":"standard",V=R&&N.transparent&&h.transparent,oe=wt(ho(Z,N.id,he,V)),ee=U?U.uc:h.ucPreset,ne=U?On(N.id,U.uc):wt(uo(String(n??""),N.id,h.ucPreset)),Ce=Number.isInteger(t)&&t>0?t>>>0:1+Math.floor(Math.random()*4294967294),y=P=>({caption:{base_caption:P,char_captions:[]}}),v;R?(v={params_version:4,width:a,height:s,noise_schedule:N.forcedNoise,scale:Math.min(h.scale,N.maxScale??h.scale),sampler:X,steps:U?U.steps:Math.min(h.steps,N.maxSteps??h.steps),noise:M,seed:Ce,n_samples:1,negative_prompt:ne,strength:w,characterPrompts:[],use_coords:h.useCoords,cfg_rescale:h.cfgRescale,skip_cfg_above_sigma:null,prefer_brownian:X==="k_euler_ancestral",deliberate_euler_ancestral_bug:!1,tag_hint_qt:bo[he],tag_hint_uc_preset:mo[ar(N.id,ee)],tag_hint_transparent_background:V,v4_prompt:{...y(oe),use_coords:h.useCoords,use_order:!0},v4_negative_prompt:y(ne)},N.noCfgRescale&&delete v.cfg_rescale):v={params_version:3,width:a,height:s,noise_schedule:h.noise,controlnet_strength:1,dynamic_thresholding:!1,scale:h.scale,sampler:X,steps:h.steps,noise:M,seed:Ce,n_samples:1,ucPreset:go[ar(N.id,h.ucPreset)],negative_prompt:ne,strength:w,qualityToggle:he!=="none",characterPrompts:[],use_coords:h.useCoords,legacy:!1,legacy_v3_extend:!1,prefer_brownian:!0,autoSmea:!1,legacy_uc:h.legacyUc,inpaintImg2ImgStrength:w,cfg_rescale:h.cfgRescale,add_original_image:m,normalize_reference_strength_multiple:h.normalizeVibes,skip_cfg_above_sigma:null,v4_prompt:{...y(oe),use_coords:h.useCoords,use_order:!0},v4_negative_prompt:{...y(ne),legacy_uc:h.legacyUc}};let C={input:oe,model:p==="infill"?N.inpaint:N.gen,action:p,parameters:v};R&&(C.use_new_shared_trial=!0),R&&p==="infill"&&(v.add_original_image=m);let A=(L??[]).filter(P=>P?.image);if(!R&&A.length){v.reference_image_multiple=A.map(E=>E.image);let P=A.map(E=>Number(E.strength??.6));if(h.normalizeVibes&&P.length>1){let E=P.reduce((H,j)=>H+j,0)||1;P=P.map(H=>H/E)}v.reference_strength_multiple=P}let q=(G??[]).filter(P=>P?.image);if(!R&&q.length&&(v.director_reference_images=q.map(P=>P.image),v.director_reference_descriptions=q.map(P=>({...y(P.type||"character"),legacy_uc:h.legacyUc})),v.director_reference_strength_values=q.map(P=>P.strength??.6),v.director_reference_secondary_strength_values=q.map(P=>1-(P.fidelity??1)),v.director_reference_information_extracted=q.map(P=>P.info??1)),b&&(v.image=b),f&&(v.mask=f),p==="infill"&&(v.img2img={strength:w,begin_from_sigma:null,noise:0,extra_noise_seed:Ce,color_correct:!0},X==="ddim_v3"&&(v.sampler="k_euler_ancestral")),p==="img2img"&&(v.img2img={strength:w,begin_from_sigma:null,noise:M,extra_noise_seed:Ce,color_correct:!0}),X==="k_euler_ancestral"&&(v.deliberate_euler_ancestral_bug=!1),!R&&h.varietyPlus&&!q.length){let P=N.id.startsWith("4-5")?58:N.id.startsWith("4-")?19:0;v.skip_cfg_above_sigma=P*Math.sqrt(a*s/(832*1216))}let x=($??[]).map(P=>({prompt:wt(String(P?.prompt??"")),uc:U?"":wt(String(P?.uc??"")),center:h.useCoords&&Number.isFinite(P?.x)?{x:P.x,y:P.y}:{x:.5,y:.5}})).filter(P=>P.prompt.trim()).slice(0,N.maxChars??99);return x.length&&(v.characterPrompts=x,v.v4_prompt.caption.char_captions=x.map(P=>({char_caption:P.prompt,centers:[P.center]})),v.v4_negative_prompt.caption.char_captions=x.map(P=>({char_caption:P.uc,centers:[P.center]}))),C}var en={"bg-removal":"배경 지우기",lineart:"선화",sketch:"스케치",colorize:"채색",emotion:"표정 바꾸기",declutter:"정리(글자·잡것 지우기)"},Ma=["neutral","happy","sad","angry","scared","surprised","tired","excited","nervous","thinking","confused","shy","disgusted","smug","bored","laughing","irritated","aroused","embarrassed","worried","love","determined","hurt","playful"];function Aa({method:e,image:n,width:a,height:s,prompt:i="",emotion:t="neutral",defry:l=0}){if(!en[e])throw new Error("알 수 없는 디렉터 도구예요");let p={image:n,req_type:e,width:a,height:s};return(e==="colorize"||e==="emotion")&&(p.prompt=e==="emotion"?`${t};;${i}`:i,p.defry=l),p}var wo="nai-diffusion-5-curated";function _a(e,n){let a=e*n;if(!(e>0&&n>0)||a>3145728)throw new Error("업스케일은 3,145,728픽셀 이하 그림만 돼요");return a<=1048576?1:a<=1747627?2:a<=2446678?3:4}var Sa=e=>({image:e,model:wo,declared_blur_sigma:0}),La=(e,n,a)=>({image:e,model:Le(a).gen,information_extracted:n});function yt(e,n,{last:a=!1}={}){let s=new DataView(e.buffer,e.byteOffset,e.byteLength);if(e.length<30||s.getUint32(0,!0)!==67324752)throw new Error("받은 파일이 zip이 아니에요");let i=-1;for(let $=e.length-22;$>=Math.max(0,e.length-65557);$--)if(s.getUint32($,!0)===101010256){i=$;break}let t=0,l=s.getUint16(8,!0),p=s.getUint32(18,!0);if(i>=0){let $=s.getUint16(i+10,!0),L=s.getUint32(i+16,!0);if(L+46>e.length||s.getUint32(L,!0)!==33639248)throw new Error("zip 목록이 깨졌어요");for(let G=0;G<(a?$:1)&&s.getUint32(L,!0)===33639248;G++)l=s.getUint16(L+10,!0),p=s.getUint32(L+20,!0),t=s.getUint32(L+42,!0),L+=46+s.getUint16(L+28,!0)+s.getUint16(L+30,!0)+s.getUint16(L+32,!0)}else if(s.getUint16(6,!0)&8||!p)throw new Error("zip 끝을 찾지 못했어요(받다 끊겼을 수 있어요)");let b=s.getUint16(t+26,!0),f=s.getUint16(t+28,!0),w=t+30+b+f;if(w+p>e.length)throw new Error("zip 내용이 잘렸어요");let M=e.subarray(w,w+p),m=l===0?M.slice():l===8?n(M):null;if(!m)throw new Error(`zip 압축 방식 ${l}은 못 풀어요`);return{name:new TextDecoder().decode(e.subarray(t+30,t+30+b)),data:m}}var vt=e=>e?.[0]===137&&e?.[1]===80&&e?.[2]===78&&e?.[3]===71;function wn(e){if(!vt(e)||e.length<24)return null;let n=new DataView(e.buffer,e.byteOffset,e.byteLength);return{width:n.getUint32(16),height:n.getUint32(20)}}var qa=["additionalAssets","emotionImages","assets"];function Ea(e,n,a){let s=String(a??"").trim()||"image",i=new Set(qa.flatMap(t=>(e?.[t]??[]).map(l=>String(l?.[0]??"").toLowerCase())));if(!i.has(s.toLowerCase()))return s;for(let t=2;;t++)if(!i.has(`${s}_${t}`.toLowerCase()))return`${s}_${t}`}function Ia(e,n,a,s,i="png"){if(!qa.includes(n))throw new Error(`알 수 없는 에셋 자리예요: ${n}`);let t=n==="emotionImages"?[a,s]:[a,s,i];return{...e,[n]:[...e?.[n]??[],t]}}var Je={};no(Je,{MAX_IMAGES:()=>pr,MAX_JOBS:()=>Ra,addChar:()=>yn,addFolder:()=>vn,addImage:()=>Kn,addScene:()=>At,applyCup:()=>Ar,charCover:()=>gr,charOf:()=>ge,clearPicks:()=>St,clearReserve:()=>Lt,countIn:()=>$o,coverOf:()=>sn,cupDone:()=>$r,cupPair:()=>qt,cupPick:()=>zr,cupRoundLabel:()=>Mr,duplicateChar:()=>Ct,duplicateScene:()=>Bn,emptyProject:()=>Va,emptySettings:()=>Ba,favImages:()=>yr,folderPromptFor:()=>Ha,folderTemplateFor:()=>Un,foldersOf:()=>jo,hasFav:()=>an,imageCount:()=>ur,markSent:()=>xr,middleFor:()=>ln,moveChars:()=>Rn,moveFolder:()=>Pt,moveScene:()=>zo,moveScenesToChar:()=>wr,normalizeProject:()=>kn,ownPrompt:()=>nn,pathOf:()=>Mt,pickCount:()=>Pn,pickedImages:()=>We,placeFolder:()=>br,planJobs:()=>Ye,removeChar:()=>hr,removeFolder:()=>jt,removeImages:()=>Cn,removeScenes:()=>kr,reorderChars:()=>Po,reorderScenes:()=>fr,reserveAll:()=>on,reserveNoFav:()=>vr,reserveSummary:()=>Cr,rowChars:()=>Ke,sceneOf:()=>se,scenesNoFav:()=>Hn,seedFor:()=>Pr,setImage:()=>tn,setMember:()=>$t,setPicks:()=>rn,setReserve:()=>Ee,setSettings:()=>ze,setSlots:()=>Vn,sizeFor:()=>gn,sortScenes:()=>_t,sortedImages:()=>Ne,startCup:()=>jr,stepSeed:()=>Wa,uniqueSceneName:()=>xn,updateChar:()=>Fe,updateFolder:()=>Nn,updateScene:()=>Pe,view:()=>zt});var ko=e=>String(e??"").replace(/##[\s\S]*?##/g,""),Ve=e=>ko(e).replace(/\r\n?|\n/g,",").split(",").map(n=>n.trim()).filter(Boolean);function Ta(e,n=Math.random){let a=i=>i[Math.min(i.length-1,Math.floor(n()*i.length))],s=i=>{let t="";for(let l=0;l<i.length;l++){if(i[l]!=="{"){t+=i[l];continue}let p=1,b=-1,f=[];for(let w=l+1;w<i.length;w++)if(i[w]==="{")p++;else if(i[w]==="}"){if(--p===0){b=w;break}}else i[w]==="|"&&p===1&&f.push(w);if(b<0){t+=i.slice(l);break}if(!f.length)t+=`{${s(i.slice(l+1,b))}}`;else{let w=[],M=l+1;for(let m of f)w.push(i.slice(M,m)),M=m+1;w.push(i.slice(M,b)),t+=s(a(w).trim())}l=b}return t};return s(String(e??""))}function yo(e,n){let a=n.slice(1,-1),s=a.indexOf(".");if(s<1)throw new Error(`올바르지 않은 조각 문법 "${n}" — <모음.조각> 꼴로 써요`);let i=(e??[]).find(l=>l.name===a.slice(0,s));if(!i)throw new Error(`없는 조각 모음 "${a.slice(0,s)}"`);let t=i.pieces.find(l=>l.name===a.slice(s+1));if(!t)throw new Error(`없는 조각 "${n}"`);return t}var vo=e=>e.length>2&&e[0]==="<"&&e[e.length-1]===">";function cr(e,n,a=Math.random,s=new Set,i={n:0}){if(!vo(e))return[e];if(s.has(e))throw new Error(`조각이 자기 자신을 불러요: ${e}`);if(s.size>=50||++i.n>1e4)throw new Error(`조각이 너무 깊게 겹쳐 있어요: ${e}`);let t=yo(n,e);s.add(e);try{let l=t.prompt??"";if(t.multi){let p=l.split(/\r\n?|\n/).filter(b=>Ve(b).length);l=p.length?p[Math.min(p.length-1,Math.floor(a()*p.length))]:""}return Ve(l).flatMap(p=>cr(p,n,a,s,i))}finally{s.delete(e)}}var xo=(e,n,a=Math.random)=>Ve(e).flatMap(s=>cr(s,n,a)).join(", ");function Co(e,n){let a=[],s=0,i=0,t=0;for(;s<e.length&&i<n.length;)if(t===0){if(e[s]==="|"){t=1,s++;continue}a.push(e[s++])}else{if(n[i]==="|"){t=0,i++;continue}a.push(n[i++])}for(;s<e.length;s++)e[s]!=="|"&&a.push(e[s]);for(;i<n.length;i++)n[i]!=="|"&&a.push(n[i]);return a}var Oa=e=>(e??[]).filter(n=>n&&n.on!==!1);function De(e){if(!e?.length)return 1;let n=1;for(let a of e)if(n*=Oa(a).length,!n)return 0;return n}function Fa(e,n){let a=[],s=Math.max(0,Math.floor(n));for(let i=(e?.length??0)-1;i>=0;i--){let t=Oa(e[i]);if(!t.length)return null;a[i]=t[s%t.length],s=Math.floor(s/t.length)}return a}var Da=e=>(e??[]).map(n=>n?.prompt??"").filter(n=>n.trim()).join(", ");function un({top:e="",own:n="",middle:a="",back:s=""},i=[],t=Math.random){let l=[...Ve(e),...Ve(n)],p=[...Co(l,Ve(a)),...Ve(s)];return Ta(p.flatMap(b=>cr(b,i,t)).join(", "),t)}var Dn=(e,n=[],a=Math.random)=>Ta(xo(e,n,a),a);function Na(e){let n=String(e??""),a=[],s=(p,b)=>{if(!p)return;let f=a[a.length-1];f&&f.kind===b?f.text+=p:a.push({text:p,kind:b})},i=/##[\s\S]*?##|-?\d*\.?\d+::[\s\S]*?::|<[^<>\n]+>|\{+[^{}\n]*\}+|\[+[^[\]\n]*\]+|\|/g,t=0,l;for(;l=i.exec(n);){s(n.slice(t,l.index),"text");let p=l[0],b="text";if(p.startsWith("##"))b="comment";else if(p.includes("::")){let f=parseFloat(p);b=f<0?"weight-neg":f<1?"weight-down":"weight-up"}else p[0]==="<"?b="piece":p[0]==="{"?b=p.includes("|")?"random":"brace":p[0]==="["?b="bracket":p==="|"&&(b="pipe");s(p,b),t=l.index+p.length}return s(n.slice(t),"text"),a}var pr=300,Ra=500,ue=(e,n=8e3)=>String(e??"").slice(0,n),Ge=()=>Math.random().toString(36).slice(2,10),Ae=(e,n)=>Number.isFinite(Number(e))?Number(e):n;function Ba(){return{top:"",back:"",neg:"",seed:{mode:"random",value:0},size:{mode:"scene",w:832,h:1216},sampling:fn(null),chars:[],vibes:[],refs:[],reserveDefault:1}}function Va(){return{v:2,settings:Ba(),pieces:[],chars:[],folders:[]}}function Ka(e){return!e||typeof e.path!="string"||!e.path?null:{path:e.path,seed:Number.isFinite(e.seed)?e.seed:null,at:Ae(e.at,0),prompt:ue(e.prompt),rank:Number.isFinite(e.rank)?e.rank:null,fav:!!e.fav,pick:!!e.pick,w:Ae(e.w,0),h:Ae(e.h,0),from:typeof e.from=="string"?e.from.slice(0,20):"",sent:typeof e.sent=="string"?e.sent.slice(0,200):""}}function Ua(e){if(!e||typeof e.id!="string"||!e.id)return null;let n=(Array.isArray(e.slots)?e.slots:[]).filter(Array.isArray).map(s=>s.filter(i=>i&&typeof i=="object").map(i=>({prompt:ue(i.prompt),on:i.on!==!1}))),a=(Array.isArray(e.images)?e.images:[]).map(Ka).filter(Boolean).slice(0,pr);return{id:e.id,name:ue(e.name,80)||"씬",slots:n,size:typeof e.size=="string"?e.size:"",reserve:Math.max(0,Math.min(99,Math.round(Ae(e.reserve,0)))),cover:typeof e.cover=="string"?e.cover:"",memo:ue(e.memo,2e3),images:a}}function kn(e){let n=Va();if(!e||typeof e!="object")return n;let a=e.v!==2,s=a?{top:e.top,neg:e.neg,size:{mode:e.size&&ke[e.size]?e.size:"scene"}}:e.settings??{},i={top:ue(s.top),back:ue(s.back),neg:ue(s.neg),seed:{mode:["random","fixed","chain"].includes(s.seed?.mode)?s.seed.mode:"random",value:Math.max(0,Math.floor(Ae(s.seed?.value,0)))>>>0},size:{mode:s.size?.mode==="custom"||s.size?.mode==="scene"||ke[s.size?.mode]?s.size.mode:"scene",...Ze(Ae(s.size?.w,832),Ae(s.size?.h,1216))},sampling:fn(s.sampling),chars:(Array.isArray(s.chars)?s.chars:[]).filter(m=>m&&typeof m=="object").slice(0,32).map(m=>({id:typeof m.id=="string"?m.id:Ge(),prompt:ue(m.prompt),uc:ue(m.uc),x:Math.max(.1,Math.min(.9,Ae(m.x,.5))),y:Math.max(.1,Math.min(.9,Ae(m.y,.5))),on:m.on!==!1})),vibes:(Array.isArray(s.vibes)?s.vibes:[]).filter(m=>m&&typeof m.path=="string").slice(0,16).map(m=>({id:typeof m.id=="string"?m.id:Ge(),path:m.path,strength:Math.max(0,Math.min(1,Ae(m.strength,.6))),info:Math.max(0,Math.min(1,Ae(m.info,1))),on:m.on!==!1,enc:m.enc&&typeof m.enc.data=="string"?{model:ue(m.enc.model,40),info:Ae(m.enc.info,1),data:m.enc.data}:null})),refs:(Array.isArray(s.refs)?s.refs:[]).filter(m=>m&&typeof m.path=="string").slice(0,2).map(m=>({id:typeof m.id=="string"?m.id:Ge(),path:m.path,strength:Math.max(0,Math.min(1,Ae(m.strength,.6))),fidelity:Math.max(0,Math.min(1,Ae(m.fidelity,1))),type:["character","style","character&style"].includes(m.type)?m.type:"character&style",on:m.on!==!1})),reserveDefault:Math.max(1,Math.min(20,Math.round(Ae(s.reserveDefault,1))))},t=(Array.isArray(e.pieces)?e.pieces:[]).filter(m=>m&&typeof m.name=="string"&&m.name).map(m=>({name:ue(m.name,40).replace(/[.<>,]/g,""),pieces:(Array.isArray(m.pieces)?m.pieces:[]).filter($=>$&&typeof $.name=="string"&&$.name).map($=>({name:ue($.name,40).replace(/[.<>,]/g,""),prompt:ue($.prompt),multi:!!$.multi}))})),l=(Array.isArray(e.chars)?e.chars:[]).filter(m=>m&&typeof m.id=="string"&&m.id).map(m=>{let $=(Array.isArray(m.scenes)?m.scenes:[]).map(Ua).filter(Boolean);return a&&!m.scenes&&($=[Ua({id:`${m.id}-default`,name:"default",images:m.images??[],cover:m.cover})]),{id:m.id,name:ue(m.name,80)||"이름 없음",prompt:ue(m.prompt),cover:typeof m.cover=="string"&&!a?m.cover:"",scenes:$}}),p=new Set(l.map(m=>m.id)),b=(Array.isArray(e.folders)?e.folders:[]).filter(m=>m&&typeof m.id=="string"&&m.id),f=new Set(b.map(m=>m.id)),w=b.map(m=>({id:m.id,name:ue(m.name,80)||"새 폴더",kind:m.kind==="outfit"||m.kind==="group"?m.kind:"",prompt:ue(m.prompt),tpl:ue(m.tpl,120),parent:typeof m.parent=="string"&&f.has(m.parent)&&m.parent!==m.id?m.parent:null,members:[...new Set((Array.isArray(m.members)?m.members:[]).filter($=>p.has($)))]})),M=new Map(w.map(m=>[m.id,m]));for(let m of w){let $=new Set([m.id]),L=m.parent;for(;L;){if($.has(L)){m.parent=null;break}$.add(L),L=M.get(L)?.parent??null}}return{v:2,settings:i,pieces:t,chars:l,folders:w}}var ze=(e,n)=>({...e,settings:{...e.settings,...n}});function yn(e,{name:n="",prompt:a=""}={},s=Ge){let i=s();return{...e,chars:[...e.chars,{id:i,name:ue(n,80).trim()||"새 캐릭터",prompt:ue(a),cover:"",scenes:[{id:s(),name:"default",slots:[],size:"",reserve:0,cover:"",memo:"",images:[]}]}]}}var Fe=(e,n,a)=>({...e,chars:e.chars.map(s=>s.id===n?{...s,...a,id:s.id}:s)}),hr=(e,n)=>({...e,chars:e.chars.filter(a=>a.id!==n),folders:e.folders.map(a=>({...a,members:a.members.filter(s=>s!==n)}))});function Ct(e,n,a=Ge){let s=e.chars.find(p=>p.id===n);if(!s)return e;let i=a(),t={...structuredClone(s),id:i,name:`${s.name} 사본`,cover:"",scenes:s.scenes.map(p=>({...structuredClone(p),id:a(),images:[],cover:"",reserve:0}))},l=e.chars.findIndex(p=>p.id===n);return{...e,chars:[...e.chars.slice(0,l+1),t,...e.chars.slice(l+1)],folders:e.folders.map(p=>p.members.includes(n)?{...p,members:[...p.members,i]}:p)}}var ge=(e,n)=>e.chars.find(a=>a.id===n)??null,ur=e=>(e?.scenes??[]).reduce((n,a)=>n+a.images.length,0);function gr(e){if(!e)return"";if(e.cover&&e.scenes.some(n=>n.images.some(a=>a.path===e.cover)))return e.cover;for(let n of e.scenes){let a=sn(n);if(a)return a}return""}function vn(e,{name:n="",kind:a="",parent:s=null,prompt:i=""}={},t=Ge){let l=s&&e.folders.some(p=>p.id===s)?s:null;return{...e,folders:[...e.folders,{id:t(),name:ue(n,80).trim()||"새 폴더",kind:a==="outfit"||a==="group"?a:"",prompt:ue(i),parent:l,members:[]}]}}function Nn(e,n,{name:a,kind:s,prompt:i,tpl:t}){return{...e,folders:e.folders.map(l=>l.id===n?{...l,...a!=null?{name:ue(a,80).trim()||l.name}:{},...s!=null?{kind:s}:{},...i!=null?{prompt:ue(i)}:{},...t!=null?{tpl:ue(t,120)}:{}}:l)}}function Ha(e,n){let a=new Map(e.folders.map(t=>[t.id,t])),s=new Set,i=[];for(let t of e.folders){if(!t.members.includes(n))continue;let l=[];for(let p=t;p&&l.length<50;p=p.parent?a.get(p.parent):null)l.unshift(p);for(let p of l)s.has(p.id)||(s.add(p.id),String(p.prompt??"").trim()&&i.push(p.prompt.trim()))}return i.join(", ")}function Un(e,n){let a=new Map(e.folders.map(s=>[s.id,s]));for(let s=a.get(n),i=0;s&&i<50;s=s.parent?a.get(s.parent):null,i++)if(s.tpl)return s.tpl;return""}var nn=(e,n)=>[Ha(e,n.id),String(n.prompt??"").trim()].filter(Boolean).join(", "),mr=(e,n)=>{let a=new Set([n]);for(let s=!0;s;){s=!1;for(let i of e.folders)i.parent&&a.has(i.parent)&&!a.has(i.id)&&(a.add(i.id),s=!0)}return a};function Pt(e,n,a){if(a&&mr(e,n).has(a))throw new Error("폴더를 자기 안으로 옮길 수 없어요");return{...e,folders:e.folders.map(s=>s.id===n?{...s,parent:a||null}:s)}}var jt=(e,n)=>{let a=mr(e,n);return{...e,folders:e.folders.filter(s=>!a.has(s.id))}};function $t(e,n,a,s){return{...e,folders:e.folders.map(i=>{if(i.id!==n)return i;let t=i.members.includes(a);return s&&!t?{...i,members:[...i.members,a]}:!s&&t?{...i,members:i.members.filter(l=>l!==a)}:i})}}var Ga=(e,n,a)=>{let s=a?e.indexOf(a):-1;if(s<0)return null;for(;s<e.length&&n.has(e[s]);)s++;return e[s]??null},xt=(e,n,a)=>{let s=new Set(n),i=n.filter(b=>e.includes(b)),t=e.filter(b=>!s.has(b)),l=Ga(e,s,a),p=l?t.indexOf(l):t.length;return[...t.slice(0,p),...i,...t.slice(p)]};function Rn(e,n,{from:a=null,to:s=null,before:i=null,copy:t=!1}={}){let l=n.filter(f=>e.chars.some(w=>w.id===f));if(!l.length||s&&!e.folders.some(f=>f.id===s))return e;let p=e.folders,b=e.chars;if(s)p=p.map(f=>{if(f.id===s){let w=f.members.filter($=>!l.includes($)),M=f.members.includes(i)?Ga(f.members,new Set(l),i):null,m=M&&w.includes(M)?w.indexOf(M):w.length;return{...f,members:[...w.slice(0,m),...l,...w.slice(m)]}}return!t&&a&&f.id===a?{...f,members:f.members.filter(w=>!l.includes(w))}:f});else{!t&&a&&(p=p.map(M=>M.id===a?{...M,members:M.members.filter(m=>!l.includes(m))}:M));let f=xt(b.map(M=>M.id),l,i),w=new Map(b.map(M=>[M.id,M]));b=f.map(M=>w.get(M))}return{...e,folders:p,chars:b}}function Po(e,n,a,s){if(!n){let i=new Map(e.chars.map(t=>[t.id,t]));return{...e,chars:xt(e.chars.map(t=>t.id),a,s).map(t=>i.get(t))}}return{...e,folders:e.folders.map(i=>i.id===n?{...i,members:xt(i.members,a,s)}:i)}}function br(e,n,a,s=null){let i=Pt(e,n,a||null),t=i.folders.find(b=>b.id===n);if(!t)return e;let l=i.folders.filter(b=>b.id!==n),p=s&&s!==n?l.findIndex(b=>b.id===s):-1;if(p<0){let b=l.map((f,w)=>(f.parent??null)===(t.parent??null)?w:-1).filter(f=>f>=0).pop();return{...i,folders:[...l.slice(0,(b??l.length-1)+1),t,...l.slice((b??l.length-1)+1)]}}return{...i,folders:[...l.slice(0,p),t,...l.slice(p)]}}function fr(e,n,a,s){return He(e,n,i=>{let t=new Map(i.map(l=>[l.id,l]));return xt(i.map(l=>l.id),a,s).map(l=>t.get(l))})}function wr(e,n,a,s,{copy:i=!1,mkId:t=Ge}={}){if(n===s)return e;let l=ge(e,n),p=ge(e,s);if(!l||!p)return e;let b=l.scenes.filter(M=>a.includes(M.id));if(!b.length)return e;let f=p,w=b.map(M=>{let m=xn(f,M.name),$=i?{...structuredClone(M),id:t(),name:m,images:[],cover:"",reserve:0}:{...M,name:m};return f={...f,scenes:[...f.scenes,$]},$});return{...e,chars:e.chars.map(M=>M.id===s?f:M.id===n&&!i?{...M,scenes:M.scenes.filter(m=>!a.includes(m.id)),cover:l.cover&&b.some(m=>m.images.some($=>$.path===l.cover))?"":M.cover}:M)}}var jo=(e,n)=>e.folders.filter(a=>a.members.includes(n));function zt(e,n){let a=new Map(e.chars.map(i=>[i.id,i])),s=e.folders.filter(i=>(i.parent??null)===(n??null));if(!n){let i=new Set(e.folders.flatMap(t=>t.members));return{folders:s,chars:e.chars.filter(t=>!i.has(t.id))}}return{folders:s,chars:(e.folders.find(i=>i.id===n)?.members??[]).map(i=>a.get(i)).filter(Boolean)}}function Ke(e,n){let a=new Map(e.chars.map(i=>[i.id,i])),s=new Set;for(let i of mr(e,n))for(let t of e.folders.find(l=>l.id===i)?.members??[])s.add(t);return[...s].map(i=>a.get(i)).filter(Boolean)}var $o=(e,n)=>Ke(e,n).length;function Mt(e,n){let a=new Map(e.folders.map(i=>[i.id,i])),s=[];for(let i=a.get(n);i&&s.length<50;i=i.parent?a.get(i.parent):null)s.unshift(i);return s}var He=(e,n,a)=>Fe(e,n,{scenes:a(ge(e,n)?.scenes??[])});function At(e,n,{name:a="",prompt:s=""}={},i=Ge){let t={id:i(),name:ue(a,80).trim()||"새 씬",slots:s.trim()?[[{prompt:ue(s),on:!0}]]:[],size:"",reserve:0,cover:"",memo:"",images:[]};return He(e,n,l=>[...l,t])}var Pe=(e,n,a,s)=>He(e,n,i=>i.map(t=>t.id===a?{...t,...s,id:t.id}:t)),kr=(e,n,a)=>{let s=new Set(a);return He(e,n,i=>i.filter(t=>!s.has(t.id)))};function Bn(e,n,a,s=Ge){return He(e,n,i=>{let t=i.findIndex(p=>p.id===a);if(t<0)return i;let l={...structuredClone(i[t]),id:s(),name:`${i[t].name} 사본`,images:[],cover:"",reserve:0};return[...i.slice(0,t+1),l,...i.slice(t+1)]})}function zo(e,n,a,s){return He(e,n,i=>{let t=i.findIndex(b=>b.id===a);if(t<0)return i;let l=[...i],[p]=l.splice(t,1);return l.splice(Math.max(0,Math.min(l.length,s)),0,p),l})}var _t=(e,n,a="asc")=>He(e,n,s=>[...s].sort((i,t)=>i.name.localeCompare(t.name,"ko")*(a==="desc"?-1:1))),se=(e,n,a)=>ge(e,n)?.scenes.find(s=>s.id===a)??null;function xn(e,n){let a=String(n??"").trim()||"새 씬",s=new Set((e?.scenes??[]).map(i=>i.name.toLowerCase()));if(!s.has(a.toLowerCase()))return a;for(let i=2;;i++)if(!s.has(`${a} ${i}`.toLowerCase()))return`${a} ${i}`}var Vn=(e,n,a,s)=>Pe(e,n,a,{slots:s.map(i=>i.map(t=>({prompt:ue(t.prompt),on:t.on!==!1})))});function Kn(e,n,a,s,i=Date.now){let t=se(e,n,a);return t?Pe(e,n,a,{images:[Ka({...s,at:i()}),...t.images].filter(Boolean).slice(0,pr)}):e}function Cn(e,n,a,s){let i=se(e,n,a),t=new Set(s);if(!i)return e;let l=Pe(e,n,a,{images:i.images.filter(b=>!t.has(b.path)),cover:t.has(i.cover)?"":i.cover}),p=ge(l,n);return p&&t.has(p.cover)&&(l=Fe(l,n,{cover:""})),l}function tn(e,n,a,s,i){let t=se(e,n,a);return t?Pe(e,n,a,{images:t.images.map(l=>l.path===s?{...l,...i,path:l.path}:l)}):e}function rn(e,n,a,s,i){let t=se(e,n,a),l=new Set(s);return t?Pe(e,n,a,{images:t.images.map(p=>l.has(p.path)?{...p,pick:!!i}:p)}):e}var St=(e,n,a=null)=>He(e,n,s=>s.map(i=>!a||i.id===a?{...i,images:i.images.map(t=>t.pick?{...t,pick:!1}:t)}:i)),Pn=e=>(e?.images??[]).filter(n=>n.pick).length,yr=(e,n=null)=>(e?.scenes??[]).filter(a=>!n||a.id===n).flatMap(a=>Ne(a).filter(s=>s.fav).map(s=>({sid:a.id,name:a.name,path:s.path,sent:s.sent||""}))),an=e=>(e?.images??[]).some(n=>n.fav),Hn=e=>(e?.scenes??[]).filter(n=>!an(n));function vr(e,n,a){var s=ge(e,n);if(!s)return e;var i=Hn(s).map(t=>t.id);return i.length?on(e,n,a,i):e}function xr(e,n,a,s,i){var t=se(e,n,a);return t?Pe(e,n,a,{images:t.images.map(l=>l.path===s?{...l,sent:String(i).slice(0,200)}:l)}):e}var We=(e,n=null)=>(e?.scenes??[]).filter(a=>!n||a.id===n).flatMap(a=>Ne(a).filter(s=>s.pick).map(s=>({sid:a.id,name:a.name,path:s.path})));function Ne(e){return[...e?.images??[]].sort((n,a)=>(n.rank??1e9)-(a.rank??1e9)||Number(a.fav)-Number(n.fav)||a.at-n.at)}function sn(e){return e?.images?.length?e.cover&&e.images.some(n=>n.path===e.cover)?e.cover:Ne(e)[0].path:""}var Ee=(e,n,a,s)=>Pe(e,n,a,{reserve:Math.max(0,Math.min(99,Math.round(s)))}),on=(e,n,a,s=null)=>He(e,n,i=>i.map(t=>!s||s.includes(t.id)?{...t,reserve:Math.max(0,Math.min(99,t.reserve+a))}:t)),Lt=(e,n)=>n?He(e,n,a=>a.map(s=>({...s,reserve:0}))):{...e,chars:e.chars.map(a=>({...a,scenes:a.scenes.map(s=>({...s,reserve:0}))}))};function Ye(e,n=null){let a=[];for(let s of e.chars)if(!(n&&s.id!==n))for(let i of s.scenes){let t=De(i.slots);for(let l=0;l<i.reserve;l++)for(let p=0;p<t;p++){if(a.length>=Ra)return a;a.push({cid:s.id,sid:i.id,combo:p})}}return a}function Cr(e,n=null){let s=e.chars.filter(i=>!n||i.id===n).flatMap(i=>i.scenes);return{reserved:s.filter(i=>i.reserve>0).length,scenes:s.length,jobs:Ye(e,n).length,combos:s.reduce((i,t)=>i+De(t.slots),0)}}var ln=(e,n)=>Da(Fa(e?.slots??[],n)??[]);function Wa(e){return e=e>>>0,e^=e<<13,e>>>=0,e^=e>>>17,e^=e<<5,e>>>=0,Math.max(1,e)}function Pr(e,n,a=Math.random){let s=e?.value>>>0;if(e?.mode==="fixed"&&s)return s;if(e?.mode==="chain"&&s){let i=s;for(let t=0;t<n;t++)i=Wa(i);return i}return 1+Math.floor(a()*4294967294)}function gn(e,n){let a=i=>ke[i]?{width:ke[i].width,height:ke[i].height}:null,s=i=>{let t=/^(\d+)x(\d+)$/.exec(i??"");return t?Ze(t[1],t[2]):null};return e?.mode==="custom"?Ze(e.w,e.h):e?.mode&&e.mode!=="scene"?a(e.mode)??a("portrait"):a(n?.size)??s(n?.size)??a("portrait")}function jr(e,n=Math.random){let a=[...new Set(e)];for(let s=a.length-1;s>0;s--){let i=Math.floor(n()*(s+1));[a[s],a[i]]=[a[i],a[s]]}return a.length<=1?{players:a,next:[],at:0,size:a.length,ranks:a[0]?{[a[0]]:1}:{},total:a.length,done:!0}:{players:a,next:[],at:0,size:a.length,ranks:{},total:a.length,done:!1}}var $r=e=>!!e?.done;function qt(e){return e.players.length-e.at>=2?[e.players[e.at],e.players[e.at+1]]:null}function zr(e,n){let a=qt(e);if(!a)return e;let s=a[n?1:0],i=a[n?0:1],t={...e,next:[...e.next,s],at:e.at+2,ranks:{...e.ranks,[i]:Math.floor(e.size/2)+1}};return Mo(t)}function Mo(e){if(e.players.length-e.at>=2)return e;let n=e.players.length-e.at===1?[e.players[e.at]]:[],a=[...e.next,...n];return a.length<=1?{...e,players:a,next:[],at:0,size:a.length,ranks:a[0]?{...e.ranks,[a[0]]:1}:e.ranks,done:!0}:{...e,players:a,next:[],at:0,size:a.length}}var Mr=e=>e.done?"끝":e.size<=2?"결승":e.size<=4?"4강":`${e.size}강`;function Ar(e,n,a,s){let i=se(e,n,a);return i?Pe(e,n,a,{images:i.images.map(t=>s[t.path]!=null?{...t,rank:s[t.path]}:t)}):e}var Ao="https://image.novelai.net",Ya="dusk.sdstudio.token",Ja="dusk.sdstudio.presets",Xa="dusk.sdstudio.templates",Qa="dusk.sdstudio.tokens",Za="dusk.sdstudio.prefs",_o=["https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/data/sdstudio/tags_v5.csv.gz","https://cdn.jsdelivr.net/gh/Pyser08/Dusk-Atelier@main/data/sdstudio/tags_v5.csv.gz","https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/SD-Studio/data/sdstudio/tags_v5.csv.gz"],_r="dusk.sdstudio.tagsgz",dn=null,Gn=null;async function ns(e,n="webp",a=.85){if(n!=="webp"&&n!=="avif")return{data:e,ext:"png",fellBack:!1};let s=await createImageBitmap(new Blob([e],{type:"image/png"})),i=async t=>{if(typeof OffscreenCanvas=="function"){let p=new OffscreenCanvas(s.width,s.height);return p.getContext("2d").drawImage(s,0,0),p.convertToBlob({type:t,quality:a})}let l=Object.assign(document.createElement("canvas"),{width:s.width,height:s.height});return l.getContext("2d").drawImage(s,0,0),new Promise(p=>l.toBlob(p,t,a))};try{let t=await i(`image/${n}`),l=!1,p=n;if((!t||t.type!==`image/${n}`)&&(t=await i("image/webp"),p="webp",l=n==="avif"),!t||t.type!=="image/webp"&&p==="webp")return{data:e,ext:"png",fellBack:!0};let b=new Uint8Array(await t.arrayBuffer());return b.length<e.length?{data:b,ext:p,fellBack:l}:{data:e,ext:"png",fellBack:l}}finally{s.close?.()}}var So=e=>e?.kind==="module"?`dusk.sdstudio.m.${e.id}`:`dusk.sdstudio.p.${e?.id}`;function jn(e){let n="";for(let a=0;a<e.length;a+=32768)n+=String.fromCharCode.apply(null,e.subarray(a,a+32768));return btoa(n)}async function es(e){if(e instanceof Uint8Array)return e;if(e instanceof ArrayBuffer)return new Uint8Array(e);let n=e?.body;if(n instanceof Uint8Array)return n;if(n instanceof ArrayBuffer)return new Uint8Array(n);if(n&&typeof n.getReader=="function"){let a=n.getReader(),s=[],i=0;for(;;){let{done:p,value:b}=await a.read();if(p)break;s.push(b),i+=b.length}let t=new Uint8Array(i),l=0;for(let p of s)t.set(p,l),l+=p.length;return t}if(typeof e?.arrayBuffer=="function")return new Uint8Array(await e.arrayBuffer());if(typeof e?.text=="function")return new TextEncoder().encode(await e.text());if(typeof n=="string")return new TextEncoder().encode(n);throw new Error("응답을 읽지 못했어요")}function Lo(e,n){let a="";try{let s=new TextDecoder().decode(n.subarray(0,2e3));try{a=JSON.parse(s)?.message??s}catch{a=s}}catch{}return e===401?"토큰이 맞지 않아요. 토큰을 다시 넣어 주세요":e===402?"Anlas가 모자라거나 구독이 필요해요":e===429?"요청이 너무 잦아요. 잠시 뒤 다시 해 주세요":`NovelAI 오류 ${e}${a?`: ${String(a).slice(0,200)}`:""}`}function ts(e){let n="",a=async()=>{try{return await e.getLocalPluginStorage?.()??null}catch{return null}},s=async(b,f,w)=>{if(typeof e.nativeFetch=="function")try{return await e.nativeFetch(b,f)}catch(M){if(typeof fetch!="function")throw M}return fetch(b,{...f,signal:w})},i=()=>e.pluginStorage,t=b=>typeof b=="string"?`dusk.sdstudio.p.${b}`:So(b),l=b=>ga(ca(b[0]===31&&b[1]===139?ut(b):b)+`
`+ya),p={to:b=>{let f="";for(let w=0;w<b.length;w+=32768)f+=String.fromCharCode(...b.subarray(w,w+32768));return btoa(f)},from:b=>Uint8Array.from(atob(b),f=>f.charCodeAt(0))};return{tags(){return dn},async loadTags({download:b=!0}={}){return dn||Gn||(Gn=(async()=>{let f=await a();try{let M=await f?.getItem?.(_r);if(M)return dn=l(p.from(String(M)))}catch{}if(!b)return null;let w=null;for(let M of _o)try{let m=await s(M,{method:"GET"});if(!m?.ok&&m?.status)throw new Error(`HTTP ${m.status}`);let $=await es(m);if($.length<1e5)throw new Error("파일이 너무 작아요");dn=l($);try{await f?.setItem?.(_r,p.to($))}catch{}return dn}catch(m){w=m}throw new Error(`태그 사전을 받지 못했어요: ${w?.message??w}`)})().finally(()=>{Gn=null}),Gn)},async loadTagsFromBytes(b){dn=l(b);let f=await a();try{let w=b[0]===31&&b[1]===139?b:null;w&&await f?.setItem?.(_r,p.to(w))}catch{}return dn},async loadProject(b){try{let f=await i()?.getItem(t(b));return kn(f?typeof f=="string"?JSON.parse(f):f:null)}catch{return kn(null)}},async saveProject(b,f){await i()?.setItem(t(b),JSON.stringify(f))},async loadPresets(){try{let b=await i()?.getItem(Ja),f=b?typeof b=="string"?JSON.parse(b):b:[];return Array.isArray(f)?f:[]}catch{return[]}},async savePresets(b){await i()?.setItem(Ja,JSON.stringify(b))},async getToken(){let b=await a();try{let f=await b?.getItem?.(Ya);if(f)return String(f)}catch{}return n},async setToken(b){n=String(b??"").trim();let f=await a();try{await f?.setItem?.(Ya,n)}catch{}},async getLocal(b,f){let w=await a();try{let M=await w?.getItem?.(b);return M?typeof M=="string"?JSON.parse(M):M:f}catch{return f}},async setLocal(b,f){let w=await a();try{await w?.setItem?.(b,JSON.stringify(f))}catch{}},async getPrefs(){return{putSlot:"additionalAssets",nameStyle:"scene",putFormat:"webp",putQuality:.85,dup:"number",keys:{},boost:!1,...await this.getLocal(Za,{})}},async setPrefs(b){let f=await this.getPrefs();await this.setLocal(Za,{...f,...b})},async getTokens(){let b=(await this.getLocal(Qa,[])).filter(w=>w&&typeof w.token=="string"&&w.token.trim()),f=await this.getToken();return f&&!b.some(w=>w.token===f)?[{label:"기본",token:f},...b]:b},async setTokens(b){let f=b.map(w=>({label:String(w.label??"").slice(0,30),token:String(w.token??"").trim()})).filter(w=>w.token);await this.setLocal(Qa,f),f[0]&&await this.setToken(f[0].token)},async loadTemplates(){try{let b=await i()?.getItem(Xa),f=b?typeof b=="string"?JSON.parse(b):b:[];return Array.isArray(f)?f:[]}catch{return[]}},async saveTemplates(b){await i()?.setItem(Xa,JSON.stringify(b))},async call(b,f,{signal:w,label:M="sdstudio",zip:m=!0,token:$}={}){if(va())throw xa();let L=$||await this.getToken();if(!L)throw new Error("NovelAI 토큰을 먼저 넣어 주세요");let G=Ca(M,w);try{return await G.race((async()=>{let Z=await s(`${Ao}${b}`,{method:"POST",headers:{Authorization:`Bearer ${L}`,"Content-Type":"application/json",Accept:m?"application/zip":"*/*"},body:JSON.stringify(f)},G.signal),h=await es(Z);if((Z?.status??200)>=400)throw new Error(Lo(Z.status,h));return h})())}finally{G.end()}},async image(b,f){let{data:w}=yt(await this.call("/ai/generate-image",b,f),gt);if(!vt(w))throw new Error("받은 그림이 PNG가 아니에요");return w},async augment(b,f){return yt(await this.call("/ai/augment-image",b,f),gt,{last:!0}).data},async upscale(b,f){let{data:w}=yt(await this.call("/ai/upscale",b,f),gt);if(!vt(w))throw new Error("업스케일 결과가 PNG가 아니에요");return w},async encodeVibe(b,f){return jn(await this.call("/ai/encode-vibe",b,{...f,zip:!1}))},async generate(b,f){let w=Fn(b);return{data:await this.image(w,{signal:f}),seed:w.parameters.seed}},async saveAsset(b){if(typeof e.saveAsset!="function")throw new Error("이 리스에서는 에셋을 저장할 수 없어요");let f;for(let w=0;w<3;w++){try{let M=await e.saveAsset(b.slice());if(M)return M}catch(M){f=M}await new Promise(M=>setTimeout(M,600*(w+1)))}throw new Error(`에셋을 저장하지 못했어요: ${f?.message??f??"경로 없음"}`)}}}var Sr=globalThis.__duskLib?.["src/ui/dom.js"];if(!Sr)throw new Error("Dusk 코어에 src/ui/dom.js가 없어요 — Dusk를 업데이트해 주세요");{let e=["EASE","copyText","download","fadeUp","fmtBytes","fmtWhen","h","motion","pickFiles","reduceMotion","replace","svgFrom","vanish"].filter(n=>!(n in Sr));if(e.length)throw new Error("Dusk 본체가 이 애드온보다 오래됐어요(src/ui/dom.js에 없는 기능: "+e.slice(0,3).join(", ")+") — Dusk를 업데이트해 주세요")}var{EASE:cl,copyText:pl,download:$n,fadeUp:hl,fmtBytes:ul,fmtWhen:gl,h:o,motion:ml,pickFiles:zn,reduceMotion:bl,replace:ce,svgFrom:rs,vanish:fl}=Sr;var Lr=globalThis.__duskLib?.["src/engine/safety.js"];if(!Lr)throw new Error("Dusk 코어에 src/engine/safety.js가 없어요 — Dusk를 업데이트해 주세요");{let e=["Busy","backupSnapshot","isGenerating","restoreFromBackup"].filter(n=>!(n in Lr));if(e.length)throw new Error("Dusk 본체가 이 애드온보다 오래됐어요(src/engine/safety.js에 없는 기능: "+e.slice(0,3).join(", ")+") — Dusk를 업데이트해 주세요")}var{Busy:kl,backupSnapshot:yl,isGenerating:as,restoreFromBackup:vl}=Lr;var Xe=(e,n=8e3)=>String(e??"").slice(0,n),qo=()=>Math.random().toString(36).slice(2,10),Wn=e=>(Array.isArray(e)?e:[]).filter(Array.isArray).map(n=>n.filter(a=>a&&typeof a=="object").map(a=>({prompt:Xe(a.prompt),on:a.on!==!1&&a.enabled!==!1}))),Et=e=>(Array.isArray(e)?e:[]).filter(n=>n&&typeof n.name=="string"&&n.name).map(n=>({name:Xe(n.name,40).replace(/[.<>,]/g,""),pieces:(Array.isArray(n.pieces)?n.pieces:[]).filter(a=>a&&typeof a.name=="string"&&a.name).map(a=>({name:Xe(a.name,40).replace(/[.<>,]/g,""),prompt:Xe(a.prompt),multi:!!a.multi}))}));function ss(e,n,a=[]){return{v:1,name:Xe(n,80).trim()||`${e.name} 씬`,scenes:e.scenes.map(s=>({name:s.name,slots:Wn(s.slots),size:s.size||""})),pieces:Et(a)}}var os=e=>JSON.stringify({format:"dusk-sdstudio-template",v:1,name:e.name,scenes:e.scenes,pieces:e.pieces??[]},null,1);function Eo(e){if(e?.resolution&&e.resolution!=="custom"&&ke[e.resolution])return e.resolution;if(e?.resolutionWidth&&e?.resolutionHeight){let n=Ze(e.resolutionWidth,e.resolutionHeight);return`${n.width}x${n.height}`}return""}function It(e){if(e?.format==="dusk-sdstudio-template")return{v:1,name:Xe(e.name,80)||"가져온 템플릿",scenes:(Array.isArray(e.scenes)?e.scenes:[]).filter(i=>i&&i.name).map(i=>({name:Xe(i.name,80),slots:Wn(i.slots),size:typeof i.size=="string"?i.size:""})),pieces:Et(e.pieces)};let n=e?.type==="sdstudio-scene-template"?e.session:e?.scenes&&typeof e.scenes=="object"?e:null;if(!n||typeof n.scenes!="object")throw new Error("SDStudio 씬 템플릿이나 Dusk 템플릿 파일이 아니에요");let a=Object.entries(n.scenes).filter(([,i])=>i&&typeof i=="object").map(([i,t])=>({name:Xe(t.name||i,80),slots:Wn(t.slots),size:Eo(t)})),s=Et(Object.values(n.library??{}));return{v:1,name:Xe(e.name??n.name,80)||"가져온 템플릿",scenes:a,pieces:s}}var is=e=>!e.scenes.length||e.scenes.length===1&&!e.scenes[0].images.length&&!e.scenes[0].slots.some(n=>n.some(a=>a.prompt.trim())),qr=(e,n)=>n.filter(a=>{let s=ge(e,a);return s&&!is(s)});function Io(e,n){let a=(e??[]).map(s=>({...s,pieces:[...s.pieces]}));for(let s of Et(n)){let i=a.find(t=>t.name===s.name);if(!i){a.push(s);continue}for(let t of s.pieces)i.pieces.some(l=>l.name===t.name)||i.pieces.push(t)}return a}function Mn(e,n,a,s="merge",i=qo){let t={chars:0,added:0,kept:0,removed:0,updated:0},l=b=>({id:i(),name:b.name,slots:Wn(b.slots),size:b.size||"",reserve:0,cover:"",memo:"",images:[]}),p={...e,pieces:Io(e.pieces,a.pieces)};for(let b of n){let f=ge(p,b);if(!f)continue;t.chars++;let w=is(f)?"replace":s,M=new Map(f.scenes.map($=>[$.name.toLowerCase(),$])),m;if(w==="merge"){m=[...f.scenes];for(let $ of a.scenes)M.has($.name.toLowerCase())?t.kept++:(m.push(l($)),t.added++)}else{let $=new Set(a.scenes.map(L=>L.name.toLowerCase()));t.removed+=f.scenes.filter(L=>!$.has(L.name.toLowerCase())).length,m=a.scenes.map(L=>{let G=M.get(L.name.toLowerCase());return G?(t.updated++,{...G,slots:Wn(L.slots),size:L.size||""}):(t.added++,l(L))})}p=Fe(p,b,{scenes:m})}return{project:p,stats:t}}function ls({limit:e=60,mergeMs:n=700,now:a=()=>Date.now()}={}){let s=[],i=[],t=-1/0,l=!1;return{push(p,{typing:b=!1}={}){let f=a();b&&l&&f-t<=n&&s.length||(s.push(p),s.length>e&&s.shift()),t=f,l=b,i=[]},undo(p){return s.length?(i.push(p),l=!1,s.pop()):null},redo(p){return i.length?(s.push(p),l=!1,i.pop()):null},canUndo:()=>s.length>0,canRedo:()=>i.length>0,clear(){s=[],i=[],t=-1/0,l=!1}}}var Er={run:"생성 시작·멈추기",toggleLeft:"프롬프트 에디터 열고 닫기",undo:"되돌리기",redo:"다시하기",put:"고른 그림 봇에 바로 넣기",selectAll:"모두 고르기",search:"검색",newItem:"새 캐릭터·씬",cup:"이미지 월드컵",reserve:"고른 씬 1장 예약",choose:"대표 고르기",putFav:"즐겨찾기 확인하고 봇에 넣기",remove:"고른 것 지우기(캐릭터·씬·그림)",unpick:"고르기 모두 풀기",mode1:"씬 모드",mode2:"갤러리 모드",mode3:"검색 모드",mode4:"비교 모드",mode5:"동시편집",help:"도움말"},Ir={run:"Mod+Enter",toggleLeft:"F1",undo:"Mod+Z",redo:"Mod+Shift+Z",put:"Mod+B",selectAll:"Mod+A",search:"Mod+F",newItem:"N",cup:"W",reserve:"R",choose:"C",putFav:"Mod+Shift+B",remove:"Delete",unpick:"Mod+Shift+A",mode1:"1",mode2:"2",mode3:"3",mode4:"4",mode5:"5",help:"F2"},Yn=(e=globalThis.navigator)=>/Mac|iPhone|iPad|iPod/i.test(e?.userAgentData?.platform??e?.platform??e?.userAgent??""),Oo=new Set(["Control","Shift","Alt","Meta","OS","AltGraph","CapsLock","Fn"]);function Fo(e){let n=/^Key([A-Z])$/.exec(e.code??"")??/^Digit(\d)$/.exec(e.code??"");return n?n[1]:e.key===" "?"Space":e.key.length===1?e.key.toUpperCase():e.key}function Tt(e,n=Yn()){if(!e?.key||Oo.has(e.key))return null;let a=Fo(e),s=[];return(n?e.metaKey:e.ctrlKey)&&s.push("Mod"),n&&e.ctrlKey&&s.push("Ctrl"),!n&&e.metaKey&&s.push("Meta"),e.altKey&&s.push("Alt"),e.shiftKey&&(a.length>1||s.length)&&s.push("Shift"),s.push(a),s.join("+")}var Do={Mod:"⌘",Ctrl:"⌃",Alt:"⌥",Shift:"⇧",Enter:"↩",Escape:"⎋",Backspace:"⌫",Delete:"⌦",ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓",Space:"Space"},No={Mod:"Ctrl",Meta:"Win",ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓"};function Ot(e,n=Yn()){if(!e)return"";let a=e.split("+");return n?a.map(s=>Do[s]??s).join(""):a.map(s=>No[s]??s).join("+")}function Tr(e,{v:n=2}={}){let a={...Ir};for(let[s,i]of Object.entries(e&&typeof e=="object"?e:{}))!(s in Er)||typeof i!="string"||(a[s]=(n<2?i.replace(/^Ctrl\+/,"Mod+"):i).slice(0,40));return a}function Or(e,n,a){let s={...e};if(a)for(let i of Object.keys(s))s[i]===a&&i!==n&&(s[i]="");return s[n]=a||"",s}var ds=(e,n)=>n?Object.keys(e).find(a=>e[a]===n)??null:null,cs=e=>/^(Mod|Ctrl|Alt|Meta)\+/.test(e??"")||/^F\d+$/.test(e??"");var Uo=`
.sds{position:absolute;inset:0;z-index:25;display:flex;flex-direction:row;overflow:hidden;background:var(--rb-win);color:var(--rb-text);animation:rb-in .15s ease-out}
.sds *{box-sizing:border-box}
.sds-rail{width:44px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0;background:var(--rb-surf);border-right:var(--rb-bw,1px) solid var(--rb-line2)}
.sds-rail .tab{writing-mode:vertical-rl;letter-spacing:.2em;font-weight:800;font-size:13px;padding:10px 0;border:0;background:none;color:var(--rb-sub);cursor:pointer;border-radius:var(--rb-r1)}
.sds-rail .tab[aria-pressed=true]{color:var(--rb-acc-text);background:var(--rb-sel-bg)}
.sds-rail .key{font-size:10px;color:var(--rb-mute);font-weight:700}
.sds-left{width:380px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;background:var(--rb-surf);border-right:var(--rb-bw,1px) solid var(--rb-line2)}
.sds-left[hidden]{display:none}
.sds-left-head{display:flex;align-items:center;gap:8px;padding:14px 16px 8px}
.sds-left-head b{font-size:16px;font-weight:800}
.sds-left-body{flex:1;min-height:0;overflow:auto;padding:4px 16px 16px;display:flex;flex-direction:column;gap:14px}
.sds-groups{display:flex;justify-content:center;gap:22px;padding:0 16px 10px}
.sds-group{display:flex;flex-direction:column;align-items:center;gap:4px}
.sds-group>small{font-size:10.5px;font-weight:700;color:var(--rb-sub);letter-spacing:.02em}
.sds-group>div{display:flex;gap:6px}
.sds-ib{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--rb-r1);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf2);color:var(--rb-text);cursor:pointer;padding:0;flex-shrink:0}
.sds-ib:disabled{opacity:.4;cursor:default}
.sds-ib.on,.sds-ib[aria-pressed=true]{background:var(--rb-acc-grad);color:var(--rb-on-acc);border-color:transparent}
.sds-ib.danger{color:var(--rb-danger)}
@media (hover:hover){.sds-ib:not(:disabled):hover{border-color:var(--rb-acc);color:var(--rb-acc-text)}.sds-ib.on:hover,.sds-ib[aria-pressed=true]:hover{color:var(--rb-on-acc)}}
.sds-lbl{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;margin-bottom:6px}
.sds-help{width:16px;height:16px;border-radius:50%;border:1px solid var(--rb-line3);font-size:10px;line-height:14px;text-align:center;color:var(--rb-sub);cursor:help;background:none;padding:0}
.sds-pa{position:relative;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win)}
.sds-pa:focus-within{border-color:var(--rb-acc);box-shadow:0 0 0 3px var(--rb-focus)}
.sds-pa>pre,.sds-pa>textarea{margin:0;padding:10px 12px;font:inherit;font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;letter-spacing:normal}
.sds-pa>pre{position:absolute;inset:0;overflow:hidden;pointer-events:none;color:var(--rb-text)}
.sds-pa>textarea{position:relative;display:block;width:100%;min-height:72px;max-height:340px;resize:vertical;border:0;background:transparent;color:transparent;caret-color:var(--rb-text);outline:none}
.sds-pa>textarea::placeholder{color:var(--rb-mute)}
.sds-pa .k-weight-up,.sds-pa .k-brace{background:var(--rb-rose-soft);border-radius:3px}
.sds-pa .k-brace{font-weight:800}
.sds-pa .k-weight-down,.sds-pa .k-bracket{background:var(--rb-blue-soft);border-radius:3px}
.sds-pa .k-weight-neg{background:var(--rb-surf2);color:var(--rb-sub);border-radius:3px}
.sds-pa .k-piece{background:var(--rb-teal-soft);border-radius:3px}
.sds-pa .k-random{background:var(--rb-warn-soft);border-radius:3px}
.sds-pa .k-comment{color:var(--rb-mute);font-style:italic}
.sds-pa .k-pipe{color:var(--rb-acc-text);font-weight:800}
.sds-row{display:flex;gap:8px;align-items:center;min-width:0}
.sds-row>*{min-width:0}
.sds-sel,.sds-in{height:40px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win);color:var(--rb-text);padding:0 12px;font:inherit;font-size:14px}
.sds-sel:focus,.sds-in:focus{outline:none;border-color:var(--rb-acc);box-shadow:0 0 0 3px var(--rb-focus)}
.sds-sel.acc{background:var(--rb-sel-bg);color:var(--rb-acc-text);font-weight:700;text-align:center}
.sds-bar{display:flex;align-items:center;gap:10px;height:44px;padding:0 14px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win);color:var(--rb-text);font:inherit;font-size:14px;font-weight:700;cursor:pointer;width:100%;text-align:left}
.sds-bar>.t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sds-bar small{color:var(--rb-sub);font-weight:600}
.sds-bar.fill{background:var(--rb-acc-soft);color:var(--rb-acc-text);border-color:transparent}
@media (hover:hover){.sds-bar:hover{border-color:var(--rb-acc)}}
.sds-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.sds-top{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf);flex-wrap:wrap;min-height:58px}
.sds-top .ttl{display:flex;align-items:center;gap:8px;min-width:0}
.sds-top .ttl b{font-size:17px;font-weight:800;white-space:nowrap}
.sds-pill{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;background:var(--rb-sel-bg);color:var(--rb-acc-text);font-size:12px;font-weight:800;white-space:nowrap}
.sds-modes{flex:1;display:flex;justify-content:center;gap:4px;min-width:0;overflow-x:auto;scrollbar-width:none}
.sds-modes button{border:0;background:none;color:var(--rb-sub);font:inherit;font-size:14px;font-weight:700;padding:8px 14px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.sds-modes button[aria-selected=true]{color:var(--rb-text);border-bottom-color:var(--rb-acc)}
.sds-modes button:disabled{opacity:.35;cursor:default}
.sds-tools{display:flex;align-items:flex-end;gap:18px;padding:8px 16px 10px;border-bottom:var(--rb-bw,1px) solid var(--rb-line2);overflow-x:auto;scrollbar-width:thin;flex-shrink:0}
.sds-tools .sp{flex:1}
.sds-zoom{display:flex;align-items:center;gap:8px}
.sds-zoom input{width:120px;accent-color:var(--rb-acc)}
.sds-zoom span{font-size:12px;color:var(--rb-sub);width:34px;text-align:right;font-variant-numeric:tabular-nums}
.sds-body{flex:1;min-height:0;overflow:auto;padding:16px 20px 28px;display:flex;flex-direction:column;gap:16px;position:relative}
.sds-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--sds-card,180px),1fr));gap:14px}
.sds-card{position:relative;padding:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);overflow:hidden;background:var(--rb-surf2);cursor:pointer;aspect-ratio:2/3;width:100%;color:var(--rb-text);display:block;text-align:left}
.sds-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.sds-card .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--rb-mute)}
.sds-card .cap{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:6px;padding:20px 12px 9px;background:linear-gradient(transparent,rgba(0,0,0,.66));color:#fff;font-size:14px;font-weight:700}
.sds-card .cap .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sds-card .cap .c{opacity:.9;font-variant-numeric:tabular-nums}
.sds-card .cap .pk{height:20px;padding:0 7px;border-radius:999px;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-size:11.5px;font-weight:800;display:inline-flex;align-items:center}
.sds.nonames .sds-card .cap .n{visibility:hidden}
.sds-card .rsv{position:absolute;top:8px;right:8px;height:22px;padding:0 8px;border-radius:999px;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-size:12px;font-weight:800;display:flex;align-items:center}
.sds-card .chk{position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:7px;background:var(--rb-win);border:1px solid var(--rb-line3);display:flex;align-items:center;justify-content:center;color:var(--rb-on-acc);opacity:0;transition:opacity .12s}
.sds-card[aria-selected=true] .chk,.sds-card:focus-visible .chk{opacity:1}
.sds-card[aria-selected=true]{border-color:var(--rb-acc);box-shadow:0 0 0 2px var(--rb-acc)}
.sds-card[aria-selected=true] .chk{background:var(--rb-acc-grad);border:0}
.sds-card .badges{position:absolute;top:8px;right:8px;display:flex;gap:4px}
.sds-card .badge{height:22px;min-width:22px;padding:0 6px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center}
.sds-card .quick{position:absolute;left:8px;right:8px;bottom:44px;display:flex;gap:6px;justify-content:flex-end;opacity:0;transition:opacity .12s}
@media (hover:hover){.sds-card:hover .chk,.sds-card:hover .quick{opacity:1}.sds-card:hover{border-color:var(--rb-acc)}}
.sds-card .quick button{height:26px;padding:0 9px;border-radius:999px;border:0;background:rgba(0,0,0,.6);color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.sds-frow{border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r3);background:var(--rb-surf);padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.sds-frow .hd{display:flex;align-items:center;gap:8px}
.sds-frow .hd>button.open{flex:1;min-width:0;display:flex;align-items:center;gap:8px;background:none;border:0;padding:0;color:var(--rb-text);cursor:pointer;text-align:left;font:inherit}
.sds-frow .strip{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
.sds-frow .strip .sds-card{width:var(--sds-row,132px);flex-shrink:0}
.sds-card.cur,.sds-frow.cur{border-color:var(--rb-acc);box-shadow:0 0 0 2px var(--rb-acc)}
.sds-dragging .dragging{opacity:.45}
.sds-card.drop-before::after,.sds-card.drop-after::after{content:"";position:absolute;top:0;bottom:0;width:6px;background:var(--rb-acc);z-index:3}
.sds-card.drop-before::after{left:0}.sds-card.drop-after::after{right:0}
.sds-frow.drop-into,.sds-grid.drop-into,.sds-rootdrop.drop-into,.sds-crumbs .rb-chip.drop-into,.sds-tray .rb-chip.drop-into{outline:2px solid var(--rb-acc);outline-offset:1px;background:var(--rb-sel-bg,var(--rb-surf2))}
.sds-frow.drop-before{box-shadow:0 -4px 0 var(--rb-acc)}.sds-frow.drop-after{box-shadow:0 4px 0 var(--rb-acc)}
.sds-frow{position:relative}
[data-drop-hint]::before{content:attr(data-drop-hint);position:absolute;top:-12px;left:50%;transform:translateX(-50%);z-index:5;padding:3px 10px;border-radius:999px;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-size:12px;font-weight:800;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.sds-crumbs .rb-chip{position:relative}
.sds-frow .sds-frow{background:var(--rb-surf2)}
.sds-subrows{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}
.sds-subrows>.sds-frow{flex:1 1 auto;min-width:min(100%,260px);max-width:100%;box-sizing:border-box}
.sds-toprows{gap:14px}
.sds-frow.folded{padding-top:9px;padding-bottom:9px}
.sds-subrows>.sds-frow.folded{flex:0 1 auto}
.sds-subrows>.sds-frow .strip{max-width:100%}
.sds-subf.drop-into{outline:2px solid var(--rb-acc);outline-offset:1px}
.sds-rootdrop{display:none;border:2px dashed var(--rb-line3);border-radius:var(--rb-r3);padding:16px;text-align:center;color:var(--rb-sub);font-size:13px}
.sds-dragging .sds-rootdrop{display:block}
.sds-tray{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:2px dashed var(--rb-line3);border-radius:var(--rb-r3);position:sticky;bottom:0;background:var(--rb-win);margin-top:6px}
.sds-drag-scene .sds-tray{display:flex}
.sds-prog{display:flex;align-items:center;gap:10px;min-width:220px;flex:1;max-width:520px}
.sds-prog .bar{flex:1;height:8px;border-radius:999px;background:var(--rb-surf2);overflow:hidden;border:1px solid var(--rb-line2)}
.sds-prog .bar i{display:block;height:100%;background:var(--rb-acc-grad);transition:width .3s}
.sds-prog .t{font-size:12px;font-weight:700;color:var(--rb-sub);white-space:nowrap;font-variant-numeric:tabular-nums}
.sds-pa{position:relative}
.sds-ac{position:absolute;left:0;right:0;top:100%;margin-top:6px;z-index:40;background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.35);padding:4px;max-height:280px;overflow:auto;scrollbar-width:thin}
.sds-ac .it{display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;column-gap:10px;padding:6px 10px;border-radius:8px;cursor:pointer;line-height:1.35}
.sds-ac .it.on{background:var(--rb-sel-bg,var(--rb-surf2))}
.sds-ac .it:hover:not(.on){background:var(--rb-surf2)}
.sds-ac .it.dl{display:block;font-size:13px;color:var(--rb-acc-text,var(--rb-acc));font-weight:600;padding:9px 10px}
.sds-ac .dot{width:8px;height:8px;border-radius:50%;background:var(--rb-mute)}
.sds-ac .dot.c1{background:#e8a33d}.sds-ac .dot.c3{background:#b48cf2}.sds-ac .dot.c4{background:#4fc3a1}.sds-ac .dot.c5{background:#e06c75}
.sds-ac .tx{min-width:0;display:flex;flex-direction:column}
.sds-ac .w{font-size:13.5px;font-weight:600;color:var(--rb-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sds-ac .r{font-size:11.5px;color:var(--rb-sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sds-ac .f{font-size:11.5px;color:var(--rb-mute);font-variant-numeric:tabular-nums}
.sds-ac .ft{display:flex;gap:10px;justify-content:flex-end;padding:5px 10px 3px;border-top:1px solid var(--rb-line2);margin-top:3px;font-size:11px;color:var(--rb-mute)}
.sds-artlist{display:flex;flex-direction:column;gap:4px;max-height:52vh;overflow:auto;margin-top:8px}
.sds-artlist .it{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:8px}
.sds-artlist .it:hover{background:var(--rb-surf2)}
.sds-artlist .w{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.sds-artlist small{margin-top:6px}
.sds-crumbs{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sds-sec{display:flex;align-items:center;gap:8px;min-height:30px}
.sds-sec b{font-size:14px}
.sds-sec .sp{flex:1}
.sds-empty{border:1px dashed var(--rb-line3);border-radius:var(--rb-r3);padding:32px 18px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;color:var(--rb-sub)}
.sds-empty b{color:var(--rb-text);font-size:15px}
.sds-run{display:flex;align-items:center;gap:8px}
.sds-queue{height:36px;padding:0 14px;border-radius:999px;border:0;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:var(--rb-acc-grad);color:var(--rb-on-acc)}
.sds-queue.stop{background:var(--rb-danger);color:#fff}
.sds-queue:disabled{opacity:.45;cursor:default}
.sds-slots{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;align-items:flex-start}
.sds-slot{width:260px;flex-shrink:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);background:var(--rb-surf);padding:10px;display:flex;flex-direction:column;gap:8px}
.sds-slot .hd{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:var(--rb-sub)}
.sds-piece{display:flex;gap:6px;align-items:flex-start}
.sds-piece .sds-pa{flex:1}
.sds-piece .sds-pa>textarea{min-height:44px}
.sds-piece.off .sds-pa{opacity:.45}
.sds-over{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:var(--rb-backdrop);backdrop-filter:blur(4px)}
.sds-lb{flex:1;min-height:0;display:flex;background:var(--rb-win)}
.sds-ch{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--rb-win)}
.sds-ch .stage{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;background:var(--rb-surf2)}
.sds-ch .stage img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.sds-ch .nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.sds-ch-star{position:absolute;top:12px;right:14px;font-size:26px;color:#f5c542;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.sds-ch-strip{display:flex;gap:8px;padding:10px 12px;overflow-x:auto;overflow-y:hidden;border-top:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf);flex-shrink:0}
.sds-ch-th{position:relative;flex:0 0 auto;width:84px;height:110px;padding:0;border:2px solid transparent;border-radius:var(--rb-r1);overflow:hidden;background:var(--rb-surf2);cursor:pointer}
.sds-ch-th img{width:100%;height:100%;object-fit:cover;display:block}
.sds-ch-th.on{border-color:var(--rb-acc)}
.sds-ch-th .n{position:absolute;left:4px;bottom:3px;font-size:11px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7)}
.sds-ch-th .f{position:absolute;right:4px;top:2px;font-size:14px;color:#f5c542;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.sds-ch-acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-top:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf);flex-shrink:0}
.sds-card .nofav{position:absolute;left:6px;bottom:30px;font-size:11px;font-weight:800;padding:1px 6px;border-radius:999px;background:var(--rb-danger);color:#fff}
.sds-exp-list{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}
.sds-exp-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:var(--rb-r1);background:var(--rb-surf2);font-size:13px}
.sds-exp-row img{width:40px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0}
.sds-exp-row .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
.sds-exp-row .st{font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap}
.sds-exp-row .st.new{background:var(--rb-acc);color:#fff}.sds-exp-row .st.dup{background:#d98a1f;color:#fff}.sds-exp-row .st.sent{background:var(--rb-line2);color:var(--rb-sub)}
.sds-lb .stage{flex:1;min-width:0;position:relative;display:flex;align-items:center;justify-content:center;background:var(--rb-surf2)}
.sds-lb .stage img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.sds-lb .nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.sds-lb .info{width:340px;flex-shrink:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;border-left:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf)}
.sds-lb .info pre{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit;font-size:12.5px;color:var(--rb-sub);background:var(--rb-win);border-radius:var(--rb-r1);padding:8px 10px;max-height:180px;overflow:auto}
.sds-acts{display:flex;flex-wrap:wrap;gap:6px}
.sds-cup{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--rb-win)}
.sds-cup .pair{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px}
.sds-cup .pair button{border:2px solid var(--rb-line2);border-radius:var(--rb-r3);background:var(--rb-surf2);cursor:pointer;padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:0}
.sds-cup .pair button img{max-width:100%;max-height:100%;object-fit:contain}
@media (hover:hover){.sds-cup .pair button:hover{border-color:var(--rb-acc)}}
.sds-cmp{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:start}
.sds-cmp figure{margin:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);overflow:hidden;background:var(--rb-surf2)}
.sds-cmp figure img{width:100%;display:block}
.sds-cmp figcaption{padding:6px 10px;font-size:12px;color:var(--rb-sub);display:flex;gap:8px;align-items:center}
.sds-table{width:100%;border-collapse:collapse;font-size:13px}
.sds-table th,.sds-table td{padding:6px 8px;border-bottom:1px solid var(--rb-line2);text-align:left;vertical-align:top}
.sds-table th{color:var(--rb-sub);font-weight:700;font-size:12px}
.sds-paint{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;background:var(--rb-surf2);overflow:auto}
.sds-paint canvas{display:block;touch-action:none;max-width:100%;max-height:100%}
@media (max-width:760px){
  .sds{flex-direction:column}
  .sds-rail{width:auto;height:auto;flex-direction:row;padding:6px 10px;border-right:0;border-bottom:var(--rb-bw,1px) solid var(--rb-line2)}
  .sds-rail .tab{writing-mode:horizontal-tb;padding:4px 10px;letter-spacing:0}
  .sds-left{width:auto;max-height:46%;border-right:0;border-bottom:var(--rb-bw,1px) solid var(--rb-line2)}
  .sds-modes{justify-content:flex-start}
  .sds-modes button{padding:8px 10px;font-size:13px}
  .sds-top .ttl b{font-size:15px}
  .sds-body{padding:12px}
  .sds-lb{flex-direction:column}.sds-lb .info{width:auto;max-height:45%;border-left:0;border-top:var(--rb-bw,1px) solid var(--rb-line2)}
  .sds-cup .pair{grid-template-columns:1fr;grid-template-rows:1fr 1fr}
}
@media (prefers-reduced-motion:reduce){.sds{animation:none}}
`;function hs(e=document){if(e.getElementById("rb-sds-style"))return;let n=e.createElement("style");n.id="rb-sds-style",n.textContent=Uo,e.head.appendChild(n)}var ps={calPlus:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M12 13v5M9.5 15.5h5"/>',calX:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M10 14l4 4M14 14l-4 4"/>',file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',swap:'<path d="M4 8h14l-4-4M20 16H6l4 4"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',exportBot:'<path d="M4 4h10v16H4z"/><path d="M14 12h7M18 9l3 3-3 3"/>',exportAll:'<path d="M4 4h9v5H4zM4 11h9v9H4z"/><path d="M14 12h7M18 9l3 3-3 3"/>',zip:'<path d="M6 3h9l4 4v14H6z"/><path d="M10 3v2M10 7v2M10 11v2M9 15h2v3H9z"/>',expand:'<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',sortAsc:'<path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 12h5M14 18h3"/>',sortDesc:'<path d="M7 20V4M3 8l4-4 4 4M14 6h3M14 12h5M14 18h7"/>',clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',importIn:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M12 11v7M9 15l3 3 3-3"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',copies:'<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M8 21h11a2 2 0 0 0 2-2V8"/>',puzzle:'<path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3h7z"/>',warn:'<path d="M12 3 2 21h20zM12 10v5M12 18h.01"/>',save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',load:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M12 18v-7M9 14l3-3 3 3"/>',person:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',chevL:'<path d="M15 18l-6-6 6-6"/>',chevD:'<path d="M6 9l6 6 6-6"/>',chevR:'<path d="M9 18l6-6-6-6"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',wand:'<path d="M15 4V2M15 10V8M11 6h2M17 6h2M4 20 14 10M18 13v2M17 14h2"/>',up2:'<path d="M7 17 17 7M9 7h8v8"/><rect x="3" y="3" width="18" height="18" rx="2"/>',brush:'<path d="M18 2l4 4-10 10-4-4zM8 12l-4 4a3 3 0 0 0 0 4c1 1 3 1 4 0l4-4"/>',play:'<path d="M7 4l13 8-13 8z"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',back:'<path d="M15 18l-6-6 6-6"/>',folder:'<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',folderPlus:'<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6"/>',check:'<path d="M5 12l5 5L20 7"/>',sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',dice:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',layers:'<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',compare:'<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',keyboard:'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 15h10"/>',template:'<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M17 13v8M13 17h8"/>',bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'},Ro=new Set(["play","stop","more"]);function ie(e,n=18){let a=ps[e]??ps.help;return rs(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 24 24" fill="${Ro.has(e)?"currentColor":"none"}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${a}</svg>`)}var Jn=null,us=e=>{Jn=e};function Bo(e,n,a){let s=o("div",{class:"sds-ac",role:"listbox",hidden:!0});e.appendChild(s);let i=[],t=0,l=null,p=!1,b=()=>{s.hidden=!0,i=[]},f=$=>{let L=i[$];if(!L)return;let G=ka(n.value,n.selectionStart,L.tag);n.value=G.text,n.setSelectionRange(G.caret,G.caret),b(),a()},w=()=>{s.replaceChildren(...i.map(($,L)=>o("div",{class:["it",L===t&&"on"],role:"option","aria-selected":String(L===t),title:ua[$.cat]??"",onMousedown:G=>{G.preventDefault(),f(L)}},o("span",{class:`dot c${$.cat}`,"aria-hidden":"true"}),o("span",{class:"tx"},o("span",{class:"w"},$.tag),$.tag!==$.word?o("span",{class:"r"},$.word.includes("/")?$.word.split("/").join(" › "):$.word):null),o("span",{class:"f"},mt($.freq)))),o("div",{class:"ft","aria-hidden":"true"},o("span",null,"↑↓ 고르기"),o("span",null,"Enter·Tab 넣기"),o("span",null,"Esc 닫기"))),s.hidden=!i.length},M=()=>{s.replaceChildren(o("div",{class:"it dl",onMousedown:async $=>{if($.preventDefault(),!p){p=!0,s.firstChild.textContent="태그 사전 받는 중… (약 2MB, 한 번만)";try{await Jn.load(),p=!1,m()}catch(L){p=!1,s.firstChild.textContent=`${L?.message??L} — 설정에서 파일로 불러올 수 있어요`}}}},"태그 자동완성 쓰기 — 사전 받기(약 2MB, 처음 한 번)")),s.hidden=!1},m=()=>{if(!Jn?.enabled?.())return b();let $=er(n.value,n.selectionStart);if($.word.trim().length<2||n.selectionStart!==n.selectionEnd)return b();let L=Jn.get();if(!L)return Jn.offered?.()?b():M();i=wa(L,$.word,8),t=0,w()};n.addEventListener("input",()=>{clearTimeout(l),l=setTimeout(m,70)}),n.addEventListener("keydown",$=>{s.hidden||!i.length||($.key==="ArrowDown"||$.key==="ArrowUp"?($.preventDefault(),t=(t+($.key==="ArrowDown"?1:-1)+i.length)%i.length,w()):($.key==="Enter"||$.key==="Tab")&&!$.shiftKey&&!$.ctrlKey&&!$.metaKey?($.preventDefault(),$.stopPropagation(),f(t)):$.key==="Escape"&&($.preventDefault(),$.stopPropagation(),b()))}),n.addEventListener("blur",()=>setTimeout(b,120))}function Ie({value:e="",onInput:n,rows:a=4,placeholder:s="",id:i,label:t}){let l=o("pre",{"aria-hidden":"true"}),p=o("textarea",{rows:a,placeholder:s,id:i,spellcheck:"false","aria-label":t});p.value=e;let b=()=>{l.replaceChildren(...Na(p.value).map(w=>w.kind==="text"?document.createTextNode(w.text):o("span",{class:`k-${w.kind}`},w.text)),document.createTextNode(`
`)),l.scrollTop=p.scrollTop};p.addEventListener("input",()=>{b(),n?.(p.value)}),p.addEventListener("scroll",()=>{l.scrollTop=p.scrollTop}),new(globalThis.ResizeObserver??class{observe(){}})(()=>{l.style.height=`${p.offsetHeight}px`}).observe(p),b();let f=o("div",{class:"sds-pa"},l,p);return f.textarea=p,Bo(f,p,()=>{b(),n?.(p.value)}),f}var gs=e=>o("button",{type:"button",class:"sds-help",title:e,"aria-label":e,onClick:n=>n.preventDefault()},"?"),W=(e,n,a,{on:s=!1,danger:i=!1,id:t,disabled:l=!1}={})=>o("button",{type:"button",class:["sds-ib",s&&"on",i&&"danger"],title:n,"aria-label":n,id:t,disabled:l,onClick:a},ie(e,18)),An=(e,n,a)=>o("label",{class:"sds-lbl",for:a},e,n?gs(n):null);function ms(e,n){let a=e.proj,s=a.settings,i=e.curChar(),t=(N,R=!1)=>{e.set(ze(e.proj,N)),R&&e.paintLeft(),e.paintTop()},l=[];l.push(o("div",null,An("상위 프롬프트","모든 그림 맨 앞에 붙어요. | 를 넣으면 그 자리에 씬 조합이 들어가요. <모음.조각>으로 조각을 불러요.","sds-top"),Ie({id:"sds-top",value:s.top,rows:5,placeholder:"예: masterpiece, best quality, |, white background",label:"상위 프롬프트",onInput:N=>t({top:N})}))),i&&l.push(o("div",null,An(`${i.name} 외형 프롬프트`,"이 캐릭터의 생김새·복장. 상위 프롬프트 뒤에 붙어요.","sds-own"),Ie({id:"sds-own",value:i.prompt,rows:4,placeholder:"예: 1boy, cat ears, black hair, black hoodie",label:"외형 프롬프트",onInput:N=>{e.set(Fe(e.proj,i.id,{prompt:N}))}}))),l.push(o("div",null,An("하위 프롬프트","씬 조합 뒤, 맨 끝에 붙어요.","sds-back"),Ie({id:"sds-back",value:s.back,rows:4,placeholder:"예: 2::white background::, cat tail",label:"하위 프롬프트",onInput:N=>t({back:N})}))),l.push(o("div",null,An("네거티브 프롬프트","피할 것. 샘플링 설정의 네거티브 프리셋이 앞에 붙어요.","sds-neg"),Ie({id:"sds-neg",value:s.neg,rows:4,placeholder:"예: text, logo, watermark",label:"네거티브 프롬프트",onInput:N=>t({neg:N})})));let p=o("input",{class:"sds-in",id:"sds-seed",inputmode:"numeric",placeholder:"비우면 랜덤",value:s.seed.value?String(s.seed.value):"",style:"flex:1",onChange:N=>{let R=Math.max(0,Math.floor(Number(N.target.value)||0))>>>0;t({seed:{...e.proj.settings.seed,value:R,mode:R&&e.proj.settings.seed.mode==="random"?"fixed":e.proj.settings.seed.mode}},!0)}}),b=o("label",{title:"시드 잠금(고정)",style:"display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--rb-sub)"},ie("lock",14),o("input",{type:"checkbox",id:"sds-seedlock",checked:s.seed.mode!=="random",onChange:N=>t({seed:{...e.proj.settings.seed,mode:N.target.checked?"fixed":"random"}},!0)})),f=o("select",{class:"sds-sel acc",id:"sds-seedmode",style:"flex:1",onChange:N=>t({seed:{...e.proj.settings.seed,mode:N.target.value}},!0)},...[["random","완전 랜덤"],["fixed","시드 고정"],["chain","장마다 이어서"]].map(([N,R])=>o("option",{value:N,selected:s.seed.mode===N},R)));l.push(o("div",null,An("시드"),o("div",{class:"sds-row"},p,b,f)));let w=s.size,M=gn(w,e.curScene()),m=o("select",{class:"sds-sel",id:"sds-size",style:"flex:1",onChange:N=>{let R=N.target.value,U=ke[R];t({size:{...e.proj.settings.size,mode:R,...U?{w:U.width,h:U.height}:{}}},!0)}},o("option",{value:"scene",selected:w.mode==="scene"},"각 씬의 설정대로"),...Object.entries(ke).map(([N,R])=>o("option",{value:N,selected:w.mode===N},`${R.label} ${R.width}×${R.height}${Tn(R.width,R.height)?"":" · Anlas"}`)),o("option",{value:"custom",selected:w.mode==="custom"},"직접 입력")),$=(N,R)=>o("input",{class:"sds-in",inputmode:"numeric",value:String(R),style:"width:76px;text-align:center",disabled:w.mode!=="custom","aria-label":N==="w"?"가로":"세로",onChange:U=>{let X=Ze(N==="w"?U.target.value:e.proj.settings.size.w,N==="h"?U.target.value:e.proj.settings.size.h);t({size:{...e.proj.settings.size,w:X.width,h:X.height}},!0)}});l.push(o("div",null,An("이미지 사이즈","‘각 씬의 설정대로’면 씬마다 정한 크기(없으면 세로)로 만들어요. 1024×1024를 넘거나 스텝이 28을 넘으면 Anlas가 들어요."),o("div",{class:"sds-row"},m,$("w",M.width),o("span",{style:"color:var(--rb-sub)"},"×"),$("h",M.height))));let L=Le(s.sampling.model),G=s.chars.filter(N=>N.on&&N.prompt.trim()).length;l.push(o("div",{class:"sds-row"},o("button",{type:"button",class:"sds-bar",id:"sds-chars",onClick:()=>e.dlg.charPrompts()},o("span",{class:"t"},"캐릭터 프롬프트"),o("small",null,G?`${G}명`:"")),W("person","캐릭터 프롬프트 편집",()=>e.dlg.charPrompts()),W("puzzle","조각 모음",()=>e.dlg.pieces()))),l.push(o("button",{type:"button",class:"sds-bar",id:"sds-sampling",onClick:()=>e.dlg.sampling()},o("span",{class:"t"},"샘플링/모델 설정"),o("small",null,`${L.label} · ${s.sampling.steps}스텝`),ie("chevR",16)));let Z=s.vibes.filter(N=>N.on).length;l.push(o("button",{type:"button",class:"sds-bar fill",id:"sds-vibe",disabled:!1,onClick:()=>e.dlg.vibes()},o("span",{class:"t"},"바이브 이미지"),o("small",null,L.vibe?s.vibes.length?`${Z}/${s.vibes.length} 켜짐`:"":"V5는 못 써요")));let h=s.refs.filter(N=>N.on).length;l.push(o("div",{class:"sds-row",style:"gap:10px"},o("span",{style:"font-size:13px;font-weight:800;white-space:nowrap"},"레퍼런스 설정: ",o("span",{style:"color:var(--rb-acc-text)"},`(${h}/2 활성화)`)),o("span",{class:"sds-in",style:"flex:1;display:flex;align-items:center;color:var(--rb-sub);font-size:13px;overflow:hidden;white-space:nowrap"},h?s.refs.filter(N=>N.on).map(N=>({character:"캐릭터",style:"그림체","character&style":"캐릭터+그림체"})[N.type]).join(", "):L.reference?"활성화된 이미지 없음":"V5는 못 써요"),o("button",{type:"button",class:"rb-btn primary sm",id:"sds-ref",onClick:()=>e.dlg.refs()},"편집"))),ce(n,...l)}function bs(e){return[o("div",{class:"sds-left-head"},o("b",null,"프롬프트 에디터"),gs(`이 봇(모듈)의 그림 설정이에요. 바뀐 내용은 바로 저장되고 ${e.keyLabel("undo")}로 되돌려요.`),o("span",{style:"flex:1"}),o("button",{type:"button",class:"sds-ib",title:"접기","aria-label":"프롬프트 에디터 접기",style:"border:0;background:none",onClick:()=>e.toggleLeft(!1)},ie("chevL",18))),o("div",{class:"sds-groups"},o("div",{class:"sds-group"},o("small",null,"도구"),o("div",null,W("puzzle","조각 모음",()=>e.dlg.pieces(),{id:"sds-pieces"}),W("warn","문제 확인(없는 조각·빈 프롬프트·Anlas)",()=>e.dlg.check(),{id:"sds-check"}),W("brush","작가 태그 고르기(그림체)",()=>e.dlg.artists(),{id:"sds-artists"}))),o("div",{class:"sds-group"},o("small",null,"프리셋"),o("div",null,W("save","지금 설정을 프리셋으로 저장",()=>e.dlg.savePreset(),{on:!0,id:"sds-psave"}),W("load","프리셋 불러오기",n=>e.dlg.loadPreset(n.currentTarget),{id:"sds-pload"}))))]}function _n(e,{label:n,onChange:a,disabled:s}={}){let i=ht(e,{label:n,disabled:s,onChange:(t,l)=>{pt(l,t),a?.(t,l)}});return o("label",{class:"sds-sw",style:"display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600"},i,n?o("span",null,n):null)}var je=(e,n,...a)=>o("div",{class:"rb-dialog",role:"dialog","aria-modal":"true","aria-label":e,style:`max-width:${n??520}px;max-height:calc(100vh - 32px);overflow:auto`},o("h3",{class:"rb-h3"},e),...a),Xn=e=>{for(let n of e.children)n.style.flexShrink="0";return e},be=(e,...n)=>o("div",{style:"display:flex;flex-direction:column;gap:6px"},o("span",{class:"rb-label"},e),...n),Ft=(e,{min:n,max:a,step:s=1,id:i,onChange:t})=>{let l=o("input",{type:"number",class:"rb-input",value:String(e),min:n,max:a,step:s,id:i,style:"width:110px"});return l.addEventListener("change",()=>t(Number(l.value))),l},Qn=(e,n,a,s)=>o("select",{class:"rb-input",id:s,onChange:i=>a(i.target.value)},...e.map(([i,t])=>o("option",{value:i,selected:i===n},t)));function fs(e){let n=e.ctx.win,a=y=>{e.set(ze(e.proj,{sampling:fn({...e.proj.settings.sampling,...y})})),e.paintLeft()},s=(y,v,C,A)=>o("div",{style:"display:flex;flex-direction:column;gap:3px"},_n(y,{label:v,onChange:A}),o("span",{class:"rb-muted",style:"font-size:12px;white-space:normal;line-height:1.5"},C));async function i(){let y=o("div",{style:"display:flex;flex-direction:column;gap:14px"}),v=()=>{let C=e.proj.settings.sampling,A=Le(C.model),q=Tn(832,1216,C.steps);ce(y,be("모델",Qn(kt.map(x=>[x.id,x.label]),C.model,x=>{a({model:x}),v()},"sds-model")),be("샘플러",A.fixed?o("span",{class:"rb-muted"},`${sr[A.fixed.sampler]} (이 모델은 고정)`):Qn(A.samplers.map(x=>[x,sr[x]]),C.sampler,x=>{a({sampler:x}),v()},"sds-sampler")),o("div",{style:"display:flex;gap:14px;flex-wrap:wrap"},be("스텝",A.fixed?o("span",{class:"rb-muted"},`${A.fixed.steps} (고정)`):Ft(C.steps,{min:1,max:A.maxSteps??50,id:"sds-steps",onChange:x=>{a({steps:x}),v()}})),be("프롬프트 가이던스",Ft(C.scale,{min:0,max:A.maxScale??10,step:.1,id:"sds-scale",onChange:x=>a({scale:x})})),A.noCfgRescale?null:be("CFG 리스케일",Ft(C.cfgRescale,{min:0,max:1,step:.02,onChange:x=>a({cfgRescale:x})}))),q?o("span",{class:"rb-muted",style:"white-space:normal"},"28스텝 이하·1024×1024 이하면 Opus 무료예요."):o("span",{style:"color:var(--rb-warn);font-size:13px;white-space:normal"},"28스텝을 넘으면 Anlas가 들어요."),be("노이즈 스케줄",A.v5?o("span",{class:"rb-muted"},"karras (V5는 고정)"):Qn(or.map(x=>[x,x]),C.noise,x=>a({noise:x}))),be("품질 태그",A.v5?xe(Object.entries(ir),C.quality,x=>a({quality:x}),"품질 태그"):xe([["standard","켬"],["none","끔"]],C.quality==="none"?"none":"standard",x=>a({quality:x}),"품질 태그")),be("네거티브 프리셋",Qn(dr(C.model).map(x=>[x,za[x]]),C.ucPreset,x=>{a({ucPreset:x}),v()},"sds-ucpreset"),On(C.model,C.ucPreset)?o("span",{class:"rb-muted",style:"white-space:normal;font-size:12px"},On(C.model,C.ucPreset)):null),A.varietyPlus?s(C.varietyPlus,"Variety+ (구도 다양하게)","초반 단계의 가이던스를 줄여서 같은 프롬프트도 구도·표정이 더 다양하게 나와요. 결과가 너무 비슷할 때 켜요.",x=>a({varietyPlus:x})):null,A.transparent?s(C.transparent,"투명 배경","배경을 투명하게 그려 달라고 요청하고 ‘transparent background’ 태그를 붙여요. 누끼가 필요한 에셋에 써요.",x=>a({transparent:x})):null,s(C.useCoords,"캐릭터 위치 쓰기","캐릭터 프롬프트에서 정한 자리(가운데·왼쪽·오른쪽…)를 모델에 알려요. 끄면 자리는 모델이 알아서 정해요. 캐릭터 프롬프트를 쓸 때만 뜻이 있어요.",x=>a({useCoords:x})),A.v5&&!A.vibe?null:o("details",{style:"border:1px solid var(--rb-line2);border-radius:var(--rb-r2);padding:8px 12px"},o("summary",{style:"cursor:pointer;font-weight:700;font-size:13px"},"고급 (거의 안 건드려요)"),o("div",{style:"display:flex;flex-direction:column;gap:12px;margin-top:10px"},A.v5?null:s(C.legacyUc,"옛 네거티브 방식(legacy UC)","네거티브 프롬프트를 예전 방식으로 처리해요. 예전에 그린 그림을 똑같이 다시 뽑고 싶을 때만 켜요.",x=>a({legacyUc:x})),A.vibe?s(C.normalizeVibes,"바이브 세기 합을 1로 맞추기","바이브를 여러 장 쓸 때 세기를 합이 1이 되게 나눠요. 끄면 각 바이브의 세기가 그대로 들어가요.",x=>a({normalizeVibes:x})):null))),Xn(y)};v(),await fe(n,C=>je("샘플링/모델 설정",520,y,o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>C(!0)})))),e.paintLeft()}async function t(){let y=o("div",{style:"display:flex;flex-direction:column;gap:12px"}),v=A=>{e.set(ze(e.proj,{chars:A}))},C=()=>{let A=e.proj.settings,q=Le(A.sampling.model),x=A.chars;ce(y,o("span",{class:"rb-muted",style:"white-space:normal"},"한 그림에 여러 인물을 그릴 때 인물마다 프롬프트를 따로 적어요(NAI 캐릭터 프롬프트). 위치를 쓰려면 샘플링 설정에서 ‘캐릭터 위치 쓰기’를 켜요."),...x.map((P,E)=>{let H=O=>v(e.proj.settings.chars.map((J,le)=>le===E?{...J,...O}:J)),j=A.sampling.useCoords?Qn([.1,.3,.5,.7,.9].flatMap(O=>[.1,.3,.5,.7,.9].map(J=>[`${J},${O}`,`${"ABCDE"[Math.round((J-.1)/.2)]}${Math.round((O-.1)/.2)+1}`])),`${P.x},${P.y}`,O=>{let[J,le]=O.split(",").map(Number);H({x:J,y:le})}):null;return o("div",{class:"rb-card",style:"padding:12px;display:flex;flex-direction:column;gap:8px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2)"},o("div",{style:"display:flex;align-items:center;gap:8px"},o("b",{style:"flex:1"},`캐릭터 ${E+1}`),j,_n(P.on,{label:"켜기",onChange:O=>H({on:O})}),D("",{size:"sm",kind:"ghost",icon:"trash",title:"지우기",onClick:()=>{v(e.proj.settings.chars.filter((O,J)=>J!==E)),C()}})),Ie({value:P.prompt,rows:3,placeholder:"예: girl, cat ears, black hoodie",label:`캐릭터 ${E+1} 프롬프트`,onInput:O=>H({prompt:O})}),o("input",{class:"rb-input",value:P.uc,placeholder:"이 인물 네거티브(선택)",onChange:O=>H({uc:O.target.value})}))}),D("캐릭터 더하기",{icon:"plus",id:"sds-char-add",disabled:x.length>=(q.maxChars??6),onClick:()=>{v([...e.proj.settings.chars,{id:Math.random().toString(36).slice(2,10),prompt:"",uc:"",x:.5,y:.5,on:!0}]),C()}})),Xn(y)};C(),await fe(n,A=>je("캐릭터 프롬프트",560,y,o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>A(!0)})))),e.paintLeft()}async function l(){let y=0,v=o("div",{style:"display:flex;flex-direction:column;gap:6px;min-width:150px"}),C=o("div",{style:"flex:1;min-width:0;display:flex;flex-direction:column;gap:10px"}),A=P=>String(P??"").replace(/[.<>,\s]/g,"").slice(0,40),q=P=>e.set({...e.proj,pieces:P}),x=()=>{let P=e.proj.pieces;y>=P.length&&(y=Math.max(0,P.length-1)),ce(v,...P.map((j,O)=>o("button",{type:"button",class:"rb-chip","aria-pressed":O===y?"true":"false",onClick:()=>{y=O,x()}},`${j.name} ${j.pieces.length}`)),D("모음 더하기",{size:"sm",icon:"plus",id:"sds-lib-add",onClick:async()=>{let j=A(await Be(n,{title:"조각 모음 이름",label:"이름(점·꺾쇠·쉼표·띄어쓰기 없이)",placeholder:"예: 옷"}));!j||P.some(O=>O.name===j)||(q([...e.proj.pieces,{name:j,pieces:[]}]),y=e.proj.pieces.length-1,x())}}));let E=P[y];if(!E){ce(C,o("span",{class:"rb-muted",style:"white-space:normal"},"조각은 자주 쓰는 프롬프트 묶음이에요. 프롬프트에 <모음.조각>으로 넣으면 펼쳐져요. ‘여러 줄’ 조각은 줄 하나를 무작위로 골라요."));return}let H=j=>q(e.proj.pieces.map((O,J)=>J===y?{...O,...j}:O));ce(C,o("div",{style:"display:flex;gap:8px;align-items:center"},o("b",{style:"flex:1"},`<${E.name}.…>`),D("모음 지우기",{size:"sm",kind:"danger",onClick:async()=>{await $e(n,{title:`‘${E.name}’ 모음을 지울까요?`,body:"이 모음을 부르는 프롬프트는 오류가 나요.",ok:"지우기",danger:!0})&&(q(e.proj.pieces.filter((j,O)=>O!==y)),x())}})),...E.pieces.map((j,O)=>{let J=le=>H({pieces:e.proj.pieces[y].pieces.map((me,pe)=>pe===O?{...me,...le}:me)});return o("div",{style:"display:flex;flex-direction:column;gap:6px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:10px"},o("div",{style:"display:flex;gap:8px;align-items:center"},o("input",{class:"rb-input",value:j.name,style:"flex:1","aria-label":"조각 이름",onChange:le=>{let me=A(le.target.value);me&&J({name:me}),x()}}),_n(j.multi,{label:"여러 줄",onChange:le=>J({multi:le})}),D("",{size:"sm",kind:"ghost",icon:"trash",title:"조각 지우기",onClick:()=>{H({pieces:e.proj.pieces[y].pieces.filter((le,me)=>me!==O)}),x()}})),Ie({value:j.prompt,rows:3,label:`조각 ${j.name}`,onInput:le=>J({prompt:le})}))}),D("조각 더하기",{icon:"plus",id:"sds-piece-add",onClick:()=>{let j="조각";for(let O=2;E.pieces.some(J=>J.name===j);O++)j=`조각${O}`;H({pieces:[...E.pieces,{name:j,prompt:"",multi:!1}]}),x()}})),Xn(C)};x(),await fe(n,P=>je("조각 모음",760,o("div",{style:"display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start"},v,C),o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>P(!0)})))),e.paintLeft()}async function p(){let[y]=await zn({accept:"image/png,image/jpeg,image/webp"});if(!y)return null;let v=new Uint8Array(await y.arrayBuffer()),C=await e.sd.saveAsset(v);return e.remember(C,v),C}async function b(){let y=o("div",{style:"display:flex;flex-direction:column;gap:12px"}),v=A=>e.set(ze(e.proj,{vibes:A})),C=()=>{let A=e.proj.settings,q=Le(A.sampling.model);ce(y,q.vibe?o("span",{class:"rb-muted",style:"white-space:normal"},"그림의 분위기·그림체를 따라 그려요. 처음 쓰는 그림(또는 정보량을 바꾼 그림)은 NovelAI가 한 번 분석해요(Anlas 2)."):o("div",{class:"rb-note warn",style:"white-space:normal"},"V5 모델은 바이브를 쓸 수 없어요. 샘플링/모델 설정에서 V4.5·V4를 고르면 켜져요."),o("div",{style:"display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px"},...A.vibes.map((x,P)=>{let E=H=>v(e.proj.settings.vibes.map((j,O)=>O===P?{...j,...H}:j));return o("div",{style:"display:flex;flex-direction:column;gap:6px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:8px"},o("div",{class:"sds-card",style:"aspect-ratio:1/1;cursor:default"},e.thumb(x.path,{now:!0})),_n(x.on,{label:"켜기",onChange:H=>E({on:H})}),o("label",{class:"rb-muted",style:"font-size:12px"},`세기 ${x.strength.toFixed(2)}`),o("input",{type:"range",min:0,max:1,step:.01,value:x.strength,onChange:H=>{E({strength:Number(H.target.value)}),C()}}),o("label",{class:"rb-muted",style:"font-size:12px"},`정보량 ${x.info.toFixed(2)}`),o("input",{type:"range",min:.01,max:1,step:.01,value:x.info,onChange:H=>{E({info:Number(H.target.value),enc:null}),C()}}),D("빼기",{size:"sm",kind:"ghost",icon:"trash",onClick:()=>{v(e.proj.settings.vibes.filter((H,j)=>j!==P)),C()}}))})),D("그림 더하기",{icon:"plus",id:"sds-vibe-add",onClick:async()=>{try{let x=await p();x&&(v([...e.proj.settings.vibes,{id:Math.random().toString(36).slice(2,10),path:x,strength:.6,info:1,on:!0,enc:null}]),C())}catch(x){e.toast(x?.message??String(x),{error:!0})}}})),Xn(y)};C(),await fe(n,A=>je("바이브 이미지",640,y,o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>A(!0)})))),e.paintLeft()}async function f(){let y=o("div",{style:"display:flex;flex-direction:column;gap:12px"}),v=A=>e.set(ze(e.proj,{refs:A})),C=()=>{let A=e.proj.settings,q=Le(A.sampling.model);ce(y,q.reference?o("span",{class:"rb-muted",style:"white-space:normal"},"고른 그림의 캐릭터·그림체를 따라 그려요(캐릭터 레퍼런스, 최대 2장). 장당 Anlas가 들 수 있어요."):o("div",{class:"rb-note warn",style:"white-space:normal"},"V5 모델은 레퍼런스를 쓸 수 없어요. V4.5를 골라 주세요."),...A.refs.map((x,P)=>{let E=H=>v(e.proj.settings.refs.map((j,O)=>O===P?{...j,...H}:j));return o("div",{style:"display:flex;gap:12px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:10px;align-items:flex-start"},o("div",{class:"sds-card",style:"width:110px;cursor:default;flex-shrink:0"},e.thumb(x.path,{now:!0})),o("div",{style:"flex:1;display:flex;flex-direction:column;gap:8px"},xe([["character","캐릭터"],["style","그림체"],["character&style","둘 다"]],x.type,H=>E({type:H}),"레퍼런스 종류"),o("label",{class:"rb-muted",style:"font-size:12px"},`세기 ${x.strength.toFixed(2)}`),o("input",{type:"range",min:0,max:1,step:.01,value:x.strength,onChange:H=>{E({strength:Number(H.target.value)}),C()}}),o("label",{class:"rb-muted",style:"font-size:12px"},`충실도 ${x.fidelity.toFixed(2)}`),o("input",{type:"range",min:0,max:1,step:.01,value:x.fidelity,onChange:H=>{E({fidelity:Number(H.target.value)}),C()}}),o("div",{style:"display:flex;gap:8px"},_n(x.on,{label:"켜기",onChange:H=>E({on:H})}),D("빼기",{size:"sm",kind:"ghost",icon:"trash",onClick:()=>{v(e.proj.settings.refs.filter((H,j)=>j!==P)),C()}}))))}),D("그림 더하기",{icon:"plus",id:"sds-ref-add",disabled:A.refs.length>=2,onClick:async()=>{try{let x=await p();x&&(v([...e.proj.settings.refs,{id:Math.random().toString(36).slice(2,10),path:x,strength:.6,fidelity:1,type:"character&style",on:!0}]),C())}catch(x){e.toast(x?.message??String(x),{error:!0})}}})),Xn(y)};C(),await fe(n,A=>je("레퍼런스 설정",560,y,o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>A(!0)})))),e.paintLeft()}let w=["top","back","neg","sampling","size","seed","chars"];async function M(){let y=await Be(n,{title:"프리셋 저장",label:"이름",placeholder:"예: 하얀 배경 고양이 화풍"});if(!y?.trim())return;let v=(await e.sd.loadPresets()).filter(A=>A.name!==y.trim()),C=e.proj.settings;await e.sd.savePresets([...v,{name:y.trim(),at:Date.now(),settings:Object.fromEntries(w.map(A=>[A,structuredClone(C[A])]))}]),e.toast(`프리셋 ‘${y.trim()}’을 저장했어요`)}async function m(y){let v=await e.sd.loadPresets();if(!v.length){e.toast("저장한 프리셋이 없어요. 왼쪽 위 저장 버튼으로 만들어요.");return}Se(n,y,[...v.map(C=>({label:C.name,icon:"preset",onClick:async()=>{await $e(n,{title:`‘${C.name}’을 불러올까요?`,body:"상위·하위·네거티브 프롬프트와 시드·크기·샘플링·캐릭터 프롬프트가 바뀌어요. 캐릭터·씬·그림은 그대로예요.",ok:"불러오기"})&&(e.set(kn({...e.proj,settings:{...e.proj.settings,...C.settings}})),e.paint(),e.toast(`‘${C.name}’을 불러왔어요`))}})),"sep",{label:"프리셋 지우기…",icon:"trash",danger:!0,onClick:async()=>{let C=await Be(n,{title:"지울 프리셋 이름",label:`있는 것: ${v.map(A=>A.name).join(", ")}`});C&&(await e.sd.savePresets(v.filter(A=>A.name!==C.trim())),e.toast("지웠어요"))}}])}async function $(){let y=[],v=e.proj,C=v.settings;await e.sd.getToken()||y.push(["warn","NovelAI 토큰이 없어요. 설정(톱니)에서 넣어요."]);for(let q of v.chars)for(let x of q.scenes){if(!De(x.slots)){y.push(["warn",`${q.name} › ${x.name}: 켜진 조각이 없는 슬롯이 있어 그릴 수 없어요.`]);continue}try{let P=un({top:C.top,own:nn(v,q),middle:ln(x,0),back:C.back},v.pieces);Ve(P).length||y.push(["warn",`${q.name} › ${x.name}: 프롬프트가 비었어요.`])}catch(P){y.push(["err",`${q.name} › ${x.name}: ${P.message}`])}}try{Dn(C.neg,v.pieces)}catch(q){y.push(["err",`네거티브: ${q.message}`])}let A=v.chars.flatMap(q=>q.scenes.map(x=>[q,x,gn(C.size,x)])).filter(([,,q])=>!Tn(q.width,q.height,C.sampling.steps));A.length&&y.push(["info",`Anlas가 드는 크기·스텝인 씬 ${A.length}개(1024×1024·28스텝 넘음).`]),await fe(n,q=>je("문제 확인",560,y.length?o("div",{style:"display:flex;flex-direction:column;gap:6px"},...y.map(([x,P])=>o("div",{class:`rb-note ${x}`,style:"white-space:normal"},P))):o("div",{class:"rb-note info"},"문제가 없어요."),o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>q(!0)}))))}async function L(){let y=(v,...C)=>o("div",null,o("b",null,v),...C.map(A=>o("p",{style:"margin:4px 0 0;white-space:normal;color:var(--rb-sub)"},A)));await fe(n,v=>je("에셋 제작 도움말",620,y("흐름","캐릭터 카드를 만들고 → 캐릭터를 열어 씬(표정·포즈)을 만들고 → 씬마다 예약하고 → 위 ‘생성’을 누르면 차례로 그려요. 고른 그림을 봇의 감정 이미지·추가 에셋(모듈은 모듈 에셋)으로 넣어요."),y("프롬프트","최종 = 상위 + 외형 + 씬 조합 + 하위. 상위에 | 를 넣으면 그 자리에 씬 조합이 들어가요. ##주석##은 지워지고, {a|b}는 하나를 골라요. <모음.조각>은 조각 모음에서 펼쳐요."),y("씬 조합","씬은 슬롯(열) 여러 개로 되어 있고 슬롯마다 켜진 조각 하나씩 골라 조합해요. 예약 1장 = 조합 전부를 한 장씩."),y("모드","씬 모드: 카드로 보기 · 갤러리 모드: 모든 그림 · 검색 모드: 이름·프롬프트 찾기 · 비교 모드: 그림 여러 장 나란히 · 동시편집: 여러 씬 프롬프트를 한 번에."),y("그림","그림을 누르면 크게 보고, 즐겨찾기·대표·변형·인페인트·업스케일·디렉터 도구(배경 지우기 등)를 써요. 이미지 월드컵으로 순위를 매기면 1위가 대표가 돼요."),y("폴더","캐릭터·소속으로 캐릭터를 묶어요. 폴더 안에 폴더, 한 캐릭터를 여러 폴더에 넣을 수 있어요. 카드를 고른 뒤 ‘폴더에 넣기’나 카드 메뉴로 넣어요."),y("보낼 그림 고르기·바로 넣기",`그림 카드 왼쪽 위 체크(또는 ${Yn()?"⌘":"Ctrl"}+클릭)로 보낼 그림을 골라요. 고른 것은 씬을 옮기거나 다시 열어도 남고, 씬 카드에 ✓수로 보여요. ‘고른 그림 바로 넣기’(${e.keyLabel("put")})를 누르면 고른 그림만 씬 이름으로 봇에 들어가요. 자리·형식(WebP·AVIF)·같은 이름 처리는 설정에서, 알림의 ‘되돌리기’로 바로 취소해요.`),y("템플릿","씬 구성을 템플릿으로 저장하고 다른 캐릭터에 적용해요. SDStudio 씬 템플릿 파일(.json)도 가져와요. 맨 위에서 적용하면 모든 캐릭터, 폴더 안에서는 그 폴더의 캐릭터, 캐릭터 안에서는 그 캐릭터에 들어가요. 씬이 이미 있으면 합칠지 바꿀지 골라요."),y("되돌리기·단축키",`${e.keyLabel("undo")} 되돌리기, ${e.keyLabel("redo")} 다시하기(봇에 넣은 것은 알림의 되돌리기로). 단축키는 설정 → 단축키 설정에서 바꿔요. 맥은 ⌘ 기준이에요.`),y("부스트 모드","설정에서 켜고 토큰을 여러 개 넣으면 동시에 그려요. 한 기기에서 여러 계정을 쓰면 NovelAI 제재 대상이 될 수 있어요."),y("저장","그림은 만들자마자 리스 에셋 저장소에 저장되고, 이 화면 목록에서 빼도 저장소 파일은 남아요. 작업 묶음은 봇·모듈마다 따로 저장돼요."),o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>v(!0)}))))}async function G({force:y=!1}={}){if(!y&&await e.sd.getToken())return!0;let v=o("input",{type:"password",class:"rb-input",placeholder:"pst-…",autocomplete:"off",id:"sds-token","data-autofocus":""});return await fe(n,A=>(v.addEventListener("keydown",q=>{q.key==="Enter"&&v.value.trim()&&A(!0)}),je("NovelAI 토큰",460,o("span",{class:"rb-muted",style:"white-space:normal"},"NovelAI → 계정 설정 → 영구 API 토큰(pst-…)을 넣어요. 이 기기에만 저장되고 다른 곳으로 보내지 않아요."),v,o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>A(!1)}),D("저장",{kind:"primary",id:"sds-token-ok",onClick:()=>v.value.trim()&&A(!0)})))))&&v.value.trim()?(await e.sd.setToken(v.value.trim()),!0):!1}async function Z(){let y=await e.sd.getPrefs(),v=!!await e.sd.getToken(),C=e.target.kind==="module"?[["assets","모듈 에셋"]]:[["additionalAssets","추가 에셋"],["emotionImages","감정 이미지"]],A=o("span",{class:"rb-muted"},`품질 ${Math.round(y.putQuality*100)}`),q=o("div",{style:"display:flex;flex-direction:column;gap:6px"}),x=async()=>{let H=await e.sd.getTokens();ce(q,...H.map((j,O)=>o("div",{style:"display:flex;gap:8px;align-items:center"},o("span",{style:"flex:1"},`${j.label||`토큰 ${O+1}`} · …${j.token.slice(-4)}`),D("빼기",{size:"sm",kind:"ghost",onClick:async()=>{await e.sd.setTokens(H.filter((J,le)=>le!==O)),x()}}))),D("토큰 더하기",{size:"sm",icon:"plus",id:"sds-token-add",onClick:async()=>{let j=await h("부스트 모드 토큰 더하기");j&&(await e.sd.setTokens([...H,{label:`계정 ${H.length+1}`,token:j}]),x())}}))};x();let P=o("div",{id:"sds-boost"}),E=()=>ce(P,xe([["off","끔"],["on","켬"]],e.prefs.boost?"on":"off",async H=>{let j=H==="on";if(j&&!await $e(n,{title:"부스트 모드를 켤까요?",body:"한 기기에서 여러 NovelAI 계정으로 동시에 그리는 것은 NovelAI 정책상 제재·계정 정지 대상이 될 수 있어요. 모든 책임은 사용하는 사람에게 있어요(SDStudio 원본 안내와 같음).",ok:"알고 켜기",danger:!0})){E();return}await e.sd.setPrefs({boost:j}),e.prefs.boost=j,e.paintTop(),E()},"부스트 모드"));E(),await fe(n,H=>je("설정",560,be("NovelAI 토큰",o("div",{style:"display:flex;gap:8px;align-items:center"},o("span",{class:"rb-muted",style:"flex:1"},v?"저장됨(이 기기)":"없음"),D(v?"바꾸기":"넣기",{size:"sm",onClick:()=>{H(!0),G({force:!0})}}))),o("b",null,"태그 자동완성"),o("div",{style:"display:flex;flex-direction:column;gap:8px"},_n(y.tags!==!1,{label:"프롬프트 칸에서 태그 자동완성",onChange:async j=>{await e.sd.setPrefs({tags:j}),e.prefs.tags=j}}),o("span",{class:"rb-muted",style:"font-size:12px;white-space:normal"},`${e.sd.tags()?`사전 ${e.sd.tags().size.toLocaleString()}개 있음`:"사전 없음 — 프롬프트를 칠 때 받기를 권해요(약 2MB, 처음 한 번)"} · 두 글자부터 · ↑↓로 고르고 Enter·Tab으로 넣기 · 한글(예: 긴 머리)로도 찾아요. 사전: SDStudio(MIT).`),o("div",{style:"display:flex;gap:8px;flex-wrap:wrap"},D("지금 받기",{size:"sm",id:"sds-tags-dl",onClick:async()=>{try{let j=await e.sd.loadTags();e.toast(`태그 ${j.size.toLocaleString()}개`)}catch(j){e.toast(j?.message??String(j),{error:!0})}}}),D("파일에서 불러오기(.csv/.csv.gz)",{size:"sm",onClick:async()=>{let[j]=await zn({accept:".csv,.gz,text/csv,application/gzip"});if(j)try{let O=await e.sd.loadTagsFromBytes(new Uint8Array(await j.arrayBuffer()));e.toast(`태그 ${O.size.toLocaleString()}개를 불러왔어요`)}catch(O){e.toast(`불러오지 못했어요: ${O?.message??O}`,{error:!0})}}}))),o("b",null,"봇에 넣기"),C.length>1?be("바로 넣을 자리",xe(C,y.putSlot||C[0][0],async j=>{await e.sd.setPrefs({putSlot:j}),e.prefs.putSlot=j},"바로 넣을 자리")):null,be("넣을 때 형식(용량 줄이기)",xe([["png","원본 PNG"],["webp","WebP"],["avif","AVIF"]],y.putFormat,async j=>{await e.sd.setPrefs({putFormat:j}),e.prefs.putFormat=j},"넣을 때 형식"),A,o("input",{type:"range",min:.5,max:1,step:.01,value:y.putQuality,onInput:j=>{A.textContent=`품질 ${Math.round(j.target.value*100)}`},onChange:async j=>{let O=Number(j.target.value);await e.sd.setPrefs({putQuality:O}),e.prefs.putQuality=O}}),o("span",{class:"rb-muted",style:"white-space:normal;font-size:12px"},"AVIF를 못 만드는 브라우저면 WebP로 넣어요. 바꾼 것이 더 크면 원본 그대로 넣어요.")),be("넣을 때 에셋 이름",xe([["scene","씬"],["us","폴더_캐릭터_씬.확장자"],["dot","폴더.캐릭터.씬.확장자"]],y.nameStyle??"scene",async j=>{await e.sd.setPrefs({nameStyle:j}),e.prefs.nameStyle=j},"에셋 이름"),o("span",{class:"rb-muted",style:"white-space:normal;font-size:12px"},"폴더 = 그 캐릭터가 든 캐릭터 폴더(없으면 첫 폴더, 폴더가 없으면 빼요). 예: 아비도스_호시노_smile.webp")),be("같은 이름이 이미 있으면",xe([["number","번호 붙여 더하기"],["replace","그림 바꾸기"]],y.dup,async j=>{await e.sd.setPrefs({dup:j}),e.prefs.dup=j},"같은 이름")),o("b",null,"부스트 모드(여러 계정으로 동시에 그리기)"),P,o("span",{class:"rb-muted",style:"white-space:normal;font-size:12px"},"켜면 아래 토큰 수만큼(최대 4) 동시에 그려요. 토큰은 이 기기에만 저장돼요."),q,o("b",null,"그 밖"),be("‘모두 예약’ 장 수",Ft(e.proj.settings.reserveDefault,{min:1,max:20,id:"sds-rdef",onChange:j=>{e.set(ze(e.proj,{reserveDefault:Math.max(1,Math.min(20,Math.round(j)||1))})),e.paintTools()}})),D("단축키 설정…",{icon:"zap",id:"sds-keys",onClick:()=>{H(!0),N()}}),o("span",{class:"rb-muted",style:"white-space:normal"},"그림은 만들 때 바로 리스 에셋 저장소에 저장돼요. 목록에서 빼도 파일은 남아요."),o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>H(!0)}))))}async function h(y){let v=o("input",{type:"password",class:"rb-input",placeholder:"pst-…",autocomplete:"off","data-autofocus":""});return await fe(n,A=>je(y,440,v,o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>A(!1)}),D("더하기",{kind:"primary",onClick:()=>v.value.trim()&&A(!0)}))))?v.value.trim():""}async function N(){let y={...e.keys},v=null,C=o("div",{style:"display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center"}),A=()=>ce(C,...Object.entries(Er).flatMap(([P,E])=>[o("span",null,E),o("button",{type:"button",class:"rb-chip","aria-pressed":String(v===P),dataset:{action:P},style:"min-width:120px;justify-content:center",onClick:()=>{v=P,A()}},v===P?"키를 누르세요…":Ot(y[P])||"없음")])),q=P=>{if(!v)return;if(P.preventDefault(),P.stopPropagation(),P.key==="Escape"){v=null,A();return}if(P.key==="Backspace"||P.key==="Delete"){y=Or(y,v,""),v=null,A();return}let E=Tt(P);E&&(y=Or(y,v,E),v=null,A())};n.ownerDocument.addEventListener("keydown",q,!0),A();let x=await fe(n,P=>je("단축키 설정",520,o("span",{class:"rb-muted",style:"white-space:normal"},`줄을 누르고 새 키를 눌러요. 지우려면 Backspace. 다른 동작과 겹치면 그쪽은 비워져요.${Yn()?" 맥은 ⌘가 주 보조키예요(⌃ Control·⌥ Option도 따로 쓸 수 있어요).":""}`),C,o("div",{class:"btns"},D("기본값",{kind:"ghost",onClick:()=>{y={...Ir},A()}}),D("취소",{kind:"ghost",onClick:()=>P(!1)}),D("저장",{kind:"primary",id:"sds-keys-save",onClick:()=>P(!0)}))));n.ownerDocument.removeEventListener("keydown",q,!0),x&&(e.keys=y,await e.sd.setPrefs({keys2:y}),e.paintTools(),e.toast("단축키를 저장했어요"))}async function R(y,v){let C="merge";return X.textContent=U.merge,fe(n,A=>je(`‘${v}’ 템플릿 적용`,500,o("span",{class:"rb-muted",style:"white-space:normal"},`씬이 이미 있는 캐릭터가 ${y}명이에요. 어떻게 할까요? (처음 상태인 캐릭터는 그냥 템플릿 씬으로 채워요)`),xe([["merge","합치기"],["replace","바꾸기"]],C,q=>{C=q,X.textContent=U[q]},"적용 방식"),X,o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>A(null)}),D("적용",{kind:"primary",id:"sds-tpl-ok",onClick:()=>A(C)}))))}var U={merge:"있는 씬은 그대로 두고, 템플릿에만 있는 씬을 뒤에 더해요.",replace:"씬 목록을 템플릿대로 바꿔요. 이름이 같은 씬은 프롬프트만 바뀌고 그림은 남아요. 템플릿에 없는 씬은 빠져요(되돌리기 가능)."},X=o("span",{style:"white-space:normal;font-size:13px"},U.merge);async function he({apply:y}){let v=o("div",{style:"display:flex;flex-direction:column;gap:8px"}),C=async()=>{let q=await e.sd.loadTemplates();ce(v,...q.length?q.map((x,P)=>o("div",{style:"display:flex;gap:8px;align-items:center;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:8px 10px"},o("div",{style:"flex:1;min-width:0;display:flex;flex-direction:column"},o("b",null,x.name),o("span",{class:"rb-muted",style:"font-size:12px;white-space:normal"},`씬 ${x.scenes.length}개 · ${x.scenes.slice(0,6).map(E=>E.name).join(", ")}${x.scenes.length>6?" …":""}`)),D("적용",{size:"sm",kind:"primary",onClick:async()=>{A?.(!0),await y(x)}}),D("",{size:"sm",kind:"ghost",icon:"edit",title:"이름 바꾸기",onClick:async()=>{let E=await Be(n,{title:"템플릿 이름",label:"이름",value:x.name});E?.trim()&&(q[P]={...x,name:E.trim()},await e.sd.saveTemplates(q),C())}}),D("",{size:"sm",kind:"ghost",icon:"download",title:"파일로 내보내기",onClick:()=>$n(`${x.name}.dusk-template.json`,os(x),"application/json")}),D("",{size:"sm",kind:"ghost",icon:"trash",title:"지우기",onClick:async()=>{await $e(n,{title:`‘${x.name}’ 템플릿을 지울까요?`,ok:"지우기",danger:!0})&&(q.splice(P,1),await e.sd.saveTemplates(q),C())}}))):[o("span",{class:"rb-muted",style:"white-space:normal"},"저장한 템플릿이 없어요. 캐릭터를 연 뒤 ‘씬을 템플릿으로 저장’하거나 SDStudio 씬 템플릿 파일을 가져와요.")])},A=null;await C(),await fe(n,q=>(A=q,je("템플릿 관리",620,v,o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>q(!0)})))))}async function V({count:y}){let v=e.target.kind==="module"?[["assets","모듈 에셋"]]:[["additionalAssets","추가 에셋"],["emotionImages","감정 이미지"]],C=v.some(x=>x[0]===e.prefs.putSlot)?e.prefs.putSlot:v[0][0],A=e.prefs.dup??"number",q=o("input",{class:"rb-input",id:"sds-put-name",placeholder:"비우면 씬 이름"});return fe(n,x=>je(`고른 그림 ${y}장을 넣을까요?`,480,o("span",{class:"rb-muted",style:"white-space:normal"},`고른 그림만 넣어요. 형식은 설정대로(${{png:"원본 PNG",webp:"WebP",avif:"AVIF"}[e.prefs.putFormat]??"WebP"}) 바꿔요.`),v.length>1?be("넣을 자리",xe(v,C,P=>{C=P},"넣을 자리")):null,be("이름",q),be("같은 이름이 이미 있으면",xe([["number","번호 붙여 더하기"],["replace","그림 바꾸기"]],A,P=>{A=P},"같은 이름")),o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>x(null)}),D("넣기",{kind:"primary",id:"sds-put-ok",onClick:()=>x({slot:C,name:q.value.trim(),dup:A})}))))}async function oe({rows:y,names:v,title:C="즐겨찾기를 봇에 넣기"}){let A=e.target.kind==="module"?[["assets","모듈 에셋"]]:[["additionalAssets","추가 에셋"],["emotionImages","감정 이미지"]],q=A.some(pe=>pe[0]===e.prefs.putSlot)?e.prefs.putSlot:A[0][0],x=e.prefs.dup??"number",P=y.map(()=>!0),E=o("div",{class:"sds-exp-list",id:"sds-exp-list"}),H=o("span",{class:"rb-muted",style:"white-space:normal;font-size:12.5px"}),j=null,O=pe=>{let we=v[q]??new Set,qe=pe.nameFor(q).toLowerCase();return pe.it.sent&&we.has(pe.it.sent.toLowerCase())?["sent","이미 넣음"]:we.has(qe)?["dup",x==="replace"?"바꿈":"같은 이름 있음 → 번호"]:["new","새로"]};y.forEach((pe,we)=>{O(pe)[0]==="sent"&&(P[we]=!1)});let J=()=>{let pe={new:0,dup:0,sent:0};ce(E,...y.map((qe,Ue)=>{let[Te,Zn]=O(qe);return P[Ue]&&pe[Te]++,o("label",{class:"sds-exp-row",dataset:{st:Te}},o("input",{type:"checkbox",checked:P[Ue],"aria-label":`${qe.nameFor(q)} 넣기`,onChange:qn=>{P[Ue]=qn.target.checked,J()}}),e.thumb(qe.it.path,{now:!0}),o("span",{class:"nm",title:qe.nameFor(q)},qe.nameFor(q),o("small",{class:"rb-muted",style:"display:block;font-weight:500"},qe.label)),o("span",{class:["st",Te]},Zn))}));let we=P.filter(Boolean).length;H.textContent=`넣을 그림 ${we}장 · 새로 ${pe.new} · 같은 이름 ${pe.dup}${pe.sent?` · 이미 넣은 것 ${pe.sent}`:""} — 형식은 설정대로(${{png:"원본 PNG",webp:"WebP",avif:"AVIF"}[e.prefs.putFormat]??"WebP"}), 이름 끝 확장자는 바뀔 수 있어요.`,j&&(j.disabled=!we,j.lastChild.textContent=`${we}장 넣기`)},le=pe=>{P.fill(pe),J()},me=()=>{y.forEach((pe,we)=>{P[we]=O(pe)[0]!=="sent"}),J()};return fe(n,pe=>(j=D("넣기",{kind:"primary",id:"sds-exp-ok",onClick:()=>{let we=P.flatMap((qe,Ue)=>qe?[Ue]:[]);we.length&&pe({idx:we,slot:q,dup:x})}}),J(),je(C,620,A.length>1?be("넣을 자리",xe(A,q,we=>{q=we,me()},"넣을 자리")):null,be("같은 이름이 이미 있으면",xe([["number","번호 붙여 더하기"],["replace","그림 바꾸기"]],x,we=>{x=we,J()},"같은 이름")),o("div",{class:"sds-row",style:"gap:6px;flex-wrap:wrap"},D("모두",{size:"sm",kind:"ghost",onClick:()=>le(!0)}),D("안 넣은 것만",{size:"sm",kind:"ghost",id:"sds-exp-unsent",onClick:me}),D("모두 풀기",{size:"sm",kind:"ghost",onClick:()=>le(!1)})),E,H,o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>pe(null)}),j))))}async function ee({projs:y,hasImages:v}){let C=y.map(()=>!0),A=y.reduce((j,O)=>j+O.favCount,0),q=v?A?"fav":"all":"none",x=o("div",{class:"sds-exp-list",id:"sds-bk-list"}),P=o("span",{class:"rb-muted",style:"white-space:normal;font-size:12.5px"}),E=null,H=()=>{ce(x,...y.map((J,le)=>o("label",{class:"sds-exp-row"},o("input",{type:"checkbox",checked:C[le],"aria-label":`${J.name} 가져오기`,onChange:me=>{C[le]=me.target.checked,H()}}),o("span",{class:"nm",title:J.name},J.name,o("small",{class:"rb-muted",style:"display:block;font-weight:500"},[J.folder&&`폴더 ${J.folder}`,`씬 ${J.tpl.scenes.length}`,v&&`그림 ${J.count}`,v&&`즐겨찾기 ${J.favCount}`].filter(Boolean).join(" · "))))));let j=y.filter((J,le)=>C[le]),O=q==="none"?0:j.reduce((J,le)=>J+(q==="all"?le.count:le.favCount),0);P.textContent=`캐릭터 ${j.length}명으로 가져와요${O?` · 그림 ${O}장`:""}. 폴더는 같은 이름 폴더에 넣고, 같은 이름 캐릭터가 있으면 번호를 붙여요. 상위·제외 프롬프트는 비어 있을 때만 채워요.`,E&&(E.disabled=!j.length,E.lastChild.textContent=`${j.length}명 가져오기`)};return fe(n,j=>(E=D("가져오기",{kind:"primary",id:"sds-bk-ok",onClick:()=>{let O=C.flatMap((J,le)=>J?[le]:[]);O.length&&j({idx:O,mode:q})}}),H(),je("SDStudio 백업 가져오기",600,o("span",{class:"rb-muted",style:"white-space:normal;font-size:12.5px"},"SDStudio 프로젝트 하나가 캐릭터 하나가 돼요. 씬 구성·조각·앞쪽 프롬프트(외형)를 가져오고, 그림은 리스 에셋 저장소에 저장해요."),v?be("그림",xe([["fav","즐겨찾기만"],["all","모두"],["none","그림 없이"]],q,O=>{q=O,H()},"가져올 그림")):o("span",{class:"rb-muted",style:"font-size:12.5px"},"이 파일에는 그림이 없어 씬 구성만 가져와요."),x,P,o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>j(null)}),E))))}function ne({title:y,name:v="",kind:C="",prompt:A="",ok:q="만들기"}){let x=C,P=o("textarea",{class:"rb-input",rows:3,id:"sds-fprompt",placeholder:"예: school uniform, halo — 이 폴더(안의 폴더 포함) 캐릭터 프롬프트 앞에 붙어요"},A),E=()=>({name:H.value.trim(),kind:x,prompt:P.value}),H=o("input",{type:"text",class:"rb-input",value:v,placeholder:"예: 수영복 / 아비도스","data-autofocus":"",id:"sds-fname"});return fe(n,j=>(H.addEventListener("keydown",O=>{O.key==="Enter"&&H.value.trim()&&j(E())}),je(y,460,be("폴더 이름",H),be("무엇으로 묶나요",xe([["outfit","캐릭터"],["group","소속"],["","그 밖"]],x,O=>{x=O},"폴더 종류")),be("폴더 프롬프트",P,o("span",{class:"rb-muted",style:"font-size:12px;white-space:normal"},"상위 폴더 프롬프트 → 하위 폴더 프롬프트 → 캐릭터 외형 순으로 이어져요.")),o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>j(null)}),D(q,{kind:"primary",id:"sds-fok",onClick:()=>H.value.trim()&&j(E())})))))}async function Ce(){let y=e.sd.tags();if(!y)try{y=await e.sd.loadTags()}catch(j){e.toast(`${j?.message??j} — 설정 → 태그 자동완성에서 파일로 불러올 수 있어요`,{error:!0});return}let v=()=>e.prefs.artistFav??[],C=async j=>{e.prefs.artistFav=j,await e.sd.setPrefs({artistFav:j})},A=o("input",{class:"rb-input",type:"search",id:"sds-art-q",placeholder:"작가 이름 찾기(두 글자부터)","data-autofocus":""}),q=o("div",{class:"sds-artlist",id:"sds-art-list"}),x=j=>new RegExp(`(^|,)\\s*artist:${j.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*(,|$)`,"i").test(e.proj.settings.top??""),P=j=>{let O=String(e.proj.settings.top??"").replace(/\s*,?\s*$/,"");e.set(ze(e.proj,{top:x(j)?O:`${O}${O?", ":""}artist:${j}`})),e.paintLeft(),H()},E=(j,O)=>o("div",{class:"it"},o("button",{type:"button",class:["sds-ib",v().includes(j)&&"on"],title:"자주 쓰는 작가","aria-label":"자주 쓰는 작가",onClick:async()=>{await C(v().includes(j)?v().filter(J=>J!==j):[...v(),j]),H()}},ie("star",16)),o("span",{class:"w"},j),O!=null?o("span",{class:"rb-muted",style:"font-size:12px"},mt(O)):null,D(x(j)?"넣음":"넣기",{size:"sm",kind:x(j)?"ghost":"primary",disabled:x(j),onClick:()=>P(j)})),H=()=>{let j=A.value.trim(),O=j.length>=2?(()=>{let J=[],le=bn(j);for(let me=0;me<y.size&&J.length<400;me++)y.cats[me]===1&&!y.redirs[me]&&y.keys[me].includes(le)&&J.push(me);return J.sort((me,pe)=>y.freqs[pe]-y.freqs[me]).slice(0,40)})():[];ce(q,v().length?o("small",{class:"rb-muted"},"자주 쓰는 작가"):null,...v().map(J=>E(J,null)),j.length>=2?o("small",{class:"rb-muted"},O.length?`찾은 작가 ${O.length}`:"없어요"):o("small",{class:"rb-muted"},"이름을 두 글자 이상 쳐요. 넣으면 상위 프롬프트 끝에 artist:이름 으로 붙어요."),...O.map(J=>E(y.words[J],y.freqs[J])))};A.addEventListener("input",()=>H()),H(),await fe(n,j=>je("작가 태그(그림체)",520,A,q,o("div",{class:"btns"},D("닫기",{kind:"primary",onClick:()=>j()}))))}return{artists:Ce,sampling:i,charPrompts:t,pieces:l,vibes:b,refs:f,savePreset:M,loadPreset:m,check:$,help:L,token:G,settings:Z,put:V,exportPreview:oe,backupImport:ee,folderDialog:ne,keysDialog:N,templateChoice:R,templateManager:he}}function Vo(e,{label:n,onChange:a,disabled:s}={}){let i=ht(e,{label:n,disabled:s,onChange:(t,l)=>{pt(l,t),a?.(t,l)}});return o("label",{class:"sds-sw",style:"display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600"},i,n?o("span",null,n):null)}var ws=async(e,n,a)=>{try{await navigator.clipboard.writeText(String(n)),e.toast(`${a}을 복사했어요`)}catch{e.toast("복사하지 못했어요",{error:!0})}};function Fr(e,n,a=0){let s=Math.max(0,Math.min(n.length-1,a)),i=null,t=o("img",{alt:"크게 보기",id:"sds-lb-img"}),l=o("div",{class:"stage"},t),p=o("aside",{class:"info",id:"sds-lb-info"}),b=o("button",{type:"button",class:"nav",style:"left:12px","aria-label":"이전 그림",onClick:()=>$(-1)},ie("chevL",22)),f=o("button",{type:"button",class:"nav",style:"right:12px","aria-label":"다음 그림",onClick:()=>$(1)},ie("chevR",22));l.append(b,f);let w=o("div",{class:"rb-full-head",style:"min-height:52px"}),M=o("div",{class:"sds-over",role:"dialog","aria-label":"그림 크게 보기",id:"sds-lightbox",tabIndex:-1},w,o("div",{class:"sds-lb"},l,p)),m=()=>{i&&URL.revokeObjectURL(i),M.remove(),e.paintBody()},$=U=>{n.length&&(s=(s+U+n.length)%n.length,Z())},L=()=>n[s],G=()=>{let U=L(),X=se(e.proj,U.cid,U.sid);return{it:U,sc:X,c:ge(e.proj,U.cid),im:X?.images.find(he=>he.path===U.path)}};async function Z(){let{it:U,sc:X,c:he,im:V}=G();if(!V)return n.splice(s,1),n.length?(s=Math.min(s,n.length-1),Z()):m();b.hidden=f.hidden=n.length<2,ce(w,o("button",{type:"button",class:"rb-icon-btn","aria-label":"닫기",onClick:m},ie("x",20)),o("div",{class:"ttl"},o("small",null,`${he.name} › ${X.name}`),o("b",null,`${s+1} / ${n.length}`)));let oe=sn(X)===V.path&&!!X.cover,ee=(ne,Ce,y,v={})=>D(ne,{size:"sm",icon:Ce,...v,onClick:y});ce(p,o("div",{style:"display:flex;gap:8px;align-items:center"},o("button",{type:"button",class:["sds-ib",V.fav&&"on"],id:"sds-lb-fav",title:"즐겨찾기 (F)","aria-pressed":String(V.fav),onClick:()=>h()},ie("star",18)),o("b",{style:"flex:1"},V.rank?`${V.rank}위`:V.fav?"즐겨찾기":""),V.from?o("span",{class:"rb-badge"},{img2img:"변형",infill:"인페인트",upscale:"업스케일"}[V.from]??en[V.from]??V.from):null),o("div",{class:"sds-acts"},ee(V.pick?"고름 ✓":"보낼 그림으로 고르기","check",()=>{e.togglePick(U),Z()},{id:"sds-lb-pick",kind:V.pick?"primary":""}),ee("이 그림만 봇에 넣기","download",()=>e.quickPut([{path:V.path,name:X.name,cid:U.cid,sid:U.sid}]),{id:"sds-lb-put"}),ee("넣는 방법…","sliders",()=>e.putPaths([{path:V.path,name:X.name,cid:U.cid,sid:U.sid}])),ee(oe?"씬 대표":"씬 대표로","check",()=>{e.set(Pe(e.proj,U.cid,U.sid,{cover:V.path})),Z()},{disabled:oe}),ee("캐릭터 대표로","character",()=>{e.set(Fe(e.proj,U.cid,{cover:V.path})),e.toast("캐릭터 카드 대표로 했어요")})),o("div",{class:"sds-acts"},ee("변형","refresh",()=>R("img2img")),ee("인페인트","brush",()=>Wo(e,U,V)),ee("업스케일","size",()=>R("upscale")),ee("디렉터 도구","sparkle",ne=>Se(e.ctx.win,ne.currentTarget,Object.entries(en).map(([Ce,y])=>({label:y,onClick:()=>R(Ce)}))))),o("div",{class:"sds-acts"},ee("비교에 넣기","split",()=>{e.addCompare(U),e.toast("비교 모드에 넣었어요")}),ee("이 시드로 고정","zap",()=>{V.seed&&(e.set(ze(e.proj,{seed:{mode:"fixed",value:V.seed}})),e.paintLeft(),e.toast(`시드 ${V.seed}로 고정했어요`))},{disabled:!V.seed}),ee("내려받기","download",async()=>$n(`${he.name}_${X.name}_${s+1}.png`,new Blob([await e.bytes(V.path)],{type:"image/png"}))),ee("목록에서 빼기","trash",()=>N(),{kind:"danger"})),o("div",{style:"display:flex;gap:8px;align-items:center;font-size:13px"},o("span",{class:"rb-muted"},"시드"),o("b",{style:"flex:1"},V.seed??"-"),V.seed?D("복사",{size:"sm",kind:"ghost",onClick:()=>ws(e,V.seed,"시드")}):null),V.w?o("div",{class:"rb-muted",style:"font-size:13px"},`${V.w}×${V.h}`):null,V.prompt?o("div",{style:"display:flex;flex-direction:column;gap:6px"},o("div",{style:"display:flex;align-items:center"},o("span",{class:"rb-label",style:"flex:1"},"프롬프트"),D("복사",{size:"sm",kind:"ghost",onClick:()=>ws(e,V.prompt,"프롬프트")})),o("pre",null,V.prompt)):null);for(let ne of p.children)ne.style.flexShrink="0";M.contains(document.activeElement)||M.focus({preventScroll:!0});try{let ne=await e.url(V.path);if(L()?.path!==V.path){URL.revokeObjectURL(ne);return}i&&URL.revokeObjectURL(i),i=ne,t.src=ne}catch{t.removeAttribute("src")}}function h(){let{it:U,im:X}=G();e.set(tn(e.proj,U.cid,U.sid,X.path,{fav:!X.fav})),Z(),e.paintBody?.()}async function N(){let{it:U}=G();if(await $e(e.ctx.win,{title:"목록에서 뺄까요?",body:"이 화면 목록에서만 빠져요. 리스 에셋 저장소 파일과 이미 봇에 넣은 에셋은 그대로예요.",ok:"빼기",danger:!0})){if(e.set(Cn(e.proj,U.cid,U.sid,[U.path])),n.splice(s,1),!n.length)return m();s=Math.min(s,n.length-1),Z()}}async function R(U){let{it:X,sc:he,im:V}=G(),oe=U==="img2img"?await Ko(e,V,he):U==="upscale"?await Ho(e,V):en[U]?await Go(e,U):null;if(!oe)return;let ee=await e.derive(X,U,oe);ee&&(n.splice(s,0,{cid:X.cid,sid:X.sid,path:ee}),Z())}M.addEventListener("keydown",U=>{e.ctx.win.querySelector(".rb-modal, .rb-menu")||(U.key==="Escape"?(U.stopPropagation(),m()):U.key==="ArrowLeft"?$(-1):U.key==="ArrowRight"?$(1):U.key==="f"||U.key==="F"?h():U.key==="Delete"&&N())}),e.el.appendChild(M),M.focus(),Z()}async function Ko(e,n,a){let s=.7,i=0,t=Ie({value:n.prompt||"",rows:4,label:"변형 프롬프트"}),l=o("span",{class:"rb-muted"},`세기 ${s}`),p=o("span",{class:"rb-muted"},`노이즈 ${i}`);return fe(e.ctx.win,b=>o("div",{class:"rb-dialog",role:"dialog","aria-label":"변형",style:"max-width:520px"},o("h3",{class:"rb-h3"},"이미지 변형(img2img)"),o("span",{class:"rb-muted",style:"white-space:normal"},`이 그림을 바탕으로 다시 그려요. 결과는 ‘${a.name}’ 씬에 더해져요.`),o("span",{class:"rb-label"},"프롬프트"),t,l,o("input",{type:"range",min:.01,max:.99,step:.01,value:s,onInput:f=>{s=Number(f.target.value),l.textContent=`세기 ${s}`}}),p,o("input",{type:"range",min:0,max:.99,step:.01,value:i,onInput:f=>{i=Number(f.target.value),p.textContent=`노이즈 ${i}`}}),o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>b(null)}),D("변형",{kind:"primary",id:"sds-i2i-ok",onClick:()=>b({strength:s,noise:i,prompt:t.textarea.value})}))))}async function Ho(e,n){let a=null;try{let s=wn(await e.bytes(n.path));a=_a(s.width,s.height)}catch(s){return e.toast(s?.message??String(s),{error:!0}),null}return await $e(e.ctx.win,{title:"2배로 키울까요?",body:`NovelAI 업스케일은 Anlas ${a}가 들어요(서버가 최종 결정). 결과는 같은 씬에 더해져요.`,ok:"업스케일"})?{}:null}async function Go(e,n){if(n!=="colorize"&&n!=="emotion")return await $e(e.ctx.win,{title:`${en[n]}`,body:"NovelAI 디렉터 도구로 이 그림을 바꿔요. 결과는 같은 씬에 더해져요. Anlas가 들 수 있어요.",ok:"하기"})?{}:null;let a="happy",s=0,i=o("input",{class:"rb-input",placeholder:n==="emotion"?"더할 말(선택)":"예: red hair, blue eyes"});return fe(e.ctx.win,t=>o("div",{class:"rb-dialog",role:"dialog","aria-label":en[n],style:"max-width:480px"},o("h3",{class:"rb-h3"},en[n]),n==="emotion"?o("select",{class:"rb-input",id:"sds-emotion",onChange:l=>{a=l.target.value}},...Ma.map(l=>o("option",{value:l,selected:l===a},l))):null,i,o("span",{class:"rb-label"},"약하게(0~5)"),xe([0,1,2,3,4,5].map(l=>[String(l),String(l)]),"0",l=>{s=Number(l)},"약하게"),o("div",{class:"btns"},D("취소",{kind:"ghost",onClick:()=>t(null)}),D("하기",{kind:"primary",onClick:()=>t({emotion:a,prompt:i.value,defry:s})}))))}async function Wo(e,n,a){let s=await e.bytes(a.path),i=wn(s)??{width:a.w||832,height:a.h||1216},t=new Image,l=URL.createObjectURL(new Blob([s],{type:"image/png"}));await new Promise(V=>{t.onload=V,t.onerror=V,t.src=l});let p=o("canvas",{width:i.width,height:i.height,id:"sds-inpaint-canvas",style:"cursor:crosshair"}),b=Object.assign(document.createElement("canvas"),{width:i.width,height:i.height}),f=p.getContext("2d"),w=b.getContext("2d"),M=64,m=!1,$=1,L=!0,G=!1,Z=null,h=()=>{f.clearRect(0,0,i.width,i.height),f.drawImage(t,0,0,i.width,i.height),f.globalAlpha=.45,f.drawImage(b,0,0),f.globalAlpha=1},N=V=>{let oe=p.getBoundingClientRect();return{x:(V.clientX-oe.left)*(i.width/oe.width),y:(V.clientY-oe.top)*(i.height/oe.height)}},R=(V,oe)=>{w.globalCompositeOperation=m?"destination-out":"source-over",w.strokeStyle="#ff3b6b",w.lineWidth=M,w.lineCap="round",w.beginPath(),w.moveTo(V.x,V.y),w.lineTo(oe.x,oe.y),w.stroke(),h()};p.addEventListener("pointerdown",V=>{G=!0,Z=N(V),p.setPointerCapture?.(V.pointerId),R(Z,Z)}),p.addEventListener("pointermove",V=>{if(!G)return;let oe=N(V);R(Z,oe),Z=oe}),p.addEventListener("pointerup",()=>{G=!1}),h();let U=Ie({value:a.prompt||"",rows:3,label:"인페인트 프롬프트"}),X=o("span",{class:"rb-muted"},`붓 ${M}`),he=await new Promise(V=>{let oe=o("div",{class:"sds-over",role:"dialog","aria-label":"인페인트",id:"sds-inpaint"},o("div",{class:"rb-full-head"},o("button",{type:"button",class:"rb-icon-btn","aria-label":"닫기",onClick:()=>{oe.remove(),V(null)}},ie("x",20)),o("div",{class:"ttl"},o("small",null,"인페인트"),o("b",null,"다시 그릴 곳을 칠해요"))),o("div",{class:"sds-lb"},o("div",{class:"sds-paint"},p),o("aside",{class:"info"},X,o("input",{type:"range",min:8,max:256,value:M,onInput:ee=>{M=Number(ee.target.value),X.textContent=`붓 ${M}`}}),xe([["paint","칠하기"],["erase","지우개"]],"paint",ee=>{m=ee==="erase"},"붓"),D("칠한 것 모두 지우기",{size:"sm",kind:"ghost",onClick:()=>{w.clearRect(0,0,i.width,i.height),h()}}),o("span",{class:"rb-label"},"프롬프트"),U,o("span",{class:"rb-label"},"세기"),o("input",{type:"range",min:.01,max:1,step:.01,value:$,onInput:ee=>{$=Number(ee.target.value)}}),Vo(L,{label:"칠하지 않은 곳은 그대로 두기",onChange:ee=>{L=ee}}),D("인페인트",{kind:"primary",id:"sds-inpaint-ok",onClick:async()=>{let ee=Object.assign(document.createElement("canvas"),{width:i.width,height:i.height}),ne=ee.getContext("2d");ne.fillStyle="#000",ne.fillRect(0,0,i.width,i.height);let Ce=Object.assign(document.createElement("canvas"),{width:i.width,height:i.height}),y=Ce.getContext("2d");y.drawImage(b,0,0),y.globalCompositeOperation="source-in",y.fillStyle="#fff",y.fillRect(0,0,i.width,i.height),ne.drawImage(Ce,0,0);let v=await new Promise(C=>ee.toBlob(C,"image/png"));oe.remove(),V({mask:new Uint8Array(await v.arrayBuffer()),prompt:U.textarea.value,strength:$,keep:L})}}))));for(let ee of oe.querySelector(".info").children)ee.style.flexShrink="0";e.el.appendChild(oe)});URL.revokeObjectURL(l),he&&await e.derive(n,"infill",he)}async function Sn(e,n,a){let s=se(e.proj,n,a);if(!s||s.images.length<2){e.toast("그림이 2장 이상 있어야 해요");return}let i=jr(s.images.map(m=>m.path)),t=[],l=o("div",{class:"rb-full-head"}),p=o("div",{class:"pair"}),b=o("div",{class:"sds-over",role:"dialog","aria-label":"이미지 월드컵",id:"sds-cup",tabIndex:-1},l,o("div",{class:"sds-cup"},p,o("div",{class:"rb-muted",style:"text-align:center;padding:0 0 14px"},"더 마음에 드는 쪽을 눌러요 · ← → 키"))),f=m=>{for(let $ of t)URL.revokeObjectURL($);b.remove(),m&&e.paintBody()},w=m=>{i=zr(i,m),M()};async function M(){if($r(i))return e.set(Pe(Ar(e.proj,n,a,i.ranks),n,a,{cover:Object.keys(i.ranks).find(h=>i.ranks[h]===1)??""})),e.toast("순위를 매겼어요. 1위가 씬 대표가 됐어요"),f(!0);let[m,$]=qt(i),L=i.at/2+1,G=Math.floor(i.players.length/2);ce(l,o("button",{type:"button",class:"rb-icon-btn","aria-label":"그만하기",onClick:()=>f(!1)},ie("x",20)),o("div",{class:"ttl"},o("small",null,`이미지 월드컵 · ${s.name}`),o("b",null,`${Mr(i)} ${L}/${G}`)));let Z=async(h,N)=>{let R=o("button",{type:"button","aria-label":N?"오른쪽 고르기":"왼쪽 고르기",class:"sds-cup-pick",onClick:()=>w(N)});try{let U=await e.url(h);t.push(U),R.append(o("img",{src:U,alt:""}))}catch{}return R};ce(p,await Z(m,0),await Z($,1)),b.contains(document.activeElement)||b.focus({preventScroll:!0})}b.addEventListener("keydown",m=>{m.key==="Escape"?(m.stopPropagation(),f(!1)):m.key==="ArrowLeft"?w(0):m.key==="ArrowRight"&&w(1)}),e.el.appendChild(b),b.focus(),M()}function Dr(e,n,{start:a=0,onlyNoFav:s=!1}={}){let i=s,t=0,l=0,p=null,b=n.filter(v=>se(e.proj,v.cid,v.sid)?.images.length),f=()=>b.filter(v=>{let C=se(e.proj,v.cid,v.sid);return C?.images.length&&(!i||!an(C)||v===w)}),w=b[a]??null,M=o("img",{alt:"후보 그림",id:"sds-ch-img"}),m=o("button",{type:"button",class:"nav",style:"left:12px","aria-label":"이전 후보",onClick:()=>oe(-1)},ie("chevL",22)),$=o("button",{type:"button",class:"nav",style:"right:12px","aria-label":"다음 후보",onClick:()=>oe(1)},ie("chevR",22)),L=o("span",{class:"sds-ch-star","aria-hidden":"true"},"★"),G=o("div",{class:"stage"},M,L,m,$),Z=o("div",{class:"rb-full-head",style:"min-height:52px"}),h=o("div",{class:"sds-ch-strip rb-scroll",id:"sds-ch-strip"}),N=o("div",{class:"sds-ch-acts"}),R=o("div",{class:"sds-over",role:"dialog","aria-label":"대표 고르기",id:"sds-chooser",tabIndex:-1},Z,o("div",{class:"sds-ch"},G,h,N)),U=()=>{p&&URL.revokeObjectURL(p),R.remove(),e.paint()},X=()=>f(),he=()=>{let C=X()[t];return C?{x:C,sc:se(e.proj,C.cid,C.sid),c:ge(e.proj,C.cid)}:null},V=()=>{let v=he();return v?Ne(v.sc):[]};function oe(v){let C=V().length;C&&(l=(l+v+C)%C,y())}function ee(v){let C=X();if(!C.length)return;t=Math.max(0,Math.min(C.length-1,t+v)),w=C[t],l=0;let A=X();t=Math.max(0,A.indexOf(w)),y()}function ne(v){let C=he(),A=V()[l];!C||!A||(e.set(tn(e.proj,C.x.cid,C.x.sid,A.path,{fav:v??!A.fav})),l=Math.max(0,V().findIndex(q=>q.path===A.path)),y())}function Ce(){let v=V()[l];if(!v)return;v.fav||ne(!0);let C=X(),A=C.indexOf(w);if(A>=C.length-1){e.toast("마지막 씬이에요");return}w=C[A+1],l=0,t=Math.max(0,X().indexOf(w)),y()}async function y(){let v=X();if(!v.length)return e.toast(i?"즐겨찾기 없는 씬이 없어요":"그림이 있는 씬이 없어요"),U();(!w||!v.includes(w))&&(w=v[Math.min(t,v.length-1)]),t=v.indexOf(w);let{x:C,sc:A,c:q}=he(),x=Ne(A);l=Math.max(0,Math.min(l,x.length-1));let P=x[l],E=x.filter(j=>j.fav).length,H=b.filter(j=>{let O=se(e.proj,j.cid,j.sid);return O&&!an(O)}).length;if(ce(Z,o("button",{type:"button",class:"rb-icon-btn","aria-label":"닫기",onClick:U},ie("x",20)),o("div",{class:"ttl"},o("small",null,`씬 ${t+1} / ${v.length} · 즐겨찾기 없는 씬 ${H}`),o("b",{id:"sds-ch-title"},`${q.name} › ${A.name}`)),o("span",{class:"sp",style:"flex:1"}),o("label",{class:"sds-sw",style:"display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;cursor:pointer"},o("input",{type:"checkbox",id:"sds-ch-only",checked:i,onChange:j=>{i=j.target.checked,y()}}),"즐겨찾기 없는 씬만")),L.hidden=!P?.fav,m.hidden=$.hidden=x.length<2,ce(h,...x.map((j,O)=>o("button",{type:"button",class:["sds-ch-th",O===l&&"on",j.fav&&"fav"],"aria-label":`후보 ${O+1}${j.fav?" 즐겨찾기":""}`,"aria-pressed":String(O===l),onClick:()=>{l=O,y()},onDblclick:()=>{l=O,ne()}},e.thumb(j.path,{now:!0}),o("span",{class:"n"},String(O+1)),j.fav?o("span",{class:"f"},"★"):null))),h.querySelector(".on")?.scrollIntoView?.({block:"nearest",inline:"nearest"}),ce(N,o("span",{class:"rb-muted",style:"font-size:12px"},`후보 ${l+1} / ${x.length} · 즐겨찾기 ${E}`),o("span",{class:"sp",style:"flex:1"}),D("이전 씬",{size:"sm",icon:"chevL",id:"sds-ch-prev",disabled:t<=0,onClick:()=>ee(-1)}),D(P?.fav?"즐겨찾기 풀기 (F)":"즐겨찾기 (F)",{size:"sm",icon:"sparkle",id:"sds-ch-fav",kind:P?.fav?"primary":"",onClick:()=>ne()}),D("이걸로 정하고 다음 씬 (Enter)",{size:"sm",kind:"primary",icon:"check",id:"sds-ch-next",onClick:()=>Ce()}),D("다음 씬",{size:"sm",icon:"chevR",id:"sds-ch-skip",disabled:t>=v.length-1,onClick:()=>ee(1)})),(!R.contains(document.activeElement)||document.activeElement===R)&&R.focus({preventScroll:!0}),!P){M.removeAttribute("src");return}try{let j=await e.url(P.path);if(V()[l]?.path!==P.path){URL.revokeObjectURL(j);return}p&&URL.revokeObjectURL(p),p=j,M.src=j}catch{M.removeAttribute("src")}}return R.addEventListener("keydown",v=>{if(e.ctx.win.querySelector(".rb-modal, .rb-menu")||/^(INPUT|SELECT|TEXTAREA)$/.test(v.target?.tagName??"")&&v.target.type!=="checkbox")return;let C=v.key;if(C==="Escape"){v.stopPropagation(),U();return}let q={ArrowLeft:()=>oe(-1),ArrowRight:()=>oe(1),ArrowUp:()=>ee(-1),ArrowDown:()=>ee(1),PageUp:()=>ee(-1),PageDown:()=>ee(1),Enter:()=>Ce(),f:()=>ne(),F:()=>ne()}[C]??(/^[1-9]$/.test(C)?()=>{let x=Number(C)-1;x<V().length&&(l=x,y())}:null);q&&(v.preventDefault(),v.stopPropagation(),q())}),e.el.appendChild(R),R.focus(),y(),{close:U}}var ks=new TextDecoder,Ln=(e,n,a)=>{let s=n;for(;s<n+a&&e[s];)s++;return ks.decode(e.subarray(n,s))},Yo=(e,n,a)=>parseInt(Ln(e,n,a).trim()||"0",8)||0,Jo=/\.(png|webp|jpe?g|avif)$/i;async function Nr(e,n){let a=[],s=0,i=null,t=null;for(;s+512<=n;){let l=await e(s,512);if(l.every($=>$===0))break;let p=Yo(l,124,12),b=String.fromCharCode(l[156]||48),f=s+512,w=Ln(l,0,100),M=Ln(l,257,6),m=M.startsWith("ustar")?Ln(l,345,155):"";if(m&&(w=`${m}/${w}`),b==="L")i=Ln(await e(f,p),0,p);else if(b==="x"){let $=ks.decode(await e(f,p));t={};for(let L of $.split(`
`)){let G=/^\d+ ([^=]+)=(.*)$/.exec(L);G&&(t[G[1]]=G[2])}}else b==="g"||(t?.path?w=t.path:i&&(w=i),(b==="0"||b==="\0"||b==="7")&&a.push({name:w.replace(/^\.\//,""),off:f,size:p}),i=null,t=null);s=f+Math.ceil(p/512)*512}return a}var Ur=e=>e.length>=262&&Ln(e,257,5)==="ustar";async function ys(e,n){let a=new Set(e.map(p=>p.name)),s=null;a.has("_backup.json")?s=await n("_backup.json").catch(()=>null):a.has("_folder.json")&&(s=await n("_folder.json").catch(()=>null));let i=e.filter(p=>/(^|\/)project\.json$/.test(p.name)).map(p=>p.name.slice(0,-12)),t=p=>{if(s?.type==="sdstudio-folder-backup")return s.folder||"";let b=(s?.projects??[]).find(f=>f&&(f.name===p||f===p));return(b&&typeof b=="object"?b.folder:"")||""},l=[];for(let p of i){let b;try{b=await n(`${p}project.json`)}catch{continue}if(!b||typeof b.scenes!="object")continue;let f=String(b.name||p.replace(/\/$/,"").split("/").pop()||"SDStudio").slice(0,80);l.push(Rr(b,{name:f,folder:t(p.replace(/\/$/,""))||t(f),root:p,files:e}))}return l}function Rr(e,{name:n=e?.name||"SDStudio",folder:a="",root:s="",files:i=[]}={}){let t=e.selectedWorkflow?.workflowType||"SDImageGen",l=e.selectedWorkflow?.presetName,p=e.presets?.[t]??e.presets?.SDImageGen??[],b=(Array.isArray(p)?p.find(L=>L?.name===l)??p[0]:null)??{},f=It(e);f.scenes=f.scenes.filter((L,G)=>(Object.values(e.scenes)[G]?.type??"scene")==="scene");let w={},M=0,m=0,$=new Map;for(let L of i){if(!L.name.startsWith(`${s}outs/`)||!Jo.test(L.name))continue;let G=L.name.slice(`${s}outs/`.length),Z=G.lastIndexOf("/");if(Z<0)continue;let h=G.slice(0,Z),N=G.slice(Z+1);$.has(h)||$.set(h,[]),$.get(h).push({file:N,entry:L.name})}for(let[L,G]of Object.entries(e.scenes??{})){if(!G||G.type&&G.type!=="scene")continue;let Z=String(G.name||L),h=$.get(Z)??[],N=new Set((G.mains??[]).map(X=>String(X).split("/").pop())),R=(G.imageMap??[]).map(X=>String(X).split("/").pop()),U=X=>{let he=R.indexOf(X);return he<0?1e9:he};h.sort((X,he)=>U(X.file)-U(he.file)||X.file.localeCompare(he.file)),w[Z]=h.map(X=>({...X,fav:N.has(X.file)})),M+=h.length,m+=w[Z].filter(X=>X.fav).length}return{name:n,folder:String(a||""),prompt:String(b.frontPrompt??""),back:String(b.backPrompt??""),neg:String(b.uc??""),tpl:f,images:w,count:M,favCount:m}}function vs(e,n,{mode:a="fav"}={},s){let i=e,t=[],l=new Set(e.chars.map(f=>f.name)),p=f=>{if(!l.has(f))return l.add(f),f;let w=2;for(;l.has(`${f} ${w}`);)w++;return l.add(`${f} ${w}`),`${f} ${w}`};for(let f of n){i=s?yn(i,{name:p(f.name),prompt:f.prompt},s):yn(i,{name:p(f.name),prompt:f.prompt});let w=i.chars[i.chars.length-1];if(f.tpl.scenes.length&&(i=Mn(i,[w.id],f.tpl,"replace",s).project),f.folder){let m=i.folders.find($=>$.name===f.folder&&!$.parent);m||(i=s?vn(i,{name:f.folder},s):vn(i,{name:f.folder}),m=i.folders[i.folders.length-1]),i=Rn(i,[w.id],{to:m.id})}if(a==="none")continue;let M=ge(i,w.id);for(let m of M.scenes)(f.images[m.name]??[]).filter(L=>a==="all"||L.fav).forEach((L,G)=>t.push({cid:w.id,sid:m.id,entry:L.entry,fav:L.fav,order:G}))}let b=n[0];if(b){let f=i.settings,w={};!String(f.back??"").trim()&&b.back.trim()&&(w.back=b.back),!String(f.neg??"").trim()&&b.neg.trim()&&(w.neg=b.neg),Object.keys(w).length&&(i=ze(i,w))}return{project:i,jobs:t}}var Br=globalThis.__duskLib?.["src/vendor/fflate-full.js"];if(!Br)throw new Error("Dusk 코어에 src/vendor/fflate-full.js가 없어요 — Dusk를 업데이트해 주세요");{let e=["Decompress","strFromU8","strToU8","unzipSync","zipSync"].filter(n=>!(n in Br));if(e.length)throw new Error("Dusk 본체가 이 애드온보다 오래됐어요(src/vendor/fflate-full.js에 없는 기능: "+e.slice(0,3).join(", ")+") — Dusk를 업데이트해 주세요")}var{Decompress:r0,strFromU8:a0,strToU8:s0,unzipSync:xs,zipSync:o0}=Br;var Cs=[["scene","씬 모드"],["gallery","갤러리 모드"],["search","검색 모드"],["compare","비교 모드"],["bulk","동시편집"]],Qo={outfit:"캐릭터",group:"소속"},Zo=[["default",""],["smile","smile"],["happy","happy, smile, open mouth"],["laughing","laughing, closed eyes"],["angry","angry, v-shaped eyebrows"],["sad","sad, frown"],["crying","crying, tears"],["surprised","surprised, open mouth, wide-eyed"],["shy","shy, blush, looking away"],["embarrassed","embarrassed, blush, sweat"],["confused","confused, head tilt"],["thinking","thinking, hand on own chin"],["sleepy","sleepy, half-closed eyes"],["smug","smug, smirk"],["scared","scared, trembling"],["disgusted","disgusted"],["determined","determined, clenched hand"],["bored","bored, half-closed eyes"],["excited","excited, sparkle"],["love","heart-shaped pupils, blush"]],Dt=new Map;async function Vr(e,n,a){if(!n?.id||n.kind!=="module"&&n.kind!=="character")return;hs();let s=`${n.kind}:${n.id}`;if(Dt.has(s)){let r=Dt.get(s);return r.reopen(),r}let i="";if(n.kind==="module")i=(await e.svc.load({fresh:!0})).entries.find(r=>r.module.id===n.id)?.module?.name??"";else{let r=await e.api.getCharacterFromIndex(n.index);if(!r||r.chaId!==n.id)throw new Error("봇을 찾지 못했어요. 목록을 새로 고친 뒤 다시 해 주세요");i=r.name}let t=await a.loadProject(n),l=(e.state.sdstudio??={})[`${n.kind}:${n.id}`]??={folder:null,charId:null,sceneId:null,mode:"scene",zoom:41,names:!0,left:(e.win.clientWidth||innerWidth)>760,q:"",compare:[],slotsOpen:!0};l.folder&&!t.folders.some(r=>r.id===l.folder)&&(l.folder=null),l.charId&&!ge(t,l.charId)&&(l.charId=null,l.sceneId=null),l.sceneId&&!se(t,l.charId,l.sceneId)&&(l.sceneId=null);let p=new Set,b=new Map,f=new Map,w=null,M=null,m={running:!1,done:0,total:0,ctl:null,workers:1},$=ls(),L=await a.getPrefs(),G=!1;us({get:()=>a.tags(),enabled:()=>L.tags!==!1,offered:()=>G,load:async()=>{G=!0;let r=e.toast("태그 사전 받는 중…",{seconds:120});try{let d=await a.loadTags();return e.toast(`태그 ${d.size.toLocaleString()}개를 받았어요`),d}finally{r?.close?.()}}}),a.loadTags({download:!1}).catch(()=>{});let Z={root:e.root?.getAttribute("style")??null,win:e.win.getAttribute("style")??null};e.root&&(e.root.style.padding="0"),Object.assign(e.win.style,{maxWidth:"none",maxHeight:"none",width:"100%",height:"100%",borderRadius:"0",border:"0"}),e.api.showContainer?.("fullscreen")?.catch?.(()=>{});let h={ctx:e,target:n,sd:a,st:l,sel:p,title:i,P:Je,prefs:L,keys:L.keys2?Tr(L.keys2):Tr(L.keys,{v:1}),keyLabel:r=>Ot(h.keys[r])||"단축키 없음",get proj(){return t},set(r,{undo:d=!0}={}){d&&r!==t&&$.push(t,{typing:globalThis.event?.type==="input"}),t=r,clearTimeout(w),w=setTimeout(()=>h.persist(),500)},undo(){let r=$.undo(t);if(!r){h.toast("되돌릴 것이 없어요");return}t=r,N()},redo(){let r=$.redo(t);if(!r){h.toast("다시 할 것이 없어요");return}t=r,N()},persist(){return clearTimeout(w),a.saveProject(n,t).catch(r=>e.toast(`저장하지 못했어요: ${r?.message??r}`,{error:!0}))},toast:(r,d)=>e.toast(r,d),curChar:()=>l.charId?ge(t,l.charId):null,curScene:()=>l.charId&&l.sceneId?se(t,l.charId,l.sceneId):null,remember(r,d){b.set(r,d),f.has(r)||f.set(r,URL.createObjectURL(new Blob([d],{type:"image/png"})))},async bytes(r){if(b.has(r))return b.get(r);let d=await e.assets.read(r,{prio:100});if(!d)throw new Error("그림을 읽지 못했어요");return b.size>24&&b.delete(b.keys().next().value),b.set(r,d),d},async url(r){return URL.createObjectURL(new Blob([await h.bytes(r)],{type:"image/png"}))},thumb(r,{now:d=!1}={}){let c=o("img",{alt:"",loading:"lazy",dataset:{path:r,ext:"png"}});return f.has(r)?c.src=f.get(r):d?e.assets.thumb?.(r,"png").then(g=>{g&&(c.src=g)}).catch(()=>{}):M?.observe(c),c},addCompare(r){l.compare=[...l.compare.filter(d=>d.path!==r.path),r].slice(-4)},toggleLeft(r=!l.left){l.left=r,V.hidden=!r,U.setAttribute("aria-pressed",String(r))},paint(){h.paintLeft(),h.paintTop(),h.paintTools(),h.paintBody()},paintLeft(){ms(h,he)},paintTop:y,paintTools:E,paintBody:B,putPaths:dt,derive:Js,quickPut:Re};function N(){l.charId&&!ge(t,l.charId)&&(l.charId=null,l.sceneId=null),l.sceneId&&!se(t,l.charId,l.sceneId)&&(l.sceneId=null),l.folder&&!t.folders.some(r=>r.id===l.folder)&&(l.folder=null),p.clear(),clearTimeout(w),w=setTimeout(()=>h.persist(),300),h.paint()}h.dlg=fs(h);let R=o("div",{class:"rb-full sds",role:"dialog","aria-label":"에셋 제작",id:"rb-sd-studio",tabIndex:-1});h.el=R,R.__sds=h;let U=o("button",{type:"button",class:"tab","aria-pressed":String(l.left),title:"프롬프트 에디터 열고 닫기 (F1)",onClick:()=>h.toggleLeft()},"프롬프트"),X=o("nav",{class:"sds-rail","aria-label":"옆 칸"},o("span",{class:"key"},"F1"),U),he=o("div",{class:"sds-left-body rb-scroll",id:"sds-left"}),V=o("aside",{class:"sds-left",hidden:!l.left,"aria-label":"프롬프트 에디터"},...bs(h),he),oe=o("div",{class:"sds-top",id:"sds-topbar"}),ee=o("div",{class:"sds-tools",id:"sds-tools",role:"toolbar","aria-label":"도구"}),ne=o("div",{class:"sds-body rb-scroll",id:"sds-body"});ne.addEventListener("contextmenu",r=>{r.target.closest(".sds-card,.sds-frow,input,textarea,select,button")||(r.preventDefault(),Os(r.target.closest("div")??ne))}),ne.addEventListener("click",r=>{l.focus&&!r.target.closest(".sds-card,.sds-frow,.rb-chip,button,input,select,textarea,label")&&le(null)});let Ce=o("div",{class:"sds-main"},oe,ee,ne);R.append(X,V,Ce),e.win.appendChild(R);function y(){let r=h.curChar(),d=Cr(t,r?.id??null),c=m.running?o("button",{type:"button",class:"sds-queue stop",id:"sds-run",onClick:()=>ia()},ie("stop",14),`멈추기 ${m.done}/${m.total}`):o("button",{type:"button",class:"sds-queue",id:"sds-run",disabled:!Ye(t).length,title:h.prefs.boost?"부스트 모드: 토큰 여러 개로 동시에 그려요":"예약된 씬을 차례로 그려요",onClick:()=>ct()},ie(h.prefs.boost?"bolt":"play",14),`${h.prefs.boost?"부스트 ":""}생성${Ye(t).length?` ${Ye(t).length}장`:""}`);ce(oe,o("button",{type:"button",class:"sds-ib",style:"border:0;background:none","aria-label":l.sceneId||l.charId||l.folder||l.mode!=="scene"?"위로":"에셋 제작 닫기",title:l.sceneId||l.charId||l.folder?"한 단계 위로":"닫기",id:"sds-close",onClick:()=>q()},ie("back",20)),o("div",{class:"ttl"},o("b",null,r?"씬 갤러리":"캐릭터 갤러리"),r?o("span",{class:"sds-pill",id:"sds-combos"},`조합 ${d.combos}개`):o("span",{class:"sds-pill"},`캐릭터 ${t.chars.length}명`),o("span",{class:"sds-pill",id:"sds-reserved"},`예약된 씬 ${d.reserved}/${d.scenes}`)),o("div",{class:"sds-modes",role:"tablist","aria-label":"모드"},...Cs.map(([g,u])=>o("button",{type:"button",role:"tab","aria-selected":String(l.mode===g),disabled:g==="bulk"&&!r,dataset:{mode:g},onClick:()=>x(g)},g==="scene"&&!r?"캐릭터 모드":u))),m.running?A():null,o("div",{class:"sds-run"},c,D("도움말",{size:"sm",icon:"help",onClick:()=>h.dlg.help()})))}let v=r=>{let d=Math.max(0,Math.round(r/1e3)),c=Math.floor(d/3600),g=Math.floor(d%3600/60),u=d%60;return c?`${c}시간 ${g}분`:g?`${g}분 ${u}초`:`${u}초`};function C(){let r=m.total?Math.floor(m.done/m.total*100):0,d=m.total-m.done,c=Date.now()-m.t0,g=m.done?c/m.done*d:null;return`${r}% · ${m.done}/${m.total}장 · 남은 ${d}장 · ${g==null?"예상 시간 재는 중":`약 ${v(g)} 남음`}${m.retry?` · 다시 시도 ${m.retry}번째`:""}`}function A(){let r=m.total?m.done/m.total*100:0;return o("div",{class:"sds-prog",id:"sds-prog",role:"progressbar","aria-valuemin":"0","aria-valuemax":"100","aria-valuenow":String(Math.floor(r))},o("div",{class:"bar"},o("i",{style:`width:${r.toFixed(1)}%`})),o("span",{class:"t"},C()))}function q(){if(l.mode!=="scene"&&l.mode!=="bulk")return x("scene");if(l.sceneId)return In(null);if(l.charId)return pn(null);if(l.folder){l.folder=t.folders.find(r=>r.id===l.folder)?.parent??null,l.focus=null,p.clear(),y(),E(),B();return}Jt()}function x(r){l.mode=r,p.clear(),l.sceneId&&r!=="scene"&&(l.sceneId=null),y(),E(),B()}let P=(r,...d)=>o("div",{class:"sds-group"},o("small",null,r),o("div",null,...d.filter(Boolean)));function E(){let r=h.curChar(),d=h.curScene(),c=t.settings.reserveDefault,g=p.size,u=it(),k=ea().length,z=lt().reduce((F,T)=>F+Hn(T).length,0),I=P("대표",W("star","대표 고르기 — 씬마다 후보를 넘기며 ★ (←/→ · F · Enter)",()=>Gt(),{id:"sds-choose"}),W("bolt",`즐겨찾기 없는 씬만 ${c}장씩 예약 (${z}개)`,()=>Ks(),{id:"sds-rsv-nofav",disabled:!z})),S=[P("검색",W("search","검색 모드",()=>{x("search"),ne.querySelector("#sds-q")?.focus()},{on:l.mode==="search"}),D(`봇으로 넣기${u.length?` ${u.length}장`:""}`,{kind:"primary",icon:"upload",id:"sds-put-all",title:`고른 그림 ${u.length}장을 봇에 넣어요 (${h.curChar()?"이 캐릭터":l.folder?"이 폴더":"전체"}) · ${h.keyLabel("put")}`,disabled:!u.length,onClick:()=>Re(u)}),D(`즐겨찾기 넣기${k?` ${k}장`:""}`,{icon:"sparkle",id:"sds-put-fav",title:"즐겨찾기한 그림을 확인하고 봇에 넣어요(이름·같은 이름·이미 넣은 것 미리 보기)",disabled:!k,onClick:()=>Ht()})),P("보기",W("eye",l.names?"이름 숨기기":"이름 보이기",()=>{l.names=!l.names,R.classList.toggle("nonames",!l.names),E()},{on:l.names,id:"sds-names"}),o("div",{class:"sds-zoom"},o("input",{type:"range",min:10,max:100,value:l.zoom,"aria-label":"카드 크기",id:"sds-zoom",onInput:F=>{l.zoom=Number(F.target.value),H(),F.target.nextSibling.textContent=`${l.zoom}%`}}),o("span",null,`${l.zoom}%`)))],Y=P("되돌리기",W("undo","되돌리기",()=>h.undo(),{disabled:!$.canUndo(),id:"sds-undo"}),W("redo","다시하기",()=>h.redo(),{disabled:!$.canRedo(),id:"sds-redo"})),_=P("템플릿",W("template",r?"템플릿 적용·관리(이 캐릭터)":l.folder?"템플릿 적용·관리(이 폴더의 캐릭터 모두)":"템플릿 적용·관리(모든 캐릭터)",F=>Ws(F.currentTarget),{id:"sds-tpl"}),W("importIn",r?"SDStudio·Dusk 씬 템플릿 가져와 이 캐릭터에 적용":l.folder?"씬 템플릿 가져와 이 폴더의 캐릭터 모두에 적용":"씬 템플릿 가져와 모든 캐릭터에 적용",()=>ta(),{id:"sds-tpl-import"}),r?W("save","이 캐릭터의 씬을 템플릿으로 저장",()=>ra(r),{id:"sds-tpl-save"}):null),K;if(!r)K=[Y,P("예약",W("calPlus",`모든 캐릭터의 모든 씬 ${c}장씩 예약`,()=>{let F=t;for(let T of t.chars)F=on(F,T.id,c);h.set(F),y(),B()},{id:"sds-rsv-all"}),W("calX","예약 모두 비우기",()=>{h.set(Lt(t,null)),y(),B()},{id:"sds-rsv-clear"})),P("캐릭터 도구",W("file","새 캐릭터",()=>tt(),{id:"sds-addchar"}),W("copy","고른 캐릭터 복제",()=>{for(let F of p)h.set(Ct(t,F));p.clear(),B()},{disabled:!g}),W("folderPlus","폴더 만들기",()=>Bt(),{id:"sds-addfolder"}),W("importIn","SDStudio 백업 가져오기(.tar·프로젝트 .json)",()=>Yt(),{id:"sds-import-backup"}),W("swap","고른 캐릭터를 폴더에 넣기·빼기",F=>Jr(F.currentTarget,[...p]),{disabled:!g||!t.folders.length}),W("trash","고른 캐릭터 지우기",()=>rt([...p]),{danger:!0,disabled:!g})),_,I,P("이미지·관리",W("zip","zip으로 내려받기",F=>Vt(F.currentTarget),{id:"sds-zip"})),P("도움말",W("help","도움말",()=>h.dlg.help())),P("설정",W("gear","설정(넣기 형식·부스트·단축키·토큰)",()=>h.dlg.settings(),{id:"sds-settings"})),o("span",{class:"sp"}),...S];else if(d){let F=We(r,d.id).map(Q=>({...Q,cid:r.id})),T=F.map(Q=>Q.path);K=[Y,P("예약",W("calPlus","이 씬 1장 예약",()=>{h.set(Ee(t,r.id,d.id,d.reserve+1)),y(),B()},{id:"sds-rsv-one"}),W("calX","이 씬 예약 비우기",()=>{h.set(Ee(t,r.id,d.id,0)),y(),B()})),I,P("씬 도구",W("copy","씬 복제",()=>{h.set(Bn(t,r.id,d.id)),h.toast("씬을 복제했어요")}),W("trash","이 씬 지우기",()=>st([d.id]),{danger:!0})),P("이미지·관리",W("exportBot",`고른 그림 ${T.length}장 봇에 바로 넣기 (${h.keyLabel("put")})`,()=>Re(F),{disabled:!T.length,id:"sds-put-sel"}),W("sliders","넣는 방법 고르고 넣기…",()=>dt(F),{disabled:!T.length,id:"sds-put-sel-opt"}),W("star","고른 그림 즐겨찾기 켜기·풀기",()=>{let Q=!T.every(re=>d.images.find(ae=>ae.path===re)?.fav),ye=t;for(let re of T)ye=tn(ye,r.id,d.id,re,{fav:Q});h.set(ye),E(),B()},{disabled:!T.length,id:"sds-fav"}),W("compare","고른 그림 비교",()=>{for(let Q of T)h.addCompare({cid:r.id,sid:d.id,path:Q});x("compare")},{disabled:T.length<2}),W("trophy","이미지 월드컵",()=>Sn(h,r.id,d.id),{disabled:d.images.length<2,id:"sds-cup-btn"}),W("check","모두 고르기",()=>{h.set(rn(t,r.id,d.id,d.images.map(Q=>Q.path),!0),{undo:!1}),E(),B()}),W("x","고르기 풀기",()=>{h.set(St(t,r.id,d.id),{undo:!1}),E(),B()},{disabled:!T.length,id:"sds-unpick"}),W("zip","zip으로 내려받기",Q=>Vt(Q.currentTarget),{id:"sds-zip"}),W("trash","고른 그림 목록에서 빼기",()=>qs(r.id,d.id,T),{danger:!0,disabled:!T.length})),P("도움말",W("help","도움말",()=>h.dlg.help())),P("설정",W("gear","설정(넣기 형식·부스트·단축키·토큰)",()=>h.dlg.settings(),{id:"sds-settings"})),o("span",{class:"sp"}),...S]}else{let F=g?[...p]:null,T=We(r).map(Q=>({...Q,cid:r.id}));K=[Y,P("예약",W("calPlus",F?`고른 씬 ${c}장씩 예약`:`모든 씬 ${c}장씩 예약`,()=>{h.set(on(t,r.id,c,F)),y(),B()},{id:"sds-rsv-all"}),W("calX","이 캐릭터 예약 비우기",()=>{h.set(Lt(t,r.id)),y(),B()},{id:"sds-rsv-clear"})),P("씬 도구",W("file","새 씬",()=>at(),{id:"sds-addscene"}),W("copy","고른 씬 복제",()=>{for(let Q of p)h.set(Bn(t,r.id,Q));p.clear(),B()},{disabled:!g}),W("layers","감정 세트 더하기(없는 것만)",()=>Yr(),{id:"sds-emoset"}),W("sortAsc","이름순 ↑",()=>{h.set(_t(t,r.id,"asc")),B()}),W("sortDesc","이름순 ↓",()=>{h.set(_t(t,r.id,"desc")),B()}),W("trash","고른 씬 지우기",()=>st([...p]),{danger:!0,disabled:!g})),_,I,P("이미지·관리",W("exportBot",`고른 그림 ${T.length}장 봇에 바로 넣기(이름 = 씬 이름) (${h.keyLabel("put")})`,()=>Re(T),{disabled:!T.length,id:"sds-put-picked"}),W("sliders","고른 그림 넣는 방법 고르고 넣기…",()=>dt(T),{disabled:!T.length,id:"sds-put-picked-opt"}),W("x","이 캐릭터의 그림 고르기 모두 풀기",()=>{h.set(St(t,r.id),{undo:!1}),E(),B()},{disabled:!T.length,id:"sds-unpick-all"}),W("trophy","고른 씬 이미지 월드컵",()=>{let Q=[...p][0];Q&&Sn(h,r.id,Q)},{disabled:g!==1}),W("zip","zip으로 내려받기",Q=>Vt(Q.currentTarget),{id:"sds-zip"}),W("clip","고른 씬 프롬프트 복사",()=>Ds(r,F),{disabled:!g})),P("도움말",W("help","도움말",()=>h.dlg.help())),P("설정",W("gear","설정(넣기 형식·부스트·단축키·토큰)",()=>h.dlg.settings(),{id:"sds-settings"})),o("span",{class:"sp"}),...S]}ce(ee,...K)}let H=()=>{R.style.setProperty("--sds-card",`${Math.round(90+l.zoom*2.6)}px`),R.style.setProperty("--sds-row",`${Math.round(80+l.zoom*1.6)}px`)},j=(r,d,c=0)=>o("span",{class:"cap"},o("span",{class:"n"},r),c?o("span",{class:"pk",title:`봇에 보낼 그림 ${c}장 고름`},`✓${c}`):null,o("span",{class:"c"},String(d))),O=()=>o("span",{class:"chk","aria-hidden":"true"},ie("check",14)),J=(r,d)=>l.focus?.kind===r&&l.focus.id===d;function le(r,d){if(l.focus=d?{kind:r,id:d}:null,R.querySelectorAll(".sds-card.cur,.sds-frow.cur").forEach(g=>g.classList.remove("cur")),!d)return;let c=r==="folder"?".sds-frow.sds-folder":`.sds-${r}`;for(let g of ne.querySelectorAll(c))g.dataset.id===d&&g.classList.add("cur")}function me(r,d,c,g){return r.addEventListener("click",u=>{if(!u.target.closest(".quick")){if(u.target.closest(".chk")||u.ctrlKey||u.metaKey||u.shiftKey||p.size&&l.mode!=="scene"){p.has(d)?p.delete(d):p.add(d),r.setAttribute("aria-selected",String(p.has(d))),E();return}if(g==="scene"){p.has(d)&&p.size===1?p.clear():(p.clear(),p.add(d));for(let k of ne.querySelectorAll(".sds-scene"))k.setAttribute("aria-selected",String(p.has(k.dataset.id)));E();return}if(g&&!J(g,d)){le(g,d);return}c()}}),g==="scene"&&r.addEventListener("dblclick",u=>{u.target.closest(".quick")||(p.clear(),c())}),r.setAttribute("aria-selected",String(p.has(d))),g&&r.classList.toggle("cur",J(g,d)),r}let pe={cur:null},we=["drop-before","drop-after","drop-into"],qe=()=>{pe.cur=null;for(let r of R.querySelectorAll(".dragging,.drop-before,.drop-after,.drop-into"))r.classList.remove("dragging",...we),delete r.dataset.dropHint;R.classList.remove("sds-dragging","sds-drag-scene")};function Ue(r,d){r.draggable=!0,r.addEventListener("dragstart",c=>{c.stopPropagation(),pe.cur=d(),c.dataTransfer.effectAllowed="copyMove";try{c.dataTransfer.setData("text/plain","sds")}catch{}r.classList.add("dragging"),R.classList.add("sds-dragging"),pe.cur.kind==="scene"&&R.classList.add("sds-drag-scene")}),r.addEventListener("dragend",qe)}function Te(r,{mode:d,ok:c,run:g,hint:u}){let k=(z,I)=>{let S=d(I);if(S==="into")return"into";let Y=r.getBoundingClientRect(),_=S==="x"?(z.clientX-Y.left)/(Y.width||1):(z.clientY-Y.top)/(Y.height||1);return S==="y3"?_<.25?"before":_>.75?"after":"into":_<.5?"before":"after"};r.addEventListener("dragover",z=>{let I=pe.cur;if(!I||!c(I))return;z.preventDefault(),z.stopPropagation(),z.dataTransfer.dropEffect=z.altKey?"copy":"move";let S=k(z,I);r.classList.remove(...we),r.classList.add("drop-"+S),u?r.dataset.dropHint=u(I,S,z.altKey):delete r.dataset.dropHint}),r.addEventListener("dragleave",z=>{r.contains(z.relatedTarget)||(r.classList.remove(...we),delete r.dataset.dropHint)}),r.addEventListener("drop",z=>{let I=pe.cur;if(!I||!c(I))return;z.preventDefault(),z.stopPropagation();let S=k(z,I),Y=z.altKey;qe(),g(I,S,Y)})}let Zn=r=>p.has(r)&&p.size>1?[...p]:[r],qn=(r,d)=>{let c=r.findIndex(g=>g.id===d);return c<0?null:r[c+1]?.id??null},Ps=(r,d)=>{if(!d)return null;let c=[d],g=new Set;for(;c.length;){let u=c.shift();if(!g.has(u)){if(g.add(u),t.folders.find(k=>k.id===u)?.members.includes(r))return u;for(let k of t.folders)k.parent===u&&c.push(k.id)}}return d},En=()=>{y(),E(),B()};function mn(r,d,c,g){h.set(Rn(t,r.ids,{from:r.from,to:d,before:c,copy:!!d&&g})),p.clear(),En()}function et(r,d,c){try{h.set(br(t,r,d,c)),En()}catch(g){h.toast(g?.message??String(g),{error:!0})}}function Kr(r,d){return Te(r,{mode:()=>"into",ok:c=>c.kind==="char"||c.kind==="folder"&&c.id!==d,hint:c=>d?`‘${t.folders.find(g=>g.id===d)?.name}’(으)로`:c.kind==="char"?"폴더에서 빼기":"맨 위로",run:(c,g,u)=>c.kind==="char"?mn(c,d,null,u):et(c.id,d,null)}),r}let Nt=(r,d,c)=>{let g=gr(r),u=r.scenes.reduce((z,I)=>z+I.reserve,0),k=o("button",{type:"button",class:"sds-card sds-char",dataset:{id:r.id},title:r.name},g?h.thumb(g):o("span",{class:"ph"},ie("person",34)),O(),u?o("span",{class:"rsv"},`예약 ${u}`):null,j(r.name,ur(r),We(r).length));return k.addEventListener("contextmenu",z=>{z.preventDefault(),Is(k,r)}),d!==void 0&&(Ue(k,()=>({kind:"char",ids:Zn(r.id),from:Ps(r.id,d)})),Te(k,{mode:()=>"x",ok:z=>z.kind==="char"&&!(z.ids.length===1&&z.ids[0]===r.id),run:(z,I,S)=>mn(z,d,I==="before"?r.id:qn(c,r.id),S)})),me(k,r.id,()=>pn(r.id),"char")},Hr=(r,d,c)=>{let g=sn(d),u=o("button",{type:"button",class:"sds-card sds-scene",dataset:{id:d.id},title:d.name},g?h.thumb(g):o("span",{class:"ph"},ie("image",30)),O(),d.reserve?o("span",{class:"rsv"},`+${d.reserve}`):null,d.images.length&&!an(d)?o("span",{class:"nofav",title:"아직 즐겨찾기가 없어요"},"★ 없음"):null,o("span",{class:"quick"},o("button",{type:"button",title:"1장 예약",onClick:k=>{k.stopPropagation(),h.set(Ee(t,r.id,d.id,d.reserve+1)),y(),B()}},"+1"),d.reserve?o("button",{type:"button",title:"예약 하나 빼기",onClick:k=>{k.stopPropagation(),h.set(Ee(t,r.id,d.id,d.reserve-1)),y(),B()}},"−1"):null),j(d.name,d.images.length,Pn(d)));return u.addEventListener("contextmenu",k=>{k.preventDefault(),Fs(u,r,d)}),c&&(Ue(u,()=>({kind:"scene",cid:r.id,ids:Zn(d.id)})),Te(u,{mode:()=>"x",ok:k=>k.kind==="scene"&&k.cid===r.id&&!(k.ids.length===1&&k.ids[0]===d.id),run:(k,z)=>{h.set(fr(t,r.id,k.ids,z==="before"?d.id:qn(c,d.id))),p.clear(),En()}})),me(u,d.id,()=>In(d.id),"scene")},Gr=(r,d,c,g)=>{let u=o("button",{type:"button",class:"sds-card sds-img",dataset:{path:d.path},title:d.seed?`시드 ${d.seed}`:""},h.thumb(d.path),O(),o("span",{class:"badges"},d.rank?o("span",{class:"badge"},`${d.rank}위`):null,d.fav?o("span",{class:"badge"},"★"):null),o("span",{class:"quick",style:"bottom:10px"},o("button",{type:"button",title:"이 그림을 봇에 바로 넣기",class:"sds-qput",onClick:k=>{k.stopPropagation(),Re([{path:d.path,name:se(t,r.cid,r.sid)?.name??"image",cid:r.cid,sid:r.sid}])}},"넣기")));return u.setAttribute("aria-selected",String(!!d.pick)),u.addEventListener("click",k=>{k.target.closest(".quick")||Ut(r)}),u.addEventListener("dblclick",k=>{k.target.closest(".quick")||Fr(h,c,g)}),u.addEventListener("contextmenu",k=>{k.preventDefault(),Ts(u,r,c,g)}),u};function Ut(r,d){let c=se(t,r.cid,r.sid)?.images.find(g=>g.path===r.path);c&&(h.set(rn(t,r.cid,r.sid,[r.path],d??!c.pick),{undo:!1}),E(),B())}h.togglePick=Ut;let cn=(...r)=>o("div",{class:"sds-grid"},...r),Qe=(r,d,...c)=>o("div",{class:"sds-sec"},o("b",null,r),d!=null?o("span",{class:"rb-muted"},String(d)):null,o("span",{class:"sp"}),...c),nt=(r,d,...c)=>o("div",{class:"sds-empty"},o("b",null,r),o("span",{style:"white-space:normal"},d),...c);function js(){let r=h.curChar(),d=h.curScene(),c=(u,k,z)=>o("button",{type:"button",class:"rb-chip","aria-pressed":String(k),onClick:z},u),g=[Kr(c("전체",!l.folder&&!r,()=>{l.folder=null,pn(null)}),null)];for(let u of Mt(t,l.folder))g.push(o("span",{class:"rb-muted"},"›"),Kr(c(u.name,u.id===l.folder&&!r,()=>{l.folder=u.id,pn(null)}),u.id));return r&&g.push(o("span",{class:"rb-muted"},"›"),c(r.name,!d,()=>In(null))),d&&g.push(o("span",{class:"rb-muted"},"›"),c(d.name,!0,()=>{})),l.folder&&!r&&g.push(o("button",{type:"button",class:"rb-icon-btn","aria-label":"폴더 메뉴",onClick:u=>ot(u.currentTarget,l.folder)},ie("more",18))),o("nav",{class:"sds-crumbs",id:"sds-crumbs","aria-label":"위치"},...g)}function B(){let r=ne.scrollTop;M?.disconnect(),M=e.assets.lazy(ne),H(),R.classList.toggle("nonames",!l.names);let d=h.curChar(),c=h.curScene(),g=[js()];l.mode==="compare"?g.push(...Ss()):l.mode==="search"?g.push(..._s(d)):l.mode==="gallery"?g.push(...As(d)):l.mode==="bulk"&&d?g.push(...Ls(d)):c?g.push(...Ms(d,c)):d?g.push(...zs(d)):g.push(...$s()),ce(ne,...g),ne.scrollTop=r,(e.win.scrollLeft||e.win.scrollTop)&&(e.win.scrollLeft=0,e.win.scrollTop=0)}function ni(r){let d=Ke(t,r.id).length,c=t.folders.filter(u=>u.parent===r.id).length,g=o("button",{type:"button",class:"sds-card sds-subf",dataset:{id:r.id},title:r.name},o("span",{class:"ph",style:"flex-direction:column;gap:6px;color:var(--rb-acc)"},ie("folder",34),o("span",{class:"rb-muted",style:"font-size:12px"},`${d}명${c?` · 폴더 ${c}`:""}`)),o("span",{class:"cap"},o("span",{class:"n"},r.name)));return g.classList.toggle("cur",J("folder",r.id)),g.addEventListener("click",()=>{if(!J("folder",r.id)){le("folder",r.id),g.classList.add("cur");return}l.focus=null,l.folder=r.id,p.clear(),E(),B()}),g.addEventListener("contextmenu",u=>{u.preventDefault(),ot(g,r.id)}),Ue(g,()=>({kind:"folder",id:r.id})),Te(g,{mode:()=>"into",ok:u=>u.kind==="char"||u.kind==="folder"&&u.id!==r.id,hint:(u,k,z)=>u.kind==="char"?`‘${r.name}’ 안에 ${z?"복사":"넣기"}`:`‘${r.name}’ 안으로`,run:(u,k,z)=>u.kind==="char"?mn(u,r.id,null,z):et(u.id,r.id,null)}),g}function $s(){if(!t.chars.length&&!t.folders.length)return[nt("이 "+(n.kind==="module"?"모듈":"봇")+"에 들어갈 캐릭터를 만들어요","캐릭터를 열어 씬(표정·포즈)을 만들고 예약하면 SDStudio처럼 차례로 그려요. 캐릭터·소속은 폴더로 묶어요.",D("새 캐릭터",{kind:"primary",icon:"plus",onClick:()=>tt()}))];let r=zt(t,l.folder),d=(u,k=0)=>{let z=Ke(t,u.id),I=(u.members??[]).map(T=>ge(t,T)).filter(Boolean),S=k<8?t.folders.filter(T=>T.parent===u.id):[],Y=S.length,_=(l.folded??=[]).includes(u.id),K=o("button",{type:"button",class:"rb-icon-btn sds-fold","aria-label":_?"펼치기":"접기","aria-expanded":String(!_),title:_?"펼치기":"접기",onClick:T=>{T.stopPropagation(),l.folded=_?l.folded.filter(Q=>Q!==u.id):[...l.folded,u.id],B()}},o("span",{style:`display:flex;transition:transform .15s;transform:rotate(${_?-90:0}deg)`},ie("chevD",16))),F=o("div",{class:["sds-frow sds-folder",_&&"folded"],dataset:{id:u.id}},o("div",{class:"hd"},K,o("button",{type:"button",class:"open sds-fopen",onClick:()=>{if(!J("folder",u.id)){le("folder",u.id);return}l.focus=null,l.folder=u.id,p.clear(),E(),B()}},o("span",{style:"color:var(--rb-acc);display:flex"},ie("folder",18)),o("b",{style:"font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"},u.name),u.kind?o("span",{class:"rb-badge"},Qo[u.kind]):null,u.tpl?o("span",{class:"rb-badge",title:"새 캐릭터에 적용할 기본 템플릿"},`템플릿 ${u.tpl}`):null,o("span",{class:"rb-muted"},`${z.length}명${Y?` · 폴더 ${Y}`:""}`),o("span",{style:"color:var(--rb-mute);display:flex"},ie("chevR",16))),o("button",{type:"button",class:"rb-icon-btn","aria-label":"폴더 메뉴",onClick:T=>ot(T.currentTarget,u.id)},ie("more",18))),_?null:I.length?o("div",{class:"strip"},...I.map(T=>Nt(T,u.id,I))):S.length?null:o("span",{class:"rb-muted",style:"white-space:normal"},"비어 있어요. 캐릭터 카드나 폴더를 여기로 끌어다 놓아요."),!_&&S.length?o("div",{class:"sds-subrows"},...S.map(T=>d(T,k+1))):null);return F.classList.toggle("cur",J("folder",u.id)),F.querySelector(".hd").addEventListener("contextmenu",T=>{T.preventDefault(),T.stopPropagation(),ot(T.currentTarget,u.id)}),Ue(F.querySelector(".hd"),()=>({kind:"folder",id:u.id})),Te(F,{mode:T=>T.kind==="folder"?"y3":"into",ok:T=>T.kind==="char"||T.kind==="folder"&&T.id!==u.id,hint:(T,Q,ye)=>T.kind==="char"?`‘${u.name}’ 안에 ${ye?"복사":"넣기"}${T.ids.length>1?` (${T.ids.length}명)`:""}`:Q==="into"?`‘${u.name}’ 안으로`:`‘${u.name}’ ${Q==="before"?"위":"아래"}에 놓기`,run:(T,Q,ye)=>{if(T.kind==="char")return mn(T,u.id,null,ye);if(Q==="into")return et(T.id,u.id,null);let re=t.folders.filter(ae=>(ae.parent??null)===(u.parent??null)&&ae.id!==T.id);et(T.id,u.parent??null,Q==="before"?u.id:qn(re,u.id))}}),F},c=r.folders.map(u=>d(u)),g=c.length?[o("div",{class:"sds-subrows sds-toprows"},...c)]:[];if(r.chars.length){let u=cn(...r.chars.map(k=>Nt(k,l.folder,r.chars)));Te(u,{mode:()=>"into",ok:k=>k.kind==="char",run:(k,z,I)=>mn(k,l.folder,null,I)}),g.push(Qe(l.folder?"캐릭터":c.length?"폴더 없는 캐릭터":"캐릭터",r.chars.length),u)}else if(l.folder&&!c.length)g.push(o("span",{class:"rb-muted"},"이 폴더에 바로 든 캐릭터가 없어요. 캐릭터 카드를 끌어다 놓을 수 있어요."));else if(c.length){let u=o("div",{class:"sds-rootdrop"},l.folder?"여기에 놓으면 이 폴더 바로 아래로 와요":"여기에 놓으면 폴더에서 빠져요");Te(u,{mode:()=>"into",ok:k=>k.kind==="char",run:k=>mn(k,l.folder,null,!1)}),g.push(u)}return t.chars.length&&g.push(o("span",{class:"rb-muted",style:"font-size:12px;white-space:normal"},"카드·폴더를 끌어서 옮겨요 · 폴더에 놓으면 들어가고, 위 경로(전체 › …)에 놓으면 그 위치로 가요 · Alt/⌥를 누르고 놓으면 복사(여러 폴더에 걸치기)")),g}function zs(r){if(!r.scenes.length)return[nt("씬이 없어요","씬은 표정·포즈 하나예요. 이름이 그대로 감정 이미지 이름이 돼요.",D("새 씬",{kind:"primary",icon:"plus",onClick:()=>at()}),D("감정 세트 더하기",{icon:"sparkle",onClick:()=>Yr()}))];let d=t.chars.filter(u=>u.id!==r.id),c=d.length?o("div",{class:"sds-tray"},o("span",{class:"rb-muted",style:"font-size:12px"},"다른 캐릭터로(Alt/⌥ 복사)"),...d.map(u=>{let k=o("span",{class:"rb-chip",role:"button"},u.name);return Te(k,{mode:()=>"into",ok:z=>z.kind==="scene"&&z.cid===r.id,run:(z,I,S)=>{h.set(wr(t,r.id,z.ids,u.id,{copy:S})),p.clear(),En()}}),k})):null,g=r.scenes.filter(u=>u.images.length&&!an(u)).length;return[Qe("씬",r.scenes.length,g?o("button",{type:"button",class:"sds-pill",id:"sds-nofav-pill",title:"즐겨찾기 없는 씬부터 대표 고르기",style:"cursor:pointer;border:0",onClick:()=>Gt({onlyNoFav:!0})},`★ 없는 씬 ${g}`):null,o("span",{class:"rb-muted",style:"font-size:12px"},"눌러서 고르고, 한 번 더 누르면 열려요 · 끌어서 순서 바꾸기 · Ctrl/⌘·체크로 여러 개 고르기")),cn(...r.scenes.map(u=>Hr(r,u,r.scenes))),c]}function Ms(r,d){let c=De(d.slots),g=o("input",{class:"sds-in",value:d.name,id:"sds-sname","aria-label":"씬 이름",style:"font-weight:800;min-width:160px;flex:1",onChange:re=>{let ae=re.target.value.trim();ae&&ae!==d.name&&(h.set(Pe(t,r.id,d.id,{name:xn({scenes:r.scenes.filter(de=>de.id!==d.id)},ae)})),B())}}),u=o("select",{class:"sds-sel","aria-label":"씬 크기",id:"sds-ssize",onChange:re=>{h.set(Pe(t,r.id,d.id,{size:re.target.value})),Wr()}},o("option",{value:"",selected:!d.size},"크기: 세로(기본)"),...Object.entries(ke).map(([re,ae])=>o("option",{value:re,selected:d.size===re},`${ae.label} ${ae.width}×${ae.height}`))),k=o("div",{class:"sds-row",style:"gap:4px"},W("minus","예약 하나 빼기",()=>{h.set(Ee(t,r.id,d.id,d.reserve-1)),y(),B()},{disabled:!d.reserve}),o("span",{class:"sds-pill",id:"sds-srsv"},`예약 ${d.reserve}`),W("plus","1장 예약",()=>{h.set(Ee(t,r.id,d.id,d.reserve+1)),y(),B()},{id:"sds-srsv-plus"})),z=re=>{h.set(Vn(t,r.id,d.id,re))},I=o("div",{class:"sds-slots",id:"sds-slots"}),S=o("pre",{class:"rb-muted",id:"sds-preview",style:"margin:0;white-space:pre-wrap;word-break:break-word;font:inherit;font-size:12.5px;background:var(--rb-win);border-radius:var(--rb-r1);padding:8px 10px"}),Y=()=>{let re=t.settings,ae=ge(t,r.id),de=se(t,r.id,d.id);try{S.textContent=De(de.slots)?un({top:re.top,own:nn(t,ae),middle:ln(de,0),back:re.back},t.pieces,()=>0):"켜진 조각이 없는 슬롯이 있어 그릴 수 없어요.",S.style.color=""}catch(te){S.textContent=te.message,S.style.color="var(--rb-danger)"}},_=()=>{let re=se(t,r.id,d.id).slots;ce(I,...re.map((ae,de)=>o("div",{class:"sds-slot"},o("div",{class:"hd"},o("span",{style:"flex:1"},`슬롯 ${de+1}`),o("button",{type:"button",class:"rb-icon-btn","aria-label":"슬롯 지우기",onClick:()=>{z(re.filter((te,ve)=>ve!==de)),_(),Y(),F()}},ie("x",14))),...ae.map((te,ve)=>o("div",{class:["sds-piece",te.on===!1&&"off"]},o("input",{type:"checkbox",checked:te.on!==!1,title:"켜기","aria-label":"조각 켜기",style:"margin-top:12px",onChange:Me=>{z(se(t,r.id,d.id).slots.map((Oe,_e)=>_e!==de?Oe:Oe.map((hn,Xt)=>Xt!==ve?hn:{...hn,on:Me.target.checked}))),_(),Y(),F()}}),Ie({value:te.prompt,rows:2,label:`슬롯 ${de+1} 조각 ${ve+1}`,onInput:Me=>{z(se(t,r.id,d.id).slots.map((Oe,_e)=>_e!==de?Oe:Oe.map((hn,Xt)=>Xt!==ve?hn:{...hn,prompt:Me}))),Y()}}),o("button",{type:"button",class:"rb-icon-btn","aria-label":"조각 지우기",onClick:()=>{z(se(t,r.id,d.id).slots.map((Me,Oe)=>Oe!==de?Me:Me.filter((_e,hn)=>hn!==ve))),_(),Y(),F()}},ie("trash",14)))),D("조각 더하기",{size:"sm",icon:"plus",onClick:()=>{z(se(t,r.id,d.id).slots.map((te,ve)=>ve!==de?te:[...te,{prompt:"",on:!0}])),_(),F()}}))),o("button",{type:"button",class:"sds-slot",id:"sds-addslot",style:"align-items:center;justify-content:center;min-height:120px;cursor:pointer;color:var(--rb-sub);font:inherit;font-weight:700",onClick:()=>{z([...se(t,r.id,d.id).slots,[{prompt:"",on:!0}]]),_(),Y(),F()}},ie("plus",22),"슬롯 더하기"))},K=o("span",{class:"sds-pill"}),F=()=>{K.textContent=`조합 ${De(se(t,r.id,d.id).slots)}개`,y()};_(),Y(),F();let T=Ne(d),Q=T.map(re=>({cid:r.id,sid:d.id,path:re.path}));return[o("section",{class:"sds-frow",id:"sds-scene-edit"},o("div",{class:"sds-row",style:"flex-wrap:wrap"},g,u,k,K,D("지금 1장",{size:"sm",kind:"primary",icon:"sparkle",id:"sds-gen-one",disabled:m.running||!c,onClick:()=>{h.set(Ee(t,r.id,d.id,d.reserve+1)),ct()}})),o("details",{open:l.slotsOpen,onToggle:re=>{l.slotsOpen=re.target.open}},o("summary",{style:"cursor:pointer;font-weight:800;font-size:13px;margin-bottom:8px"},"씬 프롬프트 조합"),o("div",{style:"display:flex;flex-direction:column;gap:8px"},o("span",{class:"rb-muted",style:"white-space:normal;font-size:12px"},"슬롯마다 켜진 조각 하나씩 골라 조합해요. 예약 1장 = 조합 전부. 최종 = 상위 + 외형 + 이 조합 + 하위."),I,o("span",{class:"rb-label"},"미리보기(첫 조합)"),S))),Qe("이미지",T.length,T.length?o("span",{class:"rb-muted",style:"font-size:12px"},"누르면 크게 · 체크로 고르기"):null),T.length?cn(...T.map((re,ae)=>Gr(Q[ae],re,Q,ae))):nt("아직 그림이 없어요","예약하고 위의 ‘생성’을 누르거나 ‘지금 1장’을 눌러요.")]}function As(r){let d=r?[r]:l.folder?Ke(t,l.folder):t.chars,c=d.flatMap(S=>S.scenes.flatMap(Y=>Ne(Y).map(_=>({it:{cid:S.id,sid:Y.id,path:_.path},im:_,sc:Y,cc:S}))));if(!c.length)return[nt("그림이 없어요","씬을 예약하고 ‘생성’을 누르면 여기에 모여요.")];let g=c.map(S=>S.it),u=c.filter(S=>S.im.pick),k=S=>{let Y=t;for(let _ of c)!!_.im.pick!==S&&(Y=rn(Y,_.it.cid,_.it.sid,[_.it.path],S));h.set(Y,{undo:!1}),E(),B()},z=[o("div",{class:"sds-row sds-bulkbar",id:"sds-gbulk",style:"flex-wrap:wrap;gap:8px;position:sticky;top:0;z-index:4;background:var(--rb-win);padding:6px 0"},o("span",{class:"sds-pill"},`그림 ${c.length}장 · 고름 ${u.length}`),D("모두 고르기",{size:"sm",id:"sds-g-all",onClick:()=>k(!0)}),D("고르기 풀기",{size:"sm",id:"sds-g-none",disabled:!u.length,onClick:()=>k(!1)}),D(`고른 ${u.length}장 봇에 넣기`,{size:"sm",kind:"primary",id:"sds-g-put",disabled:!u.length,onClick:()=>Re(u.map(S=>({cid:S.it.cid,sid:S.it.sid,path:S.it.path,name:S.sc.name})))}),D(`고른 ${u.length}장 목록에서 빼기`,{size:"sm",kind:"danger",id:"sds-g-del",disabled:!u.length,onClick:()=>Rt(u.map(S=>S.it))}),o("span",{class:"rb-muted",style:"font-size:12px"},"한 번 누르면 고르기 · 두 번 누르면 크게 보기"))],I=0;for(let S of d)for(let Y of S.scenes){let _=c.filter(K=>K.sc===Y);_.length&&z.push(Qe(r?Y.name:`${S.name} › ${Y.name}`,_.length),cn(..._.map(K=>Gr(K.it,K.im,g,I++))))}return z}function _s(r){let d=o("input",{class:"sds-in",id:"sds-q",type:"search",placeholder:r?"씬 이름·프롬프트 찾기":"캐릭터 이름·외형 프롬프트 찾기",value:l.q,style:"width:100%",onInput:u=>{l.q=u.target.value;let k=g();ce(c,...k)}}),c=o("div",{style:"display:flex;flex-direction:column;gap:12px"}),g=()=>{let u=l.q.trim().toLowerCase();if(!u)return[o("span",{class:"rb-muted"},"찾을 말을 적어요.")];if(r){let z=r.scenes.filter(I=>I.name.toLowerCase().includes(u)||I.slots.some(S=>S.some(Y=>Y.prompt.toLowerCase().includes(u))));return z.length?[Qe("찾은 씬",z.length),cn(...z.map(I=>Hr(r,I)))]:[o("span",{class:"rb-muted"},"없어요.")]}let k=t.chars.filter(z=>z.name.toLowerCase().includes(u)||z.prompt.toLowerCase().includes(u)||z.scenes.some(I=>I.name.toLowerCase().includes(u)));return k.length?[Qe("찾은 캐릭터",k.length),cn(...k.map(Nt))]:[o("span",{class:"rb-muted"},"없어요.")]};return ce(c,...g()),setTimeout(()=>d.focus(),0),[d,c]}function Ss(){let r=l.compare.filter(u=>se(t,u.cid,u.sid)?.images.some(k=>k.path===u.path));l.compare=r;let d=[Qe("비교",r.length,r.length?D("비우기",{size:"sm",kind:"ghost",onClick:()=>{l.compare=[],B()}}):null)];r.length<2&&d.push(o("span",{class:"rb-muted",style:"white-space:normal"},"그림을 2~4장 넣으면 나란히 보여요. 아래 그림을 누르거나, 크게 보기에서 ‘비교에 넣기’를 눌러요.")),r.length&&d.push(o("div",{class:"sds-cmp",id:"sds-cmp"},...r.map(u=>{let k=o("img",{alt:""});h.url(u.path).then(S=>{k.src=S}).catch(()=>{});let z=se(t,u.cid,u.sid),I=z.images.find(S=>S.path===u.path);return o("figure",null,k,o("figcaption",null,o("span",{style:"flex:1"},`${ge(t,u.cid).name} › ${z.name}${I?.seed?` · ${I.seed}`:""}`),o("button",{type:"button",class:"rb-icon-btn","aria-label":"비교에서 빼기",onClick:()=>{l.compare=l.compare.filter(S=>S.path!==u.path),B()}},ie("x",14))))})));let c=h.curChar(),g=(c?[c]:t.chars).flatMap(u=>u.scenes.flatMap(k=>k.images.map(z=>({cid:u.id,sid:k.id,path:z.path})))).slice(0,120);return g.length&&d.push(Qe("고르기",g.length),cn(...g.map(u=>{let k=l.compare.some(I=>I.path===u.path);return o("button",{type:"button",class:"sds-card","aria-selected":String(k),onClick:()=>{k?l.compare=l.compare.filter(I=>I.path!==u.path):h.addCompare(u),B()}},h.thumb(u.path),O())}))),d}function Ls(r){let d=r.scenes.map(_=>_.id),c=o("input",{type:"checkbox","aria-label":"모두 고르기",checked:d.length&&d.every(_=>p.has(_)),onChange:_=>{_.target.checked?d.forEach(K=>p.add(K)):p.clear(),B(),E()}}),g=()=>r.scenes.filter(_=>p.has(_.id)),u=o("input",{class:"sds-in",placeholder:"넣을 태그 / 찾을 말",id:"sds-bulk-text",style:"flex:1;min-width:160px"}),k=o("input",{class:"sds-in",placeholder:"바꿀 말",id:"sds-bulk-rep",style:"flex:1;min-width:120px"}),z=_=>{let K=g();if(!K.length){h.toast("씬을 먼저 골라요");return}let F=t;for(let T of K)F=Vn(F,r.id,T.id,_(se(F,r.id,T.id).slots));h.set(F),B(),h.toast(`씬 ${K.length}개를 바꿨어요`)},I=(_,K)=>[_,K].filter(F=>F&&F.trim()).join(", "),S=o("div",{class:"sds-frow"},o("b",null,`고른 씬 ${g().length}개에 한꺼번에`),o("div",{class:"sds-row",style:"flex-wrap:wrap"},u,k),o("div",{class:"sds-acts"},D("앞에 넣기",{size:"sm",id:"sds-bulk-front",onClick:()=>{let _=u.value.trim();_&&z(K=>K.length?K.map((F,T)=>T?F:F.map(Q=>({...Q,prompt:I(_,Q.prompt)}))):[[{prompt:_,on:!0}]])}}),D("뒤에 넣기",{size:"sm",onClick:()=>{let _=u.value.trim();_&&z(K=>K.length?K.map((F,T)=>T!==K.length-1?F:F.map(Q=>({...Q,prompt:I(Q.prompt,_)}))):[[{prompt:_,on:!0}]])}}),D("찾아 바꾸기",{size:"sm",onClick:()=>{let _=u.value;_&&z(K=>K.map(F=>F.map(T=>({...T,prompt:T.prompt.split(_).join(k.value)}))))}}),D("예약 +1",{size:"sm",onClick:()=>{h.set(on(t,r.id,1,g().map(_=>_.id))),y(),B()}}),o("select",{class:"sds-sel","aria-label":"크기 한꺼번에",onChange:_=>{if(!_.target.value)return;let K=t;for(let F of g())K=Pe(K,r.id,F.id,{size:_.target.value==="base"?"":_.target.value});h.set(K),B()}},o("option",{value:""},"크기 한꺼번에…"),o("option",{value:"base"},"세로(기본)"),...Object.entries(ke).map(([_,K])=>o("option",{value:_},K.label))))),Y=r.scenes.map(_=>o("tr",null,o("td",null,o("input",{type:"checkbox",checked:p.has(_.id),"aria-label":`${_.name} 고르기`,onChange:K=>{K.target.checked?p.add(_.id):p.delete(_.id),E()}})),o("td",null,o("input",{class:"sds-in",value:_.name,style:"width:140px;height:34px",onChange:K=>{let F=K.target.value.trim();F&&h.set(Pe(t,r.id,_.id,{name:xn({scenes:ge(t,r.id).scenes.filter(T=>T.id!==_.id)},F)}))}})),o("td",{style:"min-width:260px"},_.slots.length===1&&_.slots[0].length===1?Ie({value:_.slots[0][0].prompt,rows:1,label:`${_.name} 프롬프트`,onInput:K=>h.set(Vn(t,r.id,_.id,[[{..._.slots[0][0],prompt:K}]]))}):o("span",{class:"rb-muted",style:"white-space:normal"},_.slots.length?`슬롯 ${_.slots.length}개 · 조합 ${De(_.slots)}개`:"(조합 없음)")),o("td",null,_.size?ke[_.size]?.label??_.size:"기본"),o("td",null,String(_.reserve)),o("td",null,String(_.images.length))));return[S,o("div",{style:"overflow:auto"},o("table",{class:"sds-table",id:"sds-bulk"},o("thead",null,o("tr",null,o("th",null,c),o("th",null,"씬"),o("th",null,"프롬프트"),o("th",null,"크기"),o("th",null,"예약"),o("th",null,"그림"))),o("tbody",null,...Y)))]}function pn(r){l.focus=null,l.charId=r,l.sceneId=null,p.clear(),l.mode==="bulk"&&!r&&(l.mode="scene"),h.paint(),ne.scrollTop=0}function In(r){l.focus=null,l.sceneId=r,p.clear(),r&&(l.mode="scene"),y(),E(),B(),Wr(),ne.scrollTop=0}let Wr=()=>h.paintLeft();async function tt(){let r=await Be(e.win,{title:"새 캐릭터",label:"이름",value:t.chars.length?"":i,ok:"만들기",placeholder:"예: 시로코"});if(r==null)return;let d=yn(t,{name:r}),c=d.chars.at(-1).id,g=l.focus?.kind==="folder"&&t.folders.some(k=>k.id===l.focus.id)?l.focus.id:l.folder;g&&(d=$t(d,g,c,!0));let u=g?Un(d,g):"";if(u){let k=(await a.loadTemplates()).find(z=>z.name===u);k&&(d=Mn(d,[c],k,"replace").project,h.toast(`폴더 기본 템플릿 ‘${u}’을 적용했어요`))}h.set(d),l.focus={kind:"char",id:c},En();for(let k of ne.querySelectorAll(".sds-char"))if(k.dataset.id===c){k.scrollIntoView({block:"nearest",inline:"nearest"});break}}async function rt(r){if(!r.length||!await $e(e.win,{title:`캐릭터 ${r.length}명을 지울까요?`,body:"씬·프롬프트·그림 목록이 지워져요. 리스 에셋 저장소 파일과 이미 넣은 에셋은 그대로예요.",ok:"지우기",danger:!0}))return;let d=t;for(let c of r)d=hr(d,c);h.set(d),p.clear(),y(),E(),B()}async function at(){let r=h.curChar(),d=await Be(e.win,{title:"새 씬",label:"이름(감정 이미지 이름이 돼요)",ok:"만들기",placeholder:"예: angry"});d?.trim()&&(h.set(At(t,r.id,{name:xn(r,d),prompt:d.trim()})),y(),B())}function Yr(){let r=h.curChar(),d=new Set(r.scenes.map(u=>u.name.toLowerCase())),c=t,g=0;for(let[u,k]of Zo)d.has(u)||(c=At(c,r.id,{name:u,prompt:k}),g++);h.set(c),y(),B(),h.toast(g?`감정 씬 ${g}개를 더했어요`:"이미 다 있어요")}async function st(r){let d=h.curChar();!r.length||!await $e(e.win,{title:`씬 ${r.length}개를 지울까요?`,body:"조합·그림 목록이 지워져요. 리스 에셋 저장소 파일은 그대로예요.",ok:"지우기",danger:!0})||(h.set(kr(t,d.id,r)),p.clear(),r.includes(l.sceneId)&&(l.sceneId=null),y(),E(),B())}async function Rt(r){if(!r.length||!await $e(e.win,{title:`${r.length}장을 목록에서 뺄까요?`,body:"이 화면 목록에서만 빠져요. 리스 에셋 저장소 파일과 이미 넣은 에셋은 그대로예요.",ok:"빼기",danger:!0}))return;let d=t;for(let c of r)d=Cn(d,c.cid,c.sid,[c.path]);h.set(d),p.clear(),E(),B()}async function qs(r,d,c){!c.length||!await $e(e.win,{title:`${c.length}장을 목록에서 뺄까요?`,body:"이 화면 목록에서만 빠져요. 리스 에셋 저장소 파일과 이미 넣은 에셋은 그대로예요.",ok:"빼기",danger:!0})||(h.set(Cn(t,r,d,c)),p.clear(),E(),B())}async function Bt(r=l.folder){let d=await h.dlg.folderDialog({title:r?"안에 폴더 만들기":"폴더 만들기"});d&&(h.set(vn(t,{...d,parent:r})),E(),B())}async function Es(r,d){let c=await a.loadTemplates();if(!c.length)return h.toast("저장된 템플릿이 없어요. 캐릭터 안에서 ‘템플릿으로 저장’하거나 가져오기를 먼저 해요");Se(e.win,r,[...c.map(g=>({label:`${g.name===d.tpl?"✓ ":""}${g.name}`,icon:"folder",onClick:()=>{h.set(Nn(t,d.id,{tpl:g.name})),B(),h.toast(`이제 ‘${d.name}’(안의 폴더 포함)에 만드는 캐릭터는 ‘${g.name}’으로 시작해요`)}})),...d.tpl?["sep",{label:"기본 템플릿 없애기",icon:"x",onClick:()=>{h.set(Nn(t,d.id,{tpl:""})),B()}}]:[]])}function ot(r,d){let c=t.folders.find(g=>g.id===d);c&&Se(e.win,r,[{label:"이름·종류·프롬프트 바꾸기",icon:"edit",onClick:async()=>{let g=await h.dlg.folderDialog({title:"폴더 바꾸기",name:c.name,kind:c.kind,prompt:c.prompt??"",ok:"저장"});g&&(h.set(Nn(t,d,g)),B())}},{label:"안에 폴더 만들기",icon:"folderPlus",onClick:()=>Bt(d)},{label:c.tpl?`기본 템플릿: ${c.tpl}`:"기본 템플릿 정하기…",icon:"folder",onClick:()=>Es(r,c)},...Un(t,d)?[{label:"기본 템플릿을 안의 캐릭터 모두에 적용",icon:"folder",onClick:async()=>{let g=(await a.loadTemplates()).find(I=>I.name===Un(t,d));if(!g)return h.toast("그 템플릿이 없어요",{error:!0});let u=Ke(t,d).map(I=>I.id);if(!u.length)return;let k=qr(t,u),z="merge";k.length&&(z=await h.dlg.templateChoice(k.length,g.name),!z)||(h.set(Mn(t,u,g,z).project),y(),B(),h.toast(`‘${g.name}’을 ${u.length}명에 적용했어요`))}}]:[],...c.parent?[{label:"맨 위로 꺼내기",icon:"up",onClick:()=>{h.set(Pt(t,d,null)),B()}}]:[],"sep",{label:"폴더 지우기",icon:"trash",danger:!0,onClick:async()=>{await $e(e.win,{title:`‘${c.name}’ 폴더를 지울까요?`,body:"안의 폴더도 함께 지워져요. 캐릭터와 그림은 남아요.",ok:"지우기",danger:!0})&&(h.set(jt(t,d)),l.folder&&!t.folders.some(g=>g.id===l.folder)&&(l.folder=null),E(),B())}}])}function Jr(r,d){Se(e.win,r,t.folders.map(c=>{let g=d.every(u=>c.members.includes(u));return{label:`${g?"✓ ":""}${Mt(t,c.id).map(u=>u.name).join(" › ")}`,icon:"folder",onClick:()=>{let u=t;for(let k of d)u=$t(u,c.id,k,!g);h.set(u),B(),h.toast(g?"폴더에서 뺐어요":"폴더에 넣었어요")}}}))}function Is(r,d){Se(e.win,r,[{label:"열기",icon:"chevron",onClick:()=>pn(d.id)},{label:"이름 바꾸기",icon:"edit",onClick:async()=>{let c=await Be(e.win,{title:"이름 바꾸기",label:"이름",value:d.name});c?.trim()&&(h.set(Fe(t,d.id,{name:c.trim()})),B())}},{label:"복제",icon:"split",onClick:()=>{h.set(Ct(t,d.id)),B()}},...t.folders.length?[{label:"폴더에 넣기·빼기",icon:"folder",onClick:()=>Jr(r,[d.id])}]:[],"sep",{label:"지우기",icon:"trash",danger:!0,onClick:()=>rt([d.id])}])}function Ts(r,d,c,g){let u=se(t,d.cid,d.sid),k=u?.images.find(z=>z.path===d.path);k&&Se(e.win,r,[{label:"크게 보기",icon:"eye",onClick:()=>Fr(h,c,g)},{label:k.pick?"보낼 그림에서 빼기":"보낼 그림으로 고르기",icon:"check",onClick:()=>Ut(d)},{label:k.fav?"즐겨찾기 풀기":"즐겨찾기",icon:"sparkle",onClick:()=>{h.set(tn(t,d.cid,d.sid,d.path,{fav:!k.fav})),B()}},{label:"씬 대표로",icon:"image",onClick:()=>{h.set(Pe(t,d.cid,d.sid,{cover:d.path})),B()}},{label:"캐릭터 대표로",icon:"image",onClick:()=>{h.set(Fe(t,d.cid,{cover:d.path})),h.toast("캐릭터 카드 대표로 했어요")}},{label:"이 그림만 봇에 넣기",icon:"exportBot",onClick:()=>Re([{...d,name:u.name}])},{label:"넣는 방법 고르고 넣기…",icon:"sliders",onClick:()=>dt([{...d,name:u.name}])},"sep",{label:"목록에서 빼기",icon:"trash",danger:!0,onClick:()=>Rt([d])}])}function Os(r){let d=h.curChar();Se(e.win,r,d?[{label:"새 씬",icon:"plus",onClick:()=>at()},{label:"모든 씬 1장씩 예약",icon:"calPlus",onClick:()=>{h.set(on(t,d.id,1)),y(),B()}},{label:"위로",icon:"back",onClick:()=>q()}]:[{label:"새 캐릭터",icon:"plus",onClick:()=>tt()},{label:l.folder?"안에 폴더 만들기":"폴더 만들기",icon:"folderPlus",onClick:()=>Bt()},{label:"SDStudio 백업 가져오기…",icon:"upload",onClick:()=>Yt()},...l.folder?[{label:"위로",icon:"back",onClick:()=>q()}]:[]])}function Fs(r,d,c){Se(e.win,r,[{label:"열기",icon:"chevron",onClick:()=>In(c.id)},{label:"1장 예약",icon:"plus",onClick:()=>{h.set(Ee(t,d.id,c.id,c.reserve+1)),y(),B()}},{label:"예약 비우기",icon:"x",onClick:()=>{h.set(Ee(t,d.id,c.id,0)),y(),B()}},{label:"이미지 월드컵",icon:"zap",onClick:()=>Sn(h,d.id,c.id)},...c.images.length?[{label:"여기서 대표 고르기",icon:"sparkle",onClick:()=>{let g=d.scenes.filter(u=>u.images.length).map(u=>({cid:d.id,sid:u.id}));Dr(h,g,{start:Math.max(0,g.findIndex(u=>u.sid===c.id))})}}]:[],{label:"복제",icon:"split",onClick:()=>{h.set(Bn(t,d.id,c.id)),B()}},"sep",{label:"지우기",icon:"trash",danger:!0,onClick:()=>st([c.id])}])}async function Ds(r,d){let c=t.settings,g=r.scenes.filter(u=>!d||d.includes(u.id)).map(u=>{try{return`${u.name}: ${un({top:c.top,own:nn(t,r),middle:ln(u,0),back:c.back},t.pieces,()=>0)}`}catch(k){return`${u.name}: (${k.message})`}});try{await navigator.clipboard.writeText(g.join(`
`)),h.toast("프롬프트를 복사했어요")}catch{h.toast("복사하지 못했어요",{error:!0})}}function Vt(r){let d=h.curChar(),c=h.curScene();Se(e.win,r,[...c?[{label:Pn(c)?`고른 그림 ${Pn(c)}장`:`이 씬 그림 ${c.images.length}장`,icon:"download",onClick:()=>Kt((Pn(c)?We(d,c.id).map(g=>g.path):c.images.map(g=>g.path)).map((g,u)=>[`${d.name}/${c.name}_${u+1}.png`,g]))}]:[],{label:"씬 대표 그림만",icon:"download",onClick:()=>Kt((d?[d]:t.chars).flatMap(g=>g.scenes.filter(u=>sn(u)).map(u=>[`${g.name}/${u.name}.png`,sn(u)])))},{label:"모든 그림",icon:"download",onClick:()=>Kt((d?[d]:t.chars).flatMap(g=>g.scenes.flatMap(u=>Ne(u).map((k,z)=>[`${g.name}/${u.name}_${z+1}.png`,k.path]))))}])}async function Kt(r){if(!r.length){h.toast("내려받을 그림이 없어요");return}let d=e.toast(`zip 만드는 중 0/${r.length}`,{seconds:600});try{let c={},g=new Set,u=0;for(let[k,z]of r){let I=k.replace(/[\\:*?"<>|]/g,"_");for(let Y=2;g.has(I);Y++)I=k.replace(/\.png$/,`_${Y}.png`);g.add(I),c[I]=[await h.bytes(z),{level:0}];let S=e.win.querySelector(".rb-toasts .rb-toast:last-child span");S&&(S.textContent=`zip 만드는 중 ${++u}/${r.length}`)}$n(`${i||"에셋"}-에셋제작.zip`,new Blob([pa(c)],{type:"application/zip"}))}catch(c){e.toast(`zip을 만들지 못했어요: ${c?.message??c}`,{error:!0})}finally{d?.close?.()}}let Ns={emotionImages:"감정 이미지",additionalAssets:"추가 에셋",assets:"모듈 에셋"},Xr=r=>r>=1048576?`${(r/1048576).toFixed(1)}MB`:`${Math.max(1,Math.round(r/1024))}KB`;function Us(r,d,c,g,u,k,z,I){let S=r[d]??[],Y=String(c).toLowerCase(),_=S.findIndex(F=>String(F?.[0]).toLowerCase()===Y);if(k==="replace"&&_>=0&&!z.has(Y))return z.add(Y),I?.push(S[_][0]),{...r,[d]:S.map((F,T)=>T===_?d==="emotionImages"?[F[0],g]:[F[0],g,u]:F)};let K=Ea(r,d,c);return z.add(K.toLowerCase()),I?.push(K),Ia(r,d,K,g,u)}function Rs(r){let d=t.folders.filter(c=>c.members.includes(r));return(d.find(c=>c.kind==="outfit")??d[0])?.name??""}function Qr(r,d){let c=h.prefs.nameStyle??"scene";if(c==="scene"||!r.cid)return r.name;let g=ge(t,r.cid),u=c==="dot"?".":"_";return[Rs(r.cid),g?.name,r.name].filter(Boolean).join(u)+(d?`.${d}`:"")}function it(){let r=h.curChar();return(r?[r]:l.folder?Ke(t,l.folder):t.chars).flatMap(c=>We(c).map(g=>({...g,cid:c.id})))}let Zr=r=>n.kind==="module"?r==="assets":r==="emotionImages"||r==="additionalAssets",Bs=r=>Zr(r)?r:Zr(h.prefs.putSlot)?h.prefs.putSlot:n.kind==="module"?"assets":"additionalAssets",lt=()=>{let r=h.curChar();return r?[r]:l.folder?Ke(t,l.folder):t.chars};function ea(){let r=h.curChar(),d=h.curScene();return(r?[r]:lt()).flatMap(c=>yr(c,d&&c===r?d.id:null).map(g=>({...g,cid:c.id})))}async function Vs(){let r;n.kind==="module"?r=(await e.svc.load({fresh:!0})).entries.find(c=>c.module.id===n.id)?.module:r=await e.api.getCharacterFromIndex(n.index);let d={};for(let c of["assets","additionalAssets","emotionImages"])d[c]=new Set((r?.[c]??[]).map(g=>String(g?.[0]??"").toLowerCase()));return d}async function Ht(r=ea()){if(r=r.filter(k=>k?.path),!r.length){h.toast("즐겨찾기한 그림이 없어요. 그림에서 ★(F)를 눌러요");return}let d;try{d=await Vs()}catch(k){e.toast(`봇을 읽지 못했어요: ${k?.message??k}`,{error:!0});return}let c=(h.prefs.putFormat??"webp")==="png"?"png":h.prefs.putFormat??"webp",g=r.map(k=>({it:k,label:`${ge(t,k.cid)?.name??""} › ${k.name}`,nameFor:()=>Qr(k,c)})),u=await h.dlg.exportPreview({rows:g,names:d});u&&await Re(u.idx.map(k=>r[k]),{slot:u.slot,dup:u.dup})}h.exportFav=Ht;function Gt({onlyNoFav:r=!1}={}){let d=h.curChar(),c=h.curScene(),u=lt().flatMap(z=>z.scenes.map(I=>({cid:z.id,sid:I.id}))).filter(z=>se(t,z.cid,z.sid)?.images.length);if(!u.length){h.toast("그림이 있는 씬이 없어요. 먼저 예약하고 생성해요");return}let k=c?Math.max(0,u.findIndex(z=>z.cid===d.id&&z.sid===c.id)):0;Dr(h,u,{start:k,onlyNoFav:r})}function Ks(){let r=t.settings.reserveDefault,d=t,c=0;for(let g of lt())c+=Hn(g).length,d=vr(d,g.id,r);if(!c){h.toast("즐겨찾기 없는 씬이 없어요");return}h.set(d),y(),B(),h.toast(`즐겨찾기 없는 씬 ${c}개에 ${r}장씩 예약했어요`)}async function Re(r,d={}){if(r=r.filter(S=>S?.path),!r.length){h.toast("보낼 그림을 먼저 골라요(그림 왼쪽 위 체크)");return}let c=Bs(d.slot),g=d.dup??h.prefs.dup,u=h.prefs.putFormat??"webp",k=h.prefs.putQuality??.85,z=e.toast(`넣는 중 0/${r.length}`,{seconds:600}),I=()=>e.win.querySelector(".rb-toasts .rb-toast:last-child span");try{let S=new Array(r.length),Y=0,_=0,K=!1,F=0,T=0,Q=async()=>{for(;Y<r.length;){let te=Y++,ve=r[te];if(u==="png")S[te]={path:ve.path,ext:"png"};else{let Oe=await h.bytes(ve.path),_e=await ns(Oe,u,k);K||=_e.fellBack,F+=Oe.length,T+=_e.data.length,S[te]=_e.ext==="png"?{path:ve.path,ext:"png"}:{path:await a.saveAsset(_e.data),ext:_e.ext}}let Me=I();Me&&(Me.textContent=`넣는 중 ${++_}/${r.length}`)}};await Promise.all([Q(),Q(),Q()]);let ye=null,re=[];await aa(te=>{ye=structuredClone(te[c]??[]),re.length=0;let ve=new Set,Me=te;return r.forEach((Oe,_e)=>{Me=Us(Me,c,d.name||Qr(Oe,S[_e].ext),S[_e].path,S[_e].ext,g,ve,re)}),Me});let ae=t;r.forEach((te,ve)=>{te.cid&&te.sid&&(ae=rn(ae,te.cid,te.sid,[te.path],!1),re[ve]&&(ae=xr(ae,te.cid,te.sid,te.path,re[ve])))}),ae!==t&&h.set(ae,{undo:!1}),z?.close?.();let de=u!=="png"&&F?` · ${Xr(F)} → ${Xr(T)}`:"";e.toast(`${Ns[c]}에 ${r.length}장 넣었어요${de}`,{seconds:8,action:{label:"되돌리기",run:async()=>{try{await aa(te=>({...te,[c]:ye})),e.toast("넣기를 되돌렸어요")}catch(te){e.toast(`되돌리지 못했어요: ${te?.message??te}`,{error:!0})}}}}),K&&e.toast("이 브라우저는 AVIF를 만들 수 없어 WebP(또는 원본)로 넣었어요"),p.clear(),E(),B()}catch(S){z?.close?.(),e.toast(`넣지 못했어요: ${S?.message??S}`,{error:!0})}}function Hs(){let r=h.curChar();if(r)return{ids:[r.id],label:`‘${r.name}’`};if(l.folder){let d=Ke(t,l.folder).map(c=>c.id);return{ids:d,label:`‘${t.folders.find(c=>c.id===l.folder)?.name}’ 폴더의 캐릭터 ${d.length}명`}}return{ids:t.chars.map(d=>d.id),label:`모든 캐릭터 ${t.chars.length}명`}}async function Wt(r){let d=Hs();if(!d.ids.length){h.toast("적용할 캐릭터가 없어요. 먼저 캐릭터를 만들어요");return}let c=qr(t,d.ids),g="merge";if(c.length&&(g=await h.dlg.templateChoice(c.length,r.name),!g))return;let u=Mn(t,d.ids,r,g);h.set(u.project),y(),E(),B(),h.paintLeft(),e.toast(`‘${r.name}’을 ${d.label}에 적용했어요 · 더함 ${u.stats.added} · 바뀜 ${u.stats.updated}${u.stats.removed?` · 빠짐 ${u.stats.removed}`:""}`,{seconds:8,action:{label:"되돌리기",run:()=>h.undo()}})}async function na(r){let d=await a.loadTemplates(),c=d.findIndex(g=>g.name===r.name);c>=0?d[c]=r:d.push(r),await a.saveTemplates(d)}async function Gs(r){let d=new Uint8Array(await r.slice(0,512).arrayBuffer());if(d[0]===123||/\.json$/i.test(r.name)){let g=JSON.parse(await r.text());return{files:[],projs:[Rr(g,{name:g.name||r.name.replace(/\.json$/i,"")})],read:null}}if(Ur(d)){let g=async(I,S)=>new Uint8Array(await r.slice(I,I+S).arrayBuffer()),u=await Nr(g,r.size),k=new Map(u.map(I=>[I.name,I]));return{files:u,get:async I=>{let S=k.get(I);if(!S)throw new Error(`${I}이 없어요`);return g(S.off,S.size)}}}let c=new Uint8Array(await r.arrayBuffer());if(c[0]===31&&c[1]===139&&(c=ut(c)),Ur(c.subarray(0,512))){let u=await Nr(async(z,I)=>c.subarray(z,z+I),c.length),k=new Map(u.map(z=>[z.name,z]));return{files:u,get:async z=>{let I=k.get(z);if(!I)throw new Error(`${z}이 없어요`);return c.subarray(I.off,I.off+I.size)}}}if(c[0]===80&&c[1]===75){let g=xs(c);return{files:Object.keys(g).filter(k=>!k.endsWith("/")).map(k=>({name:k})),get:async k=>{if(!g[k])throw new Error(`${k}이 없어요`);return g[k]}}}throw new Error("SDStudio 백업(.tar)이나 프로젝트 파일(.json)이 아니에요")}async function Yt(r){let d=r??(await zn({accept:".tar,.zip,.json,.gz,application/x-tar,application/json,application/zip"}))[0];if(!d)return;let c,g,u=e.toast("백업을 읽는 중…",{seconds:600});try{c=await Gs(d),g=c.projs??await ys(c.files,async de=>JSON.parse(new TextDecoder().decode(await c.get(de))))}catch(de){u?.close?.(),e.toast(`읽지 못했어요: ${de?.message??de}`,{error:!0});return}if(u?.close?.(),!g.length){e.toast("백업 안에서 SDStudio 프로젝트를 찾지 못했어요",{error:!0});return}let k=await h.dlg.backupImport({projs:g,hasImages:!!c.get&&g.some(de=>de.count)});if(!k)return;let z=k.idx.map(de=>g[de]),{project:I,jobs:S}=vs(t,z,{mode:c.get?k.mode:"none"});if(h.set(I),l.folder=null,pn(null),!S.length){e.toast(`캐릭터 ${z.length}명을 가져왔어요`,{seconds:8,action:{label:"되돌리기",run:()=>h.undo()}});return}let Y=e.toast(`그림 가져오는 중 0/${S.length}`,{seconds:3600}),_=()=>e.win.querySelector(".rb-toasts .rb-toast:last-child span"),K=0,F=0,T=0,Q=[],ye=Date.now(),re=()=>{if(!Q.length)return;let de=t;for(let te of Q)de=Kn(de,te.cid,te.sid,{path:te.path,fav:te.fav},()=>te.at);Q=[],h.set(de,{undo:!1})},ae=async()=>{for(;K<S.length;){let de=S[K++];try{let ve=await c.get(de.entry),Me=await a.saveAsset(ve);Q.push({...de,path:Me,at:ye-de.order})}catch{T++}F++,Q.length>=20&&(re(),B());let te=_();te&&(te.textContent=`그림 가져오는 중 ${F}/${S.length}`)}};await Promise.all([ae(),ae(),ae()]),re(),h.persist(),Y?.close?.(),h.paint(),e.toast(`캐릭터 ${z.length}명 · 그림 ${S.length-T}장을 가져왔어요${T?` (못 읽은 그림 ${T}장)`:""}`,{seconds:10})}h.importBackup=Yt;async function ta(){let[r]=await zn({accept:"application/json,.json"});if(!r)return;let d;try{d=It(JSON.parse(await r.text()))}catch(c){e.toast(`읽지 못했어요: ${c?.message??c}`,{error:!0});return}if(!d.scenes.length){e.toast("씬이 없는 템플릿이에요",{error:!0});return}await na(d),await Wt(d)}async function ra(r){let d=await Be(e.win,{title:"씬을 템플릿으로 저장",label:"템플릿 이름(같은 이름은 바뀌어요)",value:`${r.name} 씬`,ok:"저장"});d?.trim()&&(await na(ss(r,d.trim(),t.pieces)),e.toast(`템플릿 ‘${d.trim()}’을 저장했어요(씬 ${r.scenes.length}개)`))}async function Ws(r){let d=await a.loadTemplates(),c=h.curChar();Se(e.win,r,[...d.map(g=>({label:`${g.name} 적용 (씬 ${g.scenes.length})`,icon:"preset",onClick:()=>Wt(g)})),...d.length?["sep"]:[],{label:"파일에서 가져와 적용(SDStudio·Dusk)…",icon:"upload",onClick:()=>ta()},...c?[{label:"이 캐릭터 씬을 템플릿으로 저장",icon:"plus",onClick:()=>ra(c)}]:[],{label:"템플릿 관리…",icon:"list",onClick:()=>h.dlg.templateManager({apply:Wt})}])}async function aa(r){if(n.kind==="module"){let c=(await e.svc.load({fresh:!0})).entries.find(u=>u.module.id===n.id)?.module;if(!c)throw new Error("모듈을 찾지 못했어요");let g=r(structuredClone(c));await e.svc.run("update",n.id,{assets:g.assets}),e.state.modDirty=!0;return}let d=await e.api.getCharacterFromIndex(n.index);if(!d||d.chaId!==n.id)throw new Error("봇을 찾지 못했어요");if(as(d))throw new Error("봇이 응답을 생성하는 중이에요. 끝난 뒤 다시 해 주세요");await e.api.setCharacterToIndex(n.index,r(d)),e.state.charsDirty=!0}async function dt(r){if(!r.length)return;let d=await h.dlg.put({count:r.length});d&&await Re(r,d)}async function sa(r){let d=Le(r),c=[];if(!d.vibe)return c;for(let g of t.settings.vibes.filter(u=>u.on)){let u=g.enc&&g.enc.model===r&&g.enc.info===g.info?g.enc.data:null;u||(u=await a.encodeVibe(La(jn(await h.bytes(g.path)),g.info,r),{signal:m.ctl?.signal,label:"sdstudio:vibe"}),h.set(ze(t,{vibes:t.settings.vibes.map(k=>k.id===g.id?{...k,enc:{model:r,info:g.info,data:u}}:k)}),{undo:!1})),c.push({image:u,strength:g.strength})}return c}async function oa(r){if(!Le(r).reference)return[];let d=[];for(let c of t.settings.refs.filter(g=>g.on))d.push({image:await ei(await h.bytes(c.path)),strength:c.strength,fidelity:c.fidelity,type:c.type,info:1});return d}async function Ys(r,d,c){let g=ge(t,r.cid),u=se(t,r.cid,r.sid),k=t.settings;if(!g||!u)return;let z=un({top:k.top,own:nn(t,g),middle:ln(u,r.combo),back:k.back},t.pieces),{width:I,height:S}=gn(k.size,u),Y=Fn({prompt:z,uc:Dn(k.neg,t.pieces),width:I,height:S,seed:Pr(k.seed,d),settings:k.sampling,chars:k.chars.filter(F=>F.on),vibes:await sa(k.sampling.model),refs:await oa(k.sampling.model)}),_=await a.image(Y,{signal:m.ctl?.signal,token:c}),K=await a.saveAsset(_);h.remember(K,_),h.set(Kn(t,g.id,u.id,{path:K,seed:Y.parameters.seed,prompt:z,w:I,h:S}),{undo:!1})}async function ct(){if(m.running)return;let r=Ye(t);if(!r.length){h.toast("예약된 씬이 없어요. 씬 카드의 +1이나 위 예약 버튼을 눌러요.");return}if(!await h.dlg.token())return;let d=h.prefs.boost?(await a.getTokens()).slice(0,4):[],c=d.length>=2?d.map(_=>_.token):[void 0];Object.assign(m,{running:!0,done:0,total:r.length,ctl:new AbortController,workers:c.length,t0:Date.now(),retry:0}),a.setPrefs({resume:!0}).catch(()=>{});let g=null;try{g=await navigator.wakeLock?.request("screen")}catch{}let u=setInterval(()=>{let _=R.querySelector("#sds-prog .t");_&&(_.textContent=C())},1e3);y(),B();let k=new Map,z=null,I=0,S=async _=>{for(;m.running&&!z&&I<r.length;){let K=I++,F=r[K],T=!1;for(let re=0;m.running&&!z;re++)try{await Ys(F,K,_),T=!0,m.retry=0;break}catch(ae){if(bt(ae)||!m.running){z??=ae;break}if(/토큰|401|402|403|Unauthorized|Anlas|구독/i.test(ae?.message??"")){z??=ae,m.running=!1,m.ctl?.abort();break}m.retry=re+1,y();let de=Math.min(6e4,[3e3,6e3,15e3,3e4][re]??6e4);await new Promise(te=>setTimeout(te,de))}if(!T)break;m.done++;let Q=se(t,F.cid,F.sid),ye=(k.get(F.sid)??0)+1;k.set(F.sid,ye),Q&&ye%Math.max(1,De(Q.slots))===0&&h.set(Ee(t,F.cid,F.sid,Q.reserve-1),{undo:!1}),Date.now()-(m.savedAt??0)>3e3&&(m.savedAt=Date.now(),h.persist()),R.hidden||(y(),B())}};await Promise.all(c.map(S)),clearInterval(u);try{await g?.release()}catch{}a.setPrefs({resume:!1}).catch(()=>{});let Y=m.done;Object.assign(m,{running:!1,ctl:null,workers:1}),await h.persist(),y(),E(),B(),z&&!bt(z)?(e.toast(`그리다 멈췄어요(${Y}장 완료): ${z?.message??z}`,{error:!0}),/토큰/.test(z?.message??"")&&h.dlg.token({force:!0})):e.toast(z?`멈췄어요. ${Y}장 만들었어요`:`${Y}장 다 그렸어요${c.length>1?` (부스트 ${c.length}줄)`:""}`),R.hidden&&la()}function ia(){m.running=!1,m.ctl?.abort()}async function Js(r,d,c){let g=se(t,r.cid,r.sid),u=g?.images.find(S=>S.path===r.path),k=ge(t,r.cid);if(!u||!await h.dlg.token())return null;let z={img2img:"변형",infill:"인페인트",upscale:"업스케일"}[d]??"디렉터 도구",I=e.toast(`${z} 하는 중…`,{seconds:600});try{let S=await h.bytes(u.path),Y=jn(S),_=wn(S)??{width:u.w,height:u.h},K=t.settings,F,T=u.prompt;if(d==="img2img"||d==="infill"){T=c.prompt?.trim()||u.prompt||un({top:K.top,own:nn(t,k),middle:ln(g,0),back:K.back},t.pieces);let re=Fn({prompt:T,uc:Dn(K.neg,t.pieces),width:_.width,height:_.height,settings:K.sampling,action:d,image:Y,mask:d==="infill"?jn(c.mask):void 0,strength:c.strength,noise:c.noise??0,addOriginal:c.keep??!0,chars:K.chars.filter(ae=>ae.on),vibes:await sa(K.sampling.model),refs:d==="img2img"?await oa(K.sampling.model):[]});F=await a.image(re,{label:`sdstudio:${d}`})}else d==="upscale"?F=await a.upscale(Sa(Y),{label:"sdstudio:upscale"}):F=await a.augment(Aa({method:d,image:Y,width:_.width,height:_.height,prompt:c.prompt??"",emotion:c.emotion,defry:c.defry??0}),{label:`sdstudio:${d}`});let Q=await a.saveAsset(F);h.remember(Q,F);let ye=wn(F)??_;return h.set(Kn(t,r.cid,r.sid,{path:Q,seed:null,prompt:T,w:ye.width,h:ye.height,from:d}),{undo:!1}),e.toast(`${z}한 그림을 더했어요`),Q}catch(S){return bt(S)||e.toast(`${z}하지 못했어요: ${S?.message??S}`,{error:!0}),null}finally{I?.close?.()}}function Jt(){if(h.persist(),Xs(),m.running){R.hidden=!0,e.toast(`창을 닫아도 계속 그려요(${m.done}/${m.total}). 다시 ‘에셋 제작’을 누르면 이어서 보여요`,{seconds:8});return}la()}function Xs(){e.root&&(Z.root==null?e.root.removeAttribute("style"):e.root.setAttribute("style",Z.root)),Z.win==null?e.win.removeAttribute("style"):e.win.setAttribute("style",Z.win)}function Qs(){Z.root=e.root?.getAttribute("style")??null,Z.win=e.win.getAttribute("style")??null,e.root&&(e.root.style.padding="0"),Object.assign(e.win.style,{maxWidth:"none",maxHeight:"none",width:"100%",height:"100%",borderRadius:"0",border:"0"}),e.api.showContainer?.("fullscreen")?.catch?.(()=>{}),R.isConnected||e.win.appendChild(R),R.hidden=!1,h.paint(),R.focus()}function la(){Dt.delete(s),M?.disconnect();for(let r of f.values())URL.revokeObjectURL(r);R.remove()}async function Zs(r){let d=h.curChar(),c=h.curScene();if(r==="run")return m.running?ia():ct();if(r==="toggleLeft")return h.toggleLeft();if(r==="undo")return h.undo();if(r==="redo")return h.redo();if(r==="help")return h.dlg.help();if(r==="search")return x("search");if(/^mode[1-5]$/.test(r)){let g=Cs[Number(r[4])-1][0];(g!=="bulk"||d)&&x(g);return}if(r==="choose")return Gt();if(r==="putFav")return Ht();if(r==="put")return Re(c?We(d,c.id).map(g=>({...g,cid:d.id})):it());if(r==="unpick"){let g=it(),u=t;for(let k of g)u=rn(u,k.cid,k.sid,[k.path],!1);p.clear(),l.focus=null,h.set(u,{undo:!1}),E(),B();return}if(r==="remove"){if(l.mode==="gallery"||c){let g=c?We(d,c.id).map(u=>({...u,cid:d.id})):it();if(g.length)return Rt(g)}if(p.size)return d?st([...p]):rt([...p]);if(l.focus?.kind==="char")return rt([l.focus.id]);if(l.focus?.kind==="folder"){let g=t.folders.find(u=>u.id===l.focus.id);g&&await $e(e.win,{title:`‘${g.name}’ 폴더를 지울까요?`,body:"안의 폴더도 함께 지워져요. 캐릭터와 그림은 남아요.",ok:"지우기",danger:!0})&&(h.set(jt(t,g.id)),l.focus=null,E(),B())}return}if(r==="selectAll"&&l.mode==="gallery")return R.querySelector("#sds-g-all")?.click();if(r==="selectAll"){if(c){h.set(rn(t,d.id,c.id,c.images.map(g=>g.path),!0),{undo:!1}),E(),B();return}(d?d.scenes.map(g=>g.id):zt(t,l.folder).chars.map(g=>g.id)).forEach(g=>p.add(g)),E(),B();return}if(r==="newItem")return d?at():tt();if(r==="cup")return c?Sn(h,d.id,c.id):d&&p.size===1?Sn(h,d.id,[...p][0]):void 0;if(r==="reserve"){if(c)h.set(Ee(t,d.id,c.id,c.reserve+1));else if(d&&p.size)h.set(on(t,d.id,1,[...p]));else return;y(),B()}}R.addEventListener("keydown",r=>{if(e.win.querySelector(".rb-modal, .rb-menu")||R.querySelector(".sds-over"))return;let d=/^(INPUT|TEXTAREA|SELECT)$/.test(r.target?.tagName??"");if(r.key==="Escape"){if(d&&r.target.value){r.target.blur();return}r.stopPropagation(),p.size?(p.clear(),E(),B()):l.mode!=="scene"?x("scene"):l.sceneId?In(null):l.charId?pn(null):Jt();return}let c=Tt(r),g=ds(h.keys,c);g&&(d&&(!cs(c)||g==="undo"||g==="redo"||g==="selectAll")||(r.preventDefault(),r.stopPropagation(),Zs(g)))}),h.paint(),R.focus();let da={el:R,close:Jt,S:h,reopen:Qs};return Dt.set(s,da),addEventListener?.("pagehide",()=>h.persist()),document.addEventListener?.("visibilitychange",()=>{document.visibilityState==="hidden"&&h.persist()}),L.resume&&Ye(t).length&&e.toast(`지난번에 그리다 멈췄어요. 남은 ${Ye(t).length}장을 이어 그릴까요?`,{seconds:30,action:{label:"이어 그리기",run:()=>ct()}}),da}async function ei(e){let n=URL.createObjectURL(new Blob([e]));try{let a=new Image;await new Promise((m,$)=>{a.onload=m,a.onerror=$,a.src=n});let s=a.width/a.height,[i,t]=s<.83?[1024,1536]:s>1.2?[1536,1024]:[1472,1472],l=Object.assign(document.createElement("canvas"),{width:i,height:t}),p=l.getContext("2d");p.fillStyle="#000",p.fillRect(0,0,i,t);let b=Math.min(i/a.width,t/a.height),f=a.width*b,w=a.height*b;p.drawImage(a,(i-f)/2,(t-w)/2,f,w);let M=await new Promise(m=>l.toBlob(m,"image/png"));return jn(new Uint8Array(await M.arrayBuffer()))}finally{URL.revokeObjectURL(n)}}async function L0(e,n){let a=n.ext;if(!a)throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");let s=ts(e),i=a.add("slot","editor.actions",(t,l)=>!l?.id||l.kind==="character"&&!Number.isInteger(l.index)?null:D("에셋 제작",{size:"sm",kind:"primary",icon:"sparkle",id:"rb-sd-make",onClick:()=>Vr(t,l,s).catch(p=>t.toast(p?.message??String(p),{error:!0}))}));return{deactivate(){i()}}}export{L0 as activate};
