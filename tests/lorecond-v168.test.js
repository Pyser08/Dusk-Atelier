// v1.6.8: 로어북 켜지는 조건 — 방금 입력 단어 · 변수 비교(이상/이하/초과/미만/같음/글자)
import test from "node:test";
import assert from "node:assert/strict";
import { collectManaged, evaluate } from "../src/engine/lorerules.js";

const item = (name, cond) => ({ mode: "normal", key: name, comment: name, content: name, extentions: { da_rid: "r_" + name, da_rule: { on: true, cond, mode: "all", prob: 100 } } });
const fired = (es, messages, vars = {}) => evaluate({ items: collectManaged(es), messages, turn: 1, vars, rng: () => 0 }).fired.map((f) => f.entry.comment).sort();

test("방금 입력(내 마지막 말)에만 단어가 있을 때 켜진다", () => {
  const es = [item("검", [{ t: "text", keys: "검", in: "input" }])];
  assert.deepEqual(fired(es, [{ role: "user", data: "검을 뽑아" }]), ["검"]);
  assert.deepEqual(fired(es, [{ role: "user", data: "검을 뽑아" }, { role: "assistant", data: "네" }, { role: "user", data: "안녕" }]), []); // 지난 말에 있어도 안 켜짐
  assert.deepEqual(fired(es, [{ role: "user", data: "안녕" }, { role: "assistant", data: "검이다" }]), []); // 봇 말은 아님
});
test("변수: 이상·이하·초과·미만·같음·다름·글자 비교", () => {
  const msg = [{ role: "user", data: "x" }];
  const f = (op, val, v) => fired([item("a", [{ t: "var", name: "호감", op, val }])], msg, { 호감: v }).length === 1;
  assert.ok(f(">=", "50", "50") && !f(">=", "50", "49"));
  assert.ok(f("<=", "50", "50") && !f("<=", "50", "51"));
  assert.ok(f(">", "50", "51") && !f(">", "50", "50"));
  assert.ok(f("<", "50", "49") && !f("<", "50", "50"));
  assert.ok(f("=", "50", "50") && f("!=", "50", "49"));
  assert.ok(f("=", "연인", "연인") && !f("=", "연인", "친구")); // 글자 같음
  assert.ok(f("포함", "인", "연인") && !f("포함", "인", "친구") && f("미포함", "인", "친구"));
  assert.ok(f("있음", "", "x") && !f("없음", "", "x"));
});
