import test from "node:test";
import assert from "node:assert/strict";
import { tickLife, lustRate, lifeView, lifeSection, usesToPrefs, jealousyOf, trendOf, missOf, famStep, lustStep, humanSection } from "../src/engine/nsfwlife.js";
import { applyHumanReports, normZones, partOf, normHuman } from "../src/engine/humanitems.js";
import { normalizeNsfw } from "../src/engine/nsfwprofile.js";
import { nsfwFrom, humanFrom } from "../src/engine/recorder.js";
import { applyLifeTurn, applyNsfwQueue } from "../src/data/nsfwturn.js";

const folder = () => ({
  cursor: { at: 10 },
  wiki: { documents: { a: { id: "a", type: "Character", title: "유나", aliases: [], sections: [] }, b: { id: "b", type: "Character", title: "민호", aliases: [], sections: [] } } },
  emo: {}, nsfw: { a: { sexual: { eroticInterest: 80 }, axes: {}, positions: [], by: "ai", log: [] } },
});

test("성욕: 저절로 오르지 않고 AI 판단(gauge)으로만 오름, 성관계로 해소·불응기", () => {
  const f = folder();
  tickLife(f, { turn: 10, present: ["유나"] }, () => 80);
  const L = f.life.p.a; assert.equal(L.lust, 30);
  tickLife(f, { turn: 20, present: ["유나"] }, () => 80);
  assert.equal(f.life.p.a.lust, 30, "아무 일 없으면 그대로");
  tickLife(f, { turn: 21, present: ["유나"], events: [{ kind: "gauge", name: "유나", key: "lust", delta: 20 }] }, () => 80);
  assert.ok(f.life.p.a.lust > 50, "AI가 올리면 오름(관심 높으면 더 크게)");
  const before = f.life.p.a.lust;
  const ch = tickLife(f, { turn: 22, present: ["유나"], events: [{ kind: "act", name: "유나", partner: "민호", act: "sex", labels: ["정상위"] }] }, () => 80);
  assert.ok(f.life.p.a.lust < before - 40); assert.ok(ch[0].includes("해소"));
  assert.equal(f.life.p.a.sex.n, 1); assert.equal(f.life.p.a.sex.by["민호"].n, 1); assert.equal(f.life.p.a.uses["정상위"], 1);
  assert.ok(f.life.p.a.fat >= 25);
  tickLife(f, { turn: 23, present: ["유나"], events: [{ kind: "sleep", name: "유나" }] }, () => 80);
  assert.equal(f.life.p.a.fat, 0);
});

test("성욕 속도: 배란기·끌림은 빠르게, 불응기·적대는 느리게", () => {
  const base = lustRate({ interest: 50 });
  assert.ok(lustRate({ interest: 50, phase: "fertile" }) > base);
  assert.ok(lustRate({ interest: 50, phase: "period" }) < base);
  assert.ok(lustRate({ interest: 50, att: 8 }) > base);
  assert.ok(lustRate({ interest: 50, hos: 8 }) < base);
  assert.ok(lustRate({ interest: 50, refractory: true }) < base / 2);
  assert.ok(lustRate({ interest: 50, sinceSex: 50 }) > base);
});

test("게이지 배수 0이면 오르지 않음", () => {
  const f = folder();
  tickLife(f, { turn: 10, present: ["유나"] });
  tickLife(f, { turn: 30, present: ["유나"], gauge: { up: 0, down: 1 } });
  assert.equal(f.life.p.a.lust, 30);
});

test("단계 이름·익숙함·추세·보고 싶음", () => {
  assert.equal(lustStep(85), "참기 힘듦"); assert.equal(famStep(0), "처음"); assert.equal(famStep(20), "익숙함");
  assert.equal(trendOf([1, 2, 6]).label, "가까워지는 중"); assert.equal(trendOf([9, 5, 4]).label, "식는 중");
  assert.equal(missOf({ seen: 0 }, 10, 5), null); assert.ok(missOf({ seen: 0 }, 90, 8).v > 0);
});

