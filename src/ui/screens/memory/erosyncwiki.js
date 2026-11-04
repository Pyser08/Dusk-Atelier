// 인물 위키에 붙는 Erosync 칸(1단계: 읽기만). Erosync가 켜져 있고 이름이 맞는 인물에게만 보인다.
// 고치기는 Erosync 자체 화면으로 보낸다(저장은 Erosync의 erosync_* 키 그대로).
import { h } from "../../dom.js";
import { btn } from "../../kit.js";
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
const fix = (ctx) => (typeof ctx.openErosync === "function" ? h("button", { type: "button", class: "rb-wk2-link", onClick: () => ctx.openErosync().catch(() => {}) }, "Erosync에서 고치기") : null);

// 상세 정보: 8축 + (접힌) 성인 항목
export function eroInfoCard(ctx, card, person) {
  const ax = eroAxes(person), ad = eroAdult(person);
  if (!ax.length && !ad) return null;
  const rows = ax.map((a) => bar(a.label + (a.changed ? " ·바뀜" : ""), a.value, a.hint, a.changed ? a.base : null));
  const adult = ad ? h("details", { class: "rb-mem-man" }, h("summary", null, "성인 항목"),
    h("div", { class: "rb-wk2-nums" }, ad.rows.map((r) => bar(r.label, r.value)),
      ad.pref ? h("small", { class: "rb-muted" }, `끌리는 상대 · 여성 ${ad.pref.f}% · 남성 ${ad.pref.m}% · 그 외 ${ad.pref.x}%`) : null)) : null;
  return card("Erosync 성향", [h("div", { class: "rb-wk2-nums" }, rows), adult, h("small", { class: "rb-muted" }, "AI가 읽은 값에서 고친 곳은 옅은 막대로 원래 값을 보여 줘요.")], fix(ctx), "rb-wk2-ero");
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
