import test from "node:test";
import assert from "node:assert/strict";
import { RACES, RACE_BY_ID, raceIdOf, raceReport, raceFor, heatOf, raceLustK, raceFert, raceZones, raceSection, raceWeather, moonPhase, RACE_STAGE1 } from "../src/engine/races.js";
import { extraFrom, applyExtra } from "../src/engine/memextra.js";
import { gateReports } from "../src/engine/fertility.js";
import { partOf, BODY_PARTS } from "../src/engine/humanitems.js";
import { statusCardHtml } from "../src/engine/namecard.js";
import { seedZones } from "../src/data/nsfwturn.js";

const doc = (id, title) => ({ id, type: "Character", title, aliases: [], sections: [] });

test("종족 표: 이름 → 종족(가장 길게 맞는 것), 성격·말솜씨 특성은 없음", () => {
  for (const [t, id] of [["하프엘프", "halfelf"], ["고양이 요괴", "nekomata"], ["고양이 수인", "cat"], ["타락천사", "fallen"], ["늑대인간", "werewolf"], ["늑대 수인", "wolf"], ["여우 수인", "fox"], ["구미호", "gumiho"], ["서큐버스", "succubus"], ["리자드맨", "lizard"], ["인간", "human"]]) assert.equal(raceIdOf(t), id, t);
  assert.equal(raceIdOf("알 수 없는 무언가"), "");
  const bad = /카리스마|거짓말|교활|자존심|오만|성질|변덕|충성|겁이 많|다혈질|명예|냉소|장난스러|당당|느긋|고집/;
  for (const r of RACES) { assert.doesNotMatch(`${r.gen ?? ""} ${r.nsfw ?? ""}`, bad, r.id); assert.ok(r.gen, `${r.id} 일반 특성`); }
  assert.ok(RACES.filter((r) => r.frame === "beast").length >= 25, "수인 종류");
  assert.ok(!RACE_BY_ID.mantis.nsfw.includes("공격"), "사마귀 습성 뺌");
  assert.match(RACE_BY_ID.mermaid.gen, /물을 자주 마시/, "수생은 물 마시면 괜찮음(완화)");
  assert.match(RACE_BY_ID.vampire.gen, /보통 음식/, "흡혈귀 완화");
});

test("기록기 줄 → 종족 저장, 표에 없는 이름은 틀로, 직접 고른 건 기록기가 안 바꿈", () => {
  assert.match(RACE_STAGE1, /^\nrace\|/);
  const rep = extraFrom("race|세라|엘프\nrace|유나|은빛 늑대족|beast\nrace|{{user}}|엘프\nrace|미오|별빛족|holy", (n) => n, { race: true });
  assert.deepEqual(rep.map((r) => [r.name, r.id, r.label]), [["세라", "elf", ""], ["유나", "wolf", "은빛 늑대족"], ["미오", "angel", "별빛족"]]);
  assert.equal(extraFrom("race|세라|엘프", (n) => n).length, 0, "설정 꺼지면 버림");
  const f = { wiki: { documents: { a: doc("a", "세라") } } };
  applyExtra(f, rep, { turn: 1 });
  assert.equal(raceFor(f, "세라").id, "elf"); assert.equal(raceFor(f, "유나").label, "은빛 늑대족"); assert.equal(raceFor(f, "없는 사람").id, "human");
  f.extra.race["세라"].manual = true;
  applyExtra(f, [{ kind: "race", name: "세라", id: "dwarf", label: "" }], { turn: 2 });
  assert.equal(raceFor(f, "세라").id, "elf", "직접 고른 종족 유지");
});

test("발정기: 계절(고양이 봄·가을), 주기(토끼), 보름(늑대인간), 남반구는 계절 반대", () => {
  const cat = RACE_BY_ID.cat;
  const days = (from, n) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1 + from + i)).toISOString().slice(0, 10));
  assert.ok(days(80, 40).some((d) => heatOf(cat, d, { seed: "a" }).on), "4월 무렵 발정");
  assert.ok(!days(170, 40).some((d) => heatOf(cat, d, { seed: "a" }).on), "7월엔 없음");
  assert.ok(days(250, 40).some((d) => heatOf(cat, d, { seed: "a", hemi: "S" }).on), "남반구는 9~10월이 봄 발정");
  const rab = days(0, 14).filter((d) => heatOf(RACE_BY_ID.rabbit, d, { seed: "r" }).on).length;
  assert.ok(rab >= 4 && rab <= 8, `토끼 2주에 ${rab}일`);
  assert.ok(Math.abs(moonPhase("2026-11-24") - 0.5) < 0.06, "2026-11-24 보름");
  assert.equal(heatOf(RACE_BY_ID.werewolf, "2026-11-24").on, true);
  assert.equal(heatOf(RACE_BY_ID.human, "2026-11-24").on, false);
  assert.ok(raceLustK(RACE_BY_ID.werewolf, "2026-11-24").k > 1.5);
  assert.ok(raceLustK(RACE_BY_ID.highelf, "2026-06-01").k < 1);
  assert.equal(heatOf(cat, "1023-04-10", { cal: { months: 13, mdays: 28 }, seed: "a" }).label !== undefined, true, "판타지 달력도 계산");
});

