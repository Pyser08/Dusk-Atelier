import test from "node:test";
import assert from "node:assert/strict";
import { peopleImportParseJson } from "../src/data/pot/people-import.js";

test("People 응답: 사고 출력 속 짝 안 맞는 중괄호가 있어도 JSON을 찾는다", () => {
  const raw = "<Thoughts>로어북을 보니 { 등장인물이 여럿이다. 먼저 정리하자</Thoughts>\n{\"schema_version\":1,\"people\":[{\"name\":\"수아\"}]}";
  assert.equal(peopleImportParseJson(raw).people[0].name, "수아");
});
test("People 응답: 끝 쉼표·앞뒤 말·코드펜스", () => {
  assert.equal(peopleImportParseJson("결과입니다:\n```json\n{\"people\":[{\"name\":\"도윤\"},]}\n```\n끝").people[0].name, "도윤");
});
test("People 응답: 토큰이 모자라 잘린 답도 살아 있는 인물까지 살린다", () => {
  const raw = "{\"schema_version\":1,\"people\":[{\"name\":\"수아\",\"evidence\":\"a\"},{\"name\":\"도윤\",\"evid";
  const v = peopleImportParseJson(raw);
  assert.equal(v.people[0].name, "수아");
});

import { PeopleImportController } from "../src/data/pot/people-import.js";
test("인물 찾기 반영: 저장 중 다른 인물 찾기가 시작돼도 null.store 오류가 나지 않는다", async () => {
  const snap = { scope: { characterId: "c", chatKey: "t" }, revision: 1, documents: {} };
  let ctrl;
  const store = { replace() {}, async flush() { ctrl.begin("다시 찾기", 1); }, status: () => ({ phase: "saved" }) };
  const wikiController = { snapshot: () => snap, requireStore: () => store };
  ctrl = new PeopleImportController({ api: {}, settingsStore: {}, keyStore: {}, wikiController, scheduler: { setInterval: () => 0, clearInterval() {} } });
  ctrl.phase = "review"; ctrl.candidates = [{ id: "p1", name: "수아" }]; ctrl.selected = new Set(["p1"]); ctrl.scopeToken = "c\nt\n1";
  let err = null; try { await ctrl.applySelection(); } catch (e) { err = e; }
  assert.ok(!err || !/reading .store./.test(String(err.message)), String(err?.message));
});
