import test from "node:test";
import assert from "node:assert/strict";
import { judgeAutoResult } from "../src/data/retrytoast.js";

const doc = (title, metrics = []) => ({ type: "Character", title, metrics });
test("실패는 알리되 곧 자동 재시도하는 중이면 조용히", () => {
  assert.ok(judgeAutoResult({ phase: "failed", message: "형식 오류" }));
  assert.equal(judgeAutoResult({ phase: "failed", message: "형식 오류 · 자동 재시도 1/2" }), null);
  assert.equal(judgeAutoResult({ phase: "failed", message: "대상 답변이 리롤되거나 삭제되어" }), null);
});
test("완료 후 문서가 없거나 수치 빈 인물이 둘 이상이면 알림", () => {
  assert.ok(judgeAutoResult({ phase: "completed", scope: { documents: {} } }));
  assert.ok(judgeAutoResult({ phase: "completed", scope: { documents: { a: doc("가"), b: doc("나"), c: doc("다", [1]) } } }));
  assert.equal(judgeAutoResult({ phase: "completed", scope: { documents: { a: doc("가"), c: doc("다", [1]) } } }), null);
});
