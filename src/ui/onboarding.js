// 시작 안내 (1.8.3 목업 6): 플러그인 창을 꽉 채우는 단계별 설정. 0 환영 → 1 화면 → 2 꾸미기 → 3 장기 기억 → 4 이야기 도우미 → 5 가져오기 → 6 끝.
// 새로 받은 사람·이미 쓰던 사람 상관없이 이 버전을 처음 열 때 한 번 자동으로 뜬다(지금 설정이 미리 골라진 채, 아무것도 초기화하지 않음).
// 고르는 즉시 적용. 끝내거나 '나중에 하기'를 누르면 다시 자동으로 뜨지 않고, 화면마다 자동으로 뜨던 안내(처음 둘러보기·임베딩·프롬프트·AI 제작 안내)도 띄우지 않는다.
import { h, replace } from './dom.js';
import { btn, optionCards, segmented, switchEl, setSwitch, note } from './kit.js';
import { icon } from './icons.js';
import { normalizeTheme, themeVars, THEME_SETS, ACCENTS } from './theme.js';
import { lookParts } from './lookparts.js';
import { TOUR_VER } from './tour.js';
import { memoryGlobalOn } from '../engine/memoryswitch.js';
import { LEVELS } from '../engine/trackpreset.js';
import { DEFAULT_EMBED } from '../engine/embed.js';
import { potInstalled } from '../engine/firstrun.js';
import { loadFairOn, loadDiceOn, DICE_KEY } from '../data/fairplay.js';
import { loadStoryTimeOn } from '../data/storytime.js';
import { readCocoa } from '../engine/cocoamigrate.js';

export var ONBOARD_VER = 1;
var STEPS = ["화면", "꾸미기", "장기 기억", "이야기 도우미", "가져오기", "끝"];
// 시작 안내를 마치면 화면마다 자동으로 뜨던 안내는 더 띄우지 않는다(각 화면의 ?로는 언제든 볼 수 있다)
var AUTO_KEYS = ["rbm:memoryEmbeddingGuide:shown:v1", "da_aibuild:intro"];

export var onboardPending = (ui) => !(ui?.onboardDone && (ui?.onboardVer ?? 0) >= ONBOARD_VER);

export async function maybeOnboarding(ctx) {
  if (!onboardPending(ctx.prefs.ui)) return false;
  await openOnboarding(ctx);
  return true;
}

async function markDone(ctx) {
  try { await ctx.prefs.saveUi({ onboardDone: true, onboardVer: ONBOARD_VER, tourDone: true, tourVer: Math.max(TOUR_VER, ctx.prefs.ui?.tourVer ?? 0), promptIntroDone: true, simpleNoticeDone: true }); } catch { /* 저장 못 해도 닫는다 */ }
  for (const k of AUTO_KEYS) { try { await ctx.api.pluginStorage.setItem(k, "1"); } catch { /* 무시 */ } }
}

