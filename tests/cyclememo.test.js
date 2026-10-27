import test from "node:test";
import assert from "node:assert/strict";
import { storyDateOf, latestStoryIso, mergeWhen } from "../src/engine/storydate.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { timelineOf } from "../src/engine/memoryplus.js";
import { cycleStates, cycleMilestones, addMilestones } from "../src/engine/cyclememo.js";
import { formatCycleBody, parseCycleBody, nextCycleState, CYCLE_HEADING, CYCLE_SLOT } from "../src/engine/pot/cycle-tracking.js";

const emptyFolder = () => ({ people: {}, scenes: [], rel: [], open: [] });
const analysis = (when = "") => ({ people: [], scene: { sum: "블루 아카이브 시노가 선생과 상담했다", facts: [], place: "", when, who: [], changed: true } });

test("날짜 없는 턴은 아무것도 뽑지 않는다", () => {
  assert.equal(storyDateOf("시로코가 졸린 얼굴로 걸어왔다.", emptyFolder()), "");
});
test("상태 줄의 날짜를 뽑고, 연도 없는 날짜는 직전 날짜의 해를 쓴다", () => {
  assert.equal(storyDateOf("[2026년 3월 2일 저녁]\n시로코가 웃었다.", emptyFolder()), "2026-03-02");
  const f = emptyFolder(); f.scenes.push({ id: "s1", iso: "2026-03-02", when: "2026-03-02", orphan: false });
  assert.equal(latestStoryIso(f), "2026-03-02");
  assert.equal(storyDateOf("[3월 5일]\n호시노가 하품했다.", f), "2026-03-05");
});
test("날짜 역행과 1년 초과 점프는 무시한다", () => {
  const f = emptyFolder(); f.scenes.push({ id: "s1", iso: "2026-03-10", orphan: false });
  assert.equal(storyDateOf("[2026-03-01]", f), "");
  assert.equal(storyDateOf("[2028-03-01]", f), "");
});
test("mergeWhen: 모델 when에 날짜가 있으면 그것을, 시각만 있으면 앞에 날짜를 붙인다", () => {
  assert.equal(mergeWhen("3월 2일 저녁", "2026-03-02"), "3월 2일 저녁");
  assert.equal(mergeWhen("저녁", "2026-03-02"), "2026-03-02 저녁");
  assert.equal(mergeWhen("", "2026-03-02"), "2026-03-02");
  assert.equal(mergeWhen("Day 3 night", ""), "Day 3 night");
});
test("applyAnalysis: 프로그램이 뽑은 날짜가 세계 시간선에도 같이 기록된다", () => {
  const f = emptyFolder();
  applyAnalysis(f, analysis("저녁"), { at: 1, mid: "m1", h: "h1" }, { storyDate: "2026-03-02" });
  assert.equal(f.scenes[0].iso, "2026-03-02");
  assert.equal(f.scenes[0].when, "2026-03-02 저녁");
  assert.equal(timelineOf(f).length, 1);
  // 날짜 없는 턴은 시간선·날짜를 움직이지 않는다
  const g = emptyFolder();
  applyAnalysis(g, analysis(""), { at: 1, mid: "m1", h: "h1" }, { storyDate: "" });
  assert.equal(g.scenes[0].iso, undefined);
  assert.equal(timelineOf(g).length, 0);
});

const scopeOf = (states) => ({ documents: Object.fromEntries(Object.entries(states).map(([id, [name, st]]) => [id, { id, type: "Character", title: name, sections: [{ heading: CYCLE_HEADING, body: formatCycleBody(st), provenance: { slotId: CYCLE_SLOT } }] }])) });
const base = { length: 28, start: "2026-03-01", date: "2026-03-10", conception: "", partner: "", known: false, birth: "" };

