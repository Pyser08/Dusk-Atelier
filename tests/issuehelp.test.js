import test from "node:test";
import assert from "node:assert/strict";
import { explainIssue, issueKey, splitIssues } from "../src/engine/issuehelp.js";

test("경고 설명: 알려진 문구는 이유·해결이, 모르는 문구도 일반 설명이 나온다", () => {
  const a = explainIssue({ msg: "로어북 'x': 활성화 키가 없고 항상 켜짐도 아니라서 쓰이지 않아요" });
  assert.ok(a.why.includes("키가 비어") && a.fix);
  const b = explainIssue({ msg: "전혀 새로운 경고" });
  assert.ok(b.why && b.fix);
});
test("경고 무시: 경고만 무시되고 오류는 남는다", () => {
  const w = { level: "warn", tab: "lorebook", msg: "w" }, e = { level: "err", tab: "info", msg: "e" };
  const s = splitIssues([w, e], [issueKey(w), issueKey(e)]);
  assert.deepEqual(s.ignored, [w]);
  assert.deepEqual(s.active, [e]);
});
