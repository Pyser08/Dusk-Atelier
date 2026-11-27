import { test } from "node:test";
import assert from "node:assert/strict";
import { readBulkPatch } from "../src/ui/screens/lorebulk.js";
import { bulkRule, ruleOf } from "../src/engine/lorerules.js";

test("readBulkPatch: only filled fields, '-' clears", () => {
  assert.deepEqual(readBulkPatch({ prob: "", once: "", hold: "", scan: "", scanTag: "", whole: "", common: "", group: "", at: "", role: "" }), {});
  assert.deepEqual(readBulkPatch({ prob: "150", once: "cooldown", cool: "2", scanTag: "<status>", whole: "on", group: "-", at: "depth", depth: "3", role: "user" }),
    { prob: 100, once: "cooldown", cool: 2, scanTag: "status", whole: true, group: "", at: "depth", depth: 3, role: "user" });
  assert.deepEqual(readBulkPatch({ scanTag: "-" }), { scanTag: null });
});

test("bulkRule: turns rules on, changes only given fields, keeps conditions", () => {
  const a = { key: "유키", comment: "유키", content: "유키 설명", mode: "normal", extentions: { da_rid: "ra", da_rule: { on: true, cond: [{ t: "text", keys: "눈" }], prob: 30, once: "chat", scanTag: "old" } } };
  const b = { key: "소라", comment: "소라", content: "소라 설명", mode: "normal" };
  const book = [a, b];
  assert.equal(bulkRule(book, { prob: 70, scanTag: null, at: "bottom" }, book), 2);
  const ra = ruleOf(a), rb = ruleOf(b);
  assert.equal(ra.prob, 70); assert.equal(ra.once, "chat"); assert.deepEqual(ra.cond, [{ t: "text", keys: "눈" }]); assert.equal(ra.scanTag, undefined); assert.equal(ra.at, "bottom");
  assert.equal(rb.prob, 70); assert.equal(rb.on, true); assert.ok(b.extentions.da_rid);
  assert.match(b.content, /@@activate/);
});
