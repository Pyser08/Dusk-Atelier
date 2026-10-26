import { loadEpisodicMemory } from '../../data/episodicmemory.js';
import { loadCharacters } from '../../data/modules.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn } from '../kit.js';

const gradeKind = { E:'mute', D:'mute', C:'acc2', B:'acc', A:'warn', S:'danger' };
const when = t => t ? new Date(t).toLocaleString() : '시간 정보 없음';
const totalRecords = folder => Object.values(folder?.characters ?? {}).reduce((n, p) => n + (p.records?.length ?? 0), 0);
const fkey = (charId, chatId) => String(charId) + '::' + String(chatId);

async function render(ctx, mode) {
  const state = ctx.state, data = await loadEpisodicMemory(ctx.api);
  if (!Array.isArray(state.memoryCharacters)) {
    const db = await ctx.api.getDatabase(['characters','characterOrder']);
    const loaded = await loadCharacters(ctx.api, db?.characters);
    state.memoryCharacters = loaded.list.map((character,index) => character ? ({character,index,id:String(character.chaId ?? character.id ?? index)}) : null).filter(Boolean);
  }
  const chars = state.memoryCharacters;
  let selected = chars.find(x => x.id === state.memoryCharId);
  if (!selected) {
    const ci = await ctx.api.getCurrentCharacterIndex().catch(() => -1);
    selected = chars.find(x => x.index === ci) ?? chars[0] ?? null;
    state.memoryCharId = selected?.id ?? '';
    state.memoryCharIndex = selected?.index ?? -1;
    state.memoryChatIndex = 0;
  }
  const character = selected?.character ?? null, charIndex = selected?.index ?? -1;
  const chatCount = Math.max(1, Array.isArray(character?.chats) ? character.chats.length : 0);
  let chatIndex = Number.isInteger(state.memoryChatIndex) ? state.memoryChatIndex : 0;
  if (chatIndex < 0 || chatIndex >= chatCount) chatIndex = 0;
  state.memoryChatIndex = chatIndex;
  const chats = await Promise.all(Array.from({length:chatCount}, async (_,index) => {
    const meta = character?.chats?.[index]; let chat = null;
    try { chat = await ctx.api.getChatFromIndex(charIndex,index); } catch {}
    return {index,chat,id:String(chat?.id ?? meta?.id ?? index),name:String(chat?.name ?? chat?.chatName ?? meta?.name ?? meta?.chatName ?? ('채팅 '+(index+1)))};
  }));
  const chosen = chats[chatIndex] ?? null;
  const charId = String(character?.chaId ?? character?.id ?? charIndex);
  const key = chosen ? fkey(charId,chosen.id) : '';
  const current = data.folders[key] ?? Object.values(data.folders).find(x => x.charId === charId && x.chatIndex === chatIndex) ?? null;
  if (current) state.memoryFolder = current.id;
  const situationsMode = mode === 'situations';
  const title = situationsMode ? '상황 기록' : '인물별 기억';
  const desc = situationsMode ? '선택한 캐릭터와 채팅의 장면 변화 및 현재 상태예요.' : '선택한 채팅에서 선별된 인물 행동과 중요도예요.';
  const charList = h('div',{class:'rb-mem-charlist'});
  const paintChars = (query = state.memoryCharSearch ?? '') => {
    state.memoryCharSearch = query;
    const q = query.trim().toLocaleLowerCase();
    const filtered = chars.filter(x => !q || [x.character.name,x.character.creator,x.character.chaId].some(v => String(v ?? '').toLocaleLowerCase().includes(q)));
    replace(charList,filtered.length ? filtered.map(x => h('button',{
      type:'button',class:['rb-row',x.id === state.memoryCharId && 'is-active'],
      'aria-pressed':x.id === state.memoryCharId ? 'true':'false',
      onClick:() => {state.memoryCharId=x.id;state.memoryCharIndex=x.index;state.memoryChatIndex=0;render(ctx,mode).catch(e=>ctx.toast(e?.message ?? String(e),{error:true}));}
    },h('span',{style:'color:var(--rb-acc-text);display:flex;align-items:center'},icon('user-round',17)),
      h('span',{class:'txt'},h('span',{class:'name'},x.character.name || '이름 없는 캐릭터'),h('span',{class:'meta'},(x.character.chats?.length ?? 0)+'개 채팅'))))
    : h('div',{class:'rb-empty',style:'padding:12px 8px'},'검색 결과가 없어요.'));
  };
  const search = h('label',{class:'rb-search rb-mem-search'},icon('search',16),h('input',{type:'search',placeholder:'캐릭터 검색',value:state.memoryCharSearch ?? '',onInput:e=>paintChars(e.target.value),'aria-label':'캐릭터 검색'}));
  paintChars();
  const chatList = h('div',{class:'rb-mem-chatlist'},h('h3',{class:'rb-label'},'채팅 폴더'),chats.map(item => {
    const folder = data.folders[fkey(charId,item.id)] ?? Object.values(data.folders).find(x=>x.charId===charId && x.chatIndex===item.index);
    return h('button',{type:'button',class:['rb-row',item.index===chatIndex && 'is-active'],'aria-pressed':item.index===chatIndex?'true':'false',onClick:()=>{state.memoryChatIndex=item.index;render(ctx,mode).catch(e=>ctx.toast(e?.message ?? String(e),{error:true}));}},
      h('span',{style:'color:var(--rb-acc-text);display:flex;align-items:center'},icon('folder',17)),
      h('span',{class:'txt'},h('span',{class:'name'},'채팅 '+(item.index+1)),h('span',{class:'meta'},item.name !== '채팅 '+(item.index+1) ? item.name : folder ? when(folder.updatedAt) : '기록 없음'),
        h('span',{class:'meta'},folder ? Object.keys(folder.characters ?? {}).length+'명 · '+totalRecords(folder)+'개 행동 · '+(folder.situations?.length ?? 0)+'개 상황':'아직 기록 없음')));
  }));
  const analyze = btn('선택한 채팅 분석',{kind:'primary',icon:'sparkles',onClick:async()=>{
    try { if(!ctx.episodicMemory?.analyzeSelected) throw new Error('분석 기능이 초기화되지 않았어요.'); await ctx.episodicMemory.analyzeSelected(charIndex,chatIndex);ctx.toast('선택한 채팅 분석이 끝났어요.');await render(ctx,mode); }
    catch(e){ctx.toast('분석 실패: '+(e?.message ?? e),{error:true,seconds:8});await render(ctx,mode);}
  }});
  const status = data.status ?? {};
  const statusText = status.hook==='ready'?'자동 분석 연결됨':status.hook==='unavailable'?'출력 훅을 사용할 수 없음':status.hook==='error'?'출력 훅 초기화 실패':'자동 분석 초기화 중';
  const statusCard = h('div',{class:'rb-card',style:'display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px'},
    h('div',{style:'flex:1;min-width:180px'},h('b',null,statusText),h('div',{class:'rb-muted',style:'margin-top:3px'},'분석 완료 '+(status.processed ?? 0)+'회 · 마지막 성공 '+when(status.lastSuccessAt)),status.lastError?h('div',{class:'rb-note err',style:'margin-top:8px'},icon('alert',16),h('span',null,status.lastError)):null),
    analyze,btn('새로고침',{icon:'refresh-cw',onClick:()=>{state.memoryCharacters=null;render(ctx,mode);}}));
  let content;
  if (!character || !chosen?.chat) content = h('div',{class:'rb-empty'},!character?'캐릭터를 불러오지 못했어요.':'선택한 채팅을 불러오지 못했어요.');
  else if (!current) content = h('div',{class:'rb-empty',style:'margin:auto;max-width:460px'},h('div',{style:'color:var(--rb-acc-text);display:flex;justify-content:center;margin-bottom:12px'},icon(situationsMode?'map':'brain',32)),h('h2',{class:'rb-h2'},'이 채팅에는 기록이 없어요.'),h('p',{class:'rb-p'},'캐릭터 '+character.name+'의 채팅 '+(chatIndex+1)+'을 선택했어요. 아래 버튼으로 이 채팅의 마지막 AI 응답을 분석할 수 있어요.'));
  else if (situationsMode) {
    const list=[...(current.situations ?? [])].reverse();
    content=list.length?h('div',{class:'rb-mem-records'},list.map((sit,i)=>h('article',{class:'rb-card rb-mem-record'},h('div',{class:'rb-mem-record-head'},h('b',null,'상황 '+(list.length-i)),badge(when(sit.createdAt),'mute')),h('p',{class:'rb-p',style:'white-space:pre-wrap'},sit.summary || '요약 없음'),sit.state?.length?h('div',{class:'rb-mem-facts'},h('b',null,'당시 상태'),h('ul',null,sit.state.map(v=>h('li',null,v)))):null,sit.currentSummary?h('div',{class:'rb-note',style:'margin-top:8px'},icon('refresh-cw',16),h('span',null,'현재 갱신: '+sit.currentSummary)):null,sit.currentState?.length?h('div',{class:'rb-mem-facts'},h('b',null,'최근 상태'),h('ul',null,sit.currentState.map(v=>h('li',null,v)))):null,h('div',{class:'rb-muted'},'ID: '+sit.id)))):h('div',{class:'rb-empty'},'이 채팅에는 아직 상황 기록이 없어요.');
  } else {
    const people=Object.values(current.characters ?? {}).sort((a,b)=>(b.records?.length ?? 0)-(a.records?.length ?? 0));
    content=people.length?h('div',{class:'rb-mem-records'},people.map(person=>h('section',{class:'rb-card rb-mem-person'},h('div',{class:'rb-mem-record-head'},h('h3',{class:'rb-h2',style:'margin:0'},person.name),badge((person.records?.length ?? 0)+'개 기록','mute')),(person.records ?? []).length?person.records.slice().reverse().map(record=>h('article',{class:'rb-mem-record'},h('div',{class:'rb-mem-record-head'},badge(record.grade || 'E',gradeKind[record.grade] ?? 'mute'),h('span',{class:'rb-muted'},when(record.createdAt))),h('p',{class:'rb-p',style:'white-space:pre-wrap'},record.action),record.situationId?h('div',{class:'rb-muted'},'상황 연결: '+record.situationId):null)):h('p',{class:'rb-muted'},'아직 행동 기록이 없어요.')))):h('div',{class:'rb-empty'},'이 채팅에서 기록할 인물을 찾지 못했어요.');
  }
  const mainPane=h('div',{class:'rb-section rb-mem-pane rb-scroll'},h('div',{class:'rb-mem-title'},h('div',null,h('h2',{class:'rb-h2'},title),h('p',{class:'rb-p'},desc)),h('span',{class:'rb-muted'},current ? current.charName+' / 채팅 '+((current.chatIndex ?? chatIndex)+1)+': '+current.chatName : character ? character.name+' / 채팅 '+(chatIndex+1)+': '+chosen.name : '')),statusCard,content);
  replace(ctx.main,h('div',{class:'rb-mem-layout'},h('aside',{class:'rb-mem-sidebar'},h('h3',{class:'rb-label',style:'padding:12px 12px 4px'},'캐릭터'),search,charList,character?chatList:null),mainPane));
}
export const renderMemory = ctx => render(ctx,'memory');
export const renderSituations = ctx => render(ctx,'situations');
