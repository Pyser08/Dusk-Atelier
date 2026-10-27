// 기억 탭 고급 모드: 리수폿에서 온 세부 기능(추가 프롬프트·관찰자·페르소나 이름·흐름 세부·Hypa 참고·실행 기록·내보내기)을 한곳에 모았다.
// 고급 모드를 켜야만 보인다(index.settings.flow.advanced). 값은 리수폿 설정 저장소(`M.flow.settings()`)에 바로 저장한다.
import { openRecovery } from "./recovery.js";
import { h, replace, pickFiles } from "../../dom.js";
import { btn, switchEl, setSwitch, segmented, toggleRow, note, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { HYPA_REFERENCE_MAX_ITEMS } from "../../../engine/pot/hypa-reference.js";
import { wikiRetentionStatus, WIKI_RETENTION_MAX } from "../../../engine/pot/wiki-retention.js";
import { RELATIONSHIP_HISTORY_MAX, relationshipHistoryLimit } from "../../../engine/pot/relationship-history.js";

const num = (label, v, set, { min = 0, max = 200, step = 1 } = {}) => h("label", { class: "rb-mem-field" }, h("span", null, label), h("input", { class: "rb-input", type: "number", min, max, step, value: v, onChange: (e) => { set(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || 0)))); } }));
const sec = (title, desc, ...kids) => h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, title), desc ? h("p", { class: "rb-muted" }, desc) : null, ...kids);
export const STAGE_NAMES = { router: "관련 인물 고르기", director: "정리 노트", writer: "기록하기" };

// 지금 열려 있는 채팅의 리수폿 범위(없으면 null). 봇·채팅 단위 설정은 이 범위가 있어야 저장할 수 있다.
export function liveScope(M, botId) {
  const rt = M.flow?.runtime?.(), sc = rt?.wiki?.scope, ctxn = rt?.wiki?.personaNameContext;
  if (!sc?.characterId || !sc?.chatKey) return null;
  if (botId != null && String(sc.characterId) !== String(botId)) return null;
  return { characterId: sc.characterId, chatKey: sc.chatKey, binding: ctxn?.binding ?? "", name: sc.characterName ?? "", chat: sc.chatName ?? "" };
}

