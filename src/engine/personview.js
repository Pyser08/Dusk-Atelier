// 인물 페이지용 순수 로직: 위키 문서 찾기 → '지금 상태' 카드, Dusk 기록·위키 변화·관계·약속을 한 타임라인으로 합치기.
export const TL_FILTERS = [["all", "전부"], ["event", "사건"], ["rel", "관계"], ["state", "상태"], ["open", "약속"]];

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "");
const METERS = [["affinity.score", "호감"], ["suspicion.score", "의심"], ["openness.score", "마음 열기"]];
const TEXTS = [["core.relationship", "관계·호칭"], ["core.current_state", "지금 상태"], ["core.speech", "말투"], ["core.profile", "프로필"]];

// 이름·별칭이 맞는 Character 문서
export function findDoc(wiki, person) {
  const docs = (wiki?.documents ?? []).filter((d) => d?.type === "Character");
  if (!docs.length || !person) return null;
  const names = new Set([person.name, ...(person.aliases ?? [])].map(norm).filter(Boolean));
  return docs.find((d) => names.has(norm(d.title))) ?? docs.find((d) => (d.aliases ?? []).some((a) => names.has(norm(a)))) ?? null;
}

export function stateOf(doc) {
  if (!doc) return null;
  const meters = METERS.map(([slot, label]) => {
    const m = (doc.metrics ?? []).find((x) => x.slotId === slot);
    return m ? { id: slot.split(".")[0], label, value: m.value, min: m.minimum, max: m.maximum, delta: m.lastDelta ?? 0, stage: m.stageLabel ?? "" } : null;
  }).filter(Boolean);
  const texts = TEXTS.map(([slot, label]) => {
    const s = (doc.sections ?? []).find((x) => x?.provenance?.slotId === slot);
    return s?.body?.trim() ? { id: slot, label, body: s.body.trim() } : null;
  }).filter(Boolean);
  return { title: doc.title, meters, texts, updatedAt: Date.parse(doc.updatedAt) || 0 };
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
