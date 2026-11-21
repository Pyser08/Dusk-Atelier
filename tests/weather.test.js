import test from "node:test";
import assert from "node:assert/strict";
import { climateFrom, guessClimate, forecast, actualAt, dayIndex, addDays, yearPos, weekday, climo, weatherLine, anchorOf, STATES, ZONES } from "../src/engine/weather.js";
import { extraFrom, applyExtra, extraOf, WEATHER_STAGE1 } from "../src/engine/memextra.js";
import { sceneOf, scenePanelHtml } from "../src/engine/scenepanel.js";
import { syncCycles } from "../src/data/cyclesync.js";
import { formatCycleBody, parseCycleBody } from "../src/engine/pot/cycle-tracking.js";

const real = { zone: "continental", hemi: "N", months: 12, mdays: 0 };

test("기후: 기록기 줄 해석·현실 지명 추정(남반구 포함)", () => {
  assert.deepEqual(climateFrom(["climate", "oceanic", "S", "아르덴 왕국", "13", "28"]), { zone: "oceanic", hemi: "S", region: "아르덴 왕국", months: 13, mdays: 28, src: "ai" });
  assert.equal(climateFrom(["climate", "lava"]), null);
  assert.equal(climateFrom(["climate", "arid", "N", "사막", "", "0"]).mdays, 0);
  assert.equal(guessClimate("서울 강남역 카페").zone, "continental");
  assert.equal(guessClimate("런던의 비 오는 거리").zone, "oceanic");
  assert.equal(guessClimate("시드니 해변").hemi, "S");
  assert.equal(guessClimate("이름 없는 마을"), null);
  assert.match(WEATHER_STAGE1, /climate\|/);
});

test("달력: 현실 달력·판타지 달력(13달 × 28일) 날짜 더하기·요일·계절 위치", () => {
  assert.equal(addDays("2026-02-27", 3, real), "2026-03-02");
  assert.equal(weekday("2026-03-02", real), "월");
  const fan = { months: 13, mdays: 28 };
  assert.equal(addDays("1023-13-27", 3, fan), "1024-01-02");
  assert.equal(weekday("1023-01-01", fan), "", "판타지 달력은 요일 모름");
  assert.ok(Math.abs(yearPos("2026-07-15", real) - 0.53) < 0.02);
  assert.ok(Math.abs(yearPos("2026-07-15", real, "S") - 0.03) < 0.02, "남반구는 반 바퀴");
  assert.ok(climo("continental", yearPos("2026-01-15", real)).hi < climo("continental", yearPos("2026-07-15", real)).hi, "겨울이 더 추움");
});

test("예보: 오늘부터 4일·낮밤·확률, 같은 씨앗이면 같은 결과, 멀수록 확신 낮음", () => {
  const f = forecast(real, "2026-07-20", "10:00", "s");
  assert.equal(f.days.length, 5);
  assert.deepEqual(f, forecast(real, "2026-07-20", "10:00", "s"), "씨앗 같으면 같음");
  const halves = f.days.flatMap((d) => d.half).filter(Boolean);
  assert.equal(halves.length, 10);
  assert.ok(halves.every((h) => STATES.includes(h.w) && h.conf >= 0 && h.conf <= 100 && h.rain >= 0 && h.rain <= 100 && Number.isFinite(h.t)));
  assert.equal(halves[0].now, true); assert.equal(halves[0].conf, 100);
  assert.ok(halves[9].conf < halves[1].conf, "멀수록 덜 확실");
  const night = forecast(real, "2026-07-20", "22:00", "s");
  assert.equal(night.days[0].half[0], null, "밤이면 오늘 낮은 지남");
  // 한겨울 냉대: 비는 없고 내리면 눈
  const winter = Array.from({ length: 40 }, (_, i) => actualAt(dayIndex("2026-01-01", real) * 2 + i, real, "w").w);
  assert.ok(!winter.includes("비") && !winter.includes("폭우"), winter.join());
});

test("예보: 응답에 나온 날씨가 기준점 — 그 뒤로 이어지고, 날짜를 건너뛰어도 기준점에서 굴림", () => {
  const anchor = { slot: dayIndex("2026-07-20", real) * 2, w: "폭우" };
  assert.equal(actualAt(anchor.slot, real, "s", anchor).w, "폭우");
  const f = forecast(real, "2026-07-20", "10:00", "s", { anchor });
  assert.equal(f.now.w, "폭우");
  const skip = forecast(real, "2026-07-27", "10:00", "s", { anchor });
  assert.equal(skip.days[0].date, "2026-07-27");
  assert.deepEqual(skip.now, actualAt(dayIndex("2026-07-27", real) * 2, real, "s", anchor), "건너뛴 날도 같은 흐름");
  const e = extraOf({ extra: { weather: { w: "눈", when: "2026-01-03 21:00" } } });
  assert.equal(anchorOf(e, real).w, "눈");
  assert.match(weatherLine(f, real), /now 폭우 .*tomorrow/);
});