// ---- 전체(모든 봇) 고급 설정
export async function advancedGlobal(ctx, host, { redraw, st, apply }) {
  const M = ctx.memory, flow = (await M.store.getIndex()).settings.flow ?? {};
  const paint = () => {
    const s = st.rawSnapshot();
    const ed = (fn) => { try { st.update(fn); } catch (e) { fail(ctx)(e); } paint(); };
    const sw = (title, text, key) => toggleRow(title, text, s[key] === true, (v) => ed((x) => { x[key] = v; }));
    const stageCtx = h("div", { class: "rb-mem-grid" }, ["router", "director", "writer"].map((k) => num(`${STAGE_NAMES[k]} · 최근 대화 턴`, s.stageContext?.[k] ?? 2, (n) => ed((x) => { x.stageContext[k] = n; }), { min: 0, max: 200 })));
    const adv = [
      sec("흐름 세부", "기본값이면 충분해요. 바꾸면 다음 응답부터 적용돼요.",
        h("div", { class: "rb-mem-field" }, h("span", null, "정리 노트의 역할"), segmented([["directing", "연출 지시"], ["facts", "사실만 전달"]], s.directorRole ?? "directing", (v) => ed((x) => { x.directorRole = v; }), "정리 노트 역할")),
        stageCtx,
        num("기록하기 입력 예산(토큰)", s.writerInputBudgetTokens ?? 48000, (n) => ed((x) => { x.writerInputBudgetTokens = Math.min(1000000, Math.max(1000, n)); }), { min: 1000, max: 1000000, step: 1000 }),
        sw("본문 변경 검사", "켜면 응답 본문이 도중에 바뀐 경우 기록을 저장하지 않아요.", "writerSourceCheckEnabled"),
        sw("기존 인물 로어북 검색", "인물 후보를 찾을 때 로어북도 함께 살펴요.", "writerSearchExistingLore"),
        h("label", { class: "rb-mem-field" }, h("span", null, "고르기 키워드 고정 (쉼표·줄바꿈, 2,000자까지)"), h("textarea", { class: "rb-input", rows: 3, "aria-label": "고르기 키워드 고정", onChange: (e) => ed((x) => { x.routerFixedKeywords = e.target.value.slice(0, 2000); }) }, s.routerFixedKeywords ?? "")),
        h("div", { class: "rb-mem-field" }, h("span", null, "관계만 기록할 때 인지·정체 인식"), segmented([["off", "끔"], ["light", "라이트"], ["on", "켬"]], s.relationshipPerceptionMode ?? "light", (v) => ed((x) => { x.relationshipPerceptionMode = v; }), "관계 인지"))),
      sec("무엇을 따라갈까요", null,
        sw("관찰자 모드", "내가 이야기에 직접 나오지 않고 지켜보는 형식일 때 켜요.", "observerModeEnabled"),
        sw("인물 기본 정보 자동 만들기", "처음 나온 인물의 이름·나이·소속 같은 기본 정보를 채워 둬요.", "peopleProfileEnabled"),
        sw("다른 NPC끼리의 감정·관계 기록", "나(user)가 아닌 인물 사이의 감정도 따라가요.", "npcRelationshipEnabled")),
      sec("실행 기록", "모델이 한 일을 남겨 두는 정도예요. 문제를 찾을 때만 ‘전부’로 바꾸세요.",
        segmented([["off", "안 남김"], ["errors", "오류만"], ["all", "전부"]], s.traceRecordingMode ?? "errors", (v) => ed((x) => { x.traceRecordingMode = v; }), "실행 기록")),
      sec("리스 기본 메모리 참고 (Hypa)", "Dusk 장기기억이 대신하므로 보통은 꺼 두세요. 리스의 Hypa 요약을 같이 참고하고 싶을 때만 켜요.",
        segmented([["off", "안 씀"], ["hypa", "Hypa"], ["hypaplus", "Hypa+"]], s.hypaPlusReferenceEnabled ? "hypaplus" : s.hypaReferenceEnabled ? "hypa" : "off", (v) => ed((x) => { x.hypaReferenceEnabled = v === "hypa"; x.hypaPlusReferenceEnabled = v === "hypaplus"; }), "Hypa 참고"),
        num("참고할 항목 수", s.directorMemoryLimit ?? 16, (n) => ed((x) => { x.directorMemoryLimit = n; }), { min: 0, max: HYPA_REFERENCE_MAX_ITEMS })),
      transfer(ctx, st, redraw, apply),
    ];
    replace(host, adv);
  };
  paint();
}

