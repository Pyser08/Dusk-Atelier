// 롤백 충돌 안내(리수폿 고급·인물 화면): '변경 비교' 창과 '그대로 두기'.
import { h } from "../../dom.js";
import { btn, modal, note } from "../../kit.js";
import { conflictsOf, compareChanges, dismissConflict } from "../../../engine/conflict.js";
import { fail } from "./common.js";

export async function openCompare(env, conflict) {
  const groups = compareChanges(env.folder.wiki, conflict);
  return modal(env.ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(640px,94vw)" },
    h("h3", null, `응답 #${(conflict.messageIndex ?? 0) + 1} 변경 비교`),
    h("p", { class: "rb-muted" }, "AI가 자동으로 바꾼 줄과, 그 뒤에 내가 고친 줄을 나란히 보여 줘요."),
    groups.length ? groups.map((g) => h("section", { class: "rb-mem-sec" }, h("h4", null, g.title), g.rows.map((r) => h("article", { class: "rb-card rb-mem-chg" },
      h("b", null, r.label, r.mine ? h("small", { class: "rb-muted" }, " · 내가 고친 줄") : null),
      h("div", { class: "rb-mem-diff" }, h("div", null, h("small", { class: "rb-muted" }, "원래"), h("pre", { class: "rb-mem-pre" }, r.before)), h("div", null, h("small", { class: "rb-muted" }, "AI가 바꿈"), h("pre", { class: "rb-mem-pre" }, r.ai)), h("div", null, h("small", { class: "rb-muted" }, "지금"), h("pre", { class: "rb-mem-pre" }, r.now))))))) : h("p", { class: "rb-muted" }, "견줄 변경을 찾지 못했어요. 그대로 두어도 괜찮아요."),
    h("div", { class: "rb-dialog-actions" }, btn("닫기", { onClick: () => done(null) }), btn("그대로 두기", { kind: "primary", onClick: () => done("keep") }))));
}

export const keepConflict = (env, key) => env.ctx.memory.store.updateFolder(env.bot.id, env.chatItem.id, (f) => { f.wiki = dismissConflict(f.wiki, key); })
  .then(() => { env.ctx.toast("직접 고친 내용을 그대로 두었어요."); env.redraw(); }).catch(fail(env.ctx));

// 노란 알림 한 장(충돌이 없으면 null)
export function conflictBox(env) {
  const list = conflictsOf(env.folder.wiki);
  if (!list.length) return null;
  const c = list[0];
  return h("div", { class: "rb-conflict" }, note("warn", `직접 고친 내용과 AI 기록이 겹쳤어요${list.length > 1 ? ` (${list.length}건)` : ""}`),
    h("div", { class: "rb-actions" },
      btn("변경 비교", { size: "sm", onClick: async () => { if ((await openCompare(env, c)) === "keep") keepConflict(env, c.key); } }),
      btn("그대로 두기", { size: "sm", onClick: () => keepConflict(env, c.key) })));
}
