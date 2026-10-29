// 인물 위키에서 '무엇이 비어 있는지'를 계산한다(순수). "비어 있는 인물 채우기"가 수치 유무만 보고 대상을 잡아서
// 본문·성격이 다 있는 인물까지 다시 쓰던 문제를 막으려고, 항목별로 따로 셈한다.
const hasText = (v) => typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) ? v.some(hasText) : false;
export const PROFILE_TEXT_FIELDS = ["summary", "coreTraits", "values", "emotionExpression", "defenseResponse", "intimacyStyle"];
// 일괄로 채우는 수치 칸(의심도는 두 인물을 짝지어야 해서 인물 페이지에서 따로 지정한다)
export const FILL_METRIC_SLOTS = ["affinity.score", "affinity.taste_band", "openness.score"];

// {body: 본문 절이 하나도 없음, profile: 기본 성격이 비어 있음, metrics: 비어 있는 수치 칸 목록}
export function gapsOf(scope, doc) {
  if (!doc) return { body: false, profile: false, metrics: [] };
  const profile = scope?.people?.profiles?.[doc.id];
  return {
    body: !(doc.sections ?? []).some((s) => hasText(s?.body)),
    profile: !profile || !PROFILE_TEXT_FIELDS.some((f) => hasText(profile[f])),
    metrics: FILL_METRIC_SLOTS.filter((slot) => !(doc.metrics ?? []).some((m) => m.slotId === slot))
  };
}
export const isFullyEmpty = (g) => g.body && g.profile;
export const hasGap = (g) => g.body || g.profile || g.metrics.length > 0;

// 인물 목록 → 채우기 계획. docs: 인물 문서 배열.
//  metricOnly: 수치만 비어 있는 인물(본문·성격은 있음) — 수치 칸만 채운다(기존 글은 건드리지 않음)
//  full: 본문·성격까지 비어 있는 인물 — 전체를 채운다
export function fillPlan(scope, docs) {
  const metricOnly = [], full = [];
  for (const doc of docs ?? []) {
    const gaps = gapsOf(scope, doc);
    if (isFullyEmpty(gaps)) full.push({ doc, gaps });
    else if (gaps.metrics.length) metricOnly.push({ doc, gaps });
  }
  return { metricOnly, full, total: metricOnly.length + full.length };
}
export const GAP_LABEL = { "affinity.score": "호감도", "affinity.taste_band": "첫인상", "openness.score": "음란도" };
// 미리보기 한 줄: "유우카 — 수치 3칸(호감도·첫인상·음란도)만 채움" / "노아 — 본문·성격·수치 전체를 새로 채움"
export function planLine({ doc, gaps }) {
  if (isFullyEmpty(gaps)) return `${doc.title} — 본문·성격이 비어 있어 전체를 새로 채움`;
  return `${doc.title} — 수치 ${gaps.metrics.length}칸(${gaps.metrics.map((s) => GAP_LABEL[s] ?? s).join("·")})만 채움, 본문·성격은 그대로`;
}
