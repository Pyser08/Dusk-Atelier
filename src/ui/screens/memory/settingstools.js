// 기억 설정 도구(7단계 B 그룹 4): 범위 칩 · 설정 검색 · 변경 이력 10개 되돌리기 · 프리셋 공유 코드 · ‘이 채팅’ 요약 · 다음 요청 주입 미리보기.
// 계산은 engine/settingsutil.js(순수)가 하고, 여기는 화면만 만든다.
import { h, replace, fmtWhen, copyText } from "../../dom.js";
import { btn, modal, note, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { liveScope } from "./advanced.js";
import { estimateTokens, injectReasonText } from "../../../engine/memoryinject.js";
import { pushHist, applyBefore, encodeShare, decodeShare, matchQuery, scopeChipLabel } from "../../../engine/settingsutil.js";

const AREA = { flow: "자동 기록", dusk: "기억 기록·넣기" };
const TITLE = { all: "이 설정은 모든 봇·채팅에 적용돼요", bot: "이 설정은 이 봇에만 적용돼요", chat: "이 설정은 이 채팅에만 적용돼요" };

// 제목 옆에 붙는 ‘어디에 적용되나’ 칩
export const scopeChip = (kind) => h("span", { class: ["rb-mem-scope", kind], title: TITLE[kind] ?? "" }, scopeChipLabel(kind));

// 기억 흐름 설정 저장소를 감싸서, 화면에서 바꾼 것만 변경 이력에 남긴다(런타임이 알아서 바꾸는 값은 남기지 않는다).
export function tracked(ctx, st) {
  if (!st || st.__tracked) return st;
  return new Proxy(st, { get(t, k) {
    if (k === "__tracked") return true;
    if (k === "update") return (fn, o) => {
      const before = t.rawSnapshot(), r = t.update(fn, o);
      try { const after = t.rawSnapshot(); ctx.memory.store.updateIndex((i) => { i.settingsHistory = pushHist(i.settingsHistory, "flow", before, after); }).catch(() => {}); } catch { /* 이력은 부가 기능 */ }
      return r;
    };
    const v = t[k]; return typeof v === "function" ? v.bind(t) : v;
  } });
}

// ---- 설정 검색: 낱말이 든 항목만 남긴다. 화면이 다시 그려져도 같은 검색어를 다시 적용한다.
export function searchBox(root) {
  let q = "";
  const sections = () => [...root.querySelectorAll("section.rb-mem-sec")];
  const apply = () => {
    for (const sec of sections()) {
      const head = sec.querySelector("h3,h4")?.textContent ?? "", whole = !q || matchQuery(head, q);
      const rows = [...sec.querySelectorAll(".rb-mem-field, article.rb-mem-feat, details.rb-mem-man")];
      const anyRow = rows.some((r) => matchQuery(r.textContent, q));
      sec.hidden = !(whole || matchQuery(sec.textContent, q));
      for (const r of rows) r.hidden = !whole && !!q && anyRow && !matchQuery(r.textContent, q);
    }
    if (q) for (const d of root.querySelectorAll("details")) if (!d.hidden && d.querySelector("section:not([hidden])")) d.open = true;
  };
  const input = h("input", { class: "rb-input rb-mem-search", type: "search", placeholder: "설정 찾기 (예: 프롬프트, 토큰)", "aria-label": "설정 검색", onInput: (e) => { q = e.target.value; apply(); } });
  const MO = root.ownerDocument?.defaultView?.MutationObserver;
  if (MO) { let t = 0; new MO(() => { clearTimeout(t); t = setTimeout(apply, 60); }).observe(root, { childList: true, subtree: true }); }
  return input;
}

// ---- 변경 이력 10개
export async function openSettingsHistory(ctx, { apply, redraw }) {
  const M = ctx.memory;
  await modal(ctx.win, (done) => {
    const body = h("div");
    const paint = async () => {
      const list = (await M.store.getIndex()).settingsHistory ?? [];
      replace(body, h("p", { class: "rb-muted" }, "최근에 바꾼 설정 10개까지 기억해요. 되돌리면 그 항목만 바뀌기 전 값으로 돌아가요."),
        list.length ? h("ul", { class: "rb-mem-reclist" }, list.map((e, i) => h("li", { class: "rb-mem-rec" },
          h("div", { class: "txt" }, h("b", null, `${AREA[e.area] ?? "설정"} · ${e.keys.join(", ")}${e.more ? ` 외 ${e.more}개` : ""}`), h("div", { class: "rb-muted" }, fmtWhen(e.at))),
          h("span", { class: "rb-mem-rowact" }, btn("되돌리기", { size: "sm", onClick: () => undo(i, e) })))))
          : h("p", { class: "rb-muted" }, "아직 바꾼 설정이 없어요."));
    };
    const undo = async (i, e) => {
      if (!(await confirmDialog(ctx.win, { title: "이 설정을 되돌릴까요?", body: `${AREA[e.area] ?? "설정"} · ${e.keys.join(", ")}`, ok: "되돌리기" }))) return;
      try {
        if (e.area === "flow") { const st = await M.flow.settings(); st.update((x) => applyBefore(x, e)); await apply?.(); }
        await M.store.updateIndex((idx) => { if (e.area === "dusk") applyBefore(idx.settings, e); idx.settingsHistory = (idx.settingsHistory ?? []).filter((_, j) => j !== i); });
        ctx.toast("되돌렸어요."); redraw?.(); await paint();
      } catch (err) { fail(ctx)(err); }
    };
    paint().catch(fail(ctx));
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(620px,96vw);max-height:90vh;overflow:auto" },
      h("div", { class: "rb-mem-shead" }, h("h3", null, "설정 변경 이력"), h("span", { style: "flex:1" }), btn("닫기", { onClick: () => done(null) })), body);
  });
}

