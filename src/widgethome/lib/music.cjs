/* Official plugin storage; one audio player survives home/chat navigation. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./music-store.cjs'):root.PocketRisuButterMusicStore;
  const shapes={
    play:'m8 4 12 8-12 8z',pause:'M8 4v16 M16 4v16',
    previous:'M5 5v14 M19 5l-11 7 11 7z',next:'M19 5v14 M5 5l11 7-11 7z',
    note:'M9 18V5l12-3v13 M9 8l12-3 M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3 M21 15a3 3 0 1 1-3-3c2 0 3 1 3 3',
    add:'M12 5v14 M5 12h14',remove:'m7 7 10 10 M17 7 7 17',
    repeat:'m17 2 4 4-4 4 M3 11V8a2 2 0 0 1 2-2h16 M7 22l-4-4 4-4 M21 13v3a2 2 0 0 1-2 2H3',
    volume:'M3 9h4l5-4v14l-5-4H3z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
    mute:'M3 9h4l5-4v14l-5-4H3z M16 9l6 6 M22 9l-6 6'
  };
  const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${shapes[name]||shapes.note}"/></svg>`;
  const messages={
    quota:'음악을 저장하지 못했어요. 플러그인 저장 공간과 연결 상태를 확인해 주세요.',
    unsupported:'이 음악을 재생하지 못했어요. 다른 MP3 파일을 선택해 주세요.',
    blocked:'브라우저에서 재생을 막았어요. 재생 버튼을 다시 눌러 주세요.'
  };
  let idSerial=0;
  function identifier(){
    if(root.crypto?.randomUUID)return root.crypto.randomUUID();
    if(root.crypto?.getRandomValues){const bytes=new Uint32Array(3);root.crypto.getRandomValues(bytes);return `music-${Array.from(bytes).join('-')}`;}
    return `music-${Date.now()}-${++idSerial}-${Math.random().toString(36).slice(2)}`;
  }
  class Player{
    constructor(options={},dependencies={}){
      this.store=dependencies.store||new M.Store();
      this.audio=dependencies.audio||new root.Audio();
      this.urls=dependencies.urls||root.URL;
      this.media=dependencies.media===undefined?root.navigator?.mediaSession:dependencies.media;
      this.Metadata=dependencies.Metadata||root.MediaMetadata;
      this.notify=options.notify||(()=>{});
      this.tracks=[];this.currentId='';this.repeat='all';this.views=new Set();this.url='';
      this.status='음악 목록을 불러오는 중이에요.';this.loaded=false;this.importing=false;this.destroyed=false;
      this.pendingSeek=0;this.selection=0;this.lastSaved=0;this.saveChain=Promise.resolve();
      this.uiVisible=true;this.renderedSecond=-1;this.pendingPrefs=null;this.savingPrefs=false;
      this.audio.preload='metadata';this.listeners=[];this.metadata=null;this.queueVersion=0;
      const on=(type,fn)=>{this.audio.addEventListener(type,fn);this.listeners.push([type,fn]);};
      on('loadedmetadata',()=>{
        if(this.pendingSeek>0&&Number.isFinite(this.audio.duration)){
          try{this.audio.currentTime=Math.min(this.pendingSeek,Math.max(0,this.audio.duration-.05));}catch{}
        }
        this.pendingSeek=0;this.render();
      });
      on('timeupdate',()=>{const second=Math.floor(M.seconds(this.audio.currentTime));if(this.uiVisible&&!root.document?.hidden&&second!==this.renderedSecond){this.renderedSecond=second;this.render(false,true);}if(Date.now()-this.lastSaved>15000){this.persist();this.updateMedia();}});
      on('durationchange',()=>this.render());
      on('play',()=>{this.status='';this.claimMedia();this.render();});
      on('pause',()=>{this.updateMedia();this.persist();this.render();});
      on('ended',()=>this.next(true));
      on('error',()=>{if(this.currentId){this.status=messages.unsupported;this.render();}});
      on('volumechange',()=>{this.render();if(this.loaded)this.persist();});
      this.ready=this.initialize();
    }
    get current(){return this.tracks.find(t=>t.id===this.currentId)||null;}
    async initialize(){
      try{
        const [tracks,saved]=await Promise.all([this.store.all(),this.store.getPreferences()]);
        if(this.destroyed)return;
        this.tracks=(Array.isArray(tracks)?tracks:[]).filter(t=>t?.id&&t.blob instanceof Blob)
          .sort((a,b)=>(a.order||0)-(b.order||0)||(a.addedAt||0)-(b.addedAt||0));
        const prefs=M.preferences(saved||{});this.repeat=prefs.repeat;
        this.audio.volume=prefs.volume;this.audio.muted=prefs.muted;
        this.loaded=true;
        const first=this.tracks.find(t=>t.id===prefs.currentId)||this.tracks[0];
        if(first)this.select(first.id,false,first.id===prefs.currentId?prefs.position:0);
        this.status=this.tracks.length?'재생 버튼을 눌러 시작해 주세요.':'MP3 같은 음악 파일을 추가해 주세요.';
      }catch{
        if(this.destroyed)return;
        this.loaded=true;this.status='음악 저장소를 열지 못했어요. 파일 추가로 다시 시도할 수 있어요.';
      }
      this.render(true);
    }
    render(structural=false,timeOnly=false){
      if(this.destroyed)return;
      if(this.uiVisible&&!root.document?.hidden)for(const view of this.views){if(timeOnly)view.updateTime();else view.update(structural);}
      this.updateMedia();
    }
    setVisible(value){const changed=this.uiVisible!==Boolean(value);this.uiVisible=Boolean(value);if(changed&&this.uiVisible)this.render(true);}
    report(message){this.status=message;this.notify(message);this.render();}
    persist(){
      if(!this.loaded||this.destroyed)return;
      const value=M.preferences({currentId:this.currentId,position:this.pendingSeek||this.audio.currentTime,
        volume:this.audio.volume,muted:this.audio.muted,repeat:this.repeat});
      this.lastSaved=Date.now();
      this.pendingPrefs=value;
      if(this.savingPrefs)return this.saveChain;
      this.savingPrefs=true;
      this.saveChain=this.saveChain.catch(()=>{}).then(async()=>{
        try{while(this.pendingPrefs){const next=this.pendingPrefs;this.pendingPrefs=null;const signature=JSON.stringify(next);if(signature===this.savedPrefsSignature)continue;try{await this.store.putPreferences(next);this.savedPrefsSignature=signature;}catch{if(!this.destroyed){this.status='재생 설정을 저장하지 못했어요.';this.render();}}}}
        finally{this.savingPrefs=false;}
      });
      return this.saveChain;
    }

    select(id,autoplay=true,position=0){
      const track=this.tracks.find(t=>t.id===id);if(!track||this.destroyed)return Promise.resolve(false);
      ++this.selection;
      this.audio.pause();
      const old=this.url;
      this.audio.removeAttribute('src');
      this.currentId=id;this.pendingSeek=M.seconds(position);this.status='';
      this.url=this.urls.createObjectURL(track.blob);this.audio.src=this.url;this.audio.load();
      if(old)this.urls.revokeObjectURL(old);
      this.persist();this.render(true);
      if(autoplay)return this.play();
      return Promise.resolve(true);
    }
    async play(){
      if(this.destroyed||!this.current)return false;
      const token=this.selection;
      try{
        if(this.audio.ended||(Number.isFinite(this.audio.duration)&&this.audio.currentTime>=this.audio.duration-.05))this.audio.currentTime=0;
        await this.audio.play();
        return token===this.selection&&!this.destroyed;
      }catch(error){
        if(token!==this.selection||this.destroyed||error?.name==='AbortError')return false;
        this.report(error?.name==='NotAllowedError'?messages.blocked:messages.unsupported);return false;
      }
    }
    toggle(){
      if(!this.current){if(this.tracks.length)return this.select(this.tracks[0].id);return;}
      if(this.audio.paused)return this.play();this.audio.pause();
    }
    next(automatic=false){
      if(!this.tracks.length||this.destroyed)return;
      const index=this.tracks.findIndex(t=>t.id===this.currentId);
      const next=M.nextIndex(index,this.tracks.length,this.repeat,automatic);
      if(next<0){this.audio.pause();this.persist();this.render();return;}
      return this.select(this.tracks[next].id,true);
    }
    previous(){
      if(!this.tracks.length||this.destroyed)return;
      if(this.audio.currentTime>3){this.seek(0);return;}
      const index=this.tracks.findIndex(t=>t.id===this.currentId);
      return this.select(this.tracks[(index-1+this.tracks.length)%this.tracks.length].id,true);
    }
    seek(value){
      const duration=this.audio.duration;
      if(!this.current||!Number.isFinite(duration)||duration<=0)return;
      try{this.audio.currentTime=Math.max(0,Math.min(duration,M.seconds(value)));this.pendingSeek=0;this.persist();this.render();}catch{}
    }
    volume(value){this.audio.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.audio.volume>0)this.audio.muted=false;this.persist();this.render();}
    mute(){this.audio.muted=!this.audio.muted;this.persist();this.render();}
    cycleRepeat(){this.repeat={off:'all',all:'one',one:'off'}[this.repeat]||'all';this.persist();this.render();}
    async addFiles(files){
      if(this.importing||this.destroyed)return;
      this.importing=true;this.render();
      let added=0,duplicates=0,rejected=0,storageError=false;
      const candidates=Array.from(files||[]);
      try{
        await this.ready;
        for(const file of candidates){
          if(this.destroyed)break;
          if(M.fileError(file)){rejected++;continue;}
          const key=M.fingerprint(file);
          if(this.tracks.some(t=>t.fingerprint===key)){duplicates++;continue;}
          if(this.tracks.length>=M.MAX_TRACKS){rejected++;continue;}
          const track={id:identifier(),name:file.name,title:M.title(file.name),fingerprint:key,
            type:file.type,size:file.size,lastModified:Number(file.lastModified)||0,
            addedAt:Date.now(),order:this.tracks.reduce((max,t)=>Math.max(max,t.order||0),0)+1,blob:file};
          try{await this.store.put(track);}catch{storageError=true;break;}
          if(this.destroyed)break;
          this.tracks.push(track);added++;this.queueVersion++;
          if(!this.current)this.select(track.id,false);
          this.status=`음악 추가 중… ${added}곡`;this.render(true);
        }
        if(!this.destroyed){
          if(storageError)this.report(`${added?added+'곡은 저장했어요. ':''}${messages.quota}`);
          else this.report(`${added}곡 추가${duplicates?' · 중복 '+duplicates+'곡 제외':''}${rejected?' · 형식·크기 제한으로 '+rejected+'곡 제외':''}.`);
          if(added)this.persist();
        }
      }finally{this.importing=false;this.render(true);}
    }
    async remove(id){
      const index=this.tracks.findIndex(t=>t.id===id);if(index<0||this.destroyed)return;
      try{await this.store.remove(id);}catch{this.report('곡을 삭제하지 못했어요. 다시 시도해 주세요.');return;}
      if(this.destroyed)return;
      const current=this.currentId===id,playing=!this.audio.paused;
      this.tracks=this.tracks.filter(t=>t.id!==id);this.queueVersion++;
      if(current){
        if(this.tracks.length)this.select(this.tracks[Math.min(index,this.tracks.length-1)].id,playing);
        else this.clearSource();
      }
      this.persist();this.render(true);
    }
    clearSource(){
      ++this.selection;this.currentId='';this.pendingSeek=0;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();
      if(this.url)this.urls.revokeObjectURL(this.url);this.url='';this.status='MP3 같은 음악 파일을 추가해 주세요.';
      this.releaseMedia();
    }
    claimMedia(){
      if(!this.media||!this.current)return;
      this.mediaState=null;this.mediaPosition=null;
      try{
        if(this.Metadata){this.metadata=new this.Metadata({title:this.current.title,artist:'PocketRisu · 내 음악'});this.media.metadata=this.metadata;}
        const handlers={play:()=>this.play(),pause:()=>this.audio.pause(),previoustrack:()=>this.previous(),nexttrack:()=>this.next(),
          seekto:event=>this.seek(event.seekTime),seekbackward:event=>this.seek(this.audio.currentTime-(event.seekOffset||10)),seekforward:event=>this.seek(this.audio.currentTime+(event.seekOffset||10))};
        for(const [action,handler]of Object.entries(handlers)){try{this.media.setActionHandler(action,handler);}catch{}}
        this.updateMedia();
      }catch{}
    }
    updateMedia(){
      if(!this.media||!this.metadata||this.media.metadata!==this.metadata)return;
      try{
        const state=this.audio.paused?'paused':'playing';
        if(state!==this.mediaState){this.media.playbackState=state;this.mediaState=state;}
        if(Number.isFinite(this.audio.duration)&&this.audio.duration>0&&typeof this.media.setPositionState==='function'){
          const value={duration:this.audio.duration,playbackRate:this.audio.playbackRate||1,position:Math.min(this.audio.duration,M.seconds(this.audio.currentTime))};
          const old=this.mediaPosition;
          if(!old||old.duration!==value.duration||old.playbackRate!==value.playbackRate||old.position!==value.position){this.media.setPositionState(value);this.mediaPosition=value;}
        }
      }catch{}
    }
    releaseMedia(){
      if(!this.media||!this.metadata||this.media.metadata!==this.metadata)return;
      try{for(const action of ['play','pause','previoustrack','nexttrack','seekto','seekbackward','seekforward'])this.media.setActionHandler(action,null);
        this.media.metadata=null;this.media.playbackState='none';}catch{}
      this.metadata=null;
    }
    attach(container){
      const view=new View(this,container);this.views.add(view);view.update(true);
      return ()=>{this.views.delete(view);view.destroy();};
    }
    destroy(){
      if(this.destroyed)return;
      this.persist();this.destroyed=true;++this.selection;
      for(const [type,listener]of this.listeners)this.audio.removeEventListener(type,listener);
      this.audio.pause();this.audio.removeAttribute('src');this.audio.load();
      if(this.url)this.urls.revokeObjectURL(this.url);this.url='';
      this.releaseMedia();for(const view of this.views)view.destroy();this.views.clear();
      this.saveChain.finally(()=>this.store.close()).catch(()=>{});
    }
  }
  class View{
    constructor(player,container){
      this.player=player;this.container=container;this.rows=new Map();this.seeking=false;this.last={};
      container.innerHTML=`<section class="card music-card" aria-label="내 음악 플레이어">
      <div class="music-head"><h2>${svg('note')}내 음악</h2><button class="music-add" type="button">${svg('add')}파일 추가</button></div>
      <div class="music-now"><span class="music-disc">${svg('note')}</span><div><strong class="music-title">음악을 추가해 주세요</strong><span class="music-caption">내 플레이리스트</span></div></div>
      <div class="music-controls"><button class="music-prev" aria-label="이전 곡">${svg('previous')}</button><button class="music-play" aria-label="재생">${svg('play')}</button><button class="music-next" aria-label="다음 곡">${svg('next')}</button><button class="music-repeat" aria-label="전체 반복" title="전체 반복">${svg('repeat')}<span></span></button></div>
      <div class="music-timeline"><span class="music-elapsed">0:00</span><input class="music-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="음악 재생 위치"><span class="music-duration">0:00</span></div>
      <div class="music-volume-row"><button class="music-mute" aria-label="음소거">${svg('volume')}</button><input class="music-volume" type="range" min="0" max="1" step=".01" value="1" aria-label="음악 음량"></div>
      <button class="music-playlist" type="button" aria-haspopup="dialog">트랙 목록 <span class="music-count">0곡</span></button>
      <p class="music-status" role="status" aria-live="polite"></p>
      <input class="music-file" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm" multiple hidden></section>
      <dialog class="music-library" aria-label="플레이리스트"><div class="music-library-head"><h2>플레이리스트 <span class="music-library-count"></span></h2><button class="music-library-close" type="button" aria-label="플레이리스트 닫기">${svg('remove')}</button></div>
      <ol></ol><p class="music-empty">파일을 추가하면 여기에 트랙이 표시돼요.</p><div class="music-library-actions"><button class="music-library-add">${svg('add')}파일 추가</button><button class="music-library-play">${svg('play')}재생 / 일시정지</button></div></dialog>`;
      this.nodes=new Map();this.q=selector=>{if(!this.nodes.has(selector))this.nodes.set(selector,container.querySelector(selector));return this.nodes.get(selector);};
      const choose=()=>{const dialog=this.q('.music-library');if(dialog.open)dialog.close();this.q('.music-file').click();};
      this.q('.music-add').onclick=choose;this.q('.music-library-add').onclick=choose;
      this.q('.music-library-play').onclick=()=>player.toggle();
      this.q('.music-playlist').onclick=()=>{const dialog=this.q('.music-library');if(!dialog.open)dialog.showModal();this.update(true);};
      this.q('.music-library-close').onclick=()=>this.q('.music-library').close();
      this.q('.music-file').onchange=event=>{const files=Array.from(event.target.files||[]);event.target.value='';if(files.length)return player.addFiles(files);};
      this.q('.music-play').onclick=()=>player.toggle();this.q('.music-prev').onclick=()=>player.previous();this.q('.music-next').onclick=()=>player.next();
      this.q('.music-repeat').onclick=()=>player.cycleRepeat();this.q('.music-mute').onclick=()=>player.mute();
      this.q('.music-volume').oninput=event=>player.volume(event.target.value);
      this.q('.music-seek').onpointerdown=()=>{this.seeking=true;};
      this.q('.music-seek').oninput=event=>{const duration=player.audio.duration;if(Number.isFinite(duration))player.seek(Number(event.target.value)*duration/1000);};
      const finish=()=>{this.seeking=false;this.update();};
      this.q('.music-seek').onchange=finish;this.q('.music-seek').onpointerup=finish;this.q('.music-seek').onpointercancel=finish;
    }
    update(structural=false){
      const p=this.player,a=p.audio,current=p.current;
      if(this.q('.music-library').open&&(this.last.queueVersion!==p.queueVersion||this.last.count!==p.tracks.length)){
        const list=this.q('ol');const rows=[];this.rows.clear();
        p.tracks.forEach((track,index)=>{
          const li=document.createElement('li'),button=document.createElement('button'),number=document.createElement('span'),name=document.createElement('span'),remove=document.createElement('button');
          button.className='music-track';number.className='music-track-number';number.textContent=String(index+1).padStart(2,'0');
          name.className='music-track-title';name.textContent=track.title;button.title=track.name;button.append(number,name);button.onclick=()=>p.select(track.id,true);
          remove.className='music-remove';remove.innerHTML=svg('remove');remove.setAttribute('aria-label',`${track.title} 삭제`);remove.onclick=()=>p.remove(track.id);
          li.append(button,remove);rows.push(li);this.rows.set(track.id,{li,button,number});
        });
        list.replaceChildren(...rows);this.q('.music-empty').hidden=p.tracks.length>0;this.last.queueVersion=p.queueVersion;this.last.count=p.tracks.length;
      }
      this.q('.music-title').textContent=current?.title||'음악을 추가해 주세요';this.q('.music-title').title=current?.name||'';
      this.q('.music-caption').textContent=p.tracks.length?`${Math.max(1,p.tracks.findIndex(t=>t.id===p.currentId)+1)} / ${p.tracks.length} 트랙`:'내 플레이리스트';
      this.q('.music-count').textContent=`${p.tracks.length}곡`;this.q('.music-library-count').textContent=`${p.tracks.length}곡`;
      this.q('.music-add').disabled=!p.loaded||p.importing;this.q('.music-add').setAttribute('aria-busy',String(p.importing));
      for(const selector of ['.music-play','.music-prev','.music-next'])this.q(selector).disabled=!p.loaded||!p.tracks.length;
      this.q('.music-library-add').disabled=!p.loaded||p.importing;this.q('.music-library-play').disabled=!p.loaded||!p.tracks.length;
      const playing=Boolean(current&&!a.paused&&!a.ended);
      if(this.last.playing!==playing){
        const play=this.q('.music-play');play.innerHTML=svg(playing?'pause':'play');play.setAttribute('aria-label',playing?'일시정지':'재생');
        this.q('.music-disc').classList.toggle('playing',playing);this.last.playing=playing;
      }
      this.updateTime();
      this.q('.music-volume').value=a.volume;
      const muted=a.muted||a.volume===0;
      if(this.last.muted!==muted){this.q('.music-mute').innerHTML=svg(muted?'mute':'volume');this.q('.music-mute').setAttribute('aria-label',muted?'음소거 해제':'음소거');this.last.muted=muted;}
      const repeat=this.q('.music-repeat'),labels={off:'반복 꺼짐',all:'전체 반복',one:'한 곡 반복'};
      repeat.setAttribute('aria-pressed',String(p.repeat!=='off'));repeat.setAttribute('aria-label',labels[p.repeat]);repeat.title=labels[p.repeat];repeat.querySelector('span').textContent=p.repeat==='one'?'1':'';
      if(this.q('.music-status').textContent!==p.status)this.q('.music-status').textContent=p.status;
      if(structural||this.last.currentId!==p.currentId){
        for(const [id,row]of this.rows){const active=id===p.currentId;row.li.classList.toggle('active',active);if(active)row.button.setAttribute('aria-current','true');else row.button.removeAttribute('aria-current');}
        this.last.currentId=p.currentId;
      }
    }
    updateTime(){
      const a=this.player.audio,current=this.player.current,duration=Number.isFinite(a.duration)?a.duration:0;
      this.q('.music-seek').disabled=!current||duration<=0;
      if(!this.seeking)this.q('.music-seek').value=duration>0?Math.min(1000,M.seconds(a.currentTime)*1000/duration):0;
      const elapsed=M.formatTime(a.currentTime),end=M.formatTime(duration);if(this.last.elapsed!==elapsed){this.q('.music-elapsed').textContent=elapsed;this.last.elapsed=elapsed;}if(this.last.duration!==end){this.q('.music-duration').textContent=end;this.last.duration=end;}
    }
    destroy(){const dialog=this.q('.music-library');if(dialog?.open)dialog.close();this.rows.clear();this.container.replaceChildren();}
  }
  const api={Player,create:(options,dependencies)=>new Player(options,dependencies)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuButterMusic=api;
})(globalThis);
