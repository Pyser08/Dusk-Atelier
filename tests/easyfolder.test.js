import test from "node:test";
import assert from "node:assert/strict";
import { classify, suggest, applyPlan, groups } from "../src/engine/easyfolder.js";

const lore = (n) => Array.from({ length: n }, (_, i) => ({ key: "인물" + i, comment: "인물" + i, content: "x" }));
const chars = [
  { chaId: "a", name: "샬레의 하루", desc: "키보토스 게헨나 학생들과의 일상", globalLore: lore(8) },
  { chaId: "b", name: "엘리스", desc: "마법 왕국의 엘프 공주", globalLore: [] },
  { chaId: "c", name: "무림맹", tags: ["무협"], desc: "강호의 문파들", globalLore: lore(5) },
  { chaId: "d", name: "그룹", type: "group" },
  { chaId: "e", name: "아무개", desc: "" },
  { chaId: "t", name: "지운 봇", trashTime: 1 },
];

test("종류·장르 분류", () => {
  assert.deepEqual(classify(chars[0]), { kind: "sim", genre: "블루 아카이브" });
  assert.deepEqual(classify(chars[1]), { kind: "single", genre: "판타지" });
  assert.deepEqual(classify(chars[2]), { kind: "sim", genre: "무협" });
  assert.equal(classify(chars[3]).kind, "group");
  assert.equal(classify(chars[4]).genre, "기타");
});

test("제안: 이미 폴더에 든 봇·지운 봇은 빼고", () => {
  const order = [{ id: "f1", name: "내 폴더", data: ["b"] }, "a", "c", "d", "e"];
  const p = suggest(chars, order, { mode: "kind" });
  const all = p.flatMap((g) => g.ids).sort();
  assert.deepEqual(all, ["a", "c", "d", "e"]);
  assert.deepEqual(p.find((g) => g.name === "시뮬봇").ids, ["a", "c"]);
  assert.equal(suggest(chars, order, { mode: "kind", keepFiled: false }).flatMap((g) => g.ids).length, 5);
});

test("적용: 같은 이름 폴더엔 더하고 없으면 만든다", () => {
  const order = [{ id: "f1", name: "판타지", data: [] }, "a", "b", "c"];
  let n = 0;
  const out = applyPlan(order, [{ name: "판타지", ids: ["b"] }, { name: "무협", ids: ["c"] }], { mkId: () => "new" + ++n });
  assert.deepEqual(out.find((x) => x.id === "f1").data, ["b"]);
  assert.deepEqual(out.find((x) => x.name === "무협"), { id: "new1", name: "무협", color: "default", data: ["c"] });
  assert.ok(out.includes("a") && !out.includes("b") && !out.includes("c"));
});

test("화면 묶음: 폴더별 + 폴더 밖", () => {
  const g = groups(chars, [{ id: "f1", name: "폴더", data: ["a", "b"] }, "c"]);
  assert.deepEqual(g.map((x) => [x.folder?.name ?? null, x.chars.map((c) => c.chaId)]), [["폴더", ["a", "b"]], [null, ["c", "d", "e"]]]);
});
