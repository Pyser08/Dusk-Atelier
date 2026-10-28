// 퍼스트 메시지 관리자 (v1.6.7 6단계): 첫 메시지·추가 인사말·그룹 전용 인사말이 많아도 보기·옮기기·고치기 쉽게.
// 왼쪽 목록(번호·첫 줄·글자 수·검색·끌어서 순서) + 오른쪽 편집(읽기↔편집, 일반/코드, 이전/다음, 나란히 비교). 좁은 화면은 목록 → 상세.
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, iconBtn, openMenu, segmented } from '../kit.js';
import { codeEditor } from '../codeedit.js';
import { gripDrag } from '../sortable.js';
import { estimateTokens } from '../../engine/memoryinject.js';
import { KIND_LABEL, toItems, applyToDraft, addItem, duplicateItem, removeItem, restoreItem, moveItem, makeMain, setKind, summary, filterItems, neighbor } from '../../engine/greetings.js';

const CSS = `
.rb-gm{container-type:inline-size;display:flex;flex-direction:column;gap:10px}
.rb-gm-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rb-gm-bar .rb-input{flex:1;min-width:140px;max-width:260px}
.rb-gm-body{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:12px;align-items:start}
.rb-gm-list{display:flex;flex-direction:column;gap:6px;max-height:min(64vh,640px);overflow:auto;padding:2px}
.rb-gm-row{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 6px;border-radius:12px;border:1px solid var(--rb-line2);background:var(--rb-surf);cursor:pointer;min-height:50px;box-sizing:border-box}
.rb-gm-row[aria-selected=true]{border-color:var(--rb-sel-ring);background:var(--rb-sel-bg)}
.rb-gm-row .grip{flex:none;width:22px;height:30px;display:flex;align-items:center;justify-content:center;color:var(--rb-sub);cursor:grab;touch-action:none}
.rb-gm-row .num{flex:none;min-width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:var(--rb-surf2);color:var(--rb-sub)}
.rb-gm-row[data-kind=main] .num{background:var(--rb-acc-grad,var(--rb-sel-bg));color:var(--rb-acc-text)}
.rb-gm-row .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rb-gm-row .sum{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-gm-row .meta{font-size:11px;color:var(--rb-sub);display:flex;gap:6px;align-items:center}
.rb-gm-row .tag{padding:0 6px;border-radius:6px;background:var(--rb-surf2);font-size:11px}
.rb-gm-edit{display:flex;flex-direction:column;gap:10px;min-width:0}
.rb-gm-cmp{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.rb-gm-cmp.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.rb-gm-pane{display:flex;flex-direction:column;gap:6px;min-width:0;border:1px solid var(--rb-line2);border-radius:14px;padding:10px;background:var(--rb-surf)}
.rb-gm-ph{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.rb-gm-ph b{font-size:13px}
.rb-gm-read{white-space:pre-wrap;word-break:break-word;line-height:1.7;font-size:14px;min-height:120px;max-height:70vh;overflow:auto;padding:8px 10px;border-radius:10px;background:var(--rb-surf2)}
.rb-gm-foot{font-size:12px;color:var(--rb-sub);text-align:right}
.rb-gm-back{display:none}
.rb-gm-empty{padding:20px;text-align:center;color:var(--rb-sub);font-size:13px;border:1px dashed var(--rb-line2);border-radius:12px}
@container (max-width:680px){
  .rb-gm-body{grid-template-columns:minmax(0,1fr)}
  .rb-gm:not(.m-detail) .rb-gm-edit{display:none}
  .rb-gm.m-detail .rb-gm-listwrap{display:none}
  .rb-gm-back{display:inline-flex}
  .rb-gm-cmp.two{grid-template-columns:minmax(0,1fr)}
  .rb-gm-list{max-height:56vh}
}`;

let uidN = 0;
const uid = () => `gm${++uidN}`;

