// 봇·모듈 편집기 '정보' 탭이 같이 쓰는 요약 카드·접는 카드 스타일 (v1.6.9: 모듈도 봇과 같은 모양)
import { h } from '../dom.js';
import { icon } from '../icons.js';

export var INFO_CSS = `
.rb-info{display:flex;flex-direction:column;gap:12px}
.rb-info-sum{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;padding:14px 16px;border-radius:16px;border:1px solid var(--rb-line2);background:var(--rb-surf)}
.rb-info-name{font-size:18px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-info-tags{display:flex;flex-wrap:wrap;gap:6px}
.rb-info-stats{display:flex;flex-wrap:wrap;gap:8px}
.rb-info-stat{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px;padding:8px 12px;border-radius:12px;border:1px solid var(--rb-line2);background:var(--rb-surf2);color:var(--rb-text);font:inherit;cursor:pointer}
.rb-info-stat:disabled{cursor:default;opacity:1}
.rb-info-stat b{font-size:16px}
.rb-info-stat span{font-size:11px;color:var(--rb-sub)}
@media (hover:hover){.rb-info-stat:not(:disabled):hover{border-color:var(--rb-sel-ring);background:var(--rb-sel-bg)}}
.rb-info-card{border-radius:16px;border:1px solid var(--rb-line2);background:var(--rb-surf)}
.rb-info-card>summary{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;list-style:none;min-height:24px}
.rb-info-card>summary::-webkit-details-marker{display:none}
.rb-info-card>summary .t{font-weight:700;font-size:15px}
.rb-info-card>summary .h{flex:1;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-info-card>summary svg{flex:none;transition:transform .15s}
.rb-info-card[open]>summary svg{transform:rotate(180deg)}
.rb-info-body{padding:4px 16px 16px;display:flex;flex-direction:column;gap:12px}
@media (prefers-reduced-motion:reduce){.rb-info-card>summary svg{transition:none}}
`;

export function ensureInfoStyle() {
  if (!document.getElementById('rb-info-style')) document.head.appendChild(h('style', { id: 'rb-info-style' }, INFO_CSS));
}
// 위쪽 숫자 칸: 탭 이름을 주면 눌러서 그 탭으로 간다
export const infoStat = (goTab, label, valueEl, tab, title) => h('button', { type: 'button', class: 'rb-info-stat', title, 'aria-label': `${label} ${valueEl.textContent}${tab ? ' — 눌러서 열기' : ''}`, onClick: () => tab && goTab(tab), disabled: !tab }, h('b', null, valueEl), h('span', null, label));
// 접는 카드: 열림 상태는 ui.open에 기억한다
export function infoCard(ui, key, title, hint, setHelp, ...kids) {
  const d = h('details', { class: 'rb-info-card' },
    h('summary', null, h('span', { class: 't' }, title), h('span', { class: 'rb-muted h' }, hint), icon('down', 16)),
    h('div', { class: 'rb-info-body' }, ...kids));
  d.open = !!ui.open[key];
  d.addEventListener('toggle', () => { ui.open[key] = d.open; });
  d.querySelector('summary').addEventListener('click', () => setHelp?.(key));
  return d;
}
