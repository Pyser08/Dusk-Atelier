import { h, replace } from "../../dom.js";
import { openEmbedModal } from "./embedmodal.js";
import { regexSection } from "./regexui.js";
import { openHypaModal } from "./hypamodal.js";
import { btn, switchEl, setSwitch, confirmDialog, progressBar, loading } from "../../kit.js";
import { AI_MODES } from "../../../engine/merge.js";
import { getCfg as getModelCfg } from "../../../data/modelhub.js";
import { mem, fail, potOn, askRefresh } from "./common.js";
import { parseTags, DEFAULT_TAG_TEXT } from "../../../engine/card/tags.js";
import { advancedBot } from "./advanced.js";
import { scopeChip, tracked, searchBox, openSettingsHistory, shareSection, previewBox } from "./settingstools.js";
import { pushHist } from "../../../engine/settingsutil.js";
import { noteEdits, DUSK_FOLLOW } from "../../../engine/defaultfollow.js";

export function builders(ctx, idx, redraw, kind = "all") {
  const M = ctx.memory, S = idx.settings;
  const save = (fn) => M.store.updateIndex((i) => { const before = structuredClone(i.settings); fn(i.settings, i); i.settings.edited = noteEdits(before, i.settings, i.settings.edited, DUSK_FOLLOW); i.settingsHistory = pushHist(i.settingsHistory, "dusk", before, i.settings); }).then(() => redraw()).catch(fail(ctx));
  const num = (label, get, set, { min = 0, max = 99999, step = 1 } = {}) => h("label", { class: "rb-mem-field" }, h("span", null, label), h("input", { class: "rb-input", type: "number", min, max, step, value: get(), onChange: (e) => { const v = Math.min(max, Math.max(min, Number(e.target.value) || 0)); save((s) => set(s, v)); } }));
  const sw = (label, on, set) => h("div", { class: "rb-mem-field row" }, h("span", null, label), switchEl(on, { label, onChange: (v, el) => { setSwitch(el, v); save((s) => set(s, v)); } }));
  const section = (title, ...kids) => { const [t, k = kind] = Array.isArray(title) ? title : [title]; return h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, t, k ? scopeChip(k) : null), ...kids); };
  return { M, S, save, num, sw, section };
}

