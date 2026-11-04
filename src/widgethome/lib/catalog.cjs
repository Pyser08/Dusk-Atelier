/* Pure data projection. Never changes a character, chat, message or original DB. */
(function(root){
  'use strict';
  const normalize = v => String(v??'').replace(/\s+/g,' ').trim();
  function epoch(value) {
    if(value==null || value==='')return 0;
    const n=typeof value==='number'?value:Number(value);
    if(Number.isFinite(n))return n>0?(n<100000000000?n*1000:n):0;
    if(typeof value==='string'){const t=Date.parse(value);return Number.isFinite(t)&&t>0?t:0;}
    return 0;
  }
  function plain(value,limit=180) {
    return normalize(String(value??'').slice(0,100000)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
      .replace(/<(?:img|video|audio)\b[^>]*>/gi,'[첨부]')
      .replace(/<[^>]*>/g,' ')
      .replace(/\{\{(?:inlayed|asset|raw|image|video|audio)::[\s\S]*?\}\}/gi,'[첨부]')
      .replace(/!\[[^\]]*\]\([^)]*\)/g,'[이미지]')
      .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
      .replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&amp;/gi,'&')
      .replace(/[`*_#]/g,'')) .slice(0,limit);
  }
  function lastMessage(chat) {
    const messages=Array.isArray(chat?.message)?chat.message:[];
    for(let i=messages.length-1;i>=0;i--){
      const m=messages[i];if(!m)continue;
      if(m.disabled==='allBefore')break;
      if(m.disabled===true||m.isComment||!['user','char'].includes(m.role))continue;
      const preview=plain(m.data);
      if(preview)return {preview,time:epoch(m.time),role:m.role};
    }
    return {preview:'',time:0,role:''};
  }
  function characters(database){
    const value=database?.characters;
    if(!value||typeof value!=='object')throw Error('캐릭터 목록 형식을 읽지 못했어요.');
    // Match API 3 getCharacterFromIndex/getChatFromIndex Object.keys enumeration,
    // including sparse arrays, without filtering away their index positions.
    return Object.keys(value).map(key=>value[key]);
  }
  function project(database,previous={},now=Date.now(),options={}) {
    const chars=characters(database);
    const limit=Math.max(1,Math.min(24,options.limit||6));
    const records=Object.create(null);
    const old=previous?.records&&typeof previous.records==='object'?previous.records:{};
    for(const [id,v]of Object.entries(old))if(v&&Number.isFinite(v.order)&&v.order>=0)
      records[id]={order:v.order,observedAt:epoch(v.observedAt)};
    let serial=Object.values(records).reduce((max,v)=>Math.max(max,v.order),Math.max(Number(previous?.serial)||0,0));
    const initialized=previous?.initialized===true;
    for(const c of chars)if(c?.chaId&&!Object.hasOwn(records,c.chaId)){
      records[c.chaId]={order:++serial,observedAt:initialized?now:0};
    }
    const recent=[],added=[];
    for(let index=0;index<chars.length;index++){
      const char=chars[index];
      if(!char?.chaId||char.trashTime||char.type==='group')continue;
      const base={charId:char.chaId,charIndex:index,name:normalize(char.name)||'이름 없는 봇',imagePath:typeof char.image==='string'?char.image:''};
      // `creation_date` describes the creator's card date, NOT the local import time.
      if(char.imported===true || (options.includeLegacy && char.imported!==false)){
        const record=records[char.chaId];
        added.push({...base,order:record.order,addedAt:record.observedAt||0,orderSource:record.observedAt?'observed':'database-order'});
      }
      if(options.kind==='added')continue;
      for(let ci=0;ci<(Array.isArray(char.chats)?char.chats:[]).length;ci++){
        const chat=char.chats[ci];if(!chat)continue;
        const last=lastMessage(chat);
        const date=Math.max(epoch(chat.lastDate),last.time) || (ci===char.chatPage?epoch(char.lastInteraction):0);
        const unloaded=chat._placeholder===true||(chat._stub===true&&!Array.isArray(chat.message))||(!Array.isArray(chat.message)&&Boolean(chat.id));
        if(!unloaded&&!last.preview)continue;
        
        recent.push({...base,name:base.name,chatId:chat.id||'',chatIndex:ci,chatName:normalize(chat.name),
          preview:last.preview,time:date,needsHydration:unloaded,
          previewUnavailable:false});
      }
    }
    recent.sort((a,b)=>b.time-a.time||b.charIndex-a.charIndex||a.chatIndex-b.chatIndex);
    added.sort((a,b)=>b.order-a.order);
    return {schema:3,status:'ready',recent:recent.slice(0,Math.min(48,options.candidateLimit||limit)),added:added.slice(0,limit),
      counts:{characters:chars.length,recent:recent.length,added:added.length},
      ledger:{initialized:true,serial,records}};
  }
  const api=Object.freeze({epoch,plain,lastMessage,characters,project});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PocketRisuHomeCatalog=api;
})(globalThis);
