// 분석 결과를 폴더에 반영하는 순수 함수.
import { isCollectiveName } from "./collective.js";
import { alignDocTitles } from "./peoplemerge.js";
import { gradeResponse, findDuplicate, gradeRank } from "./memorygrade.js";
import { applyRel, applyOpen, reinforce, applyTies } from "./memoryplus.js";
import { mergeWhen } from "./storydate.js";
import { isTombed } from "./memorydelete.js";
import { applyEmo, emoForPrompt, convertAffinity } from "./memoryemo.js";
import { isLover, strayRisk } from "./lover.js";
import { attractionCap } from "./memoryhuman.js";
import { seedFromStart, seedFromTies, sourAttraction } from "./emoseed.js";
import { applyRomance, orientCap } from "./romance.js";
import { loverPairs, pairKey } from "./lover.js";
import { applyPov, applyExp, takeSelf, isImportant, tensionKeys, noteTension, clearHints } from "./memoryinner.js";
import { trustFields, mergeTrust, resolveConflicts, attrsForPrompt, currentState } from "./memorytrust.js";
import { coolEmo, applyHuman, stageCeiling } from "./memoryhuman.js";
import { normalizeUserNames } from "./memoryuser.js";
import { canonNameKo as canonName } from "./namekr.js";   // addon-rebuild: 한국 이름 성 한 글자(하연=지하연)까지 맞춤

