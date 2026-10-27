import test from "node:test";
import assert from "node:assert/strict";
import { collectManaged, evaluate } from "../src/engine/lorerules.js";

// 트리니티(소속) ⊃ 정의실현위원회(소속) ⊃ 하스미 / 트리니티 ⊃ 마시로 · 게헨나(소속) ⊃ 히나
const rule = (keys) => ({ da_rid: undefined, da_rule: { on: true, cond: [{ t: "text", v: keys }], mode: "all", prob: 100 } });
const folder = (id, parent, aff) => ({ mode: "normal", key: id, comment: `[소속] ${id}`, content: "", folder: parent, extentions: { da_folder: { id, aff }, da_rid: `r_${id}`, da_rule: { on: true, cond: [{ t: "text", keys: id }], mode: "all", prob: 100 } } });
const member = (name, parent) => ({ mode: "normal", key: name, comment: name, content: name, folder: parent, extentions: { da_rid: `r_${name}`, da_rule: { on: true, cond: [{ t: "text", keys: name }], mode: "all", prob: 100 } } });
const entries = [
  folder("트리니티", null, { def: 100, max: "", prob: {} }), folder("정의실현위원회", "트리니티", { def: 100, max: "", prob: {} }),
  member("하스미", "정의실현위원회"), member("마시로", "트리니티"), member("코하루", "트리니티"),
  folder("게헨나", null, { def: 100, max: "", prob: {} }), member("히나", "게헨나")
];
const run = (text) => {
  const items = collectManaged(entries);
  const r = evaluate({ items, messages: [{ role: "user", data: text }], turn: 1, rng: () => 0 });
  return r.fired.map((f) => f.entry.comment.replace("[소속] ", "")).sort();
};

test("소속 이름만 나오면 구성원이 같이 켜진다", () => {
  assert.deepEqual(run("트리니티"), ["마시로", "코하루", "트리니티", "하스미"].sort());
});
test("구성원 한 명만 나오면 소속 정보만 들어오고 다른 구성원은 안 따라온다", () => {
  assert.deepEqual(run("마시로"), ["마시로", "트리니티"]);
});
test("하위 소속 구성원이 나와도 형제 소속·구성원은 안 따라온다", () => {
  assert.deepEqual(run("하스미"), ["정의실현위원회", "트리니티", "하스미"].sort());
});
test("하위 소속 이름이 나오면 그 소속 구성원만 켜진다", () => {
  assert.deepEqual(run("정의실현위원회"), ["정의실현위원회", "트리니티", "하스미"].sort());
});
