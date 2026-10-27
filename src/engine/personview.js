// 인물 페이지용 순수 로직: 위키 문서 찾기 → '지금 상태' 카드, Dusk 기록·위키 변화·관계·약속을 한 타임라인으로 합치기.
export const TL_FILTERS = [["all", "전부"], ["event", "사건"], ["rel", "관계"], ["state", "상태"], ["open", "약속"]];

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "");
const METERS = [["affinity.score", "호감"], ["suspicion.score", "의심"], ["openness.score", "마음 열기"]];
const TEXTS = [["core.relationship", "관계·호칭"], ["core.current_state", "지금 상태"], ["core.speech", "말투"], ["core.profile", "프로필"]];

import { parseCycleBody, CYCLE_SLOT, CYCLE_HEADING } from "./pot/cycle-tracking.js";

// 이름·별칭이 맞는 Character 문서
export function findDoc(wiki, person) {
  // 실제 위키 범위는 documents가 {id: 문서} 객체다(배열로 만든 시험 자료도 같이 받는다)
  const docs = Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  if (!docs.length || !person) return null;
  const names = new Set([person.name, ...(person.aliases ?? [])].map(norm).filter(Boolean));
  return docs.find((d) => names.has(norm(d.title))) ?? docs.find((d) => (d.aliases ?? []).some((a) => names.has(norm(a)))) ?? null;
}

export function stateOf(doc) {
  if (!doc) return null;
  const meters = METERS.map(([slot, label]) => {
    const m = (doc.metrics ?? []).find((x) => x.slotId === slot);
    return m ? { id: slot.split(".")[0], metricId: m.id, label, value: m.value, min: m.minimum, max: m.maximum, delta: m.lastDelta ?? 0, stage: m.stageLabel ?? "" } : null;
  }).filter(Boolean);
  const texts = TEXTS.map(([slot, label]) => {
    const s = (doc.sections ?? []).find((x) => x?.provenance?.slotId === slot);
    return s?.body?.trim() ? { id: slot, sectionId: s.id, label, body: s.body.trim() } : null;
  }).filter(Boolean);
  return { docId: doc.id, title: doc.title, meters, texts, updatedAt: Date.parse(doc.updatedAt) || 0 };
}

// 타임라인 한 줄: {id, kind, ms, at, text, g?, rec?}
export function timelineOf(folder, person, doc) {
  const out = [];
  for (const r of person?.records ?? []) if (!r.orphan) out.push({ id: r.id, kind: "event", ms: r.at_ms ?? 0, at: r.at ?? null, text: r.act, g: r.g, rec: r });
  const names = new Set([person?.name, ...(person?.aliases ?? [])].map(norm));
  for (const p of Object.values(folder?.rels ?? {})) {
    if (!names.has(norm(p.from)) && !names.has(norm(p.to))) continue;
    for (const [i, x] of (p.items ?? []).entries()) out.push({ id: `rel:${p.from}:${p.to}:${i}`, kind: "rel", ms: x.at_ms ?? 0, at: x.at ?? null, text: `${p.from} → ${p.to}  ${x.d}${x.dir === "+" ? " ↑" : x.dir === "-" ? " ↓" : ""}` });
  }
  for (const o of folder?.open ?? []) {
    if (o.closed || !(o.who ?? []).some((w) => names.has(norm(w)))) continue;
    out.push({ id: o.id, kind: "open", ms: o.at_ms ?? 0, at: o.at ?? null, text: o.text, openKind: o.kind });
  }
  if (doc) for (const e of folder?.wiki?.history ?? []) {
    if (e.documentId !== doc.id) continue;
    out.push({ id: `wiki:${e.id}`, kind: "state", ms: Date.parse(e.at) || 0, at: null, text: e.summary || { create: "인물 문서를 만들었어요", update: "인물 상태가 바뀌었어요", delete: "인물 문서를 지웠어요", restore: "이전 상태로 되돌렸어요" }[e.action] || "상태 변화" });
  }
  return out.sort((a, b) => a.ms - b.ms || (a.at ?? -1) - (b.at ?? -1));
}

export const countsOf = (items) => items.reduce((c, x) => { c.all++; c[x.kind] = (c[x.kind] ?? 0) + 1; return c; }, { all: 0 });
export const filterTimeline = (items, f) => f === "all" || !f ? items : items.filter((x) => x.kind === f);

// 월경·임신 줄(프로그램이 관리하는 구획): 성인 여성 인물에게만 있고, 구획이 없으면 null.
const dayNo = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? "")); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN; };
export function cycleOf(doc) {
  const sec = (doc?.sections ?? []).find((x) => x?.provenance?.slotId === CYCLE_SLOT || x?.heading === CYCLE_HEADING);
  const st = sec ? parseCycleBody(sec.body) : null;
  if (!st) return null;
  const lines = [];
  if (st.conception) {
    const days = st.date ? Math.floor(dayNo(st.date) - dayNo(st.conception)) : NaN;
    lines.push(`임신 중${Number.isFinite(days) && days >= 0 ? ` · 약 ${Math.floor(days / 7) + 1}주차` : ""} · 본인은 ${st.known ? "알고 있어요" : "아직 몰라요"}`);
  } else if (st.start && st.date) {
    const diff = dayNo(st.date) - dayNo(st.start);
    if (Number.isFinite(diff) && diff >= 0) lines.push(`주기 ${(diff % st.length) + 1}일째 (주기 ${st.length}일)`);
    else lines.push(`다음 주기는 ${st.start}부터 (주기 ${st.length}일)`);
  } else lines.push(`주기 ${st.length}일 · 이야기 날짜를 기다리는 중`);
  if (st.birth) lines.push(`최근 출산 ${st.birth}`);
  return { lines, date: st.date, pregnant: !!st.conception, known: st.known };
}

// 위키의 인물 글 한 줄(관계·현재 상태 등)을 이름으로 찾는다. 장부·상황 탭이 Dusk 기록 옆에 같이 보여 준다.
export function wikiNote(wiki, name, slot = "core.relationship", max = 160) {
  const doc = findDoc(wiki, { name });
  const body = (doc?.sections ?? []).find((x) => x?.provenance?.slotId === slot)?.body?.trim() ?? "";
  return body.length > max ? body.slice(0, max) + "…" : body;
}
