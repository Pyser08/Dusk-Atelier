import test from "node:test";
import assert from "node:assert/strict";
import { deleteRecord, relatedOf, isTombed } from "../src/engine/memorydelete.js";
import { needsDigest, digestTargets } from "../src/engine/memorydigest.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";

const mk = () => ({ people: { a: { name: "A", digest: "요약", records: [{ id: "r1", act: "손을 잡았다", g: "C", h: "H1", at: 4, digested: true }, { id: "r2", act: "떠났다", g: "B", h: "H2", at: 6 }] } },
  rels: { k: { from: "A", to: "B", items: [{ d: "가까워짐", at: 4 }, { d: "멀어짐", at: 9 }] } }, open: [{ id: "o1", text: "약속", at: 4 }, { id: "o2", text: "비밀", at: 9 }], scenes: [], runs: 0 });

test("기록 삭제: digest 재요약 표시 + tomb", () => {
  const f = mk(); deleteRecord(f, "a", "r1");
  assert.equal(f.people.a.records.length, 1); assert.equal(f.people.a.digestStale, true);
  assert.equal(isTombed(f, "a", "손을  잡았다"), true);
  assert.equal(needsDigest(f.people.a, 0), true);
  assert.equal(f.rels.k.items.length, 2);
});
test("같이 지우기: 같은 응답의 관계·떡밥만", () => {
  const f = mk(); assert.deepEqual([relatedOf(f, f.people.a.records[0]).rels.length, relatedOf(f, f.people.a.records[0]).open.length], [1, 1]);
  const out = deleteRecord(f, "a", "r1", { alsoRelated: true });
  assert.deepEqual([out.rels, out.open], [1, 1]); assert.equal(f.rels.k.items.length, 1); assert.deepEqual(f.open.map((o) => o.id), ["o2"]);
});
test("지운 문장은 다시 추출돼도 반영 안 됨", () => {
  const f = mk(); deleteRecord(f, "a", "r2");
  const res = { scene: null, people: [{ name: "A", act: "떠났다", p: 3, s: 3, r: 3 }] };
  applyAnalysis(f, res, { at: 10, h: "H10" });
  assert.equal(f.people.a.records.some((r) => r.act === "떠났다"), false);
});
test("출처(src.hash)가 있으면 해시로 묶는다", () => {
  const f = mk(); f.open[0].src = { chatId: null, hash: "H1", at: 4 }; f.open[1].src = { chatId: null, hash: "H2", at: 9 };
  assert.deepEqual(relatedOf(f, f.people.a.records[0]).open.map((o) => o.id), ["o1"]);
});