// ---- 전체 설정: 기억 탭 메인 화면(봇 목록 위)에 접이식으로 둔다. 모든 봇에 공통 적용.
export async function renderGlobalSettings(ctx, host, { redraw, panel = false }) {
  const m = mem(ctx), M = ctx.memory, idx = await M.store.getIndex();
  const backend = M.backend(idx.settings), caps = M.capabilities(backend.id);
  const { S, save, num, sw, section } = builders(ctx, idx, redraw);
  const mode = h("select", { class: "rb-input", "aria-label": "분석 모델" }, AI_MODES.map(([v, l]) => h("option", { value: v, selected: (S.model.mode ?? "memory") === v }, l)));
  const sid = h("input", { class: "rb-input", placeholder: "모델 ID", value: S.model.staticModel ?? "", "aria-label": "모델 ID", style: S.model.mode === "static" ? "" : "display:none" });
  const saveModel = () => save((s) => { s.model = { mode: mode.value, ...(mode.value === "static" ? { staticModel: sid.value.trim() } : {}) }; });
  mode.addEventListener("change", saveModel); sid.addEventListener("change", saveModel);
  const mcfg = await getModelCfg(ctx.api).catch(() => ({ presets: [] }));
  const smSel = h("select", { class: "rb-input", "aria-label": "서버 분석에 쓸 모델", onChange: () => save((s) => { s.serverModel = { presetId: smSel.value }; }) },
    h("option", { value: "" }, "지금 분석 모델 그대로"), ...(mcfg.presets ?? []).filter((p) => p.preset?.provider !== "risuai").map((p) => h("option", { value: p.id, selected: S.serverModel?.presetId === p.id }, `${p.name} · ${p.preset.provider} / ${p.preset.model}`)));
  const last = M.injector?.lastRequest?.(), man = last?.manifest;
  const modeLabel = backend.id === "bardwiki" ? "BardWiki 모드" : backend.id === "off" ? "기억 꺼짐" : "플러그인 모드";

  const flowHost = h("div"), shareHost = h("div");
  const adv = h("details", { class: "rb-mem-man rb-mem-adv rb-mem-advfold", open: !!m.advOpen, onToggle: (e) => { m.advOpen = e.target.open; } }, h("summary", null, "고급: 기록·기억 넣기 세부 설정"),
    section("기억 저장소", h("label", { class: "rb-mem-field" }, h("span", null, "저장소"), h("select", { class: "rb-input", onChange: (e) => save((s) => { s.backend = e.target.value; }).then(() => askRefresh(ctx)) }, [["auto", "자동"], ["local", "플러그인"], ["bardwiki", "BardWiki"], ["off", "끔"]].map(([v, l]) => h("option", { value: v, selected: S.backend === v }, l)))), h("p", { class: "rb-muted" }, "리스바드에서는 이중 비용을 막으려고 플러그인의 분석·기억 넣기을 끄고 위키를 읽어요. 바꾼 뒤에는 RisuAI를 다시 불러와야 훅에 반영돼요.")),
    caps.analyze ? section("분석", h("label", { class: "rb-mem-field" }, h("span", null, "분석 모델"), mode, sid),
      num("보조 모델 제한시간(초, 기본 600)", () => S.modelTimeoutSec ?? 600, (s, v) => { s.modelTimeoutSec = Math.max(10, v); }, { min: 10, max: 3600, step: 10 }),
      h("label", { class: "rb-mem-field" }, h("span", null, "자동 기록 시점"), h("select", { class: "rb-input", "aria-label": "자동 기록 시점", onChange: (e) => save((s) => { s.confirm = e.target.value; s.potStore = { ...(s.potStore ?? {}), confirm: e.target.value }; }) }, [["next", "다음 입력을 보낼 때 (권장)"], ["now", "응답을 받은 직후"]].map(([v, l]) => h("option", { value: v, selected: (S.confirm === "now" ? "now" : "next") === v }, l)))),
      h("p", { class: "rb-muted" }, "‘다음 입력을 보낼 때’는 내가 다음 말을 보내는 순간 직전 응답을 확정해서 기록해요. 리롤하거나 고치는 중인 응답은 기록하지 않아서 되돌릴 일이 거의 없어요. 대신 마지막 응답은 다음 말을 보낼 때까지 기록되지 않아요."),
      num("디바운스(초)", () => S.debounceSec, (s, v) => { s.debounceSec = v; }, { max: 60 }), num("기록 시작 턴(1=첫 응답부터)", () => S.startTurn ?? 1, (s, v) => { s.startTurn = Math.max(1, v); }, { min: 1, max: 50 }), num("N턴마다 분석", () => S.everyN, (s, v) => { s.everyN = Math.max(1, v); }, { min: 1, max: 20 }),
      num("짧은 응답 기준(글자)", () => S.minChars, (s, v) => { s.minChars = v; }, { max: 2000 }), num("인물당 기록 상한", () => S.personCap, (s, v) => { s.personCap = Math.max(20, v); }, { min: 20, max: 2000 }),
      sw("가벼운 모델 모드", S.light === true, (s, v) => { s.light = v; }),
      h("p", { class: "rb-muted" }, "가벼운 모델(flash·mini 등)이 형식을 잘 못 맞출 때 직접 켜세요. 세부 분석을 최대 3명으로 줄이고 속마음·갈등·추억은 요구하지 않아요."),
      sw("단계별 분석 (안정적, 호출은 늘어요)", S.staged !== false, (s, v) => { s.staged = v; }),
      h("p", { class: "rb-muted" }, "먼저 한 번 호출해 누가 나오는지·전반적인 상황을 파악하고, 이어서 중요한 인물마다 한 번씩(최대 6명) 세부를 분석해요. 응답이 길어 형식이 깨지거나 실패하는 걸 줄여요. 한 인물의 세부 분석이 실패해도 나머지는 기록돼요."),
      sw("서버에서 지난 대화 분석 (Dusk Cellar)", S.serverAnalysis !== false, (s, v) => { s.serverAnalysis = v; }),
      h("p", { class: "rb-muted" }, "Dusk Cellar가 연결돼 있고 기억이 서버에 저장될 때, '지난 대화 분석'을 서버에서 계산해요(기기 메모리·배터리 절약). 끄면 항상 기기에서 분석해요. 끄면 항상 기기에서 분석해요."),
      h("label", { class: "rb-mem-field" }, h("span", null, "서버 분석에 쓸 모델"), smSel),
      h("p", { class: "rb-muted" }, "'내 API' 모델을 고르면 서버가 직접 불러서 리스 화면을 닫거나 다른 앱을 봐도 끝까지 돌아요. '지금 분석 모델 그대로'이고 그게 리스 쪽 모델이면 리스 화면이 켜져 있을 때만 진행돼요(꺼지면 서버가 기다려요)."),
      sw("전체 자동 기록", S.autoRecord !== false, (s, v) => { s.autoRecord = v; })) : null,
    caps.inject ? section("임베딩(의미 검색)", h("p", { class: "rb-muted" }, "뜻이 비슷한 기억을 찾아 넣어요. 주소·키를 넣고 기본 사용을 켜면 기억 고르기에 적극 쓰여요."),
      btn("임베딩 설정", { onClick: () => openEmbedModal(ctx) })) : null,
    caps.analyze ? regexSection(ctx, { S, save, sw, section }) : null,
    caps.analyze ? section("HypaPlus에서 가져오기", h("p", { class: "rb-muted" }, "HypaPlus에 쌓은 기억을 장면·인물 기록으로 옮겨요. HypaPlus와는 동시에 쓸 수 없어요."), btn("HypaPlus 가져오기", { onClick: () => openHypaModal(ctx, {}) })) : null,
    caps.inject || caps.analyze ? section("기억 넣기",   // 켜기·확장 넣기 스위치는 고급 '대화에 넣기'에만 둔다
      h("p", { class: "rb-muted" }, "목표·상한 토큰은 장기 기억 홈의 ‘기억 옵션’에 있어요."),
      num("기억 넣기 시작 턴", () => S.inject.fromTurn, (s, v) => { s.inject.fromTurn = Math.max(1, v); }, { min: 1, max: 50 }), num("이야기 요약 토큰", () => S.inject.eventTokens, (s, v) => { s.inject.eventTokens = v; }, { min: 0, max: 4000 }),
      num("오래된 D·C 잊기(메시지 수, 0=끔)", () => S.inject.forgetAfter ?? 150, (s, v) => { s.inject.forgetAfter = v; }, { max: 5000, step: 10 }),
      num("최근 메시지 겹침 제외(개)", () => S.inject.recentSkip, (s, v) => { s.inject.recentSkip = v; }, { max: 40 }),
      h("label", { class: "rb-mem-field" }, h("span", null, "삽입 위치"), h("select", { class: "rb-input", onChange: (e) => save((s) => { s.inject.position = e.target.value; }) }, [["beforeLastUser", "마지막 사용자 메시지 앞"], ["afterSystem", "시스템 프롬프트 뒤"]].map(([v, l]) => h("option", { value: v, selected: S.inject.position === v }, l)))),
      h("details", { class: "rb-mem-man" }, h("summary", null, "마지막 요청에 들어간 기억 보기"), man ? h("div", null, h("p", { class: "rb-muted" }, `${new Date(last.at).toLocaleTimeString()} · ${last.injected ? `넣음 (약 ${man.tokens} 토큰)` : "넣지 않음"}`),
        h("ul", null, [...man.included.map((x) => `포함 · ${x.kind === "scene" ? "현재 상황" : x.name} (${x.tokens})`), ...man.excluded.map((x) => `제외 · ${x.name} (${x.tokens}, 예산 초과)`)].map((t) => h("li", null, t))), last.text ? h("pre", { class: "rb-mem-pre" }, last.text) : null) : h("p", { class: "rb-muted" }, "아직 요청이 없었어요.")), potOn(S) ? previewBox(ctx) : null) : null);
  // 흐름 설정·공유 칸은 읽는 데 오래 걸려서 화면을 먼저 보여 주고 뒤에서 채운다. 접힌 설정은 처음 열 때 채운다.
  let loaded = false;
  const loadHeavy = () => {
    if (loaded) return; loaded = true;
    if (backend.id !== "local" || !potOn(S)) return;
    // 리수폿 설정(수준·기능·방식·성인·모델·가져오기·고급)은 장기 기억 → 리수폿 화면의 '설정' 탭으로 옮겼다(2.0.0)
    replace(flowHost, h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, "리수폿 설정"), h("p", { class: "rb-muted" }, "추적 수준·기능 카드·AI 모델·가져오기는 리수폿 화면의 ‘설정’ 탭에 있어요."),
      h("div", { class: "rb-mem-sact" }, btn("리수폿 설정 열기", { onClick: () => { const mm = mem(ctx); mm.page = "pot"; mm.potTab = "settings"; ctx.go?.("memory"); redraw(); } }))));
    if (M.flow) (async () => { try { const st = await M.flow.settings(); if (!st.status().blocked) replace(shareHost, shareSection(ctx, tracked(ctx, st), { apply: () => M.flow.apply().catch(fail(ctx)), redraw })); } catch { /* 흐름 설정을 못 읽으면 공유 칸만 뺀다 */ } })();
  };
  const tools = h("div", { class: "rb-mem-tools" });
  const body = h("div", { class: "rb-mem-foldbody" }, h("div", { class: "rb-mem-modeline" }, h("span", { class: ["rb-mem-mode", backend.id] }, modeLabel), h("span", { class: "rb-muted" }, backend.reason)), tools, flowHost, shareHost, adv);
  tools.append(searchBox(body), btn("설정 변경 이력", { size: "sm", onClick: () => openSettingsHistory(ctx, { apply: () => M.flow?.apply?.(), redraw }).catch(fail(ctx)) }));
  if (panel) {
    // 넓은 화면: 설정을 오른쪽(가운데) 칸에 크게 펼친다.
    loadHeavy();
    return replace(host, h("section", { class: "rb-mem-setpanel" }, h("div", { class: "rb-mem-sethead" }, h("b", null, "설정"), h("span", { class: ["rb-mem-mode", backend.id] }, modeLabel), btn("닫기", { size: "sm", onClick: () => { m.globalOpen = false; redraw(); } })), body));
  }
  const fold = h("details", { class: "rb-mem-fold", open: !!m.globalOpen }, h("summary", null, "설정", h("span", { class: ["rb-mem-mode", backend.id] }, modeLabel)), body);
  fold.addEventListener("toggle", () => { m.globalOpen = fold.open; if (fold.open) loadHeavy(); });
  if (m.globalOpen) loadHeavy();
  replace(host, fold);
}

