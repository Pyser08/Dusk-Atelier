// 2.2.0 작업실 개요(3번 목업 C 보강 + D): 하는 일별 묶음 4개(상태·확인할 점) → 최근 연 것 · 고정.
// 줄은 .rb-hubrow[data-tab]을 유지(바로가기·시험 호환). 상태는 읽을 수 있을 때만 붙인다.
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { glassTheme } from '../glassthemes.js';
import { summarize, budgetState } from '../../engine/provider/cost.js';

export var WORK_GROUPS = [
  { k: 'make', label: '만들기', desc: '새 봇·페르소나', icon: 'sparkle', ids: ['aibot', 'personabuilder'] },
  { k: 'look', label: '꾸미기', desc: 'Dusk와 리스 모양', icon: 'palette', ids: ['look', 'stealth'] },
  { k: 'link', label: '연결', desc: 'AI 모델과 설정', icon: 'network', ids: ['provider', 'settings'] },
  { k: 'fix', label: '손보기', desc: '백업·용량·기록', icon: 'tools', ids: ['tools', 'dev'] }
];
var LINE = { aibot: '말로 요청해 새 봇 만들기', personabuilder: '양식과 AI로 페르소나', look: '색·글꼴·메뉴 위치', stealth: '리스를 다른 AI 앱처럼',
  provider: '키·모델·용도별 설정', settings: '화면 모드·백업·업데이트', tools: '프리셋·로어북 로그·용량 측정', dev: '점검과 릴리즈 (개발자 모드)' };

// 최근 연 화면 기록(app.js noteVisit에서 부름): 개요·홈은 빼고 최근 8개
export function pushRecent(list, id, now = Date.now()) {
  if (!id || id === 'home' || id.endsWith('-home')) return list ?? [];
  return [{ id, t: now }, ...(list ?? []).filter((r) => r?.id !== id)].slice(0, 8);
}
export function togglePin(list, id) {
  const have = Array.isArray(list) ? list : [];
  return have.includes(id) ? have.filter((x) => x !== id) : [...have, id].slice(-8);
}
var ago = (t, now = Date.now()) => {
  const m = Math.round((now - t) / 6e4);
  return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`;
};

async function readStatus(ctx) {
  const st = {};
  const g = glassTheme(ctx.prefs.ui?.theme?.gtheme);
  st.look = { line: g ? g.name : '내 강조색', dot: g ? `linear-gradient(135deg,${g.acc},${g.acc2})` : null };
  const p = ctx.provider;
  if (p?.store) {
    try {
      const [cfg, log] = await Promise.race([Promise.all([p.store.get(), p.store.usage()]), new Promise((r) => setTimeout(() => r([null, null]), 1500))]);
      if (cfg) {
        const sum = summarize(log ?? []);
        const b = budgetState(sum, cfg.budget);
        const lim = cfg.budget?.monthlyUsd || 0;
        st.provider = { line: `${cfg.enabled ? '켜짐' : '꺼짐'} · 연결 ${cfg.connections.length} · 프로필 ${cfg.profiles.length}`, month: sum.total.month, lim, warn: b.state !== 'ok' ? b.why : !cfg.connections.length ? '연결이 없어요' : '' };
      }
    } catch { /* 상태 없이 그린다 */ }
  }
  return st;
}

export function drawWork(ctx, listHost, tabs) {
  const byId = Object.fromEntries(tabs.map((t) => [t.id, t]));
  listHost.closest?.('.rb-hub')?.classList.add('rb-whub');
  const pins = () => (ctx.prefs.ui?.workPins ?? []).filter((id) => byId[id]);
  const savePins = (next) => { if (ctx.prefs.ui) ctx.prefs.ui.workPins = next; ctx.prefs.saveUi?.({ workPins: next })?.catch?.(() => {}); paint(); };
  let st = {};
  const row = (t, sub, extra) => h('div', { class: 'rb-wrow' },
    h('button', { type: 'button', class: 'rb-hubrow', onClick: () => ctx.go(t.id), 'aria-label': t.label, dataset: { tab: t.id } },
      h('span', { class: 'ico' }, icon(t.icon, 18)),
      h('span', { class: 't' }, h('b', null, t.label), h('small', null, sub ?? LINE[t.id] ?? t.card ?? ''))),
    extra ?? null,
    h('button', { type: 'button', class: ['rb-wpin', pins().includes(t.id) && 'on'], 'aria-label': pins().includes(t.id) ? `${t.label} 고정 풀기` : `${t.label} 고정`, title: '고정', onClick: () => savePins(togglePin(ctx.prefs.ui?.workPins, t.id)) }, icon('pin', 14)));
  const meter = (used, lim) => h('span', { class: 'rb-wmeter', title: `$${used.toFixed(2)} / $${lim}` }, h('i', { style: `width:${Math.min(100, Math.round(used / lim * 100))}%` }));
  const paint = () => {
    const groups = WORK_GROUPS.map((g) => ({ ...g, list: g.ids.map((id) => byId[id]).filter(Boolean) })).filter((g) => g.list.length);
    // 묶음에 없는 작업실 탭(애드온이 더한 것 등)은 손보기 끝에 붙인다
    const known = new Set(WORK_GROUPS.flatMap((g) => g.ids));
    const rest = tabs.filter((t) => !known.has(t.id));
    if (rest.length) (groups.find((g) => g.k === 'fix') ?? groups[groups.length - 1])?.list.push(...rest);
    const card = (g) => {
      const warn = g.k === 'link' && st.provider?.warn ? st.provider.warn : '';
      return h('section', { class: ['rb-wgroup', `k-${g.k}`] },
        h('div', { class: 'hd' }, h('span', { class: 'ico' }, icon(g.icon, 20)), h('span', { class: 't' }, h('b', null, g.label), h('small', null, g.desc)), warn ? h('span', { class: 'rb-wwarn' }, warn) : null),
        ...g.list.map((t) => {
          if (t.id === 'provider' && st.provider) return row(t, st.provider.line, st.provider.lim > 0 ? meter(st.provider.month, st.provider.lim) : null);
          if (t.id === 'look' && st.look) return row(t, st.look.line, st.look.dot ? h('span', { class: 'rb-wdot', style: `background:${st.look.dot}`, 'aria-hidden': 'true' }) : null);
          return row(t);
        }));
    };
    const recent = (ctx.prefs.ui?.recentTabs ?? []).filter((r) => byId[r.id]).slice(0, 4);
    const pinned = pins();
    replace(listHost,
      h('div', { class: 'rb-wgroups' }, groups.map(card)),
      h('div', { class: 'rb-wside' },
        h('section', { class: 'rb-wgroup k-recent' },
          h('div', { class: 'hd' }, h('span', { class: 'ico' }, icon('clock', 20)), h('span', { class: 't' }, h('b', null, '최근 연 것'))),
          recent.length ? recent.map((r) => row(byId[r.id], ago(r.t))) : h('p', { class: 'rb-wempty' }, '작업실 기능을 열면 여기에 모여요.')),
        h('section', { class: 'rb-wgroup k-pin' },
          h('div', { class: 'hd' }, h('span', { class: 'ico' }, icon('pin', 20)), h('span', { class: 't' }, h('b', null, '고정'), h('small', null, '줄 오른쪽 핀으로 고정하거나 풀어요'))),
          pinned.length ? pinned.map((id) => row(byId[id])) : h('p', { class: 'rb-wempty' }, '자주 여는 기능을 고정해 두세요.'))));
  };
  paint();
  readStatus(ctx).then((s) => { st = s; if (listHost.isConnected) paint(); }).catch(() => {});
}
