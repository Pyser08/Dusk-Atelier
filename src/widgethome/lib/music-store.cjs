/* Music library through official plugin storage; no iframe IndexedDB. */
(function(root){
  'use strict';
  const MAX_BYTES=100*1024*1024,MAX_TRACKS=200;
  const EXTENSIONS=/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i;
  function fileError(file){
    if(!file||!EXTENSIONS.test(file.name||''))return 'MP3·M4A·AAC·WAV·OGG·OPUS·FLAC·WebM 음악 파일을 선택해 주세요.';
    if(!Number.isFinite(file.size)||file.size<=0)return '비어 있는 파일은 추가할 수 없어요.';
    if(file.size>MAX_BYTES)return '음악 파일은 한 곡당 100MB 이하로 선택해 주세요.';
    return '';
  }
  function fingerprint(file){return JSON.stringify([file.name,file.size,Number(file.lastModified)||0]);}
  function title(name){return String(name||'이름 없는 곡').replace(EXTENSIONS,'').trim()||'이름 없는 곡';}
  function seconds(value){return Number.isFinite(Number(value))&&Number(value)>=0?Number(value):0;}
  function formatTime(value){const s=Math.floor(seconds(value));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
  function preferences(value={}){
    const n=Number(value.volume);
    return {currentId:typeof value.currentId==='string'?value.currentId:'',position:seconds(value.position),
      volume:Number.isFinite(n)?Math.max(0,Math.min(1,n)):1,muted:value.muted===true,
      repeat:['off','all','one'].includes(value.repeat)?value.repeat:'all'};
  }
  function nextIndex(index,length,repeat='all',automatic=false){
    if(length<=0)return -1;
    if(automatic&&repeat==='one')return Math.max(0,index);
    if(index+1<length)return Math.max(0,index+1);
    return !automatic||repeat==='all'?0:-1;
  }
  class Store{
    constructor(storage){this.storage=storage;this.chain=Promise.resolve();this.closed=false;}
    serial(run){const task=this.chain.catch(()=>{}).then(()=>{if(this.closed)throw Error('음악 저장소가 닫혔어요.');return run();});this.chain=task;return task;}
    async index(){const data=await this.storage.get('music-index');return Array.isArray(data)?data.filter(v=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,120}$/.test(v)).slice(0,MAX_TRACKS):null;}
    all(){return this.serial(async()=>{
      let ids=await this.index();
      if(ids===null){
        const old=await this.storage.get('audio');
        if(old?.blob instanceof Blob){const record={id:'legacy-audio',name:old.name||'내 음악.mp3',title:title(old.name),blob:old.blob,addedAt:old.updatedAt||Date.now(),order:1,fingerprint:fingerprint(old.blob)};await this.write(record);ids=[record.id];}
        else return[];
      }
      const tracks=[];for(const id of ids){const t=await this.storage.get('music-track-'+id);if(t?.id===id&&t.blob instanceof Blob)tracks.push(t);}return tracks;
    });}
    async write(track){
      if(!/^[a-zA-Z0-9-]{1,120}$/.test(track.id)||!(track.blob instanceof Blob))throw Error('잘못된 음악 파일이에요.');
      const ids=await this.index()||[];if(ids.includes(track.id))return;
      const key='music-track-'+track.id;
      await this.storage.set(key,track);
      try{
        const saved=await this.storage.get(key);if(!(saved?.blob instanceof Blob)||saved.blob.size!==track.blob.size)throw Error('이 포켓리스 저장소에서는 음악 파일 저장을 지원하지 않아요.');
        await this.storage.set('music-index',[...ids,track.id]);
      }catch(error){await this.storage.remove(key).catch(()=>{});throw error;}
    }
    put(track){return this.serial(()=>this.write(track));}
    remove(id){return this.serial(async()=>{const ids=await this.index()||[];await this.storage.set('music-index',ids.filter(v=>v!==id));await this.storage.remove('music-track-'+id).catch(()=>{});});}
    getPreferences(){return this.storage.get('music-prefs');}
    putPreferences(value){return this.storage.set('music-prefs',value);}
    close(){this.closed=true;}
  }
  const api={Store,MAX_BYTES,MAX_TRACKS,fileError,fingerprint,title,seconds,formatTime,preferences,nextIndex};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PocketRisuButterMusicStore=api;
})(globalThis);
