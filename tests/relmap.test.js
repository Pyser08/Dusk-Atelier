// 인물 관계도 데이터 계산 (v1.9.3)
import test from "node:test";
import assert from "node:assert/strict";
import { buildRelMap, layoutNodes, findPath, affinityOf, importanceOf, RM } from "../src/engine/relmap.js";

const rec = (at, act = "무언가 함") => ({ id: `r${at}`, at, at_ms: at * 1000, act, g: "B" });
const folder = () => ({
  people: {
    "{{user}}": { name: "{{user}}", records: [rec(1)] },
    리안: { name: "리안", records: [rec(1), rec(5), rec(9, "인장을 맡김")] },
    카엘: { name: "카엘", records: [rec(3)] },
    미라: { name: "미라", records: [rec(9), rec(8)], faction: "학원" },
    로건: { name: "로건", records: [rec(2)], status: "missing" }
  },
  emo: {
    a: { from: "리안", to: "{{user}}", tags: { affection: 8, trust: 6 } },
    b: { from: "카엘", to: "{{user}}", tags: { hostility: 6, fear: 2 } }
  },
  rels: {
    "리안|카엘": { from: "리안", to: "카엘", items: [{ d: "공개 충돌", dir: "-", at: 2 }, { d: "정적", dir: "-", at: 9 }] },
    "미라|리안": { from: "미라", to: "리안", items: [{ d: "호감", dir: "+", at: 2 }] },
    "리안|{{user}}": { from: "리안", to: "{{user}}", items: [{ d: "믿음", dir: "+", at: 3 }] }
  },
  scenes: [{ at: 9, who: ["리안", "미라", "{{user}}"] }],
  cursor: { at: 9 }
});

test("호감도: 좋은 감정에서 나쁜 감정을 빼고, 기록이 없으면 중립 50", () => {
  assert.equal(affinityOf({ affection: 8, trust: 6 }, true), 90);
  assert.equal(affinityOf({ hostility: 6, fear: 2 }, true), 20);
  assert.equal(affinityOf({}, false), 50);
  assert.equal(affinityOf({ affection: 10, hostility: 10 }, true), 50);
});

test("중요도: 기록이 많고 최근일수록 높다", () => {
  const few = importanceOf([rec(1)], 100), many = importanceOf([rec(1), rec(2), rec(3), rec(4)], 100);
  assert.ok(many > few);
  assert.ok(importanceOf([rec(95)], 100) > importanceOf([rec(1)], 100));
  assert.ok(importanceOf(Array.from({ length: 50 }, (_, i) => rec(95 + (i % 5))), 100) <= 100);
});

test("buildRelMap: 인물·호감·이번 턴·상태를 만든다", () => {
  const m = buildRelMap(folder());
  const by = Object.fromEntries(m.nodes.map((n) => [n.name, n]));
  assert.deepEqual(Object.keys(by).sort(), ["로건", "리안", "미라", "카엘"].sort());
  assert.equal(by["리안"].aff, 90);
  assert.ok(by["카엘"].aff < 30);
  assert.equal(by["리안"].thisTurn, true);
  assert.equal(by["미라"].thisTurn, true);
  assert.equal(by["카엘"].thisTurn, false);
  assert.equal(by["로건"].status, "missing");
  assert.equal(by["미라"].faction, "학원");
  assert.equal(by["리안"].rec[0][1], "인장을 맡김");
});

test("buildRelMap: NPC 간 선만 담고(사용자 선 제외) 색·강도·최근 변화를 계산한다", () => {
  const m = buildRelMap(folder());
  assert.equal(m.edges.length, 2);
  const lk = m.edges.find((e) => e.a === "리안" && e.b === "카엘");
  assert.equal(lk.w, -1);
  assert.equal(lk.rc, 1, "마지막 변화가 최근 5응답 안");
  assert.equal(lk.label, "정적");
  const mr = m.edges.find((e) => e.a === "미라");
  assert.equal(mr.w, 1);
  assert.equal(mr.rc, 0);
});

test("buildRelMap: 폴더가 비어도 안 깨진다", () => {
  assert.equal(buildRelMap(null).empty, true);
  assert.equal(buildRelMap({ people: {}, rels: {} }).nodes.length, 0);
});

test("buildRelMap: 인물이 많으면 중요한 순으로 상한까지만", () => {
  const f = { people: {}, emo: {}, rels: {}, scenes: [], cursor: { at: 50 } };
  for (let i = 0; i < 60; i++) f.people[`p${i}`] = { name: `p${i}`, records: Array.from({ length: (i % 7) + 1 }, (_, k) => rec(k + 1)) };
  const m = buildRelMap(f);
  assert.equal(m.nodes.length, RM.MAX_NODES);
  assert.ok(m.nodes[0].imp >= m.nodes.at(-1).imp);
});

test("layoutNodes: 호감도가 높을수록 가운데에 가깝고, 서로 겹치지 않는다", () => {
  const nodes = [90, 70, 50, 30, 10].map((aff, i) => ({ name: `n${i}`, aff, imp: 50, faction: "" }));
  layoutNodes(nodes);
  const dist = (n) => Math.hypot(n.tx, n.tz);
  assert.ok(dist(nodes[0]) < dist(nodes[4]));
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) assert.ok(Math.hypot(nodes[i].tx - nodes[j].tx, nodes[i].tz - nodes[j].tz) >= RM.MIN_GAP - 1);
});

test("layoutNodes: 소속이 있으면 소속끼리 같은 방향에 모인다", () => {
  const nodes = [
    ...[0, 1, 2].map((i) => ({ name: `a${i}`, aff: 60, imp: 50, faction: "A" })),
    ...[0, 1, 2].map((i) => ({ name: `b${i}`, aff: 60, imp: 50, faction: "B" }))
  ];
  const r = layoutNodes(nodes);
  assert.deepEqual(r.factions, ["A", "B"]);
  const mean = (g) => nodes.filter((n) => n.faction === g).reduce((s, n) => s + n.ang, 0) / 3;
  assert.ok(Math.abs(mean("A") - mean("B")) > 90);
});

test("findPath: 가장 짧은 경로, 없으면 null, 약한 관계 숨기기 반영", () => {
  const edges = [{ a: "a", b: "b", s: 0.9 }, { a: "b", b: "c", s: 0.3 }, { a: "a", b: "c", s: 0.2 }, { a: "x", b: "y", s: 0.9 }];
  assert.deepEqual(findPath(edges, "a", "c"), ["a", "c"]);
  assert.deepEqual(findPath(edges, "a", "c", 50), null);
  assert.deepEqual(findPath(edges, "a", "b", 50), ["a", "b"]);
  assert.equal(findPath(edges, "a", "y"), null);
});
