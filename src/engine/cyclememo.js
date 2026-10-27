// 월경·임신 → Dusk 기록 연결(v1.6.4, 순수): 위키의 월경·임신 구획이 바뀐 것 중 등급이 높은 사건(출산·임신을 알게 됨)만 Dusk 기록으로 남긴다.
// 수정(임신 판정) 자체는 본인이 모르는 사실이라 기록하지 않는다. 판정은 프로그램 값만 쓰고, 모델은 개입하지 않는다.
import { CYCLE_HEADING, CYCLE_SLOT, parseCycleBody } from "./pot/cycle-tracking.js";
import { latestScene, findPersonKey } from "./memoryapply.js";

const isCycle = (sec) => sec?.provenance?.slotId === CYCLE_SLOT || sec?.heading === CYCLE_HEADING;

// 위키 범위에서 인물별 월경·임신 상태 { 문서id: {name, state} }
export function cycleStates(scope) {
  const out = {};
  for (const d of Object.values(scope?.documents ?? {})) {
    if (d?.type !== "Character") continue;
    const sec = (d.sections ?? []).find(isCycle), state = sec ? parseCycleBody(sec.body) : null;
    if (state) out[d.id] = { name: d.title, state };
  }
  return out;
}

// 이전·이후 범위를 비교해 사건 목록을 만든다: [{id, name, kind:"birth"|"known", date, act, g}]
export const cycleMilestones = (before, after) => milestonesBetween(cycleStates(before), cycleStates(after));
// 이미 뽑아 둔 상태 지도끼리 비교(응답 전·후에 위키 범위를 통째로 들고 있지 않아도 되게)
export function milestonesBetween(prev, next) {
  const out = [];
  for (const [id, { name, state }] of Object.entries(next ?? {})) {
    const old = prev?.[id]?.state;
    if (state.birth && state.birth !== (old?.birth ?? "")) out.push({ id, name, kind: "birth", date: state.birth, act: "아이를 낳았다", g: "EX" });
    else if (state.known && state.conception && !(old?.known && old?.conception === state.conception)) out.push({ id, name, kind: "known", date: state.date, act: "임신한 사실을 알게 됐다", g: "S" });
  }
  return out;
}

// Dusk 폴더에 사건을 기록으로 추가. 같은 사건(같은 인물·같은 act·같은 날짜)은 한 번만. 반환: 추가한 개수
export function addMilestones(folder, events, { now = Date.now() } = {}) {
  const sc = latestScene(folder); if (!sc || !events?.length) return 0;
  const rid = () => "r_" + now.toString(36) + Math.random().toString(36).slice(2, 7);
  let n = 0;
  for (const e of events) {
    let pk = findPersonKey(folder, e.name);
    if (!pk) { pk = String(e.name).toLowerCase().replace(/\s+/g, ""); folder.people[pk] = { name: e.name, aliases: [], pinned: false, records: [] }; }
    const person = folder.people[pk], act = e.date ? `${e.act} (${e.date})` : e.act;
    if (person.records.some((r) => r.cycle === `${e.kind}:${e.date}` && !r.orphan)) continue;
    person.records.push({ id: rid(), at: sc.at, mid: sc.mid, h: sc.h, act, g: e.g, score: e.g === "EX" ? 9 : 8, p: 3, s: 3, r: e.g === "EX" ? 3 : 2, sit: sc.id, user: false, pin: false, at_ms: now, orphan: false, cycle: `${e.kind}:${e.date}` });
    n++;
  }
  return n;
}
