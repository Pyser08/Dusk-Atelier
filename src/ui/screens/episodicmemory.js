import { loadEpisodicMemory, MEMORY_GRADES } from '../../data/episodicmemory.js';
import { loadCharacters } from '../../data/modules.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn } from '../kit.js';

const gradeKind = { E: 'mute', D: 'mute', C: 'acc2', B: 'acc', A: 'warn', S: 'danger' };
const when = (t) => t ? new Date(t).toLocaleString() : '시간 정보 없음';
const totalRecords = (folder) => Object.values(folder?.characters ?? {}).reduce((n, c) => n + (c.records?.length ?? 0), 0);
const folderKey = (char, chat, charIndex, chatIndex) => `${String(char?.chaId ?? char?.id ?? charIndex)}::${String(chat?.id ?? chatIndex)}`;
const chatLabel = (chat, index) => String(chat?.name || chat?.chatName || `채팅 ${index + 1}`);

async function getCharacters(api) {
  const db = await api.getDatabase(['characters']);
  if (!db?.characters) return [];
  const loaded = await loadCharacters(api, db.characters);
  return (loaded.list ?? []).map((character, index) => character && !character.trashTime ? {
    index, id: String(character.chaId ?? character.id ?? index), name: character.name || '(이름 없는 캐릭터)',
    chats: Array.isArray(character.chats) ? character.chats : []
  } : null).filter(Boolean);
}

