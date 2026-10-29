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
test("위키 충돌(수동 확인 필요)은 전용 안내이고 '다시 시도'를 숨긴다", () => {
  const v = judgeAutoResult({ phase: "manual", message: "수동 확인 필요 · 이전 자동 변경 이후 같은 문서가 수정되어 안전하게 되돌릴 수 없습니다." });
  assert.equal(v.kind, "conflict"); assert.equal(v.retry, false); assert.match(v.text, /직접 고쳐서/); assert.doesNotMatch(v.text, /실패/);
  const m = judgeAutoResult({ phase: "manual", message: "이전 자동 기록이 정리된 범위입니다. 중복 반영을 막기 위해 자동 갱신하지 않았습니다." });
  assert.equal(m.kind, "manual"); assert.equal(m.retry, false);
  assert.equal(judgeAutoResult({ phase: "failed", message: "형식 오류" }).retry, true, "일반 실패는 다시 시도 버튼을 둔다");
});
