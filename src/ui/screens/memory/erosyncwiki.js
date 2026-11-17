// 인물 위키에 붙는 Erosync 칸(1단계: 읽기만). Erosync가 켜져 있고 이름이 맞는 인물에게만 보인다.
// 고치기는 Erosync 자체 화면으로 보낸다(저장은 Erosync의 erosync_* 키 그대로).
import { h } from "../../dom.js";
import { btn } from "../../kit.js";
import { exportProfile, importProfile } from "./erosyncprofilefileui.js";
import { openProfileEditor, resetProfile, analysisLine } from "./erosynceditor.js";
import { eroReady, eroAxes, eroAdult, eroGoalsOf, eroPair, eroSummary } from "../../../engine/erosyncview.js";

// 켜져 있을 때만 읽는다. 실패하면 null(위키는 원래대로).
export async function eroLoad(ctx) {
  const er = ctx.erosync;
  if (!er?.isRunning?.()) return null;
  try { const s = await er.read(); return eroReady(s) ? s : null; } catch { return null; }
}

export const bar = (label, v, hint, ghost) => h("div", { class: "rb-wk2-num g" }, h("span", { class: "n", title: hint || "" }, label),
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

// 2.2.4 세부 항목: 선호·좋아하는/싫어하는 체위·유혹 방식·성적 농담·최근 행동(값이 있는 것만)
// 선호 한 칸: 새 모양 {label, preference, confidence, reason} · 옛 글자 · 글자로 저장된 JSON 모두 받는다
export function prefItem(x) {
  let o = x;
  if (typeof o === "string" && /^\s*\{/.test(o)) { try { o = JSON.parse(o); } catch { const m = /"label"\s*:\s*"([^"]+)"/.exec(o), p = /"preference"\s*:\s*"([^"]+)"/.exec(o), c = /"confidence"\s*:\s*(\d+)/.exec(o); o = m ? { label: m[1], preference: p?.[1] ?? "", confidence: c ? Number(c[1]) : null } : o; } }
  if (typeof o === "string") return o.trim() ? { label: o.trim(), preference: "", confidence: null, reason: "" } : null;
  const label = String(o?.label || o?.name || o?.text || "").trim();
  return label ? { label, preference: String(o.preference ?? ""), confidence: Number.isFinite(Number(o.confidence)) && o.confidence !== null ? Math.round(Number(o.confidence)) : null, reason: String(o.reason ?? "") } : null;
}
const LEVEL = (n) => !Number.isFinite(n) ? "" : n >= 70 ? "자주" : n >= 40 ? "가끔" : "드물게";
export function eroDetailRows(d) {
  d ??= {};
  const chips = (title, list, kind) => list?.length ? h("div", { class: ["rb-wk2-ero-row", kind && `k-${kind}`] }, h("small", { class: "rb-muted" }, title), h("div", { class: "rb-wk2-chips" }, list.map((x) => h("span", { class: "rb-wk2-chip" }, prefItem(x)?.label ?? "")))) : null;
  // addon-rebuild: 체위·장소는 비어 있어도 늘 보인다(처음부터 자리가 있게)
  const always = (title, list, kind) => chips(title, list, kind) ?? h("div", { class: ["rb-wk2-ero-row", `k-${kind}`] }, h("small", { class: "rb-muted" }, title), h("small", { class: "rb-muted" }, "아직 없어요 · ‘다시 분석’으로 채울 수 있어요"));
  const style = (title, o) => o && (o.styles?.length || o.situations?.length) ? h("div", { class: "rb-wk2-ero-row" }, h("small", { class: "rb-muted" }, `${title}${LEVEL(o.frequency) ? ` · ${LEVEL(o.frequency)}` : ""}${Number.isFinite(o.directness) ? ` · 직접성 ${o.directness}` : ""}`),
    o.styles?.length ? h("div", { class: "rb-wk2-chips" }, o.styles.map((x) => h("span", { class: "rb-wk2-chip" }, prefItem(x)?.label ?? ""))) : null, o.situations?.length ? h("small", { class: "rb-muted" }, `주로: ${o.situations.join(" · ")}`) : null) : null;
  // 2.2.6 선호는 좋아함·싫어함·그 밖으로 나누고 확신도를 붙인다(예전 저장분의 JSON 글자도 풀어서 보여 준다)
  const P = (d.prefs ?? []).map(prefItem).filter(Boolean);
  const pchip = (x) => h("span", { class: "rb-wk2-chip", title: x.reason || "" }, x.label, Number.isFinite(x.confidence) ? h("small", { class: "rb-muted" }, ` ${x.confidence}%`) : null);
  const pgroup = (title, list, kind) => list.length ? h("div", { class: ["rb-wk2-ero-row", kind && `k-${kind}`] }, h("small", { class: "rb-muted" }, title), h("div", { class: "rb-wk2-chips" }, list.map(pchip))) : null;
  const liked = P.filter((x) => /prefer|like|want|enjoy/i.test(x.preference)), hated = P.filter((x) => /dislik|avoid|hate|refus|taboo/i.test(x.preference));
  return [pgroup("좋아하는 것", liked, "like"), pgroup("싫어하는 것", hated, "hate"), pgroup("성향", P.filter((x) => !liked.includes(x) && !hated.includes(x)), "mid"),
    always("좋아하는 체위·장소", d.likes, "like"), always("싫어하는 체위·장소", d.dislikes, "hate"), style("유혹 방식", d.seduction), style("성적 농담", d.humor),
    d.lastAction ? h("div", { class: "rb-wk2-ero-row" }, h("small", { class: "rb-muted" }, "최근 행동"), h("p", { class: "rb-wk2-p" }, d.lastAction)) : null].filter(Boolean);
}
// addon-rebuild: 화면 글이 영어면(예전 분석 등) 한 번 한국어로 옮겨 달라고 하고 끝나면 다시 그린다. 인물마다 세션에 한 번만.
const koAsked = new Map();   // 인물 id → busy | done
const HAS_EN = (t) => /[A-Za-z]/.test(t) && !/[\uac00-\ud7a3]/.test(t);
export function detailHasEnglish(d) {
  if (!d) return false;
  const st = (o) => [...(o?.styles ?? []), ...(o?.situations ?? [])];
  return [...(d.prefs ?? []).map((x) => prefItem(x)?.label ?? ""), ...(d.likes ?? []), ...(d.dislikes ?? []), ...st(d.seduction), ...st(d.humor)].some((t) => HAS_EN(String(t ?? "")));
}
// 돌려주는 값: 지금 옮기는 중인지(화면에 안내 한 줄). 영어가 없으면 false.
function koLater(ctx, person, redraw) {
  if (!person?.id || !detailHasEnglish(person.detail) || typeof ctx.erosync?.profile !== "function") return false;
  if (koAsked.has(person.id)) return koAsked.get?.(person.id) === "busy";
  koAsked.set(person.id, "busy");
  ctx.erosync.profile("korean", person.id).then((r) => { koAsked.set(person.id, "done"); if (r?.ok && r.filled) redraw?.(); }).catch(() => koAsked.set(person.id, "done"));
  return true;
}
// NSFW 탭: 성적 항목(성적 관심·선호 등) + 직접 고치기·AI 값으로·다시 분석. Erosync가 켜져 있고 이름이 맞는 인물에게만.
// 2.2.6 상대별 끌림: 이 인물이 상대마다 느끼는 호감·끌림·반감(Erosync 관계 수치). 큰 것부터 5명.
function eroTowardRows(snap, person) {
  const rel = arr(snap?.relations).filter((r) => r.from === person.id).sort((a, b) => (b.eroticAttraction ?? 0) - (a.eroticAttraction ?? 0)).slice(0, 5);
  if (!rel.length) return null;
  return h("div", { class: "rb-wk2-ero-row", id: "rb-ero-toward" }, h("small", { class: "rb-muted" }, "상대별 끌림"),
    ...rel.map((r) => h("div", { class: "rb-wk2-toward" }, h("b", null, r.toName),
      h("span", { class: "track", role: "img", "aria-label": `끌림 ${r.eroticAttraction ?? 0}` }, h("i", { style: { width: `${Math.max(0, Math.min(100, r.eroticAttraction ?? 0))}%` } })),
      h("small", { class: "rb-muted" }, `끌림 ${r.eroticAttraction ?? 0} · 호감 ${r.affection ?? 0}${r.hatred > 0 ? ` · 반감 ${r.hatred}` : ""}`))));
}
const arr = (v) => (Array.isArray(v) ? v : []);
export function eroNsfwCard(ctx, card, person, redraw, snap = null) {
  const ad = eroAdult(person), ax = eroAxes(person);
  if (!ad && !ax.length) return null;
  const line = analysisLine(ctx, () => redraw?.());
  const act = h("div", { class: "rb-mem-sact rb-ero-acts" },
    btn("직접 고치기", { size: "sm", id: "rb-ero-edit", onClick: () => openProfileEditor(ctx, person, redraw) }),
    person.overridden ? btn("AI 값으로", { size: "sm", id: "rb-ero-reset", onClick: () => resetProfile(ctx, person, redraw) }) : null,
    btn("다시 분석", { size: "sm", id: "rb-ero-reanalyze", title: "이 인물만 AI로 다시 분석해요(호출 2번)", onClick: () => line.start("single", person.id) }),
    btn("축만 다시 채점", { size: "sm", id: "rb-ero-rescore", title: "8축 점수만 다시 매겨요(호출 1~2번)", onClick: () => line.start("axes", person.id) }),
    btn("프로필 내보내기", { size: "sm", id: "rb-ero-export", title: "직접 고친 값과 선호·금기 태그를 파일로 저장해요", onClick: () => exportProfile(ctx, person) }),
    btn("프로필 가져오기", { size: "sm", id: "rb-ero-import", title: "내보낸 파일로 이 인물의 직접 고친 값과 태그를 덮어써요", onClick: () => importProfile(ctx, person, redraw) }));
  // addon-rebuild: 8가지 성향은 위 게이지에 합친다(이름이 같으면 위 성적 항목 값을 우선)
  // 이름이 겹치면(개방성 ↔ 성적 개방성) 더 긴 이름 하나만 남긴다
  const top = ad?.rows ?? [], longer = (l) => [...top, ...ax].some((o) => o.label !== l && o.label.length > l.length && o.label.includes(l));
  const gauges = [...top.filter((r) => !longer(r.label)).map((r) => bar(r.label, r.value)), ...ax.filter((a) => !longer(a.label) && !top.some((r) => r.label === a.label)).map((a) => bar(a.label + (a.changed ? " ·바뀜" : ""), a.value, a.hint, a.changed ? a.base : null))];
  const rows = [h("div", { class: "rb-wk2-nums", id: "rb-ero-axes" }, ...gauges,
    ad?.pref ? h("div", { class: "rb-ero-pref", role: "img", "aria-label": `끌리는 상대 · 여성 ${ad.pref.f}% · 남성 ${ad.pref.m}% · 그 외 ${ad.pref.x}%` },
      h("small", { class: "rb-muted" }, "끌리는 상대"),
      h("div", { class: "bar" }, ...[["f", ad.pref.f], ["m", ad.pref.m], ["x", ad.pref.x]].filter(([, v]) => v > 0).map(([k, v]) => h("i", { class: k, style: { flexGrow: v } }))),
      h("div", { class: "lg" }, h("span", { class: "f" }, `여성 ${ad.pref.f}%`), h("span", { class: "m" }, `남성 ${ad.pref.m}%`), h("span", { class: "x" }, `그 외 ${ad.pref.x}%`))) : null)];
  rows.push(...eroDetailRows(person.detail));
  if (koLater(ctx, person, redraw)) rows.push(h("small", { class: "rb-muted", id: "rb-ero-ko" }, "영어로 적힌 항목을 한국어로 옮기는 중이에요. 끝나면 바로 바뀌어요."));
  const toward = eroTowardRows(snap, person); if (toward) rows.push(toward);
  return card("🔥 Erosync 성적 항목", [...rows, person.overridden ? h("small", { class: "rb-muted" }, "직접 고친 값이 있어요. AI가 다시 분석해도 고친 값이 우선이에요.") : null, act, line.el], null, "rb-wk2-ero");
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

// NSFW 탭 맨 위 한 줄 요약(지금 목표·관계·쉬는 턴). 보여 줄 게 없으면 null.
export function eroSummaryCard(ctx, card, snap, person) {
  const lines = eroSummary(snap, person.id);
  if (!lines.length) return null;
  // 2.2.6 한 줄마다 종류 표시(목표·노림·경쟁·관계·쉼), 관계 줄은 호감·끌림 막대
  const ICON = { goal: ["🎯", "목표"], aimed: ["👀", "노림받음"], rival: ["⚔️", "경쟁"], rel: ["💗", "가장 가까운 상대"], rest: ["⏸", "쉬는 중"] };
  const rel = arr(snap?.relations).filter((r) => r.from === person.id).sort((a, b) => (b.eroticAttraction + b.affection) - (a.eroticAttraction + a.affection))[0];
  const meter = (label, v, cls) => h("span", { class: ["rb-ero-m", cls] }, h("small", null, label), h("span", { class: "track" }, h("i", { style: { width: `${Math.max(0, Math.min(100, v ?? 0))}%` } })), h("b", null, String(v ?? 0)));
  return card("지금 상태", [h("ul", { class: "rb-ero-now", id: "rb-ero-summary" }, ...lines.map((l) => h("li", { "data-k": l.k },
    h("span", { class: "ic", "aria-hidden": "true" }, (ICON[l.k] ?? ["•"])[0]),
    h("div", { class: "t" }, h("small", null, (ICON[l.k] ?? [, ""])[1]),
      l.k === "rel" && rel ? [h("b", null, rel.toName), h("div", { class: "ms" }, meter("호감", rel.affection, "aff"), meter("끌림", rel.eroticAttraction, "att"), rel.hatred > 0 ? meter("증오", rel.hatred, "hat") : null)] : h("span", null, l.text)))))], tag(), "rb-wk2-ero");
}
