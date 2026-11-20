// 0.3.22 체내 정액량·포화도·피임·강제 피임·출산/유산 이력 → 관계마다 보호 여부(코어 월경 추적은 비보호만 굴림)
import test from "node:test";
import assert from "node:assert/strict";
import { contraOf, addCum, cumNow, saturation, fertilityFactor, preventOf, gateReports, chanceNow, fertilitySection, bodyOf } from "../src/engine/fertility.js";
import { extraFrom, applyExtra } from "../src/engine/memextra.js";
import { applyHumanReports, normZones, extLine } from "../src/engine/humanitems.js";
import { nsfwFrom } from "../src/engine/recorder.js";
import { randomZones } from "../src/engine/zonegen.js";
import { normalizeTheme } from "../src/ui/theme.js";

test("피임 낱말 읽기", () => {
  assert.equal(contraOf("콘돔"), "condom"); assert.equal(contraOf("none"), "none"); assert.equal(contraOf("콘돔이 찢어짐"), "broke");
  assert.equal(contraOf("사후 피임약"), "afterpill"); assert.equal(contraOf("pill"), "pill"); assert.equal(contraOf("used"), "condom");
});
test("체내 정액: 더해지고 반나절마다 반, 포화도는 체형 기준", () => {
  const L = {}; addCum(L, { ml: 5, partner: "A" }, 10, "2026-03-02 22:00"); addCum(L, { ml: 5, partner: "A" }, 10, "2026-03-02 22:00");
  assert.equal(cumNow(L, 10, "2026-03-02 22:00").ml, 10);
  assert.ok(Math.abs(cumNow(L, 10, "2026-03-03 10:00").ml - 5) < 0.01, "12시간 뒤 반");
  assert.ok(cumNow(L, 10 + 6, "").ml < 10, "날짜 없으면 턴으로");
  assert.equal(saturation(55, "small"), 50); assert.equal(saturation(75, "normal"), 50);
  addCum(L, { ml: 9, where: "mouth" }, 11); assert.equal(L.cum.by.A, 10, "입은 체내 양에 안 들어감");
  assert.equal(bodyOf({}, "왜소한 체구"), "small"); assert.equal(bodyOf({ fert: { body: "large" } }), "large");
});
test("양·이력 배수: 양이 많을수록 원래 확률에, 출산 직후·유산 뒤엔 낮게", () => {
  assert.ok(fertilityFactor({}, {}, 0, "", { extraMl: 0.3 }).factor < fertilityFactor({}, {}, 0, "", { extraMl: 4 }).factor);
  assert.equal(fertilityFactor({}, {}, 0, "", { extraMl: 20 }).factor, 1);
  const born = { hist: [{ kind: "birth", at: 0, when: "2026-01-01" }] };
  assert.ok(fertilityFactor(born, {}, 0, "2026-01-20", { extraMl: 5 }).factor <= 0.05);
  assert.ok(fertilityFactor(born, {}, 0, "2026-04-01", { extraMl: 5 }).factor === 0.2);
  const lost = { hist: [{ kind: "loss", at: 0, when: "2026-01-01" }, { kind: "loss", at: 0, when: "2025-01-01" }] };
  const f = fertilityFactor(lost, {}, 0, "2026-02-01", { extraMl: 5 }); assert.ok(Math.abs(f.factor - 0.4) < 1e-9); assert.ok(f.why.some((w) => /유산 2번/.test(w)));
});
test("피임 효과·강제 피임, 표시 확률", () => {
  assert.equal(preventOf({ fert: { forced: true } }, "none").p, 1);
  assert.ok(Math.abs(preventOf({ fert: { contra: "pill" } }, "condom").p - (1 - 0.007 * 0.02)) < 1e-9);
  assert.equal(chanceNow({ phase: "fertile", factor: 1, prevent: 0 }), 0.25);
  assert.equal(chanceNow({ phase: "fertile", factor: 1, prevent: 1 }), 0);
});
test("관계마다 보호 여부: 강제 피임은 늘 막고, 피임 없음·충분한 양은 그대로 굴리게 남긴다, 콘돔도 2%는 샌다", () => {
  const rep = [{ name: "미나", sex: [{ partner: "하루", contraception: "none" }] }];
  const forced = gateReports(rep, () => ({ nsfw: { fert: { forced: true } }, L: {} }), { rng: () => 0 });
  assert.equal(forced.reports[0].sex[0].contraception, "used"); assert.match(forced.log[0], /강제 피임.*막힘/);
  const open = gateReports(rep, () => ({ nsfw: {}, L: {} }), { rng: () => 0.99, cumOf: () => ({ ml: 6, contra: "none" }) });
  assert.equal(open.reports[0].sex[0].contraception, "none");
  const condom = (r) => gateReports([{ name: "미나", sex: [{ partner: "하루", contraception: "used" }] }], () => ({ nsfw: {}, L: {} }), { rng: () => r, cumOf: () => ({ ml: 5, contra: "condom" }) }).reports[0].sex[0].contraception;
  assert.equal(condom(0.5), "used"); assert.equal(condom(0.01), "none", "콘돔 실패(약 2%)");
});
test("기록기 cum 줄 → 체내 정액, 출산 이력, 메인 모델 줄", () => {
  const f = { cursor: { at: 5 }, wiki: { documents: { a: { id: "a", title: "미나", type: "Character" } } }, nsfw: { a: { sexual: { eroticInterest: 50 }, fert: { contra: "pill" } } } };
  const ex = extraFrom("cum|미나|하루|inside|30|none\ncum|미나|하루|mouth|5|none", (n) => n, { marks: true });
  assert.deepEqual(ex.map((x) => x.where), ["inside", "mouth"]);
  applyExtra(f, [...ex, { kind: "hist", name: "미나", ev: "birth" }], { turn: 5, when: "2026-03-02 22:00" });
  assert.equal(f.life.p.a.cum.ml, 30); assert.equal(f.life.p.a.hist[0].kind, "birth");
  const t = fertilitySection(f, ["미나"], 5, "2026-03-02 22:30");
  assert.match(t, /uses the pill/); assert.match(t, /semen still inside \(some, fresh\)/); assert.match(t, /just gave birth/);
  f.nsfw.a.fert.forced = true; assert.match(fertilitySection(f, ["미나"], 5, ""), /will not get pregnant/);
});
test("불감 부위: 기록기 0 → 불감, 저장·주입, 무작위에도 가끔", () => {
  const r = nsfwFrom("zone|미나|팔꿈치|0|닿아도 무덤덤", [{ name: "미나" }]);
  const r2 = nsfwFrom("zone|미나|발|0|아무 느낌 없음", [{ name: "미나" }]);
  assert.equal(r2[0].level, 0);
  const n = applyHumanReports({ zones: [] }, r2).nsfw;
  assert.deepEqual([n.zones[0].numb, n.zones[0].level], [true, 0]);
  assert.equal(normZones(n.zones)[0].numb, true);
  assert.match(extLine(n), /불감\(아무 느낌 없음\): 발/);
  assert.ok(Array.from({ length: 40 }, (_, i) => randomZones(`z${i}`)).some((zs) => zs.some((z) => z.numb && z.level === 0)));
  assert.equal(r.length <= 1, true);
});
test("창 투명도: 0~70% 사이로 저장", () => {
  assert.equal(normalizeTheme({}).winAlpha, 0); assert.equal(normalizeTheme({ winAlpha: 35 }).winAlpha, 35); assert.equal(normalizeTheme({ winAlpha: 99 }).winAlpha, 70);
});
