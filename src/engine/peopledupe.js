// 이름이 같은 인물을 한 번에 합치는 순수 로직. 같은 이름 = 제목이 같거나(띄어쓰기·기호 무시), 한쪽 제목이 다른 쪽의 별칭일 때.
// 별칭끼리만 겹치는 건 합치지 않는다(별명이 같은 다른 사람일 수 있음 — 리스바드 BardWiki와 같은 원칙).
import { mergeEntries, planEntryMerge, applyEntryMerge } from "./peoplemerge.js";

const key = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");

// 항목 목록 → 중복 묶음 [[entry, entry, ...], ...]. 각 묶음의 첫 항목이 '남길 인물'이다.
export function duplicateGroups(folder, { visible } = {}) {
  const items = mergeEntries(folder, visible ? { visible } : {});
  const docOf = (e) => (e.docId ? folder.wiki?.documents?.[e.docId] : null);
  const nick = (e) => new Set((docOf(e)?.aliases ?? []).map(key));
  const parent = items.map((_, i) => i), find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j], ka = key(a.name), kb = key(b.name);
    if (!ka || !kb) continue;
    if (ka === kb || nick(a).has(kb) || nick(b).has(ka)) parent[find(j)] = find(i);
  }
  const groups = new Map();
  items.forEach((e, i) => { const r = find(i); groups.set(r, [...(groups.get(r) ?? []), e]); });
  const size = (e) => (docOf(e)?.sections?.length ?? 0) + (e.pk ? 1 : 0);
  return [...groups.values()].filter((g) => g.length > 1).map((g) => [...g].sort((a, b) => (b.docId ? 1 : 0) - (a.docId ? 1 : 0) || size(b) - size(a)));
}

// folder를 직접 고친다(updateFolder 안에서 부른다). 겹치는 항목은 남길 쪽 값을 쓴다.
// 막힌 합치기(blockers)는 건너뛴다. 반환: {merged, skipped:[이름…]}
export function mergeAllDuplicates(folder, { slotDefinitions = [], visible } = {}) {
  let merged = 0; const skipped = [];
  for (const group of duplicateGroups(folder, { visible })) {
    let keepName = group[0].name;
    for (const src of group.slice(1)) {
      // 앞선 합치기로 항목이 바뀌었을 수 있어 매번 새로 읽는다.
      const cur = mergeEntries(folder, visible ? { visible } : {}), keep = cur.find((e) => e.docId === group[0].docId && e.pk === group[0].pk) ?? cur.find((e) => e.name === keepName), s = cur.find((e) => e.id === src.id) ?? cur.find((e) => e.docId && e.docId === src.docId);
      if (!keep || !s || keep.id === s.id) continue;
      try {
        const plan = planEntryMerge(folder, keep, s, { slotDefinitions });
        if (plan?.blockers?.length) { skipped.push(src.name); continue; }
        const choices = {}; if (plan) for (const c of plan.conflicts ?? []) choices[c.id] = c.options[0];
        applyEntryMerge(folder, keep, s, plan, choices); merged++;
      } catch { skipped.push(src.name); }
    }
  }
  return { merged, skipped };
}
