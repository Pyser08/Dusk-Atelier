import { loadEpisodicMemory } from '../../data/episodicmemory.js';
import { loadCharacters } from '../../data/modules.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn } from '../kit.js';

const gradeKind = { E:'mute', D:'mute', C:'acc2', B:'acc', A:'warn', S:'danger' };
const when = t => t ? new Date(t).toLocaleString() : '시간 정보 없음';
const totalRecords = folder => Object.values(folder?.characters ?? {}).reduce((n, p) => n + (p.records?.length ?? 0), 0);
const fkey = (charId, chatId) => String(charId) + '::' + String(chatId);

async function render(ctx) {
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
  const chatCount = Array.isArray(character?.chats) ? character.chats.length : 0;
  let chatIndex = Number.isInteger(state.memoryChatIndex) ? state.memoryChatIndex : 0;
  if (chatCount === 0) chatIndex = -1; else if (chatIndex < 0 || chatIndex >= chatCount) chatIndex = 0;
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

  const charList = h('div',{class:'rb-mem-charlist'});
  const paintChars = (query = state.memoryCharSearch ?? '') => {
    state.memoryCharSearch = query;
    const q = query.trim().toLocaleLowerCase();
    const filtered = chars.filter(x => !q || [x.character.name,x.character.creator,x.character.chaId].some(v => String(v ?? '').toLocaleLowerCase().includes(q)));
    replace(charList,filtered.length ? filtered.map(x => h('button',{
      type:'button',class:['rb-row',x.id === state.memoryCharId && 'is-active'],
      'aria-pressed':x.id === state.memoryCharId ? 'true':'false',
      onClick:() => {state.memoryCharId=x.id;state.memoryCharIndex=x.index;state.memoryChatIndex=0;render(ctx).catch(e=>ctx.toast(e?.message ?? String(e),{error:true}));}
    },h('span',{style:'color:var(--rb-acc-text);display:flex;align-items:center'},icon('user-round',17)),
      h('span',{class:'txt'},h('span',{class:'name'},x.character.name || '이름 없는 캐릭터'),h('span',{class:'meta'},(x.character.chats?.length ?? 0)+'개 채팅'))))
    : h('div',{class:'rb-empty',style:'padding:12px 8px'},'검색 결과가 없어요.'));
  };
  const search = h('label',{class:'rb-search rb-mem-search'},icon('search',16),h('input',{type:'search',placeholder:'캐릭터 검색',value:state.memoryCharSearch ?? '',onInput:e=>paintChars(e.target.value),'aria-label':'캐릭터 검색'}));
  paintChars();

  const chatList = h('div',{class:'rb-mem-chatlist'},h('h3',{class:'rb-label'},'채팅 선택'),chats.map(item => {
    const folder = data.folders[fkey(charId,item.id)] ?? Object.values(data.folders).find(x=>x.charId===charId && x.chatIndex===item.index);
    return h('button',{type:'button',class:['rb-row',item.index===chatIndex && 'is-active'],'aria-pressed':item.index===chatIndex?'true':'false',onClick:()=>{state.memoryChatIndex=item.index;render(ctx).catch(e=>ctx.toast(e?.message ?? String(e),{error:true}));}},
      h('span',{style:'color:var(--rb-acc-text);display:flex;align-items:center'},icon('messages-square',17)),
      h('span',{class:'txt'},h('span',{class:'name'},'채팅 '+(item.index+1)),h('span',{class:'meta'},item.name !== '채팅 '+(item.index+1) ? item.name : folder ? when(folder.updatedAt) : '기록 없음'),
        h('span',{class:'meta'},folder ? Object.keys(folder.characters ?? {}).length+'명 · '+totalRecords(folder)+'개 행동 · '+(folder.situations?.length ?? 0)+'개 장면':'아직 기록 없음')));
  }));

  const analyze = btn('선택한 채팅 분석',{kind:'primary',icon:'sparkles',disabled:!character || !chosen?.chat,onClick:async()=>{
    try {
      if(!ctx.episodicMemory?.analyzeSelected) throw new Error('분석 기능이 초기화되지 않았어요.');
      await ctx.episodicMemory.analyzeSelected(charIndex,chatIndex);
      ctx.toast('선택한 채팅 분석이 끝났어요.');
      await render(ctx);
    } catch(e) {
      ctx.toast('분석 실패: '+(e?.message ?? e),{error:true,seconds:10});
      await render(ctx);
    }
  }});
  const status = data.status ?? {};
  const statusText = status.hook==='ready'?'자동 분석 연결됨':status.hook==='unavailable'?'자동 분석을 지원하지 않는 환경':status.hook==='error'?'자동 분석 연결 실패':'자동 분석 연결 확인 중';
  const statusCard = h('div',{class:'rb-card rb-mem-status'},
    h('div',{class:'rb-mem-status-copy'},h('b',null,statusText),
      h('div',{class:'rb-muted'},'자동 분석 '+(status.processed ?? 0)+'회 · 마지막 성공 '+when(status.lastSuccessAt)),
      h('div',{class:'rb-muted'},'수동 분석은 선택한 채팅의 마지막 AI 응답을 다시 살펴봐요.'),
      status.lastError?h('div',{class:'rb-note err',style:'margin-top:8px'},icon('alert',16),h('span',null,status.lastError)):null),
    h('div',{class:'rb-mem-status-actions'},analyze,btn('새로고침',{icon:'refresh-cw',onClick:()=>{state.memoryCharacters=null;render(ctx);}})));

  const people = Object.values(current?.characters ?? {});
  const actions = people.flatMap(person => (person.records ?? []).map(record => ({
    kind:'character', time:record.createdAt ?? 0, id:record.id, person:person.name, record
  })));
  const situations = (current?.situations ?? []).map(sit => ({kind:'situation',time:sit.createdAt ?? 0,id:sit.id,sit}));
  const timeline = [...actions,...situations].sort((a,b)=>b.time-a.time);
  const filter = state.memoryFilter ?? 'all';
  const filtered = timeline.filter(item => filter === 'all' || (filter === 'characters' ? item.kind === 'character' : item.kind === 'situation'));
  const filterBar = h('div',{class:'rb-mem-filters'},
    ...[
      ['all','전체 기록',timeline.length],
      ['situation','장면 변화',situations.length],
      ['characters','인물 행동',actions.length]
    ].map(([value,label,count])=>h('button',{type:'button',class:'rb-chip', 'aria-pressed':filter===value?'true':'false',onClick:()=>{state.memoryFilter=value;render(ctx).catch(e=>ctx.toast(e?.message ?? String(e),{error:true}));}},label+' '+count)));
  let content;
  if (!character || !chosen?.chat) {
    content=h('div',{class:'rb-empty'},!character?'캐릭터를 불러오지 못했어요.':'선택한 채팅을 불러오지 못했어요.');
  } else if (!current || timeline.length===0) {
    content=h('div',{class:'rb-empty rb-mem-empty'},
      h('div',{class:'rb-mem-empty-icon'},icon('brain',30)),
      h('h2',{class:'rb-h2'},'아직 저장된 기억이 없어요'),
      h('p',{class:'rb-p'},'이 캐릭터의 채팅 '+(chatIndex+1)+'을 선택했어요. 아래 ‘선택한 채팅 분석’을 누르면 인물의 중요한 행동과 장면 변화를 한 타임라인에 모아 보여 줘요.'));
  } else if (!filtered.length) {
    content=h('div',{class:'rb-empty'},'이 종류의 기록은 아직 없어요. ‘전체 기록’을 선택해 다른 기록을 확인하세요.');
  } else {
    content=h('div',{class:'rb-mem-timeline'},filtered.map(item=>{
      if(item.kind==='situation'){
        const sit=item.sit;
        const isLatest=sit.id===current.situations?.[current.situations.length-1]?.id;
        return h('article',{class:['rb-card','rb-mem-event','rb-mem-event-situation']},
          h('div',{class:'rb-mem-event-head'},
            h('span',{class:'rb-mem-event-icon'},icon('map-pin',16)),
            h('b',null,isLatest?'장면 / 현재 상황':'장면 변화'),
            badge(when(sit.createdAt),'mute')),
          h('p',{class:'rb-mem-event-summary'},sit.summary || '장면 요약 없음'),
          sit.state?.length?h('div',{class:'rb-mem-facts'},h('b',null,'당시 상태'),h('ul',null,sit.state.map(v=>h('li',null,v)))):null,
          sit.currentSummary?h('div',{class:'rb-mem-current'},h('b',null,'최근 갱신'),h('p',{class:'rb-p'},sit.currentSummary)):null,
          sit.currentState?.length?h('div',{class:'rb-mem-facts'},h('b',null,'현재 상태'),h('ul',null,sit.currentState.map(v=>h('li',null,v)))):null);
      }
      const record=item.record;
      return h('article',{class:'rb-card rb-mem-event rb-mem-event-character'},
        h('div',{class:'rb-mem-event-head'},
          h('span',{class:'rb-mem-event-icon'},icon('user-round',16)),
          h('b',null,item.person || '이름 없는 인물'),
          badge(record.grade || 'E',gradeKind[record.grade] ?? 'mute'),
          badge('인물 행동','mute'),
          h('span',{class:'rb-muted rb-mem-event-time'},when(record.createdAt))),
        h('p',{class:'rb-mem-event-summary'},record.action || '기록 내용 없음'));
    }));
  }
  const header = h('div',{class:'rb-mem-title'},
    h('div',null,h('h2',{class:'rb-h2'},'장기 기억'),h('p',{class:'rb-p'},'인물의 중요한 행동과 장면 변화를 시간순으로 함께 확인해요.')),
    h('span',{class:'rb-muted'},current ? current.charName+' / 채팅 '+((current.chatIndex ?? chatIndex)+1)+': '+current.chatName : character ? character.name+' / 채팅 '+(chatIndex+1)+': '+chosen?.name : ''));
  const mainPane=h('div',{class:'rb-section rb-mem-pane rb-scroll'},
    header,statusCard,
    h('div',{class:'rb-mem-timeline-heading'},h('div',null,h('h3',{class:'rb-h3'},'기억 타임라인'),h('p',{class:'rb-p'},'최근 기록이 위에 표시돼요. 중요도 등급은 인물 행동에만 붙어요.')),filterBar),
    content);
  replace(ctx.main,h('div',{class:'rb-mem-layout'},
    h('aside',{class:'rb-mem-sidebar'},h('h3',{class:'rb-label',style:'padding:12px 12px 4px'},'캐릭터'),search,charList,character?chatList:null),
    mainPane));
}
export const renderMemory = ctx => render(ctx);
