// AI로 제작 컨트롤러 (화면 없음). 봇빌더 Workshop 클래스의 로직 부분을 이식하고,
// 작업본은 Dusk 편집기(host)에서 직접 읽고 쓴다. 화면(팝업·탭)은 subscribe()로 다시 그린다.
import { assert, clone, equal, stable, uid, FIELDS } from './util.js';
import { TASKS, newSession, composeMessages, defaultPrompt, extractResponseJson, parseResponse, applyPacket } from './core.js';
import { callModel } from './model.js';
import { assemblePreset, newPresetState, validatePresetState } from './preset-engine.js';
import { createAiStore, normalizeSettings, AUTOSAVE_MS } from './store.js';
import { toDraft, toView } from './bridge.js';
import { checkInputSize } from './limits.js';
import { loreSelection, reconcileLoreSelection, validLoreIncluded, assertLoreRefsIncluded, compactLorePacket, loreChanges } from './loreselect.js';
import { applyDesignToResponse, DesignError, hasDusk, resolveLoreMode } from './duskdesign.js';

export function createAiBuild({ api, host, store: given }) {
  const store = given ?? createAiStore(api);
  const st = {
    s: newSession(),
    prompts: {},
    settings: normalizeSettings(),
    slots: { autosave: null, manual: null },
    savedPreset: null,
    job: null,
    task: 'workshop',
    scopeOnly: false,
    started: false,
    serial: 0,
    autoSerial: 0,
    ready: false
  };
  st.s.preset = newPresetState();
  const subs = new Set();
  let lastSig = null, autoTimer = null, destroyed = false;
  const emit = () => { for (const fn of subs) { try { fn(st); } catch { /* 화면 오류는 무시 */ } } };
  const touch = (draft = true) => { st.started = true; st.serial++; if (draft) st.s.revision++; };

  // 편집기 작업본을 읽어 session.draft를 맞춘다. 손으로 고쳤으면 revision을 올려 대기 수정안을 '원고가 바뀜'으로 만든다.
  function sync() {
    const draft = toDraft(host.getView(), host.assets?.());
    const sig = stable(draft);
    if (lastSig !== null && sig !== lastSig) { st.s.revision++; st.serial++; st.started = true; }
    lastSig = sig;
    st.s.loreIncluded = reconcileLoreSelection(st.s.draft?.globalLore, st.s.loreIncluded, draft.globalLore);
    st.s.draft = draft;
    st.s.targetId = host.targetId?.() ?? null;
    return draft;
  }

  const candidateValid = (c) => {
    sync();
    const s = st.s;
    return !c.status && c.sessionId === s.sessionId && c.targetId === s.targetId && c.revision === s.revision && c.promptRevision === s.promptRevision;
  };
  // 'ok' | 'applied' | 'discarded' | 'stale'
  const candidateState = (c) => c.status === 'applied' ? 'applied' : c.status === 'discarded' ? 'discarded' : c.status === 'stale' || !candidateValid(c) ? 'stale' : 'ok';

  function requestWithScope(task) {
    const s = st.s, request = (s.requests[task] ?? '').trim();
    sync();
    const field = task === 'lorebook' ? 'globalLore' : 'customscript';
    const scope = st.scopeOnly && ['lorebook', 'regex'].includes(task) && (s.draft[field] ?? []).length ? (task === 'lorebook' ? 'l' : 'r') + (s.selected[task] ?? 0) : null;
    return { request, scope, text: request + (scope ? `\n[허용 편집 범위] 기존 항목 ${scope}만 수정·삭제할 수 있다. 새 항목 추가와 다른 항목 변경은 금지한다.` : '') };
  }
  function promptFor(task) { return st.prompts[task] ?? defaultPrompt(task); }
  // ---- 로어북 방식 (Dusk | 일반): 봇마다 마지막 선택을 기억한다 ----
  const loreKey = () => st.s.targetId || '_new';
  function loreMode() {
    sync();
    return resolveLoreMode({ setting: st.settings.lore, remembered: st.settings.loreByBot?.[loreKey()], lore: st.s.draft.globalLore });
  }
  async function setLoreMode(mode) {
    assert(['dusk', 'plain'].includes(mode), '로어북 방식은 dusk 또는 plain이에요.');
    await setSettings({ loreByBot: { ...st.settings.loreByBot, [loreKey()]: mode } });
  }
  const loreTask = (task) => ['lorebook', 'workshop'].includes(task);
  // 응답 JSON 문자열의 Dusk 설계를 수정안 형식으로 바꾼다
  function convertRaw(raw, task, before) {
    const response = JSON.parse(raw);
    const res = applyDesignToResponse(response, before.globalLore ?? []);
    return res;
  }
  function previewRequest(task = st.task, forcePreset = false) {
    sync();
    const usePreset = forcePreset || st.s.preset.mode === 'preset';
    const direct = composeMessages(usePreset ? { ...st.s, thread: [] } : st.s, task, requestWithScope(task).text, promptFor(task), { lore: loreTask(task) ? loreMode() : 'plain' });
    if (usePreset) return assemblePreset(st.s.preset, st.s, task, direct);
    return { messages: direct, trace: [], issues: [], notes: [], globals: {} };
  }

  async function sendRequest() {
    assert(!st.job, '다른 LLM 요청이 진행 중입니다.');
    const task = st.task, s = st.s;
    const { request, scope } = requestWithScope(task);
    assert(request, 'LLM에게 전달할 요청을 적어 주세요.');
    const loreAtSend = loreTask(task) ? loreMode() : 'plain';
    const report = previewRequest(task);
    assert(!report.issues.length, '프리셋 조립 오류:\n' + report.issues.join('\n'));
    const messages = report.messages;
    checkInputSize(messages, st.settings.maxInputChars); // 글자·바이트 한도 (토큰 계산 없음, 자르지 않고 막음)
    const included = loreSelection(s);
    const meta = { sessionId: s.sessionId, targetId: s.targetId, revision: s.revision, promptRevision: s.promptRevision };
    const before = clone(s.draft);
    const job = { ...meta, id: uid(), start: Date.now(), label: TASKS[task].label + ' · 응답 대기', cancelled: false };
    st.job = job;
    s.thread.push({ id: uid(), role: 'user', content: request, task });
    touch(false);
    emit();
    let raw;
    try {
      raw = await callModel(api, messages, st.settings.model, st.settings.timeout, job);
      assert(!job.cancelled && st.job?.id === job.id && candidateValidMeta(meta), '요청 이후 작업 대상·원고·프롬프트가 바뀌어 결과를 버렸습니다. 다시 요청해 주세요.');
      raw = extractResponseJson(raw, task);
      let info = null;
      const dusk = loreAtSend === 'dusk';
      if (dusk) {
        let res = convertRaw(raw, task, before);
        if (res.errors.length && st.settings.retry) {
          // 검사에서 걸리면 오류 문구를 그대로 붙여 AI에게 한 번만 다시 요청한다
          job.label = TASKS[task].label + ' · 검사 오류를 고쳐 다시 요청 중';
          emit();
          const retry = [...messages, { role: 'assistant', content: raw }, { role: 'user', content: '방금 응답을 Dusk 검사기에 넣었더니 아래 오류가 났다. 같은 형식(schemaVersion·task·data)의 완전한 JSON 응답 하나로 고쳐서 다시 보내라. 오류와 무관한 부분은 그대로 유지하라.\n- ' + res.errors.join('\n- ') }];
          raw = await callModel(api, retry, st.settings.model, st.settings.timeout, job);
          assert(!job.cancelled && st.job?.id === job.id && candidateValidMeta(meta), '요청 이후 작업 대상·원고·프롬프트가 바뀌어 결과를 버렸습니다. 다시 요청해 주세요.');
          raw = extractResponseJson(raw, task);
          res = convertRaw(raw, task, before);
        }
        if (res.errors.length) throw new DesignError(res.errors);
        raw = JSON.stringify(res.response);
        info = { warnings: res.warnings, fixes: res.fixes, preview: res.preview };
      }
      let packet = parseResponse(raw, task, before, dusk);
      assertLoreRefsIncluded(packet, included); // 요청에서 뺀 로어북은 건드릴 수 없다
      packet = compactLorePacket(packet, before.globalLore ?? []); // 바뀐 항목·필드만 남긴다
      if (scope) {
        assert(packet.data.upsert.every((x) => x.ref === scope) && packet.data.remove.every((x) => x === scope), '선택한 항목 밖의 변경이 포함되어 결과를 버렸습니다.');
      }
      const changes = task === 'workshop' ? packet.data.changes.length : 1;
      s.thread.push({ id: uid(), role: 'assistant', content: task === 'workshop' ? packet.data.reply : TASKS[task].label + ' 수정안을 작성했습니다. 아래 카드에서 바뀌는 내용을 확인한 뒤 적용하세요.', task });
      if (changes) s.candidates.push({ ...meta, id: uid(), label: TASKS[task].label + ' · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), before, packet, ...(info && (info.preview.length || info.warnings.length || info.fixes.length) ? { dusk: info } : {}) });
      touch(false);
    } catch (error) {
      if (st.s.sessionId === s.sessionId) {
        s.thread.push({ id: uid(), role: 'assistant', content: error.message, error: true, ...(typeof raw === 'string' && raw ? { raw } : {}) });
        touch(false);
      }
    } finally {
      if (st.job?.id === job.id) st.job = null;
      emit();
    }
  }
  function candidateValidMeta(meta) {
    sync();
    const s = st.s;
    return meta.sessionId === s.sessionId && meta.targetId === s.targetId && meta.revision === s.revision && meta.promptRevision === s.promptRevision;
  }
  const cancel = () => { st.job?.stop?.(); };

  // 수정안이 바꾸는 영역 이름 목록 + 적용 결과(미리보기용)
  function diff(candidate) {
    const after = applyPacket(candidate.before, candidate.packet);
    const changed = FIELDS.filter((f) => !equal(candidate.before[f], after[f]));
    for (const f of ['globalLore', 'customscript', 'triggerscript']) if (!equal(candidate.before[f] ?? [], after[f] ?? [])) changed.push(f);
    return { before: candidate.before, after, changed };
  }
  // 적용: 편집기 작업본을 바로 바꾼다(각 탭에 즉시 보임). 적용 1회 = 편집기 되돌리기 1단계.
  function applyCandidate(candidate) {
    assert(candidateValid(candidate), '현재 원고와 다른 시점의 수정안입니다. 다시 요청하세요.');
    const next = applyPacket(st.s.draft, candidate.packet);
    assert(candidateValid(candidate), '원고가 바뀌었습니다.');
    host.replaceView(toView(next), 'AI 수정안 적용 · ' + candidate.label);
    candidate.status = 'applied';
    lastSig = null;
    sync();
    st.s.revision++; // 다른 대기 수정안은 원고가 바뀐 것으로 본다
    touch(false);
    emit();
  }
  const changesOf = (candidate) => loreChanges(candidate.packet, candidate.before.globalLore ?? []);
  function discardCandidate(candidate) {
    if (!candidate.status) { candidate.status = 'discarded'; touch(false); emit(); }
  }

  // ---- 설정·프롬프트·프리셋·저장본 ----
  async function setSettings(patch) {
    st.settings = normalizeSettings({ ...st.settings, ...patch });
    await store.saveSettings(st.settings);
    emit();
  }
  async function setPrompt(task, p) {
    assert(TASKS[task], '알 수 없는 작업입니다.');
    composeMessages({ ...st.s, draft: toDraft(host.getView()) }, task, 'x', p); // 치환 자리·문자열 검사
    st.prompts[task] = { system: p.system, user: p.user };
    st.s.promptRevision++;
    touch(false);
    await store.savePrompt(task, p);
    emit();
  }
  async function resetPrompt(task) {
    delete st.prompts[task];
    st.s.promptRevision++;
    touch(false);
    await store.resetPrompt(task);
    emit();
  }
  async function setPreset(state, { save = true } = {}) {
    st.s.preset = validatePresetState(state);
    st.s.promptRevision++;
    touch(false);
    if (save) { st.savedPreset = clone(st.s.preset); await store.savePreset(st.savedPreset); }
    emit();
  }
  function setTask(task) { assert(TASKS[task], '알 수 없는 작업입니다.'); st.task = task; emit(); }
  function setRequest(task, text) { st.s.requests[task] = text; touch(false); }
  // 제작 노트·종류: 요청에 같이 실린다. 바뀌면 대기 수정안은 '맥락이 바뀜'으로 본다
  function setBrief(text, kind) {
    const s = st.s;
    const brief = String(text ?? s.brief);
    const k = kind === undefined ? s.kind : kind;
    assert(['character', 'simulation'].includes(k), '종류는 character 또는 simulation이에요.');
    if (brief === s.brief && k === s.kind) return;
    s.brief = brief; s.kind = k;
    s.promptRevision++;
    touch(false);
    emit();
  }
  // ---- 요청에 포함할 로어북 (항목별 체크 · 전체 포함/제외) ----
  const inclusionChanged = () => { st.s.promptRevision++; touch(false); emit(); };
  function loreList() {
    sync();
    const inc = loreSelection(st.s);
    return (st.s.draft.globalLore ?? []).map((e, i) => ({ index: i, name: e.comment || e.key || '(이름 없음)', folder: e.mode === 'folder', included: inc[i] }));
  }
  function setLoreIncluded(i, on) {
    sync();
    const n = (st.s.draft.globalLore ?? []).length;
    assert(Number.isInteger(i) && i >= 0 && i < n, '없는 로어북 항목이에요.');
    const next = loreSelection(st.s);
    if (next[i] === !!on) return;
    next[i] = !!on;
    st.s.loreIncluded = next;
    inclusionChanged();
  }
  function setAllLore(on) {
    sync();
    const n = (st.s.draft.globalLore ?? []).length;
    if (loreSelection(st.s).every((x) => x === !!on)) return;
    st.s.loreIncluded = Array(n).fill(!!on);
    inclusionChanged();
  }
  function setScopeOnly(on) { st.scopeOnly = !!on; emit(); }
  function setSelected(task, i) { st.s.selected[task] = i; }

  async function saveSlot(name) {
    assert(st.started, '요청을 보내거나 저장본을 불러온 뒤 저장해 주세요.');
    sync();
    st.s.requestSettings = { ...st.settings, task: st.task, scopeOnly: st.scopeOnly };
    const serial = st.serial;
    st.slots[name] = await store.saveSlot(name, st.s);
    if (name === 'autosave') st.autoSerial = serial;
    emit();
  }
  const autosave = async () => { if (st.started && st.serial !== st.autoSerial) await saveSlot('autosave'); };

  // 저장본에서 대화·요청·프리셋·프롬프트 초안만 가져온다. 원고(작업본)는 편집기 것을 그대로 둔다.
  function restoreSlot(name) {
    const slot = st.slots[name];
    assert(slot?.session, '불러올 저장본이 없습니다.');
    restoreSession(slot.session);
  }
  function restoreSession(session) {
    const r = clone(session);
    const cur = sync();
    const savedLore = r.draft?.globalLore, savedInc = r.loreIncluded;
    r.draft = cur; r.targetId = st.s.targetId; r.base = st.s.base; r.source = st.s.source;
    r.loreIncluded = validLoreIncluded(reconcileLoreSelection(savedLore, validLoreIncluded(savedInc, (savedLore ?? []).length), cur.globalLore), (cur.globalLore ?? []).length);
    r.sessionId = st.s.sessionId; r.revision = st.s.revision; r.promptRevision = st.s.promptRevision;
    const sig = stable(cur);
    r.candidates = (r.candidates ?? []).map((c) => {
      if (c.status) return c;
      if (stable(c.before) !== sig) return { ...c, status: 'stale' };
      return { ...c, sessionId: r.sessionId, targetId: r.targetId, revision: r.revision, promptRevision: r.promptRevision };
    });
    if (r.preset) r.preset = validatePresetState(r.preset);
    st.s = r;
    const rs = r.requestSettings;
    if (rs?.task && TASKS[rs.task]) st.task = rs.task;
    st.scopeOnly = !!rs?.scopeOnly;
    st.started = true; st.serial++;
    emit();
  }
  // 봇빌더 원본의 저장본·프롬프트·프리셋 JSON 가져오기
  async function importBB(text) {
    const r = store.importBB(text);
    if (r.kind === 'snapshot') restoreSession(r.session);
    else if (r.kind === 'prompt') await setPrompt(st.task, r.value);
    else await setPreset(r.value);
    return r.kind;
  }
  function newThread() {
    const keep = { preset: st.s.preset };
    st.s = newSession();
    st.s.preset = keep.preset;
    lastSig = null;
    st.started = false; st.serial = 0; st.autoSerial = 0;
    sync();
    emit();
  }

  async function init() {
    st.settings = await store.loadSettings();
    st.prompts = await store.loadPrompts();
    try {
      const preset = await store.loadPreset();
      if (preset) { st.savedPreset = preset; st.s.preset = clone(preset); }
    } catch (error) { st.presetError = error.message; }
    st.slots = await store.readSlots();
    sync();
    st.ready = true;
    autoTimer = setInterval(() => { if (!destroyed) autosave().catch((e) => { st.autoError = e.message; emit(); }); }, AUTOSAVE_MS);
    autoTimer.unref?.();
    emit();
  }
  function destroy() { destroyed = true; clearInterval(autoTimer); st.job?.stop?.('편집기를 닫아 대기를 중단했습니다.'); subs.clear(); }

  return {
    state: st, store, init, destroy, sync,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    TASKS, loreMode, setLoreMode, hasDusk: () => hasDusk(st.s.draft.globalLore), requestWithScope, promptFor, previewRequest, sendRequest, cancel,
    loreList, setLoreIncluded, setAllLore, changesOf,
    candidateValid, candidateState, diff, applyCandidate, discardCandidate,
    setSettings, setPrompt, resetPrompt, setPreset, setTask, setRequest, setScopeOnly, setSelected, setBrief,
    saveSlot, autosave, restoreSlot, importBB, newThread,
    undo: () => host.undo?.(), canUndo: () => !!host.canUndo?.(),
    pendingCount: () => st.s.candidates.filter((c) => !c.status && candidateValidMeta(c)).length
  };
}