// 설정 내보내기·가져오기(키 제외). 파일은 JSON.
function transfer(ctx, st, redraw, apply) {
  const out = btn("설정 내보내기", { icon: "download", onClick: () => {
    const raw = st.rawSnapshot(); delete raw.models; // 모델·키는 내보내지 않아요
    const blob = new Blob([JSON.stringify({ kind: "dusk-memory-settings", v: 1, settings: raw }, null, 1)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "dusk-memory-settings.json" }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } });
  const inn = btn("설정 가져오기", { icon: "upload", onClick: async () => {
    const [file] = await pickFiles({ accept: ".json" }); if (!file) return;
    try {
      const d = JSON.parse(await file.text()); if (d?.kind !== "dusk-memory-settings" || !d.settings) throw new Error("Dusk 기억 설정 파일이 아니에요.");
      if (!(await confirmDialog(ctx.win, { title: "설정을 가져올까요?", body: "지금 설정이 파일 내용으로 바뀌어요. 모델·API 키는 건드리지 않아요.", ok: "가져오기" }))) return;
      st.update((x) => { const keep = x.models; Object.assign(x, d.settings, { models: keep }); });
      await apply(); ctx.toast("설정을 가져왔어요."); redraw();
    } catch (e) { fail(ctx)(e); }
  } });
  return sec("설정 내보내기·가져오기", "추적 수준·기능·고급 설정을 파일 하나로 옮겨요. 모델 설정과 API 키는 들어 있지 않아요.", h("div", { class: "rb-mem-sact" }, out, inn));
}

// ---- 봇별 고급 설정(봇 화면의 ‘설정’ 폴드 안): 추가 프롬프트 · 페르소나 이름 · AI 참고 설정
export async function advancedBot(env, host) {
  const { ctx, bot } = env, M = ctx.memory;
  const st = await M.flow?.settings?.(); if (!st || st.status().blocked) return replace(host);
  const live = liveScope(M, bot.id);
  const paint = () => {
    const s = st.rawSnapshot(), ed = (fn) => { try { st.update(fn); } catch (e) { fail(ctx)(e); } paint(); };
    replace(host, customPrompts(ctx, s, ed, bot, live), personaName(ctx, s, ed, live), aiRefs(s, ed, live), retention(env),
      h("section", { class: "rb-mem-sec" }, h("h4", null, "복구 · 실행 기록"), h("p", { class: "rb-muted" }, "깨진 AI 응답을 고쳐 반영하거나 최근 호출 기록을 봐요."), btn("열기", { onClick: () => openRecovery(env) })));
  };
  paint();
}

function customPrompts(ctx, s, ed, bot, live) {
  const list = s.customPrompts ?? [], ids = new Set(list.map((p) => p.id));
  const scopeText = (p) => p.scope.kind === "all" ? "모든 봇·채팅" : p.scope.kind === "bot" ? `이 봇 (${p.scope.label || p.scope.characterId})` : `이 채팅 (${p.scope.label || "채팅"})`;
  const row = (p, i) => {
    const set = (k, v) => ed((x) => { x.customPrompts[i][k] = v; });
    const stages = ["router", "director", "writer"].map((k) => h("label", { class: "rb-mem-field row" }, h("span", null, STAGE_NAMES[k]), switchEl(p.stages.includes(k), { label: STAGE_NAMES[k], onChange: (v, el) => { setSwitch(el, v); const next = ["router", "director", "writer"].filter((z) => (z === k ? v : p.stages.includes(z))); if (!next.length) { ctx.toast("적용할 단계를 하나는 골라 주세요.", { error: true }); return paint(); } set("stages", next); } })));
    const paint = () => ed(() => {});
    const text = h("textarea", { class: "rb-input", rows: 5, "aria-label": "추가 프롬프트 본문", maxlength: 12000, onChange: (e) => set("text", e.target.value) }, p.text);
    const nm = h("input", { class: "rb-input", value: p.name, placeholder: "이름(선택)", "aria-label": "이름", maxlength: 60, onChange: (e) => set("name", e.target.value.trim()) });
    return h("article", { class: ["rb-card", "rb-mem-feat", p.enabled && "on"] },
      h("div", { class: "rb-mem-shead" }, nm, h("span", { style: "flex:1" }), switchEl(p.enabled, { label: "사용", onChange: (v, el) => { setSwitch(el, v); set("enabled", v); } })),
      h("p", { class: "rb-muted" }, scopeText(p)), text, h("div", { class: "rb-mem-chats" }, stages),
      btn("삭제", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "추가 프롬프트를 지울까요?", body: p.name || "이름 없는 규칙", ok: "지우기", danger: true })) ed((x) => { x.customPrompts.splice(i, 1); }); } }));
  };
  const add = (kind) => {
    if (list.length >= 40) return ctx.toast("추가 프롬프트는 40개까지예요.", { error: true });
    let id = `p${Date.now().toString(36)}`; while (ids.has(id)) id += "x";
    const scope = kind === "all" ? { kind: "all" } : kind === "bot" ? { kind: "bot", characterId: String(bot.id), label: bot.character?.name ?? "" } : { kind: "chat", characterId: live.characterId, chatKey: live.chatKey, label: live.chat ?? "" };
    ed((x) => { x.customPrompts = [...(x.customPrompts ?? []), { id, name: "", stages: ["writer"], scope, enabled: true, text: "새 규칙을 여기에 적어 주세요." }]; });
  };
  return sec("추가 프롬프트", "기본 규칙 뒤에 덧붙는 내 규칙이에요. 출력 형식은 바꾸지 못해요. 단계마다 켜고 끌 수 있어요.",
    list.map(row), list.length ? null : h("p", { class: "rb-muted" }, "아직 없어요."),
    h("div", { class: "rb-mem-sact" }, btn("모든 곳에 추가", { onClick: () => add("all") }), btn("이 봇에만 추가", { onClick: () => add("bot") }), btn("이 채팅에만 추가", { disabled: !live, title: live ? "" : "이 채팅을 연 상태에서 쓸 수 있어요", onClick: () => add("chat") })));
}

