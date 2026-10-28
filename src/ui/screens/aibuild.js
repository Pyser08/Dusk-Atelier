// AI로 제작 팝업(우측 하단). v1.6.7 2단계: 요청 → 수정안 카드 → 적용하면 편집기 탭에 바로 반영.
// 화면 다듬기(끌어서 옮기기·크기·모바일 시트·프리셋 화면)는 5단계에서 이어서 한다.
import { h, replace } from '../dom.js';
import { btn, iconBtn } from '../kit.js';

const AREA = { name: '이름', desc: '설명', personality: '성격', scenario: '시나리오', firstMessage: '첫 메시지', defaultVariables: '변수', globalLore: '로어북', customscript: '정규식', triggerscript: '트리거', systemPrompt: '시스템', exampleMessage: '예시 대화', postHistoryInstructions: '후속 지시', creatorNotes: '제작자 노트' };
const STATE_LABEL = { ok: '적용할 수 있어요', applied: '적용함', discarded: '버림', stale: '원고가 바뀌어 쓸 수 없어요' };

export function openAiPopup(ctx, { panel, build, selection, onClose, bbPresent }) {
  const old = panel.querySelector('#rb-ai-popup');
  if (old) return old.closePopup?.();
  const st = build.state;
  const back = h('div', { id: 'rb-ai-popup', role: 'dialog', 'aria-label': 'AI로 제작', style: 'position:absolute;right:16px;bottom:16px;z-index:40;width:min(520px,calc(100% - 32px));height:min(640px,calc(100% - 32px));display:flex;flex-direction:column;background:var(--rb-surface,#fff);color:var(--rb-text,inherit);border:1px solid var(--rb-line,#ccc);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden' });
  const status = h('small', { class: 'rb-muted', 'aria-live': 'polite' });
  const list = h('div', { class: 'rb-scroll', style: 'flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px' });
  const taskSel = h('select', { class: 'rb-input', 'aria-label': '작업 종류', style: 'flex:1' }, Object.entries(build.TASKS).map(([k, t]) => h('option', { value: k }, t.label)));
  const modelSel = h('select', { class: 'rb-input', 'aria-label': '모델', style: 'width:auto' }, h('option', { value: 'submodel' }, '보조 모델'), h('option', { value: 'model' }, '메인 모델'));
  const scope = h('input', { type: 'checkbox' });
  const scopeLbl = h('label', { class: 'rb-muted', style: 'display:none;align-items:center;gap:4px;font-size:12px' }, scope, '선택한 항목만');
  const ta = h('textarea', { class: 'rb-textarea', rows: 3, placeholder: '무엇을 만들거나 고칠까요? (Ctrl+Enter로 보내기)', style: 'font-family:inherit;font-size:14px' });
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

  function card(c) {
    const state = build.candidateState(c);
    let areas = [];
    let err = null;
    try { areas = build.diff(c).changed; } catch (e) { err = e.message; }
    return h('div', { style: 'border:1px solid var(--rb-line,#ccc);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px' },
      h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, h('b', null, c.label), h('small', { class: 'rb-muted' }, STATE_LABEL[state])),
      err ? h('small', { class: 'rb-muted' }, '해석할 수 없어요: ' + err) : h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, areas.map((a) => h('span', { class: 'rb-chip' }, AREA[a] ?? a)), areas.length ? null : h('small', { class: 'rb-muted' }, '바뀌는 내용이 없어요')),
      state === 'ok' ? h('div', { style: 'display:flex;gap:8px' },
        btn('적용', { kind: 'primary', size: 'sm', icon: 'check', onClick: () => { try { build.applyCandidate(c); ctx.toast('적용했어요 — 편집기 탭에 바로 반영돼요'); } catch (e) { ctx.toast(e.message, { error: true }); } } }),
        btn('버리기', { size: 'sm', onClick: () => build.discardCandidate(c) })) : null
    );
  }
  function paint() {
    const s = st.s;
    const items = [];
    if (!s.thread.length) items.push(h('p', { class: 'rb-muted' }, '왼쪽 위 작업 종류를 고르고 요청을 적으면 AI가 수정안을 만들어요. 마음에 들면 [적용]을 누르세요. 편집기의 각 탭에 바로 반영되고, 저장은 따로예요.'));
    for (const m of s.thread) items.push(h('div', { style: `align-self:${m.role === 'user' ? 'flex-end' : 'flex-start'};max-width:90%;white-space:pre-wrap;padding:8px 10px;border-radius:12px;background:${m.error ? 'rgba(220,60,60,.15)' : m.role === 'user' ? 'var(--rb-teal-soft,rgba(80,160,150,.18))' : 'var(--rb-surface-2,rgba(128,128,128,.14))'}` }, m.content));
    for (const c of s.candidates) items.push(card(c));
    if (st.job) items.push(h('small', { class: 'rb-muted' }, `${st.job.label} · ${Math.round((Date.now() - st.job.start) / 1000)}초`));
    replace(list, items);
    list.scrollTop = list.scrollHeight;
    const lorePick = ['lorebook', 'regex'].includes(st.task);
    scopeLbl.style.display = lorePick ? 'flex' : 'none';
    scope.checked = st.scopeOnly;
    taskSel.value = st.task;
    modelSel.value = st.settings.model;
    sendB.disabled = !!st.job;
    sendB.style.display = st.job ? 'none' : '';
    stopB.style.display = st.job ? '' : 'none';
    undoB.disabled = !build.canUndo();
    status.textContent = st.job ? '응답 기다리는 중' : st.autoError ? '자동 저장 실패: ' + st.autoError : '';
  }
  async function send() {
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
  taskSel.addEventListener('change', () => { build.setRequest(st.task, ta.value); build.setTask(taskSel.value); ta.value = st.s.requests[st.task] ?? ''; });
  modelSel.addEventListener('change', () => build.setSettings({ model: modelSel.value }));
  scope.addEventListener('change', () => build.setScopeOnly(scope.checked));
  ta.addEventListener('input', () => build.setRequest(st.task, ta.value));
  ta.addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); send(); } });

  const unsub = build.subscribe(paint);
  const timer = setInterval(() => { if (!back.isConnected) return clearInterval(timer); if (st.job) paint(); }, 1000);
  const close = () => { unsub(); clearInterval(timer); back.remove(); onClose?.(); };
  back.closePopup = close;
  back.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } });
  back.append(
    h('div', { style: 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--rb-line,#ccc)' }, h('b', null, 'AI로 제작'), status, h('span', { style: 'flex:1' }), modelSel, iconBtn('x', '닫기', { onClick: close })),
    bbNote,
    h('div', { style: 'display:flex;gap:8px;align-items:center;padding:8px 12px' }, taskSel, scopeLbl),
    list,
    h('div', { style: 'padding:10px 12px;border-top:1px solid var(--rb-line,#ccc);display:flex;flex-direction:column;gap:8px' }, ta,
      h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' }, undoB, saveB, newB, bbPresent ? importB : null, h('span', { style: 'flex:1' }), sendB, stopB))
  );
  panel.appendChild(back);
  paint();
  ta.focus();
  return back;
}
