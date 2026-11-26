// Dusk Saga 장부: 전투가 끝나면 부순 부위가 소재로 쌓이고, 정비·제작이 동료에게 실제로 반영되며, 다음 입력에 실릴 기록이 남는다
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

function won() {
  const S = E.fresh(); S.seed = 9; S.hunt = true; E.ensureBase(S);
  E.loadCompact(S, `전장 화룡 사냥 | 맵 평원 | 목표 rout\n아군 "카일" 창병 인간 Lv10 m\n아군 "세린" 검사 엘프 Lv9 f\n적 화룡 Lv10 보스\n적 회색 늑대 Lv5`);
  const B = S.battle, dr = Object.values(B.units).find((u) => u.sz === 3), wolf = Object.values(B.units).find((u) => u.team === "enemy" && !u.sz);
  dr.parts.head.broken = true; dr.parts.tail.broken = true; dr.hp = 0; wolf.hp = 0; B.status = "victory"; return S;
}
test("전투 정산: 부위 → 소재(크기·보스로 등급), 동료 저장, 기록 한 번만", () => {
  const S = won(), L = E.freshLedger();
  assert.ok(E.settle(L, S)); assert.ok(!E.settle(L, S), "같은 전투는 한 번만");
  const head = L.bag.find((b) => b.part === "head"); assert.ok(head && head.grade === "전설" && head.elem === "fire", JSON.stringify(head));
  assert.ok(L.bag.some((b) => /늑대/.test(b.src || "") && b.part === "body")); assert.equal(Object.keys(L.party.defs).length, 2);
  const t = E.ledgerNote(L); assert.ok(t.includes("화룡 사냥") && t.includes("뿔")); assert.equal(E.ledgerNote(L), "", "한 번 쓰면 비운다");
});
test("정비·제작이 동료 장비에 실제로 반영된다", () => {
  const S = won(), L = E.freshLedger(); E.settle(L, S); const [kyle, serin] = Object.values(L.party.defs);
  const head = L.bag.find((b) => b.part === "head"), tail = L.bag.find((b) => b.part === "tail");
  const w = E.forge(L, [head.id], { kind: "lance", name: "화룡 머리창", to: kyle.id }); assert.ok(w && w.elem === "fire" && kyle.weapons.includes(w)); assert.ok(!L.bag.includes(head));
  const g0 = serin.weapons[0].grade ?? 0; assert.ok(E.temper(L, serin.id, 0, tail.id)); assert.ok(serin.weapons[0].grade > g0);
  assert.ok(E.setMain(L, kyle.id, kyle.weapons.length - 1)); assert.equal(kyle.weapons[0].name, "화룡 머리창");
  assert.ok(E.giveTo(L, kyle.id, 0, serin.id)); assert.ok(serin.weapons.some((x) => x.name === "화룡 머리창"));
  assert.ok(E.ledgerNote(L).includes("제작: 화룡 머리창"));
  // 다음 판으로 넘어간다
  const T = E.fresh(); T.hunt = true; E.ensureBase(T); E.carryParty(L.party, T); assert.ok(T.defs[serin.id].weapons.some((x) => x.name === "화룡 머리창"));
  assert.ok(E.WORKSHOP.test("마을 대장간에 들렀다")); assert.ok(!E.WORKSHOP.test("숲길을 걸었다"));
});
test("결과 한 줄 요약: 채팅 입력으로 넣을 짧은 글", () => {
  const S = won(), t = E.resultLine(S); assert.ok(t.startsWith("[전투 결과 — 화룡 사냥 · 승리 · ")); assert.ok(t.includes("동료: ")); assert.match(E.resultCard(S), /<div style=.*⚔ 승리/); assert.ok(t.includes("부순 부위: 화룡의 머리")); assert.ok(t.includes("쓰러뜨림"));
  S.battle.status = "active"; assert.equal(E.resultLine(S), "");
});