const nameOk = (v) => { const t = String(v ?? "").normalize("NFC").trim(); if (!t || t.length > 160 || /[\u0000-\u001f\u007f]|\{\{|\}\}/.test(t)) throw new Error("이름은 160자 이내, 제어 문자와 {{ }} 없이 적어 주세요."); return t; };
function personaName(ctx, s, ed, live) {
  if (!live) return sec("내 이름(페르소나) 지정", null, note("warn", "이 채팅을 리스에서 연 상태에서 지정할 수 있어요."));
  const key = JSON.stringify([live.characterId, live.chatKey]), cur = s.personaNamesByScope?.[key]?.name ?? "";
  const inp = h("input", { class: "rb-input", value: cur, placeholder: "자동으로 찾기", "aria-label": "페르소나 이름" });
  return sec("내 이름(페르소나) 지정", "기억에서 ‘나’를 부를 이름이에요. 비워 두고 저장하면 자동으로 찾아요.", h("div", { class: "rb-mem-sact" }, inp,
    btn("저장", { kind: "primary", onClick: () => { try { const t = inp.value.trim() ? nameOk(inp.value) : null; ed((x) => { const map = { ...(x.personaNamesByScope ?? {}) }; if (t) map[key] = { name: t, binding: live.binding }; else delete map[key]; x.personaNamesByScope = map; }); } catch (e) { fail(ctx)(e); } } })));
}

function aiRefs(s, ed, live) {
  if (!live) return null;
  const key = `scope:${encodeURIComponent(live.characterId)}:${encodeURIComponent(live.chatKey)}`, cur = { recentTurns: 2, memorySource: "off", memoryLimit: 16, ...(s.manualAIReferencesByScope?.[key] ?? {}) };
  const set = (patch) => ed((x) => { x.manualAIReferencesByScope = { ...(x.manualAIReferencesByScope ?? {}), [key]: { ...cur, ...patch } }; });
  const hypaOn = s.hypaReferenceEnabled || s.hypaPlusReferenceEnabled;
  return sec("직접 AI 작성 때 참고할 것 (이 채팅)", "인물 AI 작성·다시 정리처럼 직접 누르는 AI 기능이 최근 대화를 얼마나 볼지 정해요.",
    num("최근 대화 턴 수", cur.recentTurns, (n) => set({ recentTurns: n }), { min: 0, max: 200 }),
    hypaOn ? h("div", { class: "rb-mem-field" }, h("span", null, "리스 기본 메모리"), segmented([["off", "안 씀"], ["hypa", "Hypa"], ["hypaplus", "Hypa+"]], cur.memorySource, (v) => set({ memorySource: v }), "기억 종류")) : null,
    hypaOn && cur.memorySource !== "off" ? num("참고 항목 수", cur.memoryLimit, (n) => set({ memoryLimit: n }), { min: 0, max: HYPA_REFERENCE_MAX_ITEMS }) : null);
}

// 이 채팅 위키의 보관 개수(관계 이력 · 변경 이력 · 자동 기록 활동). 플러그인 저장소의 위키 범위를 직접 고친다.
function retention(env) {
  const { ctx } = env, wiki = env.folder?.wiki;
  if (!wiki || env.backend?.id !== "local" || env.view?.snapshot) return null;
  let st; try { st = wikiRetentionStatus(wiki); } catch { return null; }
  const save = (fn, ok) => ctx.memory.store.updateFolder(env.bot.id, env.chatItem.id, (f) => { f.wiki = fn(f.wiki); }).then(() => { ctx.toast(ok); env.redraw(); }).catch(fail(ctx));
  return sec("보관 개수 (이 채팅)", "너무 많이 쌓이면 오래된 것부터 정리돼요. 줄이면 다음 정리 때 반영돼요.",
    num(`관계 이력 (지금 ${relationshipHistoryLimit(wiki)}개 보관)`, relationshipHistoryLimit(wiki), (n) => save((w) => ({ ...w, relationshipHistoryLimit: Math.max(1, n) }), "관계 이력 보관 개수를 바꿨어요."), { min: 1, max: RELATIONSHIP_HISTORY_MAX }),
    num(`변경 이력 (지금 ${st.history.count}/${st.history.limit})`, st.history.limit, (n) => save((w) => ({ ...w, recordRetention: { ...(w.recordRetention ?? {}), history: Math.max(1, n) } }), "변경 이력 보관 개수를 바꿨어요."), { min: 1, max: WIKI_RETENTION_MAX }),
    num(`자동 기록 활동 (지금 ${st.activity.count}/${st.activity.limit})`, st.activity.limit, (n) => save((w) => ({ ...w, recordRetention: { ...(w.recordRetention ?? {}), activity: Math.max(1, n) } }), "자동 기록 활동 보관 개수를 바꿨어요."), { min: 1, max: WIKI_RETENTION_MAX }));
}
