import test from "node:test";
import assert from "node:assert/strict";
import { RUNE } from "../src/ui/mascot-data.js";
import { moodFor, MOODS } from "../src/ui/mascot.js";

test("루네 그림: 표정 8개·손 흔들기·로고가 webp data URL로 있다", () => {
  for (const k of [...MOODS.map((m) => "face_" + m), "wave", "logo"]) assert.match(RUNE[k], /^data:image\/webp;base64,/, k);
});
test("빈 화면 표정: 채팅 없음=놀람, 준비 안 됨=미안, 기억하는 인물 없음=생각 중, 그 밖=기본, 직접 고르면 그 표정", () => {
  assert.equal(moodFor({ title: "열린 채팅이 없어요" }), "surprised");
  assert.equal(moodFor({ title: "아직 쓸 수 없어요" }), "sorry");
  assert.equal(moodFor({ title: "스킬 기능이 아직 준비되지 않았어요" }), "sorry");
  assert.equal(moodFor({ title: "아직 나를 기억하는 인물이 없어요" }), "thinking");
  assert.equal(moodFor({ title: "아직 모듈이 없어요" }), "basic");
  assert.equal(moodFor({ title: "아무거나", mood: "wink" }), "wink");
  assert.equal(moodFor({ title: "x", mood: "없는표정" }), "basic");
});
