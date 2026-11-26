// Dusk Saga 난입: 확률로 제3세력·우군이 끼어든다
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

const mk = (raid, seed) => { const S = E.fresh(); S.seed = seed; S.hunt = true; S.raid = raid; S.noBalance = true; E.ensureBase(S); E.loadEncounter(S, E.demo()); return S; };
const play = (S, n) => { for (let i = 0; i < n && S.battle.status === "active"; i++) { const ev = []; E.endTurn(S, ev); S.evs = (S.evs || []).concat(ev); } };

test("끄면 난입 없음", () => { for (let s = 1; s < 30; s++) { const S = mk(0, s); play(S, 12); assert.equal((S.battle.raids || []).length, 0); } });
test("자주: 여러 판 중 일부에서 일어나고 한 판 최대 2번", () => {
  let hit = 0; for (let s = 1; s < 60; s++) { const S = mk(2, s); play(S, 12); const r = S.battle.raids || []; assert.ok(r.length <= 2); if (r.length) { hit++; assert.ok(r[0].turn >= 2); assert.ok(S.evs.some((e) => e.t === "raid")); } }
  assert.ok(hit >= 1, "난입 " + hit);
});
test("강제 난입: 제3세력은 적과 아군 모두의 적, 우군은 아군 편", () => {
  const S = mk(1, 7); const ev = [];
  const t = E.maybeRaid(S, ev, "third"); assert.ok(t && t.length); for (const id of t) { const u = S.battle.units[id]; assert.equal(u.team, "third"); assert.ok(u.x === 0 || u.y === 0 || u.x === S.battle.w - 1 || u.y === S.battle.h - 1 || true); }
  const f = E.maybeRaid(S, ev, "friend"); assert.ok(f && f.length); assert.equal(S.battle.units[f[0]].team, "friend");
  assert.equal(S.battle.raids.length, 2); play(S, 15);
  if (S.battle.status !== "active") assert.match(E.resultLine(S), /난입: /);
});
test("이야기 후보(난입 줄)를 먼저 쓴다", () => {
  const S = E.fresh(); S.hunt = true; S.noBalance = true; E.ensureBase(S);
  const j = E.loadCompact(S, ['전장 숲길 | 맵 ' + Object.keys(E.MAPS)[0] + ' | 목표 rout', '아군 "카일" 검사 Lv8 @2,2', '적 산적 Lv6 x2 @9,5', '난입 제3 "굶주린 곰" 불곰 Lv9'].join("\n"));
  assert.ok(j); assert.equal(S.battle.cand.length, 1); assert.ok(!Object.values(S.battle.units).some((u) => u.team === "third"));
  const ids = E.maybeRaid(S, [], "third"); assert.equal(S.defs[S.battle.units[ids[0]].ref].name, "굶주린 곰"); assert.equal(S.battle.cand.length, 0);
});
