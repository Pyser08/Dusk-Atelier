// 위키 기록 관리(고급 모드): 변경 이력 되돌리기 · 자동 기록 재시도/활동 기록 삭제 · 요약 정리.
// 리수폿 컨트롤러를 그대로 쓰고, 바꾸는 동작은 전부 확인을 한 번 거친다. 이 채팅을 리스에서 연 상태에서만 쓸 수 있다.
import { h, replace, fmtWhen } from "../../dom.js";
import { btn, modal, note, segmented, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { toolsFor } from "./aitools.js";

const ACTION = { create: "새로 만듦", update: "고침", delete: "지움", restore: "되돌림" };
const STATUS = { pending: "대기", completed: "완료", failed: "실패", manual: "직접", "rolled-back": "취소됨" };
const titleOf = (e) => e.after?.title ?? e.before?.title ?? e.documentId;

// 순수: 화면에 쓸 요약(시험 가능). scope = 위키 범위 스냅샷
export function wikiLogView(scope) {
  const history = (scope?.history ?? []).slice().reverse().map((e) => ({ id: e.id, at: e.at, action: ACTION[e.action] ?? e.action, title: titleOf(e), summary: e.summary ?? "" }));
  const recs = Object.values(scope?.automation?.records ?? {}).filter((r) => !r.hidden);
  const count = (st) => recs.filter((r) => r.status === st).length;
  return { history, auto: { total: recs.length, failed: count("failed"), pending: count("pending"), completed: count("completed"), retryable: count("failed") + count("pending") },
    people: Object.values(scope?.documents ?? {}).filter((d) => d.type === "Character").map((d) => ({ id: d.id, title: d.title })) };
}

export async function openWikiLog(env) {
  const { ctx } = env, chk = await toolsFor(env);
  if (!chk.tools) return ctx.toast(chk.why, { error: true });
  const rt = ctx.memory.flow.runtime(), wiki = rt.wiki, auto = rt.auto, summary = chk.tools.summary;
  await modal(ctx.win, (done) => {
    let tab = "history", target = "", unsub = [];
    const body = h("div");
    const run = (fn, ok) => { try { const r = fn(); return Promise.resolve(r).then(() => { if (ok) ctx.toast(ok); paint(); }).catch((e) => { fail(ctx)(e); paint(); }); } catch (e) { fail(ctx)(e); paint(); } };
    const historyPane = (v) => h("div", null,
      h("p", { class: "rb-muted" }, `이 채팅의 위키 변경 ${v.history.length}개. 되돌리면 그 항목이 바뀌기 전 모습으로 돌아가요(되돌린 기록도 남아요).`),
      v.history.length ? h("ul", { class: "rb-mem-reclist" }, v.history.slice(0, 60).map((e) => h("li", { class: "rb-mem-rec" },
        h("div", { class: "txt" }, h("b", null, `${e.title} · ${e.action}`), h("div", { class: "rb-muted" }, `${fmtWhen(Date.parse(e.at))}${e.summary ? " · " + e.summary : ""}`)),
        h("span", { class: "rb-mem-rowact" }, btn("되돌리기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 변경을 되돌릴까요?", body: `${e.title} (${e.action})`, ok: "되돌리기" })) run(() => wiki.restore(e.id), "되돌렸어요."); } }))))) : h("p", { class: "rb-muted" }, "아직 변경 이력이 없어요."),
      v.history.length ? btn("이력 모두 지우기", { onClick: async () => { if (await confirmDialog(ctx.win, { title: "변경 이력을 모두 지울까요?", body: "위키 내용은 그대로이고, 되돌릴 수 있는 기록만 사라져요.", ok: "지우기", danger: true })) run(() => wiki.clearHistory(), "지웠어요."); } }) : null);
    const autoPane = (v) => { const a = v.auto, st = auto.status();
      return h("div", null,
        h("p", { class: "rb-muted" }, `자동 기록 활동 ${a.total}개 · 완료 ${a.completed} · 실패 ${a.failed} · 대기 ${a.pending}`),
        st.message ? h("p", { role: "status" }, st.message) : null,
        h("div", { class: "rb-mem-sact" },
          btn("실패·대기 다시 시도", { kind: "primary", disabled: !a.retryable || st.retrying, onClick: () => run(async () => { if (!(await auto.retry())) throw new Error("다시 시도할 대상을 준비하지 못했어요. 채팅을 열고 새 응답이 있는지 확인해 주세요."); }, "다시 시도를 시작했어요.") }),
          btn("실패 기록 지우기", { disabled: !a.failed, onClick: async () => { if (await confirmDialog(ctx.win, { title: "실패한 기록을 지울까요?", body: `${a.failed}개`, ok: "지우기", danger: true })) run(() => wiki.clearFailedAutomationRecords(), "지웠어요."); } }),
          btn("활동 기록 모두 지우기", { disabled: !a.total, onClick: async () => { if (await confirmDialog(ctx.win, { title: "자동 기록 활동을 모두 지울까요?", body: "이미 반영된 위키 내용은 그대로예요.", ok: "지우기", danger: true })) run(() => wiki.clearAutomationActivity(), "지웠어요."); } })));
    };
    const sumPane = (v) => { const s = summary.status(), running = s.phase === "running";
      if (!target || !v.people.some((p) => p.id === target)) target = v.people[0]?.id ?? "";
      return h("div", null,
        h("p", { class: "rb-muted" }, "길어진 인물 문서를 AI가 줄여 써요. 줄이는 동안 위키가 바뀌면 안전하게 멈춰요."),
        v.people.length ? h("label", { class: "rb-mem-field" }, h("span", null, "정리할 인물"), h("select", { class: "rb-input", disabled: running, "aria-label": "정리할 인물", onChange: (e) => { target = e.target.value; } }, v.people.map((p) => h("option", { value: p.id, selected: p.id === target }, p.title)))) : h("p", { class: "rb-muted" }, "정리할 인물 문서가 없어요."),
        running ? h("p", { role: "status", class: "rb-muted" }, `${s.stage || "정리 중"}…`) : null,
        s.error ? note("err", s.error) : null,
        s.phase === "completed" ? note("ok", `줄였어요. ${s.beforeChars}자 → ${s.afterChars}자`) : null,
        h("div", { class: "rb-mem-sact" },
          btn("요약 정리", { kind: "primary", disabled: running || !target, onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 인물 문서를 줄일까요?", body: "AI를 한 번 호출해요. 결과는 바로 반영돼요(변경 이력에서 되돌릴 수 있어요).", ok: "줄이기" })) run(() => summary.summarizePeople(target)); } }),
          running ? btn("취소", { onClick: () => summary.cancel() }) : null));
    };
    const paint = () => { const v = wikiLogView(wiki.snapshot());
      replace(body, segmented([["history", "변경 이력"], ["auto", "자동 기록"], ["sum", "요약 정리"]], tab, (t) => { tab = t; paint(); }, "위키 기록 종류"),
        tab === "history" ? historyPane(v) : tab === "auto" ? autoPane(v) : sumPane(v)); };
    for (const c of [summary, auto]) { try { unsub.push(c.subscribe(() => paint())); } catch {} }
    paint();
    const close = () => { for (const u of unsub) { try { u(); } catch {} } done(null); };
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(720px,96vw);max-height:90vh;overflow:auto" },
      h("div", { class: "rb-mem-shead" }, h("h3", null, "위키 기록 관리"), h("span", { style: "flex:1" }), btn("닫기", { onClick: close })), body);
  });
}
