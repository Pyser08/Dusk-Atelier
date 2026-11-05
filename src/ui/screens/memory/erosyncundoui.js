// Erosync '동작' 탭의 '장면 되돌리기' 카드: 마지막으로 반영된 장면 판단 한 건(관계·목표·프로필 변화와 계획)을 지운다.
import { h } from "../../dom.js";
import { btn, confirmDialog } from "../../kit.js";

export function erosyncUndoCard(ctx) {
  const er = ctx.erosync, live = !!(er?.on() && er?.isRunning());
  const note = h("p", { class: "rb-muted", style: "white-space:normal;margin:0", id: "rb-erosync-undo-note" });
  const run = btn("직전 장면 되돌리기", { id: "rb-erosync-undo", disabled: !live, onClick: async () => {
    const ok = await confirmDialog(ctx.win, { title: "직전 장면 판단을 되돌릴까요?", body: "마지막으로 반영된 장면 한 건의 관계·목표·성향 변화와 계획을 지워요. 채팅 글은 그대로 두고, 다음 응답부터 그 앞 상태에서 이어 가요. 직접 고친 프로필 값은 지키고, 비하인드는 그 장면 것만 지워요.", ok: "되돌리기", danger: true });
    if (!ok) return;
    const r = await er.undoScene();
    if (!r?.ok) { ctx.toast(r?.reason === "off" ? "Erosync를 켜야 해요" : (r?.reason || "되돌리지 못했어요"), { error: true }); return; }
    note.textContent = `되돌렸어요 — 남은 되돌릴 수 있는 장면 ${r.left}개 · 지금 ${r.turnIndex}턴`;
    ctx.toast("직전 장면 판단을 되돌렸어요");
  } });
  return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-undo-card", style: "display:grid;gap:12px" }, h("h3", null, "장면 되돌리기"),
    h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "마음에 안 드는 전개가 상태에 남지 않게 마지막 장면 판단 한 건을 되돌려요. 응답을 다시 받거나 지우면 Erosync가 알아서 되돌리니, 응답은 그대로 두고 판단만 지우고 싶을 때 써요."),
    live ? h("div", { class: "rb-mem-sact" }, run) : h("p", { class: "rb-muted", style: "margin:0" }, "Erosync를 켜면 쓸 수 있어요."), note);
}