test("질투: 소유욕 대상이 다른 사람에게 끌림", () => {
  const f = folder();
  f.emo = { x: { from: "유나", to: "민호", tags: { possess: 6 }, log: [] }, y: { from: "민호", to: "지수", tags: { attraction: 7 }, log: [] } };
  const j = jealousyOf(f, ["유나"], 10);
  assert.equal(j[0].of, "민호"); assert.equal(j[0].rival, "지수");
});

test("자주 쓴 체위는 선호로, 사용자 프로필은 그대로", () => {
  const n = { by: "ai", positions: [{ label: "후배위", preference: "neutral", kind: "position" }] };
  const r = usesToPrefs(n, { 후배위: 5, 기승위: 2 });
  assert.equal(r.nsfw.positions[0].preference, "preferred"); assert.equal(r.nsfw.positions[1].label, "기승위");
  assert.equal(usesToPrefs({ ...n, by: "user" }, { 후배위: 9 }).changed.length, 0);
});

test("기념일·경험·주입 줄(성인 프로필 없는 인물은 성욕 줄 없음)", () => {
  const f = folder();
  tickLife(f, { turn: 1, present: ["유나", "민호"] });
  tickLife(f, { turn: 5, present: ["유나", "민호"], events: [{ kind: "act", name: "유나", partner: "민호", act: "sex" }, { kind: "act", name: "민호", partner: "유나", act: "sex" }] });
  const v = lifeView(f, f.wiki.documents.a, 5);
  assert.ok(v.ann.some((x) => x.label === "민호와 처음 만남")); assert.ok(v.ann.some((x) => x.label === "민호와 첫 관계"));
  f.life.p.a.lust = 95; f.life.p.b.lust = 95;
  const s = lifeSection(f, ["유나", "민호"], 20);
  assert.match(s, /유나: 오늘 [^\n]*달아오름/); assert.match(s, /민호: 오늘/); assert.doesNotMatch(s, /민호: [^\n]*달아오름/);
});

test("사람다운 항목·성감대 반영과 정규화", () => {
  const r = applyHumanReports({ sexual: {} }, [{ kind: "trait", field: "speech", text: "~거든요" }, { kind: "trait", field: "voice", text: "참다가 새는 소리" }, { kind: "zone", part: "목덜미", level: 3, note: "숨만 닿아도" }, { kind: "zone", part: "목", level: 1 }]);
  assert.deepEqual(r.nsfw.human.speech, ["~거든요"]); assert.equal(r.nsfw.ext.voice, "참다가 새는 소리");
  assert.equal(r.nsfw.zones.length, 1); assert.equal(r.nsfw.zones[0].level, 3);
  assert.equal(partOf("허벅지 안쪽").id, "thighs"); assert.equal(normZones([{ part: "xx" }]).length, 0);
  const n = normalizeNsfw({ human: { love: "챙겨 주기" }, zones: [{ part: "ears", level: 2 }] });
  assert.equal(n.human.love, "챙겨 주기"); assert.equal(n.zones[0].part, "ears");
  assert.equal(normHuman({}), null);
});

test("기록기 줄: act·sleep·zone·trait", () => {
  const raw = "act|유나|민호|sex|정상위, 후배위\nsleep|유나\nzone|유나|귀|3|약함\ntrait|유나|fantasy|밖에서\ntrait|유나|speech|말끝 흐림";
  const k = [{ name: "유나" }, { name: "민호" }];
  const got = nsfwFrom(raw, k);
  assert.deepEqual(got.map((x) => x.kind), ["act", "sleep", "zone", "trait"]);
  assert.deepEqual(got[0].labels, ["정상위", "후배위"]);
  const hu = humanFrom(raw, k, new Set(["speech"]));
  assert.equal(hu.length, 1); assert.equal(hu[0].field, "speech");
});

test("턴 반영: 큐의 trait가 폴더에, act가 life에", () => {
  const f = folder();
  applyNsfwQueue(f, [{ kind: "trait", name: "민호", field: "dream", text: "가게 열기" }]);
  assert.deepEqual(f.nsfw.b.human.dream, ["가게 열기"]);
  applyLifeTurn(f, { events: [{ kind: "act", name: "유나", partner: "민호", act: "kiss" }], present: ["민호"] });
  assert.ok(f.life.p.a && f.life.p.b);
  assert.match(humanSection(f, ["민호"]), /꿈·목표: 가게 열기/);
});

