// Dusk Saga 적은 토큰 생성: 짧은 프롬프트와 한 줄 형식 해석
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

const T = `전장 잿빛 성당의 밤 | 맵 대성당 | 목표 boss
아군 "카일" 검사 인간 Lv8 m
- 아군 "세린" 사제 엘프 Lv7 f 무기 별빛 지팡이/staff/희귀/light
적 해골 전사 Lv7 x3
적 화룡 Lv12 hold
적 "검은 사제 오르반" 암흑술사 Lv10 m 보스 guard @11,5
우군 "떠돌이 기사" 중기사 Lv9 턴3
아무 말이나 덧붙인 줄`;
test("한 줄 형식을 읽어 전투가 선다(크기·부위·버팀은 엔진이 채운다)", () => {
  const j = E.parseCompact(T, "판타지"); assert.equal(j.name, "잿빛 성당의 밤"); assert.equal(j.mapPreset, "대성당"); assert.equal(j.objective.type, "boss");
  assert.equal(j.units.length, 8); assert.equal(j.units[1].weapons[0].elem, "light"); assert.equal(j.place.find((p) => p.boss).ref, "u6"); assert.equal(j.place.at(-1).turn, 3);
  const S = E.fresh(); S.seed = 3; S.hunt = true; E.ensureBase(S); E.loadEncounter(S, j); const us = Object.values(S.battle.units);
  assert.ok(us.some((u) => u.sz === 3 && u.parts && u.brkMax === 7), "화룡은 3칸·부위·버팀"); assert.equal(S.defs[us.find((u) => u.boss).ref].name, "검은 사제 오르반");
  assert.equal(us.filter((u) => u.team === "ally").length, 2); assert.equal(S.battle.obj.type, "boss");
});
test("못 읽는 답은 null, 프롬프트는 예전보다 훨씬 짧다", () => {
  assert.equal(E.parseCompact("그냥 이야기만 했어요"), null);
  const p = E.compactPrompt("판타지"); assert.ok(p.length * 3 < E.GEN_PROMPT.length, p.length + " vs " + E.GEN_PROMPT.length); assert.ok(E.compactPrompt("", true).includes("배경"));
  assert.equal(E.parseCompact('배경 사흘 뒤 국경 숲.\n아군 "카일" 검사 Lv5').premise, "사흘 뒤 국경 숲.");
});
test("지도·기술·★ 강화·성장·이탈·저장된 동료 다시 쓰기", () => {
  const S0 = E.fresh(); S0.seed = 5; S0.hunt = true; E.ensureBase(S0);
  E.loadCompact(S0, `전장 첫 싸움 | 맵 평원 | 목표 rout\n아군 "카일" 검사 인간 Lv8 m\n아군 "세린" 사제 엘프 Lv7 f\n적 회색 늑대 Lv5 x2`);
  const kyle = Object.values(S0.defs).find((d) => d.name === "카일"), serin = Object.values(S0.defs).find((d) => d.name === "세린"); assert.ok(kyle.ally && serin.ally);
  const str0 = kyle.stats.str; kyle.level = 9;
  const S = E.fresh(); S.seed = 6; S.hunt = true; S.noBalance = true; E.ensureBase(S); E.carryParty(S0, S);
  const roster = E.rosterCompact(S); assert.ok(roster.includes("#" + kyle.id) && roster.includes("Lv9"));
  assert.ok(E.compactPrompt("판타지", false, roster).includes("Saved party"));
  const j = E.loadCompact(S, `전장 탑의 꼭대기 | 목표 boss
지도
############
#..........#
#.p..p..p..#
#..........#
...........T
#..........#
#.p..p..p..#
#..........#
############
기술 frost_cut "서리 베기" 희귀 ice 기술 얼음 칼날로 크게 벤다 위력 강함
아군 #${kyle.id} @2,5
아군 "세린" @2,6
적 "탑의 군주 벨제" 암흑술사 Lv12 m ★★ 마력+5 익힘 frost_cut 보스 guard @11,5
적 해골 전사 Lv8 x2
성장 #${kyle.id} 힘+2 속도+1 경험 20 배움 frost_cut | 늑대 무리를 혼자 막아냄
이탈 #${serin.id}`);
  assert.ok(j.map && j.map.length === 9 && !j.mapPreset); assert.equal(S.battle.map[4][11], "T");
  assert.ok(S.skills.frost_cut, "새 기술 " + JSON.stringify(j.skills) + Object.keys(S.skills).join(",")); assert.equal(S.skills.frost_cut.elem, "ice");
  const us = Object.values(S.battle.units), boss = us.find((u) => u.boss), bd = S.defs[boss.ref];
  assert.equal(bd.name, "탑의 군주 벨제"); assert.ok(bd.skills.includes("frost_cut"));
  const plain = E.fresh(); E.ensureBase(plain); E.loadCompact(plain, `전장 x | 맵 평원\n아군 "a" 검사 Lv5\n적 "탑의 군주 벨제" 암흑술사 Lv12 m 보스`); const pd = Object.values(plain.defs).find((d) => d.name === "탑의 군주 벨제");
  assert.ok(bd.stats.mag >= Math.round(pd.stats.mag * 1.45) + 5 - 1, "★★·마력+5가 반영된다 " + bd.stats.mag + " vs " + pd.stats.mag);
  assert.equal(us.filter((u) => u.team === "ally").length, 2, "저장된 동료를 다시 쓴다(새로 만들지 않는다)"); assert.ok(us.some((u) => u.ref === kyle.id));
  assert.equal(S.defs[kyle.id].stats.str, str0 + 2, "성장 반영"); assert.ok(S.defs[kyle.id].skills.includes("frost_cut"));
  assert.ok(S.defs[serin.id].away === true || us.some((u) => u.ref === serin.id), "이탈은 이번 판에 없는 동료에게만");
});
test("밸런스: 적이 너무 많으면 졸개부터 빼고, 직업 이름은 그대로 보이며, 공격하는 아군은 광역기를 갖는다", () => {
  const S = E.fresh(); S.seed = 2; S.hunt = true; S.diff = 1; E.ensureBase(S);
  E.loadCompact(S, `전장 x | 맵 평원\n아군 "최민준" 탱커 인간 Lv12 m 무기 강철 대방패검/sword/희귀\n아군 "하은" 성녀 Lv10 f\n적 회색 늑대 Lv12 x6\n적 "족장" 도끼전사 Lv14 보스`);
  const us = Object.values(S.battle.units), foes = us.filter((u) => u.team === "enemy"); assert.ok(foes.length < 7 && foes.some((u) => u.boss), "졸개가 줄고 보스는 남는다 " + foes.length);
  const mj = S.defs[us.find((u) => S.defs[u.ref].name === "최민준").ref]; assert.equal(mj.cls, "탱커"); assert.equal(mj.job, "중기사"); assert.equal(mj.weapons[0].name, "강철 대방패검", "이야기 무기가 주무기");
  assert.ok(mj.skills.some((k) => S.skills[k].flags.area), "광역기");
});
test("프리셋 없는 몬스터 이름 → 가장 가까운 몬스터(사람형으로 안 떨어짐)·속성·몸집", () => {
  const S = E.fresh(); S.hunt = true; S.noBalance = true; E.ensureBase(S);
  E.loadCompact(S, `전장 동굴 | 맵 ${Object.keys(E.MAPS)[0]} | 목표 rout\n아군 "미오" 마도사 Lv10\n적 "거대 화염 도마뱀" 검사 Lv12 보스\n적 "동굴 트롤" Lv9\n적 "도적 두목" 도적 Lv8`);
  const by = (n) => Object.values(S.defs).find((d) => d.name === n);
  assert.equal(E.modelOf(by("거대 화염 도마뱀")), "lizard"); assert.equal(E.elemOfUnit(by("거대 화염 도마뱀")), "fire"); assert.equal(by("거대 화염 도마뱀").size, 2);
  assert.equal(E.modelOf(by("동굴 트롤")), "cyclops"); assert.equal(by("도적 두목").cls, "도적");
});
