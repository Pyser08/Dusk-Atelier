// Dusk Saga 상태이상·지원 기술·무기 개성·직업 장비
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

const T = `전장 시험 | 맵 평원 | 목표 rout
기술 "새벽 기도" 양질 지원 동료 하나를 회복시킨다
기술 "침묵의 경문" 희귀 지원 적의 입을 막는 저주(침묵)
기술 "맹독 안개" 희귀 지원 독을 퍼뜨린다
아군 "카일" 마도사 인간 Lv8 m
아군 "세린" 사제 엘프 Lv7 f 익힘 "새벽 기도"
적 "오르반" 암흑술사 Lv10 m 익힘 "침묵의 경문", "맹독 안개"
적 회색 늑대 Lv5`;
const setup = () => { const S = E.fresh(); S.seed = 4; S.hunt = true; S.noBalance = true; E.ensureBase(S); E.loadCompact(S, T); const us = Object.values(S.battle.units), by = (n) => us.find((u) => S.defs[u.ref].name === n); return { S, by }; };
test("직업에 맞는 장비만 든다", () => {
  const { S, by } = setup(); assert.deepEqual(S.defs[by("카일").ref].weapons.map((w) => w.type), ["tome"]); assert.ok(S.defs[by("세린").ref].weapons.every((w) => w.type === "staff" || w.type === "item"));
});
test("지원 기술: 회복·침묵(기술 봉인)·독(턴마다 피해)", () => {
  const { S, by } = setup(); const serin = by("세린"), kyle = by("카일"), orb = by("오르반"); kyle.hp = 5; serin.x = kyle.x; serin.y = kyle.y + 1;
  const o = E.options(S, serin).find((q) => q.kind === "support"); assert.ok(o && o.targets.includes(kyle.id)); E.actSupport(S, serin, kyle, o.art, []); assert.ok(kyle.hp > 5); assert.ok(serin.cd[o.art] > 0);
  E.addFx(S, serin, "silence"); assert.ok(!E.options(S, serin).some((q) => q.kind === "support" || q.kind === "heal"), "침묵이면 지원·지팡이 못 씀");
  E.addFx(S, kyle, "poison"); const h0 = kyle.hp = 20; S.battle.phase = "enemy"; E.endTurn(S, []); assert.ok(kyle.hp < h0 || S.log.some((l) => l.text.includes("독")), "독 피해"); void orb;
});
test("빙결은 한 턴 쉬고, 상태 보정이 예측에 들어간다", () => {
  const { S, by } = setup(); const kyle = by("카일"), wolf = Object.values(S.battle.units).find((u) => S.defs[u.ref].name === "회색 늑대"); wolf.x = kyle.x + 1; wolf.y = kyle.y;
  const f0 = E.forecast(S, kyle, wolf, null).a; E.addFx(S, kyle, "might"); E.addFx(S, wolf, "shred"); const f1 = E.forecast(S, kyle, wolf, null).a; assert.ok(f1.dmg >= f0.dmg + 5, f0.dmg + "→" + f1.dmg);
  E.addFx(S, wolf, "freeze"); E.endTurn(S, []); assert.ok(S.log.some((l) => l.text.includes("빙결")));
});
test("무기 개성: 종류·속성·이름으로 부가 효과가 다르고, 맞히면 걸린다", () => {
  const a = E.weaponFx({ kind: "katana", name: "월광", grade: 5 }), b = E.weaponFx({ kind: "hammer", name: "파쇄", grade: 5 }), c = E.weaponFx({ kind: "sword", name: "불꽃 검", elem: "fire", grade: 16 });
  assert.ok(a.bleed && a.crit); assert.ok(b.shred && b.stun); assert.ok(c.burn && c.affix, JSON.stringify(c));
  const { S, by } = setup(); const kyle = by("카일"), wolf = Object.values(S.battle.units).find((u) => S.defs[u.ref].name === "회색 늑대");
  S.defs[kyle.ref].weapons = [{ name: "맹독 침", type: "dagger", kind: "needle", mt: 3, hit: 100, crit: 0, rmin: 1, rmax: 1 }]; kyle.wi = 0; Object.assign(S.defs[kyle.ref].stats, { skl: 60, str: 10 });
  let got = false; for (let i = 0; i < 20 && !got; i++) { wolf.hp = 99; wolf.x = kyle.x + 1; wolf.y = kyle.y; kyle.hp = 99; delete wolf.fx; E.actAttack(S, kyle, wolf, null, []); got = !!(wolf.fx && wolf.fx.poison); }
  assert.ok(got, "독침은 독을 건다");
});
test("줄 형식: 기술 id 없이 이름만, 굵은 글씨·번호·콜론도 읽는다", () => {
  const j = E.parseCompact(`**전장:** 폐광 | 맵 동굴\n1. 기술: "광부의 노래" 보통 지원 동료를 북돋는다(강화)\n2. 아군: "벤" 격투가 Lv4 익힘 "광부의 노래"\n3. 적군: 거대 쥐 Lv3 x2`);
  assert.equal(j.name, "폐광"); assert.equal(j.units.length, 3); assert.equal(j.skills[0].type, "support"); assert.equal(j.skills[0].eff, "might"); assert.deepEqual(j.units[0].skills, [j.skills[0].id]);
});