export function createGreetingManager(ctx, { draft, changed, ui = {}, onArea }) {
  if (!document.getElementById('rb-gm-style')) document.head.appendChild(h('style', { id: 'rb-gm-style' }, CSS));
  const hadGroup = Array.isArray(draft.groupOnlyGreetings);
  let items = toItems(draft, uid);
  let selId = items[Math.min(ui.sel ?? 0, items.length - 1)]?.id ?? items[0].id;
  let q = ui.q ?? '', view = ui.view ?? 'edit', cmpId = null, compare = false;
  let mode = ctx.prefs?.ui?.textMode === 'code' ? 'code' : 'text';
  const trash = [];
  const root = h('div', { class: 'rb-gm' });
  const listEl = h('div', { class: 'rb-gm-list', role: 'listbox', 'aria-label': '인사말 목록' });
  const editEl = h('div', { class: 'rb-gm-edit' });
  const trashB = btn('삭제 취소', { size: 'sm', icon: 'undo', onClick: () => undoDelete() });
  const search = h('input', { class: 'rb-input', type: 'search', placeholder: '인사말 검색', 'aria-label': '인사말 검색', value: q, autocomplete: 'off' });
  const idxOf = (id) => items.findIndex((x) => x.id === id);
  const sel = () => items.find((x) => x.id === selId) ?? items[0];
  const num = (it) => it.kind === 'main' ? '★' : String(items.filter((x) => x.kind !== 'group').indexOf(it)) ;
  const label = (it) => it.kind === 'group' ? `그룹 ${items.filter((x) => x.kind === 'group').indexOf(it) + 1}` : num(it);

  const sync = () => { applyToDraft(draft, items, hadGroup); changed(); };
  const remember = () => { ui.sel = idxOf(selId); ui.q = q; ui.view = view; };

  function select(id, { detail = false, focus = false } = {}) {
    selId = id;
    if (compare && cmpId === id) cmpId = null;
    remember();
    if (detail) root.classList.add('m-detail'); // 보이게 한 다음에 그려야 포커스가 잡힌다(좁은 화면)
    paintList();
    paintEdit(focus);
    onArea?.('greeting');
  }
  function rowMenu(it, anchor) {
    openMenu(ctx.win, anchor, [
      { label: '복제', icon: 'plus', onClick: () => { const r = duplicateItem(items, it.id, uid); items = r.items; sync(); select(r.added.id); } },
      it.kind === 'alt' ? { label: '대표 인사말로 지정', icon: 'check', onClick: () => { items = makeMain(items, it.id); sync(); select(it.id); } } : null,
      it.kind === 'alt' ? { label: '그룹 전용으로 옮기기', icon: 'folder', onClick: () => { items = setKind(items, it.id, 'group'); sync(); select(it.id); } } : null,
      it.kind === 'group' ? { label: '일반 추가 인사말로 옮기기', icon: 'folder', onClick: () => { items = setKind(items, it.id, 'alt'); sync(); select(it.id); } } : null,
      it.kind !== 'main' ? 'sep' : null,
      it.kind !== 'main' ? { label: '삭제', icon: 'trash', danger: true, onClick: () => del(it.id) } : null
    ]);
  }
  function del(id) {
    const r = removeItem(items, id);
    if (!r.removed) return ctx.toast('대표 인사말은 지울 수 없어요. 다른 인사말을 대표로 지정한 뒤 지워요.');
    const nb = neighbor(items, id, items[idxOf(id) + 1] ? 1 : -1);
    trash.push({ removed: r.removed, at: r.at });
    items = r.items;
    sync();
    if (cmpId === id) cmpId = null;
    select(nb === id ? items[0].id : nb);
    ctx.toast('지웠어요 — [삭제 취소]로 되돌릴 수 있어요');
  }
  function undoDelete() {
    const t = trash.pop();
    if (!t) return;
    items = restoreItem(items, t.removed, t.at);
    sync();
    select(t.removed.id);
  }
  function add(kind) {
    const r = addItem(items, uid, kind, '');
    items = r.items;
    q = ''; search.value = '';
    sync();
    select(r.added.id, { detail: true, focus: true });
  }

  function paintList() {
    const shown = filterItems(items, q);
    trashB.style.display = trash.length ? '' : 'none';
    replace(listEl, shown.length ? shown.map((it) => {
      const grip = it.kind === 'main' ? h('span', { class: 'grip', 'aria-hidden': 'true', style: 'opacity:.25;cursor:default' }, icon('grip', 16)) : h('span', { class: 'grip', title: '끌어서 순서를 바꿔요', 'aria-hidden': 'true' }, icon('grip', 16));
      const more = iconBtn('more', `인사말 ${label(it)} 메뉴`, { onClick: (ev) => { ev.stopPropagation(); rowMenu(it, ev.currentTarget); } });
      const row = h('div', { class: 'rb-gm-row', role: 'option', tabindex: '0', 'aria-selected': String(it.id === selId), dataset: { kind: it.kind, id: it.id }, 'data-drop-row': it.id },
        grip,
        h('span', { class: 'num' }, label(it)),
        h('div', { class: 'txt' }, h('span', { class: 'sum' }, summary(it.text)), h('span', { class: 'meta' }, it.kind === 'main' ? h('span', { class: 'tag' }, '대표') : it.kind === 'group' ? h('span', { class: 'tag' }, '그룹 전용') : null, `${it.text.length.toLocaleString()}자`)),
        more);
      row.addEventListener('click', () => select(it.id, { detail: true }));
      row.addEventListener('keydown', (ev) => { if (ev.target === row && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); select(it.id, { detail: true, focus: true }); } });
      if (it.kind !== 'main') gripDrag({ grip, row, root: listEl, scroller: listEl, onDrop: ({ beforeId, after }) => { if (!beforeId) return; items = moveItem(items, it.id, beforeId, after); sync(); paintList(); } });
      return row;
    }) : h('div', { class: 'rb-gm-empty' }, q ? '검색 결과가 없어요' : '인사말이 없어요'));
    listEl.querySelector('[aria-selected=true]')?.scrollIntoView?.({ block: 'nearest' });
  }
  // 줄 하나만 다시 그려 글자를 칠 때 목록이 깜빡이지 않게 한다
  function touchRow(it) {
    const row = listEl.querySelector(`[data-id="${it.id}"]`);
    if (!row) return;
    row.querySelector('.sum').textContent = summary(it.text);
    const meta = row.querySelector('.meta');
    meta.lastChild.textContent = `${it.text.length.toLocaleString()}자`;
  }

  function editor(it, { tall }) {
    const foot = h('div', { class: 'rb-gm-foot', 'aria-live': 'polite' });
    const upd = () => { foot.textContent = `약 ${estimateTokens(it.text).toLocaleString()} 토큰 (추정) · ${it.text.length.toLocaleString()}자`; };
    upd();
    if (view === 'read') return h('div', null, h('div', { class: 'rb-gm-read' }, it.text || '(비어 있어요)'), foot);
    const ed = codeEditor(it.text, {
      lang: 'text', label: `인사말 ${label(it)}`, tab: '\t', gutter: mode === 'code', wrap: true, prose: mode !== 'code',
      minHeight: tall ? 'max(280px,42vh)' : '200px', maxHeight: '70vh',
      onChange: (v) => { it.text = v; sync(); touchRow(it); upd(); }
    });
    return h('div', null, ed.el, foot);
  }
  function pane(it, { second = false, tall = true } = {}) {
    const pick = compare ? h('select', { class: 'rb-input', 'aria-label': second ? '비교할 인사말' : '왼쪽 인사말', style: 'flex:1;min-width:120px;height:34px', onChange: (ev) => { const v = ev.target.value; if (second) { cmpId = v; paintEdit(); } else select(v); } },
      items.filter((x) => second ? x.id !== selId : x.id !== cmpId).map((x) => h('option', { value: x.id, selected: x.id === it.id }, `${label(x)} · ${summary(x.text, 20)}`))) : null;
    return h('div', { class: 'rb-gm-pane' },
      h('div', { class: 'rb-gm-ph' }, pick ?? h('b', null, `인사말 ${label(it)}`), it.kind === 'main' ? h('span', { class: 'rb-chip', style: 'height:22px;padding:0 8px;font-size:11px;cursor:default' }, KIND_LABEL.main) : it.kind === 'group' ? h('span', { class: 'rb-chip', style: 'height:22px;padding:0 8px;font-size:11px;cursor:default' }, KIND_LABEL.group) : null),
      editor(it, { tall }));
  }
  function paintEdit(focus = false) {
    const it = sel();
    const i = idxOf(it.id);
    const prev = iconBtn('up', '이전 인사말 (Alt+↑)', { boxed: true, onClick: () => select(neighbor(items, selId, -1)) });
    const next = iconBtn('down', '다음 인사말 (Alt+↓)', { boxed: true, onClick: () => select(neighbor(items, selId, 1)) });
    prev.disabled = i <= 0; next.disabled = i >= items.length - 1;
    const viewSeg = segmented([['edit', '편집'], ['read', '읽기']], view, (v) => { view = v; remember(); paintEdit(); }, '보기 방식');
    const modeSeg = segmented([['text', '일반'], ['code', '코드']], mode, (v) => { if (v === mode) return; mode = v; ctx.prefs?.saveUi?.({ textMode: v })?.catch?.(() => {}); paintEdit(); }, '입력 모드');
    viewSeg.style.width = '130px'; modeSeg.style.width = '130px';
    if (compare && !cmpId) cmpId = neighbor(items, selId, 1) !== selId ? neighbor(items, selId, 1) : neighbor(items, selId, -1);
    const two = compare && cmpId && cmpId !== selId && items.some((x) => x.id === cmpId);
    const backB = btn('목록', { size: 'sm', icon: 'back', onClick: () => root.classList.remove('m-detail') });
    backB.classList.add('rb-gm-back');
    replace(editEl,
      h('div', { class: 'rb-gm-ph' },
        backB,
        h('b', { style: 'flex:1;min-width:0' }, `${i + 1} / ${items.length}`),
        prev, next, viewSeg, view === 'edit' ? modeSeg : null,
        btn(compare ? '비교 끄기' : '나란히 비교', { size: 'sm', icon: 'split', onClick: () => { compare = !compare; if (!compare) cmpId = null; paintEdit(); } })),
      h('div', { class: ['rb-gm-cmp', two && 'two'] }, pane(it, { tall: !two }), two ? pane(items.find((x) => x.id === cmpId), { second: true, tall: false }) : null));
    if (focus) editEl.querySelector('textarea')?.focus();
  }

  search.addEventListener('input', () => { q = search.value; remember(); paintList(); });
  root.addEventListener('keydown', (ev) => {
    if (ev.altKey && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
      ev.preventDefault();
      const id = neighbor(items, selId, ev.key === 'ArrowUp' ? -1 : 1);
      if (id && id !== selId) select(id, { detail: root.classList.contains('m-detail'), focus: true });
    }
  });
  root.addEventListener('focusin', () => onArea?.('greeting'));
  const addB = btn('인사말 추가', { size: 'sm', icon: 'plus', onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
    { label: '추가 인사말', icon: 'plus', onClick: () => add('alt') },
    { label: '그룹 전용 인사말', icon: 'folder', onClick: () => add('group') }
  ]) });
  root.append(
    h('div', { class: 'rb-gm-bar' }, search, addB, trashB),
    h('div', { class: 'rb-gm-body' }, h('div', { class: 'rb-gm-listwrap' }, listEl), editEl));
  paintList();
  paintEdit();
  return { el: root, get items() { return items; } };
}
