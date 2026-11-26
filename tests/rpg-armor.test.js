// Dusk Saga 방어구: 직업군별 제작, 착용 제한, 능력치·세트(2·4)·속성 저항, 처음 옷 → 방어구, 외관
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

const put = (rows, map) => { const g = Array(9).fill(null); rows.forEach((r, y) => [...r].forEach((k, x) => { if (k !== ".") g[y * 3 + x] = map[k]; })); return g; };
test("같은 소재, 직업군마다 다른 방어구(대장간에서만)", () => {
  const L = E.freshLedger(); E.addMat(L, "ingot_steel", 9); E.addMat(L, "leather", 3); E.addMat(L, "thread", 3); const st = L.bag.find((b) => b.mid === "ingot_steel").id, le = L.bag.find((b) => b.mid === "leather").id, th = L.bag.find((b) => b.mid === "thread").id;
  const heavy = put(["m.m", "mLm", "mmm"], { m: st, L: le }); assert.equal(E.matchGrid(heavy, 3, L.bag).recipe.id, "ar_heavy_body"); assert.equal(E.craftGrid(L, heavy, 3, { addItem: E.addItem }), null);
  const p = E.craftGrid(L, heavy, 3, { workshop: true, addItem: E.addItem }); assert.equal(p.kind, "armor"); assert.match(p.name, /강철 판금 흉갑/); assert.ok(p.a.st.def >= 2);
  E.addMat(L, "leather", 7); const le2 = L.bag.find((b) => b.mid === "leather").id; const light = put(["l.l", "lTl", "lll"], { l: le2, T: th }); assert.equal(E.matchGrid(light, 3, L.bag).recipe.id, "ar_light_body");
});
test("직업군이 맞아야 입고, 입으면 능력치·속옷", () => {
  const L = E.freshLedger(); L.party.defs.k = { id: "k", name: "카일", job: "중기사", skills: [], weapons: [{ name: "창", type: "lance", mt: 7, grade: 3 }] };
  const a = E.makeArmor("heavy", "body", { name: "강철 주괴", mid: "ingot_steel", grade: "정예", pal: "steel" }); E.addItem(L, { kind: "방어구", name: a.name, a, n: 1 });
  const r = E.makeArmor("robe", "body", { name: "비단", mid: "cloth_silk", grade: "희귀" }); E.addItem(L, { kind: "방어구", name: r.name, a: r, n: 1 });
  const id = (n) => L.bag.find((b) => b.name === n).id; assert.ok(!E.equipArmor(L, id(r.name), "k"), "로브는 중갑 직업이 못 입음"); assert.ok(E.equipArmor(L, id(a.name), "k"));
  const d = L.party.defs.k; assert.equal(d.armor.body.name, a.name); assert.ok(d.armor.head, "처음 옷이 방어구로 들어 있음"); assert.match(E.partyLine(L), /방어구 .*강철 판금 흉갑/);
  for (const s of Object.keys(E.SLOTS)) E.unequipArmor(L, "k", s); assert.equal(E.armorLook(d).outfit, "under");
});
test("세트 2·4, 속성 저항", () => {
  const m = { src: "화룡", name: "화룡의 비늘", grade: "영웅", elem: "fire", pal: "dragonr" }, d = { armor: {} };
  for (const s of ["head", "body"]) d.armor[s] = E.makeArmor("heavy", s, m); let sets = E.setsOf(d); assert.equal(sets[0].n, 2); assert.equal(sets[0].fx.length, 1);
  for (const s of ["hands", "legs"]) d.armor[s] = E.makeArmor("heavy", s, m); sets = E.setsOf(d); assert.equal(sets[0].fx.length, 2);
  const S = { hunt: true }; assert.ok(E.armorResist(S, d, "fire") < 0.6); assert.equal(E.armorBoost(S, d, "fire"), 1.2); assert.equal(E.armorResist(S, d, "ice"), 1);
});
test("머리색", () => { assert.equal(E.hairFromText("은발에 푸른 눈"), 0xd8d8e0); assert.equal(E.hairFromText("평범한"), 0); });
test("기술: 고유·범위 보장, 직접 만들기, 세트", () => {
  const S = E.fresh(); S.hunt = true; S.noBalance = true; E.ensureBase(S); E.loadCompact(S, `전장 숲 | 맵 ${Object.keys(E.MAPS)[0]} | 목표 rout\n아군 "카일" 검사 Lv8\n적 산적 Lv3`);
  const d = Object.values(S.defs).find((x) => x.name === "카일"); assert.ok(d.skills.some((k) => S.skills[k].flags?.area), "범위"); assert.ok(d.skills.some((k) => (S.skills[k].tier || "own") !== "common" && !S.skills[k].flags?.area), "고유");
  const L = E.freshLedger(); E.keepParty(L, S); const id = d.id; const s = E.createSkill(L, { name: "번개 찌르기", desc: "번개를 실어 찌른다", grade: "희귀" }); assert.ok(s && L.skillLib.includes(s.id));
  assert.ok(E.saveSkillSet(L, id, "기본")); assert.ok(E.learnSkill(L, id, s.id) || L.party.defs[id].skills.length >= 6); E.saveSkillSet(L, id, "번개"); assert.ok(E.loadSkillSet(L, id, 0)); assert.ok(!L.party.defs[id].skills.includes(s.id) || L.party.defs[id].skillSets[0].skills.includes(s.id));
  assert.ok(L.party.defs[id].armor?.body, "생성된 아군은 처음 옷이 방어구로");
});
