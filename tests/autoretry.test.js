// 11-21 제보: Writer가 한 번 실패한 응답은 그 뒤 입력마다 ‘인물 위키 자동 기록 실패’가 다시 떴다(이미 알린 실패를 되풀이).
// 이제 시간이 지나면 자동으로 한 번 다시 해 보고, 그 뒤엔 조용히 기다린다(알림의 ‘다시 시도’는 그대로).
import test from "node:test";
import assert from "node:assert/strict";
import { failedAutoRecord, autoRetryDue, AUTO_RETRY_GAP } from "../src/engine/autoretry.js";

const rec = (o = {}) => ({ identity: "id1", status: "failed", at: "2026-11-21T13:00:00.000Z", ...o });
const t0 = Date.parse("2026-11-21T13:00:00.000Z");

test("같은 응답의 실패 기록 찾기(수동 재시도면 무시)", () => {
  const scope = { automation: { records: { a: rec(), b: rec({ identity: "id2", status: "completed" }) } } };
  assert.equal(failedAutoRecord(scope, "id1")?.identity, "id1");
  assert.equal(failedAutoRecord(scope, "id2"), null);
  assert.equal(failedAutoRecord(scope, "id1", { manual: true }), null);
  assert.equal(failedAutoRecord(null, "id1"), null);
});

test("자동 재시도: 실패 뒤 일정 시간이 지나면 한 번만", () => {
  assert.equal(autoRetryDue(rec(), t0 + 1000), false);              // 방금 실패 → 기다림(알림이 막 떴으니)
  assert.equal(autoRetryDue(rec(), t0 + AUTO_RETRY_GAP + 1), true);  // 시간이 지남 → 한 번 다시
  assert.equal(autoRetryDue(rec({ autoTry: 1 }), t0 + AUTO_RETRY_GAP * 10), false);   // 이미 자동으로 한 번 했음 → 조용히 기다림
  assert.equal(autoRetryDue(rec({ at: "이상한 값" }), t0), true);    // 시각을 모르면 다시 해 봄
});
