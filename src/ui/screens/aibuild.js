// AI로 제작 팝업(우측 하단). v1.6.7 2단계: 요청 → 수정안 카드 → 적용하면 편집기 탭에 바로 반영.
// 5단계: PC는 머리글을 끌어 옮기고 모서리를 끌어 크기를 바꾸며(위치·크기 기억), 좁은 화면은 아래 시트로 열린다.
// 열어 둔 채 탭을 바꿔도 유지되고, 보고 있는 탭에 맞춰 작업 종류를 자동으로 고른다.
import { h, replace } from '../dom.js';
import { btn, iconBtn, note, segmented } from '../kit.js';
import { LOREREQ_CSS } from '../lorereq-css.js';
import { getFix, onFix, clearFix, setFixText, locate, replaceIn, addRewrite, rewrites } from '../aifix.js';

const AREA = { name: '이름', desc: '설명', personality: '성격', scenario: '시나리오', firstMessage: '첫 메시지', defaultVariables: '변수', globalLore: '로어북', customscript: '정규식', triggerscript: '트리거', systemPrompt: '시스템', exampleMessage: '예시 대화', postHistoryInstructions: '후속 지시', creatorNotes: '제작자 노트' };
const STATE_LABEL = { ok: '적용할 수 있어요', applied: '적용함', discarded: '버림', stale: '원고가 바뀌어 쓸 수 없어요' };

const KIND = { affiliation: '소속', folder: '폴더', place: '장소', entry: '항목' };


// ── 위치·크기 기억 (pluginStorage, 실패해도 무시) ──
const GEOM_KEY = 'da_aibuild:popupgeom';
let geomCache = null;
export async function loadPopupGeom(ctx) {
  if (geomCache) return geomCache;
  try { const raw = await ctx.api.pluginStorage.getItem(GEOM_KEY); const g = raw ? JSON.parse(raw) : null; geomCache = g && typeof g === 'object' ? g : {}; } catch { geomCache = {}; }
  return geomCache;
}
function saveGeom(ctx, g) {
  geomCache = { ...g };
  try { Promise.resolve(ctx.api.pluginStorage.setItem(GEOM_KEY, JSON.stringify(geomCache))).catch(() => {}); } catch { /* 저장 실패는 무시 */ }
}
const MIN_W = 340, MIN_H = 320, SHEET_MAX = 640;
// 화면에 맞게 잘라 넣는다: 크기는 최소~패널 크기, 위치는 패널 안
export function clampGeom(g, pw, ph) {
  const w = Math.max(Math.min(MIN_W, pw), Math.min(g.w || 520, pw - 16));
  const hh = Math.max(Math.min(MIN_H, ph), Math.min(g.h || 640, ph - 16));
  const x = Math.min(Math.max(8, Number.isFinite(g.x) ? g.x : pw - w - 16), Math.max(8, pw - w - 8));
  const y = Math.min(Math.max(8, Number.isFinite(g.y) ? g.y : ph - hh - 16), Math.max(8, ph - hh - 8));
  return { x, y, w, h: hh };
}
// 보고 있는 탭 → 작업 종류 (정보 탭은 설명, JSON·AI 탭은 설계 대화)
export const TAB_TASK = { info: 'description', greeting: 'greeting', lorebook: 'lorebook', regex: 'regex', trigger: 'lua', json: 'workshop', ai: 'workshop' };

