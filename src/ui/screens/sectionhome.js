// 그룹 개요: 해당 그룹에 속한 기능으로 이동하는 바로가기.
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { TABS, SECTION_NAMES } from '../tabs.js';

export function renderSectionHome(ctx) {
  const section = TABS.find((t) => t.id === ctx.state.tab)?.section;
  const tabs = TABS.filter((t) => t.section === section && !t.id.endsWith('-home') && (!t.dev || ctx.prefs.ui?.devMode));
  const host = h('div', { class: 'rb-section rb-scroll' },
    h('div', { class: 'rb-section-head' },
      h('h1', { class: 'rb-h2' }, SECTION_NAMES[section] ?? '기능'),
      h('p', { class: 'rb-p' }, '원하는 기능을 선택해 바로 이동하세요.')
    ),
    h('div', { class: 'rb-hgrid rb-section-links' },
      ...tabs.map((t) => h('button', {
        type: 'button', class: 'rb-htile rb-section-tile', onClick: () => ctx.go(t.id),
        'aria-label': t.label
      }, h('span', { class: 'ico' }, icon(t.icon, 22)),
      h('span', { class: 't' }, h('b', null, t.label), t.card ? h('small', null, t.card) : null)))
    )
  );
  replace(ctx.main, host);
}
