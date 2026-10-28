// 분석 결과를 폴더에 반영하는 순수 함수.
import { gradeResponse, findDuplicate, gradeRank } from "./memorygrade.js";
import { applyRel, applyOpen, reinforce } from "./memoryplus.js";
import { mergeWhen } from "./storydate.js";
import { isTombed } from "./memorydelete.js";

const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const rid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function findPersonKey(folder, name) {
  const k = key(name);
  if (folder.people[k]) return k;
  for (const [pk, p] of Object.entries(folder.people)) if ((p.aliases ?? []).some((a) => key(a) === k)) return pk;
  return null;
}
export const latestScene = (folder) => [...(folder.scenes ?? [])].reverse().find((s) => !s.orphan) ?? null;

// anchor: {at, mid, h}. 반환: {records, upgraded, scene:'new'|'updated'|null}
export function applyAnalysis(folder, result, anchor, { now = Date.now(), ignore = [], covered = null, storyDate = "" } = {}) {
  const ign = new Set(ignore.map(key));
  const out = { records: 0, upgraded: 0, scene: null, rel: 0, open: 0, closed: 0 };
  const prev = latestScene(folder);
  const sc = result?.scene;
  if (sc && (sc.changed || !prev)) {
    folder.scenes.push({ id: rid("s"), ...anchor, sum: sc.sum, facts: sc.facts ?? [], place: sc.place ?? "", when: mergeWhen(sc.when, storyDate), ...(storyDate ? { iso: storyDate } : {}), who: sc.who ?? [], at_ms: now, orphan: false });
    out.scene = "new";
  } else if (sc && prev) {
    if (sc.facts?.length) prev.facts = sc.facts;
    if (storyDate && prev.iso !== storyDate) { prev.iso = storyDate; prev.when = mergeWhen(prev.when, storyDate); }
    prev.updated_ms = now; out.scene = "updated";
  }
  const sit = latestScene(folder)?.id ?? null;
  for (const e of gradeResponse((result?.people ?? []).filter((p) => !ign.has(key(p.name))))) {
    let pk = findPersonKey(folder, e.name);
    if (!pk) { pk = key(e.name); folder.people[pk] = { name: e.name, aliases: [], pinned: false, records: [] }; }
    const person = folder.people[pk];
    if (isTombed(folder, pk, e.act)) continue;  // 사용자가 지운 기록은 다시 만들지 않음
    const dup = findDuplicate(person.records, e.act, e.g);
    if (dup) { reinforce(dup.dup, anchor); if (e.know?.length && !dup.dup.know) dup.dup.know = e.know; if (dup.upgrade && !dup.dup.user) { dup.dup.g = e.g; dup.dup.score = Math.max(dup.dup.score ?? 0, e.score); out.upgraded++; } continue; }
    person.records.push({ id: rid("r"), ...anchor, act: e.act, g: e.g, score: e.score, p: e.p, s: e.s, r: e.r, sit, user: false, pin: false, at_ms: now, orphan: false, ...(e.know?.length ? { know: e.know } : {}) });
    out.records++;
  }
  out.rel = applyRel(folder, result?.rel, anchor, now);
  { const o = applyOpen(folder, result?.open, anchor, now); out.open = o.added; out.closed = o.closed; }
  folder.runs = (folder.runs ?? 0) + 1;
  folder.cursor = { ...anchor };
  folder.done = [...new Set([...(folder.done ?? []), ...(covered ?? [anchor.h])])].slice(-1000);  // 분석을 마친 응답 해시(일괄 분석 건너뛰기용)
  return out;
}

// 분석 입력에 넣을 known: 인물명·별칭·마지막 행동 1줄.
export function knownPeople(folder, limit = 30) {
  return Object.values(folder.people).filter((p) => (p.records ?? []).some((r) => !r.orphan)).slice(0, limit)
    .map((p) => ({ name: p.name, aliases: p.aliases ?? [], last: [...p.records].reverse().find((r) => !r.orphan)?.act ?? "" }));
}
export { gradeRank };
