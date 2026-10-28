// 기록 삭제 연쇄 처리 (v1.6.5 4단계, 순수): 같은 응답에서 나온 관계 변화·떡밥 찾기, digest 재요약 표시, 삭제 목록(tomb).
const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
export const TOMB_MAX = 200;
export const tombKey = (pk, act) => `${pk}|${norm(act)}`;
export const isTombed = (folder, pk, act) => (folder.tomb ?? []).includes(tombKey(pk, act));

// 지운 기록과 같은 응답에서 나온 관계 변화·떡밥. 출처(src)가 있으면 해시로, 없으면(레거시) 응답 번호(at)로 묶는다.
const same = (x, rec) => (x.src?.h ? x.src.h === rec.h : x.at != null && x.at === rec.at);
export function relatedOf(folder, rec) {
  const rels = [], open = [];
  for (const [k, pair] of Object.entries(folder.rels ?? {})) (pair.items ?? []).forEach((x, i) => { if (same(x, rec)) rels.push({ key: k, idx: i, text: `${pair.from} → ${pair.to}: ${x.d}` }); });
  for (const o of folder.open ?? []) if (same(o, rec)) open.push({ id: o.id, text: o.text });
  return { rels, open };
}

// 기록 1개 삭제. alsoRelated면 같은 응답의 관계 변화·떡밥도 지운다. tomb면 같은 문장이 다시 추출되는 것을 막는다.
export function deleteRecord(folder, pk, recId, { alsoRelated = false, tomb = true } = {}) {
  const p = folder.people[pk]; const rec = p?.records.find((r) => r.id === recId); if (!rec) return null;
  const rel = alsoRelated ? relatedOf(folder, rec) : { rels: [], open: [] };
  p.records = p.records.filter((r) => r.id !== recId);
  if (p.digest && !p.digestUser) { p.digestStale = true; for (const r of p.records) r.digested = false; }  // 요약에 섞였을 수 있음 → 다시 요약
  if (tomb) folder.tomb = [...(folder.tomb ?? []), tombKey(pk, rec.act)].slice(-TOMB_MAX);
  for (const k of new Set(rel.rels.map((x) => x.key))) { const items = folder.rels[k].items; folder.rels[k].items = items.filter((_, i) => !rel.rels.some((x) => x.key === k && x.idx === i)); if (!folder.rels[k].items.length) delete folder.rels[k]; }
  if (rel.open.length) { const ids = new Set(rel.open.map((x) => x.id)); folder.open = (folder.open ?? []).filter((o) => !ids.has(o.id)); }
  return { removed: rec, rels: rel.rels.length, open: rel.open.length };
}