import { dialAngles, rubber, flingTarget, progressOf } from "../src/ui/screens/memory/subtabs.js";
test("휠: 끝에서 버티고, 관성·스크롤 위치 계산", () => {
  assert.deepEqual(dialAngles(3, 1, 40), [-40, 0, 40]);
  assert.equal(rubber(1.5, 4), 1.5); assert.ok(rubber(-2, 4) > -0.35 && rubber(-2, 4) < 0); assert.ok(rubber(9, 4) < 3.35);
  assert.equal(flingTarget(1.2, 0, 4), 1); assert.equal(flingTarget(1.2, 0.01, 4), 3); assert.equal(flingTarget(0.1, -0.05, 4), 0);
  assert.equal(progressOf([0, 100, 300], 50), 0.5); assert.equal(progressOf([0, 100, 300], 200), 1.5); assert.equal(progressOf([0, 100, 300], 999), 2);
});

import { triggerHit, hotActors, lustOfName } from "../src/engine/nsfwlife.js";
import { pickPlans } from "../src/engine/scenedrive.js";
test("게이지 조정·이야기 전 경험·배수·욕망 반응", () => {
  const f = folder();
  tickLife(f, { turn: 10, present: ["유나"] });
  tickLife(f, { turn: 10, present: ["유나"], events: [{ kind: "gauge", name: "유나", key: "lust", delta: 20 }, { kind: "past", name: "유나", partner: "민호", count: 4, est: true }] });
  assert.equal(f.life.p.a.lust, 50);
  const v = lifeView(f, f.wiki.documents.a, 10);
  assert.equal(v.partners[0].prior, 4); assert.equal(v.partners[0].est, true); assert.equal(v.sexN, 4);
  const g = folder(), h2 = folder();
  tickLife(g, { turn: 0, present: ["유나"] }, () => ({ interest: 50, mult: 2 })); tickLife(g, { turn: 10, present: ["유나"], events: [{ kind: "gauge", name: "유나", key: "lust", delta: 10 }] }, () => ({ interest: 50, mult: 2 }));
  tickLife(h2, { turn: 0, present: ["유나"] }, () => ({ interest: 50, mult: 0.5 })); tickLife(h2, { turn: 10, present: ["유나"], events: [{ kind: "gauge", name: "유나", key: "lust", delta: 10 }] }, () => ({ interest: 50, mult: 0.5 }));
  assert.ok(g.life.p.a.lust > h2.life.p.a.lust + 8);
  assert.ok(triggerHit("묶이는 것에 흥분한다. 손목 구속", "그녀의 손목을 끈으로 묶었다"));
  assert.ok(!triggerHit("묶이는 것에 흥분한다", "같이 밥을 먹었다"));
  const k = folder(); tickLife(k, { turn: 1, present: ["유나"], text: "손목을 묶었다", events: [{ kind: "gauge", name: "유나", key: "lust", delta: 10 }] }, () => ({ interest: 50, boost: ["손목 구속에 흥분"] }));
  assert.ok(k.life.p.a.lust > 42);
});
test("달아오름 90↑: 장면 계획 확정·없으면 새로 잡음", () => {
  const f = folder(); f.life = { turn: 10, p: { a: { lust: 95, refr: -1, fat: 0, sex: { n: 0, by: {} }, uses: {}, met: {}, lover: {}, temp: {} } } };
  f.emo = { x: { from: "유나", to: "민호", tags: { attraction: 6 }, log: [] } };
  assert.equal(lustOfName(f, "유나"), 95);
  const hot = hotActors(f); assert.deepEqual(hot, [{ actor: "유나", target: "민호" }]);
  const plans = pickPlans({ goals: {}, rest: {}, turn: 1 }, "유나와 민호", { hot, lustOf: () => 95, random: () => 0.99 });
  assert.equal(plans[0].goal.kind, "sex"); assert.equal(plans[0].goal.hot, true);
  const d = { goals: { k: { actor: "유나", target: "민호", kind: "sex", move: "다가감", desire: 1 } }, rest: {}, turn: 1 };
  assert.equal(pickPlans(d, "유나 민호", { random: () => 0.99, lustOf: () => 95 }).length, 1);
  assert.equal(pickPlans(d, "유나 민호", { random: () => 0.99, lustOf: () => 10 }).length, 0);
});

