import test from "node:test";
import assert from "node:assert/strict";
import { duskMerge } from "../src/engine/peoplemerge.js";
import { duplicateGroups, fullAndGiven } from "../src/engine/peopledupe.js";
import { buildRelMap } from "../src/engine/relmap.js";

const folder = () => ({
  people: { 김민지: { name: "김민지", aliases: [], records: [{ act: "인사", at: 0 }] }, 민지: { name: "민지", aliases: [], records: [{ act: "웃음", at: 1 }] }, 철수: { name: "철수", aliases: [], records: [{ act: "달림", at: 1 }] } },
  rels: { "민지>철수": { from: "민지", to: "철수", items: [{ d: "친구", dir: "+", at: 1 }] }, "김민지>철수": { from: "김민지", to: "철수", items: [{ d: "동료", dir: "+", at: 0 }] } },
  emo: { "민지>{{user}}": { from: "민지", to: "{{user}}", tags: { 애정: 1 }, log: [] } }, scenes: [{ at: 1, who: ["민지", "철수"] }]
});

test("인물을 합치면 관계·감정 기록도 남길 이름으로 옮겨 관계도에 한 명만 남는다", () => {
  const f = folder();
  duskMerge(f, "김민지", "민지");
  assert.deepEqual(Object.keys(f.rels), ["김민지>철수"]);
  assert.equal(f.rels["김민지>철수"].items.length, 2);
  assert.equal(Object.values(f.emo)[0].from, "김민지");
  const names = buildRelMap(f).nodes.map((n) => n.name).sort();
  assert.deepEqual(names, ["김민지", "철수"]);
});

test("성+이름과 이름만은 같은 이름 묶음으로 찾는다", () => {
  assert.equal(fullAndGiven("김민지", "민지"), true);
  assert.equal(fullAndGiven("남궁민", "민"), false);
  assert.equal(fullAndGiven("John Smith", "John"), true);
  assert.equal(fullAndGiven("민지", "수지"), false);
  const g = duplicateGroups(folder());
  assert.equal(g.length, 1);
  assert.equal(g[0][0].name, "김민지");
});
