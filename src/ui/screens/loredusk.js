// 로어북 더스크화 창: 구분선 규칙 변환 / AI 분석 → 미리보기(체크한 것만) → 적용
// 이 창은 목록을 직접 고치지 않는다. 적용할 결과(entries)만 돌려주고, 에디터가 초안에 반영한다(저장 전까지는 되돌릴 수 있다).
import { h, replace } from '../dom.js';
import { btn, modal, note, progressBar } from '../kit.js';
import { applyPlan, batchMessages, batches, mergeAnalysis, parseAnalysis, rulePlan, summaryText } from '../../engine/loredusk.js';
import { runAI } from '../../engine/runai.js';
import { loadPB } from '../../data/personabuilder.js';

const label = (e) => String(e?.comment || e?.key || "(이름 없음)");

export async function openLoreDusk(ctx, { list }) {
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
        n ? h("div", { class: "rb-card", style: "padding:10px 12px" },
          h("b", null, `구분선 ${n}개를 찾았어요`), h("div", { class: "rb-muted" }, `'-- 이름 --' 항목 → '[소속] 이름' 폴더, 아래 항목 → 구성원 (AI 없이 바로 변환) · ${base.affs.reduce((s, a) => s + a.members.length, 0)}명`),
          h("div", { style: "margin-top:8px" }, btn("구분선만 변환", { kind: "primary", onClick: () => preview(base) }))) : h("p", { class: "rb-muted" }, "'-- 이름 --' 형식의 구분선은 없어요."),
        h("div", { class: "rb-card", style: "padding:10px 12px;display:flex;flex-direction:column;gap:8px" },
          h("b", null, "AI로 분석"), h("div", { class: "rb-muted" }, "사람·소속·장소를 나누고, 겹치는 이름은 이름 경계로, 빠진 장소는 새 항목으로 제안해요. 항목이 많으면 120개씩 나눠 보내요."),
          instr, h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, sel, btn("AI 분석 시작", { kind: n ? "" : "primary", onClick: analyze }))),
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
          const raw = await runAI(ctx.api, batchMessages(list, work, bs[i], { instruction: instr.value }), pick(), ctrl.signal);
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
      const ok = btn("적용", { kind: "primary", onClick: apply });
      const refresh = () => {
        const on = plan.affs.filter((a) => a.checked).length + plan.places.filter((x) => x.checked).length + plan.flags.filter((x) => x.checked).length;
        sum.textContent = `${on}건 선택`;
        ok.disabled = !on;
      };
      replace(body,
        h("p", { class: "rb-p" }, "체크한 것만 적용돼요. 적용해도 저장하기 전에는 '되돌리기'로 원래대로 돌릴 수 있어요."),
        h("div", { class: "rb-scroll", style: "max-height:min(48vh,420px);border:1px solid var(--rb-line);border-radius:12px;padding:6px 10px;overscroll-behavior:contain" }, ...(rows.length ? rows : [note("info", "바꿀 것을 찾지 못했어요.")])),
        h("div", { class: "btns", style: "align-items:center" }, sum, btn("처음으로", { onClick: start }), ok));
      refresh();
    }

    function apply() {
      try {
        const r = applyPlan(list, plan);
        done({ entries: r.entries, text: summaryText(r.summary) });
      } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); }
    }

    start();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "로어북 더스크화", style: "width:min(640px,94vw)" }, h("h3", { class: "rb-h3" }, "로어북 더스크화"), body);
  });
}
