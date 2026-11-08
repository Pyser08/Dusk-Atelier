import test from "node:test";
import assert from "node:assert/strict";
import { applyCycleReport, cycleLines } from "../src/engine/cyclereport.js";
import { takeCycleMarkers } from "../src/engine/pot/cycle-tracking.js";
import { redirectDuplicateCreates } from "../src/engine/pot-dedupe.js";

const scope = { documents: { d1: { id: "d1", type: "Character", title: "유우카", aliases: [] }, d2: { id: "d2", type: "Character", title: "노아", aliases: [] } } };

test("current_state를 안 써도 cycle_report로 표식이 붙는다(별도 칸)", () => {
  const raw = JSON.stringify({ documents: [{ document_ref: "d1", operation: "update", title: null, entries: [{ slot_id: "core.relationship", text: "친해짐" }] }], cycle_report: [{ name: "유우카", adult: true, sex: [{ partner: "선생", contraception: "none" }] }, { name: "노아", adult: true }] });
  const out = JSON.parse(applyCycleReport(raw, scope).raw);
  assert.equal(out.cycle_report, undefined);
  const e = out.documents[0].entries.find((x) => x.slot_id === "core.current_state");
  const t = takeCycleMarkers(e.text);
  assert.equal(t.report.adult, true);
  assert.deepEqual(t.report.sex, [{ partner: "선생", protected: false }]);
  assert.equal(t.text, "");
  const noa = out.documents.find((d) => d.title === "노아");
  assert.equal(noa.operation, "create");
  const r = redirectDuplicateCreates(scope, { documents: [noa] }, { character: "Character" });
  assert.equal(r.proposal.documents[0].operation, "update", "같은 제목 create는 기존 문서 갱신으로 바뀐다");
});

test("cycle_report가 없으면 응답을 그대로 둔다, 성인 아님은 표식 없음", () => {
  const raw = '{"documents":[]}';
  assert.equal(applyCycleReport(raw, scope).raw, raw);
  assert.deepEqual(cycleLines({ adult: false }), []);
});
