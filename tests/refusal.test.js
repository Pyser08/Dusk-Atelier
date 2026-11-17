import test from "node:test";
import assert from "node:assert/strict";
import { refusalText, blockedError, isCensored } from "../src/engine/refusal.js";
import { explain } from "../src/data/memlog.js";

test("검열 판별: 거절 문장·안전 필터만 검열, JSON·빈 답·일반 오류는 아님", () => {
  assert.ok(refusalText("I'm sorry, but I can't help with that request."));
  assert.ok(refusalText("죄송하지만 해당 요청은 도와드릴 수 없습니다."));
  assert.equal(refusalText('{"characters": []}'), "");
  assert.equal(refusalText("```json\n{\"a\":1}\n```"), "");
  assert.equal(refusalText(""), "");
  assert.equal(refusalText("Here is the profile: ..."), "");
  assert.ok(blockedError(new Error("Gemini finishReason: SAFETY")));
  assert.ok(blockedError("PROHIBITED_CONTENT"));
  assert.ok(!blockedError(new Error("429 Too Many Requests")));
  assert.ok(isCensored("검열: 모델이 거절했어요"));
  assert.match(explain("검열: 모델이 거절했어요").why, /검열/);
  assert.doesNotMatch(explain("문제: 프로필 답에 이 인물이 없어요").why, /검열/);
});
