// AI로 제작 탭 (v1.6.7 3단계). 봇빌더의 작업 화면을 Dusk 방식으로: 다섯 하위 화면.
//   ① 시작하기 — 제작 노트·종류·로어북 방식   ② 프롬프트 프리셋   ③ 작업 프롬프트   ④ 설정   ⑤ 저장본
// 요청을 보내고 수정안을 보는 곳은 우측 하단 AI 창(5단계에서 다듬음)이고, 여기는 '무엇을 어떻게 보낼지'를 준비하는 곳이다.
import { h, replace } from '../dom.js';
import { badge, btn, note, segmented, toggleRow } from '../kit.js';
import { decodePreset } from '../../dev/aibuild/preset-format.js';
import { toggleDefinitions, BLOCK_TYPES } from '../../dev/aibuild/preset-engine.js';
import { activeModules, moduleOptions, readInstalledModules, selectInstalledModules } from '../../dev/aibuild/modules.js';

const SUBS = [['start', '시작하기'], ['preset', '프롬프트 프리셋'], ['prompt', '작업 프롬프트'], ['settings', '설정'], ['saves', '저장본']];
const card = (title, sub, ...kids) => h('section', { class: 'rb-card pad bordered', style: 'display:flex;flex-direction:column;gap:10px' }, h('div', null, h('b', null, title), sub ? h('div', { class: 'rb-muted', style: 'font-size:12px;margin-top:2px' }, sub) : null), ...kids);
const field = (label, input) => h('label', { class: 'rb-field wide' }, h('span', { class: 'rb-label' }, label), input);
const INTRO_KEY = 'da_aibuild:intro';
const INTRO = [
  ['AI로 제작은 뭘 하는 곳인가요?', '말로 요청하면 AI가 캐릭터 설명·로어북·정규식·Lua·첫 메시지를 대신 만들어 줘요. 직접 쓰지 않아도 되고, 이미 써 둔 걸 고쳐 달라고 해도 돼요.'],
  ['어떻게 말을 거나요?', '우측 하단 버튼에서 [AI 창]을 열고, 만들 종류를 고른 뒤 하고 싶은 걸 적어 보내세요. 로어북은 두 가지 방식이 있어요 — Dusk 방식은 폴더·소속·켜지는 조건까지 설계하고(Dusk 플러그인 필요), 일반 방식은 리스 기본 로어북(키·내용)만 만들어요.'],
  ['적용하고 저장하기', 'AI가 만든 건 먼저 수정안 카드로 와요. [적용]을 누르면 각 탭에 바로 반영되고, 마음에 안 들면 [되돌리기]로 한 단계씩 돌아가요. 저장은 편집기 위쪽 [적용] 버튼(Ctrl+S)이고, 2분마다 자동 저장도 해요.']
];
const when = (iso) => { try { return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export function renderAiTab(ctx, { build, openPopup, state = {} }) {
  const st = build.state;
  const root = h('div', { class: 'pane', style: 'display:flex;flex-direction:column;gap:14px;max-width:880px' });
  const content = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });
  state.sub ??= 'start';
  const fail = (e) => ctx.toast(e?.message ?? String(e), { error: true });
  const pendingBadge = () => { const n = build.pendingCount(); return n ? badge(`수정안 ${n}`, 'ok') : null; };

  const head = h('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' },
    h('b', { style: 'font-size:16px' }, 'AI로 제작'),
    h('span', { class: 'rb-muted', style: 'flex:1;min-width:120px;font-size:13px' }, '말로 요청하면 AI가 수정안을 만들고, 적용하면 각 탭에 바로 반영돼요.'),
    btn('AI 창 열기', { kind: 'primary', icon: 'sparkle', onClick: () => openPopup() })
  );
  const seg = segmented(SUBS, state.sub, (v) => { state.sub = v; paint(); }, '하위 화면');
  seg.classList.add('rb-seg-nowrap');
  seg.style.overflowX = 'auto';
  // 처음 들어왔을 때 한 번만 3장 안내 (끝내거나 건너뛰면 다시 안 뜨고, [사용법]으로 언제든 다시 볼 수 있다)
  const introBox = h('div');
  const showIntro = (i) => {
    state.intro = i;
    const last = i === INTRO.length - 1;
    const done = () => { state.intro = null; replace(introBox); try { Promise.resolve(ctx.api.pluginStorage.setItem(INTRO_KEY, '1')).catch(() => {}); } catch { /* 저장 실패는 무시 */ } };
    replace(introBox, h('section', { class: 'rb-card pad bordered', role: 'region', 'aria-label': '사용 안내', style: 'display:flex;flex-direction:column;gap:10px;border-color:var(--rb-sel-ring)' },
      h('div', { style: 'display:flex;align-items:center;gap:8px' }, h('span', { class: 'rb-muted', style: 'font-size:12px;font-weight:700' }, `사용 안내 ${i + 1} / ${INTRO.length}`), h('span', { style: 'flex:1' }),
        btn('건너뛰기', { size: 'sm', kind: 'ghost', onClick: done })),
      h('b', { style: 'font-size:15px' }, INTRO[i][0]),
      h('div', { class: 'rb-muted', style: 'font-size:13.5px;line-height:1.7' }, INTRO[i][1]),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        i > 0 ? btn('이전', { size: 'sm', onClick: () => showIntro(i - 1) }) : null,
        last ? btn('시작하기', { kind: 'primary', size: 'sm', icon: 'check', onClick: () => { done(); openPopup(); } }) : btn('다음', { kind: 'primary', size: 'sm', onClick: () => showIntro(i + 1) }))));
  };
  head.insertBefore(btn('사용법', { size: 'sm', icon: 'help', onClick: () => showIntro(0) }), head.lastChild);
  root.append(head, introBox, seg, content);
  if (state.intro != null) showIntro(state.intro);
  else Promise.resolve(ctx.api.pluginStorage.getItem(INTRO_KEY)).then((v) => { if (!v && root.isConnected !== false && state.intro == null) showIntro(0); }).catch(() => {});

  // ---------- ① 시작하기 ----------
  function viewStart() {
    const s = st.s;
    const brief = h('textarea', { class: 'rb-textarea', rows: 5, spellcheck: 'false', placeholder: '예) 게헨나 학원을 배경으로 한 일상 시뮬레이션. 사용자는 전학생. 말투는 가볍게.', style: 'font-family:inherit;font-size:14px' });
    brief.value = s.brief ?? '';
    const kind = segmented([['character', '캐릭터'], ['simulation', '시뮬레이션']], s.kind, (v) => build.setBrief(brief.value, v), '제작 종류');
    brief.addEventListener('change', () => build.setBrief(brief.value));
    const mode = build.loreMode();
    const modeSeg = segmented([['dusk', 'Dusk 방식'], ['plain', '일반 방식']], mode, async (v) => { try { await build.setLoreMode(v); paint(); } catch (e) { fail(e); } }, '이 봇의 로어북 방식');
    const defSeg = segmented([['auto', '자동'], ['dusk', 'Dusk'], ['plain', '일반']], st.settings.lore, async (v) => { try { await build.setSettings({ lore: v }); paint(); } catch (e) { fail(e); } }, '새 봇의 기본 방식');
    return [
      card('1. 무엇을 만들까요?', '여기에 적은 내용은 모든 요청에 함께 전달돼요. 비워 두고 바로 AI 창에서 말해도 돼요.', kind, brief),
      card('2. 로어북은 어떻게 만들까요?', '이 봇에 대한 선택이에요. 봇마다 마지막 선택을 기억해요.', modeSeg,
        h('div', { class: 'rb-muted', style: 'font-size:13px;line-height:1.6' },
          mode === 'dusk'
            ? 'Dusk 방식: 폴더·소속·장소와 켜지는 조건(확률·한 번만·연쇄·변수)까지 AI가 설계해요. 적용하기 전에 규칙 시험으로 확인할 수 있어요. Dusk 플러그인이 있어야 규칙대로 작동해요.'
            : '일반 방식: 리스 기본 로어북(키·내용·항상 켜짐)만 만들어요. Dusk 규칙이 이미 있는 항목은 건드리지 않고, 내용만 고쳐도 규칙은 유지돼요.'),
        h('div', { class: 'rb-muted', style: 'font-size:12px' }, '이 봇에 Dusk 규칙·폴더가 ' + (build.hasDusk() ? '있어요.' : '아직 없어요.')),
        field('새 봇의 기본 방식', defSeg)),
      card('3. 시작하기', null,
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
          btn('AI 창 열기', { kind: 'primary', icon: 'sparkle', onClick: () => openPopup() }),
          btn('새 대화 시작', { icon: 'plus', title: '대화와 수정안을 비우고 처음부터 시작해요 (원고는 그대로)', onClick: () => { build.newThread(); ctx.toast('새 대화를 시작했어요'); paint(); } })),
        build.state.s.thread.length ? h('div', { class: 'rb-muted', style: 'font-size:12px' }, `지금 대화 ${st.s.thread.length}개 · 대기 수정안 ${build.pendingCount()}개`) : null)
    ];
  }

  // ---------- ② 프롬프트 프리셋 ----------
  let showSend = false;
  function viewPreset() {
    const ps = st.s.preset;
    const save = async (next, quiet) => { try { await build.setPreset(next); if (!quiet) paint(); } catch (e) { fail(e); paint(); } };
    const modeSeg = segmented([['direct', '직접 요청'], ['preset', '프리셋 사용']], ps.mode, (v) => save({ ...ps, mode: v }), '요청 방식');
    const out = [];
    out.push(card('요청 방식', '직접 요청: 작업 지침만 보내요. 프리셋 사용: 리스 프롬프트 프리셋의 블록 순서·토글에 맞춰 조립해서 보내요.', modeSeg));
    if (st.presetError) out.push(note('warn', '저장된 프리셋을 읽지 못했어요: ' + st.presetError));

    // 파일
    const file = h('input', { type: 'file', accept: '.risup,.risupreset,.json', style: 'display:none' });
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      file.value = '';
      if (!f) return;
      try { const preset = decodePreset(new Uint8Array(await f.arrayBuffer()), f.name); await build.setPreset({ ...ps, preset, values: {}, mode: 'preset' }); ctx.toast(`프리셋을 불러왔어요 · ${preset.name ?? f.name}`); } catch (e) { fail(e); }
      paint();
    });
    out.push(card('프리셋 파일', ps.preset ? `${ps.preset.name ?? '이름 없음'} · 블록 ${ps.preset.promptTemplate?.length ?? 0}개` : '아직 없어요. 리스에서 내보낸 .risup 파일을 열어 주세요.',
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, btn(ps.preset ? '다른 파일 열기' : '프리셋 파일 열기', { kind: 'primary', icon: 'upload', onClick: () => file.click() }),
        ps.preset ? btn('프리셋 비우기', { onClick: () => save({ ...ps, preset: null, values: {}, mode: 'direct' }) }) : null), file));
    if (!ps.preset) {
      out.push(sendCard());
      return out;
    }
    // 블록
    const blocks = ps.preset.promptTemplate ?? [];
    out.push(card('블록', '보내는 순서예요. 이 화면에서는 보기만 하고, 순서나 내용은 리스에서 고쳐 다시 열어 주세요.',
      h('div', { style: 'display:flex;flex-direction:column;gap:6px;max-height:260px;overflow:auto' }, blocks.map((b, i) => h('div', { style: 'display:flex;gap:8px;align-items:baseline;font-size:13px' },
        h('span', { class: 'rb-muted', style: 'width:26px;text-align:right' }, String(i + 1)),
        h('b', null, BLOCK_TYPES.find(([k]) => k === b.type)?.[1] ?? b.type),
        h('span', { class: 'rb-muted', style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1' }, [b.name, b.role, String(b.text ?? '').replace(/\s+/g, ' ').slice(0, 60)].filter(Boolean).join(' · ')))))));
    // 토글
    let defs = { items: [], definitions: [] };
    try { defs = toggleDefinitions(ps.preset, activeModules(ps)); } catch (e) { out.push(note('err', '토글을 읽지 못했어요: ' + e.message)); }
    if (defs.definitions.length) {
      const setVal = (key, v) => save({ ...ps, values: { ...ps.values, [key]: v } }, true);
      const row = (d) => {
        const cur = ps.values[d.key] ?? (['text', 'textarea'].includes(d.type) ? '' : '0');
        if (d.type === 'switch') return toggleRow(d.label, null, cur === '1', (v) => setVal(d.key, v ? '1' : '0'));
        if (d.type === 'select') {
          const sel = h('select', { class: 'rb-input', 'aria-label': d.label }, (d.options ?? []).map((o, i) => h('option', { value: String(i) }, o)));
          sel.value = cur;
          sel.addEventListener('change', () => setVal(d.key, sel.value));
          return field(d.label, sel);
        }
        const el = h(d.type === 'textarea' ? 'textarea' : 'input', { class: d.type === 'textarea' ? 'rb-textarea' : 'rb-input', value: cur, rows: 3 });
        el.value = cur;
        el.addEventListener('change', () => setVal(d.key, el.value));
        return field(d.label, el);
      };
      const walk = (items) => items.map((n) => n.type === 'group' ? h('div', { style: 'display:flex;flex-direction:column;gap:8px;padding-left:10px;border-left:2px solid var(--rb-line2)' }, h('b', { style: 'font-size:13px' }, n.label), ...walk(n.children))
        : n.type === 'toggle' ? row(n.definition) : n.type === 'caption' ? h('div', { class: 'rb-muted', style: 'font-size:12px' }, n.label) : h('hr'));
      out.push(card('토글', `프리셋의 설정 스위치예요 (${defs.definitions.length}개).`, ...walk(defs.items)));
    }
    out.push(modulesCard(ps, save));
    // 참고자료
    const env = ps.environment;
    const envInput = (label, key, area) => {
      const el = h(area ? 'textarea' : 'input', { class: area ? 'rb-textarea' : 'rb-input', rows: 3, spellcheck: 'false' });
      el.value = env[key] ?? '';
      el.addEventListener('change', () => save({ ...ps, environment: { ...env, [key]: el.value } }, true));
      return field(label, el);
    };
    const globals = h('textarea', { class: 'rb-textarea', rows: 3, spellcheck: 'false', placeholder: '{"변수이름": "값"}' });
    globals.value = Object.keys(env.globals ?? {}).length ? JSON.stringify(env.globals, null, 2) : '';
    globals.addEventListener('change', () => {
      try { const v = globals.value.trim() ? JSON.parse(globals.value) : {}; save({ ...ps, environment: { ...env, globals: v } }, true); } catch (e) { fail(new Error('추가 전역 변수는 JSON 객체여야 해요: ' + e.message)); }
    });
    const ex = ps.excluded;
    out.push(card('참고자료', '프리셋의 {{user}}·페르소나·작가 노트·메모리 자리에 들어갈 내용이에요.',
      envInput('사용자 이름', 'userName', false), envInput('페르소나', 'persona', true), envInput('작가 노트', 'authorNote', true), envInput('메모리', 'memory', true), field('추가 전역 변수 (JSON)', globals),
      toggleRow('프리셋 정규식 제외', '프리셋에 든 정규식을 요청에 반영하지 않아요', ex.regex, (v) => save({ ...ps, excluded: { ...ex, regex: v } }, true)),
      toggleRow('모듈 연동 전체 제외', '선택한 모듈의 로어북·토글을 쓰지 않아요', ex.modules, (v) => save({ ...ps, excluded: { ...ex, modules: v } })),
      toggleRow('오버레이 제외', null, ex.overlay, (v) => save({ ...ps, excluded: { ...ex, overlay: v } }, true))));
    out.push(sendCard());
    return out;
  }
  function modulesCard(ps, save) {
    const box = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const body = h('div', { class: 'rb-muted', style: 'font-size:13px' }, ps.modules.length ? ps.modules.map((m) => m.name).join(' · ') : '선택한 모듈이 없어요.');
    const pick = btn('설치된 모듈에서 고르기', { icon: 'folder', onClick: async () => {
      try {
        const catalog = await readInstalledModules(ctx.api);
        const chosen = new Set(ps.modules.map((m) => m.id));
        const list = h('div', { style: 'display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto' }, catalog.length ? catalog.map((m) => {
          const cb = h('input', { type: 'checkbox' });
          cb.checked = chosen.has(m.id);
          cb.addEventListener('change', () => { if (cb.checked) chosen.add(m.id); else chosen.delete(m.id); });
          return h('label', { style: 'display:flex;gap:8px;align-items:center;font-size:13px' }, cb, m.name || m.id);
        }) : [h('span', { class: 'rb-muted' }, '설치된 모듈이 없어요.')]);
        replace(box, [list, h('div', { style: 'display:flex;gap:8px' },
          btn('이 모듈들 쓰기', { kind: 'primary', size: 'sm', onClick: () => save(selectInstalledModules(ps, catalog, [...chosen])) }),
          btn('닫기', { size: 'sm', onClick: () => replace(box, []) }))]);
      } catch (e) { fail(e); }
    } });
    const opts = ps.modules.map((m) => toggleRow(m.name, '모듈의 정규식·트리거(런타임)는 요청에 쓰지 않아요', moduleOptions(ps, m).skipRuntime, (v) => save({ ...ps, moduleOptions: { ...ps.moduleOptions, [m.id]: { ...moduleOptions(ps, m), skipRuntime: v } } }, true)));
    return card('모듈', '프리셋이 가리키는 리스 모듈을 골라 로어북·토글을 함께 써요.', body, pick, box, ...opts);
  }
  function sendCard() {
    const out = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const task = st.task;
    const paintSend = () => {
      if (!showSend) return replace(out, []);
      try {
        const rep = build.previewRequest(task, st.s.preset.mode === 'preset' && !!st.s.preset.preset);
        const chars = rep.messages.reduce((n, m) => n + m.content.length, 0);
        replace(out, [
          h('div', { class: 'rb-muted', style: 'font-size:12px' }, `작업: ${build.TASKS[task].label} · 메시지 ${rep.messages.length}개 · ${chars.toLocaleString()}자 (한도 ${st.settings.maxInputChars.toLocaleString()}자)`),
          ...(rep.issues ?? []).map((m) => note('err', m)),
          ...(rep.notes ?? []).map((m) => note('warn', m)),
          ...rep.messages.map((m, i) => h('details', null, h('summary', { style: 'cursor:pointer;font-size:13px' }, `${i + 1}. ${m.role} · ${m.content.length.toLocaleString()}자`), h('pre', { style: 'white-space:pre-wrap;max-height:320px;overflow:auto;font-size:12px;margin:6px 0' }, m.content)))
        ]);
      } catch (e) { replace(out, [note('err', e.message)]); }
    };
    paintSend();
    return card('전송 내용 미리보기', '지금 요청 칸에 적은 내용 기준으로 AI에게 실제로 가는 메시지를 보여 줘요.',
      btn(showSend ? '숨기기' : '전송 내용 보기', { icon: 'eye', onClick: () => { showSend = !showSend; paint(); } }), out);
  }

  // ---------- ③ 작업 프롬프트 ----------
  function viewPrompt() {
    const task = state.task && build.TASKS[state.task] ? state.task : st.task;
    state.task = task;
    const cur = build.promptFor(task);
    const sys = h('textarea', { class: 'rb-textarea tall', spellcheck: 'false' });
    const usr = h('textarea', { class: 'rb-textarea tall', spellcheck: 'false' });
    sys.value = cur.system; usr.value = cur.user;
    const sel = h('select', { class: 'rb-input', 'aria-label': '작업 종류' }, Object.entries(build.TASKS).map(([k, t]) => h('option', { value: k }, t.label + (st.prompts[k] ? ' · 고침' : ''))));
    sel.value = task;
    sel.addEventListener('change', () => { state.task = sel.value; paint(); });
    const missing = () => ['TASK_NAME', 'CURRENT_DRAFT', 'USER_REQUEST', 'REFERENCE_CONTEXT', 'OUTPUT_FORMAT'].filter((k) => !usr.value.includes('<<' + k + '>>'));
    return [card('작업별 프롬프트', '작업마다 AI에게 주는 지침이에요. 잘 모르면 그대로 두세요. 고친 뒤 [기본값으로]로 되돌릴 수 있어요.', field('작업', sel),
      field('시스템 프롬프트', sys),
      field('사용자 프롬프트 (<<…>> 자리는 지워지면 안 돼요)', usr),
      h('div', { class: 'rb-muted', style: 'font-size:12px' }, '자리표시: <<TASK_NAME>> <<CURRENT_DRAFT>> <<USER_REQUEST>> <<REFERENCE_CONTEXT>> <<OUTPUT_FORMAT>>'),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        btn('저장', { kind: 'primary', icon: 'check', onClick: async () => { const m = missing(); if (m.length) return fail(new Error('자리표시가 빠졌어요: ' + m.join(', '))); try { await build.setPrompt(task, { system: sys.value, user: usr.value }); ctx.toast('저장했어요'); paint(); } catch (e) { fail(e); } } }),
        btn('기본값으로', { onClick: async () => { try { await build.resetPrompt(task); ctx.toast('기본값으로 되돌렸어요'); paint(); } catch (e) { fail(e); } } }),
        h('span', { class: 'rb-muted', style: 'font-size:12px;align-self:center' }, st.prompts[task] ? '기본값과 달라요' : '기본값이에요')))];
  }

  // ---------- ④ 설정 ----------
  function viewSettings() {
    const s = st.settings;
    const set = async (patch) => { try { await build.setSettings(patch); } catch (e) { fail(e); } };
    const modelSeg = segmented([['submodel', '보조 모델'], ['model', '메인 모델']], s.model, (v) => set({ model: v }), '모델');
    const num = (key, min, max, unit) => {
      const el = h('input', { class: 'rb-input', type: 'number', min: String(min), max: String(max), style: 'max-width:200px' });
      el.value = String(s[key]);
      el.addEventListener('change', () => { const v = Number(el.value); if (!(v >= min && v <= max)) { el.value = String(s[key]); return fail(new Error(`${min.toLocaleString()}~${max.toLocaleString()} 사이 숫자를 넣어 주세요`)); } set({ [key]: v }); });
      return h('div', { style: 'display:flex;gap:8px;align-items:center' }, el, h('span', { class: 'rb-muted' }, unit));
    };
    return [
      card('모델', '리스에 설정해 둔 모델을 써요. 보조 모델이 더 싸고 빨라요.', modelSeg),
      card('기다리는 시간·보내는 양', null, field('응답을 기다리는 시간', num('timeout', 10, 3600, '초')), field('한 번에 보낼 최대 글자 수', num('maxInputChars', 1000, 1000000, '자'))),
      card('안전장치', null, toggleRow('검사에 걸리면 AI에게 한 번 다시 요청', 'Dusk 방식의 설계가 규칙 검사를 통과하지 못하면 오류 내용을 붙여 한 번만 다시 물어봐요', s.retry, (v) => set({ retry: v })))
    ];
  }

  // ---------- ⑤ 저장본 ----------
  function viewSaves() {
    const slots = st.slots;
    const row = (name, label) => {
      const sl = slots[name];
      if (!sl) return h('div', { class: 'rb-muted' }, `${label}: 없어요`);
      if (sl.error) return h('div', null, note('warn', `${label}: ${sl.error}`));
      const s = sl.session;
      return h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' },
        h('div', { style: 'flex:1;min-width:160px' }, h('b', null, label), h('div', { class: 'rb-muted', style: 'font-size:12px' }, `${when(sl.savedAt)} · 대화 ${s.thread.length}개 · 수정안 ${s.candidates.filter((c) => !c.status).length}개`)),
        btn('불러오기', { size: 'sm', onClick: () => { try { build.restoreSlot(name); ctx.toast('대화·요청·프리셋을 불러왔어요 (원고는 지금 편집 중인 것을 그대로 써요)'); paint(); } catch (e) { fail(e); } } }));
    };
    const file = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      file.value = '';
      if (!f) return;
      try { const kind = await build.importBB(await f.text()); ctx.toast(`가져왔어요 (${{ snapshot: '저장본', prompt: '프롬프트', preset: '프리셋' }[kind]})`); } catch (e) { fail(new Error('가져오지 못했어요: ' + e.message)); }
      paint();
    });
    return [
      card('저장본', '3분마다 자동으로, 또는 직접 눌러 저장해요. 불러오면 대화·요청·프리셋만 가져오고 원고는 편집기의 것을 그대로 써요.', row('autosave', '자동 저장'), row('manual', '임시 저장'),
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, btn('지금 임시 저장', { icon: 'download', onClick: async () => { try { await build.saveSlot('manual'); ctx.toast('임시 저장했어요'); paint(); } catch (e) { fail(e); } } }))),
      card('봇빌더에서 가져오기', '봇빌더(원본)에서 내보낸 저장본·프롬프트·프리셋 JSON을 읽어 와요.', h('div', null, btn('JSON 파일 열기', { icon: 'upload', onClick: () => file.click() }), file))
    ];
  }

  const VIEWS = { start: viewStart, preset: viewPreset, prompt: viewPrompt, settings: viewSettings, saves: viewSaves };
  function paint() {
    if (!root.isConnected && root.__painted) return;
    root.__painted = true;
    const fn = VIEWS[state.sub] ?? viewStart;
    let kids;
    try { kids = fn(); } catch (e) { kids = [note('err', '이 화면을 그리지 못했어요: ' + e.message)]; }
    const pb = pendingBadge();
    replace(content, pb ? [h('div', { style: 'display:flex;gap:8px;align-items:center' }, pb, h('span', { class: 'rb-muted', style: 'font-size:12px' }, 'AI 창에서 확인하고 적용하세요')), ...kids] : kids);
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === state.sub ? 'true' : 'false'));
  }
  // 수정안 수·저장본이 바뀌면 배지만 다시 그린다 (입력 중인 칸을 날리지 않게 시작·저장본 화면에서만 전체 갱신)
  const unsub = build.subscribe(() => {
    if (!root.isConnected) return unsub();
    if (['saves', 'start'].includes(state.sub) && !root.contains(root.ownerDocument.activeElement?.closest?.('textarea,input,select') ?? null)) paint();
  });
  paint();
  root.__dispose = unsub;
  return root;
}