// ---- 봇 안의 '설정' 폴드 내용: 지난 대화 분석, 제외 이름, 초기화, 상태. (토글 옆 버튼으로 여닫는다)
export function renderBotSettings(env) {
  const { ctx, idx, caps, bot, chatItem } = env, M = ctx.memory;
  const { section } = builders(ctx, idx, env.redraw, "bot");
  const ignore = idx.bots[bot.id]?.ignore ?? [];
  const ignIn = h("input", { class: "rb-input", placeholder: "제외할 이름 추가 후 Enter", "aria-label": "제외 이름", onKeydown: (e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); M.store.updateIndex((i) => { const b = i.bots[bot.id] ??= { on: true, ignore: [], fails: 0 }; b.ignore = [...new Set([...(b.ignore ?? []), v])]; }).then(env.redraw).catch(fail(ctx)); } } });
  const reset = async (scope) => {
    const ok = await confirmDialog(ctx.win, { title: "기억 초기화", body: scope === "chat" ? "이 채팅의 기억을 모두 지워요." : scope === "bot" ? "이 봇의 모든 채팅 기억을 지워요." : "모든 봇의 기억을 지워요.", ok: "지우기", danger: true }); if (!ok) return;
    try { if (scope === "chat") await M.store.deleteFolder(bot.id, chatItem.id); else if (scope === "bot") await M.store.deleteBot(bot.id); else await M.store.resetAll(); env.redraw(); } catch (e) { fail(ctx)(e); }
  };

  const advBox = h("div");
  if (idx.settings.flow?.advanced === true && idx.settings.flow?.on === true) advancedBot(env, advBox).catch(fail(ctx));
  return h("div", { class: "rb-mem-foldbody" },
    caps.analyze ? section("이 봇에서 기록하지 않을 이름", h("div", { class: "rb-mem-chats" }, ignore.map((n) => h("button", { type: "button", class: "rb-chip", title: "눌러서 제거", onClick: () => M.store.updateIndex((i) => { i.bots[bot.id].ignore = i.bots[bot.id].ignore.filter((x) => x !== n); }).then(env.redraw) }, n, " ✕")), ignIn)) : null,
    advBox,
    section(["초기화", null], h("div", { class: "rb-mem-sact" }, btn("이 채팅 기억 지우기", { onClick: () => reset("chat") }), btn("이 봇 기억 지우기", { onClick: () => reset("bot") }), btn("전체 기억 지우기", { onClick: () => reset("all") }))),
    section(["상태", "chat"], h("p", { class: "rb-muted" }, `훅: ${idx.status.hook} · 처리 ${idx.status.processed}회 · 마지막 성공 ${idx.status.lastSuccessAt ? new Date(idx.status.lastSuccessAt).toLocaleString() : "없음"}${idx.status.lastError ? " · 오류: " + idx.status.lastError : ""}`)));
}


