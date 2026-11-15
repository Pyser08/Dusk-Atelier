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

// 2.1.9 제보: Writer 묶음이 2개 이상이면 묶음마다 바뀐 칸 없는 여성 전원에게 같은 new:cycle-0-… create가 합성돼
// writer-batch의 '같은 새 문서 참조를 다시 쓸 수 없음' 검사에 걸려 턴 전체 기록이 실패했다 → 한 인물은 한 묶음에서만 합성한다.
test("묶음 여러 개: 같은 인물에게 같은 합성 create를 두 번 만들지 않는다", () => {
  const report = [{ name: "유우카", adult: true }, { name: "노아", adult: true }];
  const done = new Map();
  const call = (label, docs = []) => JSON.parse(applyCycleReport(JSON.stringify({ documents: docs, cycle_report: report }), scope, JSON.parse, { done, label }).raw);
  const refs = (o) => o.documents.map((d) => d.document_ref);
  const b1 = call("writer batch 1/2"), b2 = call("writer batch 2/2");
  const all = [...refs(b1), ...refs(b2)];
  assert.equal(new Set(all).size, all.length, `참조 중복: ${all.join(", ")}`);
  assert.equal(b2.documents.length, 0);
});

test("묶음 여러 개: 뒤 묶음에 진짜 변경이 있어도 표식 줄은 한 번만 붙는다", () => {
  const report = [{ name: "유우카", adult: true, sex: [{ partner: "선생님", contraception: "none" }] }];
  const done = new Map();
  const call = (label, docs) => JSON.parse(applyCycleReport(JSON.stringify({ documents: docs, cycle_report: report }), scope, JSON.parse, { done, label }).raw);
  const b1 = call("writer batch 1/2", []);
  const b2 = call("writer batch 2/2", [{ document_ref: "d1", operation: "update", title: null, entries: [{ slot_id: "core.current_state", text: "교실" }] }]);
  const lines = (o) => o.documents.flatMap((d) => d.entries ?? []).filter((e) => /CYCLE:|SEX:/.test(e.text)).length;
  assert.equal(lines(b1), 1);
  assert.equal(lines(b2), 0);
});

test("묶음 여러 개: 같은 묶음을 다시 시도하면 다시 붙는다(실패한 묶음의 보고가 사라지지 않게)", () => {
  const report = [{ name: "유우카", adult: true }];
  const done = new Map();
  const call = (label) => JSON.parse(applyCycleReport(JSON.stringify({ documents: [], cycle_report: report }), scope, JSON.parse, { done, label }).raw);
  assert.equal(call("writer batch 1/2").documents.length, 1);
  assert.equal(call("writer batch 1/2").documents.length, 1);   // 재시도
  assert.equal(call("writer batch 2/2").documents.length, 0);
});

test("done을 안 넘기면 예전처럼 동작한다", () => {
  const raw = JSON.stringify({ documents: [], cycle_report: [{ name: "유우카", adult: true }] });
  assert.equal(JSON.parse(applyCycleReport(raw, scope).raw).documents.length, 1);
});
