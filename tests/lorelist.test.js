import test from "node:test";
import assert from "node:assert/strict";
import { sortLoreByName, pickTree, childrenMap } from "../src/engine/lorelist.js";
import { parentOf } from "../src/engine/lorerules.js";

const F = (id, parent, name) => ({ mode: "normal", key: id, comment: name ?? id, content: "", extentions: { da_folder: { id }, ...(parent ? { da_parent: parent } : {}) } });
const I = (name, parent) => ({ mode: "normal", key: name, comment: name, content: "x", extentions: parent ? { da_parent: parent } : {} });
const div = (name) => ({ mode: "normal", key: "", comment: `-- ${name} --`, content: "" });
const isDivider = (x) => /^--.*--$/.test(x.comment);
const names = (a) => a.map((x) => x.comment);

test("이름순: 폴더 안에서만 정렬되고 구조(부모)는 그대로", () => {
  const list = [I("다"), F("B", null, "B폴더"), I("나", "B"), I("가", "B"), F("A", null, "A폴더"), I("라", "A"), I("가나")];
  const before = new Map(list.map((x) => [x, parentOf(x)]));
  const out = sortLoreByName(list, { isDivider });
  assert.equal(out.length, list.length);
  for (const x of out) assert.equal(parentOf(x), before.get(x));
  assert.deepEqual(names(out), ["A폴더", "라", "B폴더", "가", "나", "가나", "다"]);
});
test("구분선은 제자리, 구간 안에서만 정렬", () => {
  const list = [I("나"), I("가"), div("인물"), I("라"), I("다")];
  assert.deepEqual(names(sortLoreByName(list, { isDivider })), ["가", "나", "-- 인물 --", "다", "라"]);
});
test("숫자는 자연스럽게(2 < 10)", () => {
  assert.deepEqual(names(sortLoreByName([I("항목10"), I("항목2")])), ["항목2", "항목10"]);
});
test("scope를 주면 그 폴더 안만 정렬", () => {
  const list = [I("나"), I("가"), F("A", null, "A폴더"), I("z", "A"), I("b", "A")];
  assert.deepEqual(names(sortLoreByName(list, { scope: "A" })), ["나", "가", "A폴더", "b", "z"]);
});
test("순환·고아 항목도 하나도 사라지지 않는다", () => {
  const a = F("A", "B"), b = F("B", "A"), c = I("c", "없는폴더");
  const out = sortLoreByName([a, b, c]);
  assert.equal(out.length, 3);
  assert.equal(new Set(out).size, 3);
});
test("선택기 트리: 고를 수 있는 것만, 빈 폴더는 숨김, 구분선 제외", () => {
  const list = [F("A", null, "A폴더"), I("x", "A"), F("E", null, "빈폴더"), div("d"), I("y")];
  const t = pickTree(list, { isDivider, pickable: (x) => !x.extentions.da_folder });
  assert.deepEqual(t.map((n) => [n.entry.comment, n.folder, n.children.length]), [["A폴더", true, 1], ["y", false, 0]]);
});
test("childrenMap: 부모를 못 찾으면 최상위", () => {
  const m = childrenMap([I("a", "없음")]);
  assert.equal(m.get(null).length, 1);
});

test("키·내용이 빈 Dusk 폴더를 구분선으로 착각하지 않는다 (에디터의 구분선 판정은 빈 항목을 구분선으로 봄)", () => {
  const emptyDivider = (x) => !String(x.key ?? "").trim() && !String(x.content ?? "").trim();
  const f1 = { mode: "normal", key: "", comment: "트리니티", content: "", extentions: { da_folder: { id: "T" } } };
  const f2 = { mode: "normal", key: "", comment: "게헨나", content: "", extentions: { da_folder: { id: "G" } } };
  assert.deepEqual(names(sortLoreByName([f1, f2], { isDivider: emptyDivider })), ["게헨나", "트리니티"]);
});
