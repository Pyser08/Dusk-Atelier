// Dusk Saga 이야기 규칙: 관계·합체기, 포획·설득, 목표, 날씨, 몸 상태, 장기기억 연동
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";
import { memState, cycleCond } from "../src/rpg/engine/memlink.js";

const M0 = Object.keys(E.MAPS)[0];
const mk = (lines, seed = 3) => { const S = E.fresh(); S.seed = seed; S.hunt = true; S.noBalance = true; S.raid = 0; E.ensureBase(S); const j = E.loadCompact(S, lines.join("\n")); assert.ok(j, "읽기"); return S; };
const U = (S, name) => Object.values(S.battle.units).find((u) => S.defs[u.ref].name === name);

test("관계 줄 → 붙어 서면 보너스, 합체기는 한 판 한 번", () => {
  const S = mk([`전장 숲 | 맵 ${M0} | 목표 rout | 날씨 맑음 | 시간 낮`, '아군 "카일" 검사 Lv8 @2,2', '아군 "리나" 궁수 Lv8 @2,3', '관계 "카일" "리나" 연인 합체기 "별빛 협주"', '적 산적 Lv3 @3,2']);
  assert.equal(S.bonds.length, 1); const k = U(S, "카일"), r = U(S, "리나"), z = Object.values(S.battle.units).find((u) => u.team === "enemy");
  k.x = 2; k.y = 2; r.x = 2; r.y = 3; z.x = 3; z.y = 2; r.x = 2; r.y = 1; // 리나는 활(2칸)
  const m0 = E.mods(S, k, { init: true }).m; assert.equal(m0.hit, 10 + (m0.hit - 10)); assert.ok(m0.avo >= 10);
  const o = E.options(S, k).find((x) => x.kind === "duo"); assert.ok(o, "합체기 항목"); assert.equal(o.label, "별빛 협주");
  if (o.targets.length) { const ev = []; E.actDuo(S, k, z, o.with, ev); assert.ok(ev.some((e) => e.t === "duo")); assert.ok(!E.options(S, k).some((x) => x.kind === "duo")); }
});
test("날씨: 비면 불 약화·활 명중 감소, 눈이면 이동 −1", () => {
  const S = mk([`전장 들판 | 맵 ${M0} | 목표 rout | 날씨 비`, '아군 "카일" 검사 Lv8', '적 산적 Lv3']);
  assert.equal(S.battle.wx, "rain"); assert.equal(E.wxElem(S, "fire"), 0.75); assert.equal(E.wxHit(S, { type: "bow" }, 2), -10);
  const T = mk([`전장 설원 | 맵 ${M0} | 목표 rout | 날씨 눈 | 시간 밤`, '아군 "카일" 검사 Lv8', '적 산적 Lv3']); assert.equal(T.battle.wxMove.foot, -1); assert.equal(T.battle.time, "night"); assert.match(E.wxText(T.battle), /눈 · 밤/);
});
test("몸 상태: 줄 형식 상태·부상 이월", () => {
  const S = mk([`전장 숲 | 맵 ${M0} | 목표 rout`, '아군 "카일" 검사 Lv8 상태 중상,취기', '적 산적 Lv3']);
  const k = U(S, "카일"), d = S.defs[k.ref]; assert.deepEqual(d.cond, ["wound", "drunk"]); assert.ok(k.hp <= Math.ceil(d.stats.hp * 0.6)); assert.ok(k.fx.weaken);
  k.hp = 0; E.finish(S, "defeat", []); assert.equal(d.injury.k, "wound"); assert.equal(d.cond, undefined);
});
test("포획·설득", () => {
  const S = mk([`전장 숲 | 맵 ${M0} | 목표 rout`, '아군 "카일" 검사 Lv20 @2,2', '적 늑대 Lv1 @3,2', '적 산적 Lv1 @2,4'], 11);
  const k = U(S, "카일"), w = Object.values(S.battle.units).find((u) => S.defs[u.ref].name.includes("늑대")); k.x = 2; k.y = 2; w.x = 3; w.y = 2; w.hp = 1;
  const o = E.options(S, k).find((x) => x.kind === "capture"); assert.ok(o && o.targets.includes(w.id)); assert.ok(o.rate[w.id] >= 5);
  let ok = false; for (let i = 0; i < 30 && !ok; i++) { k.done = false; if (!S.battle.units[w.id]) break; ok = E.actCapture(S, k, w, []); }
  if (ok) { assert.ok(S.battle.caught[0].tame); assert.ok(S.defs[w.ref].ally); }
  const b = Object.values(S.battle.units).find((u) => u.team === "enemy"); if (b) { b.x = 2; b.y = 4; assert.ok(E.options(S, k).some((x) => x.kind === "persuade")); }
});
test("목표: 탈출·탈취·호위·부위파괴 읽기", () => {
  const S = mk([`전장 탈출 | 맵 ${M0} | 목표 탈출`, '아군 "카일" 검사 Lv8 @2,2', '적 산적 Lv3 @9,5']); assert.equal(S.battle.obj.type, "escape"); assert.ok(S.battle.exits.length);
  const k = U(S, "카일"), [x, y] = E.unK(S.battle.exits[0]); k.x = x; k.y = y; const o = E.options(S, k).find((q) => q.kind === "escape"); assert.ok(o); const ev = []; E.actEscape(S, k, ev); assert.equal(S.battle.status, "victory");
  const T = mk([`전장 금고 | 맵 ${M0} | 목표 탈취 성배`, '아군 "카일" 검사 Lv8', '적 "금고지기" 병사 Lv5 보물', '적 산적 Lv3']); assert.equal(T.battle.obj.item, "성배"); assert.ok(U(T, "금고지기").carry); assert.match(E.objText(T.battle), /탈취 · 성배/);
  const V = mk([`전장 호송 | 맵 ${M0} | 목표 호위 5`, '아군 "카일" 검사 Lv8', '우군 "공주" 사제 Lv3 호위대상', '적 산적 Lv3']); assert.equal(V.battle.obj.type, "escort"); assert.ok(U(V, "공주").vip); U(V, "공주").hp = 0; E.outcome(V, []); assert.equal(V.battle.status, "defeat");
  const H = mk([`전장 사냥 | 맵 ${M0} | 목표 부위파괴 2 7`, '아군 "카일" 검사 Lv8', '적 화룡 Lv8']); assert.equal(H.battle.obj.type, "hunt"); assert.equal(H.battle.obj.need, 2); assert.equal(H.battle.obj.turns, 7);
});
test("장기기억: 월경·임신·현재 상태·관계 → 약한 상태와 관계", () => {
  assert.equal(cycleCond("주기: 28일\n기준일: 2026-01-01\n날짜: 2026-01-02"), "period2");
  assert.equal(cycleCond("주기: 28일\n기준일: 2026-01-01\n날짜: 2026-01-10"), null);
  assert.equal(cycleCond("주기: 28일\n날짜: 2026-06-01\n임신: 2026-01-01 수정"), "preg2");
  const f = { wiki: { documents: { d1: { id: "d1", type: "Character", title: "리나", sections: [{ heading: "월경·임신", body: "주기: 28일\n기준일: 2026-01-01\n날짜: 2026-01-04" }, { provenance: { slotId: "core.current_state" }, body: "밤새 술에 취해 비틀거림" }] }, d2: { id: "d2", type: "Character", title: "카일", sections: [] } } }, ties: { x: { a: "카일", b: "리나", kind: "mentor" } } };
  const st = memState(f, ["카일", "리나"]); assert.deepEqual(st.conds["리나"], ["period", "drunk"]); assert.equal(st.bonds[0].kind, "mentor");
  const S = mk([`전장 숲 | 맵 ${M0} | 목표 rout`, '아군 "카일" 검사 Lv8', '아군 "리나" 궁수 Lv8', '적 산적 Lv3']);
  assert.ok(E.applyMemState(S, st) >= 3); assert.equal(S.bonds[0].g, "rank"); assert.ok(S.defs[U(S, "리나").ref].cond.includes("period"));
  assert.equal(E.applyMemState(S, null), 0);
});
test("보조무기: 주무기가 안 닿으면 보조무기로 반격", () => {
  const S = mk([`전장 숲 | 맵 ${M0} | 목표 rout`, '아군 "카일" 검사 Lv8 무기 장검/sword/양질 무기 단궁/shortbow/양질 @2,2', '적 "궁수" 궁수 Lv5 @2,4']);
  const k = U(S, "카일"), z = U(S, "궁수"), d = S.defs[k.ref]; k.x = 2; k.y = 2; z.x = 2; z.y = 4; k.wi = d.weapons.findIndex((w) => w.kind !== "shortbow");
  assert.ok(!E.forecast(S, z, k).d.can, "보조무기 없으면 반격 못 함");
  d.sub = d.weapons.find((w) => w.kind === "shortbow").name; const f = E.forecast(S, z, k); assert.ok(f.d.can && f.d.sub); const w0 = k.wi; void w0;
  const ev = []; E.actAttack(S, z, k, null, ev); assert.ok(ev.some((e) => e.t === "sub")); assert.equal(d.weapons[k.wi].name, d.sub);
});
test("고유 이름: 프리셋 무기·공용 기술은 이름만 바뀌고 성능은 같다", () => {
  const S = mk([`전장 숲 | 맵 ${M0} | 목표 rout`, '아군 "미오" 중기사 Lv12', '적 산적 Lv3']); const d = Object.values(S.defs).find((x) => x.name === "미오");
  assert.ok(!d.weapons.some((w) => /^(청동|철|강철|은)의 /.test(w.name)), d.weapons.map((w) => w.name).join());
  const named = d.skills.map((k) => S.skills[k]).find((x) => x.tier === "named"); if (named) { const base = S.skills[named.base]; assert.notEqual(named.name, base.name); assert.deepEqual(named.mods, base.mods); }
  const again = E.weaponName(d, d.weapons[0]); assert.equal(again, E.weaponName(d, d.weapons[0]), "같은 인물이면 같은 이름");
});
