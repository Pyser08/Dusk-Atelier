// 추적 인물 선택(리수폿 people-tracking-ui 대응): 자동 기록을 ‘모두’로 둘지 ‘고른 인물만’으로 둘지, 항상 포함할 인물을 고른다.
// 값은 기억 흐름 설정의 autoWriterEnabled · trackedCharactersByScope(채팅 단위)에 저장한다. 이 채팅을 리스에서 열어 둔 상태에서만 바꿀 수 있다.
import { h } from "../../dom.js";
import { btn, modal, note, segmented } from "../../kit.js";
import { fail } from "./common.js";
import { liveScope } from "./advanced.js";
import { tracked } from "./settingstools.js";
import { trackingScopeKey, trackingSelectionIds } from "../../../engine/pot/auto-tracking.js";

const MAX = 500;

// 이 채팅의 Character 위키 문서(이름순) — 추적 대상 후보
export const trackableDocs = (wiki) => Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character" && typeof d.id === "string" && d.id)
  .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "ko"));

export async function openTracking(env) {
  const { ctx, bot } = env, M = ctx.memory;
  const st = tracked(ctx, await M.flow?.settings?.());
  if (!st || st.status().blocked) return ctx.toast("자동 기록 설정을 아직 쓸 수 없어요.", { error: true });
  const live = liveScope(M, bot.id);
  if (!live) return ctx.toast("이 채팅을 리스에서 연 상태에서 설정할 수 있어요.", { error: true });
  const scope = M.flow.runtime?.()?.wiki?.scope, key = trackingScopeKey(scope);
  if (!key) return ctx.toast("이 채팅의 추적 범위를 찾지 못했어요.", { error: true });
  const docs = trackableDocs(scope.documents ? scope : env.folder.wiki);
  const snap = st.rawSnapshot();
  let auto = snap.autoWriterEnabled !== false;
  const sel = new Set(trackingSelectionIds(snap, scope));
  await modal(ctx.win, (done) => {
    const list = h("div", { class: "rb-mem-checks" }), cnt = h("small", { class: "rb-muted" });
    const q = h("input", { class: "rb-input", type: "search", placeholder: "인물 검색", "aria-label": "인물 검색", onInput: () => paint() });
    const paint = () => {
      const t = q.value.trim().toLowerCase();
      const rows = docs.filter((d) => !t || String(d.title ?? "").toLowerCase().includes(t));
      cnt.textContent = `${sel.size}명 선택`;
      list.replaceChildren(...(rows.length ? rows.map((d) => {
        const cb = h("input", { type: "checkbox", checked: sel.has(d.id), onChange: () => { cb.checked ? sel.add(d.id) : sel.delete(d.id); cnt.textContent = `${sel.size}명 선택`; } });
        return h("label", { class: "rb-mem-check" }, cb, String(d.title ?? d.id));
      }) : [h("p", { class: "rb-muted" }, docs.length ? "검색 결과가 없어요." : "이 채팅에는 아직 인물 문서가 없어요.")]));
    };
    const modeHost = h("div");
    const paintMode = () => { modeHost.replaceChildren(segmented([["on", "모두 자동 기록"], ["off", "고른 인물만 기록"]], auto ? "on" : "off", (v) => { auto = v === "on"; paintMode(); }, "자동 기록 방식"),
      h("p", { class: "rb-muted" }, auto ? "새로 나온 인물도 자동으로 기록해요. 아래에서 고른 인물은 언제나 포함돼요." : "아래에서 고른 인물만 기록하고, 새 인물은 만들지 않아요. 한 명도 고르지 않으면 자동 기록이 멈춰요.")); };
    paintMode(); paint();
    const save = btn("저장", { kind: "primary", onClick: () => {
      try {
        if (sel.size > MAX) throw new Error(`추적 인물은 ${MAX}명까지예요.`);
        st.update((x) => { x.autoWriterEnabled = auto; const map = { ...(x.trackedCharactersByScope ?? {}) }; if (sel.size) map[key] = [...sel]; else delete map[key]; x.trackedCharactersByScope = map; });
        ctx.toast("추적 설정을 저장했어요. 다음 응답부터 적용돼요."); done(true); env.redraw();
      } catch (e) { fail(ctx)(e); }
    } });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(520px,94vw)" },
      h("h3", null, "추적할 인물 고르기"), note("info", "이 채팅에만 적용돼요. 방식은 모든 채팅이 같이 써요."), modeHost,
      h("div", { class: "rb-mem-tools" }, q, h("span", { style: "flex:1" }), cnt, btn("전체 선택", { size: "sm", onClick: () => { docs.forEach((d) => sel.add(d.id)); paint(); } }), btn("모두 해제", { size: "sm", onClick: () => { sel.clear(); paint(); } })),
      list, h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), save));
  });
}
