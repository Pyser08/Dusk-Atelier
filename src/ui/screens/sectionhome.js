// 그룹 개요(기억·관리·작업실, 1.8.3 목업 1): 한 줄 안내 → (기억) 상태 카드 → 목록형 행(이름·한 줄 요약·개수).
// 작업실은 자주 쓰는 둘(프로바이더·AI로 봇 만들기)만 큰 카드, 나머지는 '더 보기' 목록. 위 칩 줄은 숨긴다(app.js rb-on-hub).
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { statusCard } from '../kit.js';
import { TABS, SECTION_NAMES, tabHidden } from '../tabs.js';
import { usageOf, recentOf } from '../../engine/memoryusage.js';
import { dbRead } from '../../data/dbcache.js';

// 목록 줄의 한 줄 요약 (개수는 읽을 수 있을 때만 붙인다)
var LINE = {
  memory: "인물별 기억을 보고 고쳐요", relmap: "인물 관계를 한눈에 봐요", cocoa: "AI에게 줄 추가 지침", cards: "기억을 카드로 묶어 봐요",
  characters: "폴더로 정리하고 에셋·로어북 다듬기", modules: "켜고 끄고 순서 정하기", plugins: "모아 보고 업데이트 확인",
  look: "색·글꼴·메뉴 위치", provider: "키·모델·용도별 설정, 리스 모델 목록에 추가", aibot: "말로 요청해 만들기", personabuilder: "내 페르소나를 AI와 함께", tools: "로어북·에셋 태그 고치기 등", settings: "화면 모드·저장·백업"
};
var BIG = { work: ["provider", "aibot"] };

async function readCounts(ctx, section) {
  const out = {};
  const safe = async (k, f) => { try { const v = await Promise.race([f(), new Promise((r) => setTimeout(() => r(null), 1500))]); if (v !== null && v !== undefined) out[k] = v; } catch { /* 개수 없이 그린다 */ } };
  if (section === "memory" && ctx.memory?.switches) {
    await safe("_mem", async () => {
      const cur = await ctx.memory.switches.currentChat();
      if (!cur) return { cur: null };
      const [sw, folder] = await Promise.all([ctx.memory.switches.state(cur.chaId), ctx.memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null)]);
      const people = Object.values(folder?.people ?? {});
      return { cur, on: !!sw?.memory?.on, total: usageOf(folder).total, people: people.length, recent: recentOf(folder, 4), name: [cur.botName || '이름 없는 봇', cur.chatName ? ` · ${cur.chatName}` : ''].join('') };
    });
    if (out._mem?.cur) { out.memory = `저장 ${out._mem.total}건`; out.relmap = `인물 ${out._mem.people}명`; }
  }
  if (section === "manage") {
    await safe("_db", () => dbRead(ctx.api, ["characters", "modules", "plugins"]));
    const db = out._db;
    delete out._db;
    if (Array.isArray(db?.characters)) out.characters = db.characters.length;
    if (Array.isArray(db?.modules)) out.modules = db.modules.length;
    if (Array.isArray(db?.plugins)) out.plugins = db.plugins.length;
  }
  return out;
}

export async function renderSectionHome(ctx) {
  const section = TABS.find((t) => t.id === ctx.state.tab)?.section;
  const tabs = TABS.filter((t) => t.section === section && !t.id.endsWith('-home') && !tabHidden(t, ctx.prefs.ui) && (!t.dev || ctx.prefs.ui?.devMode));
  const listHost = h('div', { class: 'rb-hub-body' });
  const host = h('div', { class: 'rb-section rb-scroll rb-hub', 'data-section': section ?? '' },
    h('div', { class: 'rb-section-head' },
      // 안내 한 줄은 위쪽 도움말 줄(? 버튼 옆)에 이미 있으므로 여기서는 제목만
      h('h1', { class: 'rb-h2' }, SECTION_NAMES[section] ?? '기능')
    ),
    listHost
  );
  replace(ctx.main, host);
  const token = ctx.state.tab;
  const draw = (counts) => {
    if (section === 'memory') return drawMemory(ctx, listHost, tabs, counts);
    const row = (t) => h('button', { type: 'button', class: 'rb-hubrow', onClick: () => ctx.go(t.id), 'aria-label': t.label, dataset: { tab: t.id } },
      h('span', { class: 'ico' }, icon(t.icon, 20)),
      h('span', { class: 't' }, h('b', null, t.label), h('small', null, [LINE[t.id] ?? t.card ?? '', counts[t.id] !== undefined ? ` · ${counts[t.id]}${typeof counts[t.id] === 'number' ? '개' : ''}` : ''].join(''))),
      h('span', { class: 'go', 'aria-hidden': 'true' }, icon('chevron', 16)));
    const big = (t) => h('button', { type: 'button', class: 'rb-htile rb-section-tile rb-hubbig', onClick: () => ctx.go(t.id), 'aria-label': t.label, dataset: { tab: t.id } },
      h('span', { class: 'ico' }, icon(t.icon, 22)), h('span', { class: 't' }, h('b', null, t.label), h('small', null, LINE[t.id] ?? t.card ?? '')));
    const bigIds = section === 'work' ? (ctx.prefs.ui?.experimental ? ['provider', 'aibot'] : ['look', 'aibot']) : (BIG[section] ?? []);
    const memCard = section === 'memory' && counts._mem ? h('section', { class: 'rb-card bordered rb-hubstat' },
      counts._mem.cur ? statusCard(counts._mem.on ? 'on' : 'off', `이 채팅 · 기억 ${counts._mem.total}건`) : statusCard('off', '채팅을 열면 기억 상태가 보여요.')) : null;
    replace(listHost,
      memCard,
      bigIds.length ? h('div', { class: 'rb-hub-big' }, tabs.filter((t) => bigIds.includes(t.id)).map(big)) : null,
      h('section', { class: 'rb-hub-list' }, h('h2', null, bigIds.length ? '더 보기' : '기능'), h('div', { class: 'rb-card bordered' }, tabs.filter((t) => !bigIds.includes(t.id)).map(row))));
  };
  draw({});
  const counts = await readCounts(ctx, section);
  if (ctx.state.tab === token && host.isConnected) draw(counts);
}

