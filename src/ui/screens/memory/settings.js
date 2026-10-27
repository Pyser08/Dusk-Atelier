import { h, replace } from "../../dom.js";
import { btn, switchEl, setSwitch, confirmDialog, progressBar } from "../../kit.js";
import { AI_MODES } from "../../../engine/merge.js";
import { mem, fail } from "./common.js";
import { parseTags, DEFAULT_TAG_TEXT } from "../../../engine/card/tags.js";
import { flowSections } from "./flowsettings.js";

function builders(ctx, idx, redraw) {
  const M = ctx.memory, S = idx.settings;
  const save = (fn) => M.store.updateIndex((i) => fn(i.settings, i)).then(() => redraw()).catch(fail(ctx));
  const num = (label, get, set, { min = 0, max = 99999, step = 1 } = {}) => h("label", { class: "rb-mem-field" }, h("span", null, label), h("input", { class: "rb-input", type: "number", min, max, step, value: get(), onChange: (e) => { const v = Math.min(max, Math.max(min, Number(e.target.value) || 0)); save((s) => set(s, v)); } }));
  const sw = (label, on, set) => h("div", { class: "rb-mem-field row" }, h("span", null, label), switchEl(on, { label, onChange: (v, el) => { setSwitch(el, v); save((s) => set(s, v)); } }));
  const section = (title, ...kids) => h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, title), ...kids);
  return { M, S, save, num, sw, section };
}

