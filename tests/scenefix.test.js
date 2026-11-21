// 11-21 제보: 장면 상태창이 유저 입력에도 붙고, 엔진 예보가 본문·기록과 다르게 날씨를 제멋대로 바꿨다.
import test from "node:test";
import assert from "node:assert/strict";
import { sceneOf } from "../src/engine/scenepanel.js";
import { userTexts, isUserText } from "../src/engine/msgrole.js";

const base = (weather) => ({ wiki: { documents: {} }, scenes: [{ at: 5, when: "2026-03-02 15:00", place: "해변" }], extra: { climate: { zone: "tropical", hemi: "N", region: "남쪽 섬", months: 12, mdays: 0 }, weather } });

test("같은 날 기록된 날씨는 엔진 예보보다 먼저(본문에 날씨가 없을 때)", () => {
  const s = sceneOf("세라가 조용히 걸었다.", base({ w: "눈", at: 5, when: "2026-03-02 13:00" }), { seed: "x" });
  assert.equal(s.weather, "눈");
  assert.equal(s.forecast?.now?.w ?? "눈", "눈", "예보 상자의 지금 날씨도 같은 값");
});

test("사용자가 직접 고친 날씨는 날짜가 없어도 따름", () => {
  assert.equal(sceneOf("조용한 오후.", base({ w: "흐림", user: true, when: "" }), { seed: "x" }).weather, "흐림");
});

test("본문에 날씨가 나오면 그게 지금 날씨", () => {
  assert.equal(sceneOf("갑자기 비가 쏟아졌다.", base({ w: "눈", at: 5, when: "2026-03-02 13:00" }), { seed: "x" }).weather, "비");
});

test("유저 입력 알아보기: 채팅의 유저 메시지와 같은 글(앞뒤 공백·표시 변환 조금 달라도)", () => {
  const msgs = [{ role: "char", data: "안녕, 나는 세라야. 오늘은 바닷가에 가자." }, { role: "user", data: "좋아! 세라랑 같이 바닷가로 걸어가며 조개껍데기를 줍는다. 파도가 발목까지 밀려온다." }];
  const set = userTexts(msgs);
  assert.ok(isUserText(set, "  좋아! 세라랑 같이 바닷가로 걸어가며 조개껍데기를 줍는다.\n파도가 발목까지 밀려온다. "));
  assert.ok(!isUserText(set, "안녕, 나는 세라야. 오늘은 바닷가에 가자."));
  assert.ok(!isUserText(set, "좋아"), "너무 짧은 글은 판단하지 않음");
  assert.ok(!isUserText(null, "아무 글"));
});