// ---- 프리셋 공유(코드): 내 설정을 한 줄 코드로 복사 / 받은 코드를 붙여넣어 적용
export function shareSection(ctx, st, { apply, redraw }) {
  const box = h("textarea", { class: "rb-input", rows: 3, "aria-label": "프리셋 코드", placeholder: "받은 코드를 여기에 붙여넣기 (DAMEM1:…)", spellcheck: "false", style: "font-family:monospace;font-size:12px;height:auto" });
  const copy = btn("내 설정 코드 복사", { onClick: async () => { try { const ok = await copyText(encodeShare(st.rawSnapshot())); ctx.toast(ok ? "코드를 복사했어요. 모델·API 키·채팅별 값은 들어 있지 않아요." : "복사하지 못했어요."); } catch (e) { fail(ctx)(e); } } });
  const use = btn("코드 적용", { kind: "primary", onClick: async () => {
    try {
      const { settings, note: n } = decodeShare(box.value);
      if (!(await confirmDialog(ctx.win, { title: "이 프리셋을 적용할까요?", body: `${n ? `「${n}」 · ` : ""}항목 ${Object.keys(settings).length}개가 지금 설정에 덮어써져요. 모델·API 키는 그대로예요. (설정 변경 이력에서 되돌릴 수 있어요)`, ok: "적용" }))) return;
      st.update((x) => { const keep = { models: x.models }; Object.assign(x, settings, keep); });
      await apply?.(); box.value = ""; ctx.toast("프리셋을 적용했어요."); redraw?.();
    } catch (e) { fail(ctx)(e); }
  } });
  return h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, "프리셋 공유 코드", scopeChip("all")),
    h("p", { class: "rb-muted" }, "내 기억 설정을 한 줄 코드로 나눠요. 받은 코드를 붙여넣으면 그대로 적용돼요."), h("div", { class: "rb-mem-sact" }, copy), box, h("div", { class: "rb-mem-sact" }, use));
}