async function render(ctx, mode) {
  const state = ctx.state;
  const data = await loadEpisodicMemory(ctx.api);
  let characters = [];
  let loadError = '';
  try { characters = await getCharacters(ctx.api); }
  catch (e) { loadError = String(e?.message ?? e); }
  const search = String(state.memoryCharacterSearch ?? '');
  const filtered = characters.filter(c => c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  let charIndex = Number.isInteger(state.memoryCharIndex) ? state.memoryCharIndex : -1;
  if (!characters.some(c => c.index === charIndex)) charIndex = filtered[0]?.index ?? characters[0]?.index ?? -1;
  state.memoryCharIndex = charIndex;
  const character = characters.find(c => c.index === charIndex) ?? null;
  const chats = character?.chats ?? [];
  let chatIndex = Number.isInteger(state.memoryChatIndex) ? state.memoryChatIndex : -1;
  if (chatIndex < 0 || chatIndex >= chats.length) chatIndex = chats.length ? 0 : -1;
  state.memoryChatIndex = chatIndex;
  const chat = chatIndex >= 0 ? chats[chatIndex] : null;
  const key = character && chat ? folderKey(character, chat, charIndex, chatIndex) : '';
  const current = key ? data.folders[key] ?? {
    id: key, charId: character.id, charName: character.name, chatId: String(chat?.id ?? chatIndex),
    chatName: chatLabel(chat, chatIndex), characters: {}, situations: [], createdAt: 0, updatedAt: 0
  } : null;
  const isSituations = mode === 'situations';
  const title = isSituations ? '상황 기록' : '인물별 기억';
  const desc = isSituations ? '선택한 캐릭터의 채팅별 상황 요약과 현재 상태를 확인해요.' : '선택한 캐릭터의 채팅별 행동 기록과 중요도 등급을 확인해요.';
  const status = data.status ?? {};

  const searchInput = h('input', {
    class: 'rb-input', type: 'search', placeholder: '캐릭터 이름 검색…', value: search,
    'aria-label': '캐릭터 이름 검색',
    onInput: (event) => { state.memoryCharacterSearch = event.target.value; render(ctx, mode).catch(() => {}); }
  });
  const characterList = h('div', { class: 'rb-mem-nav-list' },
    filtered.length ? filtered.map(c => h('button', {
      type: 'button', class: ['rb-row', c.index === charIndex && 'is-active'],
      'aria-pressed': c.index === charIndex ? 'true' : 'false',
      onClick: () => { state.memoryCharIndex = c.index; state.memoryChatIndex = 0; render(ctx, mode).catch(() => {}); }
    },
      h('span', { style: 'color:var(--rb-acc-text);display:flex;align-items:center' }, icon('character', 18)),
      h('span', { class: 'txt' }, h('span', { class: 'name' }, c.name), h('span', { class: 'meta' }, `${c.chats.length}개 채팅`))
    )) : h('div', { class: 'rb-empty', style: 'padding:14px 6px' }, loadError ? '캐릭터 목록을 불러오지 못했어요.' : search ? '검색 결과가 없어요.' : '캐릭터가 없어요.')
  );
  const chatList = h('div', { class: 'rb-mem-nav-list' },
    chats.length ? chats.map((c, i) => h('button', {
      type: 'button', class: ['rb-row', i === chatIndex && 'is-active'],
      'aria-pressed': i === chatIndex ? 'true' : 'false',
      onClick: () => { state.memoryChatIndex = i; render(ctx, mode).catch(() => {}); }
    },
      h('span', { style: 'color:var(--rb-acc-text);display:flex;align-items:center' }, icon('folder', 18)),
      h('span', { class: 'txt' },
        h('span', { class: 'name' }, `채팅 ${i + 1}`),
        h('span', { class: 'meta' }, chatLabel(c, i)),
        h('span', { class: 'meta' }, (() => {
          const f = data.folders[folderKey(character, c, charIndex, i)];
          return f ? `${totalRecords(f)}개 행동 · ${f.situations?.length ?? 0}개 상황` : '아직 기록 없음';
        })())
      )
    )) : h('div', { class: 'rb-empty', style: 'padding:14px 6px' }, character ? '이 캐릭터에는 채팅이 없어요.' : '먼저 캐릭터를 선택하세요.')
  );

  const analyze = btn('선택한 채팅 분석', {
    kind: 'primary', icon: 'sparkles', disabled: !character || chatIndex < 0,
    onClick: async () => {
      try {
        if (!ctx.episodicMemory?.analyzeSelected) throw new Error('분석 기능이 초기화되지 않았어요.');
        await ctx.episodicMemory.analyzeSelected(charIndex, chatIndex);
        ctx.toast('선택한 채팅 분석이 끝났어요.');
        await render(ctx, mode);
      } catch (e) {
        ctx.toast(`분석 실패: ${e?.message ?? e}`, { error: true, seconds: 8 });
        await render(ctx, mode);
      }
    }
  });
  const statusText = status.hook === 'ready' ? '자동 분석 연결됨' : status.hook === 'unavailable' ? '출력 훅을 사용할 수 없음' : status.hook === 'error' ? '출력 훅 초기화 실패' : '자동 분석 초기화 중';
  const statusCard = h('div', { class: 'rb-card', style: 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px;padding:14px' },
    h('div', { style: 'flex:1;min-width:180px' },
      h('b', null, statusText),
      h('div', { class: 'rb-muted', style: 'margin-top:3px' }, `분석 완료 ${status.processed ?? 0}회 · 마지막 성공 ${when(status.lastSuccessAt)}`),
      status.lastError ? h('div', { class: 'rb-note err', style: 'margin-top:8px' }, icon('alert', 16), h('span', null, status.lastError)) : null
    ),
    analyze,
    btn('새로고침', { icon: 'refresh-cw', onClick: () => render(ctx, mode) })
  );
  let content;
  if (!current) {
    content = h('div', { class: 'rb-empty' }, '캐릭터와 채팅을 선택하면 이곳에 기록이 표시돼요.');
  } else if (isSituations) {
    const situations = [...(current.situations ?? [])].reverse();
    content = situations.length ? h('div', { class: 'rb-mem-records' }, situations.map((sit, i) => h('article', { class: 'rb-card rb-mem-record' },
      h('div', { class: 'rb-mem-record-head' }, h('b', null, `상황 ${situations.length - i}`), badge(when(sit.createdAt), 'mute')),
      h('p', { class: 'rb-p', style: 'white-space:pre-wrap' }, sit.summary || '요약 없음'),
      (sit.state?.length ?? 0) ? h('div', { class: 'rb-mem-facts' }, h('b', null, '당시 상태'), h('ul', null, sit.state.map(f => h('li', null, f)))) : null,
      sit.currentSummary ? h('div', { class: 'rb-note', style: 'margin-top:8px' }, icon('refresh-cw', 16), h('span', null, `현재 갱신: ${sit.currentSummary}`)) : null,
      (sit.currentState?.length ?? 0) ? h('div', { class: 'rb-mem-facts' }, h('b', null, '최근 상태'), h('ul', null, sit.currentState.map(f => h('li', null, f)))) : null
    ))) : h('div', { class: 'rb-empty' }, '선택한 채팅에는 아직 상황 기록이 없어요.');
  } else {
    const people = Object.values(current.characters ?? {}).sort((a, b) => (b.records?.length ?? 0) - (a.records?.length ?? 0));
    content = people.length ? h('div', { class: 'rb-mem-records' }, people.map(person => h('section', { class: 'rb-card rb-mem-person' },
      h('div', { class: 'rb-mem-record-head' }, h('h3', { class: 'rb-h2', style: 'margin:0' }, person.name), badge(`${person.records?.length ?? 0}개 기록`, 'mute')),
      (person.records ?? []).length ? person.records.slice().reverse().map(record => h('article', { class: 'rb-mem-record' },
        h('div', { class: 'rb-mem-record-head' }, badge(record.grade || 'E', gradeKind[record.grade] ?? 'mute'), h('span', { class: 'rb-muted' }, when(record.createdAt))),
        h('p', { class: 'rb-p', style: 'white-space:pre-wrap' }, record.action)
      )) : h('p', { class: 'rb-muted' }, '아직 행동 기록이 없어요.')
    ))) : h('div', { class: 'rb-empty' }, '선택한 채팅에서 기록할 만한 행동을 아직 찾지 못했어요.');
  }
  const mainPane = h('div', { class: 'rb-section rb-mem-pane rb-scroll' },
    h('div', { class: 'rb-mem-title' },
      h('div', null, h('h2', { class: 'rb-h2' }, title), h('p', { class: 'rb-p' }, desc)),
      h('span', { class: 'rb-muted' }, current ? `${current.charName} / 채팅 ${chatIndex + 1}` : '')
    ),
    statusCard,
    content
  );
  replace(ctx.main, h('div', { class: 'rb-mem-layout' },
    h('aside', { class: 'rb-mem-sidebar' },
      h('h3', { class: 'rb-label', style: 'padding:12px 12px 4px' }, '캐릭터'),
      h('div', { style: 'padding:8px 10px' }, searchInput),
      characterList,
      h('divider', { color: 'var(--rb-line2)' }),
      h('h3', { class: 'rb-label', style: 'padding:12px 12px 4px' }, '채팅 번호'),
      chatList
    ),
    mainPane
  ));
}
export const renderMemory = (ctx) => render(ctx, 'memory');
export const renderSituations = (ctx) => render(ctx, 'situations');
