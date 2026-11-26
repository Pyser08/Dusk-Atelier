// Dusk Saga 제작대: 모양 레시피, 옮김·뒤집기, 5×5는 공방에서만, 부적·회복약·제련
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

const L0 = () => { const L = E.freshLedger(); E.ensureStarter(L); return L; };
const id = (L, mid) => L.bag.find((b) => b.mid === mid)?.id;
const put = (size, cells) => { const g = Array(size * size).fill(null); for (const [x, y, v] of cells) g[y * size + x] = v; return g; };

test("검: 주괴·주괴·막대 세로, 어느 자리에 놓아도", () => {
  const L = L0(); E.addMat(L, "stick", 2);
  for (const x of [0, 1, 2]) { const g = put(3, [[x, 0, id(L, "ingot_iron")], [x, 1, id(L, "ingot_iron")], [x, 2, id(L, "stick")]]); const m = E.matchGrid(g, 3, L.bag); assert.equal(m?.recipe.id, "sword"); }
  const g = put(3, [[1, 0, id(L, "ingot_iron")], [1, 1, id(L, "ingot_iron")], [1, 2, id(L, "stick")]]), n0 = L.bag.find((b) => b.mid === "ingot_iron").n;
  assert.equal(E.craftGrid(L, g, 3, { addItem: E.addItem }), null, "무기는 대장간·아틀리에에서만"); const p = E.craftGrid(L, g, 3, { workshop: true, addItem: E.addItem }); assert.equal(p.kind, "weapon"); assert.match(p.name, /검$/); assert.equal(L.bag.find((b) => b.mid === "ingot_iron").n, n0 - 2); assert.ok(L.bag.some((b) => b.kind === "장비" && b.w.kind === "sword"));
});
test("뒤집힌 모양(도끼)도, 개수가 모자라면 short", () => {
  const L = L0(); E.addMat(L, "stick", 2); const m = id(L, "ingot_iron"), s = id(L, "stick");
  const g = put(3, [[1, 0, m], [2, 0, m], [1, 1, s], [2, 1, m], [1, 2, s]]); assert.equal(E.matchGrid(g, 3, L.bag)?.recipe.id, "axe");
  L.bag.find((b) => b.mid === "ingot_iron").n = 2; assert.ok(E.matchGrid(g, 3, L.bag).short);
});
test("5×5 대검은 공방에서만, 등급 보너스", () => {
  const L = L0(); E.addMat(L, "ingot_steel", 6); E.addMat(L, "stick", 1); E.addMat(L, "plate_steel", 1); const m = id(L, "ingot_steel");
  const g = put(5, [[2, 0, m], [2, 1, m], [2, 2, m], [1, 3, m], [2, 3, id(L, "plate_steel")], [3, 3, m], [2, 4, id(L, "stick")]]);
  assert.equal(E.matchGrid(g, 5, L.bag)?.recipe.id, "greatsword"); assert.equal(E.craftGrid(L, g, 5, { workshop: false, addItem: E.addItem }), null);
  const p = E.craftGrid(L, g, 5, { workshop: true, addItem: E.addItem }); assert.equal(p.w.kind, "greatsword"); assert.ok(E.GRADE_ORDER.indexOf(p.grade.replace(/[+-]$/, "")) >= E.GRADE_ORDER.indexOf("정예"));
});
test("제련·회복약·부적 착용", () => {
  const L = L0(); E.addMat(L, "ore_silver"); E.addMat(L, "coal"); E.addMat(L, "water"); E.addMat(L, "gem_ruby");
  assert.equal(E.craftGrid(L, put(3, [[0, 0, id(L, "ore_silver")], [0, 1, id(L, "coal")]]), 3, { workshop: true, addItem: E.addItem }).name, "은 주괴");
  const pot = E.craftGrid(L, put(3, [[0, 0, id(L, "herb_green")], [0, 1, id(L, "water")], [0, 2, id(L, "glass")]]), 3, { addItem: E.addItem }); assert.equal(pot.name, "상처약");
  const t = id(L, "thread"); E.addMat(L, "thread", 2); const ch = E.craftGrid(L, put(3, [[1, 0, t], [0, 1, t], [1, 1, id(L, "gem_ruby")], [2, 1, t], [1, 2, t]]), 3, { addItem: E.addItem }); assert.equal(ch.kind, "charm"); assert.match(ch.name, /불 보석 부적/);
  L.party.defs.k = { id: "k", name: "카일", skills: [], weapons: [{ name: "철의 검", type: "sword", grade: 6 }] };
  const it = L.bag.find((b) => b.charm); assert.ok(E.equipCharm(L, it.id, "k")); assert.deepEqual(L.party.defs.k.skills, ["hit15"]); assert.match(E.partyLine(L), /카일: 주무기 철의 검.*장신구 불 보석 부적/);
  assert.ok(E.unequipCharm(L, "k")); assert.deepEqual(L.party.defs.k.skills, []); assert.ok(L.bag.some((b) => b.charm));
});
test("레시피 책 자동 채우기, 부위 소재 모양", () => {
  const L = L0(); E.addMat(L, "stick", 1); const r = E.RECIPES.find((x) => x.id === "sword"), g = E.autoFill(r, L.bag, 3); assert.equal(E.matchGrid(g, 3, L.bag).recipe.id, "sword");
  const pm = E.partMaterial("화룡", "body", "dragon", "fire"); assert.equal(pm.name, "화룡의 비늘"); assert.ok(pm.tags.includes("scale")); assert.match(E.iconSvg(pm, 24), /<svg/);
});
