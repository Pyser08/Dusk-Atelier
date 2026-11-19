// 11-19 제보: 판타지 연호(제국력 300년)일 때 월경 기준 연도가 2000년으로 들어감
import test from "node:test";
import assert from "node:assert/strict";
import { storyDateFromText } from "../src/engine/pot/cycle-tracking.js";

test("연호·세 자리 연도도 이야기 날짜로 읽는다", () => {
  const first = storyDateFromText("[제국력 300년 1월 1일 | 맑음]\n본문", "");
  assert.equal(first, "0300-01-01");
  assert.equal(storyDateFromText("[1월 5일]", first), "0300-01-05", "연도 없는 다음 턴은 같은 해");
  assert.equal(storyDateFromText("[제국력 300년 2월 29일]", ""), "", "300년은 윤년 아님(그레고리력 계산)");
  assert.equal(storyDateFromText("[성력 12년 3월 2일]", ""), "0012-03-02", "두 자리 연도도 1900년대로 바뀌지 않음");
  assert.equal(storyDateFromText("[제국력 300년 1월 1일]", "2000-01-01"), "0300-01-01", "예전 2000년 기준 기록은 연도 있는 날짜로 바로잡힘");
  assert.equal(storyDateFromText("[2024년 3월 2일]", ""), "2024-03-02");
});

import { PeopleImportController } from "../src/data/pot/people-import.js";
test("인물 프로필: 한 명이 실패해도 나머지는 남고, 전원 실패만 오류", async () => {
  const c = Object.create(PeopleImportController.prototype);
  Object.assign(c, { emit() {}, cancelRequested: false, abortController: new AbortController(), failedPeople: [] });
  const out = await c.compileEach([{ name: "가" }, { name: "나" }, { name: "다" }], async (p) => { if (p.name === "나") throw new Error("거절"); return { name: p.name }; });
  assert.deepEqual(out.map((x) => x.name), ["가", "다"]);
  assert.deepEqual(c.failedPeople.map((f) => [f.person.name, f.error]), [["나", "거절"]]);
  c.failedPeople = [];
  await assert.rejects(c.compileEach([{ name: "가" }], async () => { throw new Error("형식"); }), /형식/);
});
