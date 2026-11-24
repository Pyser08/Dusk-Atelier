// 위키 점검(순수 함수): 중복 이름, 내용 없는 인물 문서, Dusk 기록과 이어지지 않은 문서, 끊어진 연결.
// 리스바드 BardWiki의 '건강도'(끊어진 링크·연결 없음)와 같은 생각 — 진단만 하고 자동으로 고치지는 않는다.
import { duplicateGroups } from "./peopledupe.js";
import { mergeEntries } from "./peoplemerge.js";
import { findDoc } from "./personview.js";
import { findMeWikiDoc } from "./medoc.js";
import { userAliasesFor } from "./useralias.js";
import { findPersonKey } from "./memoryapply.js";

const loose = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
// 어떤 Dusk 인물과도 이어지지 않은 인물 문서. 목록에 안 보이는 인물(사건 기록 없음)도 이어진 것으로 보고, ‘나’ 문서는 뺀다(신고 #3).
export function unlinkedDocs(folder) {
  const docs = folder?.wiki?.documents ?? {};
  const me = findMeWikiDoc(folder?.wiki, userAliasesFor(folder?.meDoc?.name ? [folder.meDoc.name] : [], folder));
  return mergeEntries(folder).filter((e) => !e.pk && e.docId && e.docId !== me?.id).map((e) => docs[e.docId]);
}
// 이어 주기(folder를 직접 고친다): 같은 이름(기호만 다름)의 인물이 문서 없이 있으면 별칭으로 잇고, 없으면 기록 없는 인물로 만든다.
// 이미 다른 문서를 가진 인물과 이름이 겹치면 합치기로 고를 일이라 건너뛴다. 반환: {linked:[제목], skipped:[제목]}
export function linkDocs(folder) {
  const linked = [], skipped = [];
  folder.people ??= {};
  for (const d of unlinkedDocs(folder)) {
    const title = String(d.title ?? "").trim(), lk = loose(title);
    if (!lk) { skipped.push(title); continue; }
    const pk = findPersonKey(folder, title) ?? Object.keys(folder.people).find((k) => [folder.people[k]?.name, ...(folder.people[k]?.aliases ?? [])].some((n) => loose(n) === lk));
    const p = pk ? folder.people[pk] : null;
    if (p) {
      if (findDoc(folder.wiki, p)) { skipped.push(title); continue; }
      p.aliases = [...(p.aliases ?? []), title];
    } else {
      const nk = title.toLowerCase().replace(/\s+/g, "");
      folder.people[nk] = { name: title, aliases: [], pinned: false, records: [] };
    }
    linked.push(title);
  }
  return { linked, skipped };
}

export function diagnoseWiki(folder, { visible } = {}) {
  const docs = Object.values(folder?.wiki?.documents ?? {}).filter(Boolean);
  const ids = new Set(docs.map((d) => d.id)), titles = new Set(docs.flatMap((d) => [d.title, ...(d.aliases ?? [])]).map((t) => String(t).trim().toLowerCase()));
  const chars = docs.filter((d) => d.type === "Character");
  const duplicates = duplicateGroups(folder, visible ? { visible } : {}).map((g) => ({ name: g[0].name, count: g.length }));
  const empty = chars.filter((d) => !(d.sections ?? []).length && !(d.metrics ?? []).length).map((d) => d.title);
  const unlinked = unlinkedDocs(folder).map((d) => d.title);
  const broken = [];
  for (const d of docs) for (const l of d.links ?? []) if (!ids.has(l) && !titles.has(String(l).trim().toLowerCase())) broken.push(`${d.title} → ${l}`);
  // 2.2.2: 인물 이름과 다른 제목(별칭)으로 이어진 문서 — 합치기 뒤 위키와 관계도가 서로 다른 이름을 보이던 원인
  const kk = (t) => String(t ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const misnamed = Object.values(folder?.people ?? {}).filter((p) => p && (!visible || visible(p))).map((p) => ({ p, d: findDoc(folder.wiki, p) })).filter(({ p, d }) => d && kk(d.title) !== kk(p.name)).map(({ p, d }) => ({ person: p.name, doc: d.title }));
  return { documents: docs.length, characters: chars.length, duplicates, empty, unlinked, broken, misnamed, ok: !duplicates.length && !empty.length && !broken.length && !misnamed.length };
}