// ---- 다음 요청에 들어갈 기억 미리보기(토큰 수 포함)
export function previewBox(ctx) {
  const out = h("div");
  const run = async () => {
    replace(out, h("p", { class: "rb-muted", role: "status" }, "만드는 중…"));
    try {
      const r = await ctx.memory.injector.preview();
      if (!r.ok) return replace(out, note("warn", r.why));
      if (!r.injected) return replace(out, h("p", { class: "rb-muted" }, `지금은 아무것도 들어가지 않아요${injectReasonText(r.reason) ? ` — ${injectReasonText(r.reason)}` : ""}.`));
      const m = r.manifest ?? {};
      replace(out, h("p", null, h("b", null, `약 ${estimateTokens(r.text).toLocaleString()} 토큰`), h("span", { class: "rb-muted" }, ` · 위치: ${r.position === "beforeLastUser" ? "마지막 내 말 앞" : r.position}`)),
        h("ul", { class: "rb-mem-reclist" }, [...(m.included ?? []).map((x) => `포함 · ${x.kind === "scene" ? "현재 상황" : x.name} (${x.tokens})`), ...(m.excluded ?? []).map((x) => `제외 · ${x.name} (${x.tokens}, 예산 초과)`)].map((t) => h("li", null, t))),
        h("details", null, h("summary", null, "들어갈 글 전체"), h("pre", { class: "rb-mem-pre" }, r.text)),
        h("p", { class: "rb-muted" }, "위키 기억(관련 인물 찾기·장면 정리)은 요청 직전에 AI가 골라서, 여기엔 Dusk 기억 블록만 보여요."));
    } catch (e) { replace(out, note("err", String(e?.message ?? e))); }
  };
  return h("details", { class: "rb-mem-man" }, h("summary", null, "다음 턴에 이렇게 들어가요 (미리보기)"), h("div", { class: "rb-mem-sact" }, btn("미리 보기", { onClick: run })), out);
}

// ---- ‘이 채팅’ 요약: 추적 인물 · 내 이름 · 관찰자 · 이 채팅 프롬프트
export async function openChatInfo(env) {
  const { ctx, bot, chatItem, folder } = env, M = ctx.memory;
  const live = liveScope(M, bot.id);
  let s = {}; try { s = (await M.flow?.settings?.())?.rawSnapshot() ?? {}; } catch { /* 흐름이 꺼져 있을 수 있음 */ }
  const key = live ? JSON.stringify([live.characterId, live.chatKey]) : "";
  const ignore = new Set((env.idx.bots[bot.id]?.ignore ?? []).map((x) => String(x).toLowerCase()));
  const people = Object.values(folder?.people ?? {}).filter((p) => p?.name);
  const wiki = live ? Object.values(M.flow?.runtime?.()?.wiki?.snapshot?.()?.documents ?? {}).filter((d) => d.type === "Character") : [];
  const chatPrompts = (s.customPrompts ?? []).filter((p) => p.enabled && p.scope?.kind === "chat" && live && p.scope.characterId === live.characterId && p.scope.chatKey === live.chatKey);
  const persona = key ? s.personaNamesByScope?.[key]?.name : "";
  const row = (label, ...kids) => h("div", { class: "rb-mem-field" }, h("span", null, label), h("div", null, ...kids));
  await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,96vw);max-height:90vh;overflow:auto" },
    h("div", { class: "rb-mem-shead" }, h("h3", null, "이 채팅"), scopeChip("chat"), h("span", { style: "flex:1" }), btn("닫기", { onClick: () => done(null) })),
    h("p", { class: "rb-muted" }, `${bot.character?.name || "이름 없는 캐릭터"} · ${chatItem.chat?.name || "채팅"}`),
    row("추적 중인 인물", people.length ? h("div", { class: "rb-mem-chats" }, people.map((p) => h("span", { class: "rb-chip", "aria-disabled": ignore.has(String(p.name).toLowerCase()) ? "true" : null }, p.name + (ignore.has(String(p.name).toLowerCase()) ? " (쉼)" : "")))) : h("span", { class: "rb-muted" }, "아직 없어요")),
    wiki.length ? row("위키 인물 문서", h("span", null, wiki.map((d) => d.title).join(", "))) : null,
    row("내 이름(페르소나)", h("span", null, persona || "자동으로 찾아요")),
    row("관찰자 모드", h("span", null, s.observerModeEnabled ? "켜짐" : "꺼짐")),
    row("이 채팅 추가 프롬프트", chatPrompts.length ? h("ul", null, chatPrompts.map((p) => h("li", null, p.name || p.text.slice(0, 30)))) : h("span", { class: "rb-muted" }, "없어요")),
    live ? null : note("warn", "리스에서 이 채팅을 열면 위키·페르소나·프롬프트도 보여요."),
    h("p", { class: "rb-muted" }, "바꾸려면 설정(고급 모드)에서 고쳐요.")));
}