test("출산과 임신 확인만 큰 사건으로 뽑고, 수정(본인이 모르는 것)은 뽑지 않는다", () => {
  const before = scopeOf({ d1: ["시로코", base] });
  const conceived = scopeOf({ d1: ["시로코", { ...base, conception: "2026-03-10", partner: "선생" }] });
  assert.deepEqual(cycleMilestones(before, conceived), []);
  const known = scopeOf({ d1: ["시로코", { ...base, conception: "2026-03-10", partner: "선생", known: true }] });
  const k = cycleMilestones(conceived, known);
  assert.equal(k.length, 1); assert.equal(k[0].kind, "known"); assert.equal(k[0].g, "S");
  assert.deepEqual(cycleMilestones(known, known), []);
  const born = scopeOf({ d1: ["시로코", { ...base, birth: "2026-12-01", date: "2026-12-01" }] });
  const b = cycleMilestones(known, born);
  assert.equal(b.length, 1); assert.equal(b[0].kind, "birth"); assert.equal(b[0].g, "EX");
  assert.equal(cycleStates(born).d1.name, "시로코");
});
test("addMilestones: Dusk 기록으로 남기고 같은 사건은 한 번만", () => {
  const f = emptyFolder();
  applyAnalysis(f, analysis("2026-12-01"), { at: 1, mid: "m1", h: "h1" }, { storyDate: "2026-12-01" });
  const ev = [{ id: "d1", name: "시로코", kind: "birth", date: "2026-12-01", act: "아이를 낳았다", g: "EX" }];
  assert.equal(addMilestones(f, ev), 1);
  assert.equal(addMilestones(f, ev), 0);
  const rec = Object.values(f.people)[0].records[0];
  assert.equal(rec.g, "EX"); assert.match(rec.act, /아이를 낳았다/);
  assert.equal(addMilestones(emptyFolder(), ev), 0, "상황이 없으면 기록하지 않아요");
});

test("리롤: 같은 이전 상태에서 같은 난수면 같은 결과이고, 이전 상태는 바뀌지 않는다", () => {
  const prev = parseCycleBody(formatCycleBody({ ...base, date: "2026-03-13" }));
  const snapshot = JSON.stringify(prev);
  const report = { adult: true, sex: [{ partner: "선생", protected: false }], known: false, birth: false };
  const run = () => nextCycleState(prev, report, "2026-03-14", { rate: 1, random: () => 0.0001 });
  const a = run(), b = run();
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(prev), snapshot);
});
test("임신 확률 배수 경계: 0.5와 3에서 확률이 커지는 방향이 맞다", () => {
  const prev = parseCycleBody(formatCycleBody({ ...base, date: "2026-03-13" }));
  const report = { adult: true, sex: [{ partner: "선생", protected: false }], known: false, birth: false };
  const at = (rate) => nextCycleState(prev, report, "2026-03-14", { rate, random: () => 0.5 }).rolled.chance;
  assert.ok(at(3) >= at(1) && at(1) >= at(0.5));
});
test("출산 6주 뒤부터 주기가 다시 시작한다", () => {
  const prev = parseCycleBody(formatCycleBody({ ...base, conception: "2026-03-10", partner: "선생", known: true, date: "2026-12-01" }));
  const r = nextCycleState(prev, { adult: true, sex: [], known: false, birth: true }, "2026-12-01", { random: () => 0.5 });
  assert.equal(r.state.birth, "2026-12-01"); assert.equal(r.state.start, "2027-01-12"); assert.equal(r.state.conception, "");
});
test("날짜가 없는 턴은 주기를 움직이지 않는다", () => {
  const prev = parseCycleBody(formatCycleBody(base));
  const r = nextCycleState(prev, null, "", { random: () => 0.5 });
  assert.equal(r.state.date, base.date);
});

import { cycleOf } from "../src/engine/personview.js";
test("인물 페이지 월경·임신 줄: 구획이 있을 때만, 임신이면 주차와 본인 인지 여부를 보여 준다", () => {
  const doc = (st) => ({ sections: [{ heading: CYCLE_HEADING, body: formatCycleBody(st), provenance: { slotId: CYCLE_SLOT } }] });
  assert.equal(cycleOf({ sections: [] }), null);
  const p = cycleOf(doc({ ...base, conception: "2026-03-01", partner: "선생", known: false, date: "2026-03-30" }));
  assert.match(p.lines[0], /임신 중 · 약 5주차 · 본인은 아직 몰라요/);
  const n = cycleOf(doc({ ...base, date: "2026-03-10" }));
  assert.match(n.lines[0], /주기 10일째/);
  const b = cycleOf(doc({ ...base, birth: "2026-12-01", start: "2027-01-12", date: "2026-12-01" }));
  assert.ok(b.lines.some((l) => /최근 출산 2026-12-01/.test(l)));
});