test("임신: 인간×수인 가능, 본인 조절(서큐버스) 기본 막힘, 불가 종족, 드문 종족은 확률 낮춤", () => {
  assert.equal(raceFert(RACE_BY_ID.cat).k, 1, "수인 임신 가능");
  assert.equal(raceFert(RACE_BY_ID.succubus).k, 0); assert.match(raceFert(RACE_BY_ID.succubus).label, /원할 때만/);
  assert.equal(raceFert(RACE_BY_ID.vampire).k, 0); assert.equal(raceFert(RACE_BY_ID.elf).k, 0.2);
  const rep = [{ name: "세라", sex: [{ partner: "{{user}}", contraception: "none" }] }];
  const open = gateReports(rep, () => ({ race: RACE_BY_ID.succubus }), { rng: () => 0 });
  assert.equal(open.reports[0].sex[0].contraception, "used", "서큐버스는 막힘"); assert.match(open.log[0], /원할 때만/);
  assert.equal(gateReports(rep, () => ({ race: RACE_BY_ID.cat }), { rng: () => 0 }).reports[0].sex[0].contraception, "none");
});

test("성감대·모형 부위: 종족 기본값 시드(직접 고친 건 유지), 꼬리뼈는 허리 뒤·꼬리는 꼬리 뿌리", () => {
  assert.equal(partOf("꼬리뼈").id, "lowback"); assert.equal(partOf("꼬리 뿌리").id, "tail"); assert.equal(partOf("날개").id, "wings"); assert.equal(partOf("뿔").id, "horns");
  assert.ok(BODY_PARTS.filter((p) => p.race).length === 3);
  const f = { wiki: { documents: { a: doc("a", "세라") } }, nsfw: { a: { sexual: { eroticInterest: 50 }, zones: [{ part: "ears", level: 1, note: "직접", src: "manual" }], zonesSeeded: true } }, extra: { race: { 세라: { name: "세라", id: "fox" } } } };
  seedZones(f, ["세라"]);
  const z = f.nsfw.a.zones; assert.equal(z.find((x) => x.part === "ears").level, 1, "직접 고친 귀 유지"); assert.equal(z.find((x) => x.part === "tail").level, 3, "여우 꼬리");
  assert.equal(f.nsfw.a.raceSeeded, "fox");
  const before = JSON.stringify(f.nsfw.a); seedZones(f, ["세라"]); assert.equal(JSON.stringify(f.nsfw.a), before, "한 번만");
  assert.deepEqual(raceZones(RACE_BY_ID.human), []);
});

test("주입·상태창: 인간이 아닌 종족만, 몸·체질만, 날씨 반응은 가볍게", () => {
  const f = { wiki: { documents: { a: doc("a", "세라"), b: doc("b", "유나") } }, nsfw: { a: { sexual: { eroticInterest: 50 } } }, extra: { race: { 세라: { name: "세라", id: "vampire" }, 유나: { name: "유나", id: "human" } } } };
  const s = raceSection(f, ["세라", "유나"], { iso: "2026-07-01", weather: "맑음", temp: 30 });
  assert.match(s, /never let it override the character's own personality/); assert.match(s, /세라 — 흡혈귀/); assert.doesNotMatch(s, /유나/);
  assert.match(s, /날씨: 강한 햇빛이 불편/); assert.match(s, /목이 아주 예민/, "성인 프로필 있으면 NSFW 체질");
  assert.deepEqual(raceWeather(RACE_BY_ID.vampire, "맑음", 20, true), [], "밤엔 햇빛 반응 없음");
  const h = statusCardHtml(f, f.wiki.documents.a, { when: "2026-07-01 13:00" });
  assert.match(h, /🧬 흡혈귀/); assert.match(h, /종족 체질/);
  assert.doesNotMatch(statusCardHtml(f, f.wiki.documents.b), /🧬/, "인간은 배지 없음");
});
