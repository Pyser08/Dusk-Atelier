/* Mirror the host's loaded Realm recommendations. No private endpoint or duplicate download. */
(function(root){
'use strict';
async function array(value,limit=10){if(Array.isArray(value))return value.slice(0,limit);if(!value)return[];const out=[],length=Math.min(limit,Number(await value.length())||0);for(let i=0;i<length;i++)out.push(await value.at(i));return out;}
function safeImage(value){try{if(typeof value!=='string')return'';if(/^\/hub-proxy\/resource\/[a-zA-Z0-9._-]+$/.test(value))return 'https://sv.risuai.xyz/resource/'+value.split('/').pop();const u=new URL(value);if(!['realm.risuai.net','sv.risuai.xyz'].includes(u.hostname)||u.protocol!=='https:'||u.username||u.password)return'';return /^\/resource\/[a-zA-Z0-9._-]+$/.test(u.pathname)?u.href:''}catch{return''}}
function resourceKey(value){const image=safeImage(value);return image?new URL(image).pathname.split('/').pop():'';}

function imageData(html){const doc=new DOMParser().parseFromString(String(html||''),'text/html'),img=doc.querySelector('img');return {image:safeImage(img?.getAttribute('src')),alt:img?.getAttribute('alt')||''};}
function officialPage(row){const id=String(row?.id||'');if(/^[a-zA-Z0-9_-]{1,128}$/.test(id))return {url:'https://realm.risuai.net/character/'+encodeURIComponent(id),exact:true};return {url:'https://realm.risuai.net/?q='+encodeURIComponent(String(row?.name||'').trim().slice(0,160)),exact:false};}
function parseCards(html){
 const doc=new DOMParser().parseFromString(String(html||''),'text/html'),rows=[];
 for(const card of doc.querySelectorAll('button,a')){
  const img=card.querySelector('img'),image=safeImage(img?.getAttribute('src')||img?.getAttribute('data-src'));
  const title=card.querySelector('span.text-lg,[data-character-name],h2,h3,strong');
  // Ignore consent/navigation buttons; Realm resource images also identify mobile cards.
  if(!image&&!card.querySelector('span.text-lg'))continue;
  const name=String(title?.textContent||img?.getAttribute('alt')||'').trim().slice(0,160);if(!name)continue;
  const description=String(card.querySelector('span.text-xs,.text-textcolor2,p')?.textContent||'').trim().slice(0,6000);
  rows.push({id:card.getAttribute('x-realm-id')||'',name,description,image});if(rows.length===10)break;
 }
 return rows;
}
function emptyState(text){if(/Failed to load|불러오기 실패|로드 실패|연결 실패/i.test(text))return {state:'error',message:'기본 홈에서도 렐름 목록을 불러오지 못했어요. 기본 홈에서 연결 상태를 확인한 뒤 다시 불러와 주세요.'};if(/동의|약관|agree|terms of service/i.test(text))return {state:'consent',message:'이 모바일 브라우저에서 렐름 이용 동의가 필요해요. 기본 홈에서 동의한 뒤 돌아와 주세요.'};return {state:'loading',message:'기본 홈의 렐름 목록을 기다리는 중이에요. 자동으로 다시 확인합니다.'};}
async function readCards(doc){
 let section=await doc.querySelector('#main-realm-section');
 // During responsive remounts more than one section may briefly exist.
 if(doc.querySelectorAll){const sections=await array(await doc.querySelectorAll('#main-realm-section'),6);for(const candidate of sections){if(await candidate.matches('[aria-hidden="true"]'))continue;try{const rows=parseCards(await candidate.getInnerHTML());if(rows.length)return {rows,state:'ready',message:''};}catch{}section=candidate;}}
 if(!section&&(root.PocketRisuHomeLayout||(typeof module!=="undefined"&&module.exports?require("./home-layout.cjs"):null))?.homePane)try{section=await (root.PocketRisuHomeLayout||(typeof module!=="undefined"&&module.exports?require("./home-layout.cjs"):null)).homePane(doc);}catch{section=null;}
 if(!section)return {rows:[],state:'missing',message:'기본 홈을 열면 렐름 추천 봇을 자동으로 가져와요.'};
 if(await section.matches('[aria-hidden="true"]'))return {rows:[],state:'collapsed',message:'기본 홈의 Recently Uploaded(렐름) 목록을 펼쳐주세요.'};
 // Read once across the plugin bridge, then parse locally; no per-card RPC on modern hosts.
 if(section.getInnerHTML)try{const rows=parseCards(await section.getInnerHTML());if(rows.length)return {rows,state:'ready',message:''};}catch{}

 const buttons=await array(await section.querySelectorAll('button:has(img),button:has(span.text-lg)'),32),rows=[];
 for(const button of buttons){
  const title=await button.querySelector('span.text-lg')||await button.querySelector('h2,h3,strong');
  const img=await button.querySelector('img'),data=img?imageData(await img.getOuterHTML()):{image:'',alt:''};
  const name=String((title?await title.textContent():'')||data.alt||'').trim().slice(0,160);if(!name)continue;
  const descNode=await button.querySelector('span.text-xs');
  const description=String((descNode?await descNode.textContent():'')||'').trim().slice(0,6000);
  let id='';try{id=String(await button.getAttribute('x-realm-id')||'');}catch{}
  rows.push({id,name,description,image:data.image,node:button});if(rows.length===10)break;
 }
 return rows.length?{rows,state:'ready',message:''}:{rows,...emptyState(String(await section.textContent()||''))};
}
class Widget{
 constructor({host,api,onNative}){this.host=host;this.api=api;this.onNative=onNative;this.visible=false;this.closed=false;this.timer=null;this.pending=null;this.generation=0;this.signature='';this.rows=[];this.detailSerial=0;this.pageSerial=0;this.pagePanel=null;this.pageListener=null;this.q=s=>host.querySelector(s);this.q('.realm-native').onclick=()=>this.openNative();this.q('.realm-refresh').onclick=()=>this.refresh();this.createDialog();}
 setVisible(value){if(this.closed||this.visible===value)return;this.visible=value;if(!value)void this.clearOfficialPage();clearTimeout(this.timer);this.timer=null;if(value)void this.refresh();}
 async openNative(node){await this.onNative();try{const doc=await this.api.getRootDocument(),target=node||await doc.querySelector('[aria-controls="main-realm-section"]');await target?.scrollIntoView({block:'center'});}catch{}}
 refresh(){if(this.closed||!this.visible)return Promise.resolve();if(this.pending)return this.pending;clearTimeout(this.timer);this.timer=null;const generation=this.generation;this.q('.realm-refresh').disabled=true;
 this.pending=(async()=>{try{const doc=await this.api.getRootDocument();const model=await readCards(doc);if(this.closed||generation!==this.generation)return;this.render(model);}catch{if(!this.closed)this.q('.realm-status').textContent='기본 홈의 렐름 목록에 접근하지 못했어요. 메인 화면 접근 권한을 확인해 주세요.';}finally{this.pending=null;if(!this.closed){this.q('.realm-refresh').disabled=false;if(this.visible)this.timer=setTimeout(()=>this.refresh(),this.rows.length?30000:5000);}}})();return this.pending;}
 render({rows,message}){this.rows=rows;this.q('.realm-status').textContent=rows.length?'렐름 추천 캐릭터 · 눌러서 소개와 공식 주소 보기':message;const signature=JSON.stringify(rows.map(({id,name,description,image})=>({id,name,description,image})));if(signature===this.signature)return;this.signature=signature;this.q('.realm-list').replaceChildren(...rows.map((row,index)=>{const card=document.createElement('button'),info=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('p');card.type='button';card.className='realm-bot';card.setAttribute('aria-label',row.name+' 소개 보기');let avatar=document.createElement(row.image?'img':'span');if(row.image){avatar.src=row.image;avatar.alt='';avatar.loading='lazy';avatar.decoding='async';avatar.onerror=()=>{avatar.removeAttribute('src');avatar.hidden=true;};}else{avatar.className='realm-avatar';avatar.textContent=Array.from(row.name)[0]||'?';}info.className='realm-bot-info';title.textContent=row.name;desc.textContent=row.description;info.append(title,desc);card.append(avatar,info);card.onclick=()=>this.showDetail(this.rows[index]);return card;}));}
 createDialog(){const d=document.createElement('dialog');d.className='realm-detail-dialog';d.innerHTML='<div class="card-head"><h2 class="realm-detail-title"></h2><button type="button" class="realm-detail-close" aria-label="닫기">×</button></div><img class="realm-detail-image" alt=""><p class="realm-detail-description"></p><p class="realm-detail-status subtle" role="status"></p><label class="subtle">렐름 공식 주소<input class="realm-page-url" type="text" readonly aria-label="렐름 공식 주소" style="display:block;width:100%;box-sizing:border-box;margin:8px 0"></label><button type="button" class="realm-copy">주소 복사</button><button type="button" class="realm-download primary">새 탭 링크 확인</button>';(this.host?.getRootNode?.()?.host?this.host.getRootNode():document.body).append(d);this.dialog=d;this.dq=s=>d.querySelector(s);this.dq('.realm-detail-close').onclick=()=>d.close();d.addEventListener('close',()=>{this.detailSerial++;void this.clearOfficialPage();});}
 async clearOfficialPage(){this.pageSerial++;const panel=this.pagePanel,listener=this.pageListener;this.pagePanel=null;this.pageListener=null;if(listener)try{await listener.node.removeEventListener('click',listener.id);}catch{}if(panel)try{await panel.remove();}catch{}}
 async showOfficialPage(row){
  const cleanup=this.clearOfficialPage(),serial=this.pageSerial,detail=this.detailSerial,page=officialPage(row);await cleanup;let panel,listener;
  const current=()=>!this.closed&&serial===this.pageSerial&&detail===this.detailSerial&&this.dialog.open;
  try{
   const doc=await this.api.getRootDocument(),body=await doc?.querySelector('body');if(!body)throw Error('no host links');
   panel=await doc.createElement('div');await panel.setAttribute('x-widget-realm-link','1');await panel.setStyleAttribute('position:fixed!important;z-index:2147483647!important;left:50%!important;bottom:24px!important;transform:translateX(-50%)!important;width:min(440px,calc(100vw - 32px))!important;box-sizing:border-box!important;padding:20px!important;border:2px solid #80633c!important;border-radius:18px!important;background:#fff9eb!important;color:#342b22!important;box-shadow:0 8px 40px #0006!important;font:16px/1.5 system-ui,sans-serif!important;pointer-events:auto!important;visibility:visible!important;');
   const title=await doc.createElement('p');await title.setTextContent(String(row.name||'렐름 캐릭터'));await panel.appendChild(title);
   const note=await doc.createElement('p');await note.setTextContent('지금 화면을 유지하고 렐름을 새 탭에서 엽니다.');await note.setStyleAttribute('font-size:14px;margin:8px 0 14px;');await panel.appendChild(note);
   const linkBox=await doc.createElement('div');const escaped=page.url.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');await linkBox.setInnerHTML('<a href="'+escaped+'" target="_blank" rel="noopener noreferrer">렐름 새 탭으로 열기 ↗</a>');const link=await linkBox.querySelector('a');
   // Sanitizers may strip target. Never attach a same-tab link as a fallback.
   if(!link||!await link.matches('[target="_blank"]')){await panel.remove();if(current())this.dq('.realm-detail-status').textContent='이 환경에서는 새 탭 연결이 제한돼요. 주소 복사 후 브라우저의 새 탭에 붙여 넣어 주세요. 현재 화면은 유지됩니다.';return;}
   await link.setStyleAttribute('display:block!important;padding:12px!important;text-align:center!important;background:#76552c!important;color:#ffffff!important;border-radius:10px!important;text-decoration:underline!important;pointer-events:auto!important;');await panel.appendChild(linkBox);
   const close=await doc.createElement('button');await close.setTextContent('소개로 돌아가기');await close.setStyleAttribute('display:block!important;width:100%!important;margin-top:12px!important;padding:10px!important;background:#eee3cf!important;color:#342b22!important;border-radius:10px!important;');await panel.appendChild(close);const id=await close.addEventListener('click',()=>{void this.clearOfficialPage();});listener={node:close,id};
   if(!current()){await close.removeEventListener('click',id);await panel.remove();return;}
   await body.appendChild(panel);
   if(!current()){await close.removeEventListener('click',id);await panel.remove();return;}
   this.pagePanel=panel;this.pageListener=listener;
  }catch{if(listener)try{await listener.node.removeEventListener('click',listener.id);}catch{}if(panel)try{await panel.remove();}catch{}if(current())this.dq('.realm-detail-status').textContent='새 탭 링크를 표시하지 못했어요. 주소 복사 후 브라우저의 새 탭에 붙여 넣어 주세요.';}
 }
 showDetail(row){if(!row||this.closed)return;void this.clearOfficialPage();++this.detailSerial;const page=officialPage(row);this.dq('.realm-detail-title').textContent=row.name;const image=this.dq('.realm-detail-image');image.hidden=!row.image;image.src=row.image||'';image.onerror=()=>{image.hidden=true;};this.dq('.realm-detail-description').textContent=row.description||'등록된 소개가 없어요.';this.dq('.realm-detail-status').textContent=page.exact?'렐름 공식 상세 페이지로 연결해요.':'렐름에서 캐릭터 이름을 검색해요. 결과에서 이름과 이미지를 확인해 주세요.';const address=this.dq('.realm-page-url');address.value=page.url;address.onclick=()=>address.select();this.dq('.realm-copy').onclick=async()=>{address.focus();address.select();let copied=false;try{copied=!!document.execCommand('copy');}catch{}if(!copied)try{await navigator.clipboard.writeText(page.url);copied=true;}catch{}this.dq('.realm-detail-status').textContent=copied?'주소를 복사했어요. 브라우저의 새 탭에 붙여 넣어 주세요.':'주소를 선택했어요. 복사한 뒤 브라우저의 새 탭에 붙여 넣어 주세요.';};const button=this.dq('.realm-download');button.textContent='새 탭 링크 확인';button.disabled=false;button.onclick=()=>this.showOfficialPage(row);if(!this.dialog.open)this.dialog.showModal();}

 dispose(){void this.clearOfficialPage();this.detailSerial++;this.dialog.remove();this.closed=true;this.generation++;clearTimeout(this.timer);this.rows=[];this.q('.realm-native').onclick=null;this.q('.realm-refresh').onclick=null;this.q('.realm-list').replaceChildren();}
}
const exports={array,safeImage,readCards,imageData,resourceKey,officialPage,parseCards,emptyState,Widget};if(typeof module!=='undefined'&&module.exports)module.exports=exports;else root.PocketRisuRealm=exports;
})(globalThis);
