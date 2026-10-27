// 복구·실행 기록(고급 모드): Writer 원문 JSON을 붙여넣어 진단 → 고치기 → 반영(또는 강제 반영), 실행 기록 보기·삭제.
// 지금 열려 있는 채팅에서만 쓸 수 있다.
import { h, replace } from "../../dom.js";
import { btn, modal, note, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { toolsFor } from "./aitools.js";

const when = (t) => t ? new Date(t).toLocaleString("ko-KR") : "";

export async function openRecovery(env) {
  const { ctx } = env, chk = await toolsFor(env);
  if (!chk.tools) return ctx.toast(chk.why, { error: true });
  const rec = chk.tools.recovery, trace = ctx.memory.flow.runtime().trace, scope = chk.scope;
  await modal(ctx.win, (done) => {
    let tab = "recover", unsub = () => {};
    const body = h("div"), run = (p) => p.catch((e) => fail(ctx)(e));
    const recoverPane = () => {
      const s = rec.status();
      return h("div", null,
        h("p", { class: "rb-muted" }, "AI 응답이 깨져 기억에 못 들어갔을 때, 원문 JSON을 붙여넣고 진단·수리한 뒤 반영해요. 최근 Writer 기록에서 불러올 수도 있어요."),
        s.records.length ? h("label", { class: "rb-mem-field" }, h("span", null, "최근 Writer 기록"), h("select", { class: "rb-input", onChange: (e) => { if (e.target.value) run(rec.fromTrace(e.target.value)); } },
          h("option", { value: "" }, "불러올 기록 고르기"), s.records.map((r) => h("option", { value: r.id, selected: r.id === s.recordId }, `${r.turn ?? "?"}턴 · ${when(r.at)} · ${r.status}`)))) : null,
        h("textarea", { class: "rb-input", rows: 8, "aria-label": "원문 JSON", value: s.json, onChange: (e) => rec.edit(e.target.value) }),
        s.busy ? h("p", { class: "rb-muted", role: "status" }, "처리 중…") : null,
        s.error ? note("err", s.error) : null,
        (s.notes ?? []).map((n) => note("info", n.message ?? String(n))),
        h("div", { class: "rb-mem-sact" },
          btn("진단", { onClick: () => run(rec.diagnose()) }),
          s.canRepair ? btn("AI로 고치기", { onClick: () => run(rec.repair()) }) : null,
          s.canPrepareForce ? btn("강제 반영 준비", { onClick: () => run(rec.prepareForce()) }) : null,
          s.canApply ? btn("반영", { kind: "primary", onClick: () => run(rec.apply()) }) : null,
          s.canForceApply ? btn("강제 반영", { kind: "primary", onClick: async () => { if (await confirmDialog(ctx.win, { title: "강제 반영할까요?", body: "검증을 건너뛰고 기억에 넣어요.", ok: "강제 반영", danger: true })) run(rec.applyForce()); } }) : null),
        s.applied ? note("ok", "반영했어요.") : null);
    };
    const logPane = () => {
      const list = trace.snapshot(scope) ?? [];
      return h("div", null, h("p", { class: "rb-muted" }, `최근 AI 호출 ${list.length}개`),
        h("ul", { class: "rb-mem-reclist" }, list.slice().reverse().slice(0, 60).map((r) => h("li", { class: "rb-mem-rec" },
          h("div", { class: "txt" }, h("b", null, `${r.stage} · ${r.status}`), h("div", { class: "rb-muted" }, `${r.turnNumber ?? "?"}턴 · ${when(r.startedAt)}`),
            r.error ? h("div", null, String(r.error?.message ?? r.error)) : null,
            h("details", null, h("summary", null, "원문 보기"), h("pre", { class: "rb-mem-pre" }, String(r.output ?? "(없음)").slice(0, 6000)))),
          h("span", { class: "rb-mem-rowact" }, btn("삭제", { size: "sm", onClick: () => { try { trace.deleteRecord(r.id, scope); } catch (e) { fail(ctx)(e); } paint(); } }))))));
    };
    const paint = () => replace(body,
      h("div", { class: "rb-mem-sact" }, btn("복구", { kind: tab === "recover" ? "primary" : "", onClick: () => { tab = "recover"; paint(); } }), btn("실행 기록", { kind: tab === "log" ? "primary" : "", onClick: () => { tab = "log"; paint(); } })),
      tab === "recover" ? recoverPane() : logPane());
    unsub = rec.subscribe(() => paint()) ?? unsub;
    paint();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(720px,96vw);max-height:90vh;overflow:auto" },
      h("div", { class: "rb-mem-shead" }, h("h3", null, "복구 · 실행 기록"), h("span", { style: "flex:1" }), btn("닫기", { onClick: () => { try { unsub(); } catch {} done(null); } })), body);
  });
}