// ---- 전체 설정: 기억 탭 메인 화면(봇 목록 위)에 접이식으로 둔다. 모든 봇에 공통 적용.
export async function renderGlobalSettings(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory, idx = await M.store.getIndex();
  const backend = M.backend(idx.settings), caps = M.capabilities(backend.id);
  const { S, save, num, sw, section } = builders(ctx, idx, redraw);
  const mode = h("select", { class: "rb-input", "aria-label": "분석 모델" }, AI_MODES.map(([v, l]) => h("option", { value: v, selected: (S.model.mode ?? "memory") === v }, l)));
  const sid = h("input", { class: "rb-input", placeholder: "모델 ID", value: S.model.staticModel ?? "", "aria-label": "모델 ID", style: S.model.mode === "static" ? "" : "display:none" });
  const saveModel = () => save((s) => { s.model = { mode: mode.value, ...(mode.value === "static" ? { staticModel: sid.value.trim() } : {}) }; });
  mode.addEventListener("change", saveModel); sid.addEventListener("change", saveModel);
  const last = M.injector?.lastRequest?.(), man = last?.manifest;
  const modeLabel = backend.id === "bardwiki" ? "BardWiki 모드" : backend.id === "off" ? "기억 꺼짐" : "플러그인 모드";

  const ccfg = await M.cards.getCfg();
  const flowHost = h("div");
  if (backend.id === "local") await flowSections(ctx, flowHost, { redraw }).catch(fail(ctx));
  const adv = h("details", { class: "rb-mem-man rb-mem-adv", open: !!m.advOpen, onToggle: (e) => { m.advOpen = e.target.open; } }, h("summary", null, "고급: 기록·주입 세부 설정"),
    section("기억 저장소", h("label", { class: "rb-mem-field" }, h("span", null, "저장소"), h("select", { class: "rb-input", onChange: (e) => save((s) => { s.backend = e.target.value; }) }, [["auto", "자동"], ["local", "플러그인"], ["bardwiki", "BardWiki"], ["off", "끔"]].map(([v, l]) => h("option", { value: v, selected: S.backend === v }, l)))), h("p", { class: "rb-muted" }, "리스바드에서는 이중 비용을 막으려고 플러그인의 분석·주입을 끄고 위키를 읽어요. 바꾼 뒤에는 RisuAI를 다시 불러와야 훅에 반영돼요.")),
    caps.analyze ? section("분석", h("label", { class: "rb-mem-field" }, h("span", null, "분석 모델"), mode, sid),
      num("디바운스(초)", () => S.debounceSec, (s, v) => { s.debounceSec = v; }, { max: 60 }), num("기록 시작 턴(1=첫 응답부터)", () => S.startTurn ?? 1, (s, v) => { s.startTurn = Math.max(1, v); }, { min: 1, max: 50 }), num("N턴마다 분석", () => S.everyN, (s, v) => { s.everyN = Math.max(1, v); }, { min: 1, max: 20 }),
      num("짧은 응답 기준(글자)", () => S.minChars, (s, v) => { s.minChars = v; }, { max: 2000 }), num("인물당 기록 상한", () => S.personCap, (s, v) => { s.personCap = Math.max(20, v); }, { min: 20, max: 2000 }),
      sw("전체 자동 기록", S.autoRecord !== false, (s, v) => { s.autoRecord = v; })) : null,
    caps.inject || caps.analyze ? section("장기기억 주입", sw("주입 켜기", S.inject.on !== false, (s, v) => { s.inject.on = v; }),
      num("목표 토큰", () => S.inject.targetTokens, (s, v) => { s.inject.targetTokens = v; }, { min: 200, max: 8000 }), num("상한 토큰", () => S.inject.capTokens, (s, v) => { s.inject.capTokens = Math.max(v, s.inject.targetTokens); }, { min: 200, max: 12000 }),
      num("주입 시작 턴", () => S.inject.fromTurn, (s, v) => { s.inject.fromTurn = Math.max(1, v); }, { min: 1, max: 50 }), num("이야기 요약 토큰", () => S.inject.eventTokens, (s, v) => { s.inject.eventTokens = v; }, { min: 0, max: 4000 }),
      sw("확장 주입(열린 항목·관계 변화·지식 경계·원문 발췌·시각)", S.inject.plus !== false, (s, v) => { s.inject.plus = v; }), num("오래된 D·C 잊기(메시지 수, 0=끔)", () => S.inject.forgetAfter ?? 150, (s, v) => { s.inject.forgetAfter = v; }, { max: 5000, step: 10 }),
      num("최근 메시지 겹침 제외(개)", () => S.inject.recentSkip, (s, v) => { s.inject.recentSkip = v; }, { max: 40 }),
      h("label", { class: "rb-mem-field" }, h("span", null, "삽입 위치"), h("select", { class: "rb-input", onChange: (e) => save((s) => { s.inject.position = e.target.value; }) }, [["beforeLastUser", "마지막 사용자 메시지 앞"], ["afterSystem", "시스템 프롬프트 뒤"]].map(([v, l]) => h("option", { value: v, selected: S.inject.position === v }, l)))),
      h("details", { class: "rb-mem-man" }, h("summary", null, "마지막 요청에 들어간 기억 보기"), man ? h("div", null, h("p", { class: "rb-muted" }, `${new Date(last.at).toLocaleTimeString()} · ${last.injected ? `주입함 (약 ${man.tokens} 토큰)` : "주입하지 않음"}`),
        h("ul", null, [...man.included.map((x) => `포함 · ${x.kind === "scene" ? "현재 상황" : x.name} (${x.tokens})`), ...man.excluded.map((x) => `제외 · ${x.name} (${x.tokens}, 예산 초과)`)].map((t) => h("li", null, t))), last.text ? h("pre", { class: "rb-mem-pre" }, last.text) : null) : h("p", { class: "rb-muted" }, "아직 요청이 없었어요."))) : null,
    cardSettings(ctx, ccfg, redraw));
  const body = h("div", { class: "rb-mem-foldbody" }, h("div", { class: "rb-mem-modeline" }, h("span", { class: ["rb-mem-mode", backend.id] }, modeLabel), h("span", { class: "rb-muted" }, backend.reason)), flowHost, adv);
  const fold = h("details", { class: "rb-mem-fold", open: !!m.globalOpen }, h("summary", null, "설정", h("span", { class: ["rb-mem-mode", backend.id] }, modeLabel)), body);
  fold.addEventListener("toggle", () => { m.globalOpen = fold.open; });
  replace(host, fold);
}

