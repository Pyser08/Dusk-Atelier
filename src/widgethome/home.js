/* 위젯 홈(PocketRisu 위젯 홈 v1.0.18 이식). Shadow DOM 안에서만 그려서 Dusk 화면과 스타일·DOM이 섞이지 않아요. */
import Layout from './lib/widget-layout.cjs';
import Resources from './lib/resources.cjs';
import Core from './lib/core.cjs';
import Theme from './lib/theme.cjs';
import Service from './lib/service.cjs';
import Auto from './lib/auto-home.cjs';
import NativeControls from './lib/native-controls.cjs';
import HomeLayout from './lib/home-layout.cjs';
import Design from './lib/design.cjs';
import MusicStore from './lib/music-store.cjs';
import Music from './lib/music.cjs';
import LayoutEditor from './lib/layout-editor.cjs';
import Wallpaper from './lib/wallpaper.cjs';
import { WH_CSS } from './style.js';
export const WH_VERSION = '1.0.18';
export async function bootWidgetHome(api, hostOpts = {}) {
 const C=Core,S=Service,A=Auto,L=HomeLayout,D=Design,M=MusicStore,P=Music,E=LayoutEditor,W=Wallpaper;
 const css=WH_CSS;
 const hostEl=document.createElement('div');hostEl.setAttribute('data-dusk-widgethome','');hostEl.hidden=true;document.body.append(hostEl);const sr=hostEl.attachShadow({mode:'open'});const sheet=document.createElement('style');sheet.textContent=css;sr.append(sheet);const mount=document.createElement('div');
 const paths={music:'M9 18V5l12-3v13 M9 8l12-3 M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3 M21 15a3 3 0 1 1-3-3c2 0 3 1 3 3',widgets:'M3 3h7v7H3z M14 3h7v5h-7z M3 14h7v7H3z M14 12h7v9h-7z',edit:'m14 4 6 6 M3 21l5-1L21 7a2 2 0 0 0-4-4L4 16z',refresh:'M20 7v5h-5 M4 17v-5h5 M5 7a8 8 0 0 1 14-2l1 2 M4 17l1 2a8 8 0 0 0 14-2',image:'M3 3h18v18H3z M3 16l5-5 5 5 3-3 5 5 M15 7h.01',chat:'M21 11a8 8 0 0 1-8 8H6l-4 3 1-7a8 8 0 0 1-1-4 9.5 9.5 0 0 1 19 0',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M22 21v-2a4 4 0 0 0-3-4 M16 3a4 4 0 0 1 0 8',plus:'M12 4v16 M4 12h16',settings:'m10 2-1 4-4 1-2 4 3 3-1 4 4 2 3-3 4 1 3-4-2-3 1-4-4-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',github:'M9 19c-4 1-4-2-6-2 M9 22v-4c-5-1-6-8-2-10L6 3l5 2h2l5-2-1 5c4 2 3 9-2 10v4',send:'m22 2-7 20-4-9L2 9z M11 13 22 2',mail:'M3 5h18v14H3z m0 0 9 8 9-8'};
 const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.widgets}"/></svg>`;
 const dial=Array.from({length:12},(_,i)=>{const n=i+1,a=n*Math.PI/6;return`<span class="dial-number" style="left:${50+Math.sin(a)*40}%;top:${50-Math.cos(a)*40}%">${n}</span>`;}).join('');
 mount.innerHTML=`<div class="app page" data-photo-shape="landscape">
 <div class="backdrop" aria-hidden="true"><div class="wallpaper" hidden aria-hidden="true"><img class="background-photo" alt=""></div></div><div class="shell">
 <header class="topbar"><div class="brand"><span class="brand-mark" aria-hidden="true">${icon('widgets')}</span><div><h1>위젯 홈</h1><p>나만의 작은 이야기 공간</p></div></div><nav class="top-actions" aria-label="위젯 홈 메뉴"><button class="layout-open pill">${icon('widgets')}배치 편집</button><button class="settings-open pill">${icon('edit')}홈 꾸미기</button><button class="tools-open pill" aria-label="위젯 설정">${icon('settings')}설정</button><button class="return original">기존 홈</button></nav></header>
 <div class="preview-banner" hidden>미리보기 · 대화와 캐릭터는 예시 데이터예요.</div>
 <section class="greeting"><div class="greeting-heading"><h2 class="greeting-title"></h2><button class="title-edit icon-button" aria-label="제목 문구 바꾸기">${icon('edit')}</button></div><p class="greeting-subtitle"></p></section>
 <section class="layout-toolbar" hidden aria-label="위젯 배치 편집"><div class="layout-toolbar-head"><div><strong>위젯 배치 편집</strong><span class="layout-profile"></span></div><div class="layout-actions"><button class="library-toolbar">위젯 보관함</button><button class="layout-reset">기본 배치</button><button class="layout-compact">빈칸 정리</button><button class="layout-cancel">취소</button><button class="layout-save primary">저장</button></div></div><p>이름 손잡이로 이동, 모서리로 크기 조절, ×로 보관할 수 있어요. 변경 후 저장을 눌러주세요.</p><div class="layout-inspector"><label>위젯<select class="layout-widget">${[['music','음악'],['photo','사진'],['clock','시계'],['recent','최근 대화'],['added','최근 봇'],['memo','메모']].map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label>너비 <output class="layout-width-value"></output><input class="layout-width" type="range" min="2" max="12" step="1"></label><label>높이 <output class="layout-height-value"></output><input class="layout-height" type="range" min="2" max="24" step="1"></label><div class="layout-arrows" role="group" aria-label="선택한 위젯 이동"><button class="layout-left" aria-label="왼쪽으로 이동">←</button><button class="layout-up" aria-label="위로 이동">↑</button><button class="layout-down" aria-label="아래로 이동">↓</button><button class="layout-right" aria-label="오른쪽으로 이동">→</button></div></div></section>
 <main class="dashboard">
  <div class="music-slot"></div>
  <section class="card photo-card"><button class="photo-hit" aria-label="내 사진 선택 또는 위치 조절"><img class="photo" alt="내가 선택한 사진" hidden><span class="photo-placeholder">${icon('image')}<strong>사진 넣기</strong><small>JPG·PNG 등 · 최대 20MB</small></span></button><button class="photo-select pill">${icon('edit')}<span>사진 변경</span></button></section>
  <section class="card clock-card" aria-label="현재 시각과 날짜"><div class="analog-view"><div class="clock-face" role="img" aria-label="현재 시각">${dial}<i class="clock-hand hour-hand"></i><i class="clock-hand minute-hand"></i><i class="clock-hand second-hand"></i><i class="clock-pin"></i></div></div><div class="digital-view" hidden><small>지금 이 순간</small><time class="clock">--:--</time></div><div class="calendar-view" hidden><div class="calendar-head"><button class="calendar-prev icon-button" aria-label="이전 달">‹</button><strong class="calendar-title"></strong><button class="calendar-next icon-button" aria-label="다음 달">›</button></div><table class="month-calendar" aria-label="월간 달력"><thead><tr>${['일','월','화','수','목','금','토'].map(n=>`<th scope="col">${n}</th>`).join('')}</tr></thead><tbody class="calendar-days"></tbody></table><button class="calendar-today">이번 달</button></div><p class="date"></p></section>
  <section class="card recent-card"><div class="card-head"><h2>${icon('chat')}최근 대화</h2><button class="all-recent">목록 보기 ›</button></div><div class="recent-list list"></div><button class="catalog-retry" type="button" hidden>목록 다시 불러오기</button><p class="catalog-status" role="status"></p></section>
  <section class="card added-card"><div class="card-head"><h2>${icon('users')}최근 추가한 봇</h2><button class="more-uploads">목록 보기 ›</button></div><div class="added-list"></div><button class="legacy-show" type="button" hidden>구형 봇도 표시하기</button><p class="subtle sort-note">가져온 순서 · 최신순</p></section>
  <section class="card memo-card"><div class="card-head"><h2>${icon('edit')}메모</h2><div class="memo-tabs"><button class="memo-tab" aria-pressed="true">메모</button><button class="tasks-tab" aria-pressed="false">할 일</button></div></div><textarea class="memo" maxlength="10000" aria-label="메모" placeholder="오늘의 이야기를 남겨보세요." disabled></textarea><div class="tasks-panel" hidden><ul class="task-list"></ul><div class="task-form"><input class="task-input" maxlength="200" aria-label="할 일 내용" placeholder="할 일 추가"><button class="task-add" type="button" aria-label="할 일 추가" disabled>+</button></div></div><div class="memo-save-row"><p class="memo-status subtle" role="status">불러오는 중…</p><button class="memo-save" type="button" disabled>저장</button></div></section>
 </main>
 <section class="layout-empty" hidden><h2>지금 표시 중인 위젯이 없어요</h2><p>보관함에서 원하는 위젯을 다시 추가해 보세요.</p><button class="library-empty pill">위젯 보관함 열기</button></section>
 <nav class="shortcuts related-links" hidden aria-label="관련 링크">${[['github','GitHub','github'],['feedback','의견 보내기','send'],['email','개발자 이메일','mail'],['arca','아카라이브','chat']].map(([key,label,symbol])=>`<button class="link-${key}" data-link="${key}">${icon(symbol)}<span>${label}</span></button>`).join('')}</nav>
 <footer><p>사진·메모·음악을 나만의 위젯에 보관해요</p><nav class="dock" aria-label="주요 메뉴"><button class="dock-home active" aria-current="page">${icon('widgets')}<span>위젯 홈</span></button><button class="dock-recent">${icon('users')}<span>최근 목록</span></button><button class="dock-music">${icon('music')}<span>음악</span></button><button class="dock-settings">${icon('edit')}<span>홈 꾸미기</span></button></nav><p class="auto-status subtle" role="status"></p><p class="subtle preview-note">실제 대화는 캐릭터 목록에서 선택해 주세요.</p><details class="diagnostics" hidden><summary>오류 정보 · v1.0.18</summary><pre class="error-info"></pre></details></footer>
 </div>
 <input class="photo-file" type="file" accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.gif,.avif,.bmp,.dib" hidden><input class="background-file" type="file" accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.gif,.avif,.bmp,.dib" hidden>
 <dialog class="settings-dialog customize-dialog" aria-labelledby="settings-title"><div class="card-head"><h2 id="settings-title">${icon('edit')}홈 꾸미기</h2><button class="settings-close icon-button" aria-label="홈 꾸미기 닫기">×</button></div><div class="customize-widget-actions"><button class="layout-settings wide">${icon('widgets')}위젯 크기·위치 편집</button><button class="library-customize wide">위젯 보관함</button></div><label class="field">위젯 디자인<select class="surface-style"><option value="navy">기본</option><option value="glass">글래스 모피즘</option></select></label><label class="check"><input class="follow-theme" type="checkbox" checked>리스 색상 따라가기</label><p class="subtle">끄면 저장해 둔 위젯별 색상을 사용해요.</p><label class="field">제목 문구<input class="title-input" maxlength="80"></label><label class="field">설명 문구<input class="subtitle-input" maxlength="120"></label><fieldset><legend>시계 스타일</legend><div class="design-clock-options">${[['analog','벽시계','◷'],['calendar','달력','▦'],['digital','전자시계','09:41']].map(([key,label,shape])=>`<label class="design-option"><input type="radio" name="clock-style" value="${key}"><span class="option-symbol">${shape}</span>${label}</label>`).join('')}</div></fieldset><fieldset><legend>사진 크기</legend><div class="design-photo-options">${[['landscape','가로형 (넓게)'],['square','정사각형']].map(([key,label])=>`<label class="design-option"><input type="radio" name="photo-shape" value="${key}"><span class="mini-photo ${key}"></span>${label}</label>`).join('')}</div></fieldset><fieldset class="preset-settings"><legend>내 색상 프리셋</legend><label class="field">저장한 조합<select class="custom-preset-select" aria-label="저장한 색상 프리셋"></select></label><div class="custom-preset-preview" aria-label="선택한 프리셋 색상 미리보기"></div><div class="custom-preset-rename-row"><label class="field">선택한 프리셋 이름<input class="custom-preset-rename-input" maxlength="40" placeholder="변경할 이름"></label><button type="button" class="custom-preset-rename">이름 변경</button></div><label class="field">새 프리셋 이름<input class="custom-preset-name" maxlength="40" placeholder="예: 딸기 우유"></label><div class="color-presets"><button type="button" class="custom-preset-save">현재 색상 저장</button><button type="button" class="custom-preset-load">불러오기</button><button type="button" class="custom-preset-update">선택 항목 덮어쓰기</button><button type="button" class="custom-preset-delete danger">선택 항목 삭제</button></div><p class="custom-preset-status subtle" role="status"></p><p class="subtle">직접 지정한 위젯·바로가기 색상만 저장해요. 저장·이름 변경·덮어쓰기·삭제는 즉시 반영돼요. 불러온 색상은 미리 확인한 뒤 아래 적용을 눌러 홈에 저장하세요.</p></fieldset><fieldset class="block-color-settings"><legend>위젯·바로가기 색상</legend><label class="all-block-color">전체 한 번에 변경<input class="block-color-all" type="color" value="#21222c" aria-label="전체 위젯 블록 색상"></label><div class="block-color-grid">${Object.entries(C.BLOCK_LABELS).map(([key,label])=>`<label>${label}<input class="block-color-${key}" type="color" value="${C.BLOCK_DEFAULTS[key]}" aria-label="${label} 블록 색상"></label>`).join('')}</div><p class="subtle">글자색은 자동으로 조정돼요. 적용을 눌러 저장하세요.</p></fieldset><button class="background-change wide">${icon('image')}배경 사진 추가 / 변경</button><label class="check"><input class="auto-input" type="checkbox">홈 화면에서 위젯 자동 표시</label><label class="check"><input class="legacy-input" type="checkbox">구형 봇도 최근 봇 목록에 포함</label><div class="dialog-actions"><button class="design-reset">기본 디자인</button><button class="settings-save primary">적용</button></div></dialog>
 <dialog class="email-dialog" aria-labelledby="email-title"><div class="card-head"><h2 id="email-title">${icon('mail')}개발자 이메일</h2><button class="email-close icon-button" type="button" aria-label="개발자 이메일 닫기">×</button></div><p>아래 주소로 문의를 보내주세요.</p><label class="field">이메일 주소<input class="email-address" type="text" value="contact@pocketrisu.com" readonly spellcheck="false"></label><div class="dialog-actions"><button class="email-copy" type="button">주소 복사</button><button class="email-open primary" type="button">메일 앱 열기</button></div><p class="email-status subtle" role="status">메일 앱이 열리지 않으면 주소를 복사해 사용 중인 메일에서 작성해 주세요.</p></dialog>
 <dialog class="tools-dialog" aria-labelledby="tools-title"><div class="card-head"><h2 id="tools-title">${icon('settings')}위젯 설정</h2><button class="tools-close icon-button" aria-label="위젯 설정 닫기">×</button></div><div class="tools-grid"><button class="tool-button shortcut-photo">${icon('edit')}<strong>사진 편집</strong><span>사진 선택과 위치 조절</span></button><button class="tool-button shortcut-background">${icon('image')}<strong>배경 변경</strong><span>홈 배경 사진 바꾸기</span></button><button class="tool-button shortcut-refresh">${icon('refresh')}<strong>목록 새로고침</strong><span>최근 대화와 봇 다시 불러오기</span></button></div></dialog>
 <dialog class="library-dialog" aria-labelledby="library-title"><div class="card-head"><h2 id="library-title">위젯 보관함</h2><button class="library-close icon-button" aria-label="보관함 닫고 편집 계속하기">×</button></div><p class="subtle">보관해도 사진·음악·메모는 지워지지 않아요. 저장하면 PC와 모바일 모두 적용돼요.</p><p class="library-count" role="status"></p><div class="library-list"></div><div class="dialog-actions"><button class="library-cancel">취소</button><button class="library-save primary">저장</button></div></dialog>
 <dialog class="photo-editor" aria-labelledby="photo-editor-title"><div class="card-head"><h2 id="photo-editor-title">내 사진 꾸미기</h2><button class="editor-close icon-button" aria-label="사진 편집 닫기">×</button></div><div class="edit-preview"><img class="edit-image" alt="사진 위치 미리보기"></div><div class="sliders">${[['x','좌우 위치',0,100,1],['y','상하 위치',0,100,1],['scale','확대',1,2,.01]].map(([key,label,min,max,step])=>`<label>${label}<input class="edit-${key}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')}</div><p class="subtle">사진과 배경은 따로 저장돼요. 취소하면 이전 사진을 유지해요.</p><div class="dialog-actions"><button class="editor-replace">다른 사진</button><button class="editor-remove danger">사진 삭제</button><button class="editor-cancel">취소</button><button class="editor-save primary">저장</button></div></dialog>
 <dialog class="detail-dialog" aria-labelledby="detail-title"><div class="card-head"><h2 id="detail-title" class="detail-title">미리보기</h2><button class="detail-close">닫기</button></div><p class="detail-subtitle subtle"></p><div class="messages"></div><p class="subtle">메시지 미리보기는 읽기 전용이에요.</p><button class="detail-return">닫고 원래 화면으로</button></dialog>
 <dialog class="catalog-dialog" aria-labelledby="catalog-title"><div class="card-head"><h2 id="catalog-title">최근 목록</h2><button class="catalog-close">닫기</button></div><div class="catalog-tabs"><button class="catalog-recent" aria-pressed="true">최근 대화</button><button class="catalog-added" aria-pressed="false">최근 추가한 봇</button></div><p class="subtle catalog-help">최근 항목을 최대 24개까지 미리 볼 수 있어요.</p><div class="catalog-list list"></div><button class="catalog-native wide">목록에서 대화 선택</button></dialog>
 <div class="toast" hidden role="status" aria-live="polite"></div>
</div>`;sr.append(mount);
 const queryNodes=new Map(),$=s=>{const old=queryNodes.get(s);if(old?.isConnected)return old;const node=sr.querySelector(s);if(node&&/^[.#][\w-]+$/.test(s))queryNodes.set(s,node);return node;},store=new S.Storage(api);
 const state={colorPresets:[],presetsReady:false,presetsBusy:false,closed:false,visible:false,opening:false,ready:false,prefs:C.settings(null),model:null,memoReady:false,memoRevision:0,memoSaved:0,memoTimer:null,memoSaving:null,memoCommitted:null,clockTimer:null,toastTimer:null,photo:null,background:null,photoBusy:false,detailSerial:0,errors:[],tasks:[],calendarOffset:0,calendarKey:'',editor:null,catalogSerial:0,clockKey:'',dateKey:'',theme:null,catalogTimer:null,catalogAt:0};
 let auto=null,layoutEditor=null,themeFollower=null;
 const nodes=new Map(),cached=s=>{if(!nodes.has(s))nodes.set(s,$(s));return nodes.get(s);};
 const text=(s,v)=>{const node=cached(s);if(node.textContent!==v)node.textContent=v;};
 const timeFormat=new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}),dateFormat=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'});
 const appliedColors=new Map(),palettes=new Map();let colorFrame=null,pendingColors=null,catalogTask=null,shortcutRefreshTask=null;
 const blockNodes={music:'.music-card',photo:'.photo-card',clock:'.clock-card',recent:'.recent-card',added:'.added-card',memo:'.memo-card',shortcutPhoto:'.shortcut-photo',shortcutBackground:'.shortcut-background',shortcutRefresh:'.shortcut-refresh',linkGithub:'.link-github',linkFeedback:'.link-feedback',linkEmail:'.link-email',linkArca:'.link-arca'};
 function recordError(stage,error){const note=`v1.0.18 · ${stage}\n${String(error?.message||error||'알 수 없는 오류').slice(0,300)}`;if(!state.errors.includes(note)){state.errors.push(note);state.errors=state.errors.slice(-6);}text('.error-info',state.errors.join('\n\n'));$('.diagnostics').hidden=false;console.error('[Widget Home]',note);return note;}
 function toast(message){const dialogs=sr.querySelectorAll('dialog[open]');(dialogs[dialogs.length-1]||$('.app')).append($('.toast'));text('.toast',message);$('.toast').hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{$('.toast').hidden=true;},4500);}
 const wallpaperViewport=new W.Viewport({host:globalThis,layer:$('.backdrop'),window:globalThis,isVisible:()=>state.visible&&!document.hidden});
 const nativeControls=new NativeControls.Controls({window:globalThis,layoutRoot:$('.shell'),modalRoot:sr,isBlocked:()=>sr.querySelectorAll('dialog[open]').length>0,allowBlockedLink:key=>key==='email'&&$('.email-dialog').open&&sr.querySelectorAll('dialog[open]').length===1,palette:()=>effectiveTheme()||Theme.BASE,slots:()=>Object.fromEntries(['github','feedback','email','arca'].map(key=>[key,key==='email'?($('.email-dialog').open?cached('.email-open'):null):cached('.link-'+key)]))});
 const layout=new L.HomeLayout(api,{onLost:()=>close({automatic:true}),onPane:(pane,doc)=>{$('.related-links').hidden=false;nativeControls.bind(doc,pane);},onPlacement:(box,visible)=>nativeControls.placement(box,visible),onRelease:()=>{nativeControls.clear();$('.related-links').hidden=true;},onInset:width=>{$('.topbar').style.paddingLeft=width?`${width}px`:'';},onWarning:recordError,isPageHidden:()=>document.hidden});
 const music=P.create({notify:toast},{store:new M.Store(store)});const detachMusic=music.attach($('.music-slot'));
 layoutEditor=new E.Editor({document:{createElement:(...a)=>document.createElement(...a),querySelector:s=>sr.querySelector(s)},host:$('.app'),grid:$('.dashboard'),frames:{music:$('.music-slot'),photo:$('.photo-card'),clock:$('.clock-card'),recent:$('.recent-card'),added:$('.added-card'),memo:$('.memo-card')},getLayouts:()=>state.prefs.layouts,getHidden:()=>state.prefs.hiddenWidgets,getShape:()=>state.prefs.photoShape,getClock:()=>state.prefs.clock,notify:toast,beforeEdit:()=>{for(const d of sr.querySelectorAll('dialog[open]'))d.close();},onChange:()=>{renderLibrary();syncVisibility();},onMode:editing=>{$('.layout-open').disabled=editing;$('.shortcut-refresh').disabled=editing;syncVisibility();},save:async(profile,value,hidden)=>{const layouts={...state.prefs.layouts,[profile]:value},other=profile==='desktop'?'mobile':'desktop',changed=hidden.join(',')!==state.prefs.hiddenWidgets.join(',');if(changed&&layouts[other])layouts[other]=Layout.compact(layouts[other],other,null,hidden);const next=C.settings({...state.prefs,layouts,hiddenWidgets:hidden});await store.set('settings',next);if(!state.closed){const pause=hidden.includes('music')&&!state.prefs.hiddenWidgets.includes('music');state.prefs=next;if(pause){music.audio.pause();music.persist();}syncVisibility();}}});
 $('.layout-open').onclick=()=>layoutEditor.start();$('.layout-settings').onclick=()=>layoutEditor.start();

 const rootColors=new Map();
 function followsTheme(){return cached('.settings-dialog').open?cached('.follow-theme').checked:state.prefs.followTheme;}
 function effectiveTheme(){return followsTheme()?state.theme:null;}
 function applyColors(colors){
  const app=effectiveTheme(),base=app||Theme.BASE,themeKey=app?JSON.stringify(app):'';
  $('.app').dataset.themeSource=app?'app':'custom';
  for(const [token,value]of Object.entries(base)){if(token==='type')continue;if(rootColors.get(token)!==value){rootColors.set(token,value);hostEl.style.setProperty('--'+token,value);}}
  hostEl.style.colorScheme=base.type;
  for(const [key,selector]of Object.entries(blockNodes)){
   const signature=app?'app:'+themeKey+':'+key:colors[key];if(appliedColors.get(key)===signature)continue;appliedColors.set(key,signature);
   const node=cached(selector);let palette;
   if(app)palette={surface:key==='photo'?app.soft:app.surface,ink:app.ink,muted:app.muted,accent:app.accent,line:app.line,soft:app.soft,button:app.button,bg:app.bg};
   else{palette=palettes.get(colors[key])||C.blockPalette(colors[key]);if(!palettes.has(colors[key])){if(palettes.size>=48)palettes.delete(palettes.keys().next().value);palettes.set(colors[key],palette);}}
   for(const [token,value]of Object.entries(palette))node.style.setProperty('--'+token,value);if(key==='photo')node.style.borderColor=app?app.line:palette.surface;
  }
  nativeControls.request();
 }
 themeFollower=new Theme.Follower(api,{isVisible:()=>state.visible&&!state.closed&&!document.hidden&&followsTheme(),onChange:value=>{if(state.closed)return;state.theme=value;applyColors(cached('.settings-dialog').open?draftColors():state.prefs.colors);}});

 function queueColors(colors){pendingColors=C.blockColors(colors);if(colorFrame!==null)return;colorFrame=globalThis.requestAnimationFrame(()=>{colorFrame=null;const value=pendingColors;pendingColors=null;if(!state.closed&&value)applyColors(value);});}
 function cancelColorPreview(){if(colorFrame!==null)globalThis.cancelAnimationFrame(colorFrame);colorFrame=null;pendingColors=null;}
 function draftColors(){return C.blockColors({...state.prefs.colors,...Object.fromEntries(Object.keys(C.BLOCK_LABELS).map(key=>[key,cached('.block-color-'+key).value]))});}
 function fillColors(colors){for(const key of Object.keys(C.BLOCK_LABELS))cached('.block-color-'+key).value=colors[key];cached('.block-color-all').value=colors.music;}
 function applyDesign(){text('.greeting-title',state.prefs.title);text('.greeting-subtitle',state.prefs.subtitle);$('.app').dataset.photoShape=state.prefs.photoShape;$('.app').dataset.surface=state.prefs.surface;for(const [kind,selector]of [['analog','.analog-view'],['calendar','.calendar-view'],['digital','.digital-view']])$(selector).hidden=state.prefs.clock!==kind;applyColors(state.prefs.colors);themeFollower.syncPolling();layoutEditor?.apply();if(state.visible)startClock();else clock();}
 function clock(){if(currentHidden().includes('clock'))return;const now=new Date(),minuteKey=Math.floor(now.getTime()/60000);if(state.clockKey!==minuteKey){const label=timeFormat.format(now);text('.clock',label);cached('.clock').dateTime=now.toISOString();cached('.clock-face').setAttribute('aria-label',label);state.clockKey=minuteKey;}
  const dayKey=[now.getFullYear(),now.getMonth(),now.getDate()].join('-');if(dayKey!==state.dateKey){text('.date',dateFormat.format(now));state.dateKey=dayKey;}
  if(state.prefs.clock==='analog'){const angles=D.clockAngles(now);for(const name of ['hour','minute','second'])cached('.'+name+'-hand').style.transform=`rotate(${angles[name]}deg)`;}
  if(state.prefs.clock==='calendar'){const key=dayKey+':'+state.calendarOffset;if(key!==state.calendarKey){const month=D.calendarMonth(now,state.calendarOffset);text('.calendar-title',`${month.year}년 ${month.month+1}월`);const rows=[];for(let i=0;i<6;i++){const tr=document.createElement('tr');for(let j=0;j<7;j++){const day=month.days[i*7+j],td=document.createElement('td'),span=document.createElement('span');span.textContent=day?String(day):'';if(day&&day===month.today){td.className='today';td.setAttribute('aria-current','date');}td.append(span);tr.append(td);}rows.push(tr);}cached('.calendar-days').replaceChildren(...rows);state.calendarKey=key;}}
 }
 function startClock(){clearTimeout(state.clockTimer);state.clockTimer=null;if(state.closed||!state.visible||document.hidden||currentHidden().includes('clock'))return;clock();const step=state.prefs.clock==='analog'?1000:60000;state.clockTimer=setTimeout(startClock,step-Date.now()%step);}
 function transformImage(node,value){const p=D.photoSettings(value);node.style.objectPosition=`${p.x}% ${p.y}%`;node.style.transform=`scale(${p.scale})`;}
 function applyPhoto(record,kind='photo'){const value=C.safeImage(record?.data);state[kind]=value?record:null;
  if(kind==='photo'){$('.photo').hidden=!value;$('.photo-placeholder').hidden=Boolean(value);$('.photo-select').classList.toggle('empty-photo',!value);if(value){$('.photo').src=value;transformImage($('.photo'),record.position);}else $('.photo').removeAttribute('src');}
  else{$('.wallpaper').hidden=!value;$('.app').classList.toggle('has-wallpaper',Boolean(value));if(value){$('.background-photo').src=value;transformImage($('.background-photo'),record.position);}else $('.background-photo').removeAttribute('src');}
 }
 function renderTasks(){const rows=state.tasks.map(task=>{const li=document.createElement('li'),label=document.createElement('label'),check=document.createElement('input'),name=document.createElement('span'),remove=document.createElement('button');check.type='checkbox';check.checked=task.done;name.textContent=task.text;check.onchange=()=>{task.done=check.checked;dirtyMemo();return saveMemo();};label.append(check,name);remove.textContent='×';remove.setAttribute('aria-label',task.text+' 삭제');remove.type='button';remove.onclick=()=>{state.tasks=state.tasks.filter(t=>t.id!==task.id);renderTasks();dirtyMemo();return saveMemo();};li.append(label,remove);return li;});$('.task-list').replaceChildren(...rows);$('.task-input').disabled=!state.memoReady;$('.task-add').disabled=!state.memoReady;$('.memo-save').disabled=!state.memoReady;}
 function dirtyMemo(){state.memoRevision++;text('.memo-status','저장 대기…');clearTimeout(state.memoTimer);state.memoTimer=setTimeout(saveMemo,500);}
 async function restore(){const results=await Promise.allSettled(['settings','memo','photo','background','color-presets'].map(k=>store.get(k)));if(state.closed)return;const[prefs,memo,photo,background,presets]=results;state.presetsReady=presets.status==='fulfilled';if(state.presetsReady)state.colorPresets=C.colorPresets(presets.value);renderColorPresets();if(prefs.status==='fulfilled')state.prefs=C.settings(prefs.value);applyDesign();state.memoReady=memo.status==='fulfilled';$('.memo').disabled=!state.memoReady;if(state.memoReady){$('.memo').value=typeof memo.value?.text==='string'?memo.value.text.slice(0,10000):'';state.tasks=D.tasks(memo.value?.tasks);$('.task-input').value=typeof memo.value?.draft==='string'?memo.value.draft.slice(0,200):'';state.memoCommitted=JSON.stringify(memoSnapshot());state.memoRevision=state.memoSaved=0;text('.memo-status','자동 저장');}else text('.memo-status','읽기 실패 · 새로고침해 주세요');renderTasks();for(const[kind,result]of [['photo',photo],['background',background]])if(result.status==='fulfilled')try{applyPhoto(result.value,kind);}catch(error){recordError('사진 복원',error);}state.ready=true;if(results.some(r=>r.status==='rejected'))toast('일부 저장 내용을 읽지 못했어요. 현재 내용을 유지해요.');}
  async function thumbnail(path){
    if(!path||!/^(?:assets\/)?[\w.-]+$/.test(path)||path==='.'||path==='..')return'';
    const raw=await api.readImage(path),bytes=raw instanceof Uint8Array?raw:raw instanceof ArrayBuffer?new Uint8Array(raw):Array.isArray(raw)?new Uint8Array(raw):null;
    if(state.closed||!bytes||bytes.length>20*1024*1024)return'';
    const bitmap=await createImageBitmap(new Blob([bytes]));let value='';
    try{
      const canvas=document.createElement('canvas'),scale=Math.min(1,768/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);value=canvas.toDataURL('image/webp',.92);
    }finally{bitmap.close();}
    return value;
  }
  const thumbs=new Resources.ResourceCache(thumbnail),reader=new S.DatabaseReader(api);
  const cachedThumbnail=path=>thumbs.get(path);
  const catalog=new S.CatalogService(api,store,cachedThumbnail,reader),fullCatalog=new S.CatalogService(api,store,cachedThumbnail,reader);
  const renderedLists=new Map(),rowDateFormat=new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  function empty(container,message){const p=document.createElement('p');p.className='empty';p.textContent=message;container.replaceChildren(p);}
  function avatar(item){if(C.safeImage(item.image)){const img=document.createElement('img');img.alt='';img.className='avatar';img.loading='lazy';img.src=item.image;return img;}const span=document.createElement('span');span.className='avatar fallback';span.textContent=Array.from(item.name||'?')[0];return span;}
  function renderCatalog(force=true){
    const model=state.model,reason=!model?'목록을 불러오는 중이에요.':model?.status==='permission'?'목록을 보려면 데이터 읽기 권한을 허용해 주세요.':model?.status==='error'?'목록을 불러오지 못했어요. 새로고침해 주세요.':'아직 표시할 항목이 없어요.';
    for(const [kind,selector]of [['recent','.recent-list'],['added','.added-list']]){
      const rows=model?.status==='ready'?model[kind]||[]:[],container=$(selector);
      const previous=renderedLists.get(kind),context=[model?.status,kind==='added'?model?.hiddenLegacy:0].join(':');
      if(!force&&previous?.context===context&&S.sameRows(previous.rows,rows))continue;
      renderedLists.set(kind,{rows,context});
      if(!rows.length){empty(container,model?.status==='ready'?(kind==='recent'?'저장된 대화가 없어요.':(model.hiddenLegacy?'구형 봇 '+model.hiddenLegacy+'개가 현재 필터로 숨겨져 있어요.':'표시할 봇이 없어요.')):reason);continue;}
      container.replaceChildren(...rows.map(item=>{const b=document.createElement('button');b.className=kind==='recent'?'chat-row':'bot-tile';b.type='button';b.setAttribute('aria-label',`${item.name} ${kind==='recent'?'대화 미리보기':'봇 정보'}`);b.append(avatar(item));const info=document.createElement('span');info.className='row-info';const title=document.createElement('strong');title.textContent=item.name;info.append(title);
        if(kind==='recent'){const name=document.createElement('span');name.className='chat-name';name.textContent=item.chatName||'이름 없는 대화';const preview=document.createElement('span');preview.className='chat-preview';preview.textContent=item.preview||'메시지 미리보기';info.append(name,preview);if(item.time){const when=document.createElement('small');when.textContent=rowDateFormat.format(new Date(item.time));info.append(when);}}
        b.append(info);b.onclick=()=>detail(item);const wrap=document.createElement('div');wrap.className=kind==='recent'?'catalog-row':'catalog-tile';const preview=document.createElement('button');preview.className='preview-button';preview.type='button';preview.textContent='⋯';preview.setAttribute('aria-label',item.name+(kind==='added'?' 봇 정보':' 대화 미리보기'));preview.onclick=()=>detail(item);wrap.append(b,preview);return wrap;}));
    }
    text('.catalog-status',model?.warning||'');$('.legacy-show').hidden=!(model?.status==='ready'&&model.hiddenLegacy>0);$('.catalog-retry').hidden=model?.status==='ready'&&model.recent.length>0;
  }
  function reloadCatalog(options={}){
    if(catalogTask)return catalogTask;
    catalogTask=(async()=>{
      try{const model=await catalog.refresh({...state.prefs,force:options.force===true});if(state.closed)return;state.model=model;state.catalogAt=Date.now();}
      catch(error){if(state.closed)return;recordError('최근 대화·봇 목록 읽기',error);if(!state.model||state.model.status!=='ready')state.model={status:'error',recent:[],added:[]};else toast('목록을 갱신하지 못해 이전 목록을 표시해요.');}
      if(!state.closed)renderCatalog(!options.background);
    })().finally(()=>{catalogTask=null;});return catalogTask;
  }
  function refreshVisibleCatalog(){
    if(state.closed||!state.visible||document.hidden||layoutEditor.editing||sr.querySelectorAll('dialog[open]').length||state.model?.status==='permission')return;
    if(currentHidden().includes('recent')&&currentHidden().includes('added'))return;
    if(Date.now()-state.catalogAt>=30000||state.model?.status!=='ready')void reloadCatalog({background:true});
  }
  $('.catalog-retry').onclick=()=>reloadCatalog({force:true});
  $('.legacy-show').onclick=async()=>{const next=C.settings({...state.prefs,includeLegacy:true});try{await store.set('settings',next);state.prefs=next;await reloadCatalog({force:true});}catch{toast('표시 설정을 저장하지 못했어요. 다시 시도해 주세요.');}};
  async function open(forceRestore=false,options={}){
    if(state.closed||state.opening)return false;
    if(!options.automatic&&!state.visible)auto?.manualOpen();state.opening=true;
    let stage='화면 준비',inline=false;
    try{
      // Request consent before covering the main app.
      if(state.visible){await hideBox();state.visible=false;syncBackgroundPolling();music.setVisible(false);clearTimeout(state.clockTimer);}
      void themeFollower.refresh().catch(()=>{});await layout.stop();await layout.clearNativeScroll();
      stage='위젯 데이터 복원';
      if(!state.ready||!state.memoReady)await restore();
      else if(forceRestore===true){if(await saveMemo())await restore();else toast('메모 저장에 실패해 현재 메모를 유지했어요.');}
      stage='최근 목록 불러오기';if(state.closed)return false;if(!(state.model?.status==='ready'&&Date.now()-state.catalogAt<60000))void reloadCatalog();
      stage='현재 홈 확인';
      if(options.allow&&!await options.allow())return false;
      // DOM placement is optional for manual opening: it cannot disable the UI.
      let onHome=false;
      try{onHome=Boolean(auto?.doc&&await A.isHome(api,auto.doc));}
      catch(error){recordError(stage,error);}
      if(onHome){
        stage='홈 영역 배치';
        try{inline=await layout.prepare(auto.doc);}
        catch(error){recordError(stage,error);await layout.stop();}
      }
      if(options.automatic&&!inline){
        auto?.pause();text('.auto-status','홈 영역 연결에 실패했어요. 메뉴의 위젯 홈에서는 전체 화면으로 열 수 있어요.');
        const note=state.errors.at(-1)||recordError(stage,Error('현재 홈 영역 또는 플러그인 프레임을 찾지 못했어요.'));
        try{await api.alert(`홈 영역을 연결하지 못했어요. 메뉴에서 위젯을 직접 열 수 있어요.\n\n${note}`);}catch{}
        return false;
      }
      if(options.allow&&!await options.allow()){await layout.stop();return false;}
      stage='플러그인 화면 표시';await showBox();state.visible=true;
      if(inline){
        stage='홈 배치 활성화';
        try{if(!await layout.start()){await close({automatic:true});return false;}}
        catch(error){
          recordError(stage,error);await hideBox();state.visible=false;await layout.stop();
          if(options.automatic){auto?.pause();try{await api.alert(`홈 배치를 완료하지 못했어요. 메뉴에서 직접 열어 주세요.\n\n${state.errors.at(-1)}`);}catch{}return false;}
          stage='전체 화면 복구';await showBox();state.visible=true;
        }
      }
      stage='위젯 배치';layoutEditor.apply();
      stage='시계 표시';syncVisibility();
      return true;
    }catch(error){
      const note=recordError(stage,error);try{await hideBox();}catch{}state.visible=false;syncBackgroundPolling();music.setVisible(false);clearTimeout(state.clockTimer);try{await layout.stop();}catch(cleanupError){recordError('오류 후 정리',cleanupError);}
      if(options.automatic)auto?.pause();
      try{await api.alert(`위젯 홈을 열지 못했어요. 아래 오류 정보를 알려 주세요.\n\n${note}`);}catch{}return false;
    }finally{state.opening=false;}
  }
  async function close(options={}){
    layoutEditor.cancel();
    if(!options.automatic)auto?.suppress();else auto?.release();
    state.visible=false;syncBackgroundPolling();music.setVisible(false);state.detailSerial++;clearTimeout(state.clockTimer);clearTimeout(state.memoTimer);void saveMemo();
    for(const d of sr.querySelectorAll('dialog[open]'))d.close();await hideBox();await layout.stop({nativeScroll:!options.automatic});
  }
  function memoSnapshot(){return{text:$('.memo').value.slice(0,10000),tasks:D.tasks(state.tasks),draft:$('.task-input').value.slice(0,200)};}
  function saveMemo(){
    clearTimeout(state.memoTimer);state.memoTimer=null;
    if(!state.memoReady)return Promise.resolve(false);
    if(state.memoSaving)return state.memoSaving;
    state.memoSaving=(async()=>{
      while(true){
        const value=memoSnapshot(),signature=JSON.stringify(value),revision=state.memoRevision;
        if(signature===state.memoCommitted){state.memoSaved=revision;return true;}
        if(!state.closed)text('.memo-status','저장 중…');
        try{
          await store.set('memo',{...value,updatedAt:Date.now()});
          const saved=await store.get('memo');
          if(!saved||saved.text!==value.text||JSON.stringify(D.tasks(saved.tasks))!==JSON.stringify(value.tasks)||(saved.draft||'')!==value.draft)throw Error('저장한 내용을 확인하지 못했어요.');
          state.memoCommitted=signature;state.memoSaved=revision;
          if(!state.closed){text('.memo-status','저장됨');text('.memo-save','저장');}
          // Input while the RPC was in flight is saved in the next pass.
        }catch(error){if(!state.closed){text('.memo-status','저장 실패 · 다시 저장을 눌러주세요');text('.memo-save','다시 저장');recordError('메모·할 일 저장',error);}return false;}
      }
    })().finally(()=>{state.memoSaving=null;});
    return state.memoSaving;
  }
  async function detail(row){
    const serial=++state.detailSerial,d=$('.detail-dialog');text('.detail-title',row.name);text('.detail-subtitle',row.chatName||'봇 정보');empty($('.messages'),'불러오는 중…');if(!d.open)d.showModal();
    try{const result=await catalog.detail(row);if(state.closed||serial!==state.detailSerial||!d.open)return;text('.detail-title',result.name);text('.detail-subtitle',result.chatName?'최근 메시지 · 읽기 전용':'봇 정보');
      if(result.bot){
        const sections=[];
        for(const field of result.fields||[]){const folded=['설명','제작자 노트','첫 메시지'].includes(field.label),section=document.createElement(folded?'details':'section'),label=document.createElement(folded?'summary':'strong'),p=document.createElement('p');section.className='message bot-info-section'+(folded?' bot-info-fold':'');label.textContent=field.label;p.textContent=field.text;section.append(label,p);sections.push(section);}
        const meta=document.createElement('p');meta.className='subtle';meta.textContent=`저장된 대화 ${result.chatCount||0}개`;sections.push(meta);
        if(!(result.fields||[]).length){const note=document.createElement('p');note.className='empty';note.textContent='이 봇에는 표시할 설명이나 제작자 정보가 등록되어 있지 않아요.';sections.push(note);}
        if(result.warning){const warning=document.createElement('p');warning.className='subtle';warning.textContent=result.warning;sections.push(warning);}
        $('.messages').replaceChildren(...sections);
      }else if(!result.messages.length)empty($('.messages'),'표시할 메시지가 없어요.');
      else $('.messages').replaceChildren(...result.messages.map(m=>{const section=document.createElement('section');section.className='message';const label=document.createElement('strong');label.textContent=m.role==='user'?'사용자':result.name;const p=document.createElement('p');p.textContent=m.text;section.append(label,p);return section;}));
    }catch(e){if(!state.closed&&serial===state.detailSerial&&d.open)empty($('.messages'),e.message||'미리보기를 열지 못했어요.');}
  }
  async function photoData(file){
    const error=C.imageError(file);if(error)throw Error(error);if(!C.imageType(await file.slice(0,256).arrayBuffer()))throw Error('사진 파일의 내용을 확인할 수 없어요. JPG나 PNG로 다시 저장해 주세요.');
    const url=URL.createObjectURL(file),img=new Image();
    try{img.src=url;try{await img.decode();}catch{throw Error('이 브라우저에서 사진을 열지 못했어요. JPG나 PNG를 선택해 주세요.');}if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>100000000)throw Error('사진 크기가 너무 커요.');
      const factor=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));const ctx=canvas.getContext('2d');if(!ctx)throw Error('사진을 처리하지 못했어요.');ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/webp',.85);if(!C.safeImage(data))throw Error('저장할 사진 크기가 너무 커요. 작은 사진을 선택해 주세요.');return{data,updatedAt:Date.now()};
    }finally{URL.revokeObjectURL(url);}
  }

 async function showCatalog(kind='recent'){
  const serial=++state.catalogSerial,d=$('.catalog-dialog');$('.catalog-recent').setAttribute('aria-pressed',String(kind==='recent'));$('.catalog-added').setAttribute('aria-pressed',String(kind==='added'));text('#catalog-title',kind==='recent'?'최근 대화':'최근 추가한 봇');empty($('.catalog-list'),'목록을 불러오는 중…');if(!d.open)d.showModal();
  try{const model=await fullCatalog.refresh({...state.prefs,limit:24,kind});if(state.closed||serial!==state.catalogSerial||!d.open)return;const rows=model.status==='ready'?model[kind]||[]:[];
   if(!rows.length){empty($('.catalog-list'),model.status==='permission'?'데이터 읽기 권한을 허용해 주세요.':'표시할 항목이 없어요.');return;}
   $('.catalog-list').replaceChildren(...rows.map(row=>{const b=document.createElement('button');b.className='chat-row';b.append(avatar(row));const info=document.createElement('span');info.className='row-info';const name=document.createElement('strong');name.textContent=row.name;const desc=document.createElement('small');desc.textContent=kind==='recent'?(row.preview||row.chatName||'메시지 미리보기'):'봇 정보 미리보기';info.append(name,desc);b.append(info);b.onclick=()=>{d.close();void detail(row);};return b;}));
  }catch(error){if(!state.closed&&serial===state.catalogSerial&&d.open)empty($('.catalog-list'),error.message||'목록을 읽지 못했어요.');}
 }
 function currentHidden(){return layoutEditor?.editing?layoutEditor.draftHidden:state.prefs.hiddenWidgets;}
 function syncVisibility(){wallpaperViewport.sync();music.setVisible(state.visible&&!document.hidden&&!currentHidden().includes('music'));startClock();syncBackgroundPolling();}
 function syncBackgroundPolling(){
  themeFollower?.syncPolling();const active=state.visible&&!state.closed&&!document.hidden&&!(currentHidden().includes('recent')&&currentHidden().includes('added'));
  if(!active){if(state.catalogTimer!==null)clearInterval(state.catalogTimer);state.catalogTimer=null;}
  else if(state.catalogTimer===null)state.catalogTimer=setInterval(refreshVisibleCatalog,30000);
 }
 function openTools(){if(layoutEditor.editing){toast('배치를 저장하거나 취소한 뒤 설정을 열어주세요.');return;}if(!$('.tools-dialog').open)$('.tools-dialog').showModal();}
 function renderLibrary(){const d=$('.library-dialog');if(!d.open||!layoutEditor)return;const model=Layout,hidden=layoutEditor.draftHidden;$('.library-list').replaceChildren(...model.IDS.map(id=>{const row=document.createElement('div');row.className='library-row';const info=document.createElement('div'),name=document.createElement('strong'),status=document.createElement('span');name.textContent=model.LABELS[id];status.textContent=hidden.includes(id)?'보관 중':'홈에서 사용 중';info.append(name,status);const button=document.createElement('button');button.textContent=hidden.includes(id)?'다시 추가':'보관';button.setAttribute('aria-label',model.LABELS[id]+' '+button.textContent);button.onclick=()=>layoutEditor.archive(id,!layoutEditor.draftHidden.includes(id));row.append(info,button);return row;}));text('.library-count',`사용 중 ${model.IDS.length-hidden.length}개 · 보관 중 ${hidden.length}개`);}
 function openLibrary(){if(layoutEditor.saving)return;if(!layoutEditor.editing)layoutEditor.start();if(!$('.library-dialog').open)$('.library-dialog').showModal();renderLibrary();}
 $('.tools-open').onclick=openTools;$('.tools-close').onclick=()=>$('.tools-dialog').close();$('.library-toolbar').onclick=$('.library-customize').onclick=$('.library-empty').onclick=openLibrary;$('.library-close').onclick=()=>$('.library-dialog').close();$('.library-cancel').onclick=()=>{if(layoutEditor.saving)return;layoutEditor.cancel();$('.library-dialog').close();};$('.library-save').onclick=async()=>{const button=$('.library-save');button.disabled=true;$('.library-cancel').disabled=true;try{await layoutEditor.save();if(!layoutEditor.editing){$('.library-dialog').close();toast('위젯 구성을 저장했어요.');}}finally{button.disabled=false;$('.library-cancel').disabled=false;}};$('.surface-style').onchange=()=>{$('.app').dataset.surface=$('.surface-style').value==='glass'?'glass':'navy';};
 function fillSettings(value){renderColorPresets();cached('.follow-theme').checked=value.followTheme;fillColors(value.colors);cached('.block-color-settings').disabled=value.followTheme;syncPresetControls();$('.surface-style').value=value.surface;$('.title-input').value=value.title;$('.subtitle-input').value=value.subtitle;$('.auto-input').checked=value.autoHome;$('.legacy-input').checked=value.includeLegacy;for(const input of sr.querySelectorAll('input[name="clock-style"]'))input.checked=input.value===value.clock;for(const input of sr.querySelectorAll('input[name="photo-shape"]'))input.checked=input.value===value.photoShape;}
 function openSettings(){if(layoutEditor.editing){toast('배치를 저장하거나 취소한 뒤 홈 꾸미기를 열어주세요.');return;}fillSettings(state.prefs);if(!$('.settings-dialog').open)$('.settings-dialog').showModal();}
 $('.settings-open').onclick=$('.title-edit').onclick=openSettings;$('.settings-close').onclick=()=>$('.settings-dialog').close();
 $('.design-reset').onclick=()=>{cancelColorPreview();fillSettings({...C.DEFAULTS,autoHome:state.prefs.autoHome,includeLegacy:state.prefs.includeLegacy});applyColors(C.BLOCK_DEFAULTS);$('.app').dataset.surface='navy';};
 $('.settings-save').onclick=async()=>{const button=$('.settings-save');button.disabled=true;const value=C.settings({...state.prefs,title:$('.title-input').value,subtitle:$('.subtitle-input').value,clock:sr.querySelector('input[name="clock-style"]:checked')?.value||state.prefs.clock,photoShape:sr.querySelector('input[name="photo-shape"]:checked')?.value||state.prefs.photoShape,autoHome:$('.auto-input').checked,includeLegacy:$('.legacy-input').checked,colors:draftColors(),layouts:state.prefs.layouts,surface:$('.surface-style').value,followTheme:cached('.follow-theme').checked});const before=state.prefs;try{await store.set('settings',value);state.prefs=value;applyDesign();$('.settings-dialog').close();if(before.autoHome!==value.autoHome)await auto.configure(value.autoHome);toast('홈 꾸미기를 저장했어요.');if(before.includeLegacy!==value.includeLegacy)await reloadCatalog();}catch(error){toast(error.message||'설정을 저장하지 못했어요.');}finally{button.disabled=false;}};
 cached('.follow-theme').onchange=()=>{cached('.block-color-settings').disabled=cached('.follow-theme').checked;syncPresetControls();themeFollower.syncPolling();applyColors(draftColors());if(cached('.follow-theme').checked)void themeFollower.refresh();};
 for(const key of Object.keys(C.BLOCK_LABELS))$('.block-color-'+key).oninput=()=>queueColors(draftColors());
 $('.block-color-all').oninput=event=>{const value=C.color(event.target.value);const colors=Object.fromEntries(Object.keys(C.BLOCK_LABELS).map(key=>[key,value]));fillColors(colors);queueColors(colors);};
 const preset=colors=>{cached('.follow-theme').checked=false;cached('.block-color-settings').disabled=false;const value=C.blockColors(colors);fillColors(value);queueColors(value);syncPresetControls();themeFollower.syncPolling();};
 function syncPresetControls(){
  const blocked=!state.presetsReady||state.presetsBusy,selected=state.colorPresets.some(p=>p.id===$('.custom-preset-select').value),following=cached('.follow-theme').checked;
  $('.custom-preset-select').disabled=blocked;$('.custom-preset-name').disabled=blocked;
  $('.custom-preset-save').disabled=blocked||following;
  $('.custom-preset-update').disabled=blocked||!selected||following;
  $('.custom-preset-load').disabled=$('.custom-preset-delete').disabled=$('.custom-preset-rename').disabled=$('.custom-preset-rename-input').disabled=blocked||!selected;
 }
 let presetPreviewItem;
 function previewColorPreset(){
  const item=state.colorPresets.find(p=>p.id===$('.custom-preset-select').value),preview=$('.custom-preset-preview');if(item===presetPreviewItem&&preview.childNodes.length)return;presetPreviewItem=item;preview.replaceChildren();
  $('.custom-preset-rename-input').value=item?item.name:'';
  if(!item){const hint=document.createElement('p');hint.className='subtle';hint.textContent='저장한 조합을 선택하면 색상을 미리 볼 수 있어요.';preview.append(hint);return;}
  for(const [key,label]of Object.entries(C.BLOCK_LABELS)){
   const chip=document.createElement('div'),swatch=document.createElement('i'),info=document.createElement('div'),name=document.createElement('strong'),hex=document.createElement('small');
   chip.className='custom-preset-chip';swatch.style.backgroundColor=item.colors[key];swatch.setAttribute('aria-hidden','true');name.textContent=label;hex.textContent=item.colors[key].toUpperCase();info.append(name,hex);chip.append(swatch,info);preview.append(chip);
  }
 }
 function renderColorPresets(selected=$('.custom-preset-select').value){
  const select=$('.custom-preset-select');select.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=state.colorPresets.length?'저장한 조합을 선택하세요':'저장한 프리셋이 없어요';select.append(placeholder);
  for(const item of state.colorPresets){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option);}
  select.value=state.colorPresets.some(p=>p.id===selected)?selected:'';syncPresetControls();previewColorPreset();
  text('.custom-preset-status',!state.presetsReady?'프리셋을 읽지 못했거나 불러오는 중이에요. 홈을 다시 열어주세요.':`저장한 조합 ${state.colorPresets.length}개 · 색상 저장은 UI 색상 따라가기를 끈 뒤 사용할 수 있어요.`);
 }
 async function changeColorPresets(action){
  if(!state.presetsReady||state.presetsBusy)return;
  const selected=$('.custom-preset-select').value,item=state.colorPresets.find(p=>p.id===selected);
  let next=state.colorPresets,selection=selected,message='';
  if(action==='save'){
   if(cached('.follow-theme').checked)return;
   const name=C.normalize($('.custom-preset-name').value).slice(0,40);
   if(!name){toast('프리셋 이름을 입력해 주세요.');$('.custom-preset-name').focus();return;}
   if(next.some(p=>p.name===name)){toast('같은 이름이 있어요. 다른 이름을 쓰거나 해당 항목을 선택해 덮어쓰세요.');return;}
   if(next.length>=100){toast('프리셋은 최대 100개까지 저장할 수 있어요.');return;}
   selection=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
   next=[...next,{id:selection,name,colors:draftColors()}];message='현재 색상을 프리셋으로 저장했어요.';
  }else if(action==='rename'){
   if(!item)return;
   const name=C.normalize($('.custom-preset-rename-input').value).slice(0,40);
   if(!name){toast('변경할 이름을 입력해 주세요.');$('.custom-preset-rename-input').focus();return;}
   if(next.some(p=>p.id!==selected&&p.name===name)){toast('같은 이름의 프리셋이 있어요. 다른 이름을 입력해 주세요.');return;}
   if(name===item.name){toast('현재 이름과 같아요.');return;}
   next=next.map(p=>p.id===selected?{...p,name}:p);message='프리셋 이름을 변경했어요.';
  }else if(action==='update'){
   if(!item||cached('.follow-theme').checked)return;
   next=next.map(p=>p.id===selected?{...p,colors:draftColors()}:p);message='선택한 프리셋을 현재 색상으로 덮어썼어요.';
  }else if(action==='delete'){
   if(!item)return;next=next.filter(p=>p.id!==selected);selection='';message='선택한 프리셋을 삭제했어요.';
  }else return;
  state.presetsBusy=true;syncPresetControls();
  try{await store.set('color-presets',next);state.colorPresets=next;if(action==='save')$('.custom-preset-name').value='';toast(message);}
  catch{toast('프리셋을 저장하지 못했어요. 다시 시도해 주세요.');selection=selected;}
  finally{state.presetsBusy=false;renderColorPresets(selection);}
 }
 $('.custom-preset-select').onchange=()=>{syncPresetControls();previewColorPreset();};
 $('.custom-preset-rename').onclick=()=>changeColorPresets('rename');
 $('.custom-preset-save').onclick=()=>changeColorPresets('save');
 $('.custom-preset-update').onclick=()=>changeColorPresets('update');
 $('.custom-preset-delete').onclick=()=>changeColorPresets('delete');
 $('.custom-preset-load').onclick=()=>{const item=state.colorPresets.find(p=>p.id===$('.custom-preset-select').value);if(!item||state.presetsBusy)return;preset(item.colors);toast('색상을 불러왔어요. 아래 적용을 눌러 홈에 저장하세요.');};
 $('.settings-dialog').addEventListener('close',()=>{cancelColorPreview();cached('.block-color-settings').disabled=state.prefs.followTheme;applyColors(state.prefs.colors);themeFollower.syncPolling();$('.app').dataset.surface=state.prefs.surface;});
 $('.calendar-prev').onclick=()=>{state.calendarOffset=Math.max(-120,state.calendarOffset-1);clock();};$('.calendar-next').onclick=()=>{state.calendarOffset=Math.min(120,state.calendarOffset+1);clock();};$('.calendar-today').onclick=()=>{state.calendarOffset=0;clock();};
 function paintEditor(){if(!state.editor)return;const p=state.editor.position;transformImage($('.edit-image'),p);}
 function openEditor(kind,record=state[kind]){if(!C.safeImage(record?.data)){$(kind==='background'?'.background-file':'.photo-file').click();return;}state.editor={kind,record:{...record},position:D.photoSettings(record.position)};text('#photo-editor-title',kind==='background'?'배경 사진 꾸미기':'내 사진 꾸미기');text('.editor-remove',kind==='background'?'기본 배경으로':'사진 삭제');$('.edit-image').src=record.data;const box=$('.photo-card').getBoundingClientRect();$('.edit-preview').style.aspectRatio=kind==='background'?'1.55':box.width>0&&box.height>0?String(box.width/box.height):state.prefs.photoShape==='square'?'1':'1.65';for(const key of ['x','y','scale'])$('.edit-'+key).value=state.editor.position[key];paintEditor();if(!$('.photo-editor').open)$('.photo-editor').showModal();}
 $('.photo-select').onclick=$('.photo-hit').onclick=()=>openEditor('photo');$('.background-change').onclick=()=>{if($('.settings-dialog').open)$('.settings-dialog').close();openEditor('background');};
 for(const kind of ['photo','background'])$(kind==='photo'?'.photo-file':'.background-file').onchange=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file||state.photoBusy)return;state.photoBusy=true;try{const record=await photoData(file);if(!state.closed)openEditor(kind,{...record,position:D.photoSettings(null)});}catch(error){toast(error.message||'사진을 열지 못했어요.');}finally{state.photoBusy=false;}};
 for(const key of ['x','y','scale'])$('.edit-'+key).oninput=event=>{if(state.editor){state.editor.position[key]=Number(event.target.value);paintEditor();}};
 const cancelEditor=()=>{$('.photo-editor').close();state.editor=null;};$('.editor-close').onclick=$('.editor-cancel').onclick=cancelEditor;
 $('.photo-editor').addEventListener('close',()=>{state.editor=null;});
 $('.editor-replace').onclick=()=>{if(state.editor)$(state.editor.kind==='background'?'.background-file':'.photo-file').click();};
 $('.editor-save').onclick=async()=>{const draft=state.editor;if(!draft||state.photoBusy)return;state.photoBusy=true;try{const record={...draft.record,position:D.photoSettings(draft.position),updatedAt:Date.now()};await store.set(draft.kind,record);if(!state.closed){applyPhoto(record,draft.kind);cancelEditor();toast('사진을 저장했어요.');}}catch(error){toast('저장하지 못했어요. 이전 사진은 유지돼요.');}finally{state.photoBusy=false;}};
 $('.editor-remove').onclick=async()=>{const draft=state.editor;if(!draft||state.photoBusy)return;state.photoBusy=true;try{await store.remove(draft.kind);applyPhoto(null,draft.kind);cancelEditor();}catch{toast('사진을 삭제하지 못했어요.');}finally{state.photoBusy=false;}};
 $('.memo').oninput=dirtyMemo;$('.memo').onblur=saveMemo;
 function memoMode(tasks){void saveMemo();$('.memo').hidden=tasks;$('.tasks-panel').hidden=!tasks;$('.memo-tab').setAttribute('aria-pressed',String(!tasks));$('.tasks-tab').setAttribute('aria-pressed',String(tasks));}
 $('.memo-tab').onclick=()=>memoMode(false);$('.tasks-tab').onclick=()=>memoMode(true);
 function addTask(){const value=$('.task-input').value.trim();if(!state.memoReady||!value)return saveMemo();if(state.tasks.length>=100){toast('할 일은 최대 100개까지 보관할 수 있어요.');return Promise.resolve(false);}state.tasks.push({id:'task-'+Date.now()+'-'+Math.random().toString(36).slice(2),text:value.slice(0,200),done:false});$('.task-input').value='';renderTasks();dirtyMemo();return saveMemo();}
 $('.task-add').onclick=addTask;
 $('.task-input').oninput=dirtyMemo;$('.task-input').onblur=saveMemo;
 $('.task-input').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();return addTask();}};
 $('.memo-save').onclick=()=>!$('.tasks-panel').hidden&&$('.task-input').value.trim()?addTask():saveMemo();
 $('.return').onclick=$('.detail-return').onclick=()=>close();$('.detail-close').onclick=()=>{state.detailSerial++;$('.detail-dialog').close();};
 $('.dock-home').onclick=()=>document.documentElement.scrollTo({top:0,behavior:'smooth'});$('.dock-recent').onclick=$('.all-recent').onclick=$('.catalog-recent').onclick=()=>showCatalog('recent');$('.more-uploads').onclick=$('.catalog-added').onclick=()=>showCatalog('added');$('.dock-settings').onclick=openSettings;$('.dock-music').onclick=()=>$('.music-playlist').click();
 $('.catalog-close').onclick=()=>{state.catalogSerial++;$('.catalog-dialog').close();};$('.catalog-native').onclick=()=>close();
 $('.shortcut-photo').onclick=()=>{$('.tools-dialog').close();openEditor('photo');};$('.shortcut-background').onclick=()=>{$('.tools-dialog').close();openEditor('background');};$('.shortcut-refresh').onclick=()=>{$('.tools-dialog').close();if(shortcutRefreshTask)return shortcutRefreshTask;if(layoutEditor.editing){toast('배치를 저장하거나 취소한 뒤 목록을 새로고침해 주세요.');return;}const button=cached('.shortcut-refresh');button.disabled=true;button.setAttribute('aria-busy','true');shortcutRefreshTask=reloadCatalog({force:true}).then(()=>{if(!state.closed&&state.visible)toast('최근 목록을 새로고침했어요.');}).finally(()=>{shortcutRefreshTask=null;if(!state.closed){button.disabled=false;button.setAttribute('aria-busy','false');}});return shortcutRefreshTask;};
 for(const key of ['github','feedback','arca'])cached('.link-'+key).onclick=async()=>{if(globalThis.POCKETRISU_BASIC_PREVIEW){toast('설치 후 기존 홈의 실제 링크 버튼으로 연결돼요.');return;}await close();};
 const emailAddress='contact@pocketrisu.com';
 function selectEmail(){const input=$('.email-address');input.focus();input.select();input.setSelectionRange?.(0,input.value.length);}
 $('.link-email').onclick=()=>{const dialog=$('.email-dialog');$('.email-address').value=emailAddress;text('.email-status','메일 앱이 열리지 않으면 주소를 복사해 사용 중인 메일에서 작성해 주세요.');if(!dialog.open)dialog.showModal();nativeControls.invalidate();};
 $('.email-close').onclick=()=>$('.email-dialog').close();
 $('.email-dialog').addEventListener('close',()=>nativeControls.request());
 $('.email-address').onclick=selectEmail;
 $('.email-copy').onclick=async()=>{
   let copied=false;
   try{selectEmail();copied=document.execCommand?.('copy')===true;}catch{}
   if(!copied)try{if(globalThis.navigator?.clipboard?.writeText){await globalThis.navigator.clipboard.writeText(emailAddress);copied=true;}}catch{}
   if(!$('.email-dialog').open||state.closed)return;
   if(copied)text('.email-status','이메일 주소를 복사했어요.');
   else{selectEmail();text('.email-status','주소를 선택했어요. Ctrl+C 또는 길게 눌러 복사해 주세요.');}
 };
 $('.email-open').onclick=()=>text('.email-status','이 환경에서는 메일 앱을 직접 열 수 없어요. 주소 복사를 이용해 주세요.');
 music.setVisible(false);
 const onVisibility=()=>{syncVisibility();if(document.hidden)void saveMemo();if(!document.hidden){if(state.visible&&followsTheme())void themeFollower.refresh();refreshVisibleCatalog();auto?.schedule();void layout.invalidate();}};document.addEventListener('visibilitychange',onVisibility);
 $('.preview-banner').hidden=!globalThis.POCKETRISU_BASIC_PREVIEW;applyDesign();
 auto=new A.AutoHome(api,{onOpen:allow=>open(false,{automatic:true,allow}),onLeave:()=>close({automatic:true}),onRouteAway:()=>layout.clearNativeScroll(),isVisible:()=>state.visible,isOpening:()=>state.opening,onStatus:message=>text('.auto-status',message),onError:recordError,isPageHidden:()=>document.hidden,isInlineActive:()=>layout.active,onActivity:()=>{nativeControls.invalidate();layout.requestSync();}});
 const mark='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
 let unreg=null,disposed=false;
 if(hostOpts.button!==false){try{unreg=await api.registerButton({name:'위젯 홈',icon:mark,iconType:'html',location:'hamburger',id:'dusk-widgethome-open'},()=>open());}catch(error){hostOpts.log?.('위젯 홈 메뉴 버튼 등록 실패 '+(error?.message||error));}}
 async function showBox(){hostOpts.beforeShow?.();hostEl.hidden=false;await api.showContainer('fullscreen');}
 async function hideBox(){hostEl.hidden=true;await api.hideContainer();}
 async function dispose(){
  if(disposed)return;disposed=true;
  const wasVisible=state.visible;state.closed=true;state.visible=false;const pendingMemo=saveMemo();
  themeFollower.dispose();clearInterval(state.catalogTimer);cancelColorPreview();wallpaperViewport.dispose();layoutEditor.dispose();
  document.removeEventListener('visibilitychange',onVisibility);state.detailSerial++;
  try{await auto.dispose();}catch{}try{await layout.dispose();}catch{}try{await nativeControls.dispose();}catch{}
  clearTimeout(state.clockTimer);clearTimeout(state.memoTimer);clearTimeout(state.toastTimer);detachMusic();music.destroy();thumbs.dispose();renderedLists.clear();catalog.clear();fullCatalog.clear();
  try{await pendingMemo;}catch{}
  if(wasVisible&&!hostOpts.isOtherOpen?.()){try{await api.hideContainer();}catch{}}
  hostEl.remove();
  if(unreg!=null){try{await api.unregisterUIPart(unreg?.id??unreg);}catch{}}
 }
 try{state.prefs=C.settings(await store.get('settings'));applyDesign();}catch{}
 if(!state.closed)void themeFollower.start().catch(()=>{});
 if(!state.closed)syncBackgroundPolling();
 if(!state.closed)void restore().then(()=>reloadCatalog({background:true})).catch(()=>{});   // 열기 전에 미리 읽어 두어 바로 뜨게
 if(!state.closed)void auto.configure(!globalThis.POCKETRISU_BASIC_PREVIEW&&state.prefs.autoHome);
 return{open:(...a)=>open(...a),close:(...a)=>close(...a),dispose,isVisible:()=>state.visible,isOpening:()=>state.opening,autoStatus:()=>sr.querySelector('.auto-status')?.textContent||'',hostEl,sr};
}
