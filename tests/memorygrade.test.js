import test from "node:test";
import assert from "node:assert/strict";
import { scoreToGrade, clampAxis, gradeResponse, findDuplicate, pruneRecords, similarity } from "../src/engine/memorygrade.js";

test("score boundaries", () => {
  assert.equal(scoreToGrade(0), null); assert.equal(scoreToGrade(1), null);
  assert.equal(scoreToGrade(2), "D"); assert.equal(scoreToGrade(3), "D");
  assert.equal(scoreToGrade(4), "C"); assert.equal(scoreToGrade(5), "C");
  assert.equal(scoreToGrade(6), "B"); assert.equal(scoreToGrade(7), "A");
  assert.equal(scoreToGrade(8), "S"); assert.equal(scoreToGrade(9), "EX");
});
test("clampAxis", () => {
  assert.equal(clampAxis(9), 3); assert.equal(clampAxis(-2), 0); assert.equal(clampAxis("x"), 0); assert.equal(clampAxis(1.6), 2);
});
test("gradeResponse: drops low scores, caps 6 total and 2 per person", () => {
  const mk = (name, n, p = 2) => Array.from({ length: n }, (_, i) => ({ name, act: `${name}${i}`, p, s: 1, r: 1 }));
  const out = gradeResponse([...mk("A", 5), ...mk("B", 5), { name: "C", act: "x", p: 1, s: 0, r: 0 }]);
  assert.equal(out.length, 4);
  assert.ok(out.every((e) => e.g));
  const many = gradeResponse(["a","b","c","d","e","f","g","h"].map((n) => ({ name: n, act: n, p: 2, s: 1, r: 1 })));
  assert.equal(many.length, 6);
});
test("gradeResponse: caps EX 1, S 2, A 3 with cascading demotion", () => {
  const out = gradeResponse(["a","b","c","d","e"].map((n) => ({ name: n, act: n, p: 3, s: 3, r: 3 })));
  const cnt = (g) => out.filter((e) => e.g === g).length;
  assert.equal(cnt("EX"), 1); assert.equal(cnt("S"), 2); assert.equal(cnt("A"), 2);
  const b = gradeResponse(["a","b","c","d"].map((n) => ({ name: n, act: n, p: 3, s: 2, r: 2 })));
  assert.equal(b.filter((e) => e.g === "A").length, 3);
  assert.equal(b.filter((e) => e.g === "B").length, 1);
});
test("duplicate detection and upgrade", () => {
  const recs = [{ act: "하루를 감싸며 비밀을 털어놓음", g: "C" }];
  assert.ok(similarity("하루를 감싸며 비밀을 털어놓음!", recs[0].act) >= 0.8);
  assert.deepEqual(findDuplicate(recs, "하루를 감싸며 비밀을 털어놓음.", "B").upgrade, true);
  assert.equal(findDuplicate(recs, "전혀 다른 행동을 했다", "B"), null);
});
test("pruneRecords keeps A, B, pinned and user-edited", () => {
  const rs = [{ g: "D" }, { g: "A" }, { g: "D", pin: true }, { g: "B" }, { g: "D", user: true }, { g: "D" }, { g: "C" }];
  const out = pruneRecords(rs, 4);
  assert.equal(out.length, 4);
  assert.ok(out.some((r) => r.g === "A") && out.some((r) => r.g === "B") && out.some((r) => r.pin) && out.some((r) => r.user));
});
