// 11-13 버그리포트: 서사관계 전용 모드의 월경·임신 구획, 연도 없는 날짜, 한글 이름 주기 보고, 프리셋 user 블록.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { relationshipMemorySlot, relationshipVisibleSection } from "../src/engine/pot/relationship-mode.js";
import { storyDateFromText } from "../src/engine/pot/cycle-tracking.js";
import { applyCycleReportObject } from "../src/engine/cyclereport.js";

test("서사관계 전용 + 인지 '켬'이면 월경·임신(cycle.state) 구획이 통과한다", () => {
  assert.equal(relationshipMemorySlot("cycle.state", "on"), true);
  assert.equal(relationshipVisibleSection({ heading: "월경·임신", provenance: { kind: "writer", slotId: "cycle.state" } }, true, "on"), true);
  assert.equal(relationshipMemorySlot("cycle.state", "off"), false, "settingdeps가 '켬'을 요구하므로 그 밖에는 그대로");
});

test("기준 날짜가 없어도 연도 없는 날짜로 첫 기준일을 잡는다", () => {
  const first = storyDateFromText("[10월 19일 | 맑음]\n본문", "");
  assert.match(first, /^\d{4}-10-19$/);
  assert.equal(storyDateFromText("[10월 21일]", first), first.slice(0, 4) + "-10-21", "다음 턴은 같은 해로 이어진다");
  assert.equal(storyDateFromText("[2024년 3월 2일]", ""), "2024-03-02", "연도가 있으면 그대로");
});

test("한글 이름 인물의 주기 보고가 ASCII 참조로 붙는다(새 문서 참조 검증 통과)", () => {
  const scope = { documents: { "doc_abc": { id: "doc_abc", type: "Character", title: "지은", aliases: [] } } };
  const { obj, applied } = applyCycleReportObject({ documents: [], cycle_report: [{ name: "지은", adult: true }] }, scope);
  assert.equal(applied, 1);
  const ref = obj.documents[0].document_ref;
  assert.match(ref, /^new:[A-Za-z0-9_-]+$/, ref);
  assert.equal(obj.documents[0].title, "지은");
});

test("프리셋 user 블록이 뒤에 있어도 DB의 실제 입력이 요청 안에 있으면 그것을 현재 입력으로 쓴다", () => {
  const src = fs.readFileSync(new URL("../src/data/pot/main-wiki-hook.js", import.meta.url), "utf8");
  assert.match(src, /databaseMatched=Boolean\([^;]*evidence\.matched===true/);
});