// ---- 지난 대화 분석: 설정 폴드를 열지 않아도 봇 화면에서 바로 쓴다.
export function renderBotAnalysis(env) {
  const { ctx, idx, caps, bot, chatItem } = env, M = ctx.memory;
  if (!caps.analyze) return null;
  const { section } = builders(ctx, idx, env.redraw, "bot");
  // 일괄 분석
  const total = chatItem.chat?.message?.length ?? 0;
  const from = h("input", { class: "rb-input", type: "number", min: 1, max: total, value: 1, "aria-label": "시작 메시지 번호" }), to = h("input", { class: "rb-input", type: "number", min: 1, max: total, value: total, "aria-label": "끝 메시지 번호" });
  const est = h("div", { class: "rb-muted" }), prog = h("div"), msgs = chatItem.chat?.message ?? [];
  const range = () => ({ from: Math.max(0, +from.value - 1), to: Math.max(0, +to.value - 1) });
  const paintEst = () => {
    const p = M.runner.planBackfill(msgs, range(), env.folder);
    est.textContent = `AI 응답 ${p.total}개 · 분석됨 ${p.done} · 미처리 ${p.todo}${p.failed ? ` (지난번 실패 ${p.failed})` : ""} → 예상 호출 ${p.calls}회 · 대략 ${p.tokens.toLocaleString()} 토큰`;
  };
  from.addEventListener("input", paintEst); to.addEventListener("input", paintEst); if (caps.analyze) paintEst();
  let ctrl = null, failed = [];
  const run = async (only) => {
    const pl = M.runner.planBackfill(msgs, range(), env.folder);
    const redo = !pl.todo && pl.total > 0;   // 미분석이 없으면 전체를 다시 분석한다
    if (!pl.total) return ctx.toast("분석할 AI 응답이 없어요.");
    if (redo) ctx.toast("미분석 응답이 없어요. 전체를 다시 분석해요.");
    ctrl = new AbortController(); const start = btn("취소", { onClick: () => ctrl.abort() }); replace(prog, progressBar(0), start);
    try {
      const r = await M.runner.backfill(bot.index, chatItem.index, range(), { signal: ctrl.signal, redo, onProgress: (n, t, f) => replace(prog, progressBar(Math.round(n / t * 100)), h("span", { class: "rb-muted" }, `${n}/${t} · 실패 ${f}`), start) });
      failed = r.failed; ctx.toast(`지난 대화 분석이 끝났어요${r.server ? " (서버)" : ""} (${r.total - r.failed.length}/${r.total}).${r.reasons?.length ? ` 실패 이유: ${r.reasons[0]}` : ""}`, r.failed.length ? { error: true } : undefined); env.redraw();
    } catch (e) { fail(ctx)(e); env.redraw(); }
  };
  return section(["지난 대화 분석 (이 채팅 전체)", "chat"], h("div", { class: "rb-mem-range" }, from, "~", to), est, h("div", { class: "rb-mem-sact" }, btn("지난 대화 분석", { kind: "primary", onClick: () => run() }), failed.length ? btn(`실패만 다시 (${failed.length})`, { onClick: () => run(true) }) : null), prog);
}

