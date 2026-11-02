// 로어북 더스크화 창: 구분선 규칙 변환 / AI 분석(소속·장소) → [규칙 설계(조건·반복·유지·그룹·배치·연쇄·변수)] → 미리보기(체크한 것만) → 적용
// 이 창은 목록을 직접 고치지 않는다. 적용할 결과(entries)만 돌려주고, 에디터가 초안에 반영한다(저장 전까지는 되돌릴 수 있다).
import { h, replace } from '../dom.js';
import { btn, modal, note, progressBar } from '../kit.js';
import { applyPlan, batchMessages, batches, mergeAnalysis, parseAnalysis, rulePlan, summaryText } from '../../engine/loredusk.js';
import { runAI } from '../../engine/runai.js';
import { loadPB } from '../../data/personabuilder.js';
import { pickRefine, readRefine, refineChanges, refineMessages, refineStep, refineTargets } from '../../dev/aibuild/lorerefine.js';

const label = (e) => String(e?.comment || e?.key || "(이름 없음)");

export async function openLoreDusk(ctx, { list, reference = "" }) {
  const ais = await loadPB(ctx.api).then((d) => ({ ais: d.ais, ai: d.ai })).catch(() => ({ ais: [{ id: "default", name: "기본", mode: "submodel" }], ai: "default" }));
  const base = rulePlan(list);
  return modal(ctx.win, (done) => {
    let plan = base;
    let ctrl = null;
    const body = h("div", { style: "display:flex;flex-direction:column;gap:10px" });
    const instr = h("input", { class: "rb-input", placeholder: "예) 학원물이에요. 학생회·동아리를 소속으로 묶어 주세요 (선택)", "aria-label": "AI에게 추가로 알려줄 것" });
    const sel = h("select", { class: "rb-input", "aria-label": "AI 모델", style: "max-width:220px" }, ...ais.ais.map((a) => h("option", { value: a.id, selected: a.id === ais.ai }, a.name)));
    const pick = () => ais.ais.find((a) => a.id === sel.value) ?? ais.ais[0];
    const close = () => { ctrl?.abort(); done(null); };

    const start = () => {
      const n = base.affs.length;
      replace(body,
        h("p", { class: "rb-p" }, "기존 로어북을 Dusk 소속·장소 구조로 바꿔요. 이 창에서는 아직 아무것도 바뀌지 않고, 미리보기에서 체크한 것만 적용돼요."),
        h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, h("b", null, "사용할 AI 모델"), sel, h("span", { class: "rb-muted" }, "아래 AI 분석·규칙 설계에 모두 적용돼요")),
        n ? h("div", { class: "rb-card", style: "padding:10px 12px" },
          h("b", null, `구분선 ${n}개를 찾았어요`), h("div", { class: "rb-muted" }, `'-- 이름 --' 항목 → '[소속] 이름' 폴더, 아래 항목 → 구성원 (AI 없이 바로 변환) · ${base.affs.reduce((s, a) => s + a.members.length, 0)}명`),
          h("div", { style: "margin-top:8px" }, btn("구분선만 변환", { kind: "primary", onClick: () => preview(base) }))) : h("p", { class: "rb-muted" }, "'-- 이름 --' 형식의 구분선은 없어요."),
        h("div", { class: "rb-card", style: "padding:10px 12px;display:flex;flex-direction:column;gap:8px" },
          h("b", null, "AI로 분석"), h("div", { class: "rb-muted" }, "사람·소속·장소를 나누고, 겹치는 이름은 이름 경계로, 빠진 장소는 새 항목으로 제안해요. 항목이 많으면 120개씩 나눠 보내요."),
          instr, h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, btn("AI 분석 시작", { kind: n ? "" : "primary", onClick: analyze }))),
        h("div", { class: "rb-card", style: "padding:10px 12px;display:flex;flex-direction:column;gap:8px" },
          h("b", null, "AI로 규칙 설계 (Dusk 기능 전부)"),
          h("div", { class: "rb-muted" }, "이미 정리된 로어북이면 바로 여기서 시작해요. 항목마다 조건·확률·반복(한 번만·쉬기)·유지·그룹·배치(깊이)·연쇄·변수·이름 경계와 소속 확률을 설계해요. 내용·키·폴더는 바꾸지 않아요. 40개씩 나눠 보내요."),
          h("div", null, btn("규칙 설계 시작", { onClick: () => refine(list, "") }))),
        h("div", { class: "btns" }, btn("닫기", { onClick: close })));
    };

    async function analyze() {
      ctrl = new AbortController();
      const work = rulePlan(list);
      const bs = batches(list);
      if (!bs.length) { ctx.toast("분석할 항목이 없어요", { error: true }); return; }
      const bar = progressBar(0);
      const msg = h("p", { class: "rb-p" }, `분석 중… 0/${bs.length}`);
      replace(body, msg, bar, h("div", { class: "btns" }, btn("취소", { onClick: () => { ctrl.abort(); start(); } })));
      const failed = [];
      for (let i = 0; i < bs.length; i++) {
        try {
          const raw = await runAI(ctx.api, batchMessages(list, work, bs[i], { instruction: instr.value, reference }), pick(), ctrl.signal);
          mergeAnalysis(work, parseAnalysis(raw, list, bs[i]), list);
        } catch (e) {
          if (ctrl.signal.aborted) return;
          failed.push(`${i + 1}번째 묶음: ${e?.message ?? e}`);
        }
        replace(msg, `분석 중… ${i + 1}/${bs.length}`);
        bar.set(Math.round(((i + 1) / bs.length) * 100));
      }
      if (failed.length) work.notes.push(...failed);
      preview(work);
    }

    function preview(p) {
      plan = p;
      const rows = [];
      const sect = (t, items) => items.length ? rows.push(h("div", { class: "rb-muted", style: "margin-top:6px;font-weight:600" }, t), ...items) : null;
      const chk = (o, text, sub) => {
        const cb = h("input", { type: "checkbox", checked: o.checked });
        cb.addEventListener("change", () => { o.checked = cb.checked; refresh(); });
        return h("label", { class: "rb-check", style: "align-items:flex-start" }, cb, h("span", null, text, sub ? h("div", { class: "rb-muted", style: "font-size:12px" }, sub) : null));
      };
      const nameOf = (id) => plan.affs.find((a) => a.id === id)?.name ?? "?";
      sect("소속 폴더", plan.affs.map((a) => chk(a, `[소속] ${a.name}${a.parent ? ` ‹ ${nameOf(a.parent)}` : ""} · ${a.members.length}명${a.src === "divider" ? " · 구분선" : ""}`,
        a.members.slice(0, 8).map((m) => label(list[m])).join(", ") + (a.members.length > 8 ? " …" : "") + (a.def !== 100 || a.max !== "" ? ` — 기본 ${a.def}%${a.max !== "" ? ` · 최대 ${a.max}명` : ""}` : ""))));
      sect("장소", plan.places.filter((x) => x.idx !== void 0).map((x) => chk(x, `[장소] ${label(list[x.idx])}`, x.links.length ? `연결: ${x.links.map(nameOf).join(", ")} (AI 추측이니 확인해 주세요)` : "연결 없음")));
      sect("새 장소 (AI가 제안)", plan.places.filter((x) => x.idx === void 0).map((x) => chk(x, `[장소] ${x.name}`, `키: ${x.keys}${x.links.length ? ` · 연결: ${x.links.map(nameOf).join(", ")}` : ""}`)));
      sect("이름 설정", plan.flags.map((f) => chk(f, `${label(list[f.idx])}`, [f.whole && "이름 경계(통단어일 때만)", f.common && `흔한 낱말 이름${f.keys ? ` '${f.keys}'` : ""}`].filter(Boolean).join(" · "))));
      if (plan.notes.length) sect("참고", plan.notes.slice(0, 8).map((t) => h("div", { class: "rb-muted", style: "font-size:12px" }, t)));
      const sum = h("span", { class: "rb-muted" });
      const ok = btn("적용", { onClick: apply });
      // 구조를 적용한 결과 위에서 규칙까지 설계한다 (적용은 마지막에 한 번)
      const okRefine = btn("적용하고 규칙 설계로", { kind: "primary", onClick: () => { try { const r = applyPlan(list, plan); refine(r.entries, summaryText(r.summary)); } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); } } });
      const refresh = () => {
        const on = plan.affs.filter((a) => a.checked).length + plan.places.filter((x) => x.checked).length + plan.flags.filter((x) => x.checked).length;
        sum.textContent = `${on}건 선택`;
        ok.disabled = !on;
        okRefine.disabled = !on;
      };
      replace(body,
        h("p", { class: "rb-p" }, "체크한 것만 적용돼요. 적용해도 저장하기 전에는 '되돌리기'로 원래대로 돌릴 수 있어요."),
        h("div", { class: "rb-scroll", style: "max-height:min(48vh,420px);border:1px solid var(--rb-line);border-radius:12px;padding:6px 10px;overscroll-behavior:contain" }, ...(rows.length ? rows : [note("info", "바꿀 것을 찾지 못했어요.")])),
        h("div", { class: "btns", style: "align-items:center;flex-wrap:wrap" }, sum, btn("처음으로", { onClick: start }), ok, okRefine));
      refresh();
    }

    function apply() {
      try {
        const r = applyPlan(list, plan);
        done({ entries: r.entries, text: summaryText(r.summary) });
      } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); }
    }

    // ---- 규칙 설계: src(구조를 적용했다면 그 결과)의 항목마다 Dusk 규칙을 설계 ----
    async function refine(src, prefix) {
      const bs = refineTargets(src);
      if (!bs.length) { ctx.toast("규칙을 설계할 항목이 없어요", { error: true }); return; }
      ctrl = new AbortController();
      const bar = progressBar(0);
      const msg = h("p", { class: "rb-p" }, `규칙 설계 중… 0/${bs.length}`);
      replace(body, msg, bar, h("p", { class: "rb-muted", style: "font-size:12px" }, "묶음마다 AI 호출이 한 번씩 생겨요. 결과는 미리보기에서 골라 적용해요."), h("div", { class: "btns" }, btn("취소", { onClick: () => { ctrl.abort(); start(); } })));
      let work = src;
      const why = {}, errs = [], warns = [];
      for (let i = 0; i < bs.length; i++) {
        try {
          const msgs = refineMessages(work, bs[i], { instruction: instr.value, reference });
          let raw = await runAI(ctx.api, msgs, pick(), ctrl.signal), r;
          try { r = readRefine(raw, work, bs[i]); }
          catch { raw = await runAI(ctx.api, [...msgs, { role: "assistant", content: String(raw ?? "") }, { role: "user", content: "JSON 객체 하나만 다시 보내 주세요." }], pick(), ctrl.signal); r = readRefine(raw, work, bs[i]); }
          Object.assign(why, r.why);
          const st = refineStep(work, r.design);
          work = st.work; errs.push(...st.errors); warns.push(...st.warnings);
        } catch (e) {
          if (ctrl.signal.aborted) return;
          errs.push(`${i + 1}번째 묶음: ${e?.message ?? e}`);
        }
        replace(msg, `규칙 설계 중… ${i + 1}/${bs.length}`);
        bar.set(Math.round(((i + 1) / bs.length) * 100));
      }
      refinePreview(src, work, refineChanges(src, work, why), prefix, errs, warns);
    }
    function refinePreview(src, work, changes, prefix, errs, warns) {
      const KIND = { affiliation: "소속", place: "장소", entry: "항목" };
      const rows = changes.map((c) => {
        const cb = h("input", { type: "checkbox", checked: c.checked });
        cb.addEventListener("change", () => { c.checked = cb.checked; refresh(); });
        return h("label", { class: "rb-check", style: "align-items:flex-start" }, cb, h("span", { style: "min-width:0;overflow-wrap:anywhere" }, `[${KIND[c.kind]}] ${c.name}`,
          h("div", { class: "rb-muted", style: "font-size:12px" }, `${c.before} → ${c.after}`), c.why ? h("div", { class: "rb-muted", style: "font-size:12px" }, `💡 ${c.why}`) : null));
      });
      const notes = [...new Set(errs)].slice(0, 6).map((t) => h("div", { class: "rb-muted", style: "font-size:12px" }, `⚠ 뺀 것: ${t}`)).concat([...new Set(warns)].slice(0, 4).map((t) => h("div", { class: "rb-muted", style: "font-size:12px" }, `참고: ${t}`)));
      const sum = h("span", { class: "rb-muted" });
      const ok = btn("적용", { kind: "primary", onClick: () => {
        const n = changes.filter((c) => c.checked).length;
        done({ entries: pickRefine(src, work, changes), text: [prefix, n ? `규칙 ${n}개 설계` : ""].filter(Boolean).join(" · ") || "바뀐 것 없음" });
      } });
      const refresh = () => { const n = changes.filter((c) => c.checked).length; sum.textContent = `${n}건 선택`; ok.disabled = !n && !prefix; };
      const all = (v) => { for (const c of changes) c.checked = v; refinePreview(src, work, changes, prefix, errs, warns); };
      replace(body,
        h("p", { class: "rb-p" }, prefix ? `구조 정리(${prefix})에 더해, 체크한 항목의 규칙만 바뀌어요. 저장하기 전에는 '되돌리기'로 원래대로 돌릴 수 있어요.` : "체크한 항목의 규칙만 바뀌어요. 내용·키·폴더는 그대로예요. 저장하기 전에는 '되돌리기'로 원래대로 돌릴 수 있어요."),
        changes.length ? h("div", { style: "display:flex;gap:6px" }, btn("모두 선택", { size: "sm", onClick: () => all(true) }), btn("모두 해제", { size: "sm", onClick: () => all(false) })) : null,
        h("div", { class: "rb-scroll", style: "max-height:min(48vh,420px);border:1px solid var(--rb-line);border-radius:12px;padding:6px 10px;overscroll-behavior:contain" }, ...(rows.length ? rows : [note("info", "AI가 바꿀 규칙을 제안하지 않았어요.")]), ...notes),
        h("div", { class: "btns", style: "align-items:center;flex-wrap:wrap" }, sum, btn("처음으로", { onClick: start }), ok));
      refresh();
    }

    start();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "로어북 더스크화", style: "width:min(640px,94vw)" }, h("h3", { class: "rb-h3" }, "로어북 더스크화"), body);
  });
}
