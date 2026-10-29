// 분석 결과를 폴더에 반영하는 순수 함수.
import { gradeResponse, findDuplicate, gradeRank } from "./memorygrade.js";
import { applyRel, applyOpen, reinforce } from "./memoryplus.js";
import { mergeWhen } from "./storydate.js";
import { isTombed } from "./memorydelete.js";
import { applyEmo, emoForPrompt, convertAffinity } from "./memoryemo.js";
import { applyPov, applyExp, takeSelf, isImportant, tensionKeys, noteTension, clearHints } from "./memoryinner.js";
import { trustFields, mergeTrust, resolveConflicts, attrsForPrompt } from "./memorytrust.js";

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
  const out = { records: 0, upgraded: 0, scene: null, rel: 0, open: 0, closed: 0, emo: 0, pov: 0, exp: 0, self: 0, conflicts: [], alerts: [] };
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
  const graded = gradeResponse((result?.people ?? []).filter((p) => !ign.has(key(p.name))));
  const important = isImportant(graded, out.scene === "new");  // 3단계(관점·내면)는 중요한 응답에서만 받는다
  for (const e of graded) {
    let pk = findPersonKey(folder, e.name);
    if (!pk) { pk = key(e.name); folder.people[pk] = { name: e.name, aliases: [], pinned: false, records: [] }; }
    const person = folder.people[pk];
    if (isTombed(folder, pk, e.act)) continue;  // 사용자가 지운 기록은 다시 만들지 않음
    const dup = findDuplicate(person.records, e.act, e.g);
    if (dup) { reinforce(dup.dup, anchor); mergeTrust(dup.dup, e); if (important && takeSelf(dup.dup, e.self, dup.dup.g)) { out.self++; clearHints(folder, person.name); } if (e.keys?.length) dup.dup.keys = [...new Set([...(dup.dup.keys ?? []), ...e.keys])].slice(0, 4); if (e.know?.length && !dup.dup.know) dup.dup.know = e.know; if (dup.upgrade && !dup.dup.user) { dup.dup.g = e.g; dup.dup.score = Math.max(dup.dup.score ?? 0, e.score); out.upgraded++; } continue; }
    const nr = { id: rid("r"), ...anchor, act: e.act, g: e.g, score: e.score, p: e.p, s: e.s, r: e.r, sit, user: false, pin: false, at_ms: now, orphan: false, ...(e.know?.length ? { know: e.know } : {}), ...(e.keys?.length ? { keys: e.keys } : {}), ...trustFields(e, anchor) };
    const cr = resolveConflicts(person.records, nr, { now });  // 같은 속성의 옛 기록과 비교(변화·조건부·모순·보류)
    out.conflicts.push(...cr.verdicts.map((v) => ({ ...v, person: person.name, id: nr.id })));
    if (cr.alerts.length) { out.alerts.push(...cr.alerts.map((a) => ({ ...a, person: person.name }))); folder.alerts = [...(folder.alerts ?? []), ...cr.alerts.map((a) => ({ ...a, person: person.name, at_ms: now }))].slice(-20); }
    if (important && takeSelf(nr, e.self, e.g)) { out.self++; clearHints(folder, person.name); }
    person.records.push(nr);
    out.records++;
  }
  out.rel = applyRel(folder, result?.rel, anchor, now);
  const tBefore = tensionKeys(folder);
  out.emo = applyEmo(folder, result?.emo, anchor, now);
  if (important) { out.pov = applyPov(latestScene(folder), result?.pov, now); out.exp = applyExp(folder, result?.exp, anchor, now); }
  { const o = applyOpen(folder, result?.open, anchor, now); out.open = o.added; out.closed = o.closed; }
  folder.runs = (folder.runs ?? 0) + 1;
  folder.cursor = { ...anchor };
  noteTension(folder, tBefore); clearHints(folder);  // 7-4: 감정 태그가 새로 어긋나면 자기 감정 기록을 유도
  if (!folder.emoConvOff && folder.wiki?.documents) convertAffinity(folder, Object.values(folder.wiki.documents).filter((d) => d?.type === "Character"), "{{user}}", now);  // 위키 호감도 → 애정 태그(처음 한 번씩)
  // 분석을 마친 응답 해시(일괄 분석 건너뛰기용). 개수 제한 대신 reconcile이 지금 채팅에 없는 해시를 걷어 내서 채팅 길이만큼만 남는다.
  const cov = covered ?? [anchor.h];
  folder.done = [...new Set([...(folder.done ?? []), ...cov])].slice(-DONE_MAX);
  if (folder.failedBackfill?.length) { const c = new Set(cov); folder.failedBackfill = folder.failedBackfill.filter((x) => !c.has(x)); }
  return out;
}
export const DONE_MAX = 50000;  // 안전 상한(보통은 채팅 길이를 넘지 않는다)
// 이미 분석된 것으로 볼 응답 해시: 완료 목록 + 지금 살아 있는 장면·기록의 앵커(예전 1,000개 제한으로 목록에서 밀려난 것을 되살린다).
export function doneHashes(folder) {
  const set = new Set(folder?.done ?? []);
  for (const s of folder?.scenes ?? []) if (s.h && !s.orphan) set.add(s.h);
  for (const p of Object.values(folder?.people ?? {})) for (const r of p.records ?? []) if (r.h && !r.orphan) set.add(r.h);
  return set;
}

// 분석 입력에 넣을 known: 인물명·별칭·마지막 행동 1줄.
export function knownPeople(folder, limit = 30) {
  return Object.values(folder.people).filter((p) => (p.records ?? []).some((r) => !r.orphan)).slice(0, limit)
    .map((p) => ({ name: p.name, aliases: p.aliases ?? [], last: [...p.records].reverse().find((r) => !r.orphan)?.act ?? "", ...(attrsForPrompt(p).length ? { attrs: attrsForPrompt(p) } : {}) }));
}
export const emoStateFor = emoForPrompt;
export { gradeRank };
