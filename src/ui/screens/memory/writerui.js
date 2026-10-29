// 수동 Writer(리수폿 writer-ui 대응): RP 본문을 붙여넣거나 최근 응답을 불러와 AI로 분석 → 변경안 검토 → 반영.
// 자동 기록과 달리 내가 고른 글을 지금 바로 분석한다. 모든 결과는 ‘변경안 → 확인 → 반영’ 순서로만 저장한다.
// 지금 열려 있는 채팅에서만 쓸 수 있다(위키 범위가 그 채팅에 묶여 있어서).
import { h, replace } from "../../dom.js";
import { btn, modal, note } from "../../kit.js";
import { fail } from "./common.js";
import { toolsFor } from "./aitools.js";

const val = (v) => v == null || v === "" ? "없음" : String(v);
const busy = (s) => ["running", "applying"].includes(s?.phase);
const PHASE = { running: "AI가 변경안을 만드는 중이에요…", applying: "저장하는 중이에요…" };

const diffRow = (label, target, before, after, extra) => h("article", { class: "rb-card rb-mem-chg" },
  h("b", null, label, target && target !== "인물 공통" ? h("small", { class: "rb-muted" }, ` → ${target}`) : null, extra ? h("small", { class: "rb-muted" }, ` · ${extra}`) : null),
  h("div", { class: "rb-mem-diff" }, h("div", null, h("small", { class: "rb-muted" }, "변경 전"), h("pre", { class: "rb-mem-pre" }, val(before))), h("div", null, h("small", { class: "rb-muted" }, "변경 후"), h("pre", { class: "rb-mem-pre" }, val(after)))));

// 변경안 미리보기: 인물별로 글·수치·성격·장기 변화 후보
export function previewView(preview) {
  if (!preview?.people?.length) return h("p", { class: "rb-muted" }, "바뀌는 내용이 없어요.");
  return h("div", null, preview.people.map((p) => h("section", { class: "rb-mem-sec" },
    h("h4", null, p.name, p.created ? h("small", { class: "rb-muted" }, " · 새 인물") : null),
    p.texts.map((t) => diffRow(t.label, t.target, t.before, t.after, t.operation)),
    p.metrics.map((m) => diffRow(m.label, m.target, m.beforeStage ? `${m.before} (${m.beforeStage})` : m.before, m.afterStage ? `${m.after} (${m.afterStage})` : m.after, [m.delta != null ? (m.delta > 0 ? `↑${m.delta}` : `↓${-m.delta}`) : "", m.reason].filter(Boolean).join(" · "))),
    p.personality.map((x) => diffRow(x.label, "", x.before, x.after, x.operation)),
    p.candidates.map((c) => diffRow(c.label, "", null, c.text, c.status)))));
}

export async function openWriter(env) {
  const { ctx } = env, chk = await toolsFor(env);
  if (!chk.tools) return ctx.toast(chk.why, { error: true });
  const w = chk.tools.writer;
  if (!w) return ctx.toast("이 버전에서는 수동 기록을 쓸 수 없어요.", { error: true });
  let unsub = null;
  await modal(ctx.win, (done) => {
    const body = h("div");
    const close = () => { try { unsub?.(); w.invalidate(); } catch { /* 닫을 때 정리일 뿐 */ } done(null); env.redraw(); };
    const run = (p) => p.catch((e) => fail(ctx)(e));
    let quiet = false;                      // 글을 치는 동안에는 입력칸을 다시 그리지 않는다(커서 유지)
    const typed = (fn) => { quiet = true; try { fn(); } finally { quiet = false; } };
    const paint = () => {
      const s = w.status(), b = busy(s);
      const rp = h("textarea", { class: "rb-input", style: "min-height:180px;height:auto;padding:10px", "aria-label": "RP 본문", placeholder: "분석하고 싶은 RP 본문(AI 응답)을 붙여넣어 주세요.", disabled: b || s.phase === "proposal", onInput: (e) => typed(() => w.editSource(e.target.value, w.status().userText)) }); rp.value = s.rpText;
      const us = h("textarea", { class: "rb-input", rows: 2, style: "padding:10px", "aria-label": "내 입력(선택)", placeholder: "(선택) 그 응답 직전에 내가 쓴 글", disabled: b || s.phase === "proposal", onInput: (e) => typed(() => w.editSource(w.status().rpText, e.target.value)) }); us.value = s.userText;
      const kw = h("input", { class: "rb-input", "aria-label": "분석할 인물", placeholder: "(선택) 이 인물만 분석 — 이름을 쉼표로 구분", value: s.targetKeywords ?? "", disabled: b || s.phase === "proposal", onChange: (e) => { w.targetKeywords = e.target.value; } });
      const prop = s.proposal;
      replace(body,
        h("p", { class: "rb-muted" }, "붙여넣은 글을 AI가 분석해 인물 기록 변경안을 만들어요. 변경안을 보고 반영할지 정해요. 고정(📌)한 항목은 건드리지 않아요."),
        h("div", { class: "rb-mem-sact" }, btn("최근 응답 불러오기", { disabled: b, onClick: () => run(w.pullRecent()) })),
        rp, us, h("label", { class: "rb-mem-field" }, h("span", null, "분석할 인물"), kw),
        b ? h("p", { class: "rb-muted", role: "status" }, PHASE[s.phase]) : null,
        s.error ? note("err", s.error) : null,
        s.phase === "applied" ? note("ok", "반영했어요. 인물 페이지에서 확인해 보세요.") : null,
        prop?.validationWarning ? note("warn", prop.validationWarning) : null,
        prop?.targetNames?.length ? h("p", { class: "rb-muted" }, `분석 대상: ${prop.targetNames.join(", ")}`) : null,
        prop ? previewView(prop.preview) : null,
        h("div", { class: "rb-mem-sact" },
          !prop ? btn("분석해서 변경안 만들기", { kind: "primary", disabled: b, onClick: () => { if (!(w.status().rpText ?? "").trim()) return ctx.toast("RP 본문을 붙여넣거나 최근 응답을 불러와 주세요.", { error: true }); run(w.generate()); } }) : null,
          prop && prop.preview?.people?.length ? btn("이 변경안 반영", { kind: "primary", disabled: b, onClick: () => run(w.apply()) }) : null,
          prop ? btn("버리기", { onClick: () => { w.invalidate(); } }) : null));
    };
    unsub = w.subscribe(() => { if (!quiet) paint(); });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(720px,96vw);max-height:90vh;overflow:auto" },
      h("div", { class: "rb-mem-shead" }, h("h3", null, "수동 기록 · RP 붙여넣어 분석"), h("span", { style: "flex:1" }), btn("닫기", { onClick: close })), body);
  });
}
