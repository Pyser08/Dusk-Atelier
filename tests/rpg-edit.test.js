import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";
const mk = () => { const S = E.fresh(); E.ensureBase(S); E.loadEncounter(S, E.demo()); return S; };
test("인물 고치기: 사본에서만 바뀌고 확정하면 전투에도 반영된다", () => {
  const S = mk(), u = Object.values(S.battle.units)[0], id = u.ref, before = JSON.stringify(S.defs[id]), W = E.draftOf(S, id), d = W.defs[id];
  E.editStat(d, "hp", 999); E.editStat(d, "str", -5); E.editName(d, "새 이름"); E.editWeapon(d, 0, { name: "역수 단검", kind: "dagger", grade: "전설", elem: "ice" });
  assert.equal(JSON.stringify(S.defs[id]), before); assert.equal(d.stats.hp, 120); assert.equal(d.stats.str, 0); assert.equal(d.weapons[0].elem, "ice");
  u.wi = 9; assert.ok(E.commitEdit(S, W, id)); assert.equal(S.defs[id].name, "새 이름"); assert.equal(u.hp, 120); assert.equal(u.wi, 0);
});
test("인물 고치기: 종족·직업을 여러 번 바꿔도 앞 것이 남지 않는다", () => {
  const S = mk(), id = Object.values(S.battle.units)[0].ref, W = E.draftOf(S, id), d = W.defs[id]; E.editRace(W, d, ""); E.editJob(W, d, ""); const g0 = JSON.stringify(d.growth), t0 = JSON.stringify(d.tags || []), s0 = d.skills.length;
  for (const r of ["엘프", "드래곤", "고양이 수인"]) E.editRace(W, d, r); assert.equal(d.race, "고양이 수인"); E.editRace(W, d, ""); assert.equal(JSON.stringify(d.tags), t0); assert.equal(d.skills.length, s0);
  for (const j of ["검사", "마도사", "기병"]) E.editJob(W, d, j); assert.equal(d.job, "기병"); assert.equal(d.mtype, "horse"); E.editJob(W, d, ""); assert.equal(JSON.stringify(d.growth), g0);
  E.editLevel(W, id, 30, false); assert.equal(d.level, 30); E.editLevel(W, id, 99, true); assert.equal(d.level, E.MAXLV);
});