test("리롤로 같은 턴이 다시 와도 두 번 세지 않고, 짐작한 이전 경험은 덮지 않음", () => {
  const f = folder();
  tickLife(f, { turn: 5, present: ["유나"], events: [{ kind: "act", name: "유나", partner: "민호", act: "sex" }, { kind: "gauge", name: "유나", key: "lust", delta: 10 }, { kind: "gauge", name: "유나", key: "lust", delta: 10 }] });
  tickLife(f, { turn: 5, present: ["유나"], events: [{ kind: "act", name: "유나", partner: "민호", act: "sex" }] });
  assert.equal(f.life.p.a.sex.n, 1);
  tickLife(f, { turn: 6, events: [{ kind: "past", name: "유나", partner: "지수", count: 3, est: true }] });
  tickLife(f, { turn: 7, events: [{ kind: "past", name: "유나", partner: "지수", count: 9, est: true }] });
  assert.equal(f.life.p.a.sex.by["지수"].prior, 3);
  tickLife(f, { turn: 8, events: [{ kind: "past", name: "유나", partner: "지수", count: 5 }] });
  assert.equal(f.life.p.a.sex.by["지수"].prior, 5);
});

import { applyDrive } from "../src/engine/scenedrive.js";
test("달아오름 강제 계획: 사용자가 분명히 밀어내면 그때만 쉰다", () => {
  const r = applyDrive({ turn: 1, goals: {}, rest: {}, log: [] }, { replies: [{ actor: "유나", target: "{{user}}", answer: "no" }] });
  const plans = pickPlans(r.drive, "유나", { hot: [{ actor: "유나", target: "{{user}}" }], lustOf: () => 95, random: () => 0.99 });
  assert.equal(plans.length, 0);
  const r2 = applyDrive({ turn: 1, goals: {}, rest: {}, log: [] }, { replies: [{ actor: "유나", target: "{{user}}", answer: "wait" }] });
  assert.equal(pickPlans(r2.drive, "유나", { hot: [{ actor: "유나", target: "{{user}}" }], lustOf: () => 95, random: () => 0.99 }).length, 1);
});

import { traitAdj, dayFactor, satFactor, devLevel, developZones, annAlerts, todayLine } from "../src/engine/nsfwlife.js";
test("성향 보정·하루 리듬·만족도·개발도·기념일 알림·오늘 한 줄", () => {
  assert.ok(traitAdj({ spont: 100, initiative: 100 }) > 1.1); assert.ok(traitAdj({ spont: 0, initiative: 0 }) < 0.9); assert.equal(traitAdj({}), 1);
  assert.ok(dayFactor("밤 11시").lust > 1.2); assert.ok(dayFactor("아침").lust < 1); assert.ok(dayFactor("", "소주를 마셨다").lust > 1.2);
  assert.equal(satFactor([-1, -1]), 1.15); assert.equal(satFactor([]), 1);
  assert.equal(devLevel(29), 0); assert.equal(devLevel(60), 2); assert.equal(devLevel(90), 3);
  const f = folder(); for (let i = 0; i < 5; i++) developZones(f, "a", ["목덜미"]);
  assert.equal(f.nsfw.a.zones[0].dev, 30); assert.equal(f.nsfw.a.zones[0].level, 1);
  assert.equal(annAlerts([{ label: "x와 처음 만남", turn: 0, ago: 100, date: "" }], 100)[0].why, "100턴째");
  assert.equal(annAlerts([{ label: "y", turn: 0, ago: 5, date: "2025-03-16" }], 5, "2026-03-16")[0].why, "1주년");
  assert.equal(todayLine({ fat: 75, lust: 65, refractory: false, moodTop: { label: "짜증", v: 70 } }), "지침, 은근히 달아오름, 짜증이 큼");
});
test("기록기 mood·bond·touch·sat → 엔진", () => {
  const k = [{ name: "유나" }, { name: "민호" }];
  const raw = "mood|유나|irritation|+30\nbond|유나|민호|'꼬맹이'라고 부름\ntouch|유나|귀, 목덜미\nsat|유나|민호|bad";
  const hu = humanFrom(raw, k, new Set()); assert.deepEqual(hu.map((x) => x.kind), ["mood", "bond"]);
  const ns = nsfwFrom(raw, k); assert.deepEqual(ns.map((x) => x.kind), ["touch", "sat"]);
  const f = folder();
  tickLife(f, { turn: 3, present: ["유나"], events: [...hu, ...ns] });
  const L = f.life.p.a; assert.equal(L.mood.irritation, 30); assert.equal(L.habits["민호"].list[0], "'꼬맹이'라고 부름"); assert.deepEqual(L.sat, [-1]);
  assert.equal(f.nsfw.a.zones.length, 2);
  tickLife(f, { turn: 5, present: ["유나"] }); assert.equal(f.life.p.a.mood.irritation, 20);
  const v = lifeView(f, f.wiki.documents.a, 5); assert.ok(v.trace.length > 0); assert.equal(v.moodTop.label, "짜증");
});

