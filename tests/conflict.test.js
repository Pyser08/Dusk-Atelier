import test from "node:test";
import assert from "node:assert/strict";
import { conflictsOf, compareChanges, dismissConflict } from "../src/engine/conflict.js";

const doc = (body) => ({ id: "d1", title: "시로코", sections: [{ id: "s1", heading: "관계", body }], metrics: [{ id: "m1", slotId: "affinity.score", value: 60 }] });
const scope = {
  revision: 3,
  documents: { d1: doc("내가 고친 글") },
  history: [{ id: "h1", documentId: "d1", before: doc("원래 글"), after: { ...doc("AI가 쓴 글"), metrics: [{ id: "m1", slotId: "affinity.score", value: 60 }] } }],
  automation: { records: {
    c1: { status: "completed", messageIndex: 4, historyIds: ["h1"] },
    x1: { status: "manual", errorCode: "rollback-conflict", messageIndex: 4, at: "2026-10-29T01:00:00Z" },
    x2: { status: "manual", errorCode: "other", messageIndex: 4 },
    x3: { status: "manual", errorCode: "rollback-conflict", messageIndex: 2, hidden: true }
  } }
};

test("롤백 충돌만 모은다(숨긴 것·다른 사유 제외)", () => {
  assert.deepEqual(conflictsOf(scope).map((c) => c.key), ["x1"]);
});
test("변경 비교: AI가 바꾼 줄만, 내가 고친 줄을 앞에", () => {
  const [d] = compareChanges(scope, conflictsOf(scope)[0]);
  assert.equal(d.title, "시로코");
  assert.equal(d.rows.length, 1);
  assert.deepEqual(d.rows[0], { label: "관계", before: "원래 글", ai: "AI가 쓴 글", now: "내가 고친 글", mine: true });
});
test("그대로 두기: 기록을 숨기고 원본은 그대로", () => {
  const next = dismissConflict(scope, "x1");
  assert.equal(conflictsOf(next).length, 0);
  assert.equal(conflictsOf(scope).length, 1);
  assert.equal(next.revision, 4);
});
