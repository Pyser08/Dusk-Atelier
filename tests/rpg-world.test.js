// Dusk Saga 세계: 시대·화폐·상점·의뢰·랭크
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

test("세계 읽기·화폐 표기", () => {
  const L = E.freshLedger(); assert.equal(E.worldOf(L).era, "fantasy"); assert.equal(E.fmtMoney(L, 12345), "1금화 23은화 45동화"); assert.equal(E.parseMoney(L, "3은화 5동화"), 305);
  L.world = E.parseWorld("시대 현대\n길드 헌터 협회 | 랭크 F,E,D,C,B,A,S\n화폐 원 | 단위 원=1\n물가 3000\n상점 무기상, 편의점", L.world); assert.equal(L.world.guild.name, "헌터 협회"); assert.equal(E.fmtMoney(L, 52000), "52,000원"); assert.equal(L.world.shops.length, 2);
});
test("상점: 사고팔기 값", () => {
  const L = E.freshLedger(); const st = E.stock(L, "대장간", 3); assert.ok(st.length >= 4 && st.every((x) => x.price > 0));
  E.addMat(L, "gem_ruby"); const it = L.bag.find((b) => b.mid === "gem_ruby"); assert.ok(E.sellPrice(L, it) < E.valueOf(L, it));
  E.earn(L, 100); assert.ok(!E.pay(L, 1000)); assert.ok(E.pay(L, 60)); assert.equal(E.wallet(L), 40);
});
test("의뢰: 읽기·수락·토벌 완료·납품·랭크", () => {
  const L = E.freshLedger(); const qs = E.parseQuests(L, '의뢰 "늑대 퇴치" | 의뢰인 마을 이장 | 종류 토벌 | 대상 늑대 x1 | 보상 3은화 | 랭크 E | 가축을 물어 간다\n의뢰 "약초 모으기" | 의뢰인 약방 | 종류 채집 | 대상 푸른 약초 x2 | 보상 50동화 | 랭크 F');
  assert.equal(qs.length, 2); assert.equal(qs[0].about, "가축을 물어 간다"); assert.equal(qs[0].reward, 300); E.addQuests(L, qs);
  assert.ok(E.takeQuest(L, qs[0].id)); assert.ok(E.takeQuest(L, qs[1].id));
  const S = E.fresh(); E.ensureBase(S); E.loadEncounter(S, E.demo()); const z = Object.values(S.battle.units).find((u) => u.team === "enemy"); S.defs[z.ref].name = "늑대"; z.hp = 0; S.battle.status = "victory";
  E.questsFromBattle(L, S); assert.equal(qs[0].status, "done"); assert.equal(E.wallet(L), 300);
  E.addMat(L, "herb_green", 2); assert.ok(E.deliver(L, qs[1].id)); assert.equal(qs[1].status, "done"); assert.equal(E.wallet(L), 350); assert.ok(L.world.guild.rep >= 30);
  assert.match(E.worldLine(L), /모험가 길드 랭크/);
});
test("이야기 속 돈 표시", () => { const L = E.freshLedger(); E.worldOf(L); assert.equal(E.applyMoneyMarks(L, "…[[돈: +2은화 사냥 보상]] 그리고 [[돈: -50동화 여관비]]"), 2); assert.equal(E.wallet(L), 150); });