// ---- 카드 설정: 태그·스탯 정의, 기본 언어, 연결 추가 지시. 카드 만들기와 새 봇 만들기에서 쓴다.
export function cardSettings(ctx, cfg, redraw) {
  const M = ctx.memory, save = (patch) => M.cards.setCfg(patch).then(() => redraw()).catch(fail(ctx));
  const tagArea = h("textarea", { class: "rb-input rb-card-tags", "aria-label": "태그 정의", spellcheck: "false", style: "min-height:240px;height:auto;padding:10px;font-family:monospace;font-size:12px" }); tagArea.value = cfg.tagText;
  const status = h("p", { class: "rb-muted" }), saveBtn = btn("태그 정의 저장", { kind: "primary", onClick: () => save({ tagText: tagArea.value }) });
  const check = () => { const p = parseTags(tagArea.value), bad = p.errors.length; status.textContent = bad ? `오류 ${bad}개: ${p.errors.slice(0, 3).join(" · ")}` : `스탯 ${Object.keys(p.stats).length}개 · 태그 ${Object.keys(p.tags).length}개`; saveBtn.disabled = !!bad || !Object.keys(p.tags).length; };
  tagArea.addEventListener("input", check); check();
  const ta = (label, key, rows) => { const t = h("textarea", { class: "rb-input", "aria-label": label, style: `min-height:${rows}px;height:auto;padding:10px`, onChange: (e) => save({ [key]: e.target.value }) }); t.value = cfg[key] ?? ""; return h("label", { class: "rb-mem-field" }, h("span", null, label), t); };
  const sel = (label, key, opts) => h("label", { class: "rb-mem-field" }, h("span", null, label), h("select", { class: "rb-input", onChange: (e) => save({ [key]: e.target.value }) }, opts.map(([v, l]) => h("option", { value: v, selected: cfg[key] === v }, l))));
  return h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, "카드"),
    h("p", { class: "rb-muted" }, "한 줄에 하나: `스탯이름:설명(ST)` 은 스탯, `태그이름:설명(스탯:수치,스탯:수치)` 는 태그예요. # 으로 시작하면 주석이에요. 카드의 태그는 여기서 정한 목록에서 골라요."),
    tagArea, status, h("div", { class: "rb-mem-sact" }, saveBtn, btn("기본값으로", { onClick: () => { tagArea.value = DEFAULT_TAG_TEXT; check(); } })),
    sel("카드·연결 기본 언어", "lang", [["ko", "한국어"], ["en", "English"]]), sel("새 봇 이미지 기본값", "imageUse", [["card", "카드 이미지(PNG)"], ["illustration", "카드 일러스트 에셋"], ["source", "원본 봇 이미지"], ["none", "없음"]]),
    ta("카드 추가 지시(항상 적용)", "extra", 60), ta("연결 추가 지시(항상 적용)", "linkExtra", 60));
}
