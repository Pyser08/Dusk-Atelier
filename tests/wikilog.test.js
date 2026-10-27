import test from "node:test";
import assert from "node:assert/strict";
import { wikiLogView } from "../src/ui/screens/memory/wikilog.js";

const scope = {
  history: [
    { id: "h1", at: "2026-10-28T01:00:00Z", action: "create", documentId: "d1", before: null, after: { title: "아리" }, summary: "새 인물" },
    { id: "h2", at: "2026-10-28T02:00:00Z", action: "update", documentId: "d1", before: { title: "아리" }, after: { title: "아리" }, summary: "" },
    { id: "h3", at: "2026-10-28T03:00:00Z", action: "delete", documentId: "d2", before: { title: "지운 문서" }, after: null },
  ],
  automation: { records: {
    a: { status: "failed" }, b: { status: "pending" }, c: { status: "completed" }, d: { status: "completed", hidden: true },
  } },
  documents: { d1: { id: "d1", type: "Character", title: "아리" }, d3: { id: "d3", type: "Place", title: "마을" } },
};

test("변경 이력은 최신순이고 제목·동작 이름이 한글로 나온다", () => {
  const v = wikiLogView(scope);
  assert.deepEqual(v.history.map((e) => e.id), ["h3", "h2", "h1"]);
  assert.equal(v.history[0].title, "지운 문서");
  assert.equal(v.history[0].action, "지움");
  assert.equal(v.history[2].summary, "새 인물");
});

test("자동 기록 집계는 숨긴 기록을 빼고 재시도 가능 수를 센다", () => {
  const { auto } = wikiLogView(scope);
  assert.equal(auto.total, 3);
  assert.equal(auto.failed, 1);
  assert.equal(auto.pending, 1);
  assert.equal(auto.retryable, 2);
});

test("요약 정리 대상은 Character 문서만", () => {
  assert.deepEqual(wikiLogView(scope).people, [{ id: "d1", title: "아리" }]);
});

test("범위가 없어도 깨지지 않는다", () => {
  const v = wikiLogView(null);
  assert.equal(v.history.length, 0);
  assert.equal(v.auto.total, 0);
});
