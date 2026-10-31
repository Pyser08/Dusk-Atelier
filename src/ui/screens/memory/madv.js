// 기억 화면 '고급' 영역 (1.7.0 3단계). 고급 모드에서만 보인다. 자주 쓰는 것을 위에, 예전 세부 설정은 맨 아래 '세부'에 접어 둔다.
import { h, replace } from "../../dom.js";
import { btn, confirmDialog } from "../../kit.js";
import { AI_MODES } from "../../../engine/merge.js";
import { diagText } from "../../../engine/memorydiag.js";
import { fail, askRefresh } from "./common.js";
import { builders, renderGlobalSettings } from "./settings.js";
import { memoryEditor } from "./editor.js";
import { loreEditor } from "./loreeditor.js";
import { memoryEnv } from "./menv.js";
import { autoTrackingBox } from "./autotrackingbox.js";

export function advancedBlocks(ctx, { cur, idx, redraw, modeHost }) {
  const M = ctx.memory, { S, save, num, sw, section } = builders(ctx, idx, redraw, "");
  const last = M.injector?.lastRequest?.(), man = last?.manifest;
  const bot = idx.bots[cur.chaId] ?? { ignore: [] };

  // 분석 모델
  const mode = h("select", { class: "rb-input", "aria-label": "분석 모델" }, AI_MODES.map(([v, l]) => h("option", { value: v, selected: (S.model.mode ?? "memory") === v }, l)));
  const sid = h("input", { class: "rb-input", placeholder: "모델 ID", value: S.model.staticModel ?? "", "aria-label": "모델 ID", style: S.model.mode === "static" ? "" : "display:none" });
  const saveModel = () => save((s) => { s.model = { mode: mode.value, ...(mode.value === "static" ? { staticModel: sid.value.trim() } : {}) }; });
  mode.addEventListener("change", saveModel); sid.addEventListener("change", saveModel);
  // 자동 기록 시점 (리수폿 화면이 자기 값을 따로 갖는다)
  const confirmSel = h("select", { class: "rb-input", "aria-label": "자동 기록 시점", onChange: (e) => save((s) => { s.confirm = e.target.value; }) },
    [["next", "다음 입력을 보낼 때 (권장)"], ["now", "응답을 받은 직후"]].map(([v, l]) => h("option", { value: v, selected: (S.confirm === "now" ? "now" : "next") === v }, l)));
  const ignIn = h("input", { class: "rb-input", placeholder: "제외할 이름 추가 후 Enter", "aria-label": "제외할 이름", onKeydown: (e) => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    const v = e.target.value.trim();
    M.store.updateIndex((i) => { const b = i.bots[cur.chaId] ??= { on: true, ignore: [], fails: 0 }; b.ignore = [...new Set([...(b.ignore ?? []), v])]; }).then(redraw).catch(fail(ctx));
  } });
  const reset = async (scope) => {
    const ok = await confirmDialog(ctx.win, { title: "기억 초기화", body: scope === "chat" ? "이 채팅의 기억을 모두 지워요." : scope === "bot" ? "이 봇의 모든 채팅 기억을 지워요." : "모든 봇의 기억을 지워요.", ok: "지우기", danger: true });
    if (!ok) return;
    try { if (scope === "chat") await M.store.deleteFolder(cur.chaId, cur.chatId); else if (scope === "bot") await M.store.deleteBot(cur.chaId); else await M.store.resetAll(); redraw(); } catch (e) { fail(ctx)(e); }
  };
  const detailHost = h("div");
  let loaded = false;
  const more = h("details", { class: "rb-mem-man", onToggle: (e) => { if (e.target.open && !loaded) { loaded = true; renderGlobalSettings(ctx, detailHost, { redraw }).catch(fail(ctx)); } } }, h("summary", null, "세부 설정 (추적 수준·기능 카드·모델 상세·가져오기)"), detailHost);

  const trackingHost = h("div");
  memoryEnv(ctx, { botId: cur.chaId, chatIndex: cur.ti, redraw }).then(async (loaded) => {
    if (loaded.env) trackingHost.replaceChildren(await autoTrackingBox(loaded.env));
  }).catch(fail(ctx));
  return [
    modeHost,
    loreEditor(ctx, cur),  // 기억 방식 박스 바로 아래(고급 모드 전용): 대화에 들어가는 로어 편집
    trackingHost,
    section("저장·기록", h("label", { class: "rb-mem-field" }, h("span", null, "자동 기록 시점"), confirmSel),
      h("label", { class: "rb-mem-field" }, h("span", null, "분석 모델"), mode, sid),
      num("응답 대기 시간(초)", () => S.modelTimeoutSec ?? 600, (s, v) => { s.modelTimeoutSec = Math.max(10, v); }, { min: 10, max: 3600, step: 10 })),
    section("대화에 넣기", sw("기억을 대화에 넣기", S.inject.on !== false, (s, v) => { s.inject.on = v; }),
      sw("장부 넣기 (열린 항목·관계 변화·지식 경계)", S.inject.plus !== false, (s, v) => { s.inject.plus = v; }),
      sw("인물 관점·내면·기대 불일치 넣기 (토큰이 늘 수 있어요)", S.inject.stage3 !== false, (s, v) => { s.inject.stage3 = v; })),
    section(["이 봇에서 기록하지 않을 이름", "bot"], h("div", { class: "rb-mem-chats" }, (bot.ignore ?? []).map((n) => h("button", { type: "button", class: "rb-chip", title: "눌러서 제거", onClick: () => M.store.updateIndex((i) => { i.bots[cur.chaId].ignore = i.bots[cur.chaId].ignore.filter((x) => x !== n); }).then(redraw) }, n, " ✕")), ignIn)),
    section("진단", h("div", { class: "rb-muted rb-mem-diag" }, diagText(M.runner?.session?.() ?? {})),
      h("details", { class: "rb-mem-man" }, h("summary", null, "마지막 요청에 넣은 기억 보기"), man
        ? h("div", null, h("p", { class: "rb-muted" }, `${new Date(last.at).toLocaleTimeString()} · ${last.injected ? `넣음 (약 ${man.tokens} 토큰)` : "넣지 않음"}`),
          h("ul", null, [...man.included.map((x) => `포함 · ${x.kind === "scene" ? "현재 상황" : x.name ?? x.kind} (${x.tokens})`), ...man.excluded.map((x) => `제외 · ${x.name} (${x.tokens}, 예산 초과)`)].map((t) => h("li", null, t))))
        : h("p", { class: "rb-muted" }, "아직 요청이 없었어요.")),
      idx.status?.lastError ? h("p", { class: "rb-muted" }, `마지막 오류: ${String(idx.status.lastError).slice(0, 120)}`) : null),
    memoryEditor(ctx, cur, { redraw }),  // 저장된 기억 데이터 자체를 고치는 상세 편집
    h("section", { class: "rb-card rb-mem-sec rb-danger-zone" }, h("h3", null, "위험 구역"),
      h("div", { class: "rb-mem-sact" }, btn("이 채팅 기억 지우기", { onClick: () => reset("chat") }), btn("이 봇 기억 지우기", { onClick: () => reset("bot") }), btn("기억 초기화 (전체)", { onClick: () => reset("all") }))),
    more
  ];
}
