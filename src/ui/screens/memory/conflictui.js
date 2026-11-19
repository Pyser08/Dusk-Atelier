// 롤백 충돌 안내(리수폿 고급·인물 화면): '새 응답 반영' · '변경 비교' 창 · '그대로 두기'.
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
    h("div", { class: "rb-dialog-actions" }, btn("닫기", { onClick: () => done(null) }), btn("그대로 두기", { onClick: () => done("keep") }), btn("새 응답 반영", { kind: "primary", onClick: () => done("apply") }))));
}

export const keepConflict = (env, key) => env.ctx.memory.store.updateFolder(env.bot.id, env.chatItem.id, (f) => { f.wiki = dismissConflict(f.wiki, key); })
  .then(() => { env.ctx.toast("직접 고친 내용을 그대로 두었어요."); env.redraw(); }).catch(fail(env.ctx));

// 2.2.18: 멈췄던 응답을 다시 기록(이전 응답의 변경은 그대로 두고 새 응답 내용을 넣음). 한 번에 한 건.
export async function applyConflict(env) {
  const auto = env.ctx.memory?.flow?.runtime?.()?.auto;
  if (!auto?.retry) return env.ctx.toast("이 채팅을 리스에서 연 상태에서 다시 눌러 주세요.", { error: true });
  try { if (await auto.retry()) env.ctx.toast("새 응답을 기록하고 있어요. 끝나면 알림이 하나 줄어요."); else env.ctx.toast("기록할 대상을 준비하지 못했어요. 채팅을 열고 다시 눌러 주세요.", { error: true }); }
  catch (e) { fail(env.ctx)(e); }
}

// 노란 알림 한 장(충돌이 없으면 null)
export function conflictBox(env) {
  const list = conflictsOf(env.folder.wiki);
  if (!list.length) return null;
  const c = list[0];
  return h("div", { class: "rb-conflict" }, note("warn", `직접 고친 내용과 AI 기록이 겹쳐 기록을 멈춘 응답이 있어요${list.length > 1 ? ` (${list.length}건)` : ""}. ‘새 응답 반영’을 누르면 고친 내용은 그대로 두고 빠진 정보를 넣어요.`),
    h("div", { class: "rb-actions" },
      btn("새 응답 반영", { size: "sm", kind: "primary", onClick: () => applyConflict(env) }),
      btn("변경 비교", { size: "sm", onClick: async () => { const r = await openCompare(env, c); if (r === "keep") keepConflict(env, c.key); else if (r === "apply") applyConflict(env); } }),
      btn("그대로 두기", { size: "sm", onClick: () => keepConflict(env, c.key) })));
}
