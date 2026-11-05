// NSFW 탭의 Erosync 편집: 값 직접 고치기 · AI 분석값으로 되돌리기 · 다시 분석(전체/축만). 저장은 Erosync의 erosync_* 키(userOverrides).
import { h, replace } from "../../dom.js";
import { btn, modal, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";

export const GENDER_OPTS = [["", "분석값"], ["female", "여자"], ["male", "남자"], ["genderless", "성별 없음"]];
export const CYCLE_OPTS = [["", "분석값"], ["on", "적용"], ["off", "적용 안 함"]];
const num = (v) => (v === "" || v == null ? null : Math.min(100, Math.max(0, Math.round(Number(v)))));

// 고치기 창: 비워 두면 분석값. 바뀐 칸만 patch로 모아 저장한다.
export async function openProfileEditor(ctx, person, onDone) {
  const er = ctx.erosync, got = await er.profile("get", person.id);
  if (!got?.ok) { ctx.toast(got?.reason || "값을 읽지 못했어요", { error: true }); return; }
  const inputs = {};
  const field = (key, label, base, value) => {
    const el = h("input", { class: "rb-input", type: "number", min: 0, max: 100, placeholder: base == null ? "미분석" : String(base), value: value ?? "", "aria-label": label, "data-k": key });
    inputs[key] = { el, orig: value ?? "" };
    return h("label", { class: "rb-mem-field" }, h("span", null, label, h("small", { class: "rb-muted" }, base == null ? " 미분석" : ` 분석값 ${base}`)), el);
  };
  const sel = (key, label, opts, cur, note) => {
    const el = h("select", { class: "rb-input", "aria-label": label, "data-k": key }, opts.map(([v, t]) => h("option", { value: v, selected: v === cur }, t)));
    inputs[key] = { el, orig: cur };
    return h("label", { class: "rb-mem-field" }, h("span", null, label, note ? h("small", { class: "rb-muted" }, ` ${note}`) : null), el);
  };
  const pf = got.pref?.override ?? {};
  const prefIn = ["female", "male", "genderless"].map((k) => { const lab = { female: "여성", male: "남성", genderless: "성별 없음" }[k];
    const el = h("input", { class: "rb-input", type: "number", min: 0, max: 100, placeholder: String(got.pref.base[k] ?? 0), value: pf[k] ?? "", "aria-label": `선호 ${lab} %` });
    inputs[`pref.${k}`] = { el, orig: pf[k] ?? "" };
    return h("label", { class: "rb-mem-field" }, h("span", null, `끌리는 상대 · ${lab} %`, h("small", { class: "rb-muted" }, ` 분석값 ${got.pref.base[k] ?? 0}`)), el); });
  const res = await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", id: "rb-ero-editor", style: "width:min(560px,96vw);max-height:88vh;overflow:auto" },
    h("h3", null, `${got.name} · Erosync 값 고치기`),
    h("p", { class: "rb-muted", style: "white-space:normal" }, "칸을 비워 두면 AI가 분석한 값을 써요. 고친 값은 다음 응답부터 반영돼요."),
    sel("gender", "성별", GENDER_OPTS, got.gender.override, `분석값 ${got.gender.analysed}`),
    sel("cycle", "생리 주기 적용", CYCLE_OPTS, got.cycle.override),
    ...prefIn,
    ...(got.eroticInterest ? [field("eroticInterest", "성적 관심도", got.eroticInterest.base, got.eroticInterest.override)] : []),
    ...got.scalars.map((s) => field(s.key, s.label, s.base, s.override)),
    h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", id: "rb-ero-editor-save", onClick: () => {
      const patch = {};
      for (const [k, { el, orig }] of Object.entries(inputs)) {
        if (String(el.value) === String(orig)) continue;
        if (k === "gender" || k === "cycle") patch[k] = el.value;
        else if (!k.startsWith("pref.")) patch[k] = num(el.value);
      }
      if (["female", "male", "genderless"].some((k) => String(inputs[`pref.${k}`].el.value) !== String(inputs[`pref.${k}`].orig)))
        patch.pref = Object.fromEntries(["female", "male", "genderless"].map((k) => [k, num(inputs[`pref.${k}`].el.value)]));
      done(patch);
    } }))));
  if (!res) return;
  if (!Object.keys(res).length) { ctx.toast("바뀐 값이 없어요"); return; }
  const r = await er.profile("edit", person.id, res);
  if (!r?.ok) { ctx.toast(r?.reason || "저장하지 못했어요", { error: true }); return; }
  ctx.toast("고쳤어요. 고친 값은 AI가 덮어쓰지 않아요.");
  onDone?.();
}

export async function resetProfile(ctx, person, onDone) {
  if (!(await confirmDialog(ctx.win, { title: "AI 분석값으로 되돌릴까요?", body: `${person.name}의 직접 고친 값을 모두 지워요.`, ok: "되돌리기", danger: true }))) return;
  const r = await ctx.erosync.profile("reset", person.id);
  if (!r?.ok) ctx.toast(r?.reason || "되돌리지 못했어요", { error: true }); else { ctx.toast("AI 분석값으로 되돌렸어요"); onDone?.(); }
}

// 분석 진행 줄: 시작하면 1.5초마다 상태를 읽어 보여 주고, 끝나면 onDone
export function analysisLine(ctx, onDone) {
  const line = h("p", { class: "rb-muted", id: "rb-ero-status", style: "white-space:normal", hidden: true });
  const cancel = btn("취소", { size: "sm", hidden: true, onClick: () => ctx.erosync.profile("cancel") });
  let timer = null;
  const tick = async () => {
    const s = await ctx.erosync.profile("status");
    if (!s?.ok) { stop(); return; }
    const txt = s.running ? `분석 중 · ${s.detail || s.phase}${s.total ? ` (${s.completed}/${s.total})` : ""}` : s.message;
    line.textContent = txt; line.hidden = !txt; cancel.hidden = !s.running;
    if (!s.running && timer) { stop(); onDone?.(s); }
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const watch = () => { if (!timer) timer = setInterval(() => { void tick(); }, 1500); void tick(); };
  const start = async (kind, id) => {
    const r = await ctx.erosync.profile("start", kind, id);
    if (!r?.ok) { ctx.toast(r?.reason || "분석을 시작하지 못했어요", { error: true }); return false; }
    ctx.toast("분석을 시작했어요. AI 호출이 여러 번 들어가요."); watch(); return true;
  };
  return { el: h("div", { class: "rb-mem-sact" }, line, cancel), start, watch, stop };
}
