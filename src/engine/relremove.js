// addon-rebuild 관계 지우기(수동): 두 사람 사이 관계를 장기기억·위키 양쪽에서 지운다. 사람 자체·다른 관계는 그대로. 애드온 전용(코어 공유 아님).
// 장기기억: 감정 게이지(emo A>B·B>A), 관계 종류(ties), 관계 변화(rels), 직접 지정한 애인(lovers), 둘만의 추억(bonds)·갈등(rifts). 위키: 두 문서에서 서로를 대상으로 한 절·수치.
import { normalizeWikiScope, updateWikiDocument } from "./pot/wiki-schema.js";
const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const setOf = (names) => new Set((Array.isArray(names) ? names : [names]).map(nk).filter(Boolean));
export function removePairMemory(folder, aNames, bNames) {
  const A = setOf(aNames), B = setOf(bNames), pair = (x, y) => (A.has(nk(x)) && B.has(nk(y))) || (B.has(nk(x)) && A.has(nk(y)));
  let n = 0;
  for (const key of ["emo", "rels"]) for (const [k, v] of Object.entries(folder?.[key] ?? {})) if (pair(v?.from, v?.to)) { delete folder[key][k]; n++; }
  for (const [k, v] of Object.entries(folder?.ties ?? {})) if (pair(v?.a, v?.b)) { delete folder.ties[k]; n++; }
  for (const [k, v] of Object.entries(folder?.lovers ?? {})) if (v && typeof v === "object" && pair(v.a, v.b)) { delete folder.lovers[k]; n++; }   // 직접 지정한 애인
  for (const key of ["bonds", "rifts"]) if (Array.isArray(folder?.[key])) { const keep = folder[key].filter((x) => !pair(x?.a, x?.b)); n += folder[key].length - keep.length; folder[key] = keep; }   // 둘만의 추억·갈등
  return n;
}
// 위키: a 문서에서 b를 대상으로 한 절·수치, b 문서에서 a를 대상으로 한 절·수치를 뺀다. 문서가 없으면 그쪽은 건너뛴다.
export function removePairWiki(scope, aDocId, bDocId, { now = new Date().toISOString() } = {}) {
  let next = scope, n = 0;
  for (const [self, other] of [[aDocId, bDocId], [bDocId, aDocId]]) {
    const doc = self && other ? normalizeWikiScope(next).documents[self] : null;
    if (!doc) continue;
    const hit = (refs) => (refs ?? []).includes(other);
    const sections = doc.sections.filter((s) => !hit(s.provenance?.targetRefs)), metrics = doc.metrics.filter((m) => !hit(m.targetRefs));
    const gone = doc.sections.length - sections.length + doc.metrics.length - metrics.length;
    if (!gone) continue;
    next = updateWikiDocument(next, self, { type: doc.type, title: doc.title, aliases: doc.aliases, tags: doc.tags, links: (doc.links ?? []).filter((l) => l !== other), sections, metrics }, { now });
    n += gone;
  }
  return { scope: next, removed: n };
}
// 이름·별칭: 별칭 하나를 대표 이름으로 올리고 옛 이름은 별칭으로 내린다.
export function promoteAlias(title, aliases, pick) {
  const t = String(title ?? "").trim(), p = String(pick ?? "").trim();
  const rest = [...new Set([t, ...(aliases ?? []).map((a) => String(a).trim())].filter((a) => a && nk(a) !== nk(p)))];
  return { title: p || t, aliases: rest };
}