// ---- 봇 안의 '설정' 폴드 내용: 지난 대화 분석, 제외 이름, 초기화, 상태. (토글 옆 버튼으로 여닫는다)
export function renderBotSettings(env) {
  const { ctx, idx, caps, bot, chatItem } = env, M = ctx.memory;
  const { section } = builders(ctx, idx, env.redraw);
  const ignore = idx.bots[bot.id]?.ignore ?? [];
  const ignIn = h("input", { class: "rb-input", placeholder: "제외할 이름 추가 후 Enter", "aria-label": "제외 이름", onKeydown: (e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); M.store.updateIndex((i) => { const b = i.bots[bot.id] ??= { on: true, ignore: [], fails: 0 }; b.ignore = [...new Set([...(b.ignore ?? []), v])]; }).then(env.redraw).catch(fail(ctx)); } } });
  // 일괄 분석
  const total = chatItem.chat?.message?.length ?? 0;
  const from = h("input", { class: "rb-input", type: "number", min: 1, max: total, value: 1, "aria-label": "시작 메시지 번호" }), to = h("input", { class: "rb-input", type: "number", min: 1, max: total, value: total, "aria-label": "끝 메시지 번호" });
  const est = h("div", { class: "rb-muted" }), prog = h("div"), msgs = chatItem.chat?.message ?? [];
  const range = () => ({ from: Math.max(0, +from.value - 1), to: Math.max(0, +to.value - 1) });
  const paintEst = () => { const p = M.runner.planBackfill(msgs, range(), env.folder); est.textContent = `예상 호출 ${p.calls}회 · 대략 ${p.tokens.toLocaleString()} 토큰`; };
  from.addEventListener("input", paintEst); to.addEventListener("input", paintEst); if (caps.analyze) paintEst();
  let ctrl = null, failed = [];
  const run = async (only) => {
    ctrl = new AbortController(); const start = btn("취소", { onClick: () => ctrl.abort() }); replace(prog, progressBar(0), start);
    try {
      const r = await M.runner.backfill(bot.index, chatItem.index, range(), { signal: ctrl.signal, onProgress: (n, t, f) => replace(prog, progressBar(Math.round(n / t * 100)), h("span", { class: "rb-muted" }, `${n}/${t} · 실패 ${f}`), start) });
      failed = r.failed; ctx.toast(`일괄 분석이 끝났어요 (${r.total - r.failed.length}/${r.total}).`); env.redraw();
    } catch (e) { fail(ctx)(e); env.redraw(); }
  };
  const reset = async (scope) => {
    const ok = await confirmDialog(ctx.win, { title: "기억 초기화", body: scope === "chat" ? "이 채팅의 기억을 모두 지워요." : scope === "bot" ? "이 봇의 모든 채팅 기억을 지워요." : "모든 봇의 장기 기억을 지워요.", ok: "지우기", danger: true }); if (!ok) return;
    try { if (scope === "chat") await M.store.deleteFolder(bot.id, chatItem.id); else if (scope === "bot") await M.store.deleteBot(bot.id); else await M.store.resetAll(); env.redraw(); } catch (e) { fail(ctx)(e); }
  };

  return h("div", { class: "rb-mem-foldbody" },
    caps.analyze ? section("지난 대화 분석 (이 채팅 전체)", h("div", { class: "rb-mem-range" }, from, "~", to), est, h("div", { class: "rb-mem-sact" }, btn("분석 시작", { kind: "primary", onClick: () => run() }), failed.length ? btn(`실패만 다시 (${failed.length})`, { onClick: () => run(true) }) : null), prog) : null,
    caps.analyze ? section("이 봇에서 기록하지 않을 이름", h("div", { class: "rb-mem-chats" }, ignore.map((n) => h("button", { type: "button", class: "rb-chip", title: "눌러서 제거", onClick: () => M.store.updateIndex((i) => { i.bots[bot.id].ignore = i.bots[bot.id].ignore.filter((x) => x !== n); }).then(env.redraw) }, n, " ✕")), ignIn)) : null,
    section("초기화", h("div", { class: "rb-mem-sact" }, btn("이 채팅 기억 지우기", { onClick: () => reset("chat") }), btn("이 봇 기억 지우기", { onClick: () => reset("bot") }), btn("전체 기억 지우기", { onClick: () => reset("all") }))),
    section("상태", h("p", { class: "rb-muted" }, `훅: ${idx.status.hook} · 처리 ${idx.status.processed}회 · 마지막 성공 ${idx.status.lastSuccessAt ? new Date(idx.status.lastSuccessAt).toLocaleString() : "없음"}${idx.status.lastError ? " · 오류: " + idx.status.lastError : ""}`)));
}

// ---- 카드 설정: 태그·스탯 정의, 기본 언어, 연결 추가 지시. 카드 만들기와 새 봇 만들기에서 쓴다.
function cardSettings(ctx, cfg, redraw) {
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
