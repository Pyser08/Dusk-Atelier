// Dusk Saga 사냥 규칙: 큰 몬스터(2×2·3×3)가 판에서 겹치지 않고 움직이고 싸운다
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

const BIG = ["화룡", "히드라", "전차", "불곰", "돌 골렘", "와이번", "트렌트", "기갑병"];
const rnd = (n) => () => { n = (n + 0x6d2b79f5) | 0; let t = Math.imul(n ^ (n >>> 15), n | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function check(S, tag) {
  const B = S.battle, seen = new Map();
  for (const u of E.alive(B)) for (const [x, y] of E.cells(u)) {
    assert.ok(x >= 0 && y >= 0 && x < B.w && y < B.h, tag + " 판 밖 " + u.id);
    const k = x + "," + y; assert.ok(!seen.has(k), tag + " 겹침 " + u.id + "/" + seen.get(k) + " @" + k); seen.set(k, u.id);
  }
}
function encounter(i) {
  const d = E.demo(), maps = Object.keys(E.MAPS);
  const foes = [0, 1, 2].map((n) => ({ id: "b" + n, preset: BIG[(i + n * 3) % BIG.length], level: 5 + (i % 10) }));
  return { name: "사냥 " + i, mapPreset: maps[i % maps.length], objective: { type: "rout" }, units: d.units.concat(foes),
    place: d.place.filter((p) => p.team === "ally").concat(foes.map((f, n) => ({ ref: f.id, team: "enemy", x: 8 + n, y: 2 + n * 3, ai: "charge" }))) };
}
test("사람 모양과 작은 짐승은 1칸, 큰 짐승·용은 2·3칸", () => {
  assert.equal(E.sizeOf({ name: "화룡", ...E.PRE["화룡"] }), 3); assert.equal(E.sizeOf({ name: "불곰", ...E.PRE["불곰"] }), 2);
  assert.equal(E.sizeOf({ name: "회색 늑대", ...E.PRE["회색 늑대"] }), 1); assert.equal(E.sizeOf({ name: "기사단장", job: "기사" }), 1);
});
test("거리는 몸 가장자리끼리 잰다", () => {
  const dr = { x: 4, y: 4, sz: 3 };
  assert.equal(E.dist(dr, { x: 3, y: 5 }), 1); assert.equal(E.dist(dr, { x: 7, y: 6 }), 1); assert.equal(E.dist(dr, { x: 8, y: 8 }), 4); assert.equal(E.dist(dr, { x: 5, y: 5 }), 0);
});
test("사냥 규칙: 큰 몬스터가 겹치지 않고 움직이고 싸워 전투가 끝까지 돈다", () => {
  let bigs = 0, hits = 0;
  for (let i = 0; i < 40; i++) {
    const S = E.fresh(); S.seed = 500 + i; S.hunt = true; E.ensureBase(S); E.loadEncounter(S, encounter(i));
    bigs += E.alive(S.battle).filter((u) => (u.sz || 1) > 1).length; check(S, "시작 " + i);
    const r = rnd(9 + i), ev = [];
    for (let turn = 0; turn < 15 && S.battle.status === "active"; turn++) {
      for (const id of E.alive(S.battle).filter((u) => u.team === "ally").map((u) => u.id)) {
        const u = S.battle.units[id]; if (!u || u.hp <= 0 || u.done || S.battle.status !== "active") continue;
        const R = E.reach(S, u), st = E.stops(S, u, R); E.travel(S, u, E.pathTo(R, st[Math.floor(r() * st.length)]), ev); check(S, "이동 " + i);
        const o = E.options(S, u).find((q) => q.kind === "attack" && q.targets.length);
        if (o && S.battle.status === "active") { u.wi = o.wi; E.actAttack(S, u, S.battle.units[o.targets[0]], null, ev); } else E.actWait(S, u);
      }
      if (S.battle.status === "active") E.endTurn(S, ev); check(S, "적 턴 " + i);
    }
    hits += ev.filter((e) => e.t === "strike" && S.battle.units[e.from]?.sz).length;
  }
  assert.ok(bigs > 60, "큰 몬스터 배치 " + bigs); assert.ok(hits > 20, "큰 몬스터 공격 " + hits);
});
test("부위: 칸마다 부위가 있고, 가까운 칸을 치거나 노려서 고르며, 무기 결에 따라 부위 피해가 다르다", () => {
  const S = E.fresh(); S.seed = 7; S.hunt = true; E.ensureBase(S); const d = E.demo();
  E.loadEncounter(S, { name: "용 사냥", map: Array(9).fill("............"), objective: { type: "rout" }, units: d.units.concat([{ id: "dr", preset: "화룡", level: 20 }]), place: [{ ref: d.place[0].ref, team: "ally", x: 2, y: 5 }, { ref: "dr", team: "enemy", x: 6, y: 4 }] });
  const B = S.battle, dr = Object.values(B.units).find((u) => u.sz === 3), hero = Object.values(B.units).find((u) => u.team === "ally");
  assert.ok(dr.parts.head && dr.parts.tail && dr.parts.wings && dr.parts.legs, "용 부위 " + Object.keys(dr.parts));
  dr.x = 6; dr.y = 4; dr.face = [-1, 0]; // 서쪽(왼쪽)을 본다: x6 줄이 앞
  const P = (x, y) => E.partAt(S, dr, x, y);
  assert.equal(P(6, 5), "head"); assert.equal(P(6, 4), "legs"); assert.equal(P(7, 5), "body"); assert.equal(P(7, 4), "wings"); assert.equal(P(8, 5), "tail"); assert.equal(P(8, 6), "legs");
  dr.face = [0, 1]; assert.equal(P(7, 6), "head", "몸을 돌리면 부위 칸도 돈다"); dr.face = [-1, 0];
  const S2 = { ...S.defs[hero.ref].stats }; Object.assign(S.defs[hero.ref].stats, { str: 80, skl: 80 });
  hero.x = 5; hero.y = 5; hero.aim = null; let f = E.forecast(S, hero, dr, null).a; assert.equal(f.part, "head", "정면에 붙으면 머리"); assert.equal(f.aimed, false);
  hero.x = 9; hero.y = 5; f = E.forecast(S, hero, dr, null).a; assert.equal(f.part, "tail", "뒤에 붙으면 꼬리");
  hero.x = 7; hero.y = 3; f = E.forecast(S, hero, dr, null).a; assert.equal(f.part, "wings", "옆 가운데는 날개");
  hero.x = 6; hero.y = 3; f = E.forecast(S, hero, dr, null).a; const plain = f.hit; assert.equal(f.part, "legs");
  hero.aim = [6, 5]; f = E.forecast(S, hero, dr, null).a; assert.equal(f.part, "legs", "근접은 닿지 않는 칸을 노릴 수 없다");
  hero.aim = [6, 4]; f = E.forecast(S, hero, dr, null).a; assert.equal(f.aimed, true); assert.ok(f.hit < plain || f.hit === 0, "노리면 명중이 떨어진다"); assert.equal(f.pmul, 3, "창으로 다리를 노리면 찌르기 ×1.5 × 노리기 ×2");
  assert.equal(E.cutOf({ name: "전투 망치", type: "axe" }), "blunt"); assert.equal(E.cutOf({ name: "철의 검", type: "sword" }), "cut"); assert.equal(E.cutOf({ name: "장궁", type: "bow" }), "pierce");
  hero.x = 5; hero.y = 5; hero.aim = null; dr.hp = 999; dr.parts.head.hp = 1; const ev = [];
  for (let i = 0; i < 30 && !dr.parts.head.broken; i++) { hero.hp = 999; hero.x = 5; hero.y = 5; E.actAttack(S, hero, dr, null, ev); dr.face = [-1, 0]; }
  assert.ok(dr.parts.head.broken, "머리가 부서진다"); assert.equal(dr.stun, 1); assert.ok(B.loot.some((t) => t.includes("머리")));
  const evs = []; E.endTurn(S, evs); assert.ok(S.log.some((l) => l.text.includes("기절")), "기절하면 한 턴 쉰다");
  Object.assign(S.defs[hero.ref].stats, S2);
});
function arena(foes, map) {
  const S = E.fresh(); S.seed = 11; S.hunt = true; E.ensureBase(S); const d = E.demo();
  E.loadEncounter(S, { name: "시험장", map: map || Array(9).fill("............"), objective: { type: "rout" }, units: d.units.concat(foes.map((f, i) => ({ id: "m" + i, preset: f, level: 10 }))), place: [{ ref: d.place[0].ref, team: "ally", x: 1, y: 1 }].concat(foes.map((f, i) => ({ ref: "m" + i, team: "enemy", x: 10, y: 2 + i * 4 }))) });
  const B = S.battle, hero = Object.values(B.units).find((u) => u.team === "ally"), mons = Object.values(B.units).filter((u) => u.team !== "ally");
  Object.assign(S.defs[hero.ref].stats, { str: 60, skl: 70, spd: 30, hp: 99 }); S.defs[hero.ref].weapons = [{ name: "시험 창", type: "lance", mt: 7, hit: 100, crit: 0, rmin: 1, rmax: 1 }]; hero.wi = 0; hero.hp = 99; return { S, B, hero, mons };
}
test("방향: 옆·뒤에서 치면 명중·필살이 오른다", () => {
  const { S, hero, mons: [w] } = arena(["회색 늑대"]); w.x = 5; w.y = 5; w.face = [-1, 0];
  hero.x = 4; hero.y = 5; const f0 = E.forecast(S, hero, w, null).a; hero.x = 5; hero.y = 4; const f1 = E.forecast(S, hero, w, null).a; hero.x = 6; hero.y = 5; const f2 = E.forecast(S, hero, w, null).a;
  assert.deepEqual([f0.flank, f1.flank, f2.flank], ["front", "side", "back"]); assert.ok(f2.crit >= f0.crit + 10); assert.ok(f1.hit >= f0.hit || f1.hit === 100);
});
test("브레이크: 배후·머리·약점으로 깎이고 0이면 쓰러져 한 턴 쉬고 더 아프다", () => {
  const { S, hero, mons: [b] } = arena(["불곰"]); assert.equal(b.brkMax, 5);
  b.x = 5; b.y = 5; b.hp = 999; const ev = [];
  for (let i = 0; i < 40 && !b.down; i++) { b.face = [-1, 0]; hero.x = 7; hero.y = 5; hero.hp = 99; E.actAttack(S, hero, b, null, ev); b.x = 5; b.y = 5; }
  assert.ok(b.down, "쓰러진다"); hero.x = 7; hero.y = 5; assert.ok(E.forecast(S, hero, b, null).a.downed);
  E.endTurn(S, []); assert.ok(S.log.some((l) => l.text.includes("일어남"))); assert.equal(b.brk, b.brkMax);
});
test("밀치기: 창·둔기는 한 칸 밀고, 벽에 부딪히면 피해, 용암에 빠지면 탄다", () => {
  const { S, B, hero, mons: [w] } = arena(["회색 늑대"], ["............", "............", "............", "............", "......l.....", "............", "............", "............", "............"]);
  S.defs[hero.ref].weapons = [{ name: "철의 창", type: "lance", mt: 7, hit: 100, crit: 0, rmin: 1, rmax: 1 }]; hero.wi = 0; w.hp = 999;
  let pushed = false; for (let i = 0; i < 10 && !pushed; i++) { w.x = 5; w.y = 4; hero.x = 4; hero.y = 4; hero.hp = 99; E.actAttack(S, hero, w, null, []); pushed = w.x === 6; }
  assert.ok(pushed, "한 칸 밀린다"); assert.ok(S.log.some((l) => l.text.includes("용암에 빠짐")));
  let bump = false; for (let i = 0; i < 10 && !bump; i++) { w.x = 11; w.y = 4; hero.x = 10; hero.y = 4; hero.hp = 99; E.actAttack(S, hero, w, null, []); bump = S.log.at(-1).text.includes("벽에 부딪힘"); }
  assert.ok(bump, "판 끝에서는 부딪힌다"); void B;
});
test("공격 예고: 큰 몬스터가 앞쪽을 예고하고 다음 적 턴에 터뜨리며, 쓰러지면 끊긴다", () => {
  const { S, B, hero, mons: [dr] } = arena(["화룡"]); dr.x = 6; dr.y = 3; dr.face = [-1, 0]; dr.ai = "hold"; hero.x = 0; hero.y = 0;
  E.endTurn(S, []); assert.ok(dr.tele, "예고를 건다"); const c = dr.tele.cells[0]; hero.x = c[0]; hero.y = c[1]; hero.hp = 99;
  const h0 = hero.hp; E.endTurn(S, []); assert.ok(hero.hp < h0, "예고 칸에 있으면 맞는다"); assert.ok(!dr.tele); assert.equal(dr.tcd, 2);
  dr.tcd = 0; dr.tele = { cells: [[1, 1]], n: "브레스" }; dr.brk = 1; dr.face = [-1, 0]; dr.hp = 999; hero.x = dr.x + 3; hero.y = dr.y + 1;
  for (let i = 0; i < 20 && !dr.down; i++) { hero.hp = 99; hero.x = dr.x + 3; hero.y = dr.y + 1; dr.face = [-1, 0]; E.actAttack(S, hero, dr, null, []); }
  assert.ok(dr.down && !dr.tele, "브레이크로 예고가 끊긴다"); void B;
});
test("연계: 같은 턴에 같은 부위를 이어 치면 부위 피해·명중이 오른다", () => {
  const { S, hero, mons: [dr] } = arena(["화룡"]); dr.x = 6; dr.y = 3; dr.face = [-1, 0]; dr.hp = 999; hero.x = 5; hero.y = 4;
  const f0 = E.forecast(S, hero, dr, null).a; S.battle.combo = { id: dr.id, part: f0.part, n: 2, turn: S.battle.turn, phase: S.battle.phase };
  const f2 = E.forecast(S, hero, dr, null).a; assert.equal(f2.combo, 2); assert.ok(Math.abs(f2.pmul - f0.pmul * 1.5) < 1e-9);
});
test("폭약통: 밀려 부딪히면 터져 둘레에 피해, 통은 사라진다", () => {
  const { S, B, hero, mons: [w] } = arena(["회색 늑대"], ["............", "............", "............", "............", "......x.....", "............", "............", "............", "............"]);
  w.hp = 999; let boom = false; for (let i = 0; i < 10 && !boom; i++) { w.x = 5; w.y = 4; hero.x = 4; hero.y = 4; hero.hp = 99; E.actAttack(S, hero, w, null, []); boom = B.map[4][6] === "."; }
  assert.ok(boom, "통이 터진다"); assert.ok(S.log.some((l) => l.text.includes("폭발")));
});
test("패턴: 큰 몬스터는 반쯤 다치면 분노, 둘러싸이면 꼬리 휩쓸기", () => {
  const { S, B, hero, mons: [dr] } = arena(["화룡"]); const d = E.demo(); void d;
  dr.x = 5; dr.y = 3; dr.face = [-1, 0]; dr.hp = Math.floor(S.defs[dr.ref].stats.hp * .45); dr.roared = true;
  const mate = Object.values(B.units).find((u) => u.team === "ally" && u.id !== hero.id) || hero; hero.x = 8; hero.y = 4; // 뒤
  E.endTurn(S, []); assert.ok(dr.rage, "분노"); assert.ok(S.log.some((l) => l.text.includes("꼬리 휩쓸기")), S.log.slice(-4).map((l) => l.text).join(" / ")); void mate;
});
test("난이도: 쉬움은 예고 피해가 약하고, 어려움은 상대를 덮는 쪽으로 예고한다", () => {
  const { S, hero, mons: [dr] } = arena(["화룡"]); S.diff = 2; dr.x = 6; dr.y = 3; dr.face = [-1, 0]; dr.ai = "hold"; hero.x = 7; hero.y = 7;
  E.endTurn(S, []); assert.ok(dr.tele, "예고"); assert.ok(dr.tele.cells.some(([x, y]) => x === hero.x && y === hero.y), "어려움은 아군 쪽으로 돌려 노린다");
});
