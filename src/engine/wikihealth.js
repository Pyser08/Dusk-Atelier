// 위키 점검(순수 함수): 중복 이름, 내용 없는 인물 문서, Dusk 기록과 이어지지 않은 문서, 끊어진 연결.
// 리스바드 BardWiki의 '건강도'(끊어진 링크·연결 없음)와 같은 생각 — 진단만 하고 자동으로 고치지는 않는다.
import { duplicateGroups } from "./peopledupe.js";
import { mergeEntries } from "./peoplemerge.js";

export function diagnoseWiki(folder, { visible } = {}) {
  const docs = Object.values(folder?.wiki?.documents ?? {}).filter(Boolean);
  const ids = new Set(docs.map((d) => d.id)), titles = new Set(docs.flatMap((d) => [d.title, ...(d.aliases ?? [])]).map((t) => String(t).trim().toLowerCase()));
  const chars = docs.filter((d) => d.type === "Character");
  const duplicates = duplicateGroups(folder, visible ? { visible } : {}).map((g) => ({ name: g[0].name, count: g.length }));
  const empty = chars.filter((d) => !(d.sections ?? []).length && !(d.metrics ?? []).length).map((d) => d.title);
  const unlinked = mergeEntries(folder, visible ? { visible } : {}).filter((e) => !e.pk && e.docId).map((e) => e.name);
  const broken = [];
  for (const d of docs) for (const l of d.links ?? []) if (!ids.has(l) && !titles.has(String(l).trim().toLowerCase())) broken.push(`${d.title} → ${l}`);
  return { documents: docs.length, characters: chars.length, duplicates, empty, unlinked, broken, ok: !duplicates.length && !empty.length && !broken.length };
}