test("욕망·이상성향 반응은 기본 켜짐(끈 것만 꺼짐)", () => {
  const f = folder(); f.wiki.people = { profiles: { a: { sexualDesire: { text: "손목 구속에 흥분" } } } };
  f.cursor = { at: 1 }; applyLifeTurn(f, { present: ["유나"] });
  f.cursor = { at: 2 }; applyLifeTurn(f, { present: ["유나"], text: "손목을 묶었다", events: [{ kind: "gauge", name: "유나", key: "lust", delta: 20 }] });
  const on = f.life.p.a.lust;
  const g = folder(); g.wiki.people = { profiles: { a: { sexualDesire: { text: "손목 구속에 흥분" } } } }; g.nsfw.a.boost = { desire: false };
  g.cursor = { at: 1 }; applyLifeTurn(g, { present: ["유나"] });
  g.cursor = { at: 2 }; applyLifeTurn(g, { present: ["유나"], text: "손목을 묶었다", events: [{ kind: "gauge", name: "유나", key: "lust", delta: 20 }] });
  assert.ok(on > g.life.p.a.lust + 5);
});

test("달아오름 90↑ 확정: 장면 판단에 계획이 실제로 저장되고, 끌림 기록이 없어도 상대({{user}})를 정한다", () => {
  const f = folder(); f.cursor = { at: 10 }; f.drive = { turn: 3, goals: {}, rest: {}, log: [] };
  f.life = { turn: 9, p: { a: { lust: 96, refr: -1, fat: 0, sex: { n: 0, by: {} }, uses: {}, met: {}, lover: {}, temp: {} } } };
  applyLifeTurn(f, { present: ["유나"] });
  const goals = Object.values(f.drive.goals).filter((g) => g.actor === "유나");
  assert.equal(goals.length, 1); assert.equal(goals[0].kind, "sex"); assert.equal(goals[0].target, "{{user}}"); assert.ok(goals[0].desire >= 90);
  // 이미 성관계 목표가 있으면 새로 만들지 않고 욕구만 올린다
  applyLifeTurn(f, { present: ["유나"] });
  assert.equal(Object.values(f.drive.goals).filter((g) => g.actor === "유나").length, 1);
});

test("월경 단계별 기분이 지금 상태와 주입 줄에 들어간다(제국력 연도 포함)", () => {
  const f = folder();
  f.wiki.documents.a.sections = [{ id: "c", heading: "월경·임신", provenance: { slotId: "cycle.state" }, body: "주기: 28일 · 생리 시작 기준일: 0300-01-01\n날짜: 0300-01-26 · 생리 예정일 가까움\n임신: 아님" }];
  tickLife(f, { turn: 10, present: ["유나"] }, () => 80);
  const v = lifeView(f, f.wiki.documents.a, 10);
  assert.equal(v.phase, "pre"); assert.match(v.phaseMood.label, /짜증/);
  assert.match(lifeSection(f, ["유나"], 10), /유나: [^\n]*PMS/);
  f.wiki.documents.b.sections = [];
  assert.doesNotMatch(lifeSection(f, ["민호"], 10), /생리|배란/);
});