// 2.2.4 이름 맞추기: 분석 결과의 이름(인물·감정·관계·관계 기록·장면 참가자)을 이 채팅의 모든 인물(30명 제한 없이)에 맞춘다.
//   성만·이름만·호칭 붙여 부른 이름이 새 사람으로 따로 쌓이던 것(일본 캐릭터: 텐도 / 아리스 / 텐도 아리스). 바뀐 이름은 별칭으로 남긴다.
function normalizeKnownNames(result, folder) {
  const all = Object.values(folder?.people ?? {}).filter((p) => p?.name && p.name !== "{{user}}").map((p) => ({ name: p.name, aliases: p.aliases ?? [] }));
  const moved = new Map();
  if (!all.length || !result || typeof result !== "object") return { result, moved };
  const memo = new Map();
  const fix = (n) => {
    if (typeof n !== "string" || !n.trim() || n === "{{user}}") return n;
    if (memo.has(n)) return memo.get(n);
    let out = n;
    if (!all.some((p) => key(p.name) === key(n) || (p.aliases ?? []).some((a) => key(a) === key(n)))) {
      const c = canonName(n, all);
      if (c && c !== "{{user}}" && all.some((p) => key(p.name) === key(c))) { out = c; moved.set(n, c); }
    }
    memo.set(n, out); return out;
  };
  const arr = (a) => (Array.isArray(a) ? [...new Set(a.map(fix))] : a);
  const pair = (list, f1, f2) => (Array.isArray(list) ? list.map((x) => ({ ...x, [f1]: fix(x?.[f1]), [f2]: fix(x?.[f2]) })) : list);
  const r = { ...result };
  if (Array.isArray(r.people)) r.people = r.people.map((p) => ({ ...p, name: fix(p?.name), ...(p?.know ? { know: arr(p.know) } : {}) }));
  if (Array.isArray(r.rel)) r.rel = pair(r.rel, "from", "to");
  if (Array.isArray(r.emo)) r.emo = pair(r.emo, "from", "to");
  if (Array.isArray(r.ties)) r.ties = pair(r.ties, "a", "b").filter((t) => key(t.a) !== key(t.b));
  if (r.scene?.who) r.scene = { ...r.scene, who: arr(r.scene.who) };
  return { result: r, moved };
}

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
export function applyAnalysis(folder, result, anchor, { now = Date.now(), ignore = [], covered = null, storyDate = "", cool = true, userNames = [], smooth = false, gauge = null, userGuard = false, keepAhead = false } = {}) {
  result = normalizeUserNames(result, userNames);   // 플레이어를 가리키는 이름은 모두 {{user}} 한 사람으로
  const named = normalizeKnownNames(result, folder); result = named.result;
  for (const [from, to] of named.moved) {   // 부른 이름을 별칭으로 남겨 다음부터 바로 찾고, 위키·Erosync·관계도도 같은 사람으로 본다
    const pk = findPersonKey(folder, to), p = pk && folder.people[pk];
    if (p && key(from) !== key(p.name) && !(p.aliases ?? []).some((a) => key(a) === key(from))) p.aliases = [...(p.aliases ?? []), String(from).slice(0, 60)].slice(-12);
  }
  const ign = new Set(ignore.map(key));
  const out = { records: 0, upgraded: 0, scene: null, rel: 0, open: 0, closed: 0, emo: 0, pov: 0, exp: 0, self: 0, human: 0, cooled: 0, conflicts: [], alerts: [] };
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
  const graded = gradeResponse((result?.people ?? []).filter((p) => !ign.has(key(p.name)) && !isCollectiveName(p.name)));   // 반·학년·동급생 같은 집단 이름은 인물로 만들지 않는다
  const important = isImportant(graded, out.scene === "new");  // 3단계(관점·내면)는 중요한 응답에서만 받는다
  for (const e of graded) {
    let pk = findPersonKey(folder, e.name);
    if (!pk) { pk = key(e.name); folder.people[pk] = { name: e.name, aliases: [], pinned: false, records: [] }; }
    const person = folder.people[pk];
    if (isTombed(folder, pk, e.act)) continue;  // 사용자가 지운 기록은 다시 만들지 않음
    const dup = findDuplicate(person.records, e.act, e.g);
    if (dup) { reinforce(dup.dup, anchor); mergeTrust(dup.dup, e); if (important && takeSelf(dup.dup, e.self, dup.dup.g)) { out.self++; clearHints(folder, person.name); } if (e.keys?.length) dup.dup.keys = [...new Set([...(dup.dup.keys ?? []), ...e.keys])].slice(0, 4); if (e.know?.length && !dup.dup.know) dup.dup.know = e.know; if (dup.upgrade && !dup.dup.user) { dup.dup.g = e.g; dup.dup.score = Math.max(dup.dup.score ?? 0, e.score); out.upgraded++; } continue; }
    const nr = { id: rid("r"), ...anchor, act: e.act, g: e.g, score: e.score, p: e.p, s: e.s, r: e.r, sit, user: false, pin: false, at_ms: now, orphan: false, ...(e.when ? { when: e.when } : {}), ...(e.know?.length ? { know: e.know } : {}), ...(e.keys?.length ? { keys: e.keys } : {}), ...trustFields(e, anchor) };
    const cr = resolveConflicts(person.records, nr, { now });  // 같은 속성의 옛 기록과 비교(변화·조건부·모순·보류)
    out.conflicts.push(...cr.verdicts.map((v) => ({ ...v, person: person.name, id: nr.id })));
    if (cr.alerts.length) { out.alerts.push(...cr.alerts.map((a) => ({ ...a, person: person.name }))); folder.alerts = [...(folder.alerts ?? []), ...cr.alerts.map((a) => ({ ...a, person: person.name, at_ms: now }))].slice(-20); }
    if (important && takeSelf(nr, e.self, e.g)) { out.self++; clearHints(folder, person.name); }
    person.records.push(nr);
    out.records++;
  }
  out.rel = applyRel(folder, result?.rel, anchor, now);
  const loversBefore = new Set(loverPairs(folder).map((p) => pairKey(p.a, p.b)));   // 2.2.6 사귀기 시작·헤어짐을 알려고
  out.ties = applyTies(folder, result?.ties, anchor, now);   // 2.2.4 오래가는 관계
  out.tieSeed = seedFromTies(folder, anchor, now);   // 2.2.6 관계가 밝혀졌는데 감정이 비어 있으면 관계에 맞는 처음 값으로
  const tBefore = tensionKeys(folder);
  if (cool && anchor?.at != null) out.cooled = coolEmo(folder, anchor.at, now);   // v1.8.3: 시간이 지나 식은 감정을 먼저 반영(변화량이 식은 값에 더해지게)
  out.emo = applyEmo(folder, result?.emo, anchor, now, { smooth, ceilingOf: smooth || userGuard ? (a, b) => stageCeiling(folder, a, b, anchor?.at ?? 0) : null, userGuard, isLover: (a, b) => isLover(folder, a, b), gauge, attrCap: (a, b, o) => { const sr = strayRisk(folder, a); o = { ...o, orient: orientCap(folder, a, b) }; return attractionCap(folder, a, b, anchor?.at ?? 0, sr && sr.partner && String(sr.partner).toLowerCase().replace(/\s+/g, "") !== String(b).toLowerCase().replace(/\s+/g, "") ? { ...o, big: true } : o); } });   // 2.2.6 바람 가능성이면 다른 사람에게 끌림이 한 단계 쉽게
  out.sour = sourAttraction(folder, anchor, now, { gauge });   // 2.2.6 호감이 바닥이면 끌림이 천천히 식음
  out.romance = applyRomance(folder, result?.emo, loversBefore, anchor, now, { gauge }).events;   // 2.2.6 고백·사귐·이별·재회·질투·연적·연표   // 2.2.6 소유욕·독점욕은 애인만, 게이지 배수   // 2.2.4 게이지 조화(단계별 분석 켠 기본 경로)
  if (important) { out.pov = applyPov(latestScene(folder), result?.pov, now); out.exp = applyExp(folder, result?.exp, anchor, now); }
  { const o = applyOpen(folder, result?.open, anchor, now); out.open = o.added; out.closed = o.closed; }
  out.human = applyHuman(folder, result?.human, anchor, { important, now });   // v1.8.3: 호칭·말투, 둘만의 추억(중요할 때만), 잘못된 믿음
  out.startSeed = seedFromStart(folder, anchor, now);   // addon-rebuild: 이미 아는 사이면 인간적 호감·신뢰를 바닥값까지(처음 만남처럼 2에서 시작하지 않게)
  folder.runs = (folder.runs ?? 0) + 1;
  if (!(keepAhead && folder.cursor && Number(folder.cursor.at) > Number(anchor?.at))) folder.cursor = { ...anchor };   // keepAhead: 지난 대화 동시 처리에서 늦게 끝난 앞 묶음이 커서를 되돌리지 않게(2.2.11)
  noteTension(folder, tBefore); clearHints(folder);  // 7-4: 감정 태그가 새로 어긋나면 자기 감정 기록을 유도
  if (folder.wiki?.documents) { try { out.renamed = alignDocTitles(folder); } catch { /* 이름 맞추기 실패는 기록에 영향 없음 */ } }   // 2.2.2 이름 통일(장기 기억 기준)
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
// 2.2.4: 예전엔 처음 생긴 30명만 보냈다 → 긴 채팅에서 최근 인물이 빠져 같은 사람이 새로 생겼다. 지금 글에 나온 사람 → 최근 기록 순으로 고른다
export function knownPeople(folder, limit = 30, text = "") {
  const t = String(text ?? "").toLowerCase().replace(/\s+/g, ""), lastAt = (p) => Math.max(-1, ...(p.records ?? []).filter((r) => !r.orphan).map((r) => r.at ?? -1));
  const named = (p) => !!t && [p.name, ...(p.aliases ?? []), ...String(p.name ?? "").split(/\s+/).filter((x) => x.length >= 2)].some((n) => n && t.includes(String(n).toLowerCase().replace(/\s+/g, "")));
  return Object.values(folder.people).filter((p) => (p.records ?? []).some((r) => !r.orphan))
    .map((p) => ({ p, s: (named(p) ? 1e9 : 0) + lastAt(p) })).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p)
    .map((p) => { const st = currentState(p); return { name: p.name, aliases: p.aliases ?? [], last: [...p.records].reverse().find((r) => !r.orphan)?.act ?? "", ...(st ? { state: st.v } : {}), ...(attrsForPrompt(p).length ? { attrs: attrsForPrompt(p) } : {}) }; });
}
export const emoStateFor = emoForPrompt;
export { gradeRank };
