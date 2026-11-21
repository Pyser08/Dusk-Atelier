// 11-21 제보: 장면 상태창이 유저 입력에도 붙고, 엔진 예보가 본문·기록과 다르게 날씨를 제멋대로 바꿨다.
import test from "node:test";
import assert from "node:assert/strict";
import { sceneOf, inputWeather } from "../src/engine/scenepanel.js";
import { userTexts, isUserText } from "../src/engine/msgrole.js";

const base = (weather) => ({ wiki: { documents: {} }, scenes: [{ at: 5, when: "2026-03-02 15:00", place: "해변" }], extra: { climate: { zone: "tropical", hemi: "N", region: "남쪽 섬", months: 12, mdays: 0 }, weather } });

// 11-21 사용자 결정: 엔진(예보)이 늘 먼저, 유저가 입력으로 날씨를 바꾸면(또는 위키에서 직접 고치면) 그걸 따른다. AI 응답 글·기록기 보고는 예보를 못 바꿈
test("엔진 예보가 먼저: AI 응답 글·기록된 날씨는 예보를 바꾸지 않음", () => {
  const s = sceneOf("갑자기 비가 쏟아졌다.", base({ w: "눈", at: 5, when: "2026-03-02 13:00" }), { seed: "x" });
  assert.ok(s.forecast?.now?.w); assert.equal(s.weather, s.forecast.now.w);
});

test("유저 입력으로 정한 날씨(같은 날)는 예보보다 먼저, 날이 바뀌면 다시 예보", () => {
  const w = { w: "눈", user: true, src: "input", when: "2026-03-02 14:00" };
  const s = sceneOf("조용한 오후.", base(w), { seed: "x" });
  assert.equal(s.weather, "눈"); assert.equal(s.forecast.now.w, "눈", "예보 상자·요청 줄도 같은 값");
  const next = { ...base(w), scenes: [{ at: 9, when: "2026-03-03 09:00", place: "해변" }] };
  assert.equal(sceneOf("다음 날 아침.", next, { seed: "x" }).weather, sceneOf("다음 날 아침.", next, { seed: "x" }).forecast.now.w);
});

test("위키에서 직접 고친 날씨(날짜 없음)는 계속 따름", () => {
  assert.equal(sceneOf("조용한 오후.", base({ w: "흐림", user: true, when: "" }), { seed: "x" }).weather, "흐림");
});

test("유저 입력에서 날씨 읽기: 날씨 말일 때만(‘눈이 마주쳤다’·‘준비가’는 아님)", () => {
  assert.equal(inputWeather("밖에 비가 내리기 시작한다. 우산을 편다.", "2026-03-02 14:00")?.w, "비");
  assert.equal(inputWeather("함박눈이 펑펑 내린다", "")?.w, "눈");
  assert.equal(inputWeather("하늘이 맑게 갰다", "")?.w, "맑음");
  assert.equal(inputWeather("세라와 눈이 마주쳤다. 준비가 끝났다.", ""), null);
  const r = inputWeather("천둥이 친다", "2026-03-02 14:00"); assert.deepEqual([r.user, r.src, r.when], [true, "input", "2026-03-02 14:00"]);
});

test("유저 입력 알아보기: 채팅의 유저 메시지와 같은 글(앞뒤 공백·표시 변환 조금 달라도)", () => {
  const msgs = [{ role: "char", data: "안녕, 나는 세라야. 오늘은 바닷가에 가자." }, { role: "user", data: "좋아! 세라랑 같이 바닷가로 걸어가며 조개껍데기를 줍는다. 파도가 발목까지 밀려온다." }];
  const set = userTexts(msgs);
  assert.ok(isUserText(set, "  좋아! 세라랑 같이 바닷가로 걸어가며 조개껍데기를 줍는다.\n파도가 발목까지 밀려온다. "));
  assert.ok(!isUserText(set, "안녕, 나는 세라야. 오늘은 바닷가에 가자."));
  assert.ok(!isUserText(set, "좋아"), "너무 짧은 글은 판단하지 않음");
  assert.ok(!isUserText(null, "아무 글"));
});

test("기록기 날씨 보고는 유저가 정한 날씨를 덮지 않음", async () => {
  const { applyExtra, extraOf } = await import("../src/engine/memextra.js");
  const f = { extra: { weather: { w: "눈", user: true, src: "input", when: "2026-03-02 14:00" } } };
  applyExtra(f, [{ kind: "weather", w: "비" }], { turn: 6, when: "2026-03-02 15:00" });
  assert.equal(extraOf(f).weather.w, "눈");
  const g = { extra: { weather: { w: "맑음", at: 1 } } }; applyExtra(g, [{ kind: "weather", w: "비" }], { turn: 6 }); assert.equal(extraOf(g).weather.w, "비");
});