export function openOnboarding(ctx, { step = 0 } = {}) {
  ctx.win.querySelector(":scope > .rb-onb")?.remove();
  return new Promise((resolve) => {
    const s = { step, mem: null, story: null, found: null, saving: Promise.resolve() };
    const M = ctx.memory;
    const host = h("div", { class: "rb-onb", role: "dialog", "aria-modal": "true", "aria-label": "시작 안내" });
    const close = async () => {
      await s.saving.catch(() => {});
      await markDone(ctx);
      host.remove();
      ctx.win.ownerDocument.removeEventListener("keydown", onKey, true);
      try { ctx.refresh?.(); } catch { /* 화면 다시 그리기는 선택 */ }
      resolve(true);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    ctx.win.ownerDocument.addEventListener("keydown", onKey, true);
    ctx.win.appendChild(host);
    const fail = (e) => ctx.toast?.(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    const wide = () => (ctx.win.ownerDocument.defaultView?.innerWidth ?? 1280) >= 1000;

    // ── 테마: 꾸미기 화면과 같은 저장 방식(즉시 적용, 잠깐 뒤 저장) ──
    let theme = normalizeTheme(ctx.prefs.ui?.theme), tTimer = null;
    const setTheme = (patch) => {
      theme = normalizeTheme({ ...theme, ...patch });
      ctx.prefs.ui.theme = theme;
      ctx.applyTheme?.();
      clearTimeout(tTimer);
      tTimer = setTimeout(() => { s.saving = ctx.prefs.saveUi({ theme }).catch(fail); }, 250);
      parts?.paint();
      paintPreview();
    };
    let parts = null;
    const preview = h("div", { class: "rb-card bordered rb-look-prev rb-onb-prev", "aria-label": "미리보기" }, h("span", { class: "cap" }, "미리보기"), h("div", { class: "rb-bub o" }, "오늘 회의 자료는 준비됐어요."), h("div", { class: "rb-bub m" }, "고마워요, 바로 확인할게요."),
      h("div", { class: "rb-prev-sample" }, h("span", { class: "rb-prev-btn" }, "버튼"), h("span", { class: "rb-prev-chip" }, "칩"), h("span", { class: "rb-prev-sw", "aria-hidden": "true" })));
    const paintPreview = () => { const r = themeVars(theme, ctx.state?.mode ?? "light"); for (const [k, v] of Object.entries(r.vars)) preview.style.setProperty(k, v); preview.classList.add("is-scoped"); };

    // ── 지금 값 읽기(이미 쓰던 사람은 지금 설정이 미리 골라진다) ──
    async function loadMem() {
      if (s.mem || !M) return s.mem;
      const idx = await M.store.getIndex();
      const { readMemorySetup } = await import('./screens/memory/setup.js');
      const base = await readMemorySetup(ctx).catch(() => ({ kind: "risuai", provider: "openai", model: "", baseUrl: "", key: "", level: "basic" }));
      let emb = { ...DEFAULT_EMBED, hasKey: false };
      try { if (M.embedder) { await M.embedder.load(); emb = M.embedder.status(); } } catch { /* 기본값 */ }
      s.mem = { on: memoryGlobalOn(idx), ...base, touched: false, emb: { on: !!emb.on, url: emb.url || DEFAULT_EMBED.url, model: emb.model || DEFAULT_EMBED.model, key: "", hasKey: !!emb.hasKey }, inject: { ...idx.settings?.inject } };
      return s.mem;
    }
    async function loadStory() {
      if (s.story) return s.story;
      const [fair, dice, time] = await Promise.all([loadFairOn(ctx.api).catch(() => false), loadDiceOn(ctx.api).catch(() => false), loadStoryTimeOn(ctx.api).catch(() => false)]);
      s.story = { fair: !!fair, dice: !!dice, time: !!time, img: !!ctx.imgFix?.isOn?.() };
      return s.story;
    }
    async function loadFound() {
      if (s.found) return s.found;
      const out = { hypa: null, cocoa: null, pot: false };
      try { if (M?.hypa) { const d = await M.hypa.detect(); if (d?.found) out.hypa = d; } } catch { /* 없음 */ }
      try { if (ctx.skills) { const r = readCocoa(await ctx.skills.readCocoaRaw()); if (r.library.sets.length) out.cocoa = r; } } catch { /* 없음 */ }
      try { const db = await ctx.api.getDatabase(["plugins"]); out.pot = potInstalled(db?.plugins); } catch { /* 없음 */ }
      s.found = out;
      return out;
    }
    // 장기 기억 단계에서 고른 것을 저장한다(다음으로 넘어갈 때). 바꾼 게 없으면 아무것도 하지 않는다.
    async function saveMem() {
      const m = s.mem;
      if (!m || !M) return;
      const tasks = [];
      if (m.onTouched) tasks.push(M.switches.setMemoryEverywhere(m.on));
      if (m.on && m.touched) tasks.push(import('./screens/memory/setup.js').then((x) => x.applyMemorySetup(ctx, m)));
      if (m.embTouched && M.embedder) tasks.push(M.embedder.save({ on: m.emb.on, url: m.emb.url.trim() || DEFAULT_EMBED.url, model: m.emb.model.trim() || DEFAULT_EMBED.model, ...(m.emb.key.trim() ? { key: m.emb.key.trim() } : {}) }));
      await Promise.all(tasks);
      m.onTouched = m.touched = m.embTouched = false;
    }

    const field = (label, el, hint) => h("label", { class: "rb-mem-field rb-onb-field" }, h("span", null, label), el, hint ? h("small", { class: "rb-muted" }, hint) : null);
    const srow = (title, text, on, onChange) => { const sw = switchEl(on, { label: title, onChange: (v, el) => { setSwitch(el, v); onChange(v, el); } }); return h("div", { class: "rb-srow" }, h("span", { class: "t" }, title, text ? h("small", null, text) : null), sw); };
    const sec = (title, ...kids) => h("section", { class: "rb-card bordered rb-scard rb-onb-sec" }, title ? h("span", { class: "h" }, title) : null, ...kids);

    // ── 단계별 내용 ──
    async function stepBody(i) {
      if (i === 1) {
        const size = lookParts({ get: () => theme, set: setTheme });
        parts = size;
        return [
          sec("화면 모드", optionCards([{ value: "simple", label: "간단 (추천)", text: "꼭 필요한 것만 보여요. 처음이라면 이걸로." }, { value: "advanced", label: "고급", text: "세부 설정과 개발 도구까지 모두 보여요." }], ctx.prefs.uiMode, (v) => { s.saving = Promise.resolve(ctx.setUiMode?.(v)).catch(fail); }, "화면 모드")),
          sec("글자 크기", size.sizeSeg)
        ];
      }
      if (i === 2) {
        parts = lookParts({ get: () => theme, set: setTheme });
        paintPreview();
        const more = h("details", { class: "rb-morefold rb-onb-more" }, h("summary", null, "모양·글꼴 더 고르기", h("small", { class: "rb-muted" }, " 모서리·그림자·글꼴·바탕 무늬")), parts.shape({ full: false }));
        const dice = h("div", { class: "rb-onb-sethead" }, h("span", { class: "h" }, "테마 묶음 · 바탕과 강조 색을 한 번에"));
        const center = [sec(null, dice, parts.sets), sec("강조 색 · 테마 묶음 위에 덧씌워요", parts.accents), sec("그라데이션", parts.grads)];
        // PC: 미리보기 아래에 밝기 → 그라데이션 방향 → 모양·글꼴 더 고르기(목업 6)
        const side = [preview, sec("밝기", parts.modeSeg, parts.modeNote), sec("그라데이션 방향", parts.dirSeg), more];
        return wide() ? { center, side } : [preview, ...center, sec("밝기", parts.modeSeg, parts.modeNote), more];
      }
      if (i === 3) {
        if (!M) return [note("info", "기억 기능이 아직 준비되지 않았어요. 이 단계는 건너뛰어요.")];
        const m = await loadMem();
        const apiBox = h("div", { class: "rb-onb-api" });
        const drawApi = async () => {
          if (m.kind !== "api") return replace(apiBox);
          const { PROVIDERS, NEEDS_URL } = await import('./screens/memory/setup.js');
          replace(apiBox,
            field("공급자", h("select", { class: "rb-input", "aria-label": "공급자", onChange: (e) => { m.provider = e.target.value; m.touched = true; drawApi(); } }, PROVIDERS.map(([v, l]) => h("option", { value: v, selected: m.provider === v }, l)))),
            field("모델", h("input", { class: "rb-input", placeholder: "예: gpt-4o-mini", value: m.model, "aria-label": "모델", onInput: (e) => { m.model = e.target.value; m.touched = true; } })),
            NEEDS_URL.has(m.provider) ? field("주소", h("input", { class: "rb-input", placeholder: "https://api.example.com/v1", value: m.baseUrl, onInput: (e) => { m.baseUrl = e.target.value; m.touched = true; } })) : null,
            field("API 키", h("input", { class: "rb-input", type: "password", autocomplete: "off", placeholder: "API 키 (이 기기에만 저장)", "aria-label": "API 키", onInput: (e) => { m.key = e.target.value; m.touched = true; } })));
        };
        drawApi();
        const embMsg = h("small", { class: "rb-muted", "aria-live": "polite" }, "모르면 꺼 두세요. 나중에 장기 기억 → 설정에서 켤 수 있어요.");
        const embIn = (label, key, extra = {}) => field(label, h("input", { class: "rb-input", value: m.emb[key], "aria-label": `임베딩 ${label}`, onInput: (e) => { m.emb[key] = e.target.value; m.embTouched = true; }, ...extra }));
        const test = btn("연결 테스트", { size: "sm", onClick: async () => {
          embMsg.textContent = "확인 중…";
          try { m.embTouched = true; await saveMem(); const r = await M.embedder.test(); embMsg.textContent = `연결됐어요 · ${r.dim}차원 · ${r.ms}ms`; } catch (e) { embMsg.textContent = e?.message ?? String(e); }
        } });
        const lvNote = h("small", { class: "rb-muted" }, LEVELS.find((l) => l.id === m.level)?.text ?? "");
        return [
          sec(null, srow("장기 기억 켜기", "모든 채팅에서 켜요. 봇마다 끌 수도 있어요.", m.on, (v) => { m.on = v; m.onTouched = true; if (v) m.touched = true; })),
          sec("기록을 맡길 AI", optionCards([{ value: "risuai", label: "리스 보조 모델 (추천)", text: "RisuAI에 정해 둔 보조 모델을 그대로 써요." }, { value: "api", label: "내 API", text: "주소·키·모델을 직접 넣어요(이 기기에만 저장)." }], m.kind, (v) => { m.kind = v; m.touched = true; drawApi(); }, "기록을 맡길 AI"), apiBox),
          sec("무엇을 기억할까요", segmented(LEVELS.map((l) => [l.id, l.label]), m.level, (v) => { m.level = v; m.touched = true; lvNote.textContent = LEVELS.find((l) => l.id === v)?.text ?? ""; }, "무엇을 기억할까요"), lvNote),
          sec("임베딩 (의미 검색) · 선택",
            srow("임베딩 쓰기", "단어가 달라도 뜻이 비슷한 기억까지 찾아요. 키를 넣으면 켤 수 있어요.", m.emb.on, (v) => { m.emb.on = v; m.embTouched = true; }),
            embIn("API 주소", "url", { placeholder: DEFAULT_EMBED.url }), embIn("모델", "model", { placeholder: DEFAULT_EMBED.model }),
            field("키", h("input", { class: "rb-input", type: "password", autocomplete: "off", placeholder: m.emb.hasKey ? "저장된 키가 있어요" : "비어 있음 · 이 기기에만 저장", "aria-label": "임베딩 키", onInput: (e) => { m.emb.key = e.target.value; m.embTouched = true; } })),
            h("div", { class: "rb-onb-row" }, test), embMsg)
        ];
      }
      if (i === 4) {
        const st = await loadStory();
        const idx = M ? await M.store.getIndex() : null, inj = idx?.settings?.inject ?? {};
        const setInj = (key, v) => { if (!M) return; s.saving = M.store.updateIndex((x) => { x.settings.inject ??= {}; x.settings.inject[key] = v; }).catch(fail); };
        let fairSw = null;
        const fairRow = srow("공정한 전개", "내 뜻대로만 흐르지 않게 해요", st.fair, (v) => { st.fair = v; s.saving = (ctx.fairPlay ? ctx.fairPlay.set(v) : ctx.api.pluginStorage.setItem("dusk.ui.fairPlay", v ? "on" : "off")).catch(fail); });
        fairSw = fairRow.querySelector("[role=switch]");
        return [
          M ? sec("기억 옵션",
            srow("사람다운 기억", "관계 진도·호칭·둘만의 추억 등", inj.human !== false, (v) => setInj("human", v)),
            srow("감정이 시간이 지나면 식어요", "적대·두려움은 빨리, 애정은 천천히", inj.cool !== false, (v) => setInj("cool", v)),
            srow("거짓말·오해 추적", "추리·드라마 봇에 알맞아요", inj.beliefs === true, (v) => setInj("beliefs", v))) : null,
          sec("이야기 도우미",
            fairRow,
            srow("유저 편향 없애기", "주사위로 성패를 가려요 (켜면 공정한 전개도 켜져요)", st.dice, (v) => {
              st.dice = v;
              s.saving = (async () => {
                if (ctx.fairPlay) await ctx.fairPlay.setDice(v); else await ctx.api.pluginStorage.setItem(DICE_KEY, v ? "on" : "off");
                if (v && !st.fair) { st.fair = true; if (ctx.fairPlay) await ctx.fairPlay.set(true); else await ctx.api.pluginStorage.setItem("dusk.ui.fairPlay", "on"); if (fairSw) setSwitch(fairSw, true); }
              })().catch(fail);
            }),
            srow("이야기 시간 자동 삽입", "이야기 속 시각을 AI에게 알려줘요", st.time, (v) => { st.time = v; s.saving = (ctx.storyTime ? ctx.storyTime.set(v) : ctx.api.pluginStorage.setItem("dusk.ui.storyTime", v ? "on" : "off")).catch(fail); }),
            ctx.imgFix ? srow("이미지 태그 자동 교정", "틀린 에셋 태그를 실제 이름으로", st.img, (v) => { st.img = v; s.saving = Promise.resolve(ctx.imgFix.set(v)).catch(fail); }) : null)
        ];
      }
      if (i === 5) {
        const f = await loadFound();
        const rows = [];
        if (f.hypa) rows.push(sec(null, h("div", { class: "rb-onb-found" }, h("span", { class: "t" }, h("b", null, "HypaPlus 기억"), h("small", null, f.hypa.chats ? `채팅 ${f.hypa.chats}개에서 찾았어요` : "이 기기에서 찾았어요")),
          btn("가져오기", { size: "sm", kind: "primary", onClick: async () => { const { openHypaModal } = await import('./screens/memory/hypamodal.js'); await openHypaModal(ctx, { det: f.hypa }); } }))));
        if (f.cocoa) rows.push(sec(null, h("div", { class: "rb-onb-found" }, h("span", { class: "t" }, h("b", null, "코코아전트 스킬"), h("small", null, `스킬 세트 ${f.cocoa.library.sets.length}개`)),
          btn("옮겨오기", { size: "sm", kind: "primary", onClick: async () => {
            try {
              const lib = await ctx.skills.getLibrary(), have = new Set(lib.sets.map((x) => x.name.toLowerCase())); let n = 0;
              for (const set of f.cocoa.library.sets) if (!have.has(set.name.toLowerCase())) { const r = await ctx.skills.importSet(set, "new"); if (r.changed) n++; }
              ctx.toast(n ? `스킬 세트 ${n}개를 옮겼어요. 코코아 화면에서 켜 주세요.` : "이미 다 옮겨 왔어요.");
            } catch (e) { fail(e); }
          } }))));
        if (f.pot) rows.push(sec(null, h("div", { class: "rb-onb-found warn" }, h("span", { class: "t" }, h("b", null, "RisuPot 플러그인이 켜져 있어요"), h("small", null, "같은 기능이 Dusk에 있어서 두 번 기록될 수 있어요. 끄기를 권해요.")))));
        return rows;
      }
      return [];
    }
    const TITLES = [
      null,
      ["1단계 · 화면", "화면을 골라요", "언제든 설정에서 바꿀 수 있어요."],
      ["2단계 · 꾸미기", "분위기를 골라요", "누르면 이 화면이 바로 바뀌어요. ‘플러그인 꾸미기’와 같은 선택지예요."],
      ["3단계 · 장기 기억", "장기 기억을 켤까요?", "AI 응답마다 인물의 상태와 있었던 일을 기억해서, 다음 대화에 알맞게 넣어 줘요."],
      ["4단계 · 이야기 도우미", "이야기를 어떻게 이어 갈까요", "모두 나중에 홈에서 켜고 끌 수 있어요."],
      ["5단계 · 가져오기", "이미 쓰던 게 있나요?", "이 기기에서 찾은 것만 보여요."],
      ["6단계 · 끝", "준비됐어요!", "고른 내용이에요. ‘바꾸기’를 누르면 그 단계로 돌아가요."]
    ];
    async function summary() {
      const m = s.mem ?? (M ? await loadMem().catch(() => null) : null), st = s.story ?? await loadStory(), f = s.found ?? await loadFound();
      const setName = THEME_SETS.find((x) => x.id === theme.set)?.name ?? ACCENTS.find((x) => x.id === theme.preset)?.name ?? "직접 고른 색";
      const modeName = { auto: "자동", light: "밝게", dark: "어둡게", time: "시간 따라" }[theme.mode];
      const sizeName = theme.zoom >= 125 ? "아주 크게" : theme.zoom >= 105 ? "크게" : theme.zoom <= 92 ? "작게" : "보통";
      const story = [st.fair && "공정한 전개", st.dice && "유저 편향 없애기", st.time && "이야기 시간", st.img && "태그 교정"].filter(Boolean);
      const imp = [f.hypa && "HypaPlus", f.cocoa && `스킬 ${f.cocoa.library.sets.length}`].filter(Boolean);
      const row = (label, text, step) => h("div", { class: "rb-srow rb-onb-sum" }, h("span", { class: "t" }, label, h("small", null, text)), btn("바꾸기", { size: "sm", onClick: () => go(step) }));
      return [
        sec(null,
          row("화면", `${ctx.prefs.uiMode === "advanced" ? "고급" : "간단"} · 글자 ${sizeName}`, 1),
          row("분위기", `${setName} · 밝기 ${modeName}`, 2),
          m ? row("장기 기억", m.on ? `켜짐 · ${m.kind === "api" ? "내 API" : "리스 보조 모델"} · ${LEVELS.find((l) => l.id === m.level)?.label ?? "기본"} · 임베딩 ${m.emb.on ? "켜짐" : "꺼짐"}` : "꺼짐", 3) : null,
          row("이야기", story.length ? story.join(" · ") : "모두 꺼짐", 4),
          row("가져오기", imp.length ? imp.join(" · ") : "찾은 것 없음", 5)),
        h("div", { class: "rb-onb-tip" }, icon("help", 18), h("div", null, h("b", null, "막히면 ? 버튼"), h("small", null, "화면마다 오른쪽 위 ?를 누르면 그 화면만 짚어 드려요. 이 안내는 설정 → ‘시작 안내 다시 보기’에서 다시 볼 수 있어요.")))
      ];
    }

    let drawTok = 0;
    async function go(i) {
      if (s.step === 3 && i !== 3) { try { await saveMem(); } catch (e) { fail(e); } }
      // 5단계(가져오기)에 찾은 게 없으면 자동으로 넘어간다
      if (i === 5) { const f = await loadFound(); if (!f.hypa && !f.cocoa && !f.pot) i = s.step > 5 ? 4 : 6; }
      s.step = i;
      await draw();
    }
    async function draw() {
      const tok = ++drawTok, i = s.step;
      parts = null;
      if (i === 0) {
        return replace(host, h("div", { class: "rb-onb-welcome" },
          h("div", { class: "rb-onb-top" }, h("span", null), btn("나중에 하기", { kind: "ghost", size: "sm", id: "rb-onb-later", onClick: close })),
          h("div", { class: "rb-onb-hero" },
            h("span", { class: "rb-onb-logo", "aria-hidden": "true" }, icon("sparkle", 28)),
            h("h2", null, "Dusk Atelier에 오신 걸 환영해요"),
            h("p", null, "1분이면 끝나요. 지금 몇 가지만 골라 두면, 화면마다 따로 뜨는 안내 없이 바로 쓸 수 있어요."),
            h("div", { class: "rb-onb-feats" },
              h("div", null, icon("brain", 20), h("span", null, h("b", null, "장기 기억"), h("small", null, "인물마다 있었던 일·관계를 기억해요"))),
              h("div", null, icon("module", 20), h("span", null, h("b", null, "봇·모듈 정리"), h("small", null, "폴더·연결·가져오기를 한곳에서"))),
              h("div", null, icon("sparkle", 20), h("span", null, h("b", null, "AI로 만들기"), h("small", null, "봇·페르소나를 말로 만들어요")))),
            btn("설정하고 시작하기", { kind: "primary", id: "rb-onb-start", onClick: () => go(1) }))));
      }
      const [kicker, title, sub] = TITLES[i];
      const body = i === 6 ? await summary() : await stepBody(i);
      if (tok !== drawTok) return;
      const split = body && !Array.isArray(body);
      const steps = h("ol", { class: "rb-onb-steps", "aria-label": "단계" }, STEPS.map((t, k) => h("li", { class: k + 1 < i ? "done" : k + 1 === i ? "on" : "", "aria-current": k + 1 === i ? "step" : null },
        h("button", { type: "button", onClick: () => go(k + 1) }, h("i", { "aria-hidden": "true" }, k + 1 < i ? "✓" : String(k + 1)), t))));
      const nav = h("div", { class: "rb-onb-nav" },
        btn("이전", { onClick: () => go(i - 1), id: "rb-onb-prev" }),
        i < 6 ? btn("다음", { kind: "primary", onClick: () => go(i + 1), id: "rb-onb-next" }) : btn("시작하기", { kind: "primary", icon: "check", onClick: close, id: "rb-onb-done" }));
      const head = h("div", { class: "rb-onb-head" }, h("small", { class: "kicker" }, kicker), h("h2", null, title), h("p", null, sub));
      replace(host, h("div", { class: ["rb-onb-frame", split && "has-side"] },
        h("div", { class: "rb-onb-top" }, h("b", { class: "brand" }, "Dusk Atelier · 시작 안내"), h("span", { class: "count" }, `${i}/6`), i < 6 ? btn("건너뛰기", { kind: "ghost", size: "sm", id: "rb-onb-skip", title: "이 단계는 지금 설정 그대로 두고 넘어가요", onClick: () => go(i + 1) }) : null, btn("나중에 하기", { kind: "ghost", size: "sm", id: "rb-onb-later", onClick: close })),
        h("div", { class: "rb-onb-main" },
          steps,
          h("div", { class: "rb-onb-center rb-scroll" }, head, ...(split ? body.center : body), nav),
          split ? h("aside", { class: "rb-onb-side rb-scroll" }, ...body.side) : null)));
      parts?.paint();
      host.querySelector(".rb-onb-center")?.scrollTo?.(0, 0);
    }
    draw();
  });
}
