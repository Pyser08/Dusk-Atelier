/* Official API 3.0 only; storage is scoped to our own prefix. */
(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./core.cjs'):root.PocketRisuHomeCore;
  const Catalog=typeof module!=='undefined'&&module.exports?require('./catalog.cjs'):root.PocketRisuHomeCatalog;
  class Storage{
    constructor(api){this.api=api;this.pending=null;this.chains=new Map();}
    backend(){
      if(!this.pending){this.pending=(async()=>{try{const store=await this.api.getLocalPluginStorage();if(store)return store;}catch{}const fallback=this.api.pluginStorage;if(!fallback)throw Error('플러그인 저장소를 사용할 수 없어요.');return fallback;})();this.pending.catch(()=>{this.pending=null;});}
      return this.pending;
    }
    queue(key,run){const previous=this.chains.get(key)||Promise.resolve(),task=previous.catch(()=>{}).then(run);this.chains.set(key,task);const clear=()=>{if(this.chains.get(key)===task)this.chains.delete(key);};task.then(clear,clear);return task;}
    get(key){return this.queue(key,async()=>(await this.backend()).getItem(C.PREFIX+key));}
    set(key,value){const snapshot=structuredClone(value);return this.queue(key,async()=>{const result=await(await this.backend()).setItem(C.PREFIX+key,snapshot);if(result===false)throw Error('저장하지 못했어요.');});}
    remove(key){return this.queue(key,async()=>{const result=await(await this.backend()).removeItem(C.PREFIX+key);if(result===false)throw Error('삭제하지 못했어요.');});}
    async saveAudio(record){
      await this.set('audio-candidate',record);
      try{
        const saved=await this.get('audio-candidate');
        if(!(saved?.blob instanceof Blob)||saved.blob.size!==record.blob.size)throw Error('이 포켓리스 버전에서는 음악 파일 저장을 지원하지 않아요.');
        await this.set('audio',record);
      }finally{await this.remove('audio-candidate').catch(()=>{});}
    }
  }
  // Share only overlapping reads: completed snapshots are never retained here.
  class DatabaseReader{
    constructor(api){this.api=api;this.pending=null;}
    read(){if(!this.pending)this.pending=Promise.resolve().then(()=>this.api.getDatabase(['characters'])).finally(()=>{this.pending=null;});return this.pending;}
  }
  function sameRows(a=[],b=[]){
    return a.length===b.length&&a.every((row,i)=>{
      const other=b[i],keys=Object.keys(row);
      return other&&keys.length===Object.keys(other).length&&keys.every(key=>row[key]===other[key]);
    });
  }
  class CatalogService{
    constructor(api,storage,thumbnail=async()=> '',reader=new DatabaseReader(api)){this.api=api;this.reader=reader;this.storage=storage;this.thumbnail=thumbnail;this.cache=new Map();this.pending=new Map();}
    async detail(row){
      const db=await this.reader.read();if(!db)throw Error('대화 읽기 권한이 필요해요.');
      const characters=Catalog.characters(db),index=characters.findIndex(c=>c?.chaId===row.charId&&!c.trashTime&&c.type!=='group');
      if(index<0)throw Error('이 봇은 현재 목록에 없어요. 새로고침해 주세요.');
      const char=characters[index],chats=Array.isArray(char.chats)?char.chats:[];
      if(!row.chatId&&!Number.isInteger(row.chatIndex)){
        let info=char,warning='';
        if(typeof this.api.getCharacterFromIndex==='function'){
          try{const full=await this.api.getCharacterFromIndex(index);if(!full||full.chaId!==char.chaId)throw Error('봇 정보가 변경되었어요.');info={...char,...full};}
          catch{warning='상세 정보를 모두 불러오지 못해 현재 목록의 정보를 표시해요.';}
        }
        const fields=[],plain=value=>typeof value==='string'?Catalog.plain(value,6000):'',add=(label,value)=>{const text=plain(value);if(text)fields.push({label,text});};
        add('설명',info.desc||info.description);
        add('제작자',info.creator);
        add('제작자 노트',info.creatorNotes||info.creator_notes);
        add('첫 메시지',info.firstMessage||info.first_mes);
        if(Array.isArray(info.tags))add('태그',info.tags.filter(v=>typeof v==='string').slice(0,30).join(' · '));
        return{name:C.normalize(info.name)||'이름 없는 봇',chatName:'',messages:[],bot:true,fields,warning,chatCount:chats.length};
      }
      const ci=row.chatId?chats.findIndex(c=>c?.id===row.chatId):row.chatIndex;
      const meta=chats[ci];if(!meta||(!row.chatId&&row.chatName&&C.normalize(meta.name)!==row.chatName))throw Error('대화 목록이 바뀌었어요. 새로고침해 주세요.');
      const full=await this.api.getChatFromIndex(index,ci);
      if(!full||!Array.isArray(full.message)||full._placeholder===true||(row.chatId&&full.id&&full.id!==row.chatId))throw Error('이 대화를 불러오지 못했어요.');
      const messages=[];
      for(let i=(full.message||[]).length-1;i>=0&&messages.length<8;i--){const m=full.message[i];if(m?.disabled==='allBefore')break;if(!m||m.disabled===true||m.isComment||!['char','user'].includes(m.role))continue;const text=Catalog.plain(m.data,1800);if(text)messages.unshift({role:m.role,text});}
      return{name:C.normalize(char.name)||'이름 없는 봇',chatName:C.normalize(meta.name),messages,bot:false};
    }
    refresh(options={}){
      const key=JSON.stringify([options.kind||'both',options.limit||6,options.includeLegacy!==false,options.force===true]);
      if(this.pending.has(key))return this.pending.get(key);
      const task=this.load(options).finally(()=>{this.pending.delete(key);});this.pending.set(key,task);return task;
    }
    async load(options){
      const db=await this.reader.read();
      if(!db)return{status:'permission',recent:[],added:[],warning:''};
      let ledger={},ledgerReady=true,warning='';
      try{ledger=await this.storage.get('import-order')||{};}catch{ledgerReady=false;warning='추가 순서를 저장소에서 읽지 못했어요.';}
      const limit=Math.max(1,Math.min(24,Number(options.limit)||6));
      const model=Catalog.project(db,ledger,Date.now(),{limit,candidateLimit:Math.max(24,limit*2),includeLegacy:options.includeLegacy!==false,kind:options.kind});
      if(ledgerReady&&JSON.stringify(ledger)!==JSON.stringify(model.ledger)){
        try{await this.storage.set('import-order',model.ledger);}catch{warning='추가 순서를 저장하지 못했어요.';}
      }
      const recent=[];let unavailable=0;
      for(const row of options.kind==='added'?[]:model.recent){
        if(recent.length===limit)break;
        if(row.needsHydration){
          const key=JSON.stringify([row.charId,row.chatId,row.chatIndex,row.time]);let preview=options.force?null:this.cache.get(key);
          if(!preview||Date.now()-preview.at>30000){
            try{
              const full=await this.api.getChatFromIndex(row.charIndex,row.chatIndex);
              if(full?.id&&row.chatId&&full.id!==row.chatId){unavailable++;continue;}
              if(!full||!Array.isArray(full.message)||full._placeholder===true){row.previewUnavailable=true;}
              else{preview={...Catalog.lastMessage(full),at:Date.now()};if(this.cache.size>=60)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,preview);}
            }catch{row.previewUnavailable=true;}
          }
          if(preview){if(!preview.preview)continue;row.preview=preview.preview;row.time=Math.max(row.time,preview.time);}
          if(row.previewUnavailable){unavailable++;row.preview='메시지를 아직 읽지 못했어요 · 눌러서 다시 확인';}
        }
        delete row.needsHydration;recent.push(row);
      }
      if(unavailable)warning=[warning,`${unavailable}개 대화의 메시지를 아직 읽지 못했어요.`].filter(Boolean).join(' ');
      // Explain a legacy filter instead of claiming that the user's bots do not exist.
      const hiddenLegacy=options.includeLegacy===false?Catalog.characters(db).filter(c=>c?.chaId&&!c.trashTime&&c.type!=='group'&&c.imported==null).length:0;
      model.hiddenLegacy=options.includeLegacy===false?hiddenLegacy:0;
      recent.sort((a,b)=>b.time-a.time);model.recent=recent;
      if(options.kind==='recent')model.added=[];
      const images=new Map(),rows=[...model.recent,...model.added];
      // The shared image cache bounds decoding concurrency across both views.
      await Promise.all(rows.map(async row=>{
        const path=row.imagePath;
        if(!images.has(path))images.set(path,Promise.resolve().then(()=>this.thumbnail(path)).catch(()=>''));
        row.image=await images.get(path);delete row.imagePath;
      }));
      delete model.ledger;model.warning=warning;return model;
    }
    clear(){this.cache.clear();}
  }
  const exports={Storage,CatalogService,DatabaseReader,sameRows};
  if(typeof module!=='undefined'&&module.exports)module.exports=exports;else root.PocketRisuHomeService=exports;
})(globalThis);
