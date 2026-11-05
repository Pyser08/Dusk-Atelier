// 인물 위키에 붙는 Erosync 칸(1단계: 읽기만). Erosync가 켜져 있고 이름이 맞는 인물에게만 보인다.
// 고치기는 Erosync 자체 화면으로 보낸다(저장은 Erosync의 erosync_* 키 그대로).
import { h } from "../../dom.js";
import { btn } from "../../kit.js";
import { openProfileEditor, resetProfile, analysisLine } from "./erosynceditor.js";
import { eroReady, eroAxes, eroAdult, eroGoalsOf, eroPair } from "../../../engine/erosyncview.js";

// 켜져 있을 때만 읽는다. 실패하면 null(위키는 원래대로).
export async function eroLoad(ctx) {
  const er = ctx.erosync;
  if (!er?.isRunning?.()) return null;
  try { const s = await er.read(); return eroReady(s) ? s : null; } catch { return null; }
}

const bar = (label, v, hint, ghost) => h("div", { class: "rb-wk2-num g" }, h("span", { class: "n", title: hint || "" }, label),
  h("span", { class: "track", role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": v },
    ghost != null && ghost !== v ? h("i", { class: "ghost", style: { width: `${ghost}%`, opacity: 0.35 } }) : null, h("i", { style: { width: `${v}%` } })),
  h("small", { class: "v" }, `${v}/100`));
const tag = () => h("small", { class: "rb-wk2-badge" }, "Erosync");
const fix = () => null;   // 값 고치기는 NSFW 탭에서 바로 한다(원본 창을 열지 않는다)

// 상세 정보: 8축
export function eroInfoCard(ctx, card, person) {
  const ax = eroAxes(person);
  if (!ax.length) return null;
  const rows = ax.map((a) => bar(a.label + (a.changed ? " ·바뀜" : ""), a.value, a.hint, a.changed ? a.base : null));
  return card("Erosync 성향", [h("div", { class: "rb-wk2-nums" }, rows), h("small", { class: "rb-muted" }, "AI가 읽은 값에서 고친 곳은 옅은 막대로 원래 값을 보여 줘요. 성적 항목은 NSFW 탭에 있어요.")], fix(ctx), "rb-wk2-ero");
}

// NSFW 탭: 성적 항목(성적 관심·선호 등) + 직접 고치기·AI 값으로·다시 분석. Erosync가 켜져 있고 이름이 맞는 인물에게만.
export function eroNsfwCard(ctx, card, person, redraw) {
  const ad = eroAdult(person), ax = eroAxes(person);
  if (!ad && !ax.length) return null;
  const line = analysisLine(ctx, () => redraw?.());
  const act = h("div", { class: "rb-mem-sact" },
    btn("직접 고치기", { size: "sm", id: "rb-ero-edit", onClick: () => openProfileEditor(ctx, person, redraw) }),
    person.overridden ? btn("AI 값으로", { size: "sm", id: "rb-ero-reset", onClick: () => resetProfile(ctx, person, redraw) }) : null,
    btn("다시 분석", { size: "sm", id: "rb-ero-reanalyze", title: "이 인물만 AI로 다시 분석해요(호출 2번)", onClick: () => line.start("single", person.id) }),
    btn("축만 다시 채점", { size: "sm", id: "rb-ero-rescore", title: "8축 점수만 다시 매겨요(호출 1~2번)", onClick: () => line.start("axes", person.id) }));
  const rows = ad ? [h("div", { class: "rb-wk2-nums" }, ad.rows.map((r) => bar(r.label, r.value)),
    ad.pref ? h("small", { class: "rb-muted" }, `끌리는 상대 · 여성 ${ad.pref.f}% · 남성 ${ad.pref.m}% · 그 외 ${ad.pref.x}%`) : null)] : [h("small", { class: "rb-muted" }, "성적 항목이 아직 없어요.")];
  return card("Erosync 성적 항목", [...rows, person.overridden ? h("small", { class: "rb-muted" }, "직접 고친 값이 있어요. AI가 다시 분석해도 고친 값이 우선이에요.") : null, act, line.el], null, "rb-wk2-ero");
}

// 요약: 지금 노리는 것
export function eroSumCard(ctx, card, snap, person) {
  const g = eroGoalsOf(snap, person.id);
  if (!g.aiming.length && !g.aimedAt.length && !g.rivals.length) return null;
  const nameOf = (id) => snap.people.find((p) => p.id === id)?.name ?? (id === "user" ? "당신" : id);
  const goal = (x) => h("div", { class: "rb-wk2-bond" }, h("span", { class: "t" }, `${x.targetName} · ${x.typeLabel}`), x.objective ? h("small", { class: "rb-muted" }, x.objective) : null, h("small", { class: "rb-muted" }, `우선도 ${x.priority ?? "-"}`));
  return card("지금 노리는 목표", [
    ...g.aiming.map(goal),
    g.aimedAt.length ? h("small", { class: "rb-muted" }, `이 인물을 노리는 사람 · ${g.aimedAt.map((x) => x.actorName).join(", ")}`) : null,
    ...g.rivals.map((r) => h("small", { class: "rb-muted" }, `경쟁 · ${r.actor === person.id ? nameOf(r.rival) : nameOf(r.actor)} (세기 ${r.intensity})`))
  ], tag(), "rb-wk2-ero");
}

// 관계: 이 둘 사이
export function eroPairCard(ctx, card, snap, self, other) {
  if (!self || !other) return null;
  const pr = eroPair(snap, self.id, other.id);
  if (!pr.goals.length && !pr.rivals.length && !pr.relations.length) return null;
  const rel = (r) => h("div", { class: "rb-wk2-bar" }, h("span", null, `${r.fromName} → ${r.toName}`),
    h("small", { class: "rb-muted" }, `호감 ${r.affection} · 끌림 ${r.eroticAttraction}${r.hatred > 0 ? ` · 증오 ${r.hatred}` : ""}`));
  return card("Erosync 목표·경쟁", [
    ...pr.goals.map((x) => h("div", { class: "rb-wk2-bond" }, h("span", { class: "t" }, `${x.actorName} → ${x.targetName} · ${x.typeLabel}`), x.nextMove ? h("small", { class: "rb-muted" }, `다음 수 · ${x.nextMove}`) : null)),
    ...pr.rivals.map((x) => h("small", { class: "rb-muted" }, `경쟁 · ${x.actorName} ↔ ${x.rivalName} (세기 ${x.intensity})${x.reason ? ` — ${x.reason}` : ""}`)),
    ...pr.relations.map(rel)
  ], tag(), "rb-wk2-ero");
}

// Dusk에 함께 기록된 인물이 아직 없을 때: Erosync에 있는 상대별 카드를 모두 보여 준다.
export function eroPartnerCards(ctx, card, snap, self) {
  if (!self) return [];
  const ids = new Set();
  for (const g of snap.goals ?? []) { if (g.actor === self.id) ids.add(g.target); else if (g.target === self.id) ids.add(g.actor); }
  for (const r of snap.rivalries ?? []) { if (r.actor === self.id) ids.add(r.rival); else if (r.rival === self.id) ids.add(r.actor); }
  return [...ids].map((id) => eroPairCard(ctx, card, snap, self, (snap.people ?? []).find((p) => p.id === id))).filter(Boolean);
}
