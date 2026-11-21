import test from "node:test";
import assert from "node:assert/strict";
import { calFrom, applyCal, upcoming, calSection } from "../src/engine/storycal.js";
import { extraFrom, applyExtra, extraOf } from "../src/engine/memextra.js";

test("기록기 줄을 읽어 달력에 쌓는다", () => {
  const r = calFrom("bday|레이|11/25|소꿉친구 메이드장\nbday|{{user}}|3/2\ncouple|레이|today\nplan|11/28|영화 데이트\nday|12/1|별빛 축제|광장에서 등불\ncountry|KR|대한민국\nhol|1/1~1/3|성월제|새해");
  assert.deepEqual(r.map((x) => x.kind), ["bday", "bday", "couple", "plan", "day", "country", "hol"]);
  assert.equal(r[6].to, "1/3");
  const e = {}; const ch = applyCal(e, r, { when: "2026-11-21" });
  assert.ok(ch.length >= 6);
  assert.equal(e.cal.couple["레이"].since, "2026-11-21");
  assert.equal(e.cal.country.code, "KR");
});

test("다가오는 날: 생일·약속·공휴일·연인 100일, 7일 안만 요청에", () => {
  const e = {}; applyCal(e, calFrom("bday|레이|11/25|친구\nplan|12/20|여행\ncouple|레이|2026-08-29"), { when: "2026-11-21" });
  const up = upcoming(e, "2026-11-21", null, 14);
  assert.ok(up.some((x) => x.label === "레이 생일" && x.left === 4));
  assert.ok(up.some((x) => x.label === "레이와 100일" && x.left === 15) === false, "14일 밖");
  assert.ok(upcoming(e, "2026-12-01", null, 14).some((x) => x.label === "레이와 100일"));
  assert.ok(upcoming(e, "2026-12-20", null, 14).some((x) => x.label === "성탄절" && x.left === 5));
  assert.ok(!upcoming(e, "2026-11-21", null, 14).some((x) => x.label === "여행"));
  const s = calSection(e, "2026-11-21");
  assert.match(s, /레이 생일/); assert.doesNotMatch(s, /여행/);
  assert.ok(upcoming(e, "2026-02-17", null, 3).some((x) => x.label === "설날" && x.ongoing), "연휴 한가운데도 오늘");
});

test("가상 나라는 우리 공휴일 대신 그 나라 휴일, 연인 끝은 지움", () => {
  const e = {}; applyCal(e, calFrom("country|custom|아르세아 왕국\nhol|12/24|성야제|별을 거는 밤\ncouple|린|?\ncouple|린|off"), { when: "2026-12-20" });
  const up = upcoming(e, "2026-12-20", null, 7);
  assert.ok(up.some((x) => x.label === "성야제")); assert.ok(!up.some((x) => x.label === "성탄절"));
  assert.ok(!e.cal.couple["린"]);
});

test("상태창 기록 흐름(extraFrom → applyExtra)에도 들어가고 기존 칸은 그대로", () => {
  const f = { extra: { weather: { w: "비" } } };
  const reps = extraFrom("bday|레이|11/25|친구\nweather|맑음", (n) => n, { weather: true });
  applyExtra(f, reps, { turn: 3, when: "2026-11-21 10:00" });
  assert.equal(extraOf(f).cal.bday["레이"].md, "11/25");
  assert.equal(extraOf(f).weather.w, "맑음");
  assert.equal(extraFrom("bday|레이|11/25", (n) => n, { weather: false }).length, 0, "상태창 꺼지면 안 읽음");
});

import { scenePanelHtml, sceneOf } from "../src/engine/scenepanel.js";
test("상태창에 다가오는 날 칩", () => {
  const f = { extra: {}, scenes: [] }; applyCal(f.extra, calFrom("bday|{{user}}|11/22\nbday|레이|11/21"), { when: "2026-11-21" });
  const s = sceneOf("<imh>", f); assert.deepEqual(s.days, [], "날짜 없으면 없음");
  const html = scenePanelHtml({ date: "2026-11-21", time: "10:00", place: "집", days: upcoming(f.extra, "2026-11-21") });
  assert.match(html, /다가오는 날/); assert.match(html, /내 생일/); assert.match(html, /레이 생일 <b[^>]*>오늘/);
});
