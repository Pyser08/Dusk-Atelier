import test from "node:test";
import assert from "node:assert/strict";
import { eroPerson, eroAxes, eroAdult, eroGoalsOf, eroPair, eroRelmapLayer, eroReady } from "../src/engine/erosyncview.js";

const snap = {
  ok: true,
  people: [
    { id: "a", name: "호시노", aliases: ["Hoshino"], axes: [{ axis: "initiative", base: 70, value: 80 }, { axis: "extremity", base: 40, value: 40 }, { axis: "obsessiveness", base: null, value: null }], sexual: { eroticInterest: 60, sexualOpenness: 55 }, pref: { f: 50, m: 50, x: 0, total: 100 } },
    { id: "b", name: "유우카", aliases: [], axes: [], sexual: null, sfw: true }
  ],
  goals: [{ id: "g1", actor: "a", actorName: "호시노", target: "b", targetName: "유우카", typeLabel: "성관계 목표", priority: 70, objective: "단둘이 되기" }],
  rivalries: [{ actor: "b", actorName: "유우카", rival: "a", rivalName: "호시노", intensity: 30, reason: "" }],
  relations: [{ from: "a", fromName: "호시노", to: "b", toName: "유우카", affection: 60, eroticAttraction: 55, hatred: 0 }]
};

test("이름·별칭이 정확히 같을 때만 맞추고, 모호하면 맞추지 않는다", () => {
  assert.equal(eroPerson(snap, ["호 시노"])?.id, "a");
  assert.equal(eroPerson(snap, ["hoshino"])?.id, "a");
  assert.equal(eroPerson(snap, ["호시"]), null);
  assert.equal(eroPerson(snap, []), null);
  const dup = { ...snap, people: [...snap.people, { id: "c", name: "호시노", aliases: [], axes: [] }] };
  assert.equal(eroPerson(dup, ["호시노"]), null);
  assert.equal(eroPerson({ ok: false, people: [] }, ["호시노"]), null);
  assert.equal(eroReady(null), false);
});
test("축: 값 없는 축은 빼고 바뀐 축을 표시", () => {
  const ax = eroAxes(snap.people[0]);
  assert.equal(ax.length, 2);
  assert.equal(ax[0].label, "주도성");
  assert.equal(ax[0].changed, true);
  assert.equal(ax[1].changed, false);
});
test("성인 항목: SFW·비인물이면 null, 아니면 값과 선호 비율", () => {
  assert.equal(eroAdult(snap.people[1]), null);
  const ad = eroAdult(snap.people[0]);
  assert.deepEqual(ad.rows.map((r) => r.key), ["eroticInterest", "sexualOpenness"]);
  assert.deepEqual(ad.pref, { f: 50, m: 50, x: 0 });
});
test("목표·경쟁: 인물별, 둘 사이(양방향), 관계도 층", () => {
  assert.equal(eroGoalsOf(snap, "a").aiming.length, 1);
  assert.equal(eroGoalsOf(snap, "b").aimedAt.length, 1);
  assert.equal(eroGoalsOf(snap, "b").rivals.length, 1);
  const pr = eroPair(snap, "b", "a");
  assert.equal(pr.goals.length, 1); assert.equal(pr.rivals.length, 1); assert.equal(pr.relations.length, 1);
  assert.deepEqual(eroPair(snap, "a", "a"), { goals: [], rivals: [], relations: [] });
  const layer = eroRelmapLayer(snap);
  assert.deepEqual(layer.edges.map((e) => e.kind), ["goal", "rival"]);
  assert.deepEqual(layer.names.sort(), ["유우카", "호시노"]);
  assert.deepEqual(eroRelmapLayer(null), { edges: [], names: [] });
});

import { eroRelmapData } from "../src/engine/erosyncview.js";
test("관계도 Erosync 층: 걸린 인물만, 이름·별칭으로 맞추고, 못 맞춘 수를 알린다", () => {
  const data = { nowAt: 3, nodes: [{ id: "호시노", name: "호시노" }, { id: "유우카", name: "유우카" }, { id: "세리카", name: "세리카" }], edges: [{ id: "x" }] };
  const r = eroRelmapData(data, snap);
  assert.equal(r.noUser, true); assert.equal(r.empty, false);
  assert.deepEqual(r.nodes.map((n) => n.id).sort(), ["유우카", "호시노"]);
  assert.deepEqual(r.edges.map((e) => [e.a, e.b, e.sp]), [["호시노", "유우카", 0], ["유우카", "호시노", 1]]);
  // 위키에 없는 인물은 건너뛰고 센다
  const r2 = eroRelmapData({ ...data, nodes: [data.nodes[0]] }, snap);
  assert.equal(r2.empty, true); assert.equal(r2.missing, 1);
  // 별칭으로 맞춤
  const r3 = eroRelmapData({ ...data, nodes: [{ id: "hoshino", name: "Hoshino" }, data.nodes[1]] }, snap);
  assert.equal(r3.nodes.length, 2);
  assert.equal(eroRelmapData(data, null).empty, true);
});

import { eroSummary } from "../src/engine/erosyncview.js";
test("NSFW 요약: 목표·피노림·경쟁·관계·쉬는 턴을 한 줄씩 모은다", () => {
  const snap = { goals: [{ actor: "a", target: "b", targetName: "비", typeLabel: "접근", priority: 5, objective: "말 걸기" }, { actor: "c", actorName: "씨", target: "a", typeLabel: "x" }],
    rivalries: [{ actor: "a", rival: "c", intensity: 40 }], relations: [{ from: "a", toName: "비", affection: 70, eroticAttraction: 80, hatred: 0 }], rests: [{ actor: "a", targetName: "비", left: 2 }] };
  const l = eroSummary(snap, "a");
  assert.deepEqual(l.map((x) => x.k), ["goal", "aimed", "rival", "rel", "rest"]);
  assert.match(l[0].text, /비에게 접근 — 말 걸기/); assert.match(l[4].text, /2턴/);
  assert.deepEqual(eroSummary({}, "a"), []);
});

import { eroTemp, tempPath } from "../src/engine/erosyncview.js";
test("관계 온도: 점이 2개 이상인 상대만, 좌표는 턴 간격 그대로·위가 큰 값", () => {
  const snap = { temp: [{ from: "a", to: "b", toName: "비", points: [{ turn: 2, a: 50, e: 0, h: 100 }, { turn: 4, a: 100, e: 50, h: 0 }] }, { from: "a", to: "c", points: [{ turn: 1, a: 1, e: 1, h: 1 }] }, { from: "x", to: "b", points: [{}, {}] }] };
  assert.deepEqual(eroTemp(snap, "a").map((t) => t.to), ["b"]);
  const [t] = eroTemp(snap, "a");
  assert.equal(tempPath(t.points, "a", 100, 100), "0.0,50.0 100.0,0.0");
  assert.equal(tempPath(t.points, "h", 100, 100), "0.0,0.0 100.0,100.0");
  assert.equal(tempPath([], "a"), "");
});
