// 2.2.4 일본 캐릭터 이름: 성만·이름만·호칭으로 불러도 한 사람으로(관계도에 둘·셋으로 갈라지던 것)
import test from "node:test";
import assert from "node:assert/strict";
import { canonName } from "../src/engine/memorylines.js";
import { applyAnalysis, knownPeople } from "../src/engine/memoryapply.js";

const K = (...names) => names.map((name) => ({ name, aliases: [] }));
test("띄어 쓴 성+이름: 성만·이름만·호칭", () => {
  const k = K("텐도 아리스", "하나오카 유즈");
  assert.equal(canonName("아리스", k), "텐도 아리스");
  assert.equal(canonName("텐도", k), "텐도 아리스");
  assert.equal(canonName("아리스쨩", k), "텐도 아리스");
  assert.equal(canonName("유즈 선배", k), "하나오카 유즈");
});
test("붙여 쓴 성+이름: 이름만 부르면 같은 사람, 한 글자 차이는 다른 사람", () => {
  assert.equal(canonName("아리스", K("텐도아리스")), "텐도아리스");
  assert.equal(canonName("리스", K("아리스")), "리스");
  assert.equal(canonName("텐도아리스", K("아리스")), "아리스");
});
test("성·이름이 따로 쌓여 있으면 전체 이름은 이름 쪽으로", () => {
  assert.equal(canonName("텐도 아리스", K("텐도", "아리스")), "아리스");
});
test("같은 성 두 사람이면 성만으로는 합치지 않는다", () => {
  assert.equal(canonName("텐도", K("텐도 아리스", "텐도 유즈")), "텐도");
});
test("분석 결과의 이름을 모든 인물에 맞추고 부른 이름을 별칭으로 남긴다", () => {
  const f = { people: { "텐도아리스": { name: "텐도 아리스", aliases: [], records: [{ id: "r", act: "x", at: 0 }] } }, scenes: [], emo: {}, rels: {}, open: [] };
  applyAnalysis(f, { people: [{ name: "아리스", act: "검을 들었다", p: 1, s: 1, r: 1 }], scene: null, emo: [{ from: "아리스", to: "{{user}}", t: { trust: 1 } }], ties: [{ a: "아리스", b: "{{user}}", kind: "동료" }] }, { at: 1 });
  assert.deepEqual(Object.keys(f.people), ["텐도아리스"]);
  assert.ok(f.people["텐도아리스"].aliases.includes("아리스"));
  assert.ok(Object.values(f.emo).every((e) => e.from === "텐도 아리스"));
  assert.ok(Object.values(f.ties).every((t) => t.a === "텐도 아리스"));
});
test("known: 처음 30명이 아니라 지금 글에 나온 사람·최근 인물부터", () => {
  const people = {};
  for (let i = 0; i < 40; i++) people["p" + i] = { name: `인물${i}`, aliases: [], records: [{ id: "r" + i, act: "x", at: i }] };
  const k = knownPeople({ people }, 30, "인물2가 왔다").map((p) => p.name);
  assert.equal(k[0], "인물2");
  assert.ok(k.includes("인물39") && !k.includes("인물3"));
});

test("같은 이름 한 번에 합치기: 하나오카 유즈·유즈, 성만(텐도)은 한 사람일 때만", async () => {
  const { fullAndGiven, duplicateGroups } = await import("../src/engine/peopledupe.js");
  assert.equal(fullAndGiven("하나오카 유즈", "유즈"), true);
  const mk = (...n) => ({ people: Object.fromEntries(n.map((x) => [x, { name: x, aliases: [], records: [{ id: x, act: "a", at: 0 }] }])), scenes: [], emo: {} });
  const g1 = duplicateGroups(mk("텐도 아리스", "텐도"));
  assert.equal(g1.length, 1);
  const g2 = duplicateGroups(mk("텐도 아리스", "텐도 유즈", "텐도"));
  assert.equal(g2.length, 0, "같은 성 두 사람이면 성만 부른 사람은 합치지 않는다");
});