// 2.2.0 기억 개요(6번 안): 상태 줄 → 기능 타일 2×2 → 최근 기록. 타일은 .rb-hubrow를 유지(바로가기·시험 호환).
var MDESC = { memory: "응답마다 인물별 기억을 쌓고 필요할 때 꺼내요.", relmap: "인물 사이 거리·관계를 한눈에 봐요.", cocoa: "정리 노트·기록하기에 붙는 스킬.", cards: "기억을 카드로 만들어 새 봇으로 이어 가요." };
function drawMemory(ctx, listHost, tabs, counts) {
  const m = counts._mem;
  const goAnalyze = () => { ctx.go('memory'); setTimeout(() => ctx.win?.querySelector?.('#rb-mem-analyze')?.scrollIntoView?.({ block: 'center' }), 600); };
  const stat = h('section', { class: ['rb-mhub-stat', 'rb-hubstat', !(m?.cur && m.on) && 'off'] },
    h('span', { class: 'dot', 'aria-hidden': 'true' }),
    m?.cur ? h('span', { class: 'who' }, m.name || '지금 채팅') : null,
    h('span', { class: 'line' }, !m ? '기억 상태를 읽는 중이에요.' : !m.cur ? '채팅을 열면 기억 상태가 보여요.' : `장기 기억 ${m.on ? '사용 중' : '꺼짐'} · 기억 ${m.total}건`),
    m?.cur ? h('button', { type: 'button', class: 'rb-mhub-go', onClick: goAnalyze }, '지난 대화 분석')
      : m ? h('button', { type: 'button', class: 'rb-mhub-go', onClick: () => { if (ctx.state.mem) ctx.state.mem.page = 'bots'; ctx.go('memory'); } }, '다른 채팅 보기') : null);
  const tile = (t) => h('button', { type: 'button', class: ['rb-hubrow', 'rb-mtile', `k-${t.id}`], onClick: () => ctx.go(t.id), 'aria-label': t.label, dataset: { tab: t.id } },
    h('span', { class: 'ico' }, icon(t.icon, 20)),
    h('span', { class: 't' }, h('b', null, t.label), counts[t.id] !== undefined ? h('span', { class: 'chip' }, String(counts[t.id])) : null, h('small', null, MDESC[t.id] ?? LINE[t.id] ?? t.card ?? '')),
    h('span', { class: 'go', 'aria-hidden': 'true' }, icon('chevron', 16)));
  // 최근 기록은 늘 자리를 둔다(채팅이 없거나 아직 없으면 안내 한 줄)
  const rec = h('section', { class: 'rb-mhub-rec' },
    h('div', { class: 'head' }, h('b', null, '최근 기록'), m?.recent?.length ? h('button', { type: 'button', class: 'rb-textlink', onClick: () => ctx.go('memory') }, '전체 보기') : null),
    m?.recent?.length ? h('ul', null, m.recent.map((r) => h('li', null, h('span', { class: 'who' }, r.who), h('span', { class: 't' }, r.act ?? ''))))
      : h('p', { class: 'rb-mhub-empty' }, !m ? '불러오는 중이에요.' : m.cur ? '아직 쌓인 기록이 없어요. 기억을 켜고 대화하면 여기에 모여요.' : '채팅을 열면 그 채팅의 최근 기록이 보여요.'));
  listHost.closest?.('.rb-hub')?.classList.add('rb-mhub');
  replace(listHost, stat, h('div', { class: 'rb-mhub-tiles' }, tabs.map(tile)), rec);
}