test("기록기 줄 → 기후·동거 저장(유저는 동거 짝에서 뺌)", () => {
  const rep = extraFrom("climate|tropical|N|발리|12|0\ncohabit|세라|유나\ncohabit|세라|{{user}}", (n) => n, { cohabit: true });
  assert.deepEqual(rep.map((r) => r.kind), ["climate", "cohabit"]);
  const f = {}; applyExtra(f, rep, { turn: 3 }); applyExtra(f, [{ kind: "cohabit", a: "유나", b: "세라" }], { turn: 4 });
  assert.equal(f.extra.climate.zone, "tropical"); assert.equal(f.extra.cohabit.length, 1, "같은 짝은 한 번");
  assert.equal(extraFrom("cohabit|세라|유나", (n) => n).length, 0, "월경 추적 꺼지면 동거 줄 버림");
  applyExtra(f, [{ kind: "goal", name: "세라", goal: "검술", prog: 10, status: "active" }], { turn: 5 });
  assert.equal(f.extra.climate.zone, "tropical", "다른 보고가 와도 기후 유지");
});

test("장면 상태창: 판타지 달력 날짜·기후 이름·4일 예보 상자(누르면 펼침)", () => {
  const f = { scenes: [{ at: 1, when: "제국력 1023년 13월 27일 21:00", place: "수도" }], extra: { climate: { zone: "oceanic", hemi: "N", region: "아르덴 왕국", months: 13, mdays: 28 } } };
  const s = sceneOf("", f, { seed: "x" });
  assert.equal(s.date, "1023-13-27"); assert.equal(s.forecast.days[2].date, "1024-01-01");
  const h = scenePanelHtml({ ...s, people: [] , place: "수도" });
  for (const x of ['x-dusk="wx"', "4일 예보", "아르덴 왕국", "오늘", "내일", "모레", "💧", "1023년 13월 27일"]) assert.ok(h.includes(x), x);
  assert.ok(!/1023년 13월 27일 \(/.test(h), "판타지 달력은 요일 없음");
  const told = sceneOf("[2026-03-02 22:40 | 서울]\n함박눈이 내렸다.", {}, { seed: "x" });
  assert.equal(told.weather, told.forecast.now.w, "11-21: AI 글에 나온 날씨보다 엔진 예보가 먼저");
  assert.equal(told.climate.zone, "continental", "장소로 기후 추정");
});

test("동거 여성 월경 주기: 한 주기마다 시작일 차이가 좁혀져 몇 달 뒤 비슷해짐", () => {
  const cyc = (start, date, length = 28) => ({ heading: "월경·임신", provenance: { slotId: "cycle.state" }, body: formatCycleBody({ length, start, date, conception: "", partner: "", known: false, birth: "" }) });
  const mk = (date, a = "2026-01-01", b = "2026-01-15", lb = 30) => ({ documents: { a: { id: "a", type: "Character", title: "세라", sections: [cyc(a, date)] }, b: { id: "b", type: "Character", title: "유나", sections: [cyc(b, date, lb)] } } });
  const pairs = [{ key: "세라|유나", a: "세라", b: "유나" }];
  let scope = mk("2026-01-20"), last = {};
  let r = syncCycles(scope, pairs, last); assert.equal(r.changed.length, 0, "처음엔 날짜만 기억"); last = r.last;
  const gap = (sc) => { const A = parseCycleBody(sc.documents.a.sections[0].body), B = parseCycleBody(sc.documents.b.sections[0].body); const L = A.length; let d = ((Date.parse(B.start) - Date.parse(A.start)) / 864e5) % L; d = (d + L) % L; return Math.min(d, L - d); };
  const g0 = gap(scope);
  r = syncCycles(scope, pairs, last); assert.equal(r.changed.length, 0, "한 주기 안 지남");
  let sc = r.scope, months = 0;
  for (let m = 1; m <= 8; m++) {
    const date = new Date(Date.UTC(2026, 0, 20 + 30 * m)).toISOString().slice(0, 10);
    sc = { documents: Object.fromEntries(Object.entries(sc.documents).map(([k, d]) => { const st = parseCycleBody(d.sections[0].body); return [k, { ...d, sections: [{ ...d.sections[0], body: formatCycleBody({ ...st, date }) }] }]; })) };
    r = syncCycles(sc, pairs, last); sc = r.scope; last = r.last; months = m;
    if (gap(sc) <= 1) break;
  }
  assert.ok(gap(sc) <= 1, `차이 ${g0} → ${gap(sc)}`); assert.ok(months >= 3, `몇 달에 걸쳐(${months}달)`);
  const A = parseCycleBody(sc.documents.a.sections[0].body), B = parseCycleBody(sc.documents.b.sections[0].body);
  assert.ok(Math.abs(A.length - B.length) <= 1, "주기 길이도 가까워짐");
});

test("기후대마다 확률 합이 맞음", () => { for (const z of Object.keys(ZONES)) for (const pos of [0, 0.3, 0.6, 0.9]) { const c = climo(z, pos); assert.ok(Math.abs(c.p.reduce((a, b) => a + b, 0) - 1) < 1e-9, z); } });

test("2.2.28: 날씨 상태창은 정보가 없어도(채팅 첫 응답) force면 ‘날짜 미정’으로 뜸", () => {
  assert.equal(scenePanelHtml({}), "", "기본은 그대로");
  const h = scenePanelHtml({ force: true });
  assert.match(h, /날짜 미정/); assert.match(h, /--:--/);
});