export function openAiPopup(ctx, { panel, build, selection, onClose, bbPresent, onRuleTest, tab }) {
  const old = panel.querySelector('#rb-ai-popup');
  if (old) return old.closePopup?.();
  const st = build.state;
  const back = h('div', { id: 'rb-ai-popup', role: 'dialog', 'aria-label': 'AI로 제작', style: 'position:absolute;z-index:40;display:flex;flex-direction:column;background:var(--rb-win,var(--rb-surf));color:var(--rb-text);border:1px solid var(--rb-line2);box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;box-sizing:border-box' });
  const status = h('small', { class: 'rb-muted', 'aria-live': 'polite' });
  const list = h('div', { class: 'rb-scroll', style: 'flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px' });
  const taskSel = h('select', { class: 'rb-input', 'aria-label': '작업 종류', style: 'flex:1' }, Object.entries(build.TASKS).map(([k, t]) => h('option', { value: k }, t.label)));
  const modelSel = h('select', { class: 'rb-input', 'aria-label': '모델', style: 'width:auto' }, h('option', { value: 'submodel' }, '보조 모델'), h('option', { value: 'model' }, '메인 모델'));
  const scope = h('input', { type: 'checkbox' });
  const scopeLbl = h('label', { class: 'rb-muted', style: 'display:none;align-items:center;gap:4px;font-size:12px' }, scope, '선택한 항목만');
  const ta = h('textarea', { class: 'rb-textarea', rows: 3, 'aria-label': '요청', placeholder: '무엇을 만들거나 고칠까요? (Ctrl+Enter로 보내기)', style: 'font-family:inherit;font-size:16px' });
  // 고칠 부분: 편집기 로어북 글칸에서 고른 글과 양방향으로 맞춘다 (여기서 고치면 글칸도 바뀌고, 글칸에서 다시 고르면 여기도 바뀐다)
  const fixTa = h('textarea', { class: 'rb-textarea', rows: 3, 'aria-label': '고칠 부분', placeholder: '로어북 내용에서 글을 드래그하면 여기에 나와요', style: 'font-family:inherit;font-size:16px' });
  const fixInfo = h('small', { class: 'rb-muted', 'aria-live': 'polite', style: 'flex:1;min-width:0' });
  const fixWrap = h('div', { style: 'display:none;flex-direction:column;gap:4px' },
    h('div', { style: 'display:flex;align-items:center;gap:8px' }, h('b', { style: 'font-size:13px' }, '고칠 부분'), fixInfo, btn('해제', { size: 'sm', title: '고칠 부분 없이 평소처럼 요청해요', onClick: () => clearFix() })),
    fixTa);
  function paintFix(t) {
    fixWrap.style.display = t ? 'flex' : 'none';
    ta.placeholder = t ? '이 부분을 어떻게 고칠까요? (Ctrl+Enter로 보내기)' : '무엇을 만들거나 고칠까요? (Ctrl+Enter로 보내기)';
    if (!t) return;
    if (ta.ownerDocument.activeElement !== fixTa && fixTa.value !== t.text) fixTa.value = t.text;
    fixInfo.textContent = locate(t) ? `${t.label} · ${t.text.length.toLocaleString()}자 · 여기서 고치면 글칸도 바뀌어요` : `${t.label} · 글칸과 연결이 끊겼어요. 로어북 내용에서 다시 골라 주세요`;
  }
  const unFix = onFix(paintFix);
  fixTa.addEventListener('input', () => { if (!setFixText(fixTa.value)) paintFix(getFix()); });
  // 부분 다시 쓰기 결과 카드: 적용하면 그때의 자리에 바로 바뀌고, 되돌리기로 원래 글로 돌아가요
  function rewriteCard(r) {
    const state = r.applied ? '적용함' : r.discarded ? '버림' : locate(r) ? '적용할 수 있어요' : '글칸과 연결이 끊겼어요';
    const can = !r.discarded && (r.applied || locate(r));
    const preview = (t) => h('div', { style: 'white-space:pre-wrap;font-size:13px;line-height:1.55;max-height:140px;overflow:auto;padding:6px 8px;border-radius:8px;background:var(--rb-surf2)' }, t);
    return h('div', { style: 'border:1px solid var(--rb-line2);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px' + (r.discarded ? ';opacity:.6' : '') },
      h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, h('b', null, '부분 다시 쓰기 · ' + r.label), h('small', { class: 'rb-muted' }, state)),
      h('small', { class: 'rb-muted' }, '요청: ' + r.request),
      h('details', null, h('summary', { style: 'cursor:pointer;font-size:12.5px' }, '원래 글'), preview(r.applied ? r.prev : r.orig)),
      preview(r.applied ? r.text : r.result),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        !r.applied && !r.discarded ? Object.assign(btn('적용', { kind: 'primary', size: 'sm', icon: 'check', onClick: () => { const t0 = r.text; if (replaceIn(r, r.result)) { r.prev = t0; r.applied = true; ctx.toast('적용했어요 — 글칸에 바로 반영됐어요'); } else ctx.toast('글칸의 그 부분이 바뀌어 적용하지 못했어요. 다시 골라 주세요.', { error: true }); paint(); } }), { disabled: !can }) : null,
        r.applied ? btn('되돌리기', { size: 'sm', icon: 'undo', onClick: () => { if (replaceIn(r, r.prev)) { r.applied = false; ctx.toast('되돌렸어요'); } else ctx.toast('글칸의 그 부분이 바뀌어 되돌리지 못했어요.', { error: true }); paint(); } }) : null,
        !r.applied && !r.discarded ? btn('버리기', { size: 'sm', onClick: () => { r.discarded = true; paint(); } }) : null));
  }
  // 로어북 방식 (Dusk | 일반): 로어북·설계 대화 작업에서만 보인다. 봇마다 마지막 선택을 기억한다.
  const loreSeg = segmented([['dusk', 'Dusk 방식'], ['plain', '일반 방식']], build.loreMode(), async (v) => { try { await build.setLoreMode(v); } catch (e) { ctx.toast(e.message, { error: true }); } paint(); }, '로어북 방식');
  loreSeg.style.cssText = 'flex:none;min-width:190px';
  const loreHint = h('small', { class: 'rb-muted', style: 'display:none;padding:0 12px 6px;line-height:1.5' });
  // 이번 요청에 포함할 로어북: 항목별 체크 + 전체 포함/제외. 다시 그려도 스크롤 위치를 지킨다.
  const loreHead = h('summary', null);
  const loreBar = h('div', { class: 'rb-lorereq-bar' },
    btn('전체 포함', { size: 'sm', onClick: () => build.setAllLore(true) }),
    btn('전체 제외', { size: 'sm', onClick: () => build.setAllLore(false) }));
  const loreListEl = h('div', { class: 'rb-lorereq-list', role: 'group', 'aria-label': '이번 요청에 포함할 로어북' });
  const lorePanel = h('details', { class: 'rb-lorereq', style: 'display:none' }, loreHead, h('style', null, LOREREQ_CSS), loreBar, loreListEl);
  let loreSig = null;
  function paintLore() {
    const items = build.loreList();
    lorePanel.style.display = items.length ? '' : 'none';
    const on = items.filter((x) => x.included).length;
    loreHead.textContent = `이번 요청에 포함할 로어북 · ${on}/${items.length}개`;
    const sig = items.map((x) => (x.included ? '1' : '0') + x.name + (x.folder ? '/' : '')).join('\u0001');
    if (sig === loreSig) return;
    loreSig = sig;
    const top = loreListEl.scrollTop;
    replace(loreListEl, items.map((x) => {
      const cb = h('input', { type: 'checkbox', 'aria-label': x.name });
      cb.checked = x.included;
      cb.addEventListener('change', () => build.setLoreIncluded(x.index, cb.checked));
      return h('label', { class: 'rb-lorereq-item', 'data-off': x.included ? '0' : '1' }, cb, h('span', null, (x.folder ? '📁 ' : '') + x.name));
    }));
    loreListEl.scrollTop = top;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { loreListEl.scrollTop = top; });
  }
  const sendB = btn('보내기', { kind: 'primary', icon: 'sparkle', onClick: () => send() });
  const stopB = btn('중단', { onClick: () => build.cancel() });
  const undoB = btn('되돌리기', { size: 'sm', icon: 'undo', title: '마지막으로 적용한 수정안을 되돌려요', onClick: () => { build.undo(); paint(); } });
  const saveB = btn('임시 저장', { size: 'sm', onClick: async () => { try { await build.saveSlot('manual'); ctx.toast('임시 저장했어요'); } catch (e) { ctx.toast(e.message, { error: true }); } } });
  const importB = btn('봇빌더 저장본 가져오기', { size: 'sm', title: '봇빌더에서 내보낸 저장본·프롬프트·프리셋 JSON을 읽어 와요', onClick: () => pickJson() });
  async function pickJson() {
    const inp = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    inp.addEventListener('change', async () => {
      const f = inp.files?.[0];
      inp.remove();
      if (!f) return;
      try { const kind = await build.importBB(await f.text()); ctx.toast(`가져왔어요 (${{ snapshot: '저장본', prompt: '프롬프트', preset: '프리셋' }[kind]})`); } catch (e) { ctx.toast(`가져오지 못했어요: ${e.message}`, { error: true }); }
      paint();
    });
    back.appendChild(inp);
    inp.click();
  }
  const bbNote = bbPresent ? h('div', { class: 'rb-muted', style: 'padding:8px 12px;font-size:12px;background:rgba(240,180,60,.14)' }, '봇빌더 플러그인이 같이 켜져 있어요. Dusk 안에 같은 기능이 있으니 하나만 쓰길 권해요. 저장본은 아래 [봇빌더 저장본 가져오기]로 옮길 수 있어요.') : null;
  const newB = btn('새 대화', { size: 'sm', onClick: () => { build.newThread(); } });

  function duskPreview(c) {
    const d = c.dusk;
    if (!d) return null;
    const rows = d.preview.map((p) => h('div', { style: 'display:flex;gap:6px;align-items:baseline;font-size:12.5px' },
      h('span', { class: 'rb-muted', style: 'width:14px;text-align:center' }, p.removed ? '−' : p.isNew ? '+' : '~'),
      h('span', { class: 'rb-chip', style: 'flex:none' }, KIND[p.kind] ?? p.kind),
      h('b', { style: p.removed ? 'text-decoration:line-through' : '' }, p.name),
      p.parent ? h('span', { class: 'rb-muted' }, '‹' + p.parent + '›') : null,
      p.summary ? h('span', { class: 'rb-muted', style: 'flex:1;min-width:0' }, '— ' + p.summary) : null,
      p.changed?.length ? h('span', { class: 'rb-muted' }, '(' + p.changed.join('·') + ' 바뀜)') : null));
    return h('details', { open: d.preview.length <= 8 }, h('summary', { style: 'cursor:pointer;font-size:13px' }, `Dusk 구조 미리보기 (${d.preview.length}개)`),
      h('div', { style: 'display:flex;flex-direction:column;gap:4px;margin-top:6px;max-height:220px;overflow:auto' }, rows),
      ...d.fixes.map((m) => note('info', '자동 수정 · ' + m)), ...d.warnings.map((m) => note('warn', m)));
  }
  // 로어북 수정안: 바뀌는 항목과 필드만 보여 준다 (나머지는 그대로 보존)
  const FIELD_LABEL = { comment: '제목', key: '키', secondkey: '보조 키', content: '내용', insertorder: '순서', mode: '방식', alwaysActive: '항상 활성', selective: '선택적', useRegex: '정규식', activationPercent: '확률', extentions: 'Dusk 규칙', folder: '폴더' };
  function loreDiffView(c) {
    let rows = [];
    try { rows = build.changesOf(c); } catch { return null; }
    if (!rows.length) return null;
    return h('div', { class: 'rb-lorediff' }, rows.map((r) => h('div', null,
      h('span', { class: 'rb-muted', style: 'width:14px;text-align:center' }, r.kind === 'remove' ? '−' : r.kind === 'new' ? '+' : '~'),
      h('b', { style: r.kind === 'remove' ? 'text-decoration:line-through' : '' }, r.name),
      r.fields.length ? h('span', { class: 'rb-muted' }, (r.kind === 'new' ? '새 항목 · ' : '') + r.fields.map((f) => FIELD_LABEL[f] ?? f).join('·') + (r.kind === 'edit' ? ' 바뀜' : '')) : null)));
  }
  function card(c) {
    const state = build.candidateState(c);
    let areas = [];
    let err = null;
    try { areas = build.diff(c).changed; } catch (e) { err = e.message; }
    return h('div', { style: 'border:1px solid var(--rb-line2);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px' },
      h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, h('b', null, c.label), h('small', { class: 'rb-muted' }, STATE_LABEL[state])),
      err ? h('small', { class: 'rb-muted' }, '해석할 수 없어요: ' + err) : h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, areas.map((a) => h('span', { class: 'rb-chip' }, AREA[a] ?? a)), areas.length ? null : h('small', { class: 'rb-muted' }, '바뀌는 내용이 없어요')),
      loreDiffView(c),
      duskPreview(c),
      state === 'ok' ? h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        btn('적용', { kind: 'primary', size: 'sm', icon: 'check', onClick: () => { try { build.applyCandidate(c); ctx.toast('적용했어요 — 편집기 탭에 바로 반영돼요'); } catch (e) { ctx.toast(e.message, { error: true }); } } }),
        areas.includes('globalLore') && onRuleTest ? btn('적용 전 규칙 시험', { size: 'sm', icon: 'zap', title: '이 수정안을 적용한 상태로 가상 대화를 해 봐요 (적용되지는 않아요)', onClick: () => { try { onRuleTest(build.diff(c).after.globalLore); } catch (e) { ctx.toast(e.message, { error: true }); } } }) : null,
        btn('버리기', { size: 'sm', onClick: () => build.discardCandidate(c) })) : null
    );
  }
  function paint() { build.batch(paintNow); }
  function paintNow() {
    const s = st.s;
    const items = [];
    if (!s.thread.length) items.push(h('p', { class: 'rb-muted' }, '왼쪽 위 작업 종류를 고르고 요청을 적으면 AI가 수정안을 만들어요. 마음에 들면 [적용]을 누르세요. 편집기의 각 탭에 바로 반영되고, 저장은 따로예요.'));
    for (const m of s.thread) items.push(h('div', { style: `align-self:${m.role === 'user' ? 'flex-end' : 'flex-start'};max-width:90%;white-space:pre-wrap;padding:8px 10px;border-radius:12px;background:${m.error ? 'rgba(220,60,60,.15)' : m.role === 'user' ? 'var(--rb-teal-soft)' : 'var(--rb-surf2)'}` }, m.content));
    for (const c of s.candidates) items.push(card(c));
    for (const r of rewrites) items.push(rewriteCard(r));
    if (st.job) items.push(h('small', { class: 'rb-muted' }, `${st.job.label} · ${Math.round((Date.now() - st.job.start) / 1000)}초`));
    replace(list, items);
    list.scrollTop = list.scrollHeight;
    const lorePick = ['lorebook', 'regex'].includes(st.task);
    scopeLbl.style.display = lorePick ? 'flex' : 'none';
    const loreTask = ['lorebook', 'workshop'].includes(st.task);
    const lm = build.loreMode();
    loreSeg.style.display = loreTask ? '' : 'none';
    loreSeg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === lm ? 'true' : 'false'));
    loreHint.style.display = loreTask ? '' : 'none';
    loreHint.textContent = lm === 'dusk' ? '폴더·소속·장소와 켜지는 규칙까지 설계해요. 적용 전에 규칙 시험으로 확인할 수 있어요.' : '리스 기본 로어북(키·내용)만 만들어요. 기존 Dusk 규칙은 그대로 둬요.';
    paintLore();
    scope.checked = st.scopeOnly;
    taskSel.value = st.task;
    modelSel.value = st.settings.model;
    sendB.disabled = !!st.job;
    sendB.style.display = st.job ? 'none' : '';
    stopB.style.display = st.job ? '' : 'none';
    undoB.disabled = !build.canUndo();
    status.textContent = st.job ? '응답 기다리는 중' : st.autoError ? '자동 저장 실패: ' + st.autoError : '';
  }
  async function sendFix(t) {
    const request = ta.value.trim();
    const at = locate(t);
    if (!at) { ctx.toast('글칸과 연결이 끊겼어요. 로어북 내용에서 다시 골라 주세요.', { error: true }); return; }
    const full = String(t.ta.value ?? '');
    try {
      const p = build.rewritePart({ text: t.text, request, label: t.label, before: full.slice(0, at.s), after: full.slice(at.e) });
      paint();
      const result = await p;
      addRewrite({ ta: t.ta, s: at.s, e: at.e, text: t.text, orig: t.text, label: t.label, request, result });
      ta.value = '';
    } catch (e) { ctx.toast(e.message, { error: true }); }
    paint();
  }
  async function send() {
    const fix = getFix();
    if (fix && fix.text.trim()) return sendFix(fix);
    try {
      const sel = selection?.() ?? {};
      build.setSelected('lorebook', sel.lorebook ?? 0);
      build.setSelected('regex', sel.regex ?? 0);
      build.setScopeOnly(scope.checked);
      build.setRequest(st.task, ta.value);
      const p = build.sendRequest();
      paint();
      await p;
      if (!st.s.thread.at(-1)?.error) ta.value = '', build.setRequest(st.task, '');
    } catch (e) { ctx.toast(e.message, { error: true }); }
    paint();
  }
  // 사용자가 직접 작업 종류를 고르면 그 뒤로는 탭을 바꿔도 자동으로 바꾸지 않는다 (창을 다시 열면 자동으로 돌아옴)
  let autoTask = true;
  const pickTask = (k) => { build.setRequest(st.task, ta.value); build.setTask(k); ta.value = st.s.requests[st.task] ?? ''; };
  taskSel.addEventListener('change', () => { autoTask = false; pickTask(taskSel.value); });
  modelSel.addEventListener('change', () => build.setSettings({ model: modelSel.value }));
  scope.addEventListener('change', () => build.setScopeOnly(scope.checked));
  ta.addEventListener('input', () => build.setRequest(st.task, ta.value));
  ta.addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); send(); } });

  // ── 배치: PC는 떠 있는 창(끌기·크기), 좁은 화면은 아래 시트 ──
  let geom = null, sheet = false;
  const pSize = () => ({ pw: panel.clientWidth || 800, ph: panel.clientHeight || 600 });
  function layout() {
    const { pw, ph } = pSize();
    sheet = pw < SHEET_MAX;
    const s2 = back.style;
    if (sheet) {
      s2.left = '0'; s2.right = '0'; s2.top = 'auto'; s2.bottom = '0'; s2.width = '100%';
      s2.height = 'min(86%, ' + Math.max(320, ph - 24) + 'px)'; s2.borderRadius = '16px 16px 0 0'; s2.paddingBottom = 'env(safe-area-inset-bottom)';
      grip.style.display = 'flex'; hdr.style.cursor = 'default'; rzNW.style.display = 'none'; rzSE.style.display = 'none';
    } else {
      geom = clampGeom(geom ?? {}, pw, ph);
      s2.left = geom.x + 'px'; s2.top = geom.y + 'px'; s2.right = 'auto'; s2.bottom = 'auto'; s2.width = geom.w + 'px'; s2.height = geom.h + 'px';
      s2.borderRadius = '16px'; s2.paddingBottom = '0';
      grip.style.display = 'none'; hdr.style.cursor = 'grab'; rzNW.style.display = ''; rzSE.style.display = '';
    }
  }
  // 포인터 끌기 공통: 마우스·터치·펜 모두 pointer 이벤트로 처리
  function drag(ev, onMove, onEnd) {
    ev.preventDefault();
    const el = ev.currentTarget, id = ev.pointerId;
    try { el.setPointerCapture(id); } catch { /* 캡처 실패는 무시 */ }
    const sx = ev.clientX, sy = ev.clientY;
    const mv = (e) => { if (e.pointerId === id) onMove(e.clientX - sx, e.clientY - sy); };
    const up = (e) => {
      if (e.pointerId !== id) return;
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      onEnd?.(e.clientX - sx, e.clientY - sy);
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  const hdrTitle = h('b', null, 'AI로 제작');
  const closeB = iconBtn('x', '닫기', { onClick: () => close() });
  const hdr = h('div', { style: 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--rb-line2);touch-action:none;user-select:none;-webkit-user-select:none' }, hdrTitle, status, h('span', { style: 'flex:1' }), modelSel, closeB);
  hdr.addEventListener('pointerdown', (ev) => {
    if (sheet || ev.button > 0 || ev.target.closest('button,select,input,textarea,a')) return;
    const g0 = { ...geom };
    hdr.style.cursor = 'grabbing';
    drag(ev, (dx, dy) => { geom = clampGeom({ ...g0, x: g0.x + dx, y: g0.y + dy }, pSize().pw, pSize().ph); layout(); },
      () => { hdr.style.cursor = 'grab'; saveGeom(ctx, geom); });
  });
  // 아래 시트: 위쪽 손잡이를 아래로 끌면 닫힘
  const grip = h('div', { style: 'display:none;justify-content:center;padding:8px 0 2px;touch-action:none' }, h('span', { style: 'width:44px;height:5px;border-radius:3px;background:var(--rb-line2)' }));
  grip.addEventListener('pointerdown', (ev) => {
    drag(ev, (dx, dy) => { back.style.transform = 'translateY(' + Math.max(0, dy) + 'px)'; },
      (dx, dy) => { if (dy > 90) close(); else back.style.transform = ''; });
  });
  const mkRz = (dir) => {
    const nw = dir === 'nw';
    const el = h('div', { 'aria-label': nw ? '크기 조절(왼쪽 위)' : '크기 조절(오른쪽 아래)', title: '끌어서 크기를 바꿔요', style: 'position:absolute;width:22px;height:22px;touch-action:none;z-index:2;' + (nw ? 'left:0;top:0;cursor:nwse-resize' : 'right:0;bottom:0;cursor:nwse-resize') },
      h('span', { style: 'position:absolute;width:10px;height:10px;opacity:.55;' + (nw ? 'left:4px;top:4px;border-left:2px solid currentColor;border-top:2px solid currentColor;border-top-left-radius:4px' : 'right:4px;bottom:4px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;border-bottom-right-radius:4px') }));
    el.addEventListener('pointerdown', (ev) => {
      if (sheet) return;
      const g0 = { ...geom }, { pw, ph } = pSize();
      drag(ev, (dx, dy) => {
        let { x, y, w, h: hh } = g0;
        if (nw) { w = g0.w - dx; hh = g0.h - dy; w = Math.max(MIN_W, Math.min(w, g0.x + g0.w - 8)); hh = Math.max(MIN_H, Math.min(hh, g0.y + g0.h - 8)); x = g0.x + g0.w - w; y = g0.y + g0.h - hh; }
        else { w = Math.max(MIN_W, Math.min(g0.w + dx, pw - g0.x - 8)); hh = Math.max(MIN_H, Math.min(g0.h + dy, ph - g0.y - 8)); }
        geom = { x, y, w, h: hh }; layout();
      }, () => saveGeom(ctx, geom));
    });
    return el;
  };
  const rzNW = mkRz('nw'), rzSE = mkRz('se');

  const unsub = build.subscribe(paint);
  const timer = setInterval(() => { if (!back.isConnected) return clearInterval(timer); if (st.job) paint(); }, 1000);
  let ro = null;
  const close = () => { unsub(); unFix(); clearInterval(timer); ro?.disconnect(); win.removeEventListener('resize', onWin); back.remove(); onClose?.(); };
  const win = panel.ownerDocument.defaultView ?? window;
  const onWin = () => { if (back.isConnected) layout(); };
  win.addEventListener('resize', onWin);
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(onWin); ro.observe(panel); }
  back.closePopup = close;
  back.focusFix = () => { paintFix(getFix()); (getFix() ? ta : fixTa).focus?.(); };
  // 열려 있는 동안 탭이 바뀌면(편집기에서 호출) 그 탭에 맞는 작업 종류로 바꾼다
  back.syncTab = (t) => { const k = TAB_TASK[t]; if (autoTask && k && k !== st.task && build.TASKS[k]) pickTask(k); };
  back.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } });
  back.append(
    grip, rzNW, rzSE, hdr,
    ...(bbNote ? [bbNote] : []),
    h('div', { style: 'display:flex;gap:8px;align-items:center;padding:8px 12px;flex-wrap:wrap' }, taskSel, scopeLbl, loreSeg),
    loreHint,
    lorePanel,
    list,
    h('div', { style: 'padding:10px 12px;border-top:1px solid var(--rb-line2);display:flex;flex-direction:column;gap:8px' }, fixWrap, ta,
      h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' }, undoB, saveB, newB, bbPresent ? importB : null, h('span', { style: 'flex:1' }), sendB, stopB))
  );
  geom = geomCache && Number.isFinite(geomCache.w) ? { ...geomCache } : null;
  panel.appendChild(back);
  if (tab) back.syncTab(tab);
  layout();
  paintFix(getFix());
  paint();
  if (!sheet) ta.focus();
  return back;
}
