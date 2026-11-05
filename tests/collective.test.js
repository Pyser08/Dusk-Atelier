import test from "node:test";
import assert from "node:assert/strict";
import { isCollectiveName } from "../src/engine/collective.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { emptyFolder } from "../src/data/memorystore.js";
import { buildMessages } from "../src/engine/memoryprompt.js";

test("집단·반·역할 이름은 인물이 아니다", () => {
  for (const n of ["1학년 A반", "동급생", "A반 학생들", "학생들", "반 아이들", "직원들", "사람들", "3반", "2학년", "classmates", "villagers", "친구들", "일행"]) assert.equal(isCollectiveName(n), true, n);
});
test("실제 인물 이름과 {{user}}는 그대로 둔다", () => {
  for (const n of ["한연희", "Alice", "김반야", "이아이", "박학생", "{{user}}", "{{User}}", "선생님", "민준", "김동기", "Teacher Kim", ""]) assert.equal(isCollectiveName(n), false, n);
});
test("분석 결과에서 집단 이름은 기록하지 않고 개인은 기록한다", () => {
  const folder = emptyFolder("c", "t");
  const res = { people: [{ name: "A반 학생들", act: "웅성거렸다", p: 1, s: 0, r: 2 }, { name: "한연희", act: "손을 들었다", p: 1, s: 1, r: 1 }, { name: "동급생", act: "쳐다봤다", p: 0, s: 0, r: 0 }], scene: { sum: "수업", facts: [], place: "교실", when: "", who: [], changed: true }, rel: [] };
  applyAnalysis(folder, res, { at: 0 });
  const names = Object.values(folder.people).map((p) => p.name);
  assert.deepEqual(names, ["한연희"]);
});
test("분석 프롬프트에 집단 인물 금지 규칙이 들어 있다", () => {
  const sys = buildMessages({ bot: "b", newest: { text: "x" } })[0].content;
  assert.match(sys, /Never record or create a class, grade, club/);
});
