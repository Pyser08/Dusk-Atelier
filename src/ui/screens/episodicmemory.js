import { loadEpisodicMemory, MEMORY_GRADES } from '../../data/episodicmemory.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn } from '../kit.js';

const gradeKind = { E: 'mute', D: 'mute', C: 'acc2', B: 'acc', A: 'warn', S: 'danger' };
const when = (t) => t ? new Date(t).toLocaleString() : '시간 정보 없음';
const totalRecords = (folder) => Object.values(folder?.characters ?? {}).reduce((n, c) => n + (c.records?.length ?? 0), 0);
const foldersOf = (data) => Object.values(data.folders ?? {}).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

async function render(ctx, mode) {
  const state = ctx.state;
  const data = await loadEpisodicMemory(ctx.api);
  const folders = foldersOf(data);
  const key = state.memoryFolder && data.folders[state.memoryFolder] ? state.memoryFolder : folders[0]?.id ?? '';
  state.memoryFolder = key;
  const current = data.folders[key] ?? null;
  const isSituations = mode === 'situations';
  const title = isSituations ? '상황 기록' : '인물별 기억';
  const desc = isSituations
    ? '장면이 바뀔 때마다 저장된 상황과 현재 상태를 확인해요.'
    : '보조 모델이 선별한 행동 기록과 중요도 등급을 확인해요.';
  const status = data.status ?? {};
  const picker = h('div', { class: 'rb-mem-folders' },
    folders.length ? folders.map(folder => h('button', {
      type: 'button',
      class: ['rb-row', folder.id === key && 'is-active'],
      'aria-pressed': folder.id === key ? 'true' : 'false',
      onClick: () => { state.memoryFolder = folder.id; render(ctx, mode).catch(() => {}); }
    },
      h('span', { style: 'color:var(--rb-acc-text);display:flex;align-items:center' }, icon('folder', 18)),
      h('span', { class: 'txt' },
        h('span', { class: 'name' }, folder.charName || '이름 없는 봇'),
        h('span', { class: 'meta' }, folder.chatName || '이름 없는 채팅'),
        h('span', { class: 'meta' }, `${Object.keys(folder.characters ?? {}).length}명 · ${totalRecords(folder)}개 행동 · ${folder.situations?.length ?? 0}개 상황`)
      )
    )) : h('div', { class: 'rb-empty', style: 'padding:20px 8px' }, '아직 저장된 채팅 폴더가 없어요.')
  );
  const analyze = btn('현재 채팅 분석', {
    kind: 'primary', icon: 'sparkles',
    onClick: async () => {
      try {
        if (!ctx.episodicMemory?.analyzeCurrent) throw new Error('분석 기능이 초기화되지 않았어요.');
        await ctx.episodicMemory.analyzeCurrent();
        ctx.toast('현재 채팅 분석이 끝났어요.');
        await render(ctx, mode);
      } catch (e) {
        ctx.toast(`분석 실패: ${e?.message ?? e}`, { error: true, seconds: 8 });
        await render(ctx, mode);
      }
    }
  });
  const statusText = status.hook === 'ready' ? '자동 분석 연결됨' : status.hook === 'unavailable' ? '출력 훅을 사용할 수 없음' : status.hook === 'error' ? '출력 훅 초기화 실패' : '자동 분석 초기화 중';
  const statusCard = h('div', { class: 'rb-card', style: 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px' },
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
    content = h('div', { class: 'rb-empty', style: 'margin:auto;max-width:460px' },
      h('div', { style: 'color:var(--rb-acc-text);display:flex;justify-content:center;margin-bottom:12px' }, icon(isSituations ? 'map' : 'brain', 32)),
      h('h2', { class: 'rb-h2' }, '기록이 아직 없어요'),
      h('p', { class: 'rb-p' }, '현재 채팅 분석을 눌러 마지막 AI 응답을 시험하거나, 새 대화를 생성해 자동 기록을 확인하세요.')
    );
  } else if (isSituations) {
    const situations = [...(current.situations ?? [])].reverse();
    content = situations.length ? h('div', { class: 'rb-mem-records' }, situations.map((sit, i) => h('article', { class: 'rb-card rb-mem-record' },
      h('div', { class: 'rb-mem-record-head' },
        h('b', null, `상황 ${situations.length - i}`),
        badge(when(sit.createdAt), 'mute')
      ),
      h('p', { class: 'rb-p', style: 'white-space:pre-wrap' }, sit.summary || '요약 없음'),
      (sit.state?.length ?? 0) ? h('div', { class: 'rb-mem-facts' }, h('b', null, '당시 상태'), h('ul', null, sit.state.map(f => h('li', null, f)))) : null,
      sit.currentSummary ? h('div', { class: 'rb-note', style: 'margin-top:8px' }, icon('refresh-cw', 16), h('span', null, `현재 갱신: ${sit.currentSummary}`)) : null,
      (sit.currentState?.length ?? 0) ? h('div', { class: 'rb-mem-facts' }, h('b', null, '최근 상태'), h('ul', null, sit.currentState.map(f => h('li', null, f)))) : null,
      h('div', { class: 'rb-muted' }, `ID: ${sit.id}`)
    ))) : h('div', { class: 'rb-empty' }, '이 채팅에는 아직 상황 스냅샷이 없어요.');
  } else {
    const people = Object.values(current.characters ?? {}).sort((a, b) => (b.records?.length ?? 0) - (a.records?.length ?? 0));
    content = people.length ? h('div', { class: 'rb-mem-records' }, people.map(person => h('section', { class: 'rb-card rb-mem-person' },
      h('div', { class: 'rb-mem-record-head' },
        h('h3', { class: 'rb-h2', style: 'margin:0' }, person.name),
        badge(`${person.records?.length ?? 0}개 기록`, 'mute')
      ),
      (person.records ?? []).length ? person.records.slice().reverse().map(record => h('article', { class: 'rb-mem-record' },
        h('div', { class: 'rb-mem-record-head' },
          badge(record.grade || 'E', gradeKind[record.grade] ?? 'mute'),
          h('span', { class: 'rb-muted' }, when(record.createdAt))
        ),
        h('p', { class: 'rb-p', style: 'white-space:pre-wrap' }, record.action),
        record.situationId ? h('div', { class: 'rb-muted' }, `상황 연결: ${record.situationId}`) : null
      )) : h('p', { class: 'rb-muted' }, '아직 행동 기록이 없어요.')
    ))) : h('div', { class: 'rb-empty' }, '이 채팅에서 기록할 인물을 아직 찾지 못했어요.');
  }
  const mainPane = h('div', { class: 'rb-section rb-mem-pane rb-scroll' },
    h('div', { class: 'rb-mem-title' },
      h('div', null, h('h2', { class: 'rb-h2' }, title), h('p', { class: 'rb-p' }, desc)),
      h('span', { class: 'rb-muted' }, current ? `${current.charName} / ${current.chatName}` : '')
    ),
    statusCard,
    content
  );
  replace(ctx.main, h('div', { class: 'rb-mem-layout' },
    h('aside', { class: 'rb-mem-sidebar' },
      h('h3', { class: 'rb-label', style: 'padding:12px 12px 4px' }, '채팅 폴더'),
      picker
    ),
    mainPane
  ));
}
export const renderMemory = (ctx) => render(ctx, 'memory');
export const renderSituations = (ctx) => render(ctx, 'situations');
