// 그룹 개요(기억·관리·작업실, 1.8.3 목업 1): 한 줄 안내 → (기억) 상태 카드 → 목록형 행(이름·한 줄 요약·개수).
// 작업실은 자주 쓰는 둘(플러그인 꾸미기·AI로 봇 만들기)만 큰 카드, 나머지는 '더 보기' 목록. 위 칩 줄은 숨긴다(app.js rb-on-hub).
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { statusCard } from '../kit.js';
import { TABS, SECTION_NAMES } from '../tabs.js';
import { usageOf } from '../../engine/memoryusage.js';
import { dbRead } from '../../data/dbcache.js';

// 목록 줄의 한 줄 요약 (개수는 읽을 수 있을 때만 붙인다)
var LINE = {
  memory: "인물별 기억을 보고 고쳐요", relmap: "인물 관계를 한눈에 봐요", cocoa: "AI에게 줄 추가 지침", cards: "기억을 카드로 묶어 봐요",
  characters: "폴더로 정리하고 에셋·로어북 다듬기", modules: "켜고 끄고 순서 정하기", plugins: "모아 보고 업데이트 확인",
  look: "색·글꼴·메뉴 위치", aibot: "말로 요청해 만들기", personabuilder: "내 페르소나를 AI와 함께", tools: "로어북·에셋 태그 고치기 등", settings: "화면 모드·저장·백업"
};
var BIG = { work: ["look", "aibot"] };

async function readCounts(ctx, section) {
  const out = {};
  const safe = async (k, f) => { try { const v = await Promise.race([f(), new Promise((r) => setTimeout(() => r(null), 1500))]); if (v !== null && v !== undefined) out[k] = v; } catch { /* 개수 없이 그린다 */ } };
  if (section === "memory" && ctx.memory?.switches) {
    await safe("_mem", async () => {
      const cur = await ctx.memory.switches.currentChat();
      if (!cur) return { cur: null };
      const [sw, folder] = await Promise.all([ctx.memory.switches.state(cur.chaId), ctx.memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null)]);
      return { cur, on: !!sw?.memory?.on, total: usageOf(folder).total };
    });
    if (out._mem?.cur) out.memory = `${out._mem.total}건`;
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
  const tabs = TABS.filter((t) => t.section === section && !t.id.endsWith('-home') && (!t.dev || ctx.prefs.ui?.devMode));
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
    const row = (t) => h('button', { type: 'button', class: 'rb-hubrow', onClick: () => ctx.go(t.id), 'aria-label': t.label, dataset: { tab: t.id } },
      h('span', { class: 'ico' }, icon(t.icon, 20)),
      h('span', { class: 't' }, h('b', null, t.label), h('small', null, [LINE[t.id] ?? t.card ?? '', counts[t.id] !== undefined ? ` · ${counts[t.id]}${typeof counts[t.id] === 'number' ? '개' : ''}` : ''].join(''))),
      h('span', { class: 'go', 'aria-hidden': 'true' }, icon('chevron', 16)));
    const big = (t) => h('button', { type: 'button', class: 'rb-htile rb-section-tile rb-hubbig', onClick: () => ctx.go(t.id), 'aria-label': t.label, dataset: { tab: t.id } },
      h('span', { class: 'ico' }, icon(t.icon, 22)), h('span', { class: 't' }, h('b', null, t.label), h('small', null, LINE[t.id] ?? t.card ?? '')));
    const bigIds = BIG[section] ?? [];
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
